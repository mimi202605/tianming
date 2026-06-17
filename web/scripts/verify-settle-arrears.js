// verify-settle-arrears.js — P-D4J 波3：补饷接真账 MilitarySystems.settleArmyArrears 自检
//   真加载 tm-fiscal-engine.js(spendFromGuoku) + tm-military.js(settleArmyArrears)，验：
//   ①back-pay 按 兵×月饷率×欠饷月数 算 ②确定性扣国库 ③清欠饷月数 ④国库不足按比例部分清+记欠 ⑤无欠饷不乱扣。
//   跑：node scripts/verify-settle-arrears.js
'use strict';
var fs = require('fs');
var path = require('path');

global.window = global;
global.TM = { errors: { capture: function () {}, captureSilent: function () {} } };
global.SettlementPipeline = { register: function () {} }; // military.js 顶层注册行军/围城/产出结算·测补饷用不到·no-op
global.P = {};
global.GM = { turn: 10, guoku: { money: 1000000, grain: 500000, cloth: 50000 }, armies: [] };

function load(f) {
  var src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  try { eval(src); } catch (e) { console.log('load fail [' + f + ']: ' + (e && e.message)); process.exit(1); }
}
load('tm-fiscal-engine.js');
load('tm-military.js');

var MS = global.MilitarySystems;
var pass = 0, fail = 0;
function check(d, c) { if (c) { pass++; console.log('  ✓ ' + d); } else { fail++; console.log('  ✗ ' + d); } }

check('MilitarySystems.settleArmyArrears 已导出', MS && typeof MS.settleArmyArrears === 'function');

console.log('案1·国库充足·全额补饷');
var a1 = { name:'天龙军', soldiers:10000, payArrearsMonths:3, morale:40, loyalty:50, mutinyRisk:60 };
GM.armies = [a1];
var r1 = MS.settleArmyArrears(a1, {});
// 期望 cost: 10000 × {0.5,0.3,0.02} × 3 = money15000 grain9000 cloth600
check('back-pay 银=15000（兵×0.5×3）', r1.cost.money === 15000);
check('back-pay 粮=9000、布=600', r1.cost.grain === 9000 && r1.cost.cloth === 600);
check('国库银 100万→985000（真扣）', GM.guoku.money === 985000);
check('国库粮 50万→491000', GM.guoku.grain === 491000);
check('欠饷 3→0（清光）', a1.payArrearsMonths === 0 && r1.monthsCleared === 3);
check('发饷后士气回升（40→>40）', a1.morale > 40);
check('兵变险下降（60→<60）', a1.mutinyRisk < 60);

console.log('案2·无欠饷·不乱扣');
var moneyBefore = GM.guoku.money;
var a2 = { name:'净军', soldiers:5000, payArrearsMonths:0, morale:70 };
GM.armies = [a2];
var r2 = MS.settleArmyArrears(a2, {});
check('无欠饷 monthsCleared=0、cost=0', r2.monthsCleared === 0 && r2.cost.money === 0);
check('国库银未动', GM.guoku.money === moneyBefore);

console.log('案3·国库银不足·按比例部分清+记欠');
GM.guoku = { money: 150000, grain: 1000000, cloth: 1000000 };
var a3 = { name:'边军', soldiers:100000, payArrearsMonths:6, morale:30, mutinyRisk:80 };
GM.armies = [a3];
// 全额 cost 银=100000×0.5×6=300000·国库仅 15万→只够一半
var r3 = MS.settleArmyArrears(a3, {});
check('银尽扣到 0', GM.guoku.money === 0);
check('记欠 shortfall>0', r3.shortfall > 0);
check('按比例部分清（清<6月，剩>0）', r3.monthsCleared < 6 && a3.payArrearsMonths > 0);
check('清的+剩的=原欠 6', r3.monthsCleared + a3.payArrearsMonths === 6);

console.log('\n结果：' + pass + ' 过 / ' + fail + ' 败');
process.exit(fail ? 1 : 0);
