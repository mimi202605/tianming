// ============================================================
//  verify-desktop-update-boot.js — S4 桌面自检模块验证
//  桩 window.tianming + TMUpdateCard 记录器 + 可控时钟·全链路事件流仿真
//  运行：node web/scripts/verify-desktop-update-boot.js
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'web', 'tm-desktop-update.js'), 'utf-8');

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exit(1); }
}
const tick = () => new Promise(r => setImmediate(r));
async function flush() { for (let i = 0; i < 6; i++) await tick(); }

function load(opts) {
  opts = opts || {};
  const calls = { card: [], ipc: [] };
  const timers = [];
  let statusCb = null;
  const store = Object.assign({}, opts.localStorage || {});
  const cardRec = new Proxy({}, {
    get(_, name) {
      if (name === '_fmt') return { fmtMB: b => Math.round(b / 1048576) + ' MB' };
      if (name === 'isVisible') return () => false;
      return function () { calls.card.push({ fn: name, args: Array.from(arguments) }); };
    }
  });
  const tianming = {
    hotUpdateStatus() {
      calls.ipc.push('hotUpdateStatus');
      return Promise.resolve({ success: true, status: Object.assign({ isPackaged: true, lastRepair: null, rendererVersion: '1.3.3.5' }, opts.status || {}) });
    },
    checkHotUpdate(url) {
      calls.ipc.push('checkHotUpdate:' + url);
      return Promise.resolve(Object.assign({ success: true, hasUpdate: false, currentVersion: '1.3.3.5' }, opts.check || {}));
    },
    installHotUpdate(url) {
      calls.ipc.push('installHotUpdate:' + url);
      return opts.installResult ? Promise.resolve(opts.installResult) : new Promise(() => {});
    },
    reloadAfterHotUpdate() { calls.ipc.push('reload'); return Promise.resolve({ success: true }); },
    onHotUpdateStatus(cb) { statusCb = cb; },
    checkForUpdate(url) {
      calls.ipc.push('checkForUpdate:' + url);
      return Promise.resolve(Object.assign({ success: true, hasUpdate: false }, opts.installerCheck || {}));
    },
    downloadUpdate() {
      calls.ipc.push('downloadUpdate');
      return Promise.resolve(opts.installerDownload || { success: true });
    },
    installUpdate() { calls.ipc.push('installUpdate'); return Promise.resolve({ success: true }); },
    onUpdateStatus(cb) { updateCb = cb; }
  };
  let updateCb = null;
  const windowStub = {
    tianming,
    TMUpdateCard: cardRec,
    TM_Changelog: { show() { calls.ipc.push('changelogShow'); } },
    performance: { now: () => Date.now() },
    addEventListener() {}
  };
  let modalRounds = opts.modalRounds || 0;
  const documentStub = {
    readyState: 'complete',
    hidden: false,
    getElementById(id) {
      if (id === 'tm-changelog-ov' && modalRounds > 0) { modalRounds--; return {}; }
      return null;
    },
    querySelector() { return null; }
  };
  const localStorageStub = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }
  };
  const setTimeoutStub = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const setIntervalStub = (fn, ms) => { timers.push({ fn, ms, interval: true }); return timers.length; };
  new Function('window', 'document', 'localStorage', 'setTimeout', 'setInterval', SRC)(
    windowStub, documentStub, localStorageStub, setTimeoutStub, setIntervalStub);
  return {
    calls, timers, store, windowStub,
    fire(ms) { timers.filter(t => t.ms === ms && !t.fired).forEach(t => { t.fired = true; t.fn(); }); },
    emit(ev) { if (statusCb) statusCb(ev); },
    emitUpdate(ev) { if (updateCb) updateCb(ev); },
    cardCall(fn) { return calls.card.filter(c => c.fn === fn); }
  };
}

(async function main() {
  // ── A·标准链路·自检→弹卡→点更新→事件流→装完重启 ──
  {
    const env = load({ check: { hasUpdate: true, remoteVersion: '9.9.9.9', size: 50e6, flags: {} } });
    assert(env.timers.some(t => t.ms === 8000), 'A·启动 8s 首查已排程');
    assert(env.timers.some(t => t.interval && t.ms === 6 * 60 * 60 * 1000), 'A·6h 周期复查已排程');
    env.fire(8000);
    await flush();
    assert(env.calls.ipc.indexOf('hotUpdateStatus') !== -1, 'A·先查状态');
    assert(env.calls.ipc.some(c => c.indexOf('checkHotUpdate:') === 0), 'A·后查 feed');
    const shows = env.cardCall('show');
    assert(shows.length === 1 && shows[0].args[0].title === '发现新版本' && shows[0].args[0].version === '9.9.9.9', 'A·弹「发现新版本」卡');
    const acts = env.cardCall('setActions');
    assert(acts.length === 1 && acts[0].args[0].length === 2 && acts[0].args[0][0].label === '立即更新', 'A·按钮=立即更新+查看更新内容');
    acts[0].args[0][1].onClick();
    assert(env.calls.ipc.indexOf('changelogShow') !== -1, 'A·查看更新内容 → 邸报');
    acts[0].args[0][0].onClick();
    await flush();
    assert(env.calls.ipc.some(c => c.indexOf('installHotUpdate:') === 0), 'A·立即更新 → 安装 IPC');
    env.emit({ kind: 'incremental-plan', version: '9.9.9.9', total: 100, fetch: 5, reuse: 95, fetchBytes: 1000 });
    let prog = env.cardCall('progress');
    assert(prog.length >= 1 && prog[prog.length - 1].args[0].label === '0/5 文件', 'A·incremental-plan → 0/5 文件');
    env.emit({ kind: 'incremental-progress', version: '9.9.9.9', done: 2, total: 5, bytesDone: 400, fetchBytes: 1000 });
    prog = env.cardCall('progress');
    const last = prog[prog.length - 1].args[0];
    assert(Math.round(last.percent) === 40 && last.label === '2/5 文件', 'A·incremental-progress → 40%·2/5 文件');
    env.emit({ kind: 'installed', version: '9.9.9.9' });
    const dones = env.cardCall('done');
    assert(dones.length === 1 && dones[0].args[0].actions[0].label === '立即重启生效', 'A·installed → 一键重启卡');
    dones[0].args[0].actions[0].onClick();
    assert(env.calls.ipc.indexOf('reload') !== -1, 'A·重启按钮 → reloadAfterHotUpdate');
  }

  // ── B·dev 模式静默 ──
  {
    const env = load({ status: { isPackaged: false }, check: { hasUpdate: true, remoteVersion: '9.9.9.9' } });
    env.fire(8000);
    await flush();
    assert(!env.calls.ipc.some(c => c.indexOf('checkHotUpdate:') === 0), 'B·dev 不自动查 feed');
    assert(env.cardCall('show').length === 0, 'B·dev 不弹卡');
  }

  // ── C·feed flags.disableAutoCheck kill-switch ──
  {
    const env = load({ check: { hasUpdate: true, remoteVersion: '9.9.9.9', flags: { disableAutoCheck: true } } });
    env.fire(8000);
    await flush();
    assert(env.cardCall('show').length === 0, 'C·disableAutoCheck → 不弹卡');
  }

  // ── D·邸报开着 → 避让后再弹 ──
  {
    const env = load({ modalRounds: 2, check: { hasUpdate: true, remoteVersion: '9.9.9.9', flags: {} } });
    env.fire(8000);
    await flush();
    assert(env.cardCall('show').length === 0, 'D·邸报在 → 先不弹');
    env.fire(1500); // 第一次复查·仍在
    await flush();
    env.fire(1500); // 第二次复查·已关
    await flush();
    assert(env.cardCall('show').length === 1, 'D·邸报关后弹卡');
  }

  // ── E·自愈一次性提示 ──
  {
    const env = load({ status: { lastRepair: { at: '2026-06-11T00:00:00Z', reasons: ['boot-crash-loop'] } } });
    env.fire(8000);
    await flush();
    assert(env.cardCall('toast').some(c => String(c.args[0]).indexOf('自动恢复') !== -1), 'E·自愈 toast 弹出');
    const before = env.cardCall('toast').length;
    await env.windowStub.TMDesktopUpdate.check(false);
    await flush();
    assert(env.cardCall('toast').length === before, 'E·同一修复只提示一次（localStorage 记账）');
  }

  // ── F·手动检查·已是最新 ──
  {
    const env = load({ check: { hasUpdate: false, currentVersion: '1.3.3.5' } });
    await env.windowStub.TMDesktopUpdate.check(true);
    await flush();
    assert(env.cardCall('toast').some(c => c.args[0] === '已是最新版'), 'F·手动检查无更新 → 已是最新版');
  }

  // ── G·检查失败·手动可见/自动静默 ──
  {
    const env = load({ check: { success: false, error: '网络炸了' } });
    env.fire(8000);
    await flush();
    assert(env.cardCall('fail').length === 0, 'G·自动检查失败静默');
    await env.windowStub.TMDesktopUpdate.check(true);
    await flush();
    assert(env.cardCall('fail').length === 1, 'G·手动检查失败可见');
  }

  // ── H·error 事件中断会话 ──
  {
    const env = load({ check: { hasUpdate: true, remoteVersion: '9.9.9.9', flags: {} } });
    env.fire(8000);
    await flush();
    env.cardCall('setActions')[0].args[0][0].onClick();
    await flush();
    env.emit({ kind: 'error', error: 'sha mismatch' });
    assert(env.cardCall('fail').some(c => String(c.args[0]).indexOf('sha mismatch') !== -1), 'H·error 事件 → fail 卡');
  }

  // ── I·needsInstaller → 本体安装包流程 ──
  {
    const env = load({
      check: { hasUpdate: true, remoteVersion: '9.9.9.9', needsInstaller: true, flags: {} },
      installerCheck: { hasUpdate: true, remoteVersion: '2.0.0', size: 443e6 }
    });
    env.fire(8000);
    await flush();
    assert(env.calls.ipc.some(c => c.indexOf('checkForUpdate:') === 0), 'I·needsInstaller → 查本体 feed');
    const shows = env.cardCall('show');
    assert(shows.some(s => s.args[0].title === '发现新版本·需更新本体'), 'I·弹「需更新本体」卡');
    const acts = env.cardCall('setActions');
    assert(acts[0].args[0][0].label === '下载安装包', 'I·主按钮=下载安装包');
    acts[0].args[0][0].onClick();
    assert(env.calls.ipc.indexOf('downloadUpdate') !== -1, 'I·点击 → downloadUpdate IPC');
    // 同步发进度事件·此刻 download promise 未落定·会话仍活
    env.emitUpdate({ kind: 'download-progress', progress: { percent: 50, transferred: 221e6, total: 443e6, bytesPerSecond: 5e6 } });
    const prog = env.cardCall('progress');
    assert(prog.some(p => Math.round(p.args[0].percent) === 50), 'I·安装包下载进度上卡');
    await flush();
    const dones = env.cardCall('done');
    assert(dones.length === 1 && dones[0].args[0].actions[0].label === '安装并重启', 'I·下载完 → 安装并重启');
    dones[0].args[0].actions[0].onClick();
    assert(env.calls.ipc.indexOf('installUpdate') !== -1, 'I·安装按钮 → installUpdate IPC');
  }

  // ── J·needsInstaller 但服务器还没放安装包 → 一版一次 toast ──
  {
    const env = load({
      check: { hasUpdate: true, remoteVersion: '9.9.9.9', needsInstaller: true, flags: {} },
      installerCheck: { hasUpdate: false }
    });
    env.fire(8000);
    await flush();
    assert(env.cardCall('toast').some(c => String(c.args[0]).indexOf('需更新本体') !== -1), 'J·安装包未上架 → toast 提示');
    const before = env.cardCall('toast').length;
    await env.windowStub.TMDesktopUpdate.check(false);
    await flush();
    assert(env.cardCall('toast').length === before, 'J·同版本不再重复提示');
  }

  console.log('PASS assertions=' + assertions);
})().catch(e => {
  console.error('VERIFY FAILED·', e && e.stack || e);
  process.exit(1);
});
