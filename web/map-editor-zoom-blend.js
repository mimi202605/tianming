// map-editor-zoom-blend.js
// Phase 22.6·zoom-blend·terrain ↔ political 平滑过渡
//
// CK3 风·拉近 → 显地形纹理·拉远 → 显 realm 色
// 不直接画·暴露 factor(zoom)·terrain-textures / mountain-relief / forest-trees 调
// 同时·拉远·realm 色饱和 (boost saturation)·拉近·realm 色淡 (alpha 减)
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[zoom-blend] core not loaded'); return; }

  var _enabled = true;
  // 阈·z < lo → 全 political; z > hi → 全 terrain
  var LO = 0.45;
  var HI = 1.10;

  function smoothstep(t){
    if (t < 0) return 0;
    if (t > 1) return 1;
    return t * t * (3 - 2 * t);
  }

  // terrain 可见度·z 大 → 1·z 小 → 0
  function terrainFactor(zoom){
    if (!_enabled) return 1;   // 关·全 terrain·向后兼容
    return smoothstep((zoom - LO) / (HI - LO));
  }

  // realm 可见度·terrain 反之
  function realmFactor(zoom){
    if (!_enabled) return 1;
    return 1 - smoothstep((zoom - LO) / (HI - LO));
  }

  // realm 色饱和度·拉远 → boost (×1.15)·拉近 → desat (×0.7)
  function realmSatBoost(zoom){
    if (!_enabled) return 1;
    var t = smoothstep((zoom - LO) / (HI - LO));
    return 1.15 - t * 0.45;
  }

  // ─── render·HUD 显当前 mode (角落) ─────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    var map = ME.EDITOR.map;
    if (!map || !map.divisions || !map.divisions.length) return;
    var z = camera.zoom;
    var rf = realmFactor(z);
    var tf = terrainFactor(z);
    // 左上 HUD·小字
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var hint;
    if (rf > 0.85) hint = '政';
    else if (tf > 0.85) hint = '地';
    else hint = '混 ' + Math.round(tf * 100) + '%';
    var canvas = ME.EDITOR.canvas;
    var x = canvas.width - 78;
    var y = 12;
    ctx.fillStyle = 'rgba(20,15,10,0.55)';
    ctx.fillRect(x - 4, y - 2, 70, 16);
    ctx.fillStyle = '#f5e8c8';
    ctx.font = '11px serif';
    ctx.textBaseline = 'top';
    ctx.fillText('zoom·' + hint, x, y);
    ctx.restore();
  }

  // ─── toggle ────────────────────────────────────────────

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    try { localStorage.setItem('me.zoomBlend', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('zoom-blend·' + (_enabled ? '开' : '关·全 terrain'), 'info', 1500);
  }

  function setRange(lo, hi){
    LO = lo; HI = hi;
    ME.requestRender();
  }

  function init(){
    try {
      var v = localStorage.getItem('me.zoomBlend');
      if (v === '0') _enabled = false;
    } catch(e){}
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      // Ctrl+Alt+Z·切 zoom-blend
      if (e.ctrlKey && e.altKey && (e.key === 'z' || e.key === 'Z')){
        e.preventDefault();
        toggle();
      }
    });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.zoomBlend = {
    init: init,
    render: render,
    terrainFactor: terrainFactor,
    realmFactor: realmFactor,
    realmSatBoost: realmSatBoost,
    toggle: toggle,
    setRange: setRange,
    isEnabled: function(){ return _enabled; }
  };

})(typeof window !== 'undefined' ? window : this);
