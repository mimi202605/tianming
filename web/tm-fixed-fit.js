// ============================================================
//  tm-fixed-fit.js — 固定虚拟分辨率 + 整体等比缩放适配（移植 Phase 2 重做 · 2026-06-03）
//
//  御案是「图像对齐的固定布局」（背景图 rail / 绝对定位带倾角的动作钮 / 像素级面板）。
//  正解（owner 拍板）：整个 UI 当一块**固定虚拟分辨率舞台 1920×1080**，按设备屏幕**整体等比缩放铺满**
//                      （contain·一屏看全·宽高比不符时 letterbox 留黑边），不滚动、不 reflow。
//
//  ⚠️ 视口策略踩坑史（真机实证·别再走回头路）：
//    · width=1920：让 @media/innerWidth 看到桌面宽，但 Android WebView 把 layout viewport 撑成 1920>屏宽
//      → 整页能左右上下「平移」(pan)，html overflow:hidden 夹不住（被夹的是 body·layout viewport 自身超宽）。**死路**。
//    · width=device-width：layout viewport=真设备宽 → html=屏宽·overflow:hidden 真夹住·不滚动·transform 真 contain。
//      代价=御案的 @media(max-width:…) 会按真设备宽（横屏~900px）误触发 → 隐藏动作栏/左栏、御案 reflow 成残废。
//    · ✅ 解法 = device-width（拿干净缩放/不 pan/不滚动）
//             + 运行时 CSSOM「舞台归一化」(见下 normalizeStage)：删 max-width 断点 + fixed→absolute + vw/vh→px
//               （把御案从 viewport 相对改写成 1920×1080 舞台相对·不靠 WebView 的 fixed+transform 怪癖）
//             + 隐藏 legacy #mobile-nav（tm-game-loop _initMobileNav 冒的旧底栏）。
//
//  仅 capacitor（APK）或测试 ?fit=1 生效；桌面/普通 web 不动（窗口自由）。
// ============================================================

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 虚拟舞台分辨率（设置·界面显示·「渲染分辨率」存 tm.fitResolution='WxH'）。舞台越小 → fit 缩放
  // 因子越大 → 整个 UI（字/图/钮）等比变大，代价是单屏信息密度降低。
  // 未设置时：APK 出厂默认 1477×831「标准」（owner 拍板·1920 原生舞台在手机上 scale≈0.37 字太小）；
  // 桌面/网页默认不进 fit（自适应窗口），仅当玩家在设置里显式选定分辨率才走固定舞台（P社式语义：
  // 选低于窗口的分辨率 = 界面整体放大）。CSSOM 舞台归一化不可逆 → 改档由设置面板触发整页重载生效。
  var VW = 1477, VH = 831;
  try {
    var _res = localStorage.getItem('tm.fitResolution');
    if (_res && /^\d{3,4}x\d{3,4}$/.test(_res)) {
      var _p = _res.split('x');
      VW = +_p[0]; VH = +_p[1];
    }
  } catch (_) {}

  function shouldFit() {
    try {
      if (location.search.indexOf('fit=1') >= 0) return true;            // 测试强制
      if (window.TM && window.TM.platform && window.TM.platform.kind === 'capacitor') return true; // APK
      // 桌面/网页:玩家显式选定了固定分辨率 → 进 fit 舞台
      var r = localStorage.getItem('tm.fitResolution');
      if (r && /^\d{3,4}x\d{3,4}$/.test(r)) return true;
    } catch (_) {}
    return false;
  }
  if (!shouldFit()) return;

  // device-width：layout viewport 钉在真设备宽 → 不 pan、不滚动、innerWidth 报真值、transform 真 contain。
  // maximum-scale=1 + user-scalable=no 防「body 1920 宽撑大 layout viewport」并锁掉双指缩放。
  (function lockViewport() {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.setAttribute('name', 'viewport'); (document.head || document.documentElement).appendChild(vp); }
    vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
  })();

  var style = document.createElement('style');
  style.id = 'tm-fixed-fit-style';
  style.textContent =
    'html.tm-fixed-fit,html.tm-fixed-fit body{margin:0!important;padding:0!important;}' +
    'html.tm-fixed-fit{width:100%!important;height:100%!important;overflow:hidden!important;background:#120e0a;}' +
    'html.tm-fixed-fit body{width:' + VW + 'px!important;height:' + VH + 'px!important;' +
      'min-height:0!important;max-width:none!important;position:absolute!important;left:0!important;top:0!important;' +
      'transform-origin:0 0;overflow:hidden!important;}' +
    // 舞台内用 100vh/100vw 的布局改成贴满舞台（否则 vh/vw 指设备视口=逃出舞台）
    'html.tm-fixed-fit .home-stage{min-height:100%!important;height:100%!important;}' +
    'html.tm-fixed-fit .scn-page{position:absolute!important;}' +
    'html.tm-fixed-fit .var-drawer{height:100%!important;}' +
    // #tm-right-rail（原 fixed→absolute）嵌在定位容器 .gs-rail-right 里·会锚错它→飞出舞台；
    // 把容器 static 化（它只是个空壳定位上下文·rail 内容在 #tm-right-rail 内·绝对定位出流）→ rail 落到 body 舞台。
    'html.tm-fixed-fit .gs-rail-right{position:static!important;}' +
    // legacy 移动端底栏（tm-game-loop _initMobileNav·操作旧 ngui 面板·御案范式里是死货）→ 藏掉
    'html.tm-fixed-fit #mobile-nav{display:none!important;}';
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add('tm-fixed-fit');

  // ── CSSOM「舞台归一化」：把御案从「viewport 相对（fixed/vw/vh）」改写成「舞台相对（absolute/px）」──
  //   真机 Android WebView：position:fixed 锚到真视口（无视 body 的 transform）、vw/vh 也指真视口
  //   → fixed 顶栏/动作栏/弹窗/右 rail 飘到屏幕边、vw 定位错位（桌面 Edge honor transform 故看不出·真机才炸）。
  //   CSSOM 这层（仅同源样式表·改规则·仅 fixed-fit 下）：
  //     ① 删所有含 max-width 的 @media（不因真设备窄 reflow·保留 pointer:coarse/hover:none/max-height/min-width）；
  //     ② 值里的 Nvw/Nvh → px（N*VW/100 / N*VH/100·钉到 1920×1080 舞台·不再指真视口）。
  //   位置（fixed→absolute+reparent）交 DOM 层 anchorEl 处理（见下·按计算后 position 侦测·兼收规则与内联 fixed）。
  //   配 body{position:absolute;1920×1080;transform:scale} → 整个御案成自洽的绝对定位舞台·随 body 等比缩放。
  //   仅同源可读写；跨域/未就绪 try/catch 跳过，靠多次重扫 + MutationObserver 兜未来注入的 <style>。
  function normalizeStage() {
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i], rules;
      try { rules = sheet.cssRules; } catch (_) { continue; }   // 跨域/未 load
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
  // ── DOM 归一化：内联 position:fixed（弹窗多用 el.style.cssText='position:fixed;…' 创建）→ absolute + 内联 vw/vh→px ──
  //   就地改 style·**不移 DOM**——曾试 reparent fixed 元素到 body（想解决嵌套 fixed 锚错祖先），但游戏持有元素父链
  //   引用·移动后 classList null 崩游戏（实测）。改用：fixed→absolute 后锚「最近定位祖先」；绝大多数 fixed 弹窗/顶栏/
  //   动作栏是 body 直接子→锚 body 舞台正确。少数嵌在定位容器里的（如 #tm-right-rail 在 .gs-rail-right）→ 靠上面
  //   style 把那个容器 position:static 化（让其 absolute 子落到 body）·不移 DOM·安全。
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
    if (st.position === 'fixed') {
      st.position = 'absolute';   // 内联 fixed → absolute·就地改不移 DOM
      // ★留痕:归一化抹掉 position:fixed 后·全游戏靠 this.closest('div[style*=fixed]') 关闭的弹窗按钮会全失效
      //   (style 串不再含"fixed"→closest 落空→.remove() 抛错→辞旧/兼任/撤回等按钮点了没反应)。
      //   用名字含"fixed"的自定义属性把"fixed"子串留在 style 串里·让该选择器仍命中·零改 43 处 callsite。
      try { st.setProperty('--tm-ff-fixed', '1'); } catch (_) {}
    }
    inlineVwVh(st);
  }
  function anchorTree(root) {
    if (!root || root.nodeType !== 1 || !document.body) return;
    anchorEl(root);
    var els = root.querySelectorAll ? root.querySelectorAll('*') : null;
    if (els) for (var i = 0; i < els.length; i++) anchorEl(els[i]);
  }
  function normalizeSoon() { try { normalizeStage(); } catch (_) {} try { anchorTree(document.body); } catch (_) {} }
  normalizeSoon();
  if (document.readyState !== 'complete') window.addEventListener('load', normalizeSoon);
  document.addEventListener('DOMContentLoaded', normalizeSoon);
  setTimeout(normalizeSoon, 300); setTimeout(normalizeSoon, 1000); setTimeout(normalizeSoon, 2500); setTimeout(normalizeSoon, 5000);
  // 御案/弹窗进游戏后才动态注入 <style> 或 append 元素 → observer 即时归一（新样式重扫规则·新元素改锚拎舞台）
  try {
    var mo = new MutationObserver(function (muts) {
      var needSheet = false;
      for (var m = 0; m < muts.length; m++) {
        var added = muts[m].addedNodes;
        for (var k = 0; k < added.length; k++) {
          var n = added[k]; if (!n || n.nodeType !== 1) continue;
          if (n.nodeName === 'STYLE' || n.nodeName === 'LINK') needSheet = true;
          anchorTree(n);   // 新加元素(含弹窗)立刻改 absolute + 拎到 body
        }
      }
      if (needSheet) { try { normalizeStage(); } catch (_) {} }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}

  var raf = 0;
  function fit() {
    raf = 0;
    // device-width → innerWidth/innerHeight 是真设备 CSS 尺寸。s=min(W/VW,H/VH)：横屏手机受高约束→侧边 letterbox。
    var sw = window.innerWidth, sh = window.innerHeight;
    if (!sw || !sh) return;
    var s = Math.min(sw / VW, sh / VH);
    var x = Math.round((sw - VW * s) / 2), y = Math.round((sh - VH * s) / 2);
    if (document.body) document.body.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(fit); }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 60); });
  if (document.body) fit(); else window.addEventListener('DOMContentLoaded', fit);
  // 字体/布局沉降后再校准几次（避免初期算错）
  setTimeout(fit, 200); setTimeout(fit, 800); setTimeout(fit, 2000);

  window.TM = window.TM || {};
  window.TM.fixedFit = { refit: fit, normalize: normalizeSoon, VW: VW, VH: VH };
})();
