// @ts-check
/*
 * tm-party-class-tuning.js
 * Central tuning table for party/class signals, decay, and actor thresholds.
 */
(function(global) {
  'use strict';

  var TM = global.TM = global.TM || {};

  function clone(v) {
    if (v === undefined || v === null) return v;
    try { return JSON.parse(JSON.stringify(v)); }
    catch (_) {
      if (Array.isArray(v)) return v.slice();
      if (typeof v === 'object') {
        var out = {};
        Object.keys(v).forEach(function(k) { out[k] = v[k]; });
        return out;
      }
      return v;
    }
  }

  function isPlainObject(v) {
    return !!(v && typeof v === 'object' && !Array.isArray(v));
  }

  function mergeDeep(base, override) {
    var out = clone(base) || {};
    if (!isPlainObject(override)) return out;
    Object.keys(override).forEach(function(k) {
      if (isPlainObject(out[k]) && isPlainObject(override[k])) out[k] = mergeDeep(out[k], override[k]);
      else out[k] = clone(override[k]);
    });
    return out;
  }

  function getPath(obj, path) {
    if (!path) return obj;
    var cur = obj;
    String(path).split('.').forEach(function(part) {
      if (cur === undefined || cur === null) return;
      cur = cur[part];
    });
    return cur;
  }

  function pickRoot(root) {
    if (root && typeof root === 'object') return root;
    if (global.GM && typeof global.GM === 'object') return global.GM;
    if (global.scriptData && typeof global.scriptData === 'object') return global.scriptData;
    if (global.P && typeof global.P === 'object') return global.P;
    return {};
  }

  var DEFAULTS = {
    socialSignals: {
      decayPerTurn: 0.035,
      confidenceDecayCap: 0.32,
      escalationAfter: 3,
      expireAfter: 10,
      escalationIntensity: 0.65,
      resolvedIntensityFactor: 0.35,
      resolvedConfidenceFactor: 0.65,
      thresholds: {
        peasantBurden: 0.7,
        taxPressure: 0.7,
        forcedConscription: 0.65,
        landAnnexation: 0.68,
        corruption: 65,
        kejuFairness: 45,
        kejuAdmissionShock: 0.35,
        officeDonation: 0.65,
        partyPurge: 0.6,
        samePartyAppointment: 0.65,
        militaryArrears: 0.5,
        localRevoltRisk: 0.65
      },
      severityBases: {
        taxPressure: 0.65,
        localRevoltRisk: 0.6
      }
    },
    actors: {
      petitionSatisfaction: 55,
      associationInfluence: 60,
      strikeSatisfaction: 35,
      strikeUnrest: 60,
      revoltSatisfaction: 28,
      revoltUnrest: 75,
      memoryEscalationAge: 2,
      memoryConfidenceDecayPerTurn: 0.015,
      memoryConfidenceDecayCap: 0.14,
      resolvedConfidenceFactor: 0.55,
      expiredConfidenceFactor: 0.55,
      memoryMinConfidence: 0.08,
      classActionExpiry: {
        petition: 3,
        association: 5,
        strike: 2,
        revolt_seed: 2
      },
      partyActionExpiry: {
        memorial: 4,
        propaganda: 3,
        obstruction: 2,
        funding: 4,
        alliance: 5,
        split: 3
      }
    }
  };

  function sourceOverride(root) {
    root = pickRoot(root);
    var out = {};
    if (root.engineConstants && root.engineConstants.partyClassTuning) out = mergeDeep(out, root.engineConstants.partyClassTuning);
    if (root.partyClassTuning) out = mergeDeep(out, root.partyClassTuning);
    if (root.tuning && root.tuning.partyClass) out = mergeDeep(out, root.tuning.partyClass);
    if (global.scriptData && global.scriptData.partyClassTuning) out = mergeDeep(out, global.scriptData.partyClassTuning);
    if (global.P && global.P.conf && global.P.conf.partyClassTuning) out = mergeDeep(out, global.P.conf.partyClassTuning);
    return out;
  }

  function get(root) {
    return mergeDeep(DEFAULTS, sourceOverride(root));
  }

  function read(root, path, fallback) {
    var value = getPath(get(root), path);
    return value === undefined ? fallback : clone(value);
  }

  function number(root, path, fallback) {
    var n = Number(read(root, path, fallback));
    return isFinite(n) ? n : fallback;
  }

  function configure(root, override) {
    root = pickRoot(root);
    root.partyClassTuning = mergeDeep(root.partyClassTuning || {}, override || {});
    return get(root);
  }

  TM.PartyClassTuning = {
    defaults: function() { return clone(DEFAULTS); },
    get: get,
    read: read,
    number: number,
    configure: configure,
    _mergeDeep: mergeDeep
  };

  global.PartyClassTuning = TM.PartyClassTuning;

  if (typeof module !== 'undefined' && module.exports) module.exports = TM.PartyClassTuning;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
