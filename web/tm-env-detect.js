// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
//  R103 · 环境检测工具 (TM.env)
//  用于区分 Electron 桌面应用 vs GitHub Pages / 其他 web 托管
//  影响：存档策略、AI key 提示、文件保存方式、外部链接行为
//  R105 · 加 @ts-check
// ============================================================

(function(){
  'use strict';

  var isElectron = !!(typeof window !== 'undefined' && window.tianming && window.tianming.isDesktop);
  var isFile     = typeof location !== 'undefined' && location.protocol === 'file:';
  var isGitHub   = typeof location !== 'undefined' && /\.github\.io$/i.test(location.hostname || '');
  var isLocalhost= typeof location !== 'undefined' && /^(localhost|127\.|192\.168\.)/i.test(location.hostname || '');
  var isWeb      = !isElectron && !isFile;

  // 浏览器能力检测（用于优雅降级）
  var caps = {
    indexedDB:         typeof indexedDB !== 'undefined',
    compressionStream: typeof CompressionStream !== 'undefined',
    structuredClone:   typeof structuredClone === 'function',
    backdropFilter:    (function(){
      try { return CSS && CSS.supports && (CSS.supports('backdrop-filter', 'blur(4px)') || CSS.supports('-webkit-backdrop-filter', 'blur(4px)')); }
      catch(e) { return false; }
    })(),
    hasSelector:       (function(){
      try { return CSS && CSS.supports && CSS.supports('selector(:has(*))'); }
      catch(e) { return false; }
    })(),
    showSaveFilePicker: typeof window.showSaveFilePicker === 'function',
    offscreenCanvas:    typeof OffscreenCanvas !== 'undefined'
  };

  // 人读的环境描述
  function describe() {
    if (isElectron) return 'Electron Desktop';
    if (isFile)     return 'Local file://';
    if (isGitHub)   return 'GitHub Pages (' + location.hostname + ')';
    if (isLocalhost)return 'localhost (' + location.host + ')';
    return 'Web (' + (location.hostname || 'unknown') + ')';
  }

  // 用户面提示（控制台友好输出）
  function print() {
    var lines = [
      '=== 天命·运行环境 ===',
      '环境: ' + describe(),
      '协议: ' + (location ? location.protocol : 'unknown'),
      'Electron: ' + isElectron + '  |  GitHub Pages: ' + isGitHub,
      '--- 浏览器能力 ---',
      'IndexedDB: ' + caps.indexedDB + '  (存档)',
      'CompressionStream: ' + caps.compressionStream + '  (存档压缩)',
      'structuredClone: ' + caps.structuredClone,
      'backdrop-filter: ' + caps.backdropFilter + '  (毛玻璃)',
      ':has() 选择器: ' + caps.hasSelector,
      'showSaveFilePicker: ' + caps.showSaveFilePicker + '  (原生保存对话框)',
    ];
    console.log(lines.join('\n'));
    return describe();
  }

  // 检查关键能力·不满足时 toast 警告（GitHub Pages 首次访问时）
  function warnIfIncompatible() {
    var missing = [];
    if (!caps.indexedDB) missing.push('IndexedDB (存档系统受影响)');
    if (!caps.compressionStream) missing.push('CompressionStream (存档体积变大但可用)');
    if (missing.length && typeof window.toast === 'function') {
      window.toast('⚠️ 浏览器能力缺失：' + missing.join('、'));
    }
    return missing;
  }

  // 导出到全局
  window.TM = window.TM || {};
  window.TM.env = {
    isElectron: isElectron,
    isFile: isFile,
    isGitHub: isGitHub,
    isLocalhost: isLocalhost,
    isWeb: isWeb,
    caps: caps,
    describe: describe,
    print: print,
    warnIfIncompatible: warnIfIncompatible
  };

  // GitHub Pages 首次加载时打印一次环境信息到控制台（帮调试）
  if (isGitHub || isWeb) {
    try { console.log('[TM.env] ' + describe()); } catch(_){}
  }
})();
