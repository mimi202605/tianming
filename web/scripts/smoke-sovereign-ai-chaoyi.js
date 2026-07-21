#!/usr/bin/env node
// scripts/smoke-sovereign-ai-chaoyi.js — Phase 3·Task 8 朝议发言 smoke
// 验证：addCYBubble 调用 + 皇帝名动态化（用 P.playerInfo.sovereignName 而非字面量"皇帝"）+ jishiRecords 落账

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext(sovereignName) {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { Transmigration: { isTransmigrationMode: function(){ return true; }, getSovereignName: function(){ return sovereignName; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-sovereign-ai.js'), 'utf8'), ctx, { filename: 'tm-sovereign-ai.js' });
  return ctx;
}

function chaoyiSmoke() {
  var sovereignName = '建文帝';
  var ctx = buildContext(sovereignName);
  var bubbleCalls = [];

  ctx.GM = {
    turn: 5,
    memorials: [],
    jishiRecords: []
  };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: sovereignName } };

  ctx.addCYBubble = function(name, text, isSystem) {
    bubbleCalls.push({ name: name, text: text, isSystem: isSystem });
  };

  var aiOutput = {
    rationale: '北边有警·朕当晓谕群臣。',
    edicts: [],
    chaoyiSpeeches: [
      { topic: '北方军情', line: '朕闻北鄙有警·当饬边臣严守·勿轻启衅。', stance: 'firm' },
      { topic: '春耕劝农', line: '春耕方兴·有司宜督劝农桑·毋误农时。', stance: 'benevolent' }
    ],
    memorialDecisions: [],
    officeActions: []
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'runTurnSync ok');
  assert(r.chaoyi.rendered === 2, 'chaoyi rendered 2');

  assert(bubbleCalls.length === 2, 'addCYBubble called twice');
  assert(bubbleCalls[0].name === sovereignName, 'bubble name = sovereignName (动态化·非字面量"皇帝")');
  assert(bubbleCalls[0].name !== '皇帝', 'bubble name is NOT literal "皇帝"');
  assert(bubbleCalls[0].name !== '君主', 'bubble name is NOT fallback "君主"');
  assert(bubbleCalls[0].isSystem === false, 'bubble isSystem = false');
  assert(bubbleCalls[0].text.indexOf('【君主 AI 发话】') === 0, 'bubble text prefix');
  assert(bubbleCalls[0].text.indexOf('北方军情') !== -1, 'bubble text contains topic');

  assert(ctx.GM.jishiRecords.length === 2, 'jishiRecords has 2 entries');
  var rec0 = ctx.GM.jishiRecords[0];
  assert(rec0.char === sovereignName, 'jishiRecords.char = sovereignName');
  assert(rec0.mode === 'sovereign-ai', 'jishiRecords.mode = sovereign-ai');
  assert(rec0.topic === '北方军情', 'jishiRecords.topic preserved');
  assert(rec0.stance === 'firm', 'jishiRecords.stance preserved');

  console.log('[smoke-sovereign-ai-chaoyi] PASS · 11 assertions · 朝议触发 + 皇帝名动态化 + 起居注落账');
}

try {
  chaoyiSmoke();
  process.exit(0);
} catch (e) {
  console.error('[smoke-sovereign-ai-chaoyi] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
