#!/usr/bin/env node
// scripts/smoke-tc-keju-wave.js
// 刀A3·科举族裸 LLM 口补时空约束 · 逐口断言（2026-07-19）
//   Slice A：_buildTemporalConstraint 机制自检（clauseOnly 带总纲铁律 + mentionedNames 逐人标生死；full 带在世名单）
//   Slice B：科举族 32 处注入口逐口 grep 断言（marker 命中 → typeof 守卫 → 调用 → mode 正确 → scan/mentionedNames 传递）
//   Slice C：2 处「不适用」口断言（有理由注释、无约束注入）+ 每文件注入计数对账
// 不真调 LLM：抽 tm-ai-infra.js 时空约束段在 vm 沙箱跑；注入口走源码断言。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let PASS = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } PASS++; }
function readSrc(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }

// ── Slice A：机制自检（借 tm-ai-infra 真代码段）──
function sliceA() {
  const start = PASS;
  const infra = fs.readFileSync(path.join(ROOT, 'tm-ai-infra.js'), 'utf8');
  const si = infra.indexOf('function _buildTemporalConstraint(ch, opts)');
  const ei = infra.indexOf('/** 构建长期行动/长期诏书/长期政策摘要·注入推演 sysP');
  assert(si >= 0 && ei > si, 'tm-ai-infra.js 须含时空约束代码段');
  const ctx = {
    console: { log(){}, warn(){}, error(){} },
    Math, JSON, Object, Array, RegExp, Number, String, Boolean
  };
  ctx.GM = { turn: 7, year: 1627, chars: [
    { name: '在世卿', alive: true, faction: '本朝', officialTitle: '吏部尚书' },
    { name: '已故公', alive: false, deathTurn: 5, faction: '本朝' }
  ] };
  ctx.P = { time: { year: 1627 }, playerInfo: { factionName: '本朝' } };
  ctx.getTSText = () => '天启七年·九月';
  ctx.findCharByName = (n) => (ctx.GM.chars || []).filter(c => c && c.name === n)[0] || null;
  vm.createContext(ctx);
  vm.runInContext(infra.slice(si, ei), ctx, { filename: 'extracted-tc.js' });

  // clauseOnly：带总纲铁律、不带在世大名单、mentionedNames 仍逐人标生死（改革者小传/答卷等 JSON 口所依赖）
  const clause = ctx._buildTemporalConstraint(null, { clauseOnly: true, mentionedNames: ['在世卿', '已故公', '查无此人'] });
  assert(clause.indexOf('本局平行历史·唯一现实铁律') >= 0, 'clauseOnly 应带平行历史总纲');
  assert(clause.indexOf('当前在世人物') < 0, 'clauseOnly 不应带在世大名单（防污染 JSON）');
  assert(clause.indexOf('不得把游戏当前时间之后的史实当既成事实') >= 0, 'clauseOnly 应含「未来史实非既成」铁律');
  assert(clause.indexOf('在世卿（在世·此刻活着可行动）') >= 0, 'clauseOnly+mentioned 在世者应标在世（防书卒）');
  assert(clause.indexOf('已故公（已故·卒于第5回合）') >= 0, 'clauseOnly+mentioned 已故者应标卒于回合');
  assert(clause.indexOf('查无此人') >= 0 && clause.indexOf('不在人物册') >= 0, 'clauseOnly+mentioned 不在册者应提示以 GM 为准');

  // full：带在世名单（自由文口 策问/答卷/廷议所依赖）
  const full = ctx._buildTemporalConstraint(null, { mentionedNames: ['在世卿'] });
  assert(full.indexOf('当前在世人物') >= 0, 'full 应带在世名单');
  assert(full.indexOf('本局平行历史·唯一现实铁律') >= 0, 'full 应带平行历史总纲');
  console.log('  [sliceA] ' + (PASS - start) + ' 断言通过（clauseOnly/full 机制）');
}

// ── Slice B：逐口注入断言 ──
// mode: 'full' | 'clauseOnly' | 'na'（不适用）; scan: 用 _tcScanMentionedNames; mention: 传 mentionedNames
const PORTS = [
  // tm-keju-runtime.js（10）
  { f:'tm-keju-runtime.js', m:'科举体系初始化配置',              mode:'clauseOnly' },
  { f:'tm-keju-runtime.js', m:'开科到期判定',                    mode:'clauseOnly' },
  { f:'tm-keju-runtime.js', m:'地方选拔模拟',                    mode:'clauseOnly' },
  { f:'tm-keju-runtime.js', m:'扫描主考+旧题涉议人物',           mode:'full',       scan:true, mention:true },
  { f:'tm-keju-runtime.js', m:'扫描会试题面涉议人物·批卷统计',   mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-runtime.js', m:'扫描近期事件涉议人物·殿试策问',   mode:'full',       scan:true, mention:true },
  { f:'tm-keju-runtime.js', m:'扫描殿试题面涉议人物·考生档案',   mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-runtime.js', m:'扫描殿试题面涉议人物·答卷essay',  mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-runtime.js', m:'扫描殿试题面涉议人物·主考逐卷批语', mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-runtime.js', m:'扫描殿试题面涉议人物·考官排序建议', mode:'clauseOnly', scan:true, mention:true },
  // tm-keju.js（2·含1不适用）
  { f:'tm-keju.js', m:'扫描时局背景涉议人物·主考题本',           mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju.js', m:'不适用：此口为史实检索器',                mode:'na' },
  // tm-keju-reform-llm.js（7·含1不适用）
  { f:'tm-keju-reform-llm.js', m:'不适用：纯 descriptor',        mode:'na' },
  { f:'tm-keju-reform-llm.js', m:'试点候选推荐',                 mode:'clauseOnly' },
  { f:'tm-keju-reform-llm.js', m:'扫描议题文本涉议人物·朝议预判', mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-reform-llm.js', m:'扫描议题+召对大臣涉议人物·私谈', mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-reform-llm.js', m:'两策对大臣涉议人物·advisor合并', mode:'clauseOnly', mention:true },
  { f:'tm-keju-reform-llm.js', m:'新科目推荐',                   mode:'clauseOnly' },
  { f:'tm-keju-reform-llm.js', m:'科目合理化',                   mode:'clauseOnly' },
  // tm-keju-reformer-bio.js（1）
  { f:'tm-keju-reformer-bio.js', m:'改革者本人涉议人物·改革者小传', mode:'clauseOnly', mention:true },
  // tm-keju-reform-evolution.js（4）
  { f:'tm-keju-reform-evolution.js', m:'改革逐年演进',           mode:'clauseOnly', mention:true },
  { f:'tm-keju-reform-evolution.js', m:'跨代承袭诏书',           mode:'clauseOnly' },
  { f:'tm-keju-reform-evolution.js', m:'改革命名+史评',          mode:'clauseOnly' },
  { f:'tm-keju-reform-evolution.js', m:'改革黑天鹅',            mode:'clauseOnly', mention:true },
  // tm-keju-activation.js（1）
  { f:'tm-keju-activation.js', m:'开科/改革5档评估',            mode:'clauseOnly' },
  // tm-keju-enke.js（2）
  { f:'tm-keju-enke.js', m:'主考涉议人物·恩科题面',            mode:'clauseOnly', mention:true },
  { f:'tm-keju-enke.js', m:'主考涉议人物·恩科谢恩奏疏',        mode:'full',       mention:true },
  // tm-keju-wuju.js（1）
  { f:'tm-keju-wuju.js', m:'主考涉议人物·武举校阅奏疏',        mode:'full',       mention:true },
  // tm-keju-tongzi.js（1）
  { f:'tm-keju-tongzi.js', m:'受抚童子涉议人物·抚摩大典纪事',   mode:'full',       mention:true },
  // tm-keju-school-network.js（1）
  { f:'tm-keju-school-network.js', m:'扫描讲会主稿涉议人物',     mode:'full',       scan:true, mention:true },
  // tm-keju-runtime-keyi.js（4）
  { f:'tm-keju-runtime-keyi.js', m:'扫描议题+已发言涉议人物·廷议大臣发言', mode:'full',       scan:true, mention:true },
  { f:'tm-keju-runtime-keyi.js', m:'扫描议程发言涉议人物·廷议表决精修',   mode:'clauseOnly', scan:true, mention:true },
  { f:'tm-keju-runtime-keyi.js', m:'扫描殿试题面+考生涉议人物·考生答卷',   mode:'full',       scan:true, mention:true },
  { f:'tm-keju-runtime-keyi.js', m:'考生本人涉议人物·进士人物卡',         mode:'clauseOnly', mention:true }
];

// 定位本刀注入注释行：marker 须与「时空约束」同现一行（避与既有小节标题如「§2·试点候选推荐」碰撞）
function findPortIdx(src, m) {
  let from = 0, idx;
  while ((idx = src.indexOf(m, from)) >= 0) {
    const ls = src.lastIndexOf('\n', idx) + 1;
    let le = src.indexOf('\n', idx); if (le < 0) le = src.length;
    if (src.slice(ls, le).indexOf('时空约束') >= 0) return idx;
    from = idx + 1;
  }
  return -1;
}

function sliceB() {
  const start = PASS;
  const cache = {};
  const guardRe = /typeof\s+_buildTemporalConstraint\s*===\s*'function'/;
  PORTS.forEach(function(p) {
    const src = cache[p.f] || (cache[p.f] = readSrc(p.f));
    const mi = findPortIdx(src, p.m);
    assert(mi >= 0, p.f + ' 缺注入 marker：' + p.m);
    const win = src.slice(mi, mi + 600);
    if (p.mode === 'na') {
      assert(win.indexOf('_buildTemporalConstraint(') < 0, p.f + '「不适用」口不应注入约束调用：' + p.m);
      assert(/不适用/.test(win) && /故不注入|不成立/.test(win), p.f + '「不适用」口须给出理由：' + p.m);
      return;
    }
    assert(guardRe.test(win), p.f + ' 口缺 typeof 守卫：' + p.m);
    assert(win.indexOf('_buildTemporalConstraint(') >= 0, p.f + ' 口缺 _buildTemporalConstraint 调用：' + p.m);
    if (p.mode === 'clauseOnly') assert(/clauseOnly:\s*true/.test(win), p.f + ' 口应为 clauseOnly：' + p.m);
    else assert(!/clauseOnly/.test(win.split('_buildTemporalConstraint(')[1].slice(0, 120)), p.f + ' full 口不应带 clauseOnly：' + p.m);
    if (p.scan) assert(win.indexOf('_tcScanMentionedNames(') >= 0, p.f + ' 口应用 _tcScanMentionedNames 扫描：' + p.m);
    if (p.mention) assert(/mentionedNames\s*:/.test(win), p.f + ' 口应传 mentionedNames：' + p.m);
  });
  console.log('  [sliceB] ' + (PASS - start) + ' 断言通过（' + PORTS.length + ' 口逐口）');
}

// ── Slice C：每文件注入计数对账（防漏注/多注）──
function sliceC() {
  const start = PASS;
  const expect = {
    'tm-keju-runtime.js': 10, 'tm-keju.js': 1, 'tm-keju-reform-llm.js': 6,
    'tm-keju-reform-evolution.js': 4, 'tm-keju-reformer-bio.js': 1, 'tm-keju-activation.js': 1,
    'tm-keju-enke.js': 2, 'tm-keju-wuju.js': 1, 'tm-keju-tongzi.js': 1,
    'tm-keju-school-network.js': 1, 'tm-keju-runtime-keyi.js': 4
  };
  let total = 0;
  Object.keys(expect).forEach(function(f) {
    const src = readSrc(f);
    const n = (src.match(/_buildTemporalConstraint\(/g) || []).length;
    assert(n === expect[f], f + ' 注入计数应=' + expect[f] + '（实=' + n + '）');
    total += n;
  });
  assert(total === 32, '科举族总注入应=32（实=' + total + '）');
  // 助手确在 infra 定义
  const infra = fs.readFileSync(path.join(ROOT, 'tm-ai-infra.js'), 'utf8');
  assert(/function _tcScanMentionedNames\s*\(/.test(infra), 'tm-ai-infra.js 须定义 _tcScanMentionedNames');
  console.log('  [sliceC] ' + (PASS - start) + ' 断言通过（32 口计数对账）');
}

sliceA();
sliceB();
sliceC();
console.log('PASS smoke-tc-keju-wave · 共 ' + PASS + ' 断言');
