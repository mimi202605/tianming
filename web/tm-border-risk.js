// tm-border-risk.js — P1-A1a 边境风险结算（激活死字段 borderRisk「边警」）
//   命门：补「AI 开战决策对地块边境/战略属性完全盲视」(region-panel-fields-audit-2026-06.md:117)。
//   现状：borderRisk 是纯死字段——剧本写死多少就永远显示多少，引擎从不算它(grep 全是 phase8 显示位)。
//
//   省级简化版(2026-06-20·owner 拍板「精度可低·AI 能读·避开地块桥接」)：
//     · 在 adminHierarchy 叶级算，写回 leaf.borderRisk → 面板 regionBundle 的 liveDivision 直接读活值，
//       AI 读同一世界模型(adminHierarchy/provinceStats)也读得到。
//     · 敌方压强 = faction 级敌对态势(复用 borderThreatAgg 的敌对判定·generalize 到任意 faction)。
//     · 本地防御 = 该叶驻军相对其丁口的充分度。敌强 × 本地空虚 → 边境风险高。
//     · 不碰 P.map.regions 的地块邻接(地块 id ↔ 省名 两套 key 桥接)——地理前线/腹地暂不分(精度可低)。
//   开关 P.conf.borderRiskEnabled 默认开(owner 拍板·活化修复直接生效·显式 false 可关)。
//   后续：A1b 接 AI 出征读 borderRisk 攻软肋·A1c 烽燧预警·未来用 region.neighbors 精化地理前线。
(function (global) {
  'use strict';

  var HOSTILE_TYPES = ['敌对', '战争', '敌视', '交战', 'hostile', 'war', '侵略'];

  // 某 faction(按 name)的敌对势力集——把 borderThreatAgg 的「对玩家」判定 generalize 到任意 faction 视角。
  function _hostileFactionsOf(facName, playerFacName) {
    var G = global.GM || {};
    var rels = G.factionRelations || [];
    return (G.facs || []).filter(function (f) {
      if (!f || !f.name || f.name === facName) return false;
      // 方式1：factionRelations 显式敌对(双向查)
      for (var i = 0; i < rels.length; i++) {
        var r = rels[i];
        if (!r || !r.type) continue;
        var hit = (r.from === facName && r.to === f.name) || (r.from === f.name && r.to === facName);
        if (hit && HOSTILE_TYPES.indexOf(r.type) >= 0) return true;
      }
      // 方式2：玩家视角额外用 playerRelation(< -50 视为敌对·同 borderThreatAgg)
      if (facName === playerFacName && (Number(f.playerRelation) || 0) < -50) return true;
      return false;
    });
  }

  // 叶驻军：优先活值 troops·回落区划军务/守备字段·取不到当 0(空虚=高危)。
  function _leafTroops(leaf) {
    var t = Number(leaf.troops);
    if (isFinite(t) && t >= 0) return t;
    var d = leaf.data || {};
    var gm = d.governanceMilitary || {};
    t = Number(gm.standingArmy);
    if (isFinite(t) && t >= 0) return t;
    t = Number(d.garrison);
    return (isFinite(t) && t >= 0) ? t : 0;
  }

  function tickBorderRisk() {
    var P = global.P || {};
    if (P.conf && P.conf.borderRiskEnabled === false) return;        // 默认开·显式 false 才关(owner 拍板·活化修复直接生效)
    var G = global.GM;
    if (!G || !G.adminHierarchy) return;
    var IB = global.IntegrationBridge;
    if (!IB || typeof IB.getLeafDivisions !== 'function') return;    // 无取叶能力·静默跳过
    var ah = G.adminHierarchy;
    var playerFacName = (P.playerInfo && P.playerInfo.factionName) || 'player';
    var touched = 0;

    Object.keys(ah).forEach(function (facId) {
      var ownerFacName = (facId === 'player') ? playerFacName : facId;
      var hostiles = _hostileFactionsOf(ownerFacName, playerFacName);
      var threatScore = 0;
      if (hostiles.length) {
        var sum = 0;
        hostiles.forEach(function (f) { sum += (Number(f.strength) || 50); });
        threatScore = Math.min(100, Math.round(sum / hostiles.length));
      }
      var leaves = IB.getLeafDivisions(ah, facId) || [];
      for (var i = 0; i < leaves.length; i++) {
        var leaf = leaves[i];
        if (!leaf) continue;
        if (threatScore <= 0) { leaf.borderRisk = 0; touched++; continue; }   // 无敌邻·腹地太平
        var pd = leaf.populationDetail || {};
        var mouths = Number(pd.mouths) || 0;
        var troops = _leafTroops(leaf);
        var fortify = Number(leaf.defenseBonus) || 0;                 // A4·边防工事加成(自拟营建/烽燧巡检写)·每档≈2000驻军之防(关隘抵众)
        var expected = Math.max(500, mouths * 0.005);                 // 应有驻军 ~0.5% 丁口
        var defenseRatio = Math.max(0, Math.min(1, (troops + fortify * 2000) / expected));
        // 边境风险 = 敌强 × 本地空虚度(驻军满仍留 30% 残险·因敌在侧)
        leaf.borderRisk = Math.round(threatScore * (1 - defenseRatio * 0.7));
        touched++;
      }
    });
    if (G._debugBorderRisk) G._borderRiskTouched = touched;
  }

  // ───────────────────────────────────────────────────────────
  // P1-A2·军费负担结算(armyPressure)·owner 拍板「军费负担」定位(2026-06-20)
  //   armyPressure = 本地养兵的经济压力 = 月军费(驻军×饷) / 月留用(retainedBudget/12)。
  //   与 borderRisk(军事威胁)正交：边警=会不会被打·军压=养不养得起。契合明末辽饷压垮地方。
  //   派生 localMilitaryCost(本地月军费)+retainedNet(养兵后净留用·可负=赤字)·不改 fiscal 的 retainedBudget(它每回合重算)。
  //   开关 P.conf.armyPressureEnabled 默认开(owner 拍板·活化修复直接生效·显式 false 可关)。留用月耗下游(tm-audit 可用预算改读 retainedNet)留 A2b。
  // ───────────────────────────────────────────────────────────
  function _leafRetained(leaf) {
    var fd = leaf.fiscalDetail || leaf.fiscal || {};
    var r = Number(fd.retainedBudget);
    return (isFinite(r) && r > 0) ? r : 0;
  }

  function tickArmyPressure() {
    var P = global.P || {};
    if (P.conf && P.conf.armyPressureEnabled === false) return;   // 默认开·显式 false 才关(owner 拍板·活化修复直接生效)
    var G = global.GM;
    if (!G || !G.adminHierarchy) return;
    var IB = global.IntegrationBridge;
    if (!IB || typeof IB.getLeafDivisions !== 'function') return;
    var ah = G.adminHierarchy;
    // 月饷单价(两/兵)·复用 fiscal-engine DEFAULT_ARMY_PAY.money·取不到回落 0.5
    var payPerSoldier = 0.5;
    try { var dap = global.FixedExpense && global.FixedExpense.DEFAULT_ARMY_PAY; if (dap && Number(dap.money) > 0) payPerSoldier = Number(dap.money); } catch (e) {}
    Object.keys(ah).forEach(function (facId) {
      var leaves = IB.getLeafDivisions(ah, facId) || [];
      for (var i = 0; i < leaves.length; i++) {
        var leaf = leaves[i];
        if (!leaf) continue;
        var troops = _leafTroops(leaf);
        var monthlyPay = troops * payPerSoldier;                      // 本地月军费(两)
        leaf.localMilitaryCost = Math.round(monthlyPay);
        var retained = _leafRetained(leaf);                           // 地方留用(年)
        leaf.retainedNet = Math.round(retained - monthlyPay * 12);    // 养兵后净留用·可负=赤字
        var monthlyRetained = retained / 12;
        var pressure;
        if (troops <= 0) pressure = 0;                                // 无驻军·无军费压力
        else if (monthlyRetained <= 0) pressure = 85;                 // 有兵无留用·地方养不起·高压
        else pressure = Math.max(0, Math.min(100, Math.round(monthlyPay / monthlyRetained * 60)));  // 月军费/月留用×60
        leaf.armyPressure = pressure;
      }
    });
  }

  global.BorderRisk = { tick: tickBorderRisk, tickArmyPressure: tickArmyPressure, _hostileFactionsOf: _hostileFactionsOf };

  // 挂 SettlementPipeline·边患聚合(17) → 边境风险(18) → 军费负担(19)
  if (global.SettlementPipeline && typeof global.SettlementPipeline.register === 'function') {
    global.SettlementPipeline.register('borderRiskLeaf', '边境风险结算', tickBorderRisk, 18, 'perturn');
    global.SettlementPipeline.register('armyPressureLeaf', '军费负担结算', tickArmyPressure, 19, 'perturn');
  }
})(typeof window !== 'undefined' ? window : this);
