#!/usr/bin/env node
// scripts/smoke-transmigration-regent.js — Phase 4·Task 14 摄政权臣特殊路径 smoke
// 验证：TM.Transmigration.runRegentAction(action, payload) + roleAction(action, payload)
//   - proxyEdict：落账 source:'regent-proxy' + 调 triggerHuangweiEvent('brokenPromise') + 调 buildRegentSignal
//   - returnPower：transmigrationMode=false + playerRole='emperor'
//   - holdPower：调 handleCrisisAction({type:'power_minister', action:'purge'})
//   - roleAction：落账 source:'player-action'

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
  ctx.TM = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-transmigration.js'), 'utf8'), ctx, { filename: 'tm-transmigration.js' });
  return ctx;
}

function setupCtx(ctx, playerRole, characterName) {
  ctx.GM = {
    turn: 12,
    chars: [
      { name: '测试君主', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true }
    ],
    _edictTracker: []
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: playerRole || 'regent',
      characterName: characterName || '张摄政',
      sovereignName: '测试君主'
    }
  };
  ctx.uid = function() { return 'smoke-uid-' + Math.random().toString(36).slice(2,8); };
  ctx.toast = function() {};
  ctx.canPerformAction = function(charName, action, role) {
    if (action === 'tingtui' || action === 'recommend' || action === 'requestExpedition' ||
        action === 'tribute' || action === 'submitMemorial' || action === 'pillowTalk') {
      return { can: true, reason: 'mock-permit' };
    }
    return { can: false, reason: 'mock-deny' };
  };
}

function proxyEdictTest(ctx) {
  setupCtx(ctx, 'regent', '张摄政');
  var hwCalls = [];
  var signalCalls = [];
  ctx.AuthorityComplete = {
    triggerHuangweiEvent: function(kind, payload) {
      hwCalls.push({ kind: kind, payload: payload });
      return { ok: true, hw: 85 };
    }
  };
  ctx.TM.InfluenceGroups = {
    buildRegentSignal: function(root) {
      signalCalls.push({ root: root });
      return { active: true, hardCeiling: true, role: 'regent' };
    }
  };

  var r = ctx.TM.Transmigration.runRegentAction('proxyEdict', { content: '诏令天下·大赦', category: '代诏' });
  assert(r.ok === true, 'proxyEdict: ok');
  assert(r.action === 'proxyEdict', 'proxyEdict: action');
  assert(r.source === 'regent-proxy', 'proxyEdict: source = regent-proxy');

  var rec = ctx.GM._edictTracker[0];
  assert(rec, 'proxyEdict: _edictTracker has 1 record');
  assert(rec.source === 'regent-proxy', 'proxyEdict: source = regent-proxy');
  assert(rec.content === '诏令天下·大赦', 'proxyEdict: content preserved');
  assert(rec.category === '代诏', 'proxyEdict: category = 代诏');
  assert(rec.turn === 12, 'proxyEdict: turn = 12');
  assert(rec.status === 'pending', 'proxyEdict: status = pending');
  assert(rec.proxyRegent === '张摄政', 'proxyEdict: proxyRegent = 张摄政');

  assert(hwCalls.length === 1, 'proxyEdict: triggerHuangweiEvent called once');
  assert(hwCalls[0].kind === 'brokenPromise', 'proxyEdict: huangwei kind = brokenPromise');

  assert(signalCalls.length === 1, 'proxyEdict: buildRegentSignal called once');
  assert(signalCalls[0].root === ctx.GM, 'proxyEdict: buildRegentSignal root = GM');
}

function proxyEdictEmptyContentTest(ctx) {
  setupCtx(ctx, 'regent', '张摄政');
  var r = ctx.TM.Transmigration.runRegentAction('proxyEdict', { content: '' });
  assert(r.ok === false, 'proxyEdict-empty: empty content rejected');
  assert(/为空/.test(r.reason), 'proxyEdict-empty: reason 含"为空"');
}

function returnPowerTest(ctx) {
  setupCtx(ctx, 'regent', '张摄政');
  var r = ctx.TM.Transmigration.runRegentAction('returnPower', {});
  assert(r.ok === true, 'returnPower: ok');
  assert(r.action === 'returnPower', 'returnPower: action');
  assert(ctx.P.playerInfo.transmigrationMode === false, 'returnPower: transmigrationMode = false');
  assert(ctx.P.playerInfo.playerRole === 'emperor', 'returnPower: playerRole = emperor');
}

function holdPowerTest(ctx) {
  setupCtx(ctx, 'regent', '张摄政');
  var crisisCalls = [];
  ctx.AuthorityComplete = {
    handleCrisisAction: function(req, ctx2) {
      crisisCalls.push({ req: req, ctx: ctx2 });
      return { triggered: true, type: 'power_minister' };
    }
  };

  var r = ctx.TM.Transmigration.runRegentAction('holdPower', {});
  assert(r.ok === true, 'holdPower: ok');
  assert(r.action === 'holdPower', 'holdPower: action');

  assert(crisisCalls.length === 1, 'holdPower: handleCrisisAction called once');
  assert(crisisCalls[0].req.type === 'power_minister', 'holdPower: crisis.type = power_minister');
  assert(crisisCalls[0].req.action === 'purge', 'holdPower: crisis.action = purge');
  assert(crisisCalls[0].req.target === '张摄政', 'holdPower: crisis.target = 张摄政');
  assert(/权臣拒还/.test(crisisCalls[0].req.reason), 'holdPower: reason 含"权臣拒还"');
}

function roleActionTest(ctx) {
  setupCtx(ctx, 'minister', '李大臣');
  var r = ctx.TM.Transmigration.roleAction('tingtui', { content: '廷推人选', category: '廷推' });
  assert(r.ok === true, 'roleAction: ok');
  assert(r.action === 'tingtui', 'roleAction: action = tingtui');

  var rec = ctx.GM._edictTracker[0];
  assert(rec, 'roleAction: _edictTracker has 1 record');
  assert(rec.source === 'player-action', 'roleAction: source = player-action');
  assert(rec.playerRole === 'minister', 'roleAction: playerRole = minister');
  assert(rec.playerAction === 'tingtui', 'roleAction: playerAction = tingtui');
  assert(rec.content === '廷推人选', 'roleAction: content preserved');
}

function roleActionGuardTest(ctx) {
  // 非穿越模式 → 拒绝
  setupCtx(ctx, 'emperor', '某臣');
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ctx.TM.Transmigration.roleAction('tingtui', {});
  assert(r1.ok === false, 'roleAction-guard: 非穿越模式拒绝');
  assert(/非穿越模式/.test(r1.reason), 'roleAction-guard: reason');

  // 皇帝角色 → 拒绝（不应触发玩家动作）
  setupCtx(ctx, 'emperor', '某臣');
  var r2 = ctx.TM.Transmigration.roleAction('tingtui', {});
  assert(r2.ok === false, 'roleAction-guard: emperor 角色拒绝');
}

function regentGuardTest(ctx) {
  // 非摄政角色调 runRegentAction → 拒绝
  setupCtx(ctx, 'minister', '李大臣');
  var r = ctx.TM.Transmigration.runRegentAction('proxyEdict', { content: 'test' });
  assert(r.ok === false, 'regent-guard: 非摄政角色拒绝');
  assert(/非摄政角色/.test(r.reason), 'regent-guard: reason');

  // 非穿越模式 → 拒绝
  setupCtx(ctx, 'regent', '张摄政');
  ctx.P.playerInfo.transmigrationMode = false;
  var r2 = ctx.TM.Transmigration.runRegentAction('proxyEdict', { content: 'test' });
  assert(r2.ok === false, 'regent-guard: 非穿越模式拒绝');
}

function unknownActionTest(ctx) {
  setupCtx(ctx, 'regent', '张摄政');
  var r = ctx.TM.Transmigration.runRegentAction('bogusAction', {});
  assert(r.ok === false, 'unknown-action: 拒绝');
  assert(/未知 action/.test(r.reason), 'unknown-action: reason 含"未知 action"');
}

try {
  var ctx = buildContext();
  proxyEdictTest(ctx);
  proxyEdictEmptyContentTest(ctx);
  returnPowerTest(ctx);
  holdPowerTest(ctx);
  roleActionTest(ctx);
  roleActionGuardTest(ctx);
  regentGuardTest(ctx);
  unknownActionTest(ctx);
  console.log('[smoke-transmigration-regent] PASS · 8 sub-tests · runRegentAction(proxyEdict/returnPower/holdPower) + roleAction + 守卫');
  process.exit(0);
} catch (e) {
  console.error('[smoke-transmigration-regent] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
