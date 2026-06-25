'use strict';
// smoke-agent-mode-d1d6.js — 深度保障 D1 深度门 + D6 验证
//   验:① depthGate 直测(浅拒/深过/门关放行) ② detectSpineGaps 记深化工具功 ③ run 集成(浅 finalize 被驳回·深 finalize 过)
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
const AM = TM.Endturn.AgentMode;

// ── ① depthGate 直测 ──
globalThis.P = { conf: {} };  // 门默认开
// 浅:rounds 不足 + 无 recall + 脊柱缺口多 → 拒
var shallow = AM.depthGate({ _agentWriteLog: [], _turnReport: [] }, { rounds: 1, depthTools: {} });
assert(shallow.ok === false, '① 浅(1轮/无固化/缺口多)→ 深度门拒');
assert(/轮次/.test(shallow.reason) && /固化/.test(shallow.reason), '① 拒因含 轮次 + 固化');

// 深:够轮 + recall + 深化工具覆盖多维 + 有叙事
var deepGM = { _agentWriteLog: [{ path: '官', reason: '任免' }, { path: '民', reason: '赈灾' }], _turnReport: [{ type: 'narrative', text: 'x' }] };
var deepState = { rounds: 4, depthTools: { recall_consolidate: 1, deepen_factions: 1, deepen_military: 1, deepen_economy: 1, deepen_world: 1, deepen_narrative: 1 } };
var deep = AM.depthGate(deepGM, deepState);
assert(deep.ok === true, '① 深(4轮/已固化/深化覆盖全维/有叙事)→ 深度门放行·reason=' + deep.reason);

// 门关:always ok
globalThis.P = { conf: { agentModeDepthGate: false } };
assert(AM.depthGate({ _agentWriteLog: [], _turnReport: [] }, { rounds: 1, depthTools: {} }).ok === true, '① 门关(agentModeDepthGate:false)→ 一律放行');
globalThis.P = { conf: {} };

// ── ② detectSpineGaps 记深化工具功 ──
var g1 = AM.detectSpineGaps({ _agentWriteLog: [], _turnReport: [] }, { depthTools: { deepen_factions: 1, deepen_military: 1 } });
assert(g1.indexOf('势力与外交') < 0 && g1.indexOf('军事') < 0, '② 深化工具(deepen_factions/military)→ 对应维度不算缺口');
// 自适应一致:势力有活动(玩家遣使议和意图)但未深化 → 算缺口(blob 不含·活动信号在 _turnPlayerOps)
var g2 = AM.detectSpineGaps({ _agentWriteLog: [], _turnReport: [], _turnPlayerOps: '诏令:遣使议和邦交' }, { depthTools: {} });
assert(g2.indexOf('势力与外交') >= 0, '② 未调深化工具+势力有玩家意图 → 势力维度算缺口(自适应:有活动才要求)');

// ── ③ run 集成:浅 finalize 被驳回·深 finalize 过 ──
delete globalThis._endTurn_updateSystems;   // 不跑 engine-first
if (TM.Endturn.AI) TM.Endturn.AI.prompt = null;  // 依据回落薄 baseline
globalThis.P = { conf: {} };  // 门开
// 深化工具的 callAIMessages stub(内容感知)
globalThis.callAIMessages = async function (msgs) {
  var u = (msgs && msgs[1] && msgs[1].content) || '';
  if (/脉络/.test(u)) return JSON.stringify({ beats: ['甲', '乙'], tone: 't' });
  if (/据此产出完整史记|据此写史记|史记正文|据此写/.test(u)) return JSON.stringify({ shizhengji: '本回合史记。', shilu: '实录。', zhengwen: '政文。', houren: '戏说。', playerStatus: '状态。', playerInner: '反响。', suggestions: ['进言'], title: '标题', summary: '摘要' });
  if (/势力/.test(u)) return JSON.stringify({ factions: [{ name: '后金', intent: 'x', move: 'y', toward_player: '敌对', stance_delta: -5 }] });
  if (/财政经济/.test(u)) return JSON.stringify({ assessment: '财政紧', risks: ['a'], trends: ['b'], fiscal_pressure: '8' });
  if (/军事/.test(u)) return JSON.stringify({ assessment: '边危', threats: ['后金'], recommendations: ['补饷'], war_risk: '7' });
  return JSON.stringify({ memory: 'm', state_board: { mood: 'x', recent_summary: 's', open_loops: [], unfulfilled_promises: [] } });
};
var rounds = [
  { toolCalls: [{ name: 'finalize_turn', input: { narrative: '草草', summary: '草' } }], text: '' },        // 轮1 浅收尾 → 应被拒
  { toolCalls: [{ name: 'push_field', input: { path: 'evtLog', value: { turn: 1, text: '事' }, reason: '事件' } }], text: '' },  // 轮2 事件
  { toolCalls: [{ name: 'deepen_factions', input: {} }, { name: 'deepen_military', input: {} }, { name: 'deepen_economy', input: {} }, { name: 'deepen_narrative', input: {} }, { name: 'recall_consolidate', input: {} }], text: '' },  // 轮3 深化全维
  { toolCalls: [{ name: 'finalize_turn', input: { narrative: '本回合史记。', summary: '摘要' } }], text: '' }   // 轮4 深收尾 → 应过
];
var si = 0;
globalThis.callAIWithTools = async function () { var r = rounds[si] || { toolCalls: [], text: '' }; si++; return r; };
var gm = { turn: 1, guoku: { money: 100000, balance: 100000 }, chars: [{ name: '甲', alive: true }], facs: [{ name: '后金', strength: 80 }], armies: [], evtLog: [], _turnReport: [] };

(async function () {
  var res = await AM.run({ GM: gm, input: { edicts: ['整饬'] } });
  assert(res.ok === true && res.fallback === false, '③ run 成功(深度达标后收尾·非回落)·' + (res.reason || ''));
  assert(gm._agentTurnMeta && gm._agentTurnMeta.finalizeRejects >= 1, '③ 浅 finalize 被驳回过(finalizeRejects≥1)·实=' + (gm._agentTurnMeta && gm._agentTurnMeta.finalizeRejects));
  assert(gm._agentTurnMeta && gm._agentTurnMeta.finalized === true, '③ 最终深度达标·已收尾');
  assert(gm._agentTurnMeta && gm._agentTurnMeta.depthTools && gm._agentTurnMeta.depthTools.recall_consolidate, '③ meta 记录深化工具(recall_consolidate)');
  assert(gm._agentTurnMeta && gm._agentTurnMeta.rounds >= 4, '③ 因门驳回多推了轮次(rounds≥4)·实=' + (gm._agentTurnMeta && gm._agentTurnMeta.rounds));
  console.log('[smoke-agent-mode-d1d6] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
