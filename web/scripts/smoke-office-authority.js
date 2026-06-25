/* smoke-office-authority.js — 官制活化 Slice③ 执行力乘子 冒烟
 * 跑法：node web/scripts/smoke-office-authority.js
 * 验：称职×1.0 / 失职×0.55 / 出缺×0.25 / 异己×0.7叠乘 / 无_dutyState退才忠 / 无此职×0.25
 */
'use strict';
var path = require('path');
var mod = require(path.join(__dirname, '..', 'tm-office-authority.js'));
var resolve = mod.resolveOfficeAuthority;

global.findCharByName = function (n) { return (GM.chars || []).find(function (c) { return c.name === n; }) || null; };
global.getRankLevel = function (r) { return ({ '正一品': 1, '正二品': 2, '从二品': 3, '正五品': 9 })[r] || 10; };

var GM = { turn: 5, chars: [
  { name: '赵某', administration: 85, loyalty: 20, wuchang: { ren: 85, yi: 85, li: 85, zhi: 85, xin: 85 } },  // 忠仅20·五常85→承载85(证履职看德非忠)
  { name: '钱某', administration: 30, loyalty: 70, wuchang: { ren: 40, yi: 40, li: 40, zhi: 40, xin: 40 } },  // 庸才
  { name: '孙某', administration: 80, loyalty: 30, wuchang: { ren: 70, yi: 70, li: 70, zhi: 70, xin: 70 } }   // 异己(忠30)·执行力不再因忠打折
], officeTree: [] };

// 设户部尚书(掌 taxCollect)·可调 holder 与 _dutyState
function setHubu(holder, dutyState) {
  GM.officeTree = [{ name: '户部', positions: [{ name: '尚书', rank: '正二品', holder: holder, powers: { taxCollect: true }, _dutyState: dutyState }] }];
}

var fails = 0;
function ok(c, m) { if (!c) { console.log('✗ ' + m); fails++; } else console.log('✓ ' + m); }
function near(a, b) { return Math.abs(a - b) < 1e-9; }

setHubu('赵某', { fulfillment: 80 });
var r1 = resolve(GM, 'taxCollect'); console.log('称职:', JSON.stringify(r1));
ok(near(r1.effectiveness, 1.0) && r1.band === 'high', '①称职(履职80)→执行力×1.0');

setHubu('钱某', { fulfillment: 20 });
var r2 = resolve(GM, 'taxCollect'); console.log('失职:', JSON.stringify(r2));
ok(near(r2.effectiveness, 0.55) && r2.band === 'low', '②失职(履职20)→×0.55');

setHubu('', null);
var r3 = resolve(GM, 'taxCollect'); console.log('出缺:', JSON.stringify(r3));
ok(near(r3.effectiveness, 0.25) && r3.band === 'vacant' && r3.reason.indexOf('出缺') >= 0, '③出缺→×0.25·无人主持');

setHubu('孙某', { fulfillment: 80 });
var r4 = resolve(GM, 'taxCollect'); console.log('异己:', JSON.stringify(r4));
ok(near(r4.effectiveness, 1.0), '④忠退出：异己(履职80·忠30)→执行力1.0(不再因忠×0.7阳奉阴违·忠不管衙门)');

setHubu('赵某', null);  // 无 _dutyState → 退五常 capacity = 85*.6 + 五常85*.4 = 85 → high (忠仅20·证看德非忠)
var r5 = resolve(GM, 'taxCollect'); console.log('无履职退五常:', JSON.stringify(r5));
ok(near(r5.effectiveness, 1.0) && r5.fulfillment === 85, '⑤无_dutyState→退五常capacity85(赵某忠20但五常85)→×1.0·证履职看德非忠');

GM.officeTree = [{ name: '兵部', positions: [{ name: '尚书', rank: '正二品', holder: '赵某', powers: { militaryCommand: true } }] }]; // 无掌 taxCollect 之职
var r6 = resolve(GM, 'taxCollect'); console.log('无此职:', JSON.stringify(r6));
ok(near(r6.effectiveness, 0.25) && r6.reason.indexOf('无掌') >= 0, '⑥官制无掌taxCollect之职→×0.25');

console.log('\n' + (fails === 0 ? 'PASS' : 'FAIL') + ' — ' + fails + ' 处失败\n');
process.exit(fails === 0 ? 0 : 1);
