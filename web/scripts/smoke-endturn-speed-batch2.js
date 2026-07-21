#!/usr/bin/env node
// smoke-endturn-speed-batch2.js — 过回合提速批二（2026-07-22）防腐线：
// ① SC1 修复预算帽：增量修补与轻量救援每回合合计只放一次（旧最坏=连吃两段串行时长），
//    P.conf.sc1RepairUncapped===true 恢复不设帽旧行为；
// ② 安卓并发档位：_setAiSubcallConcurrency setter（0=跟随平台默认·clamp 0-4）+
//    设置面板 select + tm-patches 兜底副本；消费端 _runSubcallBatch 尊重玩家显式值不变。
// 批一防腐线在 smoke-endturn-speed-batch1.js·两批互不替代。

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0;
function assert(cond, msg) {
  if (cond) { A++; console.log('  PASS ' + msg); }
  else { F++; console.log('  FAIL ' + msg); }
}

console.log('smoke-endturn-speed-batch2');

// ── ① SC1 修复预算帽（tm-endturn-ai.js 源契约）──
const ai = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');
assert(/var _sc1ExtraPassUsed = false;/.test(ai), '预算帽闩 _sc1ExtraPassUsed 在');
assert(/_sc1ExtraPassUsed = true;\s*\n\s*var _incFilled = await _runIncrementalSc1Retry/.test(ai),
  '增量修补起跑即占用预算（不看成败·防双吃）');
assert(/\(!p1 \|\| !_hasSc1StructuredResult\(p1\)\) && \(!_sc1ExtraPassUsed \|\| \(P\.conf && P\.conf\.sc1RepairUncapped === true\)\)/.test(ai),
  '救援门=未用过预算才放行·sc1RepairUncapped 逃生阀在');
assert(/P\.conf && P\.conf\.aiSubcallConcurrency/.test(ai) && /_confLimit > 0 \? _confLimit/.test(ai),
  '消费端仍尊重玩家显式并发值（>0 覆盖平台默认）');

// ── ② setter 真行为（vm 沙箱跑 tm-player-settings.js 中的函数体）──
const ps = fs.readFileSync(path.join(ROOT, 'tm-player-settings.js'), 'utf8');
const m = ps.match(/function _setAiSubcallConcurrency\(v\) \{[\s\S]*?\n\}/);
assert(!!m, 'setter _setAiSubcallConcurrency 在 tm-player-settings.js');
if (m) {
  const sandbox = { P: { conf: {} }, saved: 0, toasts: [] };
  sandbox.saveP = function () { sandbox.saved++; };
  sandbox.toast = function (t) { sandbox.toasts.push(t); };
  vm.createContext(sandbox);
  vm.runInContext(m[0] + '\nthis._fn = _setAiSubcallConcurrency;', sandbox);
  sandbox._fn('3');
  assert(sandbox.P.conf.aiSubcallConcurrency === 3 && sandbox.saved === 1, 'setter 写 P.conf 并 saveP（档位 3）');
  sandbox._fn('99');
  assert(sandbox.P.conf.aiSubcallConcurrency === 4, '上钳 4（防离谱并发冲爆中转）');
  sandbox._fn('-2');
  assert(sandbox.P.conf.aiSubcallConcurrency === 0, '下钳 0=跟随平台默认');
  sandbox._fn('abc');
  assert(sandbox.P.conf.aiSubcallConcurrency === 0, '非数入参落 0（不写脏值）');
}

// ── ③ 设置面板 UI + 兜底（tm-patches.js 源契约）──
const tp = fs.readFileSync(path.join(ROOT, 'tm-patches.js'), 'utf8');
assert(/window\._setAiSubcallConcurrency = function/.test(tp), 'tm-patches 兜底副本在（防被回滚）');
assert(/_setAiSubcallConcurrency\(this\.value\)/.test(tp), '并发档位 select 接线 setter');
assert(/回合推演并发档位/.test(tp) && /安卓/.test(tp.slice(tp.indexOf('回合推演并发档位'), tp.indexOf('回合推演并发档位') + 400)),
  'UI 文案点明安卓提速语境');
assert(/_togglePConf\('sc1RepairUncapped',this\.checked\)/.test(tp.replace(/\\'/g, "'")),
  'SC1 修复帽逃生阀有设置开关（设 conf 必配开关纪律）');

console.log('smoke-endturn-speed-batch2 ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
