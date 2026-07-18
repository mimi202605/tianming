#!/usr/bin/env node
// scripts/smoke-edict-dismiss-parse.js
// 2026-07-19·钉死玩家治罪/免职诏令解析器根治(治「革职拿问/查办/圈禁后职位树不摘职」)
//
// 侦探三病：extractEdictActions 免职解析——
//   ① 动词表缺 查办/圈禁/拿问/削籍/下诏狱/褫职 等 → 解析=[]·职位树不动；
//   ② 动词在前非贪婪 {2,6}? 把处置中介词当人名或截短真名(革职拿问陈奇瑜→拿问·革职陈奇瑜→陈奇)；
//   ③ salvage 单向:救 raw⊇真名·救不了 raw⊂真名(截断)。
// Codex 复审再逮四洞 + 两处 smoke 弱点：
//   ④ 否定/赦免语境(避免拘押/不要查办)误摘职；
//   ⑤ Pass B 跨标点吞前缀(释放X，革职Y→两摘)；
//   ⑥ 切句只认中文标点·漏 ASCII/空白(缉拿归案 孙传庭→误摘)；
//   ⑦ 多人列举漏抓(革职X、Y 只得 X)；
//   ⑧a 单一真源断言被注释满足(改功能性断言)；⑧b 正则缺失静默降级(生产 console.warn 留痕·smoke 断言存在)。
// 修：入狱动词【复用 _TM_IMPRISON_RE 单一真源】+去官动词组；从原文重建保留分隔的 _dtext(空白/ASCII/中文句读→
//   硬边界·顿号"、"作枚举连接符)·按硬边界切句·动词前否定门·片段内已知名前缀锚定+枚举链扩展。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }

// 加载 applier 链(拿真 _TM_IMPRISON_RE 单一真源) → 再加载 edict 解析器·同一 vm 上下文共享导出正则
function makeCtx(chars) {
  const ctx = {
    console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, setTimeout: () => 0, clearTimeout: () => {}, Error
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  ['tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js', 'tm-ai-change-applier.js', 'tm-ai-change-applier-validators.js', 'tm-ai-change-applier-reconcile.js'].forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  ctx.GM = { turn: 10, month: 1, officeTree: [], armies: [], chars: chars };
  ctx.P = { playerInfo: { characterName: '崇祯', factionName: '明朝廷' } };
  ctx.addEB = () => {};
  ctx._dbg = () => {};
  ctx.toast = () => {};
  ctx.findCharByName = (name) => (ctx.GM.chars || []).find(c => c && c.name === name) || null;
  ctx.recordCharacterArc = () => {};
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), ctx, { filename: 'tm-endturn-edict.js' });
  return ctx;
}
// edict-only 上下文(不加载 applier→无 _TM_IMPRISON_RE)·带 console.warn 探针(洞⑧b 留痕断言)
function makeCtxNoRe(chars) {
  const warns = [];
  const ctx = { console: { log() {}, warn(...a) { warns.push(a.join(' ')); }, info() {}, error() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, parseInt, parseFloat };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  ctx.GM = { turn: 10, officeTree: [], armies: [], chars: chars };
  ctx.P = { playerInfo: { characterName: '崇祯' } };
  ctx.addEB = () => {}; ctx._dbg = () => {};
  ctx.findCharByName = (n) => (ctx.GM.chars || []).find(x => x && x.name === n) || null;
  ctx.recordCharacterArc = () => {};
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), ctx, { filename: 'tm-endturn-edict.js' });
  return { ctx, warns };
}
function ch(name, extra) { return Object.assign({ name, alive: true, faction: '明朝廷', officialTitle: '', position: '' }, extra || {}); }
function dset(acts) { return (acts.dismissals || []).map(d => d && d.character).filter(Boolean).sort().join(','); }
function dismissed(acts, name) { return Array.isArray(acts.dismissals) && acts.dismissals.some(d => d && d.character === name); }
// 名录含 陈奇瑜(3字)/杨鹤(2字)/长孙无忌(4字复姓)/王在晋/孙传庭
function fixtureCtx() { return makeCtx([ ch('陈奇瑜'), ch('杨鹤'), ch('长孙无忌'), ch('王在晋'), ch('孙传庭') ]); }

console.log('===== 0·单一真源【功能性断言·非源码字符串检查】(洞⑧a/b) =====');
(function () {
  const ctx = fixtureCtx();
  assert(ctx._TM_IMPRISON_RE && typeof ctx._TM_IMPRISON_RE.test === 'function', '0·applier 链应导出真 _TM_IMPRISON_RE');
  // 有 RE:纯入狱关键词句(拿问/下诏狱·仅存在于 _TM_IMPRISON_RE)真解析出 dismissal
  assert(dismissed(ctx.extractEdictActions('着锦衣卫拿问陈奇瑜下诏狱'), '陈奇瑜'), '0·有 _TM_IMPRISON_RE 时·纯入狱关键词句应真摘职(功能性证明复用)');
  // 无 RE:同句解析不出(证明入狱识别确来自单一真源·非本文件私存正则)
  const nore = makeCtxNoRe([ ch('陈奇瑜') ]);
  assert(dismissed(nore.ctx.extractEdictActions('着锦衣卫拿问陈奇瑜下诏狱'), '陈奇瑜') === false,
    '0·无 _TM_IMPRISON_RE 时·纯入狱关键词句解析不出(功能性单一真源契约)');
  // 洞⑧b:正则缺失时生产侧 console.warn 留痕(防线上静默降级)
  assert(nore.warns.some(w => /_TM_IMPRISON_RE/.test(w)), '0·正则缺失应 console.warn 留痕一次(含 _TM_IMPRISON_RE 字样)·实=' + JSON.stringify(nore.warns));
  // 去官动词组独立生效(不依赖 RE):纯去官动词句·无 RE 也解析出
  assert(dismissed(nore.ctx.extractEdictActions('查办陈奇瑜'), '陈奇瑜'), '0·去官动词组无 RE 也生效(查办陈奇瑜)');
})();

console.log('===== A·必过用例(治罪/免职→character=陈奇瑜 的 dismissal) =====');
(function () {
  const ctx = fixtureCtx();
  [ '革职拿问陈奇瑜', '查办陈奇瑜', '圈禁陈奇瑜', '削籍下狱陈奇瑜', '革职陈奇瑜', '陈奇瑜革职', '着锦衣卫拿问陈奇瑜下诏狱' ]
    .forEach(t => assert(dismissed(ctx.extractEdictActions(t), '陈奇瑜'), '「' + t + '」应解析出 dismissal(陈奇瑜)·实=' + JSON.stringify(ctx.extractEdictActions(t).dismissals)));
})();

console.log('===== B·名长健壮:2字名 / 4字复姓名 =====');
(function () {
  const ctx = fixtureCtx();
  assert(dismissed(ctx.extractEdictActions('革职杨鹤，以儆效尤。'), '杨鹤'), 'B·2字名「革职杨鹤」应摘职');
  assert(dismissed(ctx.extractEdictActions('查办长孙无忌'), '长孙无忌'), 'B·4字复姓「查办长孙无忌」应摘职');
  assert(dismissed(ctx.extractEdictActions('长孙无忌下诏狱'), '长孙无忌'), 'B·4字复姓·名在前「长孙无忌下诏狱」应摘职');
})();

console.log('===== C·反例:不含治罪动词/未在册名 不误产 dismissal =====');
(function () {
  const ctx = fixtureCtx();
  assert(ctx.extractEdictActions('着孙传庭督师陕西，剿灭流寇。').dismissals.length === 0, 'C·任命句不误产 dismissal');
  assert(ctx.extractEdictActions('陈奇瑜奏报流寇日炽，请发帑金以济军需。').dismissals.length === 0, 'C·纯叙事句不产 dismissal');
  assert(!dismissed(ctx.extractEdictActions('缉拿归案，孙传庭奏捷凯旋。'), '孙传庭'), 'C·中文标点跨子句不误抓下一句主语');
  assert(ctx.extractEdictActions('革职拿问某贪吏').dismissals.length === 0, 'C·未在册名(某贪吏)解析不出·防垃圾串');
})();

console.log('===== D·任免同员不双记:升迁诏免旧职者被过滤(保留既有契约) =====');
(function () {
  const ctx = makeCtx([ ch('升官者', { officialTitle: '兵部侍郎' }) ]);
  assert(!dismissed(ctx.extractEdictActions('命升官者为兵部尚书，并免去升官者旧职。'), '升官者'), 'D·被同诏擢升者不应同时产 dismissal');
})();

console.log('===== F·否定/宽宥门(洞④):避免/不要/切勿/姑免… 不误摘 =====');
(function () {
  const ctx = fixtureCtx();
  assert(ctx.extractEdictActions('避免拘押陈奇瑜').dismissals.length === 0, 'F·「避免拘押陈奇瑜」不摘职');
  assert(ctx.extractEdictActions('不要查办陈奇瑜').dismissals.length === 0, 'F·「不要查办陈奇瑜」不摘职');
  assert(ctx.extractEdictActions('切勿轻易查办陈奇瑜').dismissals.length === 0, 'F·「切勿轻易查办陈奇瑜」(否定非紧邻)不摘职');
  assert(ctx.extractEdictActions('姑免查办陈奇瑜，以观后效。').dismissals.length === 0, 'F·「姑免查办」宽宥不摘职');
  assert(dismissed(ctx.extractEdictActions('革职陈奇瑜'), '陈奇瑜'), 'F·去官动词不被否定门误伤');
})();

console.log('===== G·混合赦免+治罪(洞⑤):同诏一赦一治·各归其人 =====');
(function () {
  const ctx = fixtureCtx();
  const a1 = ctx.extractEdictActions('释放陈奇瑜，革职王在晋。');
  assert(dset(a1) === '王在晋', 'G·「释放陈奇瑜，革职王在晋」只摘王在晋·实=[' + dset(a1) + ']');
  const a2 = ctx.extractEdictActions('赦免释放陈奇瑜，革职拿问王在晋。');
  assert(dset(a2) === '王在晋', 'G·「赦免释放陈奇瑜，革职拿问王在晋」只摘王在晋·实=[' + dset(a2) + ']');
})();

console.log('===== H·切句边界认 ASCII/空白/换行(洞⑥):不跨分隔误摘 =====');
(function () {
  const ctx = fixtureCtx();
  assert(!dismissed(ctx.extractEdictActions('缉拿归案,孙传庭奏捷'), '孙传庭'), 'H·ASCII 逗号边界·不误摘孙传庭');
  assert(!dismissed(ctx.extractEdictActions('缉拿归案 孙传庭奏捷'), '孙传庭'), 'H·空格边界·不误摘孙传庭');
  assert(!dismissed(ctx.extractEdictActions('缉拿归案\n孙传庭奏捷'), '孙传庭'), 'H·换行边界·不误摘孙传庭');
  const a = ctx.extractEdictActions('释放陈奇瑜, 革职王在晋');
  assert(dset(a) === '王在晋', 'H·ASCII 逗号混合诏只摘王在晋·实=[' + dset(a) + ']');
})();

console.log('===== I·多人列举(洞⑦):动词前/后列举·顿号或及连接·全员入账·距离放宽 =====');
(function () {
  const ctx = fixtureCtx();
  assert(dset(ctx.extractEdictActions('革职陈奇瑜、王在晋')) === '王在晋,陈奇瑜', 'I·动词在前列举「革职陈奇瑜、王在晋」摘两人');
  assert(dset(ctx.extractEdictActions('陈奇瑜、王在晋革职')) === '王在晋,陈奇瑜', 'I·动词在后列举「陈奇瑜、王在晋革职」摘两人');
  assert(dset(ctx.extractEdictActions('查办陈奇瑜及王在晋')) === '王在晋,陈奇瑜', 'I·「及」连接列举摘两人');
  const long = ctx.extractEdictActions('革职陈奇瑜、王在晋、杨鹤、长孙无忌');
  assert(dset(long) === '杨鹤,王在晋,长孙无忌,陈奇瑜', 'I·长列举(末员距动词>10)全员入账·实=[' + dset(long) + ']');
})();

console.log('===== J·动作-目标级极性(二审①):双否→正 / 近标记=仍须→正 / 近标记=切勿→负 / 释放X随后治Y只摘Y =====');
(function () {
  const ctx = fixtureCtx();
  assert(dismissed(ctx.extractEdictActions('不得不革职陈奇瑜'), '陈奇瑜'), 'J·双重否定「不得不革职陈奇瑜」→正极性·摘');
  assert(dismissed(ctx.extractEdictActions('不得宽宥仍须查办陈奇瑜'), '陈奇瑜'), 'J·「不得宽宥仍须查办陈奇瑜」近标记=仍须→正·摘');
  assert(ctx.extractEdictActions('切勿因小过而轻率查办陈奇瑜').dismissals.length === 0, 'J·「切勿…轻率查办陈奇瑜」近标记=切勿(距离无上限)→负·不摘');
  const a = ctx.extractEdictActions('释放陈奇瑜随后革职王在晋');
  assert(dset(a) === '王在晋', 'J·「释放陈奇瑜随后革职王在晋」遇人名即停·只摘王在晋·实=[' + dset(a) + ']');
})();

console.log('===== K·受控相邻缝合(二审②):赦免X死罪改革职留用(三标点变体)→X摘且pardon照记 / 空白·换行缝合 =====');
(function () {
  ['赦免陈奇瑜死罪改革职留用', '赦免陈奇瑜死罪，改革职留用', '赦免陈奇瑜死罪。改革职留用'].forEach(t => {
    const ctx = fixtureCtx();
    const a = ctx.extractEdictActions(t);
    assert(dismissed(a, '陈奇瑜'), 'K·「' + t + '」承接→陈奇瑜入 dismissals·实=[' + dset(a) + ']');
    assert(a.pardons.some(p => p && p.character === '陈奇瑜'), 'K·「' + t + '」赦免 pardon 照记(免死+革职并存自洽)');
  });
  const ctx = fixtureCtx();
  assert(dismissed(ctx.extractEdictActions('革职 陈奇瑜'), '陈奇瑜'), 'K·空白缝合「革职␣陈奇瑜」→摘');
  assert(dismissed(ctx.extractEdictActions('查办\n陈奇瑜'), '陈奇瑜'), 'K·换行缝合「查办\\n陈奇瑜」→摘');
  // 缝合守卫:下段名后有自带谓词则不缝(革职|孙传庭奏捷 不误摘)
  assert(!dismissed(ctx.extractEdictActions('革职 孙传庭奏捷凯旋'), '孙传庭'), 'K·缝合守卫·下段名后有谓词(奏捷)则不缝');
})();

console.log('===== L·边界集合扩充(二审③):—— / （） / () / 斜杠 分隔不跨抓 =====');
(function () {
  const ctx = fixtureCtx();
  assert(!dismissed(ctx.extractEdictActions('缉拿归案——孙传庭奏捷'), '孙传庭'), 'L·破折号——边界不跨抓');
  assert(!dismissed(ctx.extractEdictActions('查办事毕（孙传庭另奏）'), '孙传庭'), 'L·中文括号（）边界不跨抓');
  assert(!dismissed(ctx.extractEdictActions('缉拿归案/孙传庭奏捷'), '孙传庭'), 'L·斜杠/边界不跨抓');
  assert(!dismissed(ctx.extractEdictActions('查办事毕(孙传庭另奏)'), '孙传庭'), 'L·ASCII 括号()边界不跨抓');
})();

console.log('===== E·端到端:解析→applyEdictActions→officeTree holder 摘除 + char 官衔清空 =====');
(function () {
  const ctx = makeCtx([ ch('陈奇瑜', { officialTitle: '五省总督', position: '五省总督', title: '五省总督' }) ]);
  ctx.GM.officeTree = [{ name: '五省军务', positions: [{ name: '五省总督', holder: '陈奇瑜' }] }];
  const a = ctx.extractEdictActions('着锦衣卫查办陈奇瑜，革职拿问，下诏狱待勘。');
  assert(dismissed(a, '陈奇瑜'), 'E·先解析出 dismissal');
  ctx.applyEdictActions(a);
  assert(ctx.GM.officeTree[0].positions[0].holder === '', 'E·officeTree holder 应被摘除(实=' + ctx.GM.officeTree[0].positions[0].holder + ')');
  assert(ctx.GM.chars[0].officialTitle === '' && ctx.GM.chars[0].title === '', 'E·char 官衔应清空');
})();

console.log('');
console.log(`[smoke-edict-dismiss-parse] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
