// @ts-check
// End-turn timing ledger.
(function(root) {
  if (!root) return;
  root.TM = root.TM || {};
  root.TM.Endturn = root.TM.Endturn || {};

  function _now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  function _wallNow() {
    return Date.now();
  }

  function _turn() {
    try { return (typeof GM !== 'undefined' && GM && GM.turn) ? GM.turn : 0; } catch(_) { return 0; }
  }

  function _fmtMs(ms) {
    ms = Math.max(0, Number(ms) || 0);
    if (ms >= 60000) return (ms / 60000).toFixed(ms >= 600000 ? 1 : 2) + 'm';
    if (ms >= 1000) return (ms / 1000).toFixed(ms >= 10000 ? 1 : 2) + 's';
    return Math.round(ms) + 'ms';
  }

  function _labelOf(entry) {
    if (!entry) return '';
    return entry.label || entry.step || entry.id || entry.kind || '';
  }

  function _slowLevel(ms) {
    ms = Number(ms) || 0;
    if (ms >= 180000) return 'critical';
    if (ms >= 60000) return 'high';
    if (ms >= 15000) return 'medium';
    return 'normal';
  }

  function _ensureHistory(ledger) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      if (!Array.isArray(GM._endturnTimingHistory)) GM._endturnTimingHistory = [];
      var hist = GM._endturnTimingHistory;
      if (ledger && hist.indexOf(ledger) < 0) {
        hist.push(ledger);
        if (hist.length > 20) hist.splice(0, hist.length - 20);
      }
    } catch(_) {}
  }

  function _getLedger(ctx) {
    if (ctx && ctx.meta && ctx.meta.timingLedger) return ctx.meta.timingLedger;
    try {
      if (typeof GM !== 'undefined' && GM && GM._endturnTimingLedger) return GM._endturnTimingLedger;
    } catch(_) {}
    return null;
  }

  function startLedger(ctx, meta) {
    var t = _now();
    var ledger = {
      turn: _turn(),
      startedAt: _wallNow(),
      startMs: t,
      status: 'running',
      totalMs: 0,
      entries: [],
      steps: [],
      subcalls: [],
      systems: [],
      background: [],
      queue: [],
      current: null,
      summary: null,
      meta: meta || {}
    };
    if (ctx) {
      ctx.meta = ctx.meta || {};
      ctx.meta.timingLedger = ledger;
    }
    try { if (typeof GM !== 'undefined' && GM) GM._endturnTimingLedger = ledger; } catch(_) {}
    _ensureHistory(ledger);
    return ledger;
  }

  function mark(ctx, kind, data) {
    var ledger = _getLedger(ctx);
    if (!ledger) ledger = startLedger(ctx || null, { autoStarted: true });
    ledger.entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    ledger.steps = Array.isArray(ledger.steps) ? ledger.steps : [];
    ledger.subcalls = Array.isArray(ledger.subcalls) ? ledger.subcalls : [];
    ledger.systems = Array.isArray(ledger.systems) ? ledger.systems : [];
    ledger.background = Array.isArray(ledger.background) ? ledger.background : [];
    ledger.queue = Array.isArray(ledger.queue) ? ledger.queue : [];
    var entry = Object.assign({
      kind: kind || 'mark',
      turn: _turn(),
      at: _wallNow(),
      sinceStartMs: Math.max(0, _now() - (ledger.startMs || _now()))
    }, data || {});
    ledger.entries.push(entry);
    if (entry.kind === 'step_start') ledger.current = entry;
    if (entry.kind === 'step') ledger.steps.push(entry);
    else if (entry.kind === 'subcall') ledger.subcalls.push(entry);
    else if (entry.kind === 'systems_stage') ledger.systems.push(entry);
    else if (entry.kind === 'background') ledger.background.push(entry);
    else if (entry.kind === 'queue') ledger.queue.push(entry);
    return entry;
  }

  async function wrap(ctx, kind, label, fn, data) {
    var t0 = _now();
    try {
      var result = await fn();
      mark(ctx, kind, Object.assign({ label: label, ok: true, ms: _now() - t0 }, data || {}));
      return result;
    } catch(e) {
      mark(ctx, kind, Object.assign({
        label: label,
        ok: false,
        ms: _now() - t0,
        error: String(e && (e.message || e) || '')
      }, data || {}));
      throw e;
    }
  }

  function buildSummary(ledger) {
    ledger = ledger || _getLedger(null);
    if (!ledger) return null;
    var entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    var timed = entries.filter(function(e) {
      return e && typeof e.ms === 'number' && isFinite(e.ms) && e.ms >= 0
        && e.kind !== 'step_start';
    }).map(function(e) {
      return {
        kind: e.kind || '',
        id: e.id || e.step || '',
        label: _labelOf(e),
        ok: e.ok !== false,
        ms: Math.max(0, e.ms || 0),
        text: _fmtMs(e.ms || 0),
        level: _slowLevel(e.ms || 0),
        error: e.error || '',
        status: e.status || '',
        attempts: e.attempts || undefined,
        phase: e.phase || ''
      };
    });
    timed.sort(function(a, b) { return b.ms - a.ms; });
    var failed = timed.filter(function(e) { return e.ok === false || e.error; }).slice(0, 12);
    var slow = timed.filter(function(e) { return e.ms >= 15000; }).slice(0, 12);
    var steps = Array.isArray(ledger.steps) ? ledger.steps : [];
    var systems = Array.isArray(ledger.systems) ? ledger.systems : [];
    var subcalls = Array.isArray(ledger.subcalls) ? ledger.subcalls : [];
    var background = Array.isArray(ledger.background) ? ledger.background : [];
    var totalMs = Math.max(0, Number(ledger.totalMs) || (_now() - (ledger.startMs || _now())));
    var current = ledger.current ? {
      kind: ledger.current.kind || '',
      step: ledger.current.step || '',
      label: _labelOf(ledger.current),
      sinceStartMs: Math.max(0, Number(ledger.current.sinceStartMs) || 0),
      at: ledger.current.at || 0
    } : null;
    return {
      turn: ledger.turn || _turn(),
      status: ledger.status || 'running',
      startedAt: ledger.startedAt || 0,
      finishedAt: ledger.finishedAt || 0,
      totalMs: totalMs,
      totalText: _fmtMs(totalMs),
      current: current,
      slowest: timed[0] || null,
      slow: slow,
      top: timed.slice(0, 10),
      failed: failed,
      counts: {
        entries: entries.length,
        steps: steps.length,
        subcalls: subcalls.length,
        systems: systems.length,
        background: background.length,
        queue: Array.isArray(ledger.queue) ? ledger.queue.length : 0
      },
      systems: systems.slice().sort(function(a, b) { return (b.ms || 0) - (a.ms || 0); }).slice(0, 12),
      subcalls: subcalls.slice().sort(function(a, b) { return (b.ms || 0) - (a.ms || 0); }).slice(0, 12),
      generatedAt: Date.now()
    };
  }

  function _publishSummary(ledger) {
    var summary = buildSummary(ledger);
    if (!summary) return null;
    ledger.summary = summary;
    try {
      if (typeof GM !== 'undefined' && GM) GM._lastEndturnTimingSummary = summary;
    } catch(_) {}
    try {
      if (typeof ensureAIDiagnostics === 'function') {
        var d = ensureAIDiagnostics(summary.turn);
        if (d) d.timing = summary;
      }
    } catch(_) {}
    try {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[EndturnTiming] total=' + summary.totalText + ' status=' + summary.status, summary);
        if (console.table && summary.top && summary.top.length) {
          console.table(summary.top.map(function(x) {
            return { kind: x.kind, id: x.id, label: x.label, ms: Math.round(x.ms), ok: x.ok, level: x.level };
          }));
        }
      }
    } catch(_) {}
    try {
      var slowest = summary.slowest;
      if (slowest && slowest.ms >= 60000 && typeof toast === 'function') {
        toast('过回合耗时 ' + summary.totalText + '；最慢：' + slowest.label + ' ' + slowest.text);
      }
    } catch(_) {}
    return summary;
  }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
  }

  function renderSummaryHtml(summary) {
    summary = summary || buildSummary();
    if (!summary) return '<div style="color:#888">暂无回合耗时记录。</div>';
    function row(x) {
      var color = x.level === 'critical' ? '#ff7777' : (x.level === 'high' ? '#f0a060' : (x.level === 'medium' ? '#e8c66e' : '#bbb'));
      return '<tr>'
        + '<td style="padding:3px 6px;color:#888">' + _esc(x.kind || '') + '</td>'
        + '<td style="padding:3px 6px;color:#e8c66e">' + _esc(x.label || x.id || '') + '</td>'
        + '<td style="padding:3px 6px;text-align:right;color:' + color + '">' + _esc(x.text || _fmtMs(x.ms)) + '</td>'
        + '<td style="padding:3px 6px;color:' + (x.ok ? '#9ac870' : '#d66') + '">' + (x.ok ? 'ok' : 'fail') + '</td>'
        + '</tr>';
    }
    var html = '<div style="line-height:1.7;color:#ddd;">'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px;">'
      + '<b style="color:#e8c66e">T' + _esc(summary.turn) + '</b>'
      + '<span>状态：' + _esc(summary.status) + '</span>'
      + '<span>总耗时：<b style="color:#e8c66e">' + _esc(summary.totalText) + '</b></span>'
      + '<span>step ' + summary.counts.steps + ' / subcall ' + summary.counts.subcalls + ' / systems ' + summary.counts.systems + '</span>'
      + '</div>';
    if (summary.current && summary.status === 'running') {
      html += '<div style="border:1px solid #5a3a1a;padding:8px;margin-bottom:10px;color:#e8c66e;">当前阶段：'
        + _esc(summary.current.label || summary.current.step || '') + '</div>';
    }
    html += '<div style="font-size:12px;color:#aaa;margin-bottom:4px;">最慢阶段</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
      + '<tr style="color:#888"><th style="text-align:left;padding:3px 6px">类型</th><th style="text-align:left;padding:3px 6px">名称</th><th style="text-align:right;padding:3px 6px">耗时</th><th style="text-align:left;padding:3px 6px">状态</th></tr>'
      + (summary.top || []).map(row).join('')
      + '</table>';
    if (summary.failed && summary.failed.length) {
      html += '<div style="font-size:12px;color:#d66;margin-top:10px;">失败项</div>'
        + '<pre style="white-space:pre-wrap;max-height:140px;overflow:auto;background:rgba(0,0,0,0.25);padding:8px;border:1px solid rgba(200,80,80,0.35);">'
        + _esc(JSON.stringify(summary.failed, null, 2)) + '</pre>';
    }
    html += '</div>';
    return html;
  }

  function openDiagnostics() {
    var summary = buildSummary();
    if (typeof openGenericModal === 'function') {
      openGenericModal('回合耗时诊断', renderSummaryHtml(summary));
    } else {
      try { console.log('[EndturnTimingDiagnostics]', summary); } catch(_) {}
      try { if (typeof toast === 'function') toast('回合耗时诊断已输出到控制台'); } catch(_) {}
    }
    return summary;
  }

  function finishLedger(ctx, status, extra) {
    var ledger = _getLedger(ctx);
    if (!ledger) return null;
    ledger.status = status || 'done';
    ledger.finishedAt = _wallNow();
    ledger.totalMs = Math.max(0, _now() - (ledger.startMs || _now()));
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function(k) { ledger[k] = extra[k]; });
    }
    _publishSummary(ledger);
    _ensureHistory(ledger);
    return ledger;
  }

  root.TM.Endturn.Timing = {
    startLedger: startLedger,
    mark: mark,
    wrap: wrap,
    finishLedger: finishLedger,
    getLedger: _getLedger,
    buildSummary: buildSummary,
    renderSummaryHtml: renderSummaryHtml,
    openDiagnostics: openDiagnostics,
    formatMs: _fmtMs
  };
  root.openEndturnTimingDiagnostics = openDiagnostics;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
