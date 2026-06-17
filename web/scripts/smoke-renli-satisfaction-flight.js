/* smoke-renli-satisfaction-flight.js — R3：满意度过总闸 + 内生逃亡棘轮 + 地域分账（node 直跑）
 * ★含 swap-test：闸 no-op 时满意度纹丝不动 → 证 Renli 绝不绕闸直写（防跳楼 bug）。
 * 跑：node scripts/smoke-renli-satisfaction-flight.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }
function near(a, b, t, m) { ok(Math.abs(a - b) <= (t || 2), m + ' (得 ' + a + '·期 ' + b + '±' + (t || 2) + ')'); }
function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d || 0); }

// 真·总闸的简化镜像：每阶层每回合净变动封顶 ±14（同 tm-class-engine.gateSatisfaction 语义）
var gateCalls = [];
function makeRealGate() {
  return function (root, cls, raw, info) {
    var turn = (info && info.turn) || 0;
    if (!cls._satBudget || cls._satBudget.turn !== turn) cls._satBudget = { turn: turn, used: 0 };
    var room = Math.max(0, 14 - cls._satBudget.used);
    var d = Math.max(-room, Math.min(room, raw));
    var before = num(cls.satisfaction, 50);
    var after = Math.max(0, Math.min(100, before + d));
    var approved = Math.round((after - before) * 100) / 100;
    if (!approved) return { approved: 0, before: before, after: before, capped: true };
    cls.satisfaction = after; cls._satBudget.used += Math.abs(approved);
    gateCalls.push({ source: info && info.source, raw: raw, approved: approved });
    return { approved: approved, before: before, after: after, capped: Math.abs(d) < Math.abs(raw) };
  };
}

function worldXi() { // 单·陕西（瘠·无折银市场）
  global.P = { adminHierarchy: { player: { divisions: [
    { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0, exemptDing: 80000 } }
  ] } } };
  global.GM = { turn: 1, classes: [ { name: '农户', economicRole: '生产', satisfaction: 58, regionalVariants: [ { region: '陕西', satisfaction: 58 } ] } ] };
}
function worldTwo() { // 陕西(瘠) + 江南(腴·折银深)
  global.P = { adminHierarchy: { player: { divisions: [
    { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0, exemptDing: 80000 } },
    { id: '江南苏松', name: '江南苏松', populationDetail: { mouths: 4000000, households: 800000, ding: 1200000, fugitives: 0, hiddenCount: 0, exemptDing: 100000 } }
  ] } } };
  global.GM = { turn: 1, classes: [ { name: '农户', economicRole: '生产', satisfaction: 58, regionalVariants: [ { region: '陕西', satisfaction: 58 }, { region: '江南苏松', satisfaction: 65 } ] } ] };
}

var R = require('../tm-renli.js');
function seedXi(G, P) { R.seedRegion(G, P, '陕西', { soilBase: 70, doubleCropping: 1.0, laborMarketDepth: 0.2, registeredLand: 3000000 }); }
function seedJn(G, P) { R.seedRegion(G, P, '江南苏松', { soilBase: 90, doubleCropping: 1.4, laborMarketDepth: 0.8, registeredLand: 4000000 }); }
function levy(G, rid, demand, weather) { var r = R.getRegion(G, rid); r.levyPolicy.corveeDemand = demand; r.weather = weather; }

// ── A·过度征发+大旱（单陕西·真闸）：信号过闸·单回合封顶 ──
worldXi(); R.ensureDefaults(global.GM, global.P); seedXi(global.GM, global.P);
global.TM.ClassEngine = { gateSatisfaction: makeRealGate() };
var nong = global.GM.classes[0]; var sat0 = nong.satisfaction;
global.GM.turn = 2; levy(global.GM, '陕西', 320000, 0.72); R.tick(global.GM, global.P);
var sat1 = nong.satisfaction; var last = gateCalls[gateCalls.length - 1];

ok(last && last.source === 'renli-corvee-grain', '1·役负/缺粮经 gateSatisfaction（源标签 renli-corvee-grain）');
ok(last && last.raw < -14, '1·原始信号 ≪ −14（役负+缺粮叠加·raw=' + (last ? last.raw.toFixed(1) : '?') + '）');
ok(sat1 < sat0 && (sat0 - sat1) <= 14.01, '2·农户单回合跌≤14（总闸夹住·没跳楼）·' + sat0 + '→' + sat1);
near(sat0 - sat1, 14, 0.2, '2·恰被夹到 −14');

// ── B·★swap-test：闸换 no-op（不写）→ 满意度纹丝不动（无绕闸直写后门）──
worldXi(); R.ensureDefaults(global.GM, global.P); seedXi(global.GM, global.P);
global.TM.ClassEngine = { gateSatisfaction: function () { return { approved: 0 }; } };
var n2 = global.GM.classes[0]; var s2 = n2.satisfaction;
global.GM.turn = 2; levy(global.GM, '陕西', 320000, 0.72); R.tick(global.GM, global.P);
ok(n2.satisfaction === s2, '3·swap-test：闸 no-op 时农户全局满意度不变（Renli 不绕闸直写）·' + n2.satisfaction);

// ── C·内生逃亡 + 棘轮（单陕西·真闸·多回合）──
worldXi(); R.ensureDefaults(global.GM, global.P); seedXi(global.GM, global.P);
global.TM.ClassEngine = { gateSatisfaction: makeRealGate() };
var xi = R.leaves(global.P)[0]; var dingStart = xi.populationDetail.ding; var rates = [];
for (var t = 2; t <= 5; t++) { global.GM.turn = t; levy(global.GM, '陕西', 320000, 0.72); R.tick(global.GM, global.P); rates.push(R.getRegion(global.GM, '陕西').corveeRate); }
ok(xi.populationDetail.fugitives > 0, '4·内生逃亡：陕西 fugitives>0（=' + xi.populationDetail.fugitives + '）');
ok(xi.populationDetail.hiddenCount > 0, '4·隐丁：陕西 hiddenCount>0（=' + xi.populationDetail.hiddenCount + '）');
ok(xi.populationDetail.ding === dingStart, '4·Renli 不动 ding 总量（单一真相源·逃亡走 fugitives）·ding=' + xi.populationDetail.ding);
ok(rates[0] < rates[rates.length - 1], '5·棘轮：同役需下役负率随逃亡升 ' + rates.map(function (x) { return x.toFixed(3); }).join('→'));

// ── D·地域分账：陕西(瘠+旱+无折银) 跌幅 > 江南(腴+丰+折银深)──
worldTwo(); R.ensureDefaults(global.GM, global.P); seedXi(global.GM, global.P); seedJn(global.GM, global.P);
global.TM.ClassEngine = { gateSatisfaction: makeRealGate() };
var nn = global.GM.classes[0];
var vXi0 = nn.regionalVariants[0].satisfaction, vJn0 = nn.regionalVariants[1].satisfaction;
for (var u = 2; u <= 4; u++) { global.GM.turn = u; levy(global.GM, '陕西', 320000, 0.72); levy(global.GM, '江南苏松', 300000, 1.05); R.tick(global.GM, global.P); }
var dropXi = vXi0 - nn.regionalVariants[0].satisfaction, dropJn = vJn0 - nn.regionalVariants[1].satisfaction;
ok(dropXi > dropJn, '6·地域分账：陕西跌幅(' + dropXi.toFixed(1) + ') > 江南(' + dropJn.toFixed(1) + ')');

// ── E·单一真相源：GM.renli 无丁泄漏 ──
ok(R.assertNoDingInRenli(global.GM).length === 0, '7·GM.renli 无丁计数泄漏');

console.log('\n[smoke-renli-satisfaction-flight] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
