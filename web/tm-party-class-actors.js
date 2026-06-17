// @ts-check
/*
 * tm-party-class-actors.js
 * Deterministic actor layer for party/class actions and memory.
 */
(function(global) {
  'use strict';

  var TM = global.TM = global.TM || {};
  var MAX_ACTIONS = 120;
  var MAX_MEMORY = 180;
  var ACTION_TYPES = [
    'memorial',
    'association',
    'petition',
    'obstruction',
    'propaganda',
    'funding',
    'alliance',
    'split',
    'strike',
    'revolt_seed'
  ];

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

  function tuneNumber(root, path, fallback) {
    try {
      if (TM.PartyClassTuning && typeof TM.PartyClassTuning.number === 'function') {
        return TM.PartyClassTuning.number(root, path, fallback);
      }
    } catch (_) {}
    return fallback;
  }

  function getClasses(root) {
    root = pickRoot(root);
    if (Array.isArray(root.classes)) return root.classes;
    if (Array.isArray(root.socialClasses)) return root.socialClasses;
    if (root.scriptData && Array.isArray(root.scriptData.classes)) return root.scriptData.classes;
    if (root.scriptData && Array.isArray(root.scriptData.socialClasses)) return root.scriptData.socialClasses;
    if (global.P && Array.isArray(global.P.classes)) return global.P.classes;
    if (global.P && Array.isArray(global.P.socialClasses)) return global.P.socialClasses;
    if (global.scriptData && Array.isArray(global.scriptData.classes)) return global.scriptData.classes;
    if (global.scriptData && Array.isArray(global.scriptData.socialClasses)) return global.scriptData.socialClasses;
    return [];
  }

  function getParties(root) {
    root = pickRoot(root);
    if (Array.isArray(root.parties)) return root.parties;
    if (root.scriptData && Array.isArray(root.scriptData.parties)) return root.scriptData.parties;
    if (global.P && Array.isArray(global.P.parties)) return global.P.parties;
    if (global.scriptData && Array.isArray(global.scriptData.parties)) return global.scriptData.parties;
    if (root.partyState && typeof root.partyState === 'object') {
      return Object.keys(root.partyState).map(function(name) {
        var row = root.partyState[name];
        if (row && typeof row === 'object') {
          if (!row.name) row.name = name;
          return row;
        }
        return { name: name };
      });
    }
    return [];
  }

  function classNameOf(cls) {
    return String(cls && (cls.name || cls.className || cls.id) || '').trim();
  }

  function partyNameOf(party) {
    return String(party && (party.name || party.partyName || party.id) || '').trim();
  }

  function entryName(entry) {
    if (typeof entry === 'string') return entry.trim();
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.name || entry.characterName || entry.person || entry.npc || entry.id || entry.actor || entry.delegateCharacter || '').trim();
  }

  function ensureMemory(root) {
    root = pickRoot(root);
    if (!root._partyClassActorMemory || typeof root._partyClassActorMemory !== 'object' || Array.isArray(root._partyClassActorMemory)) {
      root._partyClassActorMemory = {
        turn: Number(root.turn) || 0,
        seq: 0,
        items: []
      };
    }
    if (!Array.isArray(root._partyClassActorMemory.items)) root._partyClassActorMemory.items = [];
    return root._partyClassActorMemory;
  }

  function remember(root, raw) {
    root = pickRoot(root);
    raw = raw || {};
    var store = ensureMemory(root);
    store.turn = Number(root.turn) || store.turn || 0;
    store.seq = (Number(store.seq) || 0) + 1;
    var turn = Number(raw.turn != null ? raw.turn : root.turn) || 0;
    var entry = {
      id: raw.id || ('pcmem-' + turn + '-' + store.seq),
      turn: turn,
      actorType: compact(raw.actorType, 24),
      actorId: compact(raw.actorId || raw.name, 80),
      agenda: compact(raw.agenda, 160),
      grievance: compact(raw.grievance, 160),
      belief: compact(raw.belief, 180),
      source: compact(raw.source || 'party-class-actor', 80),
      confidence: clamp(raw.confidence != null ? raw.confidence : 0.68, 0, 1),
      expiry: Number(raw.expiry != null ? raw.expiry : raw.expiresTurn),
      linkedIssue: compact(raw.linkedIssue || raw.issueId, 100),
      actionId: raw.actionId || '',
      delegateCharacter: compact(raw.delegateCharacter || raw.delegateName || '', 80),
      delegateCharacterId: compact(raw.delegateCharacterId || raw.delegateId || '', 80),
      delegateRole: compact(raw.delegateRole || '', 32),
      delegateEvidence: compact(raw.delegateEvidence || '', 180)
    };
    if (!isFinite(entry.expiry)) entry.expiry = turn + 6;
    store.items.push(entry);
    if (store.items.length > MAX_MEMORY) store.items = store.items.slice(-MAX_MEMORY);
    return clone(entry);
  }

  function activeGoals(root, partyName, turn) {
    try {
      if (TM.PartyGoals && typeof TM.PartyGoals.getActiveGoals === 'function') {
        return TM.PartyGoals.getActiveGoals(root, partyName, { turn: turn }) || [];
      }
    } catch (_) {}
    var party = getParties(root).filter(function(p) { return partyNameOf(p) === partyName; })[0] || null;
    return toArray(party && (party.goals || party.partyGoals)).filter(Boolean);
  }

  function findIssue(root, text) {
    text = String(textOf(text) || '').toLowerCase();
    if (!text) return '';
    var best = '';
    var tokens = text.split(/[\s,.;:!?()[\]{}"'`\/\\|_-]+/).filter(function(x) { return x && x.length >= 3; });
    [
      root && root.currentIssues,
      root && root._pendingTinyiTopics,
      root && root.pendingTinyiTopics,
      root && root._partyClassCourtIssues
    ].forEach(function(list) {
      toArray(list).forEach(function(issue) {
        if (!issue || best) return;
        var hay = textOf([issue.id, issue.issueId, issue.topic, issue.title, issue.category, issue.content, issue.summary]).toLowerCase();
        if (!hay) return;
        if (hay.indexOf(text) >= 0 || text.indexOf(hay) >= 0 || tokens.some(function(token) { return hay.indexOf(token) >= 0; })) {
          best = issue.id || issue.issueId || issue.topic || issue.title || '';
        }
      });
    });
    return compact(best, 100);
  }

  function isResolvedCourtStatus(status) {
    return /issued|reissued|resolved|fulfilled|closed|done|approved|enacted/.test(String(status || '').toLowerCase());
  }

  function issueKeys(row) {
    return [
      row && row.id,
      row && row.issueId,
      row && row.topicId,
      row && row.chaoyiTrackId,
      row && row.linkedIssue,
      row && row.topic,
      row && row.title
    ].map(function(x) { return normalizeName(x); }).filter(Boolean);
  }

  function findCourtResolution(root, linkedIssue) {
    var wanted = normalizeName(linkedIssue);
    if (!wanted) return null;
    var found = null;
    [
      root && root._courtRecords,
      root && root.tinyiSeals,
      root && root.recentChaoyi,
      root && root._partyClassCourtIssues
    ].forEach(function(list) {
      if (found) return;
      toArray(list).forEach(function(row) {
        if (!row || found) return;
        if (!isResolvedCourtStatus(row.sealStatus || row.status || row.result || row.outcome)) return;
        var matched = issueKeys(row).some(function(k) {
          return k === wanted || k.indexOf(wanted) >= 0 || wanted.indexOf(k) >= 0;
        });
        if (matched) found = row;
      });
    });
    return found;
  }

  function pushBounded(list, item, maxLen) {
    list.push(item);
    if (list.length > maxLen) list.splice(0, list.length - maxLen);
  }

  function findExistingAction(root, action) {
    var list = action.actorType === 'party' ? root.party_actions : root.class_actions;
    return toArray(list).filter(function(row) {
      return row && row.turn === action.turn && row.actorType === action.actorType && row.actorId === action.actorId
        && row.actionType === action.actionType && row.linkedIssue === action.linkedIssue;
    })[0] || null;
  }

  function shouldUpgradeAction(existing, action) {
    if (!existing || !action) return false;
    var source = String(action.source || '').toLowerCase();
    if (/calibrat|llm|issue-link|goal-link/.test(source)) return true;
    if (!existing.delegateCharacter && action.delegateCharacter) return true;
    if (!existing.agenda && action.agenda) return true;
    if (String(action.agenda || '').length > String(existing.agenda || '').length + 12) return true;
    return false;
  }

  function syncActorAction(actor, field, action) {
    if (!actor || !field || !Array.isArray(actor[field]) || !action || !action.id) return;
    for (var i = 0; i < actor[field].length; i += 1) {
      if (actor[field][i] && actor[field][i].id === action.id) {
        actor[field][i] = clone(action);
        return;
      }
    }
  }

  function classDelegateEdges(root, cls, turn) {
    var className = classNameOf(cls);
    var out = [];
    var seen = {};
    function addEdge(edge) {
      if (!edge || normalizeName(edge.className) !== normalizeName(className)) return;
      var expiry = Number(edge.expiry);
      if (isFinite(expiry) && expiry < turn) return;
      var role = String(edge.role || '').toLowerCase();
      if (/suppressor|enemy/.test(role)) return;
      if ((Number(edge.grievance) || 0) >= 0.5) return;
      var key = normalizeName(edge.characterId || edge.characterName);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(edge);
    }
    toArray(cls && cls.classCharacterRelations).forEach(addEdge);
    var store = root && root.classCharacterRelations && root.classCharacterRelations.edges;
    if (store && typeof store === 'object') {
      Object.keys(store).forEach(function(k) { addEdge(store[k]); });
    }
    return out.sort(function(a, b) {
      function score(e) {
        var role = String(e && e.role || '').toLowerCase();
        var roleBonus = role === 'spokesperson' ? 0.12 : (role === 'broker' ? 0.08 : (role === 'patron' ? 0.06 : 0));
        return (Number(e.affinity) || 0) * 0.2
          + (Number(e.legitimacy) || 0) * 0.28
          + (Number(e.trust) || 0) * 0.28
          + (Number(e.mobilization) || 0) * 0.18
          - (Number(e.grievance) || 0) * 0.3
          + roleBonus;
      }
      return score(b) - score(a);
    });
  }

  function classRepresentativeFallback(cls) {
    var lists = [cls && cls.representativeNpcs, cls && cls.leaders, cls && cls.representatives];
    for (var i = 0; i < lists.length; i += 1) {
      var rows = toArray(lists[i]);
      for (var j = 0; j < rows.length; j += 1) {
        var name = entryName(rows[j]);
        if (name) {
          return {
            characterName: name,
            characterId: rows[j] && typeof rows[j] === 'object' ? String(rows[j].id || rows[j].characterId || '') : '',
            role: 'spokesperson',
            source: 'class-representative',
            evidence: ['class representative field']
          };
        }
      }
    }
    return null;
  }

  function classDelegateForAction(root, cls, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var edge = classDelegateEdges(root, cls, turn)[0] || classRepresentativeFallback(cls);
    if (!edge) return null;
    return {
      characterName: compact(edge.characterName || edge.name, 80),
      characterId: compact(edge.characterId || '', 80),
      role: compact(edge.role || 'spokesperson', 32),
      source: compact(edge.source || 'class-character-relations', 80),
      evidence: compact(toArray(edge.evidence).join(' / '), 180)
    };
  }

  function enrichClassActionDelegate(root, actor, raw, options) {
    raw = raw || {};
    if (raw.actorType !== 'class') return raw;
    if (raw.delegateCharacter || raw.delegateCharacterId) return raw;
    var delegate = classDelegateForAction(root, actor, options);
    if (!delegate || !delegate.characterName) return raw;
    var next = Object.assign({}, raw);
    next.delegateCharacter = delegate.characterName;
    next.delegateCharacterId = delegate.characterId;
    next.delegateRole = delegate.role;
    next.delegateEvidence = delegate.evidence;
    next.delegateSource = delegate.source;
    next.linkedCharacters = [{ id: delegate.characterId, name: delegate.characterName, role: delegate.role }];
    return next;
  }

  function addAction(root, actor, raw, options) {
    root = pickRoot(root);
    options = options || {};
    raw = raw || {};
    raw = enrichClassActionDelegate(root, actor, raw, options);
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    if (!root.party_actions) root.party_actions = [];
    if (!root.class_actions) root.class_actions = [];
    var action = {
      id: raw.id || ('pcact-' + turn + '-' + (root.party_actions.length + root.class_actions.length + 1)),
      turn: turn,
      actorType: raw.actorType,
      actorId: raw.actorId,
      actionType: raw.actionType,
      agenda: compact(raw.agenda, 160),
      grievance: compact(raw.grievance, 160),
      belief: compact(raw.belief, 180),
      source: compact(raw.source || options.source || 'party-class-actor', 80),
      confidence: clamp(raw.confidence != null ? raw.confidence : 0.68, 0, 1),
      expiry: Number(raw.expiry != null ? raw.expiry : turn + 4),
      linkedIssue: compact(raw.linkedIssue || '', 100),
      status: raw.status || 'planned',
      delegateCharacter: compact(raw.delegateCharacter || raw.delegateName || '', 80),
      delegateCharacterId: compact(raw.delegateCharacterId || raw.delegateId || '', 80),
      delegateRole: compact(raw.delegateRole || '', 32),
      delegateSource: compact(raw.delegateSource || '', 80),
      delegateEvidence: compact(raw.delegateEvidence || '', 180),
      linkedCharacters: toArray(raw.linkedCharacters).filter(Boolean).slice(0, 4).map(clone)
    };
    if (!ACTION_TYPES.includes(action.actionType)) return null;
    if (!action.actorType || !action.actorId) return null;
    var existing = findExistingAction(root, action);
    if (existing) {
      if (!shouldUpgradeAction(existing, action)) return null;
      existing.agenda = action.agenda || existing.agenda;
      existing.grievance = action.grievance || existing.grievance;
      existing.belief = action.belief || existing.belief;
      existing.source = action.source || existing.source;
      existing.confidence = Math.max(Number(existing.confidence) || 0, Number(action.confidence) || 0);
      existing.expiry = Math.max(Number(existing.expiry) || 0, Number(action.expiry) || 0);
      existing.status = action.status || existing.status;
      existing.delegateCharacter = action.delegateCharacter || existing.delegateCharacter || '';
      existing.delegateCharacterId = action.delegateCharacterId || existing.delegateCharacterId || '';
      existing.delegateRole = action.delegateRole || existing.delegateRole || '';
      existing.delegateSource = action.delegateSource || existing.delegateSource || '';
      existing.delegateEvidence = action.delegateEvidence || existing.delegateEvidence || '';
      existing.linkedCharacters = action.linkedCharacters && action.linkedCharacters.length ? clone(action.linkedCharacters) : toArray(existing.linkedCharacters).map(clone);
      existing.updatedTurn = turn;
      existing.updatedSource = action.source || '';
      syncActorAction(actor, action.actorType === 'party' ? 'party_actions' : 'class_actions', existing);
      remember(root, {
        turn: turn,
        actorType: existing.actorType,
        actorId: existing.actorId,
        agenda: existing.agenda,
        grievance: existing.grievance,
        belief: existing.belief,
        source: existing.source,
        confidence: existing.confidence,
        expiry: existing.expiry,
        linkedIssue: existing.linkedIssue,
        actionId: existing.id,
        delegateCharacter: existing.delegateCharacter,
        delegateCharacterId: existing.delegateCharacterId,
        delegateRole: existing.delegateRole,
        delegateEvidence: existing.delegateEvidence
      });
      return clone(existing);
    }
    var targetList = action.actorType === 'party' ? root.party_actions : root.class_actions;
    pushBounded(targetList, action, MAX_ACTIONS);
    var field = action.actorType === 'party' ? 'party_actions' : 'class_actions';
    if (actor && typeof actor === 'object') {
      if (!Array.isArray(actor[field])) actor[field] = [];
      pushBounded(actor[field], clone(action), 24);
    }
    remember(root, {
      turn: turn,
      actorType: action.actorType,
      actorId: action.actorId,
      agenda: action.agenda,
      grievance: action.grievance,
      belief: action.belief,
      source: action.source,
      confidence: action.confidence,
      expiry: action.expiry,
      linkedIssue: action.linkedIssue,
      actionId: action.id,
      delegateCharacter: action.delegateCharacter,
      delegateCharacterId: action.delegateCharacterId,
      delegateRole: action.delegateRole,
      delegateEvidence: action.delegateEvidence
    });
    return clone(action);
  }

  function classDemand(cls) {
    return compact(cls && (cls.demands || cls.currentDemand || cls.shortGoal || cls.currentAgenda), 150);
  }

  function classUnrest(cls, key) {
    var u = cls && cls.unrestLevels;
    var n = Number(u && u[key]);
    return isFinite(n) ? n : 0;
  }

  function markExpiredActions(root, turn) {
    var count = 0;
    ['party_actions', 'class_actions'].forEach(function(field) {
      toArray(root[field]).forEach(function(action) {
        if (!action || action.status === 'expired' || action.status === 'resolved') return;
        var expiry = Number(action.expiry);
        if (isFinite(expiry) && expiry < turn) {
          action.status = 'expired';
          action.active = false;
          action.expiredTurn = turn;
          count++;
        }
      });
    });
    return count;
  }

  function findClassByName(root, name) {
    var wanted = normalizeName(name);
    if (!wanted) return null;
    return getClasses(root).filter(function(cls) { return normalizeName(classNameOf(cls)) === wanted; })[0] || null;
  }

  function actionTypeForMemory(root, memory) {
    var cls = findClassByName(root, memory && memory.actorId);
    var sat = Number(cls && cls.satisfaction);
    if (!isFinite(sat)) sat = 50;
    var revolt = classUnrest(cls, 'revolt');
    var strike = classUnrest(cls, 'strike');
    var revoltSatisfaction = tuneNumber(root, 'actors.revoltSatisfaction', 28);
    var revoltUnrest = tuneNumber(root, 'actors.revoltUnrest', 75);
    var strikeSatisfaction = tuneNumber(root, 'actors.strikeSatisfaction', 35);
    var strikeUnrest = tuneNumber(root, 'actors.strikeUnrest', 60);
    if (sat < revoltSatisfaction || revolt >= revoltUnrest) return 'revolt_seed';
    if (sat < strikeSatisfaction || strike >= strikeUnrest) return 'strike';
    return 'petition';
  }

  function escalateMemoryAction(root, memory, options) {
    if (!memory || memory.actorType !== 'class' || !memory.actorId || !memory.linkedIssue) return null;
    var cls = findClassByName(root, memory.actorId);
    if (!cls) return null;
    var actionType = actionTypeForMemory(root, memory);
    var actionExpiry = tuneNumber(root, 'actors.classActionExpiry.' + actionType, actionType === 'petition' ? 3 : 2);
    return addAction(root, cls, {
      actorType: 'class',
      actorId: memory.actorId,
      actionType: actionType,
      agenda: memory.agenda || classDemand(cls) || 'press unresolved demand',
      grievance: memory.grievance || 'unresolved pressure',
      belief: memory.belief || 'unresolved memory creates action pressure',
      linkedIssue: memory.linkedIssue,
      confidence: Math.max(0.45, Number(memory.confidence) || 0.55),
      expiry: (Number(options.turn != null ? options.turn : root.turn) || 0) + actionExpiry,
      status: 'planned',
      source: options.source || 'party-class-memory-escalation'
    }, options);
  }

  function tick(root, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var summary = { turn: turn, decayedMemories: 0, expiredMemories: 0, resolvedMemories: 0, expiredActions: 0, escalatedActions: 0 };
    var memory = ensureMemory(root);
    var unresolvedAge = Number(options.unresolvedAge != null ? options.unresolvedAge : tuneNumber(root, 'actors.memoryEscalationAge', 2));
    if (!isFinite(unresolvedAge)) unresolvedAge = 2;
    var decayPerTurn = tuneNumber(root, 'actors.memoryConfidenceDecayPerTurn', 0.015);
    var decayCap = tuneNumber(root, 'actors.memoryConfidenceDecayCap', 0.14);
    var resolvedFactor = tuneNumber(root, 'actors.resolvedConfidenceFactor', 0.55);
    var expiredFactor = tuneNumber(root, 'actors.expiredConfidenceFactor', 0.55);
    var minConfidence = tuneNumber(root, 'actors.memoryMinConfidence', 0.08);
    memory.items.forEach(function(item) {
      if (!item || item.status === 'expired' || item.status === 'resolved') return;
      var age = Math.max(0, turn - (Number(item.turn) || turn));
      var oldConfidence = Number(item.confidence);
      if (!isFinite(oldConfidence)) oldConfidence = 0.68;
      var resolution = findCourtResolution(root, item.linkedIssue);
      if (resolution) {
        item.resolved = true;
        item.status = 'resolved';
        item.active = false;
        item.resolvedTurn = turn;
        item.resolution = {
          topic: resolution.topic || resolution.title || '',
          status: resolution.sealStatus || resolution.status || resolution.result || '',
          grade: resolution.grade || ''
        };
        item.confidence = Math.round(clamp(oldConfidence * resolvedFactor, 0.05, 1) * 100) / 100;
        summary.resolvedMemories++;
        return;
      }
      var expiry = Number(item.expiry);
      if (isFinite(expiry) && expiry < turn) {
        item.expired = true;
        item.status = 'expired';
        item.active = false;
        item.expiredTurn = turn;
        item.confidence = Math.round(clamp(oldConfidence * expiredFactor, 0.05, 1) * 100) / 100;
        summary.expiredMemories++;
        return;
      }
      var faded = Math.round(clamp(oldConfidence - Math.min(decayCap, age * decayPerTurn), minConfidence, 1) * 100) / 100;
      if (faded !== oldConfidence) {
        item.confidence = faded;
        summary.decayedMemories++;
      }
      if (item.actorType === 'class' && item.linkedIssue && !item.escalatedActionTurn && age >= unresolvedAge) {
        var action = escalateMemoryAction(root, item, options);
        if (action) {
          item.escalatedActionTurn = turn;
          item.escalatedActionId = action.id;
          summary.escalatedActions++;
        }
      }
    });
    summary.expiredActions = markExpiredActions(root, turn);
    root._partyClassActorsLastTick = clone(summary);
    if (!Array.isArray(root._partyClassActorMaintenance)) root._partyClassActorMaintenance = [];
    root._partyClassActorMaintenance.push({
      turn: turn,
      source: options.source || 'party-class-actor-tick',
      summary: clone(summary),
      at: Date.now()
    });
    if (root._partyClassActorMaintenance.length > 40) root._partyClassActorMaintenance = root._partyClassActorMaintenance.slice(-40);
    return summary;
  }

  function planClassActions(root, cls, options) {
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var name = classNameOf(cls);
    if (!name) return [];
    var out = [];
    var sat = Number(cls && cls.satisfaction);
    if (!isFinite(sat)) sat = 50;
    var inf = Number(cls && cls.influence);
    if (!isFinite(inf)) inf = 50;
    var demand = classDemand(cls);
    var linkedIssue = findIssue(root, demand) || findIssue(root, name);
    var petitionSatisfaction = tuneNumber(root, 'actors.petitionSatisfaction', 55);
    var associationInfluence = tuneNumber(root, 'actors.associationInfluence', 60);
    var strikeSatisfaction = tuneNumber(root, 'actors.strikeSatisfaction', 35);
    var strikeUnrest = tuneNumber(root, 'actors.strikeUnrest', 60);
    var revoltSatisfaction = tuneNumber(root, 'actors.revoltSatisfaction', 28);
    var revoltUnrest = tuneNumber(root, 'actors.revoltUnrest', 75);
    if (demand && sat < petitionSatisfaction) {
      out.push(addAction(root, cls, {
        actorType: 'class',
        actorId: name,
        actionType: 'petition',
        agenda: demand,
        grievance: 'satisfaction ' + Math.round(sat),
        belief: 'court pressure may answer class demand',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.classActionExpiry.petition', 3),
        confidence: 0.72
      }, options));
    }
    if (inf >= associationInfluence && demand) {
      out.push(addAction(root, cls, {
        actorType: 'class',
        actorId: name,
        actionType: 'association',
        agenda: demand,
        grievance: 'organizing around shared demand',
        belief: 'collective organization raises bargaining power',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.classActionExpiry.association', 5),
        confidence: 0.62
      }, options));
    }
    if (sat < strikeSatisfaction || classUnrest(cls, 'strike') >= strikeUnrest) {
      out.push(addAction(root, cls, {
        actorType: 'class',
        actorId: name,
        actionType: 'strike',
        agenda: demand || 'force concession',
        grievance: 'strike pressure ' + Math.round(classUnrest(cls, 'strike') || (100 - sat)),
        belief: 'work stoppage can force policy response',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.classActionExpiry.strike', 2),
        confidence: 0.66
      }, options));
    }
    if (sat < revoltSatisfaction || classUnrest(cls, 'revolt') >= revoltUnrest) {
      out.push(addAction(root, cls, {
        actorType: 'class',
        actorId: name,
        actionType: 'revolt_seed',
        agenda: demand || 'survive local extraction',
        grievance: 'revolt pressure ' + Math.round(classUnrest(cls, 'revolt') || (100 - sat)),
        belief: 'peaceful petition may fail without relief',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.classActionExpiry.revolt_seed', 2),
        confidence: 0.58
      }, options));
    }
    return out.filter(Boolean);
  }

  function planPartyActions(root, party, options) {
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var name = partyNameOf(party);
    if (!name) return [];
    var out = [];
    var influence = Number(party && party.influence);
    if (!isFinite(influence)) influence = 50;
    var cohesion = Number(party && party.cohesion);
    if (!isFinite(cohesion)) cohesion = 50;
    var goals = activeGoals(root, name, turn);
    var agenda = compact((goals[0] && (goals[0].text || goals[0].goalText || goals[0].agenda)) || party.currentAgenda || party.shortGoal || party.agenda, 150);
    var linkedIssue = compact((goals[0] && (goals[0].linkedIssue || goals[0].issueId)) || findIssue(root, agenda), 100);
    if (agenda) {
      out.push(addAction(root, party, {
        actorType: 'party',
        actorId: name,
        actionType: 'memorial',
        agenda: agenda,
        grievance: compact((goals[0] && goals[0].demandText) || party.grievance || '', 150),
        belief: 'formal memorial can move the agenda into court',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.partyActionExpiry.memorial', 4),
        confidence: 0.74
      }, options));
      out.push(addAction(root, party, {
        actorType: 'party',
        actorId: name,
        actionType: 'propaganda',
        agenda: agenda,
        grievance: compact(party.rivalParty || toArray(party.enemies).join('/') || '', 120),
        belief: 'public framing can raise support before a court issue',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.partyActionExpiry.propaganda', 3),
        confidence: 0.6
      }, options));
    }
    if (influence >= 55 && (party.rivalParty || toArray(party.enemies).length || /block|defend|oppose|阻|守|拒/.test(agenda))) {
      out.push(addAction(root, party, {
        actorType: 'party',
        actorId: name,
        actionType: 'obstruction',
        agenda: agenda || 'block rival agenda',
        grievance: compact(party.rivalParty || toArray(party.enemies).join('/') || 'rival agenda', 120),
        belief: 'procedural delay can blunt rival momentum',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.partyActionExpiry.obstruction', 2),
        confidence: 0.64
      }, options));
    }
    if (influence >= 60 && toArray(party.socialBase || party.social_base || party.baseClasses).length) {
      out.push(addAction(root, party, {
        actorType: 'party',
        actorId: name,
        actionType: 'funding',
        agenda: agenda || 'maintain social base',
        grievance: 'support base expects material proof',
        belief: 'funding keeps supporters attached',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.partyActionExpiry.funding', 4),
        confidence: 0.56
      }, options));
    }
    if (party.allyParty || toArray(party.allies).length) {
      out.push(addAction(root, party, {
        actorType: 'party',
        actorId: name,
        actionType: 'alliance',
        agenda: agenda || 'combine votes',
        grievance: compact(party.rivalParty || '', 120),
        belief: 'coalition improves court odds',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.partyActionExpiry.alliance', 5),
        confidence: 0.63
      }, options));
    }
    if (cohesion < 45) {
      out.push(addAction(root, party, {
        actorType: 'party',
        actorId: name,
        actionType: 'split',
        agenda: agenda || 'survive internal fracture',
        grievance: 'cohesion ' + Math.round(cohesion),
        belief: 'internal faction may break away if pressure continues',
        linkedIssue: linkedIssue,
        expiry: turn + tuneNumber(root, 'actors.partyActionExpiry.split', 3),
        confidence: 0.55
      }, options));
    }
    return out.filter(Boolean);
  }

  function run(root, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var result = { turn: turn, actions: 0, partyActions: 0, classActions: 0, memories: 0 };
    getParties(root).forEach(function(party) {
      var rows = planPartyActions(root, party, options);
      result.actions += rows.length;
      result.partyActions += rows.length;
    });
    getClasses(root).forEach(function(cls) {
      var rows = planClassActions(root, cls, options);
      result.actions += rows.length;
      result.classActions += rows.length;
    });
    var memory = ensureMemory(root);
    result.memories = memory.items.length;
    root._partyClassActorsLastRun = clone(result);
    return result;
  }

  function snapshot(root, options) {
    root = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var limit = Math.max(1, Math.min(80, Number(options.limit || 20) || 20));
    var memory = ensureMemory(root);
    var memories = memory.items.filter(function(x) {
      if (!x || x.active === false || x.status === 'expired' || x.status === 'resolved') return false;
      return !x.expiry || Number(x.expiry) >= turn;
    }).slice(-limit).map(clone);
    return {
      turn: turn,
      partyActions: toArray(root.party_actions).slice(-limit).map(clone),
      classActions: toArray(root.class_actions).slice(-limit).map(clone),
      memories: memories,
      lastRun: clone(root._partyClassActorsLastRun || null)
    };
  }

  TM.PartyClassActors = {
    run: run,
    tick: tick,
    remember: remember,
    snapshot: snapshot,
    getActionTypes: function() { return ACTION_TYPES.slice(); },
    _planPartyActions: planPartyActions,
    _planClassActions: planClassActions
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TM.PartyClassActors;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
