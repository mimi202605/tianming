// @ts-check
/// <reference path="types.d.ts" />
/*
 * tm-faction-personality.js — char personality → 决策 hints (Phase F1·2026-05-10)
 *
 * 把 char.{ambition, wuchangOverride, traits, behaviorMode, valueSystem} 这些
 * 丰富的人格字段·浓缩成 4-6 个 0-1 hint·让 NPC memorial/edict/chaoyi/office
 * 决策权重不同 char 不同·消除"机械重复"。
 *
 * Hints (0-1·0=低·1=高):
 *   aggressiveness  攻击性·军务/攻讦/宣战倾向
 *   suspicion       猜疑·密奏/罢撤/谋反警觉
 *   generosity      慷慨·赏赐/安抚/补饷
 *   ambition        野心·扩张/僭越/夺位
 *   conservatism    保守·罢党争/巡抚/维稳
 *   loyaltyToRuler  对君忠诚 (chars 个体维度·非派生)
 *
 * API:
 *   TM.FactionPersonality.hintsFor(char) → {aggressiveness, ...}
 *   TM.FactionPersonality.weightAdjust(baseWeight, hintFactor, intensity) → adjusted
 */
(function(global) {
  'use strict';

  function _safeNum(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // traits → hints 映射 (一个 trait 影响多个 hint)
  var TRAIT_HINTS = {
    ambitious:   { aggressiveness: 0.6, ambition: 0.8 },
    patient:     { aggressiveness: -0.4, conservatism: 0.5 },
    just:        { suspicion: -0.3, generosity: 0.4 },
    cruel:       { aggressiveness: 0.5, generosity: -0.6, suspicion: 0.4 },
    callous:     { generosity: -0.5, conservatism: 0.2 },
    brave:       { aggressiveness: 0.4 },
    arrogant:    { suspicion: 0.3, conservatism: -0.3 },
    impatient:   { aggressiveness: 0.5, conservatism: -0.5 },
    stubborn:    { conservatism: 0.4, suspicion: 0.2 },
    deceitful:   { suspicion: 0.6, generosity: -0.3 },
    gregarious:  { generosity: 0.4, suspicion: -0.3 },
    vengeful:    { aggressiveness: 0.4, suspicion: 0.5 },
    paranoid:    { suspicion: 0.7, generosity: -0.3 },
    arbitrary:   { suspicion: 0.3, conservatism: -0.2 },
    greedy:      { generosity: -0.5, ambition: 0.3 },
    calm:        { aggressiveness: -0.3, conservatism: 0.3 },
    cautious:    { suspicion: 0.3, conservatism: 0.4 }
  };

  function hintsFor(char) {
    if (!char) return {
      aggressiveness: 0.5, suspicion: 0.5, generosity: 0.5,
      ambition: 0.5, conservatism: 0.5, loyaltyToRuler: 0.5
    };

    // 基线 0.5
    var h = {
      aggressiveness: 0.5,
      suspicion: 0.5,
      generosity: 0.5,
      ambition: 0.5,
      conservatism: 0.5,
      loyaltyToRuler: 0.5
    };

    // 1. ambition 字段直接给 ambition + aggressiveness 加分
    var amb = _safeNum(char.ambition) / 100;
    if (amb > 0) {
      h.ambition = _clamp(amb, 0, 1);
      h.aggressiveness = _clamp(h.aggressiveness + (amb - 0.5) * 0.5, 0, 1);
    }

    // 2. wuchangOverride 五常
    var wc = char.wuchangOverride || {};
    var ren = _safeNum(wc['仁']) / 100;     // 仁高 → generosity
    var yi = _safeNum(wc['义']) / 100;      // 义高 → loyaltyToRuler
    var li = _safeNum(wc['礼']) / 100;      // 礼高 → conservatism
    var zhi = _safeNum(wc['智']) / 100;     // 智高 → suspicion (复杂决策·更易猜疑)
    var xin = _safeNum(wc['信']) / 100;     // 信高 → suspicion 反·generosity
    if (ren > 0) h.generosity = _clamp(h.generosity + (ren - 0.5) * 0.6, 0, 1);
    if (yi > 0) h.loyaltyToRuler = _clamp(h.loyaltyToRuler + (yi - 0.5) * 0.7, 0, 1);
    if (li > 0) h.conservatism = _clamp(h.conservatism + (li - 0.5) * 0.5, 0, 1);
    if (zhi > 0) h.suspicion = _clamp(h.suspicion + (zhi - 0.5) * 0.3, 0, 1);
    if (xin > 0) {
      h.generosity = _clamp(h.generosity + (xin - 0.5) * 0.3, 0, 1);
      h.suspicion = _clamp(h.suspicion - (xin - 0.5) * 0.4, 0, 1);
    }

    // 3. traits 数组叠加
    if (Array.isArray(char.traits)) {
      char.traits.forEach(function(t) {
        var deltas = TRAIT_HINTS[t];
        if (!deltas) return;
        Object.keys(deltas).forEach(function(k) {
          if (typeof h[k] === 'number') {
            h[k] = _clamp(h[k] + deltas[k] * 0.3, 0, 1);
          }
        });
      });
    }

    // 4. behaviorMode 关键字
    var bm = String(char.behaviorMode || '');
    if (bm.indexOf('隐忍') >= 0) { h.aggressiveness = _clamp(h.aggressiveness - 0.2, 0, 1); h.suspicion = _clamp(h.suspicion + 0.1, 0, 1); }
    if (bm.indexOf('急进') >= 0) { h.aggressiveness = _clamp(h.aggressiveness + 0.3, 0, 1); h.conservatism = _clamp(h.conservatism - 0.2, 0, 1); }
    if (bm.indexOf('独断') >= 0) { h.suspicion = _clamp(h.suspicion + 0.2, 0, 1); }
    if (bm.indexOf('阴狠') >= 0) { h.suspicion = _clamp(h.suspicion + 0.4, 0, 1); h.generosity = _clamp(h.generosity - 0.3, 0, 1); }
    if (bm.indexOf('笼络') >= 0) { h.generosity = _clamp(h.generosity + 0.3, 0, 1); }
    if (bm.indexOf('沉默') >= 0 || bm.indexOf('观察') >= 0) { h.conservatism = _clamp(h.conservatism + 0.2, 0, 1); }
    if (bm.indexOf('柔克') >= 0) { h.conservatism = _clamp(h.conservatism + 0.2, 0, 1); h.aggressiveness = _clamp(h.aggressiveness - 0.1, 0, 1); }

    // 5. char.loyalty 字段直接用作 loyaltyToRuler
    if (typeof char.loyalty === 'number') {
      h.loyaltyToRuler = _clamp(h.loyaltyToRuler * 0.4 + (char.loyalty / 100) * 0.6, 0, 1);
    }

    return h;
  }

  // 调权·若 hint 高于 0.5·base 加成；低于·base 减
  function weightAdjust(baseWeight, hintValue, intensity) {
    if (typeof intensity !== 'number') intensity = 1.0;
    return baseWeight * (1 + (hintValue - 0.5) * intensity);
  }

  global.TM = global.TM || {};
  global.TM.FactionPersonality = {
    hintsFor: hintsFor,
    weightAdjust: weightAdjust,
    TRAIT_HINTS: TRAIT_HINTS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { hintsFor: hintsFor, weightAdjust: weightAdjust };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
