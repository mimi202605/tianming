#!/usr/bin/env node
// scripts/lint-transmigration-isolation.js — 穿越模式 UI 隔离守卫（守卫 9 · 阶段 5.1）
//
// 背景：阶段 1-4 重建穿越专属 shell/rail/map 时·已用 body class 互斥 + 独立 SVG 渲染
//   保证穿越模式不污染皇帝御案 UI。但代码层面若有人手抖调了皇帝御案渲染函数·
//   会让穿越模式崩溃时降级到皇帝界面（违反 spec §1.2 铁律「绝不降级到皇帝界面」）。
//   本守卫把这条纪律自动化。
//
// 规则：tm-player-shell.js / tm-player-rail.js / tm-player-map.js 中
//   不允许出现对以下函数的**实际调用**（注释/字符串字面量允许）：
//     - renderEmperorState(
//     - TMPhase8FormalBridge.<method>(  （任何方法调用·含 refresh）
//   实际调用 = 非注释行内出现 `<name>(` 模式·且该行不以 `//` 或 `*` 开头
// 用法：node scripts/lint-transmigration-isolation.js

'use strict';

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');

// 守卫目标：穿越专属 shell 三件套
const TARGETS = [
  'tm-player-shell.js',
  'tm-player-rail.js',
  'tm-player-map.js'
];

// 拦截模式：实际调用 renderEmperorState( 或 TMPhase8FormalBridge.<method>(
// 注：用 \s*\(\s* 匹配调用括号·避免误判字符串字面量 "renderEmperorState"（无括号）
const PATTERNS = [
  { re: /\brenderEmperorState\s*\(/g, name: 'renderEmperorState(' },
  { re: /\bTMPhase8FormalBridge\s*\.\s*\w+\s*\(/g, name: 'TMPhase8FormalBridge.<method>(' }
];

function isCommentLine(line) {
  const s = line.trim();
  return s === '' || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('*/');
}

// 剥掉行尾 // 注释（保守：'//' 前是 ':' 视为 URL 不剥·与 lib-arch-guard 同法）
function stripTrailingComment(line) {
  const i = line.indexOf('//');
  if (i < 0) return line;
  const before = line.slice(0, i);
  if (/\:$/.test(before)) return line;  // URL·不剥
  return before;
}

const violations = [];
for (const name of TARGETS) {
  const abs = path.join(WEB_ROOT, name);
  if (!fs.existsSync(abs)) {
    violations.push({ file: name, line: 0, text: '文件不存在', match: '(missing)' });
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (isCommentLine(raw)) continue;  // 整行注释·跳过
    const code = stripTrailingComment(raw);
    for (const p of PATTERNS) {
      p.re.lastIndex = 0;
      const m = p.re.exec(code);
      if (m) {
        violations.push({
          file: name,
          line: i + 1,
          text: raw.trim(),
          match: m[0]
        });
      }
    }
  }
}

if (violations.length) {
  console.error(`[lint-transmigration-isolation] FAIL — ${violations.length} 处违规调用皇帝御案函数（穿越铁律·UI 隔离）：`);
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line} · 命中「${v.match}」`);
    console.error(`    > ${v.text}`);
  });
  console.error('处置：穿越专属 shell/rail/map 中如需场景数据·走 TM.PlayerSystemsAdapter 或独立 SVG 渲染·绝不调皇帝御案函数。');
  process.exit(1);
}
console.log(`[lint-transmigration-isolation] PASS · ${TARGETS.length} 个穿越专属文件未调皇帝御案函数`);
process.exit(0);
