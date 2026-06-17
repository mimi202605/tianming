#!/usr/bin/env node
// scripts/bump-cache-bust.js — 把所有 HTML 里的 ?v=YYYYMMDDx 统一到一个新版本号
//
// 用途：拆分/改文件后跑一次·确保浏览器全部重新拉脚本·避免缓存到旧版
// 用法：node scripts/bump-cache-bust.js [YYYYMMDDx]
//   不传参数则自动用今天日期+'v'·如 20260425v
//
// 不破坏只有 hash 的引用（如 https://cdn... 不带 ?v=）

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function todayVer() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + 'v';
}

const newVer = process.argv[2] || todayVer();
console.log(`[bump-cache-bust] 目标版本号：${newVer}`);

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

const htmlFiles = [...walk(ROOT, /\.html$/)];
let totalChanges = 0;
let filesChanged = 0;

for (const f of htmlFiles) {
  const before = fs.readFileSync(f, 'utf8');
  // 替换 src="x.js?v=ANY" → src="x.js?v=newVer"·不动 src="x.js" (无版本)
  const after = before.replace(/\?v=[a-zA-Z0-9_-]+/g, `?v=${newVer}`);
  if (after !== before) {
    const matches = before.match(/\?v=[a-zA-Z0-9_-]+/g) || [];
    fs.writeFileSync(f, after, 'utf8');
    filesChanged++;
    totalChanges += matches.length;
    console.log(`  ✓ ${path.relative(ROOT, f)}: ${matches.length} 处`);
  }
}

if (filesChanged === 0) {
  console.log(`[bump-cache-bust] 无变更（所有版本号已是 ${newVer}）`);
} else {
  console.log(`[bump-cache-bust] ✓ 改了 ${filesChanged} 个 HTML·共 ${totalChanges} 处`);
}
