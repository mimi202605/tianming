#!/usr/bin/env node
// scripts/smoke-temporal-constraint.js
// 平行历史·时空约束战役 smoke（2026-07-19）
//   Slice A：_buildTemporalConstraint 本体——总纲铁律 / 重要度排序 / mentionedNames 强纳标生死 / clauseOnly 省名单 / 已故带卒于回合
//   Slice B：四个零防线 LLM 入口各接上 _buildTemporalConstraint（源码 grep 断言·防退化）
//
// 不真调 LLM：把 tm-ai-infra.js 中三个纯函数抽出·在 vm 沙箱里喂 stub GM/P 跑断言。

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let PASS = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } PASS++; }

// ── 从源码抽出指定顶层函数（含大括号配平·本文件三函数字符串内无 ASCII 花括号，朴素配平安全） ──
function extractFn(src, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(src);
  if (!m) throw new Error('未找到函数 ' + name);
  let depth = 0, started = false;
  for (let j = src.indexOf('{', m.index); j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') { depth--; if (started && depth === 0) return src.slice(m.index, j + 1); }
  }
  throw new Error('大括号未配平 ' + name);
}

function buildSandbox() {
  const infra = fs.readFileSync(path.join(ROOT, 'tm-ai-infra.js'), 'utf8');
  const body = [
    extractFn(infra, '_buildTemporalConstraint'),
    extractFn(infra, '_tcImportanceScore'),
    extractFn(infra, '_tcAppendMentioned')
  ].join('\n\n');

  const ctx = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp
  };
  // 35 个在世：甲1..甲34（无官职·数组序在前）+ 末位放一个有官职的要臣（数组序会被 slice(0,30) 甩掉·须靠排序救回）
  const chars = [];
  for (let i = 1; i <= 34; i++) chars.push({ name: '甲' + i, alive: true });
  chars.push({ name: '首辅张', alive: true, officialTitle: '内阁首辅', rank: 1, importance: '关键' }); // index 34·必须靠排序进前 30
  // mentionedNames 用的活/死角色
  chars.push({ name: '活魏', alive: true });
  chars.push({ name: '某亡', alive: false, deathTurn: 7 });
  // 已故名单用
  chars.push({ name: '魏忠贤', alive: false, deathTurn: 5 });
  ctx.GM = { turn: 3, year: 1627, chars: chars };
  ctx.P = { time: { year: 1627 }, playerInfo: { factionName: '大明' } };
  ctx.getTSText = function(turn) { return '天启七年·九月'; };
  ctx.findCharByName = function(name) { return (ctx.GM.chars || []).filter(function(c){ return c && c.name === name; })[0] || null; };
  vm.createContext(ctx);
  vm.runInContext(body, ctx, { filename: 'extracted-temporal.js' });
  return ctx;
}

// ── Slice A：本体断言 ──
function sliceA() {
  const ctx = buildSandbox();
  const full = ctx._buildTemporalConstraint(null);

  // 1) 平行历史强总纲关键句
  assert(full.indexOf('本局平行历史·唯一现实铁律') >= 0, '总纲标题「本局平行历史·唯一现实铁律」缺失');
  assert(full.indexOf('压倒你的历史知识') >= 0, '总纲「压倒你的历史知识」缺失');
  assert(full.indexOf('生死荣辱只认名单与 GM') >= 0, '总纲末句「生死荣辱只认名单与 GM」缺失');
  assert(full.indexOf('不认史书卒年') >= 0, '总纲「不认史书卒年」缺失');
  assert(full.indexOf('绝不因「真实历史如此」拉回史实') >= 0, '总纲「玩家已介入之事以游戏态为准」规则点缺失');
  assert(full.indexOf('不得把游戏当前时间之后的史实当既成事实') >= 0, '总纲「不得把未来史实当既成」规则点缺失');

  // 2) 重要人物（有 officialTitle）优先入名单——即使数组序在第 35 位也须进前 30
  assert(full.indexOf('当前在世人物') >= 0, '在世名单区块缺失');
  const aliveLine = full.split('\n').filter(function(l){ return l.indexOf('当前在世人物') === 0; })[0] || '';
  assert(aliveLine.indexOf('首辅张') >= 0, '有官职的要臣「首辅张」未因排序进前 30（排序改进失效）');
  assert(aliveLine.indexOf('…等') >= 0, '在世超 30 应带省略号「…等」');

  // 3) 已故名单带卒于回合
  assert(full.indexOf('已故人物') >= 0, '已故名单区块缺失');
  assert(full.indexOf('魏忠贤（卒于第5回合）') >= 0, '已故名单未标「卒于第N回合」');

  // 4) mentionedNames 强制纳入并逐人标生死（在世 + 已故 + 不在册）
  const withMentions = ctx._buildTemporalConstraint(null, { mentionedNames: ['活魏', '某亡', '查无此人'] });
  assert(withMentions.indexOf('本议题所涉人物') >= 0, 'mentionedNames 未生成「本议题所涉人物」区块');
  assert(withMentions.indexOf('活魏（在世·此刻活着可行动）') >= 0, 'mentionedNames 在世者未标「在世」');
  assert(withMentions.indexOf('某亡（已故·卒于第7回合）') >= 0, 'mentionedNames 已故者未标「已故·卒于第N回合」');
  assert(withMentions.indexOf('查无此人') >= 0 && withMentions.indexOf('不在人物册') >= 0, 'mentionedNames 不在册者未提示以 GM 为准');

  // 5) clauseOnly 只带总纲·不带在世大名单
  const clause = ctx._buildTemporalConstraint(null, { clauseOnly: true });
  assert(clause.indexOf('本局平行历史·唯一现实铁律') >= 0, 'clauseOnly 应仍带平行历史总纲');
  assert(clause.indexOf('当前在世人物') < 0, 'clauseOnly 不应携带在世大名单');
  assert(clause.indexOf('已故人物（本局真死者') < 0, 'clauseOnly 不应携带已故大名单');
  // clauseOnly 仍可逐人标生死（少量·不干扰结构化输出）
  const clauseM = ctx._buildTemporalConstraint(null, { clauseOnly: true, mentionedNames: ['某亡'] });
  assert(clauseM.indexOf('某亡（已故·卒于第7回合）') >= 0, 'clauseOnly 下 mentionedNames 仍应标生死');
  assert(clauseM.indexOf('当前在世人物') < 0, 'clauseOnly+mentionedNames 仍不应带在世大名单');

  // 6) 向后兼容：老调用只传 ch·不炸·带总纲
  const legacy = ctx._buildTemporalConstraint({ _memory: [{ turn: 2, event: '受召入对', emotion: '惶恐' }] });
  assert(legacy.indexOf('本局平行历史·唯一现实铁律') >= 0, '旧签名(仅 ch)应仍带新总纲');
  assert(legacy.indexOf('受召入对') >= 0, '旧签名(仅 ch)应仍注入 NPC 关键记忆');

  // 7) 打分：有官职者 > 无官职者
  assert(ctx._tcImportanceScore({ officialTitle: '尚书' }) > ctx._tcImportanceScore({ name: '白丁' }), '打分应让有官职者更靠前');

  console.log('  [sliceA] ' + PASS + ' 断言通过');
}

// ── Slice B：四个零防线 LLM 入口源码 grep（防退化）──
function sliceB() {
  const startPass = PASS;
  const files = [
    { f: 'tm-memorials.js',                 note: '百官奏疏 genMemorialsAI' },
    { f: 'tm-chaoyi-tinyi.js',              note: '廷议 v2/v3 共用 _ty2_genOneSpeech' },
    { f: 'tm-chaoyi-yuqian.js',             note: '御前会议 _yq2_oneAdvisorSpeak' },
    { f: 'tm-faction-npc-llm-decision.js',  note: '势力 NPC LLM 决策 _buildPrompt（clauseOnly）' }
  ];
  files.forEach(function(it) {
    const src = fs.readFileSync(path.join(ROOT, it.f), 'utf8');
    assert(/(?:global\.)?_buildTemporalConstraint\s*\(/.test(src), it.f + ' 缺 _buildTemporalConstraint 调用（' + it.note + '）');
    assert(src.indexOf("typeof") >= 0 && /typeof\s+(?:global\.)?_buildTemporalConstraint\s*===\s*'function'/.test(src), it.f + ' 须以 typeof 守卫注入 _buildTemporalConstraint');
  });
  // faction 决策走 clauseOnly（防大名单干扰 JSON 结构化输出）
  const facSrc = fs.readFileSync(path.join(ROOT, 'tm-faction-npc-llm-decision.js'), 'utf8');
  assert(/_buildTemporalConstraint\s*\([^)]*clauseOnly/.test(facSrc.replace(/\s+/g, ' ')), 'faction 决策应用 clauseOnly 版');
  console.log('  [sliceB] ' + (PASS - startPass) + ' 断言通过（四入口 grep）');
}

sliceA();
sliceB();
console.log('PASS smoke-temporal-constraint · 共 ' + PASS + ' 断言');
