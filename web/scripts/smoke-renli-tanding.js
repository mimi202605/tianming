/* smoke-renli-tanding.js — R8：摊丁入亩（终局变法·役随田走·优免不再蔽役）（node 直跑）
 * 验：set tanding + 士绅税特权终败(大跌·过闸) + 小民松 + 摊后同役需役负更低(负担摊向士绅田) + 单源。
 * 跑：node scripts/smoke-renli-tanding.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }

var gateCalls = [];
function world() {
  global.P = { adminHierarchy: { player: { divisions: [
    { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0, commendedDing: 0 } }
  ] } } };
  global.GM = { turn: 6, classes: [
    { name: '农户', economicRole: '生产', satisfaction: 58, regionalVariants: [] },
    { name: '士大夫', economicRole: '治理', satisfaction: 60, regionalVariants: [] }
  ], chars: [ { name: '陕绅', alive: true, birthplace: '陕西·三原', resources: { gongming: { youmian: 200000 } } } ] }; // 大优免凸显效果
  gateCalls = [];
}
function setupGate() { global.TM.ClassEngine = { gateSatisfaction: function (root, cls, raw, info) { var d = Math.max(-14, Math.min(14, raw)); cls.satisfaction = Math.max(0, Math.min(100, cls.satisfaction + d)); gateCalls.push({ name: cls.name, source: info && info.source, d: d }); return { approved: d }; } }; }

var R = require('../tm-renli.js');
function xi() { return R.leaves(global.P)[0]; }

world(); R.ensureDefaults(global.GM, global.P);
R.seedRegion(global.GM, global.P, '陕西', { soilBase: 70, laborMarketDepth: 0.2, registeredLand: 3000000 }); setupGate();
R.refreshExempt(global.GM, global.P);
var exemptBefore = xi().populationDetail.exemptDing; // 大优免 200000

// 摊丁入亩前：可征丁 = present − 优免；同役需 → 役负
global.GM.turn = 6; R.getRegion(global.GM, '陕西').levyPolicy.corveeDemand = 200000; R.getRegion(global.GM, '陕西').weather = 1.0;
R.endturnTick(global.GM, global.P);
var rateBefore = R.getRegion(global.GM, '陕西').corveeRate;

// 摊丁入亩
var res = R.applyReform(global.GM, global.P, '陕西', '摊丁入亩', {});
ok(res.tanding === true, '1·摊丁入亩 set tanding');
ok(R.getRegion(global.GM, '陕西').tanding === true, '1·region.tanding=true');
ok(gateCalls.some(function (g) { return g.name === '士大夫' && g.d < 0 && g.source === 'reform-tanding'; }), '2·士绅税特权终败（大跌·过闸）');
ok(gateCalls.some(function (g) { return g.name === '农户' && g.d > 0 && g.source === 'reform-tanding'; }), '2·小民松（relief·过闸）');

// 摊丁入亩后：优免不再蔽役 → 可征丁=present(含士绅田) → 同役需役负更低
global.GM.turn = 7; R.getRegion(global.GM, '陕西').levyPolicy.corveeDemand = 200000; R.getRegion(global.GM, '陕西').weather = 1.0;
R.endturnTick(global.GM, global.P);
var rateAfter = R.getRegion(global.GM, '陕西').corveeRate;
ok(exemptBefore > 0, '3·摊丁前确有优免(' + exemptBefore + ')');
ok(rateAfter < rateBefore, '3·摊丁后同役需役负更低(' + rateAfter.toFixed(4) + '<' + rateBefore.toFixed(4) + '·优免不再蔽役·负担摊向士绅田)');

ok(R.assertNoDingInRenli(global.GM).length === 0, '4·GM.renli 无丁泄漏');

console.log('\n[smoke-renli-tanding] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
