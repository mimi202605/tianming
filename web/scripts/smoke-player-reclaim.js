#!/usr/bin/env node
// scripts/smoke-player-reclaim.js — Phase 4.5·Task 23 玩家开垦荒地系统 smoke
// 验证：
//   - TM.PlayerReclaim 命名空间暴露（双路径：globalThis + module.exports）
//   - 开垦状态账本：projects[{id, region, size, progress, stage, stageIdx, workers,
//                              status, expectedOutput, costEstimate, monthlyCost,
//                              startedTurn, expectedTurns, hasPermission, permissionSource,
//                              sideEffects, shareRatio, actualOutput, policy}]
//   - "勘探荒地"：3 种规模（小块/中块/大块）+ 成本预估
//   - "官府许可前置"：调 TM.PlayerInteraction.interact(official, 'entrust', payload)
//   - "违规开垦"：触发"占田"风险（言官弹劾/强令退还/没收）
//   - "开垦施工"：4 阶段流程（平整土地 → 修水利 → 播种 → 收获）
//   - 不同规模时间消耗（小块 1 月/中块 3 月/大块 6-12 月）
//   - "开垦产出"：粮食分成（玩家 shareRatio + 当地余量）
//   - "开垦副作用"：侵占牧场/林地/猎场 + 大规模生态事件（水患/沙化）
//   - "与朝廷互动"：开垦有成可上奏请功；失败触发问责
//   - 跨朝代通用：屯田/占田/均田政策由剧本 hook（applyPolicyHook）
//   - 御案新增"开垦"面板
//   - 跨朝代铁律·零明清专名
//   - 双路径挂载（globalThis + module.exports）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-reclaim.js（IIFE 模式，sandbox.window = ctx）──
function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Map: Map, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-reclaim.js'), 'utf8'),
    ctx, { filename: 'tm-player-reclaim.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + PlayerEconomy/PlayerInteraction 软依赖 ──
function setupCtx(ctx, opts) {
  opts = opts || {};

  // 玩家：李大臣（穿越模式·minister·在杭州）
  var playerCh = {
    name: '李大臣', alive: true, officialTitle: '尚书', role: '臣', personality: '刚直',
    isPlayer: true, location: '杭州', learning: 80
  };
  // NPC1：王令（当地官府·officialTitle 含"令"）
  var npcOfficial = { name: '王令', alive: true, officialTitle: '县令', role: '臣', personality: '清廉', location: '杭州' };
  // NPC2：张绅（地方士绅·非官府）
  var npcSquire = { name: '张绅', alive: true, officialTitle: '乡绅', role: '绅', personality: '持重', location: '苏州' };
  // NPC3：已故（守卫测试用）
  var npcDead = { name: '故人', alive: false, officialTitle: '已故', role: '臣' };
  // 君主（用于上奏请功路径）
  var sovereign = { name: '今上', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh, npcOfficial, npcSquire, npcDead, sovereign]
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      sovereignName: '今上',
      money: 10000,
      energy: 100,
      prestige: 60,
      sovereignRelation: 70,
      officialRelation: 65,
      currentLocation: '杭州'
    }
  };

  // mock TM.PlayerEconomy（spend + addIncome + spendCash 三种接口都暴露·主路径走 spend）
  ctx._playerEconomyState = { cash: 10000 };
  ctx._incomeCalls = [];
  ctx._spendCalls = [];
  ctx.TM.PlayerEconomy = {
    getBalance: function () { return ctx._playerEconomyState.cash; },
    spend: function (cost, label) {
      ctx._spendCalls.push({ cost: cost, label: label });
      if (ctx._playerEconomyState.cash < cost) {
        return { ok: false, reason: '银钱不足', cash: ctx._playerEconomyState.cash };
      }
      ctx._playerEconomyState.cash -= cost;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    },
    spendCash: function (cost, label) {
      ctx._spendCalls.push({ cost: cost, label: label, via: 'spendCash' });
      if (ctx._playerEconomyState.cash < cost) {
        return { ok: false, reason: '银钱不足', cash: ctx._playerEconomyState.cash };
      }
      ctx._playerEconomyState.cash -= cost;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    },
    addIncome: function (source, amount, opts2) {
      ctx._incomeCalls.push({ source: source, amount: amount, opts: opts2 });
      ctx._playerEconomyState.cash += amount;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    }
  };

  // mock TM.PlayerInteraction.interact（entrust 路径）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npc: npcName, kind: kind, payload: payload });
      if (kind !== 'entrust') return { ok: false, reason: 'mock 仅支持 entrust' };
      return { ok: true, kind: kind, npc: npcName, scene: 'mock 请托场景', energy: { cost: 2 } };
    }
  };

  // mock TM.PlayerMovement（getCurrentLocation）
  ctx.TM.PlayerMovement = {
    getCurrentLocation: function () { return ctx.P.playerInfo.currentLocation; }
  };

  // mock TM.Transmigration
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // 不挂 callAI：默认走规则引擎降级
  ctx.callAI = undefined;
}

// ────────────────────────────────────────────────────────────
//  §1 命名空间 + 常量数据
// ────────────────────────────────────────────────────────────
function testNamespace(ctx) {
  assert(ctx.TM && ctx.TM.PlayerReclaim, 'namespace: TM.PlayerReclaim 存在');
  var ns = ctx.TM.PlayerReclaim;
  assert(typeof ns.surveyWasteland === 'function', 'namespace: surveyWasteland 是函数');
  assert(typeof ns.requestPermission === 'function', 'namespace: requestPermission 是函数');
  assert(typeof ns.startIllegalReclaim === 'function', 'namespace: startIllegalReclaim 是函数');
  assert(typeof ns.startConstruction === 'function', 'namespace: startConstruction 是函数');
  assert(typeof ns.tickConstruction === 'function', 'namespace: tickConstruction 是函数');
  assert(typeof ns.collectHarvest === 'function', 'namespace: collectHarvest 是函数');
  assert(typeof ns.triggerSideEffects === 'function', 'namespace: triggerSideEffects 是函数');
  assert(typeof ns.petitionForMerit === 'function', 'namespace: petitionForMerit 是函数');
  assert(typeof ns.triggerAccountability === 'function', 'namespace: triggerAccountability 是函数');
  assert(typeof ns.applyPolicyHook === 'function', 'namespace: applyPolicyHook 是函数');
  assert(typeof ns.renderPanel === 'function', 'namespace: renderPanel 是函数');
  assert(ns.SIZES, 'namespace: SIZES 表存在');
  assert(Object.keys(ns.SIZES).length === 3, 'namespace: SIZES 共 3 种规模');
  ['small','medium','large'].forEach(function (k) {
    assert(ns.SIZES[k], 'namespace: SIZES.' + k + ' 存在');
    var s = ns.SIZES[k];
    assert(typeof s.label === 'string', 'namespace: SIZES.' + k + '.label');
    assert(typeof s.monthsMin === 'number', 'namespace: SIZES.' + k + '.monthsMin');
    assert(typeof s.monthsMax === 'number', 'namespace: SIZES.' + k + '.monthsMax');
    assert(typeof s.baseCost === 'number', 'namespace: SIZES.' + k + '.baseCost');
    assert(typeof s.baseOutput === 'number', 'namespace: SIZES.' + k + '.baseOutput');
  });
  // 规模时间：小块 1 月/中块 3 月/大块 6-12 月
  assert(ns.SIZES.small.monthsMin === 1 && ns.SIZES.small.monthsMax === 1, 'namespace: small 1 月');
  assert(ns.SIZES.medium.monthsMin === 3 && ns.SIZES.medium.monthsMax === 3, 'namespace: medium 3 月');
  assert(ns.SIZES.large.monthsMin === 6 && ns.SIZES.large.monthsMax === 12, 'namespace: large 6-12 月');
  // 4 阶段施工
  assert(ns.STAGES.length === 4, 'namespace: STAGES 共 4 阶段');
  assert(ns.STAGES[0] === 'leveling', 'namespace: STAGES[0]=leveling');
  assert(ns.STAGES[1] === 'irrigation', 'namespace: STAGES[1]=irrigation');
  assert(ns.STAGES[2] === 'sowing', 'namespace: STAGES[2]=sowing');
  assert(ns.STAGES[3] === 'harvest', 'namespace: STAGES[3]=harvest');
  // 政策类型：屯田/占田/均田
  assert(ns.POLICY_TYPES.tunTian, 'namespace: POLICY_TYPES.tunTian');
  assert(ns.POLICY_TYPES.zhanTian, 'namespace: POLICY_TYPES.zhanTian');
  assert(ns.POLICY_TYPES.junTian, 'namespace: POLICY_TYPES.junTian');
  // 项目状态机
  assert(ns.PROJECT_STATUS.SURVEYING === 'surveying', 'namespace: PROJECT_STATUS.SURVEYING');
  assert(ns.PROJECT_STATUS.PERMITTED === 'permitted', 'namespace: PROJECT_STATUS.PERMITTED');
  assert(ns.PROJECT_STATUS.ILLEGAL === 'illegal', 'namespace: PROJECT_STATUS.ILLEGAL');
  assert(ns.PROJECT_STATUS.CONSTRUCTING === 'constructing', 'namespace: PROJECT_STATUS.CONSTRUCTING');
  assert(ns.PROJECT_STATUS.COMPLETED === 'completed', 'namespace: PROJECT_STATUS.COMPLETED');
  assert(ns.PROJECT_STATUS.FAILED === 'failed', 'namespace: PROJECT_STATUS.FAILED');
}

// ────────────────────────────────────────────────────────────
//  §2 守卫·非穿越模式 / 未知规模 / 未到当地 / 重复勘探
// ────────────────────────────────────────────────────────────
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.surveyWasteland('杭州', 'small');
  assert(r1.ok === false, 'guard: 非穿越模式拒绝');
  assert(/非穿越模式/.test(r1.reason), 'guard: 非穿越模式 reason');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知规模
  var r2 = ns.surveyWasteland('杭州', 'bogusSize');
  assert(r2.ok === false, 'guard: 未知规模拒绝');
  assert(/未知开垦规模/.test(r2.reason), 'guard: 未知规模 reason');

  // 未指定区域
  var r3 = ns.surveyWasteland('', 'small');
  assert(r3.ok === false, 'guard: 未指定区域拒绝');
  assert(/须指定勘探区域/.test(r3.reason), 'guard: 未指定区域 reason');

  // 玩家不在当地（当前杭州·勘探苏州）
  var r4 = ns.surveyWasteland('苏州', 'small');
  assert(r4.ok === false, 'guard: 玩家不在当地拒绝');
  assert(/需先至当地/.test(r4.reason), 'guard: 不在当地 reason');
  assert(r4.code === 'not-on-site', 'guard: code=not-on-site');

  // 在当地·勘探成功
  var r5 = ns.surveyWasteland('杭州', 'small');
  assert(r5.ok === true, 'guard: 在当地勘探成功');

  // 同区域同规模不可重复
  var r6 = ns.surveyWasteland('杭州', 'small');
  assert(r6.ok === false, 'guard: 同区域同规模不可重复');
  assert(r6.code === 'duplicate', 'guard: code=duplicate');
}

// ────────────────────────────────────────────────────────────
//  §3 SubTask 23.3 "勘探荒地"·3 种规模 + 成本预估
// ────────────────────────────────────────────────────────────
function testSurveyWasteland(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 小块勘探
  var r1 = ns.surveyWasteland('杭州', 'small');
  assert(r1.ok === true, 'survey: small ok');
  assert(r1.region === '杭州', 'survey: region 回显');
  assert(r1.size === 'small', 'survey: size 回显');
  assert(r1.sizeLabel === '小块', 'survey: sizeLabel=小块');
  assert(r1.costEstimate > 0, 'survey: costEstimate > 0·实际 ' + r1.costEstimate);
  assert(r1.expectedOutput > 0, 'survey: expectedOutput > 0·实际 ' + r1.expectedOutput);
  assert(r1.months === 1, 'survey: small months=1');
  assert(r1.workersNeeded >= 5, 'survey: workersNeeded >= 5·实际 ' + r1.workersNeeded);
  assert(r1.needsPermission === false, 'survey: small 免许可');

  // 中块勘探
  var r2 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  assert(r2.ok === true, 'survey: medium ok');
  assert(r2.months === 3, 'survey: medium months=3');
  assert(r2.needsPermission === true, 'survey: medium 必须许可');

  // 大块勘探
  var r3 = ns.surveyWasteland('凉州', 'large', { skipLocationCheck: true });
  assert(r3.ok === true, 'survey: large ok');
  assert(r3.months >= 6 && r3.months <= 12, 'survey: large months 6-12·实际 ' + r3.months);
  assert(r3.needsPermission === true, 'survey: large 必须许可');

  // 账本已写入
  var st = ns.getState();
  assert(st.projects.length === 3, 'survey: 账本 3 个项目');
  assert(st.stats.totalSurveyed === 3, 'survey: totalSurveyed=3');

  // 项目结构完整
  var p = ns.getProjectById(r1.projectId);
  assert(p !== null, 'survey: getProjectById 可取');
  assert(p.id === r1.projectId, 'survey: id 一致');
  assert(p.region === '杭州', 'survey: p.region');
  assert(p.size === 'small', 'survey: p.size');
  assert(p.status === 'surveying', 'survey: p.status=surveying');
  assert(p.progress === 0, 'survey: p.progress=0');
  assert(p.stage === 'leveling', 'survey: p.stage=leveling');
  assert(p.stageIdx === 0, 'survey: p.stageIdx=0');
  assert(p.hasPermission === true, 'survey: small 自动许可');
  assert(p.permissionSource === 'auto', 'survey: small permissionSource=auto');
  assert(p.shareRatio > 0 && p.shareRatio < 1, 'survey: shareRatio ∈ (0,1)·实际 ' + p.shareRatio);

  // 指定 policy=tunTian（屯田·政策 hook 影响成本）
  var r4 = ns.surveyWasteland('幽州', 'medium', { skipLocationCheck: true, policy: 'tunTian' });
  assert(r4.ok === true, 'survey: tunTian policy ok');
  assert(r4.policy === 'tunTian', 'survey: policy 回显');
  var p4 = ns.getProjectById(r4.projectId);
  assert(p4.policy === 'tunTian', 'survey: project.policy=tunTian');
  // 屯田 costMul=0.8·预期 < 中块默认 800×1.0×1.0=800（实际受区域难度影响）
  // 这里只断言 tunTian 路径生效·不断言具体数值（区域难度是 hash 推导·随机）
}

// ────────────────────────────────────────────────────────────
//  §4 SubTask 23.4 "官府许可前置"·关联人物互动 + 官制权限
// ────────────────────────────────────────────────────────────
function testRequestPermission(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 中块勘探后·需申请许可
  var r0 = ns.surveyWasteland('杭州', 'medium', { skipLocationCheck: true });
  assert(r0.ok === true, 'permit: 勘探 ok');
  assert(r0.needsPermission === true, 'permit: medium 需许可');

  // 调 requestPermission·主路径走 TM.PlayerInteraction.interact(official, 'entrust', payload)
  ctx.callAI = function () { return '官府准许·可开工'; };
  var r1 = ns.requestPermission(r0.projectId);
  assert(r1.ok === true, 'permit: requestPermission ok');
  assert(r1.approved === true, 'permit: approved=true');
  assert(r1.official === '王令', 'permit: official=王令');
  assert(r1.decision.source === 'llm', 'permit: source=llm');

  // 调用了 PlayerInteraction.interact
  assert(ctx._interactCalls.length === 1, 'permit: interact 调用 1 次·实际 ' + ctx._interactCalls.length);
  assert(ctx._interactCalls[0].npc === '王令', 'permit: interact npc=王令');
  assert(ctx._interactCalls[0].kind === 'entrust', 'permit: interact kind=entrust');

  // 项目状态变化
  var p = ns.getProjectById(r0.projectId);
  assert(p.hasPermission === true, 'permit: project.hasPermission=true');
  assert(p.permissionSource === 'official', 'permit: permissionSource=official');
  assert(p.status === 'permitted', 'permit: status=permitted');

  // LLM 拒绝路径
  var r2 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '官府不允'; };
  var r3 = ns.requestPermission(r2.projectId);
  assert(r3.ok === true, 'permit-reject: requestPermission ok（流程走完）');
  assert(r3.approved === false, 'permit-reject: approved=false');
  assert(r3.decision.source === 'llm', 'permit-reject: source=llm');
  var p3 = ns.getProjectById(r2.projectId);
  assert(p3.hasPermission === false, 'permit-reject: 仍无许可');
  assert(p3.status === 'surveying', 'permit-reject: 仍 surveying');

  // 无 LLM·规则引擎降级
  var r4 = ns.surveyWasteland('凉州', 'large', { skipLocationCheck: true });
  ctx.callAI = undefined;
  var r5 = ns.requestPermission(r4.projectId);
  assert(r5.ok === true, 'permit-rule: ok');
  assert(r5.decision.source === 'rule', 'permit-rule: source=rule');
  assert(typeof r5.decision.adopt === 'boolean', 'permit-rule: adopt 是 boolean');

  // 已许可项目·重复申请拒绝
  ctx.callAI = function () { return '准'; };
  var r6 = ns.requestPermission(r0.projectId);
  assert(r6.ok === false, 'permit: 已许可不可重复');
  assert(r6.code === 'already-permitted', 'permit: code=already-permitted');

  // 项目不存在
  var r7 = ns.requestPermission('不存在的id');
  assert(r7.ok === false, 'permit: 项目不存在拒绝');
}

// ────────────────────────────────────────────────────────────
//  §5 SubTask 23.5 "违规开垦"·触发占田风险
// ────────────────────────────────────────────────────────────
function testIllegalReclaim(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 中块勘探·未申请许可·直接违规开垦
  var r0 = ns.surveyWasteland('杭州', 'medium', { skipLocationCheck: true });
  assert(r0.ok === true, 'illegal: 勘探 ok');
  var proj = ns.getProjectById(r0.projectId);
  assert(proj.hasPermission === false, 'illegal: medium 未许可');

  // 强制触发风险·走违规路径
  var r1 = ns.startIllegalReclaim(r0.projectId, { forceRisk: true });
  assert(r1.ok === true, 'illegal: 违规开垦 ok');
  assert(r1.riskTriggered === true, 'illegal: 风险触发');
  assert(r1.riskType !== null, 'illegal: riskType 非空·实际 ' + r1.riskType);
  // riskType 应为三种之一
  assert(['impeachment','forced-return','confiscation'].indexOf(r1.riskType) >= 0,
    'illegal: riskType ∈ 三种之一·实际 ' + r1.riskType);

  // forced-return 或 confiscation → 项目 FAILED
  var p1 = ns.getProjectById(r0.projectId);
  if (r1.riskType === 'forced-return' || r1.riskType === 'confiscation') {
    assert(p1.status === 'failed', 'illegal: ' + r1.riskType + ' → failed');
  } else {
    // impeachment → 仍 illegal·可继续施工（但已留案底）
    assert(p1.status === 'illegal', 'illegal: impeachment 后仍 illegal');
  }
  assert(p1.permissionSource === 'illegal', 'illegal: permissionSource=illegal');

  // 吏治腐败引擎风险已落账（GM.corruption.lumpSumIncidents）
  assert(ctx.GM.corruption, 'illegal: GM.corruption 已建');
  assert(Array.isArray(ctx.GM.corruption.lumpSumIncidents), 'illegal: lumpSumIncidents 是数组');
  assert(ctx.GM.corruption.lumpSumIncidents.length === 1, 'illegal: 1 个 incident·实际 ' + ctx.GM.corruption.lumpSumIncidents.length);
  assert(ctx.GM.corruption.lumpSumIncidents[0].type === 'player_illegal_reclaim', 'illegal: type=player_illegal_reclaim');

  // 强制不触发风险·违规但不事发
  var r2 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  var r3 = ns.startIllegalReclaim(r2.projectId, { forceRisk: false });
  assert(r3.ok === true, 'illegal-no-risk: 违规开垦 ok');
  assert(r3.riskTriggered === false, 'illegal-no-risk: 风险未触发');
  assert(r3.riskType === null, 'illegal-no-risk: riskType=null');
  var p3 = ns.getProjectById(r2.projectId);
  assert(p3.status === 'illegal', 'illegal-no-risk: 仍 illegal·可继续施工');

  // 小块·已自动许可·不可违规
  var r4 = ns.surveyWasteland('凉州', 'small', { skipLocationCheck: true });
  var r5 = ns.startIllegalReclaim(r4.projectId);
  assert(r5.ok === false, 'illegal: 已许可不可走违规');
  assert(r5.code === 'already-permitted', 'illegal: code=already-permitted');

  // 项目不存在
  var r6 = ns.startIllegalReclaim('不存在的id');
  assert(r6.ok === false, 'illegal: 项目不存在拒绝');
}

// ────────────────────────────────────────────────────────────
//  §6+§7 SubTask 23.6+23.7 "开垦施工"·4 阶段流程 + 不同规模时间
// ────────────────────────────────────────────────────────────
function testStartConstruction(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 小块（免许可）·直接开工
  var r0 = ns.surveyWasteland('杭州', 'small', { skipLocationCheck: true });
  assert(r0.ok === true, 'construct: small 勘探 ok');
  var moneyBefore = ctx._playerEconomyState.cash;
  var r1 = ns.startConstruction(r0.projectId);
  assert(r1.ok === true, 'construct: 开工 ok');
  assert(r1.status === 'constructing', 'construct: status=constructing');
  assert(r1.stage === 'leveling', 'construct: stage=leveling');
  assert(r1.stageIdx === 0, 'construct: stageIdx=0');
  // 扣首期月成本
  var proj = ns.getProjectById(r0.projectId);
  assert(ctx._playerEconomyState.cash === moneyBefore - proj.monthlyCost, 'construct: 扣月成本 ' + proj.monthlyCost);

  // 重复开工拒绝
  var r2 = ns.startConstruction(r0.projectId);
  assert(r2.ok === false, 'construct: 重复开工拒绝');
  assert(r2.code === 'already-constructing', 'construct: code=already-constructing');

  // 未许可项目·开工拒绝
  var r3 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  var r4 = ns.startConstruction(r3.projectId);
  assert(r4.ok === false, 'construct: 未许可拒绝');
  assert(r4.code === 'no-permission', 'construct: code=no-permission');

  // 大块施工·触发副作用检查
  var r5 = ns.surveyWasteland('凉州', 'large', { skipLocationCheck: true });
  // 大块需先许可
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r5.projectId);
  var r6 = ns.startConstruction(r5.projectId);
  assert(r6.ok === true, 'construct: large 开工 ok');
  // 大块应触发副作用检查
  if (r6.sideEffects && r6.sideEffects.ok) {
    // 副作用检查执行·即使未触发也有 events
  }

  // 银钱不足·拒绝开工
  var r7 = ns.surveyWasteland('幽州', 'large', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r7.projectId);
  ctx._playerEconomyState.cash = 0;
  var r8 = ns.startConstruction(r7.projectId);
  assert(r8.ok === false, 'construct: 银钱不足拒绝');
  assert(r8.code === 'no-cash', 'construct: code=no-cash');
}

function testTickConstruction(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 小块 1 月可成·tick 1 次即完成
  var r0 = ns.surveyWasteland('杭州', 'small', { skipLocationCheck: true });
  ns.startConstruction(r0.projectId);
  var proj = ns.getProjectById(r0.projectId);
  var expectedTurns = proj.expectedTurns;
  assert(expectedTurns === 1, 'tick: small expectedTurns=1·实际 ' + expectedTurns);

  // 第 1 次 tick·应完成
  var r1 = ns.tickConstruction();
  assert(r1.ok === true, 'tick: ok');
  assert(r1.completed.length === 1, 'tick: 1 个项目完成·实际 ' + r1.completed.length);
  assert(r1.completed[0] === r0.projectId, 'tick: completed id 一致');
  var p1 = ns.getProjectById(r0.projectId);
  assert(p1.status === 'completed', 'tick: small 完成后 status=completed');
  assert(p1.progress >= 100, 'tick: progress ≥ 100·实际 ' + p1.progress);

  // 中块 3 月可成·tick 3 次
  var r2 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r2.projectId);
  ns.startConstruction(r2.projectId);
  var proj2 = ns.getProjectById(r2.projectId);
  assert(proj2.expectedTurns === 3, 'tick: medium expectedTurns=3');

  // tick 1 次·进度推到 1/3·阶段 leveling
  ns.tickConstruction();
  var p2a = ns.getProjectById(r2.projectId);
  assert(p2a.progress > 0 && p2a.progress < 100, 'tick: 第 1 次后进度 0-100·实际 ' + p2a.progress);
  assert(p2a.status === 'constructing', 'tick: 仍 constructing');

  // tick 2 次·进度推到 2/3·阶段应推进
  ns.tickConstruction();
  var p2b = ns.getProjectById(r2.projectId);
  assert(p2b.progress >= p2a.progress, 'tick: 进度单调增');

  // tick 3 次·完成
  ns.tickConstruction();
  var p2c = ns.getProjectById(r2.projectId);
  assert(p2c.status === 'completed', 'tick: medium 3 次后 completed');
  assert(p2c.progress >= 100, 'tick: medium 完成后 progress ≥ 100·实际 ' + p2c.progress);

  // 阶段推进·4 阶段全程经历
  // small 1 月完成·阶段推进 0→3·medium 3 月·4 阶段都应经历
  assert(p2c.stageIdx === 3, 'tick: 完成后 stageIdx=3');
  assert(p2c.stage === 'harvest', 'tick: 完成后 stage=harvest');

  // 无项目时 tick 返回空（getState() 返回深拷贝·不可用它清空·须直改 GM._playerReclaim.projects）
  ctx.GM._playerReclaim.projects.length = 0; // 真清空·无项目
  var r3 = ns.tickConstruction();
  assert(r3.ok === true, 'tick: 无项目 ok');
  assert(r3.completed.length === 0, 'tick: 无项目 completed=0');
  assert(r3.failed.length === 0, 'tick: 无项目 failed=0');

  // 资金不济·失败（用一个新区域避免之前 completed 项目的重复勘探检查）
  var r4 = ns.surveyWasteland('荆州', 'small', { skipLocationCheck: true });
  assert(r4.ok === true, 'tick: 荆州 small 勘探 ok');
  var startR = ns.startConstruction(r4.projectId);
  assert(startR.ok === true, 'tick: 开工 ok·实际 ' + (startR.reason || ''));
  ctx._playerEconomyState.cash = 0;
  var r5 = ns.tickConstruction();
  assert(r5.failed.length === 1, 'tick: 银钱不济 failed=1·实际 ' + r5.failed.length);
  var p4 = ns.getProjectById(r4.projectId);
  assert(p4.status === 'failed', 'tick: 失败后 status=failed');
}

function testAdvanceStage(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  var r0 = ns.surveyWasteland('杭州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r0.projectId);
  ns.startConstruction(r0.projectId);
  var proj = ns.getProjectById(r0.projectId);
  var beforeIdx = proj.stageIdx;

  var r1 = ns.advanceStage(r0.projectId);
  assert(r1.ok === true, 'advance: ok');
  assert(r1.stageIdx === beforeIdx + 1, 'advance: stageIdx +1');
  assert(r1.stage === 'irrigation', 'advance: stage=irrigation');

  // 最后阶段再推进拒绝
  proj.stageIdx = 3; // 强制设到最后阶段
  var r2 = ns.advanceStage(r0.projectId);
  assert(r2.ok === false, 'advance: 最后阶段拒绝');
  assert(r2.code === 'last-stage', 'advance: code=last-stage');

  // 未在施工中·拒绝
  var r3 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  var r4 = ns.advanceStage(r3.projectId);
  assert(r4.ok === false, 'advance: 未施工拒绝');
  assert(r4.code === 'not-constructing', 'advance: code=not-constructing');
}

// ────────────────────────────────────────────────────────────
//  §8 SubTask 23.8 "开垦产出"·粮食分成
// ────────────────────────────────────────────────────────────
function testCollectHarvest(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 小块·1 月可成·完成后收获
  var r0 = ns.surveyWasteland('杭州', 'small', { skipLocationCheck: true });
  ns.startConstruction(r0.projectId);
  ns.tickConstruction();
  var proj = ns.getProjectById(r0.projectId);
  assert(proj.status === 'completed', 'harvest: 项目完成');
  assert(proj.actualOutput === 0, 'harvest: 收获前 actualOutput=0');

  var moneyBefore = ctx._playerEconomyState.cash;
  var r1 = ns.collectHarvest(r0.projectId);
  assert(r1.ok === true, 'harvest: 收获 ok');
  assert(r1.actualOutput > 0, 'harvest: actualOutput > 0·实际 ' + r1.actualOutput);
  assert(r1.playerShare > 0, 'harvest: playerShare > 0·实际 ' + r1.playerShare);
  assert(r1.localShare > 0, 'harvest: localShare > 0');
  assert(r1.playerShare + r1.localShare === r1.actualOutput, 'harvest: 玩家 + 当地 = 实产');
  assert(r1.income > 0, 'harvest: income > 0');
  // 玩家银钱账本增加
  assert(ctx._playerEconomyState.cash === moneyBefore + r1.income, 'harvest: 玩家银钱 +' + r1.income);
  // 收入调用记录
  assert(ctx._incomeCalls.length === 1, 'harvest: addIncome 调用 1 次');
  assert(ctx._incomeCalls[0].source === 'reclaim-harvest', 'harvest: source=reclaim-harvest');

  // 项目 actualOutput 已写入
  var p1 = ns.getProjectById(r0.projectId);
  assert(p1.actualOutput === r1.actualOutput, 'harvest: project.actualOutput 写入');

  // 当地粮食增量已落账
  assert(ctx.GM.regionGrainYield, 'harvest: GM.regionGrainYield 已建');
  assert(ctx.GM.regionGrainYield['杭州'] > 0, 'harvest: 杭州粮食增量 > 0');

  // 重复收获拒绝
  var r2 = ns.collectHarvest(r0.projectId);
  assert(r2.ok === false, 'harvest: 重复收获拒绝');
  assert(r2.code === 'already-collected', 'harvest: code=already-collected');

  // 未完成项目·拒绝收获
  var r3 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  var r4 = ns.collectHarvest(r3.projectId);
  assert(r4.ok === false, 'harvest: 未完成拒绝');
  assert(r4.code === 'not-completed', 'harvest: code=not-completed');

  // 项目不存在
  var r5 = ns.collectHarvest('不存在的id');
  assert(r5.ok === false, 'harvest: 项目不存在拒绝');
}

// ────────────────────────────────────────────────────────────
//  §9 SubTask 23.9 "开垦副作用"·侵占 + 生态事件
// ────────────────────────────────────────────────────────────
function testSideEffects(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 中块勘探·强制触发侵占类副作用
  var r0 = ns.surveyWasteland('杭州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r0.projectId);
  ns.startConstruction(r0.projectId);
  // startConstruction 内部已对 medium 随机调过一次 triggerSideEffects(silent)·
  // 此处先清空 sideEffects·确保 forceEncroach=true 在干净账上至少触发 1 项（去随机）
  var proj0pre = ns.getProjectById(r0.projectId);
  proj0pre.sideEffects = [];

  // 强制触发侵占
  var r1 = ns.triggerSideEffects(r0.projectId, { forceEncroach: true });
  assert(r1.ok === true, 'side: ok');
  assert(r1.triggered.length >= 1, 'side: 至少 1 项触发·实际 ' + r1.triggered.length);
  var proj1 = ns.getProjectById(r0.projectId);
  assert(Array.isArray(proj1.sideEffects) && proj1.sideEffects.length >= 1, 'side: project.sideEffects 非空');

  // 触发的副作用类型应为侵占类（牧场/林地/猎场）
  var encroachTypes = r1.triggered.map(function (se) { return se.type; });
  encroachTypes.forEach(function (t) {
    assert(['encroachPasture','encroachForest','encroachHunt'].indexOf(t) >= 0, 'side: 类型 ' + t + ' 是侵占类');
  });

  // 当地势力关系降
  assert(ctx.GM.regionFactionRelations, 'side: GM.regionFactionRelations 已建');
  assert(ctx.GM.regionFactionRelations['杭州'] < 0, 'side: 杭州势力关系 < 0');

  // 大块·强制生态事件
  var r2 = ns.surveyWasteland('凉州', 'large', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r2.projectId);
  ns.startConstruction(r2.projectId);
  var r3 = ns.triggerSideEffects(r2.projectId, { forceEco: true });
  assert(r3.ok === true, 'side-eco: ok');
  var proj2 = ns.getProjectById(r2.projectId);
  var hasEco = proj2.sideEffects.some(function (se) {
    return se.type === 'floodRisk' || se.type === 'desertification';
  });
  assert(hasEco, 'side-eco: 大块触发生态事件');

  // 同区域同类型不重复触发
  var before = proj1.sideEffects.length;
  var r4 = ns.triggerSideEffects(r0.projectId, { forceEncroach: true });
  // 触发的应该都是新类型（不与已有重复）·可能数量为 0（如果三种都已触发）
  var proj1b = ns.getProjectById(r0.projectId);
  assert(proj1b.sideEffects.length >= before, 'side: 不重复触发·sideEffects 不减少');

  // 强制不触发·空返回
  var r5 = ns.surveyWasteland('幽州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r5.projectId);
  ns.startConstruction(r5.projectId);
  var r6 = ns.triggerSideEffects(r5.projectId, { forceEncroach: false, forceEco: false });
  assert(r6.ok === true, 'side-none: ok');
  // 注：触发是随机的·forceEncroach=false 强制 0 几率·应无侵占
  var encCount = r6.triggered.filter(function (se) {
    return ['encroachPasture','encroachForest','encroachHunt'].indexOf(se.type) >= 0;
  }).length;
  assert(encCount === 0, 'side-none: forceEncroach=false 无侵占');

  // 项目不存在
  var r7 = ns.triggerSideEffects('不存在的id');
  assert(r7.ok === false, 'side: 项目不存在拒绝');
}

// ────────────────────────────────────────────────────────────
//  §10 SubTask 23.10 "与朝廷互动"·请功 + 问责
// ────────────────────────────────────────────────────────────
function testCourtInteraction(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 完成一个项目·用于请功
  var r0 = ns.surveyWasteland('杭州', 'small', { skipLocationCheck: true });
  ns.startConstruction(r0.projectId);
  ns.tickConstruction();
  var proj = ns.getProjectById(r0.projectId);
  assert(proj.status === 'completed', 'merit: 项目完成');
  // 先收获·才能有 actualOutput 数据
  ns.collectHarvest(r0.projectId);

  // LLM 准功
  ctx.callAI = function () { return '皇帝准奏·开垦有功'; };
  var prestigeBefore = ctx.P.playerInfo.prestige;
  var r1 = ns.petitionForMerit(r0.projectId);
  assert(r1.ok === true, 'merit: ok');
  assert(r1.approved === true, 'merit: approved=true');
  assert(r1.decision.source === 'llm', 'merit: source=llm');
  assert(r1.reward > 0, 'merit: reward > 0');
  // 声望 +
  assert(ctx.P.playerInfo.prestige === prestigeBefore + 5, 'merit: 声望 +5·实际 ' + (ctx.P.playerInfo.prestige - prestigeBefore));

  // 重复请功拒绝
  var r2 = ns.petitionForMerit(r0.projectId);
  assert(r2.ok === false, 'merit: 重复请功拒绝');
  assert(r2.code === 'already-approved', 'merit: code=already-approved');

  // LLM 不准
  var r3 = ns.surveyWasteland('苏州', 'small', { skipLocationCheck: true });
  ns.startConstruction(r3.projectId);
  ns.tickConstruction();
  ns.collectHarvest(r3.projectId);
  ctx.callAI = function () { return '皇帝不允'; };
  var prestigeBefore2 = ctx.P.playerInfo.prestige;
  var r4 = ns.petitionForMerit(r3.projectId);
  assert(r4.ok === true, 'merit-reject: ok');
  assert(r4.approved === false, 'merit-reject: approved=false');
  assert(ctx.P.playerInfo.prestige === prestigeBefore2 - 2, 'merit-reject: 声望 -2');

  // 问责路径
  var r5 = ns.surveyWasteland('凉州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r5.projectId);
  ns.startConstruction(r5.projectId);
  // 失败：人为把项目设失败
  var proj5 = ns.getProjectById(r5.projectId);
  proj5.status = 'failed';

  var prestigeBefore3 = ctx.P.playerInfo.prestige;
  var moneyBefore3 = ctx._playerEconomyState.cash;
  var r6 = ns.triggerAccountability(r5.projectId, { reason: '开垦失败' });
  assert(r6.ok === true, 'account: ok');
  assert(r6.penalty > 0, 'account: penalty > 0');
  assert(r6.prestigeDelta < 0, 'account: prestigeDelta < 0');
  assert(ctx.P.playerInfo.prestige < prestigeBefore3, 'account: 声望下降');
  // 罚银已扣
  assert(ctx._playerEconomyState.cash < moneyBefore3, 'account: 银钱扣除');
  // 项目 accountabilityTriggered 已标记
  var p6 = ns.getProjectById(r5.projectId);
  assert(p6.accountabilityTriggered === true, 'account: accountabilityTriggered=true');
}

// ────────────────────────────────────────────────────────────
//  §11 SubTask 23.11 跨朝代通用·屯田/占田/均田政策 hook
// ────────────────────────────────────────────────────────────
function testPolicyHook(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 默认 policies 都存在
  var pol = ns.getPolicies();
  assert(pol.policies.tunTian, 'policy: tunTian 存在');
  assert(pol.policies.zhanTian, 'policy: zhanTian 存在');
  assert(pol.policies.junTian, 'policy: junTian 存在');
  // 默认 sizes 都存在
  assert(pol.sizes.small, 'policy: sizes.small 存在');
  assert(pol.sizes.medium, 'policy: sizes.medium 存在');
  assert(pol.sizes.large, 'policy: sizes.large 存在');

  // 屯田 costMul=0.8 / outputMul=1.2 / shareRatio=0.5
  var tt = pol.policies.tunTian;
  assert(tt.costMul === 0.8, 'policy: tunTian costMul=0.8');
  assert(tt.outputMul === 1.2, 'policy: tunTian outputMul=1.2');
  assert(tt.shareRatio === 0.5, 'policy: tunTian shareRatio=0.5');

  // 应用政策到指定项目
  var r0 = ns.surveyWasteland('杭州', 'medium', { skipLocationCheck: true });
  var proj0 = ns.getProjectById(r0.projectId);
  var costBefore = proj0.costEstimate;
  var outputBefore = proj0.expectedOutput;
  var shareBefore = proj0.shareRatio;

  var r1 = ns.applyPolicyHook('tunTian', { projectId: r0.projectId });
  assert(r1.ok === true, 'policy: apply ok');
  assert(r1.policy === 'tunTian', 'policy: policy 回显');
  assert(r1.affected.length === 1, 'policy: affected 1 个项目');

  var proj1 = ns.getProjectById(r0.projectId);
  assert(proj1.policy === 'tunTian', 'policy: project.policy=tunTian');
  // 屯田 costMul=0.8·成本应下降（受区域难度影响·可能波动）
  // shareRatio 应改为 0.5
  assert(proj1.shareRatio === 0.5, 'policy: shareRatio=0.5·实际 ' + proj1.shareRatio);

  // 应用到所有未完成项目
  var r2 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  var r3 = ns.surveyWasteland('凉州', 'large', { skipLocationCheck: true });
  var r4 = ns.applyPolicyHook('junTian', {});
  assert(r4.ok === true, 'policy: 应用到所有 ok');
  assert(r4.affected.length >= 2, 'policy: affected ≥ 2 个·实际 ' + r4.affected.length);
  // junTian shareRatio=0.3
  r4.affected.forEach(function (pid) {
    var p = ns.getProjectById(pid);
    assert(p.policy === 'junTian', 'policy: 项目 ' + pid + ' policy=junTian');
    assert(p.shareRatio === 0.3, 'policy: 项目 ' + pid + ' shareRatio=0.3');
  });

  // 未知政策拒绝
  var r5 = ns.applyPolicyHook('bogusPolicy', {});
  assert(r5.ok === false, 'policy: 未知政策拒绝');
  assert(/未知政策/.test(r5.reason), 'policy: reason 含未知政策');

  // 剧本数据覆盖·customReclaimPolicies
  ctx.P.customReclaimPolicies = {
    policies: {
      // 覆盖 tunTian
      tunTian: { label: '军屯', costMul: 0.7, outputMul: 1.3, shareRatio: 0.6, sideEffectCap: 'large' },
      // 追加新政策
      shiTian: { label: '食田', costMul: 1.0, outputMul: 1.0, shareRatio: 0.4, sideEffectCap: 'medium' }
    },
    sizes: {
      // 覆盖 small
      small: { label: '微块', monthsMin: 1, monthsMax: 1, baseCost: 100, baseOutput: 30, workersMin: 3, riskLevel: 'low' }
    },
    regionModifiers: {
      '杭州': { difficulty: 1.2, fertility: 1.3 }
    },
    grainPrice: 8
  };

  var pol2 = ns.getPolicies();
  assert(pol2.policies.tunTian.label === '军屯', 'policy-override: tunTian.label=军屯');
  assert(pol2.policies.tunTian.costMul === 0.7, 'policy-override: tunTian.costMul=0.7');
  assert(pol2.policies.shiTian, 'policy-extend: 新增 shiTian 政策');
  assert(pol2.policies.shiTian.label === '食田', 'policy-extend: shiTian.label=食田');
  assert(pol2.sizes.small.label === '微块', 'policy-override: small.label=微块');
  assert(pol2.sizes.small.baseCost === 100, 'policy-override: small.baseCost=100');

  // 新勘探杭州 small·区域难度 1.2·成本 = 100 × 1.0 × 1.2 = 120
  var r6 = ns.surveyWasteland('杭州', 'small', { skipLocationCheck: true, policy: 'shiTian' });
  assert(r6.ok === true, 'policy-extend: 应用 shiTian 勘探 ok');
  assert(r6.policy === 'shiTian', 'policy-extend: policy 回显');
  // grainPrice=8 已生效
  // 注：此项目若收获·分成转银钱按 grainPrice=8 计算

  // 清掉 customReclaimPolicies·恢复默认
  delete ctx.P.customReclaimPolicies;
  var pol3 = ns.getPolicies();
  assert(pol3.policies.tunTian.label === '屯田', 'policy-reset: tunTian.label 恢复屯田');
  assert(!pol3.policies.shiTian, 'policy-reset: shiTian 已清除');
}

// ────────────────────────────────────────────────────────────
//  §12 SubTask 23.12 御案"开垦"面板
// ────────────────────────────────────────────────────────────
function testRenderPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerReclaim;

  // 空账本·面板应可渲染
  var html0 = ns.renderPanel();
  assert(typeof html0 === 'string', 'render: 返回字符串');
  assert(html0.length > 100, 'render: HTML 非空');
  assert(/开 垦 · 总 览/.test(html0), 'render: 含"开垦·总览"');

  // 添加多种状态项目
  var r1 = ns.surveyWasteland('杭州', 'small', { skipLocationCheck: true });
  ns.startConstruction(r1.projectId);
  ns.tickConstruction(); // 完成
  ns.collectHarvest(r1.projectId);

  var r2 = ns.surveyWasteland('苏州', 'medium', { skipLocationCheck: true });
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r2.projectId);
  ns.startConstruction(r2.projectId);

  var r3 = ns.surveyWasteland('凉州', 'large', { skipLocationCheck: true });
  // 失败项目
  ctx.callAI = function () { return '准'; };
  ns.requestPermission(r3.projectId);
  ns.startConstruction(r3.projectId);
  var proj3 = ns.getProjectById(r3.projectId);
  proj3.status = 'failed';

  var html = ns.renderPanel();
  assert(typeof html === 'string', 'render: 返回字符串');
  assert(html.length > 200, 'render: HTML 较长');
  // 总览区
  assert(/开 垦 · 总 览/.test(html), 'render: 含"开垦·总览"');
  assert(/已勘探/.test(html), 'render: 含"已勘探"');
  assert(/累计产粮/.test(html), 'render: 含"累计产粮"');
  // 在建项目区
  assert(/在 建/.test(html), 'render: 含"在建"');
  // 已成项目区
  assert(/已 成/.test(html), 'render: 含"已成"');
  // 失败/违规区
  assert(/失 败 \/ 违 规/.test(html), 'render: 含"失败/违规"');
  // 项目卡片·含区域名
  assert(/杭州/.test(html), 'render: 含杭州');
  assert(/苏州/.test(html), 'render: 含苏州');
  // 进度条
  assert(/pr-progress/.test(html), 'render: 含 pr-progress');
  // 阶段标签
  assert(/平整土地|修水利|播种|收获/.test(html), 'render: 含阶段标签');

  // 渲染到目标元素
  var fakeEl = { innerHTML: '' };
  var r = ns.renderPanel(fakeEl);
  assert(r === null, 'render: 传入 targetEl 返回 null');
  assert(fakeEl.innerHTML.length > 100, 'render: targetEl.innerHTML 已写入');

  // 账本未就绪·返回空提示
  var oldGM = ctx.GM;
  ctx.GM = null;
  var empty = ns.renderPanel();
  assert(/未就绪/.test(empty), 'render: 账本未就绪提示');
  ctx.GM = oldGM;
}

// ────────────────────────────────────────────────────────────
//  §13 跨朝代铁律·零明清专名
// ────────────────────────────────────────────────────────────
function testDynastyNeutral() {
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-reclaim.js'), 'utf8');
  var banned = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  banned.forEach(function (w) {
    assert(src.indexOf(w) === -1, 'dynasty-neutral: tm-player-reclaim.js 不含 ' + w);
  });
}

// ────────────────────────────────────────────────────────────
//  §14 双路径挂载·module.exports 也应能取到
// ────────────────────────────────────────────────────────────
function testDualMount() {
  var mod = require(path.join(ROOT, 'tm-player-reclaim.js'));
  assert(mod && mod.PlayerReclaim, 'dual-mount: module.exports.PlayerReclaim 存在');
  assert(typeof mod.PlayerReclaim.surveyWasteland === 'function', 'dual-mount: surveyWasteland 是函数');
  assert(typeof mod.PlayerReclaim.startConstruction === 'function', 'dual-mount: startConstruction 是函数');
  assert(typeof mod.PlayerReclaim.renderPanel === 'function', 'dual-mount: renderPanel 是函数');
  assert(mod.PlayerReclaim.SIZES && Object.keys(mod.PlayerReclaim.SIZES).length === 3, 'dual-mount: SIZES 3 种');
  assert(mod.PlayerReclaim.STAGES && mod.PlayerReclaim.STAGES.length === 4, 'dual-mount: STAGES 4 阶段');
}

// ────────────────────────────────────────────────────────────
//  主流程
// ────────────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testSurveyWasteland(ctx);
  testRequestPermission(ctx);
  testIllegalReclaim(ctx);
  testStartConstruction(ctx);
  testTickConstruction(ctx);
  testAdvanceStage(ctx);
  testCollectHarvest(ctx);
  testSideEffects(ctx);
  testCourtInteraction(ctx);
  testPolicyHook(ctx);
  testRenderPanel(ctx);
  testDynastyNeutral();
  testDualMount();
  console.log('[smoke-player-reclaim] PASS · 15 sub-tests · namespace/guards/survey/permit/illegal/construct/tick-4stage/advance/harvest/side-effects/court-interaction/policy-hook(屯田占田均田)/panel/dynasty-neutral/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-reclaim] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
