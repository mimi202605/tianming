#!/usr/bin/env node
// 解剖天命存档体积：按 key 统计、找重复大块、普查无界数组/大字符串。
// 用法: node --max-old-space-size=6144 scripts/analyze-save-size.js [存档路径]
'use strict';
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const file = process.argv[2] || (os.homedir() + '\\AppData\\Roaming\\tianming\\saves\\__autosave__.json');
const raw = fs.readFileSync(file, 'utf8');
console.log('== file ==', file);
console.log('bytes(utf16 len):', raw.length, '≈', (raw.length / 1048576).toFixed(1) + 'MB');
const data = JSON.parse(raw);

function strSize(v) {
  try { const s = JSON.stringify(v); return s ? s.length : 0; } catch (e) { return -1; }
}

// ---- 1. 顶层 key 体积 ----
console.log('\n== 顶层 key 体积 (top 40) ==');
const tops = Object.keys(data).map(k => ({ k, n: strSize(data[k]) })).sort((a, b) => b.n - a.n);
tops.slice(0, 40).forEach(t => console.log(String(t.n).padStart(10), (t.n / 1048576).toFixed(2).padStart(8) + 'MB', t.k));

// ---- 2. 大节点哈希查重 (>=512KB 的子树) ----
const MIN_DUP = 512 * 1024;
const groups = new Map(); // hash -> [{path,size}]
function walkDup(node, p, depth) {
  if (!node || typeof node !== 'object' || depth > 7) return;
  const s = strSize(node);
  if (s < MIN_DUP) return;
  const h = crypto.createHash('md5').update(String(s) + ':').update(JSON.stringify(node)).digest('hex');
  if (!groups.has(h)) groups.set(h, []);
  groups.get(h).push({ path: p, size: s });
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) walkDup(node[i], p + '[' + i + ']', depth + 1);
  } else {
    for (const k of Object.keys(node)) walkDup(node[k], p + '.' + k, depth + 1);
  }
}
walkDup(data, '$', 0);
console.log('\n== 重复大块 (同内容出现>=2处·>=512KB) ==');
let dupWaste = 0;
[...groups.values()].filter(g => g.length > 1).sort((a, b) => b[0].size * (b.length - 1) - a[0].size * (a.length - 1)).forEach(g => {
  // 只报「不互为祖先」的真重复
  const paths = g.map(x => x.path);
  const distinct = paths.filter((p, i) => !paths.some((q, j) => j !== i && p.startsWith(q + '.')));
  if (distinct.length > 1) {
    dupWaste += g[0].size * (g.length - 1);
    console.log((g[0].size / 1048576).toFixed(2) + 'MB ×' + g.length, '→', paths.join('  |  '));
  }
});
console.log('重复浪费合计 ≈', (dupWaste / 1048576).toFixed(1) + 'MB');

// ---- 3. 数组长度普查 (len>=300) + 大字符串 (>=256KB) ----
const bigArrays = [], bigStrings = [];
function walkAll(node, p, depth) {
  if (depth > 9 || node == null) return;
  if (typeof node === 'string') {
    if (node.length >= 256 * 1024) bigStrings.push({ p, n: node.length });
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    if (node.length >= 300) bigArrays.push({ p, len: node.length, size: strSize(node) });
    for (let i = 0; i < node.length; i++) walkAll(node[i], p + '[' + i + ']', depth + 1);
  } else {
    for (const k of Object.keys(node)) walkAll(node[k], p + '.' + k, depth + 1);
  }
}
walkAll(data, '$', 0);
console.log('\n== 数组 len>=300 (按体积 top 50) ==');
bigArrays.sort((a, b) => b.size - a.size).slice(0, 50).forEach(a => console.log((a.size / 1048576).toFixed(2).padStart(8) + 'MB', ('len=' + a.len).padStart(10), a.p));
console.log('\n== 字符串 >=256KB (top 30) ==');
bigStrings.sort((a, b) => b.n - a.n).slice(0, 30).forEach(s => console.log((s.n / 1048576).toFixed(2).padStart(8) + 'MB', s.p));

// ---- 4. 已知嫌疑数组长度点名 ----
console.log('\n== 已知嫌疑点名 ==');
const spots = ['_turnReport', '_convArchive', 'jishiRecords', 'qijuHistory', 'shijiHistory', '_historyIndex', '_memTables', '_endturnTimingLedger', 'turnAiResults', '_aiMemory', 'eventLog', 'eb'];
for (const k of spots) {
  const v = data[k];
  if (v == null) { console.log(k, ': (无)'); continue; }
  if (Array.isArray(v)) console.log(k, ': len=' + v.length, (strSize(v) / 1048576).toFixed(2) + 'MB');
  else if (typeof v === 'object') console.log(k, ': keys=' + Object.keys(v).length, (strSize(v) / 1048576).toFixed(2) + 'MB');
  else console.log(k, ':', typeof v);
}
console.log('\ndone');
