// map-editor-mode-banner.js
// Phase 17.3·mode banner·当前 special mode 浮顶
// 顶居中·thin bar·显·所有 active 非默 mode·color chip
// 防 user 不知"为什么 click 没用·原来在 brush mode"
//
// 监 mode·topology / cross-time / lasso / brush / diff
// 250ms poll·变 → 重渲
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[mode-banner] core not loaded'); return; }

  var _bar = null;
  var _lastSig = '';

  // ─── mode 描·按 priority ──────────────────────────────

  function getActiveModes(){
    var EDITOR = ME.EDITOR;
    var modes = [];

    // topology
    if (TM.MapEditor.topology && TM.MapEditor.topology.isEnabled && TM.MapEditor.topology.isEnabled()){
      modes.push({
        id: 'topology',
        label: '拓扑',
        hint: '共享顶点·改一边动两',
        color: '#6a8a3a',  // 翠
        bgColor: 'rgba(106,138,58,0.15)',
        exitHint: 'T 退'
      });
    }

    // cross-time
    if (TM.MapEditor.crossTime && TM.MapEditor.crossTime.isActive && TM.MapEditor.crossTime.isActive()){
      modes.push({
        id: 'cross-time',
        label: '跨年',
        hint: '编辑会写入快照·当心年代',
        color: '#3d4f6a',  // 青
        bgColor: 'rgba(61,79,106,0.18)',
        exitHint: '关·跨年面板'
      });
    }

    // diff (.me-diff-bar visible)
    var dbar = document.querySelector('.me-diff-bar');
    if (dbar && dbar.offsetHeight > 0 && getComputedStyle(dbar).display !== 'none'){
      modes.push({
        id: 'diff',
        label: '对比',
        hint: '只查·禁改',
        color: '#8a3a2e',  // 朱
        bgColor: 'rgba(138,58,46,0.15)',
        exitHint: 'Esc 退'
      });
    }

    // brush
    if (EDITOR.activeTool === 'brush' && TM.MapEditor.brush && TM.MapEditor.brush.isActive && TM.MapEditor.brush.isActive()){
      modes.push({
        id: 'brush',
        label: '笔刷',
        hint: '拖动 → 笔抹涂',
        color: '#b65a30',  // 橙朱
        bgColor: 'rgba(182,90,48,0.15)',
        exitHint: '换工具退'
      });
    }

    // lasso
    if (EDITOR._lassoMode){
      modes.push({
        id: 'lasso',
        label: '套索',
        hint: '画 polygon 选',
        color: '#c5a04d',  // gold-2
        bgColor: 'rgba(197,160,77,0.15)',
        exitHint: '松 L 退'
      });
    }

    // paint-height / paint-terrain
    if (EDITOR.activeTool === 'paint-height' || EDITOR.activeTool === 'paint-terrain'){
      modes.push({
        id: 'paint-raster',
        label: EDITOR.activeTool === 'paint-height' ? '高·涂' : '貌·涂',
        hint: 'raster 涂层·非 polygon',
        color: '#7a6a3a',
        bgColor: 'rgba(122,106,58,0.15)',
        exitHint: '换工具退'
      });
    }

    return modes;
  }

  // ─── 渲染 ──────────────────────────────────────────────

  function ensureBar(){
    if (_bar) return _bar;
    _bar = document.createElement('div');
    _bar.id = 'me-mode-banner';
    _bar.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:74px',  // 让出 titlebar (40) + diff-bar 余地
      'transform:translateX(-50%)',
      'z-index:600',
      'pointer-events:none',
      'display:flex',
      'gap:6px',
      'flex-wrap:wrap',
      'justify-content:center',
      'max-width:90vw'
    ].join(';');
    document.body.appendChild(_bar);
    return _bar;
  }

  function render(){
    var modes = getActiveModes();
    var sig = modes.map(function(m){ return m.id; }).join('|');
    if (sig === _lastSig) return;
    _lastSig = sig;

    var bar = ensureBar();
    if (!modes.length){
      bar.innerHTML = '';
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';

    bar.innerHTML = modes.map(function(m){
      return '<div style="' +
        'pointer-events:auto;' +
        'display:flex; align-items:center; gap:8px;' +
        'padding:4px 12px;' +
        'background:' + m.bgColor + ';' +
        'border:1px solid ' + m.color + ';' +
        'border-radius:var(--rd-3);' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.3), 0 0 12px ' + m.bgColor + ';' +
        'font-family:var(--font-serif);' +
        'font-size:var(--fs-xs);' +
        'color:var(--paper-1);' +
        'backdrop-filter:blur(4px);' +
      '">' +
        '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + m.color + '; box-shadow:0 0 6px ' + m.color + '; animation:me-pulse 1.6s ease-in-out infinite;"></span>' +
        '<span style="color:' + m.color + '; font-weight:var(--fw-sb); letter-spacing:0.1em;">' + escHtml(m.label) + '</span>' +
        '<span style="color:var(--paper-3); font-size:var(--fs-xxs);">' + escHtml(m.hint) + '</span>' +
        '<span style="color:var(--paper-4); font-size:var(--fs-xxs); opacity:0.6;">·' + escHtml(m.exitHint) + '</span>' +
      '</div>';
    }).join('');
  }

  // ─── pulse animation ───────────────────────────────────

  function ensureKeyframes(){
    if (document.getElementById('me-mode-banner-css')) return;
    var s = document.createElement('style');
    s.id = 'me-mode-banner-css';
    s.textContent = '@keyframes me-pulse{ 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:0.5; transform:scale(0.8); } }';
    document.head.appendChild(s);
  }

  // ─── helpers ───────────────────────────────────────────

  function escHtml(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    ensureKeyframes();
    ensureBar();
    setInterval(render, 250);
    // 也·tool-change·立即 render
    ME.on('tool-change', function(){ _lastSig = ''; render(); });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.modeBanner = {
    init: init,
    render: render,
    getActiveModes: getActiveModes
  };

})(typeof window !== 'undefined' ? window : this);
