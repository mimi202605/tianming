(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryContextCompiler = root.TM.MemoryContextCompiler || {};

  var SECTION_ORDER = [
    'coreFacts',
    'courtRecords',
    'stateAffairs',
    'chronology',
    'characterMemory',
    'recentEvents',
    'relationshipFacts',
    'warnings'
  ];

  var SECTION_META = {
    coreFacts: ['core-facts', 'core facts'],
    courtRecords: ['court-records', 'court records and rulings'],
    stateAffairs: ['state-affairs', 'state affairs and unresolved political issues'],
    chronology: ['chronology', 'chronicle and annals'],
    characterMemory: ['character-memory', 'character memories and actor-scoped facts'],
    recentEvents: ['recent-events', 'recent events'],
    relationshipFacts: ['relationship-facts', 'relationship facts'],
    warnings: ['warnings', 'low authority or cautionary memories']
  };

  // S4(2026-06-03): 本地表数值对齐 MemoryEvidenceRegistry(canonical)，消除 F4 残留漂移 footgun。
  // authorityRank() 已 prefer ER；本表仅在 ER 不可用时作防御回退，对齐后即便回退也不产生口径分歧。
  var AUTHORITY_RANK = {
    engine_state: 100,
    player_pin: 90,
    rule_validated: 80,
    official_record: 72,
    court_report: 66,
    structured_chronicle: 60,
    event_log: 58,
    rule_validated_summary: 55,
    ai_extracted: 45,
    ai_summary: 30,
    vector: 28,
    procedural: 26,
    rumor: 20
  };

  var SOURCE_SECTION = {
    hard_state: 'coreFacts',
    imperialEdict: 'coreFacts',
    activeEdict: 'coreFacts',
    commitment: 'coreFacts',
    accepted_memory: 'coreFacts',
    strategic_issue: 'stateAffairs',
    issue_resolution: 'stateAffairs',
    issue_update: 'stateAffairs',
    ongoing_affair: 'stateAffairs',
    court_record: 'courtRecords',
    chronicle: 'chronology',
    chronicle_event: 'chronology',
    historiography_summary: 'chronology',
    qiju: 'chronology',
    shiji: 'chronology',
    character_memory: 'characterMemory',
    character_belief: 'characterMemory',
    relationship_event: 'characterMemory',
    court_dialogue_record: 'characterMemory',
    playerAction: 'recentEvents',
    eventHistory: 'recentEvents',
    jishi: 'recentEvents',
    relation_event: 'relationshipFacts',
    npc: 'relationshipFacts',
    rumor: 'warnings',
    vector: 'warnings',
    ai_summary: 'warnings',
    procedural: 'warnings'
  };

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

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

  function xml(value) {
    return toText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function safeTextOf(hit, maxLen) {
    hit = hit || {};
    var text = hit.safeBody != null && hit.safeBody !== ''
      ? hit.safeBody
      : (hit.text != null ? hit.text : (hit.event != null ? hit.event : (hit.content != null ? hit.content : hit.body)));
    text = clean(text, maxLen || 240);
    return text
      .replace(/ignore\s+previous\s+instructions?/ig, '[redacted-instruction]')
      .replace(/disregard\s+previous/ig, '[redacted-instruction]')
      .replace(/from\s+now\s+on/ig, '[redacted-instruction]')
      .replace(/[<>]/g, '');
  }

  function sourceOf(hit) {
    hit = hit || {};
    return clean(hit.source || (hit.char ? 'npc' : 'unknown'), 80);
  }

  function authorityRank(hit) {
    hit = hit || {};
    if (hit.authorityRank != null && isFinite(Number(hit.authorityRank))) return Number(hit.authorityRank);
    var key = clean(hit.authority || '', 80);
    // F4: MemoryEvidenceRegistry 为权威等级单一真相源（消除本地表与 ER 漂移）。
    // ER 识别该 key（返回 >0）则用 ER；ER 不识别(unknown=0)才回退本地表。
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (ER && typeof ER.getAuthorityRank === 'function' && key) {
      var r = Number(ER.getAuthorityRank(key));
      if (isFinite(r) && r > 0) return r;
    }
    return AUTHORITY_RANK[key] != null ? AUTHORITY_RANK[key] : 40;
  }

  function lanePriority(hit) {
    var CZ = root.TM && root.TM.ContextZones;
    var lane = clean(hit && hit.lane || '', 80);
    if (CZ && CZ.LANE_PRIORITY && CZ.LANE_PRIORITY[lane] != null) return Number(CZ.LANE_PRIORITY[lane]);
    if (lane === 'L1_world_truth') return 100;
    if (lane === 'L2_active_law_commitment') return 90;
    if (lane === 'L3_long_term_affair') return 80;
    if (lane === 'L4_dialogue_evidence') return 70;
    if (lane === 'L5_advisory_context') return 60;
    if (lane === 'L6_retrieved_evidence') return 45;
    if (lane === 'L7_chronicle_context') return 40;
    if (lane === 'L8_narrative_threads') return 30;
    return 20;
  }

  function recencyScore(hit, opts) {
    opts = opts || {};
    var cur = Number(opts.turn || 0);
    var turn = Number(hit && hit.turn || 0);
    if (!cur || !turn) return 0.5;
    var age = Math.max(0, cur - turn);
    if (age <= 1) return 1;
    if (age <= 5) return 0.8;
    if (age <= 12) return 0.6;
    if (age <= 40) return 0.35;
    return 0.15;
  }

  function normalizedScore(hit, opts) {
    hit = hit || {};
    var modelScore = hit._score != null ? Number(hit._score) : (hit.score != null ? Number(hit.score) : (hit.relevance != null ? Number(hit.relevance) : 0.5));
    if (!isFinite(modelScore)) modelScore = 0.5;
    var importance = hit.importance != null ? Number(hit.importance) : 5;
    if (!isFinite(importance)) importance = 5;
    return lanePriority(hit) * 10 +
      authorityRank(hit) * 4 +
      Math.max(0, Math.min(1, modelScore)) * 100 +
      Math.max(0, Math.min(10, importance)) * 8 +
      recencyScore(hit, opts) * 40;
  }

  function sectionFor(hit) {
    hit = hit || {};
    var src = sourceOf(hit);
    var type = clean(hit.type || hit.factStatus || '', 80);
    var authority = clean(hit.authority || '', 80);
    var lane = clean(hit.lane || '', 80);
    if (authority === 'rumor' || src === 'rumor') return 'warnings';
    if (src === 'court_record' || hit.type === 'court_resolution' || hit.factStatus === 'court_resolution' || hit.factStatus === 'court_record') return 'courtRecords';
    if (type === 'issue_resolution' || type === 'strategic_issue' || type === 'issue_update' || type === 'ongoing_affair') return 'stateAffairs';
    if (type === 'character_memory' || type === 'character_belief' || type === 'relationship_event' || type === 'court_dialogue_record') return 'characterMemory';
    if (type === 'chronicle_event' || type === 'historiography_summary') return 'chronology';
    if (lane === 'L1_world_truth' || lane === 'L2_active_law_commitment') return 'coreFacts';
    if (lane === 'L7_chronicle_context') return 'chronology';
    return SOURCE_SECTION[src] || 'recentEvents';
  }

  function compactRefList(list) {
    return arr(list).slice(0, 4).map(function(ref) {
      if (!ref) return '';
      var t = clean(ref.type || '', 40).replace(/\s+/g, '_');
      var id = clean(ref.id || '', 80).replace(/\s+/g, '_');
      return t && id ? (t + ':' + id) : '';
    }).filter(Boolean).join('|');
  }

  function normalizeHit(hit, index, opts) {
    hit = hit || {};
    var out = {};
    Object.keys(hit).forEach(function(k) { out[k] = hit[k]; });
    out.id = clean(out.id || out.key || out.uuid || ('hit-' + index), 120) || ('hit-' + index);
    out.source = sourceOf(out);
    out.type = clean(out.type || out.kind || '', 80);
    out.text = safeTextOf(out, opts && opts.perHitMaxChars || 180);
    out.turn = Number(out.turn || 0);
    out.authority = clean(out.authority || '', 80);
    out.authorityRank = authorityRank(out);
    out.lane = clean(out.lane || '', 80);
    out.visibility = clean(out.visibility || '', 80);
    out.factStatus = clean(out.factStatus || '', 80);
    out.sourceRefs = arr(out.sourceRefs);
    out.basisRefs = arr(out.basisRefs);
    out._compilerScore = normalizedScore(out, opts);
    return out;
  }

  function sortHits(a, b) {
    var d = Number(b._compilerScore || 0) - Number(a._compilerScore || 0);
    if (d) return d;
    d = Number(b.turn || 0) - Number(a.turn || 0);
    if (d) return d;
    return String(a.id).localeCompare(String(b.id));
  }

  function emptySections() {
    var out = {};
    SECTION_ORDER.forEach(function(key) { out[key] = []; });
    return out;
  }

  function flattenRecall(recallResults) {
    var out = [];
    (Array.isArray(recallResults) ? recallResults : []).forEach(function(group, gi) {
      var purpose = clean(group && group.query && group.query.purpose || '', 120);
      arr(group && group.hits).forEach(function(hit, hi) {
        var item = {};
        Object.keys(hit || {}).forEach(function(k) { item[k] = hit[k]; });
        item.queryPurpose = purpose;
        item._groupIndex = gi;
        item._hitIndex = hi;
        out.push(item);
      });
    });
    return out;
  }

  function renderHit(hit) {
    var attrs = [
      'id="' + xml(hit.id) + '"',
      'source="' + xml(hit.source) + '"',
      'turn="' + xml(hit.turn || 0) + '"'
    ];
    if (hit.authority) attrs.push('authority="' + xml(hit.authority) + '"');
    if (hit.authorityRank != null) attrs.push('authority-rank="' + xml(hit.authorityRank) + '"');
    if (hit.factStatus) attrs.push('fact-status="' + xml(hit.factStatus) + '"');
    if (hit.lane) attrs.push('lane="' + xml(hit.lane) + '"');
    if (hit.visibility) attrs.push('visibility="' + xml(hit.visibility) + '"');
    var sourceRefs = compactRefList(hit.sourceRefs);
    var basisRefs = compactRefList(hit.basisRefs);
    if (sourceRefs) attrs.push('source-refs="' + xml(sourceRefs) + '"');
    if (basisRefs) attrs.push('basis-refs="' + xml(basisRefs) + '"');
    return '    <memory ' + attrs.join(' ') + '>' + xml(hit.text) + '</memory>\n';
  }

  function renderSection(key, hits) {
    if (!hits.length) return '';
    var meta = SECTION_META[key] || [key, key];
    return '  <' + meta[0] + ' label="' + xml(meta[1]) + '">\n' +
      hits.map(renderHit).join('') +
      '  </' + meta[0] + '>\n';
  }

  function compileHits(hits, opts) {
    opts = opts || {};
    var normalized = (Array.isArray(hits) ? hits : [])
      .map(function(hit, index) { return normalizeHit(hit, index, opts); })
      .filter(function(hit) { return !!hit.text; })
      .sort(sortHits);
    var sections = emptySections();
    normalized.forEach(function(hit) {
      sections[sectionFor(hit)].push(hit);
    });

    var body = SECTION_ORDER.map(function(key) {
      return renderSection(key, sections[key]);
    }).filter(Boolean).join('');
    var text = '<memory-context schema-version="memory-context/v0">\n' + body + '</memory-context>\n';
    var suppressed = arr(opts.suppressed).slice();
    var packed = null;
    var CZ = root.TM && root.TM.ContextZones;
    if (CZ && typeof CZ.packZones === 'function' && opts.maxTokens) {
      var zones = [
        { id: 'memory-context-header', lane: 'L6_retrieved_evidence', text: '<memory-context schema-version="memory-context/v0">\n', mustKeep: true, order: 0, source: 'MemoryContextCompiler' }
      ];
      var order = 10;
      // S4: 低权威/大体量 section 的 per-zone 上限(占预算比)，防其 balloon 挤占其余高价值区。
      var ZONE_CAP_FRAC = { warnings: 0.25 };
      SECTION_ORDER.forEach(function(key) {
        var sectionText = renderSection(key, sections[key]);
        if (!sectionText) return;
        var z = {
          id: 'memory-context-' + key,
          lane: key === 'coreFacts' ? 'L1_world_truth' : (key === 'chronology' ? 'L7_chronicle_context' : 'L6_retrieved_evidence'),
          text: sectionText,
          order: order++,
          score: sections[key].reduce(function(max, hit) { return Math.max(max, Number(hit._compilerScore || 0)); }, 0) / 1200,
          source: 'MemoryContextCompiler',
          reason: key
        };
        // S4: 载重权威 section 永不被预算裁掉(ST「mandatory memory never trimmed」)。coreFacts=hard_state/法令/承诺/裁断级世界硬事实。
        if (key === 'coreFacts') z.mustKeep = true;
        if (ZONE_CAP_FRAC[key] && opts.maxTokens) z.maxTokens = Math.max(1, Math.floor(Number(opts.maxTokens) * ZONE_CAP_FRAC[key]));
        zones.push(z);
      });
      zones.push({ id: 'memory-context-footer', lane: 'L6_retrieved_evidence', text: '</memory-context>\n', mustKeep: true, order: 999999, source: 'MemoryContextCompiler' });
      packed = CZ.packZones(zones, { maxTokens: opts.maxTokens });
      text = packed.text || text;
      suppressed = suppressed.concat(arr(packed.suppressed));
    }

    return {
      schemaVersion: 'memory-context/v0',
      sections: sections,
      hits: normalized,
      text: text,
      zones: packed ? packed.items : [],
      suppressed: suppressed,
      diagnostics: packed ? packed.diagnostics : { kept: normalized.map(function(hit) { return { id: hit.id, source: hit.source, stage: 'compiled' }; }), suppressed: [] },
      tokenEstimate: packed ? packed.tokenEstimate : 0,
      maxTokens: Number(opts.maxTokens || 0)
    };
  }

  function compileRecall(recallResults, opts) {
    opts = opts || {};
    return compileHits(flattenRecall(recallResults), opts);
  }

  function compileFromGM(GM, opts) {
    opts = opts || {};
    var ME = root.TM && root.TM.MemoryEnvelope;
    var MR = root.TM && root.TM.MemoryRetrieval;
    if (!ME || typeof ME.collect !== 'function') {
      return compileHits([], opts);
    }
    var envelopes = ME.collect(GM || {}, { turn: opts.turn || (GM && GM.turn), sc1q: opts.sc1q });
    var hits = envelopes.map(function(env, index) {
      if (MR && typeof MR.hitFromEnvelope === 'function') return MR.hitFromEnvelope(env);
      return {
        id: env.id || ('env-' + index),
        source: env.type || 'unknown',
        type: env.type || '',
        text: env.safeBody || env.body || '',
        safeBody: env.safeBody || '',
        turn: env.turn,
        authority: env.authority,
        authorityRank: env.authorityRank,
        visibility: env.visibility,
        factStatus: env.factStatus,
        lane: env.lane,
        sourceRefs: env.sourceRefs,
        basisRefs: env.basisRefs,
        readScope: env.readScope,
        ownerScope: env.ownerScope
      };
    });
    var suppressed = [];
    // F-focus（2026-06-01·研究增强·非 Codex 原方案）：对本回合焦点实体相关的记忆做 relevance 加成，
    // 令 SC1_PRE_CONTEXT 在 token 预算受限时优先注入"与当下诏令/议题/对话相关"的记忆（Gen-Agents relevance）。
    if (MR && typeof MR.turnFocusTerms === 'function' && typeof MR.applyFocusRelevance === 'function') {
      try { MR.applyFocusRelevance(hits, MR.turnFocusTerms(GM, { sc1q: opts.sc1q })); } catch (_focusE) {}
    }
    if (MR && typeof MR.rankHitsDetailed === 'function') {
      var ranked = MR.rankHitsDetailed(hits, {
        GM: GM,
        turn: opts.turn || (GM && GM.turn),
        audience: opts.audience,
        actorScope: opts.actorScope,
        actorId: opts.actorId,
        factionId: opts.factionId,
        includeHidden: opts.includeHidden,
        includeFuture: opts.includeFuture,
        intent: opts.intent || 'historical_evidence',
        requiresAuthority: opts.requiresAuthority
      });
      hits = ranked.ranked || hits;
      suppressed = arr(ranked.suppressed);
    }
    var mergedOpts = {};
    Object.keys(opts).forEach(function(k) { mergedOpts[k] = opts[k]; });
    mergedOpts.suppressed = arr(opts.suppressed).concat(suppressed);
    return compileHits(hits, mergedOpts);
  }

  ns.SECTION_ORDER = SECTION_ORDER;
  ns.compileHits = compileHits;
  ns.compileRecall = compileRecall;
  ns.compileFromGM = compileFromGM;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
