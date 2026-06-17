// map-editor-lod.js
// Phase 21.11·zoom level detail (LOD)·far/mid/near
//
// 3 级·far (z < 0.4)·mid (0.4 - 1.5)·near (> 1.5)
// 各级 detail·decide·label / icon / border 显隐 / 详简
//
// 给其他模块查·TM.MapEditor.lod.level()·返 'far'/'mid'/'near'
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[lod] core not loaded'); return; }

  function level(){
    var z = ME.EDITOR.camera.zoom;
    if (z < 0.4) return 'far';
    if (z < 1.5) return 'mid';
    return 'near';
  }

  // 当前 LOD 下·各 feature 是否应显
  function shouldShow(feature){
    var L = level();
    switch (feature){
      case 'label-top':       return true;                // 顶级 label·总显
      case 'label-mid':       return L !== 'far';         // 二级·far 隐
      case 'label-low':       return L === 'near';        // 末级·only near
      case 'icon':            return L !== 'far';
      case 'icon-detail':     return L === 'near';        // 多 icon·详
      case 'border-double':   return L !== 'far';         // 双线·far 简
      case 'border-fine':     return L === 'near';        // 内细线·only near
      case 'autonomy-line':   return L !== 'far';
      case 'centroid':        return L === 'near';
      case 'river-arrow':     return L !== 'far';
      case 'grain':           return L !== 'far';         // 水彩 grain·far 太细
      case 'fractal-detail':  return L === 'near';        // fractal 顶点·只 near 显
      default: return true;
    }
  }

  // 各 div 按 importance 是否在当前 LOD 应 visible
  // (用·smart-labels / iconlets 内 filter)
  function divShouldShow(d, dyn){
    var L = level();
    if (L === 'near') return true;
    if (!dyn) dyn = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);
    if (!dyn || !dyn.levels) return true;
    var lvlIdx = -1;
    for (var i = 0; i < dyn.levels.length; i++){
      if (dyn.levels[i].key === d.level){ lvlIdx = i; break; }
    }
    if (L === 'far') return lvlIdx <= 1;     // 顶 + 二级
    return lvlIdx <= 2;                      // mid·顶 + 二 + 三
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.lod = {
    level: level,
    shouldShow: shouldShow,
    divShouldShow: divShouldShow
  };

})(typeof window !== 'undefined' ? window : this);
