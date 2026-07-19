// smoke-production-b2.js — P1-B2 盐矿马渔/海贸随人口浮动+建筑加成断言(2026-06-20)
//   同 B1 拆基础/加成模型·仅产区(tag)浮动·建矿场加成增量捕获保留·恒开(2026-07 斩旗转正删 productionFloatEnabled flag)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
global.GM = { turn: 1, policies: {} };
global.P = { conf: {} };
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'tm-fiscal-engine.js'), 'utf8'), { filename: 'tm-fiscal-engine.js' });
var CT = global.CascadeTax;
if (!CT || typeof CT._settleLandFlow !== 'function') { console.log('FAIL: CascadeTax._settleLandFlow 未加载'); process.exit(1); }

function mkDiv(m, tags) {
  return { name: '测试', prosperity: 50, corruption: 30, minxin: 60,
    populationDetail: { mouths: m, households: Math.floor(m / 5), ding: Math.floor(m * 0.25) },
    terrain: 'plains', tags: tags || {}, carryingCapacity: { arable: 5000000, currentLoad: 0.85 }, economyBase: {} };
}
var ctx = { turnFracOfYear: 30 / 365 };

// ── T2：盐矿随人口浮动(恒开·2026-07 斩旗转正删 productionFloatEnabled flag·原 T1 关态冻结测试随旗废除) ──
var d = mkDiv(1000000, { saltRegion: true, mineralRegion: true });
CT._settleLandFlow(d, ctx);
d.populationDetail.mouths = 2000000; CT._settleLandFlow(d, ctx);     // mouths=2M·随人口浮动
var T2 = (d.economyBase.saltProduction === 1000000 && d.economyBase.mineralProduction === 200000);  // 2M×0.5, 2M×0.1

// ── T3：建矿场加成保留(增量捕获) ──
var dm = mkDiv(1000000, { mineralRegion: true }); CT._settleLandFlow(dm, ctx);  // mineral=100000·_last=100000
dm.economyBase.mineralProduction += 50000;                  // 建矿场 +50000
dm.populationDetail.mouths = 1200000; CT._settleLandFlow(dm, ctx);  // natural=120000 + 加成50000 = 170000
var T3 = (dm.economyBase.mineralProduction === 170000);

// ── T4：非产区不浮动 ──
var dn = mkDiv(1000000, { saltRegion: false, mineralRegion: false }); CT._settleLandFlow(dn, ctx);
var T4 = (dn.economyBase.saltProduction === 0 && dn.economyBase.mineralProduction === 0);

// ── T5：海贸/马/渔浮动 ──
var dp = mkDiv(1000000, { hasPort: true, horseRegion: true, fishingRegion: true }); CT._settleLandFlow(dp, ctx);
var T5 = (dp.economyBase.maritimeTradeVolume === 20000 && dp.economyBase.horseProduction === 1000 && dp.economyBase.fishingProduction === 50000);

console.log('[B2] 盐区(人口2M)盐=' + d.economyBase.saltProduction + '/矿=' + d.economyBase.mineralProduction + ' · 建矿场+人口涨矿=' + dm.economyBase.mineralProduction + '(自然120000+加成50000) · 港马渔: 海贸=' + dp.economyBase.maritimeTradeVolume + '/马=' + dp.economyBase.horseProduction + '/渔=' + dp.economyBase.fishingProduction);
console.log('  [T2] 盐矿随人口浮动(2M×0.5/0.1)：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [T3] 建矿场加成保留(增量捕获170000)：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [T4] 非产区不浮动(0)：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [T5] 海贸/马/渔浮动：' + (T5 ? 'OK' : 'FAIL'));
var all = T2 && T3 && T4 && T5;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
