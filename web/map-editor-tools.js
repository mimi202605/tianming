// map-editor-tools.js
// 工具行为·绑定 canvas mouse/keyboard
// V·select  P·pen  E·edit  H·hand  Z·zoom
// (M·merge  S·split  T·text  A·AI fill·阶段 2 加)
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[tools] core not loaded'); return; }

  var EDITOR = ME.EDITOR;

  // ─── helpers ───────────────────────────────────────────────

  // 缩放抵消因子：移动端 fit 把整个编辑器 body 做了 CSS transform 缩放（御案 contain 范式），
  // 此时 getBoundingClientRect() 返回的是缩放后可视尺寸，而 screenToWorld 期望画布 CSS 坐标（style.width 那套）。
  // offsetWidth=布局宽(不受 transform 影响)，rect.width=可视宽(=布局宽×scale) → 因子 offsetWidth/rect.width=1/scale，
  // 把可视偏移换回画布 CSS 坐标。桌面无缩放时 offsetWidth==rect.width → 因子 1 → 零回归。
  function _csf(c, rect){
    var ow = c.offsetWidth, oh = c.offsetHeight;
    return { fx: (ow && rect.width) ? ow / rect.width : 1, fy: (oh && rect.height) ? oh / rect.height : 1 };
  }
  function getMousePos(e){
    var c = EDITOR.canvas;
    var rect = c.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var sf = _csf(c, rect);
    var sx = (e.clientX - rect.left) * sf.fx;
    var sy = (e.clientY - rect.top) * sf.fy;
    var w = ME.screenToWorld(sx, sy);
    EDITOR.mouse.x = sx;
    EDITOR.mouse.y = sy;
    EDITOR.mouse.worldX = w.x;
    EDITOR.mouse.worldY = w.y;
    return { x: sx, y: sy, worldX: w.x, worldY: w.y, dpr: dpr };
  }

  function distSq(a, b){
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return dx*dx + dy*dy;
  }

  // 复制地块:全字段 deep-clone + 偏移几何 + 新 id/colorKey·neighbors 清空(偏移后多为孤立·用户落位后 N 工具重算)
  function _cloneDivGeometry(src, off){
    function _offP(poly){ return (poly || []).map(function(p){ return [p[0] + off, p[1] + off]; }); }
    var d = JSON.parse(JSON.stringify(src));
    d.id = 'div_' + Date.now() + '_' + Math.floor(Math.random() * 99999);
    delete d.colorKey;
    d.neighbors = [];
    d.name = (src.name || '未命名') + '·摹';
    d.polygon = _offP(src.polygon);
    if (Array.isArray(src.extraPolygons)) d.extraPolygons = src.extraPolygons.map(_offP);
    if (Array.isArray(src.holes)) d.holes = src.holes.map(_offP);
    if (typeof ME.recomputeDerived === 'function') ME.recomputeDerived(d);
    return d;
  }

  // ③ 多边形自相交检测(seg-seg·跳过相邻边)·用于绘制/拖动后实时警告
  function _segInt(a, b, c, d){
    function ccw(p, q, r){ return (r[1]-p[1])*(q[0]-p[0]) - (q[1]-p[1])*(r[0]-p[0]); }
    var d1 = ccw(c,d,a), d2 = ccw(c,d,b), d3 = ccw(a,b,c), d4 = ccw(a,b,d);
    return ((d1>0) !== (d2>0)) && ((d3>0) !== (d4>0));
  }
  function _selfIntersects(poly){
    if (!poly || poly.length < 4) return false;
    var n = poly.length;
    for (var i = 0; i < n; i++){
      var a = poly[i], b = poly[(i+1)%n];
      for (var j = i+1; j < n; j++){
        if (j === (i+1)%n || (j+1)%n === i) continue;
        if (_segInt(a, b, poly[j], poly[(j+1)%n])) return true;
      }
    }
    return false;
  }

  // 旋转手柄世界坐标·返回 { x, y, cx, cy, hitR } 或 null
  // x,y = 手柄圆球中心  cx,cy = bitmap 中心 (旋转锚)  hitR = world-space 命中半径
  function _bitmapHandlePos(){
    if (!EDITOR.bitmapImage) return null;
    var bt = EDITOR.map.bitmapTransform || { x: 0, y: 0, scale: 1, rot: 0 };
    var btScale = bt.scale || 1;
    var btRot = bt.rot || 0;
    var bw = EDITOR.map.bitmapWidth * btScale;
    var bh = EDITOR.map.bitmapHeight * btScale;
    var cx = (bt.x || 0) + bw / 2;
    var cy = (bt.y || 0) + bh / 2;
    var ss = 1 / EDITOR.camera.zoom;
    var armWorld = (bh / 2) + 36 * ss;  // 屏幕 36px·杆长
    // bitmap 旋转后·local (0, -armWorld) 经 canvas R(θ) → world (sin θ * arm, -cos θ * arm)
    return {
      x: cx + Math.sin(btRot) * armWorld,
      y: cy - Math.cos(btRot) * armWorld,
      cx: cx, cy: cy,
      hitR: 12 * ss  // 12px 屏幕命中半径
    };
  }

  function findVertexNear(d, wx, wy, snapPxWorld){
    var best = -1, bestD = snapPxWorld * snapPxWorld;
    for (var i = 0; i < d.polygon.length; i++){
      var p = d.polygon[i];
      var d2 = distSq([wx, wy], p);
      if (d2 < bestD){ bestD = d2; best = i; }
    }
    return best;
  }

  // 多 polygon 版·查 main + extraPolygons 全顶点·返回 {polyIdx, idx}·polyIdx 0 = main·1+ = extra
  function findVertexNearMulti(d, wx, wy, snapPxWorld){
    var allPs = ME.getAllPolygons(d);
    var best = null, bestD = snapPxWorld * snapPxWorld;
    for (var p = 0; p < allPs.length; p++){
      var poly = allPs[p];
      for (var i = 0; i < poly.length; i++){
        var pt = poly[i];
        var d2 = distSq([wx, wy], pt);
        if (d2 < bestD){ bestD = d2; best = { polyIdx: p, idx: i }; }
      }
    }
    return best;
  }

  // ring-aware·  返回 { kind, polyIdx, idx } | null
  function findRingVertexNear(d, wx, wy, snapPxWorld){
    var rings = ME.getAllRings ? ME.getAllRings(d) : null;
    if (!rings){
      // fallback to old multi
      var fb = findVertexNearMulti(d, wx, wy, snapPxWorld);
      return fb ? { kind: fb.polyIdx === 0 ? 'main' : 'extra', polyIdx: fb.polyIdx === 0 ? 0 : (fb.polyIdx - 1), idx: fb.idx } : null;
    }
    var best = null, bestD = snapPxWorld * snapPxWorld;
    for (var r = 0; r < rings.length; r++){
      var ring = rings[r];
      for (var i = 0; i < ring.points.length; i++){
        var pt = ring.points[i];
        var d2 = distSq([wx, wy], pt);
        if (d2 < bestD){ bestD = d2; best = { kind: ring.kind, polyIdx: ring.polyIdx, idx: i }; }
      }
    }
    return best;
  }

  // ring-aware·  返回 { kind, polyIdx, edge:[i,j], t, point } | null
  function findRingEdgeNear(d, wx, wy, snapPxWorld){
    var rings = ME.getAllRings ? ME.getAllRings(d) : null;
    if (!rings) return null;
    var best = null;
    var bestD = snapPxWorld * snapPxWorld;
    for (var r = 0; r < rings.length; r++){
      var ring = rings[r];
      var poly = ring.points;
      var n = poly.length;
      for (var i = 0; i < n; i++){
        var j = (i + 1) % n;
        var a = poly[i], b = poly[j];
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var len2 = dx*dx + dy*dy;
        if (len2 < 1e-6) continue;
        var t = ((wx - a[0]) * dx + (wy - a[1]) * dy) / len2;
        if (t < 0 || t > 1) continue;
        var px = a[0] + dx * t, py = a[1] + dy * t;
        var d2 = (px - wx) * (px - wx) + (py - wy) * (py - wy);
        if (d2 < bestD){
          bestD = d2;
          best = { kind: ring.kind, polyIdx: ring.polyIdx, edge: [i, j], t: t, point: [px, py] };
        }
      }
    }
    return best;
  }

  // 给 division + ring kind/polyIdx·返回原 array (供 splice / mutate)
  function getRingArray(d, kind, polyIdx){
    if (kind === 'main') return d.polygon;
    if (kind === 'extra') return (d.extraPolygons || [])[polyIdx];
    if (kind === 'hole')  return (d.holes || [])[polyIdx];
    return null;
  }

  // 小 ring (3 顶) 删·建议删整个
  function handleSmallRingDelete(d, hit){
    var TP_ = global.TM && TM.MapEditor.topology;
    var topoOn_ = TP_ && TP_.isEnabled();
    if (hit.kind === 'extra'){
      if (confirm('飞地只 3 顶·删此将作废·删整个飞地?')){
        ME.commitMutation('remove exclave', function(){
          d.extraPolygons.splice(hit.polyIdx, 1);
          if (d.extraPolygonsVids) d.extraPolygonsVids.splice(hit.polyIdx, 1);
          ME.recomputeDerived(d);
          if (topoOn_){
            TP_.removeDivisionFromTopology(d.id);
            TP_.syncDivisionToTopology(ME.EDITOR.map, d);
          }
        });
      }
    } else if (hit.kind === 'hole'){
      if (confirm('圈只 3 顶·删此将作废·删整个圈?')){
        ME.commitMutation('remove hole', function(){
          d.holes.splice(hit.polyIdx, 1);
          if (d.holesVids) d.holesVids.splice(hit.polyIdx, 1);
          ME.recomputeDerived(d);
          if (topoOn_){
            TP_.removeDivisionFromTopology(d.id);
            TP_.syncDivisionToTopology(ME.EDITOR.map, d);
          }
        });
      }
    }
  }

  // ─── tool handlers ─────────────────────────────────────────

  function onMouseDown(e){
    var m = getMousePos(e);
    EDITOR.mouse.buttons = e.buttons;

    // middle button 或 H tool 或 space 按下·拖图
    if (e.button === 1 || EDITOR.activeTool === 'hand' || EDITOR._spaceDown){
      EDITOR.draggingMap = true;
      EDITOR.dragStart = { x: m.x, y: m.y, camX: EDITOR.camera.x, camY: EDITOR.camera.y };
      EDITOR.canvas.style.cursor = 'grabbing';
      return;
    }

    // brush·先 hook·支持右键切 add/subtract
    if (EDITOR.activeTool === 'brush' && global.TM && TM.MapEditor.brush && TM.MapEditor.brush.isActive()){
      TM.MapEditor.brush.onMouseDown(m.worldX, m.worldY, e);
      return;
    }

    // phase 12·feature 工具 hook
    if (EDITOR.activeTool === 'river' && TM.MapEditor.rivers){
      if (TM.MapEditor.rivers.onMouseDown(m.worldX, m.worldY, e)) return;
    }
    if (EDITOR.activeTool === 'road' && TM.MapEditor.roads){
      if (TM.MapEditor.roads.onMouseDown(m.worldX, m.worldY, e)) return;
    }
    if (EDITOR.activeTool === 'stronghold' && TM.MapEditor.strongholds){
      if (TM.MapEditor.strongholds.onMouseDown(m.worldX, m.worldY, e)) return;
    }

    // phase 13.3·pick / paint-height / paint-terrain
    if (EDITOR.activeTool === 'pick' && TM.MapEditor.pick){
      if (TM.MapEditor.pick.onMouseDown(m.worldX, m.worldY, e)) return;
    }
    if (EDITOR.activeTool === 'paint-height' && TM.MapEditor.rastermaps){
      if (TM.MapEditor.rastermaps.onMouseDown('heightMap', m.worldX, m.worldY, e)) return;
    }
    if (EDITOR.activeTool === 'paint-terrain' && TM.MapEditor.rastermaps){
      if (TM.MapEditor.rastermaps.onMouseDown('terrainMap', m.worldX, m.worldY, e)) return;
    }

    // phase 13.5·ferry
    if (EDITOR.activeTool === 'ferry' && TM.MapEditor.ferry){
      if (TM.MapEditor.ferry.onMouseDown(m.worldX, m.worldY, e)) return;
    }

    // voronoi 交互·active 时 click 加种子 (任 tool 下都可)
    if (e.button === 0 && global.TM && TM.MapEditor.voronoi &&
        EDITOR.voronoiState && EDITOR.voronoiState.active){
      TM.MapEditor.voronoi.addSeed(m.worldX, m.worldY);
      return;
    }

    if (e.button !== 0) return;

    var t = EDITOR.activeTool;

    if (t === 'select'){
      var d = ME.findDivisionAt(m.worldX, m.worldY);
      if (d){
        if (e.shiftKey){
          if (EDITOR.selectedIds.indexOf(d.id) === -1) ME.selectAdd(d.id);
          else {
            EDITOR.selectedIds = EDITOR.selectedIds.filter(function(I){ return I !== d.id; });
            ME.fire('selection-change');
          }
        } else {
          ME.selectOne(d.id);
        }
      } else {
        // phase 16.1·空地·开 marquee (rect 默·按 L 切 lasso)
        if (TM.MapEditor.marquee){
          if (EDITOR._lassoMode) TM.MapEditor.marquee.startLasso(m.worldX, m.worldY);
          else TM.MapEditor.marquee.startRect(m.worldX, m.worldY);
        } else {
          if (!e.shiftKey) ME.selectClear();
        }
      }
      return;
    }

    if (t === 'lasso'){
      // 专用 lasso 工具·任处 drag = lasso·空地 click 不清·click 中 div = 加选 (shift) / 单选
      var dl = ME.findDivisionAt(m.worldX, m.worldY);
      if (dl){
        if (e.shiftKey){
          if (EDITOR.selectedIds.indexOf(dl.id) === -1) ME.selectAdd(dl.id);
        } else {
          ME.selectOne(dl.id);
        }
        return;
      }
      if (TM.MapEditor.marquee) TM.MapEditor.marquee.startLasso(m.worldX, m.worldY);
      return;
    }

    if (t === 'pen'){
      var snapPxWorld = EDITOR.snapDistance / EDITOR.camera.zoom;
      var TPpen = global.TM && TM.MapEditor.topology;
      var topologyOnPen = TPpen && TPpen.isEnabled();

      // 闭合 check·点 ≥ 3 + 距首点 ≤ closeDist
      if (EDITOR.penPoints.length >= EDITOR.minVerticesToClose){
        var first = EDITOR.penPoints[0];
        var closeDistWorld = EDITOR.closingDistance / EDITOR.camera.zoom;
        if (distSq(first, [m.worldX, m.worldY]) <= closeDistWorld * closeDistWorld){
          // 闭合·新建 division
          var poly = EDITOR.penPoints.slice();
          if (_selfIntersects(poly) && global.meToast) meToast('新地块边界自相交·请检查顶点', 'warn', 2200);
          // 子绘制模式：把所画多边形裁到父(省/路)内·建为下级(府/县)·挂 parentId·保持模式可连画·Esc 退出
          if (EDITOR.childDrawParentId){
            ME.createChildDivision(poly);
            EDITOR.penPoints = [];
            ME.requestRender();
            return;
          }
          var d = ME.createDivision({
            polygon: poly,
            name: '新省 ' + (EDITOR.map.divisions.length + 1)
          });
          ME.recomputeDerived(d);
          ME.addDivision(d);  // addDivision 内会自动 sync to topology
          ME.selectOne(d.id);
          EDITOR.penPoints = [];
          ME.requestRender();
          return;
        }
      }

      // 顶点吸附·topology mode 优先 snap 到 topology vertex·非 topology 时 snap 到现 polygon 顶点
      if (EDITOR.snapToVertex){
        var snapped = null;
        if (topologyOnPen){
          var existingVid = TPpen.findNearbyVertex(EDITOR.map, m.worldX, m.worldY, snapPxWorld);
          if (existingVid){
            snapped = TPpen.getVertex(EDITOR.map, existingVid);
          }
        } else {
          EDITOR.map.divisions.forEach(function(D){
            var idx = findVertexNear(D, m.worldX, m.worldY, snapPxWorld);
            if (idx >= 0) snapped = D.polygon[idx];
          });
        }
        // ② 顶点没吸到 → 试吸附到已有地块的边(投影点·画相邻地块不留缝隙/重叠·flag snapToEdge)
        if (!snapped && EDITOR.snapToEdge !== false){
          var _bestEP = null, _bestED = snapPxWorld * snapPxWorld;
          EDITOR.map.divisions.forEach(function(D){
            var _eh = findRingEdgeNear(D, m.worldX, m.worldY, snapPxWorld);
            if (_eh && _eh.point){
              var _dd = distSq(_eh.point, [m.worldX, m.worldY]);
              if (_dd < _bestED){ _bestED = _dd; _bestEP = _eh.point; }
            }
          });
          if (_bestEP) snapped = [_bestEP[0], _bestEP[1]];
        }
        if (snapped){
          EDITOR.penPoints.push([snapped[0], snapped[1]]);
          ME.requestRender();
          return;
        }
      }

      EDITOR.penPoints.push([m.worldX, m.worldY]);
      ME.requestRender();
      return;
    }

    if (t === 'edit'){
      var sel = ME.getSelected();
      if (sel.length === 0){
        ME.selectOne(null);
        return;
      }
      var snapPxWorld = EDITOR.snapDistance / EDITOR.camera.zoom;

      var TP = global.TM && TM.MapEditor.topology;
      var topologyOn = TP && TP.isEnabled();

      // 顶点拖·ring-aware (主 + 飞地 + 圈)
      for (var i = 0; i < sel.length; i++){
        var d = sel[i];
        var hit = findRingVertexNear(d, m.worldX, m.worldY, snapPxWorld);
        if (hit){
          if (e.shiftKey){
            // 删顶点·topology mode 走 topology API
            if (topologyOn){
              var ringArrCheck = getRingArray(d, hit.kind, hit.polyIdx);
              if (ringArrCheck && ringArrCheck.length > 3){
                ME.commitMutation('delete vertex', function(){
                  TP.removeVertexFromRing(d, hit.kind, hit.polyIdx, hit.idx);
                  ME.recomputeDerived(d);
                });
              } else {
                handleSmallRingDelete(d, hit);
              }
            } else {
              var ringArr = getRingArray(d, hit.kind, hit.polyIdx);
              if (!ringArr) continue;
              if (ringArr.length > 3){
                ME.commitMutation('delete vertex', function(){
                  ringArr.splice(hit.idx, 1);
                  ME.recomputeDerived(d);
                });
              } else {
                handleSmallRingDelete(d, hit);
              }
            }
          } else {
            EDITOR.draggingVertex = { divId: d.id, kind: hit.kind, polyIdx: hit.polyIdx, vertexIdx: hit.idx };
            EDITOR._dragVertexSnap = true; // ① 首帧真拖动时记拖前快照
          }
          return;
        }
      }

      // alt+click 边·加顶点
      if (e.altKey){
        for (var i2 = 0; i2 < sel.length; i2++){
          var d2 = sel[i2];
          var edgeHit = findRingEdgeNear(d2, m.worldX, m.worldY, snapPxWorld * 2);
          if (edgeHit){
            if (topologyOn){
              ME.commitMutation('add vertex', function(){
                TP.insertVertexIntoRing(d2, edgeHit.kind, edgeHit.polyIdx, edgeHit.edge[1], edgeHit.point[0], edgeHit.point[1]);
                ME.recomputeDerived(d2);
              });
              return;
            }
            var targetRing = getRingArray(d2, edgeHit.kind, edgeHit.polyIdx);
            if (!targetRing) continue;
            ME.commitMutation('add vertex', function(){
              targetRing.splice(edgeHit.edge[1], 0, edgeHit.point);
              ME.recomputeDerived(d2);
            });
            return;
          }
        }
      }
      return;
    }

    if (t === 'text'){
      if (!TM.MapEditor.text) return;
      var hitId = TM.MapEditor.text.hitTest(m.worldX, m.worldY);
      if (hitId){
        TM.MapEditor.text.startDrag(hitId);
        EDITOR._textPendingClick = false;
      } else {
        // 空白处 mousedown·标记 pending click·mouseup 时若未拖动则触发 prompt 创建
        EDITOR._textPendingClick = { worldX: m.worldX, worldY: m.worldY };
      }
      return;
    }

    if (t === 'bitmapXform'){
      // 仅当有底图时拖·点 bitmap 内才接·点外则 fall through 让 camera 处理 (其实 bitmapXform 模式下不应 camera·这里直接吞掉)
      if (!EDITOR.bitmapImage) return;
      var bt = EDITOR.map.bitmapTransform || { x: 0, y: 0, scale: 1, rot: 0 };
      // 旋转手柄优先·hit-test
      var handle = _bitmapHandlePos();
      if (handle){
        var dxH = m.worldX - handle.x;
        var dyH = m.worldY - handle.y;
        var distH = Math.sqrt(dxH*dxH + dyH*dyH);
        if (distH <= handle.hitR){
          EDITOR._bitmapRotate = {
            cx: handle.cx, cy: handle.cy,
            startAngle: Math.atan2(m.worldY - handle.cy, m.worldX - handle.cx),
            origRot: bt.rot || 0,
            lastScreenX: m.x, lastScreenY: m.y
          };
          EDITOR.canvas.style.cursor = 'grabbing';
          return;
        }
      }
      EDITOR._bitmapDrag = {
        startMouseWorld: { x: m.worldX, y: m.worldY },
        origBitmap: { x: bt.x || 0, y: bt.y || 0 }
      };
      EDITOR.canvas.style.cursor = 'grabbing';
      return;
    }

    if (t === 'addPoly' || t === 'addHole'){
      var isHole = (t === 'addHole');
      var selA = ME.getSelected();
      if (selA.length === 0){
        meAlert('请先选 1 省 (V 工具)·才可加 ' + (isHole ? '圈' : '飞地'));
        return;
      }
      if (selA.length > 1){
        meAlert((isHole ? '加圈' : '加飞地') + '只对 1 省·清选其他');
        return;
      }
      var targetD = selA[0];

      // 闭合 check
      if (EDITOR.penPoints.length >= EDITOR.minVerticesToClose){
        var first = EDITOR.penPoints[0];
        var closeDistWorldA = EDITOR.closingDistance / EDITOR.camera.zoom;
        if (distSq(first, [m.worldX, m.worldY]) <= closeDistWorldA * closeDistWorldA){
          var newPoly = EDITOR.penPoints.slice();

          if (isHole){
            // 圈必须在主 polygon 内·检 centroid
            var c = ME.polygonCentroid(newPoly);
            if (c && targetD.polygon && !ME.pointInPolygon(c[0], c[1], targetD.polygon)){
              if (!confirm('警·此圈中心点不在主 polygon 内·仍加? (圈应在主 polygon 内才有意义)')) {
                return;
              }
            }
            ME.commitMutation('add hole to ' + targetD.name, function(){
              targetD.holes = targetD.holes || [];
              targetD.holes.push(newPoly);
              ME.recomputeDerived(targetD);
              var TPh = global.TM && TM.MapEditor.topology;
              if (TPh && TPh.isEnabled()){
                TPh.removeDivisionFromTopology(targetD.id);
                TPh.syncDivisionToTopology(ME.EDITOR.map, targetD);
              }
            });
            var nHoles = (targetD.holes || []).length;
            var statusE = document.getElementById('status-tip');
            if (statusE) statusE.textContent = '已加圈·' + targetD.name + ' (' + nHoles + ' 圈)';
          } else {
            ME.commitMutation('add exclave to ' + targetD.name, function(){
              targetD.extraPolygons = targetD.extraPolygons || [];
              targetD.extraPolygons.push(newPoly);
              ME.recomputeDerived(targetD);
              var TPe = global.TM && TM.MapEditor.topology;
              if (TPe && TPe.isEnabled()){
                TPe.removeDivisionFromTopology(targetD.id);
                TPe.syncDivisionToTopology(ME.EDITOR.map, targetD);
              }
            });
            var nExtra = (targetD.extraPolygons || []).length;
            var statusEl = document.getElementById('status-tip');
            if (statusEl) statusEl.textContent = '已加飞地·' + targetD.name + ' (' + nExtra + ' 飞地)';
          }
          EDITOR.penPoints = [];
          ME.requestRender();
          return;
        }
      }

      EDITOR.penPoints.push([m.worldX, m.worldY]);
      ME.requestRender();
      return;
    }

    if (t === 'zoom'){
      if (e.altKey) ME.setZoom(EDITOR.camera.zoom / 1.5, { x: m.x, y: m.y });
      else ME.setZoom(EDITOR.camera.zoom * 1.5, { x: m.x, y: m.y });
      return;
    }

    if (t === 'split'){
      // split·两 click·第 1 click 起点·第 2 click 终点·完成切割
      if (!EDITOR.splitState){
        // 选 1 省·若未选·按 click 位置自动找 division (含飞地)
        var sel = ME.getSelected();
        if (sel.length === 0){
          if (ME.findDivisionAt){
            var hit = ME.findDivisionAt(m.worldX, m.worldY);
            if (!hit){
              meAlert('请先 V 工具选 1 省·或在 division 区域 (含飞地) 内点击切线第 1 点');
              return;
            }
            ME.selectOne(hit.id);
            sel = [hit];
          } else {
            meAlert('请先选 1 省 (V 工具)·才可 split');
            return;
          }
        }
        if (sel.length > 1){
          meAlert('split 只支持 1 省·清选其他省');
          return;
        }
        EDITOR.splitState = { divId: sel[0].id, point1: [m.worldX, m.worldY], point2: null };
        var statusEl = document.getElementById('status-tip');
        if (statusEl) statusEl.textContent = 'split·点 2 (终点)·切线方向·算法自动延伸至 polygon 边·ESC 取消';
        ME.requestRender();
        return;
      } else {
        // 第 2 click·完成切
        EDITOR.splitState.point2 = [m.worldX, m.worldY];
        var ms = TM.MapEditor.mergeSplit;
        if (ms){
          ms.splitDivisionByLine(EDITOR.splitState.divId, EDITOR.splitState.point1, EDITOR.splitState.point2);
        }
        EDITOR.splitState = null;
        ME.requestRender();
        return;
      }
    }
  }

  function onMouseMove(e){
    var m = getMousePos(e);

    // phase 16.1·marquee active 时·跟踪 update
    if (TM.MapEditor.marquee && TM.MapEditor.marquee.isActive()){
      TM.MapEditor.marquee.update(m.worldX, m.worldY);
      ME.fire('mouse-move', m);
      return;
    }

    // brush·hook
    if (EDITOR.activeTool === 'brush' && global.TM && TM.MapEditor.brush && TM.MapEditor.brush.isActive()){
      TM.MapEditor.brush.onMouseMove(m.worldX, m.worldY, e);
      ME.fire('mouse-move', m);
      return;
    }

    // text·拖动中·跟随
    if (EDITOR.activeTool === 'text' && TM.MapEditor.text && EDITOR._textDragId){
      TM.MapEditor.text.dragTo(m.worldX, m.worldY);
      // 拖动开始后·清掉 pending click (按下又拖了一段就别再 prompt)
      EDITOR._textPendingClick = false;
      EDITOR.canvas.style.cursor = 'grabbing';
      EDITOR.mouse.worldX = m.worldX; EDITOR.mouse.worldY = m.worldY;
      ME.fire('mouse-move', m);
      return;
    }
    // text·非拖动·hover hit-test 跟踪 + cursor 切
    if (EDITOR.activeTool === 'text' && TM.MapEditor.text){
      var hovId = TM.MapEditor.text.updateHover(m.worldX, m.worldY);
      EDITOR.canvas.style.cursor = hovId ? 'grab' : 'crosshair';
    }
    // bitmapXform·旋转手柄拖动·按 bitmap 中心算角度
    if (EDITOR.activeTool === 'bitmapXform' && EDITOR._bitmapRotate){
      var br = EDITOR._bitmapRotate;
      var curAng = Math.atan2(m.worldY - br.cy, m.worldX - br.cx);
      var deltaAng = curAng - br.startAngle;
      var newRot = br.origRot + deltaAng;
      // shift 按住·snap 15° 整
      if (e.shiftKey){
        var step = Math.PI / 12;  // 15°
        newRot = Math.round(newRot / step) * step;
      }
      while (newRot > Math.PI) newRot -= Math.PI * 2;
      while (newRot < -Math.PI) newRot += Math.PI * 2;
      if (!EDITOR.map.bitmapTransform) EDITOR.map.bitmapTransform = { x: 0, y: 0, scale: 1, rot: 0 };
      EDITOR.map.bitmapTransform.rot = newRot;
      br.lastScreenX = m.x; br.lastScreenY = m.y;
      ME.requestRender();
      return;
    }
    // bitmapXform·拖动跟随 (translate)
    if (EDITOR.activeTool === 'bitmapXform' && EDITOR._bitmapDrag){
      var bd = EDITOR._bitmapDrag;
      var dx = m.worldX - bd.startMouseWorld.x;
      var dy = m.worldY - bd.startMouseWorld.y;
      if (!EDITOR.map.bitmapTransform) EDITOR.map.bitmapTransform = { x: 0, y: 0, scale: 1, rot: 0 };
      EDITOR.map.bitmapTransform.x = bd.origBitmap.x + dx;
      EDITOR.map.bitmapTransform.y = bd.origBitmap.y + dy;
      ME.requestRender();
      return;
    }
    if (EDITOR.activeTool === 'bitmapXform'){
      // hover 检测·光标变化 + handle 高亮
      var hand = _bitmapHandlePos();
      var overHandle = false;
      if (hand){
        var hdx = m.worldX - hand.x, hdy = m.worldY - hand.y;
        if (hdx*hdx + hdy*hdy <= hand.hitR * hand.hitR) overHandle = true;
      }
      var prevHover = EDITOR._bitmapRotateHover;
      EDITOR._bitmapRotateHover = overHandle;
      if (prevHover !== overHandle) ME.requestRender();
      EDITOR.canvas.style.cursor = overHandle ? 'grab' : (EDITOR.bitmapImage ? 'grab' : 'not-allowed');
    }

    // phase 12·feature 工具 mousemove
    if (EDITOR.activeTool === 'river' && TM.MapEditor.rivers){
      if (TM.MapEditor.rivers.onMouseMove(m.worldX, m.worldY, e)){
        EDITOR.mouse.worldX = m.worldX; EDITOR.mouse.worldY = m.worldY;
        ME.fire('mouse-move', m); return;
      }
    }
    if (EDITOR.activeTool === 'road' && TM.MapEditor.roads){
      if (TM.MapEditor.roads.onMouseMove(m.worldX, m.worldY, e)){
        EDITOR.mouse.worldX = m.worldX; EDITOR.mouse.worldY = m.worldY;
        ME.fire('mouse-move', m); return;
      }
    }
    if (EDITOR.activeTool === 'stronghold' && TM.MapEditor.strongholds){
      if (TM.MapEditor.strongholds.onMouseMove(m.worldX, m.worldY, e)){
        ME.fire('mouse-move', m); return;
      }
    }
    if (EDITOR.activeTool === 'paint-height' && TM.MapEditor.rastermaps){
      if (TM.MapEditor.rastermaps.onMouseMove('heightMap', m.worldX, m.worldY, e)){
        ME.fire('mouse-move', m); return;
      }
    }
    if (EDITOR.activeTool === 'paint-terrain' && TM.MapEditor.rastermaps){
      if (TM.MapEditor.rastermaps.onMouseMove('terrainMap', m.worldX, m.worldY, e)){
        ME.fire('mouse-move', m); return;
      }
    }
    if (EDITOR.activeTool === 'ferry' && TM.MapEditor.ferry){
      if (TM.MapEditor.ferry.onMouseMove(m.worldX, m.worldY, e)){
        ME.fire('mouse-move', m); return;
      }
    }
    // 即便 feature 工具未消费·也写 mouse worldX/Y 以让 pen preview 跟随
    if (EDITOR.activeTool === 'river' || EDITOR.activeTool === 'road'){
      EDITOR.mouse.worldX = m.worldX;
      EDITOR.mouse.worldY = m.worldY;
      if (EDITOR.featurePenPoints && EDITOR.featurePenPoints.length){
        ME.requestRender();
      }
    }

    // 拖图
    if (EDITOR.draggingMap && EDITOR.dragStart){
      EDITOR.camera.x = EDITOR.dragStart.camX + (m.x - EDITOR.dragStart.x);
      EDITOR.camera.y = EDITOR.dragStart.camY + (m.y - EDITOR.dragStart.y);
      ME.requestRender();
      return;
    }

    // E 工具拖顶点·ring-aware (主 + 飞地 + 圈)
    if (EDITOR.draggingVertex){
      var dv = EDITOR.draggingVertex;
      var d = EDITOR.map.divisions.find(function(D){ return D.id === dv.divId; });
      if (d){
        // ① 首帧真拖动时记拖前快照(点了没拖不记)→ Ctrl+Z 可回拖前
        if (EDITOR._dragVertexSnap){
          EDITOR._dragVertexSnap = false;
          if (EDITOR.undo && TM.MapEditor.undo && TM.MapEditor.undo.snapshot) TM.MapEditor.undo.snapshot(EDITOR.undo, EDITOR.map, 'drag vertex');
        }
        var TP = global.TM && TM.MapEditor.topology;
        var topologyOn = TP && TP.isEnabled();
        if (topologyOn && dv.kind){
          // 共享 vertex 模式·拖此 vid·所有用此 vid 的 polygon 同步动
          var vid = TP.getVidAt(d, dv.kind, dv.polyIdx, dv.vertexIdx);
          if (vid){
            TP.moveVertexAndPropagate(vid, m.worldX, m.worldY);
            EDITOR.dirty = true;
            ME.requestRender();
            return;
          }
        }
        // 非 topology mode·直接 mutate 坐标
        var ringArr;
        if (dv.kind){
          ringArr = getRingArray(d, dv.kind, dv.polyIdx);
        } else {
          ringArr = (dv.polyIdx == null || dv.polyIdx === 0) ? d.polygon : (d.extraPolygons || [])[dv.polyIdx - 1];
        }
        if (ringArr && ringArr[dv.vertexIdx]){
          ringArr[dv.vertexIdx] = [m.worldX, m.worldY];
          ME.recomputeDerived(d);
          EDITOR.dirty = true;
          ME.requestRender();
        }
      }
      return;
    }

    // hover
    var hover = (EDITOR.activeTool === 'select' || EDITOR.activeTool === 'edit')
      ? ME.findDivisionAt(m.worldX, m.worldY) : null;
    var hoverId = hover ? hover.id : null;
    if (hoverId !== EDITOR.hoverId){
      EDITOR.hoverId = hoverId;
      ME.requestRender();
    }
    if (EDITOR.activeTool === 'pen' && EDITOR.penPoints.length){
      // 乙:算吸附 hint(顶点优先·否则边投影)供 render 高亮
      var _shW = EDITOR.snapDistance / EDITOR.camera.zoom;
      var _hint = null;
      if (EDITOR.snapToVertex){
        EDITOR.map.divisions.forEach(function(D){ var _vi = findVertexNear(D, m.worldX, m.worldY, _shW); if (_vi >= 0) _hint = { kind: 'vertex', point: [D.polygon[_vi][0], D.polygon[_vi][1]] }; });
      }
      if (!_hint && EDITOR.snapToEdge !== false){
        var _bEP = null, _bED = _shW * _shW;
        EDITOR.map.divisions.forEach(function(D){ var _eh = findRingEdgeNear(D, m.worldX, m.worldY, _shW); if (_eh && _eh.point){ var _dd = distSq(_eh.point, [m.worldX, m.worldY]); if (_dd < _bED){ _bED = _dd; _bEP = _eh.point; } } });
        if (_bEP) _hint = { kind: 'edge', point: [_bEP[0], _bEP[1]] };
      }
      EDITOR._penSnapHint = _hint;
      ME.requestRender();
    }

    ME.fire('mouse-move', m);
  }

  function onMouseUp(e){
    // phase 16.1·marquee active 时·提交 selection
    if (TM.MapEditor.marquee && TM.MapEditor.marquee.isActive()){
      var r = TM.MapEditor.marquee.end(e);
      if (r && global.meToast && r.count > 0){
        meToast((r.kind === 'rect' ? '框选' : '圈选') + '·' + r.count + ' 省', 'info', 1400);
      }
      EDITOR.mouse.buttons = e.buttons;
      return;
    }

    // brush·hook
    if (EDITOR.activeTool === 'brush' && global.TM && TM.MapEditor.brush && TM.MapEditor.brush.isActive()){
      var m = getMousePos(e);
      TM.MapEditor.brush.onMouseUp(m.worldX, m.worldY, e);
      EDITOR.mouse.buttons = e.buttons;
      return;
    }

    // text·拖结束 / 空白点击创建
    if (EDITOR.activeTool === 'text' && TM.MapEditor.text){
      if (EDITOR._textDragId){
        TM.MapEditor.text.endDrag();
        EDITOR._textPendingClick = false;
        EDITOR.mouse.buttons = e.buttons;
        return;
      }
      if (EDITOR._textPendingClick){
        var pc = EDITOR._textPendingClick;
        EDITOR._textPendingClick = false;
        TM.MapEditor.text.handleClick(pc.worldX, pc.worldY);
        EDITOR.mouse.buttons = e.buttons;
        return;
      }
    }

    // bitmapXform·旋转落点·入 undo 栈
    if (EDITOR.activeTool === 'bitmapXform' && EDITOR._bitmapRotate){
      var br2 = EDITOR._bitmapRotate;
      EDITOR._bitmapRotate = null;
      var btR = EDITOR.map.bitmapTransform || { x: 0, y: 0, scale: 1, rot: 0 };
      var newRotF = btR.rot || 0;
      if (Math.abs(newRotF - br2.origRot) > 1e-6){
        btR.rot = br2.origRot;
        ME.commitMutation('rotate bitmap', function(){
          EDITOR.map.bitmapTransform.rot = newRotF;
        });
      }
      EDITOR.canvas.style.cursor = 'grab';
      ME.requestRender();
      EDITOR.mouse.buttons = e.buttons;
      return;
    }
    // bitmapXform·平移落点·入 undo 栈
    if (EDITOR.activeTool === 'bitmapXform' && EDITOR._bitmapDrag){
      var bd2 = EDITOR._bitmapDrag;
      EDITOR._bitmapDrag = null;
      var bt2 = EDITOR.map.bitmapTransform || { x: 0, y: 0, scale: 1, rot: 0 };
      var newX = bt2.x, newY = bt2.y;
      // 回滚再 commit·让 undo 栈正确
      if (newX !== bd2.origBitmap.x || newY !== bd2.origBitmap.y){
        bt2.x = bd2.origBitmap.x; bt2.y = bd2.origBitmap.y;
        ME.commitMutation('move bitmap', function(){
          var btN = EDITOR.map.bitmapTransform;
          btN.x = newX; btN.y = newY;
        });
      }
      EDITOR.canvas.style.cursor = 'grab';
      EDITOR.mouse.buttons = e.buttons;
      return;
    }

    // phase 12·feature 工具 mouseup
    if (EDITOR.activeTool === 'river' && TM.MapEditor.rivers){
      var mr = getMousePos(e);
      if (TM.MapEditor.rivers.onMouseUp(mr.worldX, mr.worldY, e)){ EDITOR.mouse.buttons = e.buttons; return; }
    }
    if (EDITOR.activeTool === 'road' && TM.MapEditor.roads){
      var mrd = getMousePos(e);
      if (TM.MapEditor.roads.onMouseUp(mrd.worldX, mrd.worldY, e)){ EDITOR.mouse.buttons = e.buttons; return; }
    }
    if (EDITOR.activeTool === 'stronghold' && TM.MapEditor.strongholds){
      var ms = getMousePos(e);
      if (TM.MapEditor.strongholds.onMouseUp(ms.worldX, ms.worldY, e)){ EDITOR.mouse.buttons = e.buttons; return; }
    }
    if ((EDITOR.activeTool === 'paint-height' || EDITOR.activeTool === 'paint-terrain') && TM.MapEditor.rastermaps){
      var mp = getMousePos(e);
      var lname = EDITOR.activeTool === 'paint-height' ? 'heightMap' : 'terrainMap';
      if (TM.MapEditor.rastermaps.onMouseUp(lname, mp.worldX, mp.worldY, e)){ EDITOR.mouse.buttons = e.buttons; return; }
    }
    if (EDITOR.activeTool === 'ferry' && TM.MapEditor.ferry){
      var mfy = getMousePos(e);
      if (TM.MapEditor.ferry.onMouseUp(mfy.worldX, mfy.worldY, e)){ EDITOR.mouse.buttons = e.buttons; return; }
    }
    if (EDITOR.draggingMap){
      EDITOR.draggingMap = false;
      EDITOR.dragStart = null;
      EDITOR.canvas.style.cursor = '';
    }
    if (EDITOR.draggingVertex){
      // ① 拖前快照已在 mousemove 首帧记下(撤销回拖前)·此处收尾 + ③ 拖后自交检测
      var _dvE = EDITOR.draggingVertex;
      var _dE = EDITOR.map.divisions.find(function(D){ return D.id === _dvE.divId; });
      if (_dE){
        var _ringE = _dvE.kind ? getRingArray(_dE, _dvE.kind, _dvE.polyIdx) : ((_dvE.polyIdx == null || _dvE.polyIdx === 0) ? _dE.polygon : (_dE.extraPolygons || [])[_dvE.polyIdx - 1]);
        if (_ringE && _selfIntersects(_ringE) && global.meToast) meToast('拖动致边界自相交·请检查', 'warn', 2200);
      }
      EDITOR.draggingVertex = null;
      EDITOR._dragVertexSnap = false;
      EDITOR.dirty = true;
      ME.fire('mutation', { label: 'drag vertex' });
    }
    EDITOR.mouse.buttons = e.buttons;
  }

  function onMouseLeave(){
    EDITOR.draggingMap = false;
    EDITOR.dragStart = null;
    EDITOR.draggingVertex = null;
    EDITOR.hoverId = null;
    if (TM.MapEditor.text) TM.MapEditor.text.clearHover();
    ME.requestRender();
  }

  function onWheel(e){
    // brush·shift+wheel·改尺寸
    if (EDITOR.activeTool === 'brush' && global.TM && TM.MapEditor.brush && TM.MapEditor.brush.isActive()){
      if (TM.MapEditor.brush.onWheel(e.deltaY, e)){
        e.preventDefault();
        return;
      }
    }
    // bitmapXform·wheel 缩放底图 (鼠标位作锚)·shift+wheel 旋转·非 X 工具时仍走 camera zoom
    if (EDITOR.activeTool === 'bitmapXform' && EDITOR.bitmapImage){
      e.preventDefault();
      // shift+wheel·旋转 (5° 每 tick·ctrl 同时按则 0.5° 微调)
      if (e.shiftKey){
        var step = e.ctrlKey ? (Math.PI / 360) : (Math.PI / 36);  // 0.5° / 5°
        var dir = e.deltaY < 0 ? -1 : 1;  // 上滚逆时针·下滚顺时针·和图像编辑器一致
        ME.rotateBitmapBy(dir * step);
        return;
      }
      var mB = getMousePos(e);
      var btB = EDITOR.map.bitmapTransform || { x: 0, y: 0, scale: 1, rot: 0 };
      var oldS = btB.scale || 1;
      var factB = e.deltaY < 0 ? 1.10 : 1 / 1.10;
      var newS = Math.max(0.05, Math.min(20, oldS * factB));
      // 鼠标 world 坐标·围绕 mouse 缩放·让指标点保持不动
      var mx = mB.worldX, my = mB.worldY;
      var newX = mx - (mx - btB.x) * (newS / oldS);
      var newY = my - (my - btB.y) * (newS / oldS);
      // 直接 mutate 避 wheel 频繁 commit 撑爆 undo·小幅累积·结束后由 mouseup 入栈 (但 wheel 没 mouseup)
      // 简化·每次 wheel 都 commit·用户可逐级 undo
      var oldX = btB.x, oldY = btB.y;
      ME.commitMutation('scale bitmap', function(){
        var btN = EDITOR.map.bitmapTransform;
        btN.x = newX; btN.y = newY; btN.scale = newS;
      });
      return;
    }
    e.preventDefault();
    var m = getMousePos(e);
    var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    ME.setZoom(EDITOR.camera.zoom * factor, { x: m.x, y: m.y });
  }

  function onKeyDown(e){
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT'){
      return;
    }
    var k = e.key;

    // brush·active 时·A/S/[/]/Esc/Enter 归 brush 优先
    if (EDITOR.activeTool === 'brush' && global.TM && TM.MapEditor.brush && TM.MapEditor.brush.isActive()){
      if (TM.MapEditor.brush.onKeyDown(e)){
        e.preventDefault();
        return;
      }
    }

    // phase 12·feature 工具 keydown 优先 (Enter/Esc/Delete)
    if (EDITOR.activeTool === 'river' && TM.MapEditor.rivers && TM.MapEditor.rivers.onKeyDown(e)){
      e.preventDefault(); return;
    }
    if (EDITOR.activeTool === 'road' && TM.MapEditor.roads && TM.MapEditor.roads.onKeyDown(e)){
      e.preventDefault(); return;
    }
    if (EDITOR.activeTool === 'stronghold' && TM.MapEditor.strongholds && TM.MapEditor.strongholds.onKeyDown(e)){
      e.preventDefault(); return;
    }

    // phase 13.3·pick / paint-height / paint-terrain
    if (EDITOR.activeTool === 'pick' && TM.MapEditor.pick && TM.MapEditor.pick.onKeyDown(e)){
      e.preventDefault(); return;
    }
    if ((EDITOR.activeTool === 'paint-height' || EDITOR.activeTool === 'paint-terrain') && TM.MapEditor.rastermaps){
      var lname2 = EDITOR.activeTool === 'paint-height' ? 'heightMap' : 'terrainMap';
      if (TM.MapEditor.rastermaps.onKeyDown(lname2, e)){
        e.preventDefault(); return;
      }
    }
    if (EDITOR.activeTool === 'ferry' && TM.MapEditor.ferry && TM.MapEditor.ferry.onKeyDown(e)){
      e.preventDefault(); return;
    }

    // phase 16.1·marquee active 时·Esc 取消
    if (e.key === 'Escape' && TM.MapEditor.marquee && TM.MapEditor.marquee.isActive()){
      TM.MapEditor.marquee.cancel();
      e.preventDefault();
      return;
    }
    // 选 + Ctrl+A·全选 / Ctrl+I·反选
    if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'A')){
      if (TM.MapEditor.marquee){
        var n = TM.MapEditor.marquee.selectAll();
        if (global.meToast) meToast('全选·' + n + ' 省', 'info', 1200);
        e.preventDefault();
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && (k === 'i' || k === 'I')){
      if (TM.MapEditor.marquee){
        var n2 = TM.MapEditor.marquee.invertSelection();
        if (global.meToast) meToast('反选·' + n2 + ' 省', 'info', 1200);
        e.preventDefault();
        return;
      }
    }
    // 按 L 进 lasso modifier·松 L 退
    if ((k === 'l' || k === 'L') && !e.ctrlKey && !e.metaKey){
      EDITOR._lassoMode = true;
      // 不切工具·只是 select 工具下 drag 改 lasso
      var sl = document.getElementById('status-tip');
      if (sl) sl.textContent = 'lasso 模式·空地 drag 圈选 (松 L 退)';
      e.preventDefault();
      return;
    }

    // tool shortcuts
    if (k === 'b' || k === 'B') ME.setTool('brush');
    else if (k === 'r' || k === 'R') ME.setTool('river');
    else if ((k === 'd' || k === 'D') && !e.ctrlKey && !e.metaKey) ME.setTool('road');
    else if (k === 'g' || k === 'G') ME.setTool('stronghold');
    else if (k === 'i' || k === 'I') ME.setTool('pick');
    else if (k === 'u' || k === 'U') ME.setTool('paint-height');
    else if (k === 'y' || k === 'Y') ME.setTool('paint-terrain');
    else if (k === 'f' || k === 'F') ME.setTool('ferry');
    else if (k === 'v' || k === 'V') ME.setTool('select');
    else if (k === 'p' || k === 'P') ME.setTool('pen');
    else if (k === 'e' || k === 'E') ME.setTool('edit');
    else if (k === 'h' || k === 'H') ME.setTool('hand');
    else if (k === 'z' || k === 'Z') ME.setTool('zoom');
    else if (k === 'x' || k === 'X') ME.setTool('bitmapXform');
    else if ((k === 'm' || k === 'M') && !e.shiftKey){
      // M·一键合并选省 (无需进入 tool mode)
      // 若 ghost merge preview 活·先 commit 预览·再清
      if (TM.MapEditor.ghost && TM.MapEditor.ghost.isMergePreviewActive()){
        TM.MapEditor.ghost.clearMergePreview();
      }
      if (TM.MapEditor.mergeSplit) TM.MapEditor.mergeSplit.mergeSelected();
    }
    else if ((k === 'c' || k === 'C') && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey){
      // Shift+C·crop selected divisions to bitmap bounds (裁剪选省到底图边界)
      if (TM.MapEditor.mergeSplit) TM.MapEditor.mergeSplit.cropSelectedToBounds();
    }
    else if ((k === 'd' || k === 'D') && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey){
      // Shift+D·从先选省减去后选省的重叠 (boolean difference)
      if (TM.MapEditor.mergeSplit) TM.MapEditor.mergeSplit.cropSubtractSelected();
    }
    else if (k === 's' || k === 'S') ME.setTool('split');
    else if (k === 't' || k === 'T') ME.setTool('text');
    else if (k === '+' && e.shiftKey == false){
      // shift+= 是 +·但 = 也是 +·避免冲突
      // 加飞地快捷·选省 + Shift+A 不通·改 ` 键
    }
    else if (k === ' ') { EDITOR._spaceDown = true; EDITOR.canvas.style.cursor = 'grab'; }
    else if (k === 'Escape'){
      if (EDITOR.childDrawParentId){
        ME.exitChildDraw();
      } else if (EDITOR.activeTool === 'pen' && EDITOR.penPoints.length){
        EDITOR.penPoints = [];
        ME.requestRender();
      } else if (EDITOR.activeTool === 'split' && EDITOR.splitState){
        EDITOR.splitState = null;
        ME.requestRender();
        var statusEl = document.getElementById('status-tip');
        if (statusEl) statusEl.textContent = 'split 已取消';
      } else if (EDITOR.activeTool === 'bitmapXform' && EDITOR._bitmapRotate){
        // 旋转中按 ESC·还原原角
        EDITOR.map.bitmapTransform.rot = EDITOR._bitmapRotate.origRot;
        EDITOR._bitmapRotate = null;
        ME.requestRender();
      } else {
        ME.selectClear();
      }
    }
    else if (k === 'Delete' || k === 'Backspace'){
      // 甲:pen 绘制中 → 退最后一个顶点(而非删整块)
      if (EDITOR.activeTool === 'pen' && EDITOR.penPoints.length){
        EDITOR.penPoints.pop();
        EDITOR._penSnapHint = null;
        ME.requestRender();
        return;
      }
      var sel = ME.getSelected();
      if (sel.length){
        sel.forEach(function(d){ ME.removeDivision(d.id); });
        e.preventDefault();
      }
    }
    else if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')){
      if (e.shiftKey) ME.doRedo();
      else ME.doUndo();
      e.preventDefault();
    }
    else if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')){
      ME.doRedo();
      e.preventDefault();
    }
    else if ((e.ctrlKey || e.metaKey) && (k === 'd' || k === 'D')){
      e.preventDefault(); // 防浏览器加书签
      var _selCp = ME.getSelected();
      if (_selCp.length){
        var _OFF = 20 / EDITOR.camera.zoom; // 屏幕约 20px 偏移·避免与原块完全重叠
        var _newCpId = null;
        _selCp.forEach(function(_src){ var _c = _cloneDivGeometry(_src, _OFF); ME.addDivision(_c); _newCpId = _c.id; });
        if (_selCp.length === 1 && _newCpId) ME.selectOne(_newCpId);
        if (global.meToast) meToast('已复制 ' + _selCp.length + ' 块(偏移摹写·名带「摹」)', 'info', 1600);
      }
    }
    else if (k === '0'){
      ME.fitToContent();
    }
    else if (k === '+' || k === '='){
      ME.setZoom(EDITOR.camera.zoom * 1.25);
    }
    else if (k === '-' || k === '_'){
      ME.setZoom(EDITOR.camera.zoom / 1.25);
    }
  }

  function onKeyUp(e){
    if (e.key === ' '){
      EDITOR._spaceDown = false;
      EDITOR.canvas.style.cursor = '';
    }
    // phase 16.1·松 L·退 lasso 模式
    if (e.key === 'l' || e.key === 'L'){
      EDITOR._lassoMode = false;
    }
  }

  // ─── attach to canvas ──────────────────────────────────────

  function bindCanvas(){
    var c = EDITOR.canvas;
    if (!c){ console.error('[tools] canvas not ready'); return; }
    // 移植 S2.3+S2.4：mouse* → pointer*（鼠标/触屏/笔统一）+ 双指 pinch 缩放 + 双指 tap=右键。
    //   PointerEvent 继承 MouseEvent → onMouseDown/Move/Up 零改动。touch-action:none 让触屏在画布画/拖非滚页。
    //   单指 = 画/选/拖（同鼠标）；双指张开/收拢 = pinch 缩放（ME.setZoom·围绕中点）；
    //   双指轻点（无展开·短时）= 右键（= macOS 触控板范式·合成 button:2 走现有右键逻辑·brush 切加/减擦除）。
    //   桌面鼠标：pointerType==='mouse' 直透原逻辑·不 capture ⇒ 零回归。
    c.style.touchAction = 'none';
    var _ptrs = {};         // 活跃触屏指针 id -> {x,y}
    var _pinch = null;      // pinch 起手 { dist, zoom } 或 null
    var _wasPinch = false;  // 本轮手势曾双指（抬指残留期忽略单指·防误画）
    var _2fT = 0;           // 双指起手时间戳（判 tap 时长）
    var _2fMid = null;      // 双指中点（client 坐标·tap 时合成右键位置）
    var _2fMoved = false;   // 双指是否展开过（超死区 → 是 pinch 非 tap）
    var PINCH_DEADZONE = 8; // px·双指距变化在此内视为静止（疑 tap·不缩放）
    function _pdist(a, b){ var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
    function _fireRightClick(cx, cy){
      // 合成 button:2 事件喂 onMouseDown → 复用各工具现有右键逻辑（brush 切 add/subtract）
      var fake = { button: 2, buttons: 2, clientX: cx, clientY: cy, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, preventDefault: function(){}, stopPropagation: function(){} };
      try { onMouseDown(fake); } catch(_){}
    }

    c.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'touch'){
        _ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        try { c.setPointerCapture(e.pointerId); } catch(_){}
        var ids = Object.keys(_ptrs);
        if (ids.length === 2){
          _wasPinch = true;
          try { onMouseUp(e); } catch(_){}   // 结束第一指已开始的操作（brush 会 commit 一笔·可撤销）
          var a = _ptrs[ids[0]], b = _ptrs[ids[1]];
          _pinch = { dist: _pdist(a, b) || 1, zoom: EDITOR.camera.zoom };
          _2fT = e.timeStamp; _2fMoved = false;
          _2fMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        }
        if (ids.length >= 2 || _wasPinch) return;  // 双指中 / 双指尾·不当单指 down
        onMouseDown(e);
        return;
      }
      if (e.pointerType === 'pen'){ try { c.setPointerCapture(e.pointerId); } catch(_){} }
      onMouseDown(e);  // mouse / pen 走原单指路
    });

    c.addEventListener('pointermove', function(e){
      if (e.pointerType === 'touch'){
        if (_ptrs[e.pointerId]) _ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(_ptrs);
        if (ids.length >= 2 && _pinch){
          var a = _ptrs[ids[0]], b = _ptrs[ids[1]];
          var d = _pdist(a, b);
          if (!_2fMoved && Math.abs(d - _pinch.dist) <= PINCH_DEADZONE){ e.preventDefault(); return; }  // 死区·疑 tap·不缩放
          _2fMoved = true;
          var rect = c.getBoundingClientRect();
          var sf = _csf(c, rect);  // 抵消 fit 缩放·中点换回画布 CSS 坐标（缩放比 d/dist 是比值·不受影响）
          var mx = ((a.x + b.x) / 2 - rect.left) * sf.fx, my = ((a.y + b.y) / 2 - rect.top) * sf.fy;
          ME.setZoom(_pinch.zoom * (d / _pinch.dist), { x: mx, y: my });
          e.preventDefault();
          return;
        }
        if (_wasPinch) return;
        onMouseMove(e);
        return;
      }
      onMouseMove(e);  // mouse / pen
    });

    function _ptrUp(e){
      if (e.pointerType === 'touch'){
        var hadTwo = Object.keys(_ptrs).length === 2;
        delete _ptrs[e.pointerId];
        try { c.releasePointerCapture(e.pointerId); } catch(_){}
        var n = Object.keys(_ptrs).length;
        if (n < 2){
          // 双指→单指：若无展开 + 短时 → 双指 tap = 右键
          if (hadTwo && _2fT && !_2fMoved && (e.timeStamp - _2fT) < 300 && _2fMid){
            _fireRightClick(_2fMid.x, _2fMid.y);
          }
          _2fT = 0; _pinch = null;
        }
        if (n === 0){
          if (_wasPinch){ _wasPinch = false; return; }  // 双指收尾·别再触发单指 up
          onMouseUp(e);
        }
        return;  // 还剩 1 指（双指抬一指）·等全抬·不收尾
      }
      if (e.pointerType === 'pen'){ try { c.releasePointerCapture(e.pointerId); } catch(_){} }
      onMouseUp(e);  // mouse / pen
    }
    c.addEventListener('pointerup', _ptrUp);
    c.addEventListener('pointercancel', _ptrUp);  // 触屏中断（系统手势打断）= 视为抬起
    c.addEventListener('pointerleave', onMouseLeave);
    c.addEventListener('wheel', onWheel, { passive: false });
    c.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    c.addEventListener('dblclick', function(e){
      if (EDITOR.activeTool === 'text' && TM.MapEditor.text){
        var m = getMousePos(e);
        if (TM.MapEditor.text.handleDblClick(m.worldX, m.worldY)){
          e.preventDefault();
        }
      }
    });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.tools = {
    bindCanvas: bindCanvas
  };

})(typeof window !== 'undefined' ? window : this);
