#!/usr/bin/env node
/* eslint-env node */
// 锁定主动求见 agenda 单一源(_wdDeriveAudienceAgenda 的 tag/seek)。
// 服务问对完善 sprint·地基刀:【有臣求见】筛选器与召见 agenda 同源。
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

const sandbox = {
  console, setTimeout, clearTimeout, Promise, Array, Object, String, Number,
  Boolean, RegExp, Date, Math, JSON, parseInt, parseFloat, isFinite,
  GM: { sid: 'smoke', turn: 10, chars: [], wenduiHistory: {}, _npcCommitments: {}, _wdRewardPunish: [] },
  P: { ai: { key: 'k' }, playerInfo: { characterName: '天子' }, traitDefinitions: [] },
  document: { createElement() { return { className: '', innerHTML: '', appendChild() {}, style: {}, children: [] }; } },
  window: {},
  findScenarioById: () => null,
  findCharByName(name) { return sandbox.GM.chars.find(c => c.name === name); },
  escHtml(s) { return String(s == null ? '' : s); },
  _$(id) { return null; },
  callAIMessagesStream: async () => '',
  extractJSON(raw) { try { return JSON.parse(raw); } catch (_) { return null; } },
  toast() {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-wendui.js' });

const agenda = sandbox._wdDeriveAudienceAgenda;
assert(typeof agenda === 'function', '_wdDeriveAudienceAgenda must be exported to window');

// 工具:重置 GM 旁路状态
function reset() {
  sandbox.GM.turn = 10;
  sandbox.GM._npcCommitments = {};
  sandbox.GM._wdRewardPunish = [];
  sandbox.GM.activeWars = [];
  sandbox.GM.unrest = 0;
  sandbox.GM.memorials = [];
  sandbox.GM._tyrantDecadence = 0;
}

// ① 逾期承诺 → commitment·seek=true·overdue=true
reset();
sandbox.GM._npcCommitments['甲'] = [{ task: '抚定流民', status: 'executing', assignedTurn: 1, deadline: 3 }];
let a = agenda({ name: '甲', loyalty: 70, ambition: 50, stress: 10 });
assert(a.tag === 'commitment', '逾期承诺应判 commitment');
assert(a.seek === true && a.overdue === true, '逾期承诺 seek/overdue 应为 true');

// ① 未逾期承诺 → commitment·seek=false(不主动涌入·待召见或回合末复命)
reset();
sandbox.GM._npcCommitments['乙'] = [{ task: '查盐课', status: 'pending', assignedTurn: 9, deadline: 3 }];
let b = agenda({ name: '乙', loyalty: 70, ambition: 50, stress: 10 });
assert(b.tag === 'commitment' && b.seek === false, '未逾期承诺不应主动求见');

// ② 近受赏 → thank·seek=true
reset();
sandbox.GM._wdRewardPunish = [{ target: '丙', type: 'reward', turn: 9 }];
let c = agenda({ name: '丙', loyalty: 70, ambition: 50, stress: 10 });
assert(c.tag === 'thank' && c.seek === true, '近受赏应 thank 且主动入谢');

// ② 近受罚 → grieve·seek=true
reset();
sandbox.GM._wdRewardPunish = [{ target: '丁', type: 'punish', turn: 9 }];
let d = agenda({ name: '丁', loyalty: 70, ambition: 50, stress: 10 });
assert(d.tag === 'grieve' && d.seek === true, '近受罚应 grieve 且主动来');

// ③ 深度离心(loy<30) → grievance·seek=true
reset();
let e = agenda({ name: '戊', loyalty: 25, ambition: 50, stress: 10 });
assert(e.tag === 'grievance' && e.seek === true, '深度离心应主动求见');

// ③ 浅离心(30<=loy<35)且低压 → grievance·seek=false(不洪泛)
reset();
let f = agenda({ name: '己', loyalty: 32, ambition: 50, stress: 10 });
assert(f.tag === 'grievance' && f.seek === false, '浅离心低压不应洪泛求见');

// ③+⑥重叠回归:浅离心(loy 32)但高压(str>60) → 仍应 seek(补回旧 burden 行为·防短路屏蔽)
reset();
let g = agenda({ name: '庚', loyalty: 32, ambition: 50, stress: 70 });
assert(g.tag === 'grievance' && g.seek === true, '浅离心+高压应仍主动求见(防优先级短路丢 burden)');

// ④ 高忠高压 → warn·seek=true
reset();
let h = agenda({ name: '辛', loyalty: 95, ambition: 50, stress: 40 });
assert(h.tag === 'warn' && h.seek === true, '忠耿高压应犯颜进谏主动求见');

// ⑤ 高野心 → ambition·seek=true
reset();
let i = agenda({ name: '壬', loyalty: 70, ambition: 85, stress: 10 });
assert(i.tag === 'ambition' && i.seek === true, '高野心应游说主动求见');

// ⑥ 高压 → burden·seek=true
reset();
let j = agenda({ name: '癸', loyalty: 70, ambition: 50, stress: 70 });
assert(j.tag === 'burden' && j.seek === true, '高压应诉难主动求见');

// ④ 危兆驱动:忠臣(loy 80<90)逢真危兆 → warn·seek=true·brief/hint 锚定真危兆
reset();
sandbox.GM.activeWars = [{ name: '辽东之役' }];
let m = agenda({ name: '熊廷弼', loyalty: 80, ambition: 50, stress: 10 });
assert(m.tag === 'warn' && m.seek === true, '忠臣(loy80)逢真危兆应进谏(放宽至 loy>75)');
assert(/边事未宁/.test(m.brief) || /边事未宁/.test(m.hint), 'warn 应锚定真实危兆(边事未宁)');

// ④ 无危兆:忠臣(loy 80)且低压 → 不应误判 warn(落 routine)
reset();
let n = agenda({ name: '某臣', loyalty: 80, ambition: 50, stress: 10 });
assert(n.tag !== 'warn', '无危兆且非极忠高压不应进谏');

// ⑦ 常事 → routine·seek=false
reset();
let k = agenda({ name: '子', loyalty: 70, ambition: 50, stress: 10 });
assert(k.tag === 'routine' && k.seek === false, '常态不应主动求见(避免百官全涌入)');

// 筛选器源头一致性:render 路径必须读 _sa.seek(而非旧硬编码 str>60 子集)
assert(/_wdDeriveAudienceAgenda\(c\)[\s\S]{0,80}_sa\.seek/.test(src), '【有臣求见】筛选器须接 agenda.seek');

console.log(`[verify-audience-seek] PASS ${passed} assertions`);
