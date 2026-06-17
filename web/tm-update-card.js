// ============================================================
//  tm-update-card.js — 更新进度卡·三端共用 UI 组件
//  2026-06-11·更新功能全面升级 S3
//
//  ① 纯展示组件·自身不判平台不发请求·由消费方（tm-desktop-update.js 等）挂载驱动；
//     不挂载就完全惰性·对安卓/在线版零影响。
//  ② 视觉承袭安卓端 OTA 金卡（tm-capacitor-boot.js）·但 id/class 全部走 tm-upc-* 新
//     命名空间·与安卓端 tm-ota-* 卡互不相扰（安卓 OTA 链路本轮纪律：一行不碰）。
//  ③ 与安卓内联卡的差异·按钮行可配置（setActions）·标题/副注可换·供桌面
//     「立即更新 / 查看更新内容 / 立即重启生效 / 安装并重启」等多形态复用。
//
//  API（window.TMUpdateCard）·
//    show({title, version, subtitle})        进入活动态（扫光）·清空按钮行
//    progress({percent, doneBytes, totalBytes, bps, label})   label 例 '12/87 文件'
//    done({title='更新已就绪', version, note='重启后生效', actions})
//    toast(title, version, autoHideMs)       静态满条提示（如「已是最新版」）
//    fail(msg, autoHideMs)                   失败态·默认 6s 自动收起
//    setActions([{label, primary, onClick}]) 渲染按钮行
//    hide() / isVisible()
// ============================================================

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ── 格式化（与安卓卡同算法） ─────────────────────────────────────────────
  function fmtMB(bytes) {
    if (!bytes || bytes < 0) return '0 MB';
    var mb = bytes / 1048576;
    return (mb >= 100 ? Math.round(mb) : mb.toFixed(1)) + ' MB';
  }
  function fmtSpeed(bps) {
    if (!bps || bps <= 0) return '';
    if (bps >= 1048576) return (bps / 1048576).toFixed(1) + ' MB/s';
    return Math.max(1, Math.round(bps / 1024)) + ' KB/s';
  }
  function fmtEta(sec) {
    if (!isFinite(sec) || sec <= 0) return '';
    sec = Math.round(sec);
    if (sec < 60) return '剩余 ' + sec + ' 秒';
    var m = Math.floor(sec / 60), s = sec % 60;
    return '剩余 ' + m + ' 分' + (s ? s + ' 秒' : '');
  }

  var root = null, fill = null, pctEl = null, szEl = null, spdEl = null, etaEl = null;
  var titleEl = null, verEl = null, subEl = null, actEl = null;
  var dismissTimer = null;

  function injectStyle() {
    if (document.getElementById('tm-upc-style')) return;
    var st = document.createElement('style');
    st.id = 'tm-upc-style';
    st.textContent =
      // ── 卡身：御案漆木 + 宣纸暖纹 + 描金发丝边（对齐 body.tm-phase8-formal 御案语言：楷体/朱批/朱印/宣纸） ──
      '#tm-upc-card{' +
        '--gold-hi:#f7dda0;--gold:#c9a045;--gold-mid:#b08a3c;--paper:#eadfbd;--paper-dim:#b6a474;' +
        '--zhu:#9a2f22;--zhu-hi:#d5674a;' +
        'position:fixed;left:50%;bottom:34px;transform:translateX(-50%) translateY(16px);' +
        'width:600px;max-width:92%;box-sizing:border-box;padding:16px 22px 18px;z-index:2147483600;' +
        'color:var(--paper);font-family:"STKaiti","KaiTi","楷体","Noto Serif SC","Songti SC",serif;' +
        'border-radius:6px;border:1px solid rgba(201,160,69,0.42);' +
        'background:radial-gradient(125% 130% at 50% -20%,rgba(201,160,69,0.10),rgba(201,160,69,0) 50%),' +
        'linear-gradient(168deg,rgba(28,21,15,0.985),rgba(9,7,6,0.99));' +
        'box-shadow:0 24px 58px -16px rgba(0,0,0,0.74),0 2px 0 rgba(0,0,0,0.45),' +
        'inset 0 1px 0 rgba(255,242,185,0.10),inset 0 0 26px rgba(0,0,0,0.34);' +
        'opacity:0;overflow:hidden;transition:opacity .5s ease,transform .5s cubic-bezier(.16,.84,.24,1);}' +
      // 宣纸暖纹肌理（低透米色叠加·御案 pane 同款 rgba(255,245,210,.045)）
      '#tm-upc-card::before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:6px;' +
        'background:repeating-linear-gradient(135deg,rgba(255,245,210,0.018) 0 1px,rgba(0,0,0,0) 1px 6px),' +
        'radial-gradient(ellipse at 50% 0,rgba(255,245,210,0.045),transparent 38%);}' +
      // 左侧朱砂封边（御案 .tm-desk-item.hot 的 inset 朱条语汇）
      '#tm-upc-card::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;pointer-events:none;' +
        'background:linear-gradient(180deg,rgba(180,54,37,0) 0,rgba(180,54,37,0.72) 22%,rgba(180,54,37,0.72) 78%,rgba(180,54,37,0) 100%);}' +
      '#tm-upc-card.tm-upc-show{opacity:1;transform:translateX(-50%) translateY(0);}' +
      '#tm-upc-card .tm-upc-glow{position:absolute;left:50%;top:-40%;width:70%;height:90%;pointer-events:none;' +
        'transform:translateX(-50%);border-radius:50%;opacity:.5;transition:opacity .6s ease;' +
        'background:radial-gradient(closest-side,rgba(201,160,69,0.15),rgba(201,160,69,0) 70%);}' +
      '#tm-upc-card.tm-upc-done .tm-upc-glow{opacity:1;animation:tm-upc-pulse 1.6s ease;}' +
      // ── 抬头：圆形朱印 + 楷体题名 + 朱印版本徽 ──
      '#tm-upc-card .tm-upc-head{position:relative;display:flex;align-items:center;gap:11px;' +
        'padding-bottom:12px;margin-bottom:3px;border-bottom:1px solid rgba(201,160,69,0.20);}' +
      '#tm-upc-card .tm-upc-head::after{content:"";position:absolute;left:0;bottom:-1px;width:52px;height:1px;' +
        'background:linear-gradient(90deg,var(--gold),rgba(201,160,69,0));}' +
      '#tm-upc-card .tm-upc-title{display:flex;align-items:center;font-size:16px;font-weight:600;' +
        'letter-spacing:4px;color:var(--gold-hi);text-shadow:0 1px 2px rgba(0,0,0,0.55);}' +
      // 圆形朱印（御案 .edict-old-seal 同款：圆框金边 + 朱砂径向 + 楷体「新」字）
      '#tm-upc-card .tm-upc-title::before{content:"\\66f4";display:grid;place-items:center;' +
        'width:24px;height:24px;margin-right:11px;border-radius:50%;flex:0 0 auto;' +
        'border:1px solid rgba(213,176,95,0.55);color:#f4dca0;font-size:12px;letter-spacing:0;' +
        'background:radial-gradient(circle,rgba(154,47,34,0.55),rgba(64,31,20,0.85) 74%);' +
        'box-shadow:inset 0 0 6px rgba(0,0,0,0.45),0 0 6px rgba(201,160,69,0.28);}' +
      '#tm-upc-card .tm-upc-ver{font-size:12px;letter-spacing:1px;color:#ffe1ac;font-variant-numeric:tabular-nums;' +
        'font-family:"Noto Serif SC","Songti SC",serif;' +
        'background:linear-gradient(180deg,rgba(150,59,41,0.94),rgba(58,23,18,0.96));' +
        'border:1px solid rgba(213,103,73,0.55);border-radius:4px;padding:2px 9px;' +
        'box-shadow:0 1px 3px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.12);}' +
      '#tm-upc-card .tm-upc-sub{font-size:12px;letter-spacing:.5px;color:var(--paper-dim);margin-left:2px;}' +
      '#tm-upc-card .tm-upc-x{margin-left:auto;background:none;border:none;color:var(--paper-dim);font-size:17px;' +
        'cursor:pointer;line-height:1;padding:2px 4px;opacity:.55;transition:.2s;font-family:inherit;}' +
      '#tm-upc-card .tm-upc-x:hover{opacity:1;color:var(--gold-hi);}' +
      // ── 进度行：凹槽轨 + 鎏金填充 + 流动扫光 + 鎏金大字 ──
      '#tm-upc-card .tm-upc-progress{display:flex;align-items:center;gap:16px;margin-top:15px;}' +
      '#tm-upc-card .tm-upc-bar{position:relative;flex:1;height:10px;border-radius:3px;overflow:hidden;' +
        'background:linear-gradient(180deg,rgba(0,0,0,0.5),rgba(0,0,0,0.3));' +
        'box-shadow:inset 0 1px 3px rgba(0,0,0,0.7),inset 0 0 0 1px rgba(201,160,69,0.14);}' +
      '#tm-upc-card .tm-upc-fill{position:absolute;top:0;left:0;height:100%;width:0%;border-radius:3px;overflow:hidden;' +
        'background:linear-gradient(180deg,#f1da90 0%,#c9a045 48%,#9a7a2f 100%);' +
        'box-shadow:0 0 10px rgba(201,160,69,0.5),inset 0 1px 0 rgba(255,248,220,0.5);' +
        'transition:width .3s cubic-bezier(.3,.8,.3,1);}' +
      '#tm-upc-card .tm-upc-sheen{position:absolute;inset:0;transform:translateX(-100%);' +
        'background:linear-gradient(100deg,rgba(255,248,220,0) 25%,rgba(255,250,232,0.55) 50%,rgba(255,248,220,0) 75%);' +
        'animation:tm-upc-sweep 1.5s linear infinite;}' +
      '#tm-upc-card.tm-upc-settled .tm-upc-sheen{animation:none;opacity:0;}' +
      '#tm-upc-card .tm-upc-pct{min-width:60px;text-align:right;font-size:25px;font-weight:700;line-height:1;' +
        'letter-spacing:.5px;font-variant-numeric:tabular-nums;color:transparent;' +
        'font-family:"Noto Serif SC","Songti SC",serif;' +
        'background:linear-gradient(180deg,#f7dda0,#c9a045 58%,#a8842f);-webkit-background-clip:text;background-clip:text;' +
        'filter:drop-shadow(0 1px 1px rgba(0,0,0,0.45));}' +
      // ── 元信息行 ──
      '#tm-upc-card .tm-upc-meta{display:flex;align-items:center;gap:11px;margin-top:13px;font-size:13px;' +
        'letter-spacing:.3px;color:var(--paper-dim);font-variant-numeric:tabular-nums;}' +
      '#tm-upc-card .tm-upc-sz{color:#d9c79b;}' +
      '#tm-upc-card .tm-upc-spd{color:var(--gold-hi);}' +
      '#tm-upc-card .tm-upc-spd:not(:empty)::before{content:"";display:inline-block;width:3px;height:3px;' +
        'border-radius:50%;background:rgba(201,160,69,0.55);margin-right:11px;vertical-align:middle;}' +
      '#tm-upc-card .tm-upc-eta{margin-left:auto;color:var(--paper-dim);}' +
      // ── 按钮行：主操作 = 朱批红印（御案 .tm-desk-btn.primary 朱砂渐变）·次操作 = 描金墨木 ──
      '#tm-upc-card .tm-upc-actions{margin-top:16px;display:flex;gap:10px;animation:tm-upc-rise .42s ease both;}' +
      // 作者 display:flex 优先级盖过 UA [hidden]{display:none}·须显式补（与安卓卡同教训）
      '#tm-upc-card .tm-upc-actions[hidden]{display:none;}' +
      '#tm-upc-card .tm-upc-btn{position:relative;overflow:hidden;flex:1;padding:11px 16px;border-radius:4px;' +
        'cursor:pointer;font-family:inherit;font-size:15px;font-weight:600;letter-spacing:4px;' +
        'color:var(--paper);border:1px solid rgba(201,160,69,0.30);' +
        'background:linear-gradient(180deg,rgba(40,29,20,0.90),rgba(20,14,10,0.95));' +
        'box-shadow:0 3px 10px -4px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,242,185,0.08);transition:.2s;}' +
      '#tm-upc-card .tm-upc-btn:hover{border-color:rgba(201,160,69,0.62);color:var(--gold-hi);}' +
      '#tm-upc-card .tm-upc-btn:active{transform:translateY(1px);}' +
      // 主按钮：朱砂红（与御案「批红」一致·不再是金色）
      '#tm-upc-card .tm-upc-btn.tm-upc-primary{color:#ffe7c2;border:1px solid rgba(213,103,73,0.62);' +
        'background:linear-gradient(180deg,rgba(150,59,41,0.96),rgba(58,23,18,0.97));' +
        'box-shadow:0 5px 16px -6px rgba(120,32,22,0.7),inset 0 1px 0 rgba(255,210,180,0.22),' +
        'inset 0 -2px 5px rgba(40,12,8,0.45);text-shadow:0 1px 1px rgba(60,12,6,0.6);}' +
      '#tm-upc-card .tm-upc-btn.tm-upc-primary:hover{color:#fff0d8;border-color:rgba(224,120,90,0.8);}' +
      '#tm-upc-card .tm-upc-btn.tm-upc-primary::after{content:"";position:absolute;top:0;left:-65%;width:45%;height:100%;' +
        'transform:skewX(-18deg);background:linear-gradient(100deg,rgba(255,225,200,0),rgba(255,231,205,0.42),rgba(255,225,200,0));' +
        'animation:tm-upc-btnsheen 2.8s ease-in-out infinite;}' +
      '#tm-upc-card .tm-upc-btn[disabled]{opacity:.45;cursor:default;pointer-events:none;}' +
      // ── 动效关键帧 + 降级 ──
      '@keyframes tm-upc-sweep{to{transform:translateX(220%);}}' +
      '@keyframes tm-upc-rise{from{opacity:0;transform:translateY(9px);}to{opacity:1;transform:none;}}' +
      '@keyframes tm-upc-btnsheen{0%{left:-65%;}45%{left:135%;}100%{left:135%;}}' +
      '@keyframes tm-upc-pulse{0%{opacity:.5;}40%{opacity:1;}100%{opacity:.6;}}' +
      '@media (prefers-reduced-motion:reduce){#tm-upc-card,#tm-upc-card *{animation:none!important;' +
        'transition:opacity .2s ease!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function ensure() {
    if (root && document.body && document.body.contains(root)) return root;
    injectStyle();
    root = document.createElement('div');
    root.id = 'tm-upc-card';
    root.innerHTML =
      '<div class="tm-upc-glow"></div>' +
      '<div class="tm-upc-head">' +
        '<span class="tm-upc-title">检查更新</span>' +
        '<span class="tm-upc-ver" hidden></span>' +
        '<span class="tm-upc-sub"></span>' +
        '<button class="tm-upc-x" title="收起">✕</button>' +
      '</div>' +
      '<div class="tm-upc-progress">' +
        '<div class="tm-upc-bar"><div class="tm-upc-fill"><span class="tm-upc-sheen"></span></div></div>' +
        '<span class="tm-upc-pct">0%</span>' +
      '</div>' +
      '<div class="tm-upc-meta">' +
        '<span class="tm-upc-sz"></span>' +
        '<span class="tm-upc-spd"></span>' +
        '<span class="tm-upc-eta"></span>' +
      '</div>' +
      '<div class="tm-upc-actions" hidden></div>';
    (document.body || document.documentElement).appendChild(root);
    fill = root.querySelector('.tm-upc-fill');
    pctEl = root.querySelector('.tm-upc-pct');
    szEl = root.querySelector('.tm-upc-sz');
    spdEl = root.querySelector('.tm-upc-spd');
    etaEl = root.querySelector('.tm-upc-eta');
    titleEl = root.querySelector('.tm-upc-title');
    verEl = root.querySelector('.tm-upc-ver');
    subEl = root.querySelector('.tm-upc-sub');
    actEl = root.querySelector('.tm-upc-actions');
    root.querySelector('.tm-upc-x').addEventListener('click', hide);
    setTimeout(function () { if (root) root.classList.add('tm-upc-show'); }, 20);
    return root;
  }

  function clearDismiss() { if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; } }

  function setHead(title, version, subtitle) {
    titleEl.textContent = title || '检查更新';
    if (version) { verEl.textContent = 'v' + version; verEl.hidden = false; } else { verEl.hidden = true; }
    subEl.textContent = subtitle || '';
  }

  function show(opts) {
    opts = opts || {};
    clearDismiss();
    ensure();
    root.classList.remove('tm-upc-settled', 'tm-upc-done');
    setHead(opts.title, opts.version, opts.subtitle);
    actEl.hidden = true;
    actEl.innerHTML = '';
  }

  function progress(p) {
    p = p || {};
    ensure();
    var pct = Math.max(0, Math.min(100, Number(p.percent) || 0));
    fill.style.width = pct.toFixed(0) + '%';
    pctEl.textContent = pct.toFixed(0) + '%';
    if (p.label) {
      szEl.textContent = p.label + (p.totalBytes ? '·' + fmtMB(p.doneBytes) + ' / ' + fmtMB(p.totalBytes) : '');
    } else {
      szEl.textContent = p.totalBytes ? (fmtMB(p.doneBytes) + ' / ' + fmtMB(p.totalBytes)) : '';
    }
    spdEl.textContent = p.bps ? fmtSpeed(p.bps) : '';
    var eta = (p.bps && p.totalBytes) ? (p.totalBytes - (p.doneBytes || 0)) / p.bps : 0;
    etaEl.textContent = eta ? fmtEta(eta) : '';
  }

  function setActions(list) {
    ensure();
    actEl.innerHTML = '';
    if (!list || !list.length) { actEl.hidden = true; return; }
    list.forEach(function (a) {
      var btn = document.createElement('button');
      btn.className = 'tm-upc-btn' + (a.primary ? ' tm-upc-primary' : '');
      btn.textContent = a.label || '';
      btn.addEventListener('click', function () {
        try { if (typeof a.onClick === 'function') a.onClick(); } catch (e) {
          try { console.warn('[tm-update-card] action 执行失败', e); } catch (_) {}
        }
      });
      actEl.appendChild(btn);
    });
    actEl.hidden = false;
  }

  function done(opts) {
    opts = opts || {};
    clearDismiss();
    ensure();
    root.classList.add('tm-upc-settled', 'tm-upc-done');
    setHead(opts.title || '更新已就绪', opts.version, '');
    fill.style.width = '100%';
    pctEl.textContent = '100%';
    szEl.textContent = opts.subtitle || '下载完成';
    spdEl.textContent = '';
    etaEl.textContent = opts.note || '重启后生效';
    setActions(opts.actions || []);
  }

  function toast(title, version, autoHideMs) {
    show({ title: title, version: version });
    root.classList.add('tm-upc-settled');
    fill.style.width = '100%';
    pctEl.textContent = '';
    szEl.textContent = '';
    spdEl.textContent = '';
    etaEl.textContent = '';
    if (autoHideMs) { clearDismiss(); dismissTimer = setTimeout(hide, autoHideMs); }
  }

  function fail(msg, autoHideMs) {
    show({ title: '更新遇到问题' });
    root.classList.add('tm-upc-settled');
    fill.style.width = '0%';
    pctEl.textContent = '';
    szEl.textContent = msg || '稍后自动重试';
    spdEl.textContent = '';
    etaEl.textContent = '';
    clearDismiss();
    dismissTimer = setTimeout(hide, autoHideMs == null ? 6000 : autoHideMs);
  }

  function hide() {
    clearDismiss();
    if (!root) return;
    root.classList.remove('tm-upc-show');
    var el = root;
    root = null;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 380);
  }

  function isVisible() {
    return !!(root && document.body && document.body.contains(root));
  }

  window.TMUpdateCard = {
    show: show,
    progress: progress,
    done: done,
    toast: toast,
    fail: fail,
    setActions: setActions,
    hide: hide,
    isVisible: isVisible,
    _fmt: { fmtMB: fmtMB, fmtSpeed: fmtSpeed, fmtEta: fmtEta }
  };
})();
