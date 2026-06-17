// ============================================================
//  tm-mapeditor-fit.js — 地图编辑器「固定虚拟分辨率 + 整体等比缩放」移动端适配（2026-06-04）
//
//  地图编辑器是 height:100vh 满屏 app 壳（顶工具栏/左工具列/画布 stage/右抽屉/底浮条·一屏不滚·画布内部自有
//  camera 平移缩放）→ 范式 = **御案式 contain**（固定虚拟分辨率·按设备 contain 缩放·letterbox·不滚）。
//  与剧本编辑器（滚动式·tm-editor-fit）不同；与游戏（tm-fixed-fit）同范式，但虚拟分辨率取 1280×800（地图编辑器
//  桌面基线·实测三列布局完整），且**画布指针映射须配 tools.js 的 _csf 抗缩放补丁**（getMousePos/pinch 已改）。
//
//  机制：body 钉 1280×800 绝对定位 + transform contain 缩放；CSSOM 删 max-width @media + fixed→absolute + vw/vh→px
//        （含 .me-app{height:100vh}→800px）；归一化后**派发 resize** 让 map-editor-core 的 resizeCanvas 按 1280 布局
//        重测画布分辨率（否则画布卡在设备小尺寸）。
//
//  仅 capacitor（APK）或测试 ?fit=1 生效；桌面/普通 web 不动。
// ============================================================

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var VW = 1280, VH = 800;   // 地图编辑器虚拟设计分辨率（桌面基线）

  function shouldFit() {
    try {
      if (location.search.indexOf('fit=1') >= 0) return true;
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return true;
      if (window.TM && window.TM.platform && window.TM.platform.kind === 'capacitor') return true;
    } catch (_) {}
    return false;
  }
  if (!shouldFit()) return;

  (function lockViewport() {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.setAttribute('name', 'viewport'); (document.head || document.documentElement).appendChild(vp); }
    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
  })();

  var style = document.createElement('style');
  style.id = 'tm-mapeditor-fit-style';
  style.textContent =
    'html.tm-mapeditor-fit,html.tm-mapeditor-fit body{margin:0!important;padding:0!important;}' +
    'html.tm-mapeditor-fit{width:100%!important;height:100%!important;overflow:hidden!important;background:#0a0805;}' +
    'html.tm-mapeditor-fit body{width:' + VW + 'px!important;height:' + VH + 'px!important;' +
      'min-height:0!important;max-width:none!important;position:absolute!important;left:0!important;top:0!important;' +
      'transform-origin:0 0;overflow:hidden!important;}';
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add('tm-mapeditor-fit');

  // ── CSSOM 舞台归一化（同御案）──
  function normalizeStage() {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i], rules;
      try { rules = sheet.cssRules; } catch (_) { continue; }
      if (rules) walkRules(sheet, rules);
    }
  }
  function walkRules(owner, rules) {
    for (var j = rules.length - 1; j >= 0; j--) {
      var r = rules[j];
      if (r.type === 4) {
        if (r.media && String(r.media.mediaText).indexOf('max-width') >= 0) { try { owner.deleteRule(j); } catch (_) {} continue; }
        try { if (r.cssRules) walkRules(r, r.cssRules); } catch (_) {}
      } else if (r.type === 1 && r.style) {
        fixStyleRule(r.style);
      }
    }
  }
  function fixStyleRule(st) {
    try {
      if (st.position === 'fixed') st.setProperty('position', 'absolute', st.getPropertyPriority('position'));
      var props = [], k;
      for (k = 0; k < st.length; k++) props.push(st[k]);
      for (k = 0; k < props.length; k++) {
        var p = props[k], v = st.getPropertyValue(p);
        if (v && /\d(?:\.\d+)?v[wh]/.test(v)) {
          var nv = v.replace(/(\d+(?:\.\d+)?)vw/g, function (_m, n) { return (parseFloat(n) * VW / 100) + 'px'; })
                    .replace(/(\d+(?:\.\d+)?)vh/g, function (_m, n) { return (parseFloat(n) * VH / 100) + 'px'; });
          if (nv !== v) st.setProperty(p, nv, st.getPropertyPriority(p));
        }
      }
    } catch (_) {}
  }
  function inlineVwVh(st) {
    var ct = st && st.cssText; if (!ct || !/\d(?:\.\d+)?v[wh]/.test(ct)) return;
    var props = [], k; for (k = 0; k < st.length; k++) props.push(st[k]);
    for (k = 0; k < props.length; k++) {
      var p = props[k], v = st.getPropertyValue(p);
      if (v && /\d(?:\.\d+)?v[wh]/.test(v))
        st.setProperty(p, v.replace(/(\d+(?:\.\d+)?)vw/g, function (_m, n) { return (parseFloat(n) * VW / 100) + 'px'; })
                           .replace(/(\d+(?:\.\d+)?)vh/g, function (_m, n) { return (parseFloat(n) * VH / 100) + 'px'; }),
                    st.getPropertyPriority(p));
    }
  }
  function anchorEl(el) {
    var st = el && el.style; if (!st) return;
    if (st.position === 'fixed') st.position = 'absolute';
    inlineVwVh(st);
  }
  function anchorTree(root) {
    if (!root || root.nodeType !== 1 || !document.body) return;
    anchorEl(root);
    var els = root.querySelectorAll ? root.querySelectorAll('*') : null;
    if (els) for (var i = 0; i < els.length; i++) anchorEl(els[i]);
  }

  // 归一化后派发 resize → 触发 map-editor-core 的 resizeCanvas（按 1280×800 布局重测画布·否则卡设备小尺寸）
  var _lastDispatch = 0;
  function pokeResize() {
    try { window.dispatchEvent(new Event('resize')); }
    catch (_) { try { var ev = document.createEvent('Event'); ev.initEvent('resize', true, true); window.dispatchEvent(ev); } catch (__){} }
  }
  function normalizeSoon() {
    try { normalizeStage(); } catch (_) {}
    try { anchorTree(document.body); } catch (_) {}
    fit();
    pokeResize();   // 让编辑器按缩放后舞台重测画布
  }
  normalizeSoon();
  if (document.readyState !== 'complete') window.addEventListener('load', normalizeSoon);
  document.addEventListener('DOMContentLoaded', normalizeSoon);
  setTimeout(normalizeSoon, 300); setTimeout(normalizeSoon, 1000); setTimeout(normalizeSoon, 2500); setTimeout(normalizeSoon, 5000);
  try {
    var mo = new MutationObserver(function (muts) {
      var needSheet = false;
      for (var m = 0; m < muts.length; m++) {
        var added = muts[m].addedNodes;
        for (var k = 0; k < added.length; k++) {
          var n = added[k]; if (!n || n.nodeType !== 1) continue;
          if (n.nodeName === 'STYLE' || n.nodeName === 'LINK') needSheet = true;
          anchorTree(n);
        }
      }
      if (needSheet) { try { normalizeStage(); } catch (_) {} }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}

  // ── contain 缩放（同御案）──
  var raf = 0, _internalResize = false;
  function fit() {
    raf = 0;
    var sw = window.innerWidth, sh = window.innerHeight;
    if (!sw || !sh || !document.body) return;
    var s = Math.min(sw / VW, sh / VH);
    var x = Math.round((sw - VW * s) / 2), y = Math.round((sh - VH * s) / 2);
    document.body.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(fit); }
  // 注意：fit 仅设 transform·不派发 resize → 不与 pokeResize 成环（pokeResize 只在 normalizeSoon 有限次调用）
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () { setTimeout(function () { fit(); pokeResize(); }, 60); });
  if (document.body) fit(); else window.addEventListener('DOMContentLoaded', fit);
  setTimeout(fit, 200); setTimeout(fit, 800); setTimeout(fit, 2000);

  window.TM = window.TM || {};
  window.TM.mapEditorFit = { refit: fit, normalize: normalizeSoon, VW: VW, VH: VH };
})();
