#!/usr/bin/env node
// smoke-class-satisfaction-signal-gate.js
// 证伪「阶层满意度跳楼式下降」:social-political-signal → ecology → applyClassImpact 这条线
// 过去直写 cls.satisfaction·绕过 ClassEngine.gateSatisfaction 的每回合 ±14 预算总闸。
// 单回合 19 个 ecology 信号各 -6 → 军户 73 连扣到 0。本次修把满意度路由进总闸。
// 本 smoke 用真源码(tm-class-engine.js + tm-social-political-signals.js)在 vm 实跑:
//   ① 有总闸:19×(-6) 一回合只允许扣到预算(73→59)·非跳楼到 0
//   ② swap-test:摘掉 gateSatisfaction → 退回旧直写 → 真复现跳楼到 0(坐实总闸 load-bearing)
//   ③ 预算每阶层独立·非全局共用
//   ④ 变化流只记真正生效的几笔(被 cap 成 0 的不污染 feed)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

function makeCtx() {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.console = { log() {}, warn() {}, error() {} };
  sandbox.Date = Date;
  vm.createContext(sandbox);
  ['tm-class-engine.js', 'tm-social-political-signals.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), sandbox, { filename: f });
  });
  return sandbox;
}

function freshGM() {
  return {
    turn: 7,
    classes: [
      { name: '军户', satisfaction: 73, influence: 100, population: 1200000 },
      { name: '农户', satisfaction: 60, influence: 40, population: 8000000 }
    ]
  };
}

function clsByName(GM, n) { return GM.classes.filter(function (c) { return c.name === n; })[0]; }

// 灌 19 个 ecology 风格信号(全针对军户·各 -6),再 applyPending(同回合 → 共享预算)
function run19(ctx, GM, target) {
  const SPS = ctx.TM.SocialPoliticalSignals;
  for (let i = 0; i < 19; i += 1) {
    SPS.record(GM, {
      sourceSystem: 'party-class-ecology-signal',
      kind: 'ecology',
      turn: 7,
      intensity: 1,
      reason: 'ecology matched corvee/military/keju',
      // 关键:跳过 ecology 二次富集(我们直接喂「富集后」的 affectedClasses·隔离测应用层)
      skipEcology: true,
      affectedClasses: [{
        name: target,
        satisfactionDelta: -6,
        reason: 'ecology matched corvee/military/keju'
      }]
    });
  }
  return SPS.applyPending(GM, { turn: 7, source: 'smoke' });
}

console.log('smoke-class-satisfaction-signal-gate');

// ════ ① 有总闸:19×(-6) 一回合被预算夹住·非跳楼到 0 ════
const ctx = makeCtx();
ok(ctx.TM && ctx.TM.ClassEngine && typeof ctx.TM.ClassEngine.gateSatisfaction === 'function',
  '① ClassEngine.gateSatisfaction 已加载(总闸存在)');
ok(ctx.TM && ctx.TM.SocialPoliticalSignals && typeof ctx.TM.SocialPoliticalSignals.applyPending === 'function',
  '① SocialPoliticalSignals.applyPending 已加载');

const GM = freshGM();
const jun0 = clsByName(GM, '军户').satisfaction;
run19(ctx, GM, '军户');
const jun = clsByName(GM, '军户');
const drop = jun0 - jun.satisfaction;
ok(jun0 === 73, '① 军户初始满意度 73');
ok(jun.satisfaction > 0, '①【修后】19×(-6) 后军户满意度 > 0(未跳楼到 0)·实=' + jun.satisfaction);
ok(drop <= 14.001, '①【修后】单回合总跌幅 <= 预算 14·实跌=' + Math.round(drop * 100) / 100);
ok(Math.abs(jun.satisfaction - 59) < 0.5, '①【修后】军户落在 73-14=59 附近(预算夹取)·实=' + jun.satisfaction);
ok(jun._satBudget && jun._satBudget.turn === 7 && Math.abs(jun._satBudget.used - 14) < 0.5,
  '① 军户本回合预算 used ≈ 14(已耗尽)·实=' + (jun._satBudget ? jun._satBudget.used : 'n/a'));

// ④ 变化流:只记真正生效的几笔(被 cap 成 0 的不进 feed)
const junChanges = (GM.turnChanges && GM.turnChanges.classes || []).filter(function (x) {
  return x && x.name === '军户';
})[0];
const satChanges = junChanges ? junChanges.changes.filter(function (c) { return c.field === 'satisfaction'; }) : [];
ok(satChanges.length > 0 && satChanges.length <= 4,
  '④ 变化流只记 ' + satChanges.length + ' 笔满意度变化(非 19 笔刷屏·被 cap 的 0 变化不记)');
ok(satChanges.every(function (c) { return c.oldValue !== c.newValue; }),
  '④ 记入的每笔都是真实变动(old≠new)');

// ③ 预算每阶层独立:农户(同回合也被灌)走自己的 14 预算·不蹭军户的
const GM2 = freshGM();
run19(ctx, GM2, '军户');
run19(ctx, GM2, '农户');
const nong = clsByName(GM2, '农户');
ok(Math.abs((60 - nong.satisfaction) - 14) < 0.5,
  '③ 农户独立预算:同回合也被 19×(-6) 砸·只跌 14(60→46)·与军户预算互不挪用·实=' + nong.satisfaction);

// ════ ② swap-test:摘掉 gateSatisfaction → 退回旧直写 → 真复现跳楼到 0 ════
const ctx2 = makeCtx();
const savedGate = ctx2.TM.ClassEngine.gateSatisfaction;
ctx2.TM.ClassEngine.gateSatisfaction = undefined; // 模拟「无总闸」的旧旁路
const GM3 = freshGM();
run19(ctx2, GM3, '军户');
const junOld = clsByName(GM3, '军户');
ok(junOld.satisfaction === 0,
  '②【swap·无总闸】19×(-6)=-114 直写 → 军户跳楼到 0(坐实总闸 load-bearing·复现 owner 截图)·实=' + junOld.satisfaction);
ctx2.TM.ClassEngine.gateSatisfaction = savedGate; // 还原

console.log('\n结果: ' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
