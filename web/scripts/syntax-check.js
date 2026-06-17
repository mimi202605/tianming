#!/usr/bin/env node
// scripts/syntax-check.js — 零依赖语法校验
// 对仓库根目录下所有 *.js 跑 `node --check`，失败立即中断并列出错误。
// 用法：node scripts/syntax-check.js

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs']);
const SKIP_PATTERNS = [/\.backup/, /\.bak(-r\d+)?/, /_rebuilt/];

function shouldSkip(name) {
  return SKIP_PATTERNS.some(re => re.test(name));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (shouldSkip(entry.name)) continue;
      yield path.join(dir, entry.name);
    }
  }
}

const files = [...walk(ROOT)];
console.log(`[syntax-check] 扫描 ${files.length} 个 .js 文件`);

let failed = 0;
const failures = [];
const start = Date.now();

for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    process.stdout.write('.');
  } catch (e) {
    process.stdout.write('F');
    failed++;
    failures.push({ file: path.relative(ROOT, file), err: (e.stderr || e.stdout || '').toString().trim() });
  }
}
const dt = Date.now() - start;
process.stdout.write('\n');

if (failed === 0) {
  console.log(`[syntax-check] ✓ 全部 ${files.length} 个文件语法通过 (${dt}ms)`);
  process.exit(0);
} else {
  console.error(`[syntax-check] ✗ ${failed}/${files.length} 文件语法错误`);
  failures.forEach(f => {
    console.error(`\n--- ${f.file} ---\n${f.err}`);
  });
  process.exit(1);
}
