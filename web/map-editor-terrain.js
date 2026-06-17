// map-editor-terrain.js
// Phase 22.1·terrain 类型系统 (≠ climate)
//
// 9 类·d.terrain·影响行军 / 建筑 / 补给 (runtime 接驳)
// 编辑器·auto-classify (height + bitmap luminance + climate)·人工 override
//
// terrain ≠ climate
//   climate 是降水温度·影响农作 / 季节 viz
//   terrain 是地形·影响通行 / 建筑·CK3 风
//
// 2026-05-07

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[terrain] core not loaded'); return; }

  // ─── 9 类 terrain·名 / 色 / 通行系数 ────────────────────

  var TERRAIN = {
    '平原':  { color: '#c9ba78', mvCost: 1.0, fortBonus: 0,   moisture: 0.3, label: '平' },
    '丘陵':  { color: '#a89858', mvCost: 1.4, fortBonus: 1,   moisture: 0.3, label: '丘' },
    '山岭':  { color: '#7a6a4a', mvCost: 2.4, fortBonus: 3,   moisture: 0.2, label: '岭' },
    '林地':  { color: '#5a7a48', mvCost: 1.6, fortBonus: 1,   moisture: 0.5, label: '林' },
    '沙漠':  { color: '#d9c47a', mvCost: 1.7, fortBonus: 0,   moisture: 0.0, label: '漠' },
    '湿地':  { color: '#6a8a78', mvCost: 1.8, fortBonus: 1,   moisture: 0.9, label: '泽' },
    '草原':  { color: '#bdb474', mvCost: 0.9, fortBonus: -1,  moisture: 0.4, label: '原' },
    '绿洲':  { color: '#88b870', mvCost: 1.0, fortBonus: 0,   moisture: 0.7, label: '洲' },
    '雪原':  { color: '#dde4ec', mvCost: 2.0, fortBonus: 0,   moisture: 0.3, label: '雪' }
  };

  // ─── auto-classify·按 height + bitmap + climate ──────

  function classify(d){
    if (d.terrain && TERRAIN[d.terrain]) return d.terrain;
    var map = ME.EDITOR.map;
    var w = map.bitmapWidth || 1280, h = map.bitmapHeight || 800;
    if (!d.bbox) return '平原';
    var cx = (d.bbox.x + d.bbox.w / 2) / w;
    var cy = (d.bbox.y + d.bbox.h / 2) / h;

    // 取 height
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

    // 取 climate (若已分)
    var climate = (TM.MapEditor.climate && TM.MapEditor.climate.classify)
      ? TM.MapEditor.climate.classify(d)
      : null;

    // 高度先决·最高 = 雪 / 山
    if (elev > 220) return '雪原';
    if (elev > 170) return '山岭';
    if (elev > 130) return '丘陵';

    // 中低·climate 决主
    if (climate === '寒') return cy < 0.18 ? '雪原' : (elev > 100 ? '山岭' : '草原');
    if (climate === '旱'){
      // 旱·北 (cy 小) 漠多·南 (cy 大) 草
      if (cy < 0.4) return '沙漠';
      if (cx < 0.2 && cy > 0.5) return '绿洲';   // 极西南·绿洲 (西域味)
      return '草原';
    }
    if (climate === '湿'){
      // 湿·靠水 (cy 大) 多湿地·中线林
      if (cy > 0.8) return '湿地';
      return '林地';
    }
    if (climate === '高') return elev > 100 ? '山岭' : '丘陵';
    // 温·主平原·east 偏林
    if (cx > 0.65) return '林地';
    return '平原';
  }

  function assignAll(){
    var divs = ME.EDITOR.map.divisions || [];
    if (!ME.commitMutation){
      divs.forEach(function(d){ d.terrain = classify(d); });
    } else {
      ME.commitMutation('terrain auto·' + divs.length + ' 省', function(){
        divs.forEach(function(d){ d.terrain = classify(d); });
      });
    }
    if (global.meToast) meToast('地形自动·' + divs.length + ' 省', 'success');
    ME.requestRender();
  }

  // ─── 取颜色·按 terrain ──────────────────────────────

  function colorOf(d){
    var t = classify(d);
    return TERRAIN[t] ? TERRAIN[t].color : '#999';
  }

  function getInfo(d){
    var t = classify(d);
    return TERRAIN[t] || null;
  }

  // ─── 类别枚举 (UI 下拉) ─────────────────────────────

  function listTypes(){ return Object.keys(TERRAIN); }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.terrain = {
    TERRAIN: TERRAIN,
    classify: classify,
    assignAll: assignAll,
    colorOf: colorOf,
    getInfo: getInfo,
    listTypes: listTypes
  };

})(typeof window !== 'undefined' ? window : this);
