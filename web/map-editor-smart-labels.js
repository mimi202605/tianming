// map-editor-smart-labels.js
// Phase 21.4·智能标签·分级 + 避让
//
// 替简单 fillText·按 area / level / 重要性分大小
// AABB collision·greedy 放置·outline + shadow
// CK3 风·重要省大字粗·普通小字
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[smart-labels] core not loaded'); return; }

  var _enabled = true;

  // ─── 重要性·按 level / flag / area 综合 ────────────────

  // 输出·{ priority (高 = 先放), fontSize (世界 px), fontStyle }
  function importance(d){
    var dyn = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);
    var levels = (dyn && dyn.levels) || [];
    var lvlIdx = -1;
    for (var i = 0; i < levels.length; i++){
      if (levels[i].key === d.level){ lvlIdx = i; break; }
    }
    var lvlScore = lvlIdx < 0 ? 50 : (100 - lvlIdx * 25);    // 顶级 100·二级 75·三级 50·四级 25

    var areaScore = Math.min(50, Math.sqrt(d.area || 100) * 0.5);
    var flagScore = 0;
    if (d.flags){
      if (d.flags.isCapital) flagScore += 50;
      if (d.flags.isHistoric) flagScore += 15;
      if (d.flags.isStrategic) flagScore += 10;
    }
    var prio = lvlScore + areaScore + flagScore;

    // font size·按 level + area·世界 px (zoom 后变屏)
    var fs;
    var weight = 'normal';
    if (lvlIdx === 0){
      fs = 22;
      weight = 'bold';
    } else if (lvlIdx === 1){
      fs = 16;
      weight = 'bold';
    } else if (lvlIdx === 2){
      fs = 12;
    } else {
      fs = 10;
    }
    if (d.flags && d.flags.isCapital){
      fs += 4;
      weight = 'bold';
    }
    return { priority: prio, fontSize: fs, weight: weight };
  }

  // ─── render ────────────────────────────────────────────

  function render(ctx, camera){
    if (!_enabled) return;
    var EDITOR = ME.EDITOR;
    if (!EDITOR.layers.label) return;
    var visible = EDITOR._visibleCache || [];
    if (!visible.length) return;

    // Phase 21.11·LOD filter
    var LOD = TM.MapEditor.lod;
    var dyn = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);

    // 排序·按 importance 降序
    var labelables = visible
      .filter(function(v){
        if (!v.centroid) return false;
        if (!(v.state.name || v.base.name)) return false;
        if (LOD && !LOD.divShouldShow(v.base, dyn)) return false;
        return true;
      })
      .map(function(v){
        var d = v.base;
        var imp = importance(d);
        return {
          v: v,
          name: v.state.name || v.base.name,
          fs: imp.fontSize,
          weight: imp.weight,
          priority: imp.priority,
          centroid: v.centroid
        };
      });
    labelables.sort(function(a, b){ return b.priority - a.priority; });

    // 测每 label 的 rect (世界 px)
    var z = camera.zoom;
    var placed = [];
    var rects = [];

    for (var i = 0; i < labelables.length; i++){
      var L = labelables[i];
      // 屏幕 px 字号·常用 font 度量·world px font size = L.fs / z·这里·全用 world
      var fontPx = L.fs / z;
      ctx.font = L.weight + ' ' + fontPx + 'px "Noto Serif SC", "STKaiti", serif';
      var w = ctx.measureText(L.name).width;
      var hh = fontPx * 1.2;

      // 不让 label 超过 polygon 的 bbox 太多·若 label 比 bbox 还宽·缩字
      var bbox = L.v.base.bbox;
      if (bbox && w > bbox.w * 1.4){
        // 过宽·跳此 label (太挤)
        continue;
      }

      var rect = {
        x: L.centroid[0] - w / 2,
        y: L.centroid[1] - hh / 2,
        w: w + 2 / z,
        h: hh + 2 / z
      };

      // collision check
      var ok = true;
      for (var k = 0; k < rects.length; k++){
        var r = rects[k];
        if (rect.x < r.x + r.w && rect.x + rect.w > r.x &&
            rect.y < r.y + r.h && rect.y + rect.h > r.y){
          ok = false; break;
        }
      }
      if (!ok) continue;

      placed.push(L);
      rects.push(rect);
    }

    // 实际渲染·从低优先开始 (后画的覆盖前画的·高优先在最上)
    placed.reverse();
    placed.forEach(function(L){
      var fontPx = L.fs / z;
      ctx.save();
      ctx.font = L.weight + ' ' + fontPx + 'px "Noto Serif SC", "STKaiti", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var x = L.centroid[0], y = L.centroid[1];

      // shadow / glow·先画外发光 (paper bg) — 多次 stroke 软化
      // 按 fontPx clamp·glow 不超字 25%
      var inkOn = global.TM && TM.MapEditor.inkRealm && TM.MapEditor.inkRealm.isEnabled && TM.MapEditor.inkRealm.isEnabled();
      var glowW = Math.min(4 / z, fontPx * 0.25);
      var outlineW = Math.min(1.5 / z, fontPx * 0.1);
      if (inkOn){
        // ink 模式·glow 缩到 2 px 极淡·alpha 0.4·避"黄光团"
        glowW = Math.min(1.6 / z, fontPx * 0.10);
        ctx.strokeStyle = 'rgba(232,222,200,0.40)';
      } else {
        ctx.strokeStyle = 'rgba(232,222,200,0.85)';
      }
      ctx.lineWidth = glowW;
      ctx.lineJoin = 'round';
      ctx.strokeText(L.name, x, y);

      // 黑/暗 outline
      ctx.strokeStyle = 'rgba(20,15,10,0.6)';
      ctx.lineWidth = outlineW;
      ctx.strokeText(L.name, x, y);

      // fill·按重要性·首都金·普通暗
      var d = L.v.base;
      var color = '#1a0e08';
      if (d.flags && d.flags.isCapital) color = '#7a4a18';
      else if (L.priority > 100) color = '#3a2010';
      ctx.fillStyle = color;
      ctx.fillText(L.name, x, y);

      ctx.restore();
    });
  }

  // ─── toggle ────────────────────────────────────────────

  function toggle(b){
    _enabled = (b == null) ? !_enabled : !!b;
    try { localStorage.setItem('me.smartLabels', _enabled ? '1' : '0'); } catch(e){}
    ME.requestRender();
    if (global.meToast) meToast('智能标签·' + (_enabled ? '开' : '关'), 'info', 1200);
  }

  function isEnabled(){ return _enabled; }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      var v = localStorage.getItem('me.smartLabels');
      if (v === '0') _enabled = false;
    } catch(e){}
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L')){
        e.preventDefault();
        toggle();
      }
    });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.smartLabels = {
    init: init,
    render: render,
    toggle: toggle,
    isEnabled: isEnabled,
    importance: importance
  };

})(typeof window !== 'undefined' ? window : this);
