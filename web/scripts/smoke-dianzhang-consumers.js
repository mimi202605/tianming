#!/usr/bin/env node
/* eslint-env node */
// smoke-dianzhang-consumers.js — Wave5 slice-3 双刃数值消费端接线（2026-07-05）
// 验：典章红利接 computeLegitimacy(合法性↑) + 典章副作用接 computeReformResistance(改制阻力↑·王朝越僵)。
//     加载真模块·对比「有典章 vs 无典章」，坐实数值真流到消费端（非空接线）。
'use strict';
const path = require('path');
const WEB = path.join(__dirname, '..');
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  PASS', m); } else { failed++; console.error('  FAIL', m); } }

// 真模块加载（顺序无所谓·消费端运行时才查 global.TM.Dianzhang）
require(path.join(WEB, 'tm-engine-constants.js'));
require(path.join(WEB, 'tm-class-engine.js'));
require(path.join(WEB, 'tm-dianzhang.js'));                 // → global.TM.Dianzhang
const SF = require(path.join(WEB, 'tm-social-foundation.js'));
const OR = require(path.join(WEB, 'tm-office-reform.js'));
const DZ = global.TM.Dianzhang;
ok(DZ && typeof DZ.legitimacyBonus === 'function' && typeof DZ.rigidityFriction === 'function', '典章模块 legitimacyBonus/rigidityFriction 导出');

// 造局：n 条祖制（policy·已成宪）+ 阶层 + 民心（供 computeLegitimacy 运行）
function mkGM(n) {
  const gm = {
    turn: 20,
    classes: [
      { name: '勋贵', economicRole: '治理', influence: 40, satisfaction: 40 },
      { name: '自耕农', economicRole: '生产', influence: 10, satisfaction: 40 }
    ],
    minxin: { trueIndex: 55 },
    _dianzhang: { statutes: [], _seq: 0 }
  };
  for (let i = 0; i < n; i++) gm._dianzhang.statutes.push({ id: 'dz' + i, kind: 'policy', name: '祖制' + i, source: 'r' + i, enactedTurn: 1, maturedTurn: 5 });
  return gm;
}

// ═══ 消费端①：典章红利 → computeLegitimacy（合法性 clout↑·缙绅离心收窄）═══
const g0 = mkGM(0), g5 = mkGM(5);
const leg0 = SF.computeLegitimacy(g0);
const leg5 = SF.computeLegitimacy(g5);
ok(leg0 && leg5, 'computeLegitimacy 双局产出');
ok(leg0.dianzhangBonus === 0, '① 无典章·dianzhangBonus=0');
const wantBonus = DZ.legitimacyBonus(g5);
ok(wantBonus > 0 && leg5.dianzhangBonus === wantBonus, '② 有典章·bonus 接入=' + wantBonus + '（round(5×1.5)=8）');
ok(leg5.clout > leg0.clout, '③ 典章抬合法性 clout（' + leg0.clout + '→' + leg5.clout + '）');
ok(leg5.clout - leg0.clout === wantBonus || Math.abs((leg5.clout - leg0.clout) - wantBonus) < 0.01, '④ clout 增量==bonus（数值真流入）');
ok(leg5.divergence > leg0.divergence, '⑤ clout 抬升→divergence 上移（缙绅离心缓解方向）');

// ═══ 消费端②：典章副作用 → computeReformResistance（改制阻力↑·王朝越僵）═══
const reform = { dept: '某部', position: '尚书', reformDetail: '改名' };  // rename·不触发被夺权者遍历(无需 officeTree)
const r0 = OR.computeReformResistance(mkGM(0), reform, { authority: 50, difficulty: 'standard' });
const r5 = OR.computeReformResistance(mkGM(5), reform, { authority: 50, difficulty: 'standard' });
ok(r0 && r5, 'computeReformResistance 双局产出');
ok(r0.dianzhangRigidity === 0, '⑥ 无典章·dianzhangRigidity=0');
const wantRigid = DZ.rigidityFriction(mkGM(5));
ok(wantRigid > 0 && r5.dianzhangRigidity === wantRigid, '⑦ 有典章·rigidity 接入=' + wantRigid + '（min(20,round(5×1.2))=6）');
ok(r5.resistance > r0.resistance, '⑧ 典章抬改制阻力（' + r0.resistance + '→' + r5.resistance + '·王朝越僵）');

// ═══ 封顶安全（防堆料失衡）═══
const gMany = mkGM(50);
ok(DZ.legitimacyBonus(gMany) === 15, '⑨ legitimacyBonus 封顶 +15');
ok(DZ.rigidityFriction(gMany) === 20, '⑩ rigidityFriction 封顶 +20');

console.log('\nsmoke-dianzhang-consumers: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
