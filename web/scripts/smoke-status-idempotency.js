#!/usr/bin/env node
// scripts/smoke-status-idempotency.js
// 2026-07-02·锁住『AI 叙事每回合复述旧状态→校验器重复施加』的修复
//
// 玩家报·(a)给卢象升下狱后下诏释放"没用"·下回合又被关 (b)抄魏忠贤家+900万·下回合又自动抄一次
// 真因·_validatePersonnelConsistency 每回合重扫叙事补录·无跨回合去重、无"玩家本回合已释放"保护·
//       且三套抄家实现幂等标记(_confiscated/confiscated/_confiscatedTurn)互不认账。
// 修·onDismissal 抄家守卫统一三标记 + _alreadyResolvedState 幂等判定接入 missing 过滤 +
//    char_updates 任一状态字段(含释放)计入 handled。

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }

let confiscateCalls = [];  // 记录 triggerConfiscationByName 调用·验幂等
function makeCtx() {
  const ctx = { console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, setTimeout: () => 0, clearTimeout: () => {}, Error };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.GameEventBus = { emit(){}, on(){} };
  ctx.addEB = () => {};
  ctx.getTSText = () => '';
  // onDismissal 的致死分支必须经统一死亡 sink；完整级联另有专项 smoke，这里只验证路由与状态。
  ctx._deathSinkCalls = [];
  ctx.applyOneDeath = (death) => {
    const target = ((ctx.GM && ctx.GM.chars) || []).find(c => c && c.name === (death && death.name));
    ctx._deathSinkCalls.push(death && death.name);
    if (!target || target.alive === false || target.dead === true) return { ok: false };
    target.alive = false;
    target.dead = true;
    target.deathReason = String((death && (death.reason || death.cause)) || '');
    return { ok: true };
  };
  // 抄家引擎 mock·计数并返回成功
  ctx.EconomyLinkage = {
    triggerConfiscationByName(name, dest, intensity) {
      confiscateCalls.push({ name, dest, intensity });
      return { success: true, total: 9000000, visible: 6000000, hidden: 3000000 };
    }
  };
  vm.createContext(ctx);
  ['tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js', 'tm-ai-change-applier.js', 'tm-ai-change-applier-validators.js', 'tm-ai-change-applier-reconcile.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
function freshGM(ctx, chars) {
  ctx.GM = { turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], publicTreasury: {},
    guoku: { money: 100000, balance: 100000 }, neitang: { money: 50000, balance: 50000 }, qijuHistory: [],
    chars: chars };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
}
function ch(name, extra) { return Object.assign({ name, officialTitle: '巡抚', position: '巡抚', alive: true, faction: '明朝廷', resources: {} }, extra || {}); }

console.log('===== 下狱幂等·已在狱者叙事复述不再重复补录 =====');
(function(){
  const ctx = makeCtx();
  const lu = ch('卢象升', { _imprisoned: true, _imprisonedTurn: 3, officialTitle: null, position: '' });
  freshGM(ctx, [lu]);
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '卢象升下狱待决，无人主持军务。' });
  const log = (ctx.GM._personnelValidatorLog || []).slice(-1)[0] || { missing: [] };
  const inMissing = (log.missing || []).some(m => m.name === '卢象升');
  assert(!inMissing, '已在狱的卢象升不应再进 missing 补录 (inMissing=' + inMissing + ')');
})();

console.log('===== ★放了又被关·玩家本回合已释放·叙事复述不得重新下狱 =====');
(function(){
  const ctx = makeCtx();
  // 玩家本回合(turn5)刚释放·_imprisoned=false·_releasedTurn=5
  const lu = ch('卢象升', { _imprisoned: false, _releasedTurn: 5, officialTitle: '兵部侍郎' });
  freshGM(ctx, [lu]);
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '卢象升下狱，举朝震动。' });
  assert(lu._imprisoned !== true, '玩家本回合已释放·不应被叙事重新下狱 (_imprisoned=' + lu._imprisoned + ')');
})();

console.log('===== ★抄家幂等·引擎已抄(confiscated)·校验器不再二次抄 =====');
(function(){
  const ctx = makeCtx(); confiscateCalls = [];
  // 第一次抄家走引擎按钮·只设了 engine 的 ch.confiscated(不设 applier 的 _confiscated)
  const wei = ch('魏忠贤', { confiscated: true });
  freshGM(ctx, [wei]);
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '锦衣卫查抄魏忠贤，尽没其赀。' });
  assert(confiscateCalls.length === 0, '引擎已抄·校验器不应再触发抄家 (calls=' + confiscateCalls.length + ')');
})();

console.log('===== ★抄家幂等·连抄两回合只进账一次 =====');
(function(){
  const ctx = makeCtx(); confiscateCalls = [];
  const wei = ch('魏忠贤');  // 全新·未抄
  freshGM(ctx, [wei]);
  // 第一回合叙事查抄·应抄一次
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '查抄魏忠贤，得银九百万。' });
  const after1 = confiscateCalls.length;
  // 第二回合叙事又复述查抄·应被幂等挡住
  ctx.GM.turn = 6;
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '复查抄魏忠贤，以正典刑。' });
  const after2 = confiscateCalls.length;
  assert(after1 === 1, '第一回合应抄家一次 (after1=' + after1 + ')');
  assert(after2 === 1, '第二回合叙事复述不应再抄 (after2=' + after2 + ')');
  assert(wei._confiscated === true && wei.confiscated === true, '抄后两套标记都应置位统一 (_conf=' + wei._confiscated + ' conf=' + wei.confiscated + ')');
})();

console.log('===== 正常首次下狱仍生效(未误伤) =====');
(function(){
  const ctx = makeCtx();
  const someone = ch('张三', { _imprisoned: false });
  freshGM(ctx, [someone]);
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '张三下狱，以贪墨论罪。' });
  assert(someone._imprisoned === true, '首次下狱应生效 (_imprisoned=' + someone._imprisoned + ')');
})();

console.log('===== Codex Bug5·onDismissal 认「斩杀」为处决(置死) =====');
(function(){
  const ctx = makeCtx();
  const li = ch('李贼', { alive: true });
  freshGM(ctx, [li]);
  ctx.AIChangeApplier.onDismissal('李贼', '斩杀');
  assert(li.alive === false, 'reason=斩杀 应置死 (alive=' + li.alive + ')');
  assert(ctx._deathSinkCalls.length === 1 && ctx._deathSinkCalls[0] === '李贼', 'reason=斩杀 应且仅应路由一次统一死亡 sink');
})();

console.log('===== ★Codex Bug4·已抄+仍有binding·重复抄家dismiss不再追亏 =====');
(function(){
  const ctx = makeCtx();
  let pursueCalls = 0;
  ctx.CharEconEngine = { pursueTreasuryDeficit(){ pursueCalls++; return { pursued: 100, deficitRemaining: 0 }; } };
  // 已被抄(confiscated:true)·且公库仍绑定有亏空
  const wei = ch('魏忠贤', { confiscated: true, _confiscated: true,
    resources: { publicTreasury: { binding: { type: 'faction', name: '明' } } } });
  freshGM(ctx, [wei]);
  // 重新以"查抄"reason 免职(结构化 dismiss 直调 onDismissal)
  ctx.AIChangeApplier.onDismissal('魏忠贤', '查抄魏忠贤家产');
  assert(pursueCalls === 0, '已抄者再以抄家reason免职·不应重复追亏 (pursueCalls=' + pursueCalls + ')');
})();

console.log('');
console.log(`[smoke-status-idempotency] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
