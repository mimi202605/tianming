#!/usr/bin/env node
/* eslint-env node */
'use strict';
/* smoke-guoshi-cc-port — 国师 agent 对照 Claude Code 源码的移植改造 (2026-07-02)
 * A刀 G1 预算核算修真：tokensUsed=下一次请求真实体量(system+工具schema+全对话含入参)——
 *   旧口径只零星累加响应/结果 ≈ 零头·260k 闸形同虚设。
 * A刀 G2 压缩扩到入参：_compactOldToolResults 连早先轮 assistant.toolCalls.input 一并压
 *   (bulkAdd 巨型入参此前永驻上下文)·界限与结果压缩对齐·配对 assistant 保留。
 * (B/C/D 刀断言随后续 commit 追加)
 */
const path = require('path');
const AA = require(path.join(__dirname, '..', 'editor-authoring-agent.js'));
let pass = 0;
function ok(cond, msg) { if (!cond) { console.error('  ✗ FAIL: ' + msg); throw new Error('FAIL: ' + msg); } pass++; console.log('  ✓ ' + msg); }

(async function main() {
  // ───────── G1 · 预算核算修真 ─────────
  console.log('— G1 预算核算修真 —');
  // 1a: 工具 schema 计入——胖 tools 直接吃穿预算·未起一轮即 tokenBudget(旧口径从不计 tools·会照跑)
  var fatTools = [{ name: 'dummy', description: 'x'.repeat(400000), parameters: { type: 'object', properties: {} } }];
  var called = 0;
  var r1 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '测试', {
    caller: function () { called++; return Promise.resolve({ text: '', toolCalls: [] }); },
    tools: fatTools, conventions: '', blockingChecks: [], maxTokens: 90000
  });
  ok(r1.stopReason === 'tokenBudget' && called === 0, 'G1 工具schema计入预算(胖tools→零轮即停·旧口径会照跑到撞窗)');
  ok(r1.tokensBreakdown && r1.tokensBreakdown.tools > 90000, 'G1 tokensBreakdown.tools 真算(' + r1.tokensBreakdown.tools + ')');

  // 1b: assistant 入参计入——巨型 applyEdit value 落进对话后体量如实反映
  var big = '注'.repeat(80000);   // CJK×1.3 ≈ 104k tokens
  var rd = 0;
  var r2 = await AA.runAuthoringLoop(AA.makeDraft({ name: '原' }), '改名', {
    caller: function () {
      rd++;
      if (rd === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'w1', name: 'applyEdit', input: { path: 'name', value: big } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'f1', name: 'finish', input: { summary: '完' } }] });
    },
    conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(r2.finished && r2.tokensBreakdown.conversation > 100000, 'G1 巨型入参计入 conversation(' + r2.tokensBreakdown.conversation + '·旧口径漏算)');
  ok(r2.tokensUsed === r2.tokensBreakdown.system + r2.tokensBreakdown.tools + r2.tokensBreakdown.conversation, 'G1 tokensUsed=三项之和(口径自洽)');

  // ───────── G2 · 压缩扩到入参 ─────────
  console.log('— G2 入参压缩 —');
  var conv = [{ role: 'user', text: 'hi' }];
  for (var r = 0; r < 8; r++) {
    conv.push({ role: 'assistant', text: '', toolCalls: [{ id: 't' + r, name: 'applyEdit', input: { path: 'x', value: '很长的入参内容需要被压缩回收'.repeat(40) } }] });
    conv.push({ role: 'tool', toolResults: [{ id: 't' + r, name: 'applyEdit', content: '一段足够长的结果内容'.repeat(20) }] });
  }
  AA._compactOldToolResults(conv, 6);
  var asst = conv.filter(function (m) { return m.role === 'assistant'; });
  var tools_ = conv.filter(function (m) { return m.role === 'tool'; });
  ok(asst[0].toolCalls[0].input._compacted && asst[1].toolCalls[0].input._compacted, 'G2 最早2轮入参压成占位');
  ok(!asst[2].toolCalls[0].input._compacted && !asst[7].toolCalls[0].input._compacted, 'G2 界限对齐:首个保留轮(第3轮)与最近轮入参保详尽');
  ok(tools_[1].toolResults[0].content.indexOf('[已省略') === 0 && tools_[2].toolResults[0].content.indexOf('[已省略') !== 0, 'G2 结果压缩界限不变(最早2轮压·第3轮起保)');
  ok(asst[0].toolCalls[0].id === 't0' && asst[0].toolCalls[0].name === 'applyEdit', 'G2 id/name 保留(provider 配对不破)');
  var before = JSON.stringify(asst[0].toolCalls[0].input);
  AA._compactOldToolResults(conv, 6);
  ok(JSON.stringify(asst[0].toolCalls[0].input) === before, 'G2 幂等(不套娃)');
  // 小入参不压
  var conv2 = [{ role: 'user', text: 'hi' }];
  for (var r2i = 0; r2i < 8; r2i++) {
    conv2.push({ role: 'assistant', text: '', toolCalls: [{ id: 's' + r2i, name: 'getField', input: { path: 'name' } }] });
    conv2.push({ role: 'tool', toolResults: [{ id: 's' + r2i, name: 'getField', content: 'ok' }] });
  }
  AA._compactOldToolResults(conv2, 6);
  ok(!conv2[1].toolCalls[0].input._compacted && conv2[1].toolCalls[0].input.path === 'name', 'G2 小入参(≤200字)原样不动');

  // ───────── G3 · 重复读去重(B刀) ─────────
  console.log('— G3 重复读去重 —');
  var seq = 0;
  var d3 = AA.makeDraft({ name: '甲', factions: [{ name: '明' }] });
  var r3 = await AA.runAuthoringLoop(d3, '测试去重', {
    caller: function () {
      seq++;
      if (seq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'a1', name: 'getFields', input: { paths: ['name'] } }] });
      if (seq === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 'a2', name: 'getFields', input: { paths: ['name'] } }] });   // 同参重复
      if (seq === 3) return Promise.resolve({ text: '', toolCalls: [{ id: 'w1', name: 'applyEdit', input: { path: 'name', value: '乙' } }] });
      if (seq === 4) return Promise.resolve({ text: '', toolCalls: [{ id: 'a3', name: 'getFields', input: { paths: ['name'] } }] });   // 写后再读→放行
      return Promise.resolve({ text: '', toolCalls: [{ id: 'f1', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var tr3 = r3.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  var g3reads = tr3.filter(function (tr) { return tr.name === 'getFields'; });
  ok(g3reads.length === 3, 'G3 三次 getFields 都有结果条目(结构不缺)');
  ok(g3reads[0].content.indexOf('完全相同') < 0, 'G3 首读正常返回');
  ok(g3reads[1].content.indexOf('完全相同') >= 0 && g3reads[1].content.indexOf('勿重复查询') >= 0, 'G3 同参重复读 → 存根(引用先前结果)');
  ok(g3reads[2].content.indexOf('完全相同') < 0 && g3reads[2].content.indexOf('乙') >= 0, 'G3 写入后同参读放行(拿到新鲜值)');

  // ───────── G3 · 纯勘察防打转(B刀) ─────────
  console.log('— G3 防打转 —');
  var sq = 0;
  var r4 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '测试防打转', {
    caller: function () {
      sq++;
      if (sq <= 4) return Promise.resolve({ text: '', toolCalls: [{ id: 'q' + sq, name: 'searchEntities', input: { query: '查' + sq } }] });   // 各轮不同参·避开去重
      return Promise.resolve({ text: '', toolCalls: [{ id: 'f2', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(r4.conversation.some(function (m) { return m.role === 'user' && /纯勘察/.test(m.text || ''); }), 'G3 连续3轮纯勘察 → 催动手 nudge');
  ok(r4.finished, 'G3 nudge 后正常收尾(不误伤流程)');
  var sq2 = 0;
  var r5 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '审阅一下', {
    reviewOnly: true,
    caller: function () {
      sq2++;
      if (sq2 <= 4) return Promise.resolve({ text: '', toolCalls: [{ id: 'p' + sq2, name: 'searchEntities', input: { query: '查' + sq2 } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'sr', name: 'submitReview', input: { findings: [], summary: '无碍' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(!r5.conversation.some(function (m) { return m.role === 'user' && /纯勘察/.test(m.text || ''); }), 'G3 只读(审阅)模式纯勘察是本分 → 豁免');

  console.log('\nPASS · ' + pass + ' 断言');
})().catch(function (e) { console.error(e); process.exit(1); });
