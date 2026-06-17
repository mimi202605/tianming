(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryTurnArchive = root.TM.MemoryTurnArchive || {};
  var SCHEMA_VERSION = 'memory-turn-archive/v0';
  var PROJECTION_VERSION = 1;
  var DEFAULT_ARCHIVE_CAP = 80;

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

  function clamp01(value, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback == null ? null : fallback;
    return Math.max(0, Math.min(1, n));
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
    return out.slice(0, 12);
  }

  function sourceRef(type, id, body, extra) {
    var ME = root.TM && root.TM.MemoryEnvelope;
    if (ME && typeof ME.sourceRef === 'function') return ME.sourceRef(type, id, body, extra || {});
    var ref = { type: clean(type, 60) || 'unknown', id: clean(id, 120) || 'unknown' };
    if (extra && extra.turn != null) ref.turn = Number(extra.turn || 0);
    return ref;
  }

  function mergeRefs(primary, extra, fallbackTurn) {
    return compactRefs(arr(primary).concat(arr(extra)), fallbackTurn);
  }

  function turnNumber(GM, opts) {
    return Number((opts && opts.turn) || (GM && GM.turn) || 0);
  }

  function archiveId(turn, sourceId) {
    return 'turn-archive-' + Number(turn || 0) + '-' + slug(sourceId || 'SC1', 'SC1');
  }

  function deriveYear(GM, opts) {
    opts = opts || {};
    return clean(opts.year || (GM && (GM.currentYear || GM.year || GM.displayYear)), 40);
  }

  function deriveDateLabel(GM, turn, opts) {
    opts = opts || {};
    if (opts.dateLabel) return clean(opts.dateLabel, 120);
    if (root && typeof root.getTSText === 'function') {
      try { return clean(root.getTSText(turn), 120); } catch (_) {}
    }
    return '';
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

  function baseRefs(turn, sourceType, sourceId, bundleId, body, extraRefs) {
    return mergeRefs([
      sourceRef('turnArchive', bundleId, body, { turn: turn }),
      sourceRef(sourceType || 'aiTurnResult', sourceId || 'SC1', body, { turn: turn })
    ], extraRefs, turn);
  }

  function chronicleBody(aiResult) {
    aiResult = aiResult || {};
    return clean([
      aiResult.szj_title || aiResult.shizhengji_title || aiResult.title,
      aiResult.turn_summary || aiResult.turnSummary || aiResult.summary,
      aiResult.shizhengji || aiResult.shizheng || aiResult.szj,
      aiResult.shizhengji_basis,
      aiResult.shilu_text || aiResult.shiluText
    ].filter(Boolean).join(' '), 900);
  }

  function collectChronicle(GM, aiResult, opts, bundleId) {
    opts = opts || {};
    var turn = turnNumber(GM, opts);
    var body = chronicleBody(aiResult);
    if (!body) return [];
    return [{
      id: bundleId + ':chronicle',
      type: 'chronicle_event',
      body: body,
      authority: 'structured_chronicle',
      visibility: 'public',
      turn: turn,
      lane: 'L7_chronicle_context',
      factStatus: 'recorded_event',
      role: 'record',
      sourceRefs: baseRefs(turn, opts.sourceType, opts.sourceId, bundleId, body, arr(aiResult && aiResult.basis_refs).concat(arr(aiResult && aiResult.basisRefs))),
      basisRefs: compactRefs(arr(aiResult && aiResult.basis_refs).concat(arr(aiResult && aiResult.basisRefs)), turn),
      extra: {
        stream: 'chronicle',
        title: clean(aiResult && (aiResult.szj_title || aiResult.shizhengji_title || aiResult.title), 120),
        summary: clean(aiResult && (aiResult.turn_summary || aiResult.turnSummary || aiResult.summary), 180)
      }
    }];
  }

  function issueUpdateType(update) {
    var action = clean(update && update.action, 40).toLowerCase();
    if (action === 'resolve' || action === 'resolved' || action === 'close') return 'issue_resolution';
    if (action === 'add' || action === 'create' || action === 'open') return 'strategic_issue';
    return 'issue_update';
  }

  function issueBody(update) {
    update = update || {};
    return clean([
      update.title,
      update.category,
      update.description,
      update.summary,
      update.resolution,
      update.result,
      update.outcome,
      update.reason,
      update.nextStep
    ].filter(Boolean).join(' '), 800);
  }

  function issueKey(update, index, turn) {
    update = update || {};
    return clean(update.id || update.issueId || update.issue_id, 120) || ('issue-' + Number(turn || 0) + '-' + index + '-' + slug(update.title || update.category || 'state-affair'));
  }

  function collectStateAffairs(GM, aiResult, opts, bundleId) {
    opts = opts || {};
    var turn = turnNumber(GM, opts);
    var out = [];
    arr(aiResult && aiResult.current_issues_update).forEach(function(update, index) {
      if (!update) return;
      var body = issueBody(update);
      if (!body) return;
      var type = issueUpdateType(update);
      var key = issueKey(update, index, turn);
      var evidenceRefs = compactRefs(arr(update.evidenceRefs).concat(arr(update.basisRefs)).concat(arr(update.source_refs)).concat(arr(update.sourceRefs)), turn);
      var hasEvidence = evidenceRefs.length > 0;
      out.push({
        id: type + '-' + key + '-t' + turn,
        type: type,
        issueId: key,
        body: body,
        authority: type === 'issue_resolution' ? clean(update.authorityLevel || update.authority, 80) || 'rule_validated' : clean(update.authorityLevel || update.authority, 80) || 'ai_analysis',
        visibility: update.visibility || 'public',
        turn: turn,
        lane: type === 'issue_resolution' ? 'L2_active_law_commitment' : 'L5_advisory_context',
        factStatus: type === 'issue_resolution' ? 'issue_resolution' : (hasEvidence ? 'advisory' : 'advisory_unverified'),
        role: type === 'issue_resolution' ? 'resolution' : (type === 'strategic_issue' ? 'advisory' : 'update'),
        confidence: clamp01(update.confidence, hasEvidence ? 0.58 : 0.45),
        entities: [].concat(arr(update.linkedChars), arr(update.linkedFactions), arr(update.entities)),
        sourceRefs: baseRefs(turn, opts.sourceType, opts.sourceId, bundleId, body, evidenceRefs),
        basisRefs: evidenceRefs,
        extra: {
          stream: 'stateAffairs',
          action: clean(update.action, 40),
          category: clean(update.category, 80),
          severity: clean(update.severity, 80)
        }
      });
    });
    return out;
  }

  function actionBody(action) {
    action = action || {};
    return clean([
      action.name || action.actor || action.from,
      action.target || action.to,
      action.behaviorType || action.type || action.kind,
      action.action || action.description || action.content,
      action.result || action.outcome || action.effect,
      action.reason || action.intent
    ].filter(Boolean).join(' '), 700);
  }

  function collectNpcActionEvents(GM, aiResult, opts, bundleId) {
    opts = opts || {};
    var turn = turnNumber(GM, opts);
    var out = [];
    arr(aiResult && aiResult.npc_actions).forEach(function(action, index) {
      if (!action) return;
      var body = actionBody(action);
      if (!body) return;
      var actor = clean(action.name || action.actor || action.from, 120);
      var target = clean(action.target || action.to, 120);
      var kind = clean(action.behaviorType || action.type || action.kind || 'npc_action', 80);
      var evidenceRefs = compactRefs(arr(action.evidenceRefs).concat(arr(action.basisRefs)).concat(arr(action.source_refs)).concat(arr(action.sourceRefs)), turn);
      out.push({
        id: 'npc-action-' + Number(turn || 0) + '-' + index + '-' + slug(actor + '-' + target + '-' + kind, 'event'),
        type: 'relationship_event',
        body: body,
        authority: action.authority || 'event_log',
        visibility: action.visibility || 'internal',
        ownerScope: actorScope(actor),
        readScope: visibilityReadScope(action, actor),
        turn: turn,
        lane: 'L4_dialogue_evidence',
        factStatus: 'turn_archive_event',
        role: 'record',
        confidence: clamp01(action.confidence, 0.68),
        entities: [actor, target].concat(arr(action.participants)),
        sourceRefs: baseRefs(turn, opts.sourceType, opts.sourceId, bundleId, body, evidenceRefs),
        basisRefs: evidenceRefs,
        extra: { stream: 'characterEvents', actor: actor, target: target, kind: kind }
      });
    });
    return out;
  }

  function affinityBody(change) {
    change = change || {};
    return clean([
      change.a || change.actor || change.from,
      change.b || change.target || change.to,
      change.relType || change.kind || 'relationship',
      change.delta != null ? ('delta ' + change.delta) : '',
      change.reason
    ].filter(Boolean).join(' '), 500);
  }

  function collectAffinityEvents(GM, aiResult, opts, bundleId) {
    opts = opts || {};
    var turn = turnNumber(GM, opts);
    var out = [];
    arr(aiResult && aiResult.affinity_changes).concat(arr(aiResult && aiResult.relations)).forEach(function(change, index) {
      if (!change) return;
      var body = affinityBody(change);
      if (!body) return;
      var actor = clean(change.a || change.actor || change.from, 120);
      var target = clean(change.b || change.target || change.to, 120);
      var kind = clean(change.relType || change.kind || change.relation || 'relationship', 80);
      var evidenceRefs = compactRefs(arr(change.evidenceRefs).concat(arr(change.basisRefs)).concat(arr(change.source_refs)).concat(arr(change.sourceRefs)), turn);
      out.push({
        id: 'affinity-' + Number(turn || 0) + '-' + index + '-' + slug(actor + '-' + target + '-' + kind, 'relation'),
        type: 'relationship_event',
        body: body,
        authority: change.authority || 'event_log',
        visibility: change.visibility || 'internal',
        ownerScope: actorScope(actor),
        readScope: visibilityReadScope(change, actor),
        turn: turn,
        lane: 'L4_dialogue_evidence',
        factStatus: 'relationship_delta',
        role: 'record',
        confidence: clamp01(change.confidence, 0.72),
        entities: [actor, target],
        sourceRefs: baseRefs(turn, opts.sourceType, opts.sourceId, bundleId, body, evidenceRefs),
        basisRefs: evidenceRefs,
        extra: {
          stream: 'characterEvents',
          actor: actor,
          target: target,
          kind: kind,
          delta: change.delta != null ? Number(change.delta) : null
        }
      });
    });
    return out;
  }

  function collectArchiveItems(GM, aiResult, opts) {
    opts = opts || {};
    var turn = turnNumber(GM, opts);
    var sourceId = clean(opts.sourceId || 'SC1', 120) || 'SC1';
    var bundleId = archiveId(turn, sourceId);
    return {
      id: bundleId,
      chronicle: collectChronicle(GM, aiResult || {}, opts, bundleId),
      stateAffairs: collectStateAffairs(GM, aiResult || {}, opts, bundleId),
      characterEvents: collectNpcActionEvents(GM, aiResult || {}, opts, bundleId)
        .concat(collectAffinityEvents(GM, aiResult || {}, opts, bundleId))
    };
  }

  function capArchive(GM, limit) {
    if (!GM || !Array.isArray(GM._turnMemoryArchive)) return 0;
    limit = Math.max(1, Number(limit || DEFAULT_ARCHIVE_CAP));
    if (GM._turnMemoryArchive.length <= limit) return 0;
    var removed = GM._turnMemoryArchive.length - limit;
    GM._turnMemoryArchive.splice(0, removed);
    return removed;
  }

  function recordResolutionEdges(GM, bundle) {
    var MIG = root.TM && root.TM.MemoryIssueGovernance;
    if (!GM || !bundle || !MIG || typeof MIG.createIssueResolutionEdge !== 'function') return 0;
    var count = 0;
    arr(bundle.stateAffairs).forEach(function(item) {
      if (!item || item.type !== 'issue_resolution' || !item.issueId) return;
      if (MIG.createIssueResolutionEdge(GM, item.issueId, item.issueId, item.turn)) count++;
    });
    return count;
  }

  function archiveTurn(GM, aiResult, opts) {
    opts = opts || {};
    if (!GM || !aiResult) return { archived: false, reason: 'missing_input', chronicle: 0, stateAffairs: 0, characterEvents: 0 };
    var turn = turnNumber(GM, opts);
    var sourceId = clean(opts.sourceId || 'SC1', 120) || 'SC1';
    var sourceType = clean(opts.sourceType || 'aiTurnResult', 80) || 'aiTurnResult';
    var items = collectArchiveItems(GM, aiResult, {
      turn: turn,
      sourceId: sourceId,
      sourceType: sourceType
    });
    var total = items.chronicle.length + items.stateAffairs.length + items.characterEvents.length;
    if (!total) return { archived: false, reason: 'empty', chronicle: 0, stateAffairs: 0, characterEvents: 0 };
    var body = clean([
      aiResult.turn_summary || aiResult.turnSummary || aiResult.summary,
      aiResult.shizhengji || aiResult.shizhengji_basis || aiResult.zhengwen
    ].filter(Boolean).join(' '), 900);
    var bundle = {
      id: items.id,
      schemaVersion: SCHEMA_VERSION,
      projectionVersion: PROJECTION_VERSION,
      turn: turn,
      year: deriveYear(GM, opts),
      dateLabel: deriveDateLabel(GM, turn, opts),
      sourceType: sourceType,
      sourceId: sourceId,
      sourceRefs: baseRefs(turn, sourceType, sourceId, items.id, body || items.id, []),
      createdAt: Date.now(),
      chronicle: items.chronicle,
      stateAffairs: items.stateAffairs,
      characterEvents: items.characterEvents
    };
    GM._turnMemoryArchive = Array.isArray(GM._turnMemoryArchive) ? GM._turnMemoryArchive : [];
    var replaced = false;
    for (var i = 0; i < GM._turnMemoryArchive.length; i++) {
      if (GM._turnMemoryArchive[i] && GM._turnMemoryArchive[i].id === bundle.id) {
        GM._turnMemoryArchive[i] = bundle;
        replaced = true;
        break;
      }
    }
    if (!replaced) GM._turnMemoryArchive.push(bundle);
    var pruned = capArchive(GM, opts.archiveCap || DEFAULT_ARCHIVE_CAP);
    var edges = recordResolutionEdges(GM, bundle);
    if (Array.isArray(GM._memoryAuditEvents)) {
      GM._memoryAuditEvents.push({
        id: bundle.id,
        action: replaced ? 'replace_turn_archive' : 'archive_turn',
        turn: turn,
        sourceId: sourceId,
        counts: { chronicle: bundle.chronicle.length, stateAffairs: bundle.stateAffairs.length, characterEvents: bundle.characterEvents.length }
      });
    }
    return {
      archived: true,
      id: bundle.id,
      replaced: replaced,
      pruned: pruned,
      edges: edges,
      chronicle: bundle.chronicle.length,
      stateAffairs: bundle.stateAffairs.length,
      characterEvents: bundle.characterEvents.length
    };
  }

  ns.SCHEMA_VERSION = SCHEMA_VERSION;
  ns.PROJECTION_VERSION = PROJECTION_VERSION;
  ns.collectArchiveItems = collectArchiveItems;
  ns.archiveTurn = archiveTurn;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
