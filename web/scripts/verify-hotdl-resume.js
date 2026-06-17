// ============================================================
//  verify-hotdl-resume.js — S1 下载内核鲁棒性验证
//  桩掉 electron → require main-impl.js（TIANMING_TEST_EXPORTS）→
//  对着 test-update-server 实测：重试 / Range 断点续传 / 416 自愈 /
//  无视 Range 的服务器降级 / 并发池 / 磁盘预检 / 超限不重试
//  运行：node web/scripts/verify-hotdl-resume.js
// ============================================================
'use strict';

process.env.TIANMING_TEST_EXPORTS = '1';

const Module = require('module');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-verify-dl-'));

// ── electron / electron-updater 桩 ───────────────────────────────────────────
const electronStub = {
  app: {
    getPath: () => path.join(TMP, 'userData'),
    getVersion: () => '1.3.3.5',
    getAppPath: () => ROOT,
    isPackaged: false,
    whenReady: () => new Promise(() => {}), // 永不 resolve·不触发 createWindow
    on: () => {},
    relaunch: () => {},
    exit: () => {},
    quit: () => {}
  },
  BrowserWindow: function () { throw new Error('BrowserWindow 不应在验证中被构造'); },
  ipcMain: { handle: () => {}, on: () => {} },
  dialog: {}, shell: {}, Menu: { setApplicationMenu: () => {} },
  protocol: { registerSchemesAsPrivileged: () => {}, handle: () => {} },
  net: { fetch: (url, init) => fetch(url, init) }
};
electronStub.BrowserWindow.getAllWindows = () => [];
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return electronStub;
  if (request === 'electron-updater') {
    return { autoUpdater: { on: () => {}, setFeedURL: () => {}, checkForUpdates: async () => null, downloadUpdate: async () => [], quitAndInstall: () => {} } };
  }
  return origLoad.apply(this, arguments);
};

const impl = require(path.join(ROOT, 'main-impl.js'));
const T = impl.__test;

const { createTestUpdateServer } = require(path.join(ROOT, 'web', 'scripts', 'test-update-server.js'));

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exitCode = 1; throw new Error('断言失败：' + label); }
}
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

(async function main() {
  assert(T && typeof T.downloadRemoteFile === 'function', '测试出口暴露 downloadRemoteFile');

  // 测试源文件·1MB 随机
  const srvRoot = path.join(TMP, 'srv');
  fs.mkdirSync(path.join(srvRoot, 'hot'), { recursive: true });
  const payload = crypto.randomBytes(1024 * 1024);
  const payloadSha = sha256(payload);
  fs.writeFileSync(path.join(srvRoot, 'hot', 'pkg.zip'), payload);
  const small = Buffer.from('{"v":1}');
  fs.writeFileSync(path.join(srvRoot, 'hot', 'small.json'), small);

  // ── A·普通下载·sha 正确 ──
  {
    const srv = createTestUpdateServer({ root: srvRoot });
    await srv.listen(0);
    const dest = path.join(TMP, 'a.zip');
    const got = await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/pkg.zip', dest, 1e9, null, {});
    assert(got.sha256 === payloadSha, 'A·普通下载 sha 一致');
    assert(got.size === payload.length, 'A·size 一致');
    await srv.close();
  }

  // ── B·中途掐线 → 重试用 Range 续传·最终 sha 一致 ──
  {
    const srv = createTestUpdateServer({ root: srvRoot, dropAfterBytes: 300 * 1024, dropPath: 'pkg.zip', dropTimes: 1 });
    await srv.listen(0);
    const dest = path.join(TMP, 'b.zip');
    const got = await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/pkg.zip', dest, 1e9, null,
      { retries: 3, resume: true, retryBaseDelayMs: 50 });
    assert(got.sha256 === payloadSha, 'B·掐线后续传完成·sha 一致');
    const ranged = srv.requests.filter(r => r.headers.range && /^bytes=\d+-$/.test(r.headers.range));
    assert(ranged.length >= 1, 'B·重试请求带 Range 头（真断点续传非重下）');
    const startByte = parseInt(String(ranged[0].headers.range).match(/bytes=(\d+)-/)[1], 10);
    assert(startByte > 0 && startByte <= 300 * 1024, 'B·Range 起点 = 已收字节数（' + startByte + '）');
    assert(!fs.existsSync(dest + '.part'), 'B·完成后 .part 已清');
    await srv.close();
  }

  // ── C·服务器无视 Range（回 200）·有半截 .part 也能从头重下成功 ──
  {
    const srv = createTestUpdateServer({ root: srvRoot, noRange: true });
    await srv.listen(0);
    const dest = path.join(TMP, 'c.zip');
    fs.writeFileSync(dest + '.part', payload.subarray(0, 100 * 1024)); // 预置半截
    const got = await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/pkg.zip', dest, 1e9, null,
      { retries: 0, resume: true });
    assert(got.sha256 === payloadSha, 'C·200 无视 Range → truncate 重下·sha 一致');
    await srv.close();
  }

  // ── D·前 2 次 500 + 重试 3 → 第 3 次成功 ──
  {
    const srv = createTestUpdateServer({ root: srvRoot, failFirst: 2 });
    await srv.listen(0);
    const dest = path.join(TMP, 'd.json');
    const got = await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/small.json', dest, 1e9, null,
      { retries: 3, retryBaseDelayMs: 30 });
    assert(got.sha256 === sha256(small), 'D·两次 500 后重试成功');
    assert(srv.requests.length === 3, 'D·共 3 次请求（2 败 1 成）');
    await srv.close();
  }

  // ── E·.part 比远端还大 → 416 → 删 .part 重下成功 ──
  {
    const srv = createTestUpdateServer({ root: srvRoot });
    await srv.listen(0);
    const dest = path.join(TMP, 'e.zip');
    fs.writeFileSync(dest + '.part', Buffer.concat([payload, Buffer.from('junk')])); // 比源大
    const got = await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/pkg.zip', dest, 1e9, null,
      { retries: 2, resume: true, retryBaseDelayMs: 30 });
    assert(got.sha256 === payloadSha, 'E·416 自愈（删坏 .part 重下）·sha 一致');
    await srv.close();
  }

  // ── F·超过 maxBytes → _noRetry·只打一次请求 ──
  {
    const srv = createTestUpdateServer({ root: srvRoot });
    await srv.listen(0);
    const dest = path.join(TMP, 'f.zip');
    let threw = null;
    try {
      await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/pkg.zip', dest, 1000, null,
        { retries: 3, retryBaseDelayMs: 30 });
    } catch (e) { threw = e; }
    assert(threw && /大小上限/.test(threw.message), 'F·超限抛错');
    assert(srv.requests.length === 1, 'F·_noRetry 生效·没有重试（请求数=1）');
    await srv.close();
  }

  // ── G·corrupt 注入 → 返回的 sha 与期望不符（调用方校验层能逮住） ──
  {
    const srv = createTestUpdateServer({ root: srvRoot, corrupt: 'small.json' });
    await srv.listen(0);
    const dest = path.join(TMP, 'g.json');
    const got = await T.downloadRemoteFile('http://127.0.0.1:' + srv.port + '/hot/small.json', dest, 1e9, null, {});
    assert(got.sha256 !== sha256(small), 'G·篡改响应 → sha 不一致（校验可逮）');
    await srv.close();
  }

  // ── H·runWorkerPool·并发上限 + 全完成 + 失败中止 ──
  {
    let inFlight = 0, peak = 0, doneCount = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    await T.runWorkerPool(items, 4, async () => {
      inFlight++; peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, 15));
      inFlight--; doneCount++;
    });
    assert(peak <= 4 && peak >= 2, 'H·并发峰值 ≤4（实测 ' + peak + '）');
    assert(doneCount === 20, 'H·20 项全部完成');

    let processed = 0, threw = null;
    try {
      await T.runWorkerPool(items, 4, async (it) => {
        processed++;
        if (it === 5) throw new Error('boom');
        await new Promise(r => setTimeout(r, 10));
      });
    } catch (e) { threw = e; }
    assert(threw && threw.message === 'boom', 'H·失败抛第一个错');
    assert(processed < 20, 'H·失败后停止取新任务（processed=' + processed + '）');
  }

  // ── I·磁盘预检 ──
  {
    const ok = await T.checkDiskSpace(TMP, 1024);
    assert(ok.ok === true, 'I·小额需求 ok=true（skipped=' + !!ok.skipped + '）');
    if (!ok.skipped) {
      const big = await T.checkDiskSpace(TMP, 1e15);
      assert(big.ok === false, 'I·1PB 需求 ok=false');
      let threw = null;
      try { await T.ensureDiskSpace(TMP, 1e15, '测试'); } catch (e) { threw = e; }
      assert(threw && threw._noRetry === true && /磁盘空间不足/.test(threw.message), 'I·ensureDiskSpace 抛 _noRetry 友好错误');
    }
  }

  // ── J·readHotUpdateFeed 解析 flags ──
  {
    const srvRoot2 = path.join(TMP, 'srv2');
    fs.mkdirSync(srvRoot2, { recursive: true });
    fs.writeFileSync(path.join(srvRoot2, 'hot-latest.json'), JSON.stringify({
      type: 'tianming-hot-update-feed', version: '9.9.9.9', packageUrl: 'pkg.zip',
      sha256: 'ab', size: 1, notes: 'n', flags: { forceFullZip: true, maxConcurrency: 2 }
    }));
    const srv = createTestUpdateServer({ root: srvRoot2 });
    await srv.listen(0);
    const info = await T.readHotUpdateFeed({ feedUrl: 'http://127.0.0.1:' + srv.port + '/hot-latest.json' });
    assert(info.flags && info.flags.forceFullZip === true && info.flags.maxConcurrency === 2, 'J·feed.flags 透传');
    const noFlags = JSON.parse(JSON.stringify(info.feed)); delete noFlags.flags;
    fs.writeFileSync(path.join(srvRoot2, 'hot-latest.json'), JSON.stringify(noFlags));
    const info2 = await T.readHotUpdateFeed({ feedUrl: 'http://127.0.0.1:' + srv.port + '/hot-latest.json' });
    assert(info2.flags && Object.keys(info2.flags).length === 0, 'J·无 flags 字段 → 空对象（旧 feed 兼容）');
    await srv.close();
  }

  console.log('PASS assertions=' + assertions);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
})().catch(e => {
  console.error('VERIFY FAILED·', e && e.stack || e);
  process.exit(1);
});
