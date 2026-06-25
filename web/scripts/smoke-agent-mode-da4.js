'use strict';
// smoke-agent-mode-da4.js — DA4·因果链连续性
//   recall_consolidate 产 causal_edges → gm._causalGraph.edges(镜像 followup sc-memwrite:938·被 ai.js:1952 下回合推演读)
//   + _memoryDossier 纳入近期因果链(agent 读自己的因果图·parity)
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const DT = TM.Endturn.AgentDepthTools;
const AM = TM.Endturn.AgentMode;

// ── ① recall_consolidate 产 causal_edges → _causalGraph.edges(结构镜像 followup)──
globalThis.callAIMessages = async function () {
  return JSON.stringify({
    memory: '本回合锁拿魏忠贤，阉党震动。',
    state_board: { mood: '肃杀', recent_summary: '诛阉初政', open_loops: ['辽饷'], unfulfilled_promises: [] },
    plot_updates: [{ title: '阉党清算', threadType: 'political', update: '锁拿首恶', status: 'active', newThread: true }],
    foreshadow: ['阉党残余暗结待发'],
    causal_edges: [
      { from: '锁拿魏忠贤', to: '阉党离心', type: 'triggered', strength: 0.8, explanation: '首恶下狱致党羽散' },
      { from: '阉党离心', to: '东林复起', type: 'enabled', strength: 0.6, explanation: '腾出朝堂空间' },
      { from: '', to: '无效', type: 'triggered' }  // 缺 from·应跳过
    ]
  });
};
var gm = { turn: 4, chars: [], facs: [], _turnReport: [] };

(async function () {
  var r = await DT.handle('recall_consolidate', {}, { GM: gm });
  assert(r.ok === true, '① recall_consolidate ok');
  assert(gm._causalGraph && Array.isArray(gm._causalGraph.edges), '① 产 _causalGraph.edges');
  assert(gm._causalGraph.edges.length === 2, '① 有效边=2(缺 from 跳过)·实=' + gm._causalGraph.edges.length);
  var e0 = gm._causalGraph.edges[0];
  assert(e0.from === '锁拿魏忠贤' && e0.to === '阉党离心' && e0.type === 'triggered' && e0.strength === 0.8 && /首恶下狱/.test(e0.explanation) && e0.turn === 4 && e0._agent, '① 边结构镜像 followup(from/to/type/strength/explanation/turn/_agent)');
  assert(r.text && /因果链/.test(r.text), '① 产出文案含"因果链"');

  // ── ② _memoryDossier 纳入因果链(下回合推演读·与 ai.js:1952 同源)──
  var md = AM.memoryDossier(gm);
  assert(/近期因果链/.test(md) && /锁拿魏忠贤→阉党离心/.test(md), '② _memoryDossier 含近期因果链(parity)');

  // ── ③ 边 LRU≤300·新边在尾 ──
  var gm2 = { turn: 1, _causalGraph: { nodes: [], edges: [] } };
  for (var k = 0; k < 305; k++) gm2._causalGraph.edges.push({ id: 'old' + k, from: 'a', to: 'b', turn: 0 });
  globalThis.callAIMessages = async function () { return JSON.stringify({ memory: 'x', causal_edges: [{ from: 'c', to: 'd', type: 'triggered', strength: 0.5, explanation: 'e' }] }); };
  await DT.handle('recall_consolidate', {}, { GM: gm2 });
  assert(gm2._causalGraph.edges.length <= 300, '③ 因果边 LRU≤300·实=' + gm2._causalGraph.edges.length);
  assert(gm2._causalGraph.edges[gm2._causalGraph.edges.length - 1].from === 'c', '③ 新边在尾(保留最近)');

  console.log('[smoke-agent-mode-da4] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
