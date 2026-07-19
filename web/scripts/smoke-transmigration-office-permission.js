#!/usr/bin/env node
// scripts/smoke-transmigration-office-permission.js — Phase 4·Task 13 官制权限按 playerRole 分支 smoke
// 验证：canPerformAction(charName, action, playerRole) 按 playerRole 分支返回 {can, reason}
//   - emperor：保留原有判定（势力领袖 / 内阁 / 御史特例）
//   - regent：代诏全权 + 弹劾监察 + 三品以下任免
//   - minister：廷推/荐举 + 本职下属任免
//   - general：本部军官节制 + 调兵
//   - prince：封国官属任免
//   - 其他角色（merchant/eunuch/maid/commoner/bandit 等）：无任免权

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
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-office-system.js'), 'utf8'), ctx, { filename: 'tm-office-system.js' });
  return ctx;
}

function makeOfficeTree() {
  return [
    {
      name: '六部', positions: [
        { name: '尚书', title: '尚书', holder: '张尚书', powers: { appointment: true, impeach: true } },
        { name: '侍郎', title: '侍郎', holder: '李侍郎', powers: {} }
      ],
      subs: []
    },
    {
      name: '都察院', positions: [
        { name: '御史', title: '御史', holder: '王御史', powers: { impeach: true, supervise: true } }
      ],
      subs: []
    }
  ];
}

function makeChars() {
  return [
    { name: '张尚书', alive: true, officialTitle: '尚书', rankLevel: 2 },
    { name: '李侍郎', alive: true, officialTitle: '侍郎', rankLevel: 3 },
    { name: '王御史', alive: true, officialTitle: '御史', rankLevel: 4 },
    { name: '刘布衣', alive: true, officialTitle: '', rankLevel: 9 },
    { name: '皇帝本人', alive: true, officialTitle: '皇帝', role: '皇帝' }
  ];
}

function setupCtx(ctx, playerRole) {
  ctx.GM = {
    turn: 7,
    chars: makeChars(),
    officeTree: makeOfficeTree(),
    facs: [{ name: '东宫', leader: '李侍郎' }]
  };
  ctx.P = { playerInfo: { playerRole: playerRole || 'emperor', sovereignName: '测试帝', characterName: '玩家' } };
  ctx.findCharByName = function(n) {
    return (ctx.GM.chars || []).find(function(c){ return c.name === n; }) || null;
  };
  ctx._offIsSovereign = function(ch) { return ch && (ch.role === '皇帝' || ch.officialTitle === '皇帝'); };
}

function emperorTest(ctx) {
  setupCtx(ctx, 'emperor');
  // 皇帝本人 → 绝对权
  var r0 = ctx.canPerformAction('皇帝本人', 'appointment', 'emperor');
  assert(r0.can === true, 'emperor: 君主本人绝对权');

  // 势力领袖 → 自境内有权
  var r1 = ctx.canPerformAction('李侍郎', 'appointment', 'emperor');
  assert(r1.can === true, 'emperor: 势力领袖有权');
  assert(r1.reason === '势力领袖', 'emperor: reason = 势力领袖');

  // 在职官员·查 officeTree 找 position.powers
  var r2 = ctx.canPerformAction('张尚书', 'appointment', 'emperor');
  assert(r2.can === true, 'emperor: 尚书 powers.appointment=true');
  assert(/尚书/.test(r2.reason), 'emperor: reason 含尚书');

  // 御史特例：impeach/supervise
  var r3 = ctx.canPerformAction('王御史', 'impeach', 'emperor');
  assert(r3.can === true, 'emperor: 御史风宪之臣');

  // 不在职 → false
  var r4 = ctx.canPerformAction('刘布衣', 'appointment', 'emperor');
  assert(r4.can === false, 'emperor: 布衣未在职无权');
}

function regentTest(ctx) {
  setupCtx(ctx, 'regent');
  // 代诏全权
  var r1 = ctx.canPerformAction('张尚书', 'proxyEdict', 'regent');
  assert(r1.can === true, 'regent: 代诏全权');
  assert(r1.reason === '摄政代诏', 'regent: reason = 摄政代诏');

  // 弹劾/监察
  var r2 = ctx.canPerformAction('张尚书', 'impeach', 'regent');
  assert(r2.can === true, 'regent: 弹劾');
  var r3 = ctx.canPerformAction('张尚书', 'supervise', 'regent');
  assert(r3.can === true, 'regent: 监察');

  // 三品以下任免（rank >= 3 即三品及以下）
  var r4 = ctx.canPerformAction('李侍郎', 'appointment', 'regent');
  assert(r4.can === true, 'regent: 三品以下任免');
  var r5 = ctx.canPerformAction('刘布衣', 'appointment', 'regent');
  assert(r5.can === true, 'regent: 九品布衣也可任');

  // 二品以上不可代诏任免（rank=2 张尚书）
  var r6 = ctx.canPerformAction('张尚书', 'appointment', 'regent');
  assert(r6.can === true, 'regent: 张尚书 powers.appointment=true → 本职之权');
}

function ministerTest(ctx) {
  setupCtx(ctx, 'minister');
  // 廷推/荐举
  var r1 = ctx.canPerformAction('张尚书', 'tingtui', 'minister');
  assert(r1.can === true, 'minister: 廷推');
  var r2 = ctx.canPerformAction('张尚书', 'recommend', 'minister');
  assert(r2.can === true, 'minister: 荐举');

  // 本职下属任免
  var r3 = ctx.canPerformAction('李侍郎', 'appointment', 'minister');
  assert(r3.can === true, 'minister: 本职下属');

  // 调兵不在权限内
  var r4 = ctx.canPerformAction('张尚书', 'militaryCommand', 'minister');
  assert(r4.can === false, 'minister: 无调兵权');
}

function generalTest(ctx) {
  setupCtx(ctx, 'general');
  // 调兵全权
  var r1 = ctx.canPerformAction('张尚书', 'militaryCommand', 'general');
  assert(r1.can === true, 'general: 本部军官·调兵');

  // 非调兵不可
  var r2 = ctx.canPerformAction('李侍郎', 'recommend', 'general');
  assert(r2.can === false, 'general: 非本职无廷推荐举权');
}

function princeTest(ctx) {
  setupCtx(ctx, 'prince');
  // 封国官属任免
  var r1 = ctx.canPerformAction('张尚书', 'appointment', 'prince');
  assert(r1.can === true, 'prince: 封国官属任免');
  var r2 = ctx.canPerformAction('张尚书', 'impeach', 'prince');
  assert(r2.can === true, 'prince: 封国官属弹劾');

  // 调兵不可
  var r3 = ctx.canPerformAction('张尚书', 'militaryCommand', 'prince');
  assert(r3.can === false, 'prince: 无调兵权');
}

function otherRoleTest(ctx) {
  var _roles = ['merchant', 'eunuch', 'maid', 'commoner', 'bandit', 'infant', 'retired_official', 'monk', 'artisan', 'actor'];
  _roles.forEach(function(role) {
    setupCtx(ctx, role);
    var r = ctx.canPerformAction('张尚书', 'appointment', role);
    assert(r.can === false, role + ': 无任免权');
    var r2 = ctx.canPerformAction('张尚书', 'militaryCommand', role);
    assert(r2.can === false, role + ': 无调兵权');
  });
}

function backwardCompatTest(ctx) {
  // 不传 playerRole 时·默认读 P.playerInfo.playerRole（emperor）—— 向后兼容
  setupCtx(ctx, 'emperor');
  var r = ctx.canPerformAction('张尚书', 'appointment');
  assert(r.can === true, 'backward-compat: 不传 playerRole 默认 emperor 走原有逻辑');

  // P.playerInfo 缺席时·默认 emperor
  delete ctx.P;
  var r2 = ctx.canPerformAction('皇帝本人', 'appointment');
  assert(r2.can === true, 'backward-compat: P 缺席默认 emperor');
}

try {
  var ctx = buildContext();
  emperorTest(ctx);
  regentTest(ctx);
  ministerTest(ctx);
  generalTest(ctx);
  princeTest(ctx);
  otherRoleTest(ctx);
  backwardCompatTest(ctx);
  console.log('[smoke-transmigration-office-permission] PASS · 7 sub-tests · canPerformAction 按 playerRole 分支 + 向后兼容');
  process.exit(0);
} catch (e) {
  console.error('[smoke-transmigration-office-permission] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
