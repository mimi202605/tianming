// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-diagnostics-foundation.js - P4-beta merged diagnostics foundation.
 *
 * Sources: tm-error-collector.js, tm-errors-panel.js, tm-pollution-guard.js.
 * Public compatibility remains TM.errors and TM.guard.
 * ============================================================ */
/* === Source: tm-error-collector.js === */
// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-error-collector.js — 全局错误收集器
 *
 * 目的：捕获未 catch 的异常、Promise rejection、手工 capture 点，
 *      集中记录到 TM.errors._log 供玩家和开发者事后诊断。
 *
 * 提供两种手工捕获接口：
 *   capture(e, 'module')          → 记录 + console.warn（可见警告）
 *   captureSilent(e, 'module')    → 仅记录，不 console.warn（后台监测）
 *
 * 空 catch 块迁移约定（R86 约定）：
 *   catch(e){}       → 已批量迁移为 captureSilent，默认静默
 *   catch(_){}       → 显式"不关心"标记，约定**保留**不迁移
 *   catch(e1/e2/_e){}→ JSON 多重回退链的一环，约定**保留**不迁移
 *   localStorage/JSON.parse 回退 catch → 约定**保留**不迁移（可预期失败）
 *
 * 查看：
 *   TM.errors.getLog()           → 所有捕获记录
 *   TM.errors.getLogLoud()       → 非 silent 记录（值得注意的）
 *   TM.errors.getLogSilent()     → silent 记录（例行防御捕获）
 *   TM.errors.getSummary()       → 按 module 汇总
 *   TM.errors.clear()            → 清空
 *   TM.errors.byModule('ai')     → 过滤
 *
 * 配置：
 *   TM.errors.maxLog = 500       → 改上限
 *   TM.errors.consoleMirror = true → 每次 capture 也 console.warn（默认 true，silent 恒不 mirror）
 * ============================================================ */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};
  if (window.TM.errors) return;

  var log = [];
  var MAX = 200;
  var mirror = true;

  function normalize(e) {
    if (!e) return { message: 'nil', stack: null };
    if (typeof e === 'string') return { message: e, stack: null };
    return {
      message: e.message || String(e),
      stack: e.stack || null,
      name: e.name || null
    };
  }

  function capture(e, moduleName, extra) {
    var entry = {
      t: Date.now(),
      module: moduleName || 'unknown',
      turn: (typeof GM !== 'undefined' && GM.turn) || 0,
      error: normalize(e),
      extra: extra || null
    };
    log.push(entry);
    if (log.length > (TM.errors.maxLog || MAX)) log.shift();
    if (mirror && !(extra && extra.silent)) {
      console.warn('[' + entry.module + '] 捕获:', entry.error.message);
      if (entry.error.stack) {
        var lines = String(entry.error.stack).split('\n').slice(0, 3);
        console.warn('  ' + lines.join('\n  '));
      }
    }
    return entry;
  }

  function captureSilent(e, moduleName, extra) {
    var merged = extra ? Object.assign({}, extra, { silent: true }) : { silent: true };
    return capture(e, moduleName, merged);
  }

  function captureUnhandled(event) {
    var e = event.error || event.reason || event;
    var mod = 'uncaught';
    if (event.filename) {
      var m = String(event.filename).match(/\/(tm-[^/?]+)/);
      if (m) mod = m[1];
    }
    capture(e, mod, { filename: event.filename, lineno: event.lineno, colno: event.colno });
  }

  // 全局监听（仅一次）
  if (!window._tmErrorsInstalled) {
    window._tmErrorsInstalled = true;
    try {
      window.addEventListener('error', function(ev){ try { captureUnhandled(ev); } catch(_){} });
      window.addEventListener('unhandledrejection', function(ev){ try { captureUnhandled(ev); } catch(_){} });
    } catch(_e) {}
  }

  TM.errors = {
    capture: capture,
    captureSilent: captureSilent,
    getLog: function() { return log.slice(); },
    getLogSilent: function() { return log.filter(function(e){ return e.extra && e.extra.silent; }); },
    getLogLoud: function() { return log.filter(function(e){ return !(e.extra && e.extra.silent); }); },
    clear: function() { log.length = 0; },
    byModule: function(moduleFilter) {
      return log.filter(function(e){ return e.module && e.module.indexOf(moduleFilter) >= 0; });
    },
    getSummary: function() {
      var byMod = {};
      log.forEach(function(e){
        if (!byMod[e.module]) byMod[e.module] = { count: 0, messages: {} };
        byMod[e.module].count++;
        var msg = (e.error && e.error.message) || 'nil';
        byMod[e.module].messages[msg] = (byMod[e.module].messages[msg] || 0) + 1;
      });
      return byMod;
    },
    get maxLog() { return MAX; },
    set maxLog(v) { MAX = Math.max(10, v | 0); },
    get consoleMirror() { return mirror; },
    set consoleMirror(v) { mirror = !!v; }
  };
})();


/* === Source: tm-errors-panel.js === */
// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-errors-panel.js — 错误日志 UI 面板
 *
 * 依赖：TM.errors (tm-error-collector.js) + TM.getValidationHistory
 *
 * 触发：Ctrl+Shift+E 打开/关闭
 *       也可 TM.errors.openPanel() 手动调用
 *
 * 展示：
 *   - 按 module 汇总（计数 + 最近一次时间）
 *   - 最近 50 条明细（点击展开 stack）
 *   - AI 校验历史（TM._validationHistory）
 *   - 清空 / 关闭 / 下载 JSON
 * ============================================================ */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};

  var panelId = 'tm-errors-panel';
  var isOpen = false;

  // R143·委托给 tm-utils.js:569 的 escHtml
  function _esc(s) { return (typeof escHtml === 'function') ? escHtml(s) : String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _fmtTime(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  }

  function renderPanel() {
    var el = document.getElementById(panelId);
    if (!el) return;

    var errs = (TM.errors && TM.errors.getLog) ? TM.errors.getLog() : [];
    var summary = (TM.errors && TM.errors.getSummary) ? TM.errors.getSummary() : {};
    var validations = (TM.getValidationHistory) ? TM.getValidationHistory() : [];

    var modRows = Object.keys(summary).map(function(mod){
      var s = summary[mod];
      var topMsgs = Object.keys(s.messages).sort(function(a,b){ return s.messages[b]-s.messages[a]; }).slice(0,3);
      var msgHtml = topMsgs.map(function(m){ return '<div style="font-size:12px;color:#888;margin-left:8px">· ' + _esc(m) + ' ×' + s.messages[m] + '</div>'; }).join('');
      return '<div style="border-bottom:1px solid #2a2a2a;padding:6px 0"><b style="color:#e8c66e">' + _esc(mod) + '</b> <span style="color:#999">×' + s.count + '</span>' + msgHtml + '</div>';
    }).join('') || '<div style="color:#666;padding:10px">尚无捕获</div>';

    var errRows = errs.slice().reverse().slice(0, 50).map(function(e, i){
      var msg = (e.error && e.error.message) || '—';
      var hasStack = !!(e.error && e.error.stack);
      var id = 'tmerr-stack-' + i;
      return '<div style="border-bottom:1px solid #2a2a2a;padding:6px 0;font-size:12px">'
        + '<div><span style="color:#888">' + _fmtTime(e.t) + '</span>'
        + ' <span style="color:#e8c66e">[' + _esc(e.module) + ']</span>'
        + ' <span style="color:#999">T' + (e.turn || 0) + '</span></div>'
        + '<div style="color:#ddd;margin:3px 0">' + _esc(msg) + '</div>'
        + (hasStack ? '<details><summary style="cursor:pointer;color:#6a9;font-size:12px">stack</summary><pre style="background:#0a0a0a;padding:6px;font-size:11px;overflow:auto;max-height:200px;color:#c99">' + _esc(e.error.stack) + '</pre></details>' : '')
        + '</div>';
    }).join('') || '<div style="color:#666;padding:10px">尚无捕获</div>';

    var valRows = validations.slice().reverse().slice(0, 20).map(function(v){
      var status = v.errors.length > 0 ? '✗' : (v.warnings.length > 0 ? '⚠' : '✓');
      var color = v.errors.length > 0 ? '#c66' : (v.warnings.length > 0 ? '#d99' : '#6a9');
      return '<div style="font-size:12px;color:#bbb;border-bottom:1px solid #2a2a2a;padding:4px 0">'
        + '<span style="color:' + color + ';font-weight:bold;margin-right:6px">' + status + '</span>'
        + _fmtTime(v.timestamp) + ' '
        + '<b>' + _esc(v.tag) + '</b>'
        + (v.mode ? ' [' + _esc(v.mode) + ']' : '')
        + ' · <span style="color:#888">' + v.stats.knownKeys + '知·' + v.stats.unknownKeys + '未知·' + v.errors.length + '错·' + v.warnings.length + '警</span>'
        + '</div>';
    }).join('') || '<div style="color:#666;padding:10px">尚无校验记录</div>';

    el.innerHTML =
      '<div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid #3a2a10;background:#1a1410">'
      + '<b style="color:#e8c66e;font-size:14px">诊断·错误与校验</b>'
      + '<span style="color:#888;font-size:12px;margin-left:10px">Ctrl+Shift+E 关闭</span>'
      + '<div style="margin-left:auto;display:flex;gap:8px">'
      +   '<button onclick="TM.errors.clear();TM._renderErrorsPanel();" style="background:#2a1a1a;color:#d99;border:1px solid #5a3a3a;padding:4px 10px;cursor:pointer;font-size:12px">清空</button>'
      +   '<button onclick="TM._downloadErrorsJSON()" style="background:#1a1a2a;color:#9cd;border:1px solid #3a3a5a;padding:4px 10px;cursor:pointer;font-size:12px">下载 JSON</button>'
      +   '<button onclick="TM._closeErrorsPanel()" style="background:#2a2a2a;color:#ccc;border:1px solid #4a4a4a;padding:4px 10px;cursor:pointer;font-size:12px">关闭</button>'
      + '</div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1.5fr;gap:0;height:calc(100% - 50px)">'
      +   '<div style="border-right:1px solid #3a2a10;padding:10px;overflow:auto">'
      +     '<div style="color:#9ac870;font-size:12px;font-weight:bold;margin-bottom:6px">按模块汇总</div>'
      +     modRows
      +     '<div style="color:#9ac870;font-size:12px;font-weight:bold;margin:14px 0 6px">AI 校验历史（近 20）</div>'
      +     valRows
      +   '</div>'
      +   '<div style="padding:10px;overflow:auto">'
      +     '<div style="color:#9ac870;font-size:12px;font-weight:bold;margin-bottom:6px">最近 50 条详情</div>'
      +     errRows
      +   '</div>'
      + '</div>';
  }

  function openPanel() {
    if (isOpen) return;
    isOpen = true;
    var el = document.createElement('div');
    el.id = panelId;
    el.style.cssText = 'position:fixed;right:20px;bottom:20px;width:860px;max-width:92vw;height:560px;max-height:80vh;'
      + 'background:#0f0c08;border:1px solid #5a3a1a;border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.7);'
      + 'z-index:99990;color:#ddd;font-family:sans-serif;overflow:hidden';
    document.body.appendChild(el);
    renderPanel();
  }

  function closePanel() {
    var el = document.getElementById(panelId);
    if (el) el.remove();
    isOpen = false;
  }

  function togglePanel() { isOpen ? closePanel() : openPanel(); }

  function downloadJSON() {
    var data = {
      when: new Date().toISOString(),
      turn: (typeof GM !== 'undefined' && GM.turn) || 0,
      errors: (TM.errors && TM.errors.getLog) ? TM.errors.getLog() : [],
      summary: (TM.errors && TM.errors.getSummary) ? TM.errors.getSummary() : {},
      validations: (TM.getValidationHistory) ? TM.getValidationHistory() : []
    };
    try {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'tm-errors-' + Date.now() + '.json';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    } catch(e) {
      console.warn('[errors-panel] 下载失败', e);
    }
  }

  // ─── 快捷键 Ctrl+Shift+E ───
  function installHotkey() {
    if (window._tmErrorsPanelHotkey) return;
    window._tmErrorsPanelHotkey = true;
    document.addEventListener('keydown', function(e){
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        togglePanel();
      }
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installHotkey);
    } else {
      installHotkey();
    }
  }

  // 暴露接口（同时把 openPanel 挂到 TM.errors 以便调用）
  TM._renderErrorsPanel = renderPanel;
  TM._closeErrorsPanel = closePanel;
  TM._downloadErrorsJSON = downloadJSON;
  if (TM.errors) {
    TM.errors.openPanel = openPanel;
    TM.errors.closePanel = closePanel;
    TM.errors.togglePanel = togglePanel;
  } else {
    // 如果 TM.errors 还没加载（不应该发生），稍后重试
    setTimeout(function(){
      if (TM.errors) {
        TM.errors.openPanel = openPanel;
        TM.errors.closePanel = closePanel;
        TM.errors.togglePanel = togglePanel;
      }
    }, 200);
  }
})();


/* === Source: tm-pollution-guard.js === */
// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-pollution-guard.js — 全局命名空间污染守卫
 *
 * 目的：在游戏运行过程中监视 window.* 的新增/覆盖，
 *      对可疑动作立即告警，防止新引入的脚本静默冲突。
 *
 * 设计：
 *   - 加载时刻 (DOMContentLoaded)  → 对 window 拍快照（basline）
 *   - 可选轮询（TM.guard.start() 开启）→ 每 5s 扫一次 diff
 *   - 发现**新增**全局：console.info + 记录
 *   - 发现**覆盖**（已存在但 value 变了，且原 value 是函数）→ console.error + TM.errors.capture
 *
 * 用法：
 *   TM.guard.snapshot()           // 手动拍快照
 *   TM.guard.diffSince()          // 对比自快照以来新增/覆盖
 *   TM.guard.start()              // 开启 5s 自动巡检
 *   TM.guard.stop()               // 停止巡检
 *   TM.guard.getLog()             // 累计告警日志
 *   TM.guard.report()             // 打印当前污染数统计
 * ============================================================ */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};
  if (window.TM.guard) return;

  var baseline = null;
  var overrideLog = [];
  var addLog = [];
  var timer = null;
  var MAX_LOG = 100;

  // 这些 key 是浏览器原生/第三方，不纳入监视
  var IGNORE_PREFIXES = [
    'webkit', 'moz', 'chrome', 'on',    // 事件 + vendor prefix
    '__', '_webpack', '_react',          // 构建工具
  ];
  var IGNORE_KEYS = {
    '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1, '9': 1,
    'length': 1, 'top': 1, 'parent': 1, 'self': 1, 'window': 1, 'document': 1,
    'location': 1, 'navigator': 1, 'history': 1, 'frames': 1, 'screen': 1,
    'performance': 1, 'console': 1, 'localStorage': 1, 'sessionStorage': 1,
    'indexedDB': 1, 'fetch': 1, 'origin': 1, 'crypto': 1,
    // 天命自身的顶级 — 已知合法
    'GM': 1, 'P': 1, 'DA': 1, 'TM': 1, 'SaveManager': 1, 'SaveMigrations': 1, 'SAVE_VERSION': 1,
    'CorruptionEngine': 1, 'GuokuEngine': 1, 'AuthorityEngines': 1, 'AuthorityComplete': 1,
    'HistoricalPresets': 1, 'IntegrationBridge': 1, 'FiscalCascade': 1,
    'HujiEngine': 1, 'EnvCapacityEngine': 1, 'NpcMemorySystem': 1, 'CharEconEngine': 1,
    'CharFullSchema': 1, 'TokenUsageTracker': 1, 'ErrorMonitor': 1, 'NotificationSystem': 1,
    'CY': 1, 'GameHooks': 1, 'SettlementPipeline': 1, 'TM_AI_SCHEMA': 1,
    'EDICT_TYPES': 1, 'REFORM_PHASES': 1, 'RESISTANCE_SOURCES': 1,
    'DEFAULT_PROMPT': 1, 'DEFAULT_RULES': 1
  };

  function _shouldTrack(key) {
    if (IGNORE_KEYS[key]) return false;
    for (var i = 0; i < IGNORE_PREFIXES.length; i++) {
      if (key.indexOf(IGNORE_PREFIXES[i]) === 0) return false;
    }
    return true;
  }

  function _typeOf(v) {
    if (v === null) return 'null';
    if (typeof v === 'function') return 'function';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function snapshot() {
    baseline = {};
    Object.keys(window).forEach(function(k) {
      if (!_shouldTrack(k)) return;
      baseline[k] = { type: _typeOf(window[k]), ref: window[k] };
    });
    return Object.keys(baseline).length;
  }

  function diffSince() {
    if (!baseline) snapshot();
    var added = [];
    var overridden = [];
    Object.keys(window).forEach(function(k) {
      if (!_shouldTrack(k)) return;
      var v = window[k];
      if (!(k in baseline)) {
        added.push({ key: k, type: _typeOf(v) });
      } else if (baseline[k].ref !== v) {
        // 只关心函数覆盖（数据字段常规变化不算）
        if (baseline[k].type === 'function' || _typeOf(v) === 'function') {
          overridden.push({ key: k, oldType: baseline[k].type, newType: _typeOf(v) });
        }
      }
    });
    return { added: added, overridden: overridden };
  }

  function _reportDiff(diff) {
    diff.added.forEach(function(a) {
      if (addLog.length < MAX_LOG) addLog.push({ t: Date.now(), key: a.key, type: a.type });
      // 新增常见无害：不打 warn，只 info
      console.info('[guard] 新全局: ' + a.key + ' (' + a.type + ')');
    });
    diff.overridden.forEach(function(o) {
      if (overrideLog.length < MAX_LOG) overrideLog.push({ t: Date.now(), key: o.key, oldType: o.oldType, newType: o.newType });
      console.error('[guard] ⚠ 可疑覆盖: ' + o.key + ' (' + o.oldType + ' → ' + o.newType + ')');
      if (window.TM && TM.errors) {
        TM.errors.capture(
          new Error('window.' + o.key + ' 被覆盖 (' + o.oldType + ' → ' + o.newType + ')'),
          'pollution-guard',
          { key: o.key, oldType: o.oldType, newType: o.newType }
        );
      }
    });
    if (diff.overridden.length === 0 && diff.added.length === 0) return;
    // 报告后重置 baseline，避免重复告警
    snapshot();
  }

  function scan() {
    var diff = diffSince();
    _reportDiff(diff);
    return diff;
  }

  function start(intervalMs) {
    if (timer) return;
    if (!baseline) snapshot();
    timer = setInterval(scan, intervalMs || 5000);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function getLog() {
    return { adds: addLog.slice(), overrides: overrideLog.slice() };
  }
  function clearLog() {
    addLog.length = 0;
    overrideLog.length = 0;
  }

  function report() {
    if (!baseline) snapshot();
    var total = Object.keys(baseline).length;
    var byType = {};
    Object.keys(baseline).forEach(function(k) {
      var t = baseline[k].type;
      byType[t] = (byType[t] || 0) + 1;
    });
    console.log('[guard] 当前 window 可追踪全局: ' + total);
    console.log('  按类型:', byType);
    console.log('  自启动累计新增:', addLog.length);
    console.log('  自启动累计覆盖警告:', overrideLog.length);
    return { total: total, byType: byType, addCount: addLog.length, overrideCount: overrideLog.length };
  }

  TM.guard = {
    snapshot: snapshot,
    diffSince: diffSince,
    scan: scan,
    start: start,
    stop: stop,
    getLog: getLog,
    clearLog: clearLog,
    report: report,
    _baseline: function(){ return baseline; }
  };

  // 默认：DOMContentLoaded 后 2s 拍基线快照（等所有 tm-*.js 加载完）
  function _initialSnapshot() {
    setTimeout(function() {
      snapshot();
      // 不默认开启巡检，只记录基线
    }, 2000);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initialSnapshot);
    else _initialSnapshot();
  }
})();


/* === P4-beta facade: TM.Diagnostics === */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};
  var D = window.TM.Diagnostics = window.TM.Diagnostics || {};
  D.errors = window.TM.errors || null;
  D.guard = window.TM.guard || null;
  D.openErrorsPanel = function(){ if (window.TM.errors && typeof window.TM.errors.openPanel === 'function') return window.TM.errors.openPanel(); };
  D.closeErrorsPanel = function(){ if (window.TM.errors && typeof window.TM.errors.closePanel === 'function') return window.TM.errors.closePanel(); };
  D.toggleErrorsPanel = function(){ if (window.TM.errors && typeof window.TM.errors.togglePanel === 'function') return window.TM.errors.togglePanel(); };
  D.report = function(){
    return {
      errors: window.TM.errors && typeof window.TM.errors.getSummary === 'function' ? window.TM.errors.getSummary() : {},
      guard: window.TM.guard && typeof window.TM.guard.report === 'function' ? window.TM.guard.report() : null
    };
  };
})();
