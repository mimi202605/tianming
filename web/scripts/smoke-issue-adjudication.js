#!/usr/bin/env node
'use strict';
// smoke-issue-adjudication — 要务决断 AI 裁定(v0.2·事件并入御案时政·命门接入 currentIssues 本体)
// 静态断言重接到位:_chooseIssueOption 改 async + AI 裁定分支(固定 effect 降兜底) + edictTracker 保留。
// 行为(AI 路径/兜底/resolved)靠真机验——tm-endturn-helpers.js 依赖重,不宜 vm 全载。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ok ' + m); }
console.log('smoke-issue-adjudication');

const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-helpers.js'), 'utf8');

// ① _chooseIssueOption 改 async + AI 裁定门控
ok(/async function _chooseIssueOption/.test(src), '① _chooseIssueOption 改 async');
ok(/typeof _eventAdjudicationOn === 'function' && _eventAdjudicationOn\(\)/.test(src), '① 开关门控 _eventAdjudicationOn');
ok(/_adj = await _adjudicateIssueOutcomeViaAI\(issue, ch\)/.test(src), '① 走 AI 裁定 _adjudicateIssueOutcomeViaAI');

// ② 固定 effect 降兜底(!_adj 时才查表)
ok(/if \(!_adj && ch\.effect && typeof ch\.effect === 'object'\)/.test(src), '② 固定 effect 降兜底(!_adj·零回归)');

// ③ AI 裁定 helper:callAIWithTools → applyAITurnChanges + 国势快照 + tool
ok(/function _adjudicateIssueOutcomeViaAI/.test(src), '③ _adjudicateIssueOutcomeViaAI 定义');
ok(/callAIWithTools\(L\.join/.test(src), '③ 走 callAIWithTools');
ok(/applyAITurnChanges\(\{ narrative: narrative, changes: changes \}\)/.test(src), '③ 落地 applyAITurnChanges');
ok(/adjudicate_issue_outcome/.test(src), '③ tool schema(adjudicate_issue_outcome)');
ok(/_issueCoreStateSnapshot/.test(src) && /民心.*皇威.*皇权/.test(src), '③ 国势快照注入 prompt');
ok(/path:.*民心.*皇威.*皇权.*吏治.*国库.*内帑/.test(src), '③ path 用核心变量名(normalizeCoreVarPath 容错)');

// ④ edictTracker 长期追踪保留(未被 AI 裁定改造破坏)
ok(/GM\._edictTracker\.push/.test(src), '④ edictTracker 长期追踪保留(决断进 AI 推演)');
ok(/issue\.status = 'resolved'/.test(src), '④ 标 resolved 保留');
ok(/TM\.Chronicle\.record/.test(src), '④ 写编年保留（2026-07-04 起走 TM.Chronicle 写口）');

// ⑤ 开关默认关 = 零回归(走原固定 effect)
ok(/eventUnificationEnabled/.test(src), '⑤ 开关 eventUnificationEnabled(设置面板 toggle 复用)');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
