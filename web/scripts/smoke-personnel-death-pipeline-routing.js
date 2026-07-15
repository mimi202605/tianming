#!/usr/bin/env node
// smoke-personnel-death-pipeline-routing.js
// 2026-07-16·落库契约硬化刀①：人事校验器(_validatePersonnelConsistency)死亡类补录路由改造。
//   旧病：narrative 说「赐死/斩/病故」但 AI 漏填 character_deaths 时·校验器 onDismissal 直写 ch.alive=false·
//         绕过「玩家之死裁决器」adjudicatePlayerDeath(合法继统门·鼎革 R1a)与死亡级联(军队摘帅/丁忧/首领/头衔…)。
//         ⇒ narrative 赐死玩家角色会静默置死·既不路由继统也不触终局(尸政/无嗣不终局)。
//   本刀：死亡类改合成 character_deaths 同构条目·投喂既有死亡管线 applyOneDeath(实体解析+玩家裁决器+全级联)。
//   端到端：真 applyAITurnChanges → 真 _validatePersonnelConsistency → 真 applyOneDeath(→ adjudicatePlayerDeath stub)。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; console.log('  ok - ' + msg); } else { failed++; console.error('  ✗ ' + msg); } }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
    setTimeout: () => 0, clearTimeout: () => {}, Error, TypeError, RangeError
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { errors: { capture() {}, captureSilent() {} } };
  ctx.GameEventBus = { emit() {}, on() {} };
  ctx._dbg = () => {};
  ctx.getTSText = () => '';
  ctx._eb = [];
  ctx.addEB = (cat, msg) => { ctx._eb.push({ cat, msg }); };
  // applyOneDeath 的实体解析依赖
  ctx.findCharByName = (name) => (ctx.GM.chars || []).find(c => c && c.name === name);
  ctx._fuzzyFindChar = (name) => (ctx.GM.chars || []).find(c => c && c.name === name);
  vm.createContext(ctx);
  ['tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js',
   'tm-ai-change-applier.js', 'tm-ai-change-applier-validators.js', 'tm-ai-change-applier-reconcile.js',
   'tm-ai-apply-deaths.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  // 玩家之死裁决器·faithful 记录 stub（真件在 tm-endturn-helpers.js·含顶层副作用不便单独装载·
  //   本刀未改它·此 stub 复刻其继统/终局契约并记录「死亡管线确经此路由」）
  ctx._pdCalls = [];
  ctx.adjudicatePlayerDeath = function (ch, cause, opts) {
    opts = opts || {};
    ctx._pdCalls.push({ name: ch && ch.name, cause: cause, kind: opts.kind });
    var heir = (ctx.GM.chars || []).find(h => h && h.alive !== false && !h.dead && h.name === (ch && ch._heirName));
    if (heir) { ch.isPlayer = false; heir.isPlayer = true; ctx.GM._successionEvent = { from: ch.name, to: heir.name }; return { outcome: 'succession' }; }
    ctx.GM._playerDead = true; ctx.GM._playerDeathReason = cause || ''; ctx.GM._playerDeathKind = opts.kind || '';
    return { outcome: 'gameover' };
  };
  // 包裹真 applyOneDeath·记录调用(死亡管线入口·验证 validator 确实走它而非 onDismissal 直写)
  const realAOD = ctx.applyOneDeath;
  ctx._deathCalls = [];
  ctx.applyOneDeath = function (cd) { ctx._deathCalls.push(cd && cd.name); return realAOD(cd); };
  return ctx;
}

function baseGM(chars, extra) {
  return Object.assign({
    turn: 5, facs: [{ name: '明朝廷', leader: '' }], officeTree: [], _turnReport: [], armies: [],
    publicTreasury: {}, guoku: { money: 100000 }, neitang: { money: 50000 }, chars: chars
  }, extra || {});
}

// ── A·非玩家受刑者：走死亡管线 + 死亡级联(军队摘帅·onDismissal 直写路径不会做) ──
console.log('===== A·死亡类经死亡管线 + 级联 =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM(
    [{ name: '孙传庭', alive: true, faction: '明朝廷', resources: {} },
     { name: '胡廷晏', officialTitle: '巡抚', position: '巡抚', alive: true, faction: '明朝廷', resources: {} }],
    { armies: [{ name: '秦军', commander: '胡廷晏', morale: 80 }] });
  ctx.P = { playerInfo: { characterName: '孙传庭' }, adminHierarchy: {} };
  ctx.applyAITurnChanges({ shizhengji: '帝震怒，赐死胡廷晏。' });
  const hu = ctx.GM.chars.find(c => c.name === '胡廷晏');
  assert(hu.alive === false, 'A1 受刑者 alive=false');
  assert(ctx._deathCalls.indexOf('胡廷晏') >= 0, 'A2 ★死亡类经 applyOneDeath 死亡管线(非 onDismissal 直写)');
  assert(ctx.GM.armies[0].commander === '', 'A3 死亡级联生效·军队摘帅(直写路径不会做此级联)');
  assert(ctx._pdCalls.length === 0, 'A4 非玩家不触发玩家之死裁决器');
})();

// ── B·narrative 赐死玩家角色·无嗣 → 玩家之死裁决器 + 终局信号(本刀核心修复) ──
console.log('===== B·玩家角色 narrative 死亡→裁决器→终局(★核心) =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM([{ name: '崇祯', isPlayer: true, alive: true, faction: '明朝廷', resources: {} }]);
  ctx.P = { playerInfo: { characterName: '崇祯' }, adminHierarchy: {} };
  ctx.applyAITurnChanges({ shizhengji: '城破，崇祯自缢于煤山。' });
  assert(ctx._deathCalls.indexOf('崇祯') >= 0, 'B1 玩家角色死亡走死亡管线');
  assert(ctx._pdCalls.length === 1 && ctx._pdCalls[0].name === '崇祯', 'B2 ★经玩家之死裁决器(旧 onDismissal 直写路径绝不触发)');
  assert(ctx.GM._playerDead === true, 'B3 ★无嗣→终局信号 _playerDead=true(旧路径静默置死·不终局也不继统)');
})();

// ── C·narrative 弑玩家角色·有嗣 → 继统续玩(裁决器路由·非终局) ──
console.log('===== C·玩家角色死亡·有嗣→继统续玩 =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM(
    [{ name: '崇祯', isPlayer: true, alive: true, faction: '明朝廷', resources: {}, _heirName: '朱慈烺' },
     { name: '朱慈烺', alive: true, faction: '明朝廷', resources: {} }]);
  ctx.P = { playerInfo: { characterName: '崇祯' }, adminHierarchy: {} };
  ctx.applyAITurnChanges({ shizhengji: '崇祯遇害身亡。' });
  assert(ctx._pdCalls.length === 1, 'C1 玩家死亡经裁决器');
  assert(ctx.GM._successionEvent && ctx.GM._successionEvent.to === '朱慈烺', 'C2 有嗣→继统(裁决器路由)');
  const cz = ctx.GM.chars.find(c => c.name === '崇祯'); const heir = ctx.GM.chars.find(c => c.name === '朱慈烺');
  assert(cz.isPlayer === false && heir.isPlayer === true, 'C3 玩家身份传给继承人');
  assert(!ctx.GM._playerDead, 'C4 继统续玩·不置终局');
})();

// ── D·已死者不再投喂死亡管线(charNameSet 仅收 alive·已死早退) ──
console.log('===== D·已死者早退 =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM([{ name: '胡廷晏', alive: false, dead: true, faction: '明朝廷', resources: {} }]);
  ctx.P = { playerInfo: {}, adminHierarchy: {} };
  ctx.applyAITurnChanges({ shizhengji: '追述：胡廷晏已于去岁被斩于市。' });
  assert(ctx._deathCalls.length === 0, 'D1 已死者不重复投喂死亡管线');
})();

// ── E·查无此人不落账(narrative 处决库外之人·真人无恙·无凭空造人) ──
console.log('===== E·查无此人不落账 =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM([{ name: '孙传庭', alive: true, faction: '明朝廷', resources: {} }]);
  ctx.P = { playerInfo: {}, adminHierarchy: {} };
  ctx.applyAITurnChanges({ shizhengji: '帝命斩杀逆首王二麻子于西市。' });
  assert(ctx._deathCalls.indexOf('王二麻子') < 0, 'E1 库外之人不投喂死亡管线');
  assert(!ctx.GM.chars.some(c => c.name === '王二麻子'), 'E2 不凭空造人');
  assert(ctx.GM.chars[0].alive === true, 'E3 在册真人不误伤');
})();

// ── F·干净路径(AI 已填 character_deaths)·校验器不重复路由 ──
console.log('===== F·干净路径不重复补录 =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM([{ name: '胡廷晏', officialTitle: '巡抚', alive: true, faction: '明朝廷', resources: {} }]);
  ctx.P = { playerInfo: {}, adminHierarchy: {} };
  // applyAITurnChanges 本身不处理 character_deaths(那是 endturn 死亡管线)·此处只验 validator 的 handled 拦截
  ctx.applyAITurnChanges({ shizhengji: '把胡廷晏砍了。', character_deaths: [{ name: '胡廷晏', reason: '处决' }] });
  assert(ctx._deathCalls.length === 0, 'F1 已填 character_deaths → 校验器不重复投喂管线(handled 生效)');
  const log = ctx.GM._personnelValidatorLog || [];
  const listedMissing = log.some(L => (L.missing || []).some(m => m.name === '胡廷晏'));
  assert(!listedMissing, 'F2 胡廷晏不入 missing');
})();

// ── G·非致死类保留 onDismissal 直写 + 留痕通道已接线 ──
console.log('===== G·非致死类直写 + 留痕通道 =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = baseGM([{ name: '钱谦益', officialTitle: '礼部尚书', position: '礼部尚书', alive: true, faction: '明朝廷', resources: {} }]);
  ctx.P = { playerInfo: {}, adminHierarchy: {} };
  ctx.applyAITurnChanges({ shizhengji: '钱谦益下诏狱，待勘。' });
  const qian = ctx.GM.chars.find(c => c.name === '钱谦益');
  assert(qian._imprisoned === true, 'G1 下狱类经 onDismissal 直写·_imprisoned=true');
  assert(qian.alive !== false, 'G2 下狱不致死');
  assert(ctx._deathCalls.length === 0, 'G3 非致死类不走死亡管线');
  const log = ctx.GM._personnelValidatorLog || [];
  assert(log.length > 0 && Array.isArray(log[log.length - 1].skipped), 'G4 ★留痕通道已接线(_personnelValidatorLog.skipped 为数组)');
  const tr = (ctx.GM._turnReport || []).filter(e => e.type === 'personnel_validation');
  assert(tr.length > 0 && Array.isArray(tr[tr.length - 1].skipped), 'G5 _turnReport.personnel_validation 亦携 skipped 留痕字段');
})();

console.log('');
console.log('[smoke-personnel-death-pipeline-routing] ' + passed + ' passed / ' + failed + ' failed');
if (failed > 0) process.exit(1);
