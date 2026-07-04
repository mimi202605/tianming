#!/usr/bin/env node
/* eslint-env node */
// smoke-keju-quota-lever.js — ④·G 名额显式 throttle 杠杆（2026-06-16）实跑断言
//   Part A：抽真 _kejuMobilityFlow → 名额较基线收紧→士人额外受阻(qBlock)·基线懒设·放宽不加阻·无 P 回归安全。
//   Part B：抽真 apply keju_quota_change 消费器 → 改 P.keju.quotaPerExam（value/delta·夹 50-1500）。
'use strict';

const fs = require('fs'), path = require('path'), vm = require('vm');
const WEB = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ ' + m); } }
function r2(n) { return Math.round(Number(n) * 100) / 100; }
function sliceFn(s, marker) { const a = s.indexOf(marker); let j = s.indexOf('{', a), d = 0; for (; j < s.length; j++) { const c = s[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } } return s.slice(a, j); }

const kjSrc = (fs.readFileSync(path.join(WEB, 'tm-keju-runtime.js'), 'utf8') + '\n' + fs.readFileSync(path.join(WEB, 'tm-keju-runtime-keyi.js'), 'utf8'));
const flowSrc = sliceFn(kjSrc, 'function _kejuMobilityFlow(');

console.log('smoke-keju-quota-lever — ④ G 名额显式 throttle 杠杆');

// ── Part A：名额 throttle ──
function runFlow(GM, P, stats) {
  const ctx = { Math: Math, Number: Number, isFinite: isFinite, Object: Object, console: console,
    GM: GM, P: P, addEB: function () {},
    TM: { ClassEngine: { resolvePopulationKeys: function () { return []; } } } };
  vm.createContext(ctx);
  vm.runInContext(flowSrc + '\nthis.go=_kejuMobilityFlow;', ctx);
  ctx.go({}, stats, { length: 20 });
}
function mkGM() { return { classes: [{ name: '士大夫', economicRole: '治理', satisfaction: 40 }] }; }
const healthyRatio = { classRatio: { 寒门: 0.35, 士族: 0.65 } };   // openness 0.35 → shareBlock 0（隔离名额效应）

// 1. 名额收紧（基线 350·当前 200）→ 士人额外受阻（纯名额驱动·寒门通道本宽）
const gmA = mkGM(); const pA = { keju: { quotaPerExam: 200, _quotaBaseline: 350 } };
runFlow(gmA, pA, healthyRatio);
ok((gmA.classes[0]._aspirationBlock || 0) > 0, '★名额收紧(350→200)→士人额外受阻(纯名额·寒门通道宽) (got ' + gmA.classes[0]._aspirationBlock + ')');
ok(gmA.classes[0]._kejuQuota === 200, '透明字段 _kejuQuota=200');

// 2. 名额在基线（无收紧）+ 寒门通道宽 → 不额外受阻（泄压）
const gmB = mkGM(); gmB.classes[0]._aspirationBlock = 0.3; const pB = { keju: { quotaPerExam: 350, _quotaBaseline: 350 } };
runFlow(gmB, pB, healthyRatio);
ok((gmB.classes[0]._aspirationBlock || 0) < 0.3, '名额未收紧+通道宽→泄压(0.3↓) (got ' + gmB.classes[0]._aspirationBlock + ')');

// 3. 基线懒设：首见名额即设基线（初始 change=0·不凭空受阻）
const gmC = mkGM(); const pC = { keju: { quotaPerExam: 350 } };
runFlow(gmC, pC, healthyRatio);
ok(pC.keju._quotaBaseline != null, '基线懒设(首见名额) (got ' + pC.keju._quotaBaseline + ')');

// 4. 无 P/无名额 → qBlock 0（回归安全·既有 G 行为不变）
const gmD = mkGM(); runFlow(gmD, undefined, healthyRatio);
ok(true, '无 P→不抛(qBlock 0·回归安全)');
const gmE = mkGM(); runFlow(gmE, { keju: {} }, healthyRatio);
ok((gmE.classes[0]._aspirationBlock || 0) === 0, '无 quotaPerExam→无名额受阻');

// ── Part B：名额杠杆消费器 ──
const applySrc = fs.readFileSync(path.join(WEB, 'tm-endturn-apply.js'), 'utf8');
const leverLine = applySrc.split(/\r?\n/).filter(function (l) { return /p1\.keju_quota_change && typeof p1\.keju_quota_change/.test(l); })[0];
ok(!!leverLine, '抽到 apply 真 keju_quota_change 消费器行');
function runLever(P, p1) {
  const fn = new Function('p1', 'P', 'addEB', 'Number', 'Math', leverLine);
  fn(p1, P, function () {}, Number, Math);
}
const p1set = { keju: { quotaPerExam: 350 } }; runLever(p1set, { keju_quota_change: { value: 600, reason: '广取士' } });
ok(p1set.keju.quotaPerExam === 600, 'AI keju_quota_change value→改名额 350→600');
const p1del = { keju: { quotaPerExam: 350 } }; runLever(p1del, { keju_quota_change: { delta: -100 } });
ok(p1del.keju.quotaPerExam === 250, 'AI keju_quota_change delta −100→250');
const p1hi = { keju: { quotaPerExam: 350 } }; runLever(p1hi, { keju_quota_change: { value: 5000 } });
ok(p1hi.keju.quotaPerExam === 1500, '名额夹上限 1500 (got ' + p1hi.keju.quotaPerExam + ')');
const p1lo = { keju: { quotaPerExam: 350 } }; runLever(p1lo, { keju_quota_change: { value: 10 } });
ok(p1lo.keju.quotaPerExam === 50, '名额夹下限 50 (got ' + p1lo.keju.quotaPerExam + ')');

// 源契约
ok(/qBlock/.test(kjSrc) && /_quotaBaseline/.test(kjSrc), '源契约·_kejuMobilityFlow 名额 throttle');
ok(/keju_quota_change/.test(fs.readFileSync(path.join(WEB, 'tm-ai-schema.js'), 'utf8')), '源契约·schema 有 keju_quota_change 杠杆');

console.log('\n[smoke-keju-quota-lever] ' + (F ? 'FAIL' : 'PASS') + ' — ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
