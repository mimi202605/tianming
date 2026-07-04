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
// v3(2026-07-04)：sym 前置 (?<![\w$.]) 负回顾——防 `cfg.g.x=` 误认短别名 g、也治 `foo.GM.x=` 老误报
const MUTATORS = 'push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin|set|add|delete|clear';
function writePatterns(sym, fixedRoot) {
  const TAIL = String.raw`(?:\.[\w$]+|\[[^\]\n]+\])*`;
  const S = String.raw`(?<![\w$.])` + sym;
  return [
    // 赋值/复合赋值：排除 == === => >= <= !=（后三者 = 前有别的字符，天然不匹配）
    { re: new RegExp(S + String.raw`\.([\w$]+)` + TAIL + String.raw`\s*(?:=(?![=>])|[+\-*/%&|^]=|\+\+|--)`), fixedRoot },
    { re: new RegExp(S + String.raw`\[[^\]\n]+\]` + TAIL + String.raw`\s*(?:=(?![=>])|[+\-*/%&|^]=|\+\+|--)`), dyn: true, fixedRoot },
    { re: new RegExp(String.raw`\bdelete\s+` + sym + String.raw`\.([\w$]+)`), fixedRoot },
    { re: new RegExp(String.raw`\bdelete\s+` + sym + String.raw`\[`), dyn: true, fixedRoot },
    { re: new RegExp(S + String.raw`\.([\w$]+)` + TAIL + String.raw`\.(?:` + MUTATORS + String.raw`)\s*\(`), fixedRoot },
    { re: new RegExp(S + String.raw`\[[^\]\n]+\]` + TAIL + String.raw`\.(?:` + MUTATORS + String.raw`)\s*\(`), dyn: true, fixedRoot },
    { re: new RegExp(String.raw`\bObject\.assign\(\s*` + sym + String.raw`\.([\w$]+)`), fixedRoot },
    { re: new RegExp(String.raw`\bObject\.assign\(\s*` + sym + String.raw`\s*[,)]`), dyn: true, rootLevel: true, fixedRoot }
  ];
}

const GM_PATTERNS = writePatterns('GM');
const P_PATTERNS = writePatterns('P');

// ── v3·别名写探测（2026-07-04·审查定罪的守卫盲区：_adjAuthority 用 var G=global.GM 间接写
//    trueIndex·31 处调用点的蒸发 bug 在正则棘轮眼皮下活了数月）──
// 识别两类且仅两类（宁缺勿噪·元素别名 var ch=GM.chars[i] 明确不追）：
//   ① 全量别名  var G = GM | global.GM | window.GM | root.GM | <工厂>()   → 写经 G 同 GM 计
//   ② 子树别名  var g = GM.guoku | G.guoku（G 为已识别全量别名·RHS 单层成员·无下标） → 写经 g 计入 gm:guoku
// 工厂名单在基线 config.gmFactories / config.pFactories（默认 getGame → GM）。
const ESC = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RESERVED = new Set(['GM', 'P', 'TM', 'window', 'global', 'globalThis', 'root', 'self', 'this']);

function collectAliases(lines, gmFactories, pFactories) {
  const whole = {}; // aliasName -> 'gm' | 'p'
  const sub = {};   // aliasName -> { kind:'gm'|'p', root:'guoku' }
  const gmFact = gmFactories.map(f => ESC(f) + String.raw`\s*\(`).join('|');
  const pFact = pFactories.map(f => ESC(f) + String.raw`\s*\(`).join('|');
  const wholeRe = new RegExp(
    String.raw`\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:` +
    String.raw`(?:(?:globalThis|global|window|root)\.)?(GM|P)\b(?!\s*[.\[])` +
    (gmFact ? String.raw`|(` + gmFact + String.raw`)` : '') +
    (pFact ? String.raw`|(` + pFact + String.raw`)` : '') +
    String.raw`)`, 'g');
  const subReSrc = kindSyms => new RegExp(
    String.raw`\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(?:globalThis|global|window|root)\.)?(` +
    kindSyms + String.raw`)\.([\w$]+)\s*(?:;|,|\)|\|\||$)`, 'g');
  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    const line = lib.stripLineComment(raw);
    let m;
    wholeRe.lastIndex = 0;
    while ((m = wholeRe.exec(line))) {
      const name = m[1];
      if (RESERVED.has(name)) continue;
      whole[name] = m[2] === 'P' ? 'p' : (m[2] === 'GM' || m[3]) ? 'gm' : 'p';
    }
  }
  // 子树别名第二遍：源可以是 GM/P 本体，也可以是已识别的全量别名
  const wholeNames = Object.keys(whole);
  const symAlt = ['GM', 'P'].concat(wholeNames.map(ESC)).join('|');
  const subRe = subReSrc(symAlt);
  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    const line = lib.stripLineComment(raw);
    let m;
    subRe.lastIndex = 0;
    while ((m = subRe.exec(line))) {
      const name = m[1], srcSym = m[2], root = m[3];
      if (RESERVED.has(name) || whole[name]) continue;
      const kind = srcSym === 'GM' ? 'gm' : srcSym === 'P' ? 'p' : whole[srcSym];
      if (!kind) continue;
      sub[name] = { kind, root };
    }
  }
  return { whole, sub };
}

// 返回 { gm, p, roots: { 'gm:minxin': n, 'p:<dynamic>': n, ... } }
// gm/p 计数单位=行（与首版基线一致）；roots 记录该行写到的每棵子树
function countWrites(absFile, gmFactories, pFactories) {
  const lines = fs.readFileSync(absFile, 'utf8').split(/\r?\n/);
  const aliases = collectAliases(lines, gmFactories, pFactories);
  // 按 kind 组装模式：本体 + 全量别名（root 取 capture）+ 子树别名（root 固定）
  const kindPatterns = { gm: GM_PATTERNS.slice(), p: P_PATTERNS.slice() };
  for (const [name, kind] of Object.entries(aliases.whole)) kindPatterns[kind] = kindPatterns[kind].concat(writePatterns(ESC(name)));
  for (const [name, info] of Object.entries(aliases.sub)) kindPatterns[info.kind] = kindPatterns[info.kind].concat(writePatterns(ESC(name), info.root));
  const out = { gm: 0, p: 0, roots: {} };
  for (const raw of lines) {
    if (lib.isCommentLine(raw)) continue;
    if (lib.hasArchOkMarker(raw)) continue;
    const line = lib.stripLineComment(raw);
    for (const kind of ['gm', 'p']) {
      const hitRoots = new Set();
      for (const pat of kindPatterns[kind]) {
        const m = line.match(pat.re);
        if (!m) continue;
        hitRoots.add(pat.fixedRoot || (pat.rootLevel ? '<root-level>' : pat.dyn ? '<dynamic>' : m[1]));
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

const _cfgBase = lib.loadJSON(BASELINE_FILE, null);
const GM_FACTORIES = (_cfgBase && _cfgBase.config && _cfgBase.config.gmFactories) || ['getGame'];
const P_FACTORIES = (_cfgBase && _cfgBase.config && _cfgBase.config.pFactories) || [];

const files = lib.runtimeCodeFiles();
const current = {};
let totalGm = 0, totalP = 0;
for (const f of files) {
  const c = countWrites(f.abs, GM_FACTORIES, P_FACTORIES);
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
  const cfg = prev.config || {};
  if (!cfg.owners) cfg.owners = [];
  if (!cfg.gmFactories) cfg.gmFactories = ['getGame'];
  if (!cfg.pFactories) cfg.pFactories = [];
  lib.saveJSON(BASELINE_FILE, { config: cfg, updatedAt: new Date().toISOString(), totals: { gm: totalGm, p: totalP }, files: current });
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
