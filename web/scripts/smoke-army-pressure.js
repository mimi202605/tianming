// smoke-army-pressure.js — P1-A2a 军费负担结算断言(2026-06-20)
//   armyPressure = 月军费(驻军×0.5饷) / 月留用(retainedBudget/12) × 60。
//   养得起→低压·养不起→高压·无兵→0·有兵无留用→85·派生 localMilitaryCost/retainedNet(可负=赤字)·开关守卫。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'tm-border-risk.js');
global.window = global;
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'tm-border-risk.js' });
if (!global.BorderRisk || typeof BorderRisk.tickArmyPressure !== 'function') { console.log('FAIL: BorderRisk.tickArmyPressure 未加载'); process.exit(1); }

// 同属玩家·四态：富安(留用充足养得起)/吃紧(军费=留用)/无兵/赤贫(有兵无留用)
var Rich  = { id:'rich',  name:'富安', troops:5000,  fiscalDetail:{ retainedBudget:1000000 }, armyPressure:'剧本死值40' };
var Tight = { id:'tight', name:'吃紧', troops:10000, fiscalDetail:{ retainedBudget:60000 },   armyPressure:'剧本死值40' };
var NoArmy= { id:'none',  name:'无兵', troops:0,     fiscalDetail:{ retainedBudget:100000 } };
var Broke = { id:'broke', name:'赤贫', troops:3000,  fiscalDetail:{ retainedBudget:0 } };

global.GM = { turn:1, adminHierarchy:{ player:{ divisions:[Rich, Tight, NoArmy, Broke] } } };
global.P = { conf:{} };
global.IntegrationBridge = {
  getLeafDivisions: function (ah, facId) {
    var fac = ah[facId] || {}; if (!fac.divisions) return [];
    var out = []; (function w(list){ list.forEach(function(n){ var k=n.divisions||n.children; if(k&&k.length)w(k); else out.push(n); }); })(fac.divisions);
    return out;
  }
};

// ── 结算(恒开) ──
BorderRisk.tickArmyPressure();
console.log('[A2a] 富安(养得起)=' + Rich.armyPressure + ' · 吃紧(军费=留用)=' + Tight.armyPressure + ' · 无兵=' + NoArmy.armyPressure + ' · 赤贫(无留用)=' + Broke.armyPressure);
console.log('  派生 吃紧:月军费=' + Tight.localMilitaryCost + ' 净留用=' + Tight.retainedNet + ' · 赤贫:净留用=' + Broke.retainedNet + '(赤字)');

var T2 = (typeof Rich.armyPressure === 'number' && Rich.armyPressure < 15);     // 富安留用充足·养得起·低压
var T3 = (typeof Tight.armyPressure === 'number' && Tight.armyPressure >= 55);  // 吃紧军费≈留用·高压
var T4 = (NoArmy.armyPressure === 0);                                           // 无驻军·零压
var T5 = (Broke.armyPressure === 85);                                           // 有兵无留用·养不起·高压
var T6 = (Tight.localMilitaryCost === 5000);                                    // 月军费=10000×0.5
var T7 = (Tight.retainedNet === 0 && Broke.retainedNet < 0);                    // 净留用:吃紧60000-60000=0·赤贫赤字
var T8 = (Tight.armyPressure > Rich.armyPressure);                             // 同省·吃紧>富安

console.log('  [T2] 富安养得起低压(<15)：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [T3] 吃紧军费≈留用高压(≥55)：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [T4] 无驻军零压：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [T5] 有兵无留用养不起(85)：' + (T5 ? 'OK' : 'FAIL'));
console.log('  [T6] localMilitaryCost 派生(兵×0.5)：' + (T6 ? 'OK' : 'FAIL'));
console.log('  [T7] retainedNet 派生(吃紧0/赤贫赤字)：' + (T7 ? 'OK' : 'FAIL'));
console.log('  [T8] 同省·吃紧>富安：' + (T8 ? 'OK' : 'FAIL'));
var all = T2 && T3 && T4 && T5 && T6 && T7 && T8;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
