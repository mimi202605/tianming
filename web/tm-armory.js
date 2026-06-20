/* tm-armory.js — 军备/武库库存(军事系统装备绑定 · Slice 1 数据层)
 * 国家级军备库存挂 GM.guoku.armory(帑廪之下·与库藏银粮布并列的「军备库」)·复用账本概念(stock + 本回合进出 + 累计)。
 * 五类军备按兵种消耗:甲胄(全军)/兵刃(步骑近战)/弓弩(弓弩手)/火器(铳炮)/战马(骑兵)。接 Phase0 units[] 的 arm/sub。
 * 募兵从武库支取(tm-ai-change-army·Slice 2)·空了则新军装备简陋(品质/士气挫)。产出走军器局(每回合)+采买(治理·Slice 5)。
 * 朝代中立(CLAUDE.md 红线):类目名通用·不锁单朝。纯增量·无消费方时不改任何现有行为(Slice 1 仅建库不接收支)。
 */
(function () {
  'use strict';

  /* 五类军备(朝代中立·label=显示名·desc=说明) */
  var CATS = [
    { key: '甲胄', label: '甲胄', desc: '护身之甲', icon: '甲' },
    { key: '兵刃', label: '兵刃', desc: '刀枪近战', icon: '刃' },
    { key: '弓弩', label: '弓弩', desc: '弓与弩', icon: '弓' },
    { key: '火器', label: '火器', desc: '铳炮火器', icon: '铳' },
    { key: '战马', label: '战马', desc: '骑乘战马', icon: '马' }
  ];
  var CAT_KEYS = CATS.map(function (c) { return c.key; });

  function num(v, d) { v = Number(v); return isFinite(v) ? v : (d || 0); }

  /* 账本(复用 fiscal-engine 的 ledger 形状·此处独立轻量实现·不依赖 FiscalEngine) */
  function ensureLedger(root, key) {
    if (!root[key] || typeof root[key] !== 'object') root[key] = {};
    var l = root[key];
    l.stock = num(l.stock, 0);
    l.thisTurnIn = num(l.thisTurnIn, 0);
    l.thisTurnOut = num(l.thisTurnOut, 0);
    l.lastTurnIn = num(l.lastTurnIn, 0);
    l.lastTurnOut = num(l.lastTurnOut, 0);
    return l;
  }

  /* 确保 GM.guoku.armory 五类账本就位(幂等·永不崩) */
  function ensure(GM) {
    if (!GM || typeof GM !== 'object') return null;
    if (!GM.guoku || typeof GM.guoku !== 'object') GM.guoku = {};
    if (!GM.guoku.armory || typeof GM.guoku.armory !== 'object') GM.guoku.armory = {};
    var A = GM.guoku.armory;
    CAT_KEYS.forEach(function (k) { ensureLedger(A, k); });
    return A;
  }

  function stock(GM, cat) { var A = ensure(GM); return A && A[cat] ? num(A[cat].stock, 0) : 0; }
  function allStock(GM) { var A = ensure(GM), o = {}; if (A) CAT_KEYS.forEach(function (k) { o[k] = num(A[k].stock, 0); }); return o; }

  /* 入账(产出/采买/调拨→武库) */
  function add(GM, amounts, tag) {
    var A = ensure(GM); if (!A) return { added: {} }; amounts = amounts || {};
    var added = {};
    CAT_KEYS.forEach(function (k) {
      var amt = num(amounts[k], 0); if (amt <= 0) return;
      var l = A[k]; l.stock = num(l.stock, 0) + amt; l.thisTurnIn = num(l.thisTurnIn, 0) + amt; added[k] = amt;
    });
    return { added: added };
  }

  /* 支取(募兵/补给→扣武库)·库存不继则尽扣记缺(shortfall)·调用方按缺口降装备/士气 */
  function spend(GM, amounts, tag) {
    var A = ensure(GM); if (!A) return { deducted: {}, shortfall: {}, anyShort: false }; amounts = amounts || {};
    var ded = {}, sh = {}, anyShort = false;
    CAT_KEYS.forEach(function (k) {
      var need = num(amounts[k], 0); if (need <= 0) return;
      var l = A[k], have = num(l.stock, 0), take = Math.min(have, need);
      l.stock = have - take; l.thisTurnOut = num(l.thisTurnOut, 0) + take; ded[k] = take;
      if (need > take + 1e-6) { sh[k] = need - take; anyShort = true; }
    });
    return { deducted: ded, shortfall: sh, anyShort: anyShort };
  }

  /* 回合翻转:本回合进出→last·清本回合(供 UI 显「本回合产/耗」) */
  function rollTurn(GM) {
    var A = ensure(GM); if (!A) return;
    CAT_KEYS.forEach(function (k) {
      var l = A[k]; l.lastTurnIn = num(l.thisTurnIn, 0); l.lastTurnOut = num(l.thisTurnOut, 0);
      l.thisTurnIn = 0; l.thisTurnOut = 0;
    });
  }

  /* 兵种(units[].sub/arm)→每卒军备需求(接 Phase0 识别瀑布产物) */
  var NEED = {
    spear: { 甲胄: 0.7, 兵刃: 1 }, sword: { 甲胄: 0.7, 兵刃: 1 }, halberd: { 甲胄: 0.8, 兵刃: 1 },
    bow: { 甲胄: 0.5, 弓弩: 1 }, crossbow: { 甲胄: 0.5, 弓弩: 1 },
    musket: { 甲胄: 0.5, 火器: 1 }, cannon: { 甲胄: 0.4, 火器: 1 },
    horse: { 甲胄: 1, 兵刃: 1, 战马: 1 }, shock: { 甲胄: 1.1, 兵刃: 1, 战马: 1 }, heavy: { 甲胄: 1.6, 兵刃: 1, 战马: 1 },
    guard: { 甲胄: 1.2, 兵刃: 1 }
  };
  var NEED_BY_ARM = { step: { 甲胄: 0.6, 兵刃: 1 }, bow: { 甲胄: 0.5, 弓弩: 1 }, cav: { 甲胄: 1, 兵刃: 1, 战马: 1 }, art: { 甲胄: 0.4, 火器: 1 }, guard: { 甲胄: 1.2, 兵刃: 1 } };
  var NEED_DEFAULT = { 甲胄: 0.6, 兵刃: 1 };

  function needPerSoldier(sub, arm) { return NEED[sub] || NEED_BY_ARM[arm] || NEED_DEFAULT; }

  /* units[](或队列) → 军备需求总量(units 各含 sub/arm/men) */
  function needForUnits(units) {
    var need = {};
    (units || []).forEach(function (u) {
      if (!u) return;
      var per = needPerSoldier(u.sub, u.arm), men = num(u.men != null ? u.men : u.soldiers, 0);
      for (var k in per) if (per.hasOwnProperty(k)) need[k] = num(need[k], 0) + per[k] * men;
    });
    for (var k2 in need) if (need.hasOwnProperty(k2)) need[k2] = Math.round(need[k2]);
    return need;
  }
  /* 一兵种 N 卒 → 需求(募兵单兵种便捷) */
  function needForTroops(sub, arm, men) {
    var per = needPerSoldier(sub, arm), need = {}, m = num(men, 0);
    for (var k in per) if (per.hasOwnProperty(k)) need[k] = Math.round(per[k] * m);
    return need;
  }

  /* 军器局每回合基础产能(试玩调·Slice 2 接工部经费 scale) */
  var PRODUCE_BASE = { 甲胄: 1200, 兵刃: 1500, 弓弩: 600, 火器: 400, 战马: 300 };
  function produce(GM, scale) {
    scale = num(scale, 1); var amt = {};
    CAT_KEYS.forEach(function (k) { amt[k] = Math.round(num(PRODUCE_BASE[k], 0) * scale); });
    add(GM, amt, '军器局');
    return amt;
  }

  /* 装备充裕度(0~1):一军 units[] 需求 vs 当前库存·供 UI 显缺口 / Slice4 喂品质 */
  function supplyRatio(GM, units) {
    var need = needForUnits(units), have = allStock(GM), worst = 1, any = false;
    for (var k in need) if (need.hasOwnProperty(k) && need[k] > 0) {
      any = true; var r = num(have[k], 0) / need[k]; if (r < worst) worst = r;
    }
    return any ? Math.max(0, Math.min(1, worst)) : 1;
  }

  var API = {
    CATS: CATS, CAT_KEYS: CAT_KEYS, NEED: NEED, PRODUCE_BASE: PRODUCE_BASE,
    ensure: ensure, stock: stock, allStock: allStock, add: add, spend: spend, rollTurn: rollTurn,
    needPerSoldier: needPerSoldier, needForUnits: needForUnits, needForTroops: needForTroops,
    produce: produce, supplyRatio: supplyRatio
  };
  if (typeof window !== 'undefined') window.TMArmory = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
