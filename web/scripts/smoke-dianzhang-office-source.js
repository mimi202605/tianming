#!/usr/bin/env node
/* eslint-env node */
// smoke-dianzhang-office-source.js — Wave5 slice-2a 官署改制→典章 office 源（2026-07-05）
// 验完整闭环：增设机构→记种子→存续满 MATURE_TURNS→升 office 祖制→改这条祖制(裁撤)触 abolishFriction→
//     真裁撤→清种子+祖制。事件驱动(applyReformToTree 各落地点挂钩)·真模块跑。
'use strict';
const path = require('path');
const WEB = path.join(__dirname, '..');
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  PASS', m); } else { failed++; console.error('  FAIL', m); } }

require(path.join(WEB, 'tm-dianzhang.js'));               // → global.TM.Dianzhang
const OR = require(path.join(WEB, 'tm-office-reform.js')); // computeReformResistance/applyReformToTree
const DZ = global.TM.Dianzhang;
const M = DZ.MATURE_TURNS;
ok(typeof DZ.recordOfficeReform === 'function' && typeof DZ.onInstitutionAbolished === 'function', '典章导出 recordOfficeReform/onInstitutionAbolished');

// 造局：吏部（可增设职位）
function mkGM(turn) {
  return { turn: turn, officeTree: [{ name: '吏部', positions: [{ name: '尚书', holder: '' }], subs: [] }], _dianzhang: { statutes: [], _seq: 0 } };
}
const gm = mkGM(5);

// ① 增设职位 → 典章种子
const addReform = { reformDetail: '增设', dept: '吏部', position: '考功主事' };
const ap = OR.applyReformToTree(gm, addReform);
ok(ap.applied, '① 增设落树');
const seeds = gm._dianzhang._officeSeeds || [];
ok(seeds.length === 1 && seeds[0].source === '吏部/考功主事' && seeds[0].appliedTurn === 5, '② 记 office 种子(源=吏部/考功主事·appliedTurn=5)');
ok(DZ.count(gm) === 0, '③ 尚未成祖制(仅种子)');

// ④ 未历时间考验 → 不升
gm.turn = 5 + M - 1;   // age = M-1 < M
DZ.tick(gm);
ok(DZ.count(gm) === 0 && (gm._dianzhang._officeSeeds || []).length === 1, '④ 存续 ' + (M - 1) + ' 回合(<' + M + ')·不升·种子留');

// ⑤ 存续满 → 升 office 祖制·种子清
gm.turn = 5 + M;       // age = M
DZ.tick(gm);
ok(DZ.has(gm, 'office', '吏部/考功主事'), '⑤ 存续满 ' + M + ' 回合→著 office 祖制');
ok((gm._dianzhang._officeSeeds || []).length === 0, '⑥ 熟成后种子清');

// ⑦ 改这条祖制本身(裁撤该职位) → abolishFriction 触发
const abolishReform = { reformDetail: '裁撤', dept: '吏部', position: '考功主事' };
const r = OR.computeReformResistance(gm, abolishReform, { authority: 50, difficulty: 'standard' });
const wantFriction = DZ.abolishFriction(gm, 'office', '吏部/考功主事');
ok(wantFriction > 0 && r.dianzhangAbolish === wantFriction, '⑦ 裁撤已成祖制→dianzhangAbolish=' + wantFriction + '(成宪难改)');
// 对照：裁撤非祖制职位 → 无成宪阻力
const r2 = OR.computeReformResistance(gm, { reformDetail: '裁撤', dept: '吏部', position: '尚书' }, { authority: 50, difficulty: 'standard' });
ok(r2.dianzhangAbolish === 0, '⑧ 裁撤非祖制职位→dianzhangAbolish=0(对照)');
ok(r.resistance > r2.resistance, '⑨ 成宪之制改制阻力更高(' + r2.resistance + '→' + r.resistance + ')');
// 增设(add)不触成宪阻力
const r3 = OR.computeReformResistance(gm, { reformDetail: '增设', dept: '吏部', position: '新职' }, { authority: 50, difficulty: 'standard' });
ok(r3.dianzhangAbolish === 0, '⑩ 增设新机构不触成宪阻力(kind=add 门)');

// ⑪ 真裁撤该祖制 → 清祖制(成宪被推翻则消亡)
const ab = OR.applyReformToTree(gm, abolishReform);
ok(ab.applied, '⑪ 裁撤落树');
ok(!DZ.has(gm, 'office', '吏部/考功主事'), '⑫ 祖制随机构裁撤而消亡(成宪不再据以设阻)');
const r4 = OR.computeReformResistance(gm, { reformDetail: '改名', dept: '吏部', newDept: '天官' }, { authority: 50, difficulty: 'standard' });
ok(r4.dianzhangAbolish === 0, '⑬ 祖制已消·改制无成宪阻力');

// ═══ ③科举范式承袭源（slice-2b·纯读 GM._kejuParadigm.history·零改 keju）═══
function mkKejuGM(turn, status) {
  return {
    turn: turn,
    _dianzhang: { statutes: [], _seq: 0 },
    _kejuParadigm: { history: [
      { id: 'reform_1626_0', applied: true, status: status || 'ramping', turn: 5, paradigmDigest: '糊名誊录·防弊', reason: '防科场之弊' },
      { id: 'reform_x_rej', applied: false, status: 'rejected', turn: 5, paradigmDigest: '被驳之议' }  // 未 applied → 永不成祖制
    ] }
  };
}
const kg = mkKejuGM(5 + M - 1, 'ramping');
DZ.tick(kg);
ok(DZ.count(kg) === 0, '⑭ 科举改制存续未满→不成祖制');
kg.turn = 5 + M;   // age = M
DZ.tick(kg);
ok(DZ.has(kg, 'keju', 'keju:reform_1626_0'), '⑮ 科举改制存续满→著「科举成宪」祖制');
ok(!DZ.has(kg, 'keju', 'keju:reform_x_rej'), '⑯ 未 applied/驳回之议→永不成祖制');
const kjSt = DZ.list(kg).filter(function (s) { return s.kind === 'keju'; })[0];
ok(kjSt && kjSt.name.indexOf('糊名') >= 0, '⑰ 祖制名取 paradigmDigest');
// 回滚 → 祖制消亡
kg._kejuParadigm.history[0].status = 'rolled_back';
kg.turn = 5 + M + 3;
DZ.tick(kg);
ok(!DZ.has(kg, 'keju', 'keju:reform_1626_0'), '⑱ 科举改制回滚→祖制消亡（成宪不再）');

// ═══ 三源合流 → count 喂 count-based 红利/僵化 ═══
const mixed = { turn: 100, _dianzhang: { statutes: [
  { id: 'a', kind: 'policy', name: '国策1', source: 'r1', enactedTurn: 1, maturedTurn: 20 },
  { id: 'b', kind: 'office', name: '衙门1', source: 'd1', enactedTurn: 1, maturedTurn: 20 },
  { id: 'c', kind: 'keju', name: '科举成宪1', source: 'keju:k1', enactedTurn: 1, maturedTurn: 20 }
], _seq: 3 } };
ok(DZ.count(mixed) === 3 && DZ.legitimacyBonus(mixed) === Math.min(15, Math.round(3 * 1.5)), '⑲ 三源合流入 count→喂 legitimacyBonus');

console.log('\nsmoke-dianzhang-office-source: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
