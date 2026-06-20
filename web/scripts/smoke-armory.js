#!/usr/bin/env node
'use strict';
/* smoke-armory — 军备/武库 Slice 1 数据层
 *   ① 建库(GM.guoku.armory 五类账本·幂等) ② add/spend(含 shortfall) ③ 兵种→需求(接 units sub/arm) ④ produce ⑤ supplyRatio ⑥ 永不崩
 */
const path = require('path');
global.window = {};
const AR = require(path.resolve(__dirname, '..', 'tm-armory.js'));
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-armory');

/* ① 建库 */
const GM = {};
const arm = AR.ensure(GM);
ok(GM.guoku && GM.guoku.armory === arm, '① GM.guoku.armory 建立(帑廪之下)');
ok(AR.CAT_KEYS.every(k => arm[k] && typeof arm[k].stock === 'number'), '① 五类军备账本就位(甲胄/兵刃/弓弩/火器/战马)');
ok(AR.CAT_KEYS.length === 5 && AR.CAT_KEYS.join('') === '甲胄兵刃弓弩火器战马', '① 五类齐·朝代中立类目名');
const before = JSON.stringify(GM.guoku.armory);
AR.ensure(GM);
ok(JSON.stringify(GM.guoku.armory) === before, '① ensure 幂等(再调不变)');

/* ② add / spend */
AR.add(GM, { 甲胄: 1000, 战马: 500 }, '采买');
ok(AR.stock(GM, '甲胄') === 1000 && AR.stock(GM, '战马') === 500, '② add 入账');
ok(arm['甲胄'].thisTurnIn === 1000, '② thisTurnIn 记本回合产');
const sp = AR.spend(GM, { 甲胄: 300, 战马: 200 }, '募兵');
ok(AR.stock(GM, '甲胄') === 700 && AR.stock(GM, '战马') === 300, '② spend 扣库');
ok(sp.deducted['甲胄'] === 300 && !sp.anyShort, '② 充足→无 shortfall');
ok(arm['甲胄'].thisTurnOut === 300, '② thisTurnOut 记本回合耗');
const sp2 = AR.spend(GM, { 战马: 1000 }, '募骑兵');
ok(AR.stock(GM, '战马') === 0 && sp2.shortfall['战马'] === 700 && sp2.anyShort, '② 库存不继→尽扣到0+记缺700(装备不能凭空)');

/* ③ 兵种→需求(接 units[] sub/arm) */
const n1 = AR.needForTroops('horse', 'cav', 1000);
ok(n1['战马'] === 1000 && n1['兵刃'] === 1000 && n1['甲胄'] === 1000, '③ 骑兵1000→战马1000+兵刃1000+甲胄1000');
const n2 = AR.needForTroops('musket', 'bow', 1000);
ok(n2['火器'] === 1000 && !n2['战马'] && n2['甲胄'] === 500, '③ 火器兵→火器+甲胄·不耗战马');
const n3 = AR.needForTroops('heavy', 'cav', 1000);
ok(n3['甲胄'] === 1600 && n3['战马'] === 1000, '③ 铁骑→甲胄×1.6(重甲)');
const units = [{ sub: 'spear', men: 1000 }, { sub: 'horse', men: 500 }, { sub: 'musket', men: 500 }];
const need = AR.needForUnits(units);
ok(need['兵刃'] === 1500 && need['战马'] === 500 && need['火器'] === 500, '③ 混编军 units[]→各类需求汇总(步兵刃+骑战马+铳火器)');
ok(AR.needForUnits([{ sub: '杜撰兵', men: 1000 }])['兵刃'] === 1000, '③ 未知兵种→默认需求(永不崩)');

/* ④ produce(军器局每回合) */
const GM2 = {}; AR.produce(GM2, 1);
ok(AR.stock(GM2, '甲胄') === 1200 && AR.stock(GM2, '火器') === 400, '④ produce 基础产能入库');
AR.produce(GM2, 0.5);
ok(AR.stock(GM2, '甲胄') === 1200 + 600, '④ produce scale 缩放产能(挂经费)');

/* ⑤ supplyRatio(装备充裕度·供品质/UI) */
const GM3 = {}; AR.add(GM3, { 甲胄: 700, 兵刃: 500 }, 't');
const ratio = AR.supplyRatio(GM3, [{ sub: 'spear', men: 1000 }]);  // 需 甲胄700/兵刃1000·有 甲胄700/兵刃500→worst=500/1000=0.5
ok(Math.abs(ratio - 0.5) < 0.01, '⑤ supplyRatio=最缺类比例(兵刃 500/1000=0.5)');
ok(AR.supplyRatio({}, [{ sub: 'spear', men: 100 }]) === 0, '⑤ 空库→充裕度0');
ok(AR.supplyRatio(GM3, []) === 1, '⑤ 无需求→1(不崩)');

/* ⑥ 永不崩 */
ok(AR.ensure(null) === null && AR.stock(null, '甲胄') === 0, '⑥ null GM→不崩');
AR.rollTurn(GM);
ok(arm['甲胄'].lastTurnIn === 1000 && arm['甲胄'].thisTurnIn === 0, '⑥ rollTurn 翻转本回合→last');

console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
