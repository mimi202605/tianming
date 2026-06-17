/* smoke-renli-tick-walkthrough.js — R2 陕西 T0→T3 农政走查（node 直跑）
 * 验：劳动力分流 → 双边际(在耕/地力) → 粮产 的螺旋——
 *     质量(Q)先垮 · 数量(抛荒)后垮 · 役负升 · 地力蚀。确定性公式·精确断言。
 * 跑：node scripts/smoke-renli-tick-walkthrough.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }
function near(a, b, t, m) { ok(Math.abs(a - b) <= (t || 2), m + ' (得 ' + a + '·期 ' + b + '±' + (t || 2) + ')'); }

// ── 桩：陕西单地域（瘠·无折银市场·地力70）──
global.P = { adminHierarchy: { player: { divisions: [
  { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, exemptDing: 80000 } }
] } } };
global.GM = { turn: 1 };

var R = require('../tm-renli.js');
R.ensureDefaults(global.GM, global.P);
R.seedRegion(global.GM, global.P, '陕西', { soilBase: 70, waterworks: 50, doubleCropping: 1.0, laborMarketDepth: 0.2, registeredLand: 3000000 });
var leaf = R.leaves(global.P)[0];
var r = R.getRegion(global.GM, '陕西');

// 一回合：喂 实在丁(R3起内生·R2 由 test 喂逃亡轨迹) + 役需(R6/诏书设) + 天时(RegionStatus接)
function runTurn(ding, demand, weather) {
  leaf.populationDetail.ding = ding;
  leaf.populationDetail.fugitives = 0; // R2 手动控人口轨迹·复位 R3 内生逃亡（present=ding·纯农政回归）
  r.levyPolicy.corveeDemand = demand;
  r.weather = weather;
  R.tick(global.GM, global.P);
  return { grain: r.grainOutput, q: r.q, fallow: r.fallowLand, rate: r.corveeRate, soil: r.soil, alloc: Object.assign({}, leaf.populationDetail.alloc) };
}

var T0 = runTurn(900000, 150000, 1.00); // 适当征发·丰年
var T1 = runTurn(900000, 280000, 1.00); // 加辽饷·役需骤增
var T2 = runTurn(860000, 320000, 0.75); // 过度+大旱·逃亡-4万
var T3 = runTurn(700000, 320000, 0.70); // 抛荒+续旱·逃亡再-16万

// 1) 粮产精确轨迹（确定性公式）
near(T0.grain, 3150000, 3, '1·T0 粮产=315万(适当·精耕 Q=1)');
near(T1.grain, 2916900, 5, '1·T1 粮产≈291.7万(加辽饷·转粗放)');
near(T2.grain, 1959930, 5, '1·T2 粮产≈196万(过度+大旱)');
near(T3.grain, 1414140, 5, '1·T3 粮产≈141万(抛荒+续旱)');

// 2) 粮产严格递减（螺旋成形）
ok(T0.grain > T1.grain && T1.grain > T2.grain && T2.grain > T3.grain, '2·粮产 T0>T1>T2>T3 单调跌');

// 3) ★质量先垮：精粗系数 Q 单调跌·T0 精耕=1.0
ok(T0.q === 1 && T0.q > T1.q && T1.q > T2.q && T2.q > T3.q, '3·Q 单调跌(质量先垮)·T0=1');

// 4) ★数量后垮：抛荒 T0-T2=0·T3 才现（数量跌晚于质量）
ok(T0.fallow === 0 && T1.fallow === 0 && T2.fallow === 0 && T3.fallow > 0, '4·抛荒 T0-T2=0·T3 现(数量后于质量)');
near(T3.fallow, 40000, 1, '4·T3 抛荒≈4万亩');

// 5) 役负率单调升（棘轮·分母可征丁随逃亡缩）
ok(T0.rate < T1.rate && T1.rate < T2.rate && T2.rate < T3.rate, '5·役负率单调升');
near(T0.rate, 0.1463, 0.001, '5·T0 役负≈0.146');
near(T3.rate, 0.4129, 0.001, '5·T3 役负≈0.413(逃亡缩分母→棘轮)');

// 6) 地力逐回合蚀
ok(T0.soil >= T1.soil && T1.soil > T2.soil && T2.soil > T3.soil, '6·地力单调蚀');
near(T3.soil, 62, 1, '6·T3 地力≈62');

// 7) 分配不变量：务农+役+征=ding·优免也务农(farm=ding−实征)
ok(R.allocValid(leaf), '7·末回合 alloc 不变量(务农+役+征≤ding·分配不超总丁)');
near(T0.alloc.farm, 780000, 1, '7·T0 务农=78万(实在90−力役12·优免8仍务农)');
near(T0.alloc.corvee, 120000, 1, '7·T0 力役=12万(役需15折银3)');

// 8) ★单一真相源：全程 GM.renli 无丁计数泄漏
ok(R.assertNoDingInRenli(global.GM).length === 0, '8·GM.renli 无丁计数泄漏');

console.log('\n[smoke-renli-tick-walkthrough] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
