(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryTurnBackfill = root.TM.MemoryTurnBackfill || {};
  var SCHEMA_VERSION = 'memory-turn-backfill/v0';
  var ARCHIVE_SCHEMA_VERSION = 'memory-turn-archive/v0';
  var PROJECTION_VERSION = 1;
  var LEGACY_SOURCE_TYPE = 'legacyBackfill';
  var DEFAULT_CAP = 80;

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
    return s.slice(0, maxLen || 400);
  }

  function slug(value, fallback) {
    var s = clean(value, 160).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return s || fallback || 'item';
  }

  function numberOr(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : Number(fallback || 0);
  }

  function turnOf(item, fallback) {
    item = item || {};
    return numberOr(item.turn != null ? item.turn : (item.turnNo != null ? item.turnNo : item.round), fallback);
  }

  function sourceRef(type, id, body, extra) {
    var ME = root.TM && root.TM.MemoryEnvelope;
    if (ME && typeof ME.sourceRef === 'function') return ME.sourceRef(type, id, body, extra || {});
    var ref = { type: clean(type, 60) || 'unknown', id: clean(id, 120) || 'unknown' };
    if (extra && extra.turn != null) ref.turn = Number(extra.turn || 0);
    return ref;
  }

  function compactRefs(list, fallbackTurn) {
    var out = [];
    var seen = {};
    arr(list).forEach(function(ref) {
      if (!ref) return;
      var type = clean(ref.type, 60);
      var id = clean(ref.id, 120);
      if (!type || !id) return;
      var key = type + ':' + id;
      if (seen[key]) return;
      seen[key] = true;
      var item = { type: type, id: id };
      if (ref.turn != null || fallbackTurn != null) item.turn = Number(ref.turn != null ? ref.turn : fallbackTurn);
      if (ref.authority) item.authority = clean(ref.authority, 80);
      if (ref.lane) item.lane = clean(ref.lane, 80);
      if (ref.role) item.role = clean(ref.role, 80);
      out.push(item);
    });
    return out.slice(0, 16);
  }

  function issueResolved(issue) {
    issue = issue || {};
    return !!(issue.resolution || issue.result || issue.outcome || issue.playerChoice ||
      issue.resolvedTurn || issue.resolvedAtTurn || clean(issue.status, 40).toLowerCase() === 'resolved');
  }

  function actorScope(actor) {
    actor = clean(actor, 120);
    if (!actor) return '';
    return /^npc:/i.test(actor) ? actor : ('npc:' + actor);
  }

  function visibilityReadScope(item, actor) {
    item = item || {};
    var vis = clean(item.visibility || item.readScope || '', 80).toLowerCase();
    if (item.private === true || vis === 'secret' || vis === 'private' || vis === 'npc_private' || vis === 'gm_hidden' || vis === 'gm_only') {
      return actor ? actorScope(actor) : 'system';
    }
    return clean(item.readScope, 120) || 'public';
  }

  function qijuAuthority(q) {
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (ER && typeof ER.qijuAuthority === 'function') return ER.qijuAuthority(q);
    if (q && (q.edicts || q.xinglu || q.memorials || q.edictsSource)) return 'player_pin';
    if (q && q.zhengwen) return 'official_record';
    return 'event_log';
  }

  function qijuBody(q) {
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (ER && typeof ER.qijuBody === 'function') return ER.qijuBody(q);
    q = q || {};
    return [q.edicts, q.xinglu, q.memorials, q.zhengwen, q.content, q.category].filter(Boolean).map(toText).join(' ');
  }

  function saveIdOf(GM) {
    return clean(GM && (GM.saveId || GM.saveName || GM.sid), 120);
  }

  function worldIdOf(GM) {
    return clean(GM && (GM.worldId || GM.scenarioId || GM.sid), 120);
  }

  function bundleId(turn) {
    return 'legacy-turn-archive-' + Number(turn || 0);
  }

  function basisRefsFrom(item, fallbackType, fallbackId, fallbackTurn, body, authority, lane, role) {
    item = item || {};
    var refs = arr(item.basisRefs)
      .concat(arr(item.evidenceRefs))
      .concat(arr(item.sourceRefs))
      .concat(arr(item.source_refs));
    if (!refs.length && fallbackType && fallbackId) {
      refs.push({ type: fallbackType, id: fallbackId, turn: fallbackTurn, authority: authority, lane: lane, role: role });
    }
    return compactRefs(refs, fallbackTurn);
  }

  function baseSourceRefs(turn, sourceType, id, body, basisRefs) {
    return compactRefs([
      sourceRef(LEGACY_SOURCE_TYPE, bundleId(turn), body, { turn: turn }),
      sourceRef(sourceType, id, body, { turn: turn })
    ].concat(arr(basisRefs)), turn);
  }

  function ensureBucket(map, GM, turn, opts) {
    opts = opts || {};
    turn = Number(turn || 0);
    if (!turn) turn = Number((GM && GM.turn) || opts.turn || 0);
    if (!map[turn]) {
      map[turn] = {
        id: bundleId(turn),
        schemaVersion: ARCHIVE_SCHEMA_VERSION,
        projectionVersion: PROJECTION_VERSION,
        sourceType: LEGACY_SOURCE_TYPE,
        sourceId: 'legacy-history',
        turn: turn,
        year: '',
        dateLabel: '',
        saveId: saveIdOf(GM),
        worldId: worldIdOf(GM),
        sourceRefs: [],
        createdAt: Date.now(),
        legacyBackfill: {
          schemaVersion: SCHEMA_VERSION,
          projectionVersion: PROJECTION_VERSION
        },
        chronicle: [],
        stateAffairs: [],
        characterEvents: []
      };
    }
    return map[turn];
  }

  function updateBundleMeta(bundle, item) {
    if (!bundle || !item) return;
    if (!bundle.year) bundle.year = clean(item.year || item.currentYear || item.yearKey, 40);
    if (!bundle.dateLabel) bundle.dateLabel = clean(item.dateLabel || item.date || item.timeLabel || item.titleDate, 120);
  }

  function shijiBody(sh) {
    sh = sh || {};
    return clean([
      sh.title || sh.szjTitle || sh.szj_title || sh.shizhengji_title,
      sh.turnSummary || sh.turn_summary || sh.summary,
      sh.shizhengji,
      sh.shilu,
      sh.zhengwen,
      sh.houren || sh.hourenXishuo
    ].filter(Boolean).join(' '), 1200);
  }

  function addChronicleFromShiji(map, GM, sh, index, opts) {
    var turn = turnOf(sh, GM && GM.turn);
    var body = shijiBody(sh);
    if (!body) return false;
    var id = sh.id || ('legacy-shiji-' + turn + '-' + index);
    var authority = clean(sh.authorityLevel || sh.authority, 80) || 'raw_narrative';
    var lane = 'L7_chronicle_context';
    var basisRefs = basisRefsFrom(sh, 'shijiHistory', id, turn, body, authority, lane, 'record');
    var item = {
      id: 'legacy-chronicle-' + slug(id, 'shiji-' + index),
      type: 'chronicle_event',
      body: body,
      authority: authority,
      visibility: sh.visibility || 'public',
      turn: turn,
      lane: lane,
      factStatus: sh.factStatus || 'recorded_event',
      role: sh.role || 'record',
      sourceRefs: baseSourceRefs(turn, 'shijiHistory', id, body, basisRefs),
      basisRefs: basisRefs,
      extra: {
        stream: 'chronicle',
        title: clean(sh.title || sh.szjTitle || sh.szj_title || sh.shizhengji_title, 120),
        source: 'shijiHistory'
      }
    };
    var bundle = ensureBucket(map, GM, turn, opts);
    updateBundleMeta(bundle, sh);
    bundle.chronicle.push(item);
    return true;
  }

  function addChronicleFromQiju(map, GM, q, index, opts) {
    var turn = turnOf(q, GM && GM.turn);
    var body = clean(qijuBody(q), 900);
    if (!body) return false;
    var id = q.id || ('qiju-' + turn + '-' + index);
    var authority = qijuAuthority(q);
    var lane = authority === 'player_pin' ? 'L2_active_law_commitment' : 'L6_retrieved_evidence';
    var basisRefs = basisRefsFrom(q, 'qijuHistory', id, turn, body, authority, lane, authority === 'player_pin' ? 'command' : 'record');
    var item = {
      id: 'legacy-qiju-' + slug(id, 'qiju-' + index),
      type: 'chronicle_event',
      body: body,
      authority: authority,
      visibility: q.visibility || 'public',
      turn: turn,
      lane: lane,
      factStatus: authority === 'player_pin' ? 'recorded_player_action' : 'recorded_event',
      role: authority === 'player_pin' ? 'command' : 'record',
      sourceRefs: baseSourceRefs(turn, 'qijuHistory', id, body, basisRefs),
      basisRefs: basisRefs,
      extra: {
        stream: 'chronicle',
        source: 'qijuHistory',
        category: clean(q.category, 80)
      }
    };
    var bundle = ensureBucket(map, GM, turn, opts);
    updateBundleMeta(bundle, q);
    bundle.chronicle.push(item);
    return true;
  }

  function addChronicleFromBiannian(map, GM, bi, index, opts) {
    var turn = turnOf(bi, GM && GM.turn);
    var body = clean([bi && bi.title, bi && bi.name, bi && bi.content, bi && bi.desc, bi && bi.text, bi && bi.category].filter(Boolean).join(' '), 900);
    if (!body) return false;
    var id = bi.id || ('biannian-' + turn + '-' + index);
    var authority = clean(bi.authority, 80) || 'structured_chronicle';
    var lane = 'L7_chronicle_context';
    var basisRefs = basisRefsFrom(bi, 'biannianItems', id, turn, body, authority, lane, 'record');
    var item = {
      id: 'legacy-biannian-' + slug(id, 'biannian-' + index),
      type: 'chronicle_event',
      body: body,
      authority: authority,
      visibility: bi.visibility || 'public',
      turn: turn,
      lane: lane,
      factStatus: bi.factStatus || 'recorded_event',
      role: bi.role || 'record',
      sourceRefs: baseSourceRefs(turn, 'biannianItems', id, body, basisRefs),
      basisRefs: basisRefs,
      extra: {
        stream: 'chronicle',
        source: 'biannianItems',
        category: clean(bi.category || bi.type, 80)
      }
    };
    var bundle = ensureBucket(map, GM, turn, opts);
    updateBundleMeta(bundle, bi);
    bundle.chronicle.push(item);
    return true;
  }

  function issueBody(issue) {
    issue = issue || {};
    return clean([
      issue.title,
      issue.category,
      issue.description,
      issue.narrative,
      issue.longTermConsequences,
      issue.summary,
      issue.resolution,
      issue.result,
      issue.outcome,
      issue.playerChoice
    ].filter(Boolean).join(' '), 900);
  }

  function addIssue(map, GM, issue, index, opts) {
    var resolved = issueResolved(issue);
    var turn = numberOr(issue && (issue.resolvedTurn || issue.resolvedAtTurn || issue.raisedTurn || issue.turn), GM && GM.turn);
    var body = issueBody(issue);
    if (!body) return false;
    var issueId = clean(issue.id || issue.issueId || issue.issue_id, 120) || ('legacy-issue-' + index);
    var type = resolved ? 'issue_resolution' : 'strategic_issue';
    var authority = resolved ? clean(issue.authority || issue.authorityLevel, 80) || 'rule_validated' : clean(issue.authorityLevel || issue.authority, 80) || 'ai_analysis';
    var lane = resolved ? 'L2_active_law_commitment' : 'L5_advisory_context';
    var basisRefs = basisRefsFrom(issue, 'currentIssues', issueId, turn, body, authority, lane, resolved ? 'resolution' : 'advisory');
    var item = {
      id: 'legacy-' + type + '-' + slug(issueId, 'issue') + '-t' + turn,
      type: type,
      issueId: issueId,
      body: body,
      authority: authority,
      visibility: issue.visibility || 'public',
      status: issue.status || 'active',
      turn: turn,
      lane: lane,
      factStatus: resolved ? 'issue_resolution' : (issue.factStatus || 'advisory'),
      role: resolved ? 'resolution' : 'advisory',
      confidence: issue.confidence != null ? Number(issue.confidence) : (resolved ? 0.82 : 0.55),
      entities: [].concat(arr(issue.linkedChars), arr(issue.linkedFactions), arr(issue.entities)),
      sourceRefs: baseSourceRefs(turn, 'currentIssues', issueId, body, basisRefs),
      basisRefs: basisRefs,
      extra: {
        stream: 'stateAffairs',
        source: 'currentIssues',
        category: clean(issue.category, 80),
        issueStatus: clean(issue.status, 80)
      }
    };
    var bundle = ensureBucket(map, GM, turn, opts);
    updateBundleMeta(bundle, issue);
    bundle.stateAffairs.push(item);
    return true;
  }

  function addJishi(map, GM, rec, index, opts) {
    var turn = turnOf(rec, GM && GM.turn);
    var actor = clean(rec.char || rec.actor || rec.speaker || rec.npc || rec.name, 120);
    var target = clean(rec.target || rec.topic || rec.issueTitle || rec.issueId, 120);
    var body = clean([
      actor,
      rec.mode,
      rec.topic,
      rec.playerSaid,
      rec.npcSaid,
      rec.line,
      rec.summary
    ].filter(Boolean).join(' '), 800);
    if (!body) return false;
    var id = rec.id || ('jishi-' + turn + '-' + (actor || 'actor') + '-' + index);
    var authority = clean(rec.authority, 80) || 'court_report';
    var lane = 'L4_dialogue_evidence';
    var basisRefs = basisRefsFrom(rec, 'jishiRecords', id, turn, body, authority, lane, 'reported_input');
    var item = {
      id: 'legacy-jishi-' + slug(id, 'jishi-' + index),
      type: 'court_dialogue_record',
      body: body,
      authority: authority,
      visibility: rec.visibility || 'mixed',
      ownerScope: actorScope(actor),
      readScope: visibilityReadScope(rec, actor),
      turn: turn,
      lane: lane,
      factStatus: rec.factStatus || 'dialogue_record',
      role: rec.role || 'reported_input',
      confidence: rec.confidence != null ? Number(rec.confidence) : 0.7,
      entities: [actor, target].concat(arr(rec.participants)),
      sourceRefs: baseSourceRefs(turn, 'jishiRecords', id, body, basisRefs),
      basisRefs: basisRefs,
      extra: {
        stream: 'characterEvents',
        source: 'jishiRecords',
        actor: actor,
        target: target,
        kind: clean(rec.mode || rec.kind || 'dialogue', 80)
      }
    };
    var bundle = ensureBucket(map, GM, turn, opts);
    updateBundleMeta(bundle, rec);
    bundle.characterEvents.push(item);
    return true;
  }

  function addRelationEvent(map, GM, evt, index, opts) {
    var turn = turnOf(evt, GM && GM.turn);
    var actor = clean(evt.actor || evt.from || evt.a || evt.name, 120);
    var target = clean(evt.target || evt.to || evt.b, 120);
    var kind = clean(evt.kind || evt.type || evt.relType || evt.relation, 80) || 'relationship';
    var body = clean([
      actor,
      target,
      kind,
      evt.text,
      evt.content,
      evt.summary,
      evt.reason,
      evt.delta != null ? ('delta ' + evt.delta) : ''
    ].filter(Boolean).join(' '), 700);
    if (!body) return false;
    var id = evt.id || ('relation-' + turn + '-' + (actor || 'actor') + '-' + (target || 'target') + '-' + index);
    var authority = clean(evt.authority, 80) || 'event_log';
    var lane = 'L4_dialogue_evidence';
    var basisRefs = basisRefsFrom(evt, 'npcRelationEvents', id, turn, body, authority, lane, 'record');
    var item = {
      id: 'legacy-relation-' + slug(id, 'relation-' + index),
      type: 'relationship_event',
      body: body,
      authority: authority,
      visibility: evt.visibility || 'internal',
      ownerScope: actorScope(actor),
      readScope: visibilityReadScope(evt, actor),
      turn: turn,
      lane: lane,
      factStatus: evt.factStatus || 'relationship_delta',
      role: evt.role || 'record',
      confidence: evt.confidence != null ? Number(evt.confidence) : 0.72,
      entities: [actor, target].concat(arr(evt.participants)),
      sourceRefs: baseSourceRefs(turn, 'npcRelationEvents', id, body, basisRefs),
      basisRefs: basisRefs,
      extra: {
        stream: 'characterEvents',
        source: 'npcRelationEvents',
        actor: actor,
        target: target,
        kind: kind,
        delta: evt.delta != null ? Number(evt.delta) : null
      }
    };
    var bundle = ensureBucket(map, GM, turn, opts);
    updateBundleMeta(bundle, evt);
    bundle.characterEvents.push(item);
    return true;
  }

  function finalizeBundles(map, opts) {
    opts = opts || {};
    var bundles = Object.keys(map).map(function(turn) {
      var bundle = map[turn];
      var body = clean(arr(bundle.chronicle).concat(arr(bundle.stateAffairs), arr(bundle.characterEvents)).map(function(item) {
        return item && item.body;
      }).filter(Boolean).join(' '), 1200);
      bundle.sourceRefs = compactRefs([
        sourceRef(LEGACY_SOURCE_TYPE, bundle.id, body || bundle.id, { turn: bundle.turn })
      ], bundle.turn);
      return bundle;
    }).filter(function(bundle) {
      return arr(bundle.chronicle).length + arr(bundle.stateAffairs).length + arr(bundle.characterEvents).length > 0;
    }).sort(function(a, b) {
      return Number(a.turn || 0) - Number(b.turn || 0);
    });
    var cap = Math.max(1, Number(opts.archiveCap || opts.maxTurns || DEFAULT_CAP));
    return bundles.length > cap ? bundles.slice(bundles.length - cap) : bundles;
  }

  function collectLegacyBundles(GM, opts) {
    opts = opts || {};
    var map = {};
    var stats = {
      chronicle: 0,
      stateAffairs: 0,
      characterEvents: 0,
      shijiHistory: 0,
      qijuHistory: 0,
      currentIssues: 0,
      jishiRecords: 0,
      npcRelationEvents: 0,
      biannianItems: 0
    };
    arr(GM && GM.shijiHistory).forEach(function(sh, index) {
      if (addChronicleFromShiji(map, GM, sh, index, opts)) {
        stats.chronicle++;
        stats.shijiHistory++;
      }
    });
    arr(GM && GM.qijuHistory).forEach(function(q, index) {
      if (addChronicleFromQiju(map, GM, q, index, opts)) {
        stats.chronicle++;
        stats.qijuHistory++;
      }
    });
    arr(GM && GM.biannianItems).forEach(function(bi, index) {
      if (addChronicleFromBiannian(map, GM, bi, index, opts)) {
        stats.chronicle++;
        stats.biannianItems++;
      }
    });
    arr(GM && GM.currentIssues).forEach(function(issue, index) {
      if (addIssue(map, GM, issue, index, opts)) {
        stats.stateAffairs++;
        stats.currentIssues++;
      }
    });
    arr(GM && GM.jishiRecords).forEach(function(rec, index) {
      if (addJishi(map, GM, rec, index, opts)) {
        stats.characterEvents++;
        stats.jishiRecords++;
      }
    });
    arr(GM && GM._npcRelationEvents).forEach(function(evt, index) {
      if (addRelationEvent(map, GM, evt, index, opts)) {
        stats.characterEvents++;
        stats.npcRelationEvents++;
      }
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      projectionVersion: PROJECTION_VERSION,
      bundles: finalizeBundles(map, opts),
      counts: stats
    };
  }

  function isLegacyBundle(bundle) {
    return !!(bundle && (bundle.sourceType === LEGACY_SOURCE_TYPE || bundle.legacyBackfill || /^legacy-turn-archive-/.test(clean(bundle.id, 120))));
  }

  function existingArchiveTurns(GM) {
    var turns = {};
    arr(GM && GM._turnMemoryArchive).forEach(function(bundle) {
      if (!bundle || bundle.schemaVersion !== ARCHIVE_SCHEMA_VERSION || isLegacyBundle(bundle)) return;
      turns[Number(bundle.turn || 0)] = true;
    });
    return turns;
  }

  function persistBundles(GM, bundles, opts) {
    opts = opts || {};
    GM._turnMemoryArchive = arr(GM._turnMemoryArchive);
    var authoritativeTurns = existingArchiveTurns(GM);
    var skippedExistingTurns = 0;
    var next = opts.clearArchive === true ? [] : GM._turnMemoryArchive.filter(function(bundle) {
      return !isLegacyBundle(bundle);
    });
    arr(bundles).forEach(function(bundle) {
      if (!opts.includeExistingTurns && authoritativeTurns[Number(bundle.turn || 0)]) {
        skippedExistingTurns++;
        return;
      }
      next.push(bundle);
    });
    next.sort(function(a, b) {
      return Number(a && a.turn || 0) - Number(b && b.turn || 0);
    });
    var cap = Math.max(1, Number(opts.archiveCap || DEFAULT_CAP));
    var pruned = 0;
    if (next.length > cap) {
      pruned = next.length - cap;
      next = next.slice(next.length - cap);
    }
    GM._turnMemoryArchive = next;
    return {
      persisted: arr(bundles).length - skippedExistingTurns,
      skippedExistingTurns: skippedExistingTurns,
      pruned: pruned
    };
  }

  function audit(GM, result, opts) {
    opts = opts || {};
    GM._memoryAuditEvents = arr(GM._memoryAuditEvents);
    GM._memoryAuditEvents.push({
      id: 'memory-turn-backfill-' + Number((opts && opts.turn) || (GM && GM.turn) || 0),
      action: 'memory_turn_backfill',
      turn: Number((opts && opts.turn) || (GM && GM.turn) || 0),
      reviewer: clean(opts.reviewer || opts.by || 'system', 80),
      reason: clean(opts.reason || 'legacy history backfill', 160),
      counts: {
        legacyBundles: result.legacyBundles,
        chronicle: result.chronicle,
        stateAffairs: result.stateAffairs,
        characterEvents: result.characterEvents,
        skippedExistingTurns: result.skippedExistingTurns
      }
    });
  }

  function rebuildRollup(GM, opts) {
    var MTR = root.TM && root.TM.MemoryTurnRollup;
    if (!GM || !MTR || typeof MTR.rebuildFromArchive !== 'function') return null;
    return MTR.rebuildFromArchive(GM, opts || {});
  }

  function rebuildFromLegacy(GM, opts) {
    opts = opts || {};
    if (!GM) return { schemaVersion: SCHEMA_VERSION, rebuilt: false, reason: 'missing_gm', legacyBundles: 0 };
    var collected = collectLegacyBundles(GM, opts);
    if (!collected.bundles.length) {
      var emptyRollup = opts.rebuildRollup !== false ? rebuildRollup(GM, opts) : null;
      return {
        schemaVersion: SCHEMA_VERSION,
        projectionVersion: PROJECTION_VERSION,
        rebuilt: false,
        reason: 'empty_legacy_sources',
        legacyBundles: 0,
        chronicle: 0,
        stateAffairs: 0,
        characterEvents: 0,
        rollup: emptyRollup
      };
    }
    var persisted = opts.writeBack === false
      ? { persisted: 0, skippedExistingTurns: 0, pruned: 0 }
      : persistBundles(GM, collected.bundles, opts);
    var rollup = opts.rebuildRollup === false ? null : rebuildRollup(GM, opts);
    var result = {
      schemaVersion: SCHEMA_VERSION,
      projectionVersion: PROJECTION_VERSION,
      rebuilt: true,
      legacyBundles: collected.bundles.length,
      persisted: persisted.persisted,
      skippedExistingTurns: persisted.skippedExistingTurns,
      pruned: persisted.pruned,
      chronicle: collected.counts.chronicle,
      stateAffairs: collected.counts.stateAffairs,
      characterEvents: collected.counts.characterEvents,
      sourceCounts: collected.counts,
      rollup: rollup
    };
    if (opts.writeBack !== false && persisted.persisted > 0) audit(GM, result, opts);
    return result;
  }

  function legacySourceCount(GM) {
    GM = GM || {};
    return arr(GM.shijiHistory).length + arr(GM.qijuHistory).length + arr(GM.currentIssues).length +
      arr(GM.jishiRecords).length + arr(GM._npcRelationEvents).length + arr(GM.biannianItems).length;
  }

  function hasArchive(GM) {
    return arr(GM && GM._turnMemoryArchive).some(function(bundle) {
      return bundle && bundle.schemaVersion === ARCHIVE_SCHEMA_VERSION;
    });
  }

  function hasRollup(GM) {
    return arr(GM && GM._memoryChronicleRollups).length ||
      arr(GM && GM._memoryIssueChains).length ||
      arr(GM && GM._memoryCharacterDossiers).length;
  }

  function needsBackfill(GM) {
    if (!GM || !legacySourceCount(GM)) return false;
    return !hasArchive(GM);
  }

  function ensureBackfilled(GM, opts) {
    opts = opts || {};
    if (!GM) return { schemaVersion: SCHEMA_VERSION, rebuilt: false, reason: 'missing_gm' };
    if (opts.force || needsBackfill(GM)) return rebuildFromLegacy(GM, opts);
    if (hasArchive(GM) && !hasRollup(GM) && opts.rebuildRollup !== false) {
      return {
        schemaVersion: SCHEMA_VERSION,
        projectionVersion: PROJECTION_VERSION,
        rebuilt: false,
        reason: 'rollup_rebuilt_from_existing_archive',
        legacyBundles: 0,
        rollup: rebuildRollup(GM, opts)
      };
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      projectionVersion: PROJECTION_VERSION,
      rebuilt: false,
      reason: 'already_backfilled',
      legacyBundles: 0
    };
  }

  ns.SCHEMA_VERSION = SCHEMA_VERSION;
  ns.PROJECTION_VERSION = PROJECTION_VERSION;
  ns.collectLegacyBundles = collectLegacyBundles;
  ns.rebuildFromLegacy = rebuildFromLegacy;
  ns.ensureBackfilled = ensureBackfilled;
  ns.needsBackfill = needsBackfill;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
