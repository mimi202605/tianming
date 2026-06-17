// @ts-check
/*
 * tm-party-class-action-scheduler.js
 * Pre-submit orchestration for party/class actor actions.
 */
(function(global) {
  'use strict';

  var TM = global.TM = global.TM || {};

  function toArray(v) {
    if (v === undefined || v === null || v === '') return [];
    return Array.isArray(v) ? v.slice() : [v];
  }

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

  function pickRoot(root) {
    if (root && typeof root === 'object') return root;
    if (global.GM && typeof global.GM === 'object') return global.GM;
    if (global.scriptData && typeof global.scriptData === 'object') return global.scriptData;
    return {};
  }

  function textOf(raw) {
    if (raw === undefined || raw === null) return '';
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
    if (Array.isArray(raw)) return raw.map(textOf).filter(Boolean).join(' ');
    if (typeof raw === 'object') {
      var keys = ['text', 'content', 'summary', 'desc', 'description', 'agenda', 'goal', 'objective', 'topic', 'title', 'name', 'demand', 'reason'];
      for (var i = 0; i < keys.length; i += 1) {
        if (raw[keys[i]] !== undefined && raw[keys[i]] !== null && raw[keys[i]] !== '') return textOf(raw[keys[i]]);
      }
    }
    return '';
  }

  function compact(v, maxLen) {
    var text = String(textOf(v) || '').replace(/\s+/g, ' ').trim();
    maxLen = Number(maxLen) || 160;
    return text.length > maxLen ? text.slice(0, maxLen) : text;
  }

  function normalizeName(v) {
    return String(v || '').replace(/[\s\u3000'"`.,;:!?()[\]{}<>\/\\|_-]+/g, '').toLowerCase().trim();
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function round2(n) {
    n = Number(n);
    if (!isFinite(n)) n = 0;
    return Math.round(n * 100) / 100;
  }

  function pushUniqueText(list, value) {
    if (!Array.isArray(list)) return false;
    var text = compact(value, 120);
    if (!text) return false;
    var key = normalizeName(text);
    if (list.some(function(x) { return normalizeName(x) === key; })) return false;
    list.push(text);
    return true;
  }

  function ensureMap(root, field) {
    if (!root[field] || typeof root[field] !== 'object' || Array.isArray(root[field])) root[field] = {};
    return root[field];
  }

  function sourceName(options, fallback) {
    return compact(options && options.source || fallback || 'party-class-action-scheduler', 80);
  }

  function actionIsActive(action, turn) {
    if (!action) return false;
    if (/expired|resolved|cancelled|canceled/i.test(String(action.status || ''))) return false;
    var expiry = Number(action.expiry);
    return !isFinite(expiry) || expiry >= turn;
  }

  function recentActions(root, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var limit = Math.max(1, Math.min(80, Number(options.limit || 24) || 24));
    return []
      .concat(toArray(root.party_actions))
      .concat(toArray(root.class_actions))
      .filter(function(action) { return actionIsActive(action, turn); })
      .sort(function(a, b) {
        var at = Number(a && a.turn) || 0;
        var bt = Number(b && b.turn) || 0;
        if (at !== bt) return bt - at;
        return String(b && b.id || '').localeCompare(String(a && a.id || ''));
      })
      .slice(0, limit);
  }

  function rememberOnce(root, key, payload) {
    var seen = ensureMap(root, '_partyClassActionSchedulerMemoryKeys');
    if (!key || seen[key]) return false;
    if (!TM.PartyClassActors || typeof TM.PartyClassActors.remember !== 'function') return false;
    seen[key] = true;
    try {
      TM.PartyClassActors.remember(root, payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  function seedMemoriesFromSignals(root, options) {
    if (!TM.SocialPoliticalSignals || typeof TM.SocialPoliticalSignals.snapshot !== 'function') return 0;
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var written = 0;
    var snap = null;
    try { snap = TM.SocialPoliticalSignals.snapshot(root, { limit: 18 }); } catch (_) { snap = null; }
    toArray(snap && snap.recent).forEach(function(signal) {
      if (!signal || signal.resolved || signal.expired) return;
      var issue = compact(signal.linkedIssue || '', 100);
      var reason = compact(signal.reason || signal.kind || '', 160);
      toArray(signal.affectedClasses).forEach(function(impact) {
        if (!impact || !impact.name) return;
        var key = ['signal', signal.id, 'class', normalizeName(impact.name), issue].join('|');
        if (rememberOnce(root, key, {
          turn: signal.turn || turn,
          actorType: 'class',
          actorId: impact.name,
          agenda: impact.demand || reason,
          grievance: impact.reason || reason,
          belief: 'recent signal can become autonomous class pressure before the next turn',
          source: sourceName(options, 'party-class-action-scheduler-signal'),
          confidence: Math.max(0.42, Number(signal.confidence) || 0.62),
          expiry: turn + 4,
          linkedIssue: issue
        })) written++;
      });
      toArray(signal.affectedParties).forEach(function(impact) {
        if (!impact || !impact.name) return;
        var key = ['signal', signal.id, 'party', normalizeName(impact.name), issue].join('|');
        if (rememberOnce(root, key, {
          turn: signal.turn || turn,
          actorType: 'party',
          actorId: impact.name,
          agenda: impact.shortGoal || impact.currentAgenda || reason,
          grievance: impact.reason || reason,
          belief: 'recent signal gives party an agenda to sponsor, block, or frame',
          source: sourceName(options, 'party-class-action-scheduler-signal'),
          confidence: Math.max(0.42, Number(signal.confidence) || 0.62),
          expiry: turn + 4,
          linkedIssue: issue
        })) written++;
      });
    });
    return written;
  }

  function seedMemoriesFromRelations(root, options) {
    var state = root && root.partyClassRelations;
    var edges = state && state.edges && typeof state.edges === 'object' ? state.edges : {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var written = 0;
    Object.keys(edges).forEach(function(key) {
      var edge = edges[key] || {};
      var className = edge.className || '';
      var partyName = edge.partyName || edge.party || '';
      if (!className || !partyName) return;
      var grievance = Number(edge.grievance);
      var affinity = Number(edge.affinity);
      var trust = Number(edge.trust);
      if ((!isFinite(grievance) || grievance < 64) && (!isFinite(affinity) || affinity < 70) && (!isFinite(trust) || trust < 65)) return;
      var topic = compact(edge.lastReason || edge.reason || 'dynamic party/class relation pressure', 140);
      var memKey = ['relation', turn, normalizeName(className), normalizeName(partyName), compact(edge.status || '', 40)].join('|');
      if (rememberOnce(root, memKey + '|class', {
        turn: turn,
        actorType: 'class',
        actorId: className,
        agenda: topic,
        grievance: 'relation grievance ' + (isFinite(grievance) ? Math.round(grievance) : ''),
        belief: 'dynamic relation can mobilize class action without fixed scenario pairing',
        source: sourceName(options, 'party-class-action-scheduler-relation'),
        confidence: 0.58,
        expiry: turn + 4,
        linkedIssue: ''
      })) written++;
      if (rememberOnce(root, memKey + '|party', {
        turn: turn,
        actorType: 'party',
        actorId: partyName,
        agenda: topic,
        grievance: 'support pressure from ' + className,
        belief: 'dynamic relation can pull party toward sponsoring or framing an issue',
        source: sourceName(options, 'party-class-action-scheduler-relation'),
        confidence: 0.58,
        expiry: turn + 4,
        linkedIssue: ''
      })) written++;
    });
    return written;
  }

  function runSignalBridge(root, options, summary) {
    if (!TM.SocialPoliticalSignals) return;
    if (!options.skipSignalMaintenance && typeof TM.SocialPoliticalSignals.decayAndResolve === 'function') {
      summary.signalMaintenance = TM.SocialPoliticalSignals.decayAndResolve(root, {
        source: sourceName(options, 'party-class-action-scheduler-maintenance'),
        turn: options.turn
      });
    }
    if (!options.skipRuntimeScan && typeof TM.SocialPoliticalSignals.scanRuntimePressures === 'function') {
      summary.runtimeSignals = TM.SocialPoliticalSignals.scanRuntimePressures(root, {
        source: sourceName(options, 'party-class-action-scheduler-runtime'),
        turn: options.turn
      });
    }
    if (TM.PartyClassSignalBridge && typeof TM.PartyClassSignalBridge.applyPending === 'function') {
      summary.signalApply = TM.PartyClassSignalBridge.applyPending(root, {
        source: sourceName(options, 'party-class-action-scheduler-apply'),
        turn: options.turn
      });
    } else if (typeof TM.SocialPoliticalSignals.applyPending === 'function') {
      summary.signalApply = TM.SocialPoliticalSignals.applyPending(root, {
        source: sourceName(options, 'party-class-action-scheduler-apply'),
        turn: options.turn
      });
    }
  }

  function actionSignalImpact(action) {
    var type = String(action && action.actionType || '');
    if (action && action.actorType === 'party') {
      var cohesion = 0.4;
      var influence = 0;
      if (type === 'propaganda' || type === 'funding') influence = 0.5;
      if (type === 'split') cohesion = -1.2;
      if (type === 'obstruction') cohesion = 0.3;
      return {
        affectedParties: [{
          name: action.actorId,
          cohesionDelta: cohesion,
          influenceDelta: influence,
          shortGoal: action.agenda || '',
          reason: action.actionType + ' action pressure'
        }]
      };
    }
    var sat = 0;
    var inf = 0.35;
    if (type === 'strike') { sat = -0.8; inf = 0.8; }
    if (type === 'revolt_seed') { sat = -1.2; inf = 1; }
    if (type === 'association') inf = 0.6;
    return {
      affectedClasses: [{
        name: action.actorId,
        satisfactionDelta: sat,
        influenceDelta: inf,
        demand: action.agenda || '',
        reason: action.actionType + ' action pressure'
      }]
    };
  }

  function actionKey(action) {
    action = action || {};
    return compact(action.id || [
      action.actorType,
      action.actorId,
      action.actionType,
      action.linkedIssue,
      action.agenda || action.grievance,
      action.turn
    ].join('|'), 220);
  }

  function actionTinyiWeight(action) {
    var type = String(action && action.actionType || '');
    var base = {
      memorial: 1.45,
      petition: 1.35,
      propaganda: 1.05,
      funding: 0.9,
      alliance: 1,
      obstruction: 1.55,
      association: 0.8,
      split: 1.15,
      strike: 1.9,
      revolt_seed: 2.45
    }[type] || 0;
    if (!base) return 0;
    var conf = clamp(action && action.confidence != null ? action.confidence : 0.62, 0.35, 1);
    return round2(base * conf);
  }

  function actionCanPressTinyi(action) {
    if (!action || !action.actorType || !action.actorId) return false;
    if (/expired|resolved|cancelled|canceled/i.test(String(action.status || ''))) return false;
    var type = String(action.actionType || '');
    if (action.actorType === 'party') return /^(memorial|propaganda|funding|alliance|obstruction|split)$/.test(type);
    if (action.actorType === 'class') return /^(petition|association|strike|revolt_seed)$/.test(type);
    return false;
  }

  function issueTextOf(item) {
    return compact(item && (item.topic || item.title || item.name || item.goalText || item.demandText || item.reason || item.id || item.issueId), 180);
  }

  function collectIssueRefs(root) {
    root = pickRoot(root);
    var refs = [];
    function add(item) {
      if (item) refs.push(item);
    }
    var current = root.currentIssues;
    if (Array.isArray(current)) current.forEach(add);
    else if (current && typeof current === 'object') Object.keys(current).forEach(function(k) { add(current[k]); });
    toArray(root._pendingTinyiTopics || root.pendingTinyiTopics || (root.tinyi && root.tinyi.pendingTopics)).forEach(add);
    toArray(root._partyClassCourtIssues).forEach(add);
    toArray(root._partyClassCourtIssueLinks).forEach(add);
    return refs;
  }

  function findIssueRef(root, issueId, topic) {
    var id = compact(issueId, 120);
    var nTopic = normalizeName(topic);
    var refs = collectIssueRefs(root);
    var i;
    if (id) {
      for (i = 0; i < refs.length; i += 1) {
        var row = refs[i] || {};
        if (String(row.issueId || row.id || row.topicId || row.chaoyiTrackId || '') === id) return row;
      }
    }
    if (nTopic) {
      for (i = 0; i < refs.length; i += 1) {
        if (normalizeName(issueTextOf(refs[i])) === nTopic) return refs[i];
      }
    }
    return null;
  }

  function actionIssueText(root, action) {
    var issueId = compact(action && action.linkedIssue || '', 120);
    var ref = findIssueRef(root, issueId, action && (action.topic || action.agenda || action.grievance));
    return issueTextOf(ref) || compact(action && (action.topic || action.agenda || action.grievance || issueId), 180);
  }

  function ensureTinyiArray(root) {
    if (!Array.isArray(root._pendingTinyiTopics)) root._pendingTinyiTopics = [];
    return root._pendingTinyiTopics;
  }

  function findTinyiTopic(root, action, topic, partyName, className) {
    var issueId = compact(action && action.linkedIssue || '', 120);
    var nTopic = normalizeName(topic);
    var nParty = normalizeName(partyName);
    var nClass = normalizeName(className);
    return ensureTinyiArray(root).find(function(row) {
      if (!row) return false;
      if (issueId && String(row.issueId || row.id || row.topicId || row.linkedIssue || '') === issueId) return true;
      if (!nTopic || normalizeName(row.topic || row.title || row.goalText || row.demandText) !== nTopic) return false;
      var rowParty = normalizeName(row.party || row.sourceParty || row.partyName);
      var rowClass = normalizeName(row.className || row.sourceClass || row.class);
      if (nParty && (!rowParty || rowParty === nParty)) return true;
      if (nClass && (!rowClass || rowClass === nClass)) return true;
      return !nParty && !nClass;
    }) || null;
  }

  function appendActionHistory(topic, action, pressure, source) {
    if (!Array.isArray(topic.actionHistory)) topic.actionHistory = [];
    var key = actionKey(action);
    if (topic.actionHistory.some(function(x) { return x && x.key === key; })) return false;
    topic.actionHistory.push({
      key: key,
      turn: action.turn,
      actorType: action.actorType,
      actorId: action.actorId,
      actionType: action.actionType,
      agenda: compact(action.agenda || action.grievance || '', 160),
      source: compact(source || action.source || '', 80),
      confidence: round2(action.confidence != null ? action.confidence : 0.62),
      pressure: pressure
    });
    if (topic.actionHistory.length > 16) topic.actionHistory = topic.actionHistory.slice(-16);
    return true;
  }

  function mergeActionIntoTopic(root, topic, action, options) {
    var key = actionKey(action);
    var pressure = actionTinyiWeight(action);
    if (!Array.isArray(topic.linkedActions)) topic.linkedActions = [];
    var alreadyLinked = topic.linkedActions.some(function(x) { return String(x) === String(key); });
    if (!alreadyLinked) topic.linkedActions.push(key);
    if (topic.linkedActions.length > 20) topic.linkedActions = topic.linkedActions.slice(-20);

    topic.status = topic.status || 'pending';
    topic.actionSourceType = 'party_class_action';
    topic.from = topic.from || 'party-class-action-scheduler';
    topic.source = topic.source || sourceName(options, 'party-class-action-scheduler');
    topic.turn = topic.turn || action.turn || options.turn || root.turn || 0;
    topic.issueId = topic.issueId || compact(action.linkedIssue || '', 120);
    topic.linkedIssue = topic.linkedIssue || topic.issueId;
    topic.priority = Number(topic.priority != null ? topic.priority : 68);
    if (!isFinite(topic.priority)) topic.priority = 68;
    if (!alreadyLinked) {
      topic.actionPressure = round2((Number(topic.actionPressure) || 0) + pressure);
      topic.priority = round2(clamp(topic.priority + Math.max(1, pressure * 4), 0, 100));
    } else {
      topic.actionPressure = round2(Number(topic.actionPressure) || 0);
    }
    if (action.actorType === 'party') {
      topic.party = topic.party || compact(action.actorId, 80);
      topic.sourceParty = topic.sourceParty || compact(action.actorId, 80);
      topic.goalText = topic.goalText || compact(action.agenda || action.grievance || '', 160);
      topic.linkedParties = toArray(topic.linkedParties);
      pushUniqueText(topic.linkedParties, action.actorId);
    } else if (action.actorType === 'class') {
      topic.className = topic.className || compact(action.actorId, 80);
      topic.sourceClass = topic.sourceClass || compact(action.actorId, 80);
      topic.demandText = topic.demandText || compact(action.agenda || action.grievance || '', 160);
      topic.linkedClasses = toArray(topic.linkedClasses);
      pushUniqueText(topic.linkedClasses, action.actorId);
    }
    topic.reason = topic.reason || compact([action.actorId, action.actionType, action.agenda || action.grievance].filter(Boolean).join(' - '), 220);
    topic.origin = topic.origin || {
      sourceType: 'party_class_action',
      sourceId: key,
      sourceName: compact(action.actorId, 80)
    };
    appendActionHistory(topic, action, pressure, sourceName(options, 'party-class-action-scheduler'));
    return { linked: !alreadyLinked, pressure: pressure };
  }

  function ensureTinyiTopicFromAction(root, action, options) {
    root = pickRoot(root);
    options = options || {};
    if (!actionCanPressTinyi(action)) return null;
    var topicText = actionIssueText(root, action);
    if (!topicText) return null;
    var partyName = action.actorType === 'party' ? compact(action.actorId, 80) : '';
    var className = action.actorType === 'class' ? compact(action.actorId, 80) : '';
    var existing = findTinyiTopic(root, action, topicText, partyName, className);
    var created = false;
    if (!existing) {
      var turn = Number(options.turn != null ? options.turn : root.turn) || Number(action.turn) || 0;
      existing = {
        id: compact(action.linkedIssue || '', 120) || ('pcaction-tinyi-' + turn + '-' + (ensureTinyiArray(root).length + 1)),
        issueId: compact(action.linkedIssue || '', 120),
        topic: topicText,
        sourceType: 'party_class_action',
        actionSourceType: 'party_class_action',
        source: sourceName(options, 'party-class-action-scheduler'),
        status: 'pending',
        priority: 70,
        turn: turn,
        linkedActions: [],
        actionPressure: 0,
        origin: {
          sourceType: 'party_class_action',
          sourceId: actionKey(action),
          sourceName: compact(action.actorId, 80)
        }
      };
      ensureTinyiArray(root).unshift(existing);
      if (root._pendingTinyiTopics.length > 80) root._pendingTinyiTopics = root._pendingTinyiTopics.slice(0, 80);
      created = true;
    }
    var merged = mergeActionIntoTopic(root, existing, action, options);
    return { topic: existing, created: created, linked: merged.linked, pressure: merged.pressure };
  }

  function ensureCourtIssueLinkFromTopic(root, topic, action, options) {
    if (!topic) return null;
    if (!Array.isArray(root._partyClassCourtIssueLinks)) root._partyClassCourtIssueLinks = [];
    var issueId = compact(topic.issueId || topic.id || topic.linkedIssue || action.linkedIssue || '', 120);
    var partyName = compact(topic.party || topic.sourceParty || (action.actorType === 'party' ? action.actorId : ''), 80);
    var className = compact(topic.className || topic.sourceClass || (action.actorType === 'class' ? action.actorId : ''), 80);
    var topicText = compact(topic.topic || actionIssueText(root, action), 180);
    var existing = root._partyClassCourtIssueLinks.find(function(row) {
      if (!row) return false;
      var sameIssue = issueId && String(row.issueId || row.id || row.topicId || '') === issueId;
      var sameTopic = !issueId && normalizeName(row.topic || row.title) === normalizeName(topicText);
      if (!sameIssue && !sameTopic) return false;
      var rowParty = normalizeName(row.party || row.sourceParty);
      var rowClass = normalizeName(row.className || row.sourceClass);
      return (!partyName || !rowParty || rowParty === normalizeName(partyName))
        && (!className || !rowClass || rowClass === normalizeName(className));
    });
    if (!existing) {
      existing = {
        issueId: issueId,
        topic: topicText,
        status: 'action-pressure',
        source: sourceName(options, 'party-class-action-scheduler'),
        sourceType: 'party_class_action',
        turn: options.turn || root.turn || action.turn || 0,
        linkedActions: []
      };
      root._partyClassCourtIssueLinks.push(existing);
      if (root._partyClassCourtIssueLinks.length > 80) root._partyClassCourtIssueLinks = root._partyClassCourtIssueLinks.slice(-80);
    }
    existing.issueId = existing.issueId || issueId;
    existing.topic = existing.topic || topicText;
    existing.party = existing.party || partyName;
    existing.sourceParty = existing.sourceParty || partyName;
    existing.className = existing.className || className;
    existing.sourceClass = existing.sourceClass || className;
    existing.goalText = existing.goalText || topic.goalText || (action.actorType === 'party' ? action.agenda : '');
    existing.demandText = existing.demandText || topic.demandText || (action.actorType === 'class' ? action.agenda : '');
    existing.actionPressure = round2(Number(topic.actionPressure) || 0);
    existing.reason = compact(topic.reason || [action.actorId, action.actionType, action.agenda || action.grievance].filter(Boolean).join(' - '), 220);
    existing.linkedActions = toArray(existing.linkedActions);
    toArray(topic.linkedActions).forEach(function(key) { pushUniqueText(existing.linkedActions, key); });
    return existing;
  }

  function bridgeActionsToTinyi(root, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var summary = { created: 0, strengthened: 0, linkedActions: 0, topics: [] };
    recentActions(root, { turn: turn, limit: 80 }).forEach(function(action) {
      var bridged = ensureTinyiTopicFromAction(root, action, options);
      if (!bridged || !bridged.topic) return;
      if (bridged.created) summary.created += 1;
      else if (bridged.linked) summary.strengthened += 1;
      if (bridged.linked) summary.linkedActions += 1;
      ensureCourtIssueLinkFromTopic(root, bridged.topic, action, options);
      var id = bridged.topic.issueId || bridged.topic.id || bridged.topic.topic;
      var topicSummary = {
        issueId: bridged.topic.issueId || bridged.topic.id || '',
        topic: bridged.topic.topic || '',
        priority: bridged.topic.priority,
        actionPressure: bridged.topic.actionPressure,
        sourceParty: bridged.topic.sourceParty || bridged.topic.party || '',
        sourceClass: bridged.topic.sourceClass || bridged.topic.className || ''
      };
      var summaryIdx = -1;
      summary.topics.some(function(x, idx) {
        if (String(x.issueId || x.topic) === String(id)) {
          summaryIdx = idx;
          return true;
        }
        return false;
      });
      if (summaryIdx >= 0) summary.topics[summaryIdx] = topicSummary;
      else summary.topics.push(topicSummary);
    });
    return summary;
  }

  function recordActionSignals(root, options) {
    if (!TM.SocialPoliticalSignals || typeof TM.SocialPoliticalSignals.record !== 'function') return 0;
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var seen = ensureMap(root, '_partyClassActionSignalKeys');
    var count = 0;
    recentActions(root, { turn: turn, limit: 80 }).forEach(function(action) {
      if (!action || !action.id) return;
      var key = action.id + '|' + (action.updatedTurn || action.turn || turn);
      if (seen[key]) return;
      seen[key] = true;
      var impact = actionSignalImpact(action);
      var raw = {
        sourceSystem: 'party-class-action',
        kind: 'party-class-action-' + action.actionType,
        skipEcology: true,
        turn: turn,
        tags: ['party-class-action', action.actorType, action.actionType].filter(Boolean),
        intensity: action.actionType === 'revolt_seed' ? 0.72 : (action.actionType === 'strike' ? 0.64 : 0.48),
        confidence: clamp(action.confidence != null ? action.confidence : 0.62, 0, 1),
        linkedIssue: action.linkedIssue || '',
        reason: compact([action.actorId, action.actionType, action.agenda || action.grievance].filter(Boolean).join(' - '), 220),
        affectedClasses: impact.affectedClasses || [],
        affectedParties: impact.affectedParties || []
      };
      TM.SocialPoliticalSignals.record(root, raw);
      count++;
    });
    return count;
  }

  function applyActionSignals(root, options, summary) {
    if (!summary.actionSignals) return;
    if (TM.PartyClassSignalBridge && typeof TM.PartyClassSignalBridge.applyPending === 'function') {
      summary.actionSignalApply = TM.PartyClassSignalBridge.applyPending(root, {
        source: sourceName(options, 'party-class-action-scheduler-actions'),
        turn: options.turn
      });
    } else if (TM.SocialPoliticalSignals && typeof TM.SocialPoliticalSignals.applyPending === 'function') {
      summary.actionSignalApply = TM.SocialPoliticalSignals.applyPending(root, {
        source: sourceName(options, 'party-class-action-scheduler-actions'),
        turn: options.turn
      });
    }
  }

  function pushHistory(root, summary) {
    if (!Array.isArray(root._partyClassActionSchedulerHistory)) root._partyClassActionSchedulerHistory = [];
    root._partyClassActionSchedulerHistory.push({
      turn: summary.turn,
      source: summary.source,
      seededMemories: summary.seededMemories,
      tinyiBridge: clone(summary.tinyiBridge || null),
      actionSignals: summary.actionSignals,
      actorRun: clone(summary.actorRun || null),
      at: Date.now()
    });
    if (root._partyClassActionSchedulerHistory.length > 40) root._partyClassActionSchedulerHistory = root._partyClassActionSchedulerHistory.slice(-40);
  }

  function scheduleBeforeSubmit(root, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var runOptions = {
      turn: turn,
      source: sourceName(options, 'party-class-action-scheduler'),
      skipSignalMaintenance: !!options.skipSignalMaintenance,
      skipRuntimeScan: !!options.skipRuntimeScan
    };
    var summary = {
      turn: turn,
      source: runOptions.source,
      signalMaintenance: null,
      runtimeSignals: null,
      signalApply: null,
      seededMemories: 0,
      actorTick: null,
      actorRun: null,
      tinyiBridge: null,
      actionSignals: 0,
      actionSignalApply: null
    };
    try { runSignalBridge(root, runOptions, summary); } catch (e) { summary.signalError = String(e && e.message || e); }
    try {
      summary.seededMemories += seedMemoriesFromSignals(root, runOptions);
      summary.seededMemories += seedMemoriesFromRelations(root, runOptions);
    } catch (e2) {
      summary.memoryError = String(e2 && e2.message || e2);
    }
    try {
      if (TM.PartyClassActors && typeof TM.PartyClassActors.tick === 'function') {
        summary.actorTick = TM.PartyClassActors.tick(root, {
          source: runOptions.source + '-maintenance',
          turn: turn
        });
      }
      if (TM.PartyClassActors && typeof TM.PartyClassActors.run === 'function') {
        summary.actorRun = TM.PartyClassActors.run(root, {
          source: runOptions.source,
          turn: turn
        });
      }
    } catch (e3) {
      summary.actorError = String(e3 && e3.message || e3);
    }
    try {
      summary.tinyiBridge = bridgeActionsToTinyi(root, runOptions);
    } catch (eTinyi) {
      summary.tinyiBridgeError = String(eTinyi && eTinyi.message || eTinyi);
    }
    try {
      summary.actionSignals = recordActionSignals(root, runOptions);
      applyActionSignals(root, runOptions, summary);
    } catch (e4) {
      summary.actionSignalError = String(e4 && e4.message || e4);
    }
    root._partyClassActionSchedulerLastRun = clone(summary);
    pushHistory(root, summary);
    return clone(summary);
  }

  function formatActionLine(action) {
    return '- T' + (action.turn || '') + ' ' + (action.actorType || '') + ' ' + (action.actorId || '')
      + ' action=' + (action.actionType || '')
      + ' status=' + (action.status || '')
      + (action.linkedIssue ? ' issue=' + action.linkedIssue : '')
      + ' agenda=' + compact(action.agenda || action.grievance || '', 120);
  }

  function formatMemoryLine(memory) {
    return '- T' + (memory.turn || '') + ' ' + (memory.actorType || '') + ' ' + (memory.actorId || '')
      + (memory.linkedIssue ? ' issue=' + memory.linkedIssue : '')
      + ' agenda=' + compact(memory.agenda || memory.grievance || memory.belief || '', 120);
  }

  function formatTinyiLine(topic) {
    return '- ' + compact(topic.topic || topic.title || topic.issueId || topic.id || 'pending tinyi', 120)
      + (topic.issueId || topic.id ? ' issue=' + (topic.issueId || topic.id) : '')
      + ' priority=' + (topic.priority != null ? topic.priority : '')
      + ' actionPressure=' + (topic.actionPressure != null ? topic.actionPressure : 0)
      + (topic.sourceParty || topic.party ? ' party=' + (topic.sourceParty || topic.party) : '')
      + (topic.sourceClass || topic.className ? ' class=' + (topic.sourceClass || topic.className) : '')
      + (toArray(topic.linkedActions).length ? ' linkedActions=' + toArray(topic.linkedActions).slice(-6).join(',') : '');
  }

  function formatForPrompt(root, options) {
    root = pickRoot(root);
    options = options || {};
    var limit = Math.max(1, Math.min(20, Number(options.limit || 10) || 10));
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var snap = null;
    try {
      if (TM.PartyClassActors && typeof TM.PartyClassActors.snapshot === 'function') snap = TM.PartyClassActors.snapshot(root, { turn: turn, limit: limit });
    } catch (_) { snap = null; }
    var partyActions = toArray(snap && snap.partyActions || root.party_actions).filter(function(x) { return actionIsActive(x, turn); }).slice(-limit);
    var classActions = toArray(snap && snap.classActions || root.class_actions).filter(function(x) { return actionIsActive(x, turn); }).slice(-limit);
    var memories = toArray(snap && snap.memories || (root._partyClassActorMemory && root._partyClassActorMemory.items)).slice(-limit);
    var tinyiPressure = toArray(root._pendingTinyiTopics).filter(function(topic) {
      return topic && (Number(topic.actionPressure) > 0 || toArray(topic.linkedActions).length);
    }).slice(-limit);
    if (!partyActions.length && !classActions.length && !memories.length && !tinyiPressure.length) return '';
    var lines = ['\n\n=== Party Class Actor Actions ==='];
    lines.push('Use these as autonomous party/class intent and pressure evidence for the current turn simulation. The player cannot directly command these actions; formal edicts, memorial replies, audience/court debate, and letters can redirect them.');
    var last = root._partyClassActionSchedulerLastRun;
    if (last) lines.push('lastScheduler turn=' + (last.turn || '') + ' source=' + (last.source || '') + ' actionSignals=' + (last.actionSignals || 0) + ' tinyiLinked=' + (last.tinyiBridge && last.tinyiBridge.linkedActions || 0));
    if (partyActions.length) lines.push('party_actions:\n' + partyActions.map(formatActionLine).join('\n'));
    if (classActions.length) lines.push('class_actions:\n' + classActions.map(formatActionLine).join('\n'));
    if (tinyiPressure.length) lines.push('action_tinyi_pressure:\n' + tinyiPressure.map(formatTinyiLine).join('\n'));
    if (memories.length) lines.push('actor_memory:\n' + memories.map(formatMemoryLine).join('\n'));
    return lines.join('\n');
  }

  function snapshot(root, options) {
    root = pickRoot(root);
    options = options || {};
    return {
      lastRun: clone(root._partyClassActionSchedulerLastRun || null),
      history: toArray(root._partyClassActionSchedulerHistory).slice(-(Number(options.limit || 10) || 10)).map(clone),
      actions: recentActions(root, options).map(clone)
    };
  }

  TM.PartyClassActionScheduler = {
    scheduleBeforeSubmit: scheduleBeforeSubmit,
    formatForPrompt: formatForPrompt,
    snapshot: snapshot,
    _bridgeActionsToTinyi: bridgeActionsToTinyi,
    _recordActionSignals: recordActionSignals,
    _seedMemoriesFromSignals: seedMemoriesFromSignals,
    _seedMemoriesFromRelations: seedMemoriesFromRelations
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TM.PartyClassActionScheduler;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
