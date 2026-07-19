#!/usr/bin/env node
// scripts/smoke-transmigration-role-change.js — Phase 5·Task 29 角色变更路径 smoke
// 验证：TM.Transmigration.getRoleChangePaths / triggerRoleChange
//   - getRoleChangePaths(role)：返回该 role 的变更路径表（或 null）
//   - triggerRoleChange(kind, payload)：应用 playerRole 变更 + 同步 underlying character
//   - 守卫：非穿越模式 / emperor / 未知 kind / 未知 role 全拒绝
//   - 路径覆盖：minister·general·prince·merchant·eunuch·maid·commoner·bandit·retired_official·monk·artisan·actor·infant·custom

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
    turn: 7,
    chars: [
      { name: '测试君主', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true },
      { name: characterName || '李大臣', alive: true, isPlayer: true, officialTitle: '尚书', role: '臣' }
    ],
    _edictTracker: []
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: playerRole || 'minister',
      characterName: characterName || '李大臣',
      characterTitle: '尚书',
      sovereignName: '测试君主'
    }
  };
  ctx.uid = function() { return 'smoke-uid-' + Math.random().toString(36).slice(2,8); };
  ctx.toast = function() {};
  ctx.addEB = function() {};
  ctx.NpcMemorySystem = { addMemory: function() {} };
}

function getPathsTest(ctx) {
  setupCtx(ctx, 'minister', '李大臣');
  var p = ctx.TM.Transmigration.getRoleChangePaths('minister');
  assert(p !== null, 'getPaths-minister: 非空');
  assert(p.resign && p.retire, 'getPaths-minister: resign+retire 在');
  assert(p.resign.label && p.resign.newRole, 'getPaths-minister: 字段齐全');

  var p2 = ctx.TM.Transmigration.getRoleChangePaths('emperor');
  assert(p2 === null, 'getPaths-emperor: null（emperor 无变更路径）');

  var p3 = ctx.TM.Transmigration.getRoleChangePaths('bogusRole');
  assert(p3 === null, 'getPaths-bogus: null');

  // 验证所有 14 种 playerRole 都有路径
  ['minister','general','prince','merchant','eunuch','maid','commoner','bandit','retired_official','monk','artisan','actor','infant','custom'].forEach(function(r){
    var pp = ctx.TM.Transmigration.getRoleChangePaths(r);
    assert(pp !== null, 'getPaths-' + r + ': 非空');
    assert(Object.keys(pp).length >= 1, 'getPaths-' + r + ': 至少 1 条路径');
  });
}

function triggerResignTest(ctx) {
  setupCtx(ctx, 'minister', '李大臣');
  var r = ctx.TM.Transmigration.triggerRoleChange('resign', {});
  assert(r.ok === true, 'trigger-resign: ok');
  assert(r.kind === 'resign', 'trigger-resign: kind');
  assert(r.fromRole === 'minister', 'trigger-resign: fromRole');
  assert(r.newRole === 'commoner', 'trigger-resign: newRole=commoner');
  assert(ctx.P.playerInfo.playerRole === 'commoner', 'trigger-resign: P.playerInfo 已更新');
  // underlying character 同步
  var pc = ctx.GM.chars.find(function(c){ return c.isPlayer; });
  assert(pc.playerRole === 'commoner', 'trigger-resign: char.playerRole 已同步');
}

function triggerRetireTest(ctx) {
  setupCtx(ctx, 'minister', '王老臣');
  var r = ctx.TM.Transmigration.triggerRoleChange('retire', {});
  assert(r.ok === true, 'trigger-retire: ok');
  assert(r.newRole === 'retired_official', 'trigger-retire: newRole=retired_official');
  assert(ctx.P.playerInfo.playerRole === 'retired_official', 'trigger-retire: P.playerInfo 已更新');
}

function triggerReinstateTest(ctx) {
  // retired_official → minister（起复）
  setupCtx(ctx, 'retired_official', '赵归田');
  var r = ctx.TM.Transmigration.triggerRoleChange('reinstate', {});
  assert(r.ok === true, 'trigger-reinstate: ok');
  assert(r.fromRole === 'retired_official', 'trigger-reinstate: fromRole');
  assert(r.newRole === 'minister', 'trigger-reinstate: newRole=minister');
}

function generalDemobilizeTest(ctx) {
  setupCtx(ctx, 'general', '周将军');
  var r = ctx.TM.Transmigration.triggerRoleChange('demobilize', {});
  assert(r.ok === true, 'trigger-demobilize: ok');
  assert(r.newRole === 'retired_official', 'trigger-demobilize: newRole=retired_official');
}

function generalReinstateTest(ctx) {
  setupCtx(ctx, 'general', '吴将军');
  var r = ctx.TM.Transmigration.triggerRoleChange('reinstate', {});
  assert(r.ok === true, 'trigger-general-reinstate: ok');
  assert(r.newRole === 'minister', 'trigger-general-reinstate: newRole=minister（改授文衔）');
}

function princeInheritTest(ctx) {
  setupCtx(ctx, 'prince', '朱宗亲');
  var r = ctx.TM.Transmigration.triggerRoleChange('inherit', { newTitle: '嗣王' });
  assert(r.ok === true, 'trigger-inherit: ok');
  assert(r.newRole === 'prince', 'trigger-inherit: newRole=prince（仍宗室）');
  // newTitle 同步
  var pc = ctx.GM.chars.find(function(c){ return c.isPlayer; });
  assert(pc.officialTitle === '嗣王', 'trigger-inherit: newTitle 已同步');
  assert(ctx.P.playerInfo.characterTitle === '嗣王', 'trigger-inherit: characterTitle 已同步');
}

function banditAmnestyTest(ctx) {
  setupCtx(ctx, 'bandit', '山大王');
  var r = ctx.TM.Transmigration.triggerRoleChange('amnesty', {});
  assert(r.ok === true, 'trigger-amnesty: ok');
  assert(r.newRole === 'general', 'trigger-amnesty: newRole=general（从军效用）');
}

function monkSecularizeTest(ctx) {
  setupCtx(ctx, 'monk', '慧明');
  var r = ctx.TM.Transmigration.triggerRoleChange('secularize', {});
  assert(r.ok === true, 'trigger-secularize: ok');
  assert(r.newRole === 'commoner', 'trigger-secularize: newRole=commoner');
}

function infantGrowUpTest(ctx) {
  setupCtx(ctx, 'infant', '小皇子');
  var r = ctx.TM.Transmigration.triggerRoleChange('growUp', {});
  assert(r.ok === true, 'trigger-growUp: ok');
  assert(r.newRole === 'prince', 'trigger-growUp: newRole=prince（依宗亲例授爵）');
}

function guardNonTransmigrationTest(ctx) {
  setupCtx(ctx, 'minister', '李大臣');
  ctx.P.playerInfo.transmigrationMode = false;
  var r = ctx.TM.Transmigration.triggerRoleChange('resign', {});
  assert(r.ok === false, 'guard-nonTrans: 拒绝');
  assert(/非穿越模式/.test(r.reason), 'guard-nonTrans: reason');
}

function guardEmperorTest(ctx) {
  setupCtx(ctx, 'emperor', '测试君主');
  var r = ctx.TM.Transmigration.triggerRoleChange('resign', {});
  assert(r.ok === false, 'guard-emperor: 拒绝');
  assert(/非穿越角色/.test(r.reason), 'guard-emperor: reason');
}

function guardUnknownKindTest(ctx) {
  setupCtx(ctx, 'minister', '李大臣');
  var r = ctx.TM.Transmigration.triggerRoleChange('bogusKind', {});
  assert(r.ok === false, 'guard-unknownKind: 拒绝');
  assert(/未知变更类型/.test(r.reason), 'guard-unknownKind: reason');
}

function guardUnknownRoleTest(ctx) {
  setupCtx(ctx, 'custom', '某角色'); // custom 在表中，但先改 playerRole 为表中不存在的值
  ctx.P.playerInfo.playerRole = 'bogusRole';
  var r = ctx.TM.Transmigration.triggerRoleChange('anyKind', {});
  assert(r.ok === false, 'guard-unknownRole: 拒绝');
  assert(/无变更路径/.test(r.reason), 'guard-unknownRole: reason');
}

try {
  var ctx = buildContext();
  getPathsTest(ctx);
  triggerResignTest(ctx);
  triggerRetireTest(ctx);
  triggerReinstateTest(ctx);
  generalDemobilizeTest(ctx);
  generalReinstateTest(ctx);
  princeInheritTest(ctx);
  banditAmnestyTest(ctx);
  monkSecularizeTest(ctx);
  infantGrowUpTest(ctx);
  guardNonTransmigrationTest(ctx);
  guardEmperorTest(ctx);
  guardUnknownKindTest(ctx);
  guardUnknownRoleTest(ctx);
  console.log('[smoke-transmigration-role-change] PASS · 14 sub-tests · getRoleChangePaths + triggerRoleChange (minister/general/prince/bandit/monk/infant) + 4 守卫');
  process.exit(0);
} catch (e) {
  console.error('[smoke-transmigration-role-change] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
