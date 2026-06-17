#!/usr/bin/env node
/* eslint-env node */
/*
 * smoke-fiscal-monthly-shizheng-sync.js
 * 2026-06-11·两修:
 *   ① 过回合后月入96万/月支170万·读档才正常:endturn 里 cascade 跑在 GM.turn++ 之前(_lastCascadeTurn=旧回合)·
 *      monthlySettle 在自增后跑致旧检测 _lastCascadeTurn===GM.turn 失效→落八源/八类基值覆盖显示。
 *      修=检测补 (=== GM.turn-1)·并从权威 ledger(thisTurnIn/Out ÷ mr)反算显示月入月支。
 *   ② 御案时政不受推演影响(已解决仍显示待裁·不出新议题):管线端到端都在(prompt 注入含id+指令·schema 声明·
 *      apply 消费 current_issues_update)·瓶颈=AI 把它当 advisory 省略。修=prompt 强化为「每回合必做·resolve照填id·不可省略」。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const guoku = fs.readFileSync(path.join(ROOT, 'tm-guoku-engine.js'), 'utf8');
const prompt = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');

let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); passed += 1; }

// ── ① fiscal 检测补 GM.turn-1 ────────────────────────────────────────────────
assert(/var _cascadeRanForIncome = \(GM\._lastCascadeTurn === GM\.turn\) \|\| \(GM\._lastCascadeTurn === \(GM\.turn - 1\)\)/.test(guoku),
  '_cascadeRanForIncome 须补 === GM.turn-1(治过回合后月入八源覆盖)');
assert(/var cascadeRanThisTurn = \(GM\._lastCascadeTurn === GM\.turn\) \|\| \(GM\._lastCascadeTurn === \(GM\.turn - 1\)\)/.test(guoku),
  'cascadeRanThisTurn 须补 === GM.turn-1(令余额走 cascade 真账路)');

// 从权威 ledger 反算显示
assert(/g\.monthlyIncome = Math\.round\(\(g\.ledgers\.money\.thisTurnIn \|\| 0\) \/ mr\)/.test(guoku),
  '须从 ledger.thisTurnIn/mr 反算显示月入(= cascade 真值·等价 load 后)');
assert(/g\.monthlyExpense = Math\.round\(\(g\.ledgers\.money\.thisTurnOut \|\| 0\) \/ mr\)/.test(guoku),
  '须从 ledger.thisTurnOut/mr 反算显示月支');
assert(/if \(cascadeRanThisTurn && mr > 0 && \(g\.ledgers\.money\.thisTurnIn \|\| 0\) > 0\)/.test(guoku),
  '反算须 gated:cascade 真跑过且确有进项(fallback 保持八源八类)');

// ── 行为:抽出 cascadeRanThisTurn 表达式·四态 eval ────────────────────────────
const m = guoku.match(/var cascadeRanThisTurn = ([^;]+);/);
assert(m, '抽不到 cascadeRanThisTurn 表达式');
const expr = m[1];
function detect(lastCascade, turn, thisTurnIn) {
  const ctx = { GM: { _lastCascadeTurn: lastCascade, turn: turn }, g: { ledgers: { money: { thisTurnIn: thisTurnIn } } } };
  vm.createContext(ctx);
  return vm.runInContext('(' + expr + ')', ctx);
}
// (a) endturn 后:cascade 跑在 turn=5·自增到 6·thisTurnIn 假设已被某步清 0 → 旧检测会假·新检测靠 turn-1 救
assert(detect(5, 6, 0) === true, 'endturn后:_lastCascadeTurn=5,turn=6,thisTurnIn=0 → true(本修核心)');
// (b) load:cascade 跑时 turn 未变
assert(detect(6, 6, 0) === true, 'load:_lastCascadeTurn===turn → true');
// (c) cascade 两回合没跑·无进项 → false(保持 fallback)
assert(detect(4, 6, 0) === false, '_lastCascadeTurn=4,turn=6,thisTurnIn=0 → false(真没跑·走fallback)');
// (d) ledger 有进项兜底
assert(detect(4, 6, 100) === true, 'thisTurnIn>0 兜底 → true');
// 对照:旧表达式(仅 ===turn 或 thisTurnIn) 在 (a) 会 false → 证明本修必要
const oldDetect = function (lc, t, tin) { return (lc === t) || (tin > 0); };
assert(oldDetect(5, 6, 0) === false && detect(5, 6, 0) === true, '对照:旧检测在过回合后为假(致八源覆盖)·新检测已修');

// ── ② 时政 prompt 强化 ───────────────────────────────────────────────────────
// 注:3090 行 Edit 存为字面中文·3107 行 Edit 转成 \uXXXX(运行时等价)·故 3090 用字面中文锚、3107 用 ASCII 锚。
assert(prompt.indexOf('必须每回合维护它') >= 0, 'prompt 须把时政维护改成「必须每回合维护」(3090)');
assert(prompt.indexOf('与推演完全脱节') >= 0, 'prompt 须说明不维护后果:面板停滞、与推演脱节(3090)');
assert(prompt.indexOf('{action:"resolve", id:"') >= 0, 'prompt 须给 resolve 的 id 照填范式(3107·治AI编id不匹配致resolve落空)');
assert(prompt.indexOf('{action:"add", title, description}') >= 0, 'prompt 须给 add 新议题范式(3107)');
// 仍保留注入 id 与 resolve 指令(端到端管线不破)
assert(/id:' \+ iss\.id/.test(prompt), '仍须把当前要务 id 注入给 AI(resolve 才能匹配)');
assert(/resolve: /.test(prompt), 'resolve 指令仍在');

console.log('[smoke-fiscal-monthly-shizheng-sync] PASS ' + passed + ' assertions');
