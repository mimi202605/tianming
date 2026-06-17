#!/usr/bin/env node
// scripts/lint-catch-console.js — catch 块里的 console.* 调用·按可迁移性分级
//
// 目的：找出 catch (e) { console.warn(...) } 这类·可改为 TM.errors.capture(e, 'mod')
//   capture 默认 mirror 到 console.warn·所以迁移后保留开发可见性 + 增加错误日志导出
//
// 三类：
//   类1·纯 console (无其他动作)·最适合自动迁移
//   类2·console + 其他动作 (toast / hideLoading 等)·保留 console·额外加 capture
//   类3·已有 TM.errors.capture·跳过

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs']);

function* walk(dir, ext) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(path.join(dir, e.name), ext);
    } else if (e.isFile() && ext.test(e.name)) {
      yield path.join(dir, e.name);
    }
  }
}

const stats = { type1: 0, type2: 0, type3: 0, byFile: {} };
const samples = { type1: [], type2: [] };

for (const f of [...walk(ROOT, /\.js$/)]) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const rel = path.relative(ROOT, f);
  let fileCount = 0;
  lines.forEach((line, i) => {
    // 匹配 catch (e) { ... console.xxx ... }
    const catchM = line.match(/catch\s*\(([^)]+)\)\s*\{(.*)\}/);
    if (!catchM) return;
    const body = catchM[2];
    if (!/console\.(warn|log|error|info)/.test(body)) return;
    // 已有 TM.errors → 跳过
    if (/TM\.errors\.|captureSilent\b|\.capture\(/.test(body)) {
      stats.type3++;
      return;
    }
    fileCount++;
    // 是否纯 console (除空格逗号外只有 console.xxx 调用)
    const cleaned = body.replace(/console\.(warn|log|error|info)\([^)]*\);?\s*/g, '').trim();
    if (cleaned === '' || cleaned === ';') {
      stats.type1++;
      if (samples.type1.length < 5) samples.type1.push({ file: rel, line: i+1, raw: line.trim() });
    } else {
      stats.type2++;
      if (samples.type2.length < 5) samples.type2.push({ file: rel, line: i+1, raw: line.trim() });
    }
  });
  if (fileCount > 0) stats.byFile[rel] = fileCount;
}

console.log(`[lint-catch-console] catch 块里的 console.* 调用统计：`);
console.log(`  类1·纯 console (无其他动作): ${stats.type1}`);
console.log(`  类2·console + 其他动作 (toast 等): ${stats.type2}`);
console.log(`  类3·已有 TM.errors.capture: ${stats.type3}`);
console.log(`  应迁移总计：${stats.type1 + stats.type2}`);
console.log(`\nTop 10 待迁移文件：`);
Object.entries(stats.byFile)
  .sort((a,b) => b[1]-a[1])
  .slice(0,10)
  .forEach(([f,n]) => console.log(`  · ${f}: ${n} 处`));

console.log(`\n类1 样本前 5：`);
samples.type1.forEach(s => console.log(`  ${s.file}:${s.line}  ${s.raw.slice(0,90)}`));
console.log(`\n类2 样本前 5：`);
samples.type2.forEach(s => console.log(`  ${s.file}:${s.line}  ${s.raw.slice(0,90)}`));
