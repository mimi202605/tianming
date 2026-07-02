#!/usr/bin/env node
'use strict';
/* smoke-memory-pipeline-continuity — 回合末记忆管线连续性 (2026-07-02)
 * sc25c(scTac 战术/scStr 战略双调用):此前看不见自己上回合的产出——伏笔只种不回收还重复种、
 *   state_board 悬念每回合失忆重写、consolidated 每次从零写。注入四样自持上下文。
 * sc19(新实体丰化):输出预算固定 3000 token·实体一多必截断→parse 失败→丰化恒失败。
 *   改单次上限(角色6/势力3/党派2/阶层2·余者留在3回合重试窗)+预算随实体数伸缩。
 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(cond, msg) { if (cond) { A++; console.log('  ✓ ' + msg); } else { F++; console.log('  ✗ ' + msg); } }

const src = fs.readFileSync(path.join(W, 'tm-endturn-followup.js'), 'utf8');

// ── sc25c 记忆连续性 ──
const sc25cStart = src.indexOf("_queuePostTurnSubcall('sc25c'");
const tpTacIdx = src.indexOf('var tpTac = ');
ok(sc25cStart > 0 && tpTacIdx > sc25cStart, '锚点:sc25c 块与 tpTac 定位');
const ctxRegion = src.slice(sc25cStart, tpTacIdx);
ok(ctxRegion.indexOf('未了伏笔(immediate_foreshadow 应优先推进/回收这些·勿另种同义新伏笔)') >= 0, '① 未了伏笔注入(种→回收闭环)');
ok(/f && f\.type !== 'compressed'/.test(ctxRegion) && /slice\(-6\)/.test(ctxRegion), '① 伏笔取未压缩尾6条');
ok(ctxRegion.indexOf('上回合状态板(仍未了的延续进新 state_board·已了结的不再列)') >= 0, '② 上回合 open_loops/未兑现延续注入');
ok(ctxRegion.indexOf('上次跨回合综述(在此基础上滚动更新·非从零重写)') >= 0, '③ consolidated 滚动续写注入');
ok(/WorldDigest\.promptBlock\(GM, \{ turnsBack: 1 \}\)/.test(ctxRegion), '④ W1 因果综述注入 sc25c');
ok(ctxRegion.indexOf('_ctx25c +=') >= 0 && tpTacIdx > sc25cStart, '注入全在 _ctx25c(tactical/strategic 双 prompt 共享)');

// ── sc25c 既有修缮不回归(M1/M2/M3 死功能修) ──
ok(src.indexOf("MemTables.editorWrite('imperialEdict', 'insert'") >= 0, '回归:M1 皇命候选自动核议仍在');
ok(/GM\._aiMemory\.push\(\{ turn: _ptT25c/.test(src), '回归:M2 turn_memory→_aiMemory 仍在');
ok(src.indexOf("MemTables.getSheet('eventHistory')") >= 0, '回归:M3b event_weights 回写仍在');
ok(/_sc25cAlias: true/.test(src), '回归:M3a subcall25 alias .memory 仍在');

// ── sc19 丰化 ──
ok(/_sparseChars = _sparseChars\.slice\(0, 6\);/.test(src) && /_sparseFacs = _sparseFacs\.slice\(0, 3\);/.test(src)
  && /_sparseParties = _sparseParties\.slice\(0, 2\);/.test(src) && /_sparseClasses = _sparseClasses\.slice\(0, 2\);/.test(src),
  '⑤ sc19 单次上限 角色6/势力3/党派2/阶层2(余者留重试窗)');
ok(/max_tokens: _tok\(Math\.min\(6000, 1500 \+ _totalSparse \* 450\)\)/.test(src), '⑤ sc19 输出预算随实体数伸缩(原固定3000)');
const sc19Region = src.slice(src.indexOf("_runSubcall('sc19'"), src.indexOf("_queuePostTurnSubcall('sc25c'"));
ok(sc19Region.length > 1000 && sc19Region.indexOf('max_tokens: _tok(3000)') < 0, '⑤ sc19 块内旧固定预算已除(sc_audit/sc27 的 _tok(3000) 是各自合法预算不误伤)');

// 上限须在 _totalSparse 计算前(否则预算按未裁数算)
const capIdx = src.indexOf('_sparseChars = _sparseChars.slice(0, 6);');
const totalIdx = src.indexOf('var _totalSparse = _sparseFacs.length');
ok(capIdx > 0 && totalIdx > capIdx, '⑤ 上限裁剪先于 _totalSparse 计算(预算按裁后实数)');

console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
process.exit(F === 0 ? 0 : 1);
