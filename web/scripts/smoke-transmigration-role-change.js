// ============================================================
// smoke-transmigration-role-change.js — 穿越模式身份变更路径 smoke（A9 重写）
// ------------------------------------------------------------
// 断言：_ROLE_CHANGE_PATHS 结构 / getRoleChangePaths 数组返回 /
//      triggerRoleChange 查表语义 / 16 种 playerRole 覆盖
// 末尾打印 [smoke-transmigration-role-change] PASS · N sub-tests
// ============================================================

'use strict';
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

var sandbox = {
  console: console,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  Date: Date, Math: Math, JSON: JSON,
  Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean, Error: Error,
  window: null, TM: {}, P: { playerInfo: null }, GM: null,
  module: { exports: null }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

function loadFile(rel) {
  var code = fs.readFileSync(path.join(WEB_DIR, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

loadFile('tm-transmigration.js');
var T = sandbox.TM.Transmigration;
ok('Transmigration 导出', !!T);
ok('getRoleChangePaths 是函数', typeof T.getRoleChangePaths === 'function');
ok('triggerRoleChange 是函数', typeof T.triggerRoleChange === 'function');
ok('_ROLE_CHANGE_PATHS 导出', !!T._ROLE_CHANGE_PATHS);

// ── getRoleChangePaths 结构断言 ─────────────────────────────
ok('commoner 路径数 3', T.getRoleChangePaths('commoner').length === 3,
   'got: ' + T.getRoleChangePaths('commoner').length);
ok('emperor 路径数 0（隐式兜底）', T.getRoleChangePaths('emperor').length === 0);
ok('unknown role 兜底为空数组', T.getRoleChangePaths('xxx_unknown').length === 0);
ok('custom 路径数 0（显式空数组）', T.getRoleChangePaths('custom').length === 0);

// 路径对象字段结构
var commonerPaths = T.getRoleChangePaths('commoner');
ok('路径对象含 kind 字段', commonerPaths.every(function (p) { return typeof p.kind === 'string'; }));
ok('路径对象含 label 字段', commonerPaths.every(function (p) { return typeof p.label === 'string'; }));
ok('路径对象含 nextRole 字段', commonerPaths.every(function (p) { return typeof p.nextRole === 'string'; }));
ok('路径对象含 desc 字段', commonerPaths.every(function (p) { return typeof p.desc === 'string'; }));
ok('路径对象含 condition 函数', commonerPaths.every(function (p) { return typeof p.condition === 'function'; }));

// 不变性：getRoleChangePaths 返回 .slice() 副本
var arr1 = T.getRoleChangePaths('commoner');
arr1.push({ fake: true });
var arr2 = T.getRoleChangePaths('commoner');
ok('getRoleChangePaths 返回副本（外部修改不影响内部）', arr2.length === 3,
   'got: ' + arr2.length);

// ── 16 种 playerRole 覆盖断言 ──────────────────────────────
var ROLES = ['minister','general','regent','prince','merchant','commoner','infant',
             'retired_official','bandit','monk','eunuch','maid','artisan','actor','custom'];
ROLES.forEach(function (role) {
  var paths = T.getRoleChangePaths(role);
  ok(role + ' 路径为数组', Array.isArray(paths));
});

// ── triggerRoleChange 查表 + 执行语义断言 ─────────────────
// 2026-07-21 修·C1：triggerRoleChange 现在会真正执行角色转换（不再空壳）·
//   每次 triggerRoleChange 调用会改变 P.playerInfo.playerRole·故每次调用前须重置 role。
sandbox.P.playerInfo = { playerRole: 'commoner' };

var r1 = T.triggerRoleChange('study');
ok('triggerRoleChange(study) 返回 ok', r1.ok === true);
ok('triggerRoleChange(study).path.nextRole === minister', r1.path && r1.path.nextRole === 'minister');
ok('triggerRoleChange(study).path.label === 读书考科举', r1.path && r1.path.label === '读书考科举');
ok('triggerRoleChange(study) 真正切换了 playerRole', sandbox.P.playerInfo.playerRole === 'minister',
   'got: ' + sandbox.P.playerInfo.playerRole);

// 重置·测 unknown kind
sandbox.P.playerInfo = { playerRole: 'commoner' };
var r2 = T.triggerRoleChange('unknown_kind');
ok('triggerRoleChange(unknown) 返回 not ok', r2.ok === false);
ok('triggerRoleChange(unknown).reason === unknown-kind', r2.reason === 'unknown-kind');

// 无 role 场景
sandbox.P.playerInfo = null;
var r3 = T.triggerRoleChange('study');
ok('triggerRoleChange 无 role 返回 no-role', r3.ok === false && r3.reason === 'no-role');

// payload 透传
sandbox.P.playerInfo = { playerRole: 'commoner' };
var r4 = T.triggerRoleChange('study', { note: 'test' });
ok('triggerRoleChange payload 透传', r4.ok && r4.payload && r4.payload.note === 'test');

// ── 特定 role 路径断言（每次调用前重置 role·因 trigger 会改 role）──
sandbox.P.playerInfo = { playerRole: 'minister' };
ok('minister 有 retire 路径', T.triggerRoleChange('retire').ok === true);

sandbox.P.playerInfo = { playerRole: 'minister' };
ok('minister 有 dismissed 路径', T.triggerRoleChange('dismissed').ok === true);

sandbox.P.playerInfo = { playerRole: 'minister' };
ok('minister 无 rebel 路径', T.triggerRoleChange('rebel').ok === false);

sandbox.P.playerInfo = { playerRole: 'general' };
var rRebel = T.triggerRoleChange('rebel');
ok('general 有 rebel 路径', rRebel.ok === true);
ok('general rebel nextRole === emperor', rRebel.path && rRebel.path.nextRole === 'emperor');

// ── 总结 ───────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-role-change] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-role-change] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
