// map-editor-ghost.js
// Phase 18.5·ghost preview·提交前可见
// split·切线 drag·实时算 2 半·浅色填
// merge·Shift+M 预览·convex hull·M 提交
// (voronoi 暂不做·走 wizard·已有可视种子放置)
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[ghost] core not loaded'); return; }

  var _mergePreviewIds = null;     // 待 commit 的 merge 预览·divIds 数组

  // ─── split preview·实时算 ──────────────────────────────

  function previewSplit(divId, cutA, cutB){
    var ms = TM.MapEditor.mergeSplit;
    if (!ms) return null;
    var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
    if (!d || !d.polygon || d.polygon.length < 3) return null;

    // 找目标 polygon·按 click 位置 (含 mouse hover 终点) 选·和 commit 逻辑同
    var allPs = ME.getAllPolygons ? ME.getAllPolygons(d) : [d.polygon];
    var targetIdx = pickTargetPreview(allPs, cutA, cutB);
    if (targetIdx === -1) return null;

    var poly = allPs[targetIdx];
    var bbox = ms.polygonBbox ? ms.polygonBbox(poly) : null;
    var ext = (ms.extendCut && bbox) ? ms.extendCut(cutA, cutB, bbox) : { a: cutA, b: cutB };
    var crossings = findCrossings(poly, ext.a, ext.b, ms.segmentIntersect);

    if (crossings.length < 2) return null;
    if (crossings.length > 2){
      // 凹陷·取距 click 中点最近 2 交
      var mid = [(cutA[0] + cutB[0]) / 2, (cutA[1] + cutB[1]) / 2];
      crossings.sort(function(a, b){
        var da = (a.point[0]-mid[0])*(a.point[0]-mid[0]) + (a.point[1]-mid[1])*(a.point[1]-mid[1]);
        var db = (b.point[0]-mid[0])*(b.point[0]-mid[0]) + (b.point[1]-mid[1])*(b.point[1]-mid[1]);
        return da - db;
      });
      crossings = crossings.slice(0, 2);
    }

    crossings.sort(function(a, b){
      if (a.edgeIdx !== b.edgeIdx) return a.edgeIdx - b.edgeIdx;
      return a.t - b.t;
    });
    var c0 = crossings[0], c1 = crossings[1];

    var poly1 = [c0.point.slice()];
    for (var k = c0.edgeIdx + 1; ; k++){
      var idx = k % poly.length;
      if (idx === (c1.edgeIdx + 1) % poly.length) break;
      poly1.push(poly[idx].slice());
      if (poly1.length > poly.length + 2) break;
    }
    poly1.push(c1.point.slice());

    var poly2 = [c1.point.slice()];
    for (var m = c1.edgeIdx + 1; ; m++){
      var idx2 = m % poly.length;
      if (idx2 === (c0.edgeIdx + 1) % poly.length) break;
      poly2.push(poly[idx2].slice());
      if (poly2.length > poly.length + 2) break;
    }
    poly2.push(c0.point.slice());

    if (poly1.length < 3 || poly2.length < 3) return null;
    return { poly1: poly1, poly2: poly2 };
  }

  function pickTargetPreview(allPs, cutA, cutB){
    var pip = ME.pointInPolygon;
    if (pip){
      for (var i = 0; i < allPs.length; i++){
        if (pip(cutA[0], cutA[1], allPs[i])) return i;
      }
      for (var j = 0; j < allPs.length; j++){
        if (pip(cutB[0], cutB[1], allPs[j])) return j;
      }
    }
    var mid = [(cutA[0] + cutB[0]) / 2, (cutA[1] + cutB[1]) / 2];
    var bestIdx = -1, bestD = Infinity;
    for (var k = 0; k < allPs.length; k++){
      var c = ME.polygonCentroid ? ME.polygonCentroid(allPs[k]) : null;
      if (!c) continue;
      var dd = (c[0]-mid[0])*(c[0]-mid[0]) + (c[1]-mid[1])*(c[1]-mid[1]);
      if (dd < bestD){ bestD = dd; bestIdx = k; }
    }
    return bestIdx;
  }

  function findCrossings(poly, cutA, cutB, segIntFn){
    var arr = [];
    for (var i = 0; i < poly.length; i++){
      var p1 = poly[i];
      var p2 = poly[(i + 1) % poly.length];
      var hit = segIntFn(p1, p2, cutA, cutB);
      if (hit){
        var dup = false;
        for (var k = 0; k < arr.length; k++){
          var dx = arr[k].point[0] - hit.point[0];
          var dy = arr[k].point[1] - hit.point[1];
          if (dx*dx + dy*dy < 0.25){ dup = true; break; }
        }
        if (!dup) arr.push({ edgeIdx: i, t: hit.t1, point: hit.point });
      }
    }
    return arr;
  }

  // ─── merge preview ─────────────────────────────────────

  function setMergePreview(divIds){
    _mergePreviewIds = divIds && divIds.length >= 2 ? divIds.slice() : null;
    ME.requestRender();
  }

  function clearMergePreview(){
    if (!_mergePreviewIds) return;
    _mergePreviewIds = null;
    ME.requestRender();
  }

  function isMergePreviewActive(){
    return !!_mergePreviewIds;
  }

  function previewMerge(divIds){
    var ms = TM.MapEditor.mergeSplit;
    if (!ms || !ms.convexHull) return null;
    var pts = [];
    var divs = ME.EDITOR.map.divisions;
    for (var i = 0; i < divIds.length; i++){
      var d = divs.find(function(D){ return D.id === divIds[i]; });
      if (!d || !d.polygon) continue;
      for (var j = 0; j < d.polygon.length; j++) pts.push(d.polygon[j]);
    }
    if (pts.length < 3) return null;
    return ms.convexHull(pts);
  }

  // ─── render·从 core 调 ────────────────────────────────

  function renderPreview(ctx, camera){
    var EDITOR = ME.EDITOR;

    // ① split·活时·实时算 2 半
    if (EDITOR.activeTool === 'split' && EDITOR.splitState && EDITOR.splitState.point1 && EDITOR.mouse){
      var cutB = [EDITOR.mouse.worldX, EDITOR.mouse.worldY];
      var preview = previewSplit(EDITOR.splitState.divId, EDITOR.splitState.point1, cutB);
      if (preview){
        // 浅色 fill 2 半
        drawPolyFilled(ctx, preview.poly1, 'rgba(106,138,58,0.30)', '#6a8a3a');
        drawPolyFilled(ctx, preview.poly2, 'rgba(255,160,77,0.30)', '#c5a04d');
      }
    }

    // ② merge·preview 中
    if (_mergePreviewIds){
      var hull = previewMerge(_mergePreviewIds);
      if (hull && hull.length >= 3){
        drawPolyFilled(ctx, hull, 'rgba(255,160,77,0.20)', '#dc4f3a');
      }
    }
  }

  function drawPolyFilled(ctx, poly, fill, stroke){
    if (!poly || poly.length < 3) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++){
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke){
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2 / ME.EDITOR.camera.zoom;
      ctx.setLineDash([8 / ME.EDITOR.camera.zoom, 4 / ME.EDITOR.camera.zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // ─── 键盘·Shift+M 预览·M 提交 ────────────────────────

  function bindKeys(){
    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Shift+M·开 / 关 merge preview
      if (e.shiftKey && (e.key === 'M' || e.key === 'm')){
        e.preventDefault();
        if (_mergePreviewIds){
          clearMergePreview();
          if (global.meToast) meToast('合并预览·清', 'info', 1000);
          return;
        }
        var sel = ME.getSelected ? ME.getSelected() : [];
        if (sel.length < 2){
          if (global.meToast) meToast('合并预览·需 ≥ 2 省', 'warn');
          return;
        }
        var ids = sel.map(function(d){ return d.id; });
        setMergePreview(ids);
        if (global.meToast) meToast('合并预览·' + ids.length + ' 省·M 提交·Esc 撤', 'info', 2400);
        return;
      }

      // Esc·撤 merge preview
      if (e.key === 'Escape' && _mergePreviewIds){
        clearMergePreview();
        return;
      }
    });
  }

  // ─── init ──────────────────────────────────────────────

  function init(){
    bindKeys();
    // 选变 / map-loaded 时·清 merge preview·防 stale
    ME.on('map-loaded', clearMergePreview);
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.ghost = {
    init: init,
    previewSplit: previewSplit,
    previewMerge: previewMerge,
    setMergePreview: setMergePreview,
    clearMergePreview: clearMergePreview,
    isMergePreviewActive: isMergePreviewActive,
    renderPreview: renderPreview
  };

})(typeof window !== 'undefined' ? window : this);
