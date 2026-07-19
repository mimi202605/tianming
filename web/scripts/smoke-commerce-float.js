// smoke-commerce-float.js — P1-B1 商贸随人口/繁荣浮动断言(2026-06-20)
//   拆自然基础+建筑加成·增量捕获不改 building-works·物产活化恒开(斩旗转正)·灾异正交
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'tm-fiscal-engine.js');
global.window = global;
global.GM = { turn: 1, policies: {} };
global.P = { conf: {} };
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'tm-fiscal-engine.js' });
var CT = global.CascadeTax;
if (!CT || typeof CT._settleLandFlow !== 'function') { console.log('FAIL: CascadeTax._settleLandFlow 未加载'); process.exit(1); }

function mkDiv(mouths, prosperity) {
  return { name: '测试府', prosperity: prosperity, corruption: 30, minxin: 60,
    populationDetail: { mouths: mouths, households: Math.floor(mouths / 5), ding: Math.floor(mouths * 0.25) },
    terrain: 'plains', tags: {}, carryingCapacity: { arable: 5000000, currentLoad: 0.85 }, economyBase: {} };
}
var ctx = { turnFracOfYear: 30 / 365 };

// ── T2/T3：随人口浮动(恒开) ──
var div = mkDiv(1000000, 50);
CT._settleLandFlow(div, ctx);                       // 初始化 commerceVolume = 1M×0.05×1 = 50000
var cv0 = div.economyBase.commerceVolume;
div.populationDetail.mouths = 2000000;              // 人口翻倍
CT._settleLandFlow(div, ctx);                       // 重算(mouths=2M·coef=1)
var cv1 = div.economyBase.commerceVolume;
var T2 = (cv1 > cv0);
var T3 = (cv1 === 100000);                           // 2M×0.05×1

// ── T4：繁荣涨→商贸涨(coef) ──
var divRich = mkDiv(1000000, 100); CT._settleLandFlow(divRich, ctx);  // coef=2 → 100000
var divPoor = mkDiv(1000000, 50);  CT._settleLandFlow(divPoor, ctx);  // coef=1 → 50000
var T4 = (divRich.economyBase.commerceVolume > divPoor.economyBase.commerceVolume);

// ── T5：建筑加成保留(增量捕获) ──
var divB = mkDiv(1000000, 50); CT._settleLandFlow(divB, ctx);  // 自然 50000·_commerceNaturalLast=50000
divB.economyBase.commerceVolume += 30000;                      // 模拟建市舶 +30000
divB.populationDetail.mouths = 1200000;                        // 人口涨
CT._settleLandFlow(divB, ctx);                                 // 自然=1.2M×0.05=60000 + 加成30000 = 90000
var T5 = (divB.economyBase.commerceVolume === 90000);

// ── T6：灾异正交(率不改存储·B1 重算不受影响) ──
var divD = mkDiv(1000000, 50); CT._settleLandFlow(divD, ctx);
divD._disasterEconomyReduce = { commerceVolume: 0.5, farmland: 0.3 };  // 灾异折损率
divD.populationDetail.mouths = 1000000;
CT._settleLandFlow(divD, ctx);                                 // B1 重算不读 _disasterEconomyReduce
var T6 = (divD.economyBase.commerceVolume === 50000);          // 仍自然基础(灾异率在算税时乘·不改存储)

console.log('[B1] 初值=' + cv0 + ' · 随人口(2M)=' + cv1 + ' · 繁荣100=' + divRich.economyBase.commerceVolume + '/繁荣50=' + divPoor.economyBase.commerceVolume + ' · 建市舶+人口涨=' + divB.economyBase.commerceVolume + '(自然60000+加成30000) · 灾异下=' + divD.economyBase.commerceVolume);
console.log('  [T2] 开关开人口涨→商贸涨：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [T3] 重算精确(2M×0.05×1=100000)：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [T4] 繁荣涨→商贸涨(coef)：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [T5] 建筑加成保留(增量捕获·60000+30000)：' + (T5 ? 'OK' : 'FAIL'));
console.log('  [T6] 灾异正交(率不改存储重算)：' + (T6 ? 'OK' : 'FAIL'));
var all = T2 && T3 && T4 && T5 && T6;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
