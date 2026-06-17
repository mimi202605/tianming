/*
 * tm-player-action-signals.js
 * Structured player-operation evidence for dynamic party/class calibration.
 */
(function(global) {
  'use strict';

  var TM = global.TM = global.TM || {};
  var MAX_ITEMS = 80;

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

  function normalize(v) {
    return String(v || '').replace(/[\s\u3000'"`.,;:!?()[\]{}<>\/\\|_-]+/g, '').toLowerCase().trim();
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function compact(v, maxLen) {
    var text = textOf(v).replace(/\s+/g, ' ').trim();
    maxLen = Number(maxLen) || 180;
    return text.length > maxLen ? text.slice(0, maxLen) : text;
  }

  function textOf(raw) {
    if (raw === undefined || raw === null) return '';
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
    if (Array.isArray(raw)) return raw.map(textOf).filter(Boolean).join(' ');
    if (typeof raw === 'object') {
      var keys = ['text', 'content', 'summary', 'desc', 'description', 'agenda', 'goal', 'objective', 'topic', 'title', 'name', 'demand', 'action', 'targetText'];
      for (var i = 0; i < keys.length; i += 1) {
        if (raw[keys[i]] != null && raw[keys[i]] !== '') return textOf(raw[keys[i]]);
      }
    }
    return '';
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

  function getCharacters(root) {
    root = pickRoot(root);
    var lists = [
      root.characters,
      root.chars,
      root.people,
      root.ministers,
      root.scriptData && root.scriptData.characters,
      root.scriptData && root.scriptData.chars,
      global.P && global.P.characters,
      global.P && global.P.chars,
      global.scriptData && global.scriptData.characters,
      global.scriptData && global.scriptData.chars
    ];
    var out = [];
    var seen = {};
    lists.forEach(function(list) {
      toArray(list).forEach(function(ch) {
        if (!ch || typeof ch !== 'object') return;
        var name = characterNameOf(ch);
        var id = characterIdOf(ch);
        var key = normalize(id || name);
        if (!key || seen[key]) return;
        seen[key] = true;
        out.push(ch);
      });
    });
    return out;
  }

  function classNameOf(cls) {
    return String(cls && (cls.name || cls.className || cls.id) || '').trim();
  }

  function partyNameOf(party) {
    return String(party && (party.name || party.partyName || party.id) || '').trim();
  }

  function characterNameOf(ch) {
    return String(ch && (ch.name || ch.characterName || ch.id) || '').trim();
  }

  function characterIdOf(ch) {
    return String(ch && (ch.id || ch.key || ch.charId || ch.characterId) || '').trim();
  }

  function resolveCharacter(root, raw) {
    raw = raw || {};
    var explicitName = compact(raw.characterName || raw.executorName || raw.delegateCharacter || raw.sourceCharacter || raw.actorName || raw.personName || '', 80);
    var explicitId = compact(raw.characterId || raw.executorId || raw.delegateCharacterId || raw.sourceCharacterId || raw.charId || raw.personId || '', 80);
    var candidates = [
      explicitId,
      explicitName,
      raw.targetId,
      raw.target,
      raw.actor,
      raw.from,
      raw.to,
      raw.proposer
    ].map(textOf).filter(Boolean);
    var chars = getCharacters(root);
    for (var i = 0; i < chars.length; i += 1) {
      var ch = chars[i];
      var name = characterNameOf(ch);
      var id = characterIdOf(ch);
      for (var j = 0; j < candidates.length; j += 1) {
        var c = candidates[j];
        if (!c) continue;
        if ((id && normalize(c) === normalize(id)) || (name && normalize(c) === normalize(name))) {
          return { name: name, id: id };
        }
      }
    }
    if (explicitName || explicitId) return { name: explicitName || explicitId, id: explicitId };
    return { name: '', id: '' };
  }

  function collectTexts(obj, fields) {
    var out = [];
    fields.forEach(function(k) {
      var v = obj && obj[k];
      toArray(v).forEach(function(x) {
        var t = textOf(x);
        if (t) out.push(t);
      });
    });
    return out;
  }

  function inferKind(raw) {
    var action = String(raw && (raw.kind || raw.actionKind || raw.action || raw.moduleAction || raw.rightAction) || '').toLowerCase();
    var text = (action + ' ' + textOf(raw)).toLowerCase();
    if (/memorial|memorial-decision|zoushu|petition|奏疏|奏摺|奏折|朱批|批复|准奏|驳回|留中/.test(text)) return 'memorial';
    if (/shizheng|issue-choice|廷议|朝议|庭议/.test(text)) return 'court';
    if (/edict|decree|诏|令|旨|票拟|草诏/.test(text)) return 'edict';
    if (/letter|鸿雁|传书|信/.test(text)) return 'letter';
    if (/wendui|audience|问对|召对|密问/.test(text)) return 'wendui';
    if (/chaoyi|tinyi|court|廷议|朝议|常朝|会议/.test(text)) return 'court';
    if (/office|appoint|官制|任免|廷推/.test(text)) return 'office';
    if (/finance|tax|loan|grain|户部|国库|钱粮|开仓/.test(text)) return 'finance';
    if (/army|military|garrison|军|兵|边防|调防/.test(text)) return 'military';
    if (/build|工程|修建|营造/.test(text)) return 'construction';
    return action || 'player-action';
  }

  function inferPolicyTags(raw) {
    var text = [
      raw && raw.kind,
      raw && raw.action,
      raw && raw.topic,
      raw && raw.title,
      raw && raw.text,
      raw && raw.content,
      raw && raw.target,
      raw && raw.actor,
      raw && raw.from
    ].map(textOf).join(' ').toLowerCase();
    var tags = [];
    function add(tag, re) {
      if (re.test(text) && tags.indexOf(tag) < 0) tags.push(tag);
    }
    add('edict', /edict|decree|proclamation|诏|制书|敕令/);
    add('memorial', /memorial|petition|zoushu|奏疏|奏摺|奏折|朱批|批复|准奏|驳回|留中/);
    add('letter', /letter|dispatch|message|courier|鸿雁|传书|密旨|回书/);
    add('relief', /remit|remission|reduce|lower|exempt|relieve|relief|减免|蠲|赈|抚/);
    add('tax', /tax|fee|levy|tariff|stall|赋|税|役|租|厘|钱粮|摊派|加派/);
    add('relief', /relief|flood|granary|famine|赈|灾|开仓|饥|荒|抚恤|减免/);
    add('market', /market|merchant|guild|trade|shop|商|市|行会|店|铺|盐|茶|榷/);
    add('court', /court|debate|agenda|廷议|朝议|常朝|奏|议/);
    add('office', /office|appoint|dismiss|官|吏|任免|廷推|铨选/);
    add('military', /army|military|garrison|soldier|军|兵|边|营|饷|调防/);
    add('local', /province|county|road|local|州|郡|县|道|府|地方|藩|土司|羁縻/);
    add('culture', /culture|school|exam|book|文|学|科举|士林|教化|书院/);
    add('law', /law|trial|punish|prison|法|刑|狱|查禁|弹劾|惩/);
    return tags.concat(toArray(raw && raw.policyTags).map(textOf).filter(Boolean)).filter(function(x, i, arr) {
      return x && arr.indexOf(x) === i;
    });
  }

  function uniqueList(list) {
    var out = [];
    toArray(list).forEach(function(v) {
      var text = textOf(v);
      if (text && out.indexOf(text) < 0) out.push(text);
    });
    return out;
  }

  function formalDemandText(signal, raw) {
    return compact([
      raw && raw.topic,
      raw && raw.title,
      signal && signal.topic,
      raw && raw.text,
      raw && raw.content,
      signal && signal.text
    ].map(textOf).filter(Boolean).join(' '), 140);
  }

  function formalOperationProfile(signal, raw) {
    signal = signal || {};
    raw = raw || {};
    var action = String(raw.action || signal.action || raw.kind || signal.kind || '').toLowerCase();
    var source = String(raw.source || signal.source || '').toLowerCase();
    var text = [
      source,
      action,
      signal.kind,
      raw.kind,
      raw.decision,
      raw.topic,
      raw.title,
      raw.text,
      raw.content,
      raw.target,
      raw.actor,
      raw.from,
      toArray(raw.evidence).join(' '),
      toArray(signal.evidence).join(' ')
    ].map(textOf).join(' ').toLowerCase();
    var isFormal = /phase8-desk|phase8-formal|memorial|petition|zoushu|edict|decree|letter-send|letter|courier|shizheng|chaoyi|tinyi|court|wendui|奏疏|奏折|朱批|批复|诏|鸿雁|传书|朝议|廷议|问对/.test(text);
    var support = 0;
    var hostile = 0;
    var decision = String(raw.decision || '').toLowerCase();
    if (/approved|approve|issued|accept|grant|annotated|referred/.test(decision)) support += 2;
    if (/rejected|reject|deny/.test(decision)) hostile += 2;
    if (/hold|pending_review/.test(decision)) hostile += 1;
    if (/court_debate|debate/.test(decision)) support += 1;
    if (/(relief|remit|remission|reduce|lower|exempt|protect|aid|support|fair|clean|restore|approve|granted|减免|蠲|赈|抚|准|清查|保护)/.test(text)) support += 1;
    if (/(suppress|crackdown|raise|increase|collect|defend collection|press arrear|reject|deny|block|purge|镇压|加征|严催|驳回|拒|阻|清党)/.test(text)) hostile += 1;
    var stance = support > hostile ? 1 : hostile > support ? -1 : 0;
    var tags = [];
    if (/edict|decree|proclamation|诏|制书|敕令/.test(text)) tags.push('edict');
    if (/memorial|petition|zoushu|奏疏|奏折|朱批|批复/.test(text)) tags.push('memorial');
    if (/letter|courier|dispatch|鸿雁|传书|密旨|回书/.test(text)) tags.push('letter');
    if (/court|chaoyi|tinyi|shizheng|朝议|廷议|问对/.test(text)) tags.push('court');
    return {
      isFormal: isFormal,
      stance: stance,
      tags: uniqueList(tags),
      demandText: formalDemandText(signal, raw)
    };
  }

  function formalClassImpact(row, signal, profile) {
    var out = {
      name: row && row.name,
      reason: compact((row && toArray(row.evidence).join('; ')) || signal.text, 160)
    };
    if (!profile || !profile.isFormal) return out;
    var mag = Math.max(1, Math.round(1 + clamp(signal && signal.intensity, 0, 1) * 4));
    var demand = profile.demandText || signal.topic || signal.text;
    if (profile.stance > 0) {
      out.satisfactionDelta = mag;
      out.unrestDelta = { grievance: -mag, petition: -Math.max(1, Math.round(mag * 0.6)) };
      out.demand = compact(demand, 140);
    } else if (profile.stance < 0) {
      out.satisfactionDelta = -mag;
      out.unrestDelta = { grievance: mag, petition: Math.max(1, Math.round(mag * 0.6)) };
      out.demand = compact(demand, 140);
    } else {
      out.influenceDelta = 1;
      out.demand = compact(demand, 140);
    }
    return out;
  }

  function formalPartyImpact(row, signal, profile) {
    var out = {
      name: row && row.name,
      reason: compact((row && toArray(row.evidence).join('; ')) || signal.text, 160)
    };
    if (!profile || !profile.isFormal) return out;
    var demand = compact(profile.demandText || signal.topic || signal.text, 120);
    if (demand) {
      out.currentAgenda = demand;
      out.shortGoal = (profile.stance < 0 ? 'block ' : 'carry ') + demand;
    }
    if (profile.stance > 0) {
      out.influenceDelta = 1;
      out.cohesionDelta = 1;
    } else if (profile.stance < 0) {
      out.influenceDelta = 1;
      out.cohesionDelta = -1;
    }
    return out;
  }

  function scoreEntity(signalText, entity, name, fields, extraTokens) {
    var rawText = String(signalText || '');
    var normText = normalize(rawText);
    var score = 0;
    var evidence = [];
    function hit(label, token, weight) {
      token = textOf(token);
      if (!token || token.length < 2) return;
      var n = normalize(token);
      if (!n) return;
      if (normText.indexOf(n) >= 0) {
        score += weight;
        if (evidence.indexOf(label + ':' + token) < 0) evidence.push(label + ':' + compact(token, 36));
      }
    }
    hit('name', name, 6);
    toArray(entity && (entity.aliases || entity.alias || entity.otherNames || entity.altNames)).forEach(function(x) { hit('alias', x, 5); });
    collectTexts(entity || {}, fields).forEach(function(x) { hit('field', x, 3); });
    toArray(extraTokens).forEach(function(x) { hit('link', x, 4); });
    toArray(entity && (entity.tags || entity.labels || entity.keywords)).forEach(function(x) { hit('tag', x, 2); });
    return score > 0 ? { score: score, evidence: evidence.slice(0, 5) } : null;
  }

  function inferCandidateClasses(root, signalText) {
    return getClasses(root).map(function(cls) {
      var name = classNameOf(cls);
      if (!name) return null;
      var scored = scoreEntity(signalText, cls, name, [
        'demands', 'currentDemand', 'currentAgenda', 'shortGoal', 'desc', 'description', 'stance', 'policyStance'
      ]);
      if (!scored) return null;
      return { name: name, score: scored.score, evidence: scored.evidence };
    }).filter(Boolean).sort(function(a, b) { return b.score - a.score || a.name.localeCompare(b.name); }).slice(0, 6);
  }

  function partyExtraTokens(root, party, candidateClasses) {
    var out = [];
    var bases = toArray(party && (party.socialBase || party.social_base || party.baseClasses || party.supportClasses));
    candidateClasses.forEach(function(cls) {
      bases.forEach(function(base) {
        if (normalize(base) === normalize(cls.name)) out.push(cls.name);
      });
    });
    return out;
  }

  function inferCandidateParties(root, signalText, candidateClasses) {
    candidateClasses = candidateClasses || [];
    return getParties(root).map(function(party) {
      var name = partyNameOf(party);
      if (!name) return null;
      var scored = scoreEntity(signalText, party, name, [
        'currentAgenda', 'shortGoal', 'agenda', 'goal', 'policyStance', 'stance', 'socialBase', 'social_base', 'baseClasses', 'goals', 'partyGoals'
      ], partyExtraTokens(root, party, candidateClasses));
      if (!scored) return null;
      return { name: name, score: scored.score, evidence: scored.evidence };
    }).filter(Boolean).sort(function(a, b) { return b.score - a.score || a.name.localeCompare(b.name); }).slice(0, 6);
  }

  function ensureStore(root) {
    root = pickRoot(root);
    if (!root._playerActionSignals || typeof root._playerActionSignals !== 'object' || Array.isArray(root._playerActionSignals)) {
      root._playerActionSignals = {
        turn: Number(root.turn) || 0,
        seq: 0,
        items: [],
        stats: { recorded: 0 }
      };
    }
    if (!Array.isArray(root._playerActionSignals.items)) root._playerActionSignals.items = [];
    if (!root._playerActionSignals.stats) root._playerActionSignals.stats = { recorded: 0 };
    return root._playerActionSignals;
  }

  function buildSignal(root, raw, seq) {
    raw = raw || {};
    var text = compact(raw.text || raw.content || raw.targetText || raw.summary || raw.title || raw.topic || raw.action || '', 240);
    var fallbackText = [
      raw.action || raw.actionKind || raw.kind || '',
      raw.topic || raw.title || '',
      raw.target || raw.targetId || '',
      raw.actor || raw.from || ''
    ].map(textOf).filter(Boolean).join(' ');
    if (!text) text = compact(fallbackText, 240);
    var kind = inferKind(raw);
    var policyTags = inferPolicyTags(raw);
    var signalText = [
      kind,
      text,
      raw.topic,
      raw.target,
      raw.actor,
      raw.from,
      policyTags.join(' ')
    ].map(textOf).join(' ');
    var candidateClasses = inferCandidateClasses(root, signalText);
    var candidateParties = inferCandidateParties(root, signalText, candidateClasses);
    var character = resolveCharacter(root, raw);
    return {
      id: 'pas-' + (Number(root.turn) || 0) + '-' + seq,
      turn: Number(raw.turn != null ? raw.turn : root.turn) || 0,
      seq: seq,
      calibrationSeq: raw.calibrationSeq || raw.partyClassSeq || 0,
      kind: kind,
      source: raw.source || 'player-action',
      action: raw.action || raw.actionKind || '',
      topic: compact(raw.topic || raw.title || '', 80),
      text: text,
      actor: compact(raw.actor || raw.from || raw.proposer || '', 80),
      target: compact(raw.target || raw.to || raw.targetId || '', 80),
      targetId: raw.targetId || '',
      characterName: compact(character.name || '', 80),
      characterId: compact(character.id || '', 80),
      intensity: Math.max(0, Math.min(1, Number(raw.intensity != null ? raw.intensity : 0.5) || 0.5)),
      policyTags: policyTags,
      candidateClasses: candidateClasses,
      candidateParties: candidateParties,
      evidence: toArray(raw.evidence).map(textOf).filter(Boolean).slice(0, 5),
      at: Date.now()
    };
  }

  function mirrorLegacy(root, signal) {
    if (!root || !signal) return;
    root._partyClassLlmActionSignals = toArray(root._partyClassLlmActionSignals);
    root._partyClassLlmActionSignals.push({
      turn: signal.turn,
      seq: signal.calibrationSeq || signal.seq,
      source: signal.source,
      action: signal.action || signal.kind,
      targetId: signal.targetId || signal.target,
      targetText: signal.text,
      policyTags: signal.policyTags.slice(),
      candidateClasses: signal.candidateClasses.map(function(x) { return x.name; }),
      candidateParties: signal.candidateParties.map(function(x) { return x.name; }),
      at: signal.at
    });
    if (root._partyClassLlmActionSignals.length > 30) root._partyClassLlmActionSignals = root._partyClassLlmActionSignals.slice(-30);
  }

  function mirrorSocialPolitical(root, signal, raw) {
    if (!root || !signal) return null;
    raw = raw || {};
    if (raw.mirrorSocialPolitical === false) return null;
    if (!TM.SocialPoliticalSignals || typeof TM.SocialPoliticalSignals.record !== 'function') return null;
    var profile = formalOperationProfile(signal, raw);
    var classes = toArray(signal.candidateClasses).map(function(row) {
      return formalClassImpact(row, signal, profile);
    }).filter(function(x) { return !!x.name; });
    var parties = toArray(signal.candidateParties).map(function(row) {
      return formalPartyImpact(row, signal, profile);
    }).filter(function(x) { return !!x.name; });
    var tags = uniqueList(toArray(signal.policyTags).concat(profile.tags || []));
    try {
      return TM.SocialPoliticalSignals.record(root, {
        sourceSystem: 'player-action',
        kind: 'player-' + (signal.kind || 'action'),
        tags: tags,
        intensity: signal.intensity,
        confidence: profile.isFormal ? 0.72 : 0.58,
        linkedIssue: raw.linkedIssue || raw.issueId || raw.chaoyiTrackId || '',
        reason: signal.text || signal.topic || signal.action || 'player action',
        characterName: signal.characterName || '',
        characterId: signal.characterId || '',
        sourceCharacter: signal.characterName || '',
        affectedClasses: classes,
        affectedParties: parties,
        evidence: toArray(signal.evidence).concat([
          signal.source,
          signal.topic,
          signal.target
        ]).map(textOf).filter(Boolean)
      });
    } catch (_) {
      return null;
    }
  }

  function record(rootOrSignal, maybeSignal) {
    var root;
    var raw;
    if (maybeSignal === undefined && rootOrSignal && typeof rootOrSignal === 'object' && (rootOrSignal.kind || rootOrSignal.text || rootOrSignal.content || rootOrSignal.action || rootOrSignal.targetText)) {
      root = pickRoot();
      raw = rootOrSignal;
    } else {
      root = pickRoot(rootOrSignal);
      raw = maybeSignal || {};
    }
    var store = ensureStore(root);
    store.turn = Number(root.turn) || store.turn || 0;
    store.seq = (Number(store.seq) || 0) + 1;
    store.stats.recorded = (Number(store.stats.recorded) || 0) + 1;
    var signal = buildSignal(root, raw, store.seq);
    store.items.push(signal);
    if (store.items.length > MAX_ITEMS) store.items = store.items.slice(-MAX_ITEMS);
    if (raw.mirrorLegacy !== false) mirrorLegacy(root, signal);
    mirrorSocialPolitical(root, signal, raw);
    return clone(signal);
  }

  function aggregateCandidates(items, key) {
    var byName = {};
    items.forEach(function(signal) {
      toArray(signal && signal[key]).forEach(function(row) {
        if (!row || !row.name) return;
        if (!byName[row.name]) byName[row.name] = { name: row.name, score: 0, evidence: [] };
        byName[row.name].score += Number(row.score) || 0;
        toArray(row.evidence).forEach(function(e) {
          if (e && byName[row.name].evidence.indexOf(e) < 0) byName[row.name].evidence.push(e);
        });
      });
    });
    return Object.keys(byName).map(function(name) {
      byName[name].evidence = byName[name].evidence.slice(0, 6);
      return byName[name];
    }).sort(function(a, b) { return b.score - a.score || a.name.localeCompare(b.name); }).slice(0, 8);
  }

  function aggregateTags(items) {
    var tags = [];
    items.forEach(function(signal) {
      toArray(signal && signal.policyTags).forEach(function(tag) {
        if (tag && tags.indexOf(tag) < 0) tags.push(tag);
      });
    });
    return tags;
  }

  function snapshot(root, options) {
    root = pickRoot(root);
    options = options || {};
    var store = ensureStore(root);
    var limit = Math.max(1, Math.min(40, Number(options.limit || 12) || 12));
    var items = store.items.slice(-limit).map(clone);
    var candidateClasses = aggregateCandidates(items, 'candidateClasses');
    var candidateParties = aggregateCandidates(items, 'candidateParties');
    var policyTags = aggregateTags(items);
    var summaryLines = items.map(function(signal) {
      var cls = signal.candidateClasses.map(function(x) { return x.name; }).join('/');
      var parties = signal.candidateParties.map(function(x) { return x.name; }).join('/');
      return 'T' + signal.turn + '#' + signal.seq + ' [' + signal.kind + '] ' + signal.text
        + (cls ? ' | classes=' + cls : '')
        + (parties ? ' | parties=' + parties : '');
    });
    return {
      turn: Number(root.turn) || 0,
      count: store.items.length,
      seq: Number(store.seq) || 0,
      signals: items,
      candidateClasses: candidateClasses,
      candidateParties: candidateParties,
      policyTags: policyTags,
      summaryText: summaryLines.join('\n'),
      stats: clone(store.stats)
    };
  }

  function formatForPrompt(root, options) {
    var snap = snapshot(root, options || {});
    if (!snap.signals.length) return '';
    var lines = [];
    lines.push('\n\n=== Player Action Signals (party/class evidence) ===');
    lines.push('Use these as recent player-operation evidence only. Do not create fixed class-party pairings; let relations evolve from the current scenario data.');
    if (snap.policyTags.length) lines.push('Policy tags: ' + snap.policyTags.join(', '));
    if (snap.candidateClasses.length) lines.push('Candidate classes: ' + snap.candidateClasses.map(function(x) { return x.name + '(' + Math.round(x.score) + ')'; }).join(', '));
    if (snap.candidateParties.length) lines.push('Candidate parties: ' + snap.candidateParties.map(function(x) { return x.name + '(' + Math.round(x.score) + ')'; }).join(', '));
    snap.signals.forEach(function(signal) {
      var tags = signal.policyTags && signal.policyTags.length ? ' tags=' + signal.policyTags.join('/') : '';
      lines.push('- T' + signal.turn + '#' + signal.seq + ' [' + signal.kind + tags + '] ' + compact(signal.text, 140));
    });
    return lines.join('\n');
  }

  function clear(root, options) {
    root = pickRoot(root);
    options = options || {};
    var store = ensureStore(root);
    store.items = [];
    store.stats.clearedAt = Date.now();
    if (options.resetSeq) store.seq = 0;
    return true;
  }

  function fromDomAction(root, target, options) {
    root = pickRoot(root);
    options = options || {};
    if (!target) return null;
    var dataset = target.dataset || {};
    var action = dataset.moduleAction || dataset.rightAction || dataset.action || options.action || '';
    var raw = {
      source: options.source || (dataset.moduleAction ? 'phase8-module-dom' : dataset.rightAction ? 'phase8-right-dom' : 'player-action-dom'),
      kind: options.kind || '',
      action: action || options.action || '',
      targetId: target.id || dataset.id || '',
      target: dataset.id || dataset.name || dataset.target || '',
      topic: dataset.topic || dataset.tab || dataset.kind || '',
      text: target.textContent || target.value || options.text || '',
      policyTags: options.policyTags || null
    };
    return record(root, raw);
  }

  function getDiagnostics(root) {
    var snap = snapshot(root, { limit: 12 });
    return {
      count: snap.count,
      seq: snap.seq,
      policyTags: snap.policyTags,
      candidateClasses: snap.candidateClasses,
      candidateParties: snap.candidateParties,
      recent: snap.signals
    };
  }

  TM.PlayerActionSignals = {
    record: record,
    snapshot: snapshot,
    formatForPrompt: formatForPrompt,
    clear: clear,
    fromDomAction: fromDomAction,
    getDiagnostics: getDiagnostics,
    _inferPolicyTags: inferPolicyTags,
    _inferCandidateClasses: inferCandidateClasses,
    _inferCandidateParties: inferCandidateParties
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TM.PlayerActionSignals;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
