'use strict';
// smoke-agent-mode-daq3.js — DA-Q3·输入 parity
//   ① _memoryDossier:跨回合记忆 push 进 baseline(地板·命门「记忆不弱于 LLM」)
//   ② _readToolsOnly ⊊ _allTools:首轮只读+finalize·治超窗
//   ③ run 集成:首轮 cawt 收到的 tools = 只读集·轮2 = 全量·且首轮 transcript 含记忆地板
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
const AM = TM.Endturn.AgentMode;

// ── ① _memoryDossier:有记忆→含标志·无记忆→空 ──
var gmMem = {
  turn: 5,
  _stateBoard: { mood: '朝局紧绷', open_loops: ['辽饷未解'] },
  _consolidatedMemory: '崇祯元年锁拿魏忠贤·阉党残余暗结',
  _plotThreads: [{ title: '辽东危局' }, '东林复起'],
  _foreshadows: [{ content: '袁崇焕五年复辽之诺' }]
};
var md = AM.memoryDossier(gmMem);
assert(/跨回合记忆/.test(md), '① _memoryDossier 有标头(跨回合记忆·与 LLM 同源)');
assert(/状态盘/.test(md) && /朝局紧绷/.test(md), '① 含上回合状态盘(跨回合连续性)');
assert(/固化记忆/.test(md) && /锁拿魏忠贤/.test(md), '① 含跨回合固化记忆');
assert(/情节线索/.test(md) && /辽东危局/.test(md), '① 含情节线索');
assert(/伏笔/.test(md) && /五年复辽/.test(md), '① 含未回收伏笔');
assert(AM.memoryDossier({ turn: 1 }) === '', '① turn1/无记忆 → 空串(不占位)');
assert(AM.memoryDossier(null) === '', '① 无 gm → 空串(不崩)');

// ── ② _readToolsOnly ⊊ _allTools:只读+finalize·无写/深化 ──
var ro = AM.readToolsOnly().map(function (t) { return t.name; });
var all = AM.allTools().map(function (t) { return t.name; });
var writeNames = TM.Endturn.AgentWriteTools.defs().map(function (t) { return t.name; });
var depthNames = TM.Endturn.AgentDepthTools.defs().map(function (t) { return t.name; });
assert(ro.indexOf('finalize_turn') >= 0, '② 首轮含 finalize_turn');
assert(ro.indexOf('get_overview') >= 0 && ro.indexOf('recall_history') >= 0, '② 首轮含只读工具(get_overview/recall_history)');
assert(writeNames.length > 0 && writeNames.every(function (n) { return ro.indexOf(n) < 0; }), '② 首轮不挂任何写工具(' + writeNames.join('/') + ')');
assert(depthNames.length > 0 && depthNames.every(function (n) { return ro.indexOf(n) < 0; }), '② 首轮不挂任何深化工具');
assert(writeNames.every(function (n) { return all.indexOf(n) >= 0; }) && all.indexOf('recall_consolidate') >= 0 && all.indexOf('deepen_narrative') >= 0, '② 全量含全部写工具 + 收尾综合深化(recall_consolidate/deepen_narrative)');
assert(depthNames.filter(function (n) { return n !== 'recall_consolidate' && n !== 'deepen_narrative'; }).every(function (n) { return all.indexOf(n) < 0; }), '② 维度深化工具(势力/经济/军事等)不挂循环·交 auto-suite 收尾(省 token·仍注册可达)');
assert(ro.length < all.length, '② 首轮工具数 < 全量(治超窗)·' + ro.length + '<' + all.length);
ro.forEach(function (n) { assert(all.indexOf(n) >= 0, '② 首轮工具都在全量内:' + n); });

// ── ③ run 集成:首轮 tools=只读集·轮2=全量·首轮 transcript 含记忆地板 ──
delete globalThis._endTurn_updateSystems;
if (TM.Endturn.AI) TM.Endturn.AI.prompt = null;  // 薄 baseline·聚焦 DA-Q3
globalThis.P = { conf: { agentModeDepthGate: false } };
var seenTools = []; var seenTranscript1 = '';
globalThis.callAIMessages = async function () { return JSON.stringify({}); };
var rounds = [
  { toolCalls: [{ name: 'get_overview', input: {} }], text: '' },                                              // 轮1·读
  { toolCalls: [{ name: 'finalize_turn', input: { narrative: '本回合理政。', summary: '理政' } }], text: '' }   // 轮2·收尾
];
var si = 0;
globalThis.callAIWithTools = async function (transcript, tools) {
  if (si === 0) seenTranscript1 = transcript;
  seenTools.push((tools || []).map(function (t) { return t.name; }));
  var r = rounds[si] || { toolCalls: [], text: '' }; si++; return r;
};
var gmRun = {
  turn: 5, guoku: { money: 1, balance: 1 }, chars: [], facs: [], _turnReport: [],
  _stateBoard: { mood: '朝局紧绷' }, _consolidatedMemory: '锁拿魏忠贤'
};

(async function () {
  var res = await AM.run({ GM: gmRun, input: {} });
  assert(res.ok === true, '③ run 成功·' + (res.reason || ''));
  assert(seenTools.length >= 2, '③ 至少 2 轮 cawt');
  assert(seenTools[0].length === AM.readToolsOnly().length, '③ 首轮 cawt tools = 只读集(懒加载 live·' + seenTools[0].length + ')');
  // 工作流·阶段化:此 run 两轮都 finalize·writeOk 始终 0(未动手)→ 轮2 = 动手阶段工具集(读+写·无深化·非全量)
  assert(seenTools[1].length === AM.actTools().length, '③ 轮2(未动手) cawt tools = 动手阶段集(读+写·无深化·' + seenTools[1].length + ')');
  assert(seenTools[1].indexOf('set_field') >= 0 && depthNames.every(function (n) { return seenTools[1].indexOf(n) < 0; }), '③ 轮2 动手阶段:有写工具·无深化工具(深化由 auto-suite 兜底)');
  assert(seenTools[1].length < AM.allTools().length, '③ 动手阶段 < 全量(全量含深化·已动手后才挂)');
  assert(seenTools[0].length < seenTools[1].length, '③ 首轮(只读) < 轮2(读+写)');
  assert(depthNames.every(function (n) { return seenTools[0].indexOf(n) < 0; }), '③ 首轮无深化工具(懒加载)');
  assert(/跨回合记忆/.test(seenTranscript1) && /朝局紧绷/.test(seenTranscript1), '③ 首轮 transcript 含记忆地板(状态盘 push·parity)');
  console.log('[smoke-agent-mode-daq3] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
