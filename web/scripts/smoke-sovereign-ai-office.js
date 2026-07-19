#!/usr/bin/env node
// scripts/smoke-sovereign-ai-office.js — Phase 3·Task 10 任免 smoke
// 验证：onAppointment/onDismissal 调用 + _offAppointPerson 兜底 + 玩家被任免时通知推送

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { Transmigration: { isTransmigrationMode: function(){ return true; }, getSovereignName: function(){ return '测试帝'; } } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-sovereign-ai.js'), 'utf8'), ctx, { filename: 'tm-sovereign-ai.js' });
  return ctx;
}

function makeOfficeTree() {
  return [
    {
      name: '六部', positions: [
        { name: '尚书', title: '尚书' },
        { name: '侍郎', title: '侍郎' }
      ],
      subs: []
    }
  ];
}

function promoteTest(ctx) {
  var apptCalls = [];
  var dismissCalls = [];
  var ch = { name: '张三', alive: true, isPlayer: false, officialTitle: '主事' };
  ctx.findCharByName = function(n) { return n === '张三' ? ch : null; };
  ctx.onAppointment = function(name, pos, binding) {
    apptCalls.push({ name: name, pos: pos, binding: binding });
    return { ok: true };
  };
  ctx.onDismissal = function(name, reason) { dismissCalls.push({ name: name, reason: reason }); };
  ctx.toast = function() {};

  ctx.GM = { turn: 4, officeTree: makeOfficeTree(), chars: [ch], _chronicle: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  var aiOutput = {
    rationale: '张三有功·宜擢。',
    edicts: [], chaoyiSpeeches: [], memorialDecisions: [],
    officeActions: [{ kind: 'promote', target: '张三', newPosition: '侍郎', reason: '功绩', loyaltyDelta: 5 }]
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'promote: ok');
  assert(r.office.applied === 1, 'promote: applied = 1');
  assert(apptCalls.length === 1, 'promote: onAppointment called once');
  assert(apptCalls[0].name === '张三', 'promote: target name');
  assert(apptCalls[0].pos === '侍郎', 'promote: newPosition');
  assert(apptCalls[0].binding.reason === '功绩', 'promote: binding.reason');
  assert(dismissCalls.length === 0, 'promote: no onDismissal call');
  // 玩家非目标·不推通知
  assert(!ctx.P.playerInfo._sovereignAINotices || ctx.P.playerInfo._sovereignAINotices.length === 0,
         'promote: no player notice (张三 not player)');
}

function dismissTest(ctx) {
  var apptCalls = [];
  var dismissCalls = [];
  var vacateCalls = [];
  var ch = { name: '李四', alive: true, isPlayer: false, officialTitle: '尚书' };
  ctx.findCharByName = function(n) { return n === '李四' ? ch : null; };
  ctx.onAppointment = function(name, pos, binding) { apptCalls.push({ name: name, pos: pos }); };
  ctx.onDismissal = function(name, reason) { dismissCalls.push({ name: name, reason: reason }); };
  ctx._offVacateByCharName = function(name, mode, tree) { vacateCalls.push({ name: name, mode: mode }); };
  ctx.toast = function() {};

  ctx.GM = { turn: 4, officeTree: makeOfficeTree(), chars: [ch], _chronicle: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  var aiOutput = {
    rationale: '李四溺职·当罢。',
    edicts: [], chaoyiSpeeches: [], memorialDecisions: [],
    officeActions: [{ kind: 'dismiss', target: '李四', reason: '溺职', loyaltyDelta: -8 }]
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'dismiss: ok');
  assert(r.office.applied === 1, 'dismiss: applied = 1');
  assert(dismissCalls.length === 1, 'dismiss: onDismissal called once');
  assert(dismissCalls[0].name === '李四', 'dismiss: target name');
  assert(dismissCalls[0].reason === '溺职', 'dismiss: reason passed');
  assert(ch.officialTitle === '', 'dismiss: ch.officialTitle cleared');
  assert(apptCalls.length === 0, 'dismiss: no onAppointment call');
}

function playerTargetTest(ctx) {
  var apptCalls = [];
  var ch = { name: '王五', alive: true, isPlayer: false, officialTitle: '主事' };
  var player = { name: '玩家本人', alive: true, isPlayer: true, officialTitle: '员外郎' };
  ctx.findCharByName = function(n) {
    if (n === '王五') return ch;
    if (n === '玩家本人') return player;
    return null;
  };
  ctx.onAppointment = function(name, pos, binding) {
    apptCalls.push({ name: name, pos: pos });
    return { ok: true };
  };
  ctx.onDismissal = function() {};
  ctx.toast = function() {};

  ctx.GM = { turn: 4, officeTree: makeOfficeTree(), chars: [ch, player], _chronicle: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝', characterName: '玩家本人' } };

  var aiOutput = {
    rationale: '玩家有功·宜擢。',
    edicts: [], chaoyiSpeeches: [], memorialDecisions: [],
    officeActions: [{ kind: 'promote', target: '玩家本人', newPosition: '侍郎', reason: '功绩', loyaltyDelta: 3 }]
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'player-target: ok');
  assert(r.office.applied === 1, 'player-target: applied = 1');
  assert(apptCalls.length === 1, 'player-target: onAppointment called');
  assert(apptCalls[0].name === '玩家本人', 'player-target: target = player name');
  // 玩家被任免·推送通知
  assert(Array.isArray(ctx.P.playerInfo._sovereignAINotices), 'player-target: _sovereignAINotices array exists');
  assert(ctx.P.playerInfo._sovereignAINotices.length === 1, 'player-target: 1 notice');
  var notice = ctx.P.playerInfo._sovereignAINotices[0];
  assert(notice.kind === 'promote', 'player-target: notice.kind = promote');
  assert(notice.target === '玩家本人', 'player-target: notice.target');
  assert(notice.newPosition === '侍郎', 'player-target: notice.newPosition');
  assert(notice.msg.indexOf('擢升') !== -1, 'player-target: notice.msg 含"擢升"');
}

function fallbackAppointTest(ctx) {
  // onAppointment 缺席/抛错 → 兜底走 _findOfficePosByName + _offAppointPerson
  var apptCalls = [];
  var offAppointCalls = [];
  var ch = { name: '赵六', alive: true, isPlayer: false, officialTitle: '主事' };
  ctx.findCharByName = function(n) { return n === '赵六' ? ch : null; };
  ctx.onAppointment = function() { apptCalls.push({}); return null; }; // 返回非 {ok:true}
  ctx.onDismissal = function() {};
  ctx._offAppointPerson = function(pos, name) {
    offAppointCalls.push({ posName: pos.name, name: name });
    pos.holder = name;
  };
  ctx._offDismissPerson = function() {};
  ctx.toast = function() {};

  ctx.GM = { turn: 4, officeTree: makeOfficeTree(), chars: [ch], _chronicle: [] };
  ctx.P = { playerInfo: { playerRole: 'minister', sovereignName: '测试帝' } };

  var aiOutput = {
    rationale: '赵六可任侍郎。',
    edicts: [], chaoyiSpeeches: [], memorialDecisions: [],
    officeActions: [{ kind: 'appoint', target: '赵六', newPosition: '侍郎', reason: '补缺', loyaltyDelta: 0 }]
  };

  var r = ctx.TM.SovereignAI.runTurnSync(ctx.GM, {}, aiOutput);
  assert(r.ok === true, 'fallback: ok');
  assert(r.office.applied === 1, 'fallback: applied = 1');
  assert(apptCalls.length === 1, 'fallback: onAppointment attempted');
  assert(offAppointCalls.length === 1, 'fallback: _offAppointPerson fallback called');
  assert(offAppointCalls[0].posName === '侍郎', 'fallback: position found by name');
  assert(offAppointCalls[0].name === '赵六', 'fallback: target name');
  assert(ch.officialTitle === '侍郎', 'fallback: ch.officialTitle updated to new position');
}

try {
  var ctx = buildContext();
  promoteTest(ctx);
  dismissTest(ctx);
  playerTargetTest(ctx);
  fallbackAppointTest(ctx);
  console.log('[smoke-sovereign-ai-office] PASS · 4 sub-tests · 任免变更 + 玩家通知 + 兜底路径');
  process.exit(0);
} catch (e) {
  console.error('[smoke-sovereign-ai-office] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
