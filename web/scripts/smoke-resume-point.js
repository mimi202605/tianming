// smoke-resume-point.js — Wave4 slice-1 残局包 payload 构造
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
function assert(c, m) { if (!c) { console.error('ASSERT FAIL:', m); process.exit(1); } }

const ctx = { console: console, JSON: JSON, String: String, Buffer: Buffer };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.getTSText = function () { return '天启十一年'; };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-resume-point.js'), 'utf8'), ctx, { filename: 'tm-resume-point.js' });
const R = ctx.TM.ResumePoint;
assert(R && typeof R.buildPayload === 'function', '模块加载·TM.ResumePoint');

const GM = { running: true, turn: 42, sid: 'tianqi7', scenarioName: '天启七年', chars: [{ name: '崇祯' }] };
const P = { ai: { key: 'sk-SECRET-123' }, conf: { apiKey: 'sk-CONF-456' }, scenarios: [] };
const pl = R.buildPayload(GM, P);
assert(pl && pl.meta && pl.save, '① 返回 {meta,save}');
// 载体 type='mod'（服务器类型白名单·scenario 会深校验剧本结构过不了）；残局靠 tags/packageKind 标识。
assert(pl.meta.type === 'mod' && pl.meta.packageKind === 'resume', '② type=mod（载体）+ packageKind=resume（标记）');
assert(pl.save.gameState && pl.save.gameState.GM.turn === 42, '③ 存档嵌入 GM(turn 42)');
assert(pl.save._format === 'tianming-save-v1' && pl.save._resume === true, '④ 存档格式标记');
// ★剥 AI key（残局公开·绝不外泄玩家密钥）
assert(pl.save.gameState.P.ai.key === '' && pl.save.gameState.P.conf.apiKey === '', '⑤ AI key 已剥(不外泄)');
assert(P.ai.key === 'sk-SECRET-123', '⑥ 深拷·不改原 P 的 key');
assert(pl.meta.name.indexOf('天启七年') >= 0 && pl.meta.name.indexOf('天启十一年') >= 0, '⑦ 名含剧本+纪年');
assert(pl.meta.description.indexOf('接演') >= 0, '⑧ 描述含接演引子');
assert(pl.meta.tags.indexOf('残局') >= 0, '⑨ tags 含残局');
assert(pl.meta.sourceScenario === 'tianqi7' && pl.meta.turn === 42, '⑩ 源剧本+回合数');
// ★upload-ready：title（uploadPack 读 title 非 name）+ 显式唯一 ascii id（服务器 ASCII 化标题会撞车）
assert(pl.meta.title === pl.meta.name && pl.meta.version === '1.0.0' && pl.meta.filename === 'resume.json', '⑩b upload-ready(title/version/filename)');
assert(/^resume-tianqi7-t42-/.test(pl.meta.id) && /^[a-zA-Z0-9\-]+$/.test(pl.meta.id), '⑩c id 唯一且 ASCII 安全');
const plS = R.buildPayload(GM, P, { idSuffix: 'abc' });
assert(plS.meta.id === 'resume-tianqi7-t42-abc', '⑩d idSuffix 可注入(测试稳定)');
// canPublish 守卫
assert(R.canPublish(GM) === true, '⑪ canPublish:局中(running+已推回合)可发');
assert(R.canPublish({ running: true, turn: 0 }) === false && R.canPublish({ turn: 5 }) === false && R.canPublish(null) === false, '⑫ canPublish:未推回合/未running/空 不可发');
// opts 覆盖
const pl2 = R.buildPayload(GM, P, { name: '我的残局', description: '来续' });
assert(pl2.meta.name === '我的残局' && pl2.meta.description === '来续', '⑬ opts 覆盖 name/description');

// ═══ publish()：mock OnlineClient 验上传接线（无网络）═══
// ⑭ 未登录 → needLogin，不调 uploadPack
let called = null;
ctx.TM.OnlineClient = { uploadPack: function (m, b) { called = { m: m, b: b }; return Promise.resolve({ success: true, pack: { id: m.id, title: m.title } }); }, isLoggedIn: function () { return false; } };
(async function () {
  const r0 = await R.publish(GM, P);
  assert(r0.needLogin === true && called === null, '⑭ 未登录→needLogin·不上传');

  // ⑮ 已登录 → 调 uploadPack，meta.type=mod + base64 可解回存档 + AI key 已剥
  ctx.TM.OnlineClient.isLoggedIn = function () { return true; };
  const P2 = { ai: { key: 'sk-LEAK' }, conf: { apiKey: 'sk-LEAK2' } };
  const r1 = await R.publish(GM, P2, { idSuffix: 'pubtest' });
  assert(r1.success === true && called && called.m.type === 'mod', '⑮ 已登录→uploadPack(type=mod)');
  const decoded = JSON.parse(Buffer.from(called.b, 'base64').toString('utf8'));
  assert(decoded._format === 'tianming-save-v1' && decoded._resume === true, '⑯ base64 可解回存档格式');
  assert(decoded.gameState.P.ai.key === '' && decoded.gameState.P.conf.apiKey === '', '⑰ 上传体 AI key 已剥');
  assert(P2.ai.key === 'sk-LEAK', '⑱ 原 P 未被改');

  // ⑲ canPublish 不过（turn 0）→ 不上传
  called = null;
  const r2 = await R.publish({ running: true, turn: 0 }, P);
  assert(r2.success === false && called === null, '⑲ 未推回合→不上传');

  // ═══ 接演：applyResume / resume（mock boot + fetch·无网络）═══
  let booted = null;
  const mockBoot = function (wrapper) { booted = wrapper; };
  // ⑳ 格式B 存档 → boot 收到归一化 {gameState:{GM,P}}，返回 success+turn
  const saveB = { gameState: { GM: { turn: 23, sid: 'tianqi7' }, P: { conf: {}, time: { startS: 0, seasons: ['春', '夏', '秋', '冬'] } } }, _format: 'tianming-save-v1', _resume: true };
  const a1 = R.applyResume(saveB, { boot: mockBoot });
  assert(a1.success === true && a1.turn === 23 && a1.sourceScenario === 'tianqi7', '⑳ applyResume 起局(格式B)·返回 turn/源剧本');
  assert(booted && booted.gameState && booted.gameState.GM.turn === 23 && booted.gameState.P, '㉑ boot 收到归一化 {gameState:{GM,P}}');
  // ㉒ 顶层 {GM,P}（格式C）也归一化
  booted = null;
  const a2 = R.applyResume({ GM: { turn: 8 }, P: { time: {} } }, { boot: mockBoot });
  assert(a2.success === true && booted.gameState.GM.turn === 8, '㉒ applyResume 兼容顶层 {GM,P}');
  // ㉒b ★残缺包（缺 P.time·如 E2E 合成包）→ 起局前优雅失败·不碰全局态（防 getSE 读 startS 崩）
  booted = null;
  const aBad = R.applyResume({ gameState: { GM: { turn: 23 }, P: { conf: {} } } }, { boot: mockBoot });
  assert(aBad.success === false && /不完整/.test(aBad.error) && booted === null, '㉒b 残缺包(缺P.time)→优雅失败·不起局');
  // ㉓ 无法识别 → error·不 boot
  booted = null;
  const a3 = R.applyResume({ foo: 1 }, { boot: mockBoot });
  assert(a3.success === false && booted === null, '㉓ 无法识别格式→不起局');
  // ㉔ SaveMigrations 存在则跑（迁移旧档）
  booted = null;
  let migRan = false;
  ctx.SaveMigrations = { run: function (w) { migRan = true; w.gameState.GM._migrated = true; return w; } };
  R.applyResume(saveB, { boot: mockBoot });
  assert(migRan === true && booted.gameState.GM._migrated === true, '㉔ 起局前跑 SaveMigrations 迁移');
  delete ctx.SaveMigrations;
  // ㉕ resume(url)：mock fetch 下载原始存档 JSON → 解析 → 起局
  booted = null;
  const mockFetch = function (url, init) {
    return Promise.resolve({ ok: true, text: function () { return Promise.resolve(JSON.stringify(saveB)); } });
  };
  const a4 = await R.resume('http://x/download?id=resume-x', { fetch: mockFetch, boot: mockBoot });
  assert(a4.success === true && a4.turn === 23 && booted.gameState.GM.turn === 23, '㉕ resume(url) 下载→解析→起局');
  // ㉖ 下载 403（pending 未审）→ error·不起局
  booted = null;
  const a5 = await R.resume('http://x/download?id=pending', { fetch: function () { return Promise.resolve({ ok: false, status: 403 }); }, boot: mockBoot });
  assert(a5.success === false && /403/.test(a5.error) && booted === null, '㉖ 下载 403(未审)→接演失败·不起局');

  console.log('smoke-resume-point OK — 残局包 构造+发布+接演(27 断言)验证通过');
})().catch(function (e) { console.error('ASYNC FAIL:', e && e.message); process.exit(1); });
