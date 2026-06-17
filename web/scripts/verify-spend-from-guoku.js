// verify-spend-from-guoku.js — P-D4J 波2：国库确定性扣账原语 FiscalEngine.spendFromGuoku 自检
//   真加载 tm-fiscal-engine.js，验：①扣 stock ②国库不足尽扣记欠 deficit ③标量回写（面板即时反映）。
//   跑：node scripts/verify-spend-from-guoku.js
'use strict';
var fs = require('fs');
var path = require('path');

global.window = global;
global.TM = { errors: { capture: function () {}, captureSilent: function () {} } };
global.GM = { turn: 5, guoku: { money: 1000, grain: 500, cloth: 100 } };

var src = fs.readFileSync(path.join(__dirname, '..', 'tm-fiscal-engine.js'), 'utf8');
try { eval(src); } catch (e) { console.log('load fail: ' + (e && e.message)); process.exit(1); }

var FE = global.FiscalEngine;
var pass = 0, fail = 0;
function check(desc, cond) { if (cond) { pass++; console.log('  ✓ ' + desc); } else { fail++; console.log('  ✗ ' + desc); } }

check('FiscalEngine.spendFromGuoku 已导出', FE && typeof FE.spendFromGuoku === 'function');

console.log('案1·正常扣账（国库够）');
var r1 = FE.spendFromGuoku({ money: 300, grain: 200, cloth: 50 }, '募兵·安民锄奸军');
check('银 1000→700（stock 扣）', GM.guoku.money === 700);
check('粮 500→300', GM.guoku.grain === 300);
check('布 100→50', GM.guoku.cloth === 50);
check('返回 deducted.money.deducted=300·无欠', r1.deducted.money.deducted === 300 && r1.deducted.money.deficit === 0);
check('标量 balance 同步=money', GM.guoku.balance === 700);

console.log('案2·国库不足·尽扣记欠（deficit）');
var r2 = FE.spendFromGuoku({ money: 2000, grain: 0, cloth: 0 }, '募兵·超支军');
check('银尽扣到 0（不变负）', GM.guoku.money === 0);
check('deducted=700·deficit=1300（欠饷如实记）', r2.deducted.money.deducted === 700 && r2.deducted.money.deficit === 1300);
check('粮未动（这次没扣粮）', GM.guoku.grain === 300);

console.log('案3·空/0 入参不炸、不乱扣');
var r3 = FE.spendFromGuoku({}, '空');
check('空入参 ok、账不动', r3.ok === true && GM.guoku.grain === 300 && GM.guoku.money === 0);

console.log('\n结果：' + pass + ' 过 / ' + fail + ' 败');
process.exit(fail ? 1 : 0);
