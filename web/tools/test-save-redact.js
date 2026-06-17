// test-save-redact.js · 存档脱敏辅助函数单测（node 可跑）
// 覆盖：_tmStripAiKeyInPlace / _tmStripAiKeyView 对 key 与 secondary.key 的剥离，
//       View 不改原对象，无 ai 输入不报错，嵌套 secondary 正确处理。
// 直接从 tm-utils.js 提取真实实现来测（不抄副本，避免测试与实现漂移）。
'use strict';
var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'tm-utils.js'), 'utf8');

// 从源文件抽出两个目标函数定义（按函数名锚定，截到该函数闭合的顶层 }），
// 用 Function 构造器把「定义 + return」打包，拿到真实实现（不抄副本，避免测试与实现漂移）。
function extractFn(name) {
  var re = new RegExp('function ' + name + '\\s*\\([^]*?\\n\\}', 'm');
  var m = src.match(re);
  if (!m) throw new Error('未能在 tm-utils.js 中定位函数 ' + name);
  return m[0];
}
function loadFn(name) {
  return new Function(extractFn(name) + '\nreturn ' + name + ';')();
}
var _tmStripAiKeyInPlace = loadFn('_tmStripAiKeyInPlace');
var _tmStripAiKeyView = loadFn('_tmStripAiKeyView');

var failures = 0;
function ok(cond, msg) {
  if (cond) { console.log('  PASS ' + msg); }
  else { console.error('  FAIL ' + msg); failures++; }
}

function makeP() {
  return {
    meta: { v: '1.1.6' },
    conf: { gameTitle: 'tm' },
    ai: {
      key: 'sk-PRIMARY-SECRET',
      url: 'https://api.example.com',
      model: 'gpt-4o',
      temp: 0.8,
      secondary: { key: 'sk-SECONDARY-SECRET', url: 'https://api2.example.com', model: 'gpt-4o-mini' }
    },
    scenarios: [{ id: 's1', name: '剧本一' }]
  };
}

console.log('[1] InPlace 删 key 与 secondary.key（deepClone 出的独立副本）');
(function () {
  var clone = JSON.parse(JSON.stringify(makeP()));
  var ret = _tmStripAiKeyInPlace(clone);
  ok(ret === clone, 'InPlace 返回同一对象引用');
  ok(!('key' in clone.ai), 'InPlace 后 ai.key 不存在');
  ok(!('key' in clone.ai.secondary), 'InPlace 后 ai.secondary.key 不存在');
  ok(clone.ai.url === 'https://api.example.com', 'InPlace 保留 ai.url');
  ok(clone.ai.model === 'gpt-4o', 'InPlace 保留 ai.model');
  ok(clone.ai.secondary.url === 'https://api2.example.com', 'InPlace 保留 secondary.url');
  ok(clone.scenarios.length === 1, 'InPlace 不动其它字段');
})();

console.log('[2] View 删 key 与 secondary.key，且不改原对象');
(function () {
  var P = makeP();
  var v = _tmStripAiKeyView(P);
  // 原对象 key 必须仍在（运行时调 AI 要用）
  ok(P.ai.key === 'sk-PRIMARY-SECRET', 'View 不改原对象 ai.key 仍在');
  ok(P.ai.secondary.key === 'sk-SECONDARY-SECRET', 'View 不改原对象 secondary.key 仍在');
  // 视图里 key 没了
  ok(!('key' in v.ai), 'View 视图 ai.key 不存在');
  ok(!('key' in v.ai.secondary), 'View 视图 secondary.key 不存在');
  ok(v.ai.url === 'https://api.example.com', 'View 视图保留 ai.url');
  ok(v.ai.model === 'gpt-4o', 'View 视图保留 ai.model');
  ok(v.ai.secondary.model === 'gpt-4o-mini', 'View 视图保留 secondary.model');
  ok(v.meta === P.meta, 'View 顶层非 ai 字段为浅拷引用（meta 同引用）');
  ok(v.ai !== P.ai, 'View 的 ai 是新对象（非原 ai 引用）');
  ok(v.ai.secondary !== P.ai.secondary, 'View 的 secondary 是新对象');
  // 序列化后字符串里不含任何 secret
  var json = JSON.stringify(v);
  ok(json.indexOf('SECRET') === -1, 'View 序列化结果不含任何 SECRET 串');
})();

console.log('[3] 无 ai 的对象不报错');
(function () {
  var noAi = { scenarios: [], conf: {} };
  var r1, r2, threw = false;
  try { r1 = _tmStripAiKeyInPlace(noAi); r2 = _tmStripAiKeyView(noAi); }
  catch (e) { threw = true; }
  ok(!threw, '无 ai 字段时两函数都不抛');
  ok(r1 === noAi, 'InPlace 无 ai 时原样返回');
  ok(r2 === noAi, 'View 无 ai 时原样返回原引用');
  // null / undefined 也不应抛
  var threw2 = false;
  try { _tmStripAiKeyInPlace(null); _tmStripAiKeyView(null); _tmStripAiKeyInPlace(undefined); _tmStripAiKeyView(undefined); }
  catch (e) { threw2 = true; }
  ok(!threw2, 'null/undefined 输入不抛');
})();

console.log('[4] ai 无 secondary（只有主 key）正确处理');
(function () {
  var P = { ai: { key: 'sk-ONLY-PRIMARY', url: 'u', model: 'm' } };
  var clone = JSON.parse(JSON.stringify(P));
  _tmStripAiKeyInPlace(clone);
  ok(!('key' in clone.ai), 'InPlace 无 secondary 时仍删主 key');
  ok(!('secondary' in clone.ai), 'InPlace 不凭空造 secondary');
  var v = _tmStripAiKeyView(P);
  ok(!('key' in v.ai), 'View 无 secondary 时仍删主 key');
  ok(P.ai.key === 'sk-ONLY-PRIMARY', 'View 不改原对象（无 secondary 场景）');
  ok(!('secondary' in v.ai), 'View 不凭空造 secondary');
})();

console.log('[5] secondary 非对象（脏数据）不报错');
(function () {
  var P = { ai: { key: 'k', secondary: 'oops-string' } };
  var threw = false, v;
  try {
    var clone = JSON.parse(JSON.stringify(P));
    _tmStripAiKeyInPlace(clone);
    v = _tmStripAiKeyView(P);
  } catch (e) { threw = true; }
  ok(!threw, 'secondary 为字符串时不抛');
  ok(v && !('key' in v.ai), 'View 仍删主 key');
})();

console.log('');
if (failures === 0) {
  console.log('全部通过 ✅');
  process.exit(0);
} else {
  console.error(failures + ' 个断言失败 ❌');
  process.exit(1);
}
