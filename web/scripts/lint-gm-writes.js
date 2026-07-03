#!/usr/bin/env node
// scripts/lint-gm-writes.js — 架构四刀之一：写口收窄棘轮（2026-07-04）
//
// 纪律：「读随便，写必须走账」。GM 是全局单例，647 个文件、1.5 万次直接触达
// 是串台/双账/漏还原一族 bug 的总根。存量一口吃不掉，所以做成棘轮（ratchet）：
//   - 基线记录当前每个文件的直写次数，只许降、不许升
//   - 新增直写 → 报错，要求走该子系统的 mutator/ledger 入口（或在 owners 里登记写口文件）
//   - P 是剧本库，gameplay 侧【只读 GM 不伸 P】（剧本隔离根治的既有不变量），P 直写同样计数
//
// 检测（逐行启发式，跟 lint-namespace.js 同风格，接受少量误报——棘轮只比增量）：
//   GM.x = / GM.x += / GM.x++ / delete GM.x / GM.arr.push(...) 等变异方法 / Object.assign(GM...
//   行内写 `arch-ok` 注释可豁免确经裁定的合法直写。
//
// 用法：
//   node scripts/lint-gm-writes.js            # 对比基线，超基线退出码 1
//   node scripts/lint-gm-writes.js --update   # 重写基线（还清欠账后跑这个落新账）
//   node scripts/lint-gm-writes.js --top 20   # 顺带列直写最多的前 N 个文件
//
// 基线：scripts/arch-baselines/gm-writes.json
//   { "config": { "owners": [...] }, "files": { "tm-xxx.js": {"gm": 12, "p": 0}, ... } }
//   owners = 被裁定为「写口」的文件（ledger/mutator 本体），允许增长不报错。

'use strict';

const lib = require('./lib-arch-guard');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(lib.BASELINE_DIR, 'gm-writes.json');
const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const topIdx = args.indexOf('--top');
const TOP_N = topIdx !== -1 ? parseInt(args[topIdx + 1], 10) || 10 : 0;

// 写模式（对某单例根 sym 生成一组正则·capture[1]=被写子树根，动态下标归 <dynamic>）
const MUTATORS = 'push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|set|add|delete|clear';
function writePatterns(sym) {
  const TAIL = String.raw`(?:\.[\w$]+|\[[^\]\n]+\])*`;
  return [
    // 赋值/复合赋值：排除 == === => >= <= !=（后三者 = 前有别的字符，天然不匹配）
    { re: new RegExp(String.raw`\b` + sym + String.raw`\.([\w$]+)` + TAIL + String.raw`\s*(?:=(?![=>])|[+\-*/%&|^]=|\+\+|--)`) },
    { re: new RegExp(String.raw`\b` + sym + String.raw`\[[^\]\n]+\]` + TAIL + String.raw`\s*(?:=(?![=>])|[+\-*/%&|^]=|\+\+|--)`), dyn: true },
    { re: new RegExp(String.raw`\bdelete\s+` + sym + String.raw`\.([\w$]+)`) },
    { re: new RegExp(String.raw`\bdelete\s+` + sym + String.raw`\[`), dyn: true },
    { re: new RegExp(String.raw`\b` + sym + String.raw`\.([\w$]+)` + TAIL + String.raw`\.(?:` + MUTATORS + String.raw`)\s*\(`) },
    { re: new RegExp(String.raw`\b` + sym + String.raw`\[[^\]\n]+\]` + TAIL + String.raw`\.(?:` + MUTATORS + String.raw`)\s*\(`), dyn: true },
    { re: new RegExp(String.raw`\bObject\.assign\(\s*` + sym + String.raw`\.([\w$]+)`) },
    { re: new RegExp(String.raw`\bObject\.assign\(\s*` + sym + String.raw`\s*[,)]`), dyn: true, rootLevel: true }
  ];
}

const GM_PATTERNS = writePatterns('GM');
const P_PATTERNS = writePatterns('P');

// 返回 { gm, p, roots: { 'gm:minxin': n, 'p:<dynamic>': n, ... } }
// gm/p 计数单位=行（与首版基线一致）；roots 记录该行写到的每棵子树
function countWrites(absFile) {
  const lines = fs.readFileSync(absFile, 'utf8').split(/\r?\n/);
  const out = { gm: 0, p: 0, roots: {} };
  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    if (lib.hasArchOkMarker(raw)) continue;
    const line = lib.stripLineComment(raw);
    for (const [kind, patterns] of [['gm', GM_PATTERNS], ['p', P_PATTERNS]]) {
      const hitRoots = new Set();
      for (const pat of patterns) {
        const m = line.match(pat.re);
        if (!m) continue;
        hitRoots.add(pat.rootLevel ? '<root-level>' : pat.dyn ? '<dynamic>' : m[1]);
      }
      if (hitRoots.size) {
        out[kind]++;
        for (const r of hitRoots) {
          const key = kind + ':' + r;
          out.roots[key] = (out.roots[key] || 0) + 1;
        }
      }
    }
  }
  return out;
}

const files = lib.runtimeCodeFiles();
const current = {};
let totalGm = 0, totalP = 0;
for (const f of files) {
  const c = countWrites(f.abs);
  if (c.gm || c.p) current[f.src] = c;
  totalGm += c.gm; totalP += c.p;
}

// 子树权属矩阵：root → { file: 写行数 }
function subtreeMatrix(filesMap) {
  const m = {};
  for (const [src, c] of Object.entries(filesMap)) {
    for (const [key, n] of Object.entries(c.roots || {})) {
      if (!m[key]) m[key] = {};
      m[key][src] = n;
    }
  }
  return m;
}
const matrix = subtreeMatrix(current);
const staticRoots = Object.keys(matrix).filter(k => !k.includes('<'));
const singleOwner = staticRoots.filter(k => Object.keys(matrix[k]).length === 1);

console.log(`[lint-gm-writes] 运行时代码 ${files.length} 文件 · GM直写 ${totalGm} 处 / ${Object.keys(current).length} 文件 · P直写 ${totalP} 处 · 子树 ${staticRoots.length} 棵(单写主 ${singleOwner.length})`);

if (args.includes('--subtrees')) {
  const contested = staticRoots.filter(k => Object.keys(matrix[k]).length > 1)
    .sort((a, b) => Object.keys(matrix[b]).length - Object.keys(matrix[a]).length);
  console.log(`\n--- 争抢子树（多写手·前 20）---`);
  for (const k of contested.slice(0, 20)) {
    const writers = Object.entries(matrix[k]).sort((a, b) => b[1] - a[1]);
    console.log(`  ${k}  ${writers.length} 写手 · ${writers.reduce((s, w) => s + w[1], 0)} 行`);
    writers.slice(0, 5).forEach(([f, n]) => console.log(`      ${String(n).padStart(4)}  ${f}`));
    if (writers.length > 5) console.log(`      …等 ${writers.length} 个写手`);
  }
  console.log(`\n--- 单写主子树（已由棘轮锁死·${singleOwner.length} 棵）---`);
  singleOwner.sort().forEach(k => console.log(`  ${k} ← ${Object.keys(matrix[k])[0]}`));
}

if (TOP_N) {
  const top = Object.entries(current).sort((a, b) => (b[1].gm + b[1].p) - (a[1].gm + a[1].p)).slice(0, TOP_N);
  console.log(`--- 直写 Top ${TOP_N} ---`);
  for (const [src, c] of top) console.log(`  ${String(c.gm + c.p).padStart(5)}  ${src}  (gm:${c.gm} p:${c.p})`);
}

if (UPDATE) {
  const prev = lib.loadJSON(BASELINE_FILE, { config: { owners: [] } });
  lib.saveJSON(BASELINE_FILE, { config: prev.config || { owners: [] }, updatedAt: new Date().toISOString(), totals: { gm: totalGm, p: totalP }, files: current });
  console.log(`[lint-gm-writes] 基线已更新 → ${lib.rel(BASELINE_FILE)}`);
  process.exit(0);
}

const baseline = lib.loadJSON(BASELINE_FILE, null);
if (!baseline) {
  console.error('[lint-gm-writes] 无基线。先跑: node scripts/lint-gm-writes.js --update');
  process.exit(1);
}

const owners = new Set((baseline.config && baseline.config.owners) || []);
const baseMatrix = subtreeMatrix(baseline.files || {});
const violations = [];
for (const [src, c] of Object.entries(current)) {
  if (owners.has(src)) continue;
  const base = baseline.files[src] || { gm: 0, p: 0 };
  if (c.gm > base.gm) violations.push(`${src}: GM直写 ${base.gm} → ${c.gm}（+${c.gm - base.gm}）`);
  if (c.p > base.p) violations.push(`${src}: P直写 ${base.p} → ${c.p}（+${c.p - base.p}）`);
  // 子树写主固化：基线里该子树的写手名单即权属·非写手闯入即红（动态下标归总量棘轮管）
  for (const key of Object.keys(c.roots || {})) {
    if (key.includes('<')) continue;
    const baseWriters = baseMatrix[key];
    if (!baseWriters) {
      violations.push(`${src}: 新开子树 ${key} ——新 GM/P 顶层子树须显式裁定（谁是写主？走 --update 落权属）`);
    } else if (!(src in baseWriters)) {
      violations.push(`${src}: 闯入子树 ${key}（既有写手: ${Object.keys(baseWriters).slice(0, 4).join(', ')}${Object.keys(baseWriters).length > 4 ? '…' : ''}）——写走该子树写主的入口`);
    }
  }
}

if (violations.length) {
  console.error(`\n[lint-gm-writes] FAIL — ${violations.length} 处超基线（读随便，写走账）：`);
  for (const v of violations) console.error('  ' + v);
  console.error('\n处置三选一：① 改走该子系统 mutator/ledger 入口 ② 确属写口本体 → 文件登记进基线 config.owners');
  console.error('③ 确经裁定的合法直写 → 该行加 // arch-ok 注释。都不是 → 别直写。');
  process.exit(1);
}

// 有文件降了 → 提示可以收紧基线
let improved = 0;
for (const [src, base] of Object.entries(baseline.files || {})) {
  const c = current[src] || { gm: 0, p: 0 };
  if (c.gm < base.gm || c.p < base.p) improved++;
}
console.log(`[lint-gm-writes] PASS${improved ? `（${improved} 个文件已还账，可跑 --update 收紧基线）` : ''}`);
process.exit(0);
