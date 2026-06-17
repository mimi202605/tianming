// map-editor-layer-hotkey.js
// Phase 18.3·layer hotkey + on-canvas badge
// 1-5·切热图·6 关 (none)·badge 顶左·显当前 layer + 关 X
// pick 工具 active 时·1-5 由 pick.js 拦走
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[layer-hotkey] core not loaded'); return; }

  var LAYER_KEYS = [
    { key: '1', mode: 'pop',      label: '人口', color: '#dc4f3a' },
    { key: '2', mode: 'tax',      label: '税',   color: '#b65a30' },
    { key: '3', mode: 'culture',  label: '族群', color: '#3d4f6a' },
    { key: '4', mode: 'faith',    label: '信仰', color: '#a06030' },
    { key: '5', mode: 'autonomy', label: '自治', color: '#8a3a2e' }
  ];

  var _badge = null;

  // ─── set heat ──────────────────────────────────────────

  function setHeat(mode){
    ME.EDITOR.layers.heat = mode;
    var sel = document.getElementById('heat-select');
    if (sel) sel.value = mode;
    ME.requestRender();
    renderBadge();
  }

  function getCurrent(){
    return (ME.EDITOR.layers && ME.EDITOR.layers.heat) || 'none';
  }

  // ─── badge ─────────────────────────────────────────────

  function ensureBadge(){
    if (_badge) return _badge;
    _badge = document.createElement('div');
    _badge.id = 'me-layer-badge';
    _badge.style.cssText = [
      'position:absolute',
      'top:var(--sp-3)',
      'left:var(--sp-3)',
      'z-index:20',
      'display:none',
      'align-items:center',
      'gap:8px',
      'padding:5px 10px',
      'background:linear-gradient(180deg, var(--ink-3), var(--ink-2))',
      'border:1px solid var(--bd-1)',
      'border-radius:var(--rd-2)',
      'box-shadow:var(--sh-2)',
      'font-family:var(--font-serif)',
      'font-size:var(--fs-xs)',
      'color:var(--paper-1)',
      'backdrop-filter:blur(4px)',
      'cursor:pointer',
      'user-select:none'
    ].join(';');
    var stage = document.querySelector('.me-stage');
    if (stage) stage.appendChild(_badge); else document.body.appendChild(_badge);
    return _badge;
  }

  function renderBadge(){
    var b = ensureBadge();
    var mode = getCurrent();
    if (!mode || mode === 'none'){
      b.style.display = 'none';
      return;
    }
    var info = LAYER_KEYS.find(function(l){ return l.mode === mode; });
    if (!info){ b.style.display = 'none'; return; }
    b.style.display = 'flex';
    b.innerHTML =
      '<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:' + info.color + '; box-shadow:0 0 4px ' + info.color + ';"></span>' +
      '<span style="color:var(--gold-2); font-weight:var(--fw-sb); letter-spacing:0.1em;">' + info.label + '</span>' +
      '<span style="color:var(--paper-3); font-size:var(--fs-xxs);">·热图</span>' +
      '<span class="me-layer-badge-x" style="margin-left:8px; color:var(--paper-3); font-size:var(--fs-md); cursor:pointer; padding:0 4px;" title="关 (6 / 0)">×</span>';
    var x = b.querySelector('.me-layer-badge-x');
    if (x){
      x.addEventListener('click', function(e){
        e.stopPropagation();
        setHeat('none');
        if (global.meToast) meToast('热图·关', 'info', 1000);
      });
    }
    b.onclick = function(){
      // 跳到 drawer 的图层 pane
      var tab = document.querySelector('.me-dtab[data-pane="layer"]');
      if (tab) tab.click();
    };
  }

  // ─── 键盘 ──────────────────────────────────────────────

  function bindKeys(){
    document.addEventListener('keydown', function(e){
      // skip input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      // skip 修饰键 combo (Ctrl+1 = 浏览器 tab)
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      // skip 当 pick / brush 工具 active·让其拦
      var at = ME.EDITOR.activeTool;
      if (at === 'pick' || at === 'brush') return;
      // skip 当 raster 涂层工具 active·U/Y/D/F 等键
      if (at === 'paint-height' || at === 'paint-terrain') return;

      if (e.key === '6' || e.key === '0'){
        e.preventDefault();
        setHeat('none');
        if (global.meToast) meToast('热图·关', 'info', 1000);
        return;
      }
      var info = LAYER_KEYS.find(function(l){ return l.key === e.key; });
      if (info){
        e.preventDefault();
        setHeat(info.mode);
        if (global.meToast) meToast('热图·' + info.label, 'success', 1200);
      }
    });
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    ensureBadge();
    renderBadge();
    bindKeys();
    // 监 heat-select·user 在 drawer 里改也跟新
    var sel = document.getElementById('heat-select');
    if (sel){
      sel.addEventListener('change', function(){
        renderBadge();
      });
    }
    ME.on('map-loaded', renderBadge);
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.layerHotkey = {
    init: init,
    setHeat: setHeat,
    getCurrent: getCurrent,
    LAYER_KEYS: LAYER_KEYS
  };

})(typeof window !== 'undefined' ? window : this);
