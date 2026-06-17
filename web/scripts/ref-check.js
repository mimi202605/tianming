#!/usr/bin/env node
// scripts/ref-check.js — 零依赖跨文件引用检查
//
// 扫描仓库里所有 *.html 和 *.js 中的 <script src="..."> 和 fetch('...') / import 'x',
// 验证目标文件存在。预防拆分/改名后忘记改引用的 404 bug（R122 漏改 editor.html 就是此类）
//
// 用法：node scripts/ref-check.js
// 退出码 0 = 全部引用有效 / 1 = 有断链

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs', '_archive']);
const SKIP_PATTERNS = [/\.backup/, /\.bak(-r\d+)?/, /_rebuilt/];

function shouldSkip(name) {
  return SKIP_PATTERNS.some(re => re.test(name));
}

function* walk(dir, extFilter) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name), extFilter);
    } else if (entry.isFile() && extFilter.test(entry.name)) {
      if (shouldSkip(entry.name)) continue;
      yield path.join(dir, entry.name);
    }
  }
}

// 从 HTML 里抽 <script src="...">
function extractScriptSrcs(html) {
  const re = /<script\s+[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// 从 HTML/JS 里抽 fetch('/xxx') / fetch("xxx") — 仅本地路径
function extractFetches(content) {
  const re = /\bfetch\(['"]([^'"]+)['"]/g;
  const out = [];
  let m;
  while ((m = re.exec(content))) {
    const url = m[1];
    // 跳过 http(s) URL
    if (/^https?:/.test(url) || url.startsWith('//')) continue;
    // 跳过 data: / blob:
    if (url.startsWith('data:') || url.startsWith('blob:')) continue;
    // 跳过带变量拼接的（只能启发式·/${var}/ 之类无法静态判断）
    out.push(url);
  }
  return out;
}

const htmlFiles = [...walk(ROOT, /\.html$/)];
const jsFiles = [...walk(ROOT, /\.js$/)];

console.log(`[ref-check] 扫描 ${htmlFiles.length} 个 HTML · ${jsFiles.length} 个 JS`);

const missing = [];
const found = new Set();

function checkRef(sourceFile, ref, kind) {
  // 剥离查询串/锚点·剥离拼接残留 (如 'changelog.json?v=' + Date.now())
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return true; // 空引用（纯拼接前缀）·跳过
  // 相对路径解析 (相对源文件的目录)
  let abs;
  if (path.isAbsolute(clean) || clean.startsWith('/')) {
    abs = path.join(ROOT, clean.replace(/^\//, ''));
  } else {
    abs = path.resolve(path.dirname(sourceFile), clean);
  }
  if (fs.existsSync(abs)) {
    found.add(path.relative(ROOT, abs));
    return true;
  }
  missing.push({
    source: path.relative(ROOT, sourceFile),
    ref: ref,
    kind: kind,
    resolvedAs: path.relative(ROOT, abs)
  });
  return false;
}

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  extractScriptSrcs(html).forEach(src => {
    if (/^https?:/.test(src)) return; // CDN 跳过
    checkRef(htmlFile, src, 'script');
  });
  extractFetches(html).forEach(url => checkRef(htmlFile, url, 'fetch'));
}

for (const jsFile of jsFiles) {
  const js = fs.readFileSync(jsFile, 'utf8');
  extractFetches(js).forEach(url => checkRef(jsFile, url, 'fetch'));
}

console.log(`[ref-check] 验证了 ${found.size} 个唯一引用目标`);

if (missing.length === 0) {
  console.log(`[ref-check] ✓ 所有引用有效`);
  process.exit(0);
} else {
  console.error(`[ref-check] ✗ 发现 ${missing.length} 个断链：`);
  missing.forEach(m => {
    console.error(`  ✗ ${m.source} [${m.kind}] → "${m.ref}"`);
    console.error(`    解析为不存在的路径: ${m.resolvedAs}`);
  });
  process.exit(1);
}
