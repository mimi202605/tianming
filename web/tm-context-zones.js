(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.ContextZones = root.TM.ContextZones || {};

  var LANE_PRIORITY = {
    L1_world_truth: 100,
    L2_active_law_commitment: 90,
    L3_long_term_affair: 80,
    L4_dialogue_evidence: 70,
    L5_advisory_context: 60,
    L6_retrieved_evidence: 45,
    L7_chronicle_context: 40,
    L8_narrative_threads: 30
  };

  function toText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }

  function clean(value, maxLen) {
    var s = toText(value).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    return s.slice(0, maxLen || 240);
  }

  function estimateTokens(text) {
    var MT = root.TM && root.TM.MemoryTrace;
    if (MT && typeof MT.estimateTokens === 'function') return MT.estimateTokens(text);
    var value = toText(text);
    if (!value) return 0;
    var cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
    var other = Math.max(0, value.length - cjk);
    return Math.max(1, Math.ceil(cjk * 0.75 + other / 4));
  }

  function lanePriority(lane) {
    var key = clean(lane, 80);
    return LANE_PRIORITY[key] != null ? LANE_PRIORITY[key] : 10;
  }

  function normalizeZone(zone, index, opts) {
    zone = zone || {};
    opts = opts || {};
    var text = toText(zone.text || zone.content || '');
    var lane = clean(zone.lane || 'L6_retrieved_evidence', 80) || 'L6_retrieved_evidence';
    var cost = zone.tokenEstimate != null ? Number(zone.tokenEstimate || 0) : estimateTokens(text);
    return {
      id: clean(zone.id || zone.key || ('zone-' + index), 120) || ('zone-' + index),
      lane: lane,
      text: text,
      order: Number(zone.order != null ? zone.order : index),
      score: Number(zone.score != null ? zone.score : 0),
      mustKeep: zone.mustKeep === true,
      source: clean(zone.source || '', 80),
      reason: clean(zone.reason || '', 120),
      tokenEstimate: Math.max(0, cost),
      maxTokens: zone.maxTokens != null ? Number(zone.maxTokens || 0) : Number(opts.defaultMaxTokens || 0),
      authority: clean(zone.authority || '', 60),
      authorityRank: zone.authorityRank != null ? Number(zone.authorityRank) : null,
      visibility: clean(zone.visibility || '', 80),
      factStatus: clean(zone.factStatus || '', 80),
      sourceRefs: Array.isArray(zone.sourceRefs) ? zone.sourceRefs : [],
      basisRefs: Array.isArray(zone.basisRefs) ? zone.basisRefs : []
    };
  }

  function rankZone(zone) {
    return lanePriority(zone.lane) + (zone.mustKeep ? 1000 : 0) + Math.max(0, Math.min(1, zone.score || 0));
  }

  function sortByRank(a, b) {
    var d = rankZone(b) - rankZone(a);
    if (d) return d;
    return (a.order - b.order) || String(a.id).localeCompare(String(b.id));
  }

  function sortByOrder(a, b) {
    return (a.order - b.order) || String(a.id).localeCompare(String(b.id));
  }

  function suppressedZone(zone, reason, stage) {
    return {
      id: zone.id,
      source: zone.source || 'context_zone',
      lane: zone.lane,
      reason: reason || 'zone_filtered',
      budgetStage: stage || 'fill',
      cost: zone.tokenEstimate,
      textPreview: clean(zone.text, 80)
    };
  }

  function packZones(zones, opts) {
    opts = opts || {};
    var maxTokens = Math.max(0, Number(opts.maxTokens || 0));
    var input = (Array.isArray(zones) ? zones : [])
      .map(function(zone, index) { return normalizeZone(zone, index, opts); })
      .filter(function(zone) { return !!zone.text; });
    var selected = [];
    var suppressed = [];
    var used = 0;
    var selectedMap = {};
    var diagnostics = { kept: [], suppressed: [], guaranteed: 0, filled: 0, dropped: 0 };

    function canFit(zone) {
      // S4: per-zone cap — a zone whose own maxTokens is set cannot exceed it (prevents one section ballooning).
      if (zone.maxTokens && zone.tokenEstimate > zone.maxTokens) return false;
      return !maxTokens || (used + zone.tokenEstimate <= maxTokens);
    }

    function keep(zone, stage, force) {
      if (!zone || selectedMap[zone.id]) return false;
      if (!force && !canFit(zone)) return false;
      selectedMap[zone.id] = true;
      selected.push(zone);
      used += zone.tokenEstimate;
      diagnostics.kept.push({
        id: zone.id,
        lane: zone.lane,
        stage: stage || 'fill',
        cost: zone.tokenEstimate,
        order: zone.order
      });
      if (stage === 'must_keep') diagnostics.guaranteed++;
      else diagnostics.filled++;
      return true;
    }

    input.filter(function(zone) { return zone.mustKeep; }).sort(sortByRank).forEach(function(zone) {
      if (!keep(zone, 'must_keep', true)) return;
    });

    input.filter(function(zone) { return !zone.mustKeep; }).sort(sortByRank).forEach(function(zone) {
      if (selectedMap[zone.id]) return;
      if (!keep(zone, 'fill', false)) {
        var item = suppressedZone(zone, 'zone_budget_exceeded', 'fill');
        suppressed.push(item);
        diagnostics.suppressed.push(item);
        diagnostics.dropped++;
      }
    });

    var ordered = selected.slice().sort(sortByOrder);
    return {
      items: ordered,
      text: ordered.map(function(zone) { return zone.text; }).join(''),
      tokenEstimate: used,
      maxTokens: maxTokens,
      suppressed: suppressed,
      diagnostics: diagnostics
    };
  }

  function recordZoneInjection(GM, packed, opts) {
    opts = opts || {};
    var MT = root.TM && root.TM.MemoryTrace;
    if (!MT || typeof MT.recordInjection !== 'function' || !packed) return null;
    return MT.recordInjection(GM, {
      lane: 'context_zones',
      stage: opts.stage || 'context-zones',
      text: packed.text || '',
      tokenEstimate: packed.tokenEstimate,
      suppressed: packed.suppressed,
      items: (packed.items || []).map(function(zone) {
        return {
          id: zone.id,
          source: zone.source || 'context_zone',
          reason: zone.reason || 'context zone',
          lane: zone.lane,
          authority: zone.authority,
          authorityRank: zone.authorityRank,
          visibility: zone.visibility,
          factStatus: zone.factStatus,
          sourceRefs: zone.sourceRefs,
          basisRefs: zone.basisRefs
        };
      })
    });
  }

  ns.LANE_PRIORITY = LANE_PRIORITY;
  ns.estimateTokens = estimateTokens;
  ns.packZones = packZones;
  ns.recordZoneInjection = recordZoneInjection;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
