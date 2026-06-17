// map-editor-impassable.js
// Phase 22.5·impassable 楔区
//
// d.impassables = [polygon, polygon, ...]·省内子多边形
// 灰斜纹·阻军行 (runtime 接驳)
// 编辑器·圈定工具 (Ctrl+Shift+I 进入·click 加点·dblclick 闭合)
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[impassable] core not loaded'); return; }

  var _enabled = true;
  var _drawing = false;
  var _curPoly = [];
  var _curDiv = null;
  var _hatchPattern = null;

  // ─── 斜纹 pattern·一次造 ─────────────────────────────

  function buildHatch(){
    var c = document.createElement('canvas');
    c.width = c.height = 16;
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(60,60,70,0.22)';
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = 'rgba(40,40,50,0.55)';
    ctx.lineWidth = 1.4;
    // 斜线 NE-SW
    ctx.beginPath();
    ctx.moveTo(-4, 20); ctx.lineTo(20, -4);
    ctx.moveTo(-4, 4);  ctx.lineTo(4, -4);
    ctx.moveTo(12, 20); ctx.lineTo(20, 12);
    ctx.stroke();
    return c;
  }

  function ensureHatch(ctx){
    if (_hatchPattern) return _hatchPattern;
    var hc = buildHatch();
    _hatchPattern = ctx.createPattern(hc, 'repeat');
    return _hatchPattern;
  }

  // ─── render ─────────────────────────────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    var EDITOR = ME.EDITOR;
    var visible = EDITOR._visibleCache || [];
    var pat = ensureHatch(ctx);

    visible.forEach(function(v){
      var d = v.base;
      if (!d.impassables || !d.impassables.length) return;
      d.impassables.forEach(function(poly){
        if (!poly || poly.length < 3) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (var i = 1; i < poly.length; i++){
          ctx.lineTo(poly[i][0], poly[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = pat;
        ctx.fill();
        // 暗描边
        ctx.strokeStyle = 'rgba(30,30,38,0.7)';
        ctx.lineWidth = 1 / camera.zoom;
        ctx.stroke();
        ctx.restore();
      });
    });

    // 当前正画的 poly·hint
    if (_drawing && _curPoly.length >= 1){
      ctx.save();
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 1.6 / camera.zoom;
      ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
      ctx.beginPath();
      ctx.moveTo(_curPoly[0][0], _curPoly[0][1]);
      for (var i = 1; i < _curPoly.length; i++){
        ctx.lineTo(_curPoly[i][0], _curPoly[i][1]);
      }
      ctx.stroke();
      // 顶点·圈
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff8800';
      _curPoly.forEach(function(p){
        ctx.beginPath();
        ctx.arc(p[0], p[1], 3 / camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // ─── 工具·画 impassable ──────────────────────────────

  function startDraw(){
    _drawing = true;
    _curPoly = [];
    _curDiv = null;
    if (global.meToast) meToast('圈 impassable·click 加点·dblclick 闭合·Esc 取消', 'info', 4000);
  }

  function cancelDraw(){
    _drawing = false;
    _curPoly = [];
    _curDiv = null;
    ME.requestRender();
  }

  function commitPoly(){
    if (_curPoly.length < 3 || !_curDiv){
      cancelDraw();
      return;
    }
    var poly = _curPoly.slice();
    var div = _curDiv;
    ME.commitMutation('impassable·' + div.id, function(){
      div.impassables = div.impassables || [];
      div.impassables.push(poly);
    });
    if (global.meToast) meToast('impassable 入·' + div.id, 'success', 1500);
    cancelDraw();
  }

  function onCanvasClick(wx, wy, e){
    if (!_drawing) return false;
    // 找点中省
    var hitDiv = null;
    var divs = ME.EDITOR.map.divisions || [];
    for (var i = 0; i < divs.length; i++){
      if (ME.pointInDivision && ME.pointInDivision(wx, wy, divs[i])){
        hitDiv = divs[i];
        break;
      }
    }
    if (!_curDiv && hitDiv) _curDiv = hitDiv;
    if (_curDiv && hitDiv && hitDiv !== _curDiv){
      if (global.meToast) meToast('impassable 须同省内', 'warn', 1500);
      return true;
    }
    _curPoly.push([wx, wy]);
    ME.requestRender();
    return true;   // 吞掉 click
  }

  // 清省内全 impassable
  function clearDiv(div){
    if (!div || !div.impassables || !div.impassables.length) return;
    ME.commitMutation('impassable 清·' + div.id, function(){
      div.impassables = [];
    });
    ME.requestRender();
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      var v = localStorage.getItem('me.impassable');
      if (v === '0') _enabled = false;
    } catch(e){}

    var canvas = ME.EDITOR.canvas;
    if (canvas){
      // 双击·闭合
      canvas.addEventListener('dblclick', function(e){
        if (!_drawing) return;
        e.preventDefault();
        e.stopPropagation();
        commitPoly();
      }, true);
      // 单击·加点 (在 ME 主 click 之前·capture 阶段)
      canvas.addEventListener('click', function(e){
        if (!_drawing) return;
        var rect = canvas.getBoundingClientRect();
        var sx = e.clientX - rect.left;
        var sy = e.clientY - rect.top;
        var z = ME.EDITOR.camera.zoom;
        var wx = (sx - ME.EDITOR.camera.x) / z;
        var wy = (sy - ME.EDITOR.camera.y) / z;
        if (onCanvasClick(wx, wy, e)){
          e.stopPropagation();
        }
      }, true);
    }

    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      // Ctrl+Alt+I·进 / 出 impassable 工具
      if (e.ctrlKey && e.altKey && (e.key === 'i' || e.key === 'I')){
        e.preventDefault();
        if (_drawing) cancelDraw();
        else startDraw();
      }
      if (e.key === 'Escape' && _drawing){
        cancelDraw();
      }
    });
  }

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    try { localStorage.setItem('me.impassable', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('impassable 显·' + (_enabled ? '开' : '关'), 'info', 1200);
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.impassable = {
    init: init,
    render: render,
    startDraw: startDraw,
    cancelDraw: cancelDraw,
    clearDiv: clearDiv,
    toggle: toggle,
    isEnabled: function(){ return _enabled; },
    isDrawing: function(){ return _drawing; }
  };

})(typeof window !== 'undefined' ? window : this);
