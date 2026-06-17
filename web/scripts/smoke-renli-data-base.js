/* smoke-renli-data-base.js — R1 数据底座断言（node 直跑）
 * 验：ensure 结构 / 叶子 alloc+registeredDing / 试点种子 / 近账环 / 持久化 round-trip /
 *     ★单一真相源契约：GM.renli 绝无丁计数键 + alloc 分配不变量。
 * 跑：node scripts/smoke-renli-data-base.js
 */
'use strict';

var pass = 0, fail = 0, fails = [];
function ok(cond, msg) { if (cond) { pass++; } else { fail++; fails.push(msg); console.error('  ✗ ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (得 ' + JSON.stringify(a) + '·期 ' + JSON.stringify(b) + ')'); }

// ── 桩：两叶子（陕西/江南苏松），各带 canonical 人口对象 populationDetail ──
function freshWorld() {
  global.P = {
    adminHierarchy: {
      player: {
        divisions: [
          { id: '陕西', name: '陕西', children: [
            { id: '西安府', name: '西安府', populationDetail: { mouths: 3000000, households: 600000, ding: 900000 } }
          ] },
          { id: '江南苏松', name: '江南苏松', populationDetail: { mouths: 4000000, households: 800000, ding: 1200000 } }
        ]
      }
    }
  };
  global.GM = { turn: 5 };
}

freshWorld();
var R = require('../tm-renli.js');
ok(R && typeof R.ensureDefaults === 'function', '模块导出 ensureDefaults');
ok(typeof (globalThis.TM && globalThis.TM.Renli) === 'object', '注册 globalThis.TM.Renli');

// 1) ensureDefaults 建结构
R.ensureDefaults(global.GM, global.P);
ok(global.GM.renli && global.GM.renli.byRegion && global.GM.renli.reported, '1·GM.renli{byRegion,reported} 建立');

// 2) 叶子取 canonical 人口对象（叶子是 西安府 与 江南苏松，非省级容器）
var ls = R.leaves(global.P);
eq(ls.length, 2, '2·枚举到 2 个叶子（西安府/江南苏松，省级容器不算叶）');
var xian = ls.filter(function (l) { return l.id === '西安府'; })[0];
var jn = ls.filter(function (l) { return l.id === '江南苏松'; })[0];
ok(xian && jn, '2·叶子定位');

// 3) 叶子人口对象补 alloc(4键=0) + registeredDing(=ding)
var pdX = R.popOf(xian);
ok(pdX.alloc && R.ALLOC_KEYS.every(function (k) { return pdX.alloc[k] === 0; }), '3·西安府 alloc 四键全 0');
eq(pdX.registeredDing, 900000, '3·西安府 registeredDing 默认=实在 ding');

// 4) GM.renli.byRegion 项：农政派生 + 政策 + 近账
var rgX = R.getRegion(global.GM, '西安府');
ok(rgX && rgX.levyPolicy && Array.isArray(rgX.ledger) && typeof rgX.soil === 'number', '4·byRegion 项含 soil/levyPolicy/ledger');

// 5) ★单一真相源：GM.renli.byRegion 不得含任何丁计数键
var leaked = R.assertNoDingInRenli(global.GM);
eq(leaked.length, 0, '5·GM.renli 无丁计数泄漏 (泄漏=' + leaked.join(',') + ')');

// 6) 试点种子：陕西瘠(soil65) / 江南腴(soil90,复种1.4,市场0.8)
R.seedRegion(global.GM, global.P, '西安府', { soilBase: 65, registeredDing: 1000000, registeredLand: 3000000 });
R.seedRegion(global.GM, global.P, '江南苏松', { soilBase: 90, doubleCropping: 1.4, laborMarketDepth: 0.8, registeredDing: 1100000, registeredLand: 3800000 });
eq(R.getRegion(global.GM, '西安府').soil, 65, '6·陕西 soil=65');
eq(R.getRegion(global.GM, '江南苏松').soil, 90, '6·江南 soil=90');
eq(R.popOf(xian).registeredDing, 1000000, '6·陕西册载丁=种子值');
eq(R.popOf(jn).registeredLand, 3800000, '6·江南额田=种子值');
eq(xian.renliSeed.laborMarketDepth, 0.2, '6·陕西市场深度=0.2(默认)');
eq(jn.renliSeed.doubleCropping, 1.4, '6·江南复种=1.4');

// 7) 分配不变量：务农+役+征 = ding·优免 ⊆ 务农
pdX.exemptDing = 70000; // 优免（canonical·R4 由 gongming 填）
pdX.alloc = { farm: 770000, corvee: 80000, draft: 50000, exempt: 70000 }; // 务农+役+征=900000=ding·优免70000⊆务农
ok(R.allocValid(xian), '7·合法 alloc(务农+役+征=ding·优免⊆务农) 通过');
eq(R.levyableDing(xian), 900000 - 70000, '7·可征丁 = ding − 优免(canonical exemptDing)');
pdX.alloc = { farm: 900000, corvee: 80000, draft: 50000, exempt: 70000 }; // 和=1030000>ding
ok(!R.allocValid(xian), '7·超额 alloc(和>ding) 拒绝');

// 8) 近账环 8 条上限
for (var i = 0; i < 10; i++) R.ledgerPush(global.GM, '西安府', 'corveeRate', -0.01, '加辽饷', 'test');
eq(R.getRegion(global.GM, '西安府').ledger.length, 8, '8·近账环裁到 8 条');

// 9) 持久化 round-trip：GM.renli 可 JSON 深克隆且字段不丢（_safeClone 安全）
var clone = JSON.parse(JSON.stringify(global.GM.renli));
eq(clone.byRegion['西安府'].soil, 65, '9·round-trip soil 保留');
eq(clone.byRegion['西安府'].ledger.length, 8, '9·round-trip 近账保留');
ok(R.assertNoDingInRenli({ renli: clone }).length === 0, '9·round-trip 后仍无丁泄漏');

// 10) 幂等：再 ensureDefaults 不重置已种子值
R.ensureDefaults(global.GM, global.P);
eq(R.getRegion(global.GM, '西安府').soil, 65, '10·ensureDefaults 幂等·不覆盖种子 soil');

console.log('\n[smoke-renli-data-base] ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.error('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
process.exit(0);
