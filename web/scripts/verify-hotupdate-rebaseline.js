// ============================================================
//  verify-hotupdate-rebaseline.js — S11 自基线重建验证
//  2026-07-07·「任意状态增量同步」：老安装无本地 manifest / 本地 manifest 失真 /
//  文件缺失损坏 → 不再掉全 zip·对本地树现算 sha 只补差量。
//  覆盖：A 老安装无 manifest·B manifest 说谎(文件损坏)·C manifest 正确但文件被删·
//        D feed flags.disableRebaseline kill-switch·E options.skipRebaseline·
//        F 零变化版本(0 下载)·G 安装包内 web/ 兜底基线·
//        H zip 整包多源镜像（主源失败换 packageUrlMirrors·2026-07-07 下载稳定）
//  运行：node web/scripts/verify-hotupdate-rebaseline.js
// ============================================================
'use strict';

process.env.TIANMING_TEST_EXPORTS = '1';

const Module = require('module');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-verify-rb-'));

const electronStub = {
  app: {
    getPath: () => path.join(TMP, 'userData'),
    getVersion: () => '1.3.3.5',
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
const { createTestUpdateServer } = require(path.join(ROOT, 'web', 'scripts', 'test-update-server.js'));

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exit(1); }
}
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// ── 场景搭建工具 ──────────────────────────────────────────────
let scenarioSeq = 0;

// 服务器树：feed + manifests/<v>.json + files/<sha2>/<rest>/<basename>（sha 仓只放 storeFiles）
function makeServerTree(version, manifestFiles, storeFiles, feedExtra) {
  const srvRoot = path.join(TMP, 'srv-' + (++scenarioSeq));
  fs.mkdirSync(path.join(srvRoot, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(srvRoot, 'manifests', version + '.json'), JSON.stringify({
    type: 'tianming-hot-update',
    version,
    entry: 'index.html',
    files: manifestFiles.map(f => ({ path: f.path, sha256: sha256(f.content), size: f.content.length }))
  }));
  (storeFiles || []).forEach(f => {
    const sha = sha256(f.content);
    const dir = path.join(srvRoot, 'files', sha.slice(0, 2), sha.slice(2));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, path.basename(f.path)), f.content);
  });
  fs.writeFileSync(path.join(srvRoot, 'hot-latest.json'), JSON.stringify(Object.assign({
    type: 'tianming-hot-update-feed',
    version,
    packageUrl: 'tianming-hot-' + version + '.zip', // 不存在·若误走 zip 兜底必 404 抛错=测试信号
    sha256: '', size: 1000, notes: 'rb-verify',
    manifestUrl: 'manifests/' + version + '.json',
    filesBaseUrl: 'files/'
  }, feedExtra || {})));
  return srvRoot;
}

// 本地旧安装目录（HOT_UPDATE_DIR 之外·躲开 reset 清理）
function makeCurrentDir(files, localManifestFiles) {
  const dir = path.join(TMP, 'oldhot-' + scenarioSeq);
  files.forEach(f => {
    const p = path.join(dir, f.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, f.content);
  });
  if (localManifestFiles) {
    fs.writeFileSync(path.join(dir, '.hot-update-manifest.json'), JSON.stringify({
      type: 'tianming-hot-update', version: '1.5.0.0',
      files: localManifestFiles.map(f => ({ path: f.path, sha256: f.sha256, size: f.size }))
    }));
  }
  return dir;
}

function resetLocalState(currentDir) {
  try { fs.rmSync(T.paths.HOT_UPDATE_DIR, { recursive: true, force: true }); } catch (_) {}
  T.writeHotUpdateState({
    enabled: true, currentVersion: '1.5.0.0', currentDir,
    previousVersion: '', previousDir: '', installedAt: new Date().toISOString(), source: {}
  });
}

async function withServer(srvRoot, fn) {
  const srv = createTestUpdateServer({ root: srvRoot });
  await srv.listen(0);
  try { return await fn(srv, 'http://127.0.0.1:' + srv.port + '/hot-latest.json'); }
  finally { await srv.close(); }
}
const zipRequested = srv => srv.requests.some(r => r.path.endsWith('.zip'));
const filesRequested = srv => srv.requests.filter(r => r.path.startsWith('/files/')).length;
function readInstalled(version, rel) {
  return fs.readFileSync(path.join(T.paths.HOT_UPDATE_VERSIONS_DIR, version, rel), 'utf-8');
}

(async function main() {
  assert(typeof T.installHotUpdate_rebaseline === 'function', '测试出口暴露 installHotUpdate_rebaseline');

  const HTML = Buffer.from('<!doctype html><meta name="tm-version" content="x"><body>rb</body>');
  const OLD_A = Buffer.from('console.log("old a");');
  const NEW_A = Buffer.from('console.log("new a·rebaseline");');
  const B_JSON = Buffer.from('{"b":1}');

  // ── A·老安装无本地 manifest → 自基线重建·只下变更文件·不碰 zip ──
  {
    const V = '9.9.1.1';
    const srvRoot = makeServerTree(V,
      [{ path: 'index.html', content: HTML }, { path: 'a.js', content: NEW_A }, { path: 'data/b.json', content: B_JSON }],
      [{ path: 'a.js', content: NEW_A }]);
    const cur = makeCurrentDir([
      { path: 'index.html', content: HTML }, { path: 'a.js', content: OLD_A }, { path: 'data/b.json', content: B_JSON }
    ], null); // 无 .hot-update-manifest.json = 老安装
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      const res = await T.installHotUpdateFromFeed({ feedUrl: FEED });
      assert(res.success === true, 'A·老安装无 manifest·安装成功');
      assert(res.mode === 'rebaseline', 'A·走的是自基线重建 (mode=rebaseline)');
      assert(!zipRequested(srv), 'A·全程未请求 zip 全包');
      assert(filesRequested(srv) === 1, 'A·只下载了 1 个变更文件');
      assert(readInstalled(V, 'a.js') === NEW_A.toString(), 'A·变更文件内容正确落位');
      assert(readInstalled(V, 'data/b.json') === B_JSON.toString(), 'A·未变文件本地复用落位');
      const st = T.getHotUpdateState();
      assert(st.source && st.source.installedFrom === 'rebaseline-hot-update', 'A·state.source 记账 rebaseline');
      assert(st.source.fetchedFiles === 1 && st.source.reusedFiles === 2, 'A·记账 fetched=1 reused=2');
    });
  }

  // ── B·本地 manifest 说谎（文件已损坏）→ manifest 增量 validate 失败 → 自动落自基线重建 ──
  {
    const V = '9.9.2.1';
    const newASha = sha256(NEW_A);
    const srvRoot = makeServerTree(V,
      [{ path: 'index.html', content: HTML }, { path: 'a.js', content: NEW_A }],
      [{ path: 'a.js', content: NEW_A }]);
    // 本地 manifest 谎称 a.js 已是新 sha·磁盘上实际是损坏内容 → manifest 增量复用它·validate 终检必炸
    const cur = makeCurrentDir(
      [{ path: 'index.html', content: HTML }, { path: 'a.js', content: Buffer.from('CORRUPTED') }],
      [{ path: 'index.html', sha256: sha256(HTML), size: HTML.length }, { path: 'a.js', sha256: newASha, size: NEW_A.length }]);
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      const res = await T.installHotUpdateFromFeed({ feedUrl: FEED });
      assert(res.success === true && res.mode === 'rebaseline', 'B·manifest 说谎 → 自动转自基线重建成功');
      assert(!zipRequested(srv), 'B·未掉 800MB 全 zip');
      assert(readInstalled(V, 'a.js') === NEW_A.toString(), 'B·损坏文件被正确替换');
    });
  }

  // ── C·本地 manifest 正确但文件被删 → manifest 增量 local source missing → 自基线重建补齐 ──
  {
    const V = '9.9.3.1';
    const srvRoot = makeServerTree(V,
      [{ path: 'index.html', content: HTML }, { path: 'a.js', content: NEW_A }],
      [{ path: 'a.js', content: NEW_A }]);
    // manifest 说 a.js 已是新 sha（本应复用）·但文件被玩家/杀软删了
    const cur = makeCurrentDir(
      [{ path: 'index.html', content: HTML }],
      [{ path: 'index.html', sha256: sha256(HTML), size: HTML.length }, { path: 'a.js', sha256: sha256(NEW_A), size: NEW_A.length }]);
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      const res = await T.installHotUpdateFromFeed({ feedUrl: FEED });
      assert(res.success === true && res.mode === 'rebaseline', 'C·文件缺失 → 自基线重建成功');
      assert(readInstalled(V, 'a.js') === NEW_A.toString(), 'C·缺失文件从 sha 仓补齐');
      assert(!zipRequested(srv), 'C·未掉全 zip');
    });
  }

  // ── D·feed flags.disableRebaseline → kill-switch 生效·直接走 zip 兜底 ──
  {
    const V = '9.9.4.1';
    const srvRoot = makeServerTree(V,
      [{ path: 'index.html', content: HTML }], [], { flags: { disableRebaseline: true } });
    const cur = makeCurrentDir([{ path: 'index.html', content: HTML }], null);
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      let threw = null;
      try { await T.installHotUpdateFromFeed({ feedUrl: FEED }); } catch (e) { threw = e; }
      assert(!!threw, 'D·kill-switch 下走 zip 兜底（zip 404 抛错=证明没走 rebaseline）');
      assert(zipRequested(srv), 'D·确实请求了 zip');
      assert(!srv.requests.some(r => r.path.startsWith('/manifests/')), 'D·rebaseline 被跳过（未拉 manifest）');
    });
  }

  // ── E·options.skipRebaseline → 调用方开关同样生效 ──
  {
    const V = '9.9.5.1';
    const srvRoot = makeServerTree(V, [{ path: 'index.html', content: HTML }], []);
    const cur = makeCurrentDir([{ path: 'index.html', content: HTML }], null);
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      let threw = null;
      try { await T.installHotUpdateFromFeed({ feedUrl: FEED, skipRebaseline: true }); } catch (e) { threw = e; }
      assert(!!threw && zipRequested(srv), 'E·options.skipRebaseline → 走 zip 兜底');
    });
  }

  // ── F·零变化版本（纯版本号 bump）→ 0 下载·全复用 ──
  {
    const V = '9.9.6.1';
    const srvRoot = makeServerTree(V,
      [{ path: 'index.html', content: HTML }, { path: 'a.js', content: NEW_A }], []); // sha 仓空·若要下载必 404
    const cur = makeCurrentDir([{ path: 'index.html', content: HTML }, { path: 'a.js', content: NEW_A }], null);
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      const res = await T.installHotUpdateFromFeed({ feedUrl: FEED });
      assert(res.success === true && res.mode === 'rebaseline', 'F·零变化版本安装成功');
      assert(filesRequested(srv) === 0, 'F·0 个文件下载·全部本地复用');
      const st = T.getHotUpdateState();
      assert(st.source.fetchedFiles === 0 && st.source.reusedFiles === 2, 'F·记账 fetched=0');
    });
  }

  // ── G·currentDir 缺文件·安装包内 web/ 作第二基线兜底 ──
  {
    const V = '9.9.7.1';
    const realFile = path.join(ROOT, 'web', 'version.json'); // 真仓文件·运行时取真 sha/size
    const realBuf = fs.readFileSync(realFile);
    const srvRoot = makeServerTree(V,
      [{ path: 'index.html', content: HTML }, { path: 'version.json', content: realBuf }], []);
    const cur = makeCurrentDir([{ path: 'index.html', content: HTML }], null); // 本地无 version.json
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      const res = await T.installHotUpdateFromFeed({ feedUrl: FEED });
      assert(res.success === true && res.mode === 'rebaseline', 'G·bundled web/ 兜底基线安装成功');
      assert(filesRequested(srv) === 0, 'G·version.json 从安装包内 web/ 复用·零下载');
      assert(readInstalled(V, 'version.json') === realBuf.toString(), 'G·兜底基线文件内容正确');
    });
  }

  // ── H·zip 整包多源镜像：主源 404 → 自动换 packageUrlMirrors 成功 ──
  {
    const V = '9.9.8.1';
    const AdmZip = require(path.join(ROOT, 'node_modules', 'adm-zip'));
    const files = [{ path: 'index.html', content: HTML }, { path: 'a.js', content: NEW_A }];
    const zip = new AdmZip();
    files.forEach(f => zip.addFile(f.path, f.content));
    zip.addFile('manifest.json', Buffer.from(JSON.stringify({
      type: 'tianming-hot-update', version: V, entry: 'index.html',
      files: files.map(f => ({ path: f.path, sha256: sha256(f.content), size: f.content.length }))
    })));
    const zipBuf = zip.toBuffer();
    const srvRoot = makeServerTree(V, files, [], {
      packageUrl: 'missing-' + V + '.zip',               // 主源必 404
      packageUrlMirrors: ['real-' + V + '.zip'],         // 备用源有真包
      sha256: sha256(zipBuf), size: zipBuf.length,
      flags: { disableRebaseline: true }                 // 钉死走 zip 路径
    });
    fs.writeFileSync(path.join(srvRoot, 'real-' + V + '.zip'), zipBuf);
    const cur = makeCurrentDir([{ path: 'index.html', content: HTML }], null);
    resetLocalState(cur);
    await withServer(srvRoot, async (srv, FEED) => {
      const res = await T.installHotUpdateFromFeed({ feedUrl: FEED });
      assert(res.success === true, 'H·主源 404 → 镜像源安装成功');
      assert(srv.requests.some(r => r.path === '/missing-' + V + '.zip'), 'H·先试过主源');
      assert(srv.requests.some(r => r.path === '/real-' + V + '.zip'), 'H·后换镜像源');
      assert(readInstalled(V, 'a.js') === NEW_A.toString(), 'H·镜像包内容正确落位');
    });
  }

  console.log('PASS assertions=' + assertions);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  process.exit(0);
})().catch(e => {
  console.error('VERIFY FAILED·', e && e.stack || e);
  process.exit(1);
});
