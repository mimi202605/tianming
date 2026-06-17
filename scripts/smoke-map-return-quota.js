// smoke-map-return-quota.js
// 验证地图编辑器「返回剧本」写回不再爆 localStorage 配额：大地图落 IndexedDB + 小信号。
// 真加载 web/map-editor-juben-handoff.js（vm + 假 window/localStorage/indexedDB），调真 returnToJuben，
// 再用与御案 getMapReturnBody 同样的读法（IDB 记录 .body）确认能读回原图。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

// ── 假 localStorage（带 ~5MB 配额，超出抛 QuotaExceededError，仿真浏览器）──
function makeLocalStorage(quotaBytes) {
  const data = {};
  let used = 0;
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) {
      v = String(v);
      const prev = data[k] ? data[k].length : 0;
      const next = used - prev + v.length;
      if (next > quotaBytes) { const e = new Error("Setting the value of '" + k + "' exceeded the quota."); e.name = 'QuotaExceededError'; throw e; }
      data[k] = v; used = next;
    },
    removeItem(k) { if (data[k] != null) { used -= data[k].length; delete data[k]; } },
    _dump: data
  };
}

// ── 假 IndexedDB（内存版，仿 keyPath/onupgradeneeded/oncomplete/onsuccess 异步语义）──
function makeFakeIndexedDB() {
  const dbs = {}; // name -> { created:bool, stores:{ name -> {keyPath, data:{}} } }
  function open(name) {
    const req = { onupgradeneeded: null, onsuccess: null, onerror: null };
    setTimeout(() => {
      const firstTime = !dbs[name];
      if (firstTime) dbs[name] = { stores: {} };
      const db = makeDb(name);
      if (firstTime && req.onupgradeneeded) req.onupgradeneeded({ target: { result: db } });
      if (req.onsuccess) req.onsuccess({ target: { result: db } });
    }, 0);
    return req;
  }
  function makeDb(name) {
    return {
      objectStoreNames: { contains: (s) => !!dbs[name].stores[s] },
      createObjectStore: (s, opts) => { dbs[name].stores[s] = { keyPath: opts.keyPath, data: {} }; return {}; },
      transaction(s) {
        const store = dbs[name].stores[s];
        const tx = { oncomplete: null, onerror: null,
          objectStore: () => ({
            put(rec) { store.data[rec[store.keyPath]] = rec; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); },
            get(key) { const r = { onsuccess: null, onerror: null, result: undefined }; setTimeout(() => { r.result = store.data[key]; r.onsuccess && r.onsuccess(); }, 0); return r; },
            delete(key) { delete store.data[key]; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); }
          })
        };
        return tx;
      },
      close() {}
    };
  }
  return { open, _dbs: dbs };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  console.log('smoke-map-return-quota');

  // 造一张 ~7MB 的大地图（超过 5MB 配额，复现玩家的爆配额）
  const bigMap = { divisions: [], _filler: 'x'.repeat(7 * 1024 * 1024) };
  for (let i = 0; i < 30; i++) bigMap.divisions.push({ id: 'd' + i, name: '地块' + i });

  const localStorage = makeLocalStorage(5 * 1024 * 1024);
  const indexedDB = makeFakeIndexedDB();

  // ── 先证伪：旧写法（整图直写 localStorage）确实爆配额 ──
  let oldThrew = false;
  try { localStorage.setItem('tm.scenarioEditorReset.mapReturn.v1', JSON.stringify({ native: bigMap })); }
  catch (e) { oldThrew = (e.name === 'QuotaExceededError'); }
  ok(oldThrew, '旧写法（整图直写 localStorage）确实爆 QuotaExceededError（复现 bug）');

  // ── vm 载入真 map-editor-juben-handoff.js ──
  const src = fs.readFileSync(path.join(__dirname, '..', 'web', 'map-editor-juben-handoff.js'), 'utf8');
  let alerted = null;
  const ctx = {
    indexedDB, localStorage, JSON, Date, Math, console,
    setTimeout, clearInterval, setInterval,
    alert: (m) => { alerted = m; },
    location: { search: '' },               // 非 ?tmFromJuben → 载入时 start() 早退，不触发地图加载
    document: { getElementById: () => null, createElement: () => ({ style: {}, addEventListener() {} }), body: { appendChild() {} }, addEventListener() {}, readyState: 'complete' },
    history: { back() {} },
    closed: false,
    close() { ctx.closed = true; }
  };
  ctx.window = ctx;
  ctx.TM = { MapEditor: { EDITOR: { canvas: {}, map: bigMap }, loadMap() {}, rastermaps: { commitAllDirty() {} } } };
  vm.runInNewContext(src, ctx, { filename: 'map-editor-juben-handoff.js' });

  ok(ctx.JubenMapHandoff && typeof ctx.JubenMapHandoff.returnToJuben === 'function', 'JubenMapHandoff.returnToJuben 已暴露');

  // ── 调真 returnToJuben（大地图）──
  ctx.JubenMapHandoff.returnToJuben();
  await wait(60);  // 等 IDB put + 信号

  const RKEY = 'tm.scenarioEditorReset.mapReturn.v1';
  const sigRaw = localStorage.getItem(RKEY);
  ok(sigRaw != null, 'localStorage 写了 RETURN_KEY 信号');
  ok(alerted == null, '没有弹出「写回失败」alert（未爆配额）');
  ok(sigRaw != null && sigRaw.length < 500, '信号是小 JSON（' + (sigRaw ? sigRaw.length : 0) + ' 字节·非整图）');
  let sig = null; try { sig = JSON.parse(sigRaw); } catch (e) {}
  ok(sig && sig.idb === true, '信号标记 idb:true（指示大地图在 IndexedDB）');

  // ── 模拟御案 getMapReturnBody：读 IDB 记录 .body（与 scenario-editor-reset-app.js 同约定）──
  function getMapReturnBody() {
    return new Promise((resolve) => {
      const req = indexedDB.open('tm-scenario-editor-reset-projects');
      req.onsuccess = (ev) => {
        const db = ev.target.result;
        const tx = db.transaction('projectBodies');
        const g = tx.objectStore('projectBodies').get('__mapReturn__');
        g.onsuccess = () => { db.close(); resolve(g.result ? g.result.body : null); };
        g.onerror = () => { db.close(); resolve(null); };
      };
      req.onerror = () => resolve(null);
    });
  }
  const body = await getMapReturnBody();
  ok(body && body.native, '御案能从 IDB 读回 body.native');
  ok(body && body.native && body.native.divisions && body.native.divisions.length === 30, '读回的地图 divisions 完整（30 地块）');
  ok(body && body.native && body.native._filler && body.native._filler.length === 7 * 1024 * 1024, '读回的 7MB 大地图内容无损');

  // ── 御案读完应能删 IDB（清理）──
  ok(JSON.stringify(indexedDB._dbs).indexOf('__mapReturn__') >= 0, 'IDB 当前确有 __mapReturn__ 记录（待御案 ingest 后清）');

  console.log('\n结果: ' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
