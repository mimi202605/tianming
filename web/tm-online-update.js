// ============================================================
//  tm-online-update.js — 在线版更新提示 + 三端 footer 版本号同步
//  2026-06-11·更新功能全面升级 S6
//
//  ① footer 版本号（#tm-foot-ver）三端统一从 <meta name="tm-version"> 读·
//     meta 与代码同包同发·天然就是「正在运行的版本」·从此告别手改 footer。
//  ② 仅在线版（github.io·非桌面非安卓）跑检查循环：同源拉 version.json?t=时间戳
//     （query 进缓存键·穿透浏览器缓存与 Pages 边缘缓存）·远端版本更高 → 弹横幅
//     「线上新版已颁·刷新页面即可启用」·绝不自动刷新（玩家可能在局中）。
//  ③ 自举·首次上线 version.json 之前打开的旧会话没有本地 meta → 远端有 version.json
//     即提示刷新·正好覆盖「发版当天还开着旧页面」的人群。
//  ④ 远端 404 / 非 JSON / 版本号不合法 → 一律静默（与今天行为一致）。
//  ⑤ 「稍后」按版本记账（localStorage）·同版本不再骚扰·更高版本再提。
//  ⑥ 测试缝·URL 带 ?tmOluTest=1 时首查 500ms（Playwright 不用干等 20s）。
// ============================================================

(function () {
  'use strict';
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    var FIRST_CHECK_MS = 20000;
    var RECHECK_MS = 30 * 60 * 1000;
    var VISIBLE_RECHECK_MIN_GAP_MS = 10 * 60 * 1000;
    var DISMISS_KEY = 'tm.onlineUpdate.dismissedVersion';
    var VERSION_RE = /^\d+(\.\d+){1,3}$/;

    var isCap = false, isDesktop = false;
    try {
      isCap = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    } catch (_) {}
    try { isDesktop = !!window.tianming; } catch (_) {}
    var isWeb = !isCap && !isDesktop;

    var _lastCheckAt = 0;
    var _state = { localVersion: '', remoteVersion: '', shown: false, lastResult: '' };

    function compareVersions(a, b) {
      var aa = String(a || '0').split(/[.+-]/).map(function (n) { var v = parseInt(n, 10); return isFinite(v) ? v : 0; });
      var bb = String(b || '0').split(/[.+-]/).map(function (n) { var v = parseInt(n, 10); return isFinite(v) ? v : 0; });
      var n = Math.max(aa.length, bb.length, 4);
      for (var i = 0; i < n; i++) {
        var av = aa[i] || 0, bv = bb[i] || 0;
        if (av > bv) return 1;
        if (av < bv) return -1;
      }
      return 0;
    }

    function getLocalVersion() {
      try {
        var meta = document.querySelector('meta[name="tm-version"]');
        var v = meta && meta.getAttribute('content');
        if (v && VERSION_RE.test(v.trim())) return v.trim();
      } catch (_) {}
      try {
        var el = document.getElementById('tm-foot-ver') || document.querySelector('.f-ver');
        var m = el && String(el.textContent || '').match(/\d+(\.\d+){1,3}/);
        if (m) return m[0];
      } catch (_) {}
      return '';
    }

    // ── footer 版本号同步（三端都跑·meta = 正在运行的包版本） ────────────────
    function syncFooter() {
      try {
        var v = getLocalVersion();
        if (!v) return;
        var span = document.getElementById('tm-foot-ver');
        if (span && span.textContent !== v) span.textContent = v;
      } catch (_) {}
    }

    // ── 横幅 ─────────────────────────────────────────────────────────────────
    function injectStyle() {
      if (document.getElementById('tm-olu-style')) return;
      var st = document.createElement('style');
      st.id = 'tm-olu-style';
      st.textContent =
        // 御案语言（楷体/暖褐漆木/朱批主按钮/圆朱印）·对齐 body.tm-phase8-formal 与 tm-update-card
        '#tm-olu-banner{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:2147483000;' +
          'display:flex;align-items:center;gap:14px;max-width:92%;box-sizing:border-box;padding:13px 18px;' +
          'color:#eadfbd;font-family:"STKaiti","KaiTi","楷体","Noto Serif SC","Songti SC",serif;' +
          'border-radius:6px;border:1px solid rgba(201,160,69,0.42);overflow:hidden;' +
          'background:linear-gradient(168deg,rgba(28,21,15,0.985),rgba(9,7,6,0.99));' +
          'box-shadow:0 18px 44px -12px rgba(0,0,0,0.72),inset 0 1px 0 rgba(255,242,185,0.10);' +
          'opacity:0;transition:opacity .4s ease;}' +
        // 左缘朱砂封条
        '#tm-olu-banner::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;' +
          'background:linear-gradient(180deg,rgba(180,54,37,0),rgba(180,54,37,0.78) 20%,rgba(180,54,37,0.78) 80%,rgba(180,54,37,0));}' +
        '#tm-olu-banner.tm-olu-show{opacity:1;}' +
        '#tm-olu-banner .tm-olu-txt{display:flex;align-items:center;font-size:13.5px;letter-spacing:.5px;line-height:1.5;}' +
        // 圆形朱印「颁」
        '#tm-olu-banner .tm-olu-txt b{display:flex;align-items:center;color:#f7dda0;font-weight:600;letter-spacing:2px;margin-right:10px;}' +
        '#tm-olu-banner .tm-olu-txt b::before{content:"\\9881";display:grid;place-items:center;width:22px;height:22px;' +
          'margin-right:9px;flex:0 0 auto;border-radius:50%;border:1px solid rgba(213,176,95,0.55);color:#f4dca0;' +
          'font-size:11px;letter-spacing:0;background:radial-gradient(circle,rgba(154,47,34,0.55),rgba(64,31,20,0.85) 74%);' +
          'box-shadow:inset 0 0 5px rgba(0,0,0,0.45);}' +
        '#tm-olu-banner button{cursor:pointer;font-family:inherit;border-radius:4px;padding:7px 14px;font-size:13px;' +
          'letter-spacing:2px;transition:.2s;}' +
        // 主操作「立即刷新」= 朱批红（不再金色）
        '#tm-olu-banner .tm-olu-go{color:#ffe7c2;border:1px solid rgba(213,103,73,0.62);font-weight:600;' +
          'background:linear-gradient(180deg,rgba(150,59,41,0.96),rgba(58,23,18,0.97));' +
          'box-shadow:0 4px 12px -5px rgba(120,32,22,0.7),inset 0 1px 0 rgba(255,210,180,0.22);text-shadow:0 1px 1px rgba(60,12,6,0.6);}' +
        '#tm-olu-banner .tm-olu-go:hover{color:#fff0d8;border-color:rgba(224,120,90,0.8);}' +
        '#tm-olu-banner .tm-olu-later{color:#b6a474;border:1px solid rgba(201,160,69,0.3);background:none;}' +
        '#tm-olu-banner .tm-olu-later:hover{color:#f7dda0;border-color:rgba(201,160,69,0.6);}' +
        '#tm-olu-banner .tm-olu-x{background:none;border:none;color:#b6a474;font-size:16px;padding:2px 4px;opacity:.6;}' +
        '#tm-olu-banner .tm-olu-x:hover{opacity:1;color:#f7dda0;}' +
        '@media (prefers-reduced-motion:reduce){#tm-olu-banner{transition:opacity .2s ease;}}';
      (document.head || document.documentElement).appendChild(st);
    }

    function removeBanner() {
      var old = document.getElementById('tm-olu-banner');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      _state.shown = false;
    }

    function doRefresh() {
      try {
        var base = window.location.pathname || '/';
        window.location.replace(base + '?r=' + Date.now());
      } catch (_) {
        try { window.location.reload(); } catch (_2) {}
      }
    }

    function dismiss() {
      try { if (_state.remoteVersion) localStorage.setItem(DISMISS_KEY, _state.remoteVersion); } catch (_) {}
      removeBanner();
    }

    function showBanner(remoteVersion) {
      removeBanner();
      injectStyle();
      _state.shown = true;
      var bar = document.createElement('div');
      bar.id = 'tm-olu-banner';
      var txt = document.createElement('span');
      txt.className = 'tm-olu-txt';
      var b = document.createElement('b');
      b.textContent = '线上新版已颁';
      txt.appendChild(b);
      var tail = document.createElement('span');
      tail.textContent = remoteVersion
        ? ('线上已更新至 v' + remoteVersion + '·刷新页面即可启用')
        : '线上版本已更新·刷新页面即可启用';
      txt.appendChild(tail);
      var go = document.createElement('button');
      go.className = 'tm-olu-go';
      go.textContent = '立即刷新';
      go.addEventListener('click', doRefresh);
      var later = document.createElement('button');
      later.className = 'tm-olu-later';
      later.textContent = '稍后';
      later.addEventListener('click', dismiss);
      var x = document.createElement('button');
      x.className = 'tm-olu-x';
      x.textContent = '✕';
      x.addEventListener('click', removeBanner); // 仅本次收起·不记账
      bar.appendChild(txt);
      bar.appendChild(go);
      bar.appendChild(later);
      bar.appendChild(x);
      (document.body || document.documentElement).appendChild(bar);
      setTimeout(function () { try { bar.classList.add('tm-olu-show'); } catch (_) {} }, 20);
    }

    // ── 检查 ─────────────────────────────────────────────────────────────────
    function check(force) {
      if (!isWeb && !force) return Promise.resolve('not-web');
      if (typeof fetch !== 'function') return Promise.resolve('no-fetch');
      _lastCheckAt = Date.now();
      return fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(function (remote) {
          var remoteVersion = remote && typeof remote.version === 'string' ? remote.version.trim() : '';
          if (!remoteVersion || !VERSION_RE.test(remoteVersion)) { _state.lastResult = 'no-remote'; return 'no-remote'; }
          var local = getLocalVersion();
          _state.localVersion = local;
          _state.remoteVersion = remoteVersion;
          var newer = local ? (compareVersions(remoteVersion, local) > 0) : true; // 自举·本地无 meta 视为旧会话
          if (!newer) { _state.lastResult = 'up-to-date'; return 'up-to-date'; }
          var dismissed = '';
          try { dismissed = localStorage.getItem(DISMISS_KEY) || ''; } catch (_) {}
          if (!force && dismissed && compareVersions(remoteVersion, dismissed) <= 0) {
            _state.lastResult = 'dismissed';
            return 'dismissed';
          }
          showBanner(remoteVersion);
          _state.lastResult = 'shown';
          return 'shown';
        });
    }

    function arm() {
      syncFooter();
      if (!isWeb) return; // 桌面/安卓只同步 footer·各有自己的更新通道
      var testMode = false;
      try { testMode = /[?&]tmOluTest=1/.test(String(window.location.search || '')); } catch (_) {}
      setTimeout(function () { check(false); }, testMode ? 500 : FIRST_CHECK_MS);
      setInterval(function () {
        try { if (!document.hidden && !_state.shown) check(false); } catch (_) {}
      }, RECHECK_MS);
      try {
        document.addEventListener('visibilitychange', function () {
          try {
            if (document.hidden || _state.shown) return;
            if (Date.now() - _lastCheckAt >= VISIBLE_RECHECK_MIN_GAP_MS) check(false);
          } catch (_) {}
        });
      } catch (_) {}
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm);
    else arm();

    window.TM_OnlineUpdate = {
      check: function (force) { return check(force !== false); },
      getState: function () { return { localVersion: getLocalVersion(), remoteVersion: _state.remoteVersion, shown: _state.shown, lastResult: _state.lastResult, isWeb: isWeb }; },
      dismiss: dismiss,
      refresh: doRefresh
    };
  } catch (e) {
    try { console.warn('[tm-online-update] 初始化失败(忽略)', e); } catch (_) {}
  }
})();
