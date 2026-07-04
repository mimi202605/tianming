#!/usr/bin/env node
/* eslint-env node */
'use strict';
// ④ 纳谏深化:_wdAdoptCounsel(皇威 benevolence+ / 进言者知遇 / 起居注待办留档 / 防与close双计标记)
//            + _wdDenyAudience 记被拒忠谏(warn)供 endturn 朝堂噤声聚合。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
// 沙箱纪律:qiju 写口须同载(2026-07-04 拆分时暴露的既有欠账·拆前同败已实证)
const src = (fs.readFileSync(path.join(ROOT, 'tm-qiju-ledger.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-wendui-persona-views.js'), 'utf8'));
const applySrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const hwCalls = [];
const loyCalls = [];
const sandbox = {
  console, setTimeout: function () {}, clearTimeout, Promise, Array, Object, String, Number,
  Boolean, RegExp, Date, Math, JSON, parseInt, parseFloat, isFinite,
  GM: { sid: 'smoke', turn: 15, chars: [], wenduiHistory: {}, qijuHistory: [], activeWars: [{ name: '辽役' }] },
  P: { ai: { key: 'k' }, playerInfo: { characterName: '崇祯' } },
  document: { createElement() { return { style: {}, appendChild() {}, textContent: '' }; } },
  window: {},
  findScenarioById: () => null,
  findCharByName(n) { return sandbox.GM.chars.find(c => c.name === n); },
  escHtml(s) { return String(s == null ? '' : s); },
  _$(id) { return null; },
  toast() {},
  addEB() {},
  renderWenduiChars() {},
  adjustCharacterLoyalty(ch, d, reason, opts) { loyCalls.push({ name: ch && ch.name, delta: d, source: opts && opts.source }); if (ch && typeof ch.loyalty === 'number') ch.loyalty = Math.max(0, Math.min(100, ch.loyalty + d)); },
  NpcMemorySystem: { remember() {} },
  AuthorityEngines: { adjustHuangwei(source, delta, reason) { hwCalls.push({ source, delta, reason }); } },
  getTSText: () => 'T15'
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-wendui.js' });

// ── ④A 纳谏 ──
assert(typeof sandbox._wdAdoptCounsel === 'function', '_wdAdoptCounsel must exist');
const adv = { name: '孙承宗', loyalty: 80, ambition: 50, stress: 20, _rapport: 4 };
sandbox.GM.chars.push(adv);
sandbox.GM.wenduiHistory['孙承宗'] = [{ role: 'npc', content: '辽东当以守为战、徐图恢复' }];
sandbox.GM.wenduiTarget = '孙承宗';
sandbox._wdAdoptCounsel();
assert(hwCalls.some(c => c.source === 'benevolence' && c.delta === 1), '①纳谏应皇威 benevolence+1·实得 ' + JSON.stringify(hwCalls));
const adoptLoy = loyCalls.find(c => c.name === '孙承宗' && c.source === 'wendui-counsel-adopted');
assert(adoptLoy && adoptLoy.delta === 2, '①进言者知遇 loyalty+2');
assert(adv._rapport === 7, '①进言者 rapport+3(4→7·实 ' + adv._rapport + ')');
assert(adv._counselAdoptedTurn === 15, '①应设 _counselAdoptedTurn 防与close双计');
assert(Array.isArray(sandbox.GM._adoptedCounsel) && sandbox.GM._adoptedCounsel.length === 1, '①应入 _adoptedCounsel 待办留档');
assert(sandbox.GM._adoptedCounsel[0].counsel.indexOf('辽东') >= 0, '①待办应抓取所纳之谏文本');
assert(sandbox.GM.qijuHistory.length >= 1 && sandbox.GM.qijuHistory[0].content.indexOf('纳谏') >= 0, '①应写起居注');

// ④A 对外藩使节拒绝(走准奏/驳回)
hwCalls.length = 0;
sandbox.GM.chars.push({ name: '虏使', _envoy: true, fromFaction: '后金' });
sandbox.GM.wenduiTarget = '虏使';
sandbox._wdAdoptCounsel();
assert(hwCalls.length === 0, '②对外藩使节不应走纳谏(应用准奏/驳回)');

// ── ④B 拒忠谏记录 ──
assert(typeof sandbox._wdDenyAudience === 'function', '_wdDenyAudience must exist');
sandbox.GM._wdRefusedCounsel = [];
// 两个忠臣(loy>75)逢危兆(activeWars)→ agenda=warn·拒之应记入 _wdRefusedCounsel
sandbox.GM.chars.push({ name: '忠甲', loyalty: 90, ambition: 50, stress: 10 });
sandbox.GM.chars.push({ name: '忠乙', loyalty: 88, ambition: 50, stress: 10 });
sandbox._wdDenyAudience('忠甲');
sandbox._wdDenyAudience('忠乙');
assert(sandbox.GM._wdRefusedCounsel.length === 2, '③拒忠谏(warn)应记入 _wdRefusedCounsel·实得 ' + sandbox.GM._wdRefusedCounsel.length);
assert(sandbox.GM._wdRefusedCounsel.every(r => r.turn === 15), '③记录应带回合戳');

// 非忠谏(routine·低忠无危兆者另说)不记:routine 常臣
sandbox.GM._wdRefusedCounsel = [];
sandbox.GM.activeWars = [];  // 去危兆
sandbox.GM.chars.push({ name: '常臣', loyalty: 65, ambition: 50, stress: 10 });
sandbox._wdDenyAudience('常臣');
assert(sandbox.GM._wdRefusedCounsel.length === 0, '④拒常事求见(非warn)不应记入朝堂噤声账');

// ── ④B endturn 朝堂噤声聚合(source 锁) ──
assert(/_wdRefusedCounsel[\s\S]{0,200}_rcThis\.length >= 2/.test(applySrc), '⑤endturn 应聚合屡拒忠谏(>=2)');
assert(/wendui-counsel-chill/.test(applySrc), '⑤朝堂噤声应经 canonical adjustCharacterLoyalty(source wendui-counsel-chill)');
assert(/_courtSilenced = GM\.turn/.test(applySrc), '⑤应设噤声标记 _courtSilenced');
assert(/loyalty \|\| 50\) < 55\) return/.test(applySrc), '⑤噤声应只伤忠正之臣(loy>=55)');

console.log('[verify-wendui-counsel] PASS ' + passed + ' assertions');
