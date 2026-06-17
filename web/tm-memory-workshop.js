(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryWorkshop = root.TM.MemoryWorkshop || {};
  var PANEL_ID = 'tm-memory-workshop';
  var STYLE_ID = 'tm-memory-workshop-style';
  var DEFAULT_AUDIT_LIMIT = 120;
  var state = { open: false, playerSafe: true, GM: null, auditFilter: 'all', auditTarget: '' };

  function toText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }

  function clean(value, maxLen) {
    var text = toText(value).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.slice(0, maxLen || 240);
  }

  function esc(value) {
    return clean(value, 2000)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function cloneValue(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function getGM(opts) {
    opts = opts || {};
    if (opts.GM) {
      state.GM = opts.GM;
      return opts.GM;
    }
    if (root.GM) {
      state.GM = root.GM;
      return root.GM;
    }
    return state.GM || {};
  }

  function traceOf(GM) {
    var MT = root.TM && root.TM.MemoryTrace;
    if (MT && typeof MT.snapshot === 'function') return MT.snapshot(GM);
    return GM && GM._turnAiResults && GM._turnAiResults.memoryTrace || null;
  }

  function collectEnvelopes(GM, opts) {
    var ME = root.TM && root.TM.MemoryEnvelope;
    if (!ME || typeof ME.collect !== 'function') return [];
    try { return ME.collect(GM, opts || {}); } catch (_) { return []; }
  }

  function collectEvidenceSources(GM, opts) {
    var ER = root.TM && root.TM.MemoryEvidenceRegistry;
    if (!ER || typeof ER.buildEvidenceSnapshot !== 'function') return null;
    try { return ER.buildEvidenceSnapshot(GM, opts || {}); } catch (_) { return null; }
  }

  function isRedacted(item, opts) {
    opts = opts || {};
    if (opts.playerSafe !== true) return false;
    var visibility = clean(item && item.visibility, 80).toLowerCase();
    var status = clean(item && item.status, 80).toLowerCase();
    return visibility === 'hidden' ||
      visibility === 'gm_hidden' ||
      visibility === 'heaven_secret' ||
      visibility === 'quarantine' ||
      visibility === 'quarantined' ||
      status === 'quarantined' ||
      status === 'quarantine';
  }

  function bodyOf(item, opts) {
    if (isRedacted(item, opts)) return '[hidden memory]';
    return clean(item && (item.body || item.text || item.content || item.summary || item.textPreview), 260);
  }

  function controlRedacts(ctrl, opts) {
    opts = opts || {};
    if (opts.playerSafe !== true || !ctrl) return false;
    return ctrl.hidden === true || ctrl.markedFalse === true || ctrl.archived === true;
  }

  function bodyWithControl(item, ctrl, opts) {
    if (controlRedacts(ctrl, opts)) return '[hidden memory]';
    return bodyOf(item, opts);
  }

  function sourceRefsLabel(item) {
    return arr(item && item.sourceRefs).slice(0, 3).map(function(ref) {
      return clean(ref && ref.type, 24) + ':' + clean(ref && ref.id, 48);
    }).filter(Boolean).join(', ');
  }

  function rollupLists(GM) {
    GM = GM || {};
    return {
      chronicleRollups: arr(GM._memoryChronicleRollups),
      issueChains: arr(GM._memoryIssueChains),
      characterDossiers: arr(GM._memoryCharacterDossiers)
    };
  }

  function collectRollups(GM) {
    var lists = rollupLists(GM);
    var out = [];
    lists.chronicleRollups.forEach(function(item) { out.push({ stream: 'chronicle', item: item }); });
    lists.issueChains.forEach(function(item) { out.push({ stream: 'issue', item: item }); });
    lists.characterDossiers.forEach(function(item) { out.push({ stream: 'character', item: item }); });
    return out;
  }

  function refsLabel(item, field) {
    return arr(item && item[field]).slice(0, 4).map(function(ref) {
      return clean(ref && ref.type, 24) + ':' + clean(ref && ref.id, 48);
    }).filter(Boolean).join(', ');
  }

  function refList(value) {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  function governanceRefsLabel(item, fieldNames) {
    var refs = [];
    governanceRefs(item, fieldNames).forEach(function(ref) {
      refs.push(ref);
    });
    return refs.slice(0, 4).map(function(ref) {
      if (!ref) return '';
      if (typeof ref === 'string') return clean(ref, 120);
      return clean(ref.type || 'memory', 60) + ':' + clean(ref.id || ref.key || ref.uuid || ref.memoryId, 120);
    }).filter(Boolean).join('|');
  }

  function governanceRefs(item, fieldNames) {
    item = item || {};
    var fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    var refs = [];
    fields.forEach(function(field) {
      refs = refs.concat(refList(item[field]));
    });
    return refs.filter(Boolean);
  }

  function governanceRefId(ref) {
    if (!ref) return '';
    if (typeof ref === 'string') return clean(ref, 180);
    return clean(ref.id || ref.key || ref.uuid || ref.memoryId || ref.sourceId, 180);
  }

  function renderGovernanceLabel(GM, item) {
    item = item || {};
    var extra = item.extra || {};
    var ctrl = controlFor(GM, item.id);
    var parts = [];
    var factKey = clean(item.factKey || item.fact_key || item.stableKey || item.stable_key || extra.factKey || extra.stableKey, 180);
    var supersedes = governanceRefsLabel(item, ['supersedesRefs', 'supersedes_refs', 'supersededRefs']);
    var contradicts = governanceRefsLabel(item, ['contradictsRefs', 'contradicts_refs', 'conflictsWithRefs', 'conflicts_with_refs']);
    var duplicateOf = clean(item.duplicateOf || extra.duplicateOf, 180);
    var supersededBy = clean(item.supersededBy || ctrl.supersededBy, 180);
    if (factKey) parts.push('fact=' + factKey);
    if (supersedes) parts.push('supersedes=' + supersedes);
    if (contradicts) parts.push('contradicts=' + contradicts);
    if (duplicateOf) parts.push('duplicateOf=' + duplicateOf);
    if (supersededBy) parts.push('supersededBy=' + supersededBy);
    if (ctrl.cooldownUntilTurn != null) parts.push('cooldown=' + Number(ctrl.cooldownUntilTurn || 0));
    if (ctrl.archived === true) parts.push('archived');
    if (ctrl.markedFalse === true) parts.push('markedFalse');
    return parts.join(' ');
  }

  function reasonsLabel(item) {
    return arr(item && item.reasons).map(function(r) {
      return clean(r && (r.code || r.message), 80);
    }).filter(Boolean).join(', ');
  }

  function reviewMetaLabel(item) {
    item = item || {};
    var extra = item.extra || {};
    var parts = [];
    if (extra.actor) parts.push('actor=' + clean(extra.actor, 80));
    if (extra.memoryType) parts.push('type=' + clean(extra.memoryType, 60));
    if (extra.qualityStatus) parts.push('quality=' + clean(extra.qualityStatus, 60));
    if (extra.confidence != null && isFinite(Number(extra.confidence))) parts.push('conf=' + Number(extra.confidence));
    if (item.ownerScope) parts.push('owner=' + clean(item.ownerScope, 100));
    if (item.readScope) parts.push('read=' + clean(item.readScope, 100));
    return parts.join(' ');
  }

  function rowsTable(headers, rows) {
    if (!rows.length) return '<div class="tm-mw-empty">No records</div>';
    return '<table class="tm-mw-table"><thead><tr>' +
      headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function(row) {
        return '<tr>' + row.map(function(cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function chip(label, tone) {
    return '<span class="tm-mw-chip ' + esc(tone || '') + '">' + esc(label) + '</span>';
  }

  function actionButton(action, id, label, attrs) {
    attrs = attrs || {};
    var extraAttrs = Object.keys(attrs).map(function(k) {
      var attrName = String(k).replace(/[A-Z]/g, function(ch) { return '-' + ch.toLowerCase(); });
      return ' data-' + esc(attrName) + '="' + esc(attrs[k]) + '"';
    }).join('');
    return '<button type="button" data-action="' + esc(action) + '" data-memory-id="' + esc(id || '') + '"' + extraAttrs + '>' + esc(label) + '</button>';
  }

  function governanceActionButtons(item) {
    var id = item && item.id || '';
    var buttons = [
      actionButton('hide-memory', id, 'Hide'),
      actionButton('mark-false-memory', id, 'Mark False'),
      actionButton('cooldown-memory', id, 'Cooldown', { cooldownTurns: 6 })
    ];
    if (governanceRefs(item, ['supersedesRefs', 'supersedes_refs', 'supersededRefs']).length) {
      buttons.push(actionButton('apply-supersedes', id, 'Apply Supersedes'));
    }
    buttons.push(actionButton('clear-memory-control', id, 'Clear Control'));
    return buttons;
  }

  function governanceActions(item) {
    return '<div class="tm-mw-row-actions">' + governanceActionButtons(item).join('') + '</div>';
  }

  function reviewActions(item, allowAccept) {
    var id = item && item.id || '';
    var buttons = [];
    if (allowAccept) buttons.push(actionButton('accept-draft', id, 'Accept'));
    buttons.push(actionButton('reject-draft', id, 'Reject'));
    buttons.push(actionButton('set-read-scope', id, 'Public', { readScope: 'public' }));
    if (item && item.ownerScope) buttons.push(actionButton('set-read-scope', id, 'Owner', { readScope: item.ownerScope }));
    buttons = buttons.concat(governanceActionButtons(item));
    return '<div class="tm-mw-row-actions">' + buttons.join('') + '</div>';
  }

  function buildSnapshot(GM, opts) {
    GM = GM || {};
    opts = opts || {};
    var trace = traceOf(GM);
    var envelopes = collectEnvelopes(GM, opts);
    var evidence = collectEvidenceSources(GM, opts);
    var drafts = arr(GM._memoryDraftInbox);
    var quarantine = arr(GM._memoryQuarantine);
    var accepted = arr(GM._memoryAccepted);
    var rollupSets = rollupLists(GM);
    var rollups = collectRollups(GM);
    var controls = GM._memoryControls && typeof GM._memoryControls === 'object' && !Array.isArray(GM._memoryControls) ? GM._memoryControls : {};
    var auditEvents = arr(GM._memoryAuditEvents);
    var retrievals = arr(trace && trace.retrievals);
    var injections = arr(trace && trace.injections);
    var compiledContexts = arr(trace && trace.compiledContexts);
    var writes = arr(trace && trace.writes);
    var countsByType = {};
    var countsByLane = {};
    envelopes.forEach(function(env) {
      var type = clean(env && env.type, 40) || 'unknown';
      var lane = clean(env && env.lane, 80) || 'unknown';
      countsByType[type] = (countsByType[type] || 0) + 1;
      countsByLane[lane] = (countsByLane[lane] || 0) + 1;
    });
    return {
      turn: Number(GM.turn || opts.turn || 0),
      trace: trace,
      evidence: evidence,
      envelopes: envelopes,
      drafts: drafts,
      quarantine: quarantine,
      accepted: accepted,
      rollups: rollups,
      chronicleRollups: rollupSets.chronicleRollups,
      issueChains: rollupSets.issueChains,
      characterDossiers: rollupSets.characterDossiers,
      controls: controls,
      auditEvents: auditEvents,
      retrievals: retrievals,
      injections: injections,
      compiledContexts: compiledContexts,
      writes: writes,
      countsByType: countsByType,
      countsByLane: countsByLane,
      counts: {
        envelopes: envelopes.length,
        drafts: drafts.length,
        quarantine: quarantine.length,
        accepted: accepted.length,
        rollups: rollups.length,
        chronicleRollups: rollupSets.chronicleRollups.length,
        issueChains: rollupSets.issueChains.length,
        characterDossiers: rollupSets.characterDossiers.length,
        controls: Object.keys(controls).length,
        auditEvents: auditEvents.length,
        evidenceSources: evidence && evidence.counts ? Number(evidence.counts.present || 0) : 0,
        retrievals: retrievals.length,
        injections: injections.length,
        compiledContexts: compiledContexts.length,
        writes: writes.length
      }
    };
  }

  function sectionDisplayName(key) {
    var map = {
      coreFacts: 'Core Facts',
      courtRecords: 'Court Records',
      stateAffairs: 'State Affairs',
      chronology: 'Chronology',
      characterMemory: 'Character Memory',
      recentEvents: 'Recent Events',
      relationshipFacts: 'Relationship Facts',
      warnings: 'Warnings'
    };
    return map[key] || key || 'unknown';
  }

  function countBy(list, keyFn) {
    var out = {};
    arr(list).forEach(function(item) {
      var key = clean(keyFn(item), 80) || 'unknown';
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }

  function countRows(label, map, limit) {
    return Object.keys(map || {}).sort(function(a, b) {
      return Number(map[b] || 0) - Number(map[a] || 0) || a.localeCompare(b);
    }).slice(0, limit || 12).map(function(key) {
      return [esc(label), esc(key), esc(map[key] || 0)];
    });
  }

  function compactHitLabel(hit, opts) {
    hit = hit || {};
    var body = bodyOf(hit, opts);
    return clean(hit.id || hit.key || 'hit', 70) +
      (hit.source ? ' (' + clean(hit.source, 30) + ')' : '') +
      (body ? ': ' + clean(body, 80) : '');
  }

  function dedupeSuppressed(list) {
    var seen = {};
    var out = [];
    arr(list).forEach(function(item) {
      if (!item) return;
      var key = [item.reason, item.id, item.source, item.budgetStage].map(function(v) { return clean(v, 80); }).join(':');
      if (seen[key]) return;
      seen[key] = true;
      out.push(item);
    });
    return out;
  }

  function suppressedPreview(item, opts) {
    item = item || {};
    opts = opts || {};
    var reason = clean(item.reason, 80).toLowerCase();
    if (opts.playerSafe === true && /hidden|quarantine|marked_false|read_scope|audience_scope/.test(reason)) {
      return '[hidden memory]';
    }
    return clean(item.textPreview || item.text || item.body, 120);
  }

  function buildPreInferenceDiagnostic(GM, opts) {
    GM = GM || {};
    opts = opts || {};
    var MCC = root.TM && root.TM.MemoryContextCompiler;
    if (!MCC || typeof MCC.compileFromGM !== 'function') {
      return {
        available: false,
        reason: 'compiler_unavailable',
        sectionRows: [],
        suppressed: [],
        kept: [],
        countsByType: {},
        countsBySource: {},
        countsByLane: {},
        countsByAuthority: {}
      };
    }
    var compileOpts = {
      turn: opts.turn || GM.turn,
      audience: opts.audience || 'system',
      actorScope: opts.actorScope || 'system',
      actorId: opts.actorId,
      factionId: opts.factionId,
      intent: opts.intent || 'turn_inference',
      maxTokens: Number(opts.preInferenceMaxTokens || opts.maxTokens || 2400),
      includeHidden: opts.includeHidden === true,
      includeFuture: opts.includeFuture === true,
      sc1q: opts.sc1q
    };
    var compiled = null;
    try {
      compiled = MCC.compileFromGM(GM, compileOpts);
    } catch (err) {
      return {
        available: false,
        reason: 'compile_failed',
        error: clean(err && (err.message || err), 200),
        compileOpts: compileOpts,
        sectionRows: [],
        suppressed: [],
        kept: [],
        countsByType: {},
        countsBySource: {},
        countsByLane: {},
        countsByAuthority: {}
      };
    }
    var sections = compiled && compiled.sections || {};
    var sectionRows = Object.keys(sections).map(function(key) {
      var hits = arr(sections[key]);
      return {
        key: key,
        label: sectionDisplayName(key),
        count: hits.length,
        items: hits.slice(0, 4)
      };
    }).filter(function(row) { return row.count > 0; });
    var hits = arr(compiled && compiled.hits);
    var diagnostics = compiled && compiled.diagnostics || {};
    return {
      available: true,
      reason: '',
      compileOpts: compileOpts,
      compiled: compiled,
      sections: sections,
      sectionRows: sectionRows,
      hits: hits,
      kept: arr(diagnostics.kept),
      suppressed: dedupeSuppressed(arr(compiled && compiled.suppressed).concat(arr(diagnostics.suppressed))),
      zones: arr(compiled && compiled.zones),
      tokenEstimate: Number(compiled && compiled.tokenEstimate || 0),
      maxTokens: Number(compiled && compiled.maxTokens || compileOpts.maxTokens || 0),
      textLength: clean(compiled && compiled.text, 200000).length,
      countsByType: countBy(hits, function(hit) { return hit && hit.type; }),
      countsBySource: countBy(hits, function(hit) { return hit && hit.source; }),
      countsByLane: countBy(hits, function(hit) { return hit && hit.lane; }),
      countsByAuthority: countBy(hits, function(hit) { return hit && hit.authority; })
    };
  }

  function renderPreInferenceContext(GM, opts) {
    opts = opts || {};
    var diag = buildPreInferenceDiagnostic(GM, opts);
    if (!diag.available) {
      return '<section class="tm-mw-section" data-section="pre-inference">' +
        '<h3>Pre-Inference Context</h3>' +
        '<div class="tm-mw-empty">' + esc(diag.reason || 'Unavailable') + (diag.error ? ': ' + esc(diag.error) : '') + '</div>' +
        '</section>';
    }
    var chips = [
      chip('Intent ' + (diag.compileOpts.intent || 'turn_inference'), 'neutral'),
      chip('Hits ' + diag.hits.length, 'neutral'),
      chip('Suppressed ' + diag.suppressed.length, diag.suppressed.length ? 'warn' : 'neutral'),
      chip('Tokens ' + diag.tokenEstimate + '/' + diag.maxTokens, diag.tokenEstimate && diag.maxTokens && diag.tokenEstimate > diag.maxTokens ? 'danger' : 'neutral'),
      chip('Zones ' + diag.zones.length, diag.zones.length ? 'neutral' : 'warn')
    ].join('');
    var sectionRows = diag.sectionRows.map(function(row) {
      return [
        esc(row.label),
        esc(row.count),
        esc(row.items.map(function(hit) { return compactHitLabel(hit, opts); }).join(' | '))
      ];
    });
    var distRows = []
      .concat(countRows('Lane', diag.countsByLane, 10))
      .concat(countRows('Type', diag.countsByType, 10))
      .concat(countRows('Source', diag.countsBySource, 10))
      .concat(countRows('Authority', diag.countsByAuthority, 8));
    var keptRows = diag.kept.slice(0, 12).map(function(item) {
      return [
        esc(item.stage || 'compiled'),
        esc(item.id || ''),
        esc(item.source || ''),
        esc(item.cost != null ? item.cost : '')
      ];
    });
    var suppressedRows = diag.suppressed.slice(0, 16).map(function(item) {
      return [
        esc(item.reason || 'filtered'),
        esc(item.id || ''),
        esc(item.source || ''),
        esc(item.budgetStage || item.stage || ''),
        esc(item.cost != null ? item.cost : ''),
        esc(suppressedPreview(item, opts))
      ];
    });
    var preview = clean(diag.compiled && diag.compiled.text, 1200);
    return '<section class="tm-mw-section" data-section="pre-inference">' +
      '<h3>Pre-Inference Context</h3>' +
      '<div class="tm-mw-summary">' + chips + '</div>' +
      rowsTable(['Section', 'Count', 'Top Items'], sectionRows) +
      '<h3>Pre-Inference Distribution</h3>' +
      rowsTable(['Group', 'Key', 'Count'], distRows) +
      '<h3>Pre-Inference Kept</h3>' +
      rowsTable(['Stage', 'Id', 'Source', 'Cost'], keptRows) +
      '<h3>Pre-Inference Suppressed</h3>' +
      rowsTable(['Reason', 'Id', 'Source', 'Stage', 'Cost', 'Preview'], suppressedRows) +
      '<h3>Pre-Inference Prompt Preview</h3>' +
      '<div class="tm-mw-pre">' + esc(preview) + '</div>' +
      '</section>';
  }

  function renderInjectionTrace(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.injections.map(function(inj) {
      var itemLabels = arr(inj.items).slice(0, 4).map(function(it) {
        return clean(it.id || it.key, 60) + (it.source ? ' (' + clean(it.source, 40) + ')' : '');
      }).join(', ');
      return [
        esc(inj.stage || 'injection'),
        esc(inj.lane || ''),
        esc(inj.textHash || ''),
        esc(inj.textLength || 0),
        esc(inj.textTokensEstimate || 0),
        esc(itemLabels)
      ];
    });
    return '<section class="tm-mw-section" data-section="injection">' +
      '<h3>Injection Trace</h3>' +
      rowsTable(['Stage', 'Lane', 'Hash', 'Chars', 'Tokens', 'Items'], rows) +
      '</section>';
  }

  function sectionCountsLabel(ctx) {
    var counts = ctx && (ctx.sectionCounts || ctx.sections) || {};
    return Object.keys(counts).filter(function(key) {
      return Number(counts[key] || 0) > 0;
    }).map(function(key) {
      return sectionDisplayName(key) + ':' + Number(counts[key] || 0);
    }).join(', ');
  }

  function renderCompiledContextTrace(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.compiledContexts.map(function(ctx) {
      var topItems = arr(ctx.items).slice(0, 4).map(function(it) {
        return clean(it.id || it.key, 60) + (it.source ? ' (' + clean(it.source, 40) + ')' : '');
      }).join(', ');
      return [
        esc(ctx.id || 'compiled-context'),
        esc(ctx.stage || ''),
        esc(ctx.intent || ''),
        esc(ctx.textHash || ''),
        esc((ctx.textTokensEstimate || 0) + '/' + (ctx.maxTokens || 0)),
        esc(sectionCountsLabel(ctx)),
        esc(arr(ctx.suppressed).length),
        esc(topItems)
      ];
    });
    return '<section class="tm-mw-section" data-section="compiled-context">' +
      '<h3>Compiled Context Trace</h3>' +
      rowsTable(['Id', 'Stage', 'Intent', 'Hash', 'Tokens', 'Sections', 'Suppressed', 'Top Items'], rows) +
      '</section>';
  }

  function renderRetrievalTrace(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.retrievals.map(function(ret) {
      var hitCount = arr(ret.hits).length;
      var suppressed = arr(ret.suppressed).slice(0, 5).map(function(s) {
        return clean(s.reason, 40) + (s.id ? ':' + clean(s.id, 50) : '');
      }).join(', ');
      var budget = ret.budget ? [
        'max=' + Number(ret.budget.maxTokens || 0),
        'used=' + Number(ret.budget.tokenEstimate || 0),
        'guaranteed=' + Number(ret.budget.guaranteed || 0),
        'fair=' + Number(ret.budget.fair || 0),
        'filled=' + Number(ret.budget.filled || 0),
        'dropped=' + Number(ret.budget.dropped || 0)
      ].join(' ') : '';
      return [
        esc(ret.id || 'retrieval'),
        esc(ret.status || ''),
        esc(ret.queryPreview || ret.queryHash || ''),
        esc(hitCount),
        esc(suppressed),
        esc(budget)
      ];
    });
    return '<section class="tm-mw-section" data-section="retrieval">' +
      '<h3>Retrieval Trace</h3>' +
      rowsTable(['Id', 'Status', 'Query', 'Hits', 'Suppressed', 'Budget'], rows) +
      '</section>';
  }

  function writeReadContextLabel(write) {
    return arr(write && write.readContextRefs).slice(0, 3).map(function(ref) {
      return clean(ref && ref.type, 50) + ':' + clean(ref && ref.id, 80);
    }).filter(Boolean).join(', ');
  }

  function renderWriteTrace(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.writes.map(function(write) {
      var items = arr(write.items).slice(0, 5).map(function(item) {
        return clean(item.id, 70) + (item.type ? ' (' + clean(item.type, 40) + ')' : '');
      }).join(', ');
      return [
        esc(write.id || 'memory-write'),
        esc(write.stage || ''),
        esc(write.sourceId || ''),
        esc((write.added || 0) + '/' + (write.candidates || 0)),
        esc('draft=' + (write.drafts || 0) + ' quarantine=' + (write.quarantined || 0) + ' accepted=' + (write.accepted || 0)),
        esc(writeReadContextLabel(write)),
        esc(items)
      ];
    });
    return '<section class="tm-mw-section" data-section="write-trace">' +
      '<h3>Write Trace</h3>' +
      rowsTable(['Id', 'Stage', 'Source', 'Added', 'Statuses', 'Read Context', 'Items'], rows) +
      '</section>';
  }

  function renderDraftInbox(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.drafts.map(function(item) {
      return [
        esc(item.id || ''),
        esc(item.type || item.kind || ''),
        esc(item.status || ''),
        esc(item.authority || item.source || ''),
        esc(reviewMetaLabel(item)),
        esc(renderGovernanceLabel(GM, item)),
        esc(reasonsLabel(item)),
        esc(bodyOf(item, opts)),
        esc(refsLabel(item, 'sourceRefs')),
        esc(refsLabel(item, 'basisRefs')),
        reviewActions(item, true)
      ];
    });
    return '<section class="tm-mw-section" data-section="drafts">' +
      '<h3>Draft Inbox</h3>' +
      rowsTable(['Id', 'Type', 'Status', 'Authority', 'Review', 'Governance', 'Reasons', 'Body', 'Sources', 'Basis', 'Actions'], rows) +
      '</section>';
  }

  function renderQuarantine(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.quarantine.map(function(item) {
      return [
        esc(item.id || ''),
        esc(item.type || item.kind || ''),
        esc(item.status || ''),
        esc(item.visibility || ''),
        esc(reviewMetaLabel(item)),
        esc(renderGovernanceLabel(GM, item)),
        esc(reasonsLabel(item)),
        esc(bodyOf(item, opts)),
        esc(refsLabel(item, 'sourceRefs')),
        esc(refsLabel(item, 'basisRefs')),
        reviewActions(item, true)
      ];
    });
    return '<section class="tm-mw-section" data-section="quarantine">' +
      '<h3>Quarantine</h3>' +
      rowsTable(['Id', 'Type', 'Status', 'Visibility', 'Review', 'Governance', 'Reasons', 'Body', 'Sources', 'Basis', 'Actions'], rows) +
      '</section>';
  }

  function renderAcceptedMemory(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.accepted.map(function(item) {
      return [
        esc(item.id || ''),
        esc(item.type || item.kind || ''),
        esc(item.factStatus || 'accepted_memory'),
        esc(item.authority || item.source || ''),
        esc(reviewMetaLabel(item)),
        esc(renderGovernanceLabel(GM, item)),
        esc(bodyOf(item, opts)),
        esc(refsLabel(item, 'sourceRefs')),
        esc(refsLabel(item, 'basisRefs')),
        esc(item.acceptedBy || item.reviewedBy || ''),
        governanceActions(item)
      ];
    });
    return '<section class="tm-mw-section" data-section="accepted-memory">' +
      '<h3>Accepted Memory</h3>' +
      rowsTable(['Id', 'Type', 'Fact', 'Authority', 'Review', 'Governance', 'Body', 'Sources', 'Basis', 'Accepted By', 'Actions'], rows) +
      '</section>';
  }

  function controlFor(GM, id) {
    GM = GM || {};
    var controls = GM._memoryControls && typeof GM._memoryControls === 'object' && !Array.isArray(GM._memoryControls) ? GM._memoryControls : {};
    return controls[id] || {};
  }

  function controlFlagsLabel(ctrl) {
    ctrl = ctrl || {};
    return ['pinned', 'resident', 'hidden', 'archived', 'markedFalse', 'locked'].filter(function(flag) {
      return ctrl[flag] === true;
    }).join(', ');
  }

  function rollupMetaLabel(item, stream) {
    item = item || {};
    var extra = item.extra || {};
    var parts = [stream];
    if (item.yearKey) parts.push('year=' + clean(item.yearKey, 40));
    if (item.issueId) parts.push('issue=' + clean(item.issueId, 80));
    if (item.actor) parts.push('actor=' + clean(item.actor, 80));
    if (item.startTurn || item.endTurn) parts.push('turns=' + clean(item.startTurn || item.turn || '', 20) + '-' + clean(item.endTurn || item.turn || '', 20));
    if (extra.itemCount != null) parts.push('items=' + Number(extra.itemCount || 0));
    return parts.join(' ');
  }

  function rollupActions(item) {
    var id = item && item.id || '';
    return '<div class="tm-mw-row-actions">' + [
      actionButton('pin-rollup', id, 'Pin'),
      actionButton('resident-rollup', id, 'Resident'),
      actionButton('hide-rollup', id, 'Hide'),
      actionButton('mark-false-rollup', id, 'Mark False'),
      actionButton('clear-rollup-control', id, 'Clear')
    ].join('') + '</div>';
  }

  function renderRollupReview(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.rollups.map(function(row) {
      var item = row.item || {};
      var id = item.id || '';
      var ctrl = controlFor(GM, id);
      return [
        esc(id),
        esc(item.type || ''),
        esc(item.authority || ''),
        esc(item.lane || ''),
        esc(rollupMetaLabel(item, row.stream)),
        esc(controlFlagsLabel(ctrl)),
        esc(bodyWithControl(item, ctrl, opts)),
        esc(refsLabel(item, 'sourceRefs')),
        esc(refsLabel(item, 'basisRefs')),
        rollupActions(item)
      ];
    });
    return '<section class="tm-mw-section" data-section="rollups">' +
      '<h3>Rollup Review</h3>' +
      rowsTable(['Id', 'Type', 'Authority', 'Lane', 'Meta', 'Controls', 'Body', 'Sources', 'Basis', 'Actions'], rows) +
      '</section>';
  }

  function handleAction(GM, action, id, opts) {
    opts = opts || {};
    var WG = root.TM && root.TM.MemoryWriteGate;
    if (!GM) return null;
    if (action === 'backfill-legacy') {
      var MB = root.TM && root.TM.MemoryTurnBackfill;
      if (MB && typeof MB.rebuildFromLegacy === 'function') {
        return MB.rebuildFromLegacy(GM, {
          turn: opts.turn || (GM && GM.turn),
          archiveCap: opts.archiveCap || 80,
          reviewer: opts.reviewer || 'workshop',
          reason: opts.reason || 'workshop legacy backfill',
          force: opts.force === true
        });
      }
      return null;
    }
    if (!id) return null;
    if (action === 'undo-memory-control') {
      return undoMemoryControl(GM, id, opts);
    }
    if (action === 'pin-rollup' || action === 'resident-rollup' || action === 'hide-rollup' || action === 'mark-false-rollup' || action === 'clear-rollup-control') {
      return handleRollupControl(GM, action, id, opts);
    }
    if (isMemoryControlAction(action)) {
      return handleMemoryControl(GM, action, id, opts);
    }
    if (action === 'set-read-scope') {
      return setReadScope(GM, id, opts.readScope, opts);
    }
    if (!WG) return null;
    if (action === 'accept-draft' && typeof WG.acceptDraft === 'function') {
      return WG.acceptDraft(GM, id, { reviewer: opts.reviewer || 'workshop', reason: opts.reason || 'workshop accept' });
    }
    if (action === 'reject-draft' && typeof WG.rejectDraft === 'function') {
      return WG.rejectDraft(GM, id, { reviewer: opts.reviewer || 'workshop', reason: opts.reason || 'workshop reject' });
    }
    if (action === 'flush-accepted' && typeof WG.flushAccepted === 'function') {
      return WG.flushAccepted(GM, { reviewer: opts.reviewer || 'workshop' });
    }
    return null;
  }

  function isMemoryControlAction(action) {
    return action === 'hide-memory' ||
      action === 'mark-false-memory' ||
      action === 'cooldown-memory' ||
      action === 'apply-supersedes' ||
      action === 'clear-memory-control';
  }

  function isDangerousPanelAction(action) {
    return action === 'mark-false-memory' ||
      action === 'apply-supersedes' ||
      action === 'clear-memory-control' ||
      action === 'mark-false-rollup' ||
      action === 'clear-rollup-control';
  }

  function actionLabel(action) {
    var labels = {
      'mark-false-memory': 'mark this memory false',
      'apply-supersedes': 'apply supersedes',
      'clear-memory-control': 'clear this memory control',
      'mark-false-rollup': 'mark this rollup false',
      'clear-rollup-control': 'clear this rollup control'
    };
    return labels[action] || action;
  }

  function defaultDangerReason(action) {
    return 'workshop guarded ' + String(action || '').replace(/-/g, '_');
  }

  function confirmDangerousPanelAction(action, id) {
    if (!isDangerousPanelAction(action)) return '';
    var label = actionLabel(action);
    if (typeof root.confirm === 'function') {
      var ok = root.confirm('Confirm ' + label + ' for ' + id + '?');
      if (ok !== true) return null;
    }
    var reason = defaultDangerReason(action);
    if (typeof root.prompt === 'function') {
      reason = root.prompt('Reason for ' + label + ' on ' + id + ' (required):', reason);
      if (reason == null) return null;
    }
    reason = clean(reason, 160);
    return reason || null;
  }

  function auditControl(GM, id, action, opts) {
    opts = opts || {};
    GM._memoryAuditEvents = arr(GM._memoryAuditEvents);
    GM._memoryAuditSeq = Number(GM._memoryAuditSeq || 0) + 1;
    var event = {
      auditId: 'memory-audit-' + GM._memoryAuditSeq,
      id: id,
      action: action,
      reviewer: clean(opts.reviewer || opts.by || 'workshop', 80),
      reason: clean(opts.reason || action, 160),
      turn: Number((GM && GM.turn) || opts.turn || 0)
    };
    if (opts.targetAuditId) event.targetAuditId = clean(opts.targetAuditId, 120);
    if (opts.undo) {
      event.undoable = true;
      event.undo = cloneValue(opts.undo);
    }
    GM._memoryAuditEvents.push(event);
    pruneAuditEvents(GM, opts);
    return event;
  }

  function pruneAuditEvents(GM, opts) {
    opts = opts || {};
    if (!GM || !Array.isArray(GM._memoryAuditEvents)) return 0;
    var limit = opts.auditLimit == null ? DEFAULT_AUDIT_LIMIT : Math.max(0, Number(opts.auditLimit || 0));
    if (!limit || GM._memoryAuditEvents.length <= limit) return 0;
    var removed = GM._memoryAuditEvents.length - limit;
    GM._memoryAuditEvents.splice(0, removed);
    return removed;
  }

  function controlKey(ref) {
    var MC = root.TM && root.TM.MemoryControls;
    if (MC && typeof MC.keyFor === 'function') return MC.keyFor(ref);
    return clean(ref, 180);
  }

  function controlsMap(GM) {
    if (!GM._memoryControls || typeof GM._memoryControls !== 'object' || Array.isArray(GM._memoryControls)) GM._memoryControls = {};
    return GM._memoryControls;
  }

  function captureUndoState(GM, refs, includeEdges) {
    var controls = controlsMap(GM);
    var seen = {};
    var entries = [];
    arr(refs).forEach(function(ref) {
      var key = controlKey(ref);
      if (!key || seen[key]) return;
      seen[key] = true;
      entries.push({
        key: key,
        before: Object.prototype.hasOwnProperty.call(controls, key) ? cloneValue(controls[key]) : null
      });
    });
    var undo = { controls: entries };
    if (includeEdges === true) undo.edgesBefore = cloneValue(arr(GM._memEdges));
    return undo;
  }

  function withUndo(opts, undo) {
    var out = {};
    Object.keys(opts || {}).forEach(function(k) { out[k] = opts[k]; });
    out.undo = undo;
    return out;
  }

  function restoreUndoState(GM, undo) {
    if (!GM || !undo) return false;
    var controls = controlsMap(GM);
    arr(undo.controls).forEach(function(entry) {
      if (!entry || !entry.key) return;
      if (entry.before == null) delete controls[entry.key];
      else controls[entry.key] = cloneValue(entry.before);
    });
    if (Array.isArray(undo.edgesBefore)) GM._memEdges = cloneValue(undo.edgesBefore);
    return true;
  }

  function findAuditEvent(GM, auditId) {
    var events = arr(GM && GM._memoryAuditEvents);
    for (var i = events.length - 1; i >= 0; i--) {
      var event = events[i] || {};
      if (event.auditId === auditId) return event;
    }
    return null;
  }

  function undoMemoryControl(GM, auditId, opts) {
    opts = opts || {};
    if (!GM || !auditId) return null;
    var event = findAuditEvent(GM, auditId);
    if (!event || event.undoable !== true || !event.undo || event.undone === true) return null;
    restoreUndoState(GM, event.undo);
    event.undone = true;
    event.undoneBy = clean(opts.reviewer || opts.by || 'workshop', 80);
    event.undoneTurn = Number((GM && GM.turn) || opts.turn || 0);
    event.undoneReason = clean(opts.reason || 'undo memory control', 160);
    auditControl(GM, event.id || auditId, 'undo_memory_control', {
      reviewer: event.undoneBy,
      reason: event.undoneReason,
      targetAuditId: event.auditId,
      turn: event.undoneTurn
    });
    return { undone: true, event: event };
  }

  function handleRollupControl(GM, action, id, opts) {
    opts = opts || {};
    var MC = root.TM && root.TM.MemoryControls;
    if (!GM || !id || !MC) return null;
    var reason = opts.reason || 'workshop rollup control';
    var reviewer = opts.reviewer || opts.by || 'workshop';
    var controlOpts = { reviewer: reviewer, reason: reason, turn: opts.turn || (GM && GM.turn) };
    var result = null;
    if (action === 'pin-rollup' && typeof MC.pinMemory === 'function') {
      var pinUndo = captureUndoState(GM, [id], false);
      result = MC.pinMemory(GM, id, controlOpts);
      auditControl(GM, id, 'pin_rollup', withUndo(opts, pinUndo));
    } else if (action === 'resident-rollup' && typeof MC.pinMemory === 'function') {
      var residentUndo = captureUndoState(GM, [id], false);
      var residentOpts = { reviewer: reviewer, resident: true, reason: reason, turn: opts.turn || (GM && GM.turn) };
      result = MC.pinMemory(GM, id, residentOpts);
      auditControl(GM, id, 'resident_rollup', withUndo(opts, residentUndo));
    } else if (action === 'hide-rollup' && typeof MC.hideMemory === 'function') {
      var hideUndo = captureUndoState(GM, [id], false);
      result = MC.hideMemory(GM, id, controlOpts);
      auditControl(GM, id, 'hide_rollup', withUndo(opts, hideUndo));
    } else if (action === 'mark-false-rollup' && typeof MC.markFalse === 'function') {
      var falseUndo = captureUndoState(GM, [id], false);
      result = MC.markFalse(GM, id, controlOpts);
      auditControl(GM, id, 'mark_false_rollup', withUndo(opts, falseUndo));
    } else if (action === 'clear-rollup-control' && typeof MC.clearControl === 'function') {
      var clearUndo = captureUndoState(GM, [id], false);
      result = MC.clearControl(GM, id);
      auditControl(GM, id, 'clear_rollup_control', withUndo(opts, clearUndo));
    }
    return result;
  }

  function handleMemoryControl(GM, action, id, opts) {
    opts = opts || {};
    var MC = root.TM && root.TM.MemoryControls;
    if (!GM || !id || !MC) return null;
    var reason = opts.reason || 'workshop memory control';
    var reviewer = opts.reviewer || opts.by || 'workshop';
    var controlOpts = {
      reviewer: reviewer,
      reason: reason,
      turn: opts.turn || (GM && GM.turn)
    };
    var result = null;
    if (action === 'hide-memory' && typeof MC.hideMemory === 'function') {
      var hideUndo = captureUndoState(GM, [id], false);
      result = MC.hideMemory(GM, id, controlOpts);
      auditControl(GM, id, 'hide_memory', withUndo(opts, hideUndo));
    } else if (action === 'mark-false-memory' && typeof MC.markFalse === 'function') {
      var falseUndo = captureUndoState(GM, [id], false);
      result = MC.markFalse(GM, id, controlOpts);
      auditControl(GM, id, 'mark_false_memory', withUndo(opts, falseUndo));
    } else if (action === 'cooldown-memory' && typeof MC.cooldownMemory === 'function') {
      var cooldownUndo = captureUndoState(GM, [id], false);
      var untilTurn = Number(opts.cooldownUntilTurn || opts.untilTurn || 0);
      if (!untilTurn) {
        untilTurn = Number((GM && GM.turn) || opts.turn || 0) + Math.max(1, Number(opts.cooldownTurns || 5));
      }
      result = MC.cooldownMemory(GM, id, untilTurn, controlOpts);
      auditControl(GM, id, 'cooldown_memory', withUndo(opts, cooldownUndo));
    } else if (action === 'clear-memory-control' && typeof MC.clearControl === 'function') {
      var clearUndo = captureUndoState(GM, [id], false);
      result = MC.clearControl(GM, id);
      auditControl(GM, id, 'clear_memory_control', withUndo(opts, clearUndo));
    } else if (action === 'apply-supersedes' && typeof MC.supersedeMemory === 'function') {
      result = applySupersedesControl(GM, id, MC, controlOpts, opts);
    }
    return result;
  }

  function applySupersedesControl(GM, id, MC, controlOpts, opts) {
    opts = opts || {};
    var item = findReviewItem(GM, id) || opts;
    var refs = governanceRefs(item, ['supersedesRefs', 'supersedes_refs', 'supersededRefs']);
    var oldIds = refs.map(function(ref) { return governanceRefId(ref); }).filter(Boolean);
    var undo = captureUndoState(GM, oldIds, true);
    var applied = 0;
    var controls = [];
    oldIds.forEach(function(oldId) {
      if (!oldId) return;
      var ctrl = MC.supersedeMemory(GM, oldId, id, controlOpts);
      if (ctrl) {
        applied++;
        controls.push(ctrl);
      }
    });
    if (applied) auditControl(GM, id, 'apply_supersedes', withUndo(opts, undo));
    return {
      applied: applied,
      controls: controls,
      edges: Array.isArray(GM && GM._memEdges) ? GM._memEdges.slice() : []
    };
  }

  function findReviewItem(GM, id) {
    if (!GM || !id) return null;
    var pools = [GM._memoryWriteQueue, GM._memoryDraftInbox, GM._memoryQuarantine, GM._memoryAccepted];
    for (var p = 0; p < pools.length; p++) {
      var list = arr(pools[p]);
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) return list[i];
      }
    }
    return null;
  }

  function setReadScope(GM, id, readScope, opts) {
    opts = opts || {};
    readScope = clean(readScope, 120);
    if (!GM || !id || !readScope) return null;
    var item = findReviewItem(GM, id);
    if (!item) return null;
    item.readScope = readScope;
    item.reviewedAtTurn = Number((GM && GM.turn) || item.turn || 0);
    item.reviewedBy = clean(opts.reviewer || 'workshop', 80);
    GM._memoryAuditEvents = arr(GM._memoryAuditEvents);
    GM._memoryAuditEvents.push({
      id: id,
      action: 'set_read_scope',
      readScope: readScope,
      reviewer: item.reviewedBy,
      reason: clean(opts.reason || 'workshop readScope edit', 160),
      turn: item.reviewedAtTurn
    });
    return item;
  }

  function renderMemoryControls(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = Object.keys(snapshot.controls || {}).sort().map(function(key) {
      var item = snapshot.controls[key] || {};
      var flags = ['pinned', 'resident', 'locked', 'hidden', 'archived', 'markedFalse'].filter(function(flag) {
        return item[flag] === true;
      }).join(', ');
      return [
        esc(key),
        esc(flags),
        esc(item.cooldownUntilTurn != null ? item.cooldownUntilTurn : ''),
        esc(item.supersededBy || ''),
        esc(item.updatedTurn || ''),
        esc(item.reason || '')
      ];
    });
    return '<section class="tm-mw-section" data-section="controls">' +
      '<h3>Memory Controls</h3>' +
      rowsTable(['Key', 'Flags', 'Cooldown', 'Superseded By', 'Turn', 'Reason'], rows) +
      '</section>';
  }

  function auditActions(event) {
    event = event || {};
    var buttons = [];
    if (event.undoable === true && event.undone !== true && event.auditId) {
      buttons.push(actionButton('undo-memory-control', event.auditId, 'Undo', { targetId: event.id || '' }));
    }
    if (event.id) {
      buttons.push(actionButton('set-audit-target', event.id, 'Target'));
    }
    return buttons.length ? '<div class="tm-mw-row-actions">' + buttons.join('') + '</div>' : '';
  }

  function isDangerAuditAction(action) {
    return action === 'mark_false_memory' ||
      action === 'mark_false_rollup' ||
      action === 'apply_supersedes' ||
      action === 'clear_memory_control' ||
      action === 'clear_rollup_control';
  }

  function filterAuditEvents(events, opts) {
    opts = opts || {};
    var filter = clean(opts.auditFilter || 'all', 40) || 'all';
    var target = clean(opts.auditTarget || '', 180);
    return arr(events).filter(function(event) {
      event = event || {};
      if (target && event.id !== target) return false;
      if (filter === 'undoable') return event.undoable === true && event.undone !== true;
      if (filter === 'active') return event.undone !== true;
      if (filter === 'danger') return isDangerAuditAction(event.action);
      return true;
    });
  }

  function auditFilterButton(filter, label, activeFilter) {
    var active = filter === activeFilter ? ' data-active="true"' : '';
    return '<button type="button" data-action="set-audit-filter" data-audit-filter="' + esc(filter) + '"' + active + '>' + esc(label) + '</button>';
  }

  function renderAuditFilters(opts) {
    opts = opts || {};
    var filter = clean(opts.auditFilter || 'all', 40) || 'all';
    var target = clean(opts.auditTarget || '', 180);
    var buttons = [
      auditFilterButton('all', 'All', filter),
      auditFilterButton('active', 'Active', filter),
      auditFilterButton('undoable', 'Undoable', filter),
      auditFilterButton('danger', 'Danger', filter)
    ];
    if (target) buttons.push('<button type="button" data-action="clear-audit-target">Clear Target</button>');
    return '<div class="tm-mw-row-actions tm-mw-audit-filters">' + buttons.join('') +
      '<span class="tm-mw-chip neutral">Audit Filter ' + esc(filter) + '</span>' +
      (target ? '<span class="tm-mw-chip warn">Audit Target ' + esc(target) + '</span>' : '') +
      '</div>';
  }

  function renderAuditEvents(GM, opts) {
    opts = opts || {};
    var snapshot = buildSnapshot(GM, opts);
    var rows = filterAuditEvents(snapshot.auditEvents, opts).slice(-24).reverse().map(function(event) {
      event = event || {};
      var status = event.undone === true ? 'undone' : (event.undoable === true ? 'undoable' : '');
      return [
        esc(event.auditId || ''),
        esc(event.id || ''),
        esc(event.action || ''),
        esc(event.reason || ''),
        esc(event.turn || ''),
        esc(status),
        auditActions(event)
      ];
    });
    return '<section class="tm-mw-section" data-section="audit-events">' +
      '<h3>Governance Audit</h3>' +
      renderAuditFilters(opts) +
      rowsTable(['Audit Id', 'Target', 'Action', 'Reason', 'Turn', 'Status', 'Actions'], rows) +
      '</section>';
  }

  function renderEvidenceSources(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.evidence && Array.isArray(snapshot.evidence.sources)
      ? snapshot.evidence.sources.filter(function(src) { return src.present || src.memoryEnvelope; }).map(function(src) {
        return [
          esc(src.id || ''),
          esc(src.path || ''),
          esc(src.count || 0),
          esc(src.authority || ''),
          esc(src.authorityRank || 0),
          esc(src.role || ''),
          esc(src.lane || ''),
          esc(src.memoryEnvelope ? 'yes' : 'no'),
          esc(src.hiddenCount || 0),
          esc(arr(src.promptConsumers).join(', '))
        ];
      })
      : [];
    return '<section class="tm-mw-section" data-section="evidence">' +
      '<h3>Evidence Sources</h3>' +
      rowsTable(['Id', 'Path', 'Count', 'Authority', 'Rank', 'Role', 'Lane', 'Envelope', 'Hidden', 'Consumers'], rows) +
      '</section>';
  }

  function renderEnvelopeInventory(GM, opts) {
    var snapshot = buildSnapshot(GM, opts);
    var rows = snapshot.envelopes.map(function(env) {
      return [
        esc(env.id || ''),
        esc(env.type || ''),
        esc(env.status || ''),
        esc(env.authority || ''),
        esc(env.visibility || ''),
        esc(env.lane || ''),
        esc(bodyWithControl(env, controlFor(GM, env && env.id), opts)),
        esc(sourceRefsLabel(env))
      ];
    });
    return '<section class="tm-mw-section" data-section="inventory">' +
      '<h3>Envelope Inventory</h3>' +
      rowsTable(['Id', 'Type', 'Status', 'Authority', 'Visibility', 'Lane', 'Body', 'Sources'], rows) +
      '</section>';
  }

  function renderSummary(snapshot) {
    var chips = [
      chip('Turn ' + snapshot.turn, 'neutral'),
      chip('Envelopes ' + snapshot.counts.envelopes, 'neutral'),
      chip('Evidence ' + snapshot.counts.evidenceSources, 'neutral'),
      chip('Retrievals ' + snapshot.counts.retrievals, 'neutral'),
      chip('Injections ' + snapshot.counts.injections, 'neutral'),
      chip('CompiledCtx ' + snapshot.counts.compiledContexts, snapshot.counts.compiledContexts ? 'neutral' : 'warn'),
      chip('Writes ' + snapshot.counts.writes, snapshot.counts.writes ? 'neutral' : 'warn'),
      chip('Rollups ' + snapshot.counts.rollups, snapshot.counts.rollups ? 'warn' : 'neutral'),
      chip('Drafts ' + snapshot.counts.drafts, snapshot.counts.drafts ? 'warn' : 'neutral'),
      chip('Accepted ' + snapshot.counts.accepted, snapshot.counts.accepted ? 'neutral' : 'warn'),
      chip('Controls ' + snapshot.counts.controls, snapshot.counts.controls ? 'warn' : 'neutral'),
      chip('Quarantine ' + snapshot.counts.quarantine, snapshot.counts.quarantine ? 'danger' : 'neutral')
    ];
    return '<div class="tm-mw-summary">' + chips.join('') + '</div>';
  }

  function renderWorkshop(GM, opts) {
    opts = opts || {};
    if (opts.playerSafe == null) opts.playerSafe = true;
    var snapshot = buildSnapshot(GM, opts);
    return '<div class="tm-mw-root">' +
      '<header class="tm-mw-title"><h2>Memory Workshop</h2><div>' + esc(snapshot.trace && snapshot.trace.traceId || 'trace unavailable') + '</div></header>' +
      renderSummary(snapshot) +
      renderPreInferenceContext(GM, opts) +
      renderCompiledContextTrace(GM, opts) +
      renderInjectionTrace(GM, opts) +
      renderRetrievalTrace(GM, opts) +
      renderWriteTrace(GM, opts) +
      renderDraftInbox(GM, opts) +
      renderQuarantine(GM, opts) +
      renderAcceptedMemory(GM, opts) +
      renderRollupReview(GM, opts) +
      renderMemoryControls(GM, opts) +
      renderAuditEvents(GM, opts) +
      renderEvidenceSources(GM, opts) +
      renderEnvelopeInventory(GM, opts) +
      '</div>';
  }

  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + PANEL_ID + '{position:fixed;right:24px;top:54px;width:min(1080px,calc(100vw - 48px));max-height:84vh;z-index:100020;display:none;flex-direction:column;background:#141821;color:#edf1f7;border:1px solid #465063;box-shadow:0 18px 50px rgba(0,0,0,.45);font:12px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '#' + PANEL_ID + '.open{display:flex;}',
      '#' + PANEL_ID + ' .tm-mw-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#1d2532;border-bottom:1px solid #3b4658;}',
      '#' + PANEL_ID + ' .tm-mw-bar h2{margin:0;font-size:14px;font-weight:700;letter-spacing:0;color:#f5d487;}',
      '#' + PANEL_ID + ' .tm-mw-actions{display:flex;gap:6px;}',
      '#' + PANEL_ID + ' button{background:#283345;color:#edf1f7;border:1px solid #536179;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;}',
      '#' + PANEL_ID + ' button:hover{background:#344157;}',
      '#' + PANEL_ID + ' .tm-mw-body{overflow:auto;padding:12px;}',
      '#' + PANEL_ID + ' .tm-mw-title{display:none;}',
      '#' + PANEL_ID + ' .tm-mw-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}',
      '#' + PANEL_ID + ' .tm-mw-chip{display:inline-flex;align-items:center;border:1px solid #4d5a6f;background:#222b3a;border-radius:4px;padding:2px 7px;color:#dfe7f1;}',
      '#' + PANEL_ID + ' .tm-mw-chip.warn{border-color:#a8873d;background:#3a301a;color:#ffe0a1;}',
      '#' + PANEL_ID + ' .tm-mw-chip.danger{border-color:#a94d4d;background:#3a1f24;color:#ffc9c9;}',
      '#' + PANEL_ID + ' .tm-mw-section{margin:0 0 14px 0;}',
      '#' + PANEL_ID + ' .tm-mw-section h3{margin:0 0 6px 0;font-size:13px;color:#f3d18b;letter-spacing:0;}',
      '#' + PANEL_ID + ' .tm-mw-table{width:100%;border-collapse:collapse;table-layout:fixed;}',
      '#' + PANEL_ID + ' .tm-mw-table th{background:#222b3a;color:#f5d487;border:1px solid #364155;text-align:left;padding:5px 6px;}',
      '#' + PANEL_ID + ' .tm-mw-table td{border:1px solid #2a3445;padding:5px 6px;vertical-align:top;word-break:break-word;}',
      '#' + PANEL_ID + ' .tm-mw-table tr:nth-child(even) td{background:#181f2b;}',
      '#' + PANEL_ID + ' .tm-mw-row-actions{display:flex;flex-wrap:wrap;gap:4px;}',
      '#' + PANEL_ID + ' .tm-mw-pre{white-space:pre-wrap;max-height:260px;overflow:auto;border:1px solid #2a3445;background:#0f141d;color:#cfd8e6;padding:8px;word-break:break-word;}',
      '#' + PANEL_ID + ' .tm-mw-empty{border:1px dashed #3f4a5e;color:#8f9cb1;padding:14px;text-align:center;}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensurePanel() {
    if (typeof document === 'undefined') return null;
    injectStyle();
    var panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML =
      '<div class="tm-mw-bar">' +
        '<h2>Memory Workshop</h2>' +
        '<div class="tm-mw-actions">' +
          '<button type="button" data-action="safe">Player Safe</button>' +
          '<button type="button" data-action="refresh">Refresh</button>' +
          '<button type="button" data-action="backfill-legacy">Backfill</button>' +
          '<button type="button" data-action="close">Close</button>' +
        '</div>' +
      '</div>' +
      '<div class="tm-mw-body"></div>';
    document.body.appendChild(panel);
    panel.addEventListener('click', function(ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('button[data-action]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var memoryId = btn.getAttribute('data-memory-id') || '';
      if (action === 'set-audit-filter') {
        state.auditFilter = clean(btn.getAttribute('data-audit-filter') || 'all', 40) || 'all';
        refresh();
      }
      else if (action === 'clear-audit-target') {
        state.auditTarget = '';
        refresh();
      }
      else if (action === 'set-audit-target' && memoryId) {
        state.auditTarget = memoryId;
        state.auditFilter = 'all';
        refresh();
      }
      else if (memoryId && (action === 'accept-draft' || action === 'reject-draft' || action === 'set-read-scope' ||
        action === 'pin-rollup' || action === 'resident-rollup' || action === 'hide-rollup' ||
        action === 'mark-false-rollup' || action === 'clear-rollup-control' || action === 'undo-memory-control' ||
        isMemoryControlAction(action))) {
        var guardedReason = confirmDangerousPanelAction(action, memoryId);
        if (guardedReason === null) return;
        var actionOpts = {
          reviewer: 'workshop',
          readScope: btn.getAttribute('data-read-scope') || '',
          cooldownTurns: Number(btn.getAttribute('data-cooldown-turns') || 0),
          cooldownUntilTurn: Number(btn.getAttribute('data-cooldown-until-turn') || 0)
        };
        if (guardedReason) actionOpts.reason = guardedReason;
        handleAction(getGM(), action, memoryId, actionOpts);
        refresh();
      }
      else if (action === 'backfill-legacy') {
        handleAction(getGM(), action, '', { reviewer: 'workshop', reason: 'workshop manual legacy backfill', force: true });
        refresh();
      }
      else if (action === 'close') close();
      else if (action === 'refresh') refresh();
      else if (action === 'safe') {
        state.playerSafe = !state.playerSafe;
        btn.textContent = state.playerSafe ? 'Player Safe' : 'System View';
        refresh();
      }
    });
    return panel;
  }

  function refresh(opts) {
    opts = opts || {};
    var panel = ensurePanel();
    if (!panel) return null;
    var body = panel.querySelector('.tm-mw-body');
    if (!body) return null;
    body.innerHTML = renderWorkshop(getGM(opts), {
      playerSafe: state.playerSafe,
      auditFilter: state.auditFilter,
      auditTarget: state.auditTarget
    });
    return panel;
  }

  function open(opts) {
    var panel = ensurePanel();
    if (!panel) return null;
    state.open = true;
    panel.classList.add('open');
    refresh(opts);
    return panel;
  }

  function close() {
    if (typeof document === 'undefined') return;
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.classList.remove('open');
    state.open = false;
  }

  function toggle(opts) {
    return state.open ? close() : open(opts);
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', function(ev) {
      if (ev.ctrlKey && ev.shiftKey && (ev.key === 'M' || ev.key === 'm')) {
        ev.preventDefault();
        toggle();
      }
    });
  }

  ns.buildSnapshot = buildSnapshot;
  ns.buildPreInferenceDiagnostic = buildPreInferenceDiagnostic;
  ns.renderPreInferenceContext = renderPreInferenceContext;
  ns.renderCompiledContextTrace = renderCompiledContextTrace;
  ns.renderInjectionTrace = renderInjectionTrace;
  ns.renderRetrievalTrace = renderRetrievalTrace;
  ns.renderWriteTrace = renderWriteTrace;
  ns.renderGovernanceLabel = renderGovernanceLabel;
  ns.renderDraftInbox = renderDraftInbox;
  ns.renderQuarantine = renderQuarantine;
  ns.renderAcceptedMemory = renderAcceptedMemory;
  ns.renderRollupReview = renderRollupReview;
  ns.renderMemoryControls = renderMemoryControls;
  ns.renderAuditEvents = renderAuditEvents;
  ns.renderEvidenceSources = renderEvidenceSources;
  ns.renderEnvelopeInventory = renderEnvelopeInventory;
  ns.renderWorkshop = renderWorkshop;
  ns.handleAction = handleAction;
  ns.open = open;
  ns.close = close;
  ns.toggle = toggle;
  ns.refresh = refresh;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
