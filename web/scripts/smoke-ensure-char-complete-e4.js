#!/usr/bin/env node
// smoke-ensure-char-complete-e4.js - E4 运行时自动补齐 detectMissingFields + ensureCharComplete
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, Error, TypeError, RangeError,
    GM: { turn: 9, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.5; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  assert(typeof CE.detectMissingFields === 'function', 'detectMissingFields 导出');
  assert(typeof CE.ensureCharComplete === 'function', 'ensureCharComplete 导出');

  // ── detectMissingFields: 残缺角色列出缺项 ──
  const partial = { name: '义军首领' };
  const miss = CE.detectMissingFields(partial);
  assert(miss.indexOf('gender') >= 0 && miss.indexOf('age') >= 0 && miss.indexOf('resources') >= 0 && miss.indexOf('loyalty') >= 0, '残缺角色列出 gender/age/resources/loyalty');

  // ── ensureCharComplete: 补全确定性字段 ──
  const filled = CE.ensureCharComplete(partial);
  assert(filled.length > 0, '返回所补缺项');
  assert(partial.gender === '男' && partial.age === 35, 'gender/age 缺省');
  assert(partial.loyalty === 50 && partial.ambition === 50 && partial.benevolence === 50, '十维缺省中庸50');
  assert(partial.resources && partial.resources.privateWealth, '六资源已保障');
  assert(partial.zi && partial.zi.length >= 1, '字已生成, got ' + partial.zi);
  assert(partial.socialClass, 'socialClass 已定');
  assert(partial._autoCompletedTurn === 9, '标记补全回合');

  // ── 完整角色:不覆盖既有值 ──
  const complete = { name: '老臣', gender: '女', age: 40, loyalty: 80, ambition: 30, intelligence: 70, administration: 60, zi: '子明', socialClass: 'civilOfficial', family: {}, resources: { privateWealth: { money: 5000 }, fame: 20, virtueMerit: 3000 } };
  const miss2 = CE.detectMissingFields(complete);
  assert(miss2.length === 0, '完整角色无缺项, got ' + JSON.stringify(miss2));
  CE.ensureCharComplete(complete);
  assert(complete.loyalty === 80 && complete.ambition === 30 && complete.gender === '女', '完整角色既有值不被覆盖');
  assert(complete.zi === '子明', '既有字不被覆盖');

  // ── 经 CE.tick 全 char 扫描收口:残缺新角色被补全 ──
  const spawned = { id: 'sp', name: '突现豪强' };
  ctx.GM.chars.push(spawned);
  CE.tick({ _monthRatio: 1 });
  assert(spawned.gender === '男' && spawned.resources && spawned.loyalty === 50, 'tick 扫描收口:新角色被自动补全');

  console.log('[smoke-ensure-char-complete-e4] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-ensure-char-complete-e4] FAIL'); console.error(err && err.stack || err); process.exit(1); }
