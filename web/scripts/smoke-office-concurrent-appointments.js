#!/usr/bin/env node
// smoke-office-concurrent-appointments.js - guard one character holding multiple offices.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  assertions += 1;
}

function fakeEl() {
  return { value: '', style: {}, innerHTML: '', textContent: '', appendChild(){}, remove(){}, querySelector(){ return null; } };
}

const context = {
  console,
  Date,
  JSON,
  Math,
  RegExp,
  Array,
  Object,
  String,
  Number,
  Boolean,
  parseInt,
  parseFloat,
  isFinite,
  isNaN,
  setTimeout(){},
  clearTimeout(){},
  document: {
    getElementById: () => fakeEl(),
    querySelectorAll: () => [],
    createElement: () => fakeEl(),
    body: fakeEl(),
    addEventListener(){}
  },
  window: null,
  P: { playerInfo: { characterName: '皇帝' } },
  scriptData: {},
  GM: {
    turn: 12,
    officeTree: [],
    chars: [],
    evtLog: [],
    _turnReport: [],
    _chronicle: [],
    qijuHistory: []
  },
  SettlementPipeline: { register(){} },
  TM: { errors: { capture(){}, captureSilent(){} } },
  autoSave(){},
  showToast(){},
  alert(){},
  escHtml(v) { return String(v == null ? '' : v); },
  toast(){},
  _dbg(){},
  addEB(){},
  recordCharacterArc(){},
  _isSameLocation(a, b) { return a === b; },
  getTSText(turn) { return 'T' + turn; },
  findCharByName() { return null; }
};
context.window = context;
context.globalThis = context;
context.addEB = function(type, text) { context.GM.evtLog.push({ type, text }); };
context.findCharByName = function(name) {
  return (context.GM.chars || []).find(ch => ch && ch.name === name) || null;
};

vm.createContext(context);

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

load('tm-office-system.js');
load('tm-ai-change-pathutils.js'); load('tm-ai-change-army.js'); load('tm-ai-change-narrative.js'); load('tm-ai-change-applier.js');
load('tm-endturn-edict.js');

function resetState() {
  context.GM.turn = 12;
  context.GM.evtLog = [];
  context.GM._turnReport = [];
  context.GM._chronicle = [];
  context.GM.qijuHistory = [];
  context.GM.chars = [
    { name: '兼官者', officialTitle: '侍郎', position: '侍郎', alive: true, location: '京师' },
    { name: '前任尚书', officialTitle: '尚书', position: '尚书', alive: true, location: '京师' },
    { name: '调任者', officialTitle: '给事中', position: '给事中', alive: true, location: '京师' }
  ];
  context.GM.officeTree = [
    { name: '吏部', positions: [
      { name: '尚书', holder: '前任尚书', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '前任尚书', generated: true }] },
      { name: '侍郎', holder: '兼官者', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '兼官者', generated: true }] },
      { name: '给事中', holder: '调任者', establishedCount: 1, vacancyCount: 0, actualHolders: [{ name: '调任者', generated: true }] }
    ], subs: [] }
  ];
}

resetState();
let parsed = context.extractEdictActions('命兼官者以侍郎加兼尚书。');
assert(parsed.appointments.length === 1, 'edict parser should find concurrent appointment');
assert(parsed.appointments[0].concurrent === true, 'edict parser should mark 加兼 as concurrent');
context.applyEdictActions(parsed);

let shangshu = context.GM.officeTree[0].positions[0];
let shilang = context.GM.officeTree[0].positions[1];
let concurrentChar = context.findCharByName('兼官者');
assert(shangshu.holder === '兼官者', 'concurrent edict should seat character in new office');
assert(shilang.holder === '兼官者', 'concurrent edict should keep original office holder');
assert(concurrentChar.officialTitle === '侍郎', 'concurrent edict should keep original title as primary');
assert(Array.isArray(concurrentChar.concurrentTitles) && concurrentChar.concurrentTitles.indexOf('尚书') >= 0, 'concurrent edict should record new office as concurrent title');
assert(Array.isArray(concurrentChar.officialTitles) && concurrentChar.officialTitles.indexOf('侍郎') >= 0 && concurrentChar.officialTitles.indexOf('尚书') >= 0, 'concurrent edict should expose all offices');

resetState();
let normal = context.onAppointment('调任者', '尚书', { dept: '吏部' });
assert(normal && normal.ok, 'normal appointment should succeed');
assert(context.GM.officeTree[0].positions[2].holder === '', 'normal appointment should still vacate previous office');
assert(context.findCharByName('调任者').officialTitle === '尚书', 'normal appointment should replace primary title');

resetState();
let aiConcurrent = context.onAppointment('兼官者', '尚书', { dept: '吏部', concurrent: true, reason: '兼职总理部务' });
assert(aiConcurrent && aiConcurrent.ok, 'AI concurrent appointment should succeed');
assert(context.GM.officeTree[0].positions[1].holder === '兼官者', 'AI concurrent appointment should not vacate old office');
assert(context.findCharByName('兼官者').concurrentTitles.indexOf('尚书') >= 0, 'AI concurrent appointment should store concurrent title');

// ── onAppointment 远地受任者启动赴任(治"任命后官员长期不赴任"·agent/AI 任命与诏书/官制 UI 统一) ──
resetState();
context.GM.chars.push({ name: '边将', officialTitle: '', position: '', alive: true, location: '辽东' });
context.GM.officeTree[0].positions.push({ name: '陕西巡抚', holder: '', establishedCount: 1, vacancyCount: 0, actualHolders: [] });
let remoteAppt = context.onAppointment('边将', '陕西巡抚', { dept: '吏部' });
assert(remoteAppt && remoteAppt.ok, 'remote appointment should succeed');
let _bj = context.findCharByName('边将');
assert(_bj._travelTo === '陕西', 'onAppointment 远地受任者应启动赴任(_travelTo=职名地名·治长期不赴任)');
assert(_bj.location === '辽东', '多回合赴任:location 仍原地·待 tick 抵达');

// ── 对照:中央职/已在目的地 不应启动赴任(京师→京师) ──
resetState();
context.GM.chars.push({ name: '京官', officialTitle: '', position: '', alive: true, location: '京师' });
context.GM.officeTree[0].positions.push({ name: '主事', holder: '', establishedCount: 1, vacancyCount: 0, actualHolders: [] });
context.onAppointment('京官', '主事', { dept: '吏部' });
assert(!context.findCharByName('京官')._travelTo, '已在京师的中央职任命不应启动赴任(无在途残留)');

// ── 对照:兼任不强制迁驻(concurrent 保留原驻地) ──
resetState();
context.GM.chars.push({ name: '兼边官', officialTitle: '侍郎', position: '侍郎', alive: true, location: '京师' });
context.GM.officeTree[0].positions.push({ name: '宣大总督', holder: '', establishedCount: 1, vacancyCount: 0, actualHolders: [] });
context.onAppointment('兼边官', '宣大总督', { dept: '吏部', concurrent: true, reason: '加兼' });
assert(!context.findCharByName('兼边官')._travelTo, '兼任不强制迁驻(concurrent 保留原驻地·无在途)');

resetState();
const ch = context.findCharByName('兼官者');
ch._travelTo = '京师';
ch._travelFrom = '南京';
ch._travelRemainingDays = 0;
ch._travelReason = '奉诏加兼尚书·赴任';
ch._travelAssignPost = '吏部/尚书';
ch._travelAssignConcurrent = true;
context.AIChangeApplier.advanceCharTravelByDays(1);
assert(context.GM.officeTree[0].positions[1].holder === '兼官者', 'travel arrival concurrent appointment should keep old office');
assert(context.findCharByName('兼官者').concurrentTitles.indexOf('尚书') >= 0, 'travel arrival should preserve concurrent title');

// ── onAppointment 地方职(officeTree 无节点但职种合法)→ 官衔记于角色表·不当幽灵回滚(治真机逮的"地方职任命后官衔空"·中央职在树→正常·地方职督师/总督/巡抚不在中央树→曾被误当杜撰穿越回滚) ──
resetState();
context.GM.chars.push({ name: '老督师', officialTitle: '辽东督师', alive: true, location: '辽东' });   // 剧本既有"督师"职种(数据驱动判定锚)
context.GM.chars.push({ name: '新督师', officialTitle: '', position: '', alive: true, location: '京师' });
context.onAppointment('新督师', '蓟辽督师', { dept: '兵部' });   // 蓟辽督师 不在 officeTree·但"督师"职种剧本已有
assert(context.findCharByName('新督师').officialTitle === '蓟辽督师', '地方职(树无节点·职种[督师]剧本已有)→ 官衔记于角色表·不回滚(治官衔空 bug)');

// ── 对照:真·杜撰/穿越职(职种剧本里查无)→ 回滚幽灵衔(反穿越守卫仍在) ──
resetState();
context.GM.chars.push({ name: '受封者', officialTitle: '主事', alive: true, location: '京师' });
context.onAppointment('受封者', '宇宙舰队司令', {});   // 职种"司令"剧本无 → 杜撰
assert(context.findCharByName('受封者').officialTitle !== '宇宙舰队司令', '杜撰职(职种剧本查无)→ 幽灵衔回滚(反穿越守卫保留)');

console.log('[smoke-office-concurrent-appointments] pass assertions=' + assertions);
