// map-editor-merge-split.js
// merge·  shared-edge walk + convex hull fallback
// split·  2-crossing 简单 split·user click 两点·切线穿 polygon
// 数值合并·  按字段类型 (sum / weighted avg / first / merge)
// 数值分割·  按面积比例
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[merge-split] core not loaded'); return; }

  var EPS = 0.5;

  // ─── geometry helpers ────────────────────────────────────

  function distSq(a, b){
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return dx*dx + dy*dy;
  }

  // ─── convex hull (Andrew monotone chain) ─────────────────

  function convexHull(points){
    if (points.length < 3) return points.slice();
    var pts = points.slice().sort(function(a, b){
      return a[0] - b[0] || a[1] - b[1];
    });
    var n = pts.length;
    var hull = [];
    // lower
    for (var i = 0; i < n; i++){
      while (hull.length >= 2 && cross3(hull[hull.length-2], hull[hull.length-1], pts[i]) <= 0){
        hull.pop();
      }
      hull.push(pts[i]);
    }
    // upper
    var t = hull.length + 1;
    for (var k = n - 2; k >= 0; k--){
      while (hull.length >= t && cross3(hull[hull.length-2], hull[hull.length-1], pts[k]) <= 0){
        hull.pop();
      }
      hull.push(pts[k]);
    }
    hull.pop();
    return hull;
  }

  function cross3(O, A, B){
    return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
  }

  // ─── shared-edge walk·真 union 路径 ─────────────────────

  function tryAdjacentMerge(polygons){
    // 收集 all edges with poly idx + edge idx
    var edges = [];
    polygons.forEach(function(poly, pIdx){
      for (var i = 0; i < poly.length; i++){
        var j = (i + 1) % poly.length;
        edges.push({ from: poly[i], to: poly[j], polyIdx: pIdx });
      }
    });

    // 标记 shared (reverse exists in OTHER polygon)
    var shared = new Array(edges.length).fill(false);
    for (var i = 0; i < edges.length; i++){
      if (shared[i]) continue;
      var e = edges[i];
      for (var j = i + 1; j < edges.length; j++){
        if (shared[j]) continue;
        var f = edges[j];
        if (e.polyIdx === f.polyIdx) continue;
        // 反向匹配
        if (distSq(e.from, f.to) < EPS*EPS && distSq(e.to, f.from) < EPS*EPS){
          shared[i] = true; shared[j] = true;
          break;
        }
        // 同向 (重叠 polygon·算 shared)
        if (distSq(e.from, f.from) < EPS*EPS && distSq(e.to, f.to) < EPS*EPS){
          shared[i] = true; shared[j] = true;
          break;
        }
      }
    }

    // 收 keepers (非 shared)
    var keepers = [];
    for (var k = 0; k < edges.length; k++){
      if (!shared[k]) keepers.push(edges[k]);
    }

    if (keepers.length < 3) return null;

    // walk·从 keepers[0]·下一边 from ≈ 当前 to
    var visited = {};
    var boundary = [keepers[0].from.slice()];
    visited[0] = true;
    var current = keepers[0].to;
    var safety = 0;

    while (Object.keys(visited).length < keepers.length){
      if (++safety > keepers.length * 3) break;
      var nextIdx = -1;
      for (var n = 0; n < keepers.length; n++){
        if (visited[n]) continue;
        if (distSq(keepers[n].from, current) < EPS*EPS){
          nextIdx = n;
          break;
        }
      }
      if (nextIdx === -1){
        // can't continue·polygon 断·失败
        return null;
      }
      boundary.push(keepers[nextIdx].from.slice());
      current = keepers[nextIdx].to;
      visited[nextIdx] = true;
    }

    // close check·from start to current
    if (distSq(boundary[0], current) > EPS*EPS){
      // 不闭合·失败
      return null;
    }

    return boundary;
  }

  // ─── public·merge ────────────────────────────────────────

  function mergeDivisions(divIds){
    if (!divIds || divIds.length < 2){
      meAlert('合并需 ≥ 2 省·shift 多选');
      return false;
    }
    var divs = divIds.map(function(id){
      return ME.EDITOR.map.divisions.find(function(D){ return D.id === id; });
    }).filter(Boolean);
    if (divs.length < 2) return false;

    // 收集所有 polygons (主 + 飞地) from all divisions
    var allPolys = [];
    divs.forEach(function(d){
      var ps = ME.getAllPolygons ? ME.getAllPolygons(d) : [d.polygon];
      ps.forEach(function(p){
        if (p && p.length >= 3) allPolys.push(p);
      });
    });
    if (allPolys.length < 2){
      meAlert('参与合并的 polygon 不足·检查后再试');
      return false;
    }

    // 试 shared-edge walk·合所有 polygons
    var mergedPoly = tryAdjacentMerge(allPolys);
    var extraPolygonsResult = [];
    var method = 'shared-edge';

    if (!mergedPoly || mergedPoly.length < 3){
      // 路径 2·multi-polygon 保留·最大 polygon 作主·余作飞地
      // 比 convex hull 更准·user 后期可手动 merge 调整
      var sortedByArea = allPolys.slice().sort(function(a, b){
        return ME.polygonArea(b) - ME.polygonArea(a);
      });
      mergedPoly = sortedByArea[0];
      extraPolygonsResult = sortedByArea.slice(1);
      method = 'multi-polygon';
    }

    if (!mergedPoly || mergedPoly.length < 3){
      // 极端 fallback·convex hull
      var allPoints = [];
      allPolys.forEach(function(p){ allPoints = allPoints.concat(p); });
      mergedPoly = convexHull(allPoints);
      extraPolygonsResult = [];
      method = 'convex-hull';
    }

    if (mergedPoly.length < 3){
      meAlert('合并失败·polygon 数据有误');
      return false;
    }

    // 计算面积·用于 weighted avg
    var totalArea = divs.reduce(function(s, d){ return s + (d.area || 0); }, 0);
    if (totalArea === 0) totalArea = divs.length; // 避免 div by 0

    // 数值合并
    var mergedFields = {
      // identity·取第一个为底
      name: divs[0].name + (divs.length > 1 ? '·合' : ''),
      level: divs[0].level,
      regionType: divs[0].regionType,
      description: divs.map(function(d){ return d.name; }).join(' + '),
      officialPosition: divs[0].officialPosition,
      governor: divs[0].governor,
      dejureOwner: divs[0].dejureOwner,
      capitalChildId: divs[0].capitalChildId,
      crossDynastyId: '',  // 合并后清·user 重链
      sources: divs.reduce(function(s, d){ return s.concat(d.sources || []); }, []),

      // pop·sum
      populationDetail: {
        households: divs.reduce(function(s, d){ return s + ((d.populationDetail||{}).households || 0); }, 0),
        mouths: divs.reduce(function(s, d){ return s + ((d.populationDetail||{}).mouths || 0); }, 0),
        ding: divs.reduce(function(s, d){ return s + ((d.populationDetail||{}).ding || 0); }, 0),
        fugitives: divs.reduce(function(s, d){ return s + ((d.populationDetail||{}).fugitives || 0); }, 0),
        hiddenCount: divs.reduce(function(s, d){ return s + ((d.populationDetail||{}).hiddenCount || 0); }, 0)
      },

      // ratio map·weighted avg by area
      byEthnicity: weightedRatioMerge(divs.map(function(d){ return { ratio: d.byEthnicity, weight: d.area || 1 }; })),
      byFaith: weightedRatioMerge(divs.map(function(d){ return { ratio: d.byFaith, weight: d.area || 1 }; })),

      // econ·weighted avg
      prosperity: Math.round(weightedAvg(divs.map(function(d){ return { v: d.prosperity, w: d.area || 1 }; }))),
      taxLevel: divs[0].taxLevel,
      terrain: divs[0].terrain,
      specialResources: divs.map(function(d){ return d.specialResources; }).filter(Boolean).join(' / '),

      // gov·weighted avg
      minxinLocal: Math.round(weightedAvg(divs.map(function(d){ return { v: d.minxinLocal, w: d.area || 1 }; }))),
      corruptionLocal: Math.round(weightedAvg(divs.map(function(d){ return { v: d.corruptionLocal, w: d.area || 1 }; }))),
      autonomy: divs[0].autonomy,

      // history·earliest established·latest abolished
      establishedYear: minOrNull(divs.map(function(d){ return d.establishedYear; })),
      abolishedYear: maxOrNull(divs.map(function(d){ return d.abolishedYear; })),

      // timeline·concat·去重 by year
      timeline: dedupeTimeline(divs.reduce(function(s, d){ return s.concat(d.timeline || []); }, [])),

      // flags·OR (任一 true 则 true)
      isCapital: divs.some(function(d){ return d.isCapital; }),
      isFrontier: divs.some(function(d){ return d.isFrontier; }),
      isJunDi: divs.some(function(d){ return d.isJunDi; }),
      isTunTian: divs.some(function(d){ return d.isTunTian; }),
      isTradePort: divs.some(function(d){ return d.isTradePort; }),
      isPiao: divs.some(function(d){ return d.isPiao; }),
      isPilgrim: divs.some(function(d){ return d.isPilgrim; }),
      isHistoric: divs.some(function(d){ return d.isHistoric; }),
      isDeposit: divs.some(function(d){ return d.isDeposit; })
    };

    var extraInfo = extraPolygonsResult.length > 0 ? ('\n飞地·' + extraPolygonsResult.length + ' 块') : '';
    if (!confirm('合并 ' + divs.length + ' 省 → 1 省·\n方法·' + method + '\n名→ "' + mergedFields.name + '"\n人口和→ ' + mergedFields.populationDetail.mouths + extraInfo + '\n确认?')) return false;

    var newDiv = ME.createDivision(Object.assign({
      polygon: mergedPoly,
      extraPolygons: extraPolygonsResult
    }, mergedFields));
    ME.recomputeDerived(newDiv);

    // 一个 mutation·删旧 + 加新
    var TP = global.TM && TM.MapEditor.topology;
    var topoOn = TP && TP.isEnabled();
    ME.commitMutation('merge ' + divs.length + ' divs', function(){
      divs.forEach(function(d){
        if (topoOn) TP.removeDivisionFromTopology(d.id);
        ME.EDITOR.map.divisions = ME.EDITOR.map.divisions.filter(function(D){ return D.id !== d.id; });
      });
      ME.EDITOR.map.divisions.push(newDiv);
      if (topoOn) TP.syncDivisionToTopology(ME.EDITOR.map, newDiv);
    });
    ME.selectOne(newDiv.id);

    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = '已合并·' + divs.length + ' 省 → "' + mergedFields.name + '" (方法·' + method + ')';
    return true;
  }

  function weightedAvg(items){
    var sumW = 0, sumVW = 0;
    items.forEach(function(it){
      if (it.v == null) return;
      sumW += it.w || 0;
      sumVW += (it.v || 0) * (it.w || 0);
    });
    return sumW === 0 ? 0 : sumVW / sumW;
  }

  function weightedRatioMerge(items){
    // items·[{ ratio: { key: pct }, weight }]
    var totalW = items.reduce(function(s, it){ return s + (it.weight || 0); }, 0);
    if (totalW === 0) return null;
    var hasAny = items.some(function(it){ return it.ratio && Object.keys(it.ratio).length > 0; });
    if (!hasAny) return null;
    var merged = {};
    items.forEach(function(it){
      if (!it.ratio) return;
      var w = (it.weight || 0) / totalW;
      Object.keys(it.ratio).forEach(function(k){
        merged[k] = (merged[k] || 0) + (it.ratio[k] || 0) * w;
      });
    });
    // round to 3 decimals
    Object.keys(merged).forEach(function(k){
      merged[k] = Math.round(merged[k] * 1000) / 1000;
    });
    return merged;
  }

  function minOrNull(arr){
    var nums = arr.filter(function(v){ return v != null && !isNaN(v); });
    if (nums.length === 0) return null;
    return Math.min.apply(null, nums);
  }
  function maxOrNull(arr){
    var nums = arr.filter(function(v){ return v != null && !isNaN(v); });
    if (nums.length === 0) return null;
    return Math.max.apply(null, nums);
  }

  function dedupeTimeline(snaps){
    var byYear = {};
    snaps.forEach(function(s){
      if (s.year == null) return;
      if (!byYear[s.year]) byYear[s.year] = s;
      else byYear[s.year] = Object.assign({}, byYear[s.year], s);
    });
    return Object.keys(byYear).map(function(y){ return byYear[y]; }).sort(function(a,b){ return a.year - b.year; });
  }

  // ─── split (2-crossing) ──────────────────────────────────

  // 求 segment AB ∩ segment CD·返回 t1 (沿 AB·0-1) + 交点
  // 注·t-tolerance 用 1e-9·EPS=0.5 是 distance·不能用作 parameter 容差·会误判
  var T_EPS = 1e-9;
  function segmentIntersect(a, b, c, d){
    var x1 = a[0], y1 = a[1];
    var x2 = b[0], y2 = b[1];
    var x3 = c[0], y3 = c[1];
    var x4 = d[0], y4 = d[1];
    var dx1 = x2 - x1, dy1 = y2 - y1;
    var dx2 = x4 - x3, dy2 = y4 - y3;
    var denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-9) return null; // 平行
    var t1 = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denom;
    var t2 = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denom;
    if (t1 < -T_EPS || t1 > 1 + T_EPS) return null;
    if (t2 < -T_EPS || t2 > 1 + T_EPS) return null;
    var px = x1 + t1 * dx1;
    var py = y1 + t1 * dy1;
    return { t1: t1, t2: t2, point: [px, py] };
  }

  // 找 polygon 与切线的所有交·返回 [{ edgeIdx, t, point }]
  // dedup·vertex hit 会被相邻 2 edge 各报一次·按 distance < EPS 去重
  function findCrossings(poly, cutA, cutB){
    var crossings = [];
    for (var i = 0; i < poly.length; i++){
      var p1 = poly[i];
      var p2 = poly[(i + 1) % poly.length];
      var hit = segmentIntersect(p1, p2, cutA, cutB);
      if (hit){
        // vertex tangent·t1 ≈ 1 (终点) 时·下条边的 t1 ≈ 0 会同点·跳后者
        var dup = false;
        for (var k = 0; k < crossings.length; k++){
          var dx = crossings[k].point[0] - hit.point[0];
          var dy = crossings[k].point[1] - hit.point[1];
          if (dx*dx + dy*dy < EPS*EPS){ dup = true; break; }
        }
        if (!dup){
          crossings.push({ edgeIdx: i, t: hit.t1, point: hit.point });
        }
      }
    }
    return crossings;
  }

  // 把用户两点延伸成"穿过整个 bbox"的长线·让用户能在 polygon 内部点 2 点画方向·算法自动延到边
  function _extendCut(a, b, bbox){
    var dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return { a: a.slice(), b: b.slice() };
    // 估算 bbox 对角作上限·延伸 K = (对角 / 段长 + 2)·确保穿出
    var diag = Math.sqrt(
      Math.pow(bbox.maxX - bbox.minX, 2) +
      Math.pow(bbox.maxY - bbox.minY, 2)
    ) || 1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var K = Math.max(2, diag / len + 2);
    return {
      a: [a[0] - dx * K, a[1] - dy * K],
      b: [b[0] + dx * K, b[1] + dy * K]
    };
  }

  // 按 click 位置选目标 polygon·主 / 哪个飞地
  // 1·若 cutA 在某 polygon 内·选它  2·若 cutB 在·选它  3·否则取离 click 中点 centroid 最近的 polygon
  function _pickTargetPolygon(allPs, cutA, cutB){
    var pip = ME.pointInPolygon;
    if (pip){
      for (var i = 0; i < allPs.length; i++){
        if (pip(cutA[0], cutA[1], allPs[i])) return i;
      }
      for (var j = 0; j < allPs.length; j++){
        if (pip(cutB[0], cutB[1], allPs[j])) return j;
      }
    }
    // 退路·距 click 中点最近 polygon
    var mid = [(cutA[0] + cutB[0]) / 2, (cutA[1] + cutB[1]) / 2];
    var bestIdx = -1, bestD = Infinity;
    for (var k = 0; k < allPs.length; k++){
      var c = ME.polygonCentroid ? ME.polygonCentroid(allPs[k]) : null;
      if (!c) continue;
      var dd = (c[0]-mid[0])*(c[0]-mid[0]) + (c[1]-mid[1])*(c[1]-mid[1]);
      if (dd < bestD){ bestD = dd; bestIdx = k; }
    }
    // 距离阈值·click 中点距最近 centroid > 5*polygon 对角·算"太远"
    if (bestIdx >= 0){
      var bbox = _polygonBbox(allPs[bestIdx]);
      var diag = Math.sqrt((bbox.maxX-bbox.minX)*(bbox.maxX-bbox.minX) + (bbox.maxY-bbox.minY)*(bbox.maxY-bbox.minY)) || 1;
      if (Math.sqrt(bestD) > diag * 5) return -1;
    }
    return bestIdx;
  }

  // 退路·全 polygon 扫描·返回首个有 2 交的
  function _scanAllForCrossings(allPs, cutA, cutB){
    for (var i = 0; i < allPs.length; i++){
      var ext = _extendCut(cutA, cutB, _polygonBbox(allPs[i]));
      var crs = findCrossings(allPs[i], ext.a, ext.b);
      if (crs.length === 2) return { idx: i, crossings: crs };
    }
    return null;
  }

  function _polygonBbox(poly){
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < poly.length; i++){
      if (poly[i][0] < minX) minX = poly[i][0];
      if (poly[i][0] > maxX) maxX = poly[i][0];
      if (poly[i][1] < minY) minY = poly[i][1];
      if (poly[i][1] > maxY) maxY = poly[i][1];
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function splitDivisionByLine(divId, cutA, cutB){
    var d = ME.EDITOR.map.divisions.find(function(D){ return D.id === divId; });
    if (!d || !d.polygon || d.polygon.length < 3){
      meAlert('选省 polygon 异常');
      return false;
    }

    var allPs = ME.getAllPolygons ? ME.getAllPolygons(d) : [d.polygon];

    // 第 1 步·按 click 位置定位目标 polygon (主 / 哪个飞地)
    // 优先 point1·若 point1 在内则选它·否则 point2·否则距 click 中点最近的 polygon
    var targetIdx = _pickTargetPolygon(allPs, cutA, cutB);

    console.log('[split] divId=' + divId + ' polyCount=' + allPs.length + ' targetIdx=' + targetIdx + ' cutA=' + JSON.stringify(cutA) + ' cutB=' + JSON.stringify(cutB));

    if (targetIdx === -1){
      meAlert('切线两点离 division 太远·点击 division 内 (含飞地) 重试');
      return false;
    }

    // 第 2 步·对目标 polygon·延伸切线·算 2 交
    var poly = allPs[targetIdx];
    var ext = _extendCut(cutA, cutB, _polygonBbox(poly));
    var crossings = findCrossings(poly, ext.a, ext.b);
    console.log('[split] target poly len=' + poly.length + ' crossings=' + crossings.length);

    if (crossings.length < 2){
      // 退路·全 polygon 扫描·万一 click 落在 polygon 外但方向恰好穿其他 polygon
      var fallback = _scanAllForCrossings(allPs, cutA, cutB);
      if (fallback){
        targetIdx = fallback.idx;
        poly = allPs[targetIdx];
        crossings = fallback.crossings;
        console.log('[split] fallback hit polyIdx=' + targetIdx);
      } else {
        // 全 polygon 都失败·log 每个 polygon 的尝试结果·辅助 debug
        for (var dbgI = 0; dbgI < allPs.length; dbgI++){
          var dbgExt = _extendCut(cutA, cutB, _polygonBbox(allPs[dbgI]));
          var dbgCrs = findCrossings(allPs[dbgI], dbgExt.a, dbgExt.b);
          console.warn('[split] poly#' + dbgI + ' (len=' + allPs[dbgI].length + ') crossings=' + dbgCrs.length);
        }
        meAlert('切线方向无法穿过目标 polygon·稍倾斜切线方向重试 (polygon 凹陷或切线擦边·F12 看 console)');
        return false;
      }
    } else if (crossings.length > 2){
      // 凹陷 polygon·取距 click 中点最近的 2 交·user 大概率想切的就是这条
      var mid = [(cutA[0] + cutB[0]) / 2, (cutA[1] + cutB[1]) / 2];
      crossings.sort(function(a, b){
        var da = (a.point[0]-mid[0])*(a.point[0]-mid[0]) + (a.point[1]-mid[1])*(a.point[1]-mid[1]);
        var db = (b.point[0]-mid[0])*(b.point[0]-mid[0]) + (b.point[1]-mid[1])*(b.point[1]-mid[1]);
        return da - db;
      });
      crossings = crossings.slice(0, 2);
    }

    // sort by edgeIdx (asc) + t (asc within edge)
    crossings.sort(function(a, b){
      if (a.edgeIdx !== b.edgeIdx) return a.edgeIdx - b.edgeIdx;
      return a.t - b.t;
    });

    // 构 poly1·crossing[0] → 沿 polygon forward → crossing[1]
    var c0 = crossings[0], c1 = crossings[1];
    var poly1 = [c0.point.slice()];
    for (var k = c0.edgeIdx + 1; ; k++){
      var idx = k % poly.length;
      if (idx === (c1.edgeIdx + 1) % poly.length) break;
      poly1.push(poly[idx].slice());
      if (poly1.length > poly.length + 2) break; // safety
    }
    poly1.push(c1.point.slice());

    // 构 poly2·crossing[1] → 沿 polygon forward (wrap) → crossing[0]
    var poly2 = [c1.point.slice()];
    for (var m = c1.edgeIdx + 1; ; m++){
      var idx2 = m % poly.length;
      if (idx2 === (c0.edgeIdx + 1) % poly.length) break;
      poly2.push(poly[idx2].slice());
      if (poly2.length > poly.length + 2) break; // safety
    }
    poly2.push(c0.point.slice());

    if (poly1.length < 3 || poly2.length < 3){
      meAlert('split 后 polygon < 3 顶·切线位置过于偏侧·重试');
      return false;
    }

    // 飞地分割·targetIdx > 0·只替换该飞地·不创建新 division
    if (targetIdx > 0){
      var exclaveIdx = targetIdx - 1;
      if (!confirm('分割飞地 #' + (exclaveIdx + 1) + ' (' + d.name + ') → 2 飞地·确认?')) return false;
      var TPe = global.TM && TM.MapEditor.topology;
      var topoOnE = TPe && TPe.isEnabled();
      ME.commitMutation('split exclave', function(){
        d.extraPolygons.splice(exclaveIdx, 1, poly1, poly2);
        ME.recomputeDerived(d);
        if (topoOnE){
          TPe.removeDivisionFromTopology(d.id);
          TPe.syncDivisionToTopology(ME.EDITOR.map, d);
        }
      });
      var statusEl = document.getElementById('status-tip');
      if (statusEl) statusEl.textContent = '飞地分割·#' + (exclaveIdx + 1) + ' → 2 飞地';
      return true;
    }

    // 主 polygon 分割·按面积比·分 2 division
    // area 计算·分配数值
    var area1 = ME.polygonArea(poly1);
    var area2 = ME.polygonArea(poly2);
    var totalA = area1 + area2;
    if (totalA === 0){ meAlert('split 后 area = 0·几何异常'); return false; }
    var r1 = area1 / totalA;
    var r2 = area2 / totalA;

    var pd = d.populationDetail || {};
    var fd = d.fiscalDetail || {};
    var pt = d.publicTreasuryInit || {};

    function makeChild(name, ratio, polyIn){
      var nd = ME.createDivision({
        name: name,
        level: d.level,
        regionType: d.regionType,
        description: d.description,
        officialPosition: d.officialPosition,
        governor: d.governor,
        dejureOwner: d.dejureOwner,
        terrain: d.terrain,
        specialResources: d.specialResources,
        polygon: polyIn,
        crossDynastyId: '',  // 分裂后清·user 重链
        sources: (d.sources || []).slice(),

        populationDetail: {
          households: Math.round((pd.households || 0) * ratio),
          mouths: Math.round((pd.mouths || 0) * ratio),
          ding: Math.round((pd.ding || 0) * ratio),
          fugitives: Math.round((pd.fugitives || 0) * ratio),
          hiddenCount: Math.round((pd.hiddenCount || 0) * ratio)
        },
        byEthnicity: d.byEthnicity ? Object.assign({}, d.byEthnicity) : null,
        byFaith: d.byFaith ? Object.assign({}, d.byFaith) : null,

        // econ·prosperity / minxin / corruption 不变·area-independent
        prosperity: d.prosperity,
        taxLevel: d.taxLevel,
        carryingCapacity: d.carryingCapacity ? scaleNumeric(d.carryingCapacity, ratio, ['arable','water','historicalCap','currentLoad']) : null,
        fiscalDetail: {
          claimedRevenue: Math.round((fd.claimedRevenue || 0) * ratio),
          actualRevenue: Math.round((fd.actualRevenue || 0) * ratio),
          remittedToCenter: Math.round((fd.remittedToCenter || 0) * ratio),
          retainedBudget: Math.round((fd.retainedBudget || 0) * ratio),
          compliance: fd.compliance,
          skimmingRate: fd.skimmingRate,
          autonomyLevel: fd.autonomyLevel
        },
        publicTreasuryInit: {
          money: Math.round((pt.money || 0) * ratio),
          grain: Math.round((pt.grain || 0) * ratio),
          cloth: Math.round((pt.cloth || 0) * ratio)
        },

        minxinLocal: d.minxinLocal,
        corruptionLocal: d.corruptionLocal,
        autonomy: d.autonomy ? Object.assign({}, d.autonomy) : null,

        timeline: (d.timeline || []).slice(),  // 复制·user 后期分别 prune
        establishedYear: d.establishedYear,
        abolishedYear: d.abolishedYear,

        isCapital: false,
        isFrontier: d.isFrontier,
        isJunDi: d.isJunDi,
        isTunTian: d.isTunTian,
        isTradePort: d.isTradePort,
        isPiao: d.isPiao,
        isPilgrim: d.isPilgrim,
        isHistoric: d.isHistoric,
        isDeposit: d.isDeposit
      });
      ME.recomputeDerived(nd);
      return nd;
    }

    var name1 = d.name + '·甲';
    var name2 = d.name + '·乙';
    var child1 = makeChild(name1, r1, poly1);
    var child2 = makeChild(name2, r2, poly2);

    // 飞地·area 比例分配到甲乙·按 centroid 距离 (近哪边归哪)
    if (d.extraPolygons && d.extraPolygons.length > 0){
      var c1 = ME.polygonCentroid(poly1);
      var c2 = ME.polygonCentroid(poly2);
      var ex1 = [], ex2 = [];
      d.extraPolygons.forEach(function(ep){
        var ec = ME.polygonCentroid(ep);
        if (!ec){ ex1.push(ep); return; }
        var d1Sq = c1 ? (c1[0]-ec[0])*(c1[0]-ec[0]) + (c1[1]-ec[1])*(c1[1]-ec[1]) : Infinity;
        var d2Sq = c2 ? (c2[0]-ec[0])*(c2[0]-ec[0]) + (c2[1]-ec[1])*(c2[1]-ec[1]) : Infinity;
        if (d1Sq <= d2Sq) ex1.push(ep); else ex2.push(ep);
      });
      child1.extraPolygons = ex1;
      child2.extraPolygons = ex2;
      ME.recomputeDerived(child1);
      ME.recomputeDerived(child2);
    }

    var extraNote = (d.extraPolygons && d.extraPolygons.length > 0) ? ('\n飞地分配·甲 ' + (child1.extraPolygons || []).length + ' / 乙 ' + (child2.extraPolygons || []).length) : '';
    if (!confirm('分割 ' + d.name + ' → 2 省·\n甲 (' + Math.round(r1*100) + '% 面积·人口 ' + child1.populationDetail.mouths + ')\n乙 (' + Math.round(r2*100) + '%·' + child2.populationDetail.mouths + ')' + extraNote + '\n确认?')) return false;

    var TPs = global.TM && TM.MapEditor.topology;
    var topoOnS = TPs && TPs.isEnabled();
    ME.commitMutation('split ' + d.name, function(){
      if (topoOnS) TPs.removeDivisionFromTopology(d.id);
      ME.EDITOR.map.divisions = ME.EDITOR.map.divisions.filter(function(D){ return D.id !== d.id; });
      ME.EDITOR.map.divisions.push(child1);
      ME.EDITOR.map.divisions.push(child2);
      if (topoOnS){
        TPs.syncDivisionToTopology(ME.EDITOR.map, child1);
        TPs.syncDivisionToTopology(ME.EDITOR.map, child2);
      }
    });
    ME.selectOne(child1.id);

    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = '已分割·' + d.name + ' → 甲(' + Math.round(r1*100) + '%) + 乙(' + Math.round(r2*100) + '%)';
    return true;
  }

  function scaleNumeric(obj, ratio, keys){
    var out = Object.assign({}, obj);
    keys.forEach(function(k){
      if (typeof out[k] === 'number'){
        out[k] = Math.round(out[k] * ratio);
      }
    });
    return out;
  }

  // ─── public api ──────────────────────────────────────────

  function mergeSelected(){
    var sel = ME.getSelected();
    if (sel.length < 2){
      meAlert('合并需 ≥ 2 省·V 工具 shift 多选');
      return false;
    }
    var ids = sel.map(function(d){ return d.id; });
    return mergeDivisions(ids);
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.mergeSplit = {
    mergeDivisions: mergeDivisions,
    mergeSelected: mergeSelected,
    splitDivisionByLine: splitDivisionByLine,
    extendCut: _extendCut,
    polygonBbox: _polygonBbox,
    convexHull: convexHull,
    tryAdjacentMerge: tryAdjacentMerge,
    segmentIntersect: segmentIntersect
  };

})(typeof window !== 'undefined' ? window : this);
