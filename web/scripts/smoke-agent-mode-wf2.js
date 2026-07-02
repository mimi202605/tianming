'use strict';
// ============================================================
// smoke-agent-mode-wf2.js — 「模式 b · 工作流程/工具调用优化(第二轮)」(2026-06-22·owner"继续优化工作流程与工具调用")
//   四刀:① 自适应深化套件(空维度不跑·去填充噪音+省调用·地板永驻) ② 上下文/轮次瘦身(只带最近N轮+更早摘要)
//        ③ 工作流可观测(加载动画"正"行显示阶段/深化标签/跳过原因) ④ 批量落地·减轮(系统词+催办引导)
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

global.window = global;
require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const AM = globalThis.TM.Endturn.AgentMode;

(async function () {
  // ── 单元:_activeDims 维度活动判定 ──
  assert(typeof AM.activeDims === 'function', 'activeDims 已导出');
  var dF = AM.activeDims({ _turnReport: [{ path: 'guoku', reason: '赈灾拨粮' }] });
  assert(dF.fiscal === 1 && !dF.military && !dF.faction && !dF.relations, '_activeDims:赈灾→仅 fiscal');
  assert(AM.activeDims({ _turnReport: [{ reason: '后金犯辽西·围宁远' }] }).military === 1, '_activeDims:犯/围→military');
  assert(AM.activeDims({ _turnReport: [{ reason: '遣使与林丹汗议和' }] }).faction === 1, '_activeDims:遣使议和→faction');
  assert(AM.activeDims({ _turnReport: [{ actor: '袁崇焕', reason: '弹劾魏忠贤' }] }).relations === 1, '_activeDims:弹劾→relations');
  var dE = AM.activeDims({ _turnReport: [{ reason: '风调雨顺·四海无事' }] });
  assert(!dE.fiscal && !dE.military && !dE.faction && !dE.relations, '_activeDims:无信号→空(四门控维度全候选跳过)');

  // ── 刀4:系统提示词含批量引导 + deepen_relations 进清单 ──
  var sp = AM.buildSystemPrompt();
  assert(/批量落地/.test(sp), '刀4:系统提示词含"批量落地"引导(单轮多干减往返)');
  assert(/维度深化.*自动补全|自动补齐/.test(sp), '系统提示词说明维度深化由收尾自动补全(模型不必逐一调 deepen_*·循环表不挂)');
  assert(globalThis.TM.Endturn.AgentDepthTools.isToolName('deepen_relations'), 'deepen_relations 工具仍注册可达(auto-suite 跑)');

  // ── 集成:自适应深化 + 可观测 + 瘦身(一次 run 覆盖) ──
  var showMsgs = []; var deepenCalls = [];
  global.showLoading = function (msg) { showMsgs.push(String(msg)); };
  global.hideLoading = function () {}; global.setLoadingCrawlCeil = function () {};
  global._endTurn_updateSystems = async function () { /* engineRan=true·不改 turn */ };
  // 深化工具 handle 打桩:记录被真调的(跳过的不会到这)·返回 ok
  globalThis.TM.Endturn.AgentDepthTools.handle = async function (name) { deepenCalls.push(name); return { ok: true, name: name, text: 'stub' }; };
  var caps = [];
  var si = 0; var reads = { toolCalls: [{ name: 'get_field', input: { path: 'guoku' } }], text: '' };
  global.callAIWithTools = async function (transcript) { caps.push(String(transcript)); si++; return reads; }; // 全程只读→stall 自然退出·触发脚手架跳过(min=0)+自适应 auto-suite

  function freshGM() {
    return { turn: 7, guoku: 12000, neitang: 5000, chars: [{ id: 'c1', name: '张三', loyalty: 60 }], facs: [], evtLog: [],
      _turnReport: [{ type: 'change', path: 'guoku', reason: '开仓赈灾拨粮', turn: 7, _agent: true }] };  // 仅财政信号·无军事/势力/关系
  }
  var gm = freshGM(); global.GM = gm;
  global.P = { conf: { experimentalEnabled: true, experimentalMode: 'agent', agentModeMaxRounds: 8, agentModeDepthGate: false, agentScaffoldMinWrites: 0, agentTranscriptRecentRounds: 2 } };
  var res = await AM.run({ GM: gm, input: { edicts: ['开仓赈灾'] } });
  var meta = gm._agentTurnMeta || {};

  // ① 自适应:无信号维度跳过·有信号(财政)维度跑·地板永驻
  assert(meta.deepenSkipped && meta.deepenSkipped.indexOf('deepen_military') >= 0 && meta.deepenSkipped.indexOf('deepen_factions') >= 0 && meta.deepenSkipped.indexOf('deepen_relations') >= 0, '① 自适应:无信号维度(军事/势力/关系)被跳过');
  assert(meta.deepenSkipped.indexOf('deepen_economy') < 0 && meta.depthTools && meta.depthTools.deepen_economy, '① 自适应:有信号的财政维度仍跑(fiscal active)');
  assert(meta.depthTools.recall_consolidate && meta.depthTools.deepen_npcs && meta.depthTools.deepen_world && meta.depthTools.deepen_narrative, '① 地板工具(记忆/NPC/世界/史记)永远跑');
  assert(deepenCalls.indexOf('deepen_military') < 0 && deepenCalls.indexOf('deepen_economy') >= 0, '① 跳过的工具真没调 handle·跑的真调了(省调用坐实)');
  // deepen_court 入地板(御案时政+求见·每回合演化)·deepen_letters 门控 relations(本回合无人际活动→跳)
  assert(meta.depthTools.deepen_court, '① deepen_court 地板永驻(御案时政+求见每回合演化)');
  assert(meta.deepenSkipped.indexOf('deepen_letters') >= 0, '① deepen_letters 门控 relations·本回合无人际活动→跳过(省调用)');

  // ③ 可观测:加载层"正"行显示深化中文标签 + 跳过原因
  assert(showMsgs.some(function (m) { return /略过/.test(m); }), '③ 加载层显示跳过文案(如"势力无异动·略过")');
  assert(showMsgs.some(function (m) { return /深析财政民生/.test(m); }), '③ 加载层显示深化中文标签(非干瘪工具名)');
  assert(showMsgs.some(function (m) { return /⟨执政⟩亲裁·第\d+轮/.test(m); }), '③ 每轮报亲裁拍(保前缀·beat 匹配不破)');

  // ② 瘦身:首轮 transcript 纯基线无往轮结果·后续轮出现"前N轮已"摘要(非全量重发)
  assert(caps.length >= 3, '② 多轮跑起来(stall 退出前)·轮数=' + caps.length);
  assert(!/【第\d+轮·工具结果】/.test(caps[0]), '② 首轮 transcript 纯基线(无往轮工具结果)');
  assert(caps.some(function (t) { return /前 \d+ 轮已/.test(t); }), '② 后续轮 transcript 出现"前N轮已"摘要(瘦身生效·旧轮折叠非全量重发)');
  // 末轮不含最早一轮的全文块(已被折叠成摘要)
  var lastCap = caps[caps.length - 1];
  assert(!/【第1轮·工具结果】/.test(lastCap), '② 末轮 transcript 已折叠掉第1轮全文(只留最近N轮)');

  // ── 深度门与刀1同口径:门控维度无活动→不算脊柱缺口(否则深度门逼模型对死维度空转·正是刀1要消的浪费) ──
  var gmQuiet = { turn: 7, _agentWriteLog: [], _turnReport: [{ type: 'change', path: 'guoku', reason: '开仓赈灾拨粮', _agent: true }, { type: 'narrative', text: '本回合开仓赈灾。' }] };  // 仅财政+民生信号·无军事/势力
  var stQuiet = { depthTools: { recall_consolidate: 1, deepen_narrative: 1, deepen_world: 1 } };  // 地板已覆盖记忆/史记/事件
  global.P.conf.agentAdaptiveDeepen = true;
  var gapsAd = AM.detectSpineGaps(gmQuiet, stQuiet);
  assert(gapsAd.indexOf('军事') < 0 && gapsAd.indexOf('势力与外交') < 0, '深度门自适应:无活动的军事/势力维度不算缺口(与刀1同口径·不逼空转)');
  global.P.conf.agentAdaptiveDeepen = false;
  var gapsNo = AM.detectSpineGaps(gmQuiet, stQuiet);
  assert(gapsNo.indexOf('军事') >= 0 && gapsNo.indexOf('势力与外交') >= 0, 'agentAdaptiveDeepen=false:军事/势力空维度仍按缺口(全覆盖严格模式·逃生口)');
  global.P.conf.agentAdaptiveDeepen = true;

  // ── 自适应关闭(agentAdaptiveDeepen=false)→ 全跑不跳 ──
  var gm2 = freshGM(); global.GM = gm2; deepenCalls = []; si = 0;
  global.P.conf.agentAdaptiveDeepen = false;
  await AM.run({ GM: gm2, input: { edicts: ['开仓赈灾'] } });
  var meta2 = gm2._agentTurnMeta || {};
  assert((meta2.deepenSkipped || []).length === 0, 'agentAdaptiveDeepen=false → 不跳过(全维度跑·深度纯粹优先的逃生口)');
  assert(meta2.depthTools.deepen_military && meta2.depthTools.deepen_factions && meta2.depthTools.deepen_relations, 'agentAdaptiveDeepen=false → 军事/势力/关系也跑');

  // ── 回归命门:循环不挂维度深化工具后·模型自 finalize → 维度深化仍由 auto-suite 补全(不补则势力/经济/军事深析永缺)──
  var gm3 = freshGM(); global.GM = gm3; deepenCalls = [];
  global.P.conf.agentAdaptiveDeepen = true; global.P.conf.agentModeDepthGate = false;  // 门关·让模型首轮即可自收尾(测 auto-suite 是否仍补)
  global.callAIWithTools = async function () { return { toolCalls: [{ name: 'finalize_turn', input: { summary: '自收尾', narrative: '模型自己收尾' } }], text: '' }; };
  await AM.run({ GM: gm3, input: { edicts: ['开仓赈灾·整饬边军'] } });  // 财政(赈灾)+军事(边军)信号
  var meta3 = gm3._agentTurnMeta || {};
  assert(meta3.finalized === true && meta3.autoClosed === false, '回归:模型自 finalize → finalized 且 autoClosed=false(尊重模型自收尾·非 loop 兜底)');
  assert(meta3.depthTools && meta3.depthTools.deepen_economy && meta3.depthTools.deepen_military, '回归命门:模型自收尾后·维度深化(经济/军事)仍由 auto-suite 补全(循环不挂深化工具也不丢深度)');
  global.P.conf.agentModeDepthGate = true;

  // ── 回归:自动深化失败不得记功；engine-first 的真实状态变化即使没写 _turnReport，也要触发对应维度 ──
  var gm4 = { turn: 11, guoku: 1000, neitang: 100, chars: [{ name: '甲' }], facs: [], evtLog: [], _turnReport: [] };
  global.GM = gm4; deepenCalls = [];
  global.P.conf.agentAdaptiveDeepen = true; global.P.conf.agentModeDepthGate = false; global.P.conf.agentScaffoldMinWrites = 0; global.P.conf.agentModeMaxRounds = 1;
  global._endTurn_updateSystems = async function () { gm4.turn += 1; gm4.guoku -= 250; return { ok: true, appliedCount: 1 }; };
  global.callAIWithTools = async function () { return { toolCalls: [], text: '' }; };
  globalThis.TM.Endturn.AgentDepthTools.handle = async function (name) {
    deepenCalls.push(name);
    if (name === 'deepen_economy') return { ok: false, name: name, text: '经济深化失败' };
    return { ok: true, name: name, text: 'stub' };
  };
  await AM.run({ GM: gm4, input: { edicts: [] }, results: {} });
  var meta4 = gm4._agentTurnMeta || {};
  assert(deepenCalls.indexOf('deepen_economy') >= 0, 'engine-first 改动国库但无 _turnReport 文本 → 仍触发经济深化');
  assert(!meta4.depthTools.deepen_economy, '自动深化失败(deepen_economy ok=false)不得记入 depthTools');
  assert(meta4.deepenFailed && meta4.deepenFailed.indexOf('deepen_economy') >= 0, '自动深化失败须进入 meta.deepenFailed 便于诊断');
  delete global._endTurn_updateSystems;

  console.log('[smoke-agent-mode-wf2] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
