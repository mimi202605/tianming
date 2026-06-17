#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-chaoyi-changchao.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

function makeSandbox() {
  const calls = [];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    GM: {
      turn: 12,
      _edictTracker: [],
      evtLog: []
    },
    CY: {},
    window: null,
    document: {
      getElementById() { return null; },
      createElement() { return { style: {}, classList: { add(){}, remove(){} }, appendChild() {}, remove() {} }; },
      head: { appendChild() {} },
      body: { appendChild() {} }
    },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    addEB(type, text) { sandbox.GM.evtLog.push({ type, text }); },
    getTSText() { return 'T12'; },
    toast() {},
    EdictParser: {
      tryExecute(text, params, ctx) {
        calls.push({ text, params, ctx });
        return {
          ok: true,
          pathway: 'direct',
          classification: { typeKey: /禁伐/.test(text) ? 'environment_policy' : 'currency_reform' }
        };
      },
      EDICT_TYPES: {
        currency_reform: { name: '货币改革' },
        environment_policy: { name: '环境承载' }
      }
    },
    NpcMemorySystem: undefined,
    OpinionSystem: undefined,
    findCharByName() { return null; }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.__calls = calls;
  return sandbox;
}

function run(code, sandbox) {
  return vm.runInContext(code, sandbox);
}

const sandbox = makeSandbox();
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-chaoyi-changchao.js' });

run(`
  _cc3_writeActionToGM(
    'approve',
    { title: '禁私铸钱议', detail: '请严禁民间私铸，搜检私钱作坊。', content: '', dept: '户部', presenter: '毕自严' },
    null,
    '准奏'
  );
`, sandbox);
assert(sandbox.__calls.length === 1, 'approve court decision should execute through EdictParser once');
assert(/禁私铸/.test(sandbox.__calls[0].text), 'approve should send the adopted court text to EdictParser');
assert(sandbox.__calls[0].ctx && sandbox.__calls[0].ctx.source === 'changchao', 'approve execution context should mark changchao source');
assert(sandbox.GM._edictTracker[0]._policyApplyAttempted === true, 'approve tracker should record policy attempt');
assert(sandbox.GM._edictTracker[0]._policyApplied === true, 'approve tracker should record policy success');
assert(sandbox.GM._edictTracker[0].status === 'executed', 'approve tracker should move to executed');

run(`
  _cc3_writeActionToGM(
    'modify',
    { title: '江南山林议', detail: '官员原议不取。', content: '', dept: '工部', presenter: '徐光启' },
    '朕意如此：禁伐江南山林，封山育林。',
    '改批'
  );
`, sandbox);
assert(sandbox.__calls.length === 2, 'modify court decision should execute through EdictParser');
assert(/禁伐江南山林/.test(sandbox.__calls[1].text), 'modify should prefer player extra text');
assert(sandbox.__calls[1].ctx && sandbox.__calls[1].ctx.action === 'modify', 'modify execution context should keep action');

run(`
  _cc3_writeActionToGM(
    'decree',
    { title: '当庭宣旨', detail: '', content: '', dept: '常朝', presenter: '御前' },
    { text: '当庭宣旨：发行纸币一百万贯，准备金三成。', tier: 'A' },
    '当庭口述诏令'
  );
`, sandbox);
assert(sandbox.__calls.length === 3, 'decree court decision should execute through EdictParser');
assert(/发行纸币/.test(sandbox.__calls[2].text), 'decree should send oral edict text');
assert(sandbox.GM._edictTracker[2].decreeMark === 'A', 'decree tracker should keep oral edict tier');

run('_cc3_applyCourtPolicyBridge(GM._edictTracker[2], "decree", { title:"x" }, { text:"重复执行" }, "当庭口述诏令");', sandbox);
assert(sandbox.__calls.length === 3, 'explicit repeat should not execute twice');

assert(Array.isArray(sandbox.GM._chaoyiPolicyActions) && sandbox.GM._chaoyiPolicyActions.length === 3, 'court policy attempts should be journaled');

console.log(`[smoke-chaoyi-policy-bridge] PASS ${passed} assertions`);
