#!/usr/bin/env node
// scripts/lint-dep-graph.js — 架构四刀之二：依赖显式化（2026-07-04）
//
// 359 个 <script> 标签的依赖全靠加载顺序隐式成立，谁依赖谁没有图。
// 本脚本不上构建、不动加载方式，只把隐式图【量出来、存下来、守起来】：
//   1. 从 index.html 取真实加载清单（与 lib-arch-guard 同源）
//   2. 每文件扫 provides（定义了哪些 TM.X / window.X）和 requires（引用了哪些 TM.X）
//   3. 产出机器可读依赖清单 → dev-tools/arch-guard/deps-manifest.json（拆分/改名前先查它）
//   4. 守卫：引用了但全集里无人定义的 TM.X = 悬空引用（typo/死代码/漏挂脚本），
//      存量入基线，只挡【新增】悬空 —— 棘轮，同 lint-gm-writes。
//
// 已知局限（诚实声明）：
//   - 逐行正则，非 AST；TM[动态key] = ... 的定义看不见 → 这类文件会列在 dynamicDefiners，
//     悬空判定对它们定义的名字会误报，靠基线吸收
//   - 「顶层立即执行时的加载顺序违例」需要 AST 才能判，本版不做（见 docs/arch-guards.md）
//
// 用法：
//   node scripts/lint-dep-graph.js             # 生成清单 + 对比悬空基线
//   node scripts/lint-dep-graph.js --update    # 重写悬空基线
//   node scripts/lint-dep-graph.js --who TM.ClassEngine   # 查某命名空间谁定义谁引用

'use strict';

const lib = require('./lib-arch-guard');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(lib.BASELINE_DIR, 'dep-dangling.json');
const MANIFEST_FILE = path.join(lib.REPORT_DIR, 'deps-manifest.json');
const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const whoIdx = args.indexOf('--who');
const WHO = whoIdx !== -1 ? (args[whoIdx + 1] || '').replace(/^TM\./, '') : null;

// 定义识别：TM.X = / window.TM.X = / global.TM.X = / g.TM.X = …（别名根），不锚定行首（if (!TM.X) TM.X = {} 也算）
const PROVIDE_TM_RE = /(?:^|[^\w$.])(?:[\w$]+\.)?TM\.([A-Za-z_$][\w$]*)\s*=(?![=>])/g;
const PROVIDE_WIN_RE = /^\s*window\.([A-Za-z_$][\w$]*)\s*=(?![=>])/;
const DEFINEPROP_RE = /Object\.defineProperty\(\s*(?:window\.)?TM\s*,\s*['"]([\w$]+)['"]/;
const USE_TM_RE = /\bTM\.([A-Za-z_$][\w$]*)/g;
const DYNAMIC_DEF_RE = /\bTM\[[^\]]+\]\s*=(?![=>])/;

const files = lib.parseIndexScripts().filter(f => f.exists && /\.js$/.test(f.src));
const manifest = [];
const definers = new Map();   // ns -> [src...]（按加载顺序）
const users = new Map();      // ns -> Set<src>
const dynamicDefiners = [];

files.forEach((f, order) => {
  const lines = fs.readFileSync(f.abs, 'utf8').split(/\r?\n/);
  const provides = new Set();
  const winProvides = new Set();
  const requires = new Set();
  let dynamic = false;
  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    const line = lib.stripLineComment(raw);
    let m;
    PROVIDE_TM_RE.lastIndex = 0;
    while ((m = PROVIDE_TM_RE.exec(line))) provides.add(m[1]);
    if ((m = line.match(DEFINEPROP_RE))) provides.add(m[1]);
    if ((m = line.match(PROVIDE_WIN_RE)) && m[1] !== 'TM') winProvides.add(m[1]);
    if (DYNAMIC_DEF_RE.test(line)) dynamic = true;
    USE_TM_RE.lastIndex = 0;
    while ((m = USE_TM_RE.exec(line))) requires.add(m[1]);
  }
  provides.forEach(ns => {
    if (!definers.has(ns)) definers.set(ns, []);
    definers.get(ns).push(f.src);
  });
  requires.forEach(ns => {
    if (provides.has(ns)) return; // 自给自足不算外部依赖
    if (!users.has(ns)) users.set(ns, new Set());
    users.get(ns).add(f.src);
  });
  if (dynamic) dynamicDefiners.push(f.src);
  if (f.isData) return; // 数据文件不进清单（但其 provides 已计入，避免误判悬空）
  manifest.push({ order, src: f.src, provides: [...provides].sort(), windowGlobals: [...winProvides].sort(), requires: [...requires].sort() });
});

// --who 查询模式
if (WHO) {
  console.log(`TM.${WHO}`);
  console.log(`  定义于: ${(definers.get(WHO) || ['（无 — 悬空或动态定义）']).join(', ')}`);
  const u = users.get(WHO);
  console.log(`  引用方: ${u ? u.size + ' 个文件' : '无'}`);
  if (u) [...u].slice(0, 30).forEach(s => console.log('    ' + s));
  process.exit(0);
}

// 悬空引用：被引用但全集无人定义
const dangling = [...users.keys()].filter(ns => !definers.has(ns)).sort();
// 共享命名空间：>1 个文件都在定义（拆分/撞车热点，仅报告）
const shared = [...definers.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ ns: k, files: v }));

lib.saveJSON(MANIFEST_FILE, {
  generatedAt: new Date().toISOString(),
  scriptCount: files.length,
  namespaceCount: definers.size,
  files: manifest,
  sharedNamespaces: shared,
  dynamicDefiners,
  dangling
});

console.log(`[lint-dep-graph] 脚本 ${files.length} · TM命名空间 ${definers.size} · 共享定义 ${shared.length} · 动态定义文件 ${dynamicDefiners.length} · 悬空引用 ${dangling.length}`);
console.log(`[lint-dep-graph] 依赖清单 → ${lib.rel(MANIFEST_FILE)}（拆分/改名前先 --who 查引用面）`);

if (UPDATE) {
  lib.saveJSON(BASELINE_FILE, { updatedAt: new Date().toISOString(), dangling });
  console.log(`[lint-dep-graph] 悬空基线已更新 → ${lib.rel(BASELINE_FILE)}`);
  process.exit(0);
}

const baseline = lib.loadJSON(BASELINE_FILE, null);
if (!baseline) {
  console.error('[lint-dep-graph] 无基线。先跑: node scripts/lint-dep-graph.js --update');
  process.exit(1);
}
const known = new Set(baseline.dangling || []);
const fresh = dangling.filter(ns => !known.has(ns));
if (fresh.length) {
  console.error(`\n[lint-dep-graph] FAIL — 新增悬空引用 ${fresh.length} 个（typo？还是忘了挂 <script>？）：`);
  for (const ns of fresh) {
    const u = users.get(ns);
    console.error(`  TM.${ns} ← ${[...u].slice(0, 3).join(', ')}${u.size > 3 ? ` 等${u.size}处` : ''}`);
  }
  process.exit(1);
}
console.log('[lint-dep-graph] PASS');
process.exit(0);
