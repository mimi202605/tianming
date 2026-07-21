'use strict';
// smoke-agent-mode-governance.js — 唯一提交器、领域适配器、区划事务与取消信号
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-agent-kernel.js'));
require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-intent-plan.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const IP = TM.Endturn.AgentIntentPlan;
const WT = TM.Endturn.AgentWriteTools;
const DT = TM.Endturn.AgentDepthTools;
const AM = TM.Endturn.AgentMode;

(async function () {
  // ① 正式游戏完整加载时，兴工必须走 canonical CustomBuildAgent，而不是裸 push。
  var canonicalCalls = 0;
  TM.CustomBuildAgent = {
    approveBuild: function (region, appraisal, req, ctx) {
      canonicalCalls++;
      assert(region === '宁远' && appraisal.costActual === 300 && appraisal.timeActual === 2, '① canonical 收到正式造价/工期');
      assert(ctx && ctx.GM && ctx.div && req.name === '镇边台', '① canonical 收到 GM/div/工程请求');
      var b = { name: req.name, status: 'building', remainingTurns: appraisal.timeActual, timeActual: appraisal.timeActual, costActual: appraisal.costActual, _viaAgent: true };
      ctx.div.buildings.push(b);
      return { ok: true, building: b, spent: { money: 300, deficit: 0 } };
    }
  };
  var gmB = { turn: 3, adminHierarchy: { name: '天下', children: [{ name: '宁远', buildings: [] }] }, _turnReport: [], _agentWriteLog: [] };
  var rb = await WT.handle('building_project', { action: 'start', region: '宁远', name: '镇边台', cost: 300, turns: 2, level: 2 }, { GM: gmB });
  assert(rb.ok && rb.result.adapter === 'CustomBuildAgent.approveBuild' && canonicalCalls === 1, '① 兴工优先走 CustomBuildAgent.approveBuild');
  assert(gmB.adminHierarchy.children[0].buildings[0].level === 2 && rb.result.spent.money === 300, '① canonical 工程等级与扣款回执保留');
  var duplicate = await WT.handle('building_project', { action: 'start', region: '宁远', name: '镇边台' }, { GM: gmB });
  assert(!duplicate.ok && canonicalCalls === 1, '① 同名工程在调用领域入口前拒绝');

  // ② 已完工建筑没有逆回 API 时绝不直接删除；逆回异常也保持原物。
  delete TM.BuildingWorks;
  var completed = { name: '旧仓', status: 'completed', appliedTurn: 2, appliedDelta: { 'economyBase.farmland': 5 } };
  gmB.adminHierarchy.children[0].buildings.push(completed);
  var rd = await WT.handle('building_project', { action: 'demolish', region: '宁远', name: '旧仓' }, { GM: gmB });
  assert(!rd.ok && gmB.adminHierarchy.children[0].buildings.indexOf(completed) >= 0, '② 缺逆回 API 时拒拆且建筑仍在');
  TM.BuildingWorks = { revertBuilding: function () { throw new Error('revert-boom'); } };
  rd = await WT.handle('building_project', { action: 'demolish', region: '宁远', name: '旧仓' }, { GM: gmB });
  assert(!rd.ok && gmB.adminHierarchy.children[0].buildings.indexOf(completed) >= 0, '② 逆回异常时拒拆且建筑仍在');
  TM.BuildingWorks.revertBuilding = function (div, b) { delete b.appliedDelta; delete b.appliedTurn; };
  rd = await WT.handle('building_project', { action: 'demolish', region: '宁远', name: '旧仓' }, { GM: gmB });
  assert(rd.ok && gmB.adminHierarchy.children[0].buildings.indexOf(completed) < 0, '② 逆回成功后才移除建筑');

  // 正式 Agent 上下文里，领域适配器存在时禁止再由通用 path 绕开财政账。
  globalThis.FiscalEngine = { spendFromGuoku: function () { return { ok: true }; }, addToGuoku: function () { return { ok: true }; } };
  var rawTreasury = await WT.handle('adjust_field', { path: 'guoku', delta: -1 }, { GM: { turn: 1, guoku: 10 }, meta: { enforceSemanticWrites: true } });
  assert(!rawTreasury.ok && /adjust_treasury/.test(rawTreasury.result.reason), '② 正式上下文的国库裸写被路由到 adjust_treasury');
  delete globalThis.FiscalEngine;

  // ③ 区划改隶是真正移动节点；根保护、环保护、非空删除保护均生效。
  delete TM.CustomBuildAgent;
  var yi = { name: '乙' };
  var jia = { name: '甲', children: [yi] };
  var bing = { name: '丙', children: [] };
  var gmD = { turn: 4, adminHierarchy: { name: '天下', children: [jia, bing] }, _turnReport: [], _agentWriteLog: [] };
  var rr = await WT.handle('restructure_division', { action: 'modify', region: '乙', fields: { parentId: '丙', governor: '张某' } }, { GM: gmD });
  assert(rr.ok && jia.children.length === 0 && bing.children[0] === yi && yi.parentId === '丙' && yi.governor === '张某', '③ parentId 执行真实改隶且同事务修改字段');
  rr = await WT.handle('restructure_division', { action: 'modify', region: '丙', fields: { parentId: '乙' } }, { GM: gmD });
  assert(!rr.ok && gmD.adminHierarchy.children.indexOf(bing) >= 0 && bing.children[0] === yi, '③ 拒绝把上级改隶到自身后代且树未变');
  rr = await WT.handle('restructure_division', { action: 'remove', region: '天下' }, { GM: gmD });
  assert(!rr.ok && gmD.adminHierarchy.name === '天下', '③ 根区划不可废除');
  rr = await WT.handle('restructure_division', { action: 'remove', region: '丙' }, { GM: gmD });
  assert(!rr.ok && gmD.adminHierarchy.children.indexOf(bing) >= 0, '③ 非空区划未显式 force 时不可级联删除');
  rr = await WT.handle('restructure_division', { action: 'add', parent: '甲', name: '乙' }, { GM: gmD });
  assert(!rr.ok, '③ 全树同名新区划拒绝');

  // ④ 深化专家只在克隆态写；白名单提案一次提交，越权提案整批拒绝。
  var real = { turn: 8, _turnReport: [] };
  var isolated = false;
  var okProposal = await IP.runSpecialist('deepen_economy', {}, { GM: real }, async function (_name, _input, sandboxCtx) {
    isolated = sandboxCtx.GM !== real && real._economyDeepening === undefined;
    sandboxCtx.GM._economyDeepening = { assessment: '紧' };
    sandboxCtx.GM._turnReport.push({ type: 'change', path: '经济·态势' });
    return { ok: true, text: 'proposal' };
  });
  assert(isolated && okProposal.ok && okProposal.verified && real._economyDeepening.assessment === '紧', '④ 专家克隆隔离后由唯一提交器一次落地');
  var beforeEconomy = JSON.stringify(real._economyDeepening);
  var badProposal = await IP.runSpecialist('deepen_economy', {}, { GM: real }, async function (_name, _input, sandboxCtx) {
    sandboxCtx.GM.turn = 999;
    sandboxCtx.GM._economyDeepening = { assessment: '越权' };
    return { ok: true, text: 'bad' };
  });
  assert(!badProposal.ok && real.turn === 8 && JSON.stringify(real._economyDeepening) === beforeEconomy, '④ 含受保护字段的提案整批拒绝、不产生半提交');
  var relGM = { turn: 8, chars: [{ name: '甲' }], _turnReport: [] };
  var relProposal = await IP.runSpecialist('deepen_relations', {}, { GM: relGM }, async function (_name, _input, sandboxCtx) {
    sandboxCtx.GM.chars[0]._memory = [{ event: '结盟' }];
    sandboxCtx.GM._npcRelationEvents = [{ id: 'r1' }];
    sandboxCtx.GM._memoryArchiveFull = [{ char: '甲', event: '结盟' }];
    sandboxCtx.GM._agentJsonReasks = 1;
    return { ok: true, text: 'relation proposal' };
  });
  assert(relProposal.ok && relGM._npcRelationEvents.length === 1 && relGM._memoryArchiveFull.length === 1 && relGM._agentJsonReasks === 1, '④ 关系 canonical 的事件/记忆/自纠账随 chars 原子提交');
  var priorRootGM = globalThis.GM;
  var npcGM = { turn: 8, chars: [{ name: '乙' }], _turnReport: [] };
  globalThis.GM = npcGM;
  var npcProposal = await IP.runSpecialist('deepen_npcs', {}, { GM: npcGM }, async function (_name, _input, sandboxCtx) {
    assert(globalThis.GM === sandboxCtx.GM && globalThis.GM !== npcGM, '④ NPC canonical 专家独占 root.GM 克隆沙箱');
    globalThis.GM.chars[0]._memory = [{ event: '忧边' }];
    globalThis.GM._memoryArchiveFull = [{ char: '乙', event: '忧边' }];
    return { ok: true, text: 'npc proposal' };
  });
  assert(npcProposal.ok && npcGM.chars[0]._memory[0].event === '忧边' && npcGM._memoryArchiveFull.length === 1 && globalThis.GM === npcGM, '④ NPC canonical 只在提交边界写真实 GM，随后恢复 root 绑定');
  globalThis.GM = priorRootGM;
  assert(IP.isRootBound('deepen_npcs') && IP.isRootBound('deepen_relations') && !IP.isRootBound('deepen_economy'), '④ 全局引擎专家显式串行标注');
  var priorCallAI = globalThis.callAIMessages, priorAddEB = globalThis.addEB, externalEB = 0;
  globalThis.addEB = function () { externalEB++; };
  globalThis.callAIMessages = async function () { return JSON.stringify({ issue_updates: [{ action: 'add', title: '辽饷核册', category: '财政', description: '核清辽饷' }], audiences: [] }); };
  var courtGM = { turn: 8, chars: [], currentIssues: [], evtLog: [], _turnReport: [] };
  var courtProposal = await IP.runSpecialist('deepen_court', {}, { GM: courtGM }, DT.handle.bind(DT));
  assert(courtProposal.ok && courtGM.currentIssues.length === 1 && courtGM.evtLog.length === 1 && externalEB === 0, '④ 朝务事件只在提案克隆态暂存，提交前不调用真实 addEB');
  globalThis.callAIMessages = priorCallAI;
  globalThis.addEB = priorAddEB;
  var stalePatch = IP.topPatches({ _economyDeepening: { n: 1 } }, { _economyDeepening: { n: 2 } });
  var staleGM = { _economyDeepening: { n: 3 } };
  assert(!IP.commitPatches(staleGM, 'deepen_economy', stalePatch).ok && staleGM._economyDeepening.n === 3, '④ 陈旧提案不能覆盖新状态');

  var parallelGM = { turn: 9, _turnReport: [] }, inFlight = 0, maxInFlight = 0;
  function delayedProposal(rootName, reportPath) {
    return async function (_name, _input, sandboxCtx) {
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(function(resolve) { setTimeout(resolve, 20); });
      sandboxCtx.GM[rootName] = { ok: true };
      sandboxCtx.GM._turnReport.push({ type: 'change', path: reportPath });
      sandboxCtx.GM._agentJsonReasks = 1;
      inFlight--;
      return { ok: true, text: reportPath };
    };
  }
  var preparedPair = await Promise.all([
    IP.proposeSpecialist('deepen_economy', {}, { GM: parallelGM }, delayedProposal('_economyDeepening', '经济·态势')),
    IP.proposeSpecialist('deepen_military', {}, { GM: parallelGM }, delayedProposal('_militaryDeepening', '军事·态势'))
  ]);
  var pc1 = IP.commitSpecialistProposal(parallelGM, preparedPair[0]);
  var pc2 = IP.commitSpecialistProposal(parallelGM, preparedPair[1]);
  assert(maxInFlight === 2 && pc1.ok && pc2.ok, '④ 中段专家可并行产 proposal，提交仍按固定顺序执行');
  assert(parallelGM._turnReport.length === 2 && parallelGM._economyDeepening.ok && parallelGM._militaryDeepening.ok && parallelGM._agentJsonReasks === 2, '④ 并行提案的追加报告/重问计数安全 rebase，不互相覆盖');

  // ⑤ 深化内部公共网关拿到本回合 AbortSignal。
  var controller = new AbortController();
  var seenSignal = null;
  globalThis.callAIMessages = async function (_msgs, _tok, signal) { seenSignal = signal; return JSON.stringify({ assessment: '稳', risks: [], trends: [], fiscal_pressure: '低' }); };
  var signalGM = { turn: 1, guoku: 100, vars: {}, chars: [], _turnReport: [] };
  var depthRes = await DT.handle('deepen_economy', {}, { GM: signalGM, meta: { agentRuntime: { signal: controller.signal } } });
  assert(depthRes.ok && seenSignal === controller.signal, '⑤ 深化调用透传统一 AbortSignal');
  var worldCtrl = new AbortController(), recallCtrl = new AbortController(), reaskSignal = null;
  globalThis.callAIMessages = async function (msgs, _tok, signal) {
    var sys = String((msgs[0] && msgs[0].content) || '');
    if (/上次的输出无法解析/.test(sys)) { reaskSignal = signal; return JSON.stringify({ memory: '回合记忆' }); }
    if (/世界态势史官/.test(sys)) { await new Promise(function(resolve) { setTimeout(resolve, 5); }); return JSON.stringify({ world_snapshot: '天下未定', next_turn_seeds: '边患将起', tension_level: '7' }); }
    await new Promise(function(resolve) { setTimeout(resolve, 20); });
    return 'invalid-json';
  };
  var parallelSignals = await Promise.all([
    DT.handle('deepen_world', {}, { GM: { turn: 2, _turnReport: [] }, meta: { agentRuntime: { signal: worldCtrl.signal } } }),
    DT.handle('recall_consolidate', {}, { GM: { turn: 2, _turnReport: [] }, meta: { agentRuntime: { signal: recallCtrl.signal } } })
  ]);
  assert(parallelSignals[0].ok && parallelSignals[1].ok && reaskSignal === recallCtrl.signal, '⑤ 并行专家互不覆盖信号，延迟 JSON 重问仍持有本调用 AbortSignal');

  // ⑥ 玩家规则动作由 Agent 在 engine-first 基线前取得所有权并标记幂等。
  var inputCalls = { edict: 0, keyword: 0, tyrant: 0 };
  globalThis.applyEdictActions = function () { inputCalls.edict++; };
  globalThis._kjG2ScanCtxInputEdictsForEnke = function () { return [{ kind: 'enke' }]; };
  globalThis._kjG2OnEnkeApprovedViaEdict = function () { inputCalls.keyword++; };
  globalThis.TyrantActivitySystem = { applyEffects: function (xs) { inputCalls.tyrant += xs.length; return { applied: xs.length }; } };
  var ownCtx = { input: { edicts: ['开恩科'], edictActions: { appointments: [{ name: '甲' }] }, tyrantActivities: [{ type: '宴' }] }, results: {} };
  var own = AM.applyDeterministicInputs(ownCtx, { turn: 2 });
  assert(inputCalls.edict === 1 && inputCalls.keyword === 1 && inputCalls.tyrant === 1, '⑥ Agent 前置执行诏令、关键词规则与暴君活动');
  assert(own.edictActions === 1 && own.keywordActions === 1 && own.tyrantActivities === 1 && ownCtx.input._agentEdictActionsApplied && ownCtx.input._agentEdictKeywordActionsApplied && ownCtx.input._agentTyrantActivitiesApplied, '⑥ 前置结果和三类幂等所有权标记完整');
  delete globalThis.applyEdictActions;
  delete globalThis._kjG2ScanCtxInputEdictsForEnke;
  delete globalThis._kjG2OnEnkeApprovedViaEdict;
  delete globalThis.TyrantActivitySystem;

  console.log('[smoke-agent-mode-governance] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
