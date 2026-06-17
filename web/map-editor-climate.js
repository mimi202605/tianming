// map-editor-climate.js
// Phase 21.7·气候 layer
//
// 5 类气候·温 / 寒 / 湿 / 旱 / 高
// 自动分类·按 division 中心 (x, y) 在 bitmap 中的位置 + 高度 (若 heightMap 存)
// 也可手动·d.climate = '温' / '寒' / ...
// 独立 view 模式·切到时 polygon 按气候着色
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[climate] core not loaded'); return; }

  var _enabled = false;

  // ─── 5 类气候配色·暖湿冷旱高 ────────────────────────

  var CLIMATE_COLOR = {
    '温': 'rgba(140,170,90,0.55)',     // 翠·温带
    '寒': 'rgba(180,200,220,0.55)',    // 灰蓝·寒
    '湿': 'rgba(80,150,130,0.55)',     // 湿绿·亚热
    '旱': 'rgba(200,170,110,0.55)',    // 黄·干旱
    '高': 'rgba(220,220,230,0.55)'     // 灰白·高原
  };

  // ─── 自动分类·按 (x, y, height) 推 ─────────────────

  // 输入·div·返回·string climate type
  function classify(d){
    if (d.climate) return d.climate;
    var map = ME.EDITOR.map;
    var w = map.bitmapWidth || 1280, h = map.bitmapHeight || 800;
    if (!d.bbox) return '温';
    var cx = (d.bbox.x + d.bbox.w / 2) / w;     // 0-1
    var cy = (d.bbox.y + d.bbox.h / 2) / h;

    // 高度·若 heightMap 已载
    var elev = 0;
    if (map.heightMap && map.heightMap._canvas){
      var hCtx = map.heightMap._canvas.getContext('2d');
      try {
        var pix = hCtx.getImageData(
          Math.round(d.bbox.x + d.bbox.w / 2),
          Math.round(d.bbox.y + d.bbox.h / 2),
          1, 1
        );
        elev = pix.data[0];
      } catch(e){}
    }
    if (elev > 200) return '高';

    // 维度 (cy)·北寒南湿·中温
    // 经度 (cx)·西旱东湿
    if (cy < 0.25){
      // 极北·寒
      return cx < 0.4 ? '寒' : '寒';
    } else if (cy < 0.5){
      // 中北·温·西部偏旱
      return cx < 0.35 ? '旱' : '温';
    } else if (cy < 0.75){
      // 中南·湿·西部偏旱
      return cx < 0.30 ? '旱' : (cx < 0.55 ? '温' : '湿');
    } else {
      // 极南·湿
      return '湿';
    }
  }

  function assignAll(){
    var divs = ME.EDITOR.map.divisions || [];
    ME.commitMutation('climate auto·' + divs.length + ' 省', function(){
      divs.forEach(function(d){
        d.climate = classify(d);
      });
    });
    if (global.meToast) meToast('气候自动·' + divs.length + ' 省', 'success');
  }

  // ─── render·若 enabled·overlay ────────────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    var EDITOR = ME.EDITOR;
    var visible = EDITOR._visibleCache || [];
    if (!visible.length) return;

    visible.forEach(function(v){
      var d = v.base;
      var cl = classify(d);
      var color = CLIMATE_COLOR[cl];
      if (!color) return;
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

  // ─── toggle ────────────────────────────────────────────

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    try { localStorage.setItem('me.climate', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('气候 view·' + (_enabled ? '开' : '关'), 'info', 1200);
  }

  function isEnabled(){ return _enabled; }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      var v = localStorage.getItem('me.climate');
      if (v === '1') _enabled = true;
    } catch(e){}
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.ctrlKey && e.altKey && (e.key === 'c' || e.key === 'C')){
        e.preventDefault();
        toggle();
      }
    });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.climate = {
    init: init,
    classify: classify,
    assignAll: assignAll,
    render: render,
    toggle: toggle,
    isEnabled: isEnabled,
    CLIMATE_COLOR: CLIMATE_COLOR
  };

})(typeof window !== 'undefined' ? window : this);
