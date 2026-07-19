#!/usr/bin/env node
// scripts/smoke-player-industry.js — Phase 4.5 · Task 22 玩家产业建设系统 smoke
// 验证（覆盖 11 项 SubTask + 跨朝代 + 双路径挂载）：
//   1.  命名空间：TM.PlayerIndustry 暴露（双路径：globalThis + module.exports）
//   2.  守卫：非穿越模式 / 未知产业类型 / 未知规模 / 非法选址 / 缺 industryId 各拒
//   3.  产业类型 8 种 + 规模档 3 档 + 升级 3 类 + 风险 6 类 全量就位
//   4.  选址建设（surveySite + acquireLand + startProject·地形限制 + requireNear + 官府许可 + 购地银钱）
//   5.  施工建设（recruitWorkers + advanceConstruction + completeConstruction·募工满 → CONSTRUCTING → 完工 OPERATING）
//   6.  产业经营（operateMonthly·computeOutput·管理/匠人/治安/灾害因子综合·月入账玩家银钱）
//   7.  产业升级（expand/improve/specialize 三类·产出/维护/等级/特化 subType 调整）
//   8.  产业风险（6 类：fire/flood/bandit/flee/impress/raid·severity×riskMod·状态变 DAMAGED）
//   9.  豪强标签（warning/serious/confiscate 三档·产业估值合计触发·朝廷查核/抄没）
//  10.  沿用 tm-building-works.js（_useBuildingWorks·soft dep·缺席降级本模块规则）
//  11.  御案"产业"面板（renderPanel·HTML 字符串·朝代中立·含名录/估值/豪强/近事）
//  12.  跨朝代铁律（grep 代码体无明清专名）
//  13.  双路径挂载（module.exports 等价 globalThis.TM.PlayerIndustry）
//  14.  月度 tick = operateMonthly 等价
//  15.  listXxx 接口（listIndustryTypes/listSizeTiers/listUpgradeKinds/listRiskKinds）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-industry.js（IIFE 模式，sandbox）──
function buildContext() {
  var ctx = {
    console: console,
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    Set: Set, Map: Map, Promise: Promise,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-industry.js'), 'utf8'),
    ctx, { filename: 'tm-player-industry.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + 玩家私产 ──
function setupCtx(ctx) {
  // 玩家：李大臣（穿越模式·minister）
  var playerCh = { name: '李大臣', alive: true, officialTitle: '尚书', role: '臣', personality: '刚直', isPlayer: true };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh],
    _charInvestigations: []
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      characterTitle: '尚书',
      sovereignName: '今上',
      familyName: '李氏',
      playerEconomy: { cash: 100000, properties: [], investments: [], grayIncome: [], corruption: 0, ledger: [] }
    }
  };

  // mock TM.Transmigration
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // mock TM.PlayerEconomy.spend / addCash（与真接口同款·真扣 P.playerInfo.playerEconomy.cash）
  ctx._economyCalls = [];
  ctx.TM.PlayerEconomy = {
    spend: function (cost, reason) {
      ctx._economyCalls.push({ op: 'spend', cost: cost, reason: reason });
      var pe = ctx.P.playerInfo.playerEconomy;
      if (typeof pe.cash !== 'number') pe.cash = 0;
      if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
      pe.cash -= cost;
      if (!Array.isArray(pe.ledger)) pe.ledger = [];
      pe.ledger.push({ kind: 'spend', delta: -cost, reason: reason });
      return { ok: true, cash: pe.cash };
    },
    addCash: function (n, reason) {
      ctx._economyCalls.push({ op: 'addCash', amount: n, reason: reason });
      var pe = ctx.P.playerInfo.playerEconomy;
      pe.cash = (pe.cash || 0) + n;
      return { ok: true, cash: pe.cash };
    },
    getBalance: function () {
      return ctx.P.playerInfo.playerEconomy.cash;
    },
    getState: function () {
      return JSON.parse(JSON.stringify(ctx.P.playerInfo.playerEconomy));
    }
  };

  // mock TM.PlayerInteraction.interact（产业购地许可关联官场关系）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npcName: npcName, kind: kind, payload: payload });
      if (ctx._interactFail) {
        return { ok: false, reason: 'mock 拒绝' };
      }
      return { ok: true, kind: kind, npc: npcName, scene: 'mock 许可通过' };
    }
  };

  // mock TM.BuildingWorks（沿用 tm-building-works.js·smoke 中提供最小可用 stub）
  ctx._bwCalls = [];
  ctx.TM.BuildingWorks = {
    upkeepFor: function (building, typeDef) {
      ctx._bwCalls.push({ method: 'upkeepFor', args: [building, typeDef] });
      // 降级返回 null·让本模块自算 upkeep
      return null;
    },
    applyCompletion: function (div, building, P, GM) {
      ctx._bwCalls.push({ method: 'applyCompletion', args: [building && building.name] });
      return { ok: true, applied: false, reason: 'mock-no-div' };
    },
    damageBuilding: function (div, building) {
      ctx._bwCalls.push({ method: 'damageBuilding', args: [building && building.name] });
      return { ok: true };
    },
    repairBuilding: function (div, building) {
      ctx._bwCalls.push({ method: 'repairBuilding', args: [building && building.name] });
      return { ok: true };
    }
  };
}

function resetPlayerCash(ctx, n) {
  ctx.P.playerInfo.playerEconomy.cash = (n != null ? n : 100000);
}

// 选址工具：构造合法 location
function locPlain(name)   { return { name: name || '南阳平原', terrain: 'plain',   near: [], security: 70 }; }
function locValley(name)  { return { name: name || '汉中河谷', terrain: 'valley',  near: [], security: 65 }; }
function locGrass(name)   { return { name: name || '河套草原', terrain: 'grass',   near: [], security: 50 }; }
function locMountain(name){ return { name: name || '终南山',   terrain: 'mountain',near: ['mine'], security: 55 }; }
function locMine(name)    { return { name: name || '铜官山矿', terrain: 'mountain',near: ['mine'], security: 50 }; }
function locForest(name)  { return { name: name || '长白山林', terrain: 'forest',  near: [], security: 60 }; }
function locRiver(name)   { return { name: name || '汴水河畔', terrain: 'river',   near: ['water'], security: 65 }; }
function locLake(name)    { return { name: name || '洞庭湖滨', terrain: 'lake',    near: ['water'], security: 60 }; }
function locCoast(name)   { return { name: name || '东海之滨', terrain: 'coast',   near: ['water'], security: 60 }; }
function locCity(name)    { return { name: name || '洛阳城',   terrain: 'city',    near: [], security: 80 }; }
function locTown(name)    { return { name: name || '临清镇',   terrain: 'town',    near: [], security: 75 }; }

// ── Sub-tests ───────────────────────────────────────────────

// SubTest 1: 命名空间暴露
function testNamespace(ctx) {
  setupCtx(ctx);
  assert(ctx.TM && ctx.TM.PlayerIndustry, 'ns: TM.PlayerIndustry 暴露');
  var ns = ctx.TM.PlayerIndustry;
  // 常量
  assert(ns.STATUS && Object.keys(ns.STATUS).length === 6, 'ns: STATUS 共 6 态');
  assert(ns.INDUSTRY_TYPES && Object.keys(ns.INDUSTRY_TYPES).length === 8, 'ns: INDUSTRY_TYPES 共 8 种');
  assert(ns.SIZE_TIERS && Object.keys(ns.SIZE_TIERS).length === 3, 'ns: SIZE_TIERS 共 3 档');
  assert(ns.UPGRADE_KINDS && Object.keys(ns.UPGRADE_KINDS).length === 3, 'ns: UPGRADE_KINDS 共 3 类');
  assert(ns.RISK_KINDS && Object.keys(ns.RISK_KINDS).length === 6, 'ns: RISK_KINDS 共 6 类');
  assert(ns.HAOQIANG_THRESHOLDS, 'ns: HAOQIANG_THRESHOLDS 存在');
  assert(Array.isArray(ns.LOCATION_TERRAINS) && ns.LOCATION_TERRAINS.length >= 10, 'ns: LOCATION_TERRAINS ≥10');

  // 主入口
  assert(typeof ns.init === 'function', 'ns: init 是函数');
  assert(typeof ns.getState === 'function', 'ns: getState 是函数');
  assert(typeof ns.getIndustries === 'function', 'ns: getIndustries 是函数');
  assert(typeof ns.getIndustry === 'function', 'ns: getIndustry 是函数');
  assert(typeof ns.getIndustryCount === 'function', 'ns: getIndustryCount 是函数');
  // 22.4 选址建设
  assert(typeof ns.surveySite === 'function', 'ns: surveySite 是函数');
  assert(typeof ns.acquireLand === 'function', 'ns: acquireLand 是函数');
  assert(typeof ns.startProject === 'function', 'ns: startProject 是函数');
  // 22.5 施工
  assert(typeof ns.recruitWorkers === 'function', 'ns: recruitWorkers 是函数');
  assert(typeof ns.advanceConstruction === 'function', 'ns: advanceConstruction 是函数');
  assert(typeof ns.completeConstruction === 'function', 'ns: completeConstruction 是函数');
  // 22.6 经营
  assert(typeof ns.operateMonthly === 'function', 'ns: operateMonthly 是函数');
  assert(typeof ns.computeOutput === 'function', 'ns: computeOutput 是函数');
  assert(typeof ns.computeIndustryValue === 'function', 'ns: computeIndustryValue 是函数');
  // 22.7 升级
  assert(typeof ns.upgrade === 'function', 'ns: upgrade 是函数');
  // 22.8 风险
  assert(typeof ns.triggerRisk === 'function', 'ns: triggerRisk 是函数');
  assert(typeof ns.evaluateRisks === 'function', 'ns: evaluateRisks 是函数');
  assert(typeof ns.listRisks === 'function', 'ns: listRisks 是函数');
  // 22.9 豪强
  assert(typeof ns.checkHaoqiang === 'function', 'ns: checkHaoqiang 是函数');
  assert(typeof ns.getHaoqiangLevel === 'function', 'ns: getHaoqiangLevel 是函数');
  assert(typeof ns.triggerConfiscation === 'function', 'ns: triggerConfiscation 是函数');
  // 22.10 building-works
  assert(typeof ns.isBuildingWorksAvailable === 'function', 'ns: isBuildingWorksAvailable 是函数');
  assert(typeof ns.applyBuildingWorksBridge === 'function', 'ns: applyBuildingWorksBridge 是函数');
  // 22.11 面板
  assert(typeof ns.renderPanel === 'function', 'ns: renderPanel 是函数');
  // tick
  assert(typeof ns.tick === 'function', 'ns: tick 是函数');

  // 8 产业类型 label 全部就位
  var labels = Object.keys(ns.INDUSTRY_TYPES).map(function (k) { return ns.INDUSTRY_TYPES[k].label; });
  ['庄园','农场','牧场','矿场','林场','渔场','工坊','商号'].forEach(function (lbl) {
    assert(labels.indexOf(lbl) >= 0, 'ns: INDUSTRY_TYPES 含 ' + lbl);
  });
  // 6 风险 label 全部就位
  var riskLabels = Object.keys(ns.RISK_KINDS).map(function (k) { return ns.RISK_KINDS[k].label; });
  ['火灾','水灾','盗匪','民夫逃亡','官府强征','敌军劫掠'].forEach(function (lbl) {
    assert(riskLabels.indexOf(lbl) >= 0, 'ns: RISK_KINDS 含 ' + lbl);
  });
  // 3 升级 kind label
  var upLabels = Object.keys(ns.UPGRADE_KINDS).map(function (k) { return ns.UPGRADE_KINDS[k].label; });
  ['扩建','改良','特化'].forEach(function (lbl) {
    assert(upLabels.indexOf(lbl) >= 0, 'ns: UPGRADE_KINDS 含 ' + lbl);
  });
}

// SubTest 2: 守卫
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;

  // 非穿越模式·全部主入口拒绝
  ctx.P.playerInfo.transmigrationMode = false;
  var r1a = ns.acquireLand('nongchang', locPlain(), {});
  assert(r1a.ok === false && /非穿越模式/.test(r1a.reason), 'guard: 非穿越模式 acquireLand 拒绝');
  var r1b = ns.recruitWorkers('any', 10, {});
  assert(r1b.ok === false && /非穿越模式/.test(r1b.reason), 'guard: 非穿越模式 recruitWorkers 拒绝');
  var r1c = ns.advanceConstruction('any', {});
  assert(r1c.ok === false && /非穿越模式/.test(r1c.reason), 'guard: 非穿越模式 advanceConstruction 拒绝');
  var r1d = ns.operateMonthly({});
  assert(r1d.ok === false && /非穿越模式/.test(r1d.reason), 'guard: 非穿越模式 operateMonthly 拒绝');
  var r1e = ns.upgrade('any', 'expand', {});
  assert(r1e.ok === false && /非穿越模式/.test(r1e.reason), 'guard: 非穿越模式 upgrade 拒绝');
  var r1f = ns.triggerRisk('any', 'fire', {});
  assert(r1f.ok === false && /非穿越模式/.test(r1f.reason), 'guard: 非穿越模式 triggerRisk 拒绝');
  var r1g = ns.checkHaoqiang();
  assert(r1g.ok === false && /非穿越模式/.test(r1g.reason), 'guard: 非穿越模式 checkHaoqiang 拒绝');
  ctx.P.playerInfo.transmigrationMode = true;

  // surveySite（不依赖穿越模式·仍校验类型）
  var r2 = ns.surveySite('bogus', locPlain(), {});
  assert(r2.ok === false && /未知产业类型/.test(r2.reason), 'guard: surveySite 未知类型拒绝');
  var r3 = ns.surveySite('nongchang', locPlain(), { size: 'bogus' });
  assert(r3.ok === false && /未知规模/.test(r3.reason), 'guard: surveySite 未知规模拒绝');

  // 选址不通过：农场不可建于山地
  var r4 = ns.surveySite('nongchang', locMountain(), {});
  assert(r4.ok === false && /地形/.test(r4.reason), 'guard: 农场建于山地选址拒绝');

  // requireNear 不满足：矿场需 near 'mine'
  var locNoMine = { name: '某山地', terrain: 'mountain', near: [] };
  var r5 = ns.surveySite('kuangchang', locNoMine, {});
  assert(r5.ok === false && /紧邻/.test(r5.reason), 'guard: 矿场缺 mine 紧邻拒绝');

  // requireNear 不满足：渔场需 near 'water'
  var locNoWater = { name: '某河畔', terrain: 'river', near: [] };
  var r6 = ns.surveySite('yuchang', locNoWater, {});
  assert(r6.ok === false && /紧邻/.test(r6.reason), 'guard: 渔场缺 water 紧邻拒绝');

  // 银钱不足
  resetPlayerCash(ctx, 50);
  var r7 = ns.acquireLand('nongchang', locPlain(), {});
  assert(r7.ok === false && /银钱不足/.test(r7.reason), 'guard: 银钱不足 acquireLand 拒绝');
  resetPlayerCash(ctx, 100000);

  // 官府许可被拒（人物互动返回 ok=false）
  ctx._interactFail = true;
  var r8 = ns.acquireLand('nongchang', locPlain(), {});
  assert(r8.ok === false && /官府未批/.test(r8.reason), 'guard: 许可被拒 acquireLand 拒绝');
  ctx._interactFail = false;

  // recruitWorkers 缺 industryId
  var r9 = ns.recruitWorkers('', 10, {});
  assert(r9.ok === false && /industryId/.test(r9.reason), 'guard: recruitWorkers 缺 id 拒绝');
  // recruitWorkers 未找到产业
  var r10 = ns.recruitWorkers('bogus_id', 10, {});
  assert(r10.ok === false && /未找到/.test(r10.reason), 'guard: recruitWorkers 未找到拒绝');
  // recruitWorkers 非法人数（须用真 industryId·实现先查 find 再校验 count）
  resetPlayerCash(ctx, 100000);
  var r0x = ns.acquireLand('nongchang', locPlain('guard-fix'), { size: 'small' });
  assert(r0x.ok === true, 'guard: setup industry for count checks');
  var realId = r0x.industry.id;
  var r11a = ns.recruitWorkers(realId, 0, {});
  assert(r11a.ok === false && /人数非法/.test(r11a.reason), 'guard: 0 人拒绝');
  var r11b = ns.recruitWorkers(realId, -5, {});
  assert(r11b.ok === false && /人数非法/.test(r11b.reason), 'guard: 负数人拒绝');
  var r11c = ns.recruitWorkers(realId, 5.5, {});
  assert(r11c.ok === false && /整数/.test(r11c.reason), 'guard: 非整数人拒绝');

  // upgrade 未知 kind
  var r12 = ns.upgrade('any', 'bogus', {});
  assert(r12.ok === false && /未知升级类型/.test(r12.reason), 'guard: upgrade 未知 kind 拒绝');

  // triggerRisk 未知风险（须用真 industryId·实现先 find 再校验 riskKind）
  var r13 = ns.triggerRisk(realId, 'bogus', {});
  assert(r13.ok === false && /未知风险类型/.test(r13.reason), 'guard: triggerRisk 未知风险拒绝');
}

// SubTest 3: 常量定义完整性（8 产业类型 / 3 规模 / 3 升级 / 6 风险 全量）
function testConstants(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;

  // 8 产业类型 + 每个字段齐
  var typeKeys = Object.keys(ns.INDUSTRY_TYPES);
  assert(typeKeys.length === 8, 'const: 8 产业类型·实际 ' + typeKeys.length);
  typeKeys.forEach(function (k) {
    var d = ns.INDUSTRY_TYPES[k];
    assert(d.id === k, 'const: ' + k + ' id 自洽');
    assert(typeof d.label === 'string' && d.label.length > 0, 'const: ' + k + ' label 非空');
    assert(Array.isArray(d.terrain), 'const: ' + k + ' terrain 是数组');
    assert(typeof d.landCost === 'number' && d.landCost > 0, 'const: ' + k + ' landCost > 0');
    assert(typeof d.buildMonths === 'number' && d.buildMonths > 0, 'const: ' + k + ' buildMonths > 0');
    assert(typeof d.workerDemand === 'number' && d.workerDemand > 0, 'const: ' + k + ' workerDemand > 0');
    assert(d.baseOutput && typeof d.baseOutput.cash === 'number', 'const: ' + k + ' baseOutput.cash');
    assert(d.baseOutput && typeof d.baseOutput.goods === 'number', 'const: ' + k + ' baseOutput.goods');
    assert(typeof d.upkeep === 'number', 'const: ' + k + ' upkeep');
    assert(d.riskMod && Object.keys(d.riskMod).length === 6, 'const: ' + k + ' riskMod 6 字段');
  });

  // 3 规模档
  var sizeKeys = Object.keys(ns.SIZE_TIERS);
  assert(sizeKeys.length === 3, 'const: 3 规模档·实际 ' + sizeKeys.length);
  ['small','medium','large'].forEach(function (k) {
    var d = ns.SIZE_TIERS[k];
    assert(d.scaleMul >= 1, 'const: ' + k + ' scaleMul ≥ 1');
    assert(d.costMul >= 1, 'const: ' + k + ' costMul ≥ 1');
    assert(d.outputMul >= 1, 'const: ' + k + ' outputMul ≥ 1');
  });

  // 3 升级类
  var upKeys = Object.keys(ns.UPGRADE_KINDS);
  assert(upKeys.length === 3, 'const: 3 升级类·实际 ' + upKeys.length);
  ['expand','improve','specialize'].forEach(function (k) {
    var d = ns.UPGRADE_KINDS[k];
    assert(d.costMul > 0, 'const: ' + k + ' costMul > 0');
    assert(d.outputMul >= 1, 'const: ' + k + ' outputMul ≥ 1');
  });

  // 6 风险
  var riskKeys = Object.keys(ns.RISK_KINDS);
  assert(riskKeys.length === 6, 'const: 6 风险·实际 ' + riskKeys.length);
  ['fire','flood','bandit','flee','impress','raid'].forEach(function (k) {
    var d = ns.RISK_KINDS[k];
    assert(typeof d.severityBase === 'number', 'const: ' + k + ' severityBase');
    assert(typeof d.outputLoss === 'number', 'const: ' + k + ' outputLoss');
    assert(typeof d.workerLoss === 'number', 'const: ' + k + ' workerLoss');
    assert(typeof d.fixable === 'boolean', 'const: ' + k + ' fixable boolean');
  });

  // 豪强阈值
  var h = ns.HAOQIANG_THRESHOLDS;
  assert(h.warning < h.serious && h.serious < h.confiscate && h.confiscate < h.max,
    'const: 阈值递增 warning<serious<confiscate<max');
}

// SubTest 4: 选址建设（surveySite + acquireLand + startProject）
function testSiteSelection(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;

  // surveySite 不扣费·不创建产业·仅返回成本预估
  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;
  var r1 = ns.surveySite('zhuangyuan', locPlain(), { size: 'small' });
  assert(r1.ok === true, 'site: surveySite 庄园/small ok');
  assert(r1.type === 'zhuangyuan' && r1.typeLabel === '庄园', 'site: surveySite type 回显');
  assert(r1.size === 'small' && r1.sizeLabel === '小', 'site: surveySite size 回显');
  assert(r1.landCost === 1200, 'site: 庄园/small landCost=1200·实际 ' + r1.landCost);
  assert(r1.buildMonths === 6, 'site: 庄园/small buildMonths=6·实际 ' + r1.buildMonths);
  assert(r1.workerDemand === 30, 'site: 庄园/small workerDemand=30·实际 ' + r1.workerDemand);
  assert(r1.baseOutput.cash === 200 && r1.baseOutput.goods === 80, 'site: 庄园/small baseOutput');
  assert(ctx.P.playerInfo.playerEconomy.cash === cashBefore, 'site: surveySite 不扣费');

  // medium 规模·costMul=1.8 / monthsAdd=2 / workerMul=1.8
  var r2 = ns.surveySite('zhuangyuan', locPlain(), { size: 'medium' });
  assert(r2.landCost === Math.round(1200 * 1.8), 'site: 庄园/medium landCost·实际 ' + r2.landCost);
  assert(r2.buildMonths === 6 + 2, 'site: 庄园/medium buildMonths=8·实际 ' + r2.buildMonths);
  assert(r2.workerDemand === Math.round(30 * 1.8), 'site: 庄园/medium workerDemand·实际 ' + r2.workerDemand);

  // large 规模·costMul=3.2 / monthsAdd=4 / workerMul=3.5
  var r3 = ns.surveySite('zhuangyuan', locPlain(), { size: 'large' });
  assert(r3.landCost === Math.round(1200 * 3.2), 'site: 庄园/large landCost·实际 ' + r3.landCost);
  assert(r3.buildMonths === 6 + 4, 'site: 庄园/large buildMonths=10·实际 ' + r3.buildMonths);

  // acquireLand 真扣费·创建产业（PLANNING 状态）
  resetPlayerCash(ctx, 100000);
  var before = ctx.P.playerInfo.playerEconomy.cash;
  var r4 = ns.acquireLand('nongchang', locPlain('南阳'), { size: 'small' });
  assert(r4.ok === true, 'site: acquireLand ok');
  assert(r4.industry && r4.industry.id, 'site: 返回 industry.id');
  assert(r4.industry.type === 'nongchang', 'site: industry.type=nongchang');
  assert(r4.industry.status === 'planning', 'site: industry.status=planning');
  assert(r4.industry.size === 'small', 'site: industry.size=small');
  assert(r4.industry.construction.remainingMonths === 3, 'site: 农场/small buildMonths=3');
  assert(r4.industry.construction.demandWorkers === 20, 'site: 农场/small demandWorkers=20');
  assert(ctx.P.playerInfo.playerEconomy.cash === before - r4.landCost, 'site: 银钱 -= landCost');
  // 官府许可被调用
  assert(ctx._interactCalls.length >= 1, 'site: 官府许可 interact 被调用');
  assert(ctx._interactCalls[0].kind === 'petition', 'site: interact kind=petition');

  // 8 种产业各跑一次 acquireLand（验证 terrain + requireNear 全通）
  resetPlayerCash(ctx, 1000000);
  var cases = [
    ['zhuangyuan', locPlain()],
    ['nongchang',  locValley()],
    ['muchang',    locGrass()],
    ['kuangchang', locMine()],
    ['linchang',   locForest()],
    ['yuchang',    locRiver()],
    ['gongfang',   locCity()],
    ['shanghao',   locTown()]
  ];
  cases.forEach(function (c) {
    var r = ns.acquireLand(c[0], c[1], { size: 'small' });
    assert(r.ok === true, 'site: acquireLand ' + c[0] + ' ok');
    assert(r.industry.type === c[0], 'site: ' + c[0] + ' type 回显');
  });

  // startProject = acquireLand 别名
  resetPlayerCash(ctx, 100000);
  var r5 = ns.startProject('gongfang', locCity('洛阳'), { size: 'small' });
  assert(r5.ok === true, 'site: startProject 别名 ok');
  assert(r5.industry.type === 'gongfang', 'site: startProject type 回显');

  // 产业数检查
  var ns2 = ctx.TM.PlayerIndustry;
  var count = ns2.getIndustryCount();
  assert(count >= 9, 'site: 至少 9 座产业（8 + startProject）·实际 ' + count);
}

// SubTest 5: 施工建设（募工 + 工期 + 完工）
function testConstruction(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 100000);

  // 农场/small·demandWorkers=20·buildMonths=3
  var r = ns.acquireLand('nongchang', locPlain('南阳'), { size: 'small' });
  assert(r.ok === true, 'cons: acquireLand ok');
  var indId = r.industry.id;
  assert(r.industry.status === 'planning', 'cons: 初始 status=planning');

  // 募工未满时·advanceConstruction 拒绝
  var r1 = ns.recruitWorkers(indId, 10, {});
  assert(r1.ok === true, 'cons: 募工 10 ok');
  assert(r1.recruited === 10, 'cons: recruited=10');
  assert(r1.recruitedTotal === 10, 'cons: recruitedTotal=10');
  assert(r1.remaining === 10, 'cons: remaining=10');
  assert(r1.status === 'planning', 'cons: 募工未满·仍 planning');

  // advanceConstruction 在 PLANNING 状态·募工未满·拒绝
  var r2 = ns.advanceConstruction(indId, { months: 1 });
  assert(r2.ok === false && /募工未满/.test(r2.reason), 'cons: 募工未满 advanceConstruction 拒绝');

  // 募工满 → CONSTRUCTING
  var r3 = ns.recruitWorkers(indId, 10, {});
  assert(r3.ok === true, 'cons: 募工满 10 ok');
  assert(r3.recruitedTotal === 20, 'cons: recruitedTotal=20');
  assert(r3.remaining === 0, 'cons: remaining=0');
  assert(r3.status === 'constructing', 'cons: 募工满 → constructing');
  assert(r3.statusChanged === true, 'cons: statusChanged=true');

  // 募工已满·再招拒绝
  var r4 = ns.recruitWorkers(indId, 5, {});
  assert(r4.ok === false && /募工已满/.test(r4.reason), 'cons: 募工已满再招拒绝');

  // 推进施工 1 月·剩 2 月
  var r5 = ns.advanceConstruction(indId, { months: 1 });
  assert(r5.ok === true, 'cons: advanceConstruction 1 月 ok');
  assert(r5.remainingMonths === 2, 'cons: remainingMonths=2');
  assert(r5.completed === false, 'cons: 未完工');

  // 推进 2 月·完工
  var r6 = ns.advanceConstruction(indId, { months: 2 });
  assert(r6.ok === true, 'cons: advanceConstruction 2 月 ok');
  assert(r6.completed === true, 'cons: 完工');
  // 完工后状态 OPERATING
  var ind = ns.getIndustry(indId);
  assert(ind.status === 'operating', 'cons: 完工后 status=operating');
  assert(ind.completedAt === ctx.GM.turn, 'cons: completedAt = turn');

  // completeConstruction 强制完工路径
  resetPlayerCash(ctx, 100000);
  var r7 = ns.acquireLand('gongfang', locCity('洛阳'), { size: 'small' });
  var r8 = ns.recruitWorkers(r7.industry.id, 100, {}); // 一次招超需求
  assert(r8.ok === true, 'cons: gongfang 募工 ok');
  var r9 = ns.completeConstruction(r7.industry.id, {});
  assert(r9.ok === true, 'cons: completeConstruction ok');
  var ind2 = ns.getIndustry(r7.industry.id);
  assert(ind2.status === 'operating', 'cons: completeConstruction 后 status=operating');

  // 已投产再 completeConstruction 拒绝
  var r10 = ns.completeConstruction(r7.industry.id, {});
  assert(r10.ok === false && /已投产/.test(r10.reason), 'cons: 已投产 completeConstruction 拒绝');

  // 完工未达募工·force=true 强制
  resetPlayerCash(ctx, 100000);
  var r11 = ns.acquireLand('muchang', locGrass('河套'), { size: 'small' });
  // 不募工·直接 completeConstruction force
  var r12 = ns.completeConstruction(r11.industry.id, { force: true });
  assert(r12.ok === true, 'cons: force=true 完工 ok');
}

// SubTest 6: 产业经营（月度产出 + modifiers + 入账玩家银钱）
function testOperation(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 100000);

  // 庄园/small·投产
  var r = ns.acquireLand('zhuangyuan', locPlain('南阳'), { size: 'small', overseer: '王管事' });
  var indId = r.industry.id;
  ns.recruitWorkers(indId, 30, {});
  ns.completeConstruction(indId, { force: true });
  var ind = ns.getIndustry(indId);
  assert(ind.status === 'operating', 'op: 完工 status=operating');

  // 月度经营
  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;
  var r1 = ns.operateMonthly({});
  assert(r1.ok === true, 'op: operateMonthly ok');
  assert(Array.isArray(r1.operated) && r1.operated.length >= 1, 'op: operated 数组非空');
  assert(typeof r1.totalCash === 'number' && r1.totalCash >= 0, 'op: totalCash ≥ 0');
  assert(typeof r1.totalGoods === 'number' && r1.totalGoods >= 0, 'op: totalGoods ≥ 0');

  // 找到本次经营的产业
  var opEntry = r1.operated.find(function (o) { return o.id === indId; });
  assert(opEntry, 'op: 找到本次经营的产业');
  assert(opEntry.cash > 0, 'op: cash > 0·实际 ' + opEntry.cash);
  assert(opEntry.goods > 0, 'op: goods > 0·实际 ' + opEntry.goods);
  assert(opEntry.modifiers && typeof opEntry.modifiers.level === 'number', 'op: modifiers.level');
  assert(opEntry.modifiers.management > 0, 'op: modifiers.management > 0');
  assert(opEntry.modifiers.worker > 0, 'op: modifiers.worker > 0');
  assert(opEntry.modifiers.security > 0, 'op: modifiers.security > 0');
  assert(opEntry.modifiers.disaster > 0, 'op: modifiers.disaster > 0');

  // 玩家银钱 += cash（operateOne 调 _addPlayerCash）
  assert(ctx.P.playerInfo.playerEconomy.cash >= cashBefore, 'op: 玩家银钱 ≥ before');

  // 单独测试 computeOutput
  var ind2 = ns.getIndustry(indId);
  var coR = ns.computeOutput(ind2, {});
  assert(coR.ok === true, 'op: computeOutput ok');
  assert(coR.cash >= 0 && coR.goods >= 0, 'op: computeOutput cash/goods ≥ 0');

  // 测试管理因子：overseer 在场 ×1.1 vs 缺席 ×0.85
  resetPlayerCash(ctx, 100000);
  var rA = ns.acquireLand('nongchang', locPlain('南阳A'), { size: 'small', overseer: '张管事' });
  var rB = ns.acquireLand('nongchang', locPlain('南阳B'), { size: 'small' }); // 无 overseer
  ns.recruitWorkers(rA.industry.id, 20, {});
  ns.recruitWorkers(rB.industry.id, 20, {});
  ns.completeConstruction(rA.industry.id, { force: true });
  ns.completeConstruction(rB.industry.id, { force: true });
  var indA = ns.getIndustry(rA.industry.id);
  var indB = ns.getIndustry(rB.industry.id);
  var outA = ns.computeOutput(indA, {});
  var outB = ns.computeOutput(indB, {});
  assert(outA.modifiers.management > outB.modifiers.management,
    'op: overseer 在场 management > 缺席（' + outA.modifiers.management + ' > ' + outB.modifiers.management + '）');
  assert(outA.cash >= outB.cash, 'op: overseer 在场 cash ≥ 缺席');

  // 测试治安因子：security 高产出高
  resetPlayerCash(ctx, 100000);
  var locHighSec = { name: '高安', terrain: 'plain', near: [], security: 95 };
  var locLowSec  = { name: '低安', terrain: 'plain', near: [], security: 20 };
  var rHi = ns.acquireLand('nongchang', locHighSec, { size: 'small' });
  var rLo = ns.acquireLand('nongchang', locLowSec,  { size: 'small' });
  ns.recruitWorkers(rHi.industry.id, 20, {});
  ns.recruitWorkers(rLo.industry.id, 20, {});
  ns.completeConstruction(rHi.industry.id, { force: true });
  ns.completeConstruction(rLo.industry.id, { force: true });
  var outHi = ns.computeOutput(ns.getIndustry(rHi.industry.id), {});
  var outLo = ns.computeOutput(ns.getIndustry(rLo.industry.id), {});
  assert(outHi.modifiers.security > outLo.modifiers.security,
    'op: 高治安 security > 低治安（' + outHi.modifiers.security + ' > ' + outLo.modifiers.security + '）');
  assert(outHi.cash >= outLo.cash, 'op: 高治安 cash ≥ 低治安');

  // computeIndustryValue 估值
  var val = ns.computeIndustryValue(ns.getIndustry(rHi.industry.id));
  assert(val > 0, 'op: computeIndustryValue > 0');
}

// SubTest 7: 产业升级（expand/improve/specialize）
function testUpgrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 100000);

  // 庄园/small 投产
  var r = ns.acquireLand('zhuangyuan', locPlain('南阳'), { size: 'small' });
  var indId = r.industry.id;
  ns.recruitWorkers(indId, 30, {});
  ns.completeConstruction(indId, { force: true });
  var ind = ns.getIndustry(indId);
  var prevLevel = ind.level;
  var prevCash = ind.baseOutput.cash;
  var prevGoods = ind.baseOutput.goods;

  // expand 扩建·level + 1·产出 ×1.3
  var r1 = ns.upgrade(indId, 'expand', {});
  assert(r1.ok === true, 'up: expand ok');
  assert(r1.kind === 'expand', 'up: expand kind');
  assert(r1.newLevel === prevLevel + 1, 'up: expand level +1·实际 ' + r1.newLevel);
  assert(r1.cost > 0, 'up: expand cost > 0');
  var ind2 = ns.getIndustry(indId);
  assert(ind2.baseOutput.cash === Math.round(prevCash * 1.3), 'up: expand cash ×1.3·实际 ' + ind2.baseOutput.cash);
  assert(ind2.baseOutput.goods === Math.round(prevGoods * 1.3), 'up: expand goods ×1.3·实际 ' + ind2.baseOutput.goods);
  // expand 有 monthsAdd=2·状态回 CONSTRUCTING
  assert(ind2.status === 'constructing', 'up: expand 后 status=constructing');
  assert(ind2.construction.remainingMonths === 2, 'up: expand remainingMonths=2');

  // 完工后再测 improve
  ns.completeConstruction(indId, { force: true });
  var ind3 = ns.getIndustry(indId);
  var prevCash3 = ind3.baseOutput.cash;
  var prevRiskMod3 = ind3.riskModDelta || 0;
  var r2 = ns.upgrade(indId, 'improve', {});
  assert(r2.ok === true, 'up: improve ok');
  var ind4 = ns.getIndustry(indId);
  assert(ind4.baseOutput.cash === Math.round(prevCash3 * 1.15), 'up: improve cash ×1.15·实际 ' + ind4.baseOutput.cash);
  assert((ind4.riskModDelta || 0) === prevRiskMod3 - 0.10, 'up: improve riskModDelta -0.10');
  // improve monthsAdd=1·状态 CONSTRUCTING
  assert(ind4.status === 'constructing', 'up: improve 后 status=constructing');

  // 完工后测 specialize
  ns.completeConstruction(indId, { force: true });
  var prevCash5 = ns.getIndustry(indId).baseOutput.cash;
  var r3 = ns.upgrade(indId, 'specialize', { subType: '丝绸' });
  assert(r3.ok === true, 'up: specialize ok');
  var ind5 = ns.getIndustry(indId);
  assert(ind5.subType === '丝绸', 'up: specialize subType=丝绸');
  assert(ind5.baseOutput.cash === Math.round(prevCash5 * 1.4), 'up: specialize cash ×1.4·实际 ' + ind5.baseOutput.cash);

  // 升级日志
  assert(ind5.upgradeLog && ind5.upgradeLog.length === 3, 'up: upgradeLog 3 项·实际 ' + ind5.upgradeLog.length);
  var kinds = ind5.upgradeLog.map(function (u) { return u.kind; });
  assert(kinds.join(',') === 'expand,improve,specialize', 'up: upgradeLog 顺序 expand,improve,specialize');

  // 银钱不足·拒绝升级（specialize 后状态回 CONSTRUCTING·须先 force 完工）
  ns.completeConstruction(indId, { force: true });
  resetPlayerCash(ctx, 5);
  var r4 = ns.upgrade(indId, 'expand', {});
  assert(r4.ok === false && /银钱不足/.test(r4.reason), 'up: 银钱不足 upgrade 拒绝');

  // 非投产状态不可升级
  resetPlayerCash(ctx, 100000);
  var r5 = ns.acquireLand('nongchang', locPlain('南阳B'), { size: 'small' });
  var r6 = ns.upgrade(r5.industry.id, 'expand', {});
  assert(r6.ok === false && /非投产状态/.test(r6.reason), 'up: PLANNING 不可升级');
}

// SubTest 8: 产业风险（6 类 + severity + 状态变 DAMAGED）
function testRisks(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 100000);

  // 庄园/small 投产
  var r = ns.acquireLand('zhuangyuan', locPlain('南阳'), { size: 'small' });
  var indId = r.industry.id;
  ns.recruitWorkers(indId, 30, {});
  ns.completeConstruction(indId, { force: true });

  // 6 类风险各触发一次
  var riskKinds = ['fire','flood','bandit','flee','impress','raid'];
  riskKinds.forEach(function (rk) {
    var before = ns.getIndustry(indId);
    var beforeWorkers = before.workers.count;
    var r = ns.triggerRisk(indId, rk, { severity: 0.8 });
    assert(r.ok === true, 'risk: ' + rk + ' ok');
    assert(r.riskKind === rk, 'risk: ' + rk + ' kind 回显');
    assert(typeof r.severity === 'number' && r.severity > 0, 'risk: ' + rk + ' severity > 0');
    assert(typeof r.cashLoss === 'number' && r.cashLoss >= 0, 'risk: ' + rk + ' cashLoss ≥ 0');
    assert(typeof r.workerLoss === 'number' && r.workerLoss >= 0, 'risk: ' + rk + ' workerLoss ≥ 0');
    // 累积风险值
    var after = ns.getIndustry(indId);
    assert(after.risks[rk] > 0, 'risk: ' + rk + ' 累积风险值 > 0·实际 ' + after.risks[rk]);
    assert(after.lastRiskAt === ctx.GM.turn, 'risk: ' + rk + ' lastRiskAt = turn');
  });

  // 状态变 DAMAGED（fixable + severity > 0.4 + OPERATING）
  // 重置一个新产业
  resetPlayerCash(ctx, 100000);
  var r2 = ns.acquireLand('linchang', locForest('长白山'), { size: 'small' });
  var indId2 = r2.industry.id;
  ns.recruitWorkers(indId2, 15, {});
  ns.completeConstruction(indId2, { force: true });
  // 林场 fire fixable=true·severity=0.8 → DAMAGED
  var indBefore = ns.getIndustry(indId2);
  assert(indBefore.status === 'operating', 'risk: 林场初始 operating');
  var r3 = ns.triggerRisk(indId2, 'fire', { severity: 0.8 });
  assert(r3.statusChanged === true, 'risk: fire severity=0.8 触发 statusChanged');
  var indAfter = ns.getIndustry(indId2);
  assert(indAfter.status === 'damaged', 'risk: fire 后 status=damaged');

  // impress 触发豪强复算
  resetPlayerCash(ctx, 1000000);
  var r4 = ns.acquireLand('zhuangyuan', locPlain('南阳豪强'), { size: 'large' });
  var indId3 = r4.industry.id;
  ns.recruitWorkers(indId3, 1000, {}); // large ×4 = 120 人
  ns.completeConstruction(indId3, { force: true });
  var r5 = ns.triggerRisk(indId3, 'impress', { severity: 0.6 });
  assert(r5.ok === true, 'risk: impress ok');

  // listRisks
  var risks = ns.listRisks(indId3);
  assert(Array.isArray(risks) && risks.length === 6, 'risk: listRisks 6 项');
  risks.forEach(function (r) {
    assert(typeof r.riskKind === 'string', 'risk: listRisks 条目 riskKind');
    assert(typeof r.riskLabel === 'string', 'risk: listRisks 条目 riskLabel');
    assert(typeof r.accumulated === 'number', 'risk: listRisks 条目 accumulated');
  });

  // evaluateRisks 月度检定（forceRisk 保证触发）
  var r6 = ns.evaluateRisks(indId3, { forceRisk: ['fire','flood'] });
  assert(r6.ok === true, 'risk: evaluateRisks ok');
  assert(Array.isArray(r6.risks), 'risk: evaluateRisks 返回 risks 数组');

  // 已抄没产业不可触发风险
  // 先抄没：通过 triggerConfiscation
  // 先确保有其他产业可被抄没（最大估值）
  // 跳过此 case：直接测试已 CONFISCATED 路径
  // — 这里通过手动设状态模拟（不暴露内部 setter·用 _findIndustry 直改）
  var s = ns._getState();
  var ind0 = s.industries[0];
  var origStatus = ind0.status;
  ind0.status = 'confiscated'; // arch-ok (smoke fixture)
  var r7 = ns.triggerRisk(ind0.id, 'fire', {});
  assert(r7.ok === false && /抄没/.test(r7.reason), 'risk: 抄没产业 triggerRisk 拒绝');
  ind0.status = origStatus; // 恢复
}

// SubTest 9: 豪强标签（warning/serious/confiscate 三档）
function testHaoqiang(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 1000000);

  // 初始 level=none
  var lvl0 = ns.getHaoqiangLevel();
  assert(lvl0 === 'none', 'hao: 初始 level=none');

  // 建一座 large 庄园（估值最高）
  // 庄园/large：landCost=1200×3.2=3840；月产出 cash=200×3.0=600 goods=80×3.0=240
  // 估值 = 3840 + (600 + 240×0.5)×12×level = 3840 + 720×12×1 = 3840 + 8640 = 12480 → warning (≥6000)
  var r = ns.acquireLand('zhuangyuan', locPlain('豪强庄'), { size: 'large' });
  var indId = r.industry.id;
  ns.recruitWorkers(indId, 120, {});
  ns.completeConstruction(indId, { force: true });

  // checkHaoqiang 复算
  var r1 = ns.checkHaoqiang();
  assert(r1.ok === true, 'hao: checkHaoqiang ok');
  var lvl1 = ns.getHaoqiangLevel();
  assert(lvl1 === 'warning' || lvl1 === 'serious' || lvl1 === 'confiscate',
    'hao: 大产业后 level ≥ warning·实际 ' + lvl1);
  assert(r1.haoqiang && r1.haoqiang.totalValue > 0, 'hao: totalValue > 0');

  // 升级到 serious：再建一座 large 矿场
  // 矿场/large：landCost=1500×3.2=4800；月产出 cash=280×3.0=840 goods=60×3.0=180
  // 估值 = 4800 + (840 + 180×0.5)×12×1 = 4800 + 930×12 = 4800 + 11160 = 15960
  // 累计：12480 + 15960 = 28440 → serious (≥15000 <30000)
  resetPlayerCash(ctx, 1000000);
  var r2 = ns.acquireLand('kuangchang', locMine('铜官山'), { size: 'large' });
  ns.recruitWorkers(r2.industry.id, 160, {}); // 40×4=160
  ns.completeConstruction(r2.industry.id, { force: true });
  var r3 = ns.checkHaoqiang();
  var lvl2 = ns.getHaoqiangLevel();
  assert(lvl2 === 'serious' || lvl2 === 'confiscate',
    'hao: 2 座大产业 level ≥ serious·实际 ' + lvl2);

  // 再建第三座 large 工坊 → confiscate
  // 工坊/large：landCost=800×3.2=2560；月产出 cash=180×3.0=540 goods=70×3.0=210
  // 估值 = 2560 + (540 + 210×0.5)×12×1 = 2560 + 645×12 = 2560 + 7740 = 10300
  // 累计：28440 + 10300 = 38740 → confiscate (≥30000)
  resetPlayerCash(ctx, 1000000);
  var r4 = ns.acquireLand('gongfang', locCity('洛阳'), { size: 'large' });
  // acquireLand 内部已触发豪强复算·此时总估值 38740 → level='confiscate' → 自动抄没最大产业
  assert(r4.haoqiang && r4.haoqiang.level === 'confiscate',
    'hao: acquireLand 时 level=confiscate·实际 ' + (r4.haoqiang && r4.haoqiang.level));
  ns.recruitWorkers(r4.industry.id, 100, {}); // 25×4=100
  ns.completeConstruction(r4.industry.id, { force: true });
  // 不再调用 checkHaoqiang（会复算·level 会下降到 'serious'·因最大产业已被抄没）
  var lvl3 = ns.getHaoqiangLevel();
  // 此时 state.haoqiangLevel 仍为 acquireLand 时设置的 'confiscate'
  assert(lvl3 === 'confiscate', 'hao: acquireLand 后 haoqiangLevel=confiscate·实际 ' + lvl3);

  // 抄没应自动触发（最大估值产业被抄没）
  var stateAfter = ns.getState();
  var confiscatedCount = stateAfter.industries.filter(function (i) { return i.status === 'confiscated'; }).length;
  assert(confiscatedCount >= 1, 'hao: 自动抄没至少 1 座·实际 ' + confiscatedCount);

  // 手动 triggerConfiscation 再抄一座（仍有 OPERATING 产业）
  var r6 = ns.triggerConfiscation({});
  assert(r6.ok === true, 'hao: triggerConfiscation ok');
  assert(r6.confiscation && r6.confiscation.industryId, 'hao: confiscation.industryId');

  // 朝廷调查登记（GM._charInvestigations）
  assert(Array.isArray(ctx.GM._charInvestigations), 'hao: GM._charInvestigations 已建');
  // 至少有 1 条调查记录（serious/confiscate 触发）
  assert(ctx.GM._charInvestigations.length >= 1, 'hao: 朝廷查核记录 ≥ 1·实际 ' + ctx.GM._charInvestigations.length);

  // 恶名累积
  var stateFinal = ns.getState();
  assert(stateFinal.notoriety > 0, 'hao: notoriety > 0·实际 ' + stateFinal.notoriety);
}

// SubTest 10: 沿用 tm-building-works.js
function testBuildingWorksBridge(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;

  // isBuildingWorksAvailable（mock 已注入）
  var avail = ns.isBuildingWorksAvailable();
  assert(avail === true, 'bw: isBuildingWorksAvailable=true（mock 已注入）');

  // applyBuildingWorksBridge 调用 upkeepFor
  var r1 = ns.applyBuildingWorksBridge('upkeepFor', [{ name: 'test' }, {}]);
  assert(r1.ok === true, 'bw: applyBuildingWorksBridge.upkeepFor ok');
  assert(r1.available === true, 'bw: available=true');
  assert(r1.method === 'upkeepFor', 'bw: method 回显');

  // 完工时调用 applyCompletion
  resetPlayerCash(ctx, 100000);
  var r2 = ns.acquireLand('zhuangyuan', locPlain('南阳'), { size: 'small' });
  ns.recruitWorkers(r2.industry.id, 30, {});
  var before = ctx._bwCalls.length;
  ns.completeConstruction(r2.industry.id, { force: true });
  var after = ctx._bwCalls.length;
  assert(after >= before, 'bw: 完工调用 BuildingWorks');
  var hasApplyCompletion = ctx._bwCalls.some(function (c) { return c.method === 'applyCompletion'; });
  assert(hasApplyCompletion, 'bw: 完工触发 applyCompletion');

  // 月度维护时调用 upkeepFor
  var before2 = ctx._bwCalls.length;
  ns.operateMonthly({});
  var after2 = ctx._bwCalls.length;
  assert(after2 > before2, 'bw: 月度维护调用 BuildingWorks');
  var hasUpkeepFor = ctx._bwCalls.some(function (c) { return c.method === 'upkeepFor'; });
  assert(hasUpkeepFor, 'bw: 月度维护触发 upkeepFor');

  // 灾害时调用 damageBuilding
  var before3 = ctx._bwCalls.length;
  ns.triggerRisk(r2.industry.id, 'fire', { severity: 0.8 });
  var after3 = ctx._bwCalls.length;
  var hasDamage = ctx._bwCalls.some(function (c) { return c.method === 'damageBuilding'; });
  assert(hasDamage, 'bw: 灾害触发 damageBuilding');

  // 软依赖降级：移除 TM.BuildingWorks 后·本模块仍能跑
  delete ctx.TM.BuildingWorks;
  var avail2 = ns.isBuildingWorksAvailable();
  assert(avail2 === false, 'bw: 移除后 isBuildingWorksAvailable=false');
  // operateMonthly 仍能跑（降级本模块规则）
  resetPlayerCash(ctx, 100000);
  var r3 = ns.acquireLand('nongchang', locPlain('降级'), { size: 'small' });
  ns.recruitWorkers(r3.industry.id, 20, {});
  ns.completeConstruction(r3.industry.id, { force: true });
  var r4 = ns.operateMonthly({});
  assert(r4.ok === true, 'bw: 降级后 operateMonthly 仍 ok');
  // applyBuildingWorksBridge 返回 available=false
  var r5 = ns.applyBuildingWorksBridge('upkeepFor', []);
  assert(r5.ok === false && r5.available === false, 'bw: 降级后 applyBuildingWorksBridge 拒绝');
}

// SubTest 11: 御案"产业"面板
function testPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 100000);

  // 空面板
  var html0 = ns.renderPanel();
  assert(typeof html0 === 'string' && html0.length > 0, 'panel: 空面板返回非空字符串');
  assert(/pi-panel/.test(html0), 'panel: 含 pi-panel 类');
  assert(/产 业/.test(html0), 'panel: 含"产 业"标题');

  // 建几座产业
  var r1 = ns.acquireLand('zhuangyuan', locPlain('南阳'), { size: 'medium', overseer: '张管事' });
  ns.recruitWorkers(r1.industry.id, 60, {});
  ns.completeConstruction(r1.industry.id, { force: true });

  var r2 = ns.acquireLand('gongfang', locCity('洛阳'), { size: 'small' });
  // 一座施工中
  ns.recruitWorkers(r2.industry.id, 25, {});

  // 月度经营 + 触发风险·让面板有数据
  ns.operateMonthly({});
  ns.triggerRisk(r1.industry.id, 'fire', { severity: 0.5 });

  var html = ns.renderPanel();
  assert(typeof html === 'string' && html.length > 100, 'panel: 返回长字符串');
  assert(/pi-panel/.test(html), 'panel: 含 pi-panel 类');
  assert(/产 业 · 概 览/.test(html), 'panel: 含"产 业 · 概 览"段');
  assert(/产 业 · 名 录/.test(html), 'panel: 含"产 业 · 名 录"段');
  assert(/近 事/.test(html), 'panel: 含"近 事"段');
  assert(/庄园/.test(html), 'panel: 含"庄园"');
  assert(/工坊/.test(html), 'panel: 含"工坊"');
  assert(/投产|施工|选址|受损|抄没/.test(html), 'panel: 含状态字');
  assert(/估值/.test(html), 'panel: 含"估值"');
  assert(/豪强/.test(html), 'panel: 含"豪强"');

  // 朝代中立·不含明清专名
  assert(!/锦衣卫|司礼监|东厂|西厂|军机处|内阁|票拟|廷杖|八股/.test(html), 'panel: 不含明清专名');
  assert(!/巡按|总督|巡抚|郡王|藩王/.test(html), 'panel: 不含明清地方/宗藩专名');
}

// SubTest 12: 跨朝代铁律审计
function testCrossDynastyIron(ctx) {
  // 扫描实际代码（剥注释）·确保无明清专名
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-industry.js'), 'utf8');
  var lines = src.split(/\r?\n/);
  var codeLines = lines.filter(function (l) {
    var t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  });
  var code = codeLines.join('\n');
  // 检查明清专名
  var forbidden = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  var hits = [];
  forbidden.forEach(function (term) {
    if (code.indexOf(term) >= 0) hits.push(term);
  });
  assert(hits.length === 0, 'cross-dynasty: 代码体无明清专名·命中 ' + hits.join(', '));

  // 古代通用称谓保留
  assert(code.indexOf('庄园') >= 0, 'cross-dynasty: 庄园（古代通用称谓）保留');
  assert(code.indexOf('农场') >= 0, 'cross-dynasty: 农场保留');
  assert(code.indexOf('牧场') >= 0, 'cross-dynasty: 牧场保留');
  assert(code.indexOf('矿场') >= 0, 'cross-dynasty: 矿场保留');
  assert(code.indexOf('林场') >= 0, 'cross-dynasty: 林场保留');
  assert(code.indexOf('渔场') >= 0, 'cross-dynasty: 渔场保留');
  assert(code.indexOf('工坊') >= 0, 'cross-dynasty: 工坊保留');
  assert(code.indexOf('商号') >= 0, 'cross-dynasty: 商号保留');
  // 风险类目（火灾/水灾/盗匪/民夫逃亡/官府强征/敌军劫掠）跨朝代通用
  assert(code.indexOf('火灾') >= 0, 'cross-dynasty: 火灾（古代通用）保留');
  assert(code.indexOf('盗匪') >= 0, 'cross-dynasty: 盗匪保留');
  // 豪强是古代通用称谓（汉已有之）
  assert(code.indexOf('豪强') >= 0, 'cross-dynasty: 豪强（古代通用）保留');
}

// SubTest 13: 双路径挂载
function testDualMount(ctx) {
  var mod = require(path.join(ROOT, 'tm-player-industry.js'));
  assert(mod && typeof mod.init === 'function', 'dual-mount: module.exports.init 是函数');
  assert(mod && typeof mod.acquireLand === 'function', 'dual-mount: module.exports.acquireLand 是函数');
  assert(mod && typeof mod.upgrade === 'function', 'dual-mount: module.exports.upgrade 是函数');
  assert(mod && typeof mod.renderPanel === 'function', 'dual-mount: module.exports.renderPanel 是函数');
  assert(mod.STATUS && Object.keys(mod.STATUS).length === 6, 'dual-mount: STATUS 6 态');
  assert(mod.INDUSTRY_TYPES && Object.keys(mod.INDUSTRY_TYPES).length === 8, 'dual-mount: INDUSTRY_TYPES 8 种');
  assert(mod.SIZE_TIERS && Object.keys(mod.SIZE_TIERS).length === 3, 'dual-mount: SIZE_TIERS 3 档');
  assert(mod.UPGRADE_KINDS && Object.keys(mod.UPGRADE_KINDS).length === 3, 'dual-mount: UPGRADE_KINDS 3 类');
  assert(mod.RISK_KINDS && Object.keys(mod.RISK_KINDS).length === 6, 'dual-mount: RISK_KINDS 6 类');
  assert(mod.HAOQIANG_THRESHOLDS, 'dual-mount: HAOQIANG_THRESHOLDS');
}

// SubTest 14: 月度 tick = operateMonthly 等价
function testTick(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;
  resetPlayerCash(ctx, 100000);
  var r = ns.acquireLand('zhuangyuan', locPlain('南阳'), { size: 'small' });
  ns.recruitWorkers(r.industry.id, 30, {});
  ns.completeConstruction(r.industry.id, { force: true });

  var r1 = ns.tick({});
  assert(r1.ok === true, 'tick: ok');
  assert(Array.isArray(r1.operated), 'tick: operated 是数组');
  assert(typeof r1.totalCash === 'number', 'tick: totalCash 是 number');
  assert(typeof r1.totalGoods === 'number', 'tick: totalGoods 是 number');
}

// SubTest 15: listXxx 接口
function testListInterfaces(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerIndustry;

  var types = ns.listIndustryTypes();
  assert(Array.isArray(types) && types.length === 8, 'list: INDUSTRY_TYPES 8 项');
  var t0 = types[0];
  assert(t0.id && t0.label && typeof t0.landCost === 'number', 'list: 类型条目字段齐');
  assert(Array.isArray(t0.terrain), 'list: 类型 terrain 数组');

  var sizes = ns.listSizeTiers();
  assert(Array.isArray(sizes) && sizes.length === 3, 'list: SIZE_TIERS 3 项');
  sizes.forEach(function (s) {
    assert(s.id && s.label && typeof s.scaleMul === 'number', 'list: 规模条目字段齐');
  });

  var ups = ns.listUpgradeKinds();
  assert(Array.isArray(ups) && ups.length === 3, 'list: UPGRADE_KINDS 3 项');
  ups.forEach(function (u) {
    assert(u.id && u.label && typeof u.costMul === 'number', 'list: 升级条目字段齐');
  });

  var risks = ns.listRiskKinds();
  assert(Array.isArray(risks) && risks.length === 6, 'list: RISK_KINDS 6 项');
  risks.forEach(function (r) {
    assert(r.id && r.label && typeof r.severityBase === 'number', 'list: 风险条目字段齐');
    assert(typeof r.fixable === 'boolean', 'list: 风险 fixable boolean');
  });
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testConstants(ctx);
  testSiteSelection(ctx);
  testConstruction(ctx);
  testOperation(ctx);
  testUpgrade(ctx);
  testRisks(ctx);
  testHaoqiang(ctx);
  testBuildingWorksBridge(ctx);
  testPanel(ctx);
  testCrossDynastyIron(ctx);
  testDualMount(ctx);
  testTick(ctx);
  testListInterfaces(ctx);
  console.log('[smoke-player-industry] PASS · 15 sub-tests · namespace/guards/constants(8-types/3-sizes/3-upgrades/6-risks)/site-selection(8-types×terrain+requireNear+permit)/construction(recruit+advance+complete)/operation(monthly-output+modifiers+management+security)/upgrade(expand+improve+specialize)/risks(6-kinds+DAMAGED+haoqiang-trigger)/haoqiang(warning+serious+confiscate+auto-confiscate)/building-works-bridge(soft-dep+fallback)/panel/cross-dynasty/dual-mount/tick/list-interfaces');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-industry] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
