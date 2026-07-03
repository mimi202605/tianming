#!/usr/bin/env node
// scripts/smoke-changchao-ambient-isolation.js
// 2026-07-02·锁住『常朝硬编码天启人名(满桂/韩爌…)串入别的剧本』修复
//
// 玩家报·非天启剧本的常朝冒出"（满桂凝视前方·面无表情。）"等灰字·天启专属武将串场·破坏沉浸。
// 真因·tm-chaoyi-changchao.js 的 AMBIENT_LINES 氛围池 + pickResponder 兜底 + 若干发言气泡
//        写死天启人名·零剧本门控。修·带名句改用当前局在朝者(_cc3_ambientNames/_cc3_seniorOfficial)填充。
// 本测·①静态断言源码池/发言点已无写死天启人名 ②复制逻辑·喂绍宋朝廷·验永不吐天启名。

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

const TIANQI = ['满桂','韩爌','黄宗周','倪元璐','温体仁','毕自严','王在晋','黄景昉','袁崇焕','王永光'];
const src = fs.readFileSync(path.join(ROOT, 'tm-chaoyi-changchao.js'), 'utf8');

console.log('===== 静态·氛围池与发言气泡不再写死天启人名 =====');
// AMBIENT_LINES + AMBIENT_TEMPLATES 区段
const poolStart = src.indexOf('const AMBIENT_LINES');
const poolEnd = src.indexOf('function maybeAmbient');
const poolSrc = src.slice(poolStart, poolEnd);
assert(poolStart > 0 && poolEnd > poolStart, '定位到 AMBIENT 池区段');
TIANQI.forEach(n => assert(poolSrc.indexOf(n) < 0, 'AMBIENT 池不应含天启人名「'+n+'」'));
// pickResponder 不再兜底 '韩爌'
const prStart = src.indexOf('function pickResponder');
const prSrc = src.slice(prStart, prStart + 500);
assert(prSrc.indexOf("|| '韩爌'") < 0 && prSrc.indexOf('|| "韩爌"') < 0, 'pickResponder 不应兜底韩爌');
// runDecreeFlow / escalate 的发言气泡不再 addBubble({name:'韩爌'/'黄景昉'})
assert(src.indexOf("addBubble({ name: '韩爌'") < 0, '不应再有 addBubble name:韩爌');
assert(src.indexOf("addBubble({ name: '黄景昉'") < 0, '不应再有 addBubble name:黄景昉');

console.log('===== 静态·mode prompt few-shot 范例已去朝代专属人名 =====');
// mode 的 example few-shot 会注入 AI prompt·旧版含袁崇焕/韩爌/魏珰等→别的剧本 AI 可能照抄·去名化
const DYN_NAMES = ['袁崇焕','张瑞图','许显纯','韩爌','赵南星','叶向高','黄潜善','宗泽','李纲','魏珰','魏阉','魏忠贤','满桂'];
let dynHits = [];
src.split('\n').forEach((ln, i) => {
  const t = ln.trim();
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;  // 注释豁免(注释里提及是修复说明)
  DYN_NAMES.forEach(n => { if (ln.indexOf(n) >= 0) dynHits.push((i+1) + ':' + n); });
});
assert(dynHits.length === 0, 'mode 范例/代码(非注释)不应含朝代专属人名 (命中 ' + dynHits.slice(0,8).join(', ') + ')');
// cite_classic 保留的跨朝古人引用(诸葛/魏徵/太宗/汉宣帝)是该 mode 用意·不算死字段·不检

console.log('===== 逻辑·绍宋朝廷下氛围气泡永不吐天启名 =====');
// 复制自 tm-chaoyi-changchao.js 的受剧本约束逻辑
const CHARS = {
  '李纲':   { title: '尚书右仆射', absent: false },
  '宗泽':   { title: '东京留守',   absent: false },
  '赵鼎':   { title: '殿中侍御史', absent: false },
  '张浚':   { title: '知枢密院事', absent: false },
  '黄潜善': { title: '中书侍郎',   absent: false },
  '汪伯彦': { title: '同知枢密院', absent: false },
  '高宗':   { title: '官家', isPlayer: true, absent: false },
  '刘光世': { title: '御营副使', absent: true }  // 缺席·不应被选
};
const SONG = Object.keys(CHARS).filter(n => !CHARS[n].isPlayer && !CHARS[n].absent);

function _cc3_ambientNames(n) {
  var names = Object.keys(CHARS || {}).filter(function(k){ return CHARS[k] && !CHARS[k].absent && !CHARS[k].isPlayer; });
  for (var i = names.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = names[i]; names[i] = names[j]; names[j] = t; }
  return names.slice(0, n || 1);
}
function _cc3_seniorOfficial(exclude) {
  var names = Object.keys(CHARS || {}).filter(function(n){ return n !== exclude && CHARS[n] && !CHARS[n].absent && !CHARS[n].isPlayer; });
  if (!names.length) return '';
  var senior = names.filter(function(n){ var t = (CHARS[n] && (CHARS[n].title || CHARS[n].officialTitle)) || ''; return /首辅|次辅|大学士|阁|太师|太傅|少师|少傅|尚书|侍郎|都御史|总宪|正卿/.test(t); });
  var pool = senior.length ? senior : names;
  return pool[Math.floor(Math.random() * pool.length)];
}
const AMBIENT_LINES = ['（殿中有低声议论。）','（殿中有人微微叹息。）','（科道几员低声相商。）','（远处似有内官传旨之声。）','（殿角铜漏 · 滴答有声。）','（班列之间 · 目光交触。）','（有人扶笏 · 略有沉思。）'];
const AMBIENT_TEMPLATES = ['（{n}凝视前方 · 面无表情。）','（{n}捻须 · 略有沉思。）','（{n}扶笏 · 目光低垂。）','（{n}捏紧手中奏疏。）','（{n}微微颔首。）','（{n}与{n2}目光交触。）'];
const emitted = [];
function maybeAmbient() {
  var names = _cc3_ambientNames(2);
  var line;
  if (names.length && Math.random() < 0.5) {
    var pool = names.length >= 2 ? AMBIENT_TEMPLATES : AMBIENT_TEMPLATES.filter(function(t){ return t.indexOf('{n2}') < 0; });
    line = pool[Math.floor(Math.random() * pool.length)].replace('{n2}', names[1] || names[0]).replace('{n}', names[0]);
  } else {
    line = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)];
  }
  emitted.push(line);
}
for (let i = 0; i < 3000; i++) maybeAmbient();
let leaked = emitted.filter(l => TIANQI.some(n => l.indexOf(n) >= 0));
assert(leaked.length === 0, '3000 次氛围气泡不得含任何天启人名 (泄露 ' + leaked.length + ' 例·如 ' + (leaked[0]||'') + ')');
// 含人名的气泡·其名字只能是当前在朝的绍宋人(缺席刘光世/玩家高宗不得出现)
let namedTemplated = emitted.filter(l => SONG.some(n => l.indexOf(n) >= 0));
assert(namedTemplated.length > 0, '应有带名气泡(模板填充当前局角色)产生 (得 ' + namedTemplated.length + ')');
assert(!emitted.some(l => l.indexOf('刘光世') >= 0), '缺席者刘光世不应出现');
assert(!emitted.some(l => l.indexOf('高宗') >= 0), '玩家本人高宗不应作氛围角色出现');

console.log('===== 逻辑·pickResponder/seniorOfficial 只返当前局人 =====');
function pickResponder(item, exclude) {
  const debaters = (item.debate || []).map(d => d.name).filter(Boolean);
  const present = Object.keys(CHARS || {}).filter(n => CHARS[n] && !CHARS[n].absent);
  const candidates = [...debaters, ...present];
  return candidates.find(n => n !== exclude && CHARS[n] && !CHARS[n].absent)
      || debaters.find(n => n !== exclude) || present[0] || debaters[0] || '';
}
let r = pickResponder({ debate: [{ name: '宗泽' }] }, '宗泽');
assert(SONG.indexOf(r) >= 0 && r !== '韩爌', 'pickResponder 返当前局在朝者·非韩爌 (得 ' + r + ')');
let so = _cc3_seniorOfficial('');
assert(SONG.indexOf(so) >= 0, '_cc3_seniorOfficial 返当前局重臣 (得 ' + so + ')');
// 无在朝者→返 ''(退无名气泡)
const _bak = Object.assign({}, CHARS); Object.keys(CHARS).forEach(k => delete CHARS[k]);
assert(_cc3_seniorOfficial('') === '', '无在朝者时返空串(下游退无名气泡)');
Object.assign(CHARS, _bak);

console.log('');
console.log(`[smoke-changchao-ambient-isolation] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
