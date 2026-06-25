'use strict';
// ============================================================
// smoke-agent-mode-s10.js — 「模式 b · agent 模式」S10 深化工具守卫(C 方案)
//   验:deepen_world 复用 sc28 输出目标(_aiMemory/_foreshadows/_lastSc28Snapshot)·agent 上下文喂·走网关
//       + _turnDigest 汇总本回合 + 网关缺失/解析失败兜底 + agent-mode allTools/dispatch 接入
// ============================================================

const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const DT = TM.Endturn.AgentDepthTools;
const AM = TM.Endturn.AgentMode;

assert(DT && typeof DT.handle === 'function', 'AgentDepthTools.handle 已导出');
assert(DT.defs().length >= 1 && DT.isToolName('deepen_world'), 'deepen_world 工具在(后续刀另加深化工具)');

function makeGM() {
  return {
    turn: 7, guoku: { balance: 1000 }, vars: { minxin: { value: 50 } },
    chars: [{ name: '张三', alive: true, loyalty: 20, ambition: 80, stress: 50, _changed: true }],
    _turnReport: [{ type: 'narrative', text: '本回合北方告急·开仓赈灾' }],
    _agentWriteLog: [{ path: 'guoku.money', reason: '赈灾拨款' }]
  };
}

(async function () {
  // ── _turnDigest 汇总 ──
  var dg = DT._turnDigest(makeGM());
  assert(/本回合纪事/.test(dg) && /北方告急/.test(dg), '_turnDigest 含 narrative');
  assert(/本回合改动/.test(dg) && /赈灾/.test(dg), '_turnDigest 含改动');
  assert(/资源/.test(dg) && /关键角色/.test(dg) && /张三/.test(dg), '_turnDigest 含资源+关键角色');

  // ── deepen_world 复用 sc28 输出目标 ──
  var gm = makeGM(); var ctx = { GM: gm };
  globalThis.callAIMessages = async function (msgs, tok, sig, tier) {
    return '{"world_snapshot":"北境烽烟·国库支绌·张三野心炽","next_turn_seeds":"张三或反·灾民将聚","tension_level":"8·边患+财政"}';
  };
  var r = await DT.handle('deepen_world', {}, ctx);
  assert(r.ok === true, 'deepen_world 成功');
  assert(Array.isArray(gm._aiMemory) && gm._aiMemory.some(function (m) { return m.type === 'snapshot' && /北境烽烟/.test(m.content); }), '写 _aiMemory(snapshot·复用 sc28 目标)');
  assert(Array.isArray(gm._foreshadows) && gm._foreshadows.some(function (f) { return /张三或反/.test(f.content); }), '写 _foreshadows(下回合种子)');
  assert(gm._lastSc28Snapshot && /北境烽烟/.test(gm._lastSc28Snapshot.world_snapshot) && gm._lastSc28Snapshot._agent === true, '写 _lastSc28Snapshot(跨回合锚·下回合 sc1 读)');
  assert(gm._turnReport.some(function (e) { return e._op === 'deepen_world'; }), '入 _turnReport(可见)');

  // ── 网关缺失 → 兜底 ──
  var savedCAM = globalThis.callAIMessages;
  delete globalThis.callAIMessages;
  r = await DT.handle('deepen_world', {}, { GM: makeGM() });
  assert(r.ok === false && /callAIMessages/.test(r.text), '网关缺失 → 兜底不抛');
  // ── 解析失败 → 兜底 ──
  globalThis.callAIMessages = async function () { return '不是JSON的废话'; };
  r = await DT.handle('deepen_world', {}, { GM: makeGM() });
  assert(r.ok === false && /解析失败|空/.test(r.text), '解析失败 → 兜底');
  globalThis.callAIMessages = savedCAM;

  // ── agent-mode 接入:deepen_world 已注册可达(auto-suite 收尾跑·循环表不再挂维度深化·省 token)──
  assert(globalThis.TM.Endturn.AgentDepthTools.isToolName('deepen_world'), 'deepen_world 已注册可达(auto-suite·循环表不挂)');

  var gm2 = makeGM(); var ctx2 = { GM: gm2, input: {} };
  globalThis.P = undefined; delete globalThis._endTurn_updateSystems;
  var si = 0; var script = [
    { toolCalls: [{ name: 'deepen_world', input: {} }], text: '' },
    { toolCalls: [{ name: 'finalize_turn', input: { narrative: 'x', summary: 's' } }], text: '' }
  ];
  globalThis.callAIWithTools = async function () { return script[si++] || { toolCalls: [], text: '' }; };
  // depth 工具内部的网关
  globalThis.callAIMessages = async function () { return '{"world_snapshot":"循环内深化OK","next_turn_seeds":"种子","tension_level":"5"}'; };
  var res = await AM.run(ctx2);
  assert(res.ok === true, 'run 经 deepen_world 后成功提交');
  assert(gm2._lastSc28Snapshot && /循环内深化OK/.test(gm2._lastSc28Snapshot.world_snapshot), 'run 循环内路由 deepen_world → 写入世界锚');

  console.log('[smoke-agent-mode-s10] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
