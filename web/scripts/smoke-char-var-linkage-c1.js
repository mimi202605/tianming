#!/usr/bin/env node
// smoke-char-var-linkage-c1.js - C1 §XI 安全核心(环境腐败→integrity·皇威皇权→loyalty·暴君→压力)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function approx(a, b, e) { return Math.abs(a - b) <= (e || 0.01); }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function mkGM(over) {
  return Object.assign({
    turn: 5, clans: {}, chars: [], guoku: {}, neitang: {},
    corruption: { subDepts: { hubu: { true: 80 }, clean_dept: { true: 20 } } },
    huangwei: { index: 50 }, huangquan: { index: 50 }, facs: [], regions: {}, officeTree: []
  }, over || {});
}

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: mkGM(), addEB: function() {}, random: function() { return 0.99; }  // 0.99 避免随机事件
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  const T = CE.tickCharVariableLinkages;
  assert(typeof T === 'function', 'tickCharVariableLinkages 导出');

  // #1 浊环境(hubu true=80) → integrity 下滑
  let ch = { name: 'a', department: 'hubu', integrity: 60, loyalty: 60 };
  T(ch, 1);
  assert(approx(ch.integrity, 60 - (80 - 40) / 100 * 2, 0.01), '浊环境 integrity -0.8 → ' + ch.integrity);
  // #1 清明环境(true=20)+低廉 → integrity 回升
  ch = { name: 'b', department: 'clean_dept', integrity: 30, loyalty: 60 };
  T(ch, 1);
  assert(approx(ch.integrity, 30.5, 0.01), '清明环境贪官回升 +0.5 → ' + ch.integrity);
  // #1 清明环境但已廉(>=50) → 不动
  ch = { name: 'b2', department: 'clean_dept', integrity: 70 };
  T(ch, 1);
  assert(ch.integrity === 70, '清明环境清官不变');

  // #2 暴君段(huangwei>90) → loyalty 跌
  ctx.GM.huangwei.index = 95;
  ch = { name: 'c', loyalty: 60, ambition: 40 };
  T(ch, 1);
  assert(approx(ch.loyalty, 59.5, 0.01), '暴君段 loyalty -0.5 → ' + ch.loyalty);
  // #2 威严段(70<w<=90) → loyalty 涨
  ctx.GM.huangwei.index = 75;
  ch = { name: 'd', loyalty: 60, ambition: 40 };
  T(ch, 1);
  assert(approx(ch.loyalty, 60.5, 0.01), '威严段 loyalty +0.5 → ' + ch.loyalty);
  // #2 失威段(w<30) → loyalty -2×0.5
  ctx.GM.huangwei.index = 20;
  ch = { name: 'e', loyalty: 60, ambition: 40 };
  T(ch, 1);
  assert(approx(ch.loyalty, 59.0, 0.01), '失威段 loyalty -1.0 → ' + ch.loyalty);
  // #2 皇权弱(<35)+野心高(>70) → 野心涨 + loyalty 再跌
  ctx.GM.huangwei.index = 50; ctx.GM.huangquan.index = 30;
  ch = { name: 'f', loyalty: 60, ambition: 80 };
  T(ch, 1);
  assert(approx(ch.ambition, 80.5, 0.01), '皇权弱+野心 → ambition +0.5 → ' + ch.ambition);
  assert(approx(ch.loyalty, 59.5, 0.01), '皇权弱谋权臣 loyalty -0.5 → ' + ch.loyalty);

  // #3 暴君段 + 在朝官 → 压力累积
  ctx.GM.huangwei.index = 95;
  ch = { name: 'g', officialTitle: '尚书', stress: 20, loyalty: 60 };
  T(ch, 1);
  assert(approx(ch.stress, 21.5, 0.01), '暴君段在朝官压力 +1.5 → ' + ch.stress);
  // #3 暴君段但无官职 → 压力不动
  ch = { name: 'h', stress: 20, loyalty: 60 };
  T(ch, 1);
  assert(ch.stress === 20, '暴君段白身无压力增');

  // 皇帝自身 loyalty 不动(isEmperor 跳过 #2)
  ctx.GM.huangwei.index = 95;
  ch = { name: '崇祯', role: '皇帝', loyalty: 60, officialTitle: '皇帝' };
  T(ch, 1);
  assert(ch.loyalty === 60, '皇帝自身 loyalty 不受 #2 影响');

  console.log('[smoke-char-var-linkage-c1] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-char-var-linkage-c1] FAIL'); console.error(err && err.stack || err); process.exit(1); }
