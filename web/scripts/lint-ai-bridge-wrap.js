#!/usr/bin/env node
// scripts/lint-ai-bridge-wrap.js — AI 调用包装守卫（守卫 10 · 阶段 5.1）
//
// 背景：阶段 4 建立 AI 双轨入口 TM.PlayerAIBridge.invoke·带降级链（callLLM→callAI→template）
//   + 缓存 + schema 校验 + 朝代污染检查。若其他穿越模块绕过 invoke 直接调 callLLM/callAI·
//   会丢失缓存/校验/降级·并污染 invoke 的 level 标记机制（spec §5.1 铁律）。
//
// 规则：穿越专属 UI 模块（shell/rail/map/systems-ui/adapter/ui-render）中
//   不允许出现对 callLLM( / callAI( 的**实际调用**（注释/字符串字面量允许）。
//   例外：tm-player-ai-bridge.js 本身是包装器·内部允许调（不在此守卫范围）。
//   实际调用 = 非注释行内出现 `callLLM(` 或 `callAI(` 模式·且该行不以 `//` 或 `*` 开头。
// 用法：node scripts/lint-ai-bridge-wrap.js

'use strict';

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..');

// 守卫目标：穿越专属 UI 模块（不含 ai-bridge.js 本身·它是包装器）
const TARGETS = [
  'tm-player-shell.js',
  'tm-player-rail.js',
  'tm-player-map.js',
  'tm-player-systems-ui.js',
  'tm-player-systems-adapter.js',
  'tm-player-ui-render.js'
];

// 拦截模式：实际调用 callLLM( 或 callAI(
// 注：global.callLLM( / window.callAI( / this.callLLM( 等都算·用 \b 锚定词边界
const PATTERNS = [
  { re: /\bcallLLM\s*\(/g, name: 'callLLM(' },
  { re: /\bcallAI\s*\(/g, name: 'callAI(' }
];

function isCommentLine(line) {
  const s = line.trim();
  return s === '' || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('*/');
}

function stripTrailingComment(line) {
  const i = line.indexOf('//');
  if (i < 0) return line;
  const before = line.slice(0, i);
  if (/\:$/.test(before)) return line;
  return before;
}

const violations = [];
for (const name of TARGETS) {
  const abs = path.join(WEB_ROOT, name);
  if (!fs.existsSync(abs)) continue;  // 文件不存在不算违规（可能尚未创建）
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (isCommentLine(raw)) continue;
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
  console.error(`[lint-ai-bridge-wrap] FAIL — ${violations.length} 处违规直接调 callLLM/callAI（必须走 TM.PlayerAIBridge.invoke 包装）：`);
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line} · 命中「${v.match}」`);
    console.error(`    > ${v.text}`);
  });
  console.error('处置：穿越模块如需 AI 生成·走 TM.PlayerAIBridge.invoke({ scenarioKey, ctx, template })·invoke 内部带降级链/缓存/校验。');
  process.exit(1);
}
console.log(`[lint-ai-bridge-wrap] PASS · ${TARGETS.length} 个穿越 UI 模块未直接调 callLLM/callAI`);
process.exit(0);
