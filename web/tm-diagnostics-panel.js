// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-diagnostics-panel.js — 统一诊断仪表板（Ctrl+Shift+D）
 *
 * 目的：把散落在 TM.errors/perf/state/invariants/hooks/guard 的
 *      状态汇总到一个浮层，一屏看全。
 *
 * 快捷键：Ctrl+Shift+D（与 errors 的 E、perf 的 P 并列）
 * 也可：TM.diag.open() / TM.diag.toggle()
 *
 * 面板结构：
 *   ┌─ 顶部：当前回合 / 剧本 / 不变量状态 / 错误总数
 *   ├─ 左栏：Perf 采样 + 阈值告警统计
 *   ├─ 中栏：State 快照列表 + Hooks 列表
 *   └─ 右栏：Errors 摘要 + Guard 污染数
 *
 * 刷新：手动按钮 / 自动每 3s（可关）
 * ============================================================ */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};
  if (window.TM.diag) return;

  var panelId = 'tm-diag-panel';
  var isOpen = false;
  var autoRefreshTimer = null;

  // R143·委托给 tm-utils.js:569 的 escHtml
  function _esc(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }

  function _fmt(n, d) {
    if (typeof n !== 'number') return '—';
    d = d || 0;
    return n.toFixed(d);
  }

  function _section(title, color, inner) {
    return '<div style="border:1px solid ' + color + ';border-radius:4px;padding:8px;margin-bottom:8px;background:rgba(' + _hexToRgba(color, 0.05) + ');">'
      + '<div style="font-size:12px;font-weight:bold;color:' + color + ';margin-bottom:6px">' + title + '</div>'
      + inner
      + '</div>';
  }

  function _hexToRgba(hex, alpha) {
    // 给 CSS rgba() 用
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.slice(0,2), 16);
    var g = parseInt(h.slice(2,4), 16);
    var b = parseInt(h.slice(4,6), 16);
    return r + ',' + g + ',' + b;
  }

  function renderPanel() {
    var el = document.getElementById(panelId);
    if (!el) return;

    // ─── 顶部摘要 ───
    var turn = (typeof GM !== 'undefined' && GM.turn) || 0;
    var scenarioName = '';
    try { if (window.DA && DA.scenario) scenarioName = DA.scenario.name(); } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-diagnostics-panel');}catch(_){}}
    var running = (typeof GM !== 'undefined' && GM.running);

    var invariantsBadge = '<span style="color:#888">未检查</span>';
    try {
      if (TM.invariants) {
        var r = TM.invariants.check();
        invariantsBadge = r.ok
          ? '<span style="color:#7a7">✓ 10 groups 通过</span>'
          : '<span style="color:#c66">✗ ' + r.violations.length + ' 违规</span>';
      }
    } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-diagnostics-panel');}catch(_){}}

    var errorCount = (TM.errors && TM.errors.getLog && TM.errors.getLog().length) || 0;

    var top = '<div style="display:flex;gap:12px;padding:8px 12px;background:#1a1410;border-bottom:1px solid #3a2a10;font-size:12px">'
      + '<div><b style="color:#e8c66e">T' + turn + '</b>'
      + (scenarioName ? ' · <span style="color:#9ac870">' + _esc(scenarioName) + '</span>' : '')
      + (running ? ' · <span style="color:#7a7">●运行中</span>' : ' · <span style="color:#888">○未开局</span>') + '</div>'
      + '<div style="margin-left:auto">invariants: ' + invariantsBadge + '</div>'
      + '<div>errors: <b style="color:' + (errorCount > 0 ? '#c66' : '#7a7') + '">' + errorCount + '</b></div>'
      + '</div>';

    // ─── Perf 栏 ───
    var perfHtml = '<div style="color:#888;font-size:12px">TM.perf 未加载</div>';
    try {
      if (TM.perf) {
        var pr = TM.perf.report();
        var names = Object.keys(pr).sort(function(a,b){ return pr[b].p95 - pr[a].p95; }).slice(0, 10);
        if (names.length === 0) {
          perfHtml = '<div style="color:#888;font-size:12px">尚无采样（玩 1 回合后再查看）</div>';
        } else {
          perfHtml = '<table style="width:100%;font-size:12px;border-collapse:collapse">'
            + '<tr style="color:#9ac870"><th style="text-align:left;padding:2px 4px">sample</th><th style="text-align:right">cnt</th><th style="text-align:right">p95</th></tr>'
            + names.map(function(n){
              var s = pr[n];
              return '<tr><td style="padding:2px 4px;color:#e8c66e">' + _esc(n) + '</td>'
                + '<td style="text-align:right">' + s.count + '</td>'
                + '<td style="text-align:right;color:#d99">' + _fmt(s.p95, 1) + '</td></tr>';
            }).join('')
            + '</table>';
          // 阈值
          var ths = TM.perf.getThresholds ? TM.perf.getThresholds() : {};
          var thNames = Object.keys(ths);
          if (thNames.length > 0) {
            perfHtml += '<div style="font-size:11px;color:#888;margin-top:6px">阈值: ' + thNames.map(function(n){
              var t = ths[n];
              return _esc(n) + '@' + t.ms + 'ms' + (t.triggeredCount ? '(×' + t.triggeredCount + ')' : '');
            }).join(' / ') + '</div>';
          }
          // baseline
          if (TM.perf.getBaseline && TM.perf.getBaseline()) {
            var b = TM.perf.getBaseline();
            perfHtml += '<div style="font-size:11px;color:#7a7;margin-top:4px">baseline: T' + b.turn + ' ' + b.when.slice(11, 19) + '</div>';
          }
        }
      }
    } catch(e){ perfHtml = '<div style="color:#c66">perf 渲染异常</div>'; }

    // ─── State 栏 ───
    var stateHtml = '<div style="color:#888;font-size:12px">TM.state 未加载</div>';
    try {
      if (TM.state) {
        var snaps = TM.state.list();
        if (snaps.length === 0) {
          stateHtml = '<div style="color:#888;font-size:12px">无快照</div>'
            + '<button onclick="TM.state.snapshot(\'manual-\'+Date.now());TM.diag._render()" style="font-size:11px;padding:2px 6px;background:#2a1a1a;color:#e8c66e;border:1px solid #5a3a1a;cursor:pointer;margin-top:4px">立即快照</button>';
        } else {
          stateHtml = snaps.slice(-8).reverse().map(function(s){
            return '<div style="font-size:12px;border-bottom:1px solid #2a2a2a;padding:3px 0">'
              + '<span style="color:#e8c66e">' + _esc(s.name) + '</span>'
              + ' <span style="color:#888">T' + s.turn + '</span>'
              + '</div>';
          }).join('');
        }
      }
    } catch(e){ stateHtml = '<div style="color:#c66">state 渲染异常</div>'; }

    // ─── Hooks 栏 ───
    var hooksHtml = '<div style="color:#888;font-size:12px">TM.hooks 未加载</div>';
    try {
      if (TM.hooks) {
        var hl = TM.hooks.list();
        if (hl.length === 0) {
          hooksHtml = '<div style="color:#888;font-size:12px">未拦截到 hook（游戏可能未开局）</div>';
        } else {
          hooksHtml = '<div style="font-size:12px">共 ' + hl.length + ' 个 event / '
            + hl.reduce(function(s,x){return s+x.handlerCount;}, 0) + ' handler</div>'
            + hl.slice(0, 8).map(function(h){
              return '<div style="font-size:11px;color:#bbb;padding:1px 0">'
                + _esc(h.event) + ' <span style="color:#d99">×' + h.handlerCount + '</span>'
                + '</div>';
            }).join('');
        }
      }
    } catch(e){ hooksHtml = '<div style="color:#c66">hooks 渲染异常</div>'; }

    // ─── Errors 栏 ───
    var errorsHtml = '<div style="color:#888;font-size:12px">TM.errors 未加载</div>';
    try {
      if (TM.errors) {
        var sum = TM.errors.getSummary();
        var modNames = Object.keys(sum);
        if (modNames.length === 0) {
          errorsHtml = '<div style="color:#7a7;font-size:12px">✓ 无错误</div>';
        } else {
          errorsHtml = modNames.sort(function(a,b){ return sum[b].count - sum[a].count; }).slice(0, 8).map(function(m){
            return '<div style="font-size:12px;border-bottom:1px solid #2a2a2a;padding:3px 0">'
              + '<span style="color:#d99">' + _esc(m) + '</span>'
              + ' <span style="color:#c66">×' + sum[m].count + '</span>'
              + '</div>';
          }).join('');
        }
      }
    } catch(e){ errorsHtml = '<div style="color:#c66">errors 渲染异常</div>'; }

    // ─── Guard 栏 ───
    var guardHtml = '<div style="color:#888;font-size:12px">TM.guard 未加载</div>';
    try {
      if (TM.guard) {
        var gr = TM.guard.report();
        guardHtml = '<div style="font-size:12px">'
          + 'window 可追踪: <b style="color:#e8c66e">' + gr.total + '</b><br>'
          + '累计新增: ' + gr.addCount + '<br>'
          + '覆盖警告: <b style="color:' + (gr.overrideCount > 0 ? '#c66' : '#7a7') + '">' + gr.overrideCount + '</b>'
          + '</div>';
      }
    } catch(e){ guardHtml = '<div style="color:#c66">guard 渲染异常</div>'; }

    // ─── 整体布局 ───
    var timingHtml = '<div style="color:#888;font-size:12px">暂无回合耗时记录</div>';
    try {
      var timingSummary = null;
      if (TM.Endturn && TM.Endturn.Timing && typeof TM.Endturn.Timing.buildSummary === 'function') {
        timingSummary = TM.Endturn.Timing.buildSummary();
      } else if (typeof GM !== 'undefined' && GM && GM._lastEndturnTimingSummary) {
        timingSummary = GM._lastEndturnTimingSummary;
      }
      if (timingSummary) {
        var slowest = timingSummary.slowest || {};
        var topRows = (timingSummary.top || []).slice(0, 5).map(function(x){
          var color = x.level === 'critical' ? '#ff7777' : (x.level === 'high' ? '#f0a060' : (x.level === 'medium' ? '#e8c66e' : '#bbb'));
          return '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;font-size:12px;border-bottom:1px solid #2a2a2a;padding:2px 0;">'
            + '<span style="color:#ddd">' + _esc(x.label || x.id || x.kind || '') + '</span>'
            + '<span style="color:' + color + '">' + _esc(x.text || '') + '</span>'
            + '</div>';
        }).join('');
        timingHtml = '<div style="font-size:12px;line-height:1.7;">'
          + '<div>总耗时：<b style="color:#e8c66e">' + _esc(timingSummary.totalText || '') + '</b>'
          + ' <span style="color:#888">T' + _esc(timingSummary.turn || 0) + ' · ' + _esc(timingSummary.status || '') + '</span></div>'
          + (slowest.label ? '<div>最慢：<span style="color:#d99">' + _esc(slowest.label) + '</span> <b style="color:#e8c66e">' + _esc(slowest.text || '') + '</b></div>' : '')
          + '<div style="margin-top:4px;">' + topRows + '</div>'
          + '<button onclick="TM.Endturn&&TM.Endturn.Timing&&TM.Endturn.Timing.openDiagnostics&&TM.Endturn.Timing.openDiagnostics()" style="font-size:11px;padding:4px 8px;margin-top:6px;background:#2a1a1a;color:#e8c66e;border:1px solid #5a3a1a;cursor:pointer">打开耗时明细</button>'
          + '</div>';
      }
    } catch(e){ timingHtml = '<div style="color:#c66">endturn timing 渲染异常</div>'; }

    var autoOn = !!autoRefreshTimer;
    el.innerHTML = top
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px;overflow:auto;height:calc(100% - 80px)">'
      + '<div>'
      +   _section('⏱ Perf (Ctrl+Shift+P 详情)', '#d99', perfHtml)
      +   _section('回合耗时', '#e8c66e', timingHtml)
      +   _section('🛡 Guard', '#9cd', guardHtml)
      + '</div>'
      + '<div>'
      +   _section('📸 State 快照', '#7a7', stateHtml)
      +   _section('🪝 Hooks', '#a5f', hooksHtml)
      + '</div>'
      + '<div>'
      +   _section('🐛 Errors (Ctrl+Shift+E 详情)', '#c66', errorsHtml)
      +   _section('📋 快速操作', '#e8c66e',
          '<button onclick="TM.invariants.check();TM.diag._render()" style="font-size:11px;padding:4px 8px;margin:2px;background:#1a2a1a;color:#9c9;border:1px solid #3a5a3a;cursor:pointer">查 invariants</button>'
        + '<button onclick="TM.state.snapshot(\'snap-\'+Date.now());TM.diag._render()" style="font-size:11px;padding:4px 8px;margin:2px;background:#2a2a1a;color:#e8c66e;border:1px solid #5a5a3a;cursor:pointer">快照</button>'
        + '<button onclick="TM.perf.lockBaseline();TM.diag._render()" style="font-size:11px;padding:4px 8px;margin:2px;background:#1a1a2a;color:#9cd;border:1px solid #3a3a5a;cursor:pointer">锁 perf</button>'
        + '<button onclick="TM.perf.print()" style="font-size:11px;padding:4px 8px;margin:2px;background:#2a1a2a;color:#d9c;border:1px solid #5a3a5a;cursor:pointer">perf 表</button>'
        + '<button onclick="TM.test.run()" style="font-size:11px;padding:4px 8px;margin:2px;background:#2a2a1a;color:#dc9;border:1px solid #5a5a3a;cursor:pointer">跑测试</button>'
        )
      + '</div>'
      + '</div>'
      + '<div style="padding:6px 12px;border-top:1px solid #3a2a10;background:#1a1410;font-size:11px;display:flex;align-items:center">'
      +   '<span style="color:#888">Ctrl+Shift+D 关闭 · E→errors · P→perf</span>'
      +   '<div style="margin-left:auto;display:flex;gap:6px">'
      +     '<label style="color:#888"><input type="checkbox" ' + (autoOn ? 'checked' : '') + ' onchange="TM.diag.setAutoRefresh(this.checked)"> 3s 自动刷新</label>'
      +     '<button onclick="TM.diag._render()" style="font-size:11px;padding:2px 8px;background:#1a2a1a;color:#9c9;border:1px solid #3a5a3a;cursor:pointer">刷新</button>'
      +     '<button onclick="TM.diag.close()" style="font-size:11px;padding:2px 8px;background:#2a2a2a;color:#ccc;border:1px solid #4a4a4a;cursor:pointer">关闭</button>'
      +   '</div>'
      + '</div>';
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    var el = document.createElement('div');
    el.id = panelId;
    el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:900px;max-width:94vw;height:560px;max-height:86vh;overflow:hidden;'
      + 'background:#0f0c08;border:1px solid #5a3a1a;border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,0.8);'
      + 'z-index:99992;color:#ddd;font-family:sans-serif';
    document.body.appendChild(el);
    renderPanel();
  }

  function close() {
    var el = document.getElementById(panelId);
    if (el) el.remove();
    isOpen = false;
    setAutoRefresh(false);
  }

  function toggle() { isOpen ? close() : open(); }

  function setAutoRefresh(on) {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
    if (on && isOpen) autoRefreshTimer = setInterval(renderPanel, 3000);
  }

  function installHotkey() {
    if (window._tmDiagHotkey) return;
    window._tmDiagHotkey = true;
    document.addEventListener('keydown', function(e){
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        toggle();
      }
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installHotkey);
    else installHotkey();
  }

  TM.diag = {
    open: open,
    close: close,
    toggle: toggle,
    setAutoRefresh: setAutoRefresh,
    _render: renderPanel
  };
})();
