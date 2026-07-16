#!/usr/bin/env node
// smoke-fiscal-target-alias-preflight.js — preflight fiscal 中文 target/kind 别名归一（2026-07-16·落库契约硬化刀②）
//   悬案(居平内帑案在档)：preflightAIWriteBack 的 fiscal 白名单只认英文 guoku/neitang/province:/income/expense·
//   AI 写中文别名(内帑/国库/太仓/收入/支出…)的 fiscal_adjustments 条目在 preflight 即被剔·而下游 applier 本有
//   中文容差归一(2026-06-02 bug A 修)能吃这些条目——preflight 比消费端更严=好账被冤杀。
//   本刀：preflight 校验前做同款中文→canonical 归一(镜像 applier 映射)·归一后再过白名单——真垃圾 target 照剔·中文好账放行。
//   端到端：真 preflightAIWriteBack(直闸判定) + 真 applyAITurnChanges(preflight→applier 落账)。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error('[assert] ' + msg); passed++; console.log('  ok - ' + msg); }

function load(ctx, file) { vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file }); }

const ctx = {
  console,
  Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
  isFinite, isNaN, parseInt, parseFloat,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  Error, TypeError, RangeError, GM: null, P: {}
};
ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
ctx.TM = { errors: { capture() {}, captureSilent() {} } };
ctx._eb = [];
ctx.addEB = (cat, msg) => { ctx._eb.push({ cat, msg }); };
vm.createContext(ctx);

function freshGM() {
  return {
    turn: 42,
    chars: [], facs: [], parties: [], classes: [], armies: [], items: [], regions: [],
    guoku: { money: 5000000, balance: 5000000, monthlyIncome: 80000, monthlyExpense: 75000, extraIncome: [], extraExpense: [] },
    neitang: { money: 2000000, balance: 2000000, monthlyIncome: 60000, monthlyExpense: 50000, extraIncome: [], extraExpense: [] },
    _turnReport: []
  };
}
function run(fiscal) {
  ctx.GM = freshGM(); ctx._eb = [];
  const res = ctx.applyAITurnChanges({ fiscal_adjustments: fiscal });
  return { G: ctx.GM, res: res, eb: ctx._eb };
}

(function main() {
  // family-order 契约序：pathutils → army → narrative → applier → validators → reconcile
  load(ctx, 'tm-ai-change-pathutils.js');
  load(ctx, 'tm-ai-change-army.js');
  load(ctx, 'tm-ai-change-narrative.js');
  load(ctx, 'tm-ai-change-applier.js');
  load(ctx, 'tm-ai-change-applier-validators.js');
  load(ctx, 'tm-ai-change-applier-reconcile.js');
  assert(typeof ctx.applyAITurnChanges === 'function', 'applyAITurnChanges 已加载');
  assert(typeof ctx.preflightAIWriteBack === 'function', 'preflightAIWriteBack 已加载');

  // ── 案1·★直闸判定：中文别名 target/kind 归一后全过 preflight(不被冤杀) ──
  {
    ctx.GM = freshGM();
    const ai = { fiscal_adjustments: [
      { target: '内帑', kind: '支出', name: '郊祀赏赉', amount: 100000 },   // 中文 target + 中文 kind
      { target: '国库', kind: '收入', name: '盐课',     amount: 200000 },
      { target: '太仓', kind: 'income', name: '田赋',   amount: 50000 },     // 中文 target + 英文 kind
      { target: '省:陕西', kind: '支出', name: '赈灾',  amount: 30000 }      // 中文 province 前缀
    ]};
    ctx.preflightAIWriteBack(ai, { source: 'test' });
    assert(ai.fiscal_adjustments.length === 4, '案1 ★中文别名 target/kind(内帑/国库/太仓/省:陕西·支出/收入)全过 preflight·好账不冤杀');
  }

  // ── 案2·★直闸判定：真垃圾 target/kind/零额照剔·仅合法条目留存(归一不放水) ──
  {
    ctx.GM = freshGM();
    const ai2 = { fiscal_adjustments: [
      { target: '月球基地', kind: 'income',  name: 'x', amount: 100 },   // 垃圾 target·归一落空
      { target: 'neitang',  kind: '飞天',    name: 'y', amount: 100 },   // 垃圾 kind·归一落空
      { target: 'guoku',    kind: 'income',  name: 'z', amount: 0 },     // 零额·invalid amount
      { target: 'neitang',  kind: 'expense', name: 'ok', amount: 500 }   // 合法 canonical(对照)
    ]};
    ctx.preflightAIWriteBack(ai2, {});
    assert(ai2.fiscal_adjustments.length === 1 && ai2.fiscal_adjustments[0].name === 'ok',
      '案2 ★垃圾 target(月球基地)/垃圾 kind(飞天)/零额仍被剔·仅合法条目留存(归一只救真别名·不放水)');
  }

  // ── 案3·★端到端：中文 target=内帑/kind=支出 过 preflight 后·被 applier 正确落账并作用于余额 ──
  {
    const { G } = run([{ target: '内帑', kind: '支出', name: '内帑赏赐', amount: 100000, reason: '郊祀赏赉' }]);
    assert(G.neitang.extraExpense.length === 1, '案3 中文 target=内帑/kind=支出 过 preflight 后·applier 落账(neitang.extraExpense)');
    assert(G.neitang.money === 2000000 - 100000, '案3 ★中文别名 fiscal 真作用于内帑余额(好账不再被 preflight 冤杀而漏账)');
  }

  // ── 案4·端到端：中文 target=太仓/kind=收入 → guoku 落账 ──
  {
    const { G } = run([{ target: '太仓', kind: '收入', name: '盐课增收', amount: 200000, reason: '两淮盐课' }]);
    assert(G.guoku.extraIncome.length === 1, '案4 中文 target=太仓/kind=收入 → guoku.extraIncome 落账');
    assert(G.guoku.money === 5000000 + 200000, '案4 真作用于国库余额');
  }

  // ── 案5·回归：英文 canonical target/kind 照旧落账(不误伤既有正路) ──
  {
    const { G } = run([{ target: 'neitang', kind: 'expense', name: '英文正路', amount: 100000 }]);
    assert(G.neitang.extraExpense.length === 1 && G.neitang.money === 2000000 - 100000, '案5 英文 canonical 回归·照旧落账不误伤');
  }

  // ── 案6·端到端：垃圾 target 经 preflight 剔除·不落任何库(未穿透到 applier) ──
  {
    const { G } = run([{ target: '月球', kind: 'income', name: '虚账', amount: 100000 }]);
    assert(G.guoku.extraIncome.length === 0 && G.neitang.extraIncome.length === 0, '案6 垃圾 target(月球)经 preflight 剔除·不落任何库');
  }

  console.log('\nsmoke-fiscal-target-alias-preflight: ' + passed + ' assertions PASS');
})();
