#!/usr/bin/env node
// smoke-fame-events-b1.js - B1 名望事件 infra (FAME_EVENTS + applyFameEvent)
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
    GM: { turn: 3, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.3; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;
  assert(typeof CE.applyFameEvent === 'function', 'applyFameEvent 导出');
  assert(CE.FAME_EVENTS && CE.FAME_EVENTS.defection === -90, 'FAME_EVENTS 表导出·投敌-90');

  const ch = { name: '将', resources: { fame: 0 } };
  CE.ensureCharResources(ch); ch.resources.fame = 0;
  assert(CE.applyFameEvent(ch, 'military_victory') === 8 && ch.resources.fame === 8, '平叛+8');
  assert(CE.applyFameEvent(ch, 'reform_success', 0.5) === 6 && ch.resources.fame === 14, '改革成功×0.5=+6');
  assert(CE.applyFameEvent(ch, 'unknown_key') === 0 && ch.resources.fame === 14, '未知键不动');

  // 降 + 下限 clamp
  const traitor = { name: '叛', resources: { fame: 30 } };
  CE.ensureCharResources(traitor); traitor.resources.fame = 30;
  CE.applyFameEvent(traitor, 'defection');   // -90
  assert(traitor.resources.fame === -60, '投敌后 30-90 clamp 到 -60, got ' + traitor.resources.fame);
  CE.applyFameEvent(traitor, 'military_rout'); // -40 → clamp -100
  assert(traitor.resources.fame === -100, '续溃败 clamp 下限 -100, got ' + traitor.resources.fame);

  // 上限 clamp
  const hero = { name: '名臣', resources: { fame: 95 } };
  CE.ensureCharResources(hero); hero.resources.fame = 95;
  CE.applyFameEvent(hero, 'living_shrine'); // +20 → clamp 100
  assert(hero.resources.fame === 100, '生祠 clamp 上限 100');
  // 名望历史记录
  assert(Array.isArray(hero._fameHistory) && hero._fameHistory.length >= 1, '_fameHistory 记录');

  console.log('[smoke-fame-events-b1] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-fame-events-b1] FAIL'); console.error(err && err.stack || err); process.exit(1); }
