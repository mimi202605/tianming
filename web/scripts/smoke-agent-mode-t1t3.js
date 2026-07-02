#!/usr/bin/env node
/* eslint-env node */
'use strict';
/* smoke-agent-mode-t1t3 — 回合推演 agent·审计①②⑤三刀防回归 (2026-07-03)
 * T1 基线预算护栏：baseTranscript(basis+记忆卷宗)按 getPromptBudget 收敛·超预算先砍记忆尾再砍 basis 尾·
 *    系统词/玩家操作/时间不动·收敛记 state.promptTrim + console.warn。
 * T2 模型分工修正：史记三连发(纲要/主体/后人戏说)=玩家逐字读的质量命门 → _narrTier() 默认 primary
 *    (P.conf.agentNarrativeTier 可改)；机械活(动作脚手架/冷门二分类)→ secondary(未配自动回落 primary)。
 * T3 认知死路径：deepen_cognition 此前不在 auto-suite 也不在循环工具 → agent 模式永不触发；
 *    现挂 suite + _gateDim 门控 relations(死维度不空转)。
 */
const fs = require('fs');
const path = require('path');
let pass = 0;
function ok(cond, msg) { if (!cond) { console.error('  ✗ FAIL: ' + msg); process.exit(1); } pass++; console.log('  ✓ ' + msg); }

const mode = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-agent-mode.js'), 'utf8');
const depth = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-agent-depth-tools.js'), 'utf8');

console.log('— T1 基线预算护栏 —');
ok(/function _assembleBase\(\)/.test(mode) && /_bParts = \{ sys: _buildSystemPrompt\(\)/.test(mode), 'T1 基线组装抽成可重拼份件');
ok(/getPromptBudget\(\)/.test(mode) && /_bgT\.budget \* 0\.9/.test(mode), 'T1 按 getPromptBudget 的 90% 设上限');
ok(/_bParts\.mem = _bParts\.mem\.slice/.test(mode) && /_bParts\.basis = _bParts\.basis\.slice/.test(mode), 'T1 超预算先砍记忆卷宗尾再砍 basis 尾');
ok(!/_bParts\.sys = _bParts\.sys\.slice/.test(mode) && !/_bParts\.ops = _bParts\.ops\.slice/.test(mode), 'T1 系统词/玩家操作不动(推演命门)');
ok(/state\.promptTrim = \{ from: _est0, to: _est1/.test(mode) && /超上下文预算已截·后续细节可用读工具按需查/.test(mode), 'T1 收敛留痕 state.promptTrim+截断标记引导读工具');
ok(/T1 预算护栏异常\(不阻断\)/.test(mode), 'T1 护栏自身异常不阻断回合');

console.log('— T2 模型分工修正 —');
ok(/function _narrTier\(\)/.test(depth) && /pc\.agentNarrativeTier \|\| 'primary'/.test(depth), 'T2 史记档位 _narrTier 默认 primary·可配');
const narrSites = (depth.match(/_narrTier\(\)/g) || []).length;
ok(narrSites >= 4, 'T2 史记三连发(纲要/主体/后人戏说)全走 _narrTier(实 ' + (narrSites - 1) + ' 站)');
ok(!/_tokRecord, null, 'secondary'/.test(depth) && !/_tokHouren, null, 'secondary'/.test(depth), 'T2 史记不再写死 secondary');
ok(/600, null, 'secondary',[^\n]*agent_anomaly_scan/.test(mode), 'T2 冷门二分类下 secondary');
ok(/2800, null, 'secondary'\);\s+\/\* T2/.test(mode), 'T2 动作脚手架下 secondary');

console.log('— T3 认知死路径补挂 —');
ok(/_suite = \['recall_consolidate'[^\]]*'deepen_cognition'[^\]]*'deepen_narrative'\]/.test(mode), 'T3 deepen_cognition 入 auto-suite(narrative 之前)');
ok(/deepen_cognition: 'relations'/.test(mode), 'T3 门控 relations 维度(死维度不空转)');
ok(/case 'deepen_cognition':\s+return _wrap/.test(depth), 'T3 深化派发表本就有 case(实现在位·只是没挂)');

console.log('\nPASS · ' + pass + ' 断言');
