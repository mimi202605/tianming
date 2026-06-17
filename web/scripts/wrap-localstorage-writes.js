#!/usr/bin/env node
// scripts/wrap-localstorage-writes.js — 给未在 try 内的 localStorage.setItem/removeItem 加 try wrapper
//
// 转换：
//   localStorage.setItem('key', value);          (原裸调用·缩进保留)
//   ↓
//   try { localStorage.setItem('key', value); } catch(_){}
//
// 跳过：
//   · 行内已有 try { ... } catch — 已包好
//   · 前 6 行内已经在 try 块里
//
// 用法：
//   node scripts/wrap-localstorage-writes.js --dry-run
//   node scripts/wrap-localstorage-writes.js --apply

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const DRY = !args.includes('--apply');
const SKIP = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !SKIP.has(e.name)) yield* walk(path.join(dir, e.name));
    else if (e.isFile() && e.name.endsWith('.js')) yield path.join(dir, e.name);
  }
}

let totalChanges = 0;
let filesChanged = 0;

for (const f of walk(ROOT)) {
  const before = fs.readFileSync(f, 'utf8');
  const lines = before.split('\n');
  let fileChanges = 0;
  const out = lines.slice();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/localStorage\.(setItem|removeItem)/.test(line)) continue;
    // 已经在同行 try 内·跳过
    if (/\btry\s*\{/.test(line) && /\}\s*catch/.test(line)) continue;
    // 前 6 行有 try { 且当前行前没出现匹配的 catch — 跳过 (已在 try 块内)
    let inTry = false;
    for (let j = Math.max(0, i - 6); j <= i; j++) {
      if (/\btry\s*\{/.test(lines[j])) inTry = true;
      if (/\}\s*catch/.test(lines[j]) && j < i) inTry = false;
    }
    if (inTry) continue;

    // 仅匹配单语句行 (整行就是一个 localStorage.setItem(...);)
    // 模式：[空白]localStorage.X(...);  (无前缀如 var/let/const/=)
    const m = line.match(/^(\s*)(localStorage\.(setItem|removeItem)\([^;]+\);?)\s*$/);
    if (!m) continue;
    const indent = m[1];
    const stmt = m[2];
    out[i] = indent + 'try { ' + stmt + (stmt.endsWith(';') ? '' : ';') + ' } catch(_){}';
    fileChanges++;
  }

  if (fileChanges > 0) {
    filesChanged++;
    totalChanges += fileChanges;
    console.log(`  ${DRY?'[DRY]':'[APPLY]'} ${path.relative(ROOT, f).replace(/\\/g, '/')}: ${fileChanges} 处`);
    if (!DRY) fs.writeFileSync(f, out.join('\n'), 'utf8');
  }
}

console.log(`\n${DRY?'[DRY-RUN]':'[APPLIED]'} ${filesChanged} 个文件·共 ${totalChanges} 处`);
if (DRY && totalChanges > 0) console.log('运行 --apply 以实际改写');
