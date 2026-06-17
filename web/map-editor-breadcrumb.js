// map-editor-breadcrumb.js
// Phase 19.2·dynasty Alt+1-9 + breadcrumb
//
// ① Alt+1 ... Alt+9·切朝代·按 dynasty.list() 顺序
// ② breadcrumb·titlebar 中插·选省时显·"洪州府 · 路 · 江南西路"
//    无 parent 链接·只显 level + name + region·多选显汇总
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[breadcrumb] core not loaded'); return; }

  var _crumb = null;

  // ─── breadcrumb UI ─────────────────────────────────────

  function ensureCrumb(){
    if (_crumb) return _crumb;
    var spacer = document.querySelector('.me-title-spacer');
    if (!spacer) return null;
    _crumb = document.createElement('div');
    _crumb.id = 'me-breadcrumb';
    _crumb.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'padding:0 var(--sp-3)',
      'color:var(--paper-2)',
      'font-family:var(--font-serif)',
      'font-size:var(--fs-sm)',
      'min-height:24px',
      'overflow:hidden',
      'white-space:nowrap',
      'text-overflow:ellipsis',
      'max-width:48vw'
    ].join(';');
    // 插 spacer 之 before·让其挤 spacer
    spacer.parentNode.insertBefore(_crumb, spacer);
    return _crumb;
  }

  function render(){
    var c = ensureCrumb();
    if (!c) return;
    var sels = ME.getSelected ? ME.getSelected() : [];
    if (sels.length === 0){
      c.innerHTML = '<span style="color:var(--paper-4); font-size:var(--fs-xs); font-style:italic;">(未选省·click canvas 选)</span>';
      return;
    }

    if (sels.length === 1){
      var d = sels[0];
      var typ = d.autonomy && d.autonomy.type;
      var typeLabel = typ === 'fanguo' ? '番' : typ === 'fanzhen' ? '镇' : typ === 'jimi' ? '羁' : typ === 'chaogong' ? '贡' : '直';
      var typeColor = typ === 'fanguo' ? '#8a3a2e' : typ === 'fanzhen' ? '#b65a30' : typ === 'jimi' ? '#6a8a3a' : typ === 'chaogong' ? '#7a6a3a' : '#3d4f6a';
      var bits = [];
      if (d.region) bits.push(escHtml(d.region));
      if (d.regionType && d.regionType !== d.region) bits.push(escHtml(d.regionType));
      if (d.level) bits.push(escHtml(d.level));
      var sub = bits.join(' · ');
      var holder = d.autonomy && d.autonomy.holder ? '·' + escHtml(d.autonomy.holder) : '';
      c.innerHTML =
        '<span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; background:' + typeColor + '; color:#fff; border-radius:var(--rd-1); font-size:var(--fs-xs); font-weight:var(--fw-sb);">' + typeLabel + '</span>' +
        '<span style="color:var(--gold-2); font-weight:var(--fw-sb);">' + escHtml(d.name || '(无名)') + '</span>' +
        (sub ? '<span style="color:var(--paper-3); font-size:var(--fs-xs);">' + sub + '</span>' : '') +
        (holder ? '<span style="color:var(--paper-3); font-size:var(--fs-xs); font-style:italic;">' + holder + '</span>' : '');
      return;
    }

    // 多选汇总
    var levelCount = {};
    var regionCount = {};
    sels.forEach(function(d){
      if (d.level){
        levelCount[d.level] = (levelCount[d.level] || 0) + 1;
      }
      var r = d.region || d.regionType;
      if (r) regionCount[r] = (regionCount[r] || 0) + 1;
    });
    var dominantLevel = Object.keys(levelCount).sort(function(a, b){ return levelCount[b] - levelCount[a]; })[0];
    var dominantRegion = Object.keys(regionCount).sort(function(a, b){ return regionCount[b] - regionCount[a]; })[0];
    var levelStr = Object.keys(levelCount).length === 1
      ? sels.length + ' ' + dominantLevel
      : sels.length + ' 省 (混·主 ' + dominantLevel + ')';
    c.innerHTML =
      '<span style="color:var(--gold-2); font-weight:var(--fw-sb);">' + levelStr + '</span>' +
      (dominantRegion ? '<span style="color:var(--paper-3); font-size:var(--fs-xs);">主·' + escHtml(dominantRegion) + '</span>' : '');
  }

  // ─── dynasty hotkey ────────────────────────────────────

  function bindKeys(){
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      // Alt+1 ... Alt+9·切朝代
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey){
        var m = /^[1-9]$/.exec(e.key);
        if (!m) return;
        e.preventDefault();
        switchDynastyByIdx(parseInt(m[0], 10) - 1);
      }
    });
  }

  function switchDynastyByIdx(idx){
    if (!TM.MapEditor.dynasty || !TM.MapEditor.dynasty.list) return;
    var list = TM.MapEditor.dynasty.list();
    if (idx < 0 || idx >= list.length){
      if (global.meToast) meToast('朝代槽 ' + (idx + 1) + ' 越界·共 ' + list.length + ' 朝', 'warn');
      return;
    }
    var dyn = list[idx];
    var sel = document.getElementById('dynasty-select');
    if (sel && sel.value !== dyn.id){
      sel.value = dyn.id;
      // 触发 change 事件
      var ev = document.createEvent('Event');
      ev.initEvent('change', true, true);
      sel.dispatchEvent(ev);
    }
    if (global.meToast) meToast('朝代·' + dyn.label, 'info', 1200);
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    ensureCrumb();
    render();
    bindKeys();
    ME.on('selection-change', render);
    ME.on('mutation', render);
    ME.on('map-loaded', render);
  }

  // ─── helpers ───────────────────────────────────────────

  function escHtml(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.breadcrumb = {
    init: init,
    render: render,
    switchDynastyByIdx: switchDynastyByIdx
  };

})(typeof window !== 'undefined' ? window : this);
