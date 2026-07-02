#!/usr/bin/env node
'use strict';
/* smoke-battle-retreat — 御驾亲征 v2·O2 战后溃退(§9)
 *   败方军沿 regions[].neighbors 邻接退最近友控邻省;本省友控→退守;四面无路→被围(重损25%/低士气请降瓦解);
 *   数据不足(无图/归属判不出)→优雅降级不移动·永不崩·_retreatDone 幂等·胜方军不动。
 */
const path = require('path');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-battle-retreat');

const ebs = [];
global.window = {};
global.document = { addEventListener: function () {} };
global.window.MilitarySystems = { applyBattleResult: function () {} };
global.window.addEB = function (c, m) { ebs.push(c + '|' + m); };
global.window.P = { playerInfo: { factionName: '宋' } };
global.window.GM = {
  _provinceToFaction: { '甲省': '金', '乙省': '金', '丙省': '宋', '孤岛': '金' },
  mapData: { regions: [
    { id: 'r1', name: '甲省', neighbors: ['r2', 'r3'] },
    { id: 'r2', name: '乙省', neighbors: ['r1'] },
    { id: 'r3', name: '丙省（江南·富庶）', neighbors: ['r1'] },
    { id: 'r4', name: '孤岛', neighbors: [] }
  ] },
  armies: []
};
/* 丙省地区名带修饰·归属表用截断名→测双向包含 + 归属回查:归属表补全名 */
global.window.GM._provinceToFaction['丙省（江南·富庶）'] = '宋';
const GM = global.window.GM;
const TURN = require(path.resolve(__dirname, '..', 'tm-battle-turn.js'));

/* ① retreatTarget 四态 */
ok(TURN.retreatTarget(GM, { faction: '宋', location: '丙省（江南·富庶）' }).kind === 'hold', '① 本省友控→hold 退守本省');
const rt = TURN.retreatTarget(GM, { faction: '宋', location: '甲省' });
ok(rt.kind === 'retreat' && rt.to === '丙省（江南·富庶）', '① 敌占省→retreat 首个友控邻省(跳过金占乙省)·实=' + JSON.stringify(rt));
ok(TURN.retreatTarget(GM, { faction: '宋', location: '孤岛' }).kind === 'surrounded', '① 空邻接敌占→surrounded 被围');
ok(TURN.retreatTarget(GM, { faction: '宋', location: '不存在之地' }).kind === 'none', '① 归属判不出→none 降级');
ok(TURN.retreatTarget(GM, null).kind === 'none', '① 空军→none 不崩');

/* ② _postBattleRetreat:败方溃退位移·胜方不动 */
GM.armies = [
  { id: 'w1', name: '胜军', faction: '宋', soldiers: 4000, location: '甲省', garrison: '甲省' },
  { id: 'l1', name: '败军', faction: '金', soldiers: 3000, morale: 55, location: '丙省（江南·富庶）', garrison: '丙省（江南·富庶）' }
];
let br = { winnerFactionId: '宋', loserFactionId: '金', affectedArmies: [{ armyId: 'w1', loss: 200 }, { armyId: 'l1', loss: 900 }] };
TURN._postBattleRetreat(br, GM);
ok(GM.armies[1].location === '甲省' && GM.armies[1].garrison === '甲省', '② 败军(金)从宋占丙省溃退至金控邻省甲省(丙省唯一邻接)');
ok(GM.armies[0].location === '甲省' && GM.armies[0].faction === '宋' && !GM.armies[0].disbanded && GM.armies[0].soldiers === 4000, '② 胜军不动');
ok(ebs.some(s => /溃退至友控之地 甲省/.test(s)), '② addEB 记溃退事');
ok(br._retreatDone === true, '② 标 _retreatDone');
TURN._postBattleRetreat(br, GM);
ok(GM.armies[1].location === '甲省', '② 幂等:二次调用不重跑');

/* ③ 被围·重损突围(士气足) */
GM.armies = [{ id: 'l2', name: '围军', faction: '宋', soldiers: 2000, size: 2000, strength: 2000, morale: 60, location: '孤岛', garrison: '孤岛' }];
ebs.length = 0;
TURN._postBattleRetreat({ winnerFactionId: '金', loserFactionId: '宋', affectedArmies: [{ armyId: 'l2', loss: 500 }] }, GM);
ok(GM.armies[0].soldiers === 1500 && GM.armies[0].size === 1500, '③ 被围突围→折兵25%(2000→1500)');
ok(GM.armies[0].morale === 48 && GM.armies[0]._unitsStale === true, '③ 士气-12·标 _unitsStale 重派');
ok(ebs.some(s => /被围血战突围/.test(s)), '③ addEB 记突围事');

/* ④ 被围·请降瓦解(士气崩/兵微) */
GM.armies = [{ id: 'l3', name: '孤军', faction: '宋', soldiers: 2000, morale: 20, location: '孤岛', garrison: '孤岛' }];
TURN._postBattleRetreat({ winnerFactionId: '金', loserFactionId: '宋', affectedArmies: [{ armyId: 'l3', loss: 800 }] }, GM);
ok(GM.armies[0].disbanded === true && GM.armies[0].soldiers === 0 && GM.armies[0].state === 'surrendered', '④ 被围+士气20<30→请降瓦解');
GM.armies = [{ id: 'l4', name: '残军', faction: '宋', soldiers: 500, morale: 70, location: '孤岛', garrison: '孤岛' }];
TURN._postBattleRetreat({ winnerFactionId: '金', loserFactionId: '宋', affectedArmies: [{ armyId: 'l4', loss: 100 }] }, GM);
ok(GM.armies[0].disbanded === true, '④ 被围+兵500<800→请降瓦解(势穷)');

/* ⑤ 降级面:无图/无败方/军已散→全不动不崩 */
const md = GM.mapData; GM.mapData = null; global.window.MING_MAP_REGIONS = undefined;
GM.armies = [{ id: 'l5', name: '某军', faction: '宋', soldiers: 1000, location: '甲省', garrison: '甲省' }];
TURN._postBattleRetreat({ winnerFactionId: '金', loserFactionId: '宋', affectedArmies: [{ armyId: 'l5', loss: 100 }] }, GM);
ok(GM.armies[0].location === '甲省' && !GM.armies[0].disbanded, '⑤ 无邻接数据→降级不移动(shaosong 类剧本安全)');
GM.mapData = md;
TURN._postBattleRetreat({ affectedArmies: [] }, GM);
TURN._postBattleRetreat(null, GM);
ok(true, '⑤ 空 br/无败方→不崩');

console.log('\n结果: ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
