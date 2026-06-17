#!/usr/bin/env node
/* eslint-env node */
// smoke-class-radical-fraction.js — 乱民层（B·2026-06-16）实跑断言
// 验：_radicalFrac 由「低满意度 + 急性恶化(本回合骤跌) + 政治边缘化(未得偿高急议程)」推高，
//     快激进/慢平复（升米恩斗米仇政治版）；首回合播种；夹[0,1]；经 tick 集成。
'use strict';

const path = require('path');
const WEB = path.join(__dirname, '..');
require(path.join(WEB, 'tm-field-pipelines.js'));
require(path.join(WEB, 'tm-engine-constants.js'));
require(path.join(WEB, 'tm-class-engine.js'));
const SF = require(path.join(WEB, 'tm-social-foundation.js'));

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('  PASS', msg); }
  else { failed += 1; console.error('  FAIL', msg); }
}
function mkCls(o) { return Object.assign({ name: '自耕农', economicRole: '生产' }, o); }

// ── 1. 安康均衡阶层（高满意·稳）→ 乱民慢平复（≤0.04/回合）──
const c1 = mkCls({ satisfaction: 70, _structBaseline: 68, _lastDrift: -0.2, _radicalFrac: 0.3 });
SF.tickClassRadical({}, c1, {}, 5);
ok(c1._radicalFrac < 0.3 && c1._radicalFrac >= 0.255, '安康·乱民慢平复 ≤0.04/回合 (got ' + c1._radicalFrac + ')');

// ── 2. 危局阶层（低满意+骤跌+高急议程）→ 乱民快升（≤0.12/回合）──
const c2 = mkCls({ satisfaction: 18, _structBaseline: 14, _lastDrift: -1.5, _radicalFrac: 0.1,
  _agenda: { items: [{ kind: 'struct', urgency: 3 }, { kind: 'struct', urgency: 3 }] } });
SF.tickClassRadical({}, c2, {}, 5);
ok(c2._radicalFrac > 0.1 && c2._radicalFrac <= 0.221, '危局·乱民快升 ≤0.12/回合 (got ' + c2._radicalFrac + ')');

// ── 3. 不对称：激进步长 > 平复步长 ──
const cR = mkCls({ satisfaction: 15, _structBaseline: 12, _lastDrift: -1.5, _radicalFrac: 0.2,
  _agenda: { items: [{ kind: 'struct', urgency: 3 }] } });
const bR = cR._radicalFrac; SF.tickClassRadical({}, cR, {}, 5); const upStep = cR._radicalFrac - bR;
const cF = mkCls({ satisfaction: 80, _structBaseline: 80, _lastDrift: 0, _radicalFrac: 0.6 });
const bF = cF._radicalFrac; SF.tickClassRadical({}, cF, {}, 5); const downStep = bF - cF._radicalFrac;
ok(upStep > 0 && downStep > 0 && upStep > downStep + 0.03,
  '不对称·激进快(' + upStep.toFixed(2) + ') > 平复慢(' + downStep.toFixed(2) + ')');

// ── 4. 急性恶化：中等满意但本回合骤跌 → 乱民起（change-matters）──
const c4 = mkCls({ satisfaction: 55, _structBaseline: 40, _lastDrift: -1.9, _radicalFrac: 0 });
SF.tickClassRadical({}, c4, {}, 5);
ok(c4._radicalFrac > 0, '急性恶化·中等满意但骤跌→乱民起 (got ' + c4._radicalFrac + ')');
// 对照：同满意度但未骤跌（drift≈0）→ 不被急性项推
const c4b = mkCls({ satisfaction: 55, _structBaseline: 55, _lastDrift: 0, _radicalFrac: 0 });
SF.tickClassRadical({}, c4b, {}, 5);
ok(c4b._radicalFrac < c4._radicalFrac, '急性恶化·骤跌者(' + c4._radicalFrac + ')高于平稳者(' + c4b._radicalFrac + ')');

// ── 5. 首回合播种：苦难阶层（无 _radicalFrac）首算非 0 ──
const c5 = mkCls({ satisfaction: 10, _structBaseline: 10, _lastDrift: 0 });
SF.tickClassRadical({}, c5, {}, 5);
ok(c5._radicalFrac > 0, '播种·苦难阶层首算非0 (got ' + c5._radicalFrac + ')');
// 安康阶层首算应≈0
const c5b = mkCls({ satisfaction: 72, _structBaseline: 72, _lastDrift: 0 });
SF.tickClassRadical({}, c5b, {}, 5);
ok(c5b._radicalFrac < 0.05, '播种·安康阶层首算≈0 (got ' + c5b._radicalFrac + ')');

// ── 6. 边界夹 [0,1] ──
const c6 = mkCls({ satisfaction: 0, _structBaseline: 0, _lastDrift: -3, _radicalFrac: 0.95,
  _agenda: { items: [{ kind: 'struct', urgency: 3 }, { kind: 'struct', urgency: 3 }, { kind: 'struct', urgency: 3 }] } });
SF.tickClassRadical({}, c6, {}, 5);
ok(c6._radicalFrac <= 1 && c6._radicalFrac >= 0, '边界·夹在[0,1] (got ' + c6._radicalFrac + ')');

// ── 7. AI 议程槽不计政治边缘化 ──
const c7a = mkCls({ satisfaction: 40, _structBaseline: 40, _lastDrift: 0, _radicalFrac: 0,
  _agenda: { items: [{ kind: 'ai', urgency: 3 }] } });
const c7b = mkCls({ satisfaction: 40, _structBaseline: 40, _lastDrift: 0, _radicalFrac: 0,
  _agenda: { items: [{ kind: 'struct', urgency: 3 }] } });
SF.tickClassRadical({}, c7a, {}, 5); SF.tickClassRadical({}, c7b, {}, 5);
// 比未夹步长的 _radicalPressure（_radicalFrac 会被 0.12/回合步长上限掩盖差异）
ok(c7a._radicalPressure < c7b._radicalPressure, 'AI槽不计政治边缘化·struct急议压力(' + c7b._radicalPressure + ')>AI槽(' + c7a._radicalPressure + ')');

// ── 8. 集成：经 SF.tick 危局阶层落 _radicalFrac/_radicalPressure ──
function mkWorld(opts) {
  opts = opts || {};
  const leaves = [];
  for (let i = 0; i < 10; i++) {
    leaves.push({
      name: '县' + i, taxRate: opts.taxRate != null ? opts.taxRate : 1,
      minxin: opts.minxin != null ? opts.minxin : 55,
      statusEffects: (opts.disasterLeaves || 0) > i ? [{ kind: 'disaster', name: '旱蝗' }] : [],
      warZone: false
    });
  }
  const GM = { turn: opts.turn != null ? opts.turn : 10, classes: opts.classes || [], armies: [] };
  const P = { adminHierarchy: { player: { divisions: [{ name: '某省', children: leaves }] } } };
  return { GM, P };
}
const clsI = { name: '自耕农', economicRole: '生产', satisfaction: 20, influence: 20 };
const wI = mkWorld({ taxRate: 1.4, disasterLeaves: 4, minxin: 30, classes: [clsI], turn: 50 });
const outI = SF.tick(wI.GM, wI.P);
ok(typeof clsI._radicalFrac === 'number' && clsI._radicalFrac > 0, '集成·tick 后危局阶层 _radicalFrac>0 (got ' + clsI._radicalFrac + ')');
ok(typeof clsI._radicalPressure === 'number', '集成·_radicalPressure 挂账供 UI/prompt (got ' + clsI._radicalPressure + ')');
ok(typeof outI.radical === 'number', '集成·tick 汇总含 radical 计数 (got ' + outI.radical + ')');

// ── 9. 墙头草/士绅离心：皇威低 → 高clout阶层激进加速（>低clout）；无皇威则无 ──
const govLow = mkCls({ name: '勋贵', economicRole: '治理', satisfaction: 60, _structBaseline: 60, _lastDrift: 0, _radicalFrac: 0.2 });
SF.tickClassRadical({ huangwei: { index: 10 } }, govLow, {}, 5);
const govHigh = mkCls({ name: '勋贵', economicRole: '治理', satisfaction: 60, _structBaseline: 60, _lastDrift: 0, _radicalFrac: 0.2 });
SF.tickClassRadical({ huangwei: { index: 80 } }, govHigh, {}, 5);
ok(govLow._radicalPressure > govHigh._radicalPressure + 0.1, '墙头草·皇威低(10)权贵压力(' + govLow._radicalPressure + ')≫皇威高(80)(' + govHigh._radicalPressure + ')');
const farmerLow = mkCls({ name: '自耕农', economicRole: '生产', satisfaction: 60, _structBaseline: 60, _lastDrift: 0, _radicalFrac: 0.2 });
SF.tickClassRadical({ huangwei: { index: 10 } }, farmerLow, {}, 5);
ok(govLow._radicalPressure > farmerLow._radicalPressure, '墙头草·权贵(治理clout高)离心(' + govLow._radicalPressure + ') > 农(clout低)(' + farmerLow._radicalPressure + ')');
const govNone = mkCls({ name: '勋贵', economicRole: '治理', satisfaction: 60, _structBaseline: 60, _lastDrift: 0, _radicalFrac: 0.2 });
SF.tickClassRadical({}, govNone, {}, 5);
ok(Math.abs(govNone._radicalPressure - govHigh._radicalPressure) < 0.001, '无皇威→无墙头草(=皇威高·回归安全)');

console.log('\n[smoke-class-radical-fraction] ' + (failed ? 'FAIL' : 'PASS') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
