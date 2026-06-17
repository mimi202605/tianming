/*
 * ============================================================
 *  天命 · Electron 主进程·shim
 *  2026-05-23 起·此 shim 取代原 main.js·允许 main 实现热更新
 *
 *  逻辑·
 *    1. 启动时优先找 hot dir 的 `_app_main.js` (玩家通过热更得到的 main 实现)
 *    2. 如果存在·require 它·delegate 全部主进程逻辑
 *    3. 失败 (require throw 或不存在)·fallback 到 bundled `./main-impl.js` (随 installer 出厂)
 *
 *  目的·让 main.js 的任何 bug 修都能走热更·不再强制 user rebuild .exe
 *
 *  Roll-back 路径·
 *    - hot main 装坏·shim 同步 catch → 用 bundled
 *    - 不抓不到的异步 crash·user 进 视图→热更新→回滚 (hot-update-rollback)·下次启动 shim 切回 bundled
 * ============================================================
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// 2026-06-11·版本比较（与 main-impl compareVersions 同语义·4 段数值）
function _cmpVer(a, b) {
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

function _baseBuildVersion() {
  try {
    var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
    return String((pkg.build && pkg.build.buildVersion) || pkg.version || '');
  } catch (e) { return ''; }
}

function _detectHotMain() {
  try {
    var userData = app.getPath('userData');
    var stateFile = path.join(userData, 'content', 'hot-updates', 'hot-update-state.json');
    if (!fs.existsSync(stateFile)) return '';
    var raw = fs.readFileSync(stateFile, 'utf-8');
    var state = JSON.parse(raw);
    if (!state || state.enabled === false) return '';
    var dir = String(state.currentDir || '').trim();
    if (!dir || !fs.existsSync(dir)) return '';
    // 2026-06-11·版本闸·安装包升级后旧热更 (stale) 不再被加载——
    //   旧热更 main 的 __dirname 锚在热更目录·曾致 preload/web 根找错（白屏类故障）·
    //   stale 时直接回 bundled main·main-impl 启动期会把 stale 状态清掉
    var base = _baseBuildVersion();
    var hotVer = String(state.currentVersion || '').trim();
    if (base && hotVer && _cmpVer(hotVer, base) < 0) {
      console.warn('[main-shim] hot version ' + hotVer + ' < base ' + base + '·stale·skip hot main');
      return '';
    }
    var candidate = path.join(dir, '_app_main.js');
    if (!fs.existsSync(candidate)) return '';
    return candidate;
  } catch (e) {
    console.warn('[main-shim] hot detect failed·', e && e.message || e);
    return '';
  }
}

// dev / `npm start` (electron .·app.isPackaged===false): never load the hot-update main — always run
// the local bundled main-impl.js, so the launcher (启动天命.bat) always reflects the latest local
// source. Packaged builds (players) keep loading the hot main for online hot-updates.
const hotMain = app.isPackaged ? _detectHotMain() : '';
let usingHot = false;
if (!app.isPackaged) {
  console.log('[main-shim] dev mode (electron .)·forcing local main-impl.js + local web/·ignoring hot-update cache');
}

if (hotMain) {
  try {
    console.log('[main-shim] loading hot main·' + hotMain);
    require(hotMain);
    usingHot = true;
  } catch (e) {
    console.warn('[main-shim] hot main require 同步 failed·falling back to bundled·' + (e && e.stack || e));
  }
}

if (!usingHot) {
  console.log('[main-shim] loading bundled main·' + path.join(__dirname, 'main-impl.js'));
  require('./main-impl.js');
}
