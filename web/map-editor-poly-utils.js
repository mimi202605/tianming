// map-editor-poly-utils.js
// 共享·polygon / 渲染 / 随机 helper·替散落重复
//
// 之前·至少 6 个模块复制 path-build / clip / strHash / srand 各自实现
// 此处统一·所有视觉模块走这套·refactor 入口
//
// 2026-05-08

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[poly-utils] core not loaded'); return; }

  // ─── ① path build·polygon → ctx.beginPath ────────────

  // 把 polygon 顶点序列描入 ctx 当前 path·调用方负责 fill / stroke / clip
  function tracePath(ctx, poly){
    if (!poly || poly.length < 3) return false;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++){
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    ctx.closePath();
    return true;
  }

  // 将 polygon 当 sub-path 加到现有 path (不 beginPath·不 closePath 单独)
  // 用于 evenodd fill 多 ring 合一 path
  function appendSubPath(ctx, poly){
    if (!poly || poly.length < 3) return false;
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++){
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    ctx.closePath();
    return true;
  }

  // ─── ② 渲染 helper·clip 至 polygon 并执行 drawFn ─────

  // ctx.save → tracePath → clip → drawFn(ctx) → ctx.restore
  function withPolygonClip(ctx, poly, drawFn){
    if (!tracePath(ctx, poly)) return;
    ctx.save();
    ctx.clip();
    drawFn(ctx);
    ctx.restore();
  }

  // 遍历 visible cache·对每 div 的主 polygon 执行 fn(v, mainPoly)
  function forEachVisible(fn){
    var visible = (ME.EDITOR && ME.EDITOR._visibleCache) || [];
    for (var i = 0; i < visible.length; i++){
      var v = visible[i];
      var poly = v && v.allPolys && v.allPolys[0];
      if (poly && poly.length >= 3) fn(v, poly);
    }
  }

  // ─── ③ point-in-polygon·ray casting ─────────────────

  function pointInPolygon(x, y, poly){
    if (!poly || poly.length < 3) return false;
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++){
      var pi = poly[i], pj = poly[j];
      if (((pi[1] > y) !== (pj[1] > y)) &&
          (x < (pj[0] - pi[0]) * (y - pi[1]) / (pj[1] - pi[1] + 1e-9) + pi[0])){
        c = !c;
      }
    }
    return c;
  }

  // ─── ④ 确定性·随机 / hash ─────────────────────────

  // 字符串 hash (32-bit)
  function strHash(s){
    var h = 0;
    if (!s) return 0;
    for (var i = 0; i < s.length; i++){
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // seeded RNG·小型 LCG·返 0..1 floats
  function srand(seed){
    var s = (seed | 0) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function(){
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // 按 div.id 取稳定 RNG·suffix 不同 → 不同序列
  function divRand(div, suffix){
    return srand(strHash((div && div.id || '') + ':' + (suffix || '')));
  }

  // ─── ⑤ 颜色 helper·hex / rgba ────────────────────────

  function hexToRgb(hex){
    if (!hex) return null;
    if (hex[0] === '#') hex = hex.slice(1);
    if (hex.length === 3){
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    }
    if (hex.length >= 6){
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
    return null;
  }

  function rgbaStr(rgb, a){
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  // ─── ⑥ 通用 layer 模板·toggle / init / localStorage ─

  // 用法·替每个 layer 模块一坨样板代码
  // makeLayer({ name:'fog', defOn:false, hotkey:{ctrl:1,alt:1,key:'f'}, render: fn, ... })
  function makeLayer(spec){
    var enabled = !!spec.defOn;
    var key = 'me.' + (spec.storeKey || spec.name);

    // 读 localStorage·覆盖 default
    try {
      var v = localStorage.getItem(key);
      if (v === '1') enabled = true;
      else if (v === '0') enabled = false;
    } catch(e){}

    function isEnabled(){ return enabled; }
    function toggle(b){
      enabled = (b == null) ? !enabled : !!b;
      try { localStorage.setItem(key, enabled ? '1' : '0'); } catch(e){}
      ME.requestRender();
      if (spec.toastLabel && global.meToast){
        meToast(spec.toastLabel + '·' + (enabled ? '开' : '关'), 'info', 1200);
      }
    }

    function bindHotkey(){
      var hk = spec.hotkey;
      if (!hk) return;
      document.addEventListener('keydown', function(e){
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
        if (!!hk.ctrl !== e.ctrlKey) return;
        if (!!hk.alt !== e.altKey) return;
        if (!!hk.shift !== e.shiftKey) return;
        var k = (hk.key || '').toLowerCase();
        if (e.key.toLowerCase() !== k) return;
        e.preventDefault();
        toggle();
      });
    }

    return {
      isEnabled: isEnabled,
      toggle: toggle,
      bindHotkey: bindHotkey
    };
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.polyUtils = {
    tracePath: tracePath,
    appendSubPath: appendSubPath,
    withPolygonClip: withPolygonClip,
    forEachVisible: forEachVisible,
    pointInPolygon: pointInPolygon,
    strHash: strHash,
    srand: srand,
    divRand: divRand,
    hexToRgb: hexToRgb,
    rgbaStr: rgbaStr,
    makeLayer: makeLayer
  };

})(typeof window !== 'undefined' ? window : this);
