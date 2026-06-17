#!/usr/bin/env node
// smoke-family-mode-e3.js - E3 家族 communal/divided 模式 + clanRules.inheritance
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function approx(a, b, e) { return Math.abs(a - b) <= (e || 1); }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function mkCtx(dynasty) {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: { turn: 1, dynasty: dynasty, clans: {}, chars: [], guoku: {}, neitang: { balance: 0 }, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.99; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  return ctx;
}

function main() {
  let ctx = mkCtx('唐');
  const CE = ctx.CharEconEngine;

  // ── 朝代模式默认 ──
  assert(CE.familyModeDefault('唐') === 'communal', '唐→共财');
  assert(CE.familyModeDefault('宋') === 'divided', '宋→分家');
  assert(CE.familyModeDefault('明') === 'communal', '明→共财(默认)');
  assert(CE.familyModeDefault('元') === 'divided', '元→分家');
  assert(CE.familyModeDefault('大明') === 'communal', '模糊含"明"→共财');
  assert(CE.familyModeDefault('') === 'communal', '未知→共财兜底');

  // ── familyModeOf: clan.mode 覆盖 ──
  ctx.GM.clans.cA = { mode: 'divided', members: [] };
  assert(CE.familyModeOf({ family: { clanId: 'cA' } }) === 'divided', 'clan.mode 覆盖朝代默认');

  // ── tickClanPool: 共财(唐)抽 3% ──
  ctx = mkCtx('唐');
  const CE2 = ctx.CharEconEngine;
  ctx.GM.clans.communalClan = { members: ['m1'], sharedWealth: 0 };
  const m1 = { id: 'm1', name: 'm1', resources: { privateWealth: { money: 10000 } } };
  ctx.GM.chars.push(m1);
  CE2.tick({ _monthRatio: 1 });   // 跑全 tick(含 tickClanPool)
  assert(ctx.GM.clans.communalClan.sharedWealth > 0, '共财朝代:族人缴入共财池, sharedWealth=' + Math.round(ctx.GM.clans.communalClan.sharedWealth));

  // ── tickClanPool: 分家(宋)不抽共财 ──
  ctx = mkCtx('宋');
  const CE3 = ctx.CharEconEngine;
  ctx.GM.clans.dividedClan = { members: ['m2'], sharedWealth: 0 };
  const m2 = { id: 'm2', name: 'm2', resources: { privateWealth: { money: 10000 } } };
  ctx.GM.chars.push(m2);
  CE3.tick({ _monthRatio: 1 });
  assert(ctx.GM.clans.dividedClan.sharedWealth === 0, '分家朝代:不走共财池, sharedWealth=' + ctx.GM.clans.dividedClan.sharedWealth);

  // ── 继承规则 ──
  function setupHeirs(ctx, rule) {
    const CE = ctx.CharEconEngine;
    ctx.GM.clans.cl = { members: [], clanRules: { inheritance: rule } };
    const h1 = { id: 'h1', name: '长子', age: 30, resources: { privateWealth: { money: 0 }, virtueMerit: 900 } };
    const h2 = { id: 'h2', name: '次子', age: 20, resources: { privateWealth: { money: 0 }, virtueMerit: 100 } };
    ctx.GM.chars.push(h1, h2);
    const dad = { id: 'dad', name: '父', family: { clanId: 'cl', children: ['h1', 'h2'] }, resources: { privateWealth: { money: 10000, treasure: 2000 } } };
    CE.distributeInheritance(dad);
    return { h1, h2 };
  }
  // equal
  ctx = mkCtx('唐'); let h = setupHeirs(ctx, 'equal');
  assert(h.h1._inheritanceThisTurn === 6000 && h.h2._inheritanceThisTurn === 6000, '均分:各6000');
  // eldest_son
  ctx = mkCtx('唐'); h = setupHeirs(ctx, 'eldest_son');
  assert(h.h1._inheritanceThisTurn === 12000 && !h.h2._inheritanceThisTurn, '嫡长:长子全得12000');
  // merit_based: h1 w=1000 h2 w=200 → 10000/2000
  ctx = mkCtx('唐'); h = setupHeirs(ctx, 'merit_based');
  assert(approx(h.h1._inheritanceThisTurn, 10000) && approx(h.h2._inheritanceThisTurn, 2000), '按贤:贤者多得 ' + Math.round(h.h1._inheritanceThisTurn) + '/' + Math.round(h.h2._inheritanceThisTurn));

  console.log('[smoke-family-mode-e3] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-family-mode-e3] FAIL'); console.error(err && err.stack || err); process.exit(1); }
