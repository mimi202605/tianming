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

// 两套 UI 同源钉:新 UI(phase8 右侧栏)的求见判定必须走同一真源 _wdDeriveAudienceAgenda(.seek)，
// 不得回退到硬编码阈值子集(旧病根:漏逾期复命/谢恩/谢罪/低忠离心/危兆进谏五类)。
const rightrailSrc = fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8');
const _seekerStart = rightrailSrc.indexOf('function rightWenduiIsSeeker');
const _seekerEnd = rightrailSrc.indexOf('function rightWenduiFactionTag');
assert(_seekerStart >= 0 && _seekerEnd > _seekerStart, 'phase8 rightWenduiIsSeeker 应存在');
const seekerBlock = rightrailSrc.slice(_seekerStart, _seekerEnd);
assert(/_wdDeriveAudienceAgenda/.test(seekerBlock), '新 UI 求见判定须引用 _wdDeriveAudienceAgenda(与旧 UI 同源)');
assert(/agenda\s*&&\s*agenda\.seek/.test(seekerBlock), '新 UI 求见判定须读 agenda.seek');

// ─────────────────────────────────────────────────────────────────────────────
// 行为夹具(2026-07-19·求见刀复审返工)：上面 L128-139 是源码 token 断言，Codex 复审指出五种
// 语义突变全假绿(①真源分支改 if(false&&…) ②realCh 改回 p ③agenda.seek 后叠忠诚过滤 ④删未回信||
// ⑤render 恢复 slice(0,12))。故加 VM 行为夹具：load 新 UI rightWenduiIsSeeker + 旧 UI _seekAudience
// 谓词【真源】(非复刻)，构造覆盖七类议程+未回信+routine 的人物，直接断言两套集合逐人相等 + 渲染保全部
// seeker。这些断言对上述五种突变全部变红。
// ─────────────────────────────────────────────────────────────────────────────

// —— 抽两套 UI 的求见谓词真源(closes 于 2-空格缩进 `}`) ——
const oldSeekM = src.match(/atCap\.filter\((function\(c\)\s*\{[\s\S]*?\n {2}\})\);/);
assert(!!oldSeekM, '夹具须能抽取旧 UI【有臣求见】过滤谓词真源');
const oldSeekFn = new Function('GM', '_wdDeriveAudienceAgenda', 'return (' + oldSeekM[1] + ');')(sandbox.GM, agenda);

const seekerM = rightrailSrc.match(/function rightWenduiIsSeeker\(p\)\{[\s\S]*?\n {2}\}/);
const letterM = rightrailSrc.match(/function rightWenduiHasUnansweredLetter\(name\)\{[\s\S]*?\n {2}\}/);
assert(!!seekerM && !!letterM, '夹具须能抽取新 UI rightWenduiIsSeeker + rightWenduiHasUnansweredLetter 真源');
const newSeekFn = new Function('rightIssueAtCourt', 'findCharByName', 'personKey', 'rightIssueNum', 'window', 'GM',
  letterM[0] + '\n' + seekerM[0] + '\nreturn rightWenduiIsSeeker;')(
  function(){ return true; },                                                        // 夹具全员在朝(gate 交由本测统一放行)
  function(n){ return sandbox.GM.chars.find(function(c){ return c.name === n; }) || null; },
  function(p){ return p && p.name; },
  function(){ return 50; },
  { GM: sandbox.GM, _wdDeriveAudienceAgenda: agenda },
  sandbox.GM
);

// —— 人物夹具：七类议程各一 + 未回信(routine 议程) + routine + 两类应排除(守孝/今日已见) + ②真身依赖(影) ——
sandbox.GM.turn = 10;
sandbox.GM.activeWars = []; sandbox.GM.unrest = 0; sandbox.GM.memorials = []; sandbox.GM._tyrantDecadence = 0;
sandbox.GM.chars = [
  { name: '逾期', loyalty: 70, ambition: 50, stress: 10 },                 // ① 逾期承诺 → commitment·seek
  { name: '谢恩', loyalty: 70, ambition: 50, stress: 10 },                 // ② 近受赏 → thank·seek
  { name: '请罪', loyalty: 70, ambition: 50, stress: 10 },                 // ② 近受罚 → grieve·seek
  { name: '离心', loyalty: 25, ambition: 50, stress: 10 },                 // ③ 深度离心 → grievance·seek
  { name: '忠谏', loyalty: 95, ambition: 50, stress: 40 },                 // ④ 极忠高压 → warn·seek
  { name: '野心', loyalty: 70, ambition: 85, stress: 10 },                 // ⑤ 高野心 → ambition·seek
  { name: '重压', loyalty: 70, ambition: 50, stress: 70 },                 // ⑥ 高压 → burden·seek
  { name: '来函', loyalty: 70, ambition: 50, stress: 10 },                 // routine 议程·仅未回信触发 seek
  { name: '影',   loyalty: 25, ambition: 50, stress: 10 },                 // grievance·seek(供②真身依赖测)
  { name: '常事', loyalty: 70, ambition: 50, stress: 10 },                 // routine → 不求见
  { name: '守孝', loyalty: 25, ambition: 50, stress: 10, _mourning: true },// 议程本会 seek·丁忧应排除
  { name: '今见', loyalty: 25, ambition: 50, stress: 10, _lastMetTurn: 10 }// 议程本会 seek·本回合已见应排除
];
sandbox.GM._npcCommitments = { '逾期': [{ task: '抚流民', status: 'executing', assignedTurn: 1, deadline: 3 }] };
sandbox.GM._wdRewardPunish = [{ target: '谢恩', type: 'reward', turn: 9 }, { target: '请罪', type: 'punish', turn: 9 }];
sandbox.GM.letters = [{ _npcInitiated: true, from: '来函', _replyExpected: true, _playerReplied: false, status: 'returned' }];

function _charByName(n){ return sandbox.GM.chars.find(function(c){ return c.name === n; }); }

// —— 核心断言 A：两套 UI 求见集合逐人相等(catch ①②③④·任一新 UI 谓词突变→集合发散) ——
const oldSet = sandbox.GM.chars.filter(function(c){ return oldSeekFn(c); }).map(function(c){ return c.name; }).sort();
const newSet = sandbox.GM.chars.filter(function(c){ return newSeekFn(c); }).map(function(c){ return c.name; }).sort();
assert(JSON.stringify(oldSet) === JSON.stringify(newSet), '两套 UI 求见集合须逐人相等(旧=[' + oldSet + '] 新=[' + newSet + '])');
assert(oldSet.length === 9 && oldSet.indexOf('常事') < 0 && oldSet.indexOf('守孝') < 0 && oldSet.indexOf('今见') < 0,
  '夹具应判出 9 名求见者且排除 routine/丁忧/已见(实=' + oldSet.length + ':[' + oldSet + '])');

// —— 定向断言(逐项钉死五突变) ——
assert(newSeekFn(_charByName('野心')) === true && agenda(_charByName('野心')).seek === true
  && !sandbox.GM.letters.some(function(l){ return l.from === '野心'; }),
  '① 议程 seek 须判求见(真源分支被禁用 if(false&&…)则漏判)');
assert(newSeekFn({ name: '影' }) === true,
  '② 须对真身(findCharByName)取议程：shallow {name:影} 应解析出 loy25→grievance·seek(realCh→p 突变则 routine·false)');
assert(newSeekFn(_charByName('离心')) === true,
  '③ 低忠离心须判求见(agenda.seek 后叠回忠诚过滤则漏判)');
assert(agenda(_charByName('来函')).seek === false && newSeekFn(_charByName('来函')) === true,
  '④ 未回信亲至须判求见(其议程本身 seek=false·删「未回信||」则漏判)');
assert(newSeekFn(_charByName('守孝')) === false && newSeekFn(_charByName('今见')) === false,
  '丁忧/本回合已见须排除(两套 UI 同款前置闸)');

// —— 核心断言 B：渲染保全部 seeker·不静默截断(catch ⑤ render 恢复 slice) ——
assert(/seekerBody = seekers\.length \? rightWenduiHydratedList\(/.test(rightrailSrc),
  '⑤ renderRightWenduiPanel【有臣求见】须走 rightWenduiHydratedList(非裸 slice·防洪同时保全量)');
const hydM = rightrailSrc.match(/function rightWenduiHydratedList\(cls, items, renderItem\)\{[\s\S]*?\n {2}\}/);
assert(!!hydM, '夹具须能抽取 rightWenduiHydratedList 源');
const hyd = new Function('RIGHT_WENDUI_INITIAL_ROWS', 'rightScheduleWenduiHydration', 'attr', '_rightWenduiRenderSeq',
  hydM[0] + '\nreturn rightWenduiHydratedList;')(24, function(){}, String, 0);
const items30 = []; for (let i = 0; i < 30; i++) items30.push({ name: 'S' + i });
const out30 = hyd('tmrp-wd-list', items30, function(p){ return '<x id="' + p.name + '"/>'; });
const rendered30 = (out30.match(/<x /g) || []).length;
const note30 = out30.match(/余 (\d+) 人载入中/);
assert(!!note30, '⑤ 超批(30>24)须留「余 N 人载入中」提示·不静默丢人');
assert(rendered30 + Number(note30[1]) === 30, '⑤ 首屏渲染(' + rendered30 + ')+余量(' + note30[1] + ')须守恒=全量 30(恢复 slice(0,12)则不守恒)');
assert(rendered30 === 24, '⑤ 首屏批 = RIGHT_WENDUI_INITIAL_ROWS(24)·非收窄(实=' + rendered30 + ')');
const out5 = hyd('tmrp-wd-list', [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }], function(p){ return '<x id="' + p.name + '"/>'; });
assert((out5.match(/<x /g) || []).length === 5 && !/余 \d+ 人/.test(out5), '⑤ 批内(5≤24)全渲无提示·信息无损');

console.log(`[verify-audience-seek] PASS ${passed} assertions`);
