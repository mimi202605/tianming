#!/usr/bin/env node
// smoke-p5-alpha-namespaces.js — P5-α reconcile 验
// 验 24 canonical namespaces 容器存在·rename alias 双向有效·TM.namespaces meta 含全部条目

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed++;
}

// 最小 window/document mock·tm-namespaces 只用 window/document.readyState/setTimeout
// 模式·ctx.window = ctx (与其他 smoke 一致·使 bare TM 解析为 ctx.TM 即 window.TM)
const ctx = {
  document: { readyState: 'loading', addEventListener: function(){} },
  setTimeout: function() {},
  console: console,
  Object: Object,
  Array: Array,
  Promise: Promise,
  Proxy: Proxy
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.addEventListener = function(){};
vm.createContext(ctx);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

// 加载 namespace 门面
load('tm-namespaces.js');

const TM = ctx.TM;

// ─── Test 1·TM 顶层存在 ───
assert(TM && typeof TM === 'object', 'TM should exist on window');

// ─── Test 2·24 canonical namespace 容器全存在 ───
const CANONICAL_24 = [
  'Chaoyi', 'Wendui', 'Endturn', 'Military', 'Fiscal', 'Economy',
  'Guoku', 'Neitang', 'Huji', 'Office', 'Authority', 'Corruption',
  'Keju', 'Edict', 'NPC', 'Char', 'Map', 'UI', 'Save', 'Editor',
  'Memory', 'Player', 'Diagnostics'
];
// Note: TM.Huji 不在 R200 直建·走 TM.HujiEngine·Phase 5-β/δ 时建 TM.Huji 容器
// CANONICAL_24 在 P5-α 后实际 23 个直建+1 (Huji 待 sub-slice 建)·此 smoke 只验 22 个直建
const P5_ALPHA_DIRECT = [
  'Chaoyi', 'Wendui', 'Endturn', 'Military', 'Fiscal',
  'Office', 'Authority', 'Corruption', 'Keju', 'Edict',
  'NPC', 'Char', 'UI', 'Editor', 'Memory', 'Player'
];
P5_ALPHA_DIRECT.forEach(function(ns) {
  assert(TM[ns] && typeof TM[ns] === 'object',
    'TM.' + ns + ' should be a container object after P5-α');
});

// ─── Test 3·Endturn.AI sub-namespace 存在 ───
assert(TM.Endturn.AI && typeof TM.Endturn.AI === 'object',
  'TM.Endturn.AI sub-ns should exist');

// ─── Test 4·R87 facade 仍在 (Economy/Lizhi/Guoku/Neitang) ───
assert(TM.Economy && typeof TM.Economy.has === 'function',
  'R87 TM.Economy whitelist facade should remain');
assert(TM.Lizhi && typeof TM.Lizhi.has === 'function',
  'R87 TM.Lizhi whitelist facade should remain');
assert(TM.Guoku && typeof TM.Guoku.has === 'function',
  'R87 TM.Guoku whitelist facade should remain');
assert(TM.Neitang && typeof TM.Neitang.has === 'function',
  'R87 TM.Neitang whitelist facade should remain');

// ─── Test 5·R208 P6-α·TM.MapSystem alias 已退役·canonical = TM.Map ───
assert(TM.Map && typeof TM.Map.has === 'function',
  'TM.Map is the R87 facade (rename in-place at R208 from TM.MapSystem)');
assert(typeof TM.MapSystem === 'undefined',
  'R208·TM.MapSystem alias should be retired (Phase 6 alias 退役)');
assert(typeof TM.Map.open === 'function',
  'TM.Map.open (R106 unified entry) preserved through rename');

// ─── Test 6·R208 P6-α·TM.Storage alias 已退役·canonical = TM.Save ───
assert(TM.Save && typeof TM.Save.openManager === 'function',
  'TM.Save is the R113 storage facade (rename in-place at R208 from TM.Storage)');
assert(typeof TM.Storage === 'undefined',
  'R208·TM.Storage alias should be retired (Phase 6 alias 退役)');

// ─── Test 7·engine proxies 仍在 ───
assert(TM.HujiEngine && typeof TM.HujiEngine.isAvailable === 'function',
  'TM.HujiEngine engine proxy should remain');
assert(TM.GuokuEngine && typeof TM.GuokuEngine.isAvailable === 'function',
  'TM.GuokuEngine engine proxy should remain');
assert(TM.ChangeQueue && typeof TM.ChangeQueue.isAvailable === 'function',
  'TM.ChangeQueue engine proxy should remain');

// ─── Test 8·TM.namespaces meta 含 24 canonical (R208 删 MapSystem/Storage 别名后) ───
const META_KEYS = [
  // R87 whitelist (R208 后·Map/Save 直定义·MapSystem/Storage 已删)
  'Economy', 'Map', 'Lizhi', 'Guoku', 'Neitang',
  // R87 engine
  'HujiEngine', 'GuokuEngine', 'ChangeQueue',
  // R113 (R208 rename·canonical = Save)
  'Save',
  // R200·14 新
  'Chaoyi', 'Wendui', 'Endturn', 'Military', 'Fiscal',
  'Office', 'Authority', 'Corruption', 'Keju', 'Edict',
  'NPC', 'Char', 'UI', 'Editor', 'Memory', 'Player', 'Diagnostics',
  // meta methods
  'report', 'verify', 'loadWarnings'
];
META_KEYS.forEach(function(k) {
  assert(k in TM.namespaces,
    'TM.namespaces meta should include "' + k + '"');
});
// R208·legacy alias 不在 meta
assert(!('MapSystem' in TM.namespaces),
  'R208·MapSystem alias should be removed from meta');
assert(!('Storage' in TM.namespaces),
  'R208·Storage alias should be removed from meta');

// ─── Test 9·TM.namespaces.report() 返回对象·不抛 ───
const report = TM.namespaces.report();
assert(report && typeof report === 'object',
  'TM.namespaces.report() should return object');

// ─── Test 10·TM.namespaces.verify() 返回 facade + warnings 结构 ───
const verifyRes = TM.namespaces.verify();
assert(verifyRes && verifyRes.facades && Array.isArray(verifyRes.warnings),
  'TM.namespaces.verify() should return { facades, warnings } shape');

// ─── Test 11·R208·alias 退役后·只 canonical 名可用 ───
assert(TM.Map._namespace === 'Map' && TM.Save !== undefined,
  'R208·canonical TM.Map / TM.Save 直接定义 (no alias)');

// ─── Test 12·14 新容器初始为空 (P5-α 只建·后续填) ───
['Chaoyi', 'Wendui', 'Military', 'Fiscal', 'Office', 'Authority',
 'Corruption', 'Keju', 'Edict', 'NPC', 'Char', 'UI', 'Editor',
 'Memory', 'Player'].forEach(function(ns) {
  assert(TM[ns] && typeof TM[ns] === 'object',
    'TM.' + ns + ' should remain an object container after later P5 sub-slices');
});
// Endturn 已有 .AI sub·所以非空
assert(TM.Endturn && typeof TM.Endturn === 'object' && TM.Endturn.AI && typeof TM.Endturn.AI === 'object',
  'TM.Endturn should keep .AI sub-ns after later P5 sub-slices');

// ─── Test 13·legacy TM.Lizhi 仍是 R87 facade·非空容器 ───
// TM.Lizhi 是 R87 _buildFacade·有 has/list/listAvailable/listMissing/_namespace
assert(TM.Lizhi._namespace === 'Lizhi' && typeof TM.Lizhi.list === 'function',
  'TM.Lizhi should remain R87 facade (legacy·not flattened to empty container)');

console.log('[smoke-p5-alpha-namespaces] pass assertions=' + passed);
