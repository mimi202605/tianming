// map-editor-iconlets.js
// Phase 21.5·icon 系统·6 类·按 flags / autonomy 自动选
//
// 城堡 / 寺 / 港 / 关 / 营 / 塔·canvas vector·世界 px·zoom-stable
// 选 logic·div.flags 决定·首都 / 沿海 / 战略 / 历史 / 边塞 / 军屯
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[iconlets] core not loaded'); return; }

  var _enabled = true;

  // ─── icon paths·canvas 2d 命令 ────────────────────────

  // 每 icon 函数·ctx 已 translate 到 icon 中心·s = world px size
  var DRAWERS = {
    // 城堡·square 主体 + 双塔
    castle: function(ctx, s){
      var h = s * 0.6;
      ctx.beginPath();
      // 主墙
      ctx.moveTo(-s * 0.5, h * 0.6);
      ctx.lineTo(s * 0.5, h * 0.6);
      ctx.lineTo(s * 0.5, -h * 0.2);
      // 城垛
      ctx.lineTo(s * 0.4, -h * 0.2);
      ctx.lineTo(s * 0.4, -h * 0.4);
      ctx.lineTo(s * 0.25, -h * 0.4);
      ctx.lineTo(s * 0.25, -h * 0.2);
      ctx.lineTo(s * 0.1, -h * 0.2);
      ctx.lineTo(s * 0.1, -h * 0.4);
      ctx.lineTo(-s * 0.1, -h * 0.4);
      ctx.lineTo(-s * 0.1, -h * 0.2);
      ctx.lineTo(-s * 0.25, -h * 0.2);
      ctx.lineTo(-s * 0.25, -h * 0.4);
      ctx.lineTo(-s * 0.4, -h * 0.4);
      ctx.lineTo(-s * 0.4, -h * 0.2);
      ctx.lineTo(-s * 0.5, -h * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    // 寺·三角顶 + 方底
    temple: function(ctx, s){
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(0, -s * 0.5);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(s * 0.4, 0);
      ctx.lineTo(s * 0.4, s * 0.4);
      ctx.lineTo(-s * 0.4, s * 0.4);
      ctx.lineTo(-s * 0.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 中柱
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(0, s * 0.4);
      ctx.stroke();
    },
    // 港·锚
    port: function(ctx, s){
      var r = s * 0.5;
      ctx.beginPath();
      // 锚环
      ctx.arc(0, -r * 0.7, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      // 锚杆
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(0, r * 0.6);
      ctx.stroke();
      // 锚臂 (弧)
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      // 锚横
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.25);
      ctx.lineTo(r * 0.35, -r * 0.25);
      ctx.stroke();
    },
    // 关·门 + 城墙
    pass: function(ctx, s){
      ctx.beginPath();
      ctx.rect(-s * 0.5, -s * 0.4, s, s * 0.8);
      ctx.fill();
      ctx.stroke();
      // 门洞
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.rect(-s * 0.15, -s * 0.1, s * 0.3, s * 0.5);
      ctx.fill();
      // 城垛 (顶)
      ctx.beginPath();
      var bw = s * 0.12;
      for (var i = -2; i <= 2; i++){
        var x = i * bw;
        ctx.rect(x - bw * 0.4, -s * 0.55, bw * 0.8, s * 0.15);
      }
      ctx.fill();
      ctx.stroke();
    },
    // 营·三角帐
    camp: function(ctx, s){
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.4);
      ctx.lineTo(0, -s * 0.5);
      ctx.lineTo(s * 0.5, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 中线
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, s * 0.4);
      ctx.stroke();
    },
    // 塔·细高 + 顶尖
    tower: function(ctx, s){
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, s * 0.5);
      ctx.lineTo(-s * 0.25, -s * 0.3);
      ctx.lineTo(0, -s * 0.5);
      ctx.lineTo(s * 0.25, -s * 0.3);
      ctx.lineTo(s * 0.25, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 窗
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.rect(-s * 0.07, -s * 0.15, s * 0.14, s * 0.18);
      ctx.fill();
    }
  };

  // ─── 路由·按 flag 决定·返回 array 多 icon 也行 ────────

  function pickIcons(d){
    var icons = [];
    if (!d.flags) return icons;
    if (d.flags.isCapital) icons.push({ type: 'castle', size: 18, color: '#7a4a18' });
    else if (d.flags.isStrategic) icons.push({ type: 'pass', size: 14, color: '#4a3a25' });

    if (d.flags.isHolyLand || d.flags.isHistoric) icons.push({ type: 'temple', size: 12, color: '#8a4a18' });
    if (d.flags.isCoastal || d.flags.isTradePort) icons.push({ type: 'port', size: 12, color: '#3a5a7a' });
    if (d.flags.isFrontier && !d.flags.isCapital) icons.push({ type: 'camp', size: 10, color: '#5a3a30' });
    if (d.flags.isJunDi || d.flags.isTunTian) icons.push({ type: 'tower', size: 10, color: '#3a4a30' });

    return icons;
  }

  // ─── render ────────────────────────────────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    // Phase 21.11·LOD·far 不显 icon
    var LOD = TM.MapEditor.lod;
    if (LOD && !LOD.shouldShow('icon')) return;
    var iconDetail = !LOD || LOD.shouldShow('icon-detail');

    var EDITOR = ME.EDITOR;
    var visible = EDITOR._visibleCache || [];
    if (!visible.length) return;

    var z = camera.zoom;
    visible.forEach(function(v){
      var d = v.base;
      if (!v.centroid) return;
      var icons = pickIcons(d);
      if (!icons.length) return;
      // mid LOD·只显第 1 icon (主要)·near 全显
      if (!iconDetail) icons = icons.slice(0, 1);

      // multiple icons·横排
      var cx = v.centroid[0];
      var cy = v.centroid[1];
      var nameOffsetY = 14 / z;
      var startX = cx - ((icons.length - 1) * 16 / z) / 2;

      icons.forEach(function(ic, i){
        var s = ic.size / z;
        var ix = startX + i * 18 / z;
        var iy = cy - nameOffsetY;
        ctx.save();
        ctx.translate(ix, iy);
        ctx.lineWidth = 1.2 / z;
        ctx.strokeStyle = 'rgba(20,15,10,0.85)';
        ctx.fillStyle = ic.color;
        var drawer = DRAWERS[ic.type];
        if (drawer) drawer(ctx, s);
        ctx.restore();
      });
    });
  }

  // ─── toggle ────────────────────────────────────────────

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    try { localStorage.setItem('me.iconlets', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('icon·' + (_enabled ? '开' : '关'), 'info', 1200);
  }

  function isEnabled(){ return _enabled; }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      var v = localStorage.getItem('me.iconlets');
      if (v === '0') _enabled = false;
    } catch(e){}
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.iconlets = {
    init: init,
    render: render,
    toggle: toggle,
    isEnabled: isEnabled,
    DRAWERS: DRAWERS,
    pickIcons: pickIcons
  };

})(typeof window !== 'undefined' ? window : this);
