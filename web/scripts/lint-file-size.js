#!/usr/bin/env node
// scripts/lint-file-size.js — 架构四刀之四：巨石文件增长棘轮（2026-07-04）
//
// 纪律：巨石文件【顺手拆、不立项拆】——动到它时按既有 alias+内联范式往外搬，
// 但绝不允许继续往里堆。本守卫盯的就是「继续堆」：
//   - 超阈值(默认 3000 行)的文件入基线
//   - 基线内文件涨幅超预算(默认 +100 行) → FAIL：这次改动应该顺手拆而不是加高
//   - 新文件长成新巨石 → FAIL
//   - 涨幅在预算内 → 只提醒，不挡路（正常功能迭代允许呼吸）
//
// 用法：
//   node scripts/lint-file-size.js            # 对比基线
//   node scripts/lint-file-size.js --update   # 拆完/裁定后重写基线
//   node scripts/lint-file-size.js --top 15   # 列最大的前 N 个
//
// 基线：scripts/arch-baselines/file-size.json
//   { "config": { "thresholdLines": 3000, "growBudget": 100 }, "files": {...} }

'use strict';

const lib = require('./lib-arch-guard');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(lib.BASELINE_DIR, 'file-size.json');
const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const topIdx = args.indexOf('--top');
const TOP_N = topIdx !== -1 ? parseInt(args[topIdx + 1], 10) || 15 : 0;

const prevBaseline = lib.loadJSON(BASELINE_FILE, null);
const config = (prevBaseline && prevBaseline.config) || { thresholdLines: 3000, growBudget: 100 };

const files = lib.runtimeCodeFiles();
const sizes = files.map(f => ({ src: f.src, lines: fs.readFileSync(f.abs, 'utf8').split(/\r?\n/).length }));
const monsters = sizes.filter(s => s.lines > config.thresholdLines).sort((a, b) => b.lines - a.lines);

console.log(`[lint-file-size] 运行时代码 ${files.length} 文件 · 超 ${config.thresholdLines} 行的巨石 ${monsters.length} 个`);
if (TOP_N) {
  console.log(`--- 最大 Top ${TOP_N} ---`);
  sizes.sort((a, b) => b.lines - a.lines).slice(0, TOP_N).forEach(s => console.log(`  ${String(s.lines).padStart(6)} 行  ${s.src}`));
}

if (UPDATE) {
  const filesMap = {};
  monsters.forEach(s => { filesMap[s.src] = s.lines; });
  lib.saveJSON(BASELINE_FILE, { config, updatedAt: new Date().toISOString(), files: filesMap });
  console.log(`[lint-file-size] 基线已更新 → ${lib.rel(BASELINE_FILE)}`);
  process.exit(0);
}

if (!prevBaseline) {
  console.error('[lint-file-size] 无基线。先跑: node scripts/lint-file-size.js --update');
  process.exit(1);
}

const base = prevBaseline.files || {};
const violations = [];
const warnings = [];
for (const s of monsters) {
  if (!(s.src in base)) {
    violations.push(`${s.src}: 新巨石（${s.lines} 行 > ${config.thresholdLines}）——拆了再来`);
  } else if (s.lines > base[s.src] + config.growBudget) {
    violations.push(`${s.src}: ${base[s.src]} → ${s.lines} 行（+${s.lines - base[s.src]}，超预算 ${config.growBudget}）——该顺手拆了`);
  } else if (s.lines > base[s.src]) {
    warnings.push(`${s.src}: ${base[s.src]} → ${s.lines} 行（+${s.lines - base[s.src]}，预算内）`);
  }
}

if (warnings.length) {
  console.log('[lint-file-size] 预算内增长（提醒，不挡路）：');
  warnings.forEach(w => console.log('  ' + w));
}
if (violations.length) {
  console.error(`\n[lint-file-size] FAIL — ${violations.length} 处：巨石只许拆、不许堆（alias+内联范式见 docs/arch-guards.md）`);
  violations.forEach(v => console.error('  ' + v));
  process.exit(1);
}

const shrunk = monsters.filter(s => s.src in base && s.lines < base[s.src]).length;
console.log(`[lint-file-size] PASS${shrunk ? `（${shrunk} 个巨石瘦身了，可跑 --update 收紧基线）` : ''}`);
process.exit(0);
