/* smoke-renli-youmian.js — R4：优免按地域归集(接 gongming) + 诡寄(投献)（node 直跑）
 * 验：①士绅优免按籍贯归集→leaf.exemptDing；②优免→可征丁缩；③江南空心(优免膨胀·占比更高)；
 *     ④诡寄：重役→commended 增→exempt 增→可征缩(vicious)；⑤live 安全(未种子不归集)；⑥单源。
 * 跑：node scripts/smoke-renli-youmian.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }
function eq(a, b, m) { ok(a === b, m + ' (得 ' + JSON.stringify(a) + '·期 ' + JSON.stringify(b) + ')'); }

function world() {
  global.P = { adminHierarchy: { player: { divisions: [
    { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0, commendedDing: 0 } },
    { id: '苏州', name: '苏州', populationDetail: { mouths: 4000000, households: 800000, ding: 1200000, fugitives: 0, hiddenCount: 0, commendedDing: 0 } }
  ] } } };
  global.GM = {
    turn: 1,
    classes: [ { name: '农户', economicRole: '生产', satisfaction: 58, regionalVariants: [ { region: '陕西', satisfaction: 58 }, { region: '苏州', satisfaction: 65 } ] } ],
    chars: [
      { name: '陕绅甲', alive: true, birthplace: '陕西·三原', resources: { gongming: { youmian: 16 } } }, // 进士
      { name: '陕绅乙', alive: true, birthplace: '陕西·西安', resources: { gongming: { youmian: 8 } } },  // 举人
      { name: '苏绅甲', alive: true, birthplace: '南直隶·苏州', resources: { gongming: { youmian: 16 } } }, // 江南优免膨胀
      { name: '苏绅乙', alive: true, birthplace: '南直隶·苏州', resources: { gongming: { youmian: 16 } } },
      { name: '苏绅丙', alive: true, birthplace: '江南·苏州府', resources: { gongming: { youmian: 16 } } },
      { name: '布衣', alive: true, birthplace: '陕西·延安', resources: { gongming: { youmian: 0 } } }
    ]
  };
}

var R = require('../tm-renli.js'); // 不提供 TMGongming → 走 ch.resources.gongming.youmian fallback
world(); R.ensureDefaults(global.GM, global.P);
R.seedRegion(global.GM, global.P, '陕西', { soilBase: 70, laborMarketDepth: 0.2, registeredLand: 3000000 });
R.seedRegion(global.GM, global.P, '苏州', { soilBase: 90, doubleCropping: 1.4, laborMarketDepth: 0.8, registeredLand: 4000000 });
global.TM.ClassEngine = { gateSatisfaction: function (root, cls, raw) { var d = Math.max(-14, Math.min(14, raw)); cls.satisfaction = Math.max(0, Math.min(100, cls.satisfaction + d)); return { approved: d }; } };
var xi = R.leaves(global.P).filter(function (l) { return l.id === '陕西'; })[0];
var su = R.leaves(global.P).filter(function (l) { return l.id === '苏州'; })[0];

// 1) 优免归集：士绅优免按籍贯进对应地域
R.refreshExempt(global.GM, global.P);
eq(xi.populationDetail.exemptDing, 24, '1·陕西优免归集=16+8=24（进士+举人）');
eq(su.populationDetail.exemptDing, 48, '1·苏州优免归集=16×3=48（优免膨胀）');

// 2) 优免→可征丁缩
ok(R.levyableDing(xi) === 900000 - 24, '2·陕西可征丁 = ding − 优免');
ok(R.levyableDing(su) === 1200000 - 48, '2·苏州可征丁 = ding − 优免');

// 3) 江南空心 baseline：苏州优免占丁比 > 陕西
var shareSu0 = su.populationDetail.exemptDing / su.populationDetail.ding;
var shareXi0 = xi.populationDetail.exemptDing / xi.populationDetail.ding;
ok(shareSu0 > shareXi0, '3·江南空心：苏州优免占比(' + shareSu0.toExponential(2) + ')>陕西(' + shareXi0.toExponential(2) + ')');

// 4) 诡寄：陕西重役多回合（瘠·无折银→役负高）→ commended 增 → exempt 增（vicious）
var com0 = num(xi.populationDetail.commendedDing), ex0 = xi.populationDetail.exemptDing;
for (var t = 2; t <= 5; t++) { global.GM.turn = t; R.getRegion(global.GM, '陕西').levyPolicy.corveeDemand = 400000; R.getRegion(global.GM, '陕西').weather = 1.0; R.endturnTick(global.GM, global.P); }
ok(xi.populationDetail.commendedDing > com0, '4·诡寄：重役→commended 增（' + xi.populationDetail.commendedDing + '>' + com0 + '）');
ok(xi.populationDetail.exemptDing > ex0, '4·诡寄折叠→exempt 增（' + xi.populationDetail.exemptDing + '>' + ex0 + '）');
ok(R.levyableDing(xi) < 900000 - 24, '4·诡寄→可征丁较初更缩（vicious）');

// 5) live 安全：未种子地域 refreshExempt 不归集
world(); R.ensureDefaults(global.GM, global.P); // 不 seed
R.refreshExempt(global.GM, global.P);
var xi2 = R.leaves(global.P)[0];
ok(!xi2.populationDetail.exemptDing, '5·未种子地域 refreshExempt 不写 exempt（live 安全）');

// 6) 单一真相源
ok(R.assertNoDingInRenli(global.GM).length === 0, '6·GM.renli 无丁泄漏');

function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
console.log('\n[smoke-renli-youmian] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
