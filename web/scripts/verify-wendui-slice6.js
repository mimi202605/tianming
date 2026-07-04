#!/usr/bin/env node
/* eslint-env node */
// 锁定问对完善 sprint·Slice 6:⑦routine 多角度·⑧后妃冷落计数闭合(_lastEmperorVisitTurn)·⑨使节问对留痕。
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = (fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-wendui-persona-views.js'), 'utf8'));

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  passed += 1;
}

const ebLog = [];
const sandbox = {
  console, setTimeout, clearTimeout, Promise, Array, Object, String, Number,
  Boolean, RegExp, Date, Math, JSON, parseInt, parseFloat, isFinite,
  GM: { sid: 'smoke', turn: 20, chars: [], wenduiHistory: {}, _npcCommitments: {}, _wdRewardPunish: [], qijuHistory: [] },
  P: { ai: { key: 'k' }, playerInfo: { characterName: '崇祯' }, traitDefinitions: [] },
  document: { createElement() { return { className: '', innerHTML: '', appendChild() {}, style: {}, children: [] }; }, body: { appendChild() {} } },
  window: {},
  findScenarioById: () => null,
  findCharByName(name) { return sandbox.GM.chars.find(c => c.name === name); },
  escHtml(s) { return String(s == null ? '' : s); },
  _$(id) { return null; },
  callAIMessagesStream: async () => '',
  callAI: async () => '',
  extractJSON(raw) { try { return JSON.parse(raw); } catch (_) { return null; } },
  toast() {},
  addEB(cat, msg) { ebLog.push(cat + '|' + msg); },
  getTSText: () => 'T20',
  NpcMemorySystem: { remember() {} }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-wendui.js' });

// ⑦ routine 多角度(非死板"依礼陈奏")
const ag = sandbox._wdDeriveAudienceAgenda({ name: '常臣', loyalty: 65, ambition: 50, stress: 10 });
assert(ag.tag === 'routine' && ag.seek === false, 'routine 仍 seek=false');
assert(/述职|观望|试探|谢前恩/.test(ag.hint), 'routine hint 应给多个从容角度(述职/观望/试探/谢恩)');

// ⑧ 留宿即帝幸 → 重置 _lastEmperorVisitTurn(闭合冷落计数)
const consort = { name: '田贵妃', spouse: true, loyalty: 80, stress: 30, _lastEmperorVisitTurn: 5 };
sandbox.GM.chars.push(consort);
sandbox.GM._pendingOvernightReq = { name: '田贵妃' };
assert(typeof sandbox._wdAcceptOvernight === 'function', '_wdAcceptOvernight must exist');
sandbox._wdAcceptOvernight();
assert(consort._lastEmperorVisitTurn === 20, '留宿后冷落计数应重置为当前回合(由5→20)');

// ⑧/⑨ source 锁(闭包内 DOM 绑定逻辑·以源断言锁)
assert(/private[\s\S]{0,80}_wdIsPlayerConsort\(_ch\)[\s\S]{0,40}_ch\._lastEmperorVisitTurn = GM\.turn/.test(src),
  '私下召见后妃应重置 _lastEmperorVisitTurn');
assert(/if \(_ch\._envoy\)[\s\S]{0,400}GM\._envoyAudiences\.push/.test(src),
  '使节问对收尾应留结构化记录 GM._envoyAudiences');
assert(/_envoyAudiences[\s\S]{0,300}category: '外交'/.test(src) || /受使[\s\S]{0,80}起居注|【问对·受使】/.test(src),
  '使节问对收尾应写起居注外交留痕');

console.log(`[verify-wendui-slice6] PASS ${passed} assertions`);
