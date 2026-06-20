/* smoke-office-reform.js — 官制活化 Slice④ 抵抗分引擎 冒烟
 * 跑法：node web/scripts/smoke-office-reform.js
 * 验：增设易过 / 裁权臣难(驳) / 裁忠臣较易 / 弱主顶不动 / 难度缩放 / 合并比裁撤温和 / 空职无抵抗
 */
'use strict';
var path = require('path');
var mod = require(path.join(__dirname, '..', 'tm-office-reform.js'));
var resist = mod.computeReformResistance;

global.findCharByName = function (n) { return (GM.chars || []).find(function (c) { return c.name === n; }) || null; };
global.getRankLevel = function (r) { return ({ '正一品': 1, '正二品': 2, '从二品': 3, '正五品': 9 })[r] || 10; };

var GM = {
  chars: [
    { name: '王某', loyalty: 30 },  // 权臣·异己
    { name: '赵某', loyalty: 80 }   // 忠厚
  ],
  officeTree: [
    { name: '户部', positions: [{ name: '尚书', rank: '正二品', holder: '王某', powers: { taxCollect: true, appointment: true } }] },
    { name: '都察院', positions: [{ name: '左都御史', rank: '正二品', holder: '赵某', powers: { impeach: true, supervise: true } }] },
    { name: '工部', positions: [{ name: '主事', rank: '正五品', holder: '' }] }  // 空职
  ]
};

var fails = 0;
function ok(c, m) { if (!c) { console.log('✗ ' + m); fails++; } else console.log('✓ ' + m); }

// ① 增设新职·无人失权 → 即便弱主也准
var r1 = resist(GM, { reformDetail: '增设', dept: '户部', position: '员外郎' }, { authority: 30 });
console.log('增设:', JSON.stringify(r1));
ok(r1.kind === 'add' && r1.band === '准' && r1.resistance <= 10, '①增设新职→抵抗极低·弱主亦准');

// ② 裁撤掌2权的权臣(忠30·正二品)·中主 → 抵抗高·驳
var r2 = resist(GM, { reformDetail: '裁撤', dept: '户部', position: '尚书' }, { authority: 60 });
console.log('裁权臣:', JSON.stringify(r2));
ok(r2.kind === 'abolishPos' && r2.resistance === 105 && r2.band === '驳', '②裁权臣(base35+高品30+2权20+异己20=105)·中主60→margin45→驳');

// ③ 裁撤忠臣(忠80·正二品·2权) → 抵抗较低
var r3 = resist(GM, { reformDetail: '裁撤', dept: '都察院', position: '左都御史' }, { authority: 60 });
console.log('裁忠臣:', JSON.stringify(r3));
ok(r3.resistance === 75 && r3.band === '部分', '③裁忠臣(base35+30+20−忠10=75)·中主60→margin15→部分');

// ④ 同裁权臣·但强主(皇威90) → 压得住
var r4 = resist(GM, { reformDetail: '裁撤', dept: '户部', position: '尚书' }, { authority: 70 });
ok(r4.band === '拖', '④裁权臣(抵抗105)·主70→margin35→拖(压得住但仍费力)');

// ⑤ 同裁权臣·硬核难度×1.3 → 更难
var r5 = resist(GM, { reformDetail: '裁撤', dept: '户部', position: '尚书' }, { authority: 90, difficulty: 'hardcore' });
console.log('硬核:', JSON.stringify(r5));
ok(r5.resistance === 137 && r5.band === '驳', '⑤硬核×1.3→抵抗137·强主90亦驳');

// ⑥ 裁撤空职 → 无人抵抗
var r6 = resist(GM, { reformDetail: '裁撤', dept: '工部', position: '主事' }, { authority: 60 });
ok(r6.resistance === 35 && r6.affected.length === 0 && r6.band === '准', '⑥裁空职→仅base35·无人抵抗·准');

// ⑦ 合并户部(含权臣) → 比裁撤温和(×0.5 mul)
var r7 = resist(GM, { reformDetail: '合并', dept: '户部', newDept: '度支院' }, { authority: 60 });
console.log('合并:', JSON.stringify(r7));
ok(r7.kind === 'merge' && r7.resistance < r2.resistance, '⑦合并户部→比裁撤温和(职位转移非清退)');

// ── applyReformToTree 结构改树（裁定通过走此落地）──
var applyTree = mod.applyReformToTree;
var g;
global.findCharByName = function (n) { return (g && g.chars || []).find(function (c) { return c.name === n; }) || null; }; // 指向当前测试树
function freshGM() {
  return {
    chars: [{ name: '王某', loyalty: 30, officialTitle: '尚书' }],
    officeTree: [
      { name: '户部', positions: [{ name: '尚书', rank: '正二品', holder: '王某', powers: { taxCollect: true } }] },
      { name: '都察院', positions: [{ name: '左都御史', rank: '正二品', holder: '' }] },
      { name: '工部', positions: [] }
    ]
  };
}
function deptNames(gg) { return gg.officeTree.map(function (d) { return d.name; }); }
function findDept(gg, nm) { var r = null; (function w(ns) { (ns || []).forEach(function (n) { if (n.name === nm) r = n; if (n.subs) w(n.subs); }); })(gg.officeTree); return r; }

g = freshGM(); var a1 = applyTree(g, { reformDetail: '增设', dept: '工部', position: '员外郎' });
ok(a1.applied && findDept(g, '工部').positions.some(function (p) { return p.name === '员外郎'; }), '⑧增设官职→工部新增员外郎');

g = freshGM(); var a2 = applyTree(g, { reformDetail: '增设', dept: '通政司' });
ok(a2.applied && deptNames(g).indexOf('通政司') >= 0, '⑨增设顶层部门→树新增通政司');

g = freshGM(); var a3 = applyTree(g, { reformDetail: '裁撤', dept: '户部', position: '尚书' });
ok(a3.applied && !findDept(g, '户部').positions.some(function (p) { return p.name === '尚书'; }) && g.chars[0].officialTitle === '', '⑩裁撤官职→户部去尚书+王某officialTitle清空');

g = freshGM(); var a4 = applyTree(g, { reformDetail: '裁撤', dept: '都察院' });
ok(a4.applied && deptNames(g).indexOf('都察院') < 0, '⑪裁撤部门→树去都察院');

g = freshGM(); var a5 = applyTree(g, { reformDetail: '改名', dept: '工部', newDept: '营缮司' });
ok(a5.applied && deptNames(g).indexOf('营缮司') >= 0 && deptNames(g).indexOf('工部') < 0, '⑫改名→工部→营缮司');

g = freshGM(); var a6 = applyTree(g, { reformDetail: '合并', dept: '户部', newDept: '都察院' });
ok(a6.applied && deptNames(g).indexOf('户部') < 0 && findDept(g, '都察院').positions.some(function (p) { return p.name === '尚书'; }), '⑬合并→户部并入都察院(尚书转移·户部移除)');

// ── 拟制态 queue + 裁定 pass（两回合·机械护栏）──
var enqueue = mod.enqueuePendingReform, adjudicate = mod.adjudicatePendingReforms;
var ebLog = []; global.addEB = function (cat, msg) { ebLog.push(cat + '|' + msg); };
global.P = { conf: { difficulty: '普通' } };

// 增设新职·低抵抗·强主 → 两回合后准行
g = freshGM(); g.turn = 1; g.huangwei = { index: 80 }; g.huangquan = { index: 70 };
enqueue(g, { action: 'reform', reformDetail: '增设', dept: '工部', position: '都水主事' }, 1);
ok(g._pendingReforms.length === 1 && g._pendingReforms[0].status === '拟制中', '⑭下诏→入拟制态queue(拟制中)');
var rA = adjudicate(g);
ok(g._pendingReforms.length === 1 && rA.length === 0, '⑮同回合不裁(两回合·拟制未满一回合)');
g.turn = 2; var rB = adjudicate(g);
ok(rB.length === 1 && rB[0].band === '准' && findDept(g, '工部').positions.some(function (p) { return p.name === '都水主事'; }) && g._pendingReforms.length === 0, '⑯下回合裁定→增设准行·落树·队列清');

// 裁撤权臣·高抵抗·弱主 → 驳·不落树·伤皇威
g = freshGM(); g.turn = 1; g.huangwei = { index: 45 }; g.huangquan = { index: 40 };
enqueue(g, { action: 'reform', reformDetail: '裁撤', dept: '户部', position: '尚书' }, 1);
g.turn = 2; var hwBefore = g.huangwei.index; ebLog.length = 0; var rC = adjudicate(g);
ok(rC[0].band === '驳' && findDept(g, '户部').positions.some(function (p) { return p.name === '尚书'; }) && g.huangwei.index < hwBefore, '⑰裁权臣·弱主→驳·尚书仍在·皇威受损');
ok(ebLog.some(function (e) { return e.indexOf('改制被驳') >= 0; }), '⑱事件栏记改制被驳');

// ⑲⑳ ④b-2 AI verdict 护栏：AI 可更严·不可更宽（机械是地板·防放水）
g = freshGM(); g.turn = 1; g.huangwei = { index: 80 }; g.huangquan = { index: 75 };
enqueue(g, { action: 'reform', reformDetail: '增设', dept: '工部', position: '都水主事' }, 1);
g.turn = 2;
var rV1 = adjudicate(g, { aiVerdicts: [{ dept: '工部', position: '都水主事', verdict: '驳', reason: '科道交章力阻' }] });
ok(rV1[0].band === '驳' && !findDept(g, '工部').positions.some(function (p) { return p.name === '都水主事'; }), '⑲AI更严：增设(机械准)·AI判驳→驳·不落树(AI可加阻)');

g = freshGM(); g.turn = 1; g.huangwei = { index: 45 }; g.huangquan = { index: 40 };
enqueue(g, { action: 'reform', reformDetail: '裁撤', dept: '户部', position: '尚书' }, 1);
g.turn = 2;
var rV2 = adjudicate(g, { aiVerdicts: [{ dept: '户部', position: '尚书', verdict: '准' }] });
ok(rV2[0].band === '驳' && findDept(g, '户部').positions.some(function (p) { return p.name === '尚书'; }), '⑳机械护栏：裁权臣(机械驳)·AI判准→仍驳·不落树(AI不可放水)');

console.log('\n' + (fails === 0 ? 'PASS' : 'FAIL') + ' — ' + fails + ' 处失败\n');
process.exit(fails === 0 ? 0 : 1);
