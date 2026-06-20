// smoke-pop-bottomup-s5.js — S5 多回合集成 + 真实 faction/divisions 结构(2026-06-20 真机修后)
//   守恒不漂移 + 地方分化 + 长期稳定 + 关键：NPC faction 地块也增长(取叶覆盖所有 faction·非只 player)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const HUJI = path.join(__dirname, '..', 'tm-huji-engine.js');
global.window = global; global.TM = {};
global.turnsForMonths = function (m) { return m; };
global._getDaysPerTurn = function () { return 30; };
global.calcDateFromTurn = function () { return { adYear: 1627 }; };
vm.runInThisContext(fs.readFileSync(HUJI, 'utf8'), { filename: 'tm-huji-engine.js' });
if (!global.HujiEngine || typeof HujiEngine.tick !== 'function') { console.log('FAIL: HujiEngine 未加载'); process.exit(1); }

var Rich = { id: 'rich', name: '富安', minxin: 75, prosperity: 70, populationDetail: { mouths: 400000, ding: 120000, households: 80000 } };
var Poor = { id: 'poor', name: '困苦', minxin: 25, prosperity: 30, populationDetail: { mouths: 400000, ding: 120000, households: 80000 } };
var Fam  = { id: 'fam',  name: '饥馑', minxin: 50, prosperity: 50, populationDetail: { mouths: 300000, ding: 90000, households: 60000 } };
var Cap  = { id: '京师', name: '京师', minxin: 50, prosperity: 55, populationDetail: { mouths: 300000, ding: 90000, households: 60000 } };
global.GM = {
  turn: 1, year: 1627, _capital: '京师', environment: { nationalLoad: 0.5 }, vars: { disasterLevel: 0 }, activeWars: [],
  population: {
    national: { mouths: 1400000, ding: 420000, households: 280000 }, byRegion: {},
    dynamics: { birthRateBase: 0.030, deathRateBase: 0.022, prosperityBonus: 0, agingPenalty: 0, diseaseBoost: 0, yearlyLog: [] }
  },
  // 真实结构：faction 顶层 + divisions。Rich/Cap 属玩家·Poor/Fam 属 NPC「军阀」faction(验取叶覆盖所有 faction)
  adminHierarchy: { player: { divisions: [Rich, Cap] }, 军阀: { divisions: [Poor, Fam] } },
  renli: { byRegion: {
    rich: { grainOutput: 90000, foodNeed: 60000, corveeRate: 0.1 },
    poor: { grainOutput: 60000, foodNeed: 60000, corveeRate: 0.3 },
    fam:  { grainOutput: 22500, foodNeed: 45000, corveeRate: 0.2 },
    京师: { grainOutput: 36000, foodNeed: 45000, corveeRate: 0.1 }
  } }
};
global.P = { conf: { populationBottomUpEnabled: true }, time: { year: 1627 }, dynamics: GM.population.dynamics };
// 真实 getLeafDivisions 行为(ah[facId||'player'].divisions 的叶)——不再 mock 返回全部·验真实取叶
global.IntegrationBridge = {
  getLeafDivisions: function (ah, facId) {
    var fac = ah[facId || 'player'] || Object.values(ah)[0];
    if (!fac || !fac.divisions) return [];
    var out = [];
    (function w(list){ list.forEach(function(n){ var k=n.divisions||n.children; if(k&&k.length)w(k); else out.push(n); }); })(fac.divisions);
    return out;
  }
};

function sigma() { return Rich.populationDetail.mouths + Poor.populationDetail.mouths + Fam.populationDetail.mouths + Cap.populationDetail.mouths; }
var maxDrift = 0;
for (var t = 1; t <= 12; t++) { GM.turn = t; HujiEngine.tick({ turn: t, monthRatio: 1, _monthRatio: 1 }); var dr = Math.abs(GM.population.national.mouths - sigma()); if (dr > maxDrift) maxDrift = dr; }
var richNet = Rich.populationDetail.mouths - 400000;
var poorNet = Poor.populationDetail.mouths - 400000; // NPC「军阀」faction
var famNet = Fam.populationDetail.mouths - 300000;   // NPC「军阀」faction
var capMig = Cap.yearlyNetMigration || 0;
console.log('[S5·12回合·真实多faction] 富安(玩家)净=' + richNet + ' · 困苦(NPC军阀)净=' + poorNet + ' · 饥馑(NPC军阀)净=' + famNet + ' · 京师迁移=' + capMig + ' · 守恒漂移=' + maxDrift);
var T1 = maxDrift <= 12;
var T2 = richNet > poorNet && poorNet > famNet;
var T3 = famNet < 0;
var T4 = capMig > 0;
var T5 = (poorNet !== 0 && famNet !== 0); // 关键：NPC「军阀」faction 地块也被处理(取叶修复·非只玩家)
console.log('  [S5a] 守恒不漂移：' + (T1 ? 'OK' : 'FAIL'));
console.log('  [S5b] 地方分化(富>困>饥)：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [S5c] 饥馑饥荒净减：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [S5d] 京师虹吸流入：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [S5e] NPC faction 地块也增长(取叶覆盖所有 faction)：' + (T5 ? 'OK' : 'FAIL'));
var all = T1 && T2 && T3 && T4 && T5;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
