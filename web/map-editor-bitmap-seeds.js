// map-editor-bitmap-seeds.js
// Phase 20.2·bitmap-aware seed
//
// 读底图·分类陆海 (luminance / 蓝偏置 / 用户取色)
// 散种子时·偏陆·避海·按 region 密度可调
// 同时·提供 land mask·供 coastline snap (20.3) 用
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[bitmap-seeds] core not loaded'); return; }

  var _maskCache = null;     // { w, h, mask: Uint8Array, mode, threshold }

  // ─── ① 取 bitmap ImageData ────────────────────────────

  function getBitmapData(){
    var img = ME.EDITOR.bitmapImage;
    if (!img) return null;
    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  }

  // ─── ② 分类·像素 → land (1) / sea (0) ─────────────────

  function classifyPixel(r, g, b, mode, sampleColor, tolerance){
    if (mode === 'luminance'){
      // 简·亮度阈
      var lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // 默认·陆 (0.25-0.85)·暗 = 山阴 / 树·亮 = 海面 / 雪
      // 实际反转·若海普遍亮蓝·此处需 user 调
      // 默认·亮度 < 200 = 陆
      return lum < 200 ? 1 : 0;
    }
    if (mode === 'bluedominant'){
      // 蓝色主导·sat 高·亮足 → 海
      var maxC = Math.max(r, g, b);
      var minC = Math.min(r, g, b);
      var sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      var blueDom = b > r + 10 && b > g + 5 && sat > 0.15;
      return blueDom ? 0 : 1;
    }
    if (mode === 'samplecolor' && sampleColor){
      var dr = r - sampleColor[0];
      var dg = g - sampleColor[1];
      var db = b - sampleColor[2];
      var d = Math.sqrt(dr * dr + dg * dg + db * db);
      var tol = tolerance != null ? tolerance : 50;
      return d < tol ? 0 : 1;   // 接近样色 = 海
    }
    return 1;
  }

  // ─── ③ 构 mask·全 bitmap 一遍 ──────────────────────────

  function buildLandMask(opts){
    opts = opts || {};
    var mode = opts.mode || 'bluedominant';
    var sampleColor = opts.sampleColor || null;
    var tolerance = opts.tolerance != null ? opts.tolerance : 50;

    var data = getBitmapData();
    if (!data){
      if (global.meToast) meToast('未载底图·先 [载图]', 'warn');
      return null;
    }

    var w = data.width, h = data.height;
    var mask = new Uint8Array(w * h);
    var px = data.data;
    var landCount = 0;
    for (var i = 0; i < w * h; i++){
      var r = px[i * 4];
      var g = px[i * 4 + 1];
      var b = px[i * 4 + 2];
      var land = classifyPixel(r, g, b, mode, sampleColor, tolerance);
      mask[i] = land;
      if (land) landCount++;
    }

    _maskCache = {
      w: w, h: h, mask: mask, mode: mode,
      sampleColor: sampleColor, tolerance: tolerance,
      landRatio: landCount / (w * h)
    };
    return _maskCache;
  }

  function getMask(){ return _maskCache; }

  function clearMaskCache(){ _maskCache = null; }

  // 查·世界坐标 (x, y) 是否陆地
  function isLand(wx, wy){
    if (!_maskCache) return true;
    var ix = Math.floor(wx);
    var iy = Math.floor(wy);
    if (ix < 0 || ix >= _maskCache.w || iy < 0 || iy >= _maskCache.h) return false;
    return _maskCache.mask[iy * _maskCache.w + ix] === 1;
  }

  // ─── ④ bitmap-aware seed·只在 land 区域 ───────────────

  function landAwarePoissonSeeds(n, bounds, opts){
    opts = opts || {};
    var minDist = opts.minDist;
    var mask = opts.mask || _maskCache;
    if (!mask){
      // 回退·普通 poisson
      if (TM.MapEditor.voronoi) return TM.MapEditor.voronoi.poissonSeeds(n, bounds);
      return [];
    }
    minDist = minDist || Math.sqrt(bounds.w * bounds.h * mask.landRatio / n) * 0.65;
    var seeds = [];
    var maxTries = n * 100;
    var tries = 0;
    while (seeds.length < n && tries < maxTries){
      tries++;
      var p = [
        bounds.x + Math.random() * bounds.w,
        bounds.y + Math.random() * bounds.h
      ];
      // 跳海
      if (!isLand(p[0], p[1])) continue;
      // 防聚
      var ok = true;
      for (var i = 0; i < seeds.length; i++){
        var dx = p[0] - seeds[i][0];
        var dy = p[1] - seeds[i][1];
        if (dx * dx + dy * dy < minDist * minDist){
          ok = false; break;
        }
      }
      if (ok) seeds.push(p);
    }
    return seeds;
  }

  // ─── ⑤ 中心密 / 边疏·偏置布种子 (real map style) ──────

  // 真实地图·中央 (王畿) 密·边疆 (羁縻 / 番) 疏
  // 接受 centers·权重数组·按距离 + 权重 落点
  function biasedSeeds(n, bounds, opts){
    opts = opts || {};
    var centers = opts.centers || [
      { x: bounds.x + bounds.w * 0.5, y: bounds.y + bounds.h * 0.5, weight: 1.0, sigma: bounds.w * 0.25 }
    ];
    var landMask = opts.landMask || _maskCache;
    var minDist = opts.minDist || Math.sqrt(bounds.w * bounds.h / n) * 0.5;

    var seeds = [];
    var maxTries = n * 200;
    var tries = 0;

    function densityAt(x, y){
      var d = 0;
      for (var i = 0; i < centers.length; i++){
        var c = centers[i];
        var dx = x - c.x, dy = y - c.y;
        var dist2 = dx * dx + dy * dy;
        var sigma2 = (c.sigma || 100) * (c.sigma || 100);
        d += (c.weight || 1) * Math.exp(-dist2 / (2 * sigma2));
      }
      return d;
    }

    var maxDensity = 0;
    for (var i = 0; i < centers.length; i++){
      maxDensity += centers[i].weight || 1;
    }

    while (seeds.length < n && tries < maxTries){
      tries++;
      var p = [
        bounds.x + Math.random() * bounds.w,
        bounds.y + Math.random() * bounds.h
      ];
      // mask 跳海
      if (landMask && !isLand(p[0], p[1])) continue;
      // density rejection sampling
      var dens = densityAt(p[0], p[1]);
      if (Math.random() > dens / maxDensity) continue;
      // 防聚
      var ok = true;
      for (var k = 0; k < seeds.length; k++){
        var dx = p[0] - seeds[k][0];
        var dy = p[1] - seeds[k][1];
        if (dx * dx + dy * dy < minDist * minDist){ ok = false; break; }
      }
      if (ok) seeds.push(p);
    }
    return seeds;
  }

  // ─── ⑥ 用户取色·click bitmap 取海色 ────────────────────

  var _picking = false;
  function startPickSeaColor(callback){
    _picking = true;
    if (global.meToast) meToast('点击底图·取海色', 'info', 3000);
    var canvas = ME.EDITOR.canvas;
    var handler = function(e){
      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var z = ME.EDITOR.camera.zoom;
      var wx = (sx - ME.EDITOR.camera.x) / z;
      var wy = (sy - ME.EDITOR.camera.y) / z;
      var data = getBitmapData();
      if (!data){ canvas.removeEventListener('click', handler, true); _picking = false; return; }
      var ix = Math.floor(wx);
      var iy = Math.floor(wy);
      if (ix < 0 || ix >= data.width || iy < 0 || iy >= data.height){
        if (global.meToast) meToast('点出底图外·重试', 'warn');
        return;
      }
      var i = (iy * data.width + ix) * 4;
      var r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
      canvas.removeEventListener('click', handler, true);
      _picking = false;
      var color = [r, g, b];
      buildLandMask({ mode: 'samplecolor', sampleColor: color, tolerance: 60 });
      if (global.meToast){
        meToast('海色·rgb(' + r + ',' + g + ',' + b + ')·陆 ' + Math.round((1 - _maskCache.landRatio) * 100) + '%', 'success', 3000);
      }
      if (callback) callback(color);
    };
    canvas.addEventListener('click', handler, true);
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.bitmapSeeds = {
    buildLandMask: buildLandMask,
    getMask: getMask,
    clearMaskCache: clearMaskCache,
    isLand: isLand,
    landAwarePoissonSeeds: landAwarePoissonSeeds,
    biasedSeeds: biasedSeeds,
    startPickSeaColor: startPickSeaColor
  };

  // map / bitmap 变·清 mask cache·防 stale
  ME.on('map-loaded', clearMaskCache);
  ME.on('bitmap-loaded', clearMaskCache);

})(typeof window !== 'undefined' ? window : this);
