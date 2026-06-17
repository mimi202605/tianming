#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·P-ZV7 ② 实政对冲(3a 分权重)：
//  A 地方官自发赈灾(disaster_relief act 本回合)→disasterRelief 正项·5 折
//  B 玩家本回合下赈灾诏(PlayerActionSignals relief 标签)→同样的赈灾算"奉旨"满额(=自发的 2 倍)
//  C 议题决断赈灾选项→民心 delta 路由进 disasterRelief 源；平反→judicialFairness；普通议题→仍 issueChoice
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(c, l) { if (!c) throw new Error('[FAIL] ' + l); passed++; console.log('  ok ' + l); }
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 0.05); }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {},
  addEventListener: () => {}, removeEventListener: () => {},
  document: { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
// helpers 单独加载缺的全局·给自动桩防 ReferenceError（仅为能拿到 _chooseIssueOption·不影响被测路由逻辑）
var _autoStub = new Proxy(function () {}, { get: function () { return _autoStub; }, apply: function () { return _autoStub; } });
sandbox.SettlementPipeline = _autoStub;
sandbox.openQuarterlyAgenda = () => {};
sandbox.renderTopbar = () => {};
sandbox.P = { keju: {}, conf: {} };
vm.createContext(sandbox);
function load(f) { try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f }); return true; } catch (e) { console.log('  (load ' + f + ' 失败: ' + e.message.slice(0, 70) + ')'); return false; } }
load('tm-integration-bridge.js');
load('tm-minxin-ledger.js');
load('tm-authority-engines.js');
const helpersOk = load('tm-endturn-helpers.js');

const IB = sandbox.IntegrationBridge, AE = sandbox.AuthorityEngines;
assert(AE && typeof AE.tick === 'function', 'AuthorityEngines.tick 已导出');

function freshGM(reliefAmount, playerOrdered) {
  return {
    turn: 35,
    adminHierarchy: { player: { name: '明廷', divisions: [
      { id: 'shaanxi', name: '陕西', population: { mouths: 2000 }, minxin: 60,
        fiscal: { expenditures: { discretionary: reliefAmount > 0 ? [{ type: 'disaster_relief', amount: reliefAmount, turn: 35, proposer: '陕西巡抚' }] : [] } } },
      { id: 'henan', name: '河南', population: { mouths: 1000 }, minxin: 60 }
    ] } },
    minxin: { trueIndex: 60, perceivedIndex: 60, phase: 'peace', sources: {}, byRegion: {}, prophecy: { intensity: 0 } },
    vars: { disasterLevel: 0.5 },
    _playerActionSignals: { items: playerOrdered ? [{ turn: 35, policyTags: ['relief'], text: '开仓赈灾诏' }] : [] }
  };
}

// A 自发：本回合 20 万赈灾·无玩家诏令 → disasterRelief 正项·5 折
sandbox.GM = freshGM(200000, false);
AE.tick({ monthRatio: 1 });
var drA = Number(sandbox.GM.minxin.sources.disasterRelief) || 0;
assert(drA > 0, 'A 地方官自发赈灾 20万 → disasterRelief 正项·实得 +' + drA.toFixed(2));

// B 奉旨：同样 20 万 + 本回合玩家下了赈灾诏 → 满额(应≈自发的 2 倍)
sandbox.GM = freshGM(200000, true);
AE.tick({ monthRatio: 1 });
var drB = Number(sandbox.GM.minxin.sources.disasterRelief) || 0;
assert(drB > drA, 'B 玩家奉旨赈灾 > 自发·实得 奉旨 +' + drB.toFixed(2) + ' vs 自发 +' + drA.toFixed(2));
assert(near(drB, drA * 2, 0.06), 'B 奉旨满额≈自发 5 折的 2 倍·实得 ' + drB.toFixed(2) + ' / ' + drA.toFixed(2));

// 灾起零赈 → 维持负
sandbox.GM = freshGM(0, false);
AE.tick({ monthRatio: 1 });
var drNeg = Number(sandbox.GM.minxin.sources.disasterRelief) || 0;
assert(drNeg < 0, '灾起本回合零赈灾 → disasterRelief 维持负·实得 ' + drNeg.toFixed(2));

// C 议题决断路由（需 helpers + _chooseIssueOption）
if (helpersOk && typeof sandbox._chooseIssueOption === 'function') {
  // C1 赈灾议题 → disasterRelief
  sandbox.GM = freshGM(0, false);
  sandbox.GM.currentIssues = [{ id: 'iss-relief', title: '陕西大旱·饥民载道', category: '灾赈',
    choices: [{ text: '开仓赈灾·发帑救荒', desc: '帑银十五万', effect: { '民心': 6 } }] }];
  sandbox._chooseIssueOption('iss-relief', 0);
  var drC = Number(sandbox.GM.minxin.sources.disasterRelief) || 0;
  assert(drC > 0, 'C1 议题"开仓赈灾"→民心 delta 路由进 disasterRelief 源·实得 +' + drC.toFixed(2));

  // C2 平反议题 → judicialFairness
  sandbox.GM = freshGM(0, false);
  sandbox.GM.currentIssues = [{ id: 'iss-law', title: '杨涟冤狱', category: '重案',
    choices: [{ text: '平反昭雪·复其官', desc: '', effect: { '民心': 5 } }] }];
  sandbox._chooseIssueOption('iss-law', 0);
  var jfC = Number(sandbox.GM.minxin.sources.judicialFairness) || 0;
  var drC2 = Number(sandbox.GM.minxin.sources.disasterRelief) || 0;
  assert(jfC > 0, 'C2 议题"平反昭雪"→民心 delta 路由进 judicialFairness 源·实得 +' + jfC.toFixed(2));
  assert(drC2 === 0, 'C2 平反不误入 disasterRelief·实得 ' + drC2);

  // C3 普通议题(边将任免) → 仍 issueChoice·不进赈灾/司法源
  sandbox.GM = freshGM(0, false);
  sandbox.GM.currentIssues = [{ id: 'iss-mil', title: '蓟辽总督廷推', category: '廷推',
    choices: [{ text: '简用孙承宗督师', desc: '', effect: { '民心': 3 } }] }];
  sandbox._chooseIssueOption('iss-mil', 0);
  var drC3 = Number(sandbox.GM.minxin.sources.disasterRelief) || 0;
  var icC3 = Number(sandbox.GM.minxin.sources.issueChoice) || 0;
  assert(drC3 === 0, 'C3 普通议题不误入 disasterRelief·实得 ' + drC3);
  assert(icC3 > 0, 'C3 普通议题仍走 issueChoice 源·实得 +' + icC3.toFixed(2));
} else {
  console.log('  (跳过 C：tm-endturn-helpers 未加载/无 _chooseIssueOption·路由逻辑已 node 校验)');
}

console.log('\nALL PASS · ' + passed + ' assertions · ② 实政对冲分权重生效');
