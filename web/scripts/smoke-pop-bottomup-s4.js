// smoke-pop-bottomup-s4.js — S4 京畿虹吸叶级化：首都流入/外省流出 + 守恒(叶间转移)
// 用法：node scripts/smoke-pop-bottomup-s4.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HUJI = path.join(__dirname, '..', 'tm-huji-engine.js');
global.window = global; global.TM = {};
global.turnsForMonths = function (m) { return m; };
global._getDaysPerTurn = function () { return 30; };
global.calcDateFromTurn = function () { return { adYear: 1627 }; };
vm.runInThisContext(fs.readFileSync(HUJI, 'utf8'), { filename: 'tm-huji-engine.js' });
if (!global.HujiEngine || typeof HujiEngine.tick !== 'function') { console.log('FAIL: HujiEngine 未加载'); process.exit(1); }

global.GM = {
  turn: 1, year: 1627, _capital: '京师', environment: { nationalLoad: 0.5 }, vars: { disasterLevel: 0 }, activeWars: [],
  population: {
    national: { mouths: 1000000, ding: 300000, households: 200000 }, byRegion: {},
    dynamics: { birthRateBase: 0.030, deathRateBase: 0.022, prosperityBonus: 0, agingPenalty: 0, diseaseBoost: 0, yearlyLog: [] }
  },
  adminHierarchy: { root: {} }
};
global.P = { conf: { populationBottomUpEnabled: true }, time: { year: 1627 }, dynamics: GM.population.dynamics };
// 民心/生活全相同(50)·只看虹吸方向
var Cap = { id: '京师', name: '京师', minxin: 50, prosperity: 50, populationDetail: { mouths: 300000, ding: 90000, households: 60000 } };
var Out1 = { id: 'out1', name: '外省甲', minxin: 50, prosperity: 50, populationDetail: { mouths: 400000, ding: 120000, households: 80000 } };
var Out2 = { id: 'out2', name: '外省乙', minxin: 50, prosperity: 50, populationDetail: { mouths: 300000, ding: 90000, households: 60000 } };
global.IntegrationBridge = { getLeafDivisions: function () { return [Cap, Out1, Out2]; } };

var sig0 = Cap.populationDetail.mouths + Out1.populationDetail.mouths + Out2.populationDetail.mouths;
HujiEngine.tick({ turn: 1, monthRatio: 1, _monthRatio: 1 });
var sig1 = Cap.populationDetail.mouths + Out1.populationDetail.mouths + Out2.populationDetail.mouths;
var nat = GM.population.national.mouths;
console.log('[S4·虹吸] 京师迁移=' + (Cap.yearlyNetMigration || 0) + ' · 外省甲迁移=' + (Out1.yearlyNetMigration || 0) + ' · 外省乙迁移=' + (Out2.yearlyNetMigration || 0));
console.log('  Σ叶=' + sig1 + ' · national=' + nat);
var T1 = (Cap.yearlyNetMigration || 0) > 0 && (Out1.yearlyNetMigration || 0) < 0 && (Out2.yearlyNetMigration || 0) < 0; // 虹吸方向：首都流入·外省流出
var T2 = Math.abs(nat - sig1) <= 3;  // 守恒(迁移=叶间转移·不改 Σ/national)
var T3 = Math.abs((Cap.yearlyNetMigration || 0) + (Out1.yearlyNetMigration || 0) + (Out2.yearlyNetMigration || 0)) <= 1; // 迁移净额守恒(Σ流动=0)
console.log('  [S4a] 京畿虹吸方向(首都流入·外省流出)：' + (T1 ? 'OK' : 'FAIL'));
console.log('  [S4b] 守恒 national==Σ叶：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [S4c] 迁移净额守恒(Σ流动=0)：' + (T3 ? 'OK' : 'FAIL'));
var all = T1 && T2 && T3;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
