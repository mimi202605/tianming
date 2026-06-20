// smoke-pop-bottomup-s1.js — S1 人口自下而上：守恒 + 地方差异 + 开关关零回归
// 用法：node scripts/smoke-pop-bottomup-s1.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HUJI = path.join(__dirname, '..', 'tm-huji-engine.js');

// ── 最小全局 stub（huji-engine 加载/运行所需）──
global.window = global;
global.TM = {};
global.turnsForMonths = function (m) { return m; };
global._getDaysPerTurn = function () { return 30; };
global.calcDateFromTurn = function () { return { adYear: 1627 }; };

vm.runInThisContext(fs.readFileSync(HUJI, 'utf8'), { filename: 'tm-huji-engine.js' });
if (!global.HujiEngine || typeof HujiEngine.tick !== 'function') {
  console.log('FAIL: HujiEngine 未加载'); process.exit(1);
}

function setup(bottomUp) {
  global.GM = {
    turn: 1, environment: { nationalLoad: 0.5 }, vars: { disasterLevel: 0 }, activeWars: [],
    population: {
      national: { mouths: 1000000, ding: 300000, households: 200000 },
      byRegion: { a: { mouths: 600000, ding: 180000, households: 120000 }, b: { mouths: 400000, ding: 120000, households: 80000 } },
      dynamics: { birthRateBase: 0.030, deathRateBase: 0.022, prosperityBonus: 0, agingPenalty: 0, diseaseBoost: 0, yearlyLog: [] }
    },
    adminHierarchy: { root: {} }
  };
  global.P = { conf: { populationBottomUpEnabled: !!bottomUp }, time: { year: 1627 }, dynamics: GM.population.dynamics };
  var L1 = { id: 'a', name: '富安省', minxin: 75, populationDetail: { mouths: 600000, ding: 180000, households: 120000 } }; // 民心高
  var L2 = { id: 'b', name: '困苦省', minxin: 25, populationDetail: { mouths: 400000, ding: 120000, households: 80000 } };  // 民心低
  global.IntegrationBridge = { getLeafDivisions: function () { return [L1, L2]; } };
  return { L1: L1, L2: L2 };
}

// ── T1·开关开：叶级增长 ──
var s = setup(true);
HujiEngine.tick({ turn: 1, monthRatio: 1, _monthRatio: 1 });
var l1net = s.L1.populationDetail.mouths - 600000;
var l2net = s.L2.populationDetail.mouths - 400000;
var sigma = s.L1.populationDetail.mouths + s.L2.populationDetail.mouths;
var nat = GM.population.national.mouths;
console.log('[T1·叶级增长] L1(民心75)净增=' + l1net + ' · L2(民心25)净增=' + l2net + ' · Σ叶=' + sigma + ' · national=' + nat);
var T1a = l1net > l2net;                 // 地方差异：民心高增长更多
var T1b = Math.abs(nat - sigma) <= 2;    // 守恒（舍入容差）
var T1c = (l1net !== 0 || l2net !== 0);  // 叶确实被写
console.log('  [T1a] 地方差异(民心高>低)：' + (T1a ? 'OK' : 'FAIL'));
console.log('  [T1b] 守恒 national==Σ叶：' + (T1b ? 'OK' : 'FAIL'));
console.log('  [T1c] 叶 populationDetail 被写：' + (T1c ? 'OK' : 'FAIL'));

// ── T2·开关关：原全国逻辑（叶级路径不碰叶 populationDetail）──
var s2 = setup(false);
HujiEngine.tick({ turn: 1, monthRatio: 1, _monthRatio: 1 });
var T2 = s2.L1.populationDetail.mouths === 600000 && s2.L2.populationDetail.mouths === 400000;
console.log('[T2·开关关零回归] 叶 populationDetail 不被叶级路径碰：' + (T2 ? 'OK' : 'FAIL'));

var all = T1a && T1b && T1c && T2;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
