#!/usr/bin/env node
// smoke-official-bundle-parity.js — 剧本单一真源守卫。
//
// 从 scenarios/*（官方）.json 重建 bundle 到内存串·与在树 web/tm-official-scenario-bundle.js
// 逐字节比对。不等即 FAIL——说明官方剧本源与预烤 bundle 漂移了（改了剧本没重烤·或反之改了
// bundle 没回灌剧本）。桌面端 seeder（tm-official-scenario-seeder.js）落地的就是这份 bundle，
// 漂移会让玩家装到与真源不一致的官方剧本。
//
// 修复：node web/scripts/rebuild-official-scenario-bundle.js 重烤后复跑本 smoke。
// run-smokes.js 按 /^smoke-.*\.js$/ 自动发现本文件（PASS=exit 0 且无行首 FAIL）。
'use strict';

const fs = require('fs');

let A = 0;
function assert(c, m) { if (!c) { console.log('FAIL: ' + m); process.exit(1); } A++; }

// 取在树重建器（require 不触发写盘·build 仅在直接执行时跑）
const builder = require('./rebuild-official-scenario-bundle.js');

// 1) 重建器公共契约
assert(typeof builder.serialize === 'function', 'rebuild-official-scenario-bundle 须导出 serialize()');
assert(typeof builder.buildBundleArray === 'function', 'rebuild-official-scenario-bundle 须导出 buildBundleArray()');
assert(Array.isArray(builder.ENTRIES) && builder.ENTRIES.length > 0, 'rebuild 脚本须暴露非空 ENTRIES');

// 2) 从 scenarios/ 源全量重建·数组形状自检
const arr = builder.buildBundleArray();
assert(Array.isArray(arr) && arr.length === builder.ENTRIES.length, '重建数组条目数须等于 ENTRIES (' + builder.ENTRIES.length + ')');
arr.forEach(function (e) {
  assert(e && typeof e.filename === 'string', '条目须含 string filename');
  assert(e.source === '../scenarios/' + e.filename + '.json', e.filename + ' 的 source 须为 ../scenarios/<filename>.json');
  assert(e.data && typeof e.data === 'object' && e.data.id, e.filename + ' 的 data 须为含 id 的剧本对象');
});

// 3) seeder 消费契约：filename 无 .json 后缀·且 data 可克隆存盘（结构化）
arr.forEach(function (e) {
  assert(!/\.json$/i.test(e.filename), 'seeder 按无后缀 filename 匹配·' + e.filename + ' 不得带 .json');
});

// 4) 核心断言：重建串 === 在树 bundle（逐字节）
const rebuilt = builder.serialize(arr);
const current = fs.readFileSync(builder.OUT, 'utf8');

if (rebuilt !== current) {
  const n = Math.min(rebuilt.length, current.length);
  let i = 0; while (i < n && rebuilt.charCodeAt(i) === current.charCodeAt(i)) i++;
  const around = function (s) { return JSON.stringify(s.slice(Math.max(0, i - 40), i + 40)); };
  console.log('FAIL: 在树 tm-official-scenario-bundle.js 与从 scenarios/ 重建结果不一致（剧本单一真源漂移）');
  console.log('  在树长度=' + current.length + ' · 重建长度=' + rebuilt.length + ' · 首个分歧@' + i);
  console.log('  在树 : ' + around(current));
  console.log('  重建 : ' + around(rebuilt));
  console.log('  修复 : node web/scripts/rebuild-official-scenario-bundle.js  然后复跑本 smoke');
  process.exit(1);
}
A++;

// 5) 头部契约（生成文件标记不得丢·否则误当手改文件）
assert(current.indexOf('// GENERATED FILE. Source: ../scenarios official JSON files.\n') === 0, 'bundle 头部须为 GENERATED FILE 标记');
assert(/global\.TMOfficialScenarioBundle\s*=/.test(current), 'bundle 须挂 window.TMOfficialScenarioBundle');

console.log('✓ smoke-official-bundle-parity PASS — ' + A + ' assertions · bundle ' + current.length + ' 字节 · ' + arr.length + ' 官方剧本逐字节一致 (' + arr.map(function (e) { return e.filename; }).join(', ') + ')');
