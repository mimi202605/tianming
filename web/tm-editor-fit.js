// ============================================================
//  tm-editor-fit.js — 剧本工坊/编辑器「固定宽度缩放」移动端适配（2026-06-04）
//
//  与御案 tm-fixed-fit 同哲学（固定画布·整体缩放·不 reflow），但**范式不同**：
//    · 御案：内容一屏装得下 → 固定 1920×1080·contain（min(W/VW,H/VH)）·overflow:hidden·不滚动·letterbox。
//    · 编辑器：内容比一屏高、要纵向滚 → 固定**画布宽 1280**·按设备宽 zoom 缩放·**纵向自然滚动**。
//      （transform:scale 不改滚动尺寸 → 横向溢出/纵向留白；zoom 连同布局带滚动一起缩 → 滚动条天然正确。）
//
//  复用御案已验证的 CSSOM「舞台归一化」：删含 max-width 的 @media（编辑器永远走桌面三列布局·不塌）
//    + 规则级/内联 position:fixed→absolute（弹窗/AI 栏锚到缩放画布而非真视口·Android WebView fixed 锚真视口的怪癖）
//    + vw/vh→px（钉到画布尺寸）。配 body{width:1280} + zoom 缩到设备宽。
//
//  仅 capacitor（APK）或测试 ?fit=1 生效；桌面/普通 web 不动。
// ============================================================

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var VW = 1280, VH = 720;   // 画布宽（桌面基线·实测 1280 三列布局正常）；VH 仅供 vh→px 换算

  function shouldFit() {
    try {
      if (location.search.indexOf('fit=1') >= 0) return true;            // 测试强制
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return true; // APK
      if (window.TM && window.TM.platform && window.TM.platform.kind === 'capacitor') return true;
    } catch (_) {}
    return false;
  }
  if (!shouldFit()) return;

  // device-width：layout viewport 钉真设备宽（不 pan·innerWidth 报真值）；锁缩放防双指干扰我们的 zoom。
  (function lockViewport() {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.setAttribute('name', 'viewport'); (document.head || document.documentElement).appendChild(vp); }
    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
  })();

  var style = document.createElement('style');
  style.id = 'tm-editor-fit-style';
  style.textContent =
    // 横向不溢出（画布超设备宽的部分由 zoom 缩进来·这里兜底夹住）；**纵向不夹**（编辑器要滚）。
    'html.tm-editor-fit{overflow-x:hidden!important;}' +
    // 固定画布宽 1280·从左上角缩放·高度自然（内容多高就多高·随之纵向滚）。
    'html.tm-editor-fit body{width:' + VW + 'px!important;margin:0!important;transform-origin:0 0;}';
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add('tm-editor-fit');

  // ── CSSOM 舞台归一化（同御案·仅同源样式表·改规则）──
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
      if (r.type === 4 /* MEDIA_RULE */) {
        if (r.media && String(r.media.mediaText).indexOf('max-width') >= 0) {
          try { owner.deleteRule(j); } catch (_) {}
          continue;
        }
        try { if (r.cssRules) walkRules(r, r.cssRules); } catch (_) {}
      } else if (r.type === 1 /* STYLE_RULE */ && r.style) {
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
  // ── DOM 归一化：内联 fixed→absolute + 内联 vw/vh→px（弹窗多用 el.style 内联创建）──
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
  function normalizeSoon() { try { normalizeStage(); } catch (_) {} try { anchorTree(document.body); } catch (_) {} fit(); }
  normalizeSoon();
  if (document.readyState !== 'complete') window.addEventListener('load', normalizeSoon);
  document.addEventListener('DOMContentLoaded', normalizeSoon);
  setTimeout(normalizeSoon, 300); setTimeout(normalizeSoon, 1000); setTimeout(normalizeSoon, 2500); setTimeout(normalizeSoon, 5000);
  // 编辑器进场后动态注入 <style> / 创建弹窗 → observer 即时归一。
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

  // ── fit：按设备宽 zoom 缩放（zoom 连布局带滚动一起缩·纵向滚动天然正确）──
  var raf = 0;
  function fit() {
    raf = 0;
    var sw = window.innerWidth;
    if (!sw || !document.body) return;
    var s = sw / VW;                       // 设备宽 / 画布宽
    document.body.style.zoom = String(s);  // 例：882/1280 ≈ 0.69
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(fit); }
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 60); });
  if (document.body) fit(); else window.addEventListener('DOMContentLoaded', fit);
  setTimeout(fit, 200); setTimeout(fit, 800); setTimeout(fit, 2000);

  window.TM = window.TM || {};
  window.TM.editorFit = { refit: fit, normalize: normalizeSoon, VW: VW, VH: VH };
})();
