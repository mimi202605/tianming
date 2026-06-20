// smoke-pop-bottomup-s2.js — S2 粮食供需驱动：缺粮区 vs 粮足区(控制民心/生活相同) + 调入缓解
// 用法：node scripts/smoke-pop-bottomup-s2.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HUJI = path.join(__dirname, '..', 'tm-huji-engine.js');
global.window = global; global.TM = {};
global.turnsForMonths = function (m) { return m; };
global._getDaysPerTurn = function () { return 30; };
global.calcDateFromTurn = function () { return { adYear: 1627 }; };
vm.runInThisContext(fs.readFileSync(HUJI, 'utf8'), { filename: 'tm-huji-engine.js' });
if (!global.HujiEngine || typeof HujiEngine.tick !== 'function') { console.log('FAIL: HujiEngine 未加载'); process.exit(1); }

function setup() {
  global.GM = {
    turn: 1, environment: { nationalLoad: 0.5 }, vars: { disasterLevel: 0 }, activeWars: [],
    population: {
      national: { mouths: 1000000, ding: 300000, households: 200000 }, byRegion: {},
      dynamics: { birthRateBase: 0.030, deathRateBase: 0.022, prosperityBonus: 0, agingPenalty: 0, diseaseBoost: 0, yearlyLog: [] }
    },
    adminHierarchy: { root: {} },
    renli: { byRegion: {
      full: { grainOutput: 100000, foodNeed: 60000, corveeRate: 0 },  // 粮足 load=0.6
      lack: { grainOutput: 30000, foodNeed: 60000, corveeRate: 0 }    // 缺粮 load=2.0
    } }
  };
  global.P = { conf: { populationBottomUpEnabled: true }, time: { year: 1627 }, dynamics: GM.population.dynamics };
  // 两叶·民心(50)/生活(50) 全相同·只粮食不同
  var Lf = { id: 'full', name: '丰饶省', minxin: 50, prosperity: 50, populationDetail: { mouths: 500000, ding: 150000, households: 100000 } };
  var Ll = { id: 'lack', name: '饥馑省', minxin: 50, prosperity: 50, populationDetail: { mouths: 500000, ding: 150000, households: 100000 } };
  global.IntegrationBridge = { getLeafDivisions: function () { return [Lf, Ll]; } };
  return { Lf: Lf, Ll: Ll };
}

// ── S2·纯粮食差异 ──
var s = setup();
HujiEngine.tick({ turn: 1, monthRatio: 1, _monthRatio: 1 });
var fNet = s.Lf.populationDetail.mouths - 500000;
var lNet = s.Ll.populationDetail.mouths - 500000;
var sigma = s.Lf.populationDetail.mouths + s.Ll.populationDetail.mouths;
var nat = GM.population.national.mouths;
console.log('[S2·粮食供需] 丰饶省(load0.6)净增=' + fNet + ' · 饥馑省(load2.0)净增=' + lNet + ' · national=' + nat + ' · Σ叶=' + sigma);
var T1 = fNet > lNet;              // 粮食地方差异
var T2 = lNet < 0;                 // 缺粮区饥荒净减
var T3 = Math.abs(nat - sigma) <= 2; // 守恒
console.log('  [S2a] 粮食地方差异(粮足>缺粮)：' + (T1 ? 'OK' : 'FAIL'));
console.log('  [S2b] 缺粮区饥荒人口净减：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [S2c] 守恒 national==Σ叶：' + (T3 ? 'OK' : 'FAIL'));

// ── S3 接口预验·调粮缓解饥荒 ──
var s2 = setup();
s2.Ll._grainInflowThisTurn = 40000; // 调入40000→供给70000>需求60000→load<1
HujiEngine.tick({ turn: 1, monthRatio: 1, _monthRatio: 1 });
var lNet2 = s2.Ll.populationDetail.mouths - 500000;
console.log('[S3预验·调粮] 饥馑省调入40000后净增=' + lNet2 + '(未调=' + lNet + ')');
var T4 = lNet2 > lNet;            // 调粮→缺口缓解→人口改善
console.log('  [S2d] 调入 grainInflow 缓解饥荒(owner"调粮过来")：' + (T4 ? 'OK' : 'FAIL'));

var all = T1 && T2 && T3 && T4;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
