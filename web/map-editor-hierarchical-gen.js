// map-editor-hierarchical-gen.js
// Phase 20.4·hierarchical gen
//
// 路 → 府 → 县·递归 split·每级 N 子
// 选 1 个 division·sub-voronoi 分子·级递降·parentId 链
//
// subdivide(parentDiv, n, opts) → 创 N 子·新 level·继 parent 字段子集
// subdivideAll(level) → 全 level 上 div·各分 ~N 子
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[hierarchical-gen] core not loaded'); return; }

  // ─── 取 dynasty levels chain ──────────────────────────

  function getLevelsList(dynastyId){
    var dyn = TM.MapEditor.dynasty.get(dynastyId);
    if (!dyn || !dyn.levels) return [];
    return dyn.levels.map(function(l){ return l.key; });
  }

  function nextLevel(dynastyId, currentLevelKey){
    var lvls = getLevelsList(dynastyId);
    var idx = lvls.indexOf(currentLevelKey);
    if (idx < 0 || idx >= lvls.length - 1) return null;
    return lvls[idx + 1];
  }

  // ─── 在 polygon 内·rejection sample·避其外 ─────────────

  function samplePointsInPolygon(poly, n, minDist){
    if (!poly || poly.length < 3) return [];
    // 算 bbox
    var minX = poly[0][0], maxX = poly[0][0], minY = poly[0][1], maxY = poly[0][1];
    for (var i = 1; i < poly.length; i++){
      if (poly[i][0] < minX) minX = poly[i][0];
      if (poly[i][0] > maxX) maxX = poly[i][0];
      if (poly[i][1] < minY) minY = poly[i][1];
      if (poly[i][1] > maxY) maxY = poly[i][1];
    }
    var w = maxX - minX, h = maxY - minY;
    if (w < 4 || h < 4) return [];
    minDist = minDist || Math.sqrt(w * h / n) * 0.55;

    var seeds = [];
    var maxTries = n * 200;
    var tries = 0;
    while (seeds.length < n && tries < maxTries){
      tries++;
      var x = minX + Math.random() * w;
      var y = minY + Math.random() * h;
      if (!ME.pointInPolygon(x, y, poly)) continue;
      var ok = true;
      for (var k = 0; k < seeds.length; k++){
        var dx = x - seeds[k][0];
        var dy = y - seeds[k][1];
        if (dx * dx + dy * dy < minDist * minDist){ ok = false; break; }
      }
      if (ok) seeds.push([x, y]);
    }
    return seeds;
  }

  // ─── 简化·polygon AND polygon clip (Sutherland-Hodgman) ─

  // 凸 clip polygon (clipper)·非凸时近似不准但够用
  // 输入·subject (待 clip)·clipper (顺时针/逆时针均可)
  function clipPolygon(subject, clipper){
    if (!subject || !clipper || subject.length < 3 || clipper.length < 3) return subject || [];
    var output = subject.slice();
    var cn = clipper.length;
    for (var i = 0; i < cn; i++){
      var ce1 = clipper[i];
      var ce2 = clipper[(i + 1) % cn];
      var input = output;
      output = [];
      if (input.length === 0) break;
      var s = input[input.length - 1];
      for (var j = 0; j < input.length; j++){
        var e = input[j];
        if (insideEdge(e, ce1, ce2)){
          if (!insideEdge(s, ce1, ce2)){
            output.push(intersectEdge(s, e, ce1, ce2));
          }
          output.push(e);
        } else if (insideEdge(s, ce1, ce2)){
          output.push(intersectEdge(s, e, ce1, ce2));
        }
        s = e;
      }
    }
    return output;
  }

  function insideEdge(p, a, b){
    // left of edge a→b
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
  }
  function intersectEdge(p, q, a, b){
    var x1 = p[0], y1 = p[1], x2 = q[0], y2 = q[1];
    var x3 = a[0], y3 = a[1], x4 = b[0], y4 = b[1];
    var denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-9) return [x2, y2];
    var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }

  // ─── 主·subdivide ─────────────────────────────────────

  function subdivide(parentDiv, n, opts){
    opts = opts || {};
    if (!parentDiv || !parentDiv.polygon || parentDiv.polygon.length < 3){
      if (global.meToast) meToast('parent polygon 异常·无法分', 'error');
      return [];
    }
    var dyn = ME.EDITOR.map.dynasty;
    var nextL = nextLevel(dyn, parentDiv.level);
    if (!nextL){
      if (global.meToast) meToast(parentDiv.level + ' 是最末级·无下层', 'warn');
      return [];
    }

    var seeds = samplePointsInPolygon(parentDiv.polygon, n);
    if (seeds.length < 2){
      if (global.meToast) meToast('seed 不足·polygon 太小或 n 太大', 'warn');
      return [];
    }

    // 算 bbox 作 voronoi bounds
    var bb = parentDiv.bbox || (function(){
      var mx = parentDiv.polygon[0][0], Mx = mx, my = parentDiv.polygon[0][1], My = my;
      for (var i = 1; i < parentDiv.polygon.length; i++){
        if (parentDiv.polygon[i][0] < mx) mx = parentDiv.polygon[i][0];
        if (parentDiv.polygon[i][0] > Mx) Mx = parentDiv.polygon[i][0];
        if (parentDiv.polygon[i][1] < my) my = parentDiv.polygon[i][1];
        if (parentDiv.polygon[i][1] > My) My = parentDiv.polygon[i][1];
      }
      return { x: mx - 5, y: my - 5, w: Mx - mx + 10, h: My - my + 10 };
    })();

    // Lloyd 几次让 seed 均布
    if (TM.MapEditor.voronoi && TM.MapEditor.voronoi.lloydsRelaxation){
      var lr = opts.lloyd != null ? opts.lloyd : 3;
      if (lr > 0){
        // lloyd 内部·重 voronoi·然后 reject 出 polygon 的
        var refined = seeds.slice();
        for (var it = 0; it < lr; it++){
          var cells0 = TM.MapEditor.voronoi.computeCells(refined, bb);
          refined = cells0.map(function(c, i){
            if (c.length < 3) return refined[i];
            var ct = ME.polygonCentroid(c) || refined[i];
            // 若 centroid 出 polygon·拉回·或留旧
            if (!ME.pointInPolygon(ct[0], ct[1], parentDiv.polygon)) return refined[i];
            return ct;
          });
        }
        seeds = refined;
      }
    }

    var cells = TM.MapEditor.voronoi
      ? TM.MapEditor.voronoi.computeCells(seeds, bb)
      : [];
    if (!cells.length) return [];

    // 每 cell·clip to parent polygon
    var children = [];
    for (var i = 0; i < cells.length; i++){
      var clipped = clipPolygon(cells[i], parentDiv.polygon);
      if (!clipped || clipped.length < 3) continue;

      var child = ME.createDivision({
        name: (parentDiv.name || 'P') + '·子' + (i + 1),
        level: nextL,
        // 继承父字段
        regionType: parentDiv.regionType,
        polygon: clipped
      });
      // 自治·继 parent
      if (parentDiv.autonomy){
        child.autonomy = Object.assign({}, parentDiv.autonomy);
      }
      // parentId·非标准 schema·扩
      child.parentId = parentDiv.id;
      child.region = parentDiv.region || parentDiv.regionType;
      ME.recomputeDerived(child);
      children.push(child);
    }
    return children;
  }

  // ─── 全 level·subdivide·替换 / 共存 ───────────────────

  // opts: { childrenPerParent (default 4), removeParents (default false·共存),
  //         level (filter·only div with this level), targetTotal (alternative to childrenPerParent) }
  function subdivideAll(opts){
    opts = opts || {};
    var levelFilter = opts.level;
    var per = opts.childrenPerParent || 4;
    var removeParents = !!opts.removeParents;

    var divs = ME.EDITOR.map.divisions.slice();
    var parents = levelFilter
      ? divs.filter(function(d){ return d.level === levelFilter; })
      : divs;

    if (parents.length === 0){
      if (global.meToast) meToast('未找 ' + (levelFilter || '全') + ' level 的 div', 'warn');
      return 0;
    }

    var allChildren = [];
    parents.forEach(function(p){
      var ch = subdivide(p, per, opts);
      allChildren.push.apply(allChildren, ch);
    });

    if (allChildren.length === 0){
      if (global.meToast) meToast('未生子·polygon 太小或参数不合', 'warn');
      return 0;
    }

    ME.commitMutation('hierarchical·' + parents.length + ' parent → ' + allChildren.length + ' child', function(){
      // 加子
      allChildren.forEach(function(ch){
        ME.EDITOR.map.divisions.push(ch);
      });
      // 删父 (可选)
      if (removeParents){
        var keepIds = {};
        ME.EDITOR.map.divisions.forEach(function(d){
          if (parents.indexOf(d) < 0) keepIds[d.id] = 1;
        });
        ME.EDITOR.map.divisions = ME.EDITOR.map.divisions.filter(function(d){
          return keepIds[d.id] || allChildren.indexOf(d) >= 0;
        });
      }
    });

    if (global.meToast){
      meToast('subdivide·' + parents.length + ' 父 → ' + allChildren.length + ' 子' + (removeParents ? '·父删' : '·父留'), 'success');
    }
    return allChildren.length;
  }

  // ─── 命令·subdivide selected ───────────────────────────

  function subdivideSelected(n, opts){
    var sel = ME.getSelected ? ME.getSelected() : [];
    if (sel.length === 0){
      if (global.meToast) meToast('未选省·先 V 选 1', 'warn');
      return 0;
    }
    n = n || 4;
    var totalChild = 0;
    var allChildren = [];
    sel.forEach(function(p){
      var ch = subdivide(p, n, opts);
      allChildren.push.apply(allChildren, ch);
    });
    if (!allChildren.length){
      if (global.meToast) meToast('未生子·polygon 不合', 'warn');
      return 0;
    }
    ME.commitMutation('subdivide selected·' + sel.length + ' → ' + allChildren.length, function(){
      allChildren.forEach(function(ch){ ME.EDITOR.map.divisions.push(ch); });
    });
    if (global.meToast){
      meToast('选省 → ' + allChildren.length + ' 子', 'success');
    }
    return allChildren.length;
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.hierarchicalGen = {
    subdivide: subdivide,
    subdivideAll: subdivideAll,
    subdivideSelected: subdivideSelected,
    samplePointsInPolygon: samplePointsInPolygon,
    clipPolygon: clipPolygon,
    nextLevel: nextLevel,
    getLevelsList: getLevelsList
  };

})(typeof window !== 'undefined' ? window : this);
