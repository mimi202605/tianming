// @ts-check
/*
 * tm-minxin-responsibility-chain.js
 * Assigns minxin commitments to real executors/agencies, creates official
 * reports and rumors, and escalates false reports or failed work.
 */
(function(global) {
  'use strict';

  var TM = global.TM = global.TM || {};
  var MAX_ITEMS = 140;

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
    if (!root._minxinResponsibilityChain || typeof root._minxinResponsibilityChain !== 'object' || Array.isArray(root._minxinResponsibilityChain)) {
      root._minxinResponsibilityChain = {
        turn: Number(root.turn) || 0,
        assignments: [],
        officialReports: [],
        rumors: [],
        interventions: [],
        accountability: [],
        stats: { assigned: 0, reports: 0, rumors: 0, interventions: 0, accountability: 0 }
      };
    }
    var store = root._minxinResponsibilityChain;
    ['assignments', 'officialReports', 'rumors', 'interventions', 'accountability'].forEach(function(k) {
      if (!Array.isArray(store[k])) store[k] = [];
    });
    if (!store.stats) store.stats = { assigned: 0, reports: 0, rumors: 0, interventions: 0, accountability: 0 };
    return store;
  }

  function chars(root) {
    return toArray(root && (root.chars || root.characters || root.people || root.renwu || (root.scriptData && root.scriptData.chars)));
  }

  function charName(ch) {
    return compact(ch && (ch.name || ch.id || ch.title), 80);
  }

  function charIntegrity(ch) {
    var n = Number(ch && (ch.integrity != null ? ch.integrity : (ch.cleanliness != null ? ch.cleanliness : ch.moral)));
    return isFinite(n) ? clamp(n, 0, 100) : 55;
  }

  function agencyFor(measures) {
    measures = toArray(measures);
    if (measures.indexOf('audit') >= 0) return 'Censorate';
    if (measures.indexOf('relief') >= 0 || measures.indexOf('tax_remission') >= 0) return 'Ministry of Revenue';
    if (measures.indexOf('security') >= 0) return 'Ministry of War';
    if (measures.indexOf('corvee_reduction') >= 0 || measures.indexOf('resettlement') >= 0) return 'Local Administration';
    return 'Local Administration';
  }

  function scoreExecutor(ch, item, agency) {
    if (!ch) return -1;
    var hay = [ch.name, ch.title, ch.office, ch.role, ch.location, ch.region, ch.party, ch.faction].map(textOf).join(' ');
    var nHay = normalizeName(hay);
    var score = 0;
    if (/censor|御史|都察|言官/i.test(hay) && agency === 'Censorate') score += 70;
    if (/revenue|户部|度支|计部/i.test(hay) && agency === 'Ministry of Revenue') score += 70;
    if (/war|兵部|军|将|巡防/i.test(hay) && agency === 'Ministry of War') score += 65;
    if (/prefect|local|巡抚|知府|地方/i.test(hay) && agency === 'Local Administration') score += 60;
    var regionN = normalizeName(item.regionName);
    if (regionN && nHay.indexOf(regionN) >= 0) score += 40;
    score += charIntegrity(ch) * 0.25;
    score += (Number(ch.influence || ch.prestige || 0) || 0) * 0.15;
    return score;
  }

  function pickExecutor(root, item, agency) {
    var list = chars(root).filter(Boolean);
    if (!list.length) return { name: agency + ' clerk', id: '', integrity: 50, synthetic: true };
    var ranked = list.map(function(ch) {
      return { ch: ch, score: scoreExecutor(ch, item, agency) };
    }).sort(function(a, b) { return b.score - a.score; });
    var best = ranked[0] && ranked[0].score > 0 ? ranked[0].ch : list[0];
    return {
      id: best.id || best.key || '',
      name: charName(best),
      title: compact(best.title || best.office || best.role || '', 80),
      integrity: charIntegrity(best),
      party: compact(best.party || best.faction || '', 80)
    };
  }

  function resourcePlan(item) {
    var measures = toArray(item.measures);
    var plan = { money: 0, grain: 0, troops: 0, inspectors: 0, labor: 0 };
    measures.forEach(function(m) {
      if (m === 'relief') { plan.money += 8000; plan.grain += 14000; }
      else if (m === 'tax_remission') { plan.money += 4000; }
      else if (m === 'audit') { plan.money += 1800; plan.inspectors += 2; }
      else if (m === 'security') { plan.money += 5000; plan.troops += 1200; }
      else if (m === 'corvee_reduction') { plan.money += 2200; plan.labor += 500; }
      else if (m === 'resettlement') { plan.money += 7000; plan.grain += 6000; plan.labor += 400; }
      else { plan.money += 1500; }
    });
    if (!measures.length) plan.money = 1000;
    return plan;
  }

  function treasury(root, key) {
    if (key === 'grain') {
      var g = Number(root && root.guoku && root.guoku.grain);
      return isFinite(g) ? g : 0;
    }
    var vals = [root && root.guoku && root.guoku.money, root && root.fiscal && root.fiscal.treasury, root && root.treasury];
    for (var i = 0; i < vals.length; i += 1) {
      var n = Number(vals[i]);
      if (isFinite(n)) return n;
    }
    return 0;
  }

  function spendResources(root, plan) {
    var spent = { money: 0, grain: 0 };
    if (!root.guoku) root.guoku = {};
    var moneyNeed = Number(plan.money) || 0;
    var grainNeed = Number(plan.grain) || 0;
    var money = treasury(root, 'money');
    var grain = treasury(root, 'grain');
    var moneySpend = Math.min(Math.max(0, money), Math.ceil(moneyNeed * 0.35));
    var grainSpend = Math.min(Math.max(0, grain), Math.ceil(grainNeed * 0.35));
    if (isFinite(Number(root.guoku.money))) root.guoku.money = Math.max(0, Number(root.guoku.money) - moneySpend);
    if (root.fiscal && isFinite(Number(root.fiscal.treasury))) root.fiscal.treasury = Math.max(0, Number(root.fiscal.treasury) - moneySpend);
    if (isFinite(Number(root.guoku.grain))) root.guoku.grain = Math.max(0, Number(root.guoku.grain) - grainSpend);
    spent.money = moneySpend;
    spent.grain = grainSpend;
    return spent;
  }

  function assign(root, item, options) {
    root = pickRoot(root);
    options = options || {};
    if (!item || !item.id) return null;
    var store = ensureStore(root);
    if (!item.agency) item.agency = agencyFor(item.measures);
    if (!item.executor || !item.executor.name) item.executor = pickExecutor(root, item, item.agency);
    if (!item.resourcePlan) item.resourcePlan = resourcePlan(item);
    if (item.falseReportRisk == null) item.falseReportRisk = calcFalseReportRisk(root, item);
    var assignment = {
      id: 'mxresp-assign-' + item.id,
      turn: Number(options.turn != null ? options.turn : root.turn) || 0,
      commitmentId: item.id,
      linkedIssue: item.linkedIssue || '',
      agency: item.agency,
      executor: clone(item.executor),
      regionName: item.regionName || '',
      className: item.className || '',
      resourcePlan: clone(item.resourcePlan),
      falseReportRisk: item.falseReportRisk
    };
    if (!store.assignments.some(function(x) { return x.commitmentId === item.id; })) {
      store.assignments.push(assignment);
      if (store.assignments.length > MAX_ITEMS) store.assignments = store.assignments.slice(-MAX_ITEMS);
      store.stats.assigned = (Number(store.stats.assigned) || 0) + 1;
    }
    return assignment;
  }

  function corruption(root) {
    var vals = [root && root.corruption && root.corruption.trueIndex, root && root.corruption && root.corruption.index, root && root.corruption];
    for (var i = 0; i < vals.length; i += 1) {
      var n = Number(vals[i]);
      if (isFinite(n)) return clamp(n, 0, 100);
    }
    return 50;
  }

  function localCorruption(root) {
    var n = Number(root && root.corruption && root.corruption.subDepts && root.corruption.subDepts.provincial && root.corruption.subDepts.provincial.true);
    return isFinite(n) ? clamp(n, 0, 100) : corruption(root);
  }

  function calcFalseReportRisk(root, item) {
    var corr = corruption(root);
    var local = localCorruption(root);
    var integrity = item && item.executor ? Number(item.executor.integrity) || 55 : 55;
    var audit = item && item.independentAudit ? 0.25 : 0;
    return clamp((corr * 0.42 + local * 0.38 + (100 - integrity) * 0.20) / 100 - audit, 0, 0.95);
  }

  function actualProgress(item) {
    return clamp(Number(item && item.progress) || 0, 0, 100);
  }

  function reportBias(root, item) {
    var risk = calcFalseReportRisk(root, item);
    return Math.round(risk * 34);
  }

  function generateOfficialReport(root, item, spent, options) {
    var store = ensureStore(root);
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var actual = Math.round(actualProgress(item));
    var reported = clamp(actual + reportBias(root, item), 0, 100);
    var report = {
      id: 'mxresp-report-' + turn + '-' + item.id + '-' + (store.officialReports.length + 1),
      turn: turn,
      commitmentId: item.id,
      linkedIssue: item.linkedIssue || '',
      agency: item.agency || '',
      executorName: item.executor && item.executor.name || '',
      regionName: item.regionName || '',
      className: item.className || '',
      actualProgress: actual,
      reportedProgress: reported,
      falseReportRisk: calcFalseReportRisk(root, item),
      spent: clone(spent || {}),
      text: '官报：' + (item.regionName || '') + '·' + (item.className || '') + '·所报进度 ' + Math.round(reported) + '%'
    };
    store.officialReports.push(report);
    if (store.officialReports.length > MAX_ITEMS) store.officialReports = store.officialReports.slice(-MAX_ITEMS);
    store.stats.reports = (Number(store.stats.reports) || 0) + 1;
    return report;
  }

  function generateRumor(root, item, report, options) {
    var store = ensureStore(root);
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var risk = report ? Number(report.falseReportRisk) || 0 : calcFalseReportRisk(root, item);
    var actual = report ? report.actualProgress : Math.round(actualProgress(item));
    var gap = report ? Math.max(0, Number(report.reportedProgress) - Number(report.actualProgress)) : 0;
    var hot = risk >= 0.5 || gap >= 12 || item.status === 'failed' || item.status === 'stalled';
    var rumor = {
      id: 'mxresp-rumor-' + turn + '-' + item.id + '-' + (store.rumors.length + 1),
      turn: turn,
      commitmentId: item.id,
      linkedIssue: item.linkedIssue || '',
      regionName: item.regionName || '',
      className: item.className || '',
      trueProgress: actual,
      reportedProgress: report ? report.reportedProgress : actual,
      falseReportRisk: Math.round(risk * 100) / 100,
      severity: hot ? 'hot' : 'watch',
      sourceType: 'minxin_responsibility_rumor',
      text: (hot ? '坊间疾呼：' : '坊间风闻：') + (item.regionName || '') + '·' + (item.className || '') + '·实际进度 ' + actual + '%'
    };
    store.rumors.push(rumor);
    if (store.rumors.length > MAX_ITEMS) store.rumors = store.rumors.slice(-MAX_ITEMS);
    store.stats.rumors = (Number(store.stats.rumors) || 0) + 1;
    return rumor;
  }

  function shouldAccount(item, report, rumor) {
    if (!item) return false;
    if (item._responsibilityAccountabilitySpawned) return false;
    var gap = report ? Number(report.reportedProgress) - Number(report.actualProgress) : 0;
    return item.status === 'failed' || (rumor && rumor.severity === 'hot' && (gap >= 10 || Number(rumor.falseReportRisk) >= 0.5));
  }

  function spawnAccountability(root, item, report, rumor, options) {
    var store = ensureStore(root);
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    item._responsibilityAccountabilitySpawned = true;
    var title = '问责·' + (item.executor && item.executor.name || item.agency || '有司') + '·' + (item.regionName || '');
    var mem = {
      id: 'mxresp-acc-mem-' + item.id,
      turn: turn,
      title: title,
      topic: title,
      from: '都察院',
      dept: '都察院',
      type: '弹劾',
      subtype: '民情问责',
      content: '官报与坊间舆情在' + (item.regionName || '') + '·' + (item.className || '') + '一事上相牴牾，疑有虚报。',
      text: '官报与坊间舆情在' + (item.regionName || '') + '·' + (item.className || '') + '一事上相牴牾，疑有虚报。',
      status: 'pending',
      priority: 'urgent',
      sourceType: 'minxin_accountability',
      sourceSystem: 'minxin-responsibility',
      linkedCommitment: item.id,
      linkedIssue: item.linkedIssue || ''
    };
    ensureArray(root, 'memorials').unshift(mem);
    var topic = {
      id: 'mxresp-acc-tinyi-' + item.id,
      turn: turn,
      topic: title + '·吁请廷议核处',
      title: title + '·吁请廷议核处',
      from: 'minxin-responsibility-chain',
      sourceType: 'minxin_accountability',
      sourceId: item.id,
      linkedCommitment: item.id,
      linkedIssue: item.linkedIssue || '',
      sourceClass: item.className || '',
      className: item.className || '',
      regionName: item.regionName || '',
      demandText: '查究虚报与执行延宕',
      priority: 90,
      reason: rumor && rumor.text || report && report.text || '民情执行问责'
    };
    ensureArray(root, '_pendingTinyiTopics').unshift(topic);
    var rec = {
      id: 'mxresp-acc-' + item.id,
      turn: turn,
      commitmentId: item.id,
      memorialId: mem.id,
      tinyiId: topic.id,
      reportId: report && report.id || '',
      rumorId: rumor && rumor.id || '',
      reason: topic.reason
    };
    store.accountability.push(rec);
    if (store.accountability.length > MAX_ITEMS) store.accountability = store.accountability.slice(-MAX_ITEMS);
    store.stats.accountability = (Number(store.stats.accountability) || 0) + 1;
    try {
      if (TM.SocialPoliticalSignals && typeof TM.SocialPoliticalSignals.record === 'function') {
        TM.SocialPoliticalSignals.record(root, {
          sourceSystem: 'minxin-responsibility',
          kind: 'responsibility-accountability',
          tags: ['minxin', 'responsibility', 'accountability'],
          intensity: 0.82,
          confidence: 0.82,
          linkedIssue: item.id,
          reason: topic.reason,
          affectedClasses: [{ name: item.className || '', satisfactionDelta: -1.5, reason: topic.reason }],
          evidence: [mem.title, topic.topic]
        });
      }
    } catch (_) {}
    return rec;
  }

  function activeCommitments(root) {
    var store = root && root._minxinCommitments;
    return toArray(store && store.items).filter(function(item) {
      return item && item.id && item.status !== 'resolved';
    });
  }

  function tick(root, options) {
    root = pickRoot(root);
    options = options || {};
    var store = ensureStore(root);
    var assigned = 0;
    var reports = 0;
    var rumors = 0;
    var accountability = 0;
    activeCommitments(root).forEach(function(item) {
      var beforeAssigned = store.assignments.length;
      assign(root, item, options);
      if (store.assignments.length > beforeAssigned) assigned += 1;
      var spent = spendResources(root, item.resourcePlan || {});
      item.resourceSpent = item.resourceSpent || { money: 0, grain: 0 };
      item.resourceSpent.money = (Number(item.resourceSpent.money) || 0) + (spent.money || 0);
      item.resourceSpent.grain = (Number(item.resourceSpent.grain) || 0) + (spent.grain || 0);
      item.falseReportRisk = calcFalseReportRisk(root, item);
      var report = generateOfficialReport(root, item, spent, options);
      var rumor = generateRumor(root, item, report, options);
      reports += 1;
      rumors += 1;
      if (shouldAccount(item, report, rumor)) {
        spawnAccountability(root, item, report, rumor, options);
        accountability += 1;
      }
    });
    root._minxinResponsibilityMaintenance = {
      turn: Number(options.turn != null ? options.turn : root.turn) || 0,
      source: options.source || 'minxin-responsibility-chain',
      assigned: assigned,
      reports: reports,
      rumors: rumors,
      accountability: accountability,
      active: activeCommitments(root).length
    };
    return clone(root._minxinResponsibilityMaintenance);
  }

  function findCommitment(root, id, text) {
    var items = toArray(root && root._minxinCommitments && root._minxinCommitments.items);
    var sid = String(id || '').trim();
    if (sid) {
      var hit = items.find(function(x) { return x && (String(x.id || '') === sid || String(x.linkedIssue || '') === sid); });
      if (hit) return hit;
    }
    var hay = normalizeName(text || '');
    if (!hay) return null;
    return items.find(function(x) {
      if (!x) return false;
      var row = normalizeName([x.regionName, x.className, x.executor && x.executor.name, x.text, x.linkedIssue].map(textOf).join(' '));
      return row && (hay.indexOf(row) >= 0 || (x.regionName && hay.indexOf(normalizeName(x.regionName)) >= 0));
    }) || null;
  }

  function recordPlayerIntervention(root, payload, options) {
    root = pickRoot(root);
    payload = payload || {};
    options = options || {};
    var item = findCommitment(root, payload.linkedCommitment || payload.commitmentId || payload.linkedIssue, [payload.text, payload.target, payload.to, payload.actor].map(textOf).join(' '));
    if (!item) return { ok: false, reason: 'no-matching-commitment' };
    var store = ensureStore(root);
    assign(root, item, options);
    var turn = Number(options.turn != null ? options.turn : root.turn) || 0;
    var intervention = {
      id: 'mxresp-int-' + turn + '-' + (store.interventions.length + 1),
      turn: turn,
      commitmentId: item.id,
      channel: compact(payload.channel || 'formal', 40),
      target: compact(payload.target || payload.to || payload.actor || '', 90),
      text: compact(payload.text || payload.content || payload.reply || '', 220),
      source: options.source || 'minxin-responsibility-intervention'
    };
    item.independentAudit = true;
    item.falseReportRisk = clamp(calcFalseReportRisk(root, item) - 0.18, 0, 0.95);
    item.lastIntervention = clone(intervention);
    store.interventions.push(intervention);
    if (store.interventions.length > MAX_ITEMS) store.interventions = store.interventions.slice(-MAX_ITEMS);
    store.stats.interventions = (Number(store.stats.interventions) || 0) + 1;
    try {
      if (TM.SocialPoliticalSignals && typeof TM.SocialPoliticalSignals.record === 'function') {
        TM.SocialPoliticalSignals.record(root, {
          sourceSystem: 'minxin-responsibility',
          kind: 'responsibility-intervention',
          tags: ['minxin', 'responsibility', intervention.channel, 'intervention'],
          intensity: 0.55,
          confidence: 0.78,
          linkedIssue: item.id,
          reason: intervention.text || 'player intervention on responsibility chain',
          affectedClasses: [{ name: item.className || '', satisfactionDelta: 0.6, reason: intervention.text || '' }],
          evidence: [intervention.channel, intervention.target, item.regionName, item.className]
        });
      }
    } catch (_) {}
    return { ok: true, intervention: clone(intervention), commitment: clone(item) };
  }

  function snapshot(root, options) {
    root = pickRoot(root);
    options = options || {};
    var limit = Math.max(1, Math.min(60, Number(options.limit || 12) || 12));
    var store = ensureStore(root);
    return {
      turn: Number(root.turn) || 0,
      maintenance: clone(root._minxinResponsibilityMaintenance || null),
      assignments: store.assignments.slice(-limit).reverse().map(clone),
      officialReports: store.officialReports.slice(-limit).reverse().map(clone),
      rumors: store.rumors.slice(-limit).reverse().map(clone),
      interventions: store.interventions.slice(-limit).reverse().map(clone),
      accountability: store.accountability.slice(-limit).reverse().map(clone),
      stats: clone(store.stats)
    };
  }

  function lineReport(r) {
    return '- ' + r.regionName + ' / ' + r.className
      + ' executor=' + (r.executorName || '')
      + ' actual=' + (r.actualProgress || 0)
      + ' reported=' + (r.reportedProgress || 0)
      + ' risk=' + (r.falseReportRisk || 0);
  }

  function lineRumor(r) {
    return '- ' + r.regionName + ' / ' + r.className
      + ' severity=' + (r.severity || '')
      + ' true=' + (r.trueProgress || 0)
      + ' risk=' + (r.falseReportRisk || 0)
      + ' text=' + compact(r.text || '', 80);
  }

  function formatForPrompt(root, options) {
    var snap = snapshot(root, options || {});
    if (!snap.assignments.length && !snap.officialReports.length && !snap.rumors.length && !snap.accountability.length) return '';
    var lines = ['\n\n=== 民情执行·责任链 ==='];
    lines.push('贪腐高企时，官报常与坊间舆情相牴牾。将风闻视作隐性执行风险的线索，而非直接政令。相关奏疏、书信、廷议议题须以中文叙写，勿夹英文字段名。');
    if (snap.assignments.length) lines.push('assignments:\n' + snap.assignments.slice(0, 6).map(function(a) {
      return '- ' + a.commitmentId + ' agency=' + a.agency + ' executor=' + (a.executor && a.executor.name || '') + ' region=' + a.regionName + ' class=' + a.className;
    }).join('\n'));
    if (snap.officialReports.length) lines.push('officialReports:\n' + snap.officialReports.slice(0, 6).map(lineReport).join('\n'));
    if (snap.rumors.length) lines.push('rumors:\n' + snap.rumors.slice(0, 6).map(lineRumor).join('\n'));
    if (snap.accountability.length) lines.push('accountability:\n' + snap.accountability.slice(0, 5).map(function(a) {
      return '- ' + a.commitmentId + ' memorial=' + a.memorialId + ' tinyi=' + a.tinyiId + ' reason=' + compact(a.reason || '', 90);
    }).join('\n'));
    return lines.join('\n');
  }

  function diagnosticsText(root, options) {
    var snap = snapshot(root, options || {});
    var lines = ['=== Minxin Responsibility Chain Diagnostics ==='];
    lines.push('assignments=' + snap.assignments.length + ' officialReports=' + snap.officialReports.length + ' rumors=' + snap.rumors.length + ' interventions=' + snap.interventions.length + ' accountability=' + snap.accountability.length);
    if (snap.maintenance) lines.push('maintenance turn=' + snap.maintenance.turn + ' assigned=' + snap.maintenance.assigned + ' reports=' + snap.maintenance.reports + ' rumors=' + snap.maintenance.rumors + ' accountability=' + snap.maintenance.accountability);
    if (snap.officialReports.length) lines.push('officialReports:\n' + snap.officialReports.map(lineReport).join('\n'));
    if (snap.rumors.length) lines.push('rumors:\n' + snap.rumors.map(lineRumor).join('\n'));
    return lines.join('\n');
  }

  TM.MinxinResponsibilityChain = {
    tick: tick,
    assign: assign,
    recordPlayerIntervention: recordPlayerIntervention,
    snapshot: snapshot,
    formatForPrompt: formatForPrompt,
    diagnosticsText: diagnosticsText,
    _agencyFor: agencyFor,
    _resourcePlan: resourcePlan,
    _calcFalseReportRisk: calcFalseReportRisk
  };

  global.MinxinResponsibilityChain = TM.MinxinResponsibilityChain;
  if (typeof module !== 'undefined' && module.exports) module.exports = TM.MinxinResponsibilityChain;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
