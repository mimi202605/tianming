// @ts-check
/*
 * tm-minxin-pressure-actions.js
 * Turns low minxin pressure into playable court work: memorials, tinyi topics,
 * wendui clues, and hongyan clues. Player replies feed back as signals.
 */
(function(global) {
  'use strict';

  var TM = global.TM = global.TM || {};
  var MAX_ITEMS = 120;
  var MAX_HINTS = 80;

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

  function toArray(v) {
    if (v === undefined || v === null || v === '') return [];
    return Array.isArray(v) ? v.slice() : [v];
  }

  function pickRoot(root) {
    if (root && typeof root === 'object') return root;
    if (global.GM && typeof global.GM === 'object') return global.GM;
    if (global.scriptData && typeof global.scriptData === 'object') return global.scriptData;
    return {};
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function textOf(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.map(textOf).filter(Boolean).join(' ');
    if (typeof v === 'object') {
      var keys = ['text', 'content', 'summary', 'desc', 'description', 'reason', 'topic', 'title', 'name', 'demand'];
      for (var i = 0; i < keys.length; i += 1) {
        if (v[keys[i]] !== undefined && v[keys[i]] !== null && v[keys[i]] !== '') return textOf(v[keys[i]]);
      }
    }
    return '';
  }

  function compact(v, maxLen) {
    var text = String(textOf(v) || '').replace(/\s+/g, ' ').trim();
    maxLen = Number(maxLen) || 180;
    return text.length > maxLen ? text.slice(0, maxLen) : text;
  }

  function normalizeName(v) {
    return String(v || '').replace(/[\s\u3000'"`.,;:!?()[\]{}<>\/\\|_-]+/g, '').toLowerCase().trim();
  }

  function ensureArray(root, field) {
    if (!Array.isArray(root[field])) root[field] = [];
    return root[field];
  }

  function ensureStore(root) {
    root = pickRoot(root);
    if (!root._minxinPressureActions || typeof root._minxinPressureActions !== 'object' || Array.isArray(root._minxinPressureActions)) {
      root._minxinPressureActions = {
        turn: Number(root.turn) || 0,
        seq: 0,
        items: [],
        responses: [],
        keys: {},
        stats: { scanned: 0, spawned: 0, responses: 0 }
      };
    }
    var store = root._minxinPressureActions;
    if (!Array.isArray(store.items)) store.items = [];
    if (!Array.isArray(store.responses)) store.responses = [];
    if (!store.keys || typeof store.keys !== 'object') store.keys = {};
    if (!store.stats) store.stats = { scanned: 0, spawned: 0, responses: 0 };
    return store;
  }

  function getTuning(root) {
    var conf = root && root.minxinPressureActions || {};
    return {
      trueMax: Number(conf.trueMax != null ? conf.trueMax : 42),
      criticalMax: Number(conf.criticalMax != null ? conf.criticalMax : 24),
      highMax: Number(conf.highMax != null ? conf.highMax : 34),
      spawnPerTurn: Math.max(1, Math.min(8, Number(conf.spawnPerTurn || 3) || 3)),
      cooldownTurns: Math.max(0, Number(conf.cooldownTurns || 3) || 3)
    };
  }

  function getMatrixRows(root) {
    root = pickRoot(root);
    var mx = root.minxin || {};
    var matrix = mx.matrix || {};
    var rows = [];
    Object.keys(matrix).forEach(function(regionId) {
      Object.keys(matrix[regionId] || {}).forEach(function(classKey) {
        var row = matrix[regionId][classKey];
        if (!row || typeof row !== 'object') return;
        var truth = Number(row.true != null ? row.true : row.index);
        if (!isFinite(truth)) return;
        rows.push({
          regionId: row.regionId || regionId,
          regionName: compact(row.regionName || regionId, 100),
          classKey: row.classKey || classKey,
          className: compact(row.className || classKey, 100),
          true: clamp(truth, 0, 100),
          perceived: row.perceived != null ? clamp(row.perceived, 0, 100) : null,
          weight: row.weight,
          influence: row.influence,
          reason: compact(row.lastReason || row.reason || '民心低落', 160),
          linkedIssue: row.linkedIssue || ''
        });
      });
    });
    return rows;
  }

  function severityFor(row, tuning) {
    var truth = Number(row.true);
    if (truth <= tuning.criticalMax) return 'critical';
    if (truth <= tuning.highMax) return 'high';
    return 'medium';
  }

  function pressureKey(row) {
    return [normalizeName(row.regionId || row.regionName), normalizeName(row.classKey || row.className)].join('|');
  }

  function scoreRow(row) {
    var truth = Number(row.true);
    var influence = Number(row.influence);
    if (!isFinite(influence)) influence = 50;
    return (100 - truth) * 2 + influence;
  }

  function findExisting(store, key) {
    return store.items.find(function(x) { return x && x.key === key && x.status !== 'resolved'; }) || null;
  }

  function getRelevantParties(root, className) {
    var n = normalizeName(className);
    var parties = toArray(root.parties || (root.scriptData && root.scriptData.parties));
    return parties.filter(function(p) {
      if (!p) return false;
      var hay = [
        p.name, p.id, p.base, p.supportBase, p.socialBase, p.social_base, p.baseClasses,
        p.policyStance, p.stances, p.agenda, p.shortGoal
      ].map(textOf).join(' ');
      return n && normalizeName(hay).indexOf(n) >= 0;
    }).slice(0, 4).map(function(p) {
      return {
        name: compact(p.name || p.id || '', 80),
        influence: Number(p.influence != null ? p.influence : p.power) || 0,
        cohesion: Number(p.cohesion) || 50
      };
    }).filter(function(p) { return !!p.name; });
  }

  function buildPressureItem(root, row, seq, options) {
    var tuning = getTuning(root);
    var key = pressureKey(row);
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var severity = severityFor(row, tuning);
    var issueId = 'mpa-' + turn + '-' + seq;
    var demand = row.true <= tuning.criticalMax ? '亟需赈恤并究查' : '赈恤、稽核、责地方据实奏报';
    return {
      id: issueId,
      key: key,
      turn: turn,
      sourceSystem: 'minxin-pressure-actions',
      status: 'active',
      severity: severity,
      score: scoreRow(row),
      regionId: row.regionId,
      regionName: row.regionName,
      classKey: row.classKey,
      className: row.className,
      true: row.true,
      perceived: row.perceived,
      demandText: demand,
      reason: row.reason || '民心低落',
      linkedIssue: row.linkedIssue || issueId,
      parties: getRelevantParties(root, row.className),
      spawnedChannels: [],
      responses: [],
      at: Date.now()
    };
  }

  // 上奏者中介:按官职职能择合适大臣代陈(辖地督抚→职能中枢民政/监察→言官兜底)·与官职职能相关
  var _OFF_REGIONAL = /(巡抚|总督|总制|经略|巡按|布政使?|按察使?|分守|分巡|兵备|知府|知州|知县|府尹|道$)/;
  var _OFF_FUNCTION = /(户部|通政|都察|御史|给事中|顺天府|应天府|礼部|吏部|侍郎|尚书|寺卿|少卿)/;
  function _senderOffText(ch) { return [ch && ch.officialTitle, ch && ch.title, ch && ch.office, ch && ch.concurrentTitle, ch && ch.role].map(textOf).join(' '); }
  function _senderAliveOk(ch) { return ch && ch.alive !== false && !/(罢|致仕|削籍|已殁|身故|遇刺|杖毙|鸩杀|伏诛|革职)/.test(_senderOffText(ch)); }
  function chooseMemorialSender(root, item) {
    var chars = toArray(root.chars || root.characters || (root.scriptData && root.scriptData.chars));
    var regionN = normalizeName(item.regionName);
    function locHay(ch) { return normalizeName([ch && ch.location, ch && ch.region, ch && ch.officialTitle, ch && ch.title, ch && ch.office].map(textOf).join(' ')); }
    var local = chars.find(function(ch) { return _senderAliveOk(ch) && regionN && locHay(ch).indexOf(regionN) >= 0 && _OFF_REGIONAL.test(_senderOffText(ch)); });
    if (!local) local = chars.find(function(ch) { return _senderAliveOk(ch) && regionN && locHay(ch).indexOf(regionN) >= 0; });
    if (local) return compact(local.name || local.title || '地方有司', 80);
    var central = chars.find(function(ch) { return _senderAliveOk(ch) && _OFF_FUNCTION.test(_senderOffText(ch)); });
    if (central) return compact(central.name || central.title || '部院大臣', 80);
    var censor = chars.find(function(ch) { return _senderAliveOk(ch) && /御史|都察|言官|给事中/.test(_senderOffText(ch)); });
    if (censor) return compact(censor.name || censor.title || '都察言官', 80);
    return '地方陈情者';
  }

  function itemTitle(item) {
    return '民情积压·' + item.regionName + '·' + item.className;
  }

  // 积压缘由:中文 reason 保留;内部英文推断标签(dynamic-inference/regionalVariant 等)→按实数据生成中文缘由
  function _pressureReasonCN(item) {
    var r = String(item.reason || '');
    if (r && !/[a-zA-Z]/.test(r)) return r;
    var t = Math.round(Number(item.true) || 0), p = (item.perceived != null) ? Math.round(Number(item.perceived)) : null;
    if (p != null && (p - t) >= 12) return '朝堂观感虚高、实情壅于下情未达天听';
    if (t <= 20) return '民心久困、怨望积聚，亟待绥抚';
    if (t <= 40) return '民情未靖、隐忧渐显';
    return '民情积滞，宜早绸缪';
  }
  function itemBody(item) {
    return [
      item.regionName + '·' + item.className + '民心实情 ' + Math.round(item.true) + (item.perceived != null ? '，朝堂观感 ' + Math.round(item.perceived) : ''),
      '积压缘由：' + _pressureReasonCN(item),
      '可经奏疏批复、廷议、问对，或鸿雁查访核处。'
    ].join('\n');
  }

  function markChannel(item, channel, id) {
    if (!item.spawnedChannels) item.spawnedChannels = [];
    if (!item.spawnedChannels.some(function(x) { return x && x.channel === channel && x.id === id; })) {
      item.spawnedChannels.push({ channel: channel, id: id });
    }
  }

  function spawnMemorial(root, item) {
    var mems = ensureArray(root, 'memorials');
    var existing = mems.find(function(m) { return m && m._minxinPressureActionId === item.id; });
    if (existing) {
      // 重新本地化既有奏疏——旧档可能残留英文模板(本地化前已落 GM.memorials)·复用时一并刷为中文
      existing.title = itemTitle(item);
      existing.topic = itemTitle(item);
      existing.content = itemBody(item);
      existing.text = itemBody(item);
      if (existing.type === 'minxin') existing.type = '民情';
      if (existing.subtype === 'pressure') existing.subtype = '积压';
      if (existing.dept === 'Local affairs') existing.dept = '地方有司';
      markChannel(item, 'memorial', existing.id || item.id);
      return existing;
    }
    var mem = {
      id: 'mpa-mem-' + item.id,
      title: itemTitle(item),
      topic: itemTitle(item),
      from: chooseMemorialSender(root, item),
      dept: '地方有司',
      type: '民情',
      subtype: '积压',
      content: itemBody(item),
      text: itemBody(item),
      status: 'pending',
      priority: item.severity === 'critical' ? 'urgent' : 'high',
      turn: item.turn,
      linkedIssue: item.id,
      issueId: item.id,
      sourceSystem: 'minxin-pressure-actions',
      sourceType: 'minxin_pressure',
      _minxinPressureActionId: item.id,
      _needsAiBody: true, // 待AI代拟正文(同辅臣拟议范式·secondary)·失败保确定性中文兜底
      _minxinPressureCandidate: clone(item)
    };
    mems.unshift(mem);
    if (mems.length > 120) root.memorials = mems.slice(0, 120);
    markChannel(item, 'memorial', mem.id);
    return mem;
  }

  function spawnTinyi(root, item) {
    var pending = ensureArray(root, '_pendingTinyiTopics');
    var existing = pending.find(function(t) { return t && (t.sourceId === item.id || t.linkedIssue === item.id) && t.sourceType === 'minxin_pressure'; });
    if (existing) {
      markChannel(item, 'tinyi', existing.id || item.id);
      return existing;
    }
    var topic = '民情积压·' + item.regionName + '·' + item.className + '·吁请廷议核处';
    var row = {
      id: 'mpa-tinyi-' + item.id,
      topic: topic,
      title: topic,
      from: 'minxin-pressure-actions',
      sourceType: 'minxin_pressure',
      sourceId: item.id,
      turn: item.turn,
      linkedIssue: item.id,
      className: item.className,
      sourceClass: item.className,
      regionName: item.regionName,
      regions: [item.regionName],
      demandText: item.demandText,
      priority: item.severity === 'critical' ? 92 : item.severity === 'high' ? 84 : 74,
      reason: item.reason,
      proposerReason: '民心矩阵浮现的地方·阶层民情积压',
      origin: {
        sourceType: 'minxin_pressure',
        sourceId: item.id,
        sourceName: item.regionName + ' ' + item.className
      }
    };
    pending.unshift(row);
    if (pending.length > 100) root._pendingTinyiTopics = pending.slice(0, 100);
    markChannel(item, 'tinyi', row.id);
    return row;
  }

  function pickWenduiTargets(root, item) {
    var chars = toArray(root.chars || root.characters || (root.scriptData && root.scriptData.chars));
    var regionN = normalizeName(item.regionName);
    var classN = normalizeName(item.className);
    var scored = chars.map(function(ch) {
      if (!ch) return null;
      var hay = [ch.name, ch.title, ch.office, ch.role, ch.location, ch.region, ch.party, ch.faction].map(textOf).join(' ');
      var score = 0;
      var norm = normalizeName(hay);
      if (regionN && norm.indexOf(regionN) >= 0) score += 50;
      if (classN && norm.indexOf(classN) >= 0) score += 25;
      if (/censor|御史|都察|言官|prefect|巡抚|知府|户部|local/i.test(hay)) score += 35;
      score += Number(ch.influence || ch.prestige || 0) / 5;
      return score > 0 ? { ch: ch, score: score } : null;
    }).filter(Boolean).sort(function(a, b) { return b.score - a.score; });
    return scored.slice(0, 3).map(function(x) { return x.ch; });
  }

  function spawnWenduiHints(root, item) {
    var hints = ensureArray(root, '_minxinWenduiHints');
    var targets = pickWenduiTargets(root, item);
    if (!targets.length) targets = [{ name: '地方有司' }];
    var made = [];
    targets.forEach(function(ch) {
      var personName = compact(ch.name || ch.title || '地方有司', 80);
      var exists = hints.find(function(h) { return h && h.linkedIssue === item.id && h.personName === personName; });
      if (exists) {
        markChannel(item, 'wendui', exists.id);
        made.push(exists);
        return;
      }
      var hint = {
        id: 'mpa-wendui-' + item.id + '-' + (hints.length + 1),
        turn: item.turn,
        linkedIssue: item.id,
        sourceSystem: 'minxin-pressure-actions',
        channel: 'wendui',
        personName: personName,
        personId: ch.id || '',
        regionName: item.regionName,
        className: item.className,
        question: '询' + item.regionName + '·' + item.className + '民情积压之事',
        prompt: '向' + personName + '问询「' + item.reason + '」，并探赈恤、稽核之策。',
        status: 'active'
      };
      hints.unshift(hint);
      made.push(hint);
      markChannel(item, 'wendui', hint.id);
    });
    if (hints.length > MAX_HINTS) root._minxinWenduiHints = hints.slice(0, MAX_HINTS);
    return made;
  }

  function spawnLetterHints(root, item) {
    var hints = ensureArray(root, '_minxinLetterHints');
    var exists = hints.find(function(h) { return h && h.linkedIssue === item.id; });
    if (exists) {
      markChannel(item, 'hongyan', exists.id);
      return exists;
    }
    var target = chooseMemorialSender(root, item);
    var hint = {
      id: 'mpa-letter-' + item.id,
      turn: item.turn,
      linkedIssue: item.id,
      sourceSystem: 'minxin-pressure-actions',
      channel: 'hongyan',
      to: target,
      regionName: item.regionName,
      className: item.className,
      subject: '查访' + item.regionName + '民情积压',
      bodyHint: '问询赈恤之策、虚报之险，及地方苛虐详情。',
      status: 'active'
    };
    hints.unshift(hint);
    if (hints.length > MAX_HINTS) root._minxinLetterHints = hints.slice(0, MAX_HINTS);
    markChannel(item, 'hongyan', hint.id);
    return hint;
  }

  function spawnForItem(root, item) {
    spawnMemorial(root, item);
    spawnTinyi(root, item);
    spawnWenduiHints(root, item);
    spawnLetterHints(root, item);
  }

  function scan(root, options) {
    root = pickRoot(root);
    options = options || {};
    var store = ensureStore(root);
    var tuning = getTuning(root);
    var rows = getMatrixRows(root).filter(function(row) {
      return row.true <= tuning.trueMax;
    }).sort(function(a, b) {
      return scoreRow(b) - scoreRow(a);
    });
    store.stats.scanned = (Number(store.stats.scanned) || 0) + rows.length;
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var spawned = [];
    rows.slice(0, tuning.spawnPerTurn).forEach(function(row) {
      var key = pressureKey(row);
      var existing = findExisting(store, key);
      if (existing) {
        existing.true = row.true;
        existing.perceived = row.perceived;
        existing.reason = row.reason || existing.reason;
        existing.lastSeenTurn = turn;
        return;
      }
      var lastTurn = Number(store.keys[key] && store.keys[key].lastTurn) || -9999;
      if (turn - lastTurn < tuning.cooldownTurns) return;
      store.seq = (Number(store.seq) || 0) + 1;
      var item = buildPressureItem(root, row, store.seq, { turn: turn });
      store.items.push(item);
      if (store.items.length > MAX_ITEMS) store.items = store.items.slice(-MAX_ITEMS);
      store.keys[key] = { id: item.id, lastTurn: turn };
      spawnForItem(root, item);
      spawned.push(item);
    });
    store.stats.spawned = (Number(store.stats.spawned) || 0) + spawned.length;
    return { scanned: rows.length, spawned: spawned.length, items: spawned.map(clone) };
  }

  function maintain(root, options) {
    root = pickRoot(root);
    options = options || {};
    try {
      if (TM.MinxinLedger && typeof TM.MinxinLedger.maintain === 'function') {
        TM.MinxinLedger.maintain(root, { turn: options.turn, source: options.source || 'minxin-pressure-actions' });
      }
    } catch (_) {}
    var result = scan(root, options);
    root._minxinPressureActionsMaintenance = {
      turn: Number(options.turn != null ? options.turn : root.turn) || 0,
      source: options.source || 'minxin-pressure-actions',
      scanned: result.scanned,
      spawned: result.spawned,
      active: ensureStore(root).items.filter(function(x) { return x && x.status === 'active'; }).length
    };
    return result;
  }

  function findIssue(root, linkedIssue, text) {
    var store = ensureStore(root);
    var id = String(linkedIssue || '').trim();
    if (id) {
      var found = store.items.find(function(x) {
        return x && (String(x.id || '') === id || String(x.linkedIssue || '') === id);
      });
      if (found) return found;
    }
    var hay = normalizeName(text || '');
    if (!hay) return null;
    return store.items.find(function(x) {
      if (!x || x.status === 'resolved') return false;
      var row = normalizeName([x.regionName, x.className, x.reason, x.demandText].join(' '));
      return row && hay.indexOf(row) >= 0 || (x.regionName && hay.indexOf(normalizeName(x.regionName)) >= 0 && x.className && hay.indexOf(normalizeName(x.className)) >= 0);
    }) || null;
  }

  function linkedIssueFromHints(root, payload) {
    payload = payload || {};
    var actor = normalizeName(payload.actor || payload.from || payload.personName || payload.target || payload.to || '');
    var text = normalizeName([payload.text, payload.reply, payload.content, payload.target, payload.to].map(textOf).join(' '));
    var hints = toArray(root._minxinWenduiHints).concat(toArray(root._minxinLetterHints));
    var hit = hints.find(function(h) {
      if (!h || h.status === 'resolved') return false;
      var people = normalizeName([h.personName, h.to, h.personId].map(textOf).join(' '));
      var issueText = normalizeName([h.regionName, h.className, h.question, h.subject, h.prompt, h.bodyHint].map(textOf).join(' '));
      return (actor && people && (actor.indexOf(people) >= 0 || people.indexOf(actor) >= 0))
        || (text && issueText && text.indexOf(issueText) >= 0)
        || (text && h.regionName && text.indexOf(normalizeName(h.regionName)) >= 0 && h.className && text.indexOf(normalizeName(h.className)) >= 0);
    });
    return hit && hit.linkedIssue || '';
  }

  function responseDelta(payload) {
    var decision = String(payload.decision || payload.status || payload.action || '').toLowerCase();
    var channel = String(payload.channel || '').toLowerCase();
    if (/reject|blocked|deny|驳|拒|阻/.test(decision)) return -3;
    if (/hold|留中|pending/.test(decision)) return -1;
    if (/annotat|批示|note/.test(decision)) return 1.2;
    if (/refer|court_debate|public|issued|approve|准|发廷议|明发/.test(decision)) return 4;
    if (/small|private|问对|quer/.test(decision) || channel === 'wendui') return 1.5;
    if (channel === 'hongyan' || channel === 'letter') return 1.2;
    return 2;
  }

  function responseParties(item, delta) {
    return toArray(item.parties).map(function(p) {
      return {
        name: p.name,
        influenceDelta: 0,
        cohesionDelta: delta > 0 ? 0.4 : -0.5,
        currentAgenda: item.regionName + '·' + item.className + '·民情积压',
        reason: '民情积压回应'
      };
    }).filter(function(p) { return !!p.name; });
  }

  function recordPlayerResponse(root, payload, options) {
    root = pickRoot(root);
    payload = payload || {};
    options = options || {};
    var text = compact(payload.text || payload.reply || payload.content || payload.reason || payload.decision || '', 220);
    var linked = payload.linkedIssue || payload.issueId || payload._minxinPressureActionId || linkedIssueFromHints(root, payload);
    var item = findIssue(root, linked, [text, payload.actor, payload.target, payload.to, payload.topic].join(' '));
    if (!item) return { ok: false, reason: 'no-matching-minxin-pressure' };
    var store = ensureStore(root);
    var channel = compact(payload.channel || payload.kind || 'response', 40) || 'response';
    var decision = compact(payload.decision || payload.status || payload.action || channel, 60);
    var delta = responseDelta({ channel: channel, decision: decision });
    var turn = Number(options.turn != null ? options.turn : payload.turn != null ? payload.turn : root.turn) || 0;
    var reason = text || ('对' + item.regionName + '·' + item.className + '民情积压的处置');
    var response = {
      id: 'mpa-resp-' + turn + '-' + (store.responses.length + 1),
      turn: turn,
      linkedIssue: item.id,
      channel: channel,
      decision: decision,
      actor: compact(payload.actor || payload.from || '', 80),
      text: reason,
      deltaTrue: delta,
      at: Date.now()
    };
    store.responses.push(response);
    if (store.responses.length > MAX_ITEMS) store.responses = store.responses.slice(-MAX_ITEMS);
    store.stats.responses = (Number(store.stats.responses) || 0) + 1;
    item.status = 'responded';
    item.responseStatus = decision;
    item.lastResponse = clone(response);
    item.responses = toArray(item.responses);
    item.responses.push(clone(response));

    try {
      if (TM.SocialPoliticalSignals && typeof TM.SocialPoliticalSignals.record === 'function') {
        TM.SocialPoliticalSignals.record(root, {
          sourceSystem: 'minxin-pressure-response',
          kind: 'response-' + channel,
          tags: ['minxin', 'pressure', 'response', channel, decision],
          intensity: Math.min(1, Math.max(0.35, Math.abs(delta) / 5)),
          confidence: 0.82,
          linkedIssue: item.id,
          reason: reason,
          affectedClasses: [{
            name: item.className,
            satisfactionDelta: delta,
            demand: item.demandText,
            unrestDelta: { momentum: delta > 0 ? -Math.abs(delta) : Math.abs(delta), reason: reason },
            reason: reason
          }],
          affectedParties: responseParties(item, delta),
          evidence: [channel, decision, item.regionName, item.className]
        });
      }
    } catch (_) {}

    var ledgerResult = null;
    try {
      if (TM.MinxinLedger && typeof TM.MinxinLedger.recordAndApply === 'function') {
        ledgerResult = TM.MinxinLedger.recordAndApply(root, {
          sourceSystem: 'minxin-pressure-response',
          kind: 'response-' + channel,
          targetRegions: [{ region: item.regionName, weight: 1 }],
          targetClasses: [{ name: item.className, classKey: item.classKey, weight: item.weight || 0.08 }],
          deltaTrue: delta,
          intensity: Math.min(1, Math.max(0.35, Math.abs(delta) / 5)),
          confidence: 0.82,
          reason: reason,
          linkedIssue: item.id,
          tags: ['minxin', 'pressure', 'response', channel]
        }, {
          turn: turn,
          source: options.source || 'minxin-pressure-response'
        });
        if (typeof TM.MinxinLedger.maintain === 'function') {
          TM.MinxinLedger.maintain(root, { turn: turn, source: 'minxin-pressure-response' });
        }
      }
    } catch (_) {}
    var commitment = null;
    try {
      if (delta > 0 && TM.MinxinCommitmentTracker && typeof TM.MinxinCommitmentTracker.recordFromPressureResponse === 'function') {
        commitment = TM.MinxinCommitmentTracker.recordFromPressureResponse(root, item, response, payload, {
          turn: turn,
          source: options.source || 'minxin-pressure-response'
        });
      }
    } catch (_) {}
    return { ok: true, issue: clone(item), response: clone(response), deltaTrue: delta, ledger: ledgerResult, commitment: commitment };
  }

  function snapshot(root, options) {
    root = pickRoot(root);
    options = options || {};
    var limit = Math.max(1, Math.min(40, Number(options.limit || 10) || 10));
    var store = ensureStore(root);
    return {
      turn: Number(root.turn) || 0,
      maintenance: clone(root._minxinPressureActionsMaintenance || null),
      active: store.items.filter(function(x) { return x && x.status === 'active'; }).slice(-limit).reverse().map(clone),
      recent: store.items.slice(-limit).reverse().map(clone),
      responses: store.responses.slice(-limit).reverse().map(clone),
      stats: clone(store.stats)
    };
  }

  function pressureLine(item) {
    return '- ' + item.id + ' ' + item.regionName + ' / ' + item.className
      + ' true=' + Math.round(item.true || 0)
      + ' severity=' + (item.severity || '')
      + ' status=' + (item.status || '')
      + ' reason=' + compact(item.reason || '', 100);
  }

  function responseLine(row) {
    return '- T' + (row.turn || '') + ' ' + (row.channel || '') + '/' + (row.decision || '')
      + ' issue=' + (row.linkedIssue || '')
      + ' delta=' + (row.deltaTrue || 0)
      + ' text=' + compact(row.text || '', 100);
  }

  function formatForPrompt(root, options) {
    var snap = snapshot(root, options || {});
    if (!snap.active.length && !snap.responses.length) return '';
    var lines = ['\n\n=== 民情积压·待处置 ==='];
    lines.push('地方/阶层民心低落已化为可处置的朝政：玩家可经奏疏批复、廷议、问对、鸿雁或诏令回应；不要臆造抽象按钮。相关奏疏、书信、廷议议题须以中文叙写，勿夹英文字段名。');
    if (snap.active.length) lines.push('active:\n' + snap.active.map(pressureLine).join('\n'));
    if (snap.responses.length) lines.push('responses:\n' + snap.responses.map(responseLine).join('\n'));
    return lines.join('\n');
  }

  function diagnosticsText(root, options) {
    var snap = snapshot(root, options || {});
    var lines = ['=== Minxin Pressure Actions Diagnostics ==='];
    lines.push('active=' + snap.active.length + ' recent=' + snap.recent.length + ' responses=' + snap.responses.length);
    if (snap.maintenance) lines.push('maintenance turn=' + snap.maintenance.turn + ' scanned=' + snap.maintenance.scanned + ' spawned=' + snap.maintenance.spawned);
    if (snap.recent.length) lines.push('recent:\n' + snap.recent.map(pressureLine).join('\n'));
    if (snap.responses.length) lines.push('responses:\n' + snap.responses.map(responseLine).join('\n'));
    return lines.join('\n');
  }

  TM.MinxinPressureActions = {
    maintain: maintain,
    scan: scan,
    recordPlayerResponse: recordPlayerResponse,
    snapshot: snapshot,
    formatForPrompt: formatForPrompt,
    diagnosticsText: diagnosticsText,
    _getMatrixRows: getMatrixRows
  };

  global.MinxinPressureActions = TM.MinxinPressureActions;
  if (typeof module !== 'undefined' && module.exports) module.exports = TM.MinxinPressureActions;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
