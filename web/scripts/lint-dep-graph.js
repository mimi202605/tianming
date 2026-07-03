#!/usr/bin/env node
// scripts/lint-dep-graph.js — 架构四刀之二：依赖显式化 v2（2026-07-04）
//
// v1：单入口(index.html)·TM.* provides/requires 图·悬空引用棘轮。
// v2 升级（同日）：
//   a. 多入口分集：index.html / editor.html / map-editor.html 各自建集各自判悬空
//      ——编辑器侧命名空间不再在游戏入口误报，游戏侧 typo 也不再被编辑器文件遮蔽
//   b. TM 别名识别：`var TMNS = window.TM` 后 `TMNS.Foo = ...` 也算定义 TM.Foo
//      （首杀案例：tm-endturn-core.js 经 TMNS 定义 FactionAiMainloopBridge·v1 误判悬空）
//   c. 跨入口引用分类：入口 E 悬空但别的入口有定义 → 标注 crossEntry（多为带守卫的合法探测）
//
// 产出：dev-tools/arch-guard/deps-manifest.json（拆分/改名前先查它）
// 守卫：各入口【新增】悬空引用即红 —— 棘轮，基线在 arch-baselines/dep-dangling.json
//
// 已知局限（诚实声明）：逐行正则非 AST；TM[动态key] 定义看不见（dynamicDefiners 兜底）；
// 顶层立即执行的加载顺序违例判不了，属 v3。
//
// 用法：
//   node scripts/lint-dep-graph.js             # 生成清单 + 对比各入口悬空基线
//   node scripts/lint-dep-graph.js --update    # 重写悬空基线
//   node scripts/lint-dep-graph.js --who TM.ClassEngine   # 查某命名空间各入口谁定义谁引用

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

const ENTRIES = ['index.html', 'editor.html', 'map-editor.html']
  .filter(e => fs.existsSync(path.join(lib.WEB_ROOT, e)));

// 定义识别：TM.X = / window.TM.X = / global.TM.X = 等（别名根），不锚定行首
const PROVIDE_TM_RE = /(?:^|[^\w$.])(?:[\w$]+\.)?TM\.([A-Za-z_$][\w$]*)\s*=(?![=>])/g;
const PROVIDE_WIN_RE = /^\s*window\.([A-Za-z_$][\w$]*)\s*=(?![=>])/;
const DEFINEPROP_RE = /Object\.defineProperty\(\s*(?:[\w$]+\.)?TM\s*,\s*['"]([\w$]+)['"]/;
const USE_TM_RE = /\bTM\.([A-Za-z_$][\w$]*)/g;
const DYNAMIC_DEF_RE = /\bTM\[[^\]]+\]\s*=(?![=>])/;
// TM 别名声明：var TMNS = root.TM; / const T = window.TM || {} 等
// RHS 必须是 TM 本体且随即终结（; , ) || 行尾 或 = 续赋值）——
// 严禁 `window.TM && window.TM.X` 这类子树探测被误认成别名（v2 首版踩过的坑）
const ALIAS_DECL_RE = /\b(?:var|let|const)\s+([\w$]+)\s*=\s*\(?\s*(?:[\w$]+\.)?TM\s*(?:;|,|\)|\|\||=(?!=)|$)/g;

// 每文件只扫一次（多入口共享）
const fileCache = new Map();
function scanFile(abs) {
  if (fileCache.has(abs)) return fileCache.get(abs);
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  const provides = new Set();
  const winProvides = new Set();
  const requires = new Set();
  let dynamic = false;
  // 先收别名
  const aliases = new Set();
  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    const line = lib.stripLineComment(raw);
    let m;
    ALIAS_DECL_RE.lastIndex = 0;
    while ((m = ALIAS_DECL_RE.exec(line))) if (m[1] !== 'TM') aliases.add(m[1]);
  }
  // 只用别名认「定义」，不用别名认「引用」——同名局部变量会让引用面爆炸误报
  const aliasProvideRes = [...aliases].map(a =>
    new RegExp(String.raw`(?:^|[^\w$.])` + a + String.raw`\.([A-Za-z_$][\w$]*)\s*=(?![=>])`, 'g'));

  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    const line = lib.stripLineComment(raw);
    let m;
    PROVIDE_TM_RE.lastIndex = 0;
    while ((m = PROVIDE_TM_RE.exec(line))) provides.add(m[1]);
    for (const re of aliasProvideRes) {
      re.lastIndex = 0;
      while ((m = re.exec(line))) provides.add(m[1]);
    }
    if ((m = line.match(DEFINEPROP_RE))) provides.add(m[1]);
    if ((m = line.match(PROVIDE_WIN_RE)) && m[1] !== 'TM') winProvides.add(m[1]);
    if (DYNAMIC_DEF_RE.test(line)) dynamic = true;
    USE_TM_RE.lastIndex = 0;
    while ((m = USE_TM_RE.exec(line))) requires.add(m[1]);
  }
  const result = { provides, winProvides, requires, dynamic, aliases: [...aliases] };
  fileCache.set(abs, result);
  return result;
}

// 按入口建集
function analyzeEntry(entry) {
  const files = lib.parseIndexScripts(path.join(lib.WEB_ROOT, entry)).filter(f => f.exists && /\.js$/.test(f.src));
  const definers = new Map();   // ns -> [src...]
  const users = new Map();      // ns -> Set<src>
  const dynamicDefiners = [];
  const manifest = [];
  files.forEach((f, order) => {
    const s = scanFile(f.abs);
    s.provides.forEach(ns => {
      if (!definers.has(ns)) definers.set(ns, []);
      definers.get(ns).push(f.src);
    });
    s.requires.forEach(ns => {
      if (s.provides.has(ns)) return;
      if (!users.has(ns)) users.set(ns, new Set());
      users.get(ns).add(f.src);
    });
    if (s.dynamic) dynamicDefiners.push(f.src);
    if (f.isData) return;
    manifest.push({ order, src: f.src, provides: [...s.provides].sort(), requires: [...s.requires].sort() });
  });
  const dangling = [...users.keys()].filter(ns => !definers.has(ns)).sort();
  const shared = [...definers.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ ns: k, files: v }));
  return { entry, files, definers, users, dangling, shared, dynamicDefiners, manifest };
}

const results = ENTRIES.map(analyzeEntry);

// --who 查询模式（跨入口）
if (WHO) {
  console.log(`TM.${WHO}`);
  for (const r of results) {
    const d = r.definers.get(WHO);
    const u = r.users.get(WHO);
    if (!d && !u) continue;
    console.log(`  [${r.entry}] 定义于: ${(d || ['无']).join(', ')} · 引用方 ${u ? u.size : 0} 个`);
    if (u) [...u].slice(0, 20).forEach(s => console.log('      ' + s));
  }
  process.exit(0);
}

// 跨入口分类：本入口悬空但别的入口有定义
function crossEntryInfo(r) {
  const out = {};
  for (const ns of r.dangling) {
    const elsewhere = results.filter(o => o !== r && o.definers.has(ns)).map(o => o.entry);
    if (elsewhere.length) out[ns] = elsewhere;
  }
  return out;
}

const manifestOut = { generatedAt: new Date().toISOString(), entries: {} };
for (const r of results) {
  manifestOut.entries[r.entry] = {
    scriptCount: r.files.length,
    namespaceCount: r.definers.size,
    dangling: r.dangling,
    crossEntry: crossEntryInfo(r),
    sharedNamespaces: r.shared,
    dynamicDefiners: r.dynamicDefiners
  };
}
// 文件清单以 index.html 集为主（游戏运行时），其余入口引用可用 --who 查
manifestOut.files = results[0] ? results[0].manifest : [];
lib.saveJSON(MANIFEST_FILE, manifestOut);

for (const r of results) {
  const ce = Object.keys(crossEntryInfo(r)).length;
  console.log(`[lint-dep-graph] ${r.entry}: 脚本 ${r.files.length} · 命名空间 ${r.definers.size} · 悬空 ${r.dangling.length}（其中跨入口 ${ce}）`);
}
console.log(`[lint-dep-graph] 依赖清单 → ${lib.rel(MANIFEST_FILE)}（拆分/改名前先 --who 查引用面）`);

if (UPDATE) {
  const entriesBaseline = {};
  for (const r of results) entriesBaseline[r.entry] = { dangling: r.dangling };
  lib.saveJSON(BASELINE_FILE, { updatedAt: new Date().toISOString(), entries: entriesBaseline });
  console.log(`[lint-dep-graph] 悬空基线已更新 → ${lib.rel(BASELINE_FILE)}`);
  process.exit(0);
}

const baseline = lib.loadJSON(BASELINE_FILE, null);
if (!baseline) {
  console.error('[lint-dep-graph] 无基线。先跑: node scripts/lint-dep-graph.js --update');
  process.exit(1);
}
// 兼容 v1 基线（顶层 dangling = index.html 的）
const baseEntries = baseline.entries || { 'index.html': { dangling: baseline.dangling || [] } };

let failed = false;
for (const r of results) {
  const known = new Set((baseEntries[r.entry] && baseEntries[r.entry].dangling) || []);
  const fresh = r.dangling.filter(ns => !known.has(ns));
  if (!fresh.length) continue;
  failed = true;
  console.error(`\n[lint-dep-graph] FAIL — ${r.entry} 新增悬空引用 ${fresh.length} 个（typo？还是忘了挂 <script>？）：`);
  for (const ns of fresh) {
    const u = r.users.get(ns);
    console.error(`  TM.${ns} ← ${[...u].slice(0, 3).join(', ')}${u.size > 3 ? ` 等${u.size}处` : ''}`);
  }
}
if (failed) process.exit(1);
console.log('[lint-dep-graph] PASS');
process.exit(0);
