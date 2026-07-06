// ============================================================
//  verify-version-scheme.js — 桌面版本号方案守卫（2026-07-04）
//
//  背景(owner 报)：玩家从 1.3.4.4 安装包直接装 1.3.4.5 安装包·打开却仍是 1.3.4.4。
//  真因：package.json `version` 冻结在三段 "1.3.4"·每版只 bump 四段 `build.buildVersion`。
//        electron-builder / NSIS / Windows / electron-updater 都靠 `version` 认版本 →
//        连续两版在它们眼里都是同一个 "1.3.4" → 新安装包不被当升级 → 旧版残留。
//  治法：`version` 改为**每版递增的合法三段 semver**(由四段 buildVersion 按 a.b.(c*100+d) 映射)·
//        供 electron-updater/NSIS 认版本；玩家可见版本仍走四段 buildVersion / index.html <meta tm-version>。
//        getCurrentComparableVersion() 去掉 max(buildVersion,appVersion)·直返 buildVersion(否则
//        三段 semver 数值一高就把显示/热更门基线劫走)；isStrictUpgrade 改用 app.getVersion()(semver) 同类比。
//
//  本测钉三件事：① version↔buildVersion 按映射锁死(防再次漂移/冻结) ② 展示/热更门基线=buildVersion
//  (semver 再高也劫不走) ③ 整包升级判定走 semver·热更判定仍走四段·两条不混。
//  运行：node web/scripts/verify-version-scheme.js
// ============================================================
'use strict';

process.env.TIANMING_TEST_EXPORTS = '1';

const Module = require('module');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-verify-verscheme-'));

// 可控的 app.getVersion()（模拟 electron 把 package.json version 读进来·测 max 是否被劫）
let STUB_APP_VERSION = '1.3.405';
const electronStub = {
  app: {
    getPath: () => path.join(TMP, 'userData'),
    getVersion: () => STUB_APP_VERSION,
    getAppPath: () => ROOT,
    isPackaged: false,
    whenReady: () => new Promise(() => {}),
    on: () => {}, once: () => {}, relaunch: () => {}, exit: () => {}, quit: () => {}
  },
  BrowserWindow: function () {},
  ipcMain: { handle: () => {}, on: () => {} },
  dialog: {}, shell: {}, Menu: {},
  protocol: { registerSchemesAsPrivileged: () => {}, handle: () => {} },
  net: { fetch: (url, init) => fetch(url, init) }
};
electronStub.BrowserWindow.getAllWindows = () => [];
const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'electron') return electronStub;
  if (request === 'electron-updater') {
    return { autoUpdater: { on: () => {}, setFeedURL: () => {}, checkForUpdates: async () => null, downloadUpdate: async () => [], quitAndInstall: () => {} } };
  }
  return origLoad.apply(this, arguments);
};

const T = require(path.join(ROOT, 'main-impl.js')).__test;
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; console.log('  ok· ' + msg); } else { fail++; console.error('  FAIL· ' + msg); } }

// ★共享映射模块(release.js 写 package.json 也 require 同一份·杜绝两处映射漂移)
const { mapBuildToSemver, isStrictNumericSemver, isValidBuildVersion } = require(path.join(ROOT, 'scripts', 'version-map'));

console.log('===== ① version / buildVersion 字段与映射锁死 =====');
const bv = PKG.build && PKG.build.buildVersion;
assert(isStrictNumericSemver(PKG.version), 'package.json version 是合法三段 semver·无前导零（electron-updater/NSIS 硬要求）· = ' + PKG.version);
assert(isValidBuildVersion(bv), 'build.buildVersion 四段·各段非负整数·第四段 0..99（>=100 会与下一组碰撞）· = ' + bv);
assert(PKG.version === mapBuildToSemver(bv),
  'version 与 buildVersion 按 a.b.(c*100+d) 锁死（防漂移/冻结·与 release.js 同源映射）·期望 ' + mapBuildToSemver(bv) + ' 实际 ' + PKG.version);
assert(PKG.version !== '1.3.4',
  'version 不再是冻结值 "1.3.4"（那正是新安装包不升级的病灶）');
// d>=100 碰撞守卫：mapBuildToSemver 对非法第四段须抛错
var _dGuardThrew = false;
try { mapBuildToSemver('1.3.4.100'); } catch (_) { _dGuardThrew = true; }
assert(_dGuardThrew, 'mapBuildToSemver 拒绝第四段 >=100（1.3.4.100 会撞 1.3.5.0·须抛错拦住）');

console.log('===== ①b 安装包四段展示源一致性总闸（任一处漏 bump 即红） =====');
// artifactName（安装包文件名）须含 buildVersion
const artifactName = (PKG.build && PKG.build.artifactName) || '';
assert(artifactName.indexOf(bv) >= 0,
  'build.artifactName 含 buildVersion(' + bv + ')·= ' + artifactName);
// index.html <meta tm-version> 须 = buildVersion（玩家 footer 显示源·装上后须与安装包版本一致）
let metaVer = '';
try {
  const html = fs.readFileSync(path.join(ROOT, 'web', 'index.html'), 'utf-8');
  const m = html.match(/<meta\s+name=["']tm-version["']\s+content=["']([^"']+)["']/i);
  metaVer = m ? m[1].trim() : '';
} catch (_) {}
assert(metaVer === bv,
  'web/index.html <meta tm-version> = buildVersion(' + bv + ')·实际 ' + metaVer);
// web/version.json（若有）须 = buildVersion
try {
  const vjPath = path.join(ROOT, 'web', 'version.json');
  if (fs.existsSync(vjPath)) {
    const vj = JSON.parse(fs.readFileSync(vjPath, 'utf-8'));
    assert(String(vj.version || '').trim() === bv,
      'web/version.json.version = buildVersion(' + bv + ')·实际 ' + vj.version);
  } else { pass++; console.log('  ok· web/version.json 不存在·跳过'); }
} catch (e) { fail++; console.error('  FAIL· 读 web/version.json 异常· ' + (e.message || e)); }

console.log('===== ② 展示/热更门基线 = buildVersion（三段 semver 再高也劫不走） =====');
// 故意把 app.getVersion 设成数值上远高于 buildVersion 的合法 semver
STUB_APP_VERSION = '1.3.999';
assert(T.getCurrentComparableVersion() === bv,
  'getCurrentComparableVersion() 直返 buildVersion(' + bv + ')·不被高 semver(1.3.999) 劫走');
assert(T.getPackageBuildVersion() === bv, 'getPackageBuildVersion() = ' + bv);

console.log('===== ③ 整包升级判定走 semver·热更判定走四段·两条不混 =====');
// isStrictUpgrade：本地 = app.getVersion()(semver)·与 latest.yml 的 semver 同类比
STUB_APP_VERSION = '1.3.405';
assert(T.isStrictUpgrade('1.3.406') === true, 'isStrictUpgrade：远端 semver 更高 → true');
assert(T.isStrictUpgrade('1.3.405') === false, 'isStrictUpgrade：远端 semver 相同 → false');
assert(T.isStrictUpgrade('1.3.4') === false, 'isStrictUpgrade：远端 = 旧冻结版 1.3.4 → false（1.3.405 更高）');
// 关键：isStrictUpgrade 不再拿四段 buildVersion 比（否则 1.3.406 vs 1.3.4.5 会误判）
assert(T.isStrictUpgrade('1.3.406') === true && T.isStrictUpgrade('1.3.404') === false,
  'isStrictUpgrade 以 semver(app.getVersion) 为基·非 buildVersion');
// 热更判定 isStrictRendererUpgrade：仍按四段 buildVersion 比（isPackaged=false → 无 active hot → 基线=buildVersion）
// ★从当前 buildVersion 动态推「更高的一版」·对每次发版 bump 免疫（不硬编码具体版本号）
var _bvHigher = (function(){ var p = String(bv).split('.').map(function(n){return parseInt(n,10)||0;}); p[p.length-1]++; return p.join('.'); })();
assert(T.isStrictRendererUpgrade(_bvHigher) === true, 'isStrictRendererUpgrade：四段更高(' + _bvHigher + ') → true（热更路径按 buildVersion ' + bv + '）');
assert(T.isStrictRendererUpgrade(bv) === false, 'isStrictRendererUpgrade：四段相同(' + bv + ') → false');

console.log('');
console.log('[verify-version-scheme] ' + (fail ? 'FAILED ' + fail : 'PASS') + ' · pass=' + pass);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
process.exit(fail ? 1 : 0);
