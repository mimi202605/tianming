'use strict';
// smoke-agent-selfcheck-deep.js — 刀E(2026-07-02·CC 收尾保护对照)
//   E2 自检语义加深:原版只查结构合法(turn数字/数组形/报告非空)——「结构合法但语义损坏」的脏回合
//     (名册坏条目/NaN扩散/玩家被误删/回合数漂移)可蒙混提交。加语义断言·旧单参调用全兼容。
//   E1 循环异常留痕:已有落地时中途异常原被静默吞·现降级续跑+meta.loopError 留痕(收尾自检把关)。

const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const AM = globalThis.TM.Endturn.AgentMode;

function healthyGM() {
  return {
    turn: 8, guoku: 12000, neitang: 3000,
    chars: [{ id: 'c1', name: '张三', isPlayer: true }, { id: 'c2', name: '李四' }],
    facs: [{ name: '北府' }], vars: { minxin: { value: 55, min: 0, max: 100 } },
    classes: [{ name: '士绅', satisfaction: 60 }], provinceStats: { '河南': { unrest: 20, wealth: 50 } },
    huangwei: { index: 70 }, _turnReport: [{ type: 'narrative', text: 'x' }]
  };
}

// ── E2 · 语义断言 ──
assert(AM.selfCheck(healthyGM()).ok === true, 'E2 旧单参调用兼容·健康 GM → ok');
assert(AM.selfCheck(healthyGM(), { expectTurn: 8 }).ok === true, 'E2 expectTurn 相符 → ok');
assert(AM.selfCheck(healthyGM(), { expectTurn: 9 }).ok === false, 'E2 turn 漂移(engine-first 后应9实8) → 不过');
let g = healthyGM(); g.chars.push(null);
assert(AM.selfCheck(g).ok === false, 'E2 chars 含 null 条目 → 不过');
g = healthyGM(); g.chars.push({ id: 'x' });
assert(AM.selfCheck(g).ok === false, 'E2 chars 含缺 name 条目 → 不过');
g = healthyGM(); g.facs.push({ strength: 50 });
assert(AM.selfCheck(g).ok === false, 'E2 facs 含缺 name 条目 → 不过');
g = healthyGM(); g.chars = g.chars.filter(function (c) { return !c.isPlayer; });
assert(AM.selfCheck(g, { hadPlayer: true }).ok === false, 'E2 快照有玩家·收尾没了 → 不过');
assert(AM.selfCheck(g, { hadPlayer: false }).ok === true, 'E2 快照本就无玩家标记 → 不误判');
assert(AM.selfCheck(healthyGM(), { hadPlayer: true }).ok === true, 'E2 玩家还在 → ok');
g = healthyGM(); g.vars.minxin.value = NaN;
assert(AM.selfCheck(g).ok === false, 'E2 vars NaN → 不过');
g = healthyGM(); g.classes[0].satisfaction = Infinity;
assert(AM.selfCheck(g).ok === false, 'E2 阶层满意度 Inf → 不过');
g = healthyGM(); g.huangwei.index = NaN;
assert(AM.selfCheck(g).ok === false, 'E2 皇威 NaN → 不过');
g = healthyGM(); g.provinceStats['河南'].unrest = NaN;
assert(AM.selfCheck(g).ok === false, 'E2 省况 NaN → 不过');
g = healthyGM(); g._turnReport.push('裸字符串');
assert(AM.selfCheck(g).ok === false, 'E2 _turnReport 含非对象条目 → 不过');

// ── E1 · 循环异常留痕(行为):round1 落一笔写·round2 响应在读 toolCalls 时抛 → 降级续跑·meta.loopError 留痕 ──
(async function () {
  const gm = { turn: 7, guoku: 12000, neitang: 3000, chars: [{ id: 'c1', name: '张三' }], facs: [{ name: '北府' }], evtLog: [], memorials: [], _turnReport: [] };
  const ctx = { GM: gm, input: {}, results: {} };
  globalThis.P = { conf: {} };
  globalThis._endTurn_updateSystems = async function () { gm.turn += 1; return { ok: true }; };
  let call = 0;
  globalThis.callAIWithTools = async function () {
    call++;
    if (call === 1) return { toolCalls: [{ name: 'adjust_field', input: { path: 'guoku', delta: -1000, reason: '赈灾拨款' } }], text: '推演' };
    const evil = {};
    Object.defineProperty(evil, 'toolCalls', { get() { throw new Error('模拟中途异常'); } });
    return evil;
  };
  const res = await AM.run(ctx);
  assert(res && res.ok === true && res.fallback === false, 'E1 已有落地+中途异常 → 降级完成提交(不整体报废好工作)');
  assert(gm._agentTurnMeta && /模拟中途异常/.test(gm._agentTurnMeta.loopError || ''), 'E1 异常留痕 _agentTurnMeta.loopError(此前静默吞)');
  assert(gm.turn === 8, 'E1 expectTurn 契约随真流程通过(engine-first 后 turn=8)');
  console.log('PASS · ' + passed.value + ' 断言');
})().catch(function (e) { console.error(e); process.exit(1); });
