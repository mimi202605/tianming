// tm-coastal-raid.js — P1-A3b 沿海袭击结算（确定性事件·读 coastalDefense 抵损）
//   命门：激活死字段 coastalDefense「海防」——A3a building-works 建水寨/船坞写 coastalDefense（写端），
//   本模块是读端：沿海地块在夏秋风季遭海寇劫掠，海防越高→袭击概率越低 + 损失抵扣越高（双重保护）。
//   owner 拍板「确定性事件闭环」(2026-06-20)：概率触发 + 公式抵损(非 AI 裁定)·像危机引擎。
//   跨朝代铁律：引擎用通用「海寇/沿海袭击」(非「倭寇」明专名)·季节用通用风季(夏秋)·倭患归剧本。
//   沿海袭击结算恒开(owner 拍板·2026-07 斩旗转正删 coastalRaidEnabled flag)。剧本/场景仍可经无沿海地块(不设 coastalDefense/无海贸)自然无海寇。navy「水师」面板已与 coastalDefense 合显。
(function (global) {
  'use strict';

  // 沿海地块判定：剧本标了 coastalDefense(沿海初值·内陆无此字段) 或有海贸账。
  function _isCoastal(leaf) {
    if (!leaf) return false;
    if (leaf.coastalDefense != null && leaf.coastalDefense !== '') return true;
    var eb = leaf.economyBase || {};
    return Number(eb.maritimeTradeVolume) > 0;
  }

  // 全 faction 叶(复用 A1a/A2a 同款取叶·覆盖所有势力非只玩家)
  function _allLeaves(G) {
    var ah = G && G.adminHierarchy;
    if (!ah) return [];
    var IB = global.IntegrationBridge;
    if (!IB || typeof IB.getLeafDivisions !== 'function') return [];
    var out = [];
    Object.keys(ah).forEach(function (fid) {
      var fl = IB.getLeafDivisions(ah, fid) || [];
      for (var i = 0; i < fl.length; i++) if (out.indexOf(fl[i]) < 0) out.push(fl[i]);
    });
    return out;
  }

  function tickCoastalRaid() {
    var G = global.GM;
    if (!G) return;
    var month = Number(G.month) || 1;
    if (month < 6 || month > 9) return;               // 仅夏秋风季·海寇活跃(通用季节非倭患专名)
    var leaves = _allLeaves(G);
    for (var i = 0; i < leaves.length; i++) {
      var leaf = leaves[i];
      if (!leaf || !_isCoastal(leaf)) continue;
      var coastalDef = Number(leaf.coastalDefense) || 0;
      // 海防慑止：基础 40% 概率·每档海防 -8%·封底 8%(海防再高也有海寇试探)
      var raidChance = Math.max(0.08, 0.4 - coastalDef * 0.08);
      if (Math.random() >= raidChance) continue;      // 未触发
      // 劫掠基础 = 海贸 25% + 商贸 5%·无海贸账兜底象征性
      var eb = leaf.economyBase || (leaf.economyBase = {});
      var maritime = Number(eb.maritimeTradeVolume) || 0;
      var commerce = Number(eb.commerceVolume) || 0;
      var baseLoot = Math.round(maritime * 0.25 + commerce * 0.05);
      if (baseLoot <= 0) baseLoot = 20000;
      // 海防抵扣：每档 15%·封顶 85%(海防再高也难全免)
      var mitigate = Math.min(0.85, coastalDef * 0.15);
      var loot = Math.round(baseLoot * (1 - mitigate));
      // 写损失：劫海贸 60% + 商贸 40%·降民心
      if (maritime > 0) eb.maritimeTradeVolume = Math.max(0, maritime - Math.round(loot * 0.6));
      if (commerce > 0) eb.commerceVolume = Math.max(0, commerce - Math.round(loot * 0.4));
      var mxLoss = Math.max(1, Math.min(5, Math.round(loot / 20000)));
      if (typeof leaf.minxin === 'number') leaf.minxin = Math.max(0, leaf.minxin - mxLoss);
      leaf._lastCoastalRaid = { turn: G.turn || 0, loot: loot, mitigate: mitigate };  // 可观测
      // 事件栏·玩家可见
      var nm = leaf.name || leaf.id || '沿海某地';
      if (typeof global.addEB === 'function') {
        try {
          global.addEB('沿海袭击', nm + ' 遭海寇劫掠·损失约 ' + loot + ' 两' +
            (coastalDef > 0 ? '（海防 ' + coastalDef + ' 档·抵 ' + Math.round(mitigate * 100) + '%）'
                            : '（无海防·损失惨重）'));
        } catch (e) {}
      }
    }
  }

  global.CoastalRaid = { tick: tickCoastalRaid, _isCoastal: _isCoastal };

  // 挂 SettlementPipeline·军备卷叶级结算群组之后(边境18/军费19/沿海袭击20)
  if (global.SettlementPipeline && typeof global.SettlementPipeline.register === 'function') {
    global.SettlementPipeline.register('coastalRaid', '沿海袭击', tickCoastalRaid, 20, 'perturn');
  }
})(typeof window !== 'undefined' ? window : this);
