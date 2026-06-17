// map-editor-perf.js
// 性能 profile·浮窗显·FPS / 渲染时间 / 内存 / 数据规模
// 默认隐·toggle 开关·~30 fps 采样
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[perf] core not loaded'); return; }

  var STATE = {
    enabled: false,
    overlayEl: null,
    samples: [],         // 最近 N 次 render 时间·ms
    sampleSize: 60,
    lastFrame: 0,
    fps: 0,
    avgRender: 0,
    maxRender: 0,
    minRender: 0,
    lastUpdate: 0,
    updateInterval: 250  // 4 Hz UI 更新
  };

  // ─── render hook ────────────────────────────────────────

  // 包装 render·测量耗时
  var originalRender = null;
  function installHook(){
    if (originalRender) return; // 已装
    if (!ME.requestRender) return;

    // 找原 render·hook 到 EDITOR_internal 不容易·改 hook fire('render')
    // 简化·定时采样 + 测 frame interval
    // 用 requestAnimationFrame loop 测 FPS
    var lastT = performance.now();
    function sample(){
      if (!STATE.enabled){ return; } // stop
      var now = performance.now();
      var delta = now - lastT;
      lastT = now;
      // delta = ms between frames·FPS = 1000 / delta·当 idle 时 delta 大
      // 不严格代表 render 时间·只反映 RAF tick
      addSample(delta);
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);

    // 也 hook mutation 事件采样 div count
    ME.on('mutation', updateOverlay);
    ME.on('map-loaded', updateOverlay);
  }

  function addSample(ms){
    STATE.samples.push(ms);
    if (STATE.samples.length > STATE.sampleSize) STATE.samples.shift();

    var now = performance.now();
    if (now - STATE.lastUpdate < STATE.updateInterval) return;
    STATE.lastUpdate = now;

    if (STATE.samples.length === 0) return;
    var sum = 0, mx = 0, mn = Infinity;
    for (var i = 0; i < STATE.samples.length; i++){
      var v = STATE.samples[i];
      sum += v;
      if (v > mx) mx = v;
      if (v < mn) mn = v;
    }
    STATE.avgRender = sum / STATE.samples.length;
    STATE.maxRender = mx;
    STATE.minRender = mn;
    STATE.fps = STATE.avgRender > 0 ? Math.round(1000 / STATE.avgRender) : 0;
    updateOverlay();
  }

  // ─── overlay UI ─────────────────────────────────────────

  function ensureOverlay(){
    if (STATE.overlayEl) return STATE.overlayEl;
    var el = document.createElement('div');
    el.id = 'me-perf-overlay';
    el.style.cssText = 'position:fixed; right:8px; bottom:42px; z-index:9998; background:rgba(20,20,26,0.92); border:1px solid #3a3530; border-radius:4px; padding:8px 10px; font-family:Menlo,monospace; font-size:11px; color:#e8ddc8; min-width:200px; box-shadow:0 4px 20px rgba(0,0,0,0.5); display:none;';
    document.body.appendChild(el);
    STATE.overlayEl = el;
    return el;
  }

  function updateOverlay(){
    if (!STATE.enabled) return;
    var el = ensureOverlay();
    var divs = ME.EDITOR.map.divisions;
    var nDivs = divs.length;
    var nVerts = 0;
    var nExtras = 0;
    var nHoles = 0;
    var nAnnotations = (ME.EDITOR.map.annotations || []).length;
    divs.forEach(function(d){
      nVerts += (d.polygon || []).length;
      (d.extraPolygons || []).forEach(function(p){ nVerts += p.length; nExtras++; });
      (d.holes || []).forEach(function(p){ nVerts += p.length; nHoles++; });
    });

    var memInfo = '';
    if (performance && performance.memory){
      var used = performance.memory.usedJSHeapSize;
      var total = performance.memory.totalJSHeapSize;
      memInfo = '<div>heap·<b style="color:#c9a96e">' + fmtMB(used) + '</b> / ' + fmtMB(total) + '</div>';
    }

    var fpsColor = STATE.fps >= 50 ? '#6a9a7f' : STATE.fps >= 30 ? '#c9a96e' : '#dc4f3a';
    var renderColor = STATE.avgRender < 16 ? '#6a9a7f' : STATE.avgRender < 33 ? '#c9a96e' : '#dc4f3a';

    el.innerHTML = '\
      <div style="color:#c9a96e; font-size:10px; margin-bottom:6px; letter-spacing:0.1em;">PERFORMANCE PROFILE</div>\
      <div style="display:grid; grid-template-columns:auto 1fr; gap:2px 10px;">\
        <span>FPS·</span><span style="color:' + fpsColor + ';"><b>' + STATE.fps + '</b></span>\
        <span>render·</span><span style="color:' + renderColor + ';"><b>' + STATE.avgRender.toFixed(1) + 'ms</b> (avg)</span>\
        <span>·</span><span>min ' + STATE.minRender.toFixed(1) + ' / max ' + STATE.maxRender.toFixed(1) + 'ms</span>\
        <span>div·</span><span><b>' + nDivs + '</b></span>\
        <span>poly verts·</span><span><b>' + nVerts + '</b> (avg ' + (nDivs ? Math.round(nVerts/nDivs) : 0) + ')</span>\
        <span>飞地·</span><span>' + nExtras + ' 块</span>\
        <span>圈·</span><span>' + nHoles + ' 块</span>\
        <span>字注·</span><span>' + nAnnotations + '</span>\
        <span>zoom·</span><span>' + Math.round(ME.EDITOR.camera.zoom * 100) + '%</span>\
      </div>\
      ' + memInfo + '\
      <div style="margin-top:6px; padding-top:6px; border-top:1px solid #3a3530; display:flex; gap:6px;">\
        <button class="me-btn" id="perf-bench" style="font-size:10px; padding:3px 6px;">压测</button>\
        <button class="me-btn" id="perf-clear" style="font-size:10px; padding:3px 6px;">清样本</button>\
        <button class="me-btn me-btn-warn" id="perf-close" style="font-size:10px; padding:3px 6px; margin-left:auto;">关闭</button>\
      </div>\
    ';

    var bench = document.getElementById('perf-bench');
    if (bench) bench.onclick = runBenchmark;
    var clear = document.getElementById('perf-clear');
    if (clear) clear.onclick = function(){ STATE.samples.length = 0; };
    var close = document.getElementById('perf-close');
    if (close) close.onclick = disable;
  }

  function fmtMB(b){
    return (b / 1024 / 1024).toFixed(1) + 'MB';
  }

  // ─── benchmark ──────────────────────────────────────────

  function runBenchmark(){
    var divs = ME.EDITOR.map.divisions;
    var n = divs.length;

    var report = ['── 压测 (n=' + n + ') ──'];

    // 1·渲染压测·N 次 RAF
    var renderCount = 60;
    var renderStart = performance.now();
    var done = 0;
    function renderTick(){
      ME.requestRender();
      // 等 RAF 完
      requestAnimationFrame(function(){
        done++;
        if (done < renderCount){
          renderTick();
        } else {
          var renderElapsed = performance.now() - renderStart;
          var renderAvg = renderElapsed / renderCount;
          report.push('render·' + renderAvg.toFixed(2) + ' ms/frame·' + Math.round(1000 / renderAvg) + ' fps');
          // 2·邻省检测·全图
          if (n > 0){
            var nbStart = performance.now();
            var nbResult = ME.neighbor.computeAll();
            var nbElapsed = performance.now() - nbStart;
            var nbCount = Object.keys(nbResult).reduce(function(s, k){ return s + nbResult[k].length; }, 0) / 2;
            report.push('neighbor·' + nbElapsed.toFixed(2) + ' ms·' + Math.round(nbCount) + ' 对');
          }
          // 3·校验
          if (ME.validation){
            var vStart = performance.now();
            var vRep = ME.validation.validateAll();
            var vElapsed = performance.now() - vStart;
            var vSum = ME.validation.summarize(vRep);
            report.push('validation·' + vElapsed.toFixed(2) + ' ms·' + vSum.errors + ' 错 / ' + vSum.warns + ' 警');
          }
          meAlert(report.join('\n'));
        }
      });
    }
    renderTick();
  }

  // ─── enable / disable ──────────────────────────────────

  function enable(){
    STATE.enabled = true;
    ensureOverlay().style.display = 'block';
    updateOverlay();
    installHook();
  }

  function disable(){
    STATE.enabled = false;
    if (STATE.overlayEl) STATE.overlayEl.style.display = 'none';
  }

  function toggle(){
    if (STATE.enabled) disable();
    else enable();
  }

  // ─── stress test·gen N random divs ──────────────────────

  function generateStress(n){
    var w = ME.EDITOR.map.bitmapWidth || 1280;
    var h = ME.EDITOR.map.bitmapHeight || 800;
    var newDivs = [];
    for (var i = 0; i < n; i++){
      var cx = Math.random() * w;
      var cy = Math.random() * h;
      var radius = 5 + Math.random() * 20;
      var sides = 4 + Math.floor(Math.random() * 6);
      var poly = [];
      for (var k = 0; k < sides; k++){
        var ang = (k / sides) * Math.PI * 2 + Math.random() * 0.3;
        var r = radius * (0.7 + Math.random() * 0.6);
        poly.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
      }
      var d = ME.createDivision({
        name: '压测 ' + i,
        polygon: poly,
        prosperity: Math.floor(Math.random() * 100)
      });
      ME.recomputeDerived(d);
      newDivs.push(d);
    }
    ME.commitMutation('stress gen ' + n, function(){
      ME.EDITOR.map.divisions = ME.EDITOR.map.divisions.concat(newDivs);
    });
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.perf = {
    enable: enable,
    disable: disable,
    toggle: toggle,
    runBenchmark: runBenchmark,
    generateStress: generateStress,
    getState: function(){ return STATE; }
  };

})(typeof window !== 'undefined' ? window : this);
