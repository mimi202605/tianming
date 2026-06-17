#!/usr/bin/env node
// scripts/smoke-wendui-prison.js
// 2026-05-21·锁住狱中问对机制 — 6 动作 + 频率限制 + 朝议反应 + release 路径

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) passed++;
  else { failed++; console.error('  ✗ ' + msg); }
}

function makeCtx() {
  const ctx = { console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat,
    setTimeout: (fn, ms) => { setImmediate(fn); return 0; }, clearTimeout: () => {}, Error
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-wendui-prison.js'), 'utf8'), ctx, { filename: 'tm-wendui-prison.js' });

  ctx.GM = {
    turn: 5, chars: [],
    minxin: { trueIndex: 50, value: 50 },
    huangwei: { index: 60, value: 60 },
    partyStrife: 0,
    memorials: []
  };
  ctx.P = { ai: {} };  // 无 ai key·_generateAIResponse 走 fallback
  return ctx;
}

function addPrisoner(ctx, name, reason) {
  const ch = {
    name, position: '兵部尚书', loyalty: 60, alive: true, faction: '明朝廷',
    _imprisoned: true, _imprisonReason: reason, _imprisonedTurn: 3, health: 90
  };
  ctx.GM.chars.push(ch);
  return ch;
}

console.log('===== ACTIONS 暴露 =====');
const ctx = makeCtx();
const WP = ctx.WenduiPrison;
assert(WP, 'WenduiPrison should be exposed globally');
const actionKeys = Object.keys(WP.ACTIONS);
// 2026-05-21·加 chat 后变 7
assert(actionKeys.length === 7, `should have 7 actions (含 chat)·got ${actionKeys.length}: ${actionKeys.join(',')}`);
['chat','inquire','comfort','interrogate','pardon','release','addPunishment'].forEach(k =>
  assert(WP.ACTIONS[k], `action '${k}' should exist`));
assert(WP.ACTIONS.chat.requiresText === true, 'chat action should require text');
assert(WP.ACTIONS.chat.effects.minxin === 0 && WP.ACTIONS.chat.effects.huangwei === 0, 'chat should not affect minxin/huangwei (聊天无政治代价)');

console.log('===== 询问·无副作用 =====');
const c1 = addPrisoner(ctx, '张三', '下狱待决');
const minxinBefore = ctx.GM.minxin.trueIndex;
const huangweiBefore = ctx.GM.huangwei.index;
WP._executeAction('张三', c1, 'inquire', null);
assert(ctx.GM.minxin.trueIndex === minxinBefore, `inquire should not change minxin·was ${minxinBefore}·now ${ctx.GM.minxin.trueIndex}`);
assert(ctx.GM.huangwei.index === huangweiBefore, `inquire should not change huangwei`);
assert(c1._imprisoned === true, 'inquire should NOT release prisoner');

console.log('===== 慰问·民心 -1·忠诚 +5 =====');
const c2 = addPrisoner(ctx, '李四', '下狱');
const loyB = c2.loyalty;
const mxB = ctx.GM.minxin.trueIndex;
WP._executeAction('李四', c2, 'comfort', null);
assert(c2.loyalty === loyB + 5, `comfort should +5 loyalty·was ${loyB}·now ${c2.loyalty}`);
assert(ctx.GM.minxin.trueIndex === mxB - 1, `comfort should -1 minxin·was ${mxB}·now ${ctx.GM.minxin.trueIndex}`);

console.log('===== 严讯·忠诚 -15·健康 -10 =====');
const c3 = addPrisoner(ctx, '王五', '下狱');
const loyB3 = c3.loyalty;
const healthB3 = c3.health;
WP._executeAction('王五', c3, 'interrogate', null);
assert(c3.loyalty === loyB3 - 15, `interrogate should -15 loyalty·was ${loyB3}·now ${c3.loyalty}`);
assert(c3.health === healthB3 - 10, `interrogate should -10 health`);

console.log('===== 赦免·清 _imprisoned + 民心 -3 + 皇威 -5 =====');
const c4 = addPrisoner(ctx, '赵六', '下狱');
const mxB4 = ctx.GM.minxin.trueIndex;
const hwB4 = ctx.GM.huangwei.index;
WP._executeAction('赵六', c4, 'pardon', null);
assert(c4._imprisoned === false, `pardon should clear _imprisoned·got ${c4._imprisoned}`);
assert(ctx.GM.minxin.trueIndex === mxB4 - 4, `pardon should -4 minxin (was -3 + 党争 +1·改纯 -4 minxin)`);
assert(ctx.GM.huangwei.index === hwB4 - 5, `pardon should -5 huangwei`);

console.log('===== 释放·清 _imprisoned·代价较轻 =====');
const c5 = addPrisoner(ctx, '钱七', '下狱');
const mxB5 = ctx.GM.minxin.trueIndex;
WP._executeAction('钱七', c5, 'release', null);
assert(c5._imprisoned === false, 'release should clear _imprisoned');
assert(ctx.GM.minxin.trueIndex === mxB5 - 1, 'release should -1 minxin (lighter than pardon)');

console.log('===== 加刑·忠诚 -20·健康 -20 =====');
const c6 = addPrisoner(ctx, '孙八', '下狱');
const loyB6 = c6.loyalty;
const healthB6 = c6.health;
WP._executeAction('孙八', c6, 'addPunishment', null);
assert(c6.loyalty === loyB6 - 20, 'addPunishment should -20 loyalty');
assert(c6.health === healthB6 - 20, 'addPunishment should -20 health');

console.log('===== 频率限制·单回合 ≤ 2 次 =====');
const ctx2 = makeCtx();
const cFr = addPrisoner(ctx2, '周九', '下狱');
ctx2.WenduiPrison._executeAction('周九', cFr, 'inquire', null);
ctx2.WenduiPrison._executeAction('周九', cFr, 'inquire', null);
assert(ctx2.WenduiPrison._turnVisitCount('周九') === 2, 'should count 2 visits in same turn');
ctx2.WenduiPrison._executeAction('周九', cFr, 'inquire', null);  // 3rd should be blocked·but no throw
assert(ctx2.WenduiPrison._turnVisitCount('周九') === 2, '3rd visit in same turn should be rejected·count stays 2');

console.log('===== chat·不计频率·不动状态 =====');
const ctxC = makeCtx();
const cChat = addPrisoner(ctxC, '罗一', '下狱');
const mxC = ctxC.GM.minxin.trueIndex;
const loyC = cChat.loyalty;
// chat 在 node 测试里走 requiresText 路径会 noop (没 document)·所以模拟带 freeText 直接调
// 直接调用·跳过 textarea 校验 (node 无 document·_requiresText 检查会 return·我们绕过测)
// 改测·chat 不会自增 visit count
const visitBefore = ctxC.WenduiPrison._turnVisitCount('罗一');
// chat with explicit document mock would be needed for full e2e. Just check non-incremented when allowed.
// 我们调 inquire 一次·然后用 chat (但 chat 会因为 node 无 document 早 return)
ctxC.WenduiPrison._executeAction('罗一', cChat, 'inquire', null);
const visitAfter1 = ctxC.WenduiPrison._turnVisitCount('罗一');
assert(visitAfter1 === visitBefore + 1, 'inquire should +1 visit');
// chat 模式·node 无 document·_requiresText 检查 return·不应该有副作用
ctxC.WenduiPrison._executeAction('罗一', cChat, 'chat', null);
assert(ctxC.WenduiPrison._turnVisitCount('罗一') === visitAfter1, 'chat in node (no document) should noop·visit count unchanged');
assert(ctxC.GM.minxin.trueIndex === mxC, 'chat should not change minxin');
assert(cChat.loyalty === loyC, 'chat should not change loyalty');

console.log('===== 累计 ≥ 5·触发朝议奏疏 =====');
const ctx3 = makeCtx();
const cFav = addPrisoner(ctx3, '吴十', '下狱');
const hwBeforeFav = ctx3.GM.huangwei.index;
for (let t = 1; t <= 5; t++) {
  ctx3.GM.turn = t;  // 每回合一次·避免单回合阻断
  ctx3.WenduiPrison._executeAction('吴十', cFav, 'inquire', null);
}
assert(ctx3.WenduiPrison._totalVisits('吴十') === 5, `cumulative should be 5·got ${ctx3.WenduiPrison._totalVisits('吴十')}`);
assert(ctx3.GM.memorials.length >= 1, `should have ≥1 memorial after 5 visits·got ${ctx3.GM.memorials.length}`);
const fav = ctx3.GM.memorials.find(m => m._source === 'prison-favoritism-trigger');
assert(fav, 'should have prison-favoritism-trigger memorial');
assert(fav && fav.from === '都察院', `memorial from should be 都察院·got ${fav && fav.from}`);
assert(ctx3.GM.huangwei.index < hwBeforeFav, `huangwei should drop after favoritism trigger·was ${hwBeforeFav}·now ${ctx3.GM.huangwei.index}`);

console.log('===== qijuHistory 入近事快报 =====');
const ctx4 = makeCtx();
ctx4.GM.qijuHistory = [];
const cQ = addPrisoner(ctx4, '郑一', '下狱');
ctx4.WenduiPrison._executeAction('郑一', cQ, 'inquire', null);
const qj = ctx4.GM.qijuHistory.find(q => q._source === 'prison-dialogue');
assert(qj, 'should push prison-dialogue qiju entry');
assert(qj && qj.category === '人事', `qiju category should be 人事·got ${qj && qj.category}`);

console.log('===== polish 2·健康归 0 → 狱中卒 =====');
const ctx5 = makeCtx();
ctx5.GM.qijuHistory = [];
const cDie = addPrisoner(ctx5, '王二', '下狱');
cDie.health = 25;  // 接近临界
// 第一次加刑 -20·还剩 5
ctx5.WenduiPrison._executeAction('王二', cDie, 'addPunishment', null);
assert(cDie.alive === true, 'after first addPunishment (health 5)·should still be alive');
// 第二次加刑 -20·跌破 0
ctx5.GM.turn = 6;  // 下回合·避频率限制
ctx5.WenduiPrison._executeAction('王二', cDie, 'addPunishment', null);
assert(cDie.alive === false, `after second addPunishment·should die·alive=${cDie.alive}`);
assert(/狱中卒/.test(cDie._deathCause), `_deathCause should contain 狱中卒·got "${cDie._deathCause}"`);
assert(cDie._imprisoned === false, 'dead prisoner should have _imprisoned cleared');
const deathQiju = ctx5.GM.qijuHistory.find(q => q._source === 'prison-death');
assert(deathQiju, 'should push prison-death qiju');
const impeach = ctx5.GM.memorials.find(m => m._source === 'prison-death-impeach');
assert(impeach, 'should push 都察院 impeach memorial');
assert(impeach && impeach.from === '都察院', 'impeach from should be 都察院');

console.log('===== polish 3·每回合自动事件 =====');
const ctx6 = makeCtx();
ctx6.GM.qijuHistory = [];
ctx6.GM.turn = 5;  // 已过几回合
// 固定 Math.random·让事件触发
const origRandom = Math.random;
Math.random = () => 0.1;  // 总是 ≤ 0.34·必触发
const cEv = addPrisoner(ctx6, '李三', '下狱');
cEv._imprisonedTurn = 1;  // 已羁押 4 月
const ret = ctx6.WenduiPrison._runTurnEvents(ctx6.GM);
assert(ret.triggered === 1, `should trigger 1 event·got ${ret.triggered}`);
const evQiju = ctx6.GM.qijuHistory.find(q => q._source && q._source.indexOf('prison-event-') === 0);
assert(evQiju, 'should push prison-event-* qiju entry');
// EVENTS 暴露
assert(Object.keys(ctx6.WenduiPrison.EVENTS).length === 4, 'should expose 4 event types');

// 不应触发·刚入狱 (heldMonths < 1)
const ctx7 = makeCtx();
ctx7.GM.qijuHistory = [];
ctx7.GM.turn = 1;
const cFresh = addPrisoner(ctx7, '赵四', '下狱');
cFresh._imprisonedTurn = 1;  // 同回合·heldMonths === 0
const ret2 = ctx7.WenduiPrison._runTurnEvents(ctx7.GM);
assert(ret2.triggered === 0, `should not trigger for freshly imprisoned·got ${ret2.triggered}`);

Math.random = origRandom;

console.log('');
console.log(`[smoke-wendui-prison] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
