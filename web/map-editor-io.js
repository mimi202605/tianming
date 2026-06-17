// map-editor-io.js
// import·    image (png/jpg/bmp/svg) 作 base bitmap·json (整个 map state)
// export·    json (整个 map state·给 game runtime / 剧本编辑器) + GeoJSON (后期)
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[io] core not loaded'); return; }

  // ─── image import (作 base bitmap) ────────────────────────

  function pickImage(callback){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/bmp,image/svg+xml,image/webp';
    input.onchange = function(e){
      var f = e.target.files && e.target.files[0];
      if (!f){ callback && callback(null); return; }
      var reader = new FileReader();
      reader.onload = function(ev){
        callback && callback(ev.target.result, f.name);
      };
      reader.readAsDataURL(f);
    };
    input.click();
  }

  function importBitmap(){
    pickImage(function(dataUrl, fname){
      if (!dataUrl) return;
      ME.loadBitmap(dataUrl);
      ME.fire('bitmap-imported', { name: fname });
    });
  }

  // ─── json import (整个 map state) ─────────────────────────

  function pickJSON(callback){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.geojson,application/json,application/geo+json';
    input.onchange = function(e){
      var f = e.target.files && e.target.files[0];
      if (!f){ callback && callback(null); return; }
      var reader = new FileReader();
      reader.onload = function(ev){
        try {
          var obj = JSON.parse(ev.target.result);
          callback && callback(obj, f.name);
        } catch(err){
          meAlert('JSON 解析失败·' + err.message);
          callback && callback(null);
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  function importJSON(){
    pickJSON(function(obj, fname){
      if (!obj) return;
      // 自动识别·GeoJSON FeatureCollection → 路由 GeoJSON 解析
      if (obj.type === 'FeatureCollection'){
        importGeoJSONData(obj, fname);
        return;
      }
      // 地图编辑器原生格式
      if (!obj.divisions){
        meAlert('该 JSON 既非地图编辑器格式 (缺 divisions)·也非 GeoJSON FeatureCollection');
        return;
      }
      ME.loadMap(obj);
      ME.fire('map-imported', { name: fname });
    });
  }

  // ─── GeoJSON import ─────────────────────────────────────
  //
  // 双源支持·
  //   ① 编辑器自家 exportGeoJSON·crs.properties.name === 'tianming-canvas-coords'·canvas 坐标
  //   ② 外部真实 GeoJSON·lon/lat·自动 equirectangular 投影到当前 bitmapWidth × bitmapHeight
  //
  // 几何·Polygon (主+holes) / MultiPolygon (主+飞地)
  // 属性·尽可能从 properties 还原 division 字段·若 _full 在 (我们自己导出) 直接复用

  function _computeBbox(features){
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    features.forEach(function(f){
      var g = f && f.geometry;
      if (!g) return;
      var rings = [];
      if (g.type === 'Polygon') rings = g.coordinates || [];
      else if (g.type === 'MultiPolygon'){
        (g.coordinates || []).forEach(function(part){ part.forEach(function(r){ rings.push(r); }); });
      }
      rings.forEach(function(ring){
        ring.forEach(function(c){
          if (c[0] < minX) minX = c[0];
          if (c[0] > maxX) maxX = c[0];
          if (c[1] < minY) minY = c[1];
          if (c[1] > maxY) maxY = c[1];
        });
      });
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function _detectLonLat(geoJson, bbox){
    // 我们自家 exporter 标记
    if (geoJson.crs && geoJson.crs.properties && geoJson.crs.properties.name === 'tianming-canvas-coords') return false;
    // 启发·真实 GIS 常见两类经度域：
    //   1) 标准 [-180,180] lon/lat
    //   2) 0..360 / 跨 180 经线的 lon/lat（部分 MapChart / GIS 导出会把东经继续记到 180+）
    // ming-2.geojson 属于第二类：x≈48..192, y≈-3..78。旧逻辑只认 maxX<=180，
    // 导致它被误判为 canvas 坐标，进而没有做 Y 轴反向和投影，导入后看起来像“翻转/错位”。
    if (!isFinite(bbox.minX) || !isFinite(bbox.minY)) return false;
    var latLooks = bbox.minY >= -90 && bbox.maxY <= 90;
    var lon180 = bbox.minX >= -180 && bbox.maxX <= 180;
    var lon360 = bbox.minX >= 0 && bbox.maxX <= 360;
    var lonShifted = bbox.minX >= -180 && bbox.maxX <= 360 && bbox.maxX > 180 && (bbox.maxX - bbox.minX) <= 360;
    if (!latLooks || !(lon180 || lon360 || lonShifted)) return false;
    // 若 bbox 极小 (< 5 单位) 且原点 ~0·几乎确定是 lon/lat
    var span = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
    if (span < 5) return true;
    // 大 span 但仍像经纬度范围·按 lon/lat 处理 (canvas 通常 width/height 明显超过经纬度范围)
    return true;
  }

  // ring 转 division 顶点·闭合点 (首尾相同) 去掉·过滤无效
  function _ringToPoly(ring, project){
    if (!ring || ring.length < 4) return [];   // GeoJSON 闭合 ring 至少 4 点 (3 + 闭合)
    var pts = ring.slice();
    // 去尾闭合点
    var first = pts[0], last = pts[pts.length - 1];
    if (first && last && first[0] === last[0] && first[1] === last[1]) pts = pts.slice(0, -1);
    return pts.map(function(c){ return project([c[0], c[1]]); });
  }

  function _polyAreaAbs(poly){
    if (!poly || poly.length < 3) return 0;
    var s = 0;
    for (var i = 0; i < poly.length; i++){
      var j = (i + 1) % poly.length;
      s += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1];
    }
    return Math.abs(s) / 2;
  }

  // Douglas-Peucker·递归抽稀·points = [[x,y],...] in canvas space·epsilon = 容差 (canvas px)
  function _perpDist(p, a, b){
    var dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx === 0 && dy === 0){
      var ddx = p[0] - a[0], ddy = p[1] - a[1];
      return Math.sqrt(ddx*ddx + ddy*ddy);
    }
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx*dx + dy*dy);
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    var px = a[0] + t * dx, py = a[1] + t * dy;
    var ex = p[0] - px, ey = p[1] - py;
    return Math.sqrt(ex*ex + ey*ey);
  }
  function _simplifyDP(points, epsilon){
    if (!points || points.length < 3) return points || [];
    // 迭代式·避免深递归 stack 爆 (10k 顶点 ring)
    var keep = new Uint8Array(points.length);
    keep[0] = 1; keep[points.length - 1] = 1;
    var stack = [[0, points.length - 1]];
    while (stack.length){
      var seg = stack.pop();
      var s = seg[0], e = seg[1];
      var maxD = 0, maxI = -1;
      var a = points[s], b = points[e];
      for (var i = s + 1; i < e; i++){
        var d = _perpDist(points[i], a, b);
        if (d > maxD){ maxD = d; maxI = i; }
      }
      if (maxD > epsilon && maxI > 0){
        keep[maxI] = 1;
        stack.push([s, maxI]);
        stack.push([maxI, e]);
      }
    }
    var out = [];
    for (var k = 0; k < points.length; k++){
      if (keep[k]) out.push(points[k]);
    }
    return out;
  }
  // 单 ring 抽稀·只在顶点数超阈值时启用·返回 {ring, before, after}
  function _maybeSimplifyRing(ring, epsilon, threshold){
    if (!ring || ring.length <= threshold) return { ring: ring, before: ring ? ring.length : 0, after: ring ? ring.length : 0 };
    var simplified = _simplifyDP(ring, epsilon);
    // 防过抽·至少留 3 顶点
    if (simplified.length < 3) return { ring: ring, before: ring.length, after: ring.length };
    return { ring: simplified, before: ring.length, after: simplified.length };
  }
  function _featureStableId(props){
    var raw = props.id || props.ID || props.Id || props.gid || props.GID || props.adcode || props.code || '';
    if (raw === null || raw === undefined || raw === '') return '';
    return 'geo_' + String(raw).trim().replace(/[^\w\u4e00-\u9fff-]+/g, '_');
  }

  // 从 properties 字段建 division opts·_full 优先
  function _featureToDivOpts(feature, polygon, holes, extraPolygons){
    var props = feature.properties || {};
    if (props._full && typeof props._full === 'object'){
      var full = Object.assign({}, props._full);
      full.polygon = polygon;
      full.holes = holes;
      full.extraPolygons = extraPolygons;
      return full;
    }
    return {
      id: _featureStableId(props),
      name: props.name || props.NAME || props.Name || props.title || props.TITLE || props.label || ('feature_' + Math.floor(Math.random()*9999)),
      level: props.level || 'province',
      regionType: props.regionType || 'normal',
      terrain: props.terrain || '平原',
      prosperity: props.prosperity != null ? Number(props.prosperity) : 50,
      taxLevel: props.taxLevel || '中',
      specialResources: props.specialResources || '',
      officialPosition: props.officialPosition || '',
      governor: props.governor || '',
      dejureOwner: props.dejureOwner || '',
      crossDynastyId: props.crossDynastyId || '',
      bitmap_color: props.fill || props.color || '',
      autonomy: {
        type: props.autonomyType || 'zhixia',
        subtype: '',
        holder: props.autonomyHolder || '',
        suzerain: '',
        loyalty: props.loyalty != null ? props.loyalty : 80,
        tributeRate: props.tributeRate != null ? props.tributeRate : 0
      },
      populationDetail: {
        mouths: props.mouths || 0,
        households: props.households || 0,
        ding: props.ding || 0,
        fugitives: 0,
        hiddenCount: 0
      },
      population: props.mouths || 0,
      minxinLocal: props.minxinLocal != null ? props.minxinLocal : 60,
      corruptionLocal: props.corruptionLocal != null ? props.corruptionLocal : 30,
      establishedYear: props.establishedYear != null ? props.establishedYear : null,
      abolishedYear: props.abolishedYear != null ? props.abolishedYear : null,
      isCapital: !!props.isCapital,
      isFrontier: !!props.isFrontier,
      polygon: polygon,
      holes: holes,
      extraPolygons: extraPolygons
    };
  }

  function importGeoJSONData(geoJson, fname){
    var features = (geoJson && geoJson.features) || [];
    if (!features.length){
      meAlert('GeoJSON 无 features');
      return;
    }
    var bbox = _computeBbox(features);
    if (!isFinite(bbox.minX)){
      meAlert('GeoJSON 无可用坐标');
      return;
    }
    var isLonLat = _detectLonLat(geoJson, bbox);

    var bitmapWidth  = (ME.EDITOR.map && ME.EDITOR.map.bitmapWidth)  || 1280;
    var bitmapHeight = (ME.EDITOR.map && ME.EDITOR.map.bitmapHeight) || 800;

    // 投影·equirectangular·边距 5%·北上为正
    var margin = 0.05;
    var spanX = bbox.maxX - bbox.minX || 1;
    var spanY = bbox.maxY - bbox.minY || 1;
    var aspectGeo = spanX / spanY;
    var aspectCanvas = bitmapWidth / bitmapHeight;
    var scale, offsetX = 0, offsetY = 0;
    if (aspectGeo > aspectCanvas){
      // 地理更宽·按宽 fit·上下留 letterbox
      scale = bitmapWidth * (1 - margin * 2) / spanX;
      offsetX = bitmapWidth * margin;
      offsetY = (bitmapHeight - spanY * scale) / 2;
    } else {
      scale = bitmapHeight * (1 - margin * 2) / spanY;
      offsetY = bitmapHeight * margin;
      offsetX = (bitmapWidth - spanX * scale) / 2;
    }
    function project(coord){
      if (!isLonLat) return [coord[0], coord[1]];
      var x = offsetX + (coord[0] - bbox.minX) * scale;
      var y = offsetY + (bbox.maxY - coord[1]) * scale;  // Y 反向·北上
      return [x, y];
    }

    // 简化参数·epsilon = 0.5 canvas px (视觉无损)·threshold = 200 顶点起抽
    var SIMPLIFY_THRESHOLD = 200;
    var SIMPLIFY_EPSILON   = 0.5;
    var totalBefore = 0, totalAfter = 0, simplifiedRings = 0;

    function simplifyRing(ring){
      var r = _maybeSimplifyRing(ring, SIMPLIFY_EPSILON, SIMPLIFY_THRESHOLD);
      totalBefore += r.before;
      totalAfter  += r.after;
      if (r.before !== r.after) simplifiedRings++;
      return r.ring;
    }

    // 解析每 feature
    var divisions = [];
    var skipped = 0;
    features.forEach(function(f, idx){
      var g = f && f.geometry;
      if (!g){ skipped++; return; }
      var polygon = [], holes = [], extras = [];
      if (g.type === 'Polygon'){
        var rings = g.coordinates || [];
        if (rings.length === 0){ skipped++; return; }
        polygon = simplifyRing(_ringToPoly(rings[0], project));
        holes = rings.slice(1).map(function(r){
          return simplifyRing(_ringToPoly(r, project));
        }).filter(function(h){ return h.length >= 3; });
      } else if (g.type === 'MultiPolygon'){
        var parts = g.coordinates || [];
        if (parts.length === 0){ skipped++; return; }
        var projectedParts = parts.map(function(part){
          var outer = simplifyRing(_ringToPoly(part && part[0], project));
          if (!outer || outer.length < 3) return null;
          return {
            outer: outer,
            holes: ((part && part.slice(1)) || []).map(function(r){
              return simplifyRing(_ringToPoly(r, project));
            }).filter(function(h){ return h.length >= 3; })
          };
        }).filter(Boolean);
        if (!projectedParts.length){ skipped++; return; }
        // GeoJSON 不保证最大陆块一定排在第一个；主 polygon 取面积最大，其余作为飞地。
        projectedParts.sort(function(a,b){ return _polyAreaAbs(b.outer) - _polyAreaAbs(a.outer); });
        polygon = projectedParts[0].outer;
        holes = projectedParts[0].holes;
        extras = projectedParts.slice(1).map(function(part){ return part.outer; });
      } else {
        skipped++;
        return;
      }
      if (polygon.length < 3){ skipped++; return; }
      var opts = _featureToDivOpts(f, polygon, holes, extras);
      divisions.push(TM.MapEditor.createDivision(opts));
    });

    if (divisions.length === 0){
      meAlert('GeoJSON 中无可用 Polygon / MultiPolygon feature' + (skipped ? '·跳过 ' + skipped + ' 条' : ''));
      return;
    }

    // 询问替换还是合并·附简化统计
    var simplifyMsg = simplifiedRings > 0
      ? '·抽稀 ' + simplifiedRings + ' ring·' + totalBefore + '→' + totalAfter + ' 顶点 (-' + Math.round((1 - totalAfter / totalBefore) * 100) + '%)'
      : '';
    var msg = 'GeoJSON 解析成功·' + divisions.length + ' 区划' +
      (skipped ? '·跳过 ' + skipped + ' 条非 polygon' : '') +
      (isLonLat ? '·lon/lat 自动投影到 ' + bitmapWidth + '×' + bitmapHeight + ' canvas' : '·canvas 坐标') +
      simplifyMsg +
      '\n\nOK = 替换当前地图\n取消 = 合并到当前地图';
    var replace = confirm(msg);

    if (replace){
      var props = geoJson.properties || {};
      var newMap;
      if (TM.MapEditor.createMapState){
        newMap = TM.MapEditor.createMapState({
          title: props.title || (fname || 'imported'),
          dynasty: props.dynasty || ME.EDITOR.map.dynasty,
          era: props.era || '',
          bitmapWidth: bitmapWidth,
          bitmapHeight: bitmapHeight,
          divisions: divisions
        });
      } else {
        // fallback·直接构造
        newMap = {
          version: 1,
          title: props.title || (fname || 'imported'),
          dynasty: props.dynasty || ME.EDITOR.map.dynasty,
          era: props.era || '',
          bitmapWidth: bitmapWidth,
          bitmapHeight: bitmapHeight,
          divisions: divisions,
          annotations: [], rivers: [], roads: [], strongholds: [],
          areaLinks: [], ferries: [], factions: [],
          meta: { author: '', notes: '', createdAt: Date.now() }
        };
      }
      ME.loadMap(newMap);
    } else {
      ME.commitMutation('import geojson features', function(){
        if (!ME.EDITOR.map.divisions) ME.EDITOR.map.divisions = [];
        divisions.forEach(function(d){ ME.EDITOR.map.divisions.push(d); });
      });
    }
    if (global.meToast) global.meToast('GeoJSON 导入·' + divisions.length + ' 区划' + (replace ? '·替换' : '·合并'), 'info', 2000);
    ME.fire('geojson-imported', { count: divisions.length, fname: fname, replaced: replace });
  }

  function importGeoJSON(){
    pickJSON(function(obj, fname){
      if (!obj) return;
      if (obj.type !== 'FeatureCollection'){
        meAlert('非 GeoJSON FeatureCollection·若是地图编辑器原生 JSON 请用「载剧」');
        return;
      }
      importGeoJSONData(obj, fname);
    });
  }

  // ─── Shapefile (.shp) import ─────────────────────────────
  //
  // 极简 shp parser·只读 Polygon (type 5)·忽略 .dbf 属性 (用 import 后再标)
  // 一个 record 内 rings·rings[0] = 主多边形·rings[1..] = 洞 (按出现顺序·不查 winding)
  // 多 outer ring 共一 record·复杂场合需 winding 检测·暂不支持·user 可后期 split
  // 不读 .zip·要求 user 提供解压后的 .shp 单文件

  function pickShapefile(callback){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.shp,application/octet-stream';
    input.onchange = function(e){
      var f = e.target.files && e.target.files[0];
      if (!f){ callback && callback(null); return; }
      var reader = new FileReader();
      reader.onload = function(ev){
        try {
          callback && callback(ev.target.result, f.name);
        } catch(err){
          meAlert('shp 解析失败·' + err.message);
          callback && callback(null);
        }
      };
      reader.readAsArrayBuffer(f);
    };
    input.click();
  }

  // 把 shp ArrayBuffer 解为 FeatureCollection·走 GeoJSON 解析器投影
  function _parseShapefile(arrayBuffer){
    var view = new DataView(arrayBuffer);
    if (view.byteLength < 100) throw new Error('文件太小·非 shapefile');
    var fileCode = view.getInt32(0, false);   // big-endian
    if (fileCode !== 9994) throw new Error('shp magic 不匹配 (' + fileCode + ')·非 shapefile');
    var fileLength = view.getInt32(24, false) * 2;  // 字节
    var shapeType  = view.getInt32(32, true);       // little-endian
    if (shapeType !== 5 && shapeType !== 15 && shapeType !== 25){
      // 5 = Polygon, 15 = PolygonZ, 25 = PolygonM
      throw new Error('shape type ' + shapeType + ' 不支持·仅 Polygon (5/15/25)');
    }

    var features = [];
    var pos = 100;   // header 后
    while (pos < view.byteLength && pos < fileLength){
      if (pos + 12 > view.byteLength) break;
      var contentLength = view.getInt32(pos + 4, false) * 2;  // 字节
      var recordType    = view.getInt32(pos + 8, true);
      var contentStart  = pos + 8;            // record content 起·含 type 字段
      pos += 8 + contentLength;
      if (recordType === 0) continue;          // null shape·跳

      if (recordType === 5 || recordType === 15 || recordType === 25){
        // type(4) + bbox(32) + numParts(4) + numPoints(4) + parts[] + points[]
        var numParts  = view.getInt32(contentStart + 4 + 32, true);
        var numPoints = view.getInt32(contentStart + 4 + 36, true);
        var partsStart  = contentStart + 4 + 40;
        var pointsStart = partsStart + numParts * 4;
        var parts = [];
        for (var i = 0; i < numParts; i++){
          parts.push(view.getInt32(partsStart + i * 4, true));
        }
        var rings = [];
        for (var p = 0; p < numParts; p++){
          var sIdx = parts[p];
          var eIdx = (p < numParts - 1) ? parts[p + 1] : numPoints;
          var ring = [];
          for (var j = sIdx; j < eIdx; j++){
            var x = view.getFloat64(pointsStart + j * 16,     true);
            var y = view.getFloat64(pointsStart + j * 16 + 8, true);
            ring.push([x, y]);
          }
          rings.push(ring);
        }
        if (rings.length === 0) continue;
        features.push({
          type: 'Feature',
          properties: { _shpRecord: features.length + 1 },
          geometry: { type: 'Polygon', coordinates: rings }
        });
      }
      // 其它 recordType 跳过 (Point/Polyline/etc.)
    }

    return {
      type: 'FeatureCollection',
      features: features,
      properties: { source: 'shapefile', shapeType: shapeType }
    };
  }

  function importShapefile(){
    pickShapefile(function(buf, fname){
      if (!buf) return;
      var fc;
      try {
        fc = _parseShapefile(buf);
      } catch(err){
        meAlert('shp 解析失败·' + err.message);
        return;
      }
      if (!fc.features.length){
        meAlert('shp 无可用 Polygon·可能是 Point / Polyline 类型·或文件损坏');
        return;
      }
      // 走 GeoJSON 路径 (含 lon/lat 投影 + simplify)
      importGeoJSONData(fc, fname);
    });
  }

  // ─── json export ──────────────────────────────────────────

  function exportJSON(){
    // phase 13.3·raster 改动 → dataB64 commit
    if (TM.MapEditor.rastermaps) TM.MapEditor.rastermaps.commitAllDirty();
    var data = JSON.stringify(ME.EDITOR.map, null, 2);
    var name = (ME.EDITOR.map.title || 'map').replace(/[^\w一-龥\-]/g, '_');
    var dynasty = ME.EDITOR.map.dynasty || 'unknown';
    var ts = new Date().toISOString().slice(0,10);
    download(name + '_' + dynasty + '_' + ts + '.json', data, 'application/json');
    ME.fire('map-exported');
  }

  // phase 14.1·导出 game P.map 直读格式
  function exportGamePMap(){
    if (typeof convertMapEditorToGame !== 'function'){
      meAlert('map-editor-to-game.js 未加载·无法导出 game 格式');
      return;
    }
    if (TM.MapEditor.rastermaps) TM.MapEditor.rastermaps.commitAllDirty();
    var gm = convertMapEditorToGame(ME.EDITOR.map, { splitExclaves: true });
    var data = JSON.stringify(gm, null, 2);
    var name = (ME.EDITOR.map.title || 'map').replace(/[^\w一-龥\-]/g, '_');
    var ts = new Date().toISOString().slice(0,10);
    download(name + '_pmap_' + ts + '.json', data, 'application/json');
    ME.fire('map-exported');
  }

  // ─── GeoJSON export ──────────────────────────────────────

  function exportGeoJSON(){
    var divs = ME.EDITOR.map.divisions;
    var features = divs.filter(function(d){
      return d.polygon && d.polygon.length >= 3;
    }).map(function(d){
      // GeoJSON polygon·闭合 ring·首尾相同
      var ring = d.polygon.map(function(p){ return [p[0], p[1]]; });
      ring.push(ring[0].slice());

      // Properties·复制 division 字段·扁平化部分 nested
      var properties = {
        id: d.id,
        name: d.name,
        level: d.level,
        regionType: d.regionType,
        terrain: d.terrain,
        prosperity: d.prosperity,
        taxLevel: d.taxLevel,
        specialResources: d.specialResources,
        officialPosition: d.officialPosition,
        governor: d.governor,
        dejureOwner: d.dejureOwner,
        crossDynastyId: d.crossDynastyId,
        autonomyType: d.autonomy ? d.autonomy.type : 'zhixia',
        autonomyHolder: d.autonomy ? d.autonomy.holder : '',
        loyalty: d.autonomy ? d.autonomy.loyalty : null,
        tributeRate: d.autonomy ? d.autonomy.tributeRate : null,
        mouths: (d.populationDetail || {}).mouths,
        households: (d.populationDetail || {}).households,
        ding: (d.populationDetail || {}).ding,
        minxinLocal: d.minxinLocal,
        corruptionLocal: d.corruptionLocal,
        establishedYear: d.establishedYear,
        abolishedYear: d.abolishedYear,
        // flags
        isCapital: !!d.isCapital,
        isFrontier: !!d.isFrontier,
        // 完整 division (备 import 不丢)
        _full: d
      };

      return {
        type: 'Feature',
        properties: properties,
        geometry: {
          type: 'Polygon',
          coordinates: [ring]
        }
      };
    });

    var collection = {
      type: 'FeatureCollection',
      crs: {
        type: 'name',
        properties: { name: 'tianming-canvas-coords' }
      },
      properties: {
        dynasty: ME.EDITOR.map.dynasty,
        era: ME.EDITOR.map.era,
        title: ME.EDITOR.map.title,
        bitmapWidth: ME.EDITOR.map.bitmapWidth,
        bitmapHeight: ME.EDITOR.map.bitmapHeight,
        exportedAt: new Date().toISOString(),
        version: 'tianming-mapeditor-1'
      },
      features: features
    };

    var data = JSON.stringify(collection, null, 2);
    var name = ME.EDITOR.map.dynasty + '-' + new Date().toISOString().slice(0,10);
    download(name + '.geojson', data, 'application/geo+json');
    ME.fire('geojson-exported');
  }

  // ─── 剧本编辑器·scenario schema export ───────────────────

  function exportScenarioSchema(){
    // 用 map-converter.js·若加载·或自实现 minimal
    var divs = ME.EDITOR.map.divisions;

    // 按 level 分层·country / province / prefecture / county / district
    var byLevel = { country: [], province: [], prefecture: [], county: [], district: [] };
    divs.forEach(function(d){
      if (byLevel[d.level]) byLevel[d.level].push(d);
    });

    // 构 hierarchy·country 为根·递归 children (按 polygon containment 推算)
    // 简化·按 level 顺序·province 是 country 的 child·prefecture 是 province 的 child 等
    // 实际 containment 需 polygon-in-polygon test·此处 skip·user 后期自填 parent

    // 转 game schema·  scenarios/ 中用的格式
    var scenario = {
      version: 1,
      dynasty: ME.EDITOR.map.dynasty,
      era: ME.EDITOR.map.era,
      title: ME.EDITOR.map.title,
      adminHierarchy: divs.map(function(d){
        // adminHierarchy 是扁平 array·id 互引
        return {
          id: d.id,
          name: d.name,
          level: d.level,
          parentId: d.dejureOwner || null,  // 暂用 dejureOwner·user 后期细化
          officialPosition: d.officialPosition,
          governor: d.governor,
          regionType: d.regionType,
          autonomy: d.autonomy,
          population: (d.populationDetail || {}).mouths || 0,
          populationDetail: d.populationDetail,
          prosperity: d.prosperity,
          taxLevel: d.taxLevel,
          terrain: d.terrain,
          specialResources: d.specialResources,
          minxinLocal: d.minxinLocal,
          corruptionLocal: d.corruptionLocal,
          carryingCapacity: d.carryingCapacity,
          fiscalDetail: d.fiscalDetail,
          publicTreasuryInit: d.publicTreasuryInit,
          permissions: d.permissions,
          byEthnicity: d.byEthnicity,
          byFaith: d.byFaith,
          baojia: d.baojia,
          neighbors: d.neighbors,
          establishedYear: d.establishedYear,
          abolishedYear: d.abolishedYear,
          timeline: d.timeline,
          sources: d.sources,
          crossDynastyId: d.crossDynastyId
        };
      }),
      map: {
        width: ME.EDITOR.map.bitmapWidth,
        height: ME.EDITOR.map.bitmapHeight,
        regions: divs.filter(function(d){ return d.polygon && d.polygon.length >= 3; }).map(function(d){
          // game runtime regions 格式·扁平 polygon [x1,y1,x2,y2,...]
          var flat = [];
          d.polygon.forEach(function(p){ flat.push(p[0], p[1]); });
          return {
            id: d.id,
            name: d.name,
            coords: flat,
            terrain: d.terrain,
            owner: d.dejureOwner || '',
            color: ''
          };
        })
      }
    };

    var data = JSON.stringify(scenario, null, 2);
    var name = ME.EDITOR.map.dynasty + '-scenario-' + new Date().toISOString().slice(0,10);
    download(name + '.json', data, 'application/json');
    ME.fire('scenario-exported');
  }

  function download(filename, content, mime){
    var blob = new Blob([content], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 100);
  }

  // ─── localStorage·快速保存 (兜底·防丢) ───────────────────

  var LS_KEY = 'tm.mapEditor.draft.v1';

  function saveDraft(){
    try {
      if (TM.MapEditor.rastermaps) TM.MapEditor.rastermaps.commitAllDirty();
      localStorage.setItem(LS_KEY, JSON.stringify(ME.EDITOR.map));
      ME.EDITOR.lastSavedAt = Date.now();
      ME.fire('draft-saved');
      return true;
    } catch(e){
      console.error('[io] saveDraft fail:', e);
      return false;
    }
  }

  function loadDraft(){
    try {
      var s = localStorage.getItem(LS_KEY);
      if (!s) return false;
      var obj = JSON.parse(s);
      ME.loadMap(obj);
      ME.fire('draft-loaded');
      return true;
    } catch(e){
      console.error('[io] loadDraft fail:', e);
      return false;
    }
  }

  function clearDraft(){
    try { localStorage.removeItem(LS_KEY); } catch(e){}
  }

  // ─── auto-save 间隔 30s (作兜底) ──────────────────────────

  var _autoSaveTimer = null;
  function startAutoSave(intervalMs){
    intervalMs = intervalMs || 30000;
    if (_autoSaveTimer) clearInterval(_autoSaveTimer);
    _autoSaveTimer = setInterval(function(){
      if (ME.EDITOR.dirty){
        saveDraft();
      }
    }, intervalMs);
  }

  function stopAutoSave(){
    if (_autoSaveTimer){ clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
  }

  // ─── expose ──────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.io = {
    importBitmap: importBitmap,
    importJSON: importJSON,
    importGeoJSON: importGeoJSON,
    importGeoJSONData: importGeoJSONData,
    importShapefile: importShapefile,
    exportJSON: exportJSON,
    exportGeoJSON: exportGeoJSON,
    exportScenarioSchema: exportScenarioSchema,
    exportGamePMap: exportGamePMap,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    startAutoSave: startAutoSave,
    stopAutoSave: stopAutoSave,
    download: download,
    pickImage: pickImage,
    pickJSON: pickJSON
  };

})(typeof window !== 'undefined' ? window : this);
