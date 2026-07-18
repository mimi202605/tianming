#!/usr/bin/env node
// scripts/smoke-edict-dismiss-parse.js
// 2026-07-19·钉死玩家治罪/免职诏令解析器根治(治「革职拿问/查办/圈禁后职位树不摘职」)
//
// 病根(侦探实测)：extractEdictActions 的免职解析三病——
//   ① 动词表缺 查办/圈禁/拿问/削籍/下诏狱/褫职 等 → 解析=[]·职位树不动；
//   ② 动词在前非贪婪 {2,6}? 把处置中介词当人名或截短真名(革职拿问陈奇瑜→拿问·革职陈奇瑜→陈奇)；
//   ③ salvage 单向:救 raw⊇真名·救不了 raw⊂真名(截断)。
// 修：治罪动词分两组——入狱类【复用 _TM_IMPRISON_RE 单一真源】+ 明确去官动词组；
//     命中动词后在本句窗口用已知名录锚定(非硬截)·双向 salvage。
//
// 单一真源纪律:本 smoke 加载 tm-ai-change-applier 链取真 _TM_IMPRISON_RE·
//   证明 extractEdictActions 的入狱动词识别复用同一正则(不另立第三处正则漂移)。
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
function ch(name, extra) { return Object.assign({ name, alive: true, faction: '明朝廷', officialTitle: '', position: '' }, extra || {}); }
function dismissed(acts, name) {
  return Array.isArray(acts.dismissals) && acts.dismissals.some(d => d && d.character === name);
}

// 全流程都在一个含 陈奇瑜(3字)/杨鹤(2字)/长孙无忌(4字复姓)/孙传庭 的名录上跑
function fixtureCtx() {
  return makeCtx([ ch('陈奇瑜'), ch('杨鹤'), ch('长孙无忌'), ch('孙传庭') ]);
}

console.log('===== 0·单一真源:applier 链导出真 _TM_IMPRISON_RE·解析器复用之 =====');
(function () {
  const ctx = fixtureCtx();
  assert(ctx._TM_IMPRISON_RE && typeof ctx._TM_IMPRISON_RE.test === 'function', '应从 applier 链拿到 _TM_IMPRISON_RE 单一真源');
  const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8');
  assert(/_TM_IMPRISON_RE/.test(src), 'extractEdictActions 源码应引用 _TM_IMPRISON_RE(复用单一真源·不另立第三处正则)');
  assert(/_removeOfficeVerbs/.test(src), '应另立一组明确去官动词 _removeOfficeVerbs');
  // 入狱动词的识别确实来自单一真源:关掉它(edict-only 加载)时·纯入狱关键词句应解析不出(靠 applier RE 才补上)
  const ctxNoRe = (function () {
    const c = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, parseInt, parseFloat };
    c.window = c; c.global = c; c.globalThis = c; vm.createContext(c);
    c.GM = { turn: 10, officeTree: [], armies: [], chars: [ ch('陈奇瑜') ] };
    c.P = { playerInfo: { characterName: '崇祯' } }; c.addEB = () => {}; c._dbg = () => {};
    c.findCharByName = (n) => (c.GM.chars || []).find(x => x && x.name === n) || null; c.recordCharacterArc = () => {};
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), c, { filename: 'tm-endturn-edict.js' });
    return c;
  })();
  assert(dismissed(ctxNoRe.extractEdictActions('着锦衣卫拿问陈奇瑜下诏狱'), '陈奇瑜') === false,
    '无 _TM_IMPRISON_RE 时·纯入狱关键词句解析不出(证明入狱识别确来自单一真源·非本文件私存)');
})();

console.log('===== A·必过用例(治罪/免职→character=陈奇瑜 的 dismissal) =====');
(function () {
  const ctx = fixtureCtx();
  [
    '革职拿问陈奇瑜',            // ② 动词在前·处置中介"拿问"曾被当人名
    '查办陈奇瑜',                // ① 动词表缺口
    '圈禁陈奇瑜',                // ① 动词表缺口
    '削籍下狱陈奇瑜',            // ② 曾产垃圾串
    '革职陈奇瑜',                // ② 3字名被截成"陈奇"
    '陈奇瑜革职',                // 人名在前
    '着锦衣卫拿问陈奇瑜下诏狱'   // 长句·处置中介+末尾入狱关键词(复用 _TM_IMPRISON_RE)
  ].forEach(t => {
    const a = ctx.extractEdictActions(t);
    assert(dismissed(a, '陈奇瑜'), '「' + t + '」应解析出 character=陈奇瑜 的 dismissal·实=' + JSON.stringify(a.dismissals));
  });
})();

console.log('===== B·名长健壮:2字名 / 4字复姓名 各一例 =====');
(function () {
  const ctx = fixtureCtx();
  assert(dismissed(ctx.extractEdictActions('革职杨鹤，以儆效尤。'), '杨鹤'), '2字名「革职杨鹤」应摘职·实=' + JSON.stringify(ctx.extractEdictActions('革职杨鹤，以儆效尤。').dismissals));
  assert(dismissed(ctx.extractEdictActions('查办长孙无忌'), '长孙无忌'), '4字复姓「查办长孙无忌」应摘职');
  assert(dismissed(ctx.extractEdictActions('长孙无忌下诏狱'), '长孙无忌'), '4字复姓·人名在前「长孙无忌下诏狱」应摘职');
})();

console.log('===== C·反例:不含治罪动词的句子不误产 dismissal =====');
(function () {
  const ctx = fixtureCtx();
  assert(!dismissed(ctx.extractEdictActions('着孙传庭督师陕西，剿灭流寇。'), '孙传庭'), '任命句不应误产 dismissal');
  assert(ctx.extractEdictActions('着孙传庭督师陕西，剿灭流寇。').dismissals.length === 0, '任命句 dismissals 应为空');
  assert(ctx.extractEdictActions('陈奇瑜奏报流寇日炽，请发帑金以济军需。').dismissals.length === 0, '纯叙事句不产 dismissal');
  assert(!dismissed(ctx.extractEdictActions('缉拿归案，孙传庭奏捷凯旋。'), '孙传庭'), '跨子句(缉拿归案，孙传庭…)不误抓下一句主语');
  // 未在册名不误产(垃圾串防线)
  assert(ctx.extractEdictActions('革职拿问某贪吏').dismissals.length === 0, '未在册名(某贪吏)解析不出·防垃圾串');
})();

console.log('===== D·任免同员不双记:升迁诏免旧职者被过滤(保留既有契约) =====');
(function () {
  const ctx = makeCtx([ ch('升官者', { officialTitle: '兵部侍郎' }) ]);
  const a = ctx.extractEdictActions('命升官者为兵部尚书，并免去升官者旧职。');
  assert(!dismissed(a, '升官者'), '被同诏擢升者不应同时产 dismissal·实=' + JSON.stringify(a.dismissals));
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
