// smoke-foreign-ruler-court-gate.js — 外邦君主不得混入本朝臣工产出口（宰辅进言/求见队列/转对候选）
//
// 病灶(尔滨工坊天启档真机实证·2026-07-04)：皇太极/德川氏等敌国首脑被「宰辅进言」当品级最高者选为宰相、
// NPC 社交行动又把外邦人物排进殿外求见队列——两路输出喂入回合推演 prompt·被 AI 放大成「皇太极奏请陛下巩固辽东」。
// 修法：tm-utils.js 新增 _tmIsForeignCourtChar 硬闸(只拦「明确标了非本朝势力」者·空 faction 散官/编辑器剧本不填势力
// 的朝臣放行·与 _wdIsPlayerSideChar 空字段兜底语义对齐)·七处臣→君产出口(helpers 宰辅/apply 私访宴请/npc-decision
// seek_audience/agent-depth-tools 求见/wendui+rightrail 存量清洗/memorials 转对候选)统一走此闸。
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var failures = [];
function assert(cond, msg) {
  if (cond) { console.log('  PASS ' + msg); }
  else { failures.push(msg); console.log('  FAIL ' + msg); }
}

var sandbox = { console: console };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}

load('tm-utils.js');

// ── 场景：玩家执大明·名册混有外邦君主(有 faction)与不填势力的散官 ──
sandbox.GM = {
  turn: 5,
  playerFactionName: '大明',
  chars: [
    { name: '朱由校', isPlayer: true, faction: '大明', alive: true },
    { name: '皇太极', faction: '后金', title: '大汗', rankLevel: 1, alive: true },
    { name: '德川家光', faction: '幕府', title: '征夷大将军', rankLevel: 1, alive: true },
    { name: '孙承宗', faction: '朝廷', officialTitle: '兵部尚书', rankLevel: 2, alive: true },
    { name: '陈老散官', officialTitle: '中书舍人', rankLevel: 5, alive: true } // 编辑器剧本常见:不填 faction
  ]
};
sandbox.P = {};

console.log('① _tmIsForeignCourtChar 硬闸判定');
assert(sandbox._tmIsForeignCourtChar(sandbox.GM.chars[1]) === true, '皇太极(faction=后金)判外邦·拦');
assert(sandbox._tmIsForeignCourtChar(sandbox.GM.chars[2]) === true, '德川家光(faction=幕府)判外邦·拦');
assert(sandbox._tmIsForeignCourtChar(sandbox.GM.chars[3]) === false, '孙承宗(faction=朝廷·泛称白名单)判本朝·放行');
assert(sandbox._tmIsForeignCourtChar(sandbox.GM.chars[4]) === false, '空 faction 散官判本朝·放行(不误杀编辑器剧本朝臣)');

console.log('② 玩家自扮非中原政权对称成立(执后金视角)');
var gmBackup = sandbox.GM;
sandbox.GM = {
  turn: 5,
  playerFactionName: '后金',
  chars: [
    { name: '皇太极', isPlayer: true, faction: '后金', alive: true },
    { name: '朱由校', faction: '大明', title: '明帝', rankLevel: 1, alive: true },
    { name: '范文程', faction: '后金', rankLevel: 3, alive: true }
  ]
};
assert(sandbox._tmIsForeignCourtChar(sandbox.GM.chars[1]) === true, '执后金时·明帝朱由校(faction=大明)判外邦·拦');
assert(sandbox._tmIsForeignCourtChar(sandbox.GM.chars[2]) === false, '执后金时·范文程(faction=后金)判本朝·放行');
sandbox.GM = gmBackup;

console.log('③ 宰辅进言端到端:品级最高者=皇太极(rankLevel 1)·但宰相须选本朝品级最高者');
sandbox.SettlementPipeline = { register: function () {} }; // helpers 顶层注册结算段·smoke 只用 generateChancellorSuggestions
load('tm-endturn-helpers.js');
sandbox.CORE_METRIC_LABELS = { minxin: '民心' };
sandbox.GM.minxin = 20; // <40 触发进言
var sugg = vm.runInContext('generateChancellorSuggestions()', sandbox);
assert(Array.isArray(sugg) && sugg.length > 0, '进言非空(空 faction 兜底未把全员闸没)');
assert(sugg.every(function (s) { return s.from !== '皇太极' && s.from !== '德川家光'; }), '进言 from 无外邦君主');
assert(sugg.length > 0 && sugg[0].from === '孙承宗', '宰相=本朝品级最高者孙承宗(rankLevel 2)·非皇太极(rankLevel 1)');

console.log('④ 求见队列存量清洗语义(复刻 tm-wendui/rightrail 过滤规则·守卫函数同源)');
var queue = [
  { name: '皇太极', reason: '奏请巩固辽东', turn: 3 },                          // 污染条目→清
  { name: '孙承宗', reason: '面陈兵事', turn: 4 },                              // 本朝→留
  { name: '陈老散官', reason: '例行述职', turn: 4 },                            // 空 faction→留
  { name: '后金使节', reason: '请和', isEnvoy: true, fromFaction: '后金', turn: 4 }, // 使节线→留
  { name: '査无此人', reason: '来历不明', turn: 4 }                             // 查无此人→留给消费侧兜底
];
var cleaned = queue.filter(function (q) {
  if (!q || !q.name) return true;
  if (q.isEnvoy || q.fromFaction || q.isConsort || q._sid || q._opening) return true;
  var ch = sandbox.GM.chars.find(function (c) { return c.name === q.name; }) || null;
  if (!ch) return true;
  if (sandbox._tmIsForeignCourtChar(ch)) return false;
  return true;
});
assert(cleaned.length === 4, '5 条清后剩 4(只清皇太极)·实=' + cleaned.length);
assert(!cleaned.some(function (q) { return q.name === '皇太极'; }), '皇太极被清出队列');
assert(cleaned.some(function (q) { return q.name === '后金使节'; }), '外藩使节(isEnvoy 正规外交线)不误伤');
assert(cleaned.some(function (q) { return q.name === '陈老散官'; }), '空 faction 朝臣不误清');

if (failures.length) {
  console.log('\n[smoke-foreign-ruler-court-gate] FAIL ' + failures.length + ' 项');
  process.exit(1);
}
console.log('\n[smoke-foreign-ruler-court-gate] 全部 PASS');
