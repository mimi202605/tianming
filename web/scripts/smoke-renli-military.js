/* smoke-renli-military.js — R3.5：军农争丁 + 战争定位毁地（兵燹）（node 直跑）
 * 验：①募兵/民夫与农争同一可征丁池→减务农→减粮；②军役加负；③warScar 毁地(丁损/地力/水利)；
 *     ④warScarFromBattle 定位前线→该地受创（军→人力→农 闭环）；⑤未种子地域 no-op；⑥不写 ding 总量。
 * 跑：node scripts/smoke-renli-military.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }

function world() {
  global.P = { adminHierarchy: { player: { divisions: [
    { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0, exemptDing: 80000 } }
  ] } } };
  global.GM = { turn: 1, classes: [ { name: '农户', economicRole: '生产', satisfaction: 58, regionalVariants: [ { region: '陕西', satisfaction: 58 } ] } ] };
}
function seed(G, P) { return require('../tm-renli.js').seedRegion(G, P, '陕西', { soilBase: 70, waterworks: 50, laborMarketDepth: 0.2, registeredLand: 3000000 }); }

var R = require('../tm-renli.js');
global.TM.ClassEngine = { gateSatisfaction: function (root, cls, raw) { var d = Math.max(-14, Math.min(14, raw)); cls.satisfaction = Math.max(0, Math.min(100, cls.satisfaction + d)); return { approved: d }; } };

// ── 1·军农争丁：对照「无募兵 vs 有募兵」──
world(); R.ensureDefaults(global.GM, global.P); seed(global.GM, global.P);
var leaf = R.leaves(global.P)[0], r = R.getRegion(global.GM, '陕西');
r.levyPolicy.corveeDemand = 120000; r.levyPolicy.draftDemand = 0; r.weather = 1.0; global.GM.turn = 2; R.tick(global.GM, global.P);
var farmNo = leaf.populationDetail.alloc.farm, grainNo = r.grainOutput;

world(); R.ensureDefaults(global.GM, global.P); seed(global.GM, global.P);
leaf = R.leaves(global.P)[0]; r = R.getRegion(global.GM, '陕西');
r.levyPolicy.corveeDemand = 120000; r.levyPolicy.draftDemand = 150000; r.weather = 1.0; global.GM.turn = 2; R.tick(global.GM, global.P);
ok(leaf.populationDetail.alloc.draft > 0, '1·募兵抽丁：alloc.draft>0（=' + leaf.populationDetail.alloc.draft + '）');
ok(leaf.populationDetail.alloc.farm < farmNo, '1·军农争丁：有募兵时务农更少（' + leaf.populationDetail.alloc.farm + '<' + farmNo + '）');
ok(r.grainOutput < grainNo, '1·军农争丁：募兵→粮产更低（' + r.grainOutput + '<' + grainNo + '）');

// ── 2·军役加负：役负率含 draft ──
ok(r.corveeRate > 0.25, '2·役负率含军役加负（' + r.corveeRate.toFixed(3) + '>0.25·无募兵时仅 ~0.117）');

// ── 3·warScar：战争毁地 ──
world(); R.ensureDefaults(global.GM, global.P); seed(global.GM, global.P);
leaf = R.leaves(global.P)[0]; var soil0 = R.getRegion(global.GM, '陕西').soil, ding0 = leaf.populationDetail.ding;
global.GM.turn = 3;
var ws = R.warScar(global.GM, global.P, '陕西', { casualties: 90000 }); // 烈度=90000/900000=0.1
ok(ws && ws.flee > 0, '3·兵燹：平民逃散>0（=' + (ws && ws.flee) + '）');
ok(leaf.populationDetail.fugitives > 0, '3·兵燹→fugitives 增');
ok(leaf.populationDetail.ding === ding0, '3·warScar 不动 ding 总量（单一真相源）');
ok(R.getRegion(global.GM, '陕西').soil < soil0, '3·兵燹毁地力（' + R.getRegion(global.GM, '陕西').soil + '<' + soil0 + '）');
ok(R.getRegion(global.GM, '陕西').waterworks < 50, '3·兵燹毁水利');

// ── 4·warScarFromBattle：定位前线→闭环 ──
world(); R.ensureDefaults(global.GM, global.P); seed(global.GM, global.P);
leaf = R.leaves(global.P)[0]; global.GM.turn = 4;
var res = R.warScarFromBattle(global.GM, global.P, { location: '陕西' }, { applied: { casualties: [{ loss: 60000 }, { loss: 30000 }] } });
ok(res && res.regionId === '陕西', '4·warScarFromBattle 定位前线陕西');
ok(leaf.populationDetail.fugitives > 0, '4·前线战斗→陕西丁损（军→人力→农 闭环）');

// ── 5·未种子地域：no-op（live 安全）──
world(); R.ensureDefaults(global.GM, global.P); // 不 seed
var leaf2 = R.leaves(global.P)[0];
var ws2 = R.warScar(global.GM, global.P, '陕西', { casualties: 90000 });
ok(ws2 === null && leaf2.populationDetail.fugitives === 0, '5·未种子地域 warScar no-op（live 安全）');
var res2 = R.warScarFromBattle(global.GM, global.P, { location: '陕西' }, { applied: { casualties: [{ loss: 90000 }] } });
ok(res2 === null, '5·未种子前线 warScarFromBattle no-op');

// ── 6·单一真相源 ──
ok(R.assertNoDingInRenli(global.GM).length === 0, '6·GM.renli 无丁计数泄漏');

console.log('\n[smoke-renli-military] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
