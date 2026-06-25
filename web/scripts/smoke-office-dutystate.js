/* smoke-office-dutystate.js — 官制活化 Slice② 履职度 tick + 对称域效果 冒烟
 * 跑法：node web/scripts/smoke-office-dutystate.js
 * 验：①称职漂升+奖 ②出缺衰减+罚 ③同署只记一次腐败 ④无杠杆域(military)即便失职也不生效 ⑤防重复 tick
 */
'use strict';
var path = require('path');
var mod = require(path.join(__dirname, '..', 'tm-office-dutystate.js'));
var tick = mod.tickOfficeDutyState;

global.findCharByName = function (n) { return (GM.chars || []).find(function (c) { return c.name === n; }) || null; };
global.getRankLevel = function (r) { return ({ '正一品': 1, '正二品': 2, '从二品': 3, '正三品': 5, '正五品': 9, '从五品': 10 })[r] || 10; };

var GM = {
  turn: 0,
  chars: [
    { name: '李某', administration: 85, loyalty: 20, wuchang: { ren: 80, yi: 80, li: 80, zhi: 80, xin: 80 } }, // 忠仅20·五常80→承载83·称职(证履职看德非忠)
    { name: '王某', military: 20, loyalty: 88, wuchang: { ren: 20, yi: 20, li: 20, zhi: 20, xin: 20 } }         // 忠88·五常20→承载20·堪虞(忠不救)
  ],
  officeTree: [
    { name: '户部', positions: [{ name: '尚书', rank: '正二品', holder: '李某', powers: { taxCollect: true } }] },
    { name: '都察院', positions: [{ name: '左都御史', rank: '正二品', holder: '', powers: { impeach: true, supervise: true } }] }, // 出缺·双监察权
    { name: '兵部', positions: [{ name: '尚书', rank: '正二品', holder: '王某', powers: { militaryCommand: true } }] }            // 无 v1 杠杆
  ]
};

function getDS(dept) { return GM.officeTree.find(function (d) { return d.name === dept; }).positions[0]._dutyState; }

var fails = 0;
function ok(c, m) { if (!c) { console.log('✗ ' + m); fails++; } else console.log('✓ ' + m); }

var last;
for (var t = 1; t <= 3; t++) { GM.turn = t; last = tick(GM); }
console.log('\n--- 第3回合聚合 ---\n' + JSON.stringify(last, null, 1));
console.log('履职度: 户部 ' + Math.round(getDS('户部').fulfillment) + ' / 都察院 ' + Math.round(getDS('都察院').fulfillment) + ' / 兵部 ' + Math.round(getDS('兵部').fulfillment) + '\n');

ok(getDS('户部').fulfillment > 70, '①称职：户部履职爬过70(李某承载83·3回合漂升)');
ok(last.compliance > 0, '①称职奖：户部掌征税→实征率正向(+' + last.compliance + ')');
ok(getDS('都察院').fulfillment < 35, '②出缺：都察院履职衰到35下(每回合-12)');
ok(last.corruption > 0, '②失职罚：都察院出缺掌监察→腐败上涨(+' + last.corruption + ')');
ok(Math.abs(last.corruption - 2.5) < 1e-9, '③同署 supervise+impeach 只记一次腐败(+2.5·不双扣)');
ok(getDS('兵部').fulfillment < 35, '④兵部堪虞·履职衰到35下(入低带)');
ok(!last.details.some(function (x) { return x.dept === '兵部'; }), '④militaryCommand 无v1杠杆→兵部即便失职也不产生域效果');
ok(last.details.some(function (x) { return x.dept === '户部' && x.lever === 'compliance'; })
  && last.details.some(function (x) { return x.dept === '都察院' && x.lever === 'corruption'; }), 'details 含户部compliance+都察院corruption');

// ⑤防重复施加：同回合再 tick → 零聚合
GM.turn = 3; var again = tick(GM);
ok(again.compliance === 0 && again.corruption === 0 && again.details.length === 0, '⑤同回合重复 tick→零(lastTurn 守卫)');

// ── ④B·npc_action → 履职反哺 ──
var applyAct = mod.applyNpcActionToDuty;
function hubuFulfill() { var d = GM.officeTree.find(function (x) { return x.name === '户部'; }).positions.find(function (p) { return p.name === '尚书'; })._dutyState; return d ? Math.round(d.fulfillment) : null; }
var _before = hubuFulfill();
var rDil = applyAct(GM, { name: '李某', action: '整顿钱粮、督办漕运、清理积弊' });
ok(rDil && rDil.delta === 5 && hubuFulfill() === _before + 5, '⑥B治事行动→户部尚书李某履职+5(行动反哺·' + _before + '→' + hubuFulfill() + ')');
var _mid = hubuFulfill();
var rDer = applyAct(GM, { name: '李某', action: '结党营私、敛财避事、称疾不朝' });
ok(rDer && rDer.delta === -6 && hubuFulfill() === _mid - 6, '⑦B钻营失职行动→李某履职-6');
ok(applyAct(GM, { name: '某路人', action: '整顿钱粮' }) === null, '⑧B非在职官→不影响履职(返null)');
ok(applyAct(GM, { name: '李某', action: '微服私访读书' }) === null, '⑨B中性行动→无定性→不调履职');

console.log('\n' + (fails === 0 ? 'PASS' : 'FAIL') + ' — ' + fails + ' 处失败\n');
process.exit(fails === 0 ? 0 : 1);
