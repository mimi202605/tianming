// ============================================================
//  verify-online-update.js — S6 在线版更新提示验证
//  运行：node web/scripts/verify-online-update.js
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'web', 'tm-online-update.js'), 'utf-8');

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exit(1); }
}
const tick = () => new Promise(r => setImmediate(r));
async function flush() { for (let i = 0; i < 6; i++) await tick(); }

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, _children: [], _handlers: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    getAttribute(k) { return el._attrs ? el._attrs[k] : null; },
    setAttribute(k, v) { (el._attrs = el._attrs || {})[k] = v; },
    addEventListener(evt, fn) { (el._handlers[evt] = el._handlers[evt] || []).push(fn); },
    appendChild(c) { el._children.push(c); c.parentNode = el; return c; },
    removeChild(c) { el._children = el._children.filter(x => x !== c); c.parentNode = null; },
    parentNode: null
  };
  return el;
}

function load(opts) {
  opts = opts || {};
  const fetches = [];
  const timers = [];
  const store = Object.assign({}, opts.localStorage || {});
  const bodyEl = makeEl('body');
  const footSpan = makeEl('span');
  footSpan.id = 'tm-foot-ver';
  footSpan.textContent = '0.0.0.0';
  const metaEl = opts.noMeta ? null : (() => { const m = makeEl('meta'); m.setAttribute('content', opts.localVersion || '1.3.3.5'); return m; })();
  const byId = { 'tm-foot-ver': footSpan };
  const documentStub = {
    readyState: 'complete',
    hidden: false,
    head: makeEl('head'),
    documentElement: makeEl('html'),
    body: bodyEl,
    createElement: t => makeEl(t),
    getElementById: id => (id === 'tm-olu-banner' ? bodyEl._children.find(c => c.id === 'tm-olu-banner') || null : (byId[id] || null)),
    querySelector: sel => (sel === 'meta[name="tm-version"]' ? metaEl : null),
    addEventListener() {}
  };
  const windowStub = {
    location: { pathname: '/tianming/', search: opts.search || '', replaced: '', replace(u) { this.replaced = u; }, reload() { this.replaced = 'RELOAD'; } },
    Capacitor: opts.capacitor ? { isNativePlatform: () => true } : undefined,
    tianming: opts.desktop ? {} : undefined
  };
  const fetchStub = (url) => {
    fetches.push(url);
    const r = opts.remote;
    if (!r) return Promise.resolve({ ok: false, json: () => Promise.reject(new Error('404')) });
    if (r === 'badjson') return Promise.resolve({ ok: true, json: () => Promise.reject(new Error('bad json')) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(r) });
  };
  const localStorageStub = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const setTimeoutStub = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const setIntervalStub = (fn, ms) => { timers.push({ fn, ms, interval: true }); return timers.length; };
  new Function('window', 'document', 'localStorage', 'fetch', 'setTimeout', 'setInterval', SRC)(
    windowStub, documentStub, localStorageStub, fetchStub, setTimeoutStub, setIntervalStub);
  return {
    fetches, timers, store, windowStub, bodyEl, footSpan,
    banner() { return bodyEl._children.find(c => c.id === 'tm-olu-banner') || null; },
    fire(ms) { timers.filter(t => t.ms === ms && !t.fired).forEach(t => { t.fired = true; t.fn(); }); }
  };
}

(async function main() {
  // ── A·web 端·远端相同 → 静默；footer 同步 ──
  {
    const env = load({ localVersion: '1.3.3.5', remote: { version: '1.3.3.5' } });
    assert(env.footSpan.textContent === '1.3.3.5', 'A·footer 从 meta 同步');
    assert(env.timers.some(t => t.ms === 20000), 'A·20s 首查排程');
    assert(env.timers.some(t => t.interval && t.ms === 30 * 60 * 1000), 'A·30min 周期排程');
    env.fire(20000);
    await flush();
    assert(env.fetches.length === 1 && /version\.json\?t=\d+/.test(env.fetches[0]), 'A·拉 version.json 带时间戳防缓存');
    assert(env.banner() === null, 'A·同版本不弹');
  }

  // ── B·远端更高 → 横幅·立即刷新带 ?r= ──
  {
    const env = load({ localVersion: '1.3.3.5', remote: { version: '1.3.4.0' } });
    env.fire(20000);
    await flush();
    const banner = env.banner();
    assert(!!banner, 'B·远端新 → 弹横幅');
    const texts = banner._children[0]._children.map(c => c.textContent).join('');
    assert(texts.indexOf('线上新版已颁') !== -1 && texts.indexOf('1.3.4.0') !== -1, 'B·文案含版本号');
    const go = banner._children.find(c => c.className === 'tm-olu-go');
    go._handlers.click[0]();
    assert(/^\/tianming\/\?r=\d+$/.test(env.windowStub.location.replaced), 'B·立即刷新 → pathname?r=时间戳');
  }

  // ── C·稍后记账·同版本不再弹·更高版本再弹 ──
  {
    const env = load({ localVersion: '1.3.3.5', remote: { version: '1.3.4.0' } });
    env.fire(20000);
    await flush();
    const later = env.banner()._children.find(c => c.className === 'tm-olu-later');
    later._handlers.click[0]();
    assert(env.store['tm.onlineUpdate.dismissedVersion'] === '1.3.4.0', 'C·稍后 → 记账');
    assert(env.banner() === null, 'C·横幅收起');
    const r2 = await env.windowStub.TM_OnlineUpdate.check(false);
    assert(r2 === 'dismissed' && env.banner() === null, 'C·同版本被记账压制');
    const env2 = load({ localVersion: '1.3.3.5', remote: { version: '1.3.5.0' }, localStorage: { 'tm.onlineUpdate.dismissedVersion': '1.3.4.0' } });
    env2.fire(20000);
    await flush();
    assert(!!env2.banner(), 'C·更高版本突破记账再弹');
  }

  // ── D·404 / 烂 JSON / 烂版本号 → 静默 ──
  {
    for (const remote of [null, 'badjson', { version: 'not-a-version' }, { version: '' }]) {
      const env = load({ localVersion: '1.3.3.5', remote });
      env.fire(20000);
      await flush();
      assert(env.banner() === null, 'D·异常远端静默·' + JSON.stringify(remote && remote.version || remote));
    }
  }

  // ── E·自举·本地无 meta + 远端有 → 弹（发版当天还开着的旧会话） ──
  {
    const env = load({ noMeta: true, remote: { version: '1.3.4.0' } });
    env.fire(20000);
    await flush();
    assert(!!env.banner(), 'E·无本地 meta（旧会话）→ 提示刷新');
  }

  // ── F·桌面端 → 零检查·footer 照常同步 ──
  {
    const env = load({ desktop: true, localVersion: '1.3.3.5', remote: { version: '9.9.9.9' } });
    assert(env.footSpan.textContent === '1.3.3.5', 'F·桌面 footer 同步');
    assert(!env.timers.some(t => t.ms === 20000), 'F·桌面不排检查');
    env.timers.forEach(t => { if (!t.fired) { t.fired = true; t.fn && t.fn(); } });
    await flush();
    assert(env.fetches.length === 0, 'F·桌面零 fetch');
  }

  // ── G·安卓端 → 零检查 ──
  {
    const env = load({ capacitor: true, localVersion: '1.3.3.5', remote: { version: '9.9.9.9' } });
    assert(!env.timers.some(t => t.ms === 20000), 'G·安卓不排检查');
  }

  // ── H·测试缝·?tmOluTest=1 → 500ms 首查 ──
  {
    const env = load({ localVersion: '1.3.3.5', remote: { version: '1.3.4.0' }, search: '?tmOluTest=1' });
    assert(env.timers.some(t => t.ms === 500), 'H·测试模式 500ms 首查');
  }

  console.log('PASS assertions=' + assertions);
})().catch(e => {
  console.error('VERIFY FAILED·', e && e.stack || e);
  process.exit(1);
});
