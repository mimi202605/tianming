/* smoke-renli-reforms.js — R6：变法 ops（蠲免/水利/招抚/清丈/重修黄册/一条鞭法/限制优免）（node 直跑）
 * 验：各变法效果 + 党派代价(过总闸) + 一条鞭法地域适配(穷省毒) + live 安全 + 单源。
 * 跑：node scripts/smoke-renli-reforms.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }
function eq(a, b, m) { ok(a === b, m + ' (得 ' + JSON.stringify(a) + '·期 ' + JSON.stringify(b) + ')'); }

var gateCalls = [];
function world() {
  global.P = { adminHierarchy: { player: { divisions: [
    { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0, commendedDing: 0 } },
    { id: '苏州', name: '苏州', populationDetail: { mouths: 4000000, households: 800000, ding: 1200000, fugitives: 0, hiddenCount: 0, commendedDing: 0 } }
  ] } } };
  global.GM = { turn: 5, classes: [
    { name: '农户', economicRole: '生产', satisfaction: 58, regionalVariants: [] },
    { name: '士大夫', economicRole: '治理', satisfaction: 60, regionalVariants: [] }
  ], chars: [
    { name: '陕绅', alive: true, birthplace: '陕西·三原', resources: { gongming: { youmian: 16 } } },
    { name: '苏绅', alive: true, birthplace: '南直隶·苏州', resources: { gongming: { youmian: 16 } } }
  ] };
  gateCalls = [];
}
function setupGate() { global.TM.ClassEngine = { gateSatisfaction: function (root, cls, raw, info) { var d = Math.max(-14, Math.min(14, raw)); cls.satisfaction = Math.max(0, Math.min(100, cls.satisfaction + d)); gateCalls.push({ name: cls.name, source: info && info.source, d: d }); return { approved: d }; } }; }
var R = require('../tm-renli.js');
function seedAll() {
  R.seedRegion(global.GM, global.P, '陕西', { soilBase: 70, waterworks: 50, laborMarketDepth: 0.2, registeredLand: 3000000 });
  R.seedRegion(global.GM, global.P, '苏州', { soilBase: 90, doubleCropping: 1.4, laborMarketDepth: 0.8, registeredLand: 4000000 });
}
function xi() { return R.leaves(global.P).filter(function (l) { return l.id === '陕西'; })[0]; }

// 1) 蠲免：remitTurns 设·下回合 tick 役负=0·农户 relief 过闸
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
R.applyReform(global.GM, global.P, '陕西', '蠲免', { turns: 2 });
eq(R.getRegion(global.GM, '陕西').levyPolicy.remitTurns, 2, '1·蠲免 remitTurns=2');
R.getRegion(global.GM, '陕西').levyPolicy.corveeDemand = 300000; R.endturnTick(global.GM, global.P);
eq(R.getRegion(global.GM, '陕西').corveeRate, 0, '1·蠲免期 tick 役负=0');
ok(gateCalls.some(function (g) { return g.name === '农户' && g.d > 0; }), '1·蠲免→农户 relief（过闸）');

// 2) 兴修水利
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
eq(R.applyReform(global.GM, global.P, '陕西', '兴修水利', { amount: 20 }).waterworks, 70, '2·水利 50+20=70');

// 3) 招抚流民
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
xi().populationDetail.fugitives = 100000;
R.applyReform(global.GM, global.P, '陕西', '招抚流民', { fraction: 0.5 });
eq(xi().populationDetail.fugitives, 50000, '3·招抚流民 10万→5万');

// 4) 清丈田亩：registeredLand 增 + 诡寄逆转 + 士绅代价
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
xi().populationDetail.commendedDing = 20000;
R.applyReform(global.GM, global.P, '陕西', '清丈', { recoverFactor: 0.3 });
eq(xi().populationDetail.registeredLand, 3900000, '4·清丈 300万→390万亩');
eq(xi().populationDetail.commendedDing, 14000, '4·诡寄逆转 2万→1.4万');
ok(gateCalls.some(function (g) { return g.name === '士大夫' && g.d < 0; }), '4·清丈→士绅满意度跌（党派代价·过闸）');

// 5) 重修黄册：册实归一 + 隐丁清
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
xi().populationDetail.ding = 800000; xi().populationDetail.registeredDing = 1000000; xi().populationDetail.hiddenCount = 30000;
R.applyReform(global.GM, global.P, '陕西', '重修黄册', {});
eq(xi().populationDetail.registeredDing, 800000, '5·重修黄册 册载丁=实在丁(棘轮归零)');
eq(xi().populationDetail.hiddenCount, 0, '5·隐丁现形入册');

// 6) 一条鞭法：陕西(穷·无银市场)毒·苏州(富)顺
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
var rxi = R.applyReform(global.GM, global.P, '陕西', '一条鞭法', {});
var rsu = R.applyReform(global.GM, global.P, '苏州', '一条鞭法', {});
ok(rxi.suited === false && rsu.suited === true, '6·一条鞭法：陕西(无银市场)不适配·苏州适配');
ok(gateCalls.some(function (g) { return g.name === '农户' && g.source === 'reform-whip-poison'; }), '6·陕西行鞭法→农户受毒(过闸)');

// 7) 限制优免：exemptCapFactor + exempt 重算降 + 士绅代价
world(); R.ensureDefaults(global.GM, global.P); seedAll(); setupGate();
R.refreshExempt(global.GM, global.P); var exFull = xi().populationDetail.exemptDing; // 16
R.applyReform(global.GM, global.P, '陕西', '限制优免', { factor: 0.5 });
ok(xi().populationDetail.exemptDing < exFull, '7·限制优免→exempt 降(' + xi().populationDetail.exemptDing + '<' + exFull + ')');
ok(gateCalls.some(function (g) { return g.name === '士大夫' && g.d < 0; }), '7·限制优免→士绅跌(过闸)');

// 8) live 安全：未种子地域 ok:false
world(); R.ensureDefaults(global.GM, global.P); setupGate(); // 不 seed
ok(R.applyReform(global.GM, global.P, '陕西', '清丈', {}).ok === false, '8·未种子地域变法 ok:false（live 安全）');

// 9) 单一真相源
ok(R.assertNoDingInRenli(global.GM).length === 0, '9·GM.renli 无丁泄漏');

console.log('\n[smoke-renli-reforms] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
