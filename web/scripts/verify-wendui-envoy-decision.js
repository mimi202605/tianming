#!/usr/bin/env node
/* eslint-env node */
'use strict';
// ⑨ 使节准奏/驳回/羁縻:_wdEnvoyDecision 按使命类型接外交关系(setFactionRelation)+皇威(纳贡 tribute+/屈辱 humiliation-)·处置回写 close 留痕。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
// 沙箱纪律:qiju 写口须同载(2026-07-04 拆分时暴露的既有欠账·拆前同败已实证)
const src = (fs.readFileSync(path.join(ROOT, 'tm-qiju-ledger.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-wendui-persona-views.js'), 'utf8'));
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const relCalls = [];
const hwCalls = [];
const sandbox = {
  console, setTimeout: function () {}, clearTimeout, Promise, Array, Object, String, Number,
  Boolean, RegExp, Date, Math, JSON, parseInt, parseFloat, isFinite,
  GM: { sid: 'smoke', turn: 8, chars: [], wenduiHistory: {}, playerFactionName: '大明' },
  P: { ai: { key: 'k' }, playerFactionName: '大明', playerInfo: { characterName: '崇祯', factionName: '大明' } },
  document: { createElement() { return { style: {}, appendChild() {}, textContent: '' }; } },
  window: {},
  findScenarioById: () => null,
  findCharByName(n) { return sandbox.GM.chars.find(c => c.name === n); },
  escHtml(s) { return String(s == null ? '' : s); },
  _$(id) { return null; },
  toast() {},
  addEB() {},
  setFactionRelation(from, to, patch, opts) { relCalls.push({ from, to, delta: patch && patch.delta, desc: patch && patch.desc }); },
  AuthorityEngines: { adjustHuangwei(source, delta, reason) { hwCalls.push({ source, delta, reason }); } },
  FiscalEngine: { spendFromGuoku(amounts, tag) { fiscalCalls.push({ amounts: amounts, tag: tag }); return { ok: true }; } }
};
const fiscalCalls = [];
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-wendui.js' });
sandbox.closeWenduiModal = function () {};  // 隔离·避免 setTimeout 真关窗(已被 noop setTimeout 吞)

assert(typeof sandbox._wdEnvoyDecision === 'function', '_wdEnvoyDecision must be defined');

function setEnvoy(itype) {
  relCalls.length = 0; hwCalls.length = 0; fiscalCalls.length = 0;
  sandbox.GM.chars = [{ name: '后金使节', _envoy: true, fromFaction: '后金', interactionType: itype }];
  sandbox.GM.wenduiTarget = '后金使节';
}

// ① 准奏·请和 → 关系大幅改善(+28)
setEnvoy('sue_for_peace');
sandbox._wdEnvoyDecision('accept');
assert(relCalls.length === 1 && relCalls[0].from === '大明' && relCalls[0].to === '后金', '①准奏应调用 setFactionRelation(玩家→使节势力)·实得 ' + JSON.stringify(relCalls));
assert(relCalls[0].delta === 28, '①准请和关系应 +28(实 ' + relCalls[0].delta + ')');

// ② 准奏·纳其朝贡 → 关系+12 且皇威 tribute+4(万国来朝)
setEnvoy('pay_tribute');
sandbox._wdEnvoyDecision('accept');
assert(relCalls[0].delta === 12, '②纳贡关系 +12');
assert(hwCalls.length === 1 && hwCalls[0].source === 'tribute' && hwCalls[0].delta === 4, '②纳其朝贡应皇威 tribute+4·实得 ' + JSON.stringify(hwCalls));

// ③ 准奏·许其索贡(我方纳岁币) → 关系+15 但皇威 diplomaticHumiliation-6(屈己安边)·且扣国库岁币
setEnvoy('demand_tribute');
sandbox._wdEnvoyDecision('accept');
assert(relCalls[0].delta === 15, '③许索贡关系 +15(安抚)');
assert(hwCalls.length === 1 && hwCalls[0].source === 'diplomaticHumiliation' && hwCalls[0].delta === -6, '③许其索贡应皇威屈辱-6·实得 ' + JSON.stringify(hwCalls));
// 岁币按势力 strength 派生(tm-wendui:825·money=str×600·cloth=str×40)·str50→银3万绢2千——旧断言停在退役表值绢3千(2026-07-04 拆分暴露的既有漂移·拆前同败)
assert(fiscalCalls.length === 1 && fiscalCalls[0].amounts.money === 30000 && fiscalCalls[0].amounts.cloth === 2000, '③许其索贡应走 spendFromGuoku 扣国库岁币(银3万绢2千·按strength派生)·实得 ' + JSON.stringify(fiscalCalls));

// ④ 驳回·斥其索贡 → 关系-16·无皇威屈辱(立威不走 humiliation)·不扣国库(没答应给)
setEnvoy('demand_tribute');
sandbox._wdEnvoyDecision('reject');
assert(relCalls[0].delta === -16, '④斥索贡关系 -16(实 ' + relCalls[0].delta + ')');
assert(hwCalls.length === 0, '④驳回不应触发皇威屈辱');
assert(fiscalCalls.length === 0, '④驳回索贡不应扣国库(没答应)');

// ④b 准奏·纳其朝贡(THEY 给我们)→ 不应扣国库(那是收贡不是纳岁币)
setEnvoy('pay_tribute');
sandbox._wdEnvoyDecision('accept');
assert(fiscalCalls.length === 0, '④b 纳其朝贡(收贡)不应扣国库');

// ⑤ 羁縻 → 小损邦交(-4)
setEnvoy('royal_marriage');
sandbox._wdEnvoyDecision('temporize');
assert(relCalls[0].delta === -4, '⑤羁縻应小损邦交 -4');

// ⑥ 处置回写:_wdEnvoyDecision 应在 ch 上留 _pendingEnvoyDisposition 供 close 留痕
setEnvoy('sue_for_peace');
sandbox._wdEnvoyDecision('accept');
assert(sandbox.GM.chars[0]._pendingEnvoyDisposition === 'accept', '⑥应留 _pendingEnvoyDisposition 供 closeWenduiModal 留痕');

// ⑦ 非使节调用应被拒(防误用)
sandbox.GM.chars = [{ name: '本朝臣', loyalty: 60 }];
sandbox.GM.wenduiTarget = '本朝臣';
relCalls.length = 0;
sandbox._wdEnvoyDecision('accept');
assert(relCalls.length === 0, '⑦对非使节调用不应改外交关系');

// ⑧ source 锁:close 留痕带 disposition(读 _pendingEnvoyDisposition)
assert(/_envDisp = _ch\._pendingEnvoyDisposition[\s\S]{0,200}disposition: _envDisp/.test(src), '⑧closeWenduiModal 使节留痕应带 disposition');

console.log('[verify-wendui-envoy-decision] PASS ' + passed + ' assertions');
