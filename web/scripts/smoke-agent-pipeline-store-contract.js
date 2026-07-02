#!/usr/bin/env node
'use strict';
/* smoke-agent-pipeline-store-contract — 刀F(2026-07-02):agent 深化工具与 LLM 管线共写 GM 存储的形状契约绊线
 * 背景:深化工具头部自认 prompt 是"按 scene 重述非同引用"——但真正咬人的 drift 不在 prompt 字段名
 *   (两边本就各有 schema)·而在**共写存储的形状**。实审逮到两例:
 *   ① _consolidatedMemory:管线写 {consolidated,...}·agent 写 {summary} → 跨模式互读各自扑空
 *     (管线滚动续写读 .consolidated·agent 记忆档读 .summary)。修=双键并写。
 *   ② _stateBoard:agent 版缺 expiresAt → 消费端永不过期·老悬念误导后续回合。修=补 ts/expiresAt。
 * 本 smoke = 修复验证 + 未来漂移绊线(писатели与消费者四方钉死)。
 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(cond, msg) { if (cond) { A++; console.log('  ✓ ' + msg); } else { F++; console.log('  ✗ ' + msg); } }

const depthSrc = fs.readFileSync(path.join(W, 'tm-endturn-agent-depth-tools.js'), 'utf8');
const followupSrc = fs.readFileSync(path.join(W, 'tm-endturn-followup.js'), 'utf8');
const modeSrc = fs.readFileSync(path.join(W, 'tm-endturn-agent-mode.js'), 'utf8');

// ── ① _consolidatedMemory 双键契约 ──
const agentConsWrite = depthSrc.match(/gm\._consolidatedMemory\.push\(\{[^\n]+\}\);/);
ok(!!agentConsWrite && agentConsWrite[0].indexOf('summary:') >= 0 && agentConsWrite[0].indexOf('consolidated:') >= 0,
  '① agent 写 _consolidatedMemory 双键(summary+consolidated)');
const pipeConsIdx = followupSrc.indexOf('var _payload = {');
const pipeConsBlock = followupSrc.slice(pipeConsIdx, pipeConsIdx + 700);
ok(pipeConsIdx > 0 && pipeConsBlock.indexOf('consolidated: pS.consolidated') >= 0 && pipeConsBlock.indexOf('summary: String(pS.consolidated') >= 0,
  '① 管线写 _consolidatedMemory 双键(consolidated+summary)');
// 消费者四方:管线滚动续写读 .consolidated·agent 记忆档读 .summary —— 两键都必须有人写
ok(followupSrc.indexOf('_lastCons.consolidated') >= 0, '① 消费者钉桩:管线滚动续写读 .consolidated');
ok(/_brief\(m\.summary/.test(depthSrc) || /m\.summary/.test(depthSrc), '① 消费者钉桩:agent 记忆档读 .summary');

// ── ② _stateBoard expiresAt 契约 ──
const agentSbWrite = depthSrc.match(/gm\._stateBoard = \{[^\n]+\};/);
ok(!!agentSbWrite && agentSbWrite[0].indexOf('expiresAt:') >= 0 && agentSbWrite[0].indexOf('ts:') >= 0,
  '② agent 写 _stateBoard 带 ts/expiresAt(原缺→永不过期)');
ok(/GM\._stateBoard = \{\s*\n?\s*turn: _ptT25c, ts: Date\.now\(\),\s*\n?\s*expiresAt/.test(followupSrc.replace(/\r/g, '')),
  '② 管线写 _stateBoard 带 expiresAt(两写者形状一致)');
// 两写者共同字段齐
['mood', 'open_loops', 'recent_summary', 'unfulfilled_promises'].forEach(function (k) {
  ok(agentSbWrite[0].indexOf(k) >= 0 && followupSrc.indexOf(k) >= 0, '② 状态盘共同字段「' + k + '」两侧齐');
});

// ── ③ 既有镜像契约不回归(因果链/伏笔形状兼容) ──
ok(/gm\._causalGraph\.edges\.push\(\{ id: 'e_agent_'/.test(depthSrc) && /GM\._causalGraph\.edges\.push\(\{/.test(followupSrc),
  '③ 因果链两侧写同一 edges 结构(镜像注释所锚)');
ok(/gm\._foreshadows\.push\(\{ turn: turn, content: String\(f\), priority: 'normal'/.test(depthSrc),
  '③ agent 伏笔形状(content/priority)与管线消费者兼容(type 缺省不炸 compressed 过滤)');

// ── ④ E1/E2 源契约(agent-mode) ──
ok(/state\.loopError = String\(\(loopErr && loopErr\.message\) \|\| loopErr\)\.slice\(0, 200\)/.test(modeSrc), '④ E1 循环异常留痕已接');
ok(/loopError: state\.loopError \|\| null/.test(modeSrc), '④ E1 loopError 进 _agentTurnMeta');
ok(/expectTurn: \(engineRan && typeof _turnAfterEngine === 'number'\) \? _turnAfterEngine : null/.test(modeSrc), '④ E2 收尾自检传 expectTurn 契约(实测值·不假设引擎必turn++)');
ok(/hadPlayer: snapshot \?/.test(modeSrc), '④ E2 收尾自检传 hadPlayer 契约');

console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
process.exit(F === 0 ? 0 : 1);
