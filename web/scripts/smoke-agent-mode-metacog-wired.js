'use strict';
// ============================================================
// smoke-agent-mode-metacog-wired.js — 四元认知特性 flag-ON 整链集成(封顶验证接线)
//   四开关全开跑完整 AgentMode.run()·验:
//   ① run 不崩(ok:true) ② basis 注入:反思偏差画像 + 诏令档 + 冷门 nudge + 既定已故 都进了 transcript
//   ③ 回合末/扫描调用都触发:anomaly(gm._agentAnomaly)/reflection(_lastTurnPredictions 更新)/edict(_edictEfficacyReport)/quality(_agentQualityReport)
//   纯 node·脚本化 callAIWithTools(逐轮)+ 内容路由 callAIMessages·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-reflection-agent.js'));
require(path.join(ROOT, 'tm-edict-oversight.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const AM = globalThis.TM.Endturn.AgentMode;
assert(AM && typeof AM.run === 'function', 'AgentMode.run 已导出');

function makeGM() {
  return {
    turn: 7, eraName: '建炎元年', guoku: 12000, neitang: 3000,
    chars: [{ id: 'c1', name: '张三' }, { name: '故臣甲', alive: false, deathTurn: 6 }],
    facs: [{ name: '北府', strength: 50, playerRelation: 10 }], evtLog: [], memorials: [],
    _edictTracker: [{ turn: 4, category: '军务', content: '整饬关宁军备补火器', status: 'partial', progressPercent: 40, assignee: '袁崇焕' }],
    _aiBiasProfile: { biases: [{ domain: '军事', direction: '高估', evidence: '前番', correction: '边军战力按七折估' }] },
    _lastTurnPredictions: { turn: 6, thinking: '上回合预测:辽东趋稳' }
  };
}

(async function () {
  globalThis.P = { conf: { agentSelfReflectEnabled: true, agentQualityGateEnabled: true, agentEdictOversightEnabled: true, agentAnomalyEnabled: true, agentModeDepthGate: false }, ai: { key: 'test-key' } };
  globalThis.extractJSON = function (s) { try { return JSON.parse(s); } catch (e) { return null; } };

  // 逐轮脚本化 callAIWithTools + 捕获 transcript(验注入)
  const transcripts = [];
  const script = [
    { toolCalls: [{ name: 'get_overview', input: {} }, { name: 'adjust_field', input: { path: 'guoku', delta: -1000, reason: '裁撤善后' } }], text: '' },
    { toolCalls: [{ name: 'finalize_turn', input: { narrative: '本回合裁撤都察院,朝野震动。', summary: '裁监察' } }], text: '' }
  ];
  let si = 0;
  globalThis.callAIWithTools = async function (prompt) { transcripts.push(prompt); return script[si++] || { toolCalls: [], text: '' }; };

  // 内容路由 callAIMessages(四特性 + auto-suite 各单发)
  const hit = { anomaly: 0, reflect: 0, edict: 0, qreview: 0, qfix: 0 };
  globalThis.callAIMessages = async function (msgs) {
    const sys = (msgs && msgs[0] && msgs[0].content) || '';
    const u = (msgs && msgs[1] && msgs[1].content) || '';
    if (/史识判官/.test(sys)) { hit.anomaly++; return JSON.stringify({ unusual: true, aspect: '裁撤整个都察院', precedentQuery: '裁撤监察机构' }); }
    if (/自省的推演者|客观比较/.test(sys)) { hit.reflect++; return JSON.stringify({ lesson: '低估裁撤阻力', divergence: 'mid', systematic_biases: [{ domain: '吏治', direction: '低估', evidence: 'x', correction: 'y' }] }); }
    if (/御前督查/.test(sys)) { hit.edict++; return JSON.stringify({ reports: [{ oid: 'e0', executionLevel: 55, status: 'partial' }], overallEfficacy: 55 }); }
    if (/审读官/.test(sys)) { hit.qreview++; return JSON.stringify({ pass: true, issues: [] }); }
    if (/据审读意见修订/.test(sys)) { hit.qfix++; return JSON.stringify({ shizhengji: 'fixed' }); }
    if (/脉络/.test(u)) return JSON.stringify({ beats: ['甲'], tone: 't' });
    if (/撰写《后人戏说》/.test(u)) return JSON.stringify({ houren_xishuo: '是日宫中。' });
    if (/据此产出完整史记/.test(u)) return JSON.stringify({ shizhengji: '本回合陛下诏裁撤都察院全部御史，废止监察。御史尽去，朝野震动，吏治为之一变；然监察空虚之患已伏，各方观望，物议沸然。', shilu: '实录。', zhengwen: '政文。', playerStatus: '状', playerInner: '内', suggestions: ['进言'], title: '标', summary: '摘' });
    if (/causal_edges|固化为记忆/.test(u)) return JSON.stringify({ memory: '记忆', state_board: { mood: 'm', recent_summary: 's', open_loops: [], unfulfilled_promises: [] } });
    return JSON.stringify({});
  };

  const gm = makeGM();
  const res = await AM.run({ GM: gm, input: { edicts: ['裁撤都察院全部御史·废止监察'] } });

  // ① run 不崩
  assert(res && res.ok === true && res.fallback === false, '① 四特性全开·run 成功接管不崩(ok:true)');

  // ② basis 注入(转抄第一轮 prompt 含四注入)
  const t0 = transcripts[0] || '';
  assert(/系统性偏差/.test(t0) && /边军战力按七折估/.test(t0), '② 反思偏差画像注入 basis(切片1)');
  assert(/在办诏令/.test(t0) && /整饬关宁军备补火器/.test(t0) && /40%/.test(t0), '② 在办诏令档注入 basis(切片3)');
  assert(/已故/.test(t0) && /故臣甲/.test(t0), '② 既定事实近期已故注入 basis(切片3·防复活)');
  assert(/举措非常规/.test(t0) && /裁撤整个都察院/.test(t0) && /有史可依/.test(t0), '② 冷门动作深查 nudge 注入 basis(切片4·命门)');

  // ③ 各调用触发 + 落账
  assert(hit.anomaly === 1, '③ 冷门扫描触发一次(切片4)');
  assert(gm._agentAnomaly && /都察院/.test(gm._agentAnomaly.aspect), '③ gm._agentAnomaly 落账');
  assert(hit.reflect === 1, '③ 自我反思触发一次(切片1)');
  assert(/裁撤都察院/.test((gm._lastTurnPredictions && gm._lastTurnPredictions.thinking) || ''), '③ 反思更新 _lastTurnPredictions 为本回合推演(下回合基线)');
  assert(hit.edict === 1 && gm._edictEfficacyReport, '③ 诏令督查触发+写 _edictEfficacyReport(切片3)');
  assert(hit.qreview === 1 && gm._agentQualityReport && gm._agentQualityReport.pass === true, '③ 内容质量闸审查触发+写 _agentQualityReport(切片2·通过则不修补)');
  assert(hit.qfix === 0, '③ 质量审查通过→不触发修补(节制)');

  console.log('[smoke-agent-mode-metacog-wired] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
