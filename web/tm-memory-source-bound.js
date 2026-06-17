(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemorySourceBound = root.TM.MemorySourceBound || {};

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

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function hashText(value) {
    var MT = root.TM && root.TM.MemoryTrace;
    if (MT && typeof MT.hashText === 'function') return MT.hashText(value);
    var text = toText(value);
    var h1 = 0x811c9dc5;
    var h2 = 0x01000193;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 = Math.imul(h2 ^ c, 0x85ebca6b);
    }
    return 'h' + (h1 >>> 0).toString(16) + '-' + (h2 >>> 0).toString(16) + ':len' + text.length;
  }

  function safeHash(value) {
    return hashText(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+$/g, '');
  }

  function authorityRank(authority) {
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (ER && typeof ER.getAuthorityRank === 'function') return ER.getAuthorityRank(authority || 'unknown');
    var fallback = {
      engine_state: 100,
      player_pin: 90,
      rule_validated: 80,
      internal_sim_state: 78,
      official_record: 72,
      court_report: 66,
      structured_chronicle: 60,
      event_log: 58,
      raw_narrative: 50,
      ai_extracted: 45,
      ai_analysis: 40,
      ai_summary: 30,
      reflection: 24,
      procedural: 24,
      rumor: 20,
      unknown: 0
    };
    return fallback[clean(authority, 60)] || 0;
  }

  function normalizeRef(ref, fallback) {
    fallback = fallback || {};
    ref = ref || {};
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (ER && typeof ER.normalizeRef === 'function') {
      return ER.normalizeRef(ref, fallback);
    }
    var authority = clean(ref.authority || fallback.authority, 60) || 'unknown';
    var out = {
      type: clean(ref.type || fallback.type, 60) || 'unknown',
      id: clean(ref.id || fallback.id, 120) || 'unknown',
      authority: authority,
      authorityRank: ref.authorityRank != null ? Number(ref.authorityRank) : authorityRank(authority)
    };
    if (ref.turn != null || fallback.turn != null) out.turn = Number(ref.turn != null ? ref.turn : fallback.turn || 0);
    if (ref.visibility || fallback.visibility) out.visibility = clean(ref.visibility || fallback.visibility, 80);
    if (ref.lane || fallback.lane) out.lane = clean(ref.lane || fallback.lane, 80);
    if (ref.role || fallback.role) out.role = clean(ref.role || fallback.role, 80);
    return out;
  }

  function refKey(ref) {
    ref = ref || {};
    return clean(ref.type, 80) + ':' + clean(ref.id, 160);
  }

  function mergeBasisRefs(primary, secondary, opts) {
    opts = opts || {};
    var maxRefs = Math.max(1, Number(opts.maxRefs || 24));
    var fallback = opts.fallback || {};
    var out = [];
    var seen = {};
    function push(ref) {
      if (!ref || out.length >= maxRefs) return;
      var item = normalizeRef(ref, fallback);
      var key = refKey(item);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(item);
    }
    arr(primary).forEach(push);
    arr(secondary).forEach(push);
    arr(opts.extraRefs).forEach(push);
    return out;
  }

  function registryBasisRefs(GM, maxRefs) {
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (!ER || typeof ER.buildBasisRefs !== 'function') return [];
    try { return ER.buildBasisRefs(GM || {}, { maxRefs: maxRefs || 24 }) || []; } catch (_) { return []; }
  }

  function maxAuthorityRank(refs) {
    var max = 0;
    arr(refs).forEach(function(ref) {
      var rank = ref && ref.authorityRank != null ? Number(ref.authorityRank) : authorityRank(ref && ref.authority);
      if (isFinite(rank) && rank > max) max = rank;
    });
    return max;
  }

  function buildRecordMetadata(GM, opts) {
    opts = opts || {};
    GM = GM || {};
    var type = clean(opts.type || 'record', 60) || 'record';
    var turn = Number(opts.turn != null ? opts.turn : (GM.turn || 0));
    var text = toText(opts.text || opts.body || opts.content || '');
    var contentHash = safeHash(text);
    var id = clean(opts.id, 120) || (type + '-' + turn + '-' + contentHash.slice(0, 28));
    var authority = clean(opts.authority || opts.authorityLevel || 'official_record', 60) || 'official_record';
    var visibility = clean(opts.visibility || 'public', 80) || 'public';
    var lane = clean(opts.lane || 'L6_retrieved_evidence', 80) || 'L6_retrieved_evidence';
    var role = clean(opts.role || 'record', 80) || 'record';
    var sourceRef = normalizeRef({
      type: type,
      id: id,
      turn: turn,
      authority: authority,
      visibility: visibility,
      lane: lane,
      role: role
    });
    var registryRefs = opts.includeRegistry === false ? [] : registryBasisRefs(GM, opts.registryMaxRefs || opts.maxBasisRefs || 24);
    var basisRefs = mergeBasisRefs(
      arr(opts.aiBasisRefs).concat(arr(opts.basisRefs)),
      arr(opts.fallbackBasisRefs).concat(registryRefs),
      {
        maxRefs: opts.maxBasisRefs || 24,
        fallback: {
          authority: opts.basisAuthority || 'ai_extracted',
          turn: turn,
          visibility: visibility,
          lane: lane,
          role: 'basis'
        }
      }
    );
    return {
      id: id,
      contentHash: contentHash,
      sourceRefs: [sourceRef],
      basisRefs: basisRefs,
      evidenceRefs: basisRefs,
      authority: authority,
      authorityLevel: authority,
      authorityRank: authorityRank(authority),
      visibility: visibility,
      lane: lane,
      role: role,
      turn: turn,
      basisMaxAuthorityRank: maxAuthorityRank(basisRefs)
    };
  }

  function sourceRefsFromItem(item, opts, index) {
    opts = opts || {};
    item = item || {};
    var refs = [];
    var turn = item.turn != null ? item.turn : opts.turn;
    arr(item.sourceRefs).forEach(function(ref) { refs.push(ref); });
    arr(item.basisRefs).forEach(function(ref) { refs.push(ref); });
    arr(item.evidenceRefs).forEach(function(ref) { refs.push(ref); });
    if (item.id || item.key || item.uuid || item.turn != null) {
      refs.push({
        type: item.sourceType || opts.sourceItemType || opts.fallbackType || 'summarySource',
        id: item.id || item.key || item.uuid || ('item-' + (index || 0) + '-' + safeHash(item.content || item.text || item.summary || item.shizhengji || turn || index).slice(0, 20)),
        turn: turn,
        authority: item.authorityLevel || item.authority || opts.sourceAuthority || 'official_record',
        visibility: item.visibility || opts.visibility || 'public',
        lane: item.lane || opts.lane || 'L6_retrieved_evidence',
        role: 'summary_source'
      });
    }
    return refs;
  }

  function buildSummaryMetadata(GM, opts) {
    opts = opts || {};
    var sourceRefs = [];
    arr(opts.sourceItems).forEach(function(item, index) {
      sourceRefs = sourceRefs.concat(sourceRefsFromItem(item, opts, index));
    });
    var meta = buildRecordMetadata(GM, Object.assign({}, opts, {
      type: opts.type || 'memorySummary',
      authority: opts.authority || opts.authorityLevel || 'ai_summary',
      visibility: opts.visibility || 'public',
      lane: opts.lane || 'L7_summary_context',
      role: opts.role || 'summary',
      basisRefs: arr(opts.basisRefs),
      fallbackBasisRefs: sourceRefs.concat(arr(opts.fallbackBasisRefs)),
      includeRegistry: opts.includeRegistry === true
    }));
    meta.turnRange = clean(opts.turnRange, 80);
    meta.factStatus = opts.factStatus || 'summary';
    return meta;
  }

  ns.hashText = hashText;
  ns.safeHash = safeHash;
  ns.normalizeRef = normalizeRef;
  ns.mergeBasisRefs = mergeBasisRefs;
  ns.buildRecordMetadata = buildRecordMetadata;
  ns.buildSummaryMetadata = buildSummaryMetadata;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
