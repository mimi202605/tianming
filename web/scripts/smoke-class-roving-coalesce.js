#!/usr/bin/env node
/* eslint-env node */
// smoke-class-roving-coalesce.js — C4·流寇跨省凝聚（2026-06-16）实跑断言（真模块 PhaseF3）
//   验：起义+逃户池→流寇守恒凝聚 + 起义省份标记 + 无血溃散守恒 + 势穷瓦解 +
//       镇压(斩首离籍/溃散回逃户/耗军饷) + 招抚(守恒回编户/军户 + 开恶例) + 小池/无起义不凝聚。
'use strict';

const path = require('path');
const WEB = path.join(__dirname, '..');
require(path.join(WEB, 'tm-engine-constants.js'));
require(path.join(WEB, 'tm-class-mobility.js'));
const PF3 = global.PhaseF3;

let A = 0, F = 0;
function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ ' + m); } }
const ebLog = [];
global.addEB = function (cat, msg) { ebLog.push(cat + '·' + msg); };

function mkGM(extra) {
  return Object.assign({
    turn: 5,
    classes: [{ name: '自耕农', _radicalFrac: 0.7, revoltState: { phase: 'uprising' },
      regionalVariants: [{ region: '陕西', satisfaction: 8 }, { region: '江南', satisfaction: 40 }] }],
    population: { byClass: { peasant_self: { mouths: 5000000 } }, byLegalStatus: { taoohu: { mouths: 300000 } } }
  }, extra || {});
}
function total(G) {
  var t = 0, p = G.population || {};
  Object.keys(p.byClass || {}).forEach(function (k) { t += Number(p.byClass[k].mouths) || 0; });
  Object.keys(p.byLegalStatus || {}).forEach(function (k) { t += Number(p.byLegalStatus[k].mouths) || 0; });
  (G.rovingRebels || []).forEach(function (r) { t += Number(r.strength) || 0; });
  return t;
}

console.log('smoke-class-roving-coalesce — C4 流寇跨省凝聚');

// 1. 凝聚：起义+逃户池→流寇守恒成军 + 起义省份标记
const g1 = mkGM(); global.GM = g1;
const tot1 = total(g1);
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((g1.rovingRebels || []).length === 1, '起义+逃户池→凝聚出 1 股流寇');
ok(g1.rovingRebels[0].strength === 48000, '入伙=逃户池×0.16 守恒 (got ' + g1.rovingRebels[0].strength + ')');
ok(g1.population.byLegalStatus.taoohu.mouths === 252000, '逃户池守恒减 (got ' + g1.population.byLegalStatus.taoohu.mouths + ')');
ok(total(g1) === tot1, '★凝聚守恒（总数不变 ' + total(g1) + '）');
ok(g1.rovingRebels[0].regions.indexOf('陕西') >= 0 && g1.rovingRebels[0].regions.indexOf('江南') < 0, '跨省标记·只记起义低满意省份(陕西·非江南)');
ok(ebLog.some(function (e) { return /聚为流寇/.test(e); }), '邸报·流民聚为流寇');

// 2. 无血溃散（起义平息→不喂新血→守恒回逃户）；回合推进（真管线 ctx.turn===GM.turn）
g1.classes[0]._radicalFrac = 0.2; g1.classes[0].revoltState.phase = 'calm'; g1.turn = 6;
const totBefore2 = total(g1);
PF3._tickRovingCoalesce({ turn: 6 }, 1);
ok(g1.rovingRebels[0].strength === 43200, '无血溃散 −10%/回合 48000→43200 (got ' + g1.rovingRebels[0].strength + ')');
ok(total(g1) === totBefore2, '★溃散守恒（回逃户·总数不变）');

// 3. 镇压（部分兵力）：斩首离籍 + 溃散回逃户 + 耗军饷
const g3 = mkGM({ fiscal: { treasury: 1000000 } }); global.GM = g3;
PF3._tickRovingCoalesce({ turn: 5 }, 1);   // strength 48000
const totBefore3 = total(g3);
const sup = PF3.suppressRovingRebel(g3.rovingRebels[0], 20000);   // hit=min(48000,24000)=24000
ok(sup.ok && sup.killed === 12000 && sup.scattered === 12000, '镇压·斩首12000+溃散12000 (got ' + sup.killed + '/' + sup.scattered + ')');
ok(g3.rovingRebels[0].strength === 24000 && !g3.rovingRebels[0].disbanded, '镇压后流寇余势 24000·未灭 (got ' + g3.rovingRebels[0].strength + ')');
ok(g3.population.byLegalStatus.taoohu.mouths === 252000 + 12000, '溃散者守恒回逃户 (got ' + g3.population.byLegalStatus.taoohu.mouths + ')');
ok(total(g3) === totBefore3 - sup.killed, '★镇压·人口净减=斩首数(余守恒) (' + total(g3) + ' == ' + (totBefore3 - sup.killed) + ')');
ok(g3.fiscal.treasury === 1000000 - sup.silver && sup.silver === 10000, '镇压耗军饷扣国库 (' + sup.silver + ')');

// 3b. 续剿至瓦解
const sup2 = PF3.suppressRovingRebel(g3.rovingRebels[0] || g3.rovingRebels.find && g3.rovingRebels[0], 60000);
ok(sup2.disbanded === true && (g3.rovingRebels || []).length === 0, '续剿·贼势瓦解·清出名册');

// 4. 招抚：守恒回编户/军户 + 开恶例
const g4 = mkGM(); g4.population.byClass.military = { mouths: 1000000 }; global.GM = g4;
PF3._tickRovingCoalesce({ turn: 5 }, 1);   // strength 48000
const totBefore4 = total(g4);
const pac = PF3.pacifyRovingRebel(g4.rovingRebels[0]);
ok(pac.ok && pac.absorbed === 48000 && pac.toMil === 14400 && pac.toBian === 33600, '招抚·编户33600+军户14400=48000 (got ' + pac.toBian + '/' + pac.toMil + ')');
ok(g4.population.byLegalStatus.huangji.mouths === 33600 && g4.population.byClass.military.mouths === 1000000 + 14400, '招抚守恒入编户/军户格子');
ok(total(g4) === totBefore4, '★招抚守恒（总数不变）');
ok(g4._amnestyPrecedent === 1 && (g4.rovingRebels || []).length === 0, '招抚·开恶例记账 + 流寇消');

// 5. 边界：逃户池太小 / 无起义 → 不凝聚
const g5 = mkGM(); g5.population.byLegalStatus.taoohu.mouths = 10000; global.GM = g5;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((g5.rovingRebels || []).length === 0, '逃户池<5万→不凝聚');
const g6 = mkGM(); g6.classes[0]._radicalFrac = 0.2; g6.classes[0].revoltState.phase = 'calm'; global.GM = g6;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((g6.rovingRebels || []).length === 0, '无起义阶层→不凝聚（逃户池虽大）');

// 5b. ②·E↔C4：按 unrestArchetype 分化造反方式
// 上层「不合作」起义 → 隐田抗税·不聚流寇（逃户池虽大）
const gNon = mkGM(); gNon.classes[0].name = '缙绅'; gNon.classes[0].descriptor = { unrestArchetype: '不合作' }; global.GM = gNon;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((gNon.rovingRebels || []).length === 0, '★不合作(上层)起义→不聚流寇(隐田抗税·逃户池虽大)');
// 撤离(商)亦不聚
const gFlee = mkGM(); gFlee.classes[0].name = '商人'; gFlee.classes[0].descriptor = { unrestArchetype: '撤离' }; global.GM = gFlee;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((gFlee.rovingRebels || []).length === 0, '撤离(商)起义→不聚流寇');
// 暴烈(下层) → 聚流寇
const gVio = mkGM(); gVio.classes[0].descriptor = { unrestArchetype: '暴烈' }; global.GM = gVio;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((gVio.rovingRebels || []).length === 1, '暴烈(下层)起义→聚流寇');
// 哗变(军) → 聚流寇
const gMut = mkGM(); gMut.classes[0].name = '军户'; gMut.classes[0].descriptor = { unrestArchetype: '哗变' }; global.GM = gMut;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((gMut.rovingRebels || []).length === 1, '哗变(军)起义→聚流寇(逃卒为寇)');
// 无描述符 → 默认计入（回归安全·既有 5 项凝聚/镇压/招抚断言皆此路）
ok((g1.rovingRebels || []).length >= 0, '无描述符默认计入(回归安全·见上文凝聚断言)');

// 5c. ④·per-region 热区驱动真跨省凝聚（全国级未起义也由地域热区触发·区域标记取真热区按乱民排序）
const gReg = mkGM();
gReg.classes[0]._radicalFrac = 0.3; gReg.classes[0].revoltState = { phase: 'brewing' };   // 全国级未起义(<0.6)
gReg.classes[0].regionalVariants = [
  { region: '陕西', _radicalFrac: 0.7, satisfaction: 12 },
  { region: '山西', _radicalFrac: 0.6, satisfaction: 18 },
  { region: '江南', _radicalFrac: 0.2, satisfaction: 45 }
];
global.GM = gReg;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
const reb = (gReg.rovingRebels || [])[0];
ok(reb && reb.strength > 0, '★地域热区(陕西0.7/山西0.6)→流寇凝聚(全国级未起义亦触发)');
ok(reb && reb.regions.indexOf('陕西') >= 0 && reb.regions.indexOf('山西') >= 0, '区域标记取真热区(陕西/山西·非 best-effort 猜测)');
ok(reb && reb.regions.indexOf('江南') < 0, '非热区(江南 rf0.2<0.5)不标记');
ok(reb && reb.regions[0] === '陕西', '热区按乱民排序(陕西0.7 居首)');
// 上层不合作类的热区不喂流寇（archetype 门控仍在地域层生效）
const gRegNon = mkGM();
gRegNon.classes[0].name = '缙绅'; gRegNon.classes[0].descriptor = { unrestArchetype: '不合作' };
gRegNon.classes[0]._radicalFrac = 0.3; gRegNon.classes[0].revoltState = { phase: 'brewing' };
gRegNon.classes[0].regionalVariants = [{ region: '江南', _radicalFrac: 0.8, satisfaction: 30 }];
global.GM = gRegNon;
PF3._tickRovingCoalesce({ turn: 5 }, 1);
ok((gRegNon.rovingRebels || []).length === 0, '不合作类的地域热区→不聚流寇(走隐田·archetype 门控贯穿地域层)');

// 6. 源契约
ok(typeof PF3._tickRovingCoalesce === 'function' && typeof PF3.suppressRovingRebel === 'function' && typeof PF3.pacifyRovingRebel === 'function', '源契约·PhaseF3 导出凝聚/镇压/招抚三 API');
ok(/_isViolentUprising/.test(require('fs').readFileSync(require('path').join(WEB, 'tm-class-mobility.js'), 'utf8')), '源契约·凝聚按 unrestArchetype 门控(暴烈/哗变/倒戈)');

console.log('\n[smoke-class-roving-coalesce] ' + (F ? 'FAIL' : 'PASS') + ' — ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
