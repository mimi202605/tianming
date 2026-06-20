#!/usr/bin/env node
'use strict';
/* smoke-army-units-derivation — 御驾亲征接入 Phase0「编制地基」
 *   ① composition→units[] 填满+余数切队(≤1000·余数单独)·总数守恒·composition 不改
 *   ② 兵种识别瀑布(字根/装备反推/骑射/御营/杂兵兜底·朝代中立)
 *   ③ 历练按品质·队字段齐(番号/arm/sub/men/status/parentArmyId)·空/缺失永不崩
 */
const path = require('path');
const TMA = require(path.resolve(__dirname, '..', 'tm-army-units.js'));
let A = 0, F = 0;
function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }

console.log('smoke-army-units-derivation');

/* ① 派生:填满+余数 */
const d = TMA.deriveArmyUnits;
let u = d({ id: 'a1', quality: '普通', composition: [{ type: '步兵', count: 3000 }] });
ok(u.length === 3, '① 3000 步兵 → 3 队');
ok(u[0].men === 1000 && u[2].men === 1000, '① 各队满 1000');
u = d({ id: 'a2', quality: '精兵', composition: [{ type: '骑兵', count: 2500 }] });
ok(u.length === 3 && u[2].men === 500, '① 2500 → 3 队·尾队 500');
ok(u[2].status === '不满编' && u[0].status === '满编', '① 满编/不满编 标注');
u = d({ id: 'a3', composition: [{ type: '长枪兵', count: 1500 }, { type: '轻骑', count: 800 }] });
ok(u.length === 3, '① 多兵种 1500+800 → 3 队');
ok(u[0].番号 === '长枪兵' && u[2].番号 === '轻骑', '① 番号(兵种)随队保留');
ok(u.reduce((s, x) => s + x.men, 0) === 2300, '① units 总人数 = composition 总数(守恒)');
ok(u[0].parentArmyId === 'a3', '① parentArmyId 回填');

/* composition 不改 */
const a4 = { id: 'a4', soldiers: 2300, composition: [{ type: '混编', count: 2300 }] };
d(a4);
ok(a4.composition.length === 1 && a4.composition[0].count === 2300, '① composition 原样不动');

/* ② 识别瀑布 */
const cls = (t, army) => TMA.classifyUnitType(t, army);
ok(cls('红夷大炮').sub === 'cannon' && cls('红夷大炮').arm === 'art', '② 红夷大炮→art/cannon');
ok(cls('神机鸟铳').sub === 'musket', '② 鸟铳→musket');
ok(cls('真定弩手').sub === 'crossbow', '② 弩→crossbow');
ok(cls('蓟州弓手').sub === 'bow', '② 弓手→bow');
ok(cls('大同长枪').sub === 'spear', '② 长枪→spear');
ok(cls('昌平镋钯').sub === 'halberd', '② 镋钯→halberd');
const sw = cls('宣府刀盾'); ok(sw.sub === 'sword' && sw.flags.indexOf('shield') >= 0, '② 刀盾→sword+shield');
ok(cls('关宁铁骑').arm === 'cav' && cls('关宁铁骑').sub === 'heavy', '② 铁骑→cav/heavy(铁→重)');
ok(cls('蒙古弓骑').arm === 'cav' && cls('蒙古弓骑').sub === 'horse', '② 弓骑→cav/horse(骑射特办·非步弓)');
ok(cls('御营亲军').arm === 'guard', '② 御营亲军→guard');
const misc = cls('象兵'); ok(misc.arm === 'step' && misc.flags.indexOf('miscellaneous') >= 0, '② 杜撰词象兵→杂兵兜底(永不崩)');
ok(cls('精锐家丁').flags.indexOf('elite') >= 0, '② 修饰位 家丁→elite flag');
/* ②b 「枪」一字两义消歧:火器枪→musket·冷兵长枪→spear(燧发枪兵不再被当长枪兵) */
ok(cls('燧发枪兵').sub === 'musket', '②b 燧发枪兵→musket(非长枪·兵模=火铳兵 unit_gun.glb)');
ok(cls('线列步兵').sub === 'musket', '②b 线列步兵→musket(火铳兵·非杂兵兜底刀盾)');
ok(cls('火枪兵').sub === 'musket' && cls('火绳枪兵').sub === 'musket' && cls('滑膛枪兵').sub === 'musket', '②b 火枪/火绳枪/滑膛枪→musket');
ok(cls('步枪手').sub === 'musket' && cls('排枪手').sub === 'musket', '②b 步枪/排枪→musket');
ok(cls('大同长枪').sub === 'spear' && cls('红缨枪').sub === 'spear' && cls('白杆枪兵').sub === 'spear', '②b 真长枪(长枪/红缨/白杆)仍→spear(消歧不误伤)');
ok(cls('标枪手').sub === 'spear', '②b 标枪(投掷长兵)→spear');
const mix = TMA.deriveArmyUnits({ id: 'mx', composition: [{ type: '长枪燧发枪混编', count: 4000 }] });
const mixSubs = {}; mix.forEach(q => mixSubs[q.sub] = 1);
ok(mixSubs.musket && mixSubs.spear, '②b 长枪+燧发枪混编→火铳+长枪两兵种(火枪归火铳·长枪归长枪)');
const pureGun = TMA.deriveArmyUnits({ id: 'pg', composition: [{ type: '燧发枪兵', count: 3000 }] });
ok(pureGun.every(q => q.sub === 'musket'), '②b 纯燧发枪兵→全火铳(不误拆出长枪)');
/* ②c 近代兵种命名(掷弹/散兵/猎兵/线列→火铳·枪骑兵=lancer骑兵·机枪火器·朝代中立接住架空/近代剧本) */
ok(cls('掷弹兵').sub === 'musket' && cls('散兵').sub === 'musket' && cls('猎兵').sub === 'musket', '②c 掷弹兵/散兵/猎兵→musket(近代火器步兵)');
ok(cls('枪骑兵').arm === 'cav', '②c 枪骑兵→cav(lancer骑兵·非步兵长枪·骑乘近战判定)');
ok(cls('胸甲枪骑兵').arm === 'cav' && cls('胸甲枪骑兵').sub === 'heavy', '②c 胸甲枪骑兵→cav/heavy(重甲lancer)');
ok(cls('机枪手').sub === 'musket' && cls('重机枪').sub === 'musket', '②c 机枪/重机枪→musket(非长枪)');
ok(cls('马克沁机枪').sub === 'musket' && cls('加特林').sub === 'musket', '②c 马克沁/加特林→musket(「马」不被当战马误判骑射)');
ok(cls('速射炮').arm === 'art' && cls('榴弹炮').arm === 'art', '②c 速射炮/榴弹炮→art(速射不误归火铳)');
ok(cls('胸甲骑兵').sub === 'heavy' && cls('龙骑兵').sub === 'horse', '②c 胸甲骑兵→铁骑·龙骑兵→轻骑(不误伤)');
/* level3 装备反推:名字不透明→翻 equipment */
ok(cls('选锋营', { equipment: ['鸟铳', '腰刀'] }).sub === 'musket', '② 装备反推 鸟铳→musket');

/* ③ 历练 + 兜底 */
ok(TMA.vetFromQuality('精锐') === 55 && TMA.vetFromQuality('新募') === 15, '③ 历练按品质(精锐55/新募15)');
ok(TMA.deriveArmyUnits({}).length === 0, '③ 无 composition 且无兵力 → [](不崩)');
ok(TMA.deriveArmyUnits({ composition: [] }).length === 0, '③ 空 composition → []');
ok(TMA.deriveArmyUnits({ composition: [{ type: '步', count: 0 }] }).length === 0, '③ count=0 → 不产队');
/* 无 composition 但有 soldiers → 兜底成一队组 */
const fb = TMA.deriveArmyUnits({ id: 'fb', soldiers: 1800, quality: '屯田' });
ok(fb.length === 2 && fb[0].历练 === 15, '③ 无 composition·靠 soldiers 兜底派生(屯田→历练15)');
/* ensureArmyUnits 幂等 */
const ea = { id: 'ea', composition: [{ type: '步兵', count: 1000 }] };
TMA.ensureArmyUnits(ea); const ref = ea.units; TMA.ensureArmyUnits(ea);
ok(ea.units === ref, '③ ensureArmyUnits 幂等(不重派)');
ea._unitsStale = true; TMA.ensureArmyUnits(ea);
ok(ea.units !== ref, '③ _unitsStale 标脏→重派');

/* ④ 派生视图自愈(★用户核心诉求:扩军/裁军/AI高自由度改军→units[]正确·无须逐mutation点埋钩) */
const dyn = { id: 'dyn', quality: '普通', composition: [{ type: '步兵', count: 1000 }] };
TMA.ensureArmyUnits(dyn); ok(dyn.units.length === 1, '④ 初始 1000→1 队');
dyn.composition[0].count = 3000; const before = dyn.units;
TMA.ensureArmyUnits(dyn); ok(dyn.units.length === 3 && dyn.units !== before, '④ 扩军 1000→3000·签名自愈自动重派3队(未手动标脏)');
dyn.composition[0].count = 1500;
TMA.ensureArmyUnits(dyn); ok(dyn.units.length === 2, '④ 裁军 3000→1500·自动重派2队');
dyn.composition = [{ type: '步兵', count: 1000 }, { type: '红夷大炮', count: 600 }];
TMA.ensureArmyUnits(dyn); ok(dyn.units.length === 2 && dyn.units.some(u => u.sub === 'cannon'), '④ AI改军 整体换composition加炮队·自动重派+识别(高自由度适配)');
const same = dyn.units; TMA.ensureArmyUnits(dyn); ok(dyn.units === same, '④ 源未变→不重派(签名缓存·渲染热路径每帧调安全)');
const sd = { id: 'sd', quality: '普通', soldiers: 800 };
TMA.ensureArmyUnits(sd); ok(sd.units.length === 1, '④ 无composition·靠soldiers 800→1队');
sd.soldiers = 2200; TMA.ensureArmyUnits(sd); ok(sd.units.length === 3, '④ AI仅改soldiers 800→2200·自动重派3队');

/* ⑤ 防碎牌(§12.1:尾队<200并入前队·避免幽灵小队) */
ok(d({ id: 'f1', composition: [{ type: '步兵', count: 1050 }] }).length === 1, '⑤ 1050→1队(50<200并入)');
ok(d({ id: 'f1b', composition: [{ type: '步兵', count: 1050 }] })[0].men === 1050, '⑤ 并队后 men=1050');
ok(d({ id: 'f2', composition: [{ type: '步兵', count: 1250 }] }).length === 2, '⑤ 1250→2队(250≥200·保留余队)');
ok(d({ id: 'f3', composition: [{ type: '步兵', count: 2120 }] }).length === 2, '⑤ 2120→2队(120<200并入末队→1000+1120)');
ok(d({ id: 'f4', composition: [{ type: '步兵', count: 150 }] }).length === 1, '⑤ 150→1队(唯一队·不动)');

/* ⑥ 混编拆分(§12.2:一条目多武器字根→拆多兵种·总数守恒) */
const mx = d({ id: 'm1', quality: '精兵', composition: [{ type: '长矛刀牌', count: 1000 }] });
ok(mx.length === 2, '⑥ 长矛刀牌→拆2兵种');
ok(mx.some(u => u.sub === 'spear') && mx.some(u => u.sub === 'sword'), '⑥ 拆出 长枪+刀盾');
ok(mx.reduce((s, u) => s + u.men, 0) === 1000, '⑥ 混编拆分总数守恒=1000');
ok(mx.every(u => u['番号'] === '长矛刀牌'), '⑥ 番号保留原条目(右栏按番号+兵种分组显)');
const mx2 = d({ id: 'm2', composition: [{ type: '弓弩手', count: 900 }] });
ok(mx2.some(u => u.sub === 'bow') && mx2.some(u => u.sub === 'crossbow'), '⑥ 弓弩手→弓+弩');
ok(d({ id: 'm3', composition: [{ type: '宣府刀盾', count: 500 }] }).every(u => u.sub === 'sword'), '⑥ 刀盾(刀+盾同短兵)→不拆·单一');
ok(d({ id: 'm4', composition: [{ type: '关宁铁骑', count: 1500 }] }).every(u => u.arm === 'cav'), '⑥ 骑兵不拆(混编只对非骑)');

console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
