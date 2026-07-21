#!/usr/bin/env node
// scripts/smoke-player-private-army.js — Phase 4.5 · Task 20 玩家私军系统 smoke
// 验证（覆盖 13 项 SubTask + 跨朝代 + 双路径挂载）：
//   1.  命名空间：TM.PlayerPrivateArmy 暴露（双路径：globalThis + module.exports）
//   2.  守卫：非穿越模式 / 未知类型 / 未知渠道 / 非法人数 各拒
//   3.  招募私军（4 类型 × 5 渠道·含名将招揽关联人物互动）
//   4.  私军维护（月度银钱/粮草消耗 + 规模超限财政压力）
//   5.  训练私军（训练度提升·衰减·时间推进·银钱消耗）
//   6.  装备私军（兵器/甲胄/战马·战马升 cav）
//   7.  护卫商队（降低风险·伤亡应用）
//   8.  自卫（坚守时长 + 伤亡）
//   9.  政变（战力评估 + 哗变风险 + 恶名累计）
//   10. 私斗（胜负判定 + 伤亡 + 恶名）
//   11. 僭越风险（warning/serious/critical 三档·朝廷调查/弹劾/问罪）
//   12. 独立账本 kind:'private'（沿用 tm-army-units.js / tm-military.js 战斗单位模型）
//   13. 御案"私军"面板（renderPanel·HTML 字符串·朝代中立）
//   14. 跨朝代铁律（grep 无明清专名出现在实际代码）
//   15. 双路径挂载（module.exports 等价 globalThis.TM.PlayerPrivateArmy）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-player-private-army.js（IIFE 模式，sandbox）──
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
    fs.readFileSync(path.join(ROOT, 'tm-player-private-army.js'), 'utf8'),
    ctx, { filename: 'tm-player-private-army.js' }
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

  // mock TM.PlayerEconomy.spend（与真接口同款·真扣 P.playerInfo.playerEconomy.cash）
  ctx.TM.PlayerEconomy = {
    spend: function (cost, reason) {
      var pe = ctx.P.playerInfo.playerEconomy;
      if (typeof pe.cash !== 'number') pe.cash = 0;
      if (pe.cash < cost) return { ok: false, reason: '银钱不足', cash: pe.cash };
      pe.cash -= cost;
      if (!Array.isArray(pe.ledger)) pe.ledger = [];
      pe.ledger.push({ kind: 'spend', delta: -cost, reason: reason });
      return { ok: true, cash: pe.cash };
    },
    addCash: function (n) {
      var pe = ctx.P.playerInfo.playerEconomy;
      pe.cash = (pe.cash || 0) + n;
      return { ok: true, cash: pe.cash };
    },
    getState: function () {
      return JSON.parse(JSON.stringify(ctx.P.playerInfo.playerEconomy));
    }
  };

  // mock TM.PlayerInteraction.interact（名将招揽路径）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npcName: npcName, kind: kind, payload: payload });
      // 默认成功·除非显式设置 ctx._interactFail
      if (ctx._interactFail) {
        return { ok: false, reason: 'mock 拒绝' };
      }
      return { ok: true, kind: kind, npc: npcName, scene: 'mock 招揽成功' };
    }
  };

  // mock TMArmyUnits.classifyUnitType（与真接口同款）
  ctx.TMArmyUnits = {
    classifyUnitType: function (typeStr, army) {
      var s = String(typeStr || '');
      if (/家丁/.test(s)) return { arm: 'step', sub: 'sword', flags: ['light'], src: 'radical' };
      if (/门客|剑士/.test(s)) return { arm: 'step', sub: 'sword', flags: ['elite'], src: 'radical' };
      if (/部曲/.test(s)) return { arm: 'step', sub: 'sword', flags: ['heavy'], src: 'radical' };
      if (/死士/.test(s)) return { arm: 'step', sub: 'sword', flags: ['elite'], src: 'radical' };
      return { arm: 'step', sub: 'sword', flags: [], src: 'fallback' };
    }
  };
}

function resetPlayerCash(ctx, n) {
  ctx.P.playerInfo.playerEconomy.cash = (n != null ? n : 100000);
}

// ── Sub-tests ───────────────────────────────────────────────

// SubTest 1: 命名空间暴露
function testNamespace(ctx) {
  setupCtx(ctx);
  assert(ctx.TM && ctx.TM.PlayerPrivateArmy, 'ns: TM.PlayerPrivateArmy 暴露');
  var ns = ctx.TM.PlayerPrivateArmy;
  assert(typeof ns.init === 'function', 'ns: init 是函数');
  assert(typeof ns.recruit === 'function', 'ns: recruit 是函数');
  assert(typeof ns.monthlyMaintenance === 'function', 'ns: monthlyMaintenance 是函数');
  assert(typeof ns.train === 'function', 'ns: train 是函数');
  assert(typeof ns.equip === 'function', 'ns: equip 是函数');
  assert(typeof ns.useForEscort === 'function', 'ns: useForEscort 是函数');
  assert(typeof ns.useForSelfDefense === 'function', 'ns: useForSelfDefense 是函数');
  assert(typeof ns.useForCoup === 'function', 'ns: useForCoup 是函数');
  assert(typeof ns.useForPrivateFeud === 'function', 'ns: useForPrivateFeud 是函数');
  assert(typeof ns.checkYueYue === 'function', 'ns: checkYueYue 是函数');
  assert(typeof ns.getYueYueLevel === 'function', 'ns: getYueYueLevel 是函数');
  assert(typeof ns.renderPanel === 'function', 'ns: renderPanel 是函数');
  assert(typeof ns.computeBattleScore === 'function', 'ns: computeBattleScore 是函数');
  assert(ns.KIND_TAG === 'private', 'ns: KIND_TAG = private');
  assert(ns.UNIT_TYPES && Object.keys(ns.UNIT_TYPES).length === 4, 'ns: UNIT_TYPES 共 4 种');
  assert(ns.RECRUIT_SOURCES && Object.keys(ns.RECRUIT_SOURCES).length === 5, 'ns: RECRUIT_SOURCES 共 5 种');
  assert(ns.EQUIPMENT_TYPES && Object.keys(ns.EQUIPMENT_TYPES).length === 3, 'ns: EQUIPMENT_TYPES 共 3 种');
  assert(ns.USAGE_SCENARIOS && Object.keys(ns.USAGE_SCENARIOS).length === 4, 'ns: USAGE_SCENARIOS 共 4 种');
  assert(ns.YUEYUE_THRESHOLDS, 'ns: YUEYUE_THRESHOLDS 存在');
  var typeLabels = Object.keys(ns.UNIT_TYPES).map(function (k) { return ns.UNIT_TYPES[k].label; });
  ['家丁', '门客剑士', '部曲', '死士'].forEach(function (lbl) {
    assert(typeLabels.indexOf(lbl) >= 0, 'ns: UNIT_TYPES 含 ' + lbl);
  });
}

// SubTest 2: 守卫
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.recruit('jiading', 'liumin', 10, {});
  assert(r1.ok === false && /非穿越模式/.test(r1.reason), 'guard: 非穿越模式 recruit 拒绝');
  var r1b = ns.monthlyMaintenance();
  assert(r1b.ok === false && /非穿越模式/.test(r1b.reason), 'guard: 非穿越模式 maintenance 拒绝');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知类型
  var r2 = ns.recruit('bogus', 'liumin', 10, {});
  assert(r2.ok === false && /未知私军类型/.test(r2.reason), 'guard: 未知类型拒绝');

  // 未知渠道
  var r3 = ns.recruit('jiading', 'bogus', 10, {});
  assert(r3.ok === false && /未知招募渠道/.test(r3.reason), 'guard: 未知渠道拒绝');

  // 非法人数
  var r4a = ns.recruit('jiading', 'liumin', 0, {});
  assert(r4a.ok === false && /人数非法/.test(r4a.reason), 'guard: 0 人拒绝');
  var r4b = ns.recruit('jiading', 'liumin', -5, {});
  assert(r4b.ok === false && /人数非法/.test(r4b.reason), 'guard: 负数人拒绝');
  var r4c = ns.recruit('jiading', 'liumin', 5.5, {});
  assert(r4c.ok === false && /整数/.test(r4c.reason), 'guard: 非整数人拒绝');

  // 名将招揽缺 npcName
  var r5 = ns.recruit('jiading', 'famous', 10, {});
  assert(r5.ok === false && /npcName/.test(r5.reason), 'guard: famous 缺 npcName 拒绝');

  // 银钱不足
  resetPlayerCash(ctx, 50);
  var r6 = ns.recruit('buqu', 'tuwu', 10, {});  // buqu baseCost 60·10 人 ≥ 600
  assert(r6.ok === false && /银钱不足/.test(r6.reason), 'guard: 银钱不足拒绝');
  resetPlayerCash(ctx, 100000);

  // 使用场景·未指定 unitIds
  var r7 = ns.useForEscort([], {});
  assert(r7.ok === false && /未指定/.test(r7.reason), 'guard: 空 unitIds 拒绝');

  // 使用场景·未找到 unit
  var r8 = ns.useForEscort(['bogus_id'], {});
  assert(r8.ok === false && /未找到/.test(r8.reason), 'guard: 未找到 unit 拒绝');

  // 训练·未找到 unit
  var r9 = ns.train('bogus_id', {});
  assert(r9.ok === false && /未找到/.test(r9.reason), 'guard: train 未找到 unit 拒绝');

  // 装备·未知装备
  var r10 = ns.equip('bogus_id', 'bogus_eq', {});
  assert(r10.ok === false && /未知装备类型/.test(r10.reason), 'guard: equip 未知装备拒绝');
}

// SubTest 3: 招募私军（4 类型 × 5 渠道）
function testRecruit(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  // 4 类型 × 4 普通渠道（共 16 次招募）
  var types = ['jiading', 'menjian', 'buqu', 'sishi'];
  var sources = ['liumin', 'biao', 'jianghu', 'tuwu'];
  types.forEach(function (t) {
    sources.forEach(function (s) {
      resetPlayerCash(ctx, 1000000);
      var before = ctx.P.playerInfo.playerEconomy.cash;
      var r = ns.recruit(t, s, 10, {});
      assert(r.ok === true, 'recruit: ' + t + '/' + s + ' ok');
      assert(r.unit && r.unit.kind === 'private', 'recruit: ' + t + '/' + s + ' kind=private');
      assert(r.unit.type === t, 'recruit: ' + t + '/' + s + ' type 回显');
      assert(r.unit.source === s, 'recruit: ' + t + '/' + s + ' source 回显');
      assert(r.unit.count === 10, 'recruit: ' + t + '/' + s + ' count=10');
      assert(r.unit.training >= 0 && r.unit.training <= 100, 'recruit: ' + t + '/' + s + ' training 范围');
      assert(r.unit.equipment >= 0 && r.unit.equipment <= 100, 'recruit: ' + t + '/' + s + ' equipment 范围');
      assert(r.unit.morale >= 0 && r.unit.morale <= 100, 'recruit: ' + t + '/' + s + ' morale 范围');
      assert(r.cost > 0, 'recruit: ' + t + '/' + s + ' cost > 0');
      assert(ctx.P.playerInfo.playerEconomy.cash === before - r.cost, 'recruit: ' + t + '/' + s + ' 银钱 -=cost');
    });
  });

  // 名将招揽·须先经人物互动
  resetPlayerCash(ctx, 1000000);
  ctx._interactFail = false;
  var rFamous = ns.recruit('menjian', 'famous', 20, { npcName: '王将军' });
  assert(rFamous.ok === true, 'recruit: famous ok');
  assert(rFamous.unit.source === 'famous', 'recruit: famous source=famous');
  assert(ctx._interactCalls.length === 1, 'recruit: famous 触发 1 次 interact');
  assert(ctx._interactCalls[0].kind === 'recruit', 'recruit: famous interact kind=recruit');
  assert(ctx._interactCalls[0].npcName === '王将军', 'recruit: famous interact npcName=王将军');

  // 名将招揽被拒
  ctx._interactFail = true;
  var rFamousFail = ns.recruit('menjian', 'famous', 20, { npcName: '王将军' });
  assert(rFamousFail.ok === false, 'recruit: famous 失败时拒绝');
  assert(/名将招揽失败/.test(rFamousFail.reason), 'recruit: famous 失败 reason');
  ctx._interactFail = false;

  // 规模边际上浮·50 人后单价涨
  resetPlayerCash(ctx, 10000000);
  var r1 = ns.recruit('jiading', 'liumin', 30, {});
  var cost1 = r1.cost; // 30 人成本
  var r2 = ns.recruit('jiading', 'liumin', 30, {}); // 已有 30·再招 30·超 50 阈值
  var cost2 = r2.cost; // 应高于 cost1（同等人数但规模上浮）
  assert(cost2 > cost1, 'recruit: 规模边际上浮（cost2 ' + cost2 + ' > cost1 ' + cost1 + '）');
}

// SubTest 4: 私军维护
function testMaintenance(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  // 招 100 人家丁
  resetPlayerCash(ctx, 1000000);
  ns.recruit('jiading', 'liumin', 100, {});
  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;

  var r = ns.monthlyMaintenance();
  assert(r.ok === true, 'maint: ok');
  assert(r.cost > 0, 'maint: cost > 0');
  assert(r.grain > 0, 'maint: grain > 0');
  // 家丁 upkeep=1.2 两/人/月 × 100 = 120 两
  assert(r.cost === 120, 'maint: 100 家丁月耗 120 两·实际 ' + r.cost);
  // 家丁 upkeepGrain=1.5 × 100 = 150 斤
  assert(r.grain === 150, 'maint: 100 家丁月耗粮 150 斤·实际 ' + r.grain);
  // 银钱扣除
  assert(ctx.P.playerInfo.playerEconomy.cash === cashBefore - r.cost, 'maint: 银钱 -= cost');
  assert(r.totalCount === 100, 'maint: totalCount=100');

  // 规模超限·触发财政压力
  resetPlayerCash(ctx, 10000000);
  ns.recruit('jiading', 'liumin', 250, {}); // 累计 350·超 FISCAL_PRESSURE_THRESHOLD=300
  var r2 = ns.monthlyMaintenance();
  assert(r2.fiscalPressure === true, 'maint: 350 人触发财政压力');
  assert(r2.totalCount === 350, 'maint: totalCount=350');

  // 银钱不足·士气下降
  resetPlayerCash(ctx, 5);  // 远不够维护
  var stateBefore = ns.getState();
  var avgMoraleBefore = stateBefore.units.reduce(function (s, u) { return s + u.morale; }, 0) / stateBefore.units.length;
  var r3 = ns.monthlyMaintenance();
  assert(r3.ok === true, 'maint: 银钱不足仍 ok（应用 shortfall）');
  var stateAfter = ns.getState();
  var avgMoraleAfter = stateAfter.units.reduce(function (s, u) { return s + u.morale; }, 0) / stateAfter.units.length;
  assert(avgMoraleAfter <= avgMoraleBefore, 'maint: 银钱不足后士气不升（前 ' + avgMoraleBefore + ' 后 ' + avgMoraleAfter + '）');
}

// SubTest 5: 训练私军
function testTrain(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r = ns.recruit('jiading', 'liumin', 50, {});
  var unitId = r.unit.id;
  var trainBefore = r.unit.training;

  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;
  var turnBefore = ctx.GM.turn;
  var tr = ns.train(unitId, {});
  assert(tr.ok === true, 'train: ok');
  assert(tr.gain > 0, 'train: gain > 0');
  assert(tr.unit.training === trainBefore + tr.gain, 'train: training = before + gain');
  assert(tr.unit.training <= 100, 'train: training ≤ 100');
  assert(tr.cost > 0, 'train: cost > 0');
  // 50 人 × 1.5 两/人 = 75 两
  assert(tr.cost === 75, 'train: 50 人 cost=75·实际 ' + tr.cost);
  assert(ctx.P.playerInfo.playerEconomy.cash === cashBefore - tr.cost, 'train: 银钱 -= cost');
  // 时间推进 4 小时（未跨 12）
  assert(ctx.P.playerInfo._timeUsedThisTurn === 4, 'train: 时间 +4h·实际 ' + ctx.P.playerInfo._timeUsedThisTurn);
  assert(tr.unit.lastTrainedAt === ctx.GM.turn, 'train: lastTrainedAt = turn');

  // 多次训练·训练度衰减（越高越难提升）
  var gains = [tr.gain];
  for (var i = 0; i < 5; i++) {
    var r2 = ns.train(unitId, {});
    if (r2.ok) gains.push(r2.gain);
  }
  // 训练度提升至接近 100 时·gain 应衰减
  var lastUnit = ns.getUnit(unitId);
  assert(lastUnit.training > trainBefore, 'train: 多次训练后 training 上升');
  // 衰减验证：早期 gain ≥ 后期 gain（容差·因含随机）
  var earlyAvg = gains.slice(0, 2).reduce(function (a, b) { return a + b; }, 0) / 2;
  var lateAvg = gains.slice(-2).reduce(function (a, b) { return a + b; }, 0) / 2;
  assert(earlyAvg >= lateAvg - 2, 'train: 衰减（早期 ' + earlyAvg + ' ≥ 后期 ' + lateAvg + '）');

  // 跨回合推进（前 5 次循环 train 累计 20h 可能跨过多回合·此处重新记录 turnBefore）
  ctx.P.playerInfo._timeUsedThisTurn = 11; // arch-ok (test fixture)
  var turnBefore2 = ctx.GM.turn;
  var tr3 = ns.train(unitId, {});  // +4h = 15 → 跨 1 回合 + 剩 3
  assert(tr3.ok === true, 'train: 跨回合 ok');
  assert(ctx.GM.turn === turnBefore2 + 1, 'train: 跨回合 turn +1·前 ' + turnBefore2 + ' 后 ' + ctx.GM.turn);
  assert(ctx.P.playerInfo._timeUsedThisTurn === 3, 'train: 跨回合后 _timeUsedThisTurn=3·实际 ' + ctx.P.playerInfo._timeUsedThisTurn);
}

// SubTest 6: 装备私军
function testEquip(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r = ns.recruit('jiading', 'liumin', 50, {});
  var unitId = r.unit.id;
  var equipBefore = r.unit.equipment;

  // 装备兵器
  var cashBefore = ctx.P.playerInfo.playerEconomy.cash;
  var er1 = ns.equip(unitId, 'weapon', {});
  assert(er1.ok === true, 'equip: weapon ok');
  assert(er1.boost > 0, 'equip: weapon boost > 0');
  assert(er1.unit.equipment === equipBefore + er1.boost, 'equip: weapon equipment = before + boost');
  // 50 人 × 8 两/人 = 400 两
  assert(er1.cost === 400, 'equip: weapon cost=400·实际 ' + er1.cost);
  assert(ctx.P.playerInfo.playerEconomy.cash === cashBefore - er1.cost, 'equip: 银钱 -= cost');
  assert(er1.unit.lastEquippedAt === ctx.GM.turn, 'equip: lastEquippedAt = turn');

  // 装备甲胄
  var equipBefore2 = er1.unit.equipment;
  var er2 = ns.equip(unitId, 'armor', {});
  assert(er2.ok === true, 'equip: armor ok');
  assert(er2.unit.equipment === equipBefore2 + er2.boost, 'equip: armor equipment = before + boost');
  assert(er2.cost === 50 * 20, 'equip: armor cost=1000·实际 ' + er2.cost);

  // 装备战马·arm 升级为 cav
  assert(er2.unit.arm !== 'cav', 'equip: 战马前 arm ≠ cav');
  var er3 = ns.equip(unitId, 'horse', {});
  assert(er3.ok === true, 'equip: horse ok');
  assert(er3.unit.arm === 'cav', 'equip: 战马后 arm = cav');
  assert(er3.unit.sub === 'horse' || er3.unit.sub === 'heavy', 'equip: 战马后 sub 为 horse/heavy');
  assert(er3.unit.flags.indexOf('cavalry') >= 0, 'equip: 战马后 flags 含 cavalry');

  // 装备度封顶 100
  resetPlayerCash(ctx, 10000000);
  for (var i = 0; i < 20; i++) {
    var r2 = ns.equip(unitId, 'weapon', {});
    if (!r2.ok) break;
  }
  var finalUnit = ns.getUnit(unitId);
  assert(finalUnit.equipment <= 100, 'equip: equipment ≤ 100·实际 ' + finalUnit.equipment);
}

// SubTest 7: 护卫商队
function testEscort(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r1 = ns.recruit('jiading', 'biao', 50, {});  // 镖师家丁·适合护卫
  var r2 = ns.recruit('menjian', 'jianghu', 30, {});

  var countBefore1 = r1.unit.count;
  var countBefore2 = r2.unit.count;

  var er = ns.useForEscort([r1.unit.id, r2.unit.id], { combatIntensity: 0.3 });
  assert(er.ok === true, 'escort: ok');
  assert(er.scenario === 'escort', 'escort: scenario=escort');
  assert(er.totalCount === 80, 'escort: totalCount=80·实际 ' + er.totalCount);
  assert(typeof er.riskReduction === 'number' && er.riskReduction > 0, 'escort: riskReduction > 0');
  assert(er.riskReduction <= 0.85, 'escort: riskReduction ≤ 0.85');
  assert(er.casualties && er.casualties.total >= 0, 'escort: casualties.total ≥ 0');
  assert(er.avgScore > 0, 'escort: avgScore > 0');

  // 伤亡应用
  var u1 = ns.getUnit(r1.unit.id);
  var u2 = ns.getUnit(r2.unit.id);
  assert(u1.count + u2.count === countBefore1 + countBefore2 - er.casualties.total,
    'escort: 伤亡从单位 count 扣除');

  // 事件记录
  var st = ns.getState();
  var escortEvents = st.events.filter(function (e) { return e.kind === 'use:escort'; });
  assert(escortEvents.length > 0, 'escort: 事件已写入');
}

// SubTest 8: 自卫
function testSelfDefense(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r1 = ns.recruit('buqu', 'tuwu', 100, {});
  var r2 = ns.recruit('menjian', 'tuwu', 50, {});

  var er = ns.useForSelfDefense([r1.unit.id, r2.unit.id], { combatIntensity: 0.5 });
  assert(er.ok === true, 'defense: ok');
  assert(er.scenario === 'defense', 'defense: scenario=defense');
  assert(er.holdDays >= 1, 'defense: holdDays ≥ 1');
  assert(er.casualties && er.casualties.total >= 0, 'defense: casualties.total ≥ 0');
  assert(er.totalCount === 150, 'defense: totalCount=150');

  var st = ns.getState();
  var defEvents = st.events.filter(function (e) { return e.kind === 'use:defense'; });
  assert(defEvents.length > 0, 'defense: 事件已写入');
}

// SubTest 9: 政变
function testCoup(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r1 = ns.recruit('sishi', 'tuwu', 100, {});
  var r2 = ns.recruit('buqu', 'tuwu', 200, {});

  var notorietyBefore = ns.getState().notoriety;
  var er = ns.useForCoup([r1.unit.id, r2.unit.id], { combatIntensity: 0.7, loyalty: 0.6 });
  assert(er.ok === true, 'coup: ok');
  assert(er.scenario === 'coup', 'coup: scenario=coup');
  assert(typeof er.coupStrength === 'number' && er.coupStrength > 0, 'coup: coupStrength > 0');
  assert(typeof er.mutinyRisk === 'number', 'coup: mutinyRisk 是数字');
  assert(er.mutinyRisk >= 0 && er.mutinyRisk <= 0.8, 'coup: mutinyRisk 0-0.8·实际 ' + er.mutinyRisk);
  assert(er.casualties && er.casualties.total >= 0, 'coup: casualties.total ≥ 0');

  // 政变后恶名 +30
  var notorietyAfter = ns.getState().notoriety;
  assert(notorietyAfter === notorietyBefore + 30, 'coup: 恶名 +30·前 ' + notorietyBefore + ' 后 ' + notorietyAfter);

  var st = ns.getState();
  var coupEvents = st.events.filter(function (e) { return e.kind === 'use:coup'; });
  assert(coupEvents.length > 0, 'coup: 事件已写入');
}

// SubTest 10: 私斗
function testFeud(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r1 = ns.recruit('menjian', 'jianghu', 80, {});

  var notorietyBefore = ns.getState().notoriety;
  // 我方强·对方弱·应胜
  var er = ns.useForPrivateFeud([r1.unit.id], { combatIntensity: 0.4, opponentStrength: 50 });
  assert(er.ok === true, 'feud: ok');
  assert(er.scenario === 'feud', 'feud: scenario=feud');
  assert(typeof er.win === 'boolean', 'feud: win 是 boolean');
  assert(typeof er.myStrength === 'number' && er.myStrength > 0, 'feud: myStrength > 0');
  assert(typeof er.opponentStrength === 'number', 'feud: opponentStrength 是数字');
  assert(er.casualties && er.casualties.total >= 0, 'feud: casualties.total ≥ 0');

  // 私斗后恶名 +5
  var notorietyAfter = ns.getState().notoriety;
  assert(notorietyAfter === notorietyBefore + 5, 'feud: 恶名 +5·前 ' + notorietyBefore + ' 后 ' + notorietyAfter);

  var st = ns.getState();
  var feudEvents = st.events.filter(function (e) { return e.kind === 'use:feud'; });
  assert(feudEvents.length > 0, 'feud: 事件已写入');

  // 我方弱·对方强·应败（对方战力是 10000·我方 80 门客剑士约 8000）
  var er2 = ns.useForPrivateFeud([r1.unit.id], { combatIntensity: 0.4, opponentStrength: 50000 });
  assert(er2.ok === true, 'feud-2: ok');
  // 大概率败·但允许 1% 抽胜·这里仅断言 win 是 boolean
  assert(typeof er2.win === 'boolean', 'feud-2: win 是 boolean');
}

// SubTest 11: 僭越风险
function testYueYue(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;
  var TH = ns.YUEYUE_THRESHOLDS;

  // 阶段 1：小于 warning 阈值·level=none
  resetPlayerCash(ctx, 10000000);
  ns.recruit('jiading', 'liumin', 50, {});  // 50 人 < warning(100)
  var r1 = ns.checkYueYue();
  assert(r1.ok === true, 'yueyue-1: ok');
  assert(r1.yueyue.level === 'none', 'yueyue-1: 50 人 level=none·实际 ' + r1.yueyue.level);
  assert(ns.getYueYueLevel() === 'none', 'yueyue-1: getYueYueLevel=none');

  // 阶段 2：超 warning(100) 阈值·level=warning
  ns.recruit('jiading', 'liumin', 60, {});  // 累计 110·超 warning
  var r2 = ns.checkYueYue();
  assert(r2.yueyue.level === 'warning', 'yueyue-2: 110 人 level=warning·实际 ' + r2.yueyue.level);
  assert(r2.yueyue.actions.some(function (a) { return a.kind === 'whisper'; }), 'yueyue-2: 含 whisper');

  // 阶段 3：超 serious(300) 阈值·level=serious·触发朝廷调查
  var invBefore = ctx.GM._charInvestigations.length;
  ns.recruit('jiading', 'liumin', 200, {});  // 累计 310·超 serious
  var r3 = ns.checkYueYue();
  assert(r3.yueyue.level === 'serious', 'yueyue-3: 310 人 level=serious·实际 ' + r3.yueyue.level);
  assert(r3.yueyue.actions.some(function (a) { return a.kind === 'investigate'; }), 'yueyue-3: 含 investigate');
  assert(r3.yueyue.actions.some(function (a) { return a.kind === 'impeach'; }), 'yueyue-3: 含 impeach');
  // 等级跃升到 serious 触发朝廷调查
  assert(ctx.GM._charInvestigations.length === invBefore + 1, 'yueyue-3: 朝廷调查已触发');
  var inv = ctx.GM._charInvestigations[ctx.GM._charInvestigations.length - 1];
  assert(inv.target === '李大臣', 'yueyue-3: 调查 target=玩家');
  assert(/私军/.test(inv.reason), 'yueyue-3: 调查 reason 含私军');
  assert(inv.severity === 'serious', 'yueyue-3: 调查 severity=serious');

  // 阶段 4：超 critical(600) 阈值·level=critical·问罪
  var invBefore2 = ctx.GM._charInvestigations.length;
  ns.recruit('buqu', 'tuwu', 300, {});  // 累计 610·超 critical
  var r4 = ns.checkYueYue();
  assert(r4.yueyue.level === 'critical', 'yueyue-4: 610 人 level=critical·实际 ' + r4.yueyue.level);
  assert(r4.yueyue.actions.some(function (a) { return a.kind === 'punish'; }), 'yueyue-4: 含 punish');
  assert(r4.yueyue.actions.some(function (a) { return a.kind === 'suppression'; }), 'yueyue-4: 含 suppression');
  assert(ctx.GM._charInvestigations.length === invBefore2 + 1, 'yueyue-4: 朝廷调查再触发');
  var inv2 = ctx.GM._charInvestigations[ctx.GM._charInvestigations.length - 1];
  assert(inv2.severity === 'critical', 'yueyue-4: 调查 severity=critical');

  // 恶名累计
  var state = ns.getState();
  assert(state.notoriety > 0, 'yueyue: 恶名累计 > 0·实际 ' + state.notoriety);
}

// SubTest 12: 独立账本 kind:'private'（沿用 tm-army-units.js 模型）
function testIndependentLedger(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  var r = ns.recruit('buqu', 'tuwu', 100, {});
  var u = r.unit;

  // kind 标记
  assert(u.kind === 'private', 'ledger: kind=private');
  assert(ns.KIND_TAG === 'private', 'ledger: KIND_TAG=private');

  // 沿用 tm-army-units.js 字段：arm/sub/flags
  assert(typeof u.arm === 'string' && u.arm.length > 0, 'ledger: arm 字段');
  assert(typeof u.sub === 'string' && u.sub.length > 0, 'ledger: sub 字段');
  assert(Array.isArray(u.flags), 'ledger: flags 数组');

  // 沿用 tm-military.js 战力公式字段：training/equipment/morale/combatMul
  assert(typeof u.training === 'number', 'ledger: training number');
  assert(typeof u.equipment === 'number', 'ledger: equipment number');
  assert(typeof u.morale === 'number', 'ledger: morale number');
  assert(typeof u.combatMul === 'number', 'ledger: combatMul number');

  // 战力评分公式（与 tm-military.js 同源）
  // score = combatMul × (0.5 + morale/200) × (0.5 + training/200) × (0.5 + equipment/200) × 100
  var expectedScore = Math.round(
    u.combatMul * (0.5 + u.morale / 200) * (0.5 + u.training / 200) * (0.5 + u.equipment / 200) * 100
  );
  var actualScore = ns.computeBattleScore(u);
  assert(actualScore === expectedScore, 'ledger: 战力评分公式与 tm-military.js 同源·期望 ' + expectedScore + ' 实得 ' + actualScore);

  // 状态挂在 GM._playerArmy（独立于国库 GM.armies）
  assert(ctx.GM._playerArmy, 'ledger: GM._playerArmy 存在');
  assert(Array.isArray(ctx.GM._playerArmy.units), 'ledger: GM._playerArmy.units 是数组');
  assert(ctx.GM._playerArmy.units[0].kind === 'private', 'ledger: 单位 kind=private');
  // 独立于国库
  assert(!ctx.GM.armies || !Array.isArray(ctx.GM.armies), 'ledger: 私军不污染 GM.armies');

  // TMArmyUnits.classifyUnitType 被复用
  // 招募死士·flags 应含 elite（mock 中死士归类为 elite flag）
  var r2 = ns.recruit('sishi', 'tuwu', 10, {});
  assert(r2.unit.flags.indexOf('elite') >= 0, 'ledger: 死士 flags 含 elite（复用 TMArmyUnits）');
}

// SubTest 13: 御案"私军"面板
function testPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  resetPlayerCash(ctx, 1000000);
  ns.recruit('jiading', 'liumin', 80, {});
  ns.recruit('buqu', 'tuwu', 50, {});
  ns.train(ctx.GM._playerArmy.units[0].id, {});

  var html = ns.renderPanel();
  assert(typeof html === 'string' && html.length > 0, 'panel: 返回非空字符串');
  assert(/pa-panel/.test(html), 'panel: 含 pa-panel 类');
  assert(/私 军/.test(html), 'panel: 含"私 军"标题');
  assert(/总 兵 力/.test(html), 'panel: 含"总 兵 力"');
  assert(/家丁/.test(html), 'panel: 含"家丁"');
  assert(/部曲/.test(html), 'panel: 含"部曲"');
  assert(/训练/.test(html), 'panel: 含"训练"');
  assert(/装备/.test(html), 'panel: 含"装备"');
  assert(/士气/.test(html), 'panel: 含"士气"');
  // 朝代中立·不含明清专名
  assert(!/锦衣卫|司礼监|东厂|西厂|军机处|内阁|票拟|廷杖|八股/.test(html), 'panel: 不含明清专名');
}

// SubTest 14: 跨朝代铁律审计
function testCrossDynastyIron(ctx) {
  // 扫描实际代码（剥注释）·确保无明清专名
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-private-army.js'), 'utf8');
  // 剥单行注释行
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

  // 私军类型（家丁/门客剑士/部曲/死士）允许保留
  assert(code.indexOf('家丁') >= 0, 'cross-dynasty: 家丁（古代通用称谓）保留');
  assert(code.indexOf('门客剑士') >= 0, 'cross-dynasty: 门客剑士保留');
  assert(code.indexOf('部曲') >= 0, 'cross-dynasty: 部曲保留');
  assert(code.indexOf('死士') >= 0, 'cross-dynasty: 死士保留');
}

// SubTest 15: 双路径挂载
function testDualMount(ctx) {
  // module.exports 应等价 globalThis.TM.PlayerPrivateArmy
  var mod = require(path.join(ROOT, 'tm-player-private-army.js'));
  assert(mod && typeof mod.recruit === 'function', 'dual-mount: module.exports.recruit 是函数');
  assert(mod && typeof mod.useForCoup === 'function', 'dual-mount: module.exports.useForCoup 是函数');
  assert(mod.KIND_TAG === 'private', 'dual-mount: module.exports.KIND_TAG=private');
  assert(mod.UNIT_TYPES && Object.keys(mod.UNIT_TYPES).length === 4, 'dual-mount: UNIT_TYPES 4 种');
  assert(mod.RECRUIT_SOURCES && Object.keys(mod.RECRUIT_SOURCES).length === 5, 'dual-mount: RECRUIT_SOURCES 5 种');
}

// SubTest 16: 月度 tick = monthlyMaintenance 等价
function testTick(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;
  resetPlayerCash(ctx, 1000000);
  ns.recruit('jiading', 'liumin', 30, {});
  var r = ns.tick({});
  assert(r.ok === true, 'tick: ok');
  assert(typeof r.cost === 'number', 'tick: cost 是 number');
  assert(typeof r.totalCount === 'number', 'tick: totalCount 是 number');
  assert(r.totalCount === 30, 'tick: totalCount=30');
}

// SubTest 17: listXxx 接口
function testListInterfaces(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerPrivateArmy;

  var types = ns.listUnitTypes();
  assert(Array.isArray(types) && types.length === 4, 'list: UNIT_TYPES 4 项');
  var t0 = types[0];
  assert(t0.id && t0.label && typeof t0.baseCost === 'number', 'list: 类型条目字段齐');

  var sources = ns.listRecruitSources();
  assert(Array.isArray(sources) && sources.length === 5, 'list: RECRUIT_SOURCES 5 项');

  var eqs = ns.listEquipmentTypes();
  assert(Array.isArray(eqs) && eqs.length === 3, 'list: EQUIPMENT_TYPES 3 项');
}

// ── 入口 ────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testGuards(ctx);
  testRecruit(ctx);
  testMaintenance(ctx);
  testTrain(ctx);
  testEquip(ctx);
  testEscort(ctx);
  testSelfDefense(ctx);
  testCoup(ctx);
  testFeud(ctx);
  testYueYue(ctx);
  testIndependentLedger(ctx);
  testPanel(ctx);
  testCrossDynastyIron(ctx);
  testDualMount(ctx);
  testTick(ctx);
  testListInterfaces(ctx);
  console.log('[smoke-player-private-army] PASS · 17 sub-tests · namespace/guards/recruit×20/maintenance/train/equip/escort/defense/coup/feud/yueyue(4-level)/ledger(kind:private)/panel/cross-dynasty/dual-mount/tick/list');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-private-army] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
