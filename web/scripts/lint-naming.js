#!/usr/bin/env node
// scripts/lint-naming.js — 命名规约 lint·v0 warn-only (Phase 1 grandfather)
//
// 来源·web/docs/architecture-target-final.md §5 命名政策
//
// 检查 4 项·
//   1. 前缀·tm- / editor- / map- / 例外 (scan_globals.js·detect_globals.js)
//   2. 禁词 suffix·-v2.js / -v3.js / -misc.js / -patches.js / -fixes.js / -final.js / .bak
//   3. 模块头注·必含 'Module:' / '@ts-check' / 'reference path' (头 ~50 行内)
//   4. 全局函数·function CapitalCase (Phase 5 起 warn·建议 TM.X namespace)
//
// v0 mode·**warn-only**·exit 0·grandfather 现有
// Phase 6 起·提升 strict mode·新违规 fail
//
// Usage·node scripts/lint-naming.js

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'scripts', 'docs', 'tests', 'archive',
  'scenarios', 'tools', 'vendor',
  '.bak-r103', '.bak-r106'
]);

// 前缀允许 (final §5.2)
const PREFIX_RE = /^(tm-|editor-|map-)/;
// 例外 (P2 rename 计划·当前 grandfather)
const EXCEPTION_FILES = new Set([
  'editor.js',             // editor- 系列 shell·正常名
  // 'administration.js' → editor-administration.js (Phase 2·done)
  'scan_globals.js',       // dev tool·P4 audit
  'detect_globals.js'      // dev tool·P4 audit
]);

// 禁词 suffix (final §5.1)
const FORBIDDEN_SUFFIX_RE = /-(v2|v3|misc|patches|fixes|final)\.js$|\.bak$/;

// 头注必含 (final §5.5)
const HEADER_RE = /Module:|@ts-check|reference path|={20,}/;

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.name.startsWith('.bak-')) continue;
      yield* walk(path.join(dir, e.name));
    } else if (e.isFile() && /\.js$/.test(e.name)) {
      yield path.join(dir, e.name);
    }
  }
}

const stats = {
  total: 0,
  prefix_violations: [],
  suffix_violations: [],
  header_missing: []
};

const files = [...walk(ROOT)];
files.forEach(f => {
  stats.total++;
  const base = path.basename(f);
  const rel = path.relative(ROOT, f);

  // rule 1·前缀
  if (!PREFIX_RE.test(base) && !EXCEPTION_FILES.has(base)) {
    stats.prefix_violations.push(rel);
  }

  // rule 2·禁词 suffix
  if (FORBIDDEN_SUFFIX_RE.test(base)) {
    stats.suffix_violations.push(rel);
  }

  // rule 3·头注
  try {
    const head = fs.readFileSync(f, 'utf8').slice(0, 2000);
    if (!HEADER_RE.test(head)) {
      stats.header_missing.push(rel);
    }
  } catch (_) {
    // skip read err
  }
});

// 输出
console.log('[lint-naming] v0·warn-only·grandfather mode (Phase 1)');
console.log('[lint-naming] total .js files: ' + stats.total);
console.log('');

console.log('[lint-naming] rule 1·前缀违规 (tm-/editor-/map-)·' + stats.prefix_violations.length + ' 个');
stats.prefix_violations.forEach(f => console.log('  - ' + f));
console.log('');

console.log('[lint-naming] rule 2·禁词 suffix (transitional·待 P2-P3 清理)·' + stats.suffix_violations.length + ' 个');
stats.suffix_violations.forEach(f => console.log('  - ' + f));
console.log('');

console.log('[lint-naming] rule 3·头注缺失 (待 P5 头注 warm-up + 命名规约 lint 强化)·' + stats.header_missing.length + ' 个');
// v0·只 print 前 10·避输出过长
stats.header_missing.slice(0, 10).forEach(f => console.log('  - ' + f));
if (stats.header_missing.length > 10) {
  console.log('  ... (+' + (stats.header_missing.length - 10) + ' more·见 P5 报告)');
}
console.log('');

// summary
const totalViolations = stats.prefix_violations.length + stats.suffix_violations.length + stats.header_missing.length;
console.log('[lint-naming] 总违规·' + totalViolations + ' (grandfather mode·exit 0)');
console.log('[lint-naming] Phase 6 起·新违规 fail·strict mode 启');

process.exit(0);
