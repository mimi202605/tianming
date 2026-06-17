// @ts-check
/// <reference path="types.d.ts" />
/*
 * tm-faction-derived-strength.js — 势力派生综合实力 (Phase B3·2026-05-10)
 *
 * 顶层综合指标·把 derivedHealth + derivedEconomy + derivedCohesion 三层 metrics 收成 1 数。
 * 替代 fac.strength 直读·让 NPC strength 有 derivation chain。
 *
 * 公式 (0-100):
 *   strength = 0.30 × healthOverall      (4 健康度均值)
 *            + 0.25 × economyHealth      (财政健)
 *            + 0.25 × cohesionOverall    (6 凝聚均值)
 *            + 0.20 × militaryScale      (兵规模归一)
 *
 *   militaryScale (0-100): log10(soldiers+1) × 12·上限 100 (10w 兵 ≈ 60·100w 兵 ≈ 72·1000w 兵 ≈ 84)
 *
 * 写到 GM.facs[i].derivedStrength = { value, label, breakdown, _source }
 * 与 fac.strength (静态字段) 共存·UI/AI 优先读 derived。
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

  function _militaryScale(soldiers) {
    if (!soldiers || soldiers < 1) return 0;
    var v = Math.log(soldiers + 1) / Math.LN10 * 12;
    return _clamp(Math.round(v), 0, 100);
  }

  function _computeOne(fac) {
    if (!fac || !fac.name) return null;
    var dh = fac.derivedHealth || null;
    var de = fac.derivedEconomy || null;
    var dc = fac.derivedCohesion || null;

    var healthOverall = (dh && typeof dh.overall === 'number') ? dh.overall : 50;
    var economyHealth = (de && typeof de.economyHealth === 'number') ? de.economyHealth : 50;
    var cohesionOverall = (dc && typeof dc.overall === 'number') ? dc.overall : 50;
    var soldiers = (de && typeof de.militaryStrength === 'number') ? de.militaryStrength : _safeNum(fac.militaryStrength);
    var milScale = _militaryScale(soldiers);

    var strength = Math.round(
      0.30 * healthOverall +
      0.25 * economyHealth +
      0.25 * cohesionOverall +
      0.20 * milScale
    );
    strength = _clamp(strength, 0, 100);

    return {
      value: strength,
      label: _label(strength),
      breakdown: {
        healthOverall: healthOverall,
        economyHealth: economyHealth,
        cohesionOverall: cohesionOverall,
        militaryScale: milScale
      },
      weights: {
        health: 0.30,
        economy: 0.25,
        cohesion: 0.25,
        military: 0.20
      },
      _source: {
        soldiers: soldiers,
        derivedHealthOverall: dh ? 'derivedHealth.overall' : 'fallback 50',
        derivedEconomyHealth: de ? 'derivedEconomy.economyHealth' : 'fallback 50',
        derivedCohesionOverall: dc ? 'derivedCohesion.overall' : 'fallback 50',
        militaryFromDerivedEconomy: !!de
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
      var ds = _computeOne(f);
      if (ds) {
        f.derivedStrength = ds;
        out[f.name] = ds;
      }
    });
    return out;
  }

  function getFor(facName) {
    if (typeof global.GM === 'undefined') return null;
    if (!Array.isArray(global.GM.facs)) return null;
    var f = global.GM.facs.find(function(x){ return x && x.name === facName; });
    return (f && f.derivedStrength) || null;
  }

  global.TM = global.TM || {};
  global.TM.FactionDerivedStrength = {
    compute: compute,
    getFor: getFor,
    _computeOne: _computeOne,
    _militaryScale: _militaryScale
  };
})(typeof window !== 'undefined' ? window : globalThis);
