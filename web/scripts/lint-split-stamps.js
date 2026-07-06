#!/usr/bin/env node
// scripts/lint-split-stamps.js — 拆分家族缓存戳一致性守卫（2026-07-06 架构优化轮）
//
// 背景：拆分家族的行为等价性除装载序（lint-split-contracts 守）外，还依赖缓存一致性——
//   旧 ?v= 戳的 origin 命中浏览器/Electron 缓存 + 新 sibling 现取，等于「半旧半新」装载：
//   bucket 成员缺失/别名 undefined 即崩（跨拆通病，2026-07-06 治理刀曾手工 bump 十座 origin）。
//   根治法 = 同一家族在同一入口的所有成员共用同一 ?v= 戳：改任何一片须整族 bump，缓存要么全旧要么全新。
// 守卫：
//   ① 家族戳一致：每座拆分家族（从 lint-split-contracts.js 的契约源解析）在其入口内
//      所有成员 ?v= 戳必须一致（无戳记为 ∅ 也参与比较）。历史分歧族入基线豁免——棘轮，只许减不许增。
//   ② 重复装载：任一入口内同一 src 出现 ≥2 次即红（同名顶层定义静默覆盖）——零基线，见红即修。
// 用法：
//   node scripts/lint-split-stamps.js           # 对比基线
//   node scripts/lint-split-stamps.js --update  # 重写基线（收紧后固化）
// 基线：arch-baselines/split-stamps.json
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'arch-baselines', 'split-stamps.json');
const UPDATE = process.argv.includes('--update');

// —— 从契约守卫源码解析三组契约（家族清单的单一真相源在 lint-split-contracts.js，此处只读不复制）
const contractsSrc = fs.readFileSync(path.join(__dirname, 'lint-split-contracts.js'), 'utf8');
function parseSection(src, startMark, endMark) {
  const s = src.indexOf(startMark);
  if (s === -1) return [];
  const e = endMark ? src.indexOf(endMark, s) : src.length;
  const body = src.slice(s, e === -1 ? src.length : e);
  const fams = [];
  for (const m of body.matchAll(/^\s*\[((?:'[\w.-]+\.js'\s*,?\s*)+)\],?\s*$/gm)) {
    fams.push([...m[1].matchAll(/'([\w.-]+\.js)'/g)].map(x => x[1]));
  }
  return fams;
}
const ENTRY_FAMILIES = {
  'index.html': parseSection(contractsSrc, 'const CONTRACTS', 'const EDITOR_CONTRACTS'),
  'editor.html': parseSection(contractsSrc, 'const EDITOR_CONTRACTS', 'const PREVIEW_CONTRACTS'),
  'preview/scenario-editor-reset-preview.html': parseSection(contractsSrc, 'const PREVIEW_CONTRACTS', 'function loadOrder')
};
// 重复装载检查覆盖面更广（含非契约入口）
const DUP_ENTRIES = ['index.html', 'editor.html', 'map-editor.html', 'preview/scenario-editor-reset-preview.html', '_yan_harness.html'];

// —— 抽取入口内 src → [stamp,...]（保留出现顺序·剥 ../ 前缀·无查询串记 ∅）
function scriptStamps(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const map = new Map(); // bare src -> [stamps]
  const re = /<script[^>]+src="([^"?]+)(?:\?v=([^"&]*))?[^"]*"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const bare = m[1].replace(/^(\.\.\/)+/, '');
    if (!map.has(bare)) map.set(bare, []);
    map.get(bare).push(m[2] || '∅');
  }
  return map;
}

let failed = 0;
const mismatches = [];

// ① 家族戳一致
for (const [entry, families] of Object.entries(ENTRY_FAMILIES)) {
  const stamps = scriptStamps(entry);
  for (const fam of families) {
    const present = fam.filter(f => stamps.has(f));
    if (present.length < 2) continue; // 单成员在场无一致性可言（缺装载点由 lint-split-contracts 报）
    const vals = present.map(f => stamps.get(f)[0]);
    if (new Set(vals).size > 1) {
      mismatches.push({ key: fam[0] + '@' + entry, detail: present.map((f, i) => f + '?v=' + vals[i]).join(' · ') });
    }
  }
}

// ② 重复装载（全入口·零基线）
for (const entry of DUP_ENTRIES) {
  if (!fs.existsSync(path.join(ROOT, entry))) continue;
  for (const [src, arr] of scriptStamps(entry)) {
    if (arr.length > 1) {
      console.error(`[lint-split-stamps] FAIL ${entry}: ${src} 装载 ${arr.length} 次（同名顶层定义静默覆盖）`);
      failed++;
    }
  }
}

// —— 基线对比（棘轮）
let baseline = { allow: [] };
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch (_e) {}
const allowSet = new Set(baseline.allow || []);
const newBad = mismatches.filter(x => !allowSet.has(x.key));
const healed = [...allowSet].filter(k => !mismatches.some(x => x.key === k));

if (UPDATE) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), note: '拆分家族缓存戳历史分歧豁免名单·棘轮只减不增·修齐一族删一条', allow: mismatches.map(x => x.key).sort() }, null, 2) + '\n');
  console.log(`[lint-split-stamps] 基线已重写：${mismatches.length} 座历史分歧族豁免`);
  mismatches.forEach(x => console.log('  豁免 ' + x.key + ' → ' + x.detail));
  process.exit(0);
}

for (const x of newBad) {
  console.error(`[lint-split-stamps] FAIL 新增戳分歧 ${x.key}：${x.detail}`);
  console.error('  拆分家族成员须共用同一 ?v= 戳（改任何一片整族 bump·防半旧半新缓存装载崩）');
  failed++;
}
if (healed.length) console.log(`[lint-split-stamps] 提示：基线中 ${healed.length} 座已修齐可收紧（--update 固化）：${healed.join(', ')}`);

if (failed === 0) {
  const famTotal = Object.values(ENTRY_FAMILIES).reduce((a, f) => a + f.length, 0);
  console.log(`[lint-split-stamps] PASS · ${famTotal} 座家族戳一致性成立（豁免 ${mismatches.length}）· 全入口零重复装载`);
  process.exit(0);
}
process.exit(1);
