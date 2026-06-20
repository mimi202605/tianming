/* smoke-office-powermap.js — 官制活化 Slice① 职权舆图 + 接线 冒烟
 * 跑法：node web/scripts/smoke-office-powermap.js
 * 验：①过滤 ②衙门概览(主官加权) ③多才(阈值40·域才豁免) ④逐权标档(同档合并/异档逐标)
 *     ⑤履职/料理占位 ⑥relevanceText 上浮 ⑦开关组
 */
'use strict';
var path = require('path');
var mod = require(path.join(__dirname, '..', 'tm-office-powermap.js'));
var buildOfficePowerMap = mod.buildOfficePowerMap;

global.findCharByName = function (n) { return (GM.chars || []).find(function (c) { return c.name === n; }) || null; };
global.getRankLevel = function (r) {
  return ({ '正一品': 1, '正二品': 2, '从二品': 3, '正三品': 5, '正五品': 9, '从五品': 10 })[r] || 10;
};

var GM = {
  turn: 14,
  chars: [
    { name: '李某', administration: 82, intelligence: 70, military: 30, loyalty: 60 }, // 军30<40 应被阈值滤
    { name: '王某', military: 45, administration: 40, loyalty: 88 },                   // 政40=40 应保留
    { name: '赵某', administration: 55, intelligence: 60, loyalty: 70 }                // 异档官·料理勉强(61)
  ],
  officeTree: [
    {
      name: '户部',
      positions: [
        { name: '尚书', rank: '正二品', holder: '李某', powers: { taxCollect: true, appointment: true }, authority: 'decision' },
        { name: '员外郎', rank: '从五品', holder: '' } // 无权·非主官 → 应被过滤
      ],
      subs: [{ name: '度支司', positions: [{ name: '郎中', rank: '正五品', holder: '', powers: { taxCollect: true }, authority: 'execution' }] }]
    },
    { name: '兵部', positions: [{ name: '尚书', rank: '正二品', holder: '王某', powers: { militaryCommand: true }, authority: 'execution', _dutyState: { fulfillment: 71, trend: 'stable' } }] },
    { name: '都察院', positions: [{ name: '左都御史', rank: '正二品', holder: '', powers: { impeach: true, supervise: true }, authority: 'supervision' }] },
    // 异档官：judicial(默认决策) + impeach(默认纠察)·无 position.authority → 逐标
    { name: '大理寺', positions: [{ name: '卿', rank: '正三品', holder: '赵某', powers: { judicial: true, impeach: true } }] }
  ]
};

var out = buildOfficePowerMap(GM, { relevanceText: '整饬边备，命兵部调兵御虏' });
console.log('\n----- 输出 -----\n' + out + '\n----------------\n');

var fails = 0;
function ok(cond, msg) { if (!cond) { console.log('✗ ' + msg); fails++; } else { console.log('✓ ' + msg); } }

ok(out.indexOf('【职权舆图】') === 0, '有标题头');
ok(out.indexOf('员外郎') < 0, '①过滤：无权非主官的员外郎被剔除');
// ②衙门概览·主官加权
ok(out.indexOf('户部·弱') >= 0 && out.indexOf('户部·瘫') < 0, '②主官在任→户部弱(非瘫)');
ok(out.indexOf('都察院·瘫(主官缺)') >= 0, '②主官缺→都察院瘫');
ok(out.indexOf('兵部·健全') >= 0 && out.indexOf('大理寺·健全') >= 0, '②满员→健全');
// ③多才 + 阈值40（域才豁免）
ok(out.indexOf('李某(政82 智70 忠60)') >= 0, '③阈值：李某 军30<40 被滤→只 政/智+忠');
ok(out.indexOf('王某(军45 政40 忠88)') >= 0, '③阈值：王某 政40=40 保留');
// ④逐权标档：同档合并 / 单权 / 异档逐标
ok(out.indexOf('权[征税|辟署]·决策') >= 0, '④同档合并：户部 征税|辟署·决策');
ok(out.indexOf('权[弹劾|监察]·纠察') >= 0, '④同档合并：都察院 弹劾|监察·纠察');
ok(out.indexOf('权[调兵·执行]') >= 0, '④单权：兵部 调兵·执行');
ok(out.indexOf('权[弹劾·纠察][刑狱·决策]') >= 0, '④异档逐标：大理寺 弹劾·纠察 + 刑狱·决策(按 POWER_LABEL 键序)');
// ⑤履职/料理
ok(out.indexOf('履职71') >= 0, '⑤真 _dutyState→履职71');
ok(out.indexOf('料理称职') >= 0, '⑤料理占位·称职(李某 73.2)');
ok(out.indexOf('料理勉强') >= 0, '⑤料理占位·勉强(赵某 61)');
// ⑥relevanceText 上浮
var idxBing = out.indexOf('兵部·尚书'), idxDu = out.indexOf('左都御史'), idxHu = out.indexOf('户部·尚书');
ok(idxBing >= 0 && idxDu >= 0 && idxHu >= 0, '三要职均在详情');
ok(idxBing < idxDu, '⑥relevanceText：圣旨提"兵部"→兵部上浮到都察院之前');
ok(idxBing < idxHu && idxDu < idxHu, '③异常/相关项排在户部之前');

// ⑦开关组
require(path.join(__dirname, '..', 'tm-office-flags.js'));
var officeFlagOn = global.officeFlagOn;
global.P = {};
ok(officeFlagOn('officePowerPerceptionEnabled') === false, '⑦开关默认关→false(零回归)');
global.P = { conf: { officePowerPerceptionEnabled: true } };
ok(officeFlagOn('officePowerPerceptionEnabled') === true, '⑦独立开关开→true');
global.P = { conf: { officeActivationEnabled: true } };
ok(officeFlagOn('officeDutyStateEnabled') === true, '⑦组闸开→四刀全 on');
global.P = {};

console.log('\n' + (fails === 0 ? 'PASS — ' : 'FAIL — ') + fails + ' 处失败\n');
process.exit(fails === 0 ? 0 : 1);
