/* ============================================================
 * tm-debug-logger.js — 调试日志落盘 (前端侧)·2026-05-28
 *
 * 目的：把前端所有 console.log/info/warn/error/debug + 未捕获异常
 *      批量推给主进程 (window.tianming.debugLog)，落到
 *      userData/logs/tianming-<时间戳>.log。崩溃后打开日志目录即可按时间线定位。
 *
 * 桌面端 (Electron) 才落盘；浏览器/preview 环境仅在内存缓冲，
 * 可用 TM.debug.getBuffer() 查看、TM.debug.download() 导出。
 *
 * 接口：
 *   TM.debug.flush()      立即推送缓冲
 *   TM.debug.getBuffer()  当前内存缓冲（数组）
 *   TM.debug.openDir()    打开日志目录（桌面端）
 *   TM.debug.info()       当前日志文件路径（桌面端）
 *   TM.debug.download()   导出当前缓冲为 .log
 *   TM.debug.enabled      true/false 总开关
 * ============================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window._tmDebugLoggerInstalled) return;
  window._tmDebugLoggerInstalled = true;
  window.TM = window.TM || {};

  var LEVELS = ['log', 'info', 'warn', 'error', 'debug'];
  var MAX_PENDING = 5000;   // 待推缓冲上限，超出丢最旧
  var ARG_CAP = 2000;       // 单参数序列化长度上限
  var LINE_CAP = 8000;      // 单行长度上限
  var FLUSH_MS = 2000;      // 周期推送间隔
  var BATCH = 800;          // 单次推送条数上限

  var orig = {};
  LEVELS.forEach(function (l) {
    orig[l] = (window.console && console[l]) ? console[l].bind(console) : function () {};
  });

  var pending = [];
  var enabled = true;
  var flushing = false;

  function fmtArg(a) {
    try {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || (a.name + ': ' + a.message);
      if (a && typeof a === 'object') {
        var s = JSON.stringify(a);
        if (s == null) return String(a);
        return s.length > ARG_CAP ? s.slice(0, ARG_CAP) + '…(' + s.length + ')' : s;
      }
      return String(a);
    } catch (_) { return String(a); }
  }

  function curTurn() {
    try { return (typeof GM !== 'undefined' && GM && GM.turn) || 0; } catch (_) { return 0; }
  }

  function push(level, args) {
    if (!enabled) return;
    var msg;
    try { msg = Array.prototype.map.call(args, fmtArg).join(' '); }
    catch (_) { msg = '(日志序列化失败)'; }
    var turn = curTurn();
    msg = 'T' + turn + ' ' + msg;
    if (msg.length > LINE_CAP) msg = msg.slice(0, LINE_CAP) + '…';
    pending.push({ t: Date.now(), level: level, source: 'web', turn: turn, message: msg });
    if (pending.length > MAX_PENDING) pending.splice(0, pending.length - MAX_PENDING);
  }

  // 劫持 console.*·原样输出 + 缓冲
  LEVELS.forEach(function (l) {
    console[l] = function () {
      try { push(l, arguments); } catch (_) {}
      orig[l].apply(null, arguments);
    };
  });

  // 全局未捕获（带完整 stack；与 tm-diagnostics-foundation 的 TM.errors 并存，互不影响）
  try {
    window.addEventListener('error', function (ev) {
      var e = ev && (ev.error || ev.message);
      var loc = (ev && ev.filename) ? (' @' + ev.filename + ':' + ev.lineno + ':' + ev.colno) : '';
      push('error', [((e && e.stack) || ('uncaught: ' + (e || 'unknown'))) + loc]);
    });
    window.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason;
      push('error', ['unhandledrejection: ' + ((r && r.stack) || r)]);
    });
  } catch (_) {}

  function bridge() {
    return (window.tianming && typeof window.tianming.debugLog === 'function') ? window.tianming : null;
  }

  function flush() {
    var b = bridge();
    if (!b || flushing || !pending.length) return;
    flushing = true;
    var batch = pending.splice(0, BATCH);
    Promise.resolve(b.debugLog(batch)).then(function () {
      flushing = false;
      if (pending.length) flush();
    }).catch(function () {
      // 推送失败：放回队首下次重试
      pending = batch.concat(pending);
      if (pending.length > MAX_PENDING) pending.splice(0, pending.length - MAX_PENDING);
      flushing = false;
    });
  }

  setInterval(flush, FLUSH_MS);
  try { window.addEventListener('beforeunload', function () { try { flush(); } catch (_) {} }); } catch (_) {}

  function download() {
    try {
      var text = pending.map(function (e) {
        return new Date(e.t || Date.now()).toISOString() + ' [' + e.source + '] '
          + String(e.level).toUpperCase() + ' ' + e.message;
      }).join('\n');
      var blob = new Blob([text], { type: 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'tianming-web-' + Date.now() + '.log'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) { orig.warn('[debug-logger] 下载失败', e); }
  }

  window.TM.debug = {
    flush: flush,
    getBuffer: function () { return pending.slice(); },
    download: download,
    openDir: function () { var b = bridge(); return b && b.openLogDir ? b.openLogDir() : null; },
    info: function () { var b = bridge(); return b && b.debugLogInfo ? b.debugLogInfo() : null; },
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; }
  };

  orig.log('[debug-logger] 已启用·' + (bridge() ? '桌面落盘模式' : '浏览器内存模式'));
})();
