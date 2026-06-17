// map-editor-season.js
// Phase 21.13·季节·4 季视觉
//
// spring 春·summer 夏·autumn 秋·winter 冬
// 按 climate (寒/温/湿/旱/高)·不同 tint
// 冬·寒 / 高 area·雪 (白)·winter 全图微冷 tint
// 秋·黄叶·summer·深绿·spring·浅绿
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[season] core not loaded'); return; }

  var _enabled = false;
  var _season = 'summer';

  // 季 → 各 climate 的 tint·rgba string
  // 全 div 受底色一份 + climate-specific 加码
  var TINT = {
    spring: {
      '温': 'rgba(180,210,150,0.25)',
      '湿': 'rgba(160,200,140,0.30)',
      '寒': 'rgba(200,210,200,0.20)',
      '旱': 'rgba(210,200,150,0.18)',
      '高': 'rgba(220,220,220,0.15)',
      'global': 'rgba(180,210,150,0.10)'
    },
    summer: {
      '温': 'rgba(120,180,90,0.28)',
      '湿': 'rgba(80,160,100,0.32)',
      '寒': 'rgba(180,200,180,0.18)',
      '旱': 'rgba(220,180,100,0.20)',
      '高': 'rgba(200,200,180,0.15)',
      'global': 'rgba(120,180,90,0.05)'
    },
    autumn: {
      '温': 'rgba(220,160,80,0.30)',
      '湿': 'rgba(200,140,60,0.32)',
      '寒': 'rgba(200,180,150,0.20)',
      '旱': 'rgba(220,170,90,0.20)',
      '高': 'rgba(220,200,170,0.15)',
      'global': 'rgba(220,170,90,0.10)'
    },
    winter: {
      '温': 'rgba(220,225,230,0.42)',
      '湿': 'rgba(200,210,220,0.38)',
      '寒': 'rgba(245,250,255,0.65)',     // 雪
      '旱': 'rgba(220,220,220,0.30)',
      '高': 'rgba(250,252,255,0.75)',     // 雪盖
      'global': 'rgba(180,200,225,0.18)'
    }
  };

  function setSeason(s){
    if (!TINT[s]) return;
    _season = s;
    try { localStorage.setItem('me.season', s); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('季节·' + ({spring:'春',summer:'夏',autumn:'秋',winter:'冬'}[s]), 'info', 1200);
  }

  function nextSeason(){
    var seq = ['spring', 'summer', 'autumn', 'winter'];
    var idx = seq.indexOf(_season);
    setSeason(seq[(idx + 1) % seq.length]);
  }

  function getSeason(){ return _season; }

  // ─── render·season tint overlay ────────────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    var EDITOR = ME.EDITOR;
    var visible = EDITOR._visibleCache || [];
    if (!visible.length) return;
    var CL = TM.MapEditor.climate;
    var tints = TINT[_season];
    if (!tints) return;

    visible.forEach(function(v){
      var d = v.base;
      var cl = CL && CL.classify ? CL.classify(d) : '温';
      var color = tints[cl] || tints['global'];
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

      // 飞地同
      for (var px = 1; px < v.allPolys.length; px++){
        var p = v.allPolys[px];
        if (!p || p.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(p[0][0], p[0][1]);
        for (var k = 1; k < p.length; k++){
          ctx.lineTo(p[k][0], p[k][1]);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    });
  }

  // ─── toggle ────────────────────────────────────────────

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    try { localStorage.setItem('me.seasonOn', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('季节 view·' + (_enabled ? '开 (' + _season + ')' : '关'), 'info', 1500);
  }

  function isEnabled(){ return _enabled; }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      if (localStorage.getItem('me.seasonOn') === '1') _enabled = true;
      var s = localStorage.getItem('me.season');
      if (s && TINT[s]) _season = s;
    } catch(e){}

    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      // Ctrl+Alt+S·切季
      if (e.ctrlKey && e.altKey && (e.key === 's' || e.key === 'S')){
        e.preventDefault();
        if (!_enabled){
          _enabled = true;
          try { localStorage.setItem('me.seasonOn', '1'); } catch(err){}
        }
        nextSeason();
      }
    });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.season = {
    init: init,
    render: render,
    setSeason: setSeason,
    nextSeason: nextSeason,
    getSeason: getSeason,
    toggle: toggle,
    isEnabled: isEnabled
  };

})(typeof window !== 'undefined' ? window : this);
