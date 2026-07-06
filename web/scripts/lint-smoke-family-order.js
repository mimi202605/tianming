#!/usr/bin/env node
// scripts/lint-smoke-family-order.js — smoke 源码拼接序守卫（2026-07-06 架构优化轮二）
//
// 背景：拆分家族的 smoke/verify 脚本以源码方式消费家族成员（read('X')拼接 / readFileSync /
//   vm 顺序装载 / loadMany 数组），拼接序若与真实装载契约不符，脚本仍可能全绿（纯正则断言
//   不吃序），但作为装载序防腐测试完全不可信——Codex 复审在第十八拆抓过 15 处，此后靠
//   委任状人肉叮嘱。本守卫把这条纪律自动化。
// 规则：scripts/ 下任一 .js 中，若同一拆分家族有 ≥2 个成员被字符串提及（'xxx.js'），
//   其**首次出现顺序**必须与契约序一致（契约=lint-split-contracts.js 单一真相源，只读解析）。
//   历史/裁定豁免走基线 arch-baselines/smoke-family-order.json（棘轮只减不增）。
// 用法：
//   node scripts/lint-smoke-family-order.js           # 对比基线
//   node scripts/lint-smoke-family-order.js --update  # 重写基线
'use strict';
const fs = require('fs');
const path = require('path');
const SCRIPTS_DIR = __dirname;
const BASELINE_FILE = path.join(SCRIPTS_DIR, 'arch-baselines', 'smoke-family-order.json');
const UPDATE = process.argv.includes('--update');

// —— 契约解析（与 lint-split-stamps 同法：单一真相源在 lint-split-contracts.js）
const contractsSrc = fs.readFileSync(path.join(SCRIPTS_DIR, 'lint-split-contracts.js'), 'utf8');
const families = [];
{
  const seen = new Set();
  for (const m of contractsSrc.matchAll(/^\s*\[((?:'[\w.-]+\.js'\s*,?\s*)+)\],?\s*$/gm)) {
    const fam = [...m[1].matchAll(/'([\w.-]+\.js)'/g)].map(x => x[1]);
    const key = fam.join('>');
    if (!seen.has(key)) { seen.add(key); families.push(fam); }
  }
}

// —— 扫描 scripts/ 消费脚本（smoke-*/verify-*/codemod-* 及杂项，排除守卫自身与库）
const targets = fs.readdirSync(SCRIPTS_DIR).filter(n =>
  /\.js$/.test(n) && !/^lint-|^lib-|^run-smokes/.test(n));

const violations = [];
for (const name of targets) {
  const src = fs.readFileSync(path.join(SCRIPTS_DIR, name), 'utf8');
  for (const fam of families) {
    // 首次字符串提及位置（带引号防误伤子串——家族名互为前缀：'tm-mechanics.js' vs 'tm-mechanics-memory.js' 不互含·引号锚定文件名边界）
    const firstIdx = fam.map(f => {
      const i1 = src.indexOf("'" + f + "'");
      const i2 = src.indexOf('"' + f + '"');
      const i3 = src.indexOf('`' + f + '`');
      const hits = [i1, i2, i3].filter(x => x !== -1);
      return hits.length ? Math.min(...hits) : -1;
    });
    const present = fam.filter((_, i) => firstIdx[i] !== -1);
    if (present.length < 2) continue;
    const order = fam.map((f, i) => ({ f, at: firstIdx[i] })).filter(x => x.at !== -1);
    const sorted = [...order].sort((a, b) => a.at - b.at).map(x => x.f);
    const expected = order.map(x => x.f); // 契约序（按 fam 原序过滤在场者）
    if (sorted.join('>') !== expected.join('>')) {
      violations.push({ key: name + '::' + fam[0], detail: '实际提及序 ' + sorted.join(' → ') + ' ≠ 契约序 ' + expected.join(' → ') });
    }
  }
}

let baseline = { allow: [] };
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch (_e) {}
const allowSet = new Set(baseline.allow || []);
const newBad = violations.filter(v => !allowSet.has(v.key));
const healed = [...allowSet].filter(k => !violations.some(v => v.key === k));

if (UPDATE) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), note: 'smoke源码拼接序历史/裁定豁免·棘轮只减不增·修齐一处删一条', allow: violations.map(v => v.key).sort() }, null, 2) + '\n');
  console.log(`[lint-smoke-family-order] 基线已重写：豁免 ${violations.length} 处`);
  violations.forEach(v => console.log('  豁免 ' + v.key + ' | ' + v.detail));
  process.exit(0);
}

let failed = 0;
for (const v of newBad) {
  console.error(`[lint-smoke-family-order] FAIL ${v.key}：${v.detail}`);
  console.error('  smoke 消费拆分家族须按契约序提及/拼接（装载序防腐测试的可信度所系）');
  failed++;
}
if (healed.length) console.log(`[lint-smoke-family-order] 提示：基线中 ${healed.length} 处已修齐可收紧（--update 固化）：${healed.join(', ')}`);

if (failed === 0) {
  console.log(`[lint-smoke-family-order] PASS · ${families.length} 座家族 × ${targets.length} 脚本拼接序全部合契约（豁免 ${violations.length}）`);
  process.exit(0);
}
process.exit(1);
