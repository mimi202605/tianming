'use strict';
// ============================================================
// smoke-agent-mode-s12.js — 「模式 b · agent 模式」S12 深化工具·recall_consolidate(复用 sc25)
//   验:本回合固化→记忆(_aiMemory/_consolidatedMemory)+状态盘(_stateBoard·下回合sc1读)
//       +情节线索(_plotThreads·new/update by id)+伏笔(_foreshadows) + 部分产出 + 兜底 + 接入
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

assert(DT.isToolName('recall_consolidate') && DT.isToolName('deepen_world'), 'recall_consolidate 工具在(不锁总数)');

function makeGM() {
  return {
    turn: 9, _turnReport: [{ type: 'narrative', text: '本回合权臣下狱·夺嫡白热' }], _agentWriteLog: [{ path: 'x', reason: '权臣下狱' }],
    _plotThreads: [{ id: 't1', title: '夺嫡之争', status: 'active', threadType: 'succession', lastUpdateTurn: 5, updates: [{ turn: 5, text: '储位空悬' }] }]
  };
}

(async function () {
  var gm = makeGM();
  globalThis.callAIMessages = async function () {
    return JSON.stringify({
      memory: '第9回合:权臣张三下狱·夺嫡转白热·国库支绌',
      state_board: { mood: '百官观望·恐惧大于希望', recent_summary: '权臣下狱引朝局震荡', open_loops: ['北境军情未决', '储位悬'], unfulfilled_promises: ['减税诏未颁'] },
      plot_updates: [
        { threadId: 't1', title: '夺嫡之争', threadType: 'succession', update: '白热化·二皇子结党', status: 'climax', newThread: false },
        { threadId: null, title: '北境边患', threadType: 'military', update: '敌酋异动', status: 'brewing', newThread: true }
      ],
      foreshadow: ['张三狱中或攀咬·牵连户部', '二皇子将逼宫']
    });
  };
  var r = await DT.handle('recall_consolidate', {}, { GM: gm });
  assert(r.ok === true, 'recall_consolidate 成功');
  // 记忆
  assert(Array.isArray(gm._aiMemory) && gm._aiMemory.some(function (m) { return /权臣张三下狱/.test(m.text); }), '写 _aiMemory({text})');
  assert(Array.isArray(gm._consolidatedMemory) && gm._consolidatedMemory.length === 1, '写 _consolidatedMemory');
  // 状态盘(下回合 sc1 读)
  assert(gm._stateBoard && /权臣下狱引朝局震荡/.test(gm._stateBoard.recent_summary) && gm._stateBoard._agent && gm._stateBoard.open_loops.length === 2, '写 _stateBoard(recent_summary/open_loops·下回合 sc1 读)');
  // 情节线索:既有线更新 + 新线创建
  var t1 = gm._plotThreads.find(function (t) { return t.id === 't1'; });
  assert(t1 && t1.status === 'climax' && t1.lastUpdateTurn === 9 && t1.updates.some(function (u) { return /白热化/.test(u.text); }), '_plotThreads:既有线 t1 更新(status/进展)');
  assert(gm._plotThreads.some(function (t) { return t.title === '北境边患' && t.threadType === 'military' && t._agent; }), '_plotThreads:新线创建');
  // 伏笔
  assert(Array.isArray(gm._foreshadows) && gm._foreshadows.length === 2, '写 _foreshadows');
  assert(gm._turnReport.some(function (e) { return e._op === 'recall_consolidate'; }), '入 _turnReport(可见)');

  // ── 既有线 title 去重(不重复建) ──
  gm = makeGM();
  globalThis.callAIMessages = async function () { return JSON.stringify({ memory: 'm', plot_updates: [{ threadId: null, title: '夺嫡之争', update: 'x', status: 'active', newThread: true }] }); };
  r = await DT.handle('recall_consolidate', {}, { GM: gm });
  assert(gm._plotThreads.filter(function (t) { return t.title === '夺嫡之争'; }).length === 1, '同名线不重复创建(title 去重)');

  // ── 部分产出(只 memory) ──
  gm = makeGM();
  globalThis.callAIMessages = async function () { return JSON.stringify({ memory: '仅记忆' }); };
  r = await DT.handle('recall_consolidate', {}, { GM: gm });
  assert(r.ok && /记忆/.test(r.text) && !gm._stateBoard, '部分产出(只 memory)也 ok·不强造状态盘');

  // ── 兜底 ──
  var saved = globalThis.callAIMessages;
  delete globalThis.callAIMessages;
  r = await DT.handle('recall_consolidate', {}, { GM: makeGM() });
  assert(!r.ok && /callAIMessages/.test(r.text), '网关缺失→兜底');
  globalThis.callAIMessages = async function () { return '非JSON'; };
  r = await DT.handle('recall_consolidate', {}, { GM: makeGM() });
  assert(!r.ok && /解析失败|空/.test(r.text), '解析失败→兜底');
  globalThis.callAIMessages = saved;

  // ── 接入 ──
  assert(AM.allTools().map(function (t) { return t.name; }).indexOf('recall_consolidate') >= 0, 'allTools 含 recall_consolidate');

  console.log('[smoke-agent-mode-s12] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
