// @ts-check
/// <reference path="types.d.ts" />
/*
 * tm-faction-derived-cohesion.js — 势力派生凝聚 6 维 (Phase B2·2026-05-10)
 *
 * 与 derivedHealth + derivedEconomy 并列。
 * 玩家 fac.cohesion 是 6 维硬填值·NPC 多数缺。
 * 这里从底层 (chars/parties/armies/population) 算出 NPC 的 6 维派生凝聚。
 *
 * 6 维:
 *   political   政治凝聚 = derivedHealth.courtCohesion (已算·alias)
 *   military    军事凝聚 = (militaryControl + militaryStability) / 2 (复用 derivedHealth)
 *   economic    经济凝聚 = derivedEconomy.economyHealth (B1 已算)
 *   cultural    文化凝聚 = fac.cultureLevel·缺则 50 (后续 derive from techLevel + 文教 chars)
 *   ethnic      族群凝聚 = 主体族占比 × 100·population.ethnicities[max] × 100·缺则 80 (默认主体占多)
 *   loyalty     忠诚均值 = derivedHealth._source.avgLoyalty·缺则 50
 *
 * 写到 GM.facs[i].derivedCohesion = { political, military, economic, cultural, ethnic, loyalty, overall, labels }
 */
(function(global) {
  'use strict';

  function _safeNum(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function _clamp(v, lo, hi) { if (v < lo) return lo; if (v > hi) return hi; return v; }

  function _label(v) {
    var t = (global.TM && global.TM.FactionDerived && global.TM.FactionDerived.DEFAULTS && global.TM.FactionDerived.DEFAULTS.thresholds) || { hao: 70, ping: 50, ruo: 30 };
    var override = global.TM && global.TM.FactionDerived && global.TM.FactionDerived.config && global.TM.FactionDerived.config.thresholds;
    if (override) t = Object.assign({}, t, override);
    if (v >= t.hao) return '健';
    if (v >= t.ping) return '平';
    if (v >= t.ruo) return '弱';
    return '危';
  }

  function _ethnicScore(population) {
    if (!population || typeof population !== 'object') return 80;
    var eth = population.ethnicities;
    if (!eth || typeof eth !== 'object' || Object.keys(eth).length === 0) return 80;
    var max = 0;
    Object.keys(eth).forEach(function(k){
      var v = _safeNum(eth[k]);
      if (v > max) max = v;
    });
    if (max === 0) return 80;
    if (max <= 1) return Math.round(max * 100);  // 0.95 → 95
    return Math.round(max);  // 已经是 0-100 数
  }

  function _computeOne(fac) {
    if (!fac || !fac.name) return null;
    var dh = fac.derivedHealth || null;
    var de = fac.derivedEconomy || null;

    // political = derivedHealth.courtCohesion·缺则 fac.cohesion.political·再 fallback 50
    var political = (dh && typeof dh.courtCohesion === 'number') ? dh.courtCohesion
                  : (fac.cohesion && _safeNum(fac.cohesion.political)) || 50;

    // military = avg(militaryControl, militaryStability)·缺则 fac.cohesion.military·再 fallback 50
    var military;
    if (dh && typeof dh.militaryControl === 'number' && typeof dh.militaryStability === 'number') {
      military = Math.round((dh.militaryControl + dh.militaryStability) / 2);
    } else {
      military = (fac.cohesion && _safeNum(fac.cohesion.military)) || 50;
    }

    // economic = derivedEconomy.economyHealth·缺则 fac.cohesion.economic·再 fallback 50
    var economic = (de && typeof de.economyHealth === 'number') ? de.economyHealth
                 : (fac.cohesion && _safeNum(fac.cohesion.economic)) || 50;

    // cultural = fac.cultureLevel (剧本字段)·缺则 fac.cohesion.cultural·再 fallback 50
    var cultural = _safeNum(fac.cultureLevel) || (fac.cohesion && _safeNum(fac.cohesion.cultural)) || 50;

    // ethnic = 主体族占比·缺则 fac.cohesion.ethnic·再 fallback 80 (单一族群默认)
    var ethnic = _ethnicScore(fac.population);
    if (ethnic === 80 && fac.cohesion && typeof fac.cohesion.ethnic === 'number') {
      ethnic = fac.cohesion.ethnic;
    }

    // loyalty = derivedHealth._source.avgLoyalty·缺则 fac.cohesion.loyalty·再 fallback 50
    var loyalty;
    if (dh && dh._source && typeof dh._source.avgLoyalty === 'number' && dh._source.avgLoyalty > 0) {
      loyalty = dh._source.avgLoyalty;
    } else {
      loyalty = (fac.cohesion && _safeNum(fac.cohesion.loyalty)) || 50;
    }

    political = _clamp(Math.round(political), 0, 100);
    military = _clamp(Math.round(military), 0, 100);
    economic = _clamp(Math.round(economic), 0, 100);
    cultural = _clamp(Math.round(cultural), 0, 100);
    ethnic = _clamp(Math.round(ethnic), 0, 100);
    loyalty = _clamp(Math.round(loyalty), 0, 100);

    var overall = Math.round((political + military + economic + cultural + ethnic + loyalty) / 6);

    return {
      political: political,
      military: military,
      economic: economic,
      cultural: cultural,
      ethnic: ethnic,
      loyalty: loyalty,
      overall: overall,
      labels: {
        political: _label(political),
        military: _label(military),
        economic: _label(economic),
        cultural: _label(cultural),
        ethnic: _label(ethnic),
        loyalty: _label(loyalty),
        overall: _label(overall)
      },
      _source: {
        politicalFrom: dh ? 'derivedHealth.courtCohesion' : (fac.cohesion ? 'fac.cohesion.political' : 'fallback'),
        militaryFrom: dh ? 'derivedHealth.{mc,ms}/2' : (fac.cohesion ? 'fac.cohesion.military' : 'fallback'),
        economicFrom: de ? 'derivedEconomy.economyHealth' : (fac.cohesion ? 'fac.cohesion.economic' : 'fallback'),
        culturalFrom: fac.cultureLevel ? 'fac.cultureLevel' : (fac.cohesion && fac.cohesion.cultural ? 'fac.cohesion.cultural' : 'fallback'),
        ethnicFrom: (fac.population && fac.population.ethnicities && Object.keys(fac.population.ethnicities).length > 0) ? 'fac.population.ethnicities[max]' : 'fallback',
        loyaltyFrom: (dh && dh._source && dh._source.avgLoyalty > 0) ? 'derivedHealth.avgLoyalty' : (fac.cohesion ? 'fac.cohesion.loyalty' : 'fallback')
      }
    };
  }

  function compute() {
    if (typeof global.GM === 'undefined') return null;
    var GM = global.GM;
    if (!Array.isArray(GM.facs)) return null;

    var out = {};
    GM.facs.forEach(function(f) {
      if (!f || !f.name) return;
      var dc = _computeOne(f);
      if (dc) {
        f.derivedCohesion = dc;
        out[f.name] = dc;
      }
    });
    return out;
  }

  function getFor(facName) {
    if (typeof global.GM === 'undefined') return null;
    if (!Array.isArray(global.GM.facs)) return null;
    var f = global.GM.facs.find(function(x){ return x && x.name === facName; });
    return (f && f.derivedCohesion) || null;
  }

  global.TM = global.TM || {};
  global.TM.FactionDerivedCohesion = {
    compute: compute,
    getFor: getFor,
    _computeOne: _computeOne
  };
})(typeof window !== 'undefined' ? window : globalThis);
