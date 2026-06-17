/* smoke-renli-wentian.js — R5：问天 god-mode 解析器（丁/田/役/农政）（node 直跑）
 * ★防幽灵属性（你的血泪教训）：写真对象、裸名/非 renli/未知地域一律 false 交派发器、GM.renli 无丁泄漏。
 * 跑：node scripts/smoke-renli-wentian.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(c, m) { if (c) pass++; else { fail++; fails.push(m); console.error('  ✗ ' + m); } }
function eq(a, b, m) { ok(a === b, m + ' (得 ' + JSON.stringify(a) + '·期 ' + JSON.stringify(b) + ')'); }

global.P = { adminHierarchy: { player: { divisions: [
  { id: '陕西', name: '陕西', populationDetail: { mouths: 3000000, households: 600000, ding: 900000, fugitives: 0, hiddenCount: 0 } }
] } } };
global.GM = { turn: 1 };
var R = require('../tm-renli.js');
R.ensureDefaults(global.GM, global.P);
R.seedRegion(global.GM, global.P, '陕西', { soilBase: 70, waterworks: 50, registeredLand: 3000000 });
var leaf = R.leaves(global.P)[0];
var afterCalls = []; var cb = function (p, o, n) { afterCalls.push({ p: p, o: o, n: n }); };

// 1) 地力 set → region.soil（真对象）
ok(R.wtHardChange(global.GM, global.P, ['region', '陕西', '地力'], 'set', 50, cb), '1·region[陕西].地力 set 命中');
eq(R.getRegion(global.GM, '陕西').soil, 50, '1·region.soil=50');

// 2) 实在丁 set → leaf.ding（真人口对象·非幽灵）
ok(R.wtHardChange(global.GM, global.P, ['region', '陕西', '实在丁'], 'set', 800000, cb), '2·实在丁 set 命中');
eq(leaf.populationDetail.ding, 800000, '2·leaf.populationDetail.ding=800000（真对象）');

// 3) 别名 + add：逃户 add 5万
ok(R.wtHardChange(global.GM, global.P, ['region', '陕西', '逃户'], 'add', 50000, cb), '3·逃户 add 命中');
eq(leaf.populationDetail.fugitives, 50000, '3·fugitives add 生效');

// 4) clamp：地力 set 200 → 夹 100
R.wtHardChange(global.GM, global.P, ['region', '陕西', '地力'], 'set', 200, cb);
eq(R.getRegion(global.GM, '陕西').soil, 100, '4·地力 set 200 → 夹 100');

// 5) 役政策：地域前缀 + 役需 set
ok(R.wtHardChange(global.GM, global.P, ['地域', '陕西', '役需'], 'set', 120000, cb), '5·地域[陕西].役需 set 命中');
eq(R.getRegion(global.GM, '陕西').levyPolicy.corveeDemand, 120000, '5·levyPolicy.corveeDemand=120000');

// 6) ★防误伤：裸名/非 renli 前缀/未知地域 一律 false（交派发器·不写幽灵）
ok(!R.wtHardChange(global.GM, global.P, ['陕西', '地力'], 'set', 50, cb), '6·裸名（无前缀·len<3）→ false');
ok(!R.wtHardChange(global.GM, global.P, ['classes', '农户', '满意度'], 'set', 50, cb), '6·非 renli 前缀(classes) → false');
ok(!R.wtHardChange(global.GM, global.P, ['region', '不存在省', '地力'], 'set', 50, cb), '6·未知地域 → false');
ok(!R.wtHardChange(global.GM, global.P, ['region', '陕西', '不存在字段'], 'set', 50, cb), '6·未知字段 → false');

// 7) ★无幽灵键：god-mode 后 GM.renli.byRegion 仍无丁计数键
ok(R.assertNoDingInRenli(global.GM).length === 0, '7·god-mode 后 GM.renli 无丁泄漏');

// 8) afterCb（UI 刷新）被调用·路径含 renli
ok(afterCalls.length >= 5 && afterCalls[0].p.indexOf('renli') >= 0, '8·afterCb(UI刷新) 被调用·路径=' + (afterCalls[0] && afterCalls[0].p));

console.log('\n[smoke-renli-wentian] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
