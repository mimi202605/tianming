// @ts-check
/*
 * tm-party-goals.js
 * Normalized party goal lifecycle and mutators.
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

  function pickRoot(root) {
    if (root && typeof root === 'object') return root;
    if (global.GM && typeof global.GM === 'object') return global.GM;
    if (global.scriptData && typeof global.scriptData === 'object') return global.scriptData;
    return {};
  }

  function toArray(v) {
    if (v === undefined || v === null || v === '') return [];
    if (Array.isArray(v)) return v.slice();
    return [v];
  }

  function pushUniqueClone(list, value) {
    if (!value) return;
    var item = clone(value);
    var sig = JSON.stringify(item || {});
    if (!list.some(function(existing) { return JSON.stringify(existing || {}) === sig; })) list.push(item);
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  var RELATION_SUPPORT_THRESHOLD = 45;
  var RELATION_ESTRANGED_THRESHOLD = 35;
  var RELATION_STATIC_BASE = 62;
  var RELATION_DYNAMIC_BASE = 28;

  function relationKey(className, partyName) {
    return normalizeName(className) + '::' + normalizeName(partyName);
  }

  function relationStatus(affinity, edge) {
    affinity = clamp(affinity, 0, 100);
    var trust = edge ? clamp(edge.trust, 0, 100) : 50;
    var grievance = edge ? clamp(edge.grievance, 0, 100) : 0;
    if (affinity < 25 || grievance >= 68) return 'estranged';
    if (affinity >= 75 && trust >= 62) return 'patron';
    if (affinity >= RELATION_SUPPORT_THRESHOLD) return 'aligned';
    if (affinity >= RELATION_ESTRANGED_THRESHOLD) return 'wavering';
    return 'latent';
  }

  function ensureDynamicRelationState(root) {
    var source = pickRoot(root);
    if (!source.partyClassRelations || typeof source.partyClassRelations !== 'object') source.partyClassRelations = {};
    if (!source.partyClassRelations.edges || typeof source.partyClassRelations.edges !== 'object') source.partyClassRelations.edges = {};
    if (!Array.isArray(source.partyClassRelations.history)) source.partyClassRelations.history = [];
    return source.partyClassRelations;
  }

  function pushRelationHistory(state, edge, entry) {
    var item = Object.assign({
      turn: 0,
      className: edge.className,
      partyName: edge.partyName,
      affinity: edge.affinity,
      status: edge.status
    }, entry || {});
    edge.history = toArray(edge.history);
    edge.history.push(clone(item));
    if (edge.history.length > 24) edge.history = edge.history.slice(-24);
    state.history.push(clone(item));
    if (state.history.length > 120) state.history = state.history.slice(-120);
  }

  function ensureDynamicRelationEdge(root, className, partyName, options) {
    if (!className || !partyName) return null;
    options = options || {};
    var state = ensureDynamicRelationState(root);
    var key = relationKey(className, partyName);
    var edge = state.edges[key];
    var base = Number(options.baseAffinity != null ? options.baseAffinity : (options.seeded ? RELATION_STATIC_BASE : RELATION_DYNAMIC_BASE));
    if (!isFinite(base)) base = options.seeded ? RELATION_STATIC_BASE : RELATION_DYNAMIC_BASE;
    if (!edge) {
      edge = state.edges[key] = {
        key: key,
        className: className,
        partyName: partyName,
        affinity: clamp(options.affinity != null ? options.affinity : base, 0, 100),
        baseAffinity: clamp(base, 0, 100),
        trust: clamp(options.trust != null ? options.trust : (options.seeded ? 52 : 32), 0, 100),
        grievance: clamp(options.grievance != null ? options.grievance : (options.seeded ? 20 : 45), 0, 100),
        momentum: 0,
        seeded: !!options.seeded,
        status: '',
        evidence: [],
        history: [],
        createdTurn: Number(options.turn) || 0,
        lastTurn: Number(options.turn) || 0
      };
      edge.status = relationStatus(edge.affinity, edge);
    } else {
      edge.className = edge.className || className;
      edge.partyName = edge.partyName || partyName;
      if (options.seeded) edge.seeded = true;
      if (options.baseAffinity != null && isFinite(base)) edge.baseAffinity = clamp(Math.max(edge.baseAffinity || 0, base), 0, 100);
    }
    if (!Array.isArray(edge.evidence)) edge.evidence = [];
    if (!Array.isArray(edge.history)) edge.history = [];
    if (!isFinite(Number(edge.affinity))) edge.affinity = clamp(options.affinity != null ? options.affinity : base, 0, 100);
    if (!isFinite(Number(edge.baseAffinity))) edge.baseAffinity = clamp(base, 0, 100);
    if (!isFinite(Number(edge.trust))) edge.trust = clamp(options.seeded ? 52 : 32, 0, 100);
    if (!isFinite(Number(edge.grievance))) edge.grievance = clamp(options.seeded ? 20 : 45, 0, 100);
    if (!isFinite(Number(edge.momentum))) edge.momentum = 0;
    if (!edge.status) edge.status = relationStatus(edge.affinity, edge);
    if (options.evidence) pushUniqueClone(edge.evidence, options.evidence);
    return edge;
  }

  function adjustDynamicRelation(root, className, partyName, delta, options) {
    options = options || {};
    delta = Number(delta);
    if (!isFinite(delta) || !className || !partyName) return null;
    var state = ensureDynamicRelationState(root);
    var existed = !!state.edges[relationKey(className, partyName)];
    var edge = ensureDynamicRelationEdge(root, className, partyName, {
      turn: options.turn,
      seeded: !!options.seeded,
      baseAffinity: options.baseAffinity,
      evidence: options.evidence,
      affinity: options.affinity
    });
    if (!edge) return null;
    var before = clamp(edge.affinity, 0, 100);
    if (!existed && !options.seeded && options.emergent !== false) delta = delta * 0.35;
    edge.affinity = Math.round(clamp(before + delta, 0, 100) * 100) / 100;
    edge.momentum = Math.round(clamp((Number(edge.momentum) || 0) + delta, -60, 60) * 100) / 100;
    var oldTrust = clamp(edge.trust, 0, 100);
    var oldGrievance = clamp(edge.grievance, 0, 100);
    if (delta >= 0) {
      edge.trust = Math.round(clamp(oldTrust + delta * 0.55, 0, 100) * 100) / 100;
      edge.grievance = Math.round(clamp(oldGrievance - delta * 0.35, 0, 100) * 100) / 100;
    } else {
      edge.trust = Math.round(clamp(oldTrust + delta * 0.3, 0, 100) * 100) / 100;
      edge.grievance = Math.round(clamp(oldGrievance + Math.abs(delta) * 0.8, 0, 100) * 100) / 100;
    }
    var trustDelta = Number(options.trustDelta);
    if (isFinite(trustDelta) && trustDelta) edge.trust = Math.round(clamp(edge.trust + trustDelta, 0, 100) * 100) / 100;
    var grievanceDelta = Number(options.grievanceDelta);
    if (isFinite(grievanceDelta) && grievanceDelta) edge.grievance = Math.round(clamp(edge.grievance + grievanceDelta, 0, 100) * 100) / 100;
    edge.lastTurn = Number(options.turn) || edge.lastTurn || 0;
    edge.lastSource = options.source || edge.lastSource || '';
    edge.lastReason = options.reason || edge.lastReason || '';
    edge.status = relationStatus(edge.affinity, edge);
    pushRelationHistory(state, edge, {
      turn: edge.lastTurn,
      source: options.source || 'dynamic-relation',
      reason: options.reason || '',
      delta: Math.round(delta * 100) / 100,
      before: before,
      after: edge.affinity,
      trust: edge.trust,
      grievance: edge.grievance,
      status: edge.status,
      evidence: options.evidence ? clone(options.evidence) : null
    });
    return edge;
  }

  function applyDynamicRelationAdjustment(root, adjustment, options) {
    var source = pickRoot(root);
    adjustment = adjustment || {};
    options = options || {};
    var className = adjustment.className || adjustment.sourceClass || adjustment.class || adjustment.group || '';
    var partyName = adjustment.partyName || adjustment.party || adjustment.name || adjustment.targetParty || '';
    partyName = resolvePartyName(source, partyName);
    if (!className || !partyName) return null;
    var delta = Number(adjustment.affinityDelta != null ? adjustment.affinityDelta : (adjustment.delta != null ? adjustment.delta : adjustment.affinity_delta));
    if (!isFinite(delta)) delta = 0;
    delta = clamp(delta, -35, 35);
    var trustDelta = Number(adjustment.trustDelta != null ? adjustment.trustDelta : adjustment.trust_delta);
    var grievanceDelta = Number(adjustment.grievanceDelta != null ? adjustment.grievanceDelta : adjustment.grievance_delta);
    var edge = adjustDynamicRelation(source, className, partyName, delta, {
      turn: options.turn,
      source: options.source || adjustment.source || 'llm-party-class-calibration',
      reason: adjustment.reason || options.reason || 'llm-calibration',
      trustDelta: isFinite(trustDelta) ? clamp(trustDelta, -25, 25) : 0,
      grievanceDelta: isFinite(grievanceDelta) ? clamp(grievanceDelta, -25, 25) : 0,
      seeded: !!adjustment.seeded,
      emergent: options.emergent === undefined ? false : options.emergent,
      evidence: {
        className: className,
        partyName: partyName,
        source: options.source || adjustment.source || 'llm-party-class-calibration',
        detail: adjustment.reason || adjustment.detail || ''
      }
    });
    return edge ? clone(edge) : null;
  }

  function textOf(raw) {
    var value = raw;
    if (raw && typeof raw === 'object') {
      value = raw.text || raw.agenda || raw.goal || raw.objective || raw.topic || raw.title || raw.name || raw.summary || raw.desc || raw.demand || '';
    }
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeName(v) {
    return String(v || '')
      .replace(/[（(][^）)]*[）)]/g, '')
      .replace(/[\s\u3000·、,，。.!！?？:：;；"'“”‘’\[\]【】{}<>《》_\-]/g, '')
      .toLowerCase()
      .trim();
  }

  function getClasses(root) {
    var source = pickRoot(root);
    if (Array.isArray(source.classes)) return source.classes;
    if (Array.isArray(source.socialClasses)) return source.socialClasses;
    if (source.scriptData && Array.isArray(source.scriptData.classes)) return source.scriptData.classes;
    if (source.scriptData && Array.isArray(source.scriptData.socialClasses)) return source.scriptData.socialClasses;
    if (global.P && Array.isArray(global.P.classes)) return global.P.classes;
    if (global.P && Array.isArray(global.P.socialClasses)) return global.P.socialClasses;
    if (global.scriptData && Array.isArray(global.scriptData.classes)) return global.scriptData.classes;
    if (global.scriptData && Array.isArray(global.scriptData.socialClasses)) return global.scriptData.socialClasses;
    return [];
  }

  function getParties(root) {
    var source = pickRoot(root);
    if (Array.isArray(source.parties)) return source.parties;
    if (source.scriptData && Array.isArray(source.scriptData.parties)) return source.scriptData.parties;
    if (global.P && Array.isArray(global.P.parties)) return global.P.parties;
    if (global.scriptData && Array.isArray(global.scriptData.parties)) return global.scriptData.parties;
    if (source.partyState && typeof source.partyState === 'object') {
      return Object.keys(source.partyState).map(function(name) {
        var row = source.partyState[name];
        if (row && typeof row === 'object') {
          if (!row.name) row.name = name;
          return row;
        }
        return { name: name };
      });
    }
    return [];
  }

  function hashText(text) {
    var h = 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i += 1) h = ((h * 31) + s.charCodeAt(i)) & 0x7fffffff;
    return h.toString(36);
  }

  function goalId(partyName, kind, text) {
    return 'pg_' + hashText(String(partyName || '') + '|' + String(kind || '') + '|' + String(text || '').toLowerCase());
  }

  function findParty(root, partyOrName) {
    if (partyOrName && typeof partyOrName === 'object') return partyOrName;
    var source = pickRoot(root);
    var name = String(partyOrName || '').trim();
    if (!name) return null;
    var parties = getParties(source);
    for (var i = 0; i < parties.length; i += 1) {
      if (parties[i] && parties[i].name === name) return parties[i];
    }
    var normalized = normalizeName(name);
    for (var j = 0; j < parties.length; j += 1) {
      var p = parties[j];
      if (!p) continue;
      if (normalizeName(p.name) === normalized) return p;
      var aliases = toArray(p.aliases || p.alias || p.otherNames || p.altNames);
      for (var k = 0; k < aliases.length; k += 1) {
        if (normalizeName(aliases[k]) === normalized) return p;
      }
    }
    if (source.partyState && source.partyState[name] && typeof source.partyState[name] === 'object') return source.partyState[name];
    return null;
  }

  function uniquePush(out, value) {
    value = String(value || '').trim();
    if (!value || out.indexOf(value) >= 0) return;
    out.push(value);
  }

  function partyNameFromSupportEntry(entry) {
    if (typeof entry === 'string') return entry.trim();
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.party || entry.partyName || entry.name || entry.target || entry.class || '').trim();
  }

  function resolvePartyName(root, partyRef) {
    var raw = partyNameFromSupportEntry(partyRef);
    if (!raw && typeof partyRef === 'string') raw = partyRef.trim();
    if (!raw) return '';
    var party = findParty(root, raw);
    return party && party.name ? party.name : raw;
  }

  function classNameOf(cls) {
    return String(cls && (cls.name || cls.className || cls.id) || '').trim();
  }

  function textListFromValue(value, out) {
    out = out || [];
    if (value === undefined || value === null || value === '') return out;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out.push(String(value));
      return out;
    }
    if (Array.isArray(value)) {
      value.forEach(function(v) { textListFromValue(v, out); });
      return out;
    }
    if (typeof value === 'object') {
      Object.keys(value).forEach(function(k) {
        var v = value[k];
        if (v === true || typeof v === 'number') out.push(k);
      });
      ['name', 'class', 'className', 'alias', 'title', 'text', 'tag', 'label', 'desc', 'description', 'stance'].forEach(function(k) {
        if (value[k] !== undefined) textListFromValue(value[k], out);
      });
    }
    return out;
  }

  function classEvidenceTokens(cls) {
    var out = [];
    uniquePush(out, classNameOf(cls));
    textListFromValue(cls && (cls.aliases || cls.alias || cls.otherNames || cls.altNames), out);
    textListFromValue(cls && (cls.tags || cls.labels || cls.keywords), out);
    textListFromValue(cls && (cls.bySettlement || cls.byEthnicity || cls.byFaith), out);
    var seen = {};
    return out.map(function(t) { return String(t || '').trim(); }).filter(function(t) {
      var n = normalizeName(t);
      if (!n || n.length < 2 || seen[n]) return false;
      seen[n] = true;
      return true;
    });
  }

  function partyEvidenceText(party) {
    var out = [];
    textListFromValue(party && party.name, out);
    textListFromValue(party && (party.aliases || party.alias || party.otherNames || party.altNames), out);
    textListFromValue(party && (party.base || party.socialBase || party.social_base || party.baseClasses), out);
    textListFromValue(party && (party.description || party.desc || party.ideology || party.org), out);
    textListFromValue(party && (party.policyStance || party.currentAgenda || party.shortGoal || party.longGoal), out);
    textListFromValue(party && (party.tags || party.labels || party.keywords), out);
    return normalizeName(out.join(' '));
  }

  function partyTextMentionsClass(party, cls) {
    var pText = partyEvidenceText(party);
    if (!pText) return null;
    var tokens = classEvidenceTokens(cls);
    for (var i = 0; i < tokens.length; i += 1) {
      var n = normalizeName(tokens[i]);
      if (n && n.length >= 2 && pText.indexOf(n) >= 0) return tokens[i];
    }
    return null;
  }

  function socialBaseClassName(entry) {
    if (typeof entry === 'string') return entry.trim();
    if (!entry || typeof entry !== 'object') return '';
    return String(entry.class || entry.className || entry.name || entry.group || entry.target || '').trim();
  }

  function classMatchesSocialBase(cls, entry) {
    var clsName = classNameOf(cls);
    var baseName = socialBaseClassName(entry);
    return !!clsName && !!baseName && normalizeName(clsName) === normalizeName(baseName);
  }

  function linkedClassesForParty(root, party) {
    var source = pickRoot(root);
    var out = [];
    toArray(party && (party.socialBase || party.social_base || party.baseClasses)).forEach(function(entry) {
      if (typeof entry === 'string') {
        uniquePush(out, entry);
        return;
      }
      if (!entry || typeof entry !== 'object') return;
      var affinity = entry.affinity == null ? 0 : Number(entry.affinity);
      if (!isNaN(affinity) && affinity < 0) return;
      uniquePush(out, entry.class || entry.className || entry.name);
    });
    getClasses(source).forEach(function(cls) {
      if (!cls) return;
      toArray(cls.supportingParties || cls.supporting_parties).forEach(function(entry) {
        if (resolvePartyName(source, entry) === party.name) uniquePush(out, classNameOf(cls));
      });
    });
    return out;
  }

  function defaultPriority(kind) {
    if (kind === 'currentAgenda') return 80;
    if (kind === 'shortGoal') return 65;
    return 50;
  }

  function defaultExpiresTurn(kind, turn) {
    var base = Number(turn) || 0;
    if (kind === 'currentAgenda') return base + 6;
    if (kind === 'shortGoal') return base + 4;
    return base + 6;
  }

  function normalizeGoal(root, party, raw, options) {
    options = options || {};
    var source = pickRoot(root);
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    var obj = raw && typeof raw === 'object' ? raw : {};
    var text = textOf(raw);
    if (!text) return null;
    var kind = obj.kind || obj.goalKind || options.kind || 'currentAgenda';
    var status = obj.status || options.status || 'active';
    var linked = [];
    toArray(obj.linkedClasses || obj.classes || options.linkedClasses).forEach(function(v) { uniquePush(linked, typeof v === 'string' ? v : (v && (v.name || v.className || v.class))); });
    linkedClassesForParty(source, party).forEach(function(v) { uniquePush(linked, v); });
    var goal = {
      id: obj.id || options.id || goalId(party && party.name, kind, text),
      party: (party && party.name) || options.party || '',
      kind: kind,
      type: obj.type || options.type || kind,
      text: text,
      priority: clamp(obj.priority != null ? obj.priority : (options.priority != null ? options.priority : defaultPriority(kind)), 0, 100),
      status: status,
      createdTurn: Number(obj.createdTurn != null ? obj.createdTurn : (options.createdTurn != null ? options.createdTurn : turn)) || 0,
      updatedTurn: Number(obj.updatedTurn != null ? obj.updatedTurn : turn) || 0,
      expiresTurn: Number(obj.expiresTurn != null ? obj.expiresTurn : (options.expiresTurn != null ? options.expiresTurn : defaultExpiresTurn(kind, turn))) || 0,
      linkedClasses: linked,
      linkedTinyi: toArray(obj.linkedTinyi || obj.linked_tinyi || options.linkedTinyi).map(function(v) { return typeof v === 'string' ? v : clone(v); }),
      outcomeHistory: toArray(obj.outcomeHistory || obj.outcome_history).map(clone),
      relationEvidence: toArray(obj.relationEvidence || options.relationEvidence).map(clone),
      source: obj.source || options.source || 'party-goal',
      demandText: obj.demandText || options.demandText || '',
      sourceClass: obj.sourceClass || obj.className || options.sourceClass || '',
      counterTo: obj.counterTo || options.counterTo || '',
      generatedFrom: obj.generatedFrom || options.generatedFrom || ''
    };
    if (raw && typeof raw === 'object' && raw.id) {
      Object.keys(goal).forEach(function(k) { raw[k] = goal[k]; });
      return raw;
    }
    return goal;
  }

  function mergeGoal(base, next) {
    if (!base) return next;
    if (!next) return base;
    base.priority = Math.max(clamp(base.priority, 0, 100), clamp(next.priority, 0, 100));
    base.updatedTurn = Math.max(Number(base.updatedTurn) || 0, Number(next.updatedTurn) || 0);
    if (!base.expiresTurn || (next.expiresTurn && next.expiresTurn > base.expiresTurn)) base.expiresTurn = next.expiresTurn;
    if (next.demandText) base.demandText = next.demandText;
    if (next.sourceClass) base.sourceClass = next.sourceClass;
    if (next.counterTo) base.counterTo = next.counterTo;
    if (next.generatedFrom) base.generatedFrom = next.generatedFrom;
    toArray(next.linkedClasses).forEach(function(v) { uniquePush(base.linkedClasses, v); });
    toArray(next.linkedTinyi).forEach(function(v) {
      var sig = typeof v === 'string' ? v : JSON.stringify(v || {});
      var exists = base.linkedTinyi.some(function(x) { return (typeof x === 'string' ? x : JSON.stringify(x || {})) === sig; });
      if (!exists) base.linkedTinyi.push(clone(v));
    });
    toArray(next.outcomeHistory).forEach(function(v) { base.outcomeHistory.push(clone(v)); });
    base.relationEvidence = toArray(base.relationEvidence);
    toArray(next.relationEvidence).forEach(function(v) { pushUniqueClone(base.relationEvidence, v); });
    return base;
  }

  function syncLegacyMirrors(party) {
    if (!party || !Array.isArray(party.goals)) return party;
    var current = party.goals.filter(function(g) { return g && g.kind === 'currentAgenda' && g.status === 'active'; })
      .sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); })[0];
    var short = party.goals.filter(function(g) { return g && g.kind === 'shortGoal' && g.status === 'active'; })
      .sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); })[0];
    party.currentAgenda = current ? current.text : '';
    party.shortGoal = short ? short.text : '';
    return party;
  }

  function normalizeParty(root, partyOrName, options) {
    var source = pickRoot(root);
    var party = findParty(source, partyOrName);
    if (!party) return [];
    options = options || {};
    var rawGoals = [];
    toArray(party.goals).forEach(function(g) { rawGoals.push(g); });
    toArray(party.partyGoals).forEach(function(g) { rawGoals.push(g); });
    var legacy = [
      { kind: 'currentAgenda', value: party.currentAgenda },
      { kind: 'shortGoal', value: party.shortGoal }
    ];
    legacy.forEach(function(slot) {
      toArray(slot.value).forEach(function(v) {
        var text = textOf(v);
        if (!text) return;
        rawGoals.push(Object.assign({}, (v && typeof v === 'object') ? v : { text: text }, { kind: slot.kind, source: 'legacy-' + slot.kind }));
      });
    });
    var byId = {};
    rawGoals.forEach(function(raw) {
      var normalized = normalizeGoal(source, party, raw, {
        turn: options.turn,
        source: raw && raw.source || options.source || 'normalize-party-goals'
      });
      if (!normalized) return;
      byId[normalized.id] = mergeGoal(byId[normalized.id], normalized);
    });
    party.goals = Object.keys(byId).map(function(id) { return byId[id]; })
      .sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });
    if (party.partyGoals) delete party.partyGoals; // 2026-06-06·partyGoals 是 goals 的冗余别名·存档序列化成两份(JSON不保共享引用)→消除·读取方均 goals||partyGoals 兜底
    syncLegacyMirrors(party);
    return party.goals;
  }

  function isActive(goal, turn) {
    if (!goal || goal.status !== 'active') return false;
    if (goal.expiresTurn && turn && Number(goal.expiresTurn) < Number(turn)) return false;
    return true;
  }

  function expireGoals(root, partyOrName, options) {
    var source = pickRoot(root);
    var party = findParty(source, partyOrName);
    if (!party) return [];
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    normalizeParty(source, party, { turn: turn, source: options.source || 'expire-goals' });
    var expired = [];
    party.goals.forEach(function(goal) {
      if (!goal || goal.status !== 'active' || !goal.expiresTurn || Number(goal.expiresTurn) >= turn) return;
      goal.status = 'expired';
      goal.expiredTurn = turn;
      goal.updatedTurn = turn;
      var entry = {
        turn: turn,
        source: options.source || 'party-goal-expired',
        goalId: goal.id,
        goalText: goal.text,
        goalKind: goal.kind,
        status: 'expired',
        outcome: 'expired'
      };
      goal.outcomeHistory.push(entry);
      if (!Array.isArray(party.agenda_history)) party.agenda_history = [];
      party.agenda_history.push(Object.assign({ agenda: goal.text }, entry));
      expired.push(goal);
    });
    if (party.agenda_history && party.agenda_history.length > 40) party.agenda_history = party.agenda_history.slice(-40);
    syncLegacyMirrors(party);
    return expired;
  }

  function getActiveGoals(root, partyOrName, options) {
    var source = pickRoot(root);
    var party = findParty(source, partyOrName);
    if (!party) return [];
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    expireGoals(source, party, { turn: turn, source: options.source || 'get-active-goals' });
    return normalizeParty(source, party, { turn: turn, source: options.source || 'get-active-goals' })
      .filter(function(goal) {
        if (!isActive(goal, turn)) return false;
        if (options.kind && goal.kind !== options.kind) return false;
        return true;
      })
      .sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });
  }

  function setGoal(root, partyOrName, goalInput, options) {
    var source = pickRoot(root);
    var party = findParty(source, partyOrName);
    if (!party) return null;
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    normalizeParty(source, party, { turn: turn, source: options.source || 'set-goal' });
    var goal = normalizeGoal(source, party, goalInput, options);
    if (!goal) return null;
    var existing = party.goals.filter(function(g) {
      return g && (g.id === goal.id || (g.kind === goal.kind && g.text === goal.text));
    })[0];
    if (existing) {
      var canReactivate = options.reactivate === true || goal.reactivate === true;
      var terminal = existing.status && existing.status !== 'active';
      if (!terminal || canReactivate) existing.status = options.status || goal.status || 'active';
      existing.priority = goal.priority;
      existing.updatedTurn = turn;
      existing.expiresTurn = goal.expiresTurn;
      existing.type = goal.type || existing.type;
      existing.demandText = goal.demandText || existing.demandText || '';
      existing.sourceClass = goal.sourceClass || existing.sourceClass || '';
      existing.counterTo = goal.counterTo || existing.counterTo || '';
      existing.generatedFrom = goal.generatedFrom || existing.generatedFrom || '';
      toArray(goal.linkedClasses).forEach(function(v) { uniquePush(existing.linkedClasses, v); });
      existing.relationEvidence = toArray(existing.relationEvidence);
      toArray(goal.relationEvidence).forEach(function(v) { pushUniqueClone(existing.relationEvidence, v); });
      goal = existing;
    } else {
      party.goals.push(goal);
    }
    // 2026-06-06·去重+封顶·原本每回合 re-set 同一 goal 都无条件 push → 单 goal mutationHistory 累积到数千条同样内容(存档膨胀到60MB主因)
    goal.mutationHistory = toArray(goal.mutationHistory);
    var _mh = { turn: turn, source: options.source || 'set-goal', action: 'set', text: goal.text, kind: goal.kind };
    var _mhLast = goal.mutationHistory[goal.mutationHistory.length - 1];
    if (!_mhLast || _mhLast.action !== _mh.action || _mhLast.text !== _mh.text || _mhLast.kind !== _mh.kind) {
      goal.mutationHistory.push(_mh);
    }
    if (goal.mutationHistory.length > 24) goal.mutationHistory = goal.mutationHistory.slice(-24);
    if (party.partyGoals) delete party.partyGoals; // 2026-06-06·partyGoals 是 goals 的冗余别名·存档序列化成两份(JSON不保共享引用)→消除·读取方均 goals||partyGoals 兜底
    syncLegacyMirrors(party);
    return goal;
  }

  function findGoal(party, goalRef, outcome) {
    var text = textOf(goalRef) || textOf(outcome && (outcome.goalText || outcome.topic));
    var id = typeof goalRef === 'string' ? goalRef : (goalRef && goalRef.id);
    var kind = goalRef && goalRef.kind || outcome && outcome.goalKind || '';
    return (party.goals || []).filter(function(goal) {
      if (!goal) return false;
      if (id && goal.id === id) return true;
      if (text && goal.text === text && (!kind || goal.kind === kind)) return true;
      return false;
    })[0] || null;
  }

  function statusForOutcome(outcome) {
    outcome = outcome || {};
    if (outcome.status && outcome.status !== 'active') return outcome.status;
    if (outcome.sealStatus === 'blocked' || outcome.outcome === 'blocked') return 'blocked';
    if (outcome.outcome === 'resolved') return 'resolved';
    if (outcome.sealStatus === 'issued' || outcome.sealStatus === 'reissued' || outcome.outcome === 'issued') return 'advanced';
    if (outcome.outcome === 'expired') return 'expired';
    return 'advanced';
  }

  function resolveGoal(root, partyOrName, goalRef, outcome, options) {
    var source = pickRoot(root);
    var party = findParty(source, partyOrName);
    if (!party) return null;
    options = options || {};
    outcome = outcome || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    normalizeParty(source, party, { turn: turn, source: options.source || outcome.source || 'resolve-goal' });
    var goal = findGoal(party, goalRef, outcome);
    if (!goal) {
      goal = setGoal(source, party, {
        kind: outcome.goalKind || 'currentAgenda',
        text: outcome.goalText || textOf(outcome.topic || goalRef),
        linkedTinyi: outcome.chaoyiTrackId ? [outcome.chaoyiTrackId] : []
      }, { turn: turn, source: options.source || outcome.source || 'resolve-goal' });
    }
    if (!goal) return null;
    var nextStatus = statusForOutcome(outcome);
    goal.status = nextStatus;
    goal.updatedTurn = turn;
    if (nextStatus === 'advanced') goal.advancedTurn = turn;
    if (nextStatus === 'resolved') goal.resolvedTurn = turn;
    if (nextStatus === 'blocked') goal.blockedTurn = turn;
    if (outcome.chaoyiTrackId) uniquePush(goal.linkedTinyi, outcome.chaoyiTrackId);
    var entry = {
      turn: turn,
      source: outcome.source || options.source || 'party-goal-outcome',
      goalId: goal.id,
      goalText: goal.text,
      goalKind: goal.kind,
      party: party.name || String(partyOrName || ''),
      topic: outcome.topic || '',
      sealStatus: outcome.sealStatus || nextStatus,
      outcome: outcome.outcome || nextStatus,
      status: nextStatus,
      grade: outcome.grade || '',
      chaoyiTrackId: outcome.chaoyiTrackId || ''
    };
    goal.outcomeHistory = toArray(goal.outcomeHistory);
    goal.outcomeHistory.push(entry);
    if (!Array.isArray(party.agenda_history)) party.agenda_history = [];
    party.agenda_history.push(Object.assign({ agenda: goal.text }, entry));
    if (party.agenda_history.length > 40) party.agenda_history = party.agenda_history.slice(-40);
    party.lastTinyiGoalOutcome = clone(entry);
    party._lastGoalTinyiOutcomeTurn = turn;
    syncLegacyMirrors(party);
    return { party: party, goal: goal, historyEntry: entry };
  }

  function classDemandText(cls) {
    if (!cls) return '';
    var sources = [cls.demands, cls.currentDemand, cls.currentAgenda, cls.shortGoal];
    for (var i = 0; i < sources.length; i += 1) {
      var arr = toArray(sources[i]);
      for (var j = 0; j < arr.length; j += 1) {
        var text = textOf(arr[j]);
        if (text) return text;
      }
    }
    return '';
  }

  function classHasPressure(cls) {
    if (!cls) return false;
    var levels = cls.unrestLevels || {};
    var sat = Number(cls.satisfaction);
    if (!isFinite(sat)) sat = 50;
    var grievance = Number(levels.grievance);
    var petition = Number(levels.petition);
    var strike = Number(levels.strike);
    var revolt = Number(levels.revolt);
    if (!isFinite(grievance)) grievance = 60;
    if (!isFinite(petition)) petition = 70;
    if (!isFinite(strike)) strike = 80;
    if (!isFinite(revolt)) revolt = 90;
    return sat <= 45 || grievance <= 45 || petition <= 45 || strike <= 35 || revolt <= 35;
  }

  function classDemandPriority(cls) {
    cls = cls || {};
    var levels = cls.unrestLevels || {};
    var sat = Number(cls.satisfaction);
    var influence = Number(cls.influence);
    var grievance = Number(levels.grievance);
    var petition = Number(levels.petition);
    var strike = Number(levels.strike);
    var revolt = Number(levels.revolt);
    if (!isFinite(sat)) sat = 50;
    if (!isFinite(influence)) influence = 40;
    if (!isFinite(grievance)) grievance = 60;
    if (!isFinite(petition)) petition = 70;
    if (!isFinite(strike)) strike = 80;
    if (!isFinite(revolt)) revolt = 90;
    var unrest = Math.max(0, 45 - grievance) * 0.35
      + Math.max(0, 45 - petition) * 0.25
      + Math.max(0, 35 - strike) * 0.15
      + Math.max(0, 35 - revolt) * 0.25;
    return Math.round(clamp(48 + influence * 0.25 + Math.max(0, 50 - sat) * 0.45 + unrest, 45, 100));
  }

  function supportingPartyNamesForClass(root, cls) {
    var source = pickRoot(root);
    var index = buildScenarioRelationIndex(source);
    var className = classNameOf(cls);
    if (index.classParties[className]) return index.classParties[className].slice();
    return [];
  }

  function addRelation(index, className, partyName, source, detail) {
    if (!className || !partyName) return;
    if (!index.classParties[className]) index.classParties[className] = [];
    if (!index.partyClasses[partyName]) index.partyClasses[partyName] = [];
    uniquePush(index.classParties[className], partyName);
    uniquePush(index.partyClasses[partyName], className);
    index.evidence.push({
      className: className,
      partyName: partyName,
      source: source || 'unknown',
      detail: detail || ''
    });
  }

  function relationEvidenceFor(index, className, partyName) {
    return toArray(index && index.evidence).filter(function(e) {
      if (!e) return false;
      if (className && e.className !== className) return false;
      if (partyName && e.partyName !== partyName) return false;
      return true;
    }).map(clone);
  }

  function addStaticRelation(root, index, className, partyName, source, detail) {
    var edge = ensureDynamicRelationEdge(root, className, partyName, {
      seeded: true,
      baseAffinity: RELATION_STATIC_BASE,
      affinity: RELATION_STATIC_BASE,
      evidence: { className: className, partyName: partyName, source: source || 'unknown', detail: detail || '' }
    });
    if (edge && edge.affinity < RELATION_SUPPORT_THRESHOLD) {
      index.evidence.push({
        className: className,
        partyName: partyName,
        source: 'runtime-suppressed',
        detail: (source || 'static') + ':' + Math.round(edge.affinity),
        affinity: edge.affinity,
        status: edge.status
      });
      return;
    }
    addRelation(index, className, partyName, source, detail);
  }

  function addRuntimeRelations(root, index) {
    var state = ensureDynamicRelationState(root);
    Object.keys(state.edges).forEach(function(key) {
      var edge = state.edges[key];
      if (!edge || !edge.className || !edge.partyName) return;
      if (edge.affinity < RELATION_SUPPORT_THRESHOLD) {
        index.evidence.push({
          className: edge.className,
          partyName: edge.partyName,
          source: 'runtime-estranged',
          detail: 'affinity=' + Math.round(edge.affinity),
          affinity: edge.affinity,
          status: edge.status || relationStatus(edge.affinity, edge),
          trust: edge.trust,
          grievance: edge.grievance
        });
        return;
      }
      addRelation(index, edge.className, edge.partyName, 'runtime-affinity', 'affinity=' + Math.round(edge.affinity));
      var last = index.evidence[index.evidence.length - 1];
      if (last) {
        last.affinity = edge.affinity;
        last.status = edge.status || relationStatus(edge.affinity, edge);
        last.trust = edge.trust;
        last.grievance = edge.grievance;
      }
    });
  }

  function buildScenarioRelationIndex(root, options) {
    var source = pickRoot(root);
    var index = {
      classParties: {},
      partyClasses: {},
      evidence: []
    };
    var classes = getClasses(source);
    var parties = getParties(source);
    classes.forEach(function(cls) {
      if (!cls) return;
      var className = classNameOf(cls);
      if (!className) return;
      toArray(cls.supportingParties || cls.supporting_parties).forEach(function(entry) {
        var partyName = resolvePartyName(source, entry);
        if (findParty(source, partyName)) addStaticRelation(source, index, className, partyName, 'class-supportingParties', partyNameFromSupportEntry(entry));
      });
      parties.forEach(function(party) {
        if (!party || !party.name) return;
        toArray(party.socialBase || party.social_base || party.baseClasses).forEach(function(entry) {
          if (!classMatchesSocialBase(cls, entry)) return;
          if (entry && typeof entry === 'object') {
            var affinity = entry.affinity == null ? 0 : Number(entry.affinity);
            if (!isNaN(affinity) && affinity < 0) return;
          }
          addStaticRelation(source, index, className, party.name, 'party-socialBase', socialBaseClassName(entry));
        });
        if (index.classParties[className] && index.classParties[className].indexOf(party.name) >= 0) return;
        var token = partyTextMentionsClass(party, cls);
        if (token) addStaticRelation(source, index, className, party.name, 'party-text', token);
      });
    });
    addRuntimeRelations(source, index);
    source._partyGoalRelationIndex = index;
    if (typeof global !== 'undefined' && global.GM && global.GM !== source && global.GM && typeof global.GM === 'object') {
      global.GM._partyGoalRelationIndex = index;
    }
    return index;
  }

  function opposingPartyNames(root, partyName) {
    var source = pickRoot(root);
    var out = [];
    var party = findParty(source, partyName);
    if (party) {
      uniquePush(out, party.rivalParty || party.rival);
      toArray(party.enemies).forEach(function(v) { uniquePush(out, partyNameFromSupportEntry(v)); });
      toArray(party.rivals).forEach(function(v) { uniquePush(out, partyNameFromSupportEntry(v)); });
    }
    getParties(source).forEach(function(p) {
      if (!p || p.name === partyName) return;
      if (p.rivalParty === partyName || p.rival === partyName) uniquePush(out, p.name);
      toArray(p.enemies).forEach(function(v) {
        if (resolvePartyName(source, v) === partyName) uniquePush(out, p.name);
      });
      toArray(p.rivals).forEach(function(v) {
        if (resolvePartyName(source, v) === partyName) uniquePush(out, p.name);
      });
    });
    return out;
  }

  function deriveFromClassDemands(root, options) {
    var source = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    var sourceGoals = [];
    var counterGoals = [];
    var classDemands = [];
    var relationIndex = buildScenarioRelationIndex(source, options);
    getClasses(source).forEach(function(cls) {
      if (!cls || !classHasPressure(cls)) return;
      var demandText = classDemandText(cls);
      if (!demandText) return;
      var className = classNameOf(cls);
      var supporters = (relationIndex.classParties[className] || []).slice();
      if (!supporters.length) return;
      var priority = classDemandPriority(cls);
      var classDemand = { className: className, demandText: demandText, priority: priority, supporters: supporters.slice() };
      classDemands.push(classDemand);
      supporters.forEach(function(partyName) {
        var relationEvidence = relationEvidenceFor(relationIndex, className, partyName);
        var goal = setGoal(source, partyName, {
          kind: 'classDemand',
          type: 'classDemand',
          text: '\u63A8\u52A8' + demandText,
          priority: priority,
          linkedClasses: [className],
          demandText: demandText,
          sourceClass: className,
          relationEvidence: relationEvidence,
          generatedFrom: 'class-demand'
      }, {
          turn: turn,
          source: options.source || 'derive-class-demand',
          priority: priority,
          expiresTurn: turn + 5,
          demandText: demandText,
          sourceClass: className,
          linkedClasses: [className],
          relationEvidence: relationEvidence,
          generatedFrom: 'class-demand'
        });
        if (!goal || goal.status !== 'active') return;
        sourceGoals.push(goal);
        opposingPartyNames(source, partyName).forEach(function(opponentName) {
          var counter = setGoal(source, opponentName, {
            kind: 'counterClassDemand',
            type: 'counterClassDemand',
            text: '\u53CD\u5BF9' + demandText,
            priority: Math.max(45, priority - 5),
            linkedClasses: [className],
            demandText: demandText,
            sourceClass: className,
            counterTo: goal.id,
            generatedFrom: 'class-demand-counter'
          }, {
            turn: turn,
            source: options.source || 'derive-class-demand-counter',
            priority: Math.max(45, priority - 5),
            expiresTurn: turn + 5,
            demandText: demandText,
            sourceClass: className,
            linkedClasses: [className],
            counterTo: goal.id,
            generatedFrom: 'class-demand-counter'
          });
          if (counter && counter.status === 'active') counterGoals.push(counter);
        });
      });
    });
    return {
      ok: sourceGoals.length > 0 || counterGoals.length > 0,
      sourceGoals: sourceGoals,
      counterGoals: counterGoals,
      classDemands: classDemands
    };
  }

  function classByName(root, className) {
    var normalized = normalizeName(className);
    if (!normalized) return null;
    var classes = getClasses(root);
    for (var i = 0; i < classes.length; i += 1) {
      var cls = classes[i];
      if (!cls) continue;
      if (normalizeName(classNameOf(cls)) === normalized) return cls;
      var aliases = toArray(cls.aliases || cls.alias || cls.otherNames || cls.altNames);
      for (var j = 0; j < aliases.length; j += 1) {
        if (normalizeName(aliases[j]) === normalized) return cls;
      }
    }
    return null;
  }

  function gradeWeight(grade) {
    var g = String(grade || '').toUpperCase();
    if (g === 'S') return 1.25;
    if (g === 'A') return 1.1;
    if (g === 'B') return 1;
    if (g === 'D') return 0.75;
    return 0.9;
  }

  function outcomeRelationDelta(outcome) {
    outcome = outcome || {};
    var status = String(outcome.outcome || outcome.sealStatus || outcome.status || '').toLowerCase();
    var base = 0;
    if (/issued|reissued|fulfilled|advanced|resolved/.test(status)) base = 18;
    else if (/partial|contested/.test(status)) base = 8;
    else if (/blocked|backfire|unfulfilled|failed|fail/.test(status)) base = -18;
    else base = 6;
    return Math.round(base * gradeWeight(outcome.grade) * 100) / 100;
  }

  function updateDynamicRelationsFromOutcome(root, outcome, options) {
    var source = pickRoot(root);
    outcome = outcome || {};
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    var updated = [];
    try { buildScenarioRelationIndex(source, { turn: turn, source: options.source || outcome.source || 'party-class-outcome-seed' }); } catch (_) {}
    function update(className, partyName, delta, reason, evidence) {
      var edge = adjustDynamicRelation(source, className, partyName, delta, {
        turn: turn,
        source: options.source || outcome.source || 'party-class-outcome',
        reason: reason,
        evidence: evidence || {
          className: className,
          partyName: partyName,
          source: options.source || outcome.source || 'party-class-outcome',
          detail: outcome.topic || outcome.demandText || outcome.goalText || ''
        }
      });
      if (edge) updated.push(edge);
    }
    toArray(options.applied || outcome.applied || outcome.classOutcomeApplied).forEach(function(item) {
      if (!item) return;
      var className = item.className || item.sourceClass || '';
      toArray(item.refs).forEach(function(ref) {
        if (!ref || !ref.partyName) return;
        var delta = Number(ref.delta);
        if (!isFinite(delta)) return;
        update(className, ref.partyName, delta * 1.7, 'class-engine-ref', {
          className: className,
          partyName: ref.partyName,
          source: 'class-engine-ref',
          detail: ref.outcome || ''
        });
      });
    });
    var className = outcome.sourceClass || outcome.className || '';
    var sourceParty = outcome.sourceParty || outcome.proposerParty || outcome.party || '';
    var baseDelta = outcomeRelationDelta(outcome);
    if (className && sourceParty) {
      update(className, sourceParty, baseDelta, 'source-party-outcome', {
        className: className,
        partyName: sourceParty,
        source: 'tinyi-outcome',
        detail: outcome.outcome || outcome.sealStatus || ''
      });
    }
    var opposingDelta = baseDelta > 0 ? -Math.max(5, baseDelta * 0.45) : Math.max(5, Math.abs(baseDelta) * 0.35);
    toArray(outcome.blockerParty ? [outcome.blockerParty].concat(outcome.opposingParties || []) : outcome.opposingParties).forEach(function(partyName) {
      partyName = resolvePartyName(source, partyName);
      if (!className || !partyName || partyName === sourceParty) return;
      update(className, partyName, opposingDelta, 'opposition-outcome', {
        className: className,
        partyName: partyName,
        source: 'tinyi-opposition-outcome',
        detail: outcome.outcome || outcome.sealStatus || ''
      });
    });
    return { ok: updated.length > 0, updated: updated.map(clone), turn: turn };
  }

  function evolveDynamicRelations(root, options) {
    var source = pickRoot(root);
    options = options || {};
    var turn = Number(options.turn != null ? options.turn : source.turn) || 0;
    var state = ensureDynamicRelationState(source);
    var evolved = [];
    Object.keys(state.edges).forEach(function(key) {
      var edge = state.edges[key];
      if (!edge) return;
      var cls = classByName(source, edge.className);
      var party = findParty(source, edge.partyName);
      var old = clamp(edge.affinity, 0, 100);
      var base = Number(edge.baseAffinity);
      if (!isFinite(base)) base = edge.seeded ? RELATION_STATIC_BASE : RELATION_DYNAMIC_BASE;
      var momentum = Number(edge.momentum) || 0;
      var delta = momentum * 0.08 + (base - old) * 0.025;
      var sat = Number(cls && cls.satisfaction);
      if (isFinite(sat) && sat <= 35) {
        var activeGoals = party ? getActiveGoals(source, party, { turn: turn, source: 'dynamic-relation-tick' }) : [];
        var hasDemand = activeGoals.some(function(g) { return g && g.sourceClass === edge.className && g.kind === 'classDemand'; });
        var hasCounter = activeGoals.some(function(g) { return g && g.sourceClass === edge.className && g.kind === 'counterClassDemand'; });
        if (hasDemand) delta += 1.2;
        else if (hasCounter) delta -= 1.8;
        else delta -= 0.6;
      }
      edge.momentum = Math.round(momentum * 0.58 * 100) / 100;
      edge.affinity = Math.round(clamp(old + delta, 0, 100) * 100) / 100;
      var oldTrust = clamp(edge.trust, 0, 100);
      var oldGrievance = clamp(edge.grievance, 0, 100);
      if (isFinite(sat) && sat <= 35) {
        edge.trust = Math.round(clamp(oldTrust - 0.25, 0, 100) * 100) / 100;
        edge.grievance = Math.round(clamp(oldGrievance + 0.55, 0, 100) * 100) / 100;
      } else if (isFinite(sat) && sat >= 60) {
        edge.trust = Math.round(clamp(oldTrust + 0.18, 0, 100) * 100) / 100;
        edge.grievance = Math.round(clamp(oldGrievance - 0.35, 0, 100) * 100) / 100;
      }
      edge.status = relationStatus(edge.affinity, edge);
      edge.lastTurn = turn;
      pushRelationHistory(state, edge, {
        turn: turn,
        source: options.source || 'dynamic-relation-tick',
        reason: 'tick',
        delta: Math.round(delta * 100) / 100,
        before: old,
        after: edge.affinity,
        trust: edge.trust,
        grievance: edge.grievance,
        status: edge.status
      });
      evolved.push(clone(edge));
    });
    return { ok: evolved.length > 0, evolved: evolved, turn: turn };
  }

  function normalizeAll(root, options) {
    var source = pickRoot(root);
    return getParties(source).map(function(p) { return normalizeParty(source, p, options); });
  }

  TM.PartyGoals = {
    normalizeParty: normalizeParty,
    normalizeAll: normalizeAll,
    getActiveGoals: getActiveGoals,
    setGoal: setGoal,
    resolveGoal: resolveGoal,
    expireGoals: expireGoals,
    deriveFromClassDemands: deriveFromClassDemands,
    buildScenarioRelationIndex: buildScenarioRelationIndex,
    applyDynamicRelationAdjustment: applyDynamicRelationAdjustment,
    updateDynamicRelationsFromOutcome: updateDynamicRelationsFromOutcome,
    evolveDynamicRelations: evolveDynamicRelations,
    _normalizeGoal: normalizeGoal,
    _goalId: goalId
  };
})(typeof window !== 'undefined' ? window : globalThis);
