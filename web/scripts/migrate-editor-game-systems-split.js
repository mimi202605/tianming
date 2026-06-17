#!/usr/bin/env node
// scripts/migrate-editor-game-systems-split.js — Phase 3 one-time
//
// Split editor-game-systems.js (2449 行·18 sub-section) → 14 contiguous editor-form-*.js
// 见 web/docs/editor-game-systems-audit.md §1 + §2
//
// Strategy:
//   - read source·extract each sub-section by line range
//   - prepend 12-field head + (no IIFE wrapper·preserve original floating functions)
//   - write 14 files·editor-form-NAME.js
//
// Does NOT touch editor.html / delete source·留给手动·下个 round
//
// Usage·node scripts/migrate-editor-game-systems-split.js

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'editor-game-systems.js');

const content = fs.readFileSync(SOURCE, 'utf8');
const lines = content.split('\n');

// 14 sub-files·按 audit doc §2 (合理合并 sub-section)·all contiguous
const SUB_FILES = [
  { name: 'editor-form-shared-utils',     domain: '通用 cost/effect rows', start: 1,    end: 72,   note: '_costRow / _effectRow / _addCost/_addEffect / _collectCosts/_collectEffects (跨 form 共用·必先 load)' },
  { name: 'editor-form-tech-civic',       domain: '科技 + 民政 form',       start: 73,   end: 198,  note: '§1 rest + §2·tech military/civil + civic·依赖 shared-utils' },
  { name: 'editor-form-variables',        domain: '变量 form (base/other/formula)', start: 199,  end: 498,  note: '§3·变量 3 类编辑' },
  { name: 'editor-form-rules',            domain: '规则 form',              start: 499,  end: 535,  note: '§4·renderRules / updateRule' },
  { name: 'editor-form-events',           domain: '事件 form (5 类)',       start: 536,  end: 708,  note: '§5·renderEvents / addEvent' },
  { name: 'editor-form-timeline',         domain: '时间线 form (past/future)', start: 709,  end: 794,  note: '§6·renderTimeline / _buildTimelineForm / addTimeline' },
  { name: 'editor-form-goals',            domain: '目标 Goals form',        start: 795,  end: 879,  note: '§7·render/add/edit/deleteGoals + aiGenerateGoals' },
  { name: 'editor-form-edicts',           domain: '帝王诏令 form',          start: 880,  end: 948,  note: '§8·render/add/edit/deleteImperialEdictEntry' },
  { name: 'editor-form-offend-influence', domain: '触怒 + 影响力集团 form', start: 950,  end: 1146, note: '§9 + §10·OffendGroups + InfluenceGroups' },
  { name: 'editor-form-harem-palace',     domain: '后宫 + 宫殿 form',       start: 1147, end: 1696, note: '§11 + §12·_haremRankModal / _palaceModal' },
  { name: 'editor-form-contradictions',   domain: '显著矛盾 form (黑格尔)', start: 1697, end: 1849, note: '§13·renderContradictions / addContradiction / etc' },
  { name: 'editor-form-war-config',       domain: '战争法则 form (warConfig)', start: 1850, end: 1977, note: '§14·renderWarConfig / addWarCB / editWarCB·casus belli' },
  { name: 'editor-form-init-relations',   domain: '初始恩怨/门生 form',     start: 1978, end: 2052, note: '§15·renderInitialEnYuan / addInitialPatron·游戏开始时加载到关系' },
  { name: 'editor-form-admin-npc',        domain: '行政层级 + NPC 行为模板 form', start: 2053, end: 2136, note: '§16·renderAdminConfig·tier 权力规则·+ §17·renderNpcBehaviors' },
  { name: 'editor-form-prompts-mechanics',domain: 'Prompt + mechanicsConfig editor', start: 2137, end: 2449, note: '§18·openPromptOverridesEditor + openMechanicsConfigEditor + 6 _mc* sub' }
];

// 注·SUB_FILES has 15 entries actually·我 incorrectly counted·让 me check
// 1·shared-utils
// 2·tech-civic
// 3·variables
// 4·rules
// 5·events
// 6·timeline
// 7·goals
// 8·edicts
// 9·offend-influence
// 10·harem-palace
// 11·contradictions
// 12·war-admin
// 13·init-relations
// 14·npc-behaviors
// 15·prompts-mechanics

// 实际 15 文件·包含 init-relations·因 §15 in middle of audit doc
// audit doc §2 有 13 entries·把 §9+§10+§15 合 1·我这里拆为·offend-influence (§9+§10) + init-relations (§15)·
// 因 §15 (1978-2052) 与 §9/§10 (950-1146) non-contiguous·**single file 跨 1000 行 gap 不可**

// note·init-relations §15 实际是 NPC 关系 init·理论与 §9/§10 同 domain·但 line 远·不易合 single file
// → keep separate·**total 15 files** (修正 audit doc §2 的 13 → 15)

// gap detection·每个 file 之间是否 gap (e.g., line 199-535 vs 536·all contiguous)
// gap exist·
//   between §10 end (1146) and §11 start (1147)·gap 0 (contiguous·OK)
//   between §11 end (1424) and §12 start (1425)·gap 0
//   between §12 end (1696) and §13 start (1697)·gap 0
//   between §13 end (1849) and §14 start (1850)·gap 0
//   between §14 end (1977) and §15 start (1978)·gap 0
//   between §15 end (2052) and §16 start (2053)·gap 0
//   between §16 end (2085) and §17 start (2086)·gap 0
//   between §17 end (2136) and §18 start (2137)·gap 0
//   between §8 end (948) and §9 start (950)·gap 1 (line 949 是 sep)
// All clean·proceed

let totalLines = 0;
const written = [];

SUB_FILES.forEach(s => {
  const segLines = lines.slice(s.start - 1, s.end);
  const segContent = segLines.join('\n');
  const fileName = `${s.name}.js`;
  const fileContent = `// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// Module: ${fileName}
// Domain: Editor / ${s.domain}
// 来源: ${s.note}
// (Phase 3 split·from editor-game-systems.js·14 sub-files·见 editor-game-systems-audit.md)
//
// Owns:
//   - 本 sub-section 表单·DOM 渲染·添加 / 编辑 / 删除·与 scriptData.X 绑定
// Does not own:
//   - 其他 form (见同级 editor-form-*.js)
//   - 通用 cost/effect rows (→ editor-form-shared-utils.js·必先 load)
//   - 游戏 runtime (→ tm-* 文件)
// Public API:
//   - global·window 全局函数 (editor.html 事件直调)
// Depends on:
//   - global scriptData (editor-core.js)
//   - editor-form-shared-utils.js (若用 _costRow/_effectRow)
//   - escHtml / autoSave
// Used by:
//   - editor.html (script tag)
// Tests:
//   - syntax-check (verify-all)
// Refactor notes:
//   - Phase 3 split done·原 editor-game-systems.js (2449 行·18 sub-section·实拆 15) → 15 文件
//   - Phase 5 namespace·TM.Editor.Form.${s.name.replace(/^editor-form-/, '').replace(/-/g, '.')}
// ============================================================

${segContent}
`;
  fs.writeFileSync(path.join(ROOT, fileName), fileContent);
  totalLines += segLines.length;
  written.push({ name: fileName, lines: segLines.length });
  console.log('written: ' + fileName + ' (' + segLines.length + ' content lines)');
});

console.log('');
console.log('done·' + SUB_FILES.length + ' editor-form files written');
console.log('total content lines·' + totalLines + ' (original 2449·diff ' + (totalLines - 2449) + '·若 negative·有 gap;若 0·perfect)');
console.log('next: update editor.html script tags·delete original·verify-all');
