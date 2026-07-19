// smoke-border-risk.js — P1-A1a 边境风险结算断言(2026-06-20)
//   开关守卫 + 边镇空虚高危 + 腹地充足低危 + NPC faction 叶也被算(取叶覆盖所有 faction) + 友好邻无敌对归 0
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'tm-border-risk.js');
global.window = global;
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'tm-border-risk.js' });
if (!global.BorderRisk || typeof BorderRisk.tick !== 'function') { console.log('FAIL: BorderRisk 未加载'); process.exit(1); }

// 叶：边镇(驻军空虚) / 腹地(驻军充足) 同属玩家「大明」；后金叶 / 盟友叶 各属 NPC faction
var Border = { id: 'border', name: '边镇', populationDetail: { mouths: 200000 }, troops: 100, borderRisk: '剧本死值40' };
var Inland = { id: 'inland', name: '腹地', populationDetail: { mouths: 200000 }, troops: 2000, borderRisk: '剧本死值40' };
var JinLeaf = { id: 'jin', name: '建州', populationDetail: { mouths: 150000 }, troops: 500 };
var AllyLeaf = { id: 'ally', name: '友邦', populationDetail: { mouths: 150000 }, troops: 500 };
var Fortified = { id: 'fortx', name: '雄关', populationDetail: { mouths: 200000 }, troops: 100, defenseBonus: 5 };  // A4·同边镇空虚但有边防工事

global.GM = {
  turn: 1,
  facs: [
    { name: '大明', isPlayer: true, strength: 60 },
    { name: '后金', strength: 80, playerRelation: -90 },   // 敌对(playerRelation<-50)
    { name: '盟友', strength: 40, playerRelation: 30 }      // 友好
  ],
  factionRelations: [{ from: '大明', to: '后金', type: '敌对' }],  // 双向查·令后金视角也见大明为敌
  adminHierarchy: {
    player: { divisions: [Border, Inland, Fortified] },     // 大明(雄关=同空虚边镇+边防工事)
    后金: { divisions: [JinLeaf] },                          // NPC·与大明敌对
    盟友: { divisions: [AllyLeaf] }                          // NPC·与大明友好
  }
};
global.P = { conf: {}, playerInfo: { factionName: '大明' } };
// 真实 getLeafDivisions 行为(ah[facId].divisions 的叶·非 mock 返回全部)
global.IntegrationBridge = {
  getLeafDivisions: function (ah, facId) {
    var fac = ah[facId] || {};
    if (!fac.divisions) return [];
    var out = [];
    (function w(list) { list.forEach(function (n) { var k = n.divisions || n.children; if (k && k.length) w(k); else out.push(n); }); })(fac.divisions);
    return out;
  }
};

// ── 结算(恒开) ──
BorderRisk.tick();
console.log('[A1a] 边镇(空虚)=' + Border.borderRisk + ' · 腹地(充足)=' + Inland.borderRisk +
  ' · 建州(NPC后金叶)=' + JinLeaf.borderRisk + ' · 友邦(NPC友好叶)=' + AllyLeaf.borderRisk);

var T2 = (typeof Border.borderRisk === 'number' && Border.borderRisk >= 60);          // 边镇空虚·高危
var T3 = (typeof Inland.borderRisk === 'number' && Inland.borderRisk < 40);            // 腹地充足·低危
var T4 = (Border.borderRisk > Inland.borderRisk);                                      // 同敌强·空虚>充足
var T5 = (typeof JinLeaf.borderRisk === 'number' && JinLeaf.borderRisk > 0);           // NPC faction 叶也被算
var T6 = (AllyLeaf.borderRisk === 0);                                                  // 友好邻·无敌对·归 0
var T7 = (typeof Fortified.borderRisk === 'number' && Fortified.borderRisk < Border.borderRisk);  // A4·同空虚·边防工事 defenseBonus 降边警

console.log('  [A4] 雄关(空虚+边防工事5档)=' + Fortified.borderRisk + ' vs 边镇(空虚无工事)=' + Border.borderRisk);
console.log('  [T2] 边镇空虚高危(≥60)：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [T3] 腹地充足低危(<40)：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [T4] 同敌强·空虚>充足：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [T5] NPC faction 叶也被算(取叶覆盖所有 faction)：' + (T5 ? 'OK' : 'FAIL'));
console.log('  [T6] 友好邻无敌对归 0：' + (T6 ? 'OK' : 'FAIL'));
console.log('  [T7] A4·边防工事 defenseBonus 降边警(雄关<边镇)：' + (T7 ? 'OK' : 'FAIL'));
var all = T2 && T3 && T4 && T5 && T6 && T7;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
