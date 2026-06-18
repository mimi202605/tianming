// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-region-magnate.js
 * 地区经济·豪强坐大 × 勾结知府 × 吞田瞒税(跨朝代通用·供养魂)
 *
 * 命门:玩家的经济意志，要穿过「地方豪强 + 知府」这层活人，被吞蚀、瞒报、扭曲。
 *   富省若所托非人(贪庸知府)，豪强渐坐大 → 勾结知府 → 隐田漏赋 → 税基烂、民怨起、知府中饱；
 *   清强之吏则能抑兼并、靖一方。让"派谁守一方"真正决定那一方的死活。
 *
 * ★ 跨朝代通用铁律:豪强兼并、勾结地方官、隐田漏赋，乃汉之豪强、唐之兼并、明清乡绅
 *   一脉相承的中国古代通病。本引擎只用通用量(省财富 / 开发 / 知府品性 / 全国兼并风潮)，
 *   不含任何朝代专名(某朝特设的查抄机构那种特例归剧本数据)。
 *
 * flag: P.conf.useRegionMagnate(默认 on，显式 false 关)。数值保守渐进，不破坏既有平衡。
 *
 * 接入: tm-endturn-province.js 省结算 M4(governor 漂移)之后调 _tickProvinceMagnate。
 * 干预: 诏令 / AI 清丈田亩、查办豪强 → 调 _suppressProvinceMagnate 压其势。
 */
(function() {
  'use strict';
  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function _num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  function _mgEnabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return true; // 默认 on
    return P.conf.useRegionMagnate !== false;
  }

  // 省级豪强逻辑·每回合省结算调(M4 governor 漂移之后)
  // province: 省对象; gov: 知府 char(可空); ctx: { GM, P, months }
  function _tickProvinceMagnate(province, gov, ctx) {
    if (!_mgEnabled()) return;
    if (!province || typeof province !== 'object') return;
    ctx = ctx || {};
    var _ms = _num(ctx.months, 1);
    if (typeof province.magnatePower !== 'number') province.magnatePower = 12; // 初始低位

    var wealth = _num(province.wealth, 50);
    var govBen = gov ? _num(gov.benevolence, 50) : 50;    // 品德低 = 贪 = 纵容豪强
    var govAdm = gov ? _num(gov.administration, 50) : 50; // 能力低 = 压不住
    var natAnnex = (ctx.GM && ctx.GM.landAnnexation) ? _num(ctx.GM.landAnnexation.concentration, 0) : 0;
    var gentryFavor = _num(province.gentryFavor, 50);     // 接活死写字段:朝廷善待乡绅可安抚

    // ── 豪强坐大度变化:富庶 + 弱治 + 全国兼并风潮 → 涨; 清强之吏 + 乡绅安抚 → 落 ──
    var grow = 0;
    grow += (wealth - 50) * 0.012;          // 越富越易坐大
    grow += (50 - govBen) * 0.020;          // 知府越贪越纵容
    grow += (50 - govAdm) * 0.010;          // 知府越无能越压不住
    grow += natAnnex * 0.030;               // 全国兼并风潮裹挟
    grow -= (gentryFavor - 50) * 0.008;     // 朝廷善待乡绅可安抚(接活 gentryFavor)
    if (govBen > 65) grow -= (govBen - 65) * 0.030; // 清官主动抑兼并
    province.magnatePower = _clamp(province.magnatePower + grow * _ms, 0, 100);
    var mp = province.magnatePower;

    // ── 吞田瞒税:豪强势力直接侵蚀税基(隐田漏赋) ──
    if (mp >= 35) {
      var taxBite = mp / 400; // mp=100 → 上限 25%
      if (typeof province.taxRevenue === 'number') {
        province.taxRevenue = Math.max(0, province.taxRevenue * (1 - taxBite));
      }
      province.corruption = _clamp(_num(province.corruption, 0) + mp * 0.010 * _ms, 0, 100);
      province.unrest = _clamp(_num(province.unrest, 0) + (mp - 35) * 0.012 * _ms, 0, 100);
    }

    // ── 勾结知府:贪知府 + 豪强坐大 → 知府中饱(复用现成贪墨入账，进其私产) ──
    var collusion = (govBen < 45 && mp >= 50);
    if (collusion && gov) {
      var graft = _num(province.taxRevenue, 0) * 0.05;
      if (graft > 0 && typeof global !== 'undefined' && global.CharEconEngine && typeof global.CharEconEngine.addBribeIncome === 'function') {
        try { global.CharEconEngine.addBribeIncome(gov, graft, 0.7); } catch (_e) {}
      }
    }
    province._magnateCollusion = !!collusion;
    _syncMagnateStatus(province, mp, ctx);
    return mp;
  }

  // 玩家 / AI 干预:清丈田亩 / 查办豪强 → 压豪强势力(供诏令调)
  function _suppressProvinceMagnate(province, strength) {
    if (!province || typeof province.magnatePower !== 'number') return;
    province.magnatePower = _clamp(province.magnatePower - _num(strength, 20), 0, 100);
  }

  // Transfer-order attrition: en-route loss on grain/fiscal transfers (base seepage + national
  // magnate/annexation wave -- magnates & bandits skim transfers in transit). Couples to the magnate
  // engine: higher landAnnexation.concentration => harsher skimming. Same flag as _mgEnabled.
  function _transferAttritionRate(G) {
    if (!_mgEnabled()) return 0;
    var concentration = (G && G.landAnnexation && typeof G.landAnnexation.concentration === 'number') ? G.landAnnexation.concentration : 0;
    var rate = 0.03 + (concentration / 100) * 0.22; // base seepage 3% + up to +22% from the annexation wave
    rate += (Math.random() - 0.5) * 0.04;            // +/-2% jitter
    return _clamp(rate, 0, 0.35);                    // cap 35%
  }

  // Building politics: works-budget graft + corvee resentment. The supervising official (div.governor)
  // skims the construction budget by virtue (lower benevolence => bigger cut, into private wealth),
  // and a large levy stirs corvee resentment (minxin down / unrest up). Same flag as _mgEnabled.
  function _buildingPolitics(div, bld, P, GM) {
    if (!_mgEnabled()) return;
    if (!div || !bld) return;
    var cost = _num(bld.costActual, _num(bld.baseCost, 0));
    if (cost <= 0) return;
    // works-budget graft by the supervising official
    var govName = div.governor;
    var gov = (govName && typeof findCharByName === 'function') ? findCharByName(govName) : null;
    if (gov) {
      var govBen = _num(gov.benevolence, 50);
      var graftRate = _clamp((60 - govBen) / 200, 0, 0.25); // benevolence < 60 -> skim, up to 25%
      var graft = Math.round(cost * graftRate);
      if (graft > 0 && typeof global !== 'undefined' && global.CharEconEngine && typeof global.CharEconEngine.addBribeIncome === 'function') {
        try { global.CharEconEngine.addBribeIncome(gov, graft, 0.7); } catch (_e) {}
        bld._graft = graft;
      }
    }
    // corvee resentment: bigger works -> heavier levy -> popular discontent
    var corveeBurden = _clamp(cost / 200000, 0, 1); // ~200k cost = full burden
    if (corveeBurden > 0.05) {
      if (typeof spreadMinxin === 'function') { try { spreadMinxin(div, -corveeBurden * 3, 1); } catch (_e2) {} }
      if (typeof div.unrest === 'number') div.unrest = _clamp(div.unrest + corveeBurden * 4, 0, 100);
      bld._corveeBurden = Math.round(corveeBurden * 100) / 100;
    }
  }

  // 经济→民变打通 + 豪强可视化:豪强坐大到一定程度→给该省 division 挂「豪强坐大」状态卡。
  // 复用既有 RegionStatus:①状态卷显示卡片(玩家看得见) ②minxinPerTurn 压地方民心→既有 authority
  //   按省民变系统(读 div.minxin)自然感知豪强烂政→揭竿 ③econPct 减税闭环。跨朝代通用·零专名。
  function _findProvinceDiv(province, ctx) {
    if (!province) return null;
    var name = province.name || province.id;
    if (!name) return null;
    var G = (ctx && ctx.GM) || (typeof GM !== 'undefined' ? GM : null) || (typeof global !== 'undefined' && global.GM) || null;
    if (!G) return null;
    try {
      var PU = (typeof TM !== 'undefined' && TM.AIChange && TM.AIChange.PathUtils) || (typeof window !== 'undefined' && window.TM && window.TM.AIChange && window.TM.AIChange.PathUtils) || null;
      if (!PU) return null;
      if (PU.findDivisionByNameOrId) { var d = PU.findDivisionByNameOrId(G, name); if (d) return d; }
      if (PU.findDivisionByNameFuzzy) return PU.findDivisionByNameFuzzy(G, name);
    } catch (_) {}
    return null;
  }

  function _syncMagnateStatus(province, mp, ctx) {
    if (!_mgEnabled()) return;
    var div = _findProvinceDiv(province, ctx);
    if (!div) return;
    var G = (ctx && ctx.GM) || (typeof GM !== 'undefined' ? GM : null) || null;
    var RS = (typeof TM !== 'undefined' && TM.RegionStatus) || (typeof window !== 'undefined' && window.TM && window.TM.RegionStatus) || null;
    if (!RS || typeof RS.add !== 'function') return;
    if (mp >= 50) {
      var sev = _clamp((mp - 50) / 50, 0, 1); // 50→0, 100→1
      RS.add(div, {
        kind: 'event',
        name: '豪强坐大',
        desc: province._magnateCollusion ? '巨室兼并·隐田漏赋·勾结州县' : '巨室兼并·隐田漏赋',
        econPct: -(0.04 + sev * 0.08),     // -4%~-12% 税基(RegionStatus 再夹 ±25%)
        minxinPerTurn: -(0.4 + sev * 0.8), // -0.4~-1.2 民心/回合·压向既有民变阈值
        durationTurns: 4,                  // 每回合刷新续命;mp 退下则撤
        source: 'magnate'
      }, G);
    } else if (mp < 40 && typeof RS.remove === 'function') {
      try { RS.remove(div, '豪强坐大', 'magnate', G); } catch (_) {}
    }
  }

  if (typeof window !== 'undefined') {
    window._tickProvinceMagnate = _tickProvinceMagnate;
    window._suppressProvinceMagnate = _suppressProvinceMagnate;
    window._transferAttritionRate = _transferAttritionRate;
    window._buildingPolitics = _buildingPolitics;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _tickProvinceMagnate: _tickProvinceMagnate,
      _suppressProvinceMagnate: _suppressProvinceMagnate,
      _transferAttritionRate: _transferAttritionRate,
      _buildingPolitics: _buildingPolitics
    };
  }
})();
