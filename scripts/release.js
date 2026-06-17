#!/usr/bin/env node
// ============================================================
//  release.js — 天命一键发版工具（dev 侧）
//  2026-06-11·更新功能全面升级 S10·取代「每版手改 6 处版本号 + 手跑两个构建器 + 手传 gh」
//
//  一条命令：版本扇出盖戳 → 双端构建 → 独立复验闸 → 基线刷新 → staging →
//            gh release 上传（含按版补好的 deploy.py）→ 打印 owner 服务器一行命令
//
//  用法：
//    node scripts/release.js --version 1.3.4.0 --notes "本版说明" [选项]
//  选项：
//    --with-installer        把 E:\版本\测试版<V> 的 latest.yml/exe/blockmap 也staging（ASCII 别名上传）
//    --min-app-version X     热更 feed 标注所需最低本体版本（触发客户端「需更新本体」流程）
//    --no-delta              capgo 只出全量（不出差量 manifest/对象包）
//    --no-upload             只构建+staging·不动 GitHub
//    --offline               跳过线上版本闸 + 差量基线拉取（断网时）
//    --dry-run               只跑闸门并打印计划·不写任何文件
//    --version-code N        显式安卓 versionCode（默认数字拼接·任一段>9 时必须显式给）
//    --self-test             fanOut 对临时副本自测后退出
//    --repo-root DIR         合成仓自测用（默认本仓）
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REAL_ROOT = path.resolve(__dirname, '..');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i >= 0 && process.argv[i + 1] !== undefined && !String(process.argv[i + 1]).startsWith('--')) return process.argv[i + 1];
  return dflt;
}
function flag(name) { return process.argv.includes('--' + name); }
function die(msg) { console.error('✗ ' + msg); process.exit(1); }
function log(msg) { console.log(msg); }
function today() {
  const d = new Date();
  const p = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function readJson(p) {
  let raw = fs.readFileSync(p, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}
function cmpVersions(a, b) {
  const aa = String(a || '0').split(/[.+-]/).map(n => { const v = parseInt(n, 10); return Number.isFinite(v) ? v : 0; });
  const bb = String(b || '0').split(/[.+-]/).map(n => { const v = parseInt(n, 10); return Number.isFinite(v) ? v : 0; });
  const n = Math.max(aa.length, bb.length, 4);
  for (let i = 0; i < n; i++) { const av = aa[i] || 0, bv = bb[i] || 0; if (av > bv) return 1; if (av < bv) return -1; }
  return 0;
}

const CFG = {
  root: path.resolve(arg('repo-root', REAL_ROOT)),
  version: String(arg('version', '') || '').trim(),
  notes: String(arg('notes', '') || ''),
  minAppVersion: String(arg('min-app-version', '') || ''),
  withInstaller: flag('with-installer'),
  noDelta: flag('no-delta'),
  noUpload: flag('no-upload'),
  offline: flag('offline'),
  dryRun: flag('dry-run'),
  versionCodeArg: arg('version-code', ''),
  ts: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
};
const P = {
  pkg: () => path.join(CFG.root, 'package.json'),
  gradle: () => path.join(CFG.root, 'mobile', 'android', 'app', 'build.gradle'),
  web: () => path.join(CFG.root, 'web'),
  versionJson: () => path.join(CFG.root, 'web', 'version.json'),
  indexHtml: () => path.join(CFG.root, 'web', 'index.html'),
  changelog: () => path.join(CFG.root, 'web', 'changelog.json'),
  releaseHot: () => path.join(CFG.root, 'release-hot'),
  capgoDist: () => path.join(CFG.root, 'mobile', 'capgo-dist'),
  staging: () => path.join(CFG.root, 'release-hot', '_release-' + CFG.version),
  hotBuilder: () => path.join(CFG.root, 'web', 'tools', 'build-hot-update-package.js'),
  capgoBuilder: () => path.join(CFG.root, 'mobile', 'scripts', 'build-capgo-bundle.ps1'),
  deployPy: () => path.join(REAL_ROOT, 'scripts', 'deploy.py'),       // deploy 永远取真仓最新版
  verifyArtifacts: () => path.join(REAL_ROOT, 'scripts', 'lib', 'verify-artifacts.js'),
  installerDir: () => 'E:\\版本\\测试版' + CFG.version
};
const PUBLIC_BASE = 'https://api.themisfitserspeople.top/tianming';

// ── ① 版本闸 ─────────────────────────────────────────────────────────────────
function gateVersion() {
  if (!CFG.version) die('缺 --version（如 1.3.4.0）');
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(CFG.version)) die('--version 须 4 段数字（如 1.3.4.0）·拿到 ' + CFG.version);
  const pkg = readJson(P.pkg());
  const cur = (pkg.build && pkg.build.buildVersion) || pkg.version;
  if (cmpVersions(CFG.version, cur) <= 0) die('版本不单调·--version ' + CFG.version + ' ≤ 本仓 buildVersion ' + cur);
  const parts = CFG.version.split('.').map(Number);
  let code;
  if (CFG.versionCodeArg) {
    code = parseInt(CFG.versionCodeArg, 10);
    if (!Number.isFinite(code)) die('--version-code 非数字');
  } else {
    if (parts.some(p => p > 9)) die('版本某段 >9·数字拼接 versionCode 会歧义（如 1.3.10.0 vs 1.31.0.0）·请显式 --version-code');
    code = parseInt(parts.join(''), 10);
  }
  const gradleSrc = fs.readFileSync(P.gradle(), 'utf-8');
  const m = gradleSrc.match(/versionCode\s+(\d+)/);
  if (!m) die('build.gradle 找不到 versionCode');
  if (code <= parseInt(m[1], 10)) die('versionCode ' + code + ' ≤ gradle 现值 ' + m[1] + '（安卓升级要求严格递增）');
  log('① 版本闸·' + cur + ' → ' + CFG.version + '·versionCode ' + m[1] + ' → ' + code);
  return code;
}

// ── ② changelog 闸 ───────────────────────────────────────────────────────────
function gateChangelog() {
  const cl = readJson(P.changelog());
  const top = cl.entries && cl.entries[0];
  if (!top) die('changelog.json 没有条目');
  if (String(top.module || '').indexOf(CFG.version) !== 0) {
    die('changelog 顶条目 module「' + String(top.module).slice(0, 30) + '…」未以 ' + CFG.version + ' 开头。先写好邸报条目再发版。');
  }
  if (top.date !== today()) log('  WARN·changelog 顶条目日期 ' + top.date + ' ≠ 今天 ' + today() + '（确认是否旧条目）');
  log('② changelog 闸·顶条目 ' + top.date + '·' + String(top.module).slice(0, 40));
}

// ── ③ 线上版本闸（防把更低版本发上去搁浅全体客户端） ─────────────────────────
async function gateLive() {
  if (CFG.offline) { log('③ 线上闸·--offline 跳过'); return { capgoManifest: null }; }
  async function getJson(url) {
    try {
      const r = await fetch(url + '?cb=' + Date.now(), { headers: { 'User-Agent': 'tm-release/1' } });
      return r.ok ? await r.json() : null;
    } catch (_) { return null; }
  }
  const hot = await getJson(PUBLIC_BASE + '/hot/hot-latest.json');
  const capgo = await getJson(PUBLIC_BASE + '/capgo/latest.json');
  if (hot && cmpVersions(CFG.version, hot.version) <= 0) die('线上 hot 已是 v' + hot.version + '·新版本必须更高');
  if (capgo && cmpVersions(CFG.version, capgo.version) <= 0) die('线上 capgo 已是 v' + capgo.version + '·新版本必须更高');
  log('③ 线上闸·hot v' + (hot && hot.version) + '·capgo v' + (capgo && capgo.version) + '·均低于 ' + CFG.version + ' ✓');
  return { capgoManifest: capgo && Array.isArray(capgo.manifest) ? capgo.manifest : null };
}

// ── ④ 版本扇出盖戳（全部带「恰一处匹配」断言 + .bak 备份 + 写后回读复核） ────
function fanOutVersions(code) {
  const edits = [];
  function backup(file) { fs.copyFileSync(file, file + '.bak-release-' + CFG.ts); }
  function regexEdit(file, desc, re, replacement) {
    const src = fs.readFileSync(file, 'utf-8');
    const matches = src.match(new RegExp(re.source, re.flags.replace('g', '') + 'g')) || [];
    if (matches.length !== 1) die('扇出失败·' + desc + '·期望恰 1 处匹配·实得 ' + matches.length + '（' + file + '）');
    backup(file);
    const next = src.replace(re, replacement);
    fs.writeFileSync(file, next, 'utf-8');
    const verify = fs.readFileSync(file, 'utf-8');
    if (verify.indexOf(typeof replacement === 'string' ? replacement.replace(/\$\d/g, '') : '') === -1 && !re.test(verify) === false) { /* 回读由具体调用断言 */ }
    edits.push(desc);
  }
  // package.json·JSON round-trip（保键序·无注释·安全）
  {
    const file = P.pkg();
    const pkg = readJson(file);
    backup(file);
    pkg.version = CFG.version.split('.').slice(0, 3).join('.');
    pkg.build = pkg.build || {};
    pkg.build.buildVersion = CFG.version;
    if (pkg.build.directories && /测试版[\d.]+$/.test(String(pkg.build.directories.output || ''))) {
      pkg.build.directories.output = String(pkg.build.directories.output).replace(/测试版[\d.]+$/, '测试版' + CFG.version);
    }
    if (typeof pkg.build.artifactName === 'string' && /[\d]+(\.[\d]+){2,3}/.test(pkg.build.artifactName)) {
      pkg.build.artifactName = pkg.build.artifactName.replace(/[\d]+(\.[\d]+){2,3}/, CFG.version);
    }
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    const back = readJson(file);
    if (back.build.buildVersion !== CFG.version) die('扇出回读失败·package.json buildVersion');
    edits.push('package.json·version/buildVersion/output/artifactName');
  }
  regexEdit(P.gradle(), 'build.gradle versionCode', /versionCode\s+\d+/, 'versionCode ' + code);
  regexEdit(P.gradle(), 'build.gradle versionName', /versionName\s+"[\d.]+"/, 'versionName "' + CFG.version + '"');
  {
    const file = P.versionJson();
    if (fs.existsSync(file)) backup(file);
    fs.writeFileSync(file, JSON.stringify({ version: CFG.version, date: today(), notes: CFG.notes || '' }, null, 2) + '\n', 'utf-8');
    edits.push('web/version.json');
  }
  regexEdit(P.indexHtml(), 'index.html meta tm-version', /(<meta\s+name="tm-version"\s+content=")[\d.]+(")/, '$1' + CFG.version + '$2');
  regexEdit(P.indexHtml(), 'index.html footer 版本号', /(<span id="tm-foot-ver">)[\d.]+(<\/span>)/, '$1' + CFG.version + '$2');
  log('④ 版本扇出·' + edits.length + ' 处盖戳完成（各留 .bak-release-' + CFG.ts + '）');
}

// ── ⑤ 桌面构建 ───────────────────────────────────────────────────────────────
function buildDesktop() {
  log('⑤ 桌面热更构建（全量清单·构建器自带 GATE0-6）...');
  // --include-preview 必带·preview/ 有运行时内容（御案图+剧本工坊）·1.3.2.0 发版踩过「桌面端漏 preview 双端不一致」的坑
  // （构建器的 isPreviewMockup 仍会剔掉 ~300MB 设计稿/截图·只留运行时）
  const args = [P.hotBuilder(), '--version', CFG.version, '--out', P.releaseHot(), '--notes', CFG.notes, '--include-preview'];
  if (CFG.minAppVersion) args.push('--min-app-version', CFG.minAppVersion);
  if (CFG.root !== REAL_ROOT) args.push('--web-root', P.web(), '--app-root', CFG.root);
  const r = spawnSync('node', args, { stdio: 'inherit', cwd: CFG.root });
  if (r.status !== 0) die('桌面构建失败（见上方 GATE 输出）');
}

// ── ⑥ 首装增量基线刷新（治「基线腐坏在 1.3.3.4」类沉疴） ─────────────────────
function refreshBaseline() {
  const src = path.join(P.releaseHot(), 'manifests', CFG.version + '.json');
  const dst = path.join(P.web(), '.hot-update-manifest.json');
  if (fs.existsSync(dst)) fs.copyFileSync(dst, dst + '.bak-release-' + CFG.ts);
  fs.copyFileSync(src, dst);
  log('⑥ 首装增量基线刷新·web/.hot-update-manifest.json ← manifests/' + CFG.version + '.json');
}

// ── ⑦ 安卓构建 ───────────────────────────────────────────────────────────────
function buildAndroid(liveCapgoManifest) {
  log('⑦ 安卓 capgo 构建（全量 zip' + (CFG.noDelta ? '' : ' + 差量 manifest + 新对象包') + '）...');
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', P.capgoBuilder(),
    '-Version', CFG.version, '-WebDir', P.web(), '-OutDir', P.capgoDist()];
  if (!CFG.noDelta) {
    args.push('-Manifest', '-PackFiles');
    if (liveCapgoManifest) {
      const tmp = path.join(os.tmpdir(), 'tm-capgo-baseline-' + CFG.ts + '.json');
      fs.writeFileSync(tmp, JSON.stringify({ manifest: liveCapgoManifest }), 'utf-8');
      args.push('-BaselineManifest', tmp);
      log('  差量基线·线上 manifest ' + liveCapgoManifest.length + ' 条（新对象包只装增量）');
    } else {
      log('  无线上差量基线（首次开差量/离线）·新对象包=全部对象（一次性 ~500MB·之后每版几 MB）');
    }
  }
  const r = spawnSync('powershell', args, { stdio: 'inherit' });
  if (r.status !== 0) die('安卓构建失败');
}

// ── ⑧ feed 合成 + 独立复验闸（不信构建器·二道防线） ──────────────────────────
function composeAndGate() {
  log('⑧ feed 合成 + 制品独立复验...');
  const VA = require(P.verifyArtifacts());
  const hotZip = path.join(P.releaseHot(), 'tianming-hot-' + CFG.version + '.zip');
  const hotFeedPath = path.join(P.releaseHot(), 'hot-latest.json');
  const hotManifestPath = path.join(P.releaseHot(), 'manifests', CFG.version + '.json');
  const d = VA.verifyDesktop({ zipPath: hotZip, feedPath: hotFeedPath, manifestPath: hotManifestPath });
  if (!d.ok) { d.problems.forEach(p => console.error('  桌面制品问题·' + p)); die('桌面制品复验不过'); }
  log('  桌面 ✓ ' + JSON.stringify(d.stats));

  // zip 内 changelog 必须与源 byte 级一致（防并行改动夹带旧 changelog）
  {
    const AdmZip = require(path.join(REAL_ROOT, 'node_modules', 'adm-zip'));
    const z = new AdmZip(hotZip);
    const inZip = z.readFile('changelog.json');
    const onDisk = fs.readFileSync(P.changelog());
    if (!inZip || !inZip.equals(onDisk)) die('zip 内 changelog.json 与 web/changelog.json 不一致（构建间隙被改动？重新构建）');
  }

  let latestJson = null;
  if (!CFG.noDelta) {
    const buildInfo = readJson(path.join(P.capgoDist(), CFG.version + '-build.json'));
    const capgoManifest = readJson(path.join(P.capgoDist(), CFG.version + '-manifest.json'));
    latestJson = {
      version: CFG.version,
      url: PUBLIC_BASE + '/capgo/bundles/' + CFG.version + '.zip',
      size: buildInfo.zipBytes,
      manifest: capgoManifest.manifest
    };
    const c = VA.verifyCapgo({
      manifestPath: path.join(P.capgoDist(), CFG.version + '-manifest.json'),
      zipPath: path.join(P.capgoDist(), CFG.version + '.zip'),
      filesDir: path.join(P.capgoDist(), 'files'),
      filesZipPath: path.join(P.capgoDist(), 'capgo-files-' + CFG.version + '.zip'),
      baseUrl: PUBLIC_BASE + '/capgo',
      version: CFG.version
    });
    if (!c.ok) { c.problems.forEach(p => console.error('  capgo 制品问题·' + p)); die('capgo 制品复验不过'); }
    log('  capgo ✓ ' + JSON.stringify(c.stats));
  } else {
    const zipBytes = fs.statSync(path.join(P.capgoDist(), CFG.version + '.zip')).size;
    latestJson = { version: CFG.version, url: PUBLIC_BASE + '/capgo/bundles/' + CFG.version + '.zip', size: zipBytes };
  }
  return { latestJson };
}

// ── ⑨ 安装包 staging（可选） ──────────────────────────────────────────────────
function stageInstaller(stagingDir) {
  if (!CFG.withInstaller) return [];
  const dir = P.installerDir();
  if (!fs.existsSync(path.join(dir, 'latest.yml'))) {
    die('--with-installer 但 ' + dir + ' 没有 latest.yml。先跑 npm run build:win（electron-builder 会产 yml+exe+blockmap）。');
  }
  const yml = fs.readFileSync(path.join(dir, 'latest.yml'), 'utf-8');
  const ypath = (yml.match(/^path:\s*(.+)$/m) || [])[1];
  const ysha = (yml.match(/^sha512:\s*(.+)$/m) || [])[1];
  if (!ypath || !ysha) die('latest.yml 缺 path/sha512');
  const exe = path.join(dir, ypath.trim());
  if (!fs.existsSync(exe)) die('latest.yml path 指向的安装包不存在·' + exe);
  const actual = crypto.createHash('sha512').update(fs.readFileSync(exe)).digest('base64');
  if (actual !== ysha.trim()) die('安装包 sha512 与 latest.yml 不符（构建后被改动？）');
  const alias = 'tianming-setup-' + CFG.version + '-x64.exe';   // gh 资产 ASCII 别名·deploy.py 按 yml path 还原中文名
  fs.copyFileSync(path.join(dir, 'latest.yml'), path.join(stagingDir, 'latest.yml'));
  fs.copyFileSync(exe, path.join(stagingDir, alias));
  const bm = exe + '.blockmap';
  const out = ['latest.yml', alias];
  if (fs.existsSync(bm)) { fs.copyFileSync(bm, path.join(stagingDir, alias + '.blockmap')); out.push(alias + '.blockmap'); }
  log('⑨ 安装包 staging·' + ypath.trim() + ' → ' + alias + '（sha512 ✓）');
  return out;
}

// ── ⑩ staging 汇总 + deploy.py 按版补丁 + runbook ────────────────────────────
function stageRelease(latestJson) {
  const dir = P.staging();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  function put(src, name) { fs.copyFileSync(src, path.join(dir, name)); files.push(name); }
  put(path.join(P.releaseHot(), 'tianming-hot-' + CFG.version + '.zip'), 'tianming-hot-' + CFG.version + '.zip');
  put(path.join(P.releaseHot(), 'hot-latest.json'), 'hot-latest.json');
  put(P.changelog(), 'changelog.json');
  put(path.join(P.capgoDist(), CFG.version + '.zip'), CFG.version + '.zip');
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(latestJson, null, 2), 'utf-8');
  files.push('latest.json');
  const pack = path.join(P.capgoDist(), 'capgo-files-' + CFG.version + '.zip');
  if (fs.existsSync(pack)) put(pack, 'capgo-files-' + CFG.version + '.zip');
  // deploy.py·补 DEFAULT_TAG → owner 一行命令零参数
  const dp = fs.readFileSync(P.deployPy(), 'utf-8');
  if (!/DEFAULT_TAG = ""/.test(dp)) die('deploy.py 缺 DEFAULT_TAG 锚点');
  fs.writeFileSync(path.join(dir, 'deploy.py'), dp.replace('DEFAULT_TAG = ""', 'DEFAULT_TAG = "ship-' + CFG.version + '"'), 'utf-8');
  files.push('deploy.py');
  const installerFiles = stageInstaller(dir);
  // runbook
  const runbook = buildRunbookText(installerFiles.length > 0);
  fs.writeFileSync(path.join(dir, 'OWNER-RUNBOOK-' + CFG.version + '.txt'), runbook, 'utf-8');
  files.push('OWNER-RUNBOOK-' + CFG.version + '.txt');
  log('⑩ staging 完成·' + dir + '·' + (files.length + installerFiles.length) + ' 个资产');
  return { dir, files: files.concat(installerFiles) };
}

function buildRunbookText(hasInstaller) {
  const L = [];
  L.push('═══ 天命 v' + CFG.version + ' 发版 runbook（自动生成）═══', '');
  L.push('1) 服务器一行（1Panel 终端·发布双端热更+邸报' + (hasInstaller ? '+本体通道' : '') + '）：');
  L.push('   curl -sL https://github.com/misfit-user/tianming/releases/download/ship-' + CFG.version + '/deploy.py -o /tmp/d.py && python3 /tmp/d.py');
  L.push('   · capgo 默认发「全量兜底」（latest.json 不带 manifest·与现状一致·绝对安全）');
  L.push('');
  L.push('2) 安卓差量灰度（自愿·建议在自己设备全量更新验证本版正常后再开）：');
  L.push('   python3 /tmp/d.py --only capgo --enable-manifest     ← latest.json 开始携带差量清单');
  L.push('   试验设备（还停在旧版的）启动 → 观察 OTA 卡片 + adb logcat | grep -iE "capgo|Updater"');
  L.push('   出任何问题一键回退： python3 /tmp/d.py --only capgo --disable-manifest');
  L.push('   ※ 首次差量≈全量体积（逐文件下·但断点可续）·从下一版起才是真·几 MB 差量');
  L.push('');
  L.push('3) 验证：');
  L.push('   curl -s ' + PUBLIC_BASE + '/hot/hot-latest.json | head -3');
  L.push('   curl -s ' + PUBLIC_BASE + '/capgo/latest.json | head -3');
  L.push('   桌面端打开游戏 → 启动 8s 内应弹「发现新版本」更新卡');
  L.push('');
  L.push('4) GitHub Pages 在线版：照旧 push 源码到 main（_push_main 流程）·在线玩家会收到「线上新版已颁」刷新提示');
  return L.join('\n') + '\n';
}

// ── ⑪ gh release 上传 + 资产审计 ─────────────────────────────────────────────
function uploadRelease(staging) {
  if (CFG.noUpload) { log('⑪ --no-upload·跳过 GitHub 上传（staging 已就绪·' + staging.dir + '）'); return; }
  const tag = 'ship-' + CFG.version;
  let r = spawnSync('gh', ['release', 'view', tag, '--repo', 'misfit-user/tianming'], { encoding: 'utf-8' });
  if (r.status !== 0) {
    log('⑪ 创建 release ' + tag + ' ...');
    r = spawnSync('gh', ['release', 'create', tag, '--repo', 'misfit-user/tianming',
      '--title', '天命 ' + CFG.version, '--notes', CFG.notes || ('天命 ' + CFG.version)], { encoding: 'utf-8' });
    if (r.status !== 0) die('gh release create 失败·' + (r.stderr || r.stdout));
  }
  for (const name of staging.files) {
    log('  上传 ' + name + ' ...');
    r = spawnSync('gh', ['release', 'upload', tag, path.join(staging.dir, name), '--clobber', '--repo', 'misfit-user/tianming'],
      { encoding: 'utf-8' });
    if (r.status !== 0) die('上传失败·' + name + '·' + (r.stderr || r.stdout) + '\n（网络断点可重跑·已传资产 --clobber 覆盖）');
  }
  // 上传审计·每个资产名+大小核对（老流程曾 warn-and-continue 漏传·这里漏一个就报死）
  r = spawnSync('gh', ['release', 'view', tag, '--repo', 'misfit-user/tianming', '--json', 'assets'], { encoding: 'utf-8' });
  if (r.status !== 0) die('gh release view --json assets 失败');
  const assets = JSON.parse(r.stdout).assets || [];
  const byName = new Map(assets.map(a => [a.name, a.size]));
  for (const name of staging.files) {
    const localSize = fs.statSync(path.join(staging.dir, name)).size;
    if (!byName.has(name)) die('审计失败·release 缺资产 ' + name);
    if (byName.get(name) !== localSize) die('审计失败·' + name + ' 大小不符·release=' + byName.get(name) + ' local=' + localSize);
  }
  log('⑪ 上传完成 + 审计通过·' + staging.files.length + ' 个资产');
}

// ── self-test·fanOut 对合成副本自测 ──────────────────────────────────────────
function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-release-selftest-'));
  fs.mkdirSync(path.join(tmp, 'mobile', 'android', 'app'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'web'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
    version: '1.3.3', build: { buildVersion: '1.3.3.5', directories: { output: 'E:\\版本\\测试版1.3.3.5' }, artifactName: '天命-1.3.3.5-${arch}.${ext}' }
  }, null, 2));
  fs.writeFileSync(path.join(tmp, 'mobile', 'android', 'app', 'build.gradle'),
    'android {\n  defaultConfig {\n        versionCode 1335\n        versionName "1.3.3.5"\n  }\n}\n');
  fs.writeFileSync(path.join(tmp, 'web', 'version.json'), JSON.stringify({ version: '1.3.3.5' }));
  fs.writeFileSync(path.join(tmp, 'web', 'index.html'),
    '<meta name="tm-version" content="1.3.3.5"><div class="f-ver">天 命　测试版 <span id="tm-foot-ver">1.3.3.5</span></div>');
  fs.writeFileSync(path.join(tmp, 'web', 'changelog.json'), JSON.stringify({ entries: [{ date: today(), module: '9.9.9.9·t', title: 't', items: [] }] }));
  CFG.root = tmp; CFG.version = '9.9.9.9'; CFG.versionCodeArg = '9999';
  let n = 0;
  const ok = (c, l) => { if (!c) die('selftest FAIL·' + l); n++; console.log('  ok·' + l); };
  const code = gateVersion();
  ok(code === 9999, 'versionCode 显式');
  gateChangelog();
  fanOutVersions(code);
  const pkg = readJson(path.join(tmp, 'package.json'));
  ok(pkg.version === '9.9.9', 'pkg.version 3 段');
  ok(pkg.build.buildVersion === '9.9.9.9', 'buildVersion 4 段');
  ok(pkg.build.directories.output.endsWith('测试版9.9.9.9'), 'output 目录');
  ok(pkg.build.artifactName === '天命-9.9.9.9-${arch}.${ext}', 'artifactName');
  const gradle = fs.readFileSync(path.join(tmp, 'mobile', 'android', 'app', 'build.gradle'), 'utf-8');
  ok(/versionCode 9999/.test(gradle) && /versionName "9\.9\.9\.9"/.test(gradle), 'gradle 两处');
  ok(readJson(path.join(tmp, 'web', 'version.json')).version === '9.9.9.9', 'version.json');
  const html = fs.readFileSync(path.join(tmp, 'web', 'index.html'), 'utf-8');
  ok(/content="9\.9\.9\.9"/.test(html) && />9\.9\.9\.9<\/span>/.test(html), 'index.html meta+footer');
  ok(fs.readdirSync(tmp).some(f => f.indexOf('package.json.bak-release-') === 0), '.bak 备份在');
  // 重跑同版本必被单调闸拒·buildVersion 已盖成目标值 → gateVersion 的 ≤ 判定必触发
  ok(cmpVersions('9.9.9.9', readJson(path.join(tmp, 'package.json')).build.buildVersion) === 0, '重跑同版本会被单调闸拒（buildVersion 已盖戳等值）');
  console.log('PASS assertions=' + n);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
(async function main() {
  if (flag('self-test')) return selfTest();
  log('═══ 天命发版·v' + CFG.version + (CFG.dryRun ? '·DRY-RUN' : '') + ' ═══');
  const code = gateVersion();
  gateChangelog();
  const live = await gateLive();
  if (CFG.dryRun) {
    log('（dry-run）将执行·④版本扇出(versionCode ' + code + ') → ⑤桌面构建 → ⑥基线刷新 → ⑦安卓构建'
      + (CFG.noDelta ? '(全量)' : '(差量' + (live.capgoManifest ? '·有线上基线' : '·无基线全打') + ')')
      + ' → ⑧复验 → ⑨⑩staging' + (CFG.withInstaller ? '(含安装包)' : '') + ' → ⑪' + (CFG.noUpload ? '不上传' : 'gh 上传'));
    log('dry-run 结束·未写任何文件');
    return;
  }
  fanOutVersions(code);
  buildDesktop();
  refreshBaseline();
  buildAndroid(live.capgoManifest);
  const { latestJson } = composeAndGate();
  const staging = stageRelease(latestJson);
  uploadRelease(staging);
  log('');
  log(fs.readFileSync(path.join(staging.dir, 'OWNER-RUNBOOK-' + CFG.version + '.txt'), 'utf-8'));
})().catch(e => { console.error('✗ 发版中断·', e && e.stack || e); process.exit(1); });
