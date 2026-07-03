// scripts/lib-arch-guard.js — 架构守卫共享库（2026-07-04 架构四刀）
//
// 唯一真相源：web/index.html 实际挂载的 <script src> 清单 = 游戏运行时代码集。
// 三个 lint（gm-writes / dep-graph / file-size）都从这里取文件集，
// 保证「守卫看到的」和「浏览器加载的」永远一致。
//
// 纯工具库，无副作用，被 lint-gm-writes.js / lint-dep-graph.js / lint-file-size.js require。

'use strict';

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');
const BASELINE_DIR = path.join(__dirname, 'arch-baselines');
const REPORT_DIR = path.join(WEB_ROOT, 'dev-tools', 'arch-guard');

// 数据/第三方文件：在运行时清单里但不算「代码」，三个 lint 都跳过
const DATA_SRC_RE = /(vendor\/|libs\/|\bdata\/|scenarios\/|bundle|snapshot|preview-data|\.min\.js)/i;

/** 解析 index.html 的 <script src> 清单（按出现顺序） */
function parseIndexScripts(indexHtmlPath) {
  const htmlPath = indexHtmlPath || path.join(WEB_ROOT, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const re = /<script\s+[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].replace(/^\.\//, '');
    if (/^https?:/.test(src) || src.startsWith('//')) continue;
    if (seen.has(src)) continue;
    seen.add(src);
    const abs = path.join(WEB_ROOT, src);
    out.push({ src, abs, isData: DATA_SRC_RE.test(src), exists: fs.existsSync(abs) });
  }
  return out;
}

/** 运行时「代码」文件集：清单里存在的、非数据的 .js */
function runtimeCodeFiles(indexHtmlPath) {
  return parseIndexScripts(indexHtmlPath).filter(f => f.exists && !f.isData && /\.js$/.test(f.src));
}

function isCommentLine(line) {
  const s = line.trim();
  return s === '' || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('*/');
}

/** 剥掉行尾 // 注释（保守：'//' 前是 ':' 视为 URL 不剥） */
function stripLineComment(line) {
  let i = 0;
  while ((i = line.indexOf('//', i)) !== -1) {
    if (i > 0 && line[i - 1] === ':') { i += 2; continue; }
    return line.slice(0, i);
  }
  return line;
}

/** 行内豁免标记：行里带 arch-ok 注释则不计数（用于确经裁定的合法直写） */
function hasArchOkMarker(rawLine) {
  return rawLine.indexOf('arch-ok') !== -1;
}

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function saveJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function rel(file) {
  return path.relative(WEB_ROOT, file).replace(/\\/g, '/');
}

module.exports = {
  WEB_ROOT, BASELINE_DIR, REPORT_DIR,
  parseIndexScripts, runtimeCodeFiles,
  isCommentLine, stripLineComment, hasArchOkMarker,
  loadJSON, saveJSON, rel
};
