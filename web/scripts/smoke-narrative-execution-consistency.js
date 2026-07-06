#!/usr/bin/env node
// scripts/smoke-narrative-execution-consistency.js
// 2026-07-02·锁住『叙事提及处决但 AI 未填结构化死亡 → 人物复活』的修复
//
// Bug 历史(玩家报)·上月月报叙事"孙传庭在陕西把胡廷晏砍了"·但 AI 未把胡廷晏写进
//   character_deaths → alive 从未置 false → 下月名册照旧当活人喂 AI → 胡廷晏"复活"。
//   兜底解析器 _validatePersonnelConsistency 旧动词表无"砍/斩/杀"口语·且 {2,4} 贪婪
//   捕获会把"把"吞进人名 → 漏抓。
//
// 修复(tm-ai-change-applier.js)·
//   1. execute 移出通用 pat1/pat2·改 _scanExecutions 受事锚定扫描器
//      (被动 X被斩 / 处置式 把X砍了 / 动宾 斩X / 自戕 X自尽)·抓口语又不误杀施事者
//   2. onDismissal 处决正则补全多字处决词 + 自戕词·两表一致
//   3. character_deaths 计入 handled·AI 正经上报的不重复补录
//
// 端到端: 真 applyAITurnChanges → 真 _validatePersonnelConsistency → 真 onDismissal
// 断言: 受事者 alive===false·施事者/被查办者 alive 不变

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }

function makeCtx() {
  const ctx = { console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, setTimeout: () => 0, clearTimeout: () => {}, Error };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  // 无害 stub·避免 applyAITurnChanges 内部可选依赖抛错
  ctx.GameEventBus = { emit(){}, on(){} };
  ctx.addEB = () => {};
  ctx.getTSText = () => '';
  vm.createContext(ctx);
  ['tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js', 'tm-ai-change-applier.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

// 每个 case 用全新 ctx + GM·避免串味
function runCase(names, aiOutput) {
  const ctx = makeCtx();
  ctx.GM = {
    turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [],
    publicTreasury: {}, guoku: { money: 100000 }, neitang: { money: 50000 },
    chars: names.map(n => ({ name: n, position: '巡抚', officialTitle: '巡抚', loyalty: 60, alive: true, faction: '明朝廷', resources: {} }))
  };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  try { ctx.AIChangeApplier.applyAITurnChanges(aiOutput || {}); }
  catch (e) { console.error('  ! applyAITurnChanges threw: ' + (e && e.message)); }
  const dead = ctx.GM.chars.filter(c => c.alive === false).map(c => c.name).sort();
  return dead;
}
function eq(a, b){ return JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort()); }
function check(desc, names, narrative, expectDead, field) {
  const out = {}; out[field || 'shizhengji'] = narrative;
  const dead = runCase(names, out);
  const ok = eq(dead, expectDead);
  if (ok) { passed++; console.log('  ✓ ' + desc + '  → 死[' + dead.join('、') + ']'); }
  else { failed++; console.error('  ✗ ' + desc + '\n      期望死[' + expectDead.join('、') + '] 实际死[' + dead.join('、') + ']'); }
}

const CAST = ['孙传庭', '胡廷晏', '黄得功', '曹变蛟', '方正化', '魏忠贤'];

console.log('===== 正例·受事者应判死 =====');
check('★真bug: 把X砍了', CAST, '孙传庭在陕西把胡廷晏砍了，传首九边。', ['胡廷晏']);
check('被动: X被斩首', CAST, '胡廷晏贪墨事发，被斩首于市。', ['胡廷晏']);
check('动宾: 赐死X', CAST, '帝震怒，赐死魏忠贤。', ['魏忠贤']);
check('名前不及物: X伏诛', CAST, '首恶胡廷晏伏诛，陕西大定。', ['胡廷晏']);
check('自戕: X畏罪自缢(紧邻)', CAST, '魏忠贤畏罪自缢于宅。', ['魏忠贤']);
check('走 shilu_text 字段也扫', CAST, '把胡廷晏正法。', ['胡廷晏'], 'shilu_text');
// Codex Bug2: 动宾+受害者身份词窗口·斩杀叛将X→X 应死
check('动宾+身份词: 斩杀叛将X', CAST, '官军斩杀叛将胡廷晏于阵前。', ['胡廷晏']);
check('动宾+身份词: 处决逆首X', CAST, '诏处决逆首魏忠贤。', ['魏忠贤']);

console.log('===== 反例·绝不可误杀 =====');
check('★当月真叙事(尚未到任+被查办·无人死)', CAST,
  '陕西方面，孙传庭尚未到任，原巡抚胡廷晏闻诏后连夜调阅积欠案卷，闻将补饷，竟私扣三千两作道途支应，被厂卫密探报知，上密令方正化查办。京营整顿中，黄得功、曹变蛟巡查五军营、神枢营。', []);
check('施事者: X斩获甚众', CAST, '孙传庭出关，斩获甚众，贼势大挫。', []);
check('施事者: X杀敌三千', CAST, '曹变蛟率骑突阵，杀敌三千。', []);
check('施事者受命去杀别人', CAST, '命孙传庭斩杀叛军，克期荡平。', []);
check('把总(把+军衔非人名)', CAST, '把总孙传庭巡查五军营。', []);
check('赐赏非赐死', CAST, '帝赐孙传庭尚方宝剑，令便宜行事。', []);
// Codex Bug1: "X被命令/被令斩杀…"=受命施事者·绝不可误杀
check('★受命施事者: X被命令斩杀叛军', CAST, '孙传庭被命令斩杀叛军，克期荡平。', []);
check('★受命施事者: X被令斩杀流贼', CAST, '曹变蛟被令斩杀流贼于河南。', []);
check('受命施事者: X被遣讨贼', CAST, '孙传庭被遣斩贼于潼关。', []);

console.log('===== 结构化死亡不重复补录 =====');
(function(){
  // AI 已填 character_deaths·叙事又提及·验证 validator 不重复补调(handled 生效)
  // 本 vm 未加载 apply-deaths 模块·故 alive 不会被 death-applier 置 false·
  // 若 validator 仍误补录→胡廷晏会 alive=false·期望 handled 拦下→仍 true
  const ctx = makeCtx();
  ctx.GM = { turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], publicTreasury: {},
    guoku: { money: 100000 }, neitang: { money: 50000 },
    chars: [{ name: '胡廷晏', officialTitle: '巡抚', alive: true, faction: '明朝廷', resources: {} }] };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  try {
    ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '把胡廷晏砍了。', character_deaths: [{ name: '胡廷晏', reason: '处决' }] });
  } catch (e) { console.error('  ! threw: ' + (e && e.message)); }
  const ch = ctx.GM.chars[0];
  const log = ctx.GM._personnelValidatorLog || [];
  const patchedHu = log.some(L => (L.missing || []).some(m => m.name === '胡廷晏'));
  assert(!patchedHu, '已填 character_deaths 的胡廷晏不应被 validator 重复补录 (patched=' + patchedHu + ')');
  console.log('  ✓ character_deaths 已上报者·validator 不重复补录');
})();

// ═══════════════════════════════════════════════════════════════════
// 2026-07-04·补：自然/含糊死亡 + zhengwen 字段扫描 + 家属误杀守卫
//   玩家复报"陕西巡抚死后下月还在任"·根因:①校验器漏扫 zhengwen ②只认处决词不认
//   病故/薨/遇害/城破身死等自然/含糊死亡(巡抚死于民变常被叙作这些)。
// ═══════════════════════════════════════════════════════════════════
console.log('===== 自然/含糊死亡·受事者应判死 =====');
check('遇害身亡', CAST, '胡廷晏遇害身亡，陕西震动。', ['胡廷晏']);
check('病故于任', CAST, '胡廷晏病故于任所，年五十有三。', ['胡廷晏']);
check('城破身死', CAST, '西安城破，胡廷晏城破身死。', ['胡廷晏']);
check('殉城', CAST, '胡廷晏殉城，士民哀之。', ['胡廷晏']);
check('为乱兵所杀(带前置副词竟)', CAST, '巡抚胡廷晏，竟为乱兵所杀。', ['胡廷晏']);
check('为乱民所害', CAST, '胡廷晏为乱民所害，阖署遇难。', ['胡廷晏']);
check('薨逝', CAST, '老臣魏忠贤薨逝于府第。', ['魏忠贤']);

console.log('===== zhengwen(邸报/政闻)字段也须扫 =====');
check('处决写在 zhengwen', CAST, '邸报：陕西巡抚胡廷晏贪墨事发，被斩于市。', ['胡廷晏'], 'zhengwen');
check('自然死写在 zhengwen', CAST, '胡廷晏病逝于西安任所。', ['胡廷晏'], 'zhengwen');

console.log('===== 自然死·家属/歧义误杀守卫 =====');
check('X之子病故(死的是儿子·非X)', CAST, '胡廷晏之子病故，廷晏悲恸不能视事。', []);
check('被陷害≠死(构陷非处决)', CAST, '孙传庭被奸党陷害，下诏狱待勘。', []);
check('被迫害≠死', CAST, '胡廷晏被阉党迫害有年，郁郁难伸。', []);
check('为流民所困但获解围(未死)', CAST, '胡廷晏为流民所困于城中，旋得援兵解围。', []);

console.log('');
console.log(`[smoke-narrative-execution-consistency] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
