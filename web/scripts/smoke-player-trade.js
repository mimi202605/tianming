#!/usr/bin/env node
// scripts/smoke-player-trade.js — Phase 4.5 · Task 17 玩家跑商系统 smoke
// 验证：
//   - TM.PlayerTrade 命名空间暴露（双路径：globalThis + module.exports）
//   - 商队数据结构（id, owner, route{from,to}, goods[], guards, carts, permit, status）
//   - "组建商队"：消耗银钱 + 配置护卫/车马/通关凭引（许可难度关联官场关系）
//   - "派遣贸易"：根据区域价格矩阵计算预期利润
//   - 4 类路线风险事件（山贼/官府/气候/势力）
//   - 商队到达后结算实际盈亏·写入玩家银钱账本
//   - 大宗贸易（超阈值）调用 tm-region-magnate.js 影响区域经济
//   - 跨朝代通用：剧本数据 hook 路线·引擎只提供通用框架
//   - 跑商积累商誉·开启新商业网络与 NPC 关系
//   - 御案"商队"面板
//   - 守卫：非穿越模式 / 路线未知 / 起终点缺失 / 银钱不足 / 凭引关系不够 各拒
//   - LLM 降级：无 LLM 时返回确定性 mock 文本

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-trade.js（IIFE 模式，sandbox.window = ctx）──
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
    fs.readFileSync(path.join(ROOT, 'tm-player-trade.js'), 'utf8'),
    ctx, { filename: 'tm-player-trade.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + PlayerEconomy/PlayerInteraction 软依赖 ──
function setupCtx(ctx, opts) {
  opts = opts || {};

  // 玩家：李商贾（穿越模式·merchant）
  var playerCh = { name: '李商贾', alive: true, officialTitle: '富商', role: '商', personality: '精明', rankLevel: 9 };
  // NPC1：王商（市井商贾·用于商誉跨阈值时关联）
  var npcWang = { name: '王商', alive: true, officialTitle: '行商', role: '商', personality: '圆滑', location: '杭州' };
  // NPC2：张绅（地方士绅）
  var npcZhang = { name: '张绅', alive: true, officialTitle: '乡绅', role: '绅', personality: '持重', location: '苏州' };
  // NPC3：已故（守卫测试用）
  var npcDead = { name: '故商', alive: false, officialTitle: '已故', role: '商' };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh, npcWang, npcZhang, npcDead],
    // 大宗贸易直写降级路径目标
    adminHierarchy: {
      '杭州': { id: '杭州', name: '杭州', magnatePower: 20, economyBase: { commerceVolume: 50000, maritimeTradeVolume: 0 } },
      '苏州': { id: '苏州', name: '苏州', magnatePower: 15, economyBase: { commerceVolume: 30000 } }
    }
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'merchant',
      characterName: '李商贾',
      characterTitle: '富商',
      sovereignName: '今上',
      officialRelation: 50,  // 中等官场关系·够申领 regional 凭引（需 40）
      money: 10000
    },
    // 剧本 hook：朝代专属路线（丝路/茶马/漕运/海贸 由剧本提供·引擎只提供通用框架）
    tradeRoutes: null,  // 测试跨朝代时再注入
    // 剧本 hook：区域价格矩阵
    tradePrices: {
      '洛阳': { silk: 80, tea: 50, grain: 10, iron: 100 },
      '杭州': { silk: 120, tea: 70, grain: 12, iron: 110 },
      '苏州': { silk: 110, tea: 75, grain: 11, iron: 105 },
      '凉州': { silk: 90, tea: 60, grain: 15, iron: 90 }
    }
  };

  // mock TM.Transmigration
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // mock TM.PlayerEconomy（用真实 API 名：getBalance / spend / addIncome）
  ctx._playerEconomyState = { cash: 10000 };
  ctx.TM.PlayerEconomy = {
    getBalance: function () { return ctx._playerEconomyState.cash; },
    spend: function (cost, label) {
      if (ctx._playerEconomyState.cash < cost) {
        return { ok: false, reason: '银钱不足', cash: ctx._playerEconomyState.cash };
      }
      ctx._playerEconomyState.cash -= cost;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    },
    addIncome: function (source, amount, opts) {
      ctx._playerEconomyState.cash += amount;
      return { ok: true, cash: ctx._playerEconomyState.cash };
    }
  };

  // mock TM.PlayerInteraction（用于商誉跨阈值时关联 NPC·smoke 中验证不阻断）
  ctx._interactionCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactionCalls.push({ npc: npcName, kind: kind, payload: payload });
      // 模拟：返回 ok=true·与王商/张绅 befriend 成功
      var ch = ctx.GM.chars.find(function (c) { return c && c.name === npcName; });
      if (!ch || ch.alive === false) return { ok: false, reason: 'NPC 不可互动' };
      return { ok: true, kind: kind, npc: npcName, scene: '与' + npcName + '结交·通商往来' };
    }
  };

  // mock addEB / toast / tmIcon / escHtml / uid（与 tm-launch.js 同款·smoke 中可选）
  ctx._ebCalls = [];
  ctx.addEB = function (cat, txt) { ctx._ebCalls.push({ cat: cat, txt: txt }); };
  ctx.toast = function (m) { /* noop */ };
  ctx.tmIcon = function (name, size) { return ''; };
  ctx.escHtml = function (s) { return String(s == null ? '' : s); };
  ctx.uid = function () { return 'uid_' + Math.random().toString(36).slice(2, 8); };

  return ctx;
}

// ── Sub-tests ───────────────────────────────────────────────

function testNamespace(ctx) {
  assert(ctx.TM && ctx.TM.PlayerTrade, 'namespace: TM.PlayerTrade 暴露');
  var ns = ctx.TM.PlayerTrade;
  assert(typeof ns.createCaravan === 'function', 'namespace: createCaravan 是函数');
  assert(typeof ns.dispatchTrade === 'function', 'namespace: dispatchTrade 是函数');
  assert(typeof ns.settleArrival === 'function', 'namespace: settleArrival 是函数');
  assert(typeof ns.estimateProfit === 'function', 'namespace: estimateProfit 是函数');
  assert(typeof ns.triggerRiskEvent === 'function', 'namespace: triggerRiskEvent 是函数');
  assert(typeof ns.listRoutes === 'function', 'namespace: listRoutes 是函数');
  assert(typeof ns.listCaravans === 'function', 'namespace: listCaravans 是函数');
  assert(typeof ns.getReputation === 'function', 'namespace: getReputation 是函数');
  assert(typeof ns.listNetworks === 'function', 'namespace: listNetworks 是函数');
  assert(typeof ns.renderPanel === 'function', 'namespace: renderPanel 是函数');
  // 常量
  assert(ns.CARAVAN_STATUS && Object.keys(ns.CARAVAN_STATUS).length === 6, 'namespace: CARAVAN_STATUS 共 6 种');
  assert(ns.PERMIT_LEVELS && Object.keys(ns.PERMIT_LEVELS).length === 5, 'namespace: PERMIT_LEVELS 共 5 级');
  assert(ns.RISK_TYPES && Object.keys(ns.RISK_TYPES).length === 4, 'namespace: RISK_TYPES 共 4 类');
  assert(Array.isArray(ns.DEFAULT_ROUTES) && ns.DEFAULT_ROUTES.length === 3, 'namespace: DEFAULT_ROUTES 共 3 条');
  var expectedRisks = ['bandit', 'official', 'weather', 'faction'];
  expectedRisks.forEach(function (k) {
    assert(ns.RISK_TYPES[k], 'namespace: RISK_TYPES.' + k + ' 存在');
  });
  var expectedPermits = ['none', 'local', 'regional', 'national', 'frontier'];
  expectedPermits.forEach(function (k) {
    assert(ns.PERMIT_LEVELS[k], 'namespace: PERMIT_LEVELS.' + k + ' 存在');
  });
}

function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.createCaravan({ from: '洛阳', to: '杭州', goods: [{ name: 'silk', qty: 5 }] });
  assert(r1.ok === false, 'guard: 非穿越模式拒绝');
  assert(/非穿越模式/.test(r1.reason), 'guard: 非穿越模式 reason');
  ctx.P.playerInfo.transmigrationMode = true;

  // 起点终点缺失
  var r2 = ns.createCaravan({ from: '', to: '杭州', goods: [{ name: 'silk', qty: 5 }] });
  assert(r2.ok === false, 'guard: 起点缺失拒绝');
  var r3 = ns.createCaravan({ from: '洛阳', to: '洛阳', goods: [{ name: 'silk', qty: 5 }] });
  assert(r3.ok === false, 'guard: 起终点相同拒绝');

  // 货物清单缺失
  var r4 = ns.createCaravan({ from: '洛阳', to: '杭州', goods: [] });
  assert(r4.ok === false, 'guard: 空货物清单拒绝');
  var r5 = ns.createCaravan({ from: '洛阳', to: '杭州', goods: [{ name: 'silk', qty: 0 }] });
  assert(r5.ok === false, 'guard: qty=0 货物拒绝');

  // 运力超限
  var r6 = ns.createCaravan({ from: '洛阳', to: '杭州', goods: [{ name: 'silk', qty: 30 }], carts: 1 });
  assert(r6.ok === false, 'guard: 运力超限拒绝');
  assert(/运力/.test(r6.reason), 'guard: 运力 reason');

  // 凭引关系不足（申领 frontier 需 75·玩家 50）
  var r7 = ns.createCaravan({
    from: '洛阳', to: '凉州',
    goods: [{ name: 'silk', qty: 5 }],
    permit: 'frontier'
  });
  assert(r7.ok === false, 'guard: 凭引关系不足拒绝');
  assert(/官场关系不足/.test(r7.reason), 'guard: 凭引关系不足 reason');
  assert(r7.code === 'permit-denied', 'guard: permit-denied code');

  // 银钱不足（申领 national·凭引费 800 + 采购费 + 护卫车马·故意掏空）
  ctx._playerEconomyState.cash = 10;
  var r8 = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }],
    permit: 'local', guards: 5, carts: 2
  });
  assert(r8.ok === false, 'guard: 银钱不足拒绝');
  assert(/银钱不足/.test(r8.reason), 'guard: 银钱不足 reason');
  assert(r8.code === 'insufficient-funds', 'guard: insufficient-funds code');
  ctx._playerEconomyState.cash = 10000;
}

function testCreateCaravan(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;
  var cashBefore = ctx._playerEconomyState.cash;

  var r = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }, { name: 'tea', qty: 5 }],
    guards: 5, carts: 2,
    permit: 'regional'
  });
  assert(r.ok === true, 'create: ok');
  assert(r.caravan && r.caravan.id, 'create: 商队 id 生成');
  assert(r.caravan.owner === '李商贾', 'create: owner = 李商贾');
  assert(r.caravan.route.from === '洛阳' && r.caravan.route.to === '杭州', 'create: route');
  assert(Array.isArray(r.caravan.goods) && r.caravan.goods.length === 2, 'create: goods 2 种');
  assert(r.caravan.goods[0].name === 'silk' && r.caravan.goods[0].qty === 10, 'create: goods[0]');
  assert(r.caravan.guards === 5, 'create: guards=5');
  assert(r.caravan.carts === 2, 'create: carts=2');
  assert(r.caravan.permit === 'regional', 'create: permit=regional');
  assert(r.caravan.status === 'forming', 'create: status=forming');
  // 采购价应取自 P.tradePrices（hook·silk 在洛阳 = 80）
  assert(r.caravan.goods[0].buyPrice === 80, 'create: silk 洛阳采购价 80·实际 ' + r.caravan.goods[0].buyPrice);
  assert(r.caravan.goods[1].buyPrice === 50, 'create: tea 洛阳采购价 50·实际 ' + r.caravan.goods[1].buyPrice);

  // 银钱扣除：凭引 300 + 护卫 100 + 车 100 + 采购 (80×10 + 50×5 = 1050) = 1550
  assert(r.cost.total === 1550, 'create: total cost = 1550·实际 ' + r.cost.total);
  assert(ctx._playerEconomyState.cash === cashBefore - 1550, 'create: 银钱扣 1550·实际余 ' + ctx._playerEconomyState.cash);

  // 商队写入账本
  var list = ns.listCaravans();
  assert(list.length === 1, 'create: listCaravans 含 1 个');
  assert(list[0].id === r.caravan.id, 'create: list[0].id');

  // 守卫：未指定货物时降级为默认采购价（mock 价·silk=80→ 50-200 哈希）
  // 不指定 buyPrice·走 _getRegionPrice 取 P.tradePrices
}

function testDispatchTrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  var c = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }],
    guards: 5, carts: 2, permit: 'regional'
  });
  assert(c.ok === true, 'dispatch: 组建 ok');

  // 估算预期利润（派遣前 dry-run）
  var est = ns.estimateProfit(c.caravan.id);
  assert(est.ok === true, 'dispatch: estimateProfit ok');
  assert(est.breakdown && est.breakdown.length === 1, 'dispatch: breakdown 1 项');
  // 杭州丝绸 120 × 10 = 1200·洛阳采购 80 × 10 = 800·毛利 400
  assert(est.grossRevenue === 1200, 'dispatch: grossRevenue=1200·实际 ' + est.grossRevenue);
  assert(est.purchaseCost === 800, 'dispatch: purchaseCost=800·实际 ' + est.purchaseCost);

  // 派遣
  var d = ns.dispatchTrade(c.caravan.id, { note: '试派遣' });
  assert(d.ok === true, 'dispatch: 派遣 ok');
  assert(d.status === 'dispatched', 'dispatch: status=dispatched');
  assert(d.turns >= 1, 'dispatch: turns ≥ 1·实际 ' + d.turns);
  assert(typeof d.eta === 'number', 'dispatch: eta 是数字');
  assert(typeof d.expectedProfit === 'number', 'dispatch: expectedProfit 是数字');
  assert(typeof d.scene === 'string' && d.scene.length > 0, 'dispatch: scene 非空');

  // 商队状态更新
  var c2 = ns.getCaravan(c.caravan.id);
  assert(c2.status === 'dispatched', 'dispatch: getCaravan.status=dispatched');
  assert(c2.expectedProfit === d.expectedProfit, 'dispatch: expectedProfit 回写');
  assert(c2.dispatchedAt === ctx.GM.turn, 'dispatch: dispatchedAt');
  assert(c2.arrivalTurns === d.turns, 'dispatch: arrivalTurns');

  // 守卫：状态非 forming 不可重复派遣
  var d2 = ns.dispatchTrade(c.caravan.id, {});
  assert(d2.ok === false, 'dispatch: 重复派遣拒绝');
  assert(/状态不可派遣/.test(d2.reason), 'dispatch: 重复派遣 reason');

  // 守卫：未知商队 id
  var d3 = ns.dispatchTrade('bogus_id', {});
  assert(d3.ok === false, 'dispatch: 未知 id 拒绝');
}

function testRiskEvents(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  var c = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }],
    guards: 5, carts: 2, permit: 'regional'
  });
  ns.dispatchTrade(c.caravan.id, {});

  // 强制触发 4 类风险
  var types = ['bandit', 'official', 'weather', 'faction'];
  types.forEach(function (t) {
    var evt = ns.triggerRiskEvent(c.caravan.id, { forceType: t });
    assert(evt !== null, 'risk-' + t + ': 事件非 null');
    assert(evt.type === t, 'risk-' + t + ': type');
    assert(typeof evt.title === 'string' && evt.title.length > 0, 'risk-' + t + ': title 非空');
    assert(typeof evt.text === 'string' && evt.text.length > 0, 'risk-' + t + ': text 非空');
    assert(evt.effect && typeof evt.effect === 'object', 'risk-' + t + ': effect 存在');
    assert(typeof evt.effect.note === 'string', 'risk-' + t + ': effect.note');
  });

  // bandit 效应·护卫抵扣应 ≥ 0.2（5 护卫）
  var banditEvt = ns.triggerRiskEvent(c.caravan.id, { forceType: 'bandit' });
  assert(banditEvt.effect.guardMitigate >= 0.2, 'risk-bandit: 护卫抵扣 ≥ 0.2·实际 ' + banditEvt.effect.guardMitigate);
  assert(banditEvt.effect.cargoLoss >= 0, 'risk-bandit: cargoLoss ≥ 0');

  // official 效应·凭引抵扣（regional=0.4）
  var offEvt = ns.triggerRiskEvent(c.caravan.id, { forceType: 'official' });
  assert(offEvt.effect.permitMitigate === 0.4, 'risk-official: regional 凭引抵扣 0.4·实际 ' + offEvt.effect.permitMitigate);
  assert(offEvt.effect.cashLoss >= 0, 'risk-official: cashLoss ≥ 0');

  // weather 效应·货物损耗
  var wEvt = ns.triggerRiskEvent(c.caravan.id, { forceType: 'weather' });
  assert(wEvt.effect.spoilQty >= 1, 'risk-weather: spoilQty ≥ 1·实际 ' + wEvt.effect.spoilQty);
  assert(wEvt.effect.delayTurns >= 1, 'risk-weather: delayTurns ≥ 1');

  // faction 效应·过路费
  var fEvt = ns.triggerRiskEvent(c.caravan.id, { forceType: 'faction' });
  assert(fEvt.effect.cashLoss >= 0, 'risk-faction: cashLoss ≥ 0');

  // 商队事件清单累计 ≥ 5
  var c2 = ns.getCaravan(c.caravan.id);
  assert(c2.events.length >= 5, 'risk: 商队事件累计 ≥ 5·实际 ' + c2.events.length);

  // forceRoll 可重现：相同 roll + riskProfile 应得同 type
  var e1 = ns.triggerRiskEvent(c.caravan.id, { forceRoll: 0.0 });
  var e2 = ns.triggerRiskEvent(c.caravan.id, { forceRoll: 0.0 });
  assert(e1.type === e2.type, 'risk: forceRoll=0 可重现·两次 type 一致 (' + e1.type + ')');
}

function testSettleArrival(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  var c = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }],
    guards: 5, carts: 2, permit: 'regional'
  });
  ns.dispatchTrade(c.caravan.id, {});

  // 守卫：未到达不可结算
  var earlySettle = ns.settleArrival(c.caravan.id);
  assert(earlySettle.ok === false, 'settle: 未到达不可结算');
  assert(/未到达/.test(earlySettle.reason), 'settle: 未到达 reason');

  // 推进到达（advanceCaravan 直到到达）
  var arrived = false;
  for (var i = 0; i < 10 && !arrived; i++) {
    var adv = ns.advanceCaravan(c.caravan.id);
    if (adv.ok && adv.arrived) {
      arrived = true;
      assert(adv.settlement && adv.settlement.ok === true, 'settle: advanceCaravan 自动结算 ok');
    }
  }
  assert(arrived, 'settle: 推进 ' + i + ' 回合后到达');

  // 商队状态：已结算
  var c2 = ns.getCaravan(c.caravan.id);
  assert(c2.status === 'settled', 'settle: status=settled');
  assert(c2.actualProfit != null, 'settle: actualProfit 已写');
  assert(c2.settledAt === ctx.GM.turn, 'settle: settledAt');

  // 银钱账本应有进账（毛收入 - 现金损失）
  assert(c2.settlement.grossRevenue > 0, 'settle: grossRevenue > 0');
  assert(c2.settlement.netCashGain > 0, 'settle: netCashGain > 0');
  assert(ctx._playerEconomyState.cash > 10000 - c.cost.total, 'settle: 银钱回账·实际余 ' + ctx._playerEconomyState.cash);

  // 统计字段
  var s = ns._getState();
  assert(s.stats.totalTrades === 1, 'settle: stats.totalTrades=1');
  // 商誉 +5（普通跑商）
  assert(s.reputation === 5, 'settle: reputation=5·实际 ' + s.reputation);
}

function testLargeTrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  // 构造大宗贸易：丝绸 100 单位·杭州 120·毛入 12000 > 阈值 5000
  ctx._playerEconomyState.cash = 100000; // 充足银钱
  ctx.P.playerInfo.officialRelation = 65;  // national 凭引需 60·默认 50 不够
  var c = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 100 }],
    guards: 10, carts: 10, permit: 'national'
  });
  assert(c.ok === true, 'large: 组建 ok·总成本 ' + (c.cost && c.cost.total));

  ns.dispatchTrade(c.caravan.id, {});
  // 推进到达
  for (var i = 0; i < 10; i++) {
    var adv = ns.advanceCaravan(c.caravan.id);
    if (adv.ok && adv.arrived) break;
  }

  var c2 = ns.getCaravan(c.caravan.id);
  assert(c2.status === 'settled', 'large: status=settled');
  assert(c2.settlement.grossRevenue >= 5000, 'large: grossRevenue ≥ 5000·实际 ' + c2.settlement.grossRevenue);

  // 大宗贸易应调用 tm-region-magnate.js（降级路径·直写 GM.adminHierarchy.杭州.magnatePower）
  // 杭州初始 magnatePower=20·应被推进（增量 1-8）
  var hangzhou = ctx.GM.adminHierarchy['杭州'];
  assert(hangzhou.magnatePower > 20, 'large: 杭州 magnatePower > 20·实际 ' + hangzhou.magnatePower);

  // 大宗贸易商誉加成 +15（5 基础 + 10 大宗）
  var s = ns._getState();
  assert(s.reputation === 15, 'large: reputation=15·实际 ' + s.reputation);
}

function testReputationAndNetworks(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  // 初始商誉为 0
  assert(ns.getReputation() === 0, 'rep: 初始 reputation=0');
  assert(ns.listNetworks().length === 0, 'rep: 初始 networks=0');

  // 跑 6 次普通商队·累计商誉 30·开启"州县商网"
  ctx._playerEconomyState.cash = 100000;
  for (var k = 0; k < 6; k++) {
    var c = ns.createCaravan({
      from: '洛阳', to: '杭州',
      goods: [{ name: 'silk', qty: 5 }],
      guards: 3, carts: 1, permit: 'local'
    });
    if (!c.ok) fail('rep: 第 ' + k + ' 次组建失败: ' + c.reason);
    ns.dispatchTrade(c.caravan.id, {});
    for (var i = 0; i < 10; i++) {
      var adv = ns.advanceCaravan(c.caravan.id);
      if (adv.ok && adv.arrived) break;
    }
  }

  assert(ns.getReputation() === 30, 'rep: 6 次后 reputation=30·实际 ' + ns.getReputation());
  var networks = ns.listNetworks();
  assert(networks.length >= 1, 'rep: 开启 ≥1 网络·实际 ' + networks.length);
  assert(networks.some(function (n) { return n.id === '州县商网'; }), 'rep: 含「州县商网」');

  // 继续跑到 80·开启"跨路商网"
  for (var k2 = 0; k2 < 11; k2++) {
    var c2 = ns.createCaravan({
      from: '洛阳', to: '苏州',
      goods: [{ name: 'tea', qty: 5 }],
      guards: 3, carts: 1, permit: 'local'
    });
    if (!c2.ok) continue;
    ns.dispatchTrade(c2.caravan.id, {});
    for (var i2 = 0; i2 < 10; i2++) {
      var adv2 = ns.advanceCaravan(c2.caravan.id);
      if (adv2.ok && adv2.arrived) break;
    }
  }
  assert(ns.getReputation() >= 80, 'rep: 累计 ≥ 80·实际 ' + ns.getReputation());
  var networks2 = ns.listNetworks();
  assert(networks2.some(function (n) { return n.id === '跨路商网'; }), 'rep: 含「跨路商网」');
}

function testCrossDynasty(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  // 阶段 1：默认路线（无剧本 hook）·应得 DEFAULT_ROUTES（朝代中立通用框架）
  ctx.P.tradeRoutes = null;
  var routes1 = ns.listRoutes();
  assert(routes1.length === 3, 'cross: 默认 3 条通用路线·实际 ' + routes1.length);
  var ids1 = routes1.map(function (r) { return r.id; });
  assert(ids1.indexOf('land_generic') >= 0, 'cross: 默认含 land_generic');
  assert(ids1.indexOf('water_generic') >= 0, 'cross: 默认含 water_generic');
  assert(ids1.indexOf('mountain_generic') >= 0, 'cross: 默认含 mountain_generic');
  // 引擎绝不预置朝代特定路线名
  routes1.forEach(function (r) {
    assert(!/丝路|茶马|漕运|海贸/.test(r.label), 'cross: 默认路线无朝代专名·' + r.label);
  });

  // 阶段 2：剧本 hook 注入朝代专属路线（丝路/茶马/漕运/海贸）
  ctx.P.tradeRoutes = [
    { id: 'silk_road', label: '丝路', terrain: 'land', baseDistance: 20, baseTurns: 5,
      riskProfile: { bandit: 0.45, official: 0.15, weather: 0.25, faction: 0.20 },
      goodsBias: { silk: 1.5, tea: 1.2 } },
    { id: 'tea_horse', label: '茶马', terrain: 'mountain', baseDistance: 12, baseTurns: 3,
      riskProfile: { bandit: 0.35, official: 0.10, weather: 0.30, faction: 0.15 },
      goodsBias: { tea: 1.6, iron: 1.3 } },
    { id: 'canal_transport', label: '漕运', terrain: 'water', baseDistance: 8, baseTurns: 2,
      riskProfile: { bandit: 0.10, official: 0.20, weather: 0.25, faction: 0.05 },
      goodsBias: { grain: 1.4, salt: 1.2 } },
    { id: 'sea_trade', label: '海贸', terrain: 'water', baseDistance: 15, baseTurns: 4,
      riskProfile: { bandit: 0.20, official: 0.25, weather: 0.45, faction: 0.10 },
      goodsBias: { silk: 1.4, salt: 1.3, fish: 1.5 } }
  ];
  var routes2 = ns.listRoutes();
  assert(routes2.length === 4, 'cross: 剧本 hook 后 4 条路线·实际 ' + routes2.length);
  var labels = routes2.map(function (r) { return r.label; });
  assert(labels.indexOf('丝路') >= 0, 'cross: 含丝路（剧本 hook）');
  assert(labels.indexOf('茶马') >= 0, 'cross: 含茶马');
  assert(labels.indexOf('漕运') >= 0, 'cross: 含漕运');
  assert(labels.indexOf('海贸') >= 0, 'cross: 含海贸');

  // 用剧本 hook 路线组建商队
  ctx.P.tradePrices['敦煌'] = { silk: 70, tea: 60 };
  ctx.P.tradePrices['长安'] = { silk: 130, tea: 90 };
  var c = ns.createCaravan({
    from: '敦煌', to: '长安',
    routeId: 'silk_road',
    goods: [{ name: 'silk', qty: 10 }, { name: 'tea', qty: 5 }],
    guards: 10, carts: 2, permit: 'frontier'
  });
  // frontier 凭引需关系 75·玩家默认 50·应拒
  assert(c.ok === false && c.code === 'permit-denied', 'cross: 丝路 frontier 凭引关系不够拒');

  // 拉高官场关系·重试
  ctx.P.playerInfo.officialRelation = 80;
  var c2 = ns.createCaravan({
    from: '敦煌', to: '长安',
    routeId: 'silk_road',
    goods: [{ name: 'silk', qty: 10 }],
    guards: 10, carts: 2, permit: 'frontier'
  });
  assert(c2.ok === true, 'cross: 丝路组建 ok');
  assert(c2.caravan.route.routeId === 'silk_road', 'cross: routeId=silk_road');

  // 估算预期利润·silk bias 1.5·长安售价 130 × 1.5 = 195·毛入 1950
  var est = ns.estimateProfit(c2.caravan.id);
  assert(est.ok === true, 'cross: estimateProfit ok');
  assert(est.breakdown[0].sellPrice === 195, 'cross: 丝路 silk 售价 195（130×1.5 bias）·实际 ' + est.breakdown[0].sellPrice);
  assert(est.route.id === 'silk_road', 'cross: route.id=silk_road');
}

function testLLMDegrade(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  // 1) 无 LLM·降级 mock
  ctx.callAI = undefined;
  ctx.callLLM = undefined;
  var c1 = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 5 }],
    guards: 3, carts: 1, permit: 'local'
  });
  assert(c1.ok === true, 'llm: 组建 ok');
  var d1 = ns.dispatchTrade(c1.caravan.id, {});
  assert(d1.ok === true, 'llm: 派遣 ok');
  assert(typeof d1.scene === 'string' && d1.scene.length > 0, 'llm: scene 降级 mock 非空');
  assert(/李商贾|商队/.test(d1.scene), 'llm: scene 含玩家/商队');

  // 2) 挂上 global.callAI·走真实路径
  ctx.callAI = function (prompt) {
    return '【LLM 生成】' + prompt.split('\n').slice(1, 3).join('·');
  };
  var c2 = ns.createCaravan({
    from: '洛阳', to: '苏州',
    goods: [{ name: 'tea', qty: 5 }],
    guards: 3, carts: 1, permit: 'local'
  });
  var d2 = ns.dispatchTrade(c2.caravan.id, {});
  assert(d2.ok === true, 'llm: 派遣 ok');
  assert(/^【LLM 生成】/.test(d2.scene), 'llm: scene 走 LLM 路径');

  // 3) LLM 返回空字符串·降级
  ctx.callAI = function () { return ''; };
  var c3 = ns.createCaravan({
    from: '洛阳', to: '凉州',
    goods: [{ name: 'iron', qty: 5 }],
    guards: 3, carts: 1, permit: 'local'
  });
  var d3 = ns.dispatchTrade(c3.caravan.id, {});
  assert(d3.ok === true, 'llm: 派遣 ok');
  assert(!/^【LLM 生成】/.test(d3.scene), 'llm: LLM 空时降级');

  // 4) 风险事件文本·LLM 降级
  ctx.callAI = undefined;
  var evt = ns.triggerRiskEvent(c1.caravan.id, { forceType: 'bandit' });
  assert(evt !== null, 'llm: 风险事件非 null');
  assert(typeof evt.text === 'string' && evt.text.length > 0, 'llm: 风险事件 text 非空');
}

function testPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;

  // 空状态面板
  var html1 = ns.renderPanel();
  assert(typeof html1 === 'string' && html1.length > 0, 'panel: 空状态渲染 HTML');
  assert(/商队/.test(html1), 'panel: 含"商队"');
  assert(/概 览/.test(html1), 'panel: 含"概 览"');
  assert(/通\s*用\s*路\s*线/.test(html1), 'panel: 含"通用路线"');

  // 组建 + 派遣后面板
  var c = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }],
    guards: 5, carts: 2, permit: 'regional'
  });
  ns.dispatchTrade(c.caravan.id, {});
  var html2 = ns.renderPanel();
  assert(/洛阳.*杭州/.test(html2), 'panel: 含商队路线');
  assert(/派遣中/.test(html2), 'panel: 含派遣中状态');
  assert(/预期利润/.test(html2), 'panel: 含预期利润');

  // targetEl 写入模式
  var targetEl = { innerHTML: '' };
  var r = ns.renderPanel(targetEl);
  assert(r === null, 'panel: targetEl 写入返回 null');
  assert(typeof targetEl.innerHTML === 'string' && targetEl.innerHTML.length > 0, 'panel: targetEl.innerHTML 已写入');
}

function testDualMount(ctx) {
  // 双路径挂载·module.exports 也应能取到 PlayerTrade
  var mod = require(path.join(ROOT, 'tm-player-trade.js'));
  assert(mod && typeof mod.PlayerTrade === 'object', 'dual-mount: module.exports.PlayerTrade 是对象');
  assert(typeof mod.PlayerTrade.createCaravan === 'function', 'dual-mount: module.exports.PlayerTrade.createCaravan 是函数');
  assert(typeof mod.PlayerTrade.dispatchTrade === 'function', 'dual-mount: module.exports.PlayerTrade.dispatchTrade 是函数');
  assert(mod.PlayerTrade.CARAVAN_STATUS, 'dual-mount: module.exports.PlayerTrade.CARAVAN_STATUS 存在');
  assert(Object.keys(mod.PlayerTrade.PERMIT_LEVELS).length === 5, 'dual-mount: PERMIT_LEVELS 共 5 级');
}

function testCancelCaravan(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTrade;
  var cashBefore = ctx._playerEconomyState.cash;

  // 组建后取消（未派遣·不回收货物）
  var c = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 5 }],
    guards: 3, carts: 1, permit: 'local'
  });
  assert(c.ok === true, 'cancel: 组建 ok');
  var cancel1 = ns.cancelCaravan(c.caravan.id);
  assert(cancel1.ok === true, 'cancel: 取消 ok');
  assert(cancel1.prevStatus === 'forming', 'cancel: prevStatus=forming');
  assert(cancel1.recovery === 0, 'cancel: 未派遣·回收 0');

  // 派遣后取消·回收 50% 货物价值
  var c2 = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 10 }],
    guards: 3, carts: 2, permit: 'local'
  });
  ns.dispatchTrade(c2.caravan.id, {});
  var cancel2 = ns.cancelCaravan(c2.caravan.id);
  assert(cancel2.ok === true, 'cancel: 派遣后取消 ok');
  assert(cancel2.prevStatus === 'dispatched', 'cancel: prevStatus=dispatched');
  assert(cancel2.recovery > 0, 'cancel: 派遣后回收 > 0·实际 ' + cancel2.recovery);
  // 采购 80×10=800·回收 50% = 400
  assert(cancel2.recovery === 400, 'cancel: 回收 400（800×50%）·实际 ' + cancel2.recovery);

  // 已结算不可取消
  var c3 = ns.createCaravan({
    from: '洛阳', to: '杭州',
    goods: [{ name: 'silk', qty: 5 }],
    guards: 3, carts: 1, permit: 'local'
  });
  ns.dispatchTrade(c3.caravan.id, {});
  for (var i = 0; i < 10; i++) {
    var adv = ns.advanceCaravan(c3.caravan.id);
    if (adv.ok && adv.arrived) break;
  }
  var cancel3 = ns.cancelCaravan(c3.caravan.id);
  assert(cancel3.ok === false, 'cancel: 已结算不可取消');
  assert(/已结算/.test(cancel3.reason), 'cancel: 已结算 reason');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testCreateCaravan(ctx);
  testDispatchTrade(ctx);
  testRiskEvents(ctx);
  testSettleArrival(ctx);
  testLargeTrade(ctx);
  testReputationAndNetworks(ctx);
  testCrossDynasty(ctx);
  testLLMDegrade(ctx);
  testPanel(ctx);
  testCancelCaravan(ctx);
  testDualMount(ctx);
  console.log('[smoke-player-trade] PASS · 13 sub-tests · namespace/guards/create/dispatch/4-risks/settle/large-trade/reputation/cross-dynasty/llm/panel/cancel/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-trade] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
