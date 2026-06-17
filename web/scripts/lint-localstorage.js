#!/usr/bin/env node
// scripts/lint-localstorage.js — 审计 localStorage 直接调用是否在 try-catch 内
//
// 隐私模式 / quota 满 / cookie disabled 等场景下 localStorage 会抛 SecurityError
// 未在 try 内调用 = 浏览器某些状态下直接崩溃整个游戏
//
// 用法：node scripts/lint-localstorage.js

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !SKIP.has(e.name)) yield* walk(path.join(dir, e.name));
    else if (e.isFile() && e.name.endsWith('.js')) yield path.join(dir, e.name);
  }
}

let unsafeWrites = 0, unsafeReads = 0;
const samples = [];

for (const f of walk(ROOT)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/localStorage\.(getItem|setItem|removeItem)/.test(line)) continue;
    // 同行已有 try {...} catch — 已包好
    if (/\btry\s*\{/.test(line) && /\}\s*catch/.test(line)) continue;
    // 启发式：前 30 行内有 try { 而该行之前没有匹配的 catch (R153 lookback 从 6 → 30 减少误报)
    let inTry = false;
    for (let j = Math.max(0, i - 30); j <= i; j++) {
      if (/\btry\s*\{/.test(lines[j])) inTry = true;
      if (/\}\s*catch/.test(lines[j]) && j < i) inTry = false;
    }
    if (!inTry) {
      const isWrite = /setItem|removeItem/.test(line);
      if (isWrite) unsafeWrites++; else unsafeReads++;
      if (samples.length < 10) {
        const rel = path.relative(ROOT, f).replace(/\\/g, '/');
        samples.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 90));
      }
    }
  }
}

console.log('[lint-localstorage] 审计完成');
console.log('  ⚠ 写入未 try (quota 满风险):', unsafeWrites);
console.log('  ⚠ 读取未 try (private 模式崩溃):', unsafeReads);
console.log('  ✓ 总计未 try:', unsafeWrites + unsafeReads);
if (samples.length) {
  console.log('\n样本前 10:');
  samples.forEach(s => console.log('  ' + s));
}
