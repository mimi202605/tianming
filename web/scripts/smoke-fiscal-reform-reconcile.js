#!/usr/bin/env node
/* eslint-env node */
'use strict';
// P-VWF 财政改革对账层回归测试·2026-05-29
// 锁 ① extractEdictFiscalReforms 对玩家诏书的确定性识别（质·有没有）
//    ② FiscalEngine.adjustPlayerCompliance 真升 cascade 读的 div.fiscal.compliance
//       （"必生效"·实证会动·非"分析完面板纹丝不动"）

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

// ── Part A·识别（单文件 tm-endturn-edict.js）──
(function () {
  const sandbox = {
    console, RegExp, Array, Object, String, Number, Boolean, JSON, Math,
    GM: { turn: 4, _capital: '京师', chars: [] },
    uid: () => 'x', _dbg: () => {}, addEB: () => {}, recordPlayerDecision: () => {},
    clamp: (v) => v, findCharByName: () => null
  };
  sandbox.window = sandbox; sandbox.P = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), sandbox, { filename: 'tm-endturn-edict.js' });
  const f = sandbox.extractEdictFiscalReforms;
  assert(typeof f === 'function', 'extractEdictFiscalReforms 已导出');
  assert(f('严惩贪墨，追赃问罪。').some(r => r.type === 'anticorruption'), 'A①肃贪→anticorruption');
  assert(f('着户部清丈天下田亩，核实隐占。').some(r => r.type === 'landsurvey'), 'A②清丈→landsurvey');
  assert(f('改盐法，行纲盐。').some(r => r.type === 'saltreform'), 'A③盐法→saltreform');
  assert(f('弛海禁，开市舶通商。').some(r => r.type === 'openmaritime'), 'A④开海→openmaritime');
  assert(f('劝课农桑，奖励垦荒。').some(r => r.type === 'encouragefarming'), 'A⑤劝农→encouragefarming');
  assert(f('召徐光启延朝。').length === 0, 'A⑥无财政改革不误抓');
  assert(f('严惩贪墨，肃贪追赃。').filter(r => r.type === 'anticorruption').length === 1, 'A⑦同类去重');
})();

// ── Part B·拨开关真生效（load tm-fiscal-engine.js·验 compliance 真升 + 护栏）──
(function () {
  const sandbox = {
    console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
    setTimeout: () => {}, clearTimeout: () => {},
    addEB: () => {}, toast: () => {}, _dbg: () => {}
  };
  sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
  sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
  sandbox.GM = {
    turn: 28,
    adminHierarchy: {
      '明廷': { divisions: [
        { id: 'shaanxi', name: '陕西', fiscal: { compliance: 0.80 } },
        { id: 'henan', name: '河南', fiscal: { compliance: 0.85 } }
      ] }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-fiscal-engine.js'), 'utf8'), sandbox, { filename: 'tm-fiscal-engine.js' });
  const FE = sandbox.FiscalEngine;
  assert(FE && typeof FE.adjustPlayerCompliance === 'function', 'B·FiscalEngine.adjustPlayerCompliance 已导出');
  const divs = sandbox.GM.adminHierarchy['明廷'].divisions;
  const n = FE.adjustPlayerCompliance('明廷', 0.05, 0.1, 1);
  assert(n === 2, 'B①遍历到 2 个本势力 division·实得 ' + n);
  assert(Math.abs(divs[0].fiscal.compliance - 0.85) < 1e-9, 'B②陕西 compliance 0.80→0.85（真升·必生效）·实得 ' + divs[0].fiscal.compliance);
  assert(Math.abs(divs[1].fiscal.compliance - 0.90) < 1e-9, 'B③河南 compliance 0.85→0.90·实得 ' + divs[1].fiscal.compliance);
  FE.adjustPlayerCompliance('明廷', 0.5, 0.1, 1);
  assert(divs[1].fiscal.compliance === 1, 'B④护栏封顶 1·不越界·实得 ' + divs[1].fiscal.compliance);
})();

console.log('[smoke-fiscal-reform-reconcile] PASS assertions=' + passed);
