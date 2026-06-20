#!/usr/bin/env node
'use strict';
/* smoke-battle-adapter — 御驾亲征接入 Phase1「适配器」
 *   军 units[](Phase0) → startBattle(config):兵牌映射/将领翻GM.chars/方名faction/规模压缩≤35方/御营/地形档·总数守恒·永不崩
 */
const path = require('path');
global.window = { TMArmyUnits: require(path.resolve(__dirname, '..', 'tm-army-units.js')) };
const ADP = require(path.resolve(__dirname, '..', 'tm-battle-adapter.js'));
let A = 0, F = 0;
function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }

console.log('smoke-battle-adapter');

const GM = { chars: [{ name: '岳飞', valor: 95, military: 92, intelligence: 88 }, { name: '完颜宗弼', valor: 90, military: 88, intelligence: 80 }] };
const player = [{ id: 'pa1', name: '背嵬军', faction: '宋', commander: '岳飞', morale: 85, training: 80, supply: 84, quality: '精锐',
  composition: [{ type: '背嵬铁骑', count: 2000 }, { type: '神臂弩', count: 1200 }, { type: '长枪步人甲', count: 3000 }] }];
const enemy = [{ id: 'ea1', name: '金军', faction: '金', commander: '完颜宗弼', morale: 84, training: 82, supply: 82, quality: '精锐',
  composition: [{ type: '铁浮屠', count: 2500 }, { type: '拐子马', count: 2000 }] }];

const cfg = ADP.buildBattleConfig(player, enemy, { provinceName: '郾城', terrainTag: '平原', weather: 'clear', playerFactionName: '宋军', enemyFactionName: '金军', emperorArmyId: 'pa1', GM: GM });

/* ① 基本形状 */
ok(cfg.armies && cfg.armies.ming.length > 0 && cfg.armies.jin.length > 0, '① 双方兵牌非空');
ok(cfg.sideName.ming === '宋军' && cfg.sideName.jin === '金军', '① 方名由 faction 传入(朝代中立)');
ok(cfg.lead === '完颜宗弼', '① 敌帅=敌军主将');
ok(cfg.emperorSide === 'ming', '① emperorSide=ming(玩家方)');

/* ② 兵牌字段(原型 roster 形状) */
const t0 = cfg.armies.ming[0];
ok(t0.type && t0.sub && t0.name && t0.soldiers > 0 && t0.gen, '② 兵牌含 type/sub/name/soldiers/gen');
ok(t0.parentArmyId === 'pa1', '② parentArmyId 回填母军');

/* ③ 将领翻 GM.chars(valor/military/intelligence → valor/mil/int) */
const yf = cfg.armies.ming.find(u => u.gen && u.gen.n === '岳飞');
ok(yf && yf.gen.valor === 95 && yf.gen.mil === 92 && yf.gen.int === 88, '③ 主将岳飞 valor95/mil92/int88(翻GM.chars)');
ok(cfg.armies.ming.some(u => u.gen.n === '裨将'), '③ 麾下分队挂裨将(非全具名英雄)');

/* ④ 兵种识别(经 units[] 派生) */
ok(cfg.armies.ming.some(u => u.type === 'cav'), '④ 背嵬铁骑→cav');
ok(cfg.armies.ming.some(u => u.sub === 'crossbow'), '④ 神臂弩→crossbow');
ok(cfg.armies.ming.some(u => u.sub === 'spear'), '④ 长枪步人甲→spear');
ok(cfg.armies.jin.some(u => u.type === 'cav'), '④ 铁浮屠/拐子马→cav');

/* ⑤ 总数守恒(玩家 2000+1200+3000=6200·敌 2500+2000=4500) */
ok(cfg.armies.ming.reduce((s, u) => s + u.soldiers, 0) === 6200, '⑤ 我方兵牌总数守恒=6200');
ok(cfg.armies.jin.reduce((s, u) => s + u.soldiers, 0) === 4500, '⑤ 敌方兵牌总数守恒=4500');

/* ⑥ 御营标记(emperorArmyId 的军首队) */
ok(cfg.armies.ming.some(u => u.emperor === true), '⑥ 御营首队标 emperor');
ok(cfg.armies.ming.filter(u => u.emperor).length === 1, '⑥ 仅一御营队');

/* ⑦ 地形档(省标签→genMap dens/biome) + 地图种子确定性 */
ok(cfg.terrainProfile && cfg.terrainProfile.dens === 0.18 && cfg.terrainProfile.biome === 'plain', '⑦ 平原→dens0.18/plain');
ok(cfg.mapSeed === ADP.buildBattleConfig(player, enemy, { provinceName: '郾城', GM: GM }).mapSeed, '⑦ 同省名→同地图种子(确定性)');
ok(ADP.provinceSeed('郾城') !== ADP.provinceSeed('朱仙镇'), '⑦ 异省名→异种子');

/* ⑧ 规模压缩:场上≤35队/方·超出入 reserves */
const big = [{ id: 'big', name: '大军', commander: '某', morale: 70, training: 60, composition: [{ type: '步兵', count: 40000 }] }];
const bc = ADP.buildBattleConfig(big, enemy, { provinceName: 'X', GM: GM });
ok(bc.armies.ming.length === 35, '⑧ 40000人(40队)→场上封顶35队');
ok(bc.reserves.ming.length === 5, '⑧ 溢出5队入 reserves(波次)');
ok(bc.meta.mingTotal === 40, '⑧ meta 记总队数40');

/* ⑨ 永不崩 */
ok(Array.isArray(ADP.buildBattleConfig([], [], {}).armies.ming), '⑨ 空军群→不崩(空兵牌)');
ok(ADP.buildBattleConfig([{ id: 'q', commander: '无名', composition: [] }], [], { GM: GM }).armies.ming.length === 0, '⑨ 空 composition 军→0兵牌');

/* ⑩ 兵种分层取样:场上保多样性(非「按队序取前N」把骑/炮/铳挤光) */
const mix = [{ id: 'mix', name: '混编大军', commander: '某', morale: 70, training: 60, composition: [
  { type: '步兵', count: 50000 }, { type: '骑兵', count: 3000 }, { type: '火铳兵', count: 2000 }, { type: '炮兵', count: 1000 }] }];   // 56队·步兵50压顶
const mc = ADP.buildBattleConfig(mix, enemy, { provinceName: 'Y', GM: GM });
ok(mc.armies.ming.length === 35, '⑩ 混编56队→场上封顶35');
const fieldSubs = {}; mc.armies.ming.forEach(u => fieldSubs[u.sub] = 1);
ok(Object.keys(fieldSubs).length >= 4, '⑩ 场上≥4兵种(分层取样·非截断成单一步兵)·实=' + Object.keys(fieldSubs).join(','));
ok(mc.armies.ming.some(u => u.type === 'cav') && mc.armies.ming.some(u => u.type === 'art') && mc.armies.ming.some(u => u.sub === 'musket'), '⑩ 骑/炮/铳都上场(不被步兵挤光)');
ok(mc.armies.ming.filter(u => u.sub === 'sword').length > mc.armies.ming.filter(u => u.type === 'cav').length, '⑩ 仍保比例:步兵(50)上场数 > 骑兵(3)');
/* selectOnField 御营强制上场 */
const toks = []; for (let i = 0; i < 50; i++) toks.push({ sub: 'sword', men: 500 }); toks.push({ sub: 'cannon', emperor: true, men: 800 });
const sel = ADP.selectOnField(toks, 35);
ok(sel.field.length === 35 && sel.field.some(t => t.emperor), '⑩ selectOnField:御营队强制上场(不沉预备队)');
ok(ADP.selectOnField(toks, 60).reserve.length === 0, '⑩ selectOnField:总数≤cap→全上场无预备');

console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
