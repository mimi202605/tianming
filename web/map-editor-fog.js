// map-editor-fog.js
// Phase 21.15·战争 fog 预览
//
// 编辑器内 sim·选 POV division·BFS·已知 / 模糊 / 未知 3 态·dim 显
// 已知·distance ≤ 1 的邻 (含本)
// 模糊·distance = 2
// 未知·distance ≥ 3·或不连通
//
// 切·Ctrl+Alt+F (Ctrl+Shift+F 让 find)
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[fog] core not loaded'); return; }

  var _enabled = false;
  var _povId = null;
  var _depthCache = null;     // { divId: depth }

  function buildDepth(){
    var divs = ME.EDITOR.map.divisions;
    if (!divs.length) return null;
    var pov = _povId
      ? divs.find(function(d){ return d.id === _povId; })
      : (ME.getSelected ? ME.getSelected()[0] : divs[0]);
    if (!pov){
      pov = divs[0];
    }
    _povId = pov.id;

    // BFS·按 neighbors
    var depth = {};
    depth[pov.id] = 0;
    var queue = [pov];
    var head = 0;
    while (head < queue.length){
      var d = queue[head++];
      var dh = depth[d.id];
      if (dh >= 4) continue;
      (d.neighbors || []).forEach(function(nid){
        if (depth[nid] != null) return;
        var nd = divs.find(function(D){ return D.id === nid; });
        if (!nd) return;
        depth[nid] = dh + 1;
        queue.push(nd);
      });
    }
    return depth;
  }

  function getState(divId){
    if (!_depthCache) return 'unknown';
    var d = _depthCache[divId];
    if (d == null) return 'unknown';
    if (d <= 1) return 'known';
    if (d <= 2) return 'partial';
    return 'unknown';
  }

  // ─── render·dim non-known divisions ────────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    if (!_depthCache) _depthCache = buildDepth();
    if (!_depthCache) return;
    var EDITOR = ME.EDITOR;
    var visible = EDITOR._visibleCache || [];
    if (!visible.length) return;

    visible.forEach(function(v){
      var d = v.base;
      var state = getState(d.id);
      var color;
      if (state === 'known') return;       // 不 dim
      if (state === 'partial') color = 'rgba(20,15,10,0.45)';
      else color = 'rgba(15,10,5,0.78)';

      var poly = v.allPolys[0];
      if (!poly || poly.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (var i = 1; i < poly.length; i++){
        ctx.lineTo(poly[i][0], poly[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // ─── set POV ──────────────────────────────────────────

  function setPOV(divId){
    _povId = divId;
    _depthCache = null;
    ME.requestRender();
  }

  function getPOV(){ return _povId; }

  // ─── toggle ────────────────────────────────────────────

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    if (_enabled){
      _depthCache = null;
      // 选最新选中省作 POV
      var sel = ME.getSelected ? ME.getSelected() : [];
      if (sel.length) _povId = sel[0].id;
    }
    try { localStorage.setItem('me.fog', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast){
      var pov = _povId ? (ME.EDITOR.map.divisions.find(function(d){ return d.id === _povId; }) || {}).name : null;
      meToast('fog 预览·' + (_enabled ? ('开 POV·' + (pov || '?')) : '关'), 'info', 1800);
    }
  }

  function isEnabled(){ return _enabled; }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      var v = localStorage.getItem('me.fog');
      if (v === '1') _enabled = true;
    } catch(e){}
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.ctrlKey && e.altKey && (e.key === 'f' || e.key === 'F')){
        e.preventDefault();
        toggle();
      }
    });
    // 选变·若 fog on·设新 POV
    ME.on('selection-change', function(){
      if (!_enabled) return;
      var sel = ME.getSelected ? ME.getSelected() : [];
      if (sel.length === 1){
        setPOV(sel[0].id);
      }
    });
    ME.on('mutation', function(){ _depthCache = null; });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.fog = {
    init: init,
    render: render,
    setPOV: setPOV,
    getPOV: getPOV,
    getState: getState,
    toggle: toggle,
    isEnabled: isEnabled
  };

})(typeof window !== 'undefined' ? window : this);
