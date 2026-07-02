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

  // ───────── G5 · todoWrite 任务表(C刀) ─────────
  console.log('— G5 todoWrite —');
  ok(AA.AGENT_TOOLS.some(function (t) { return t.name === 'todoWrite'; }), 'G5 todoWrite 已注册进工具清单');
  var dT = AA.makeDraft({ name: '甲' });
  var rT1 = AA.dispatchTool(dT, 'todoWrite', { todos: [{ content: '补势力', status: 'in_progress' }, { content: '补人物', status: 'pending' }] });
  ok(rT1.ok && rT1.todos === 2 && /恰保持一项 in_progress/.test(rT1.message), 'G5 合法整表 → 成功消息自带用法再教育');
  var rT2 = AA.dispatchTool(dT, 'todoWrite', { todos: [{ content: 'a', status: 'in_progress' }, { content: 'b', status: 'in_progress' }] });
  ok(rT2.ok && /收敛为一项/.test(rT2.message), 'G5 两项同时 in_progress → 警示收敛');
  var rT3 = AA.dispatchTool(dT, 'todoWrite', { todos: [{ content: 'a', status: '做完了' }] });
  ok(rT3.ok === false && /status 非法/.test(rT3.reason), 'G5 非法 status → 报错教学(枚举值)');
  var rT4 = AA.dispatchTool(dT, 'todoWrite', { todos: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'completed' }] });
  ok(rT4.ok && rT4.todos === 0 && /已自动清空/.test(rT4.message), 'G5 全部 completed → 表自动清空');

  // 经 loop:任务表 3 轮未更新 → 节流提醒折叠进工具结果(不伪造独立轮)
  var tq = 0;
  var rT5 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '多步任务', {
    caller: function () {
      tq++;
      if (tq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'td1', name: 'todoWrite', input: { todos: [{ content: '补齐三将属性', status: 'in_progress' }, { content: '补齐势力资料', status: 'pending' }] } }] });
      if (tq <= 5) return Promise.resolve({ text: '', toolCalls: [{ id: 'rq' + tq, name: 'searchEntities', input: { query: '将' + tq } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'f3', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var _allToolText = rT5.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat((m.toolResults || []).map(function (t) { return t.content; })); }, []).join('\n');
  ok(_allToolText.indexOf('<系统提醒>任务表已') >= 0 && _allToolText.indexOf('补齐三将属性') >= 0, 'G5 ≥3轮未更新+有未完项 → 提醒折叠进工具结果');
  ok(!rT5.conversation.some(function (m) { return m.role === 'user' && /任务表已/.test(m.text || ''); }), 'G5 提醒不独立成 user 消息(不伪造轮边界)');
  ok(Array.isArray(rT5.todos) && rT5.todos.length === 2, 'G5 收尾 result.todos 面向 UI 暴露(2 项未完)');

  // ───────── G4 · 外部修改新鲜度防护(D刀) ─────────
  console.log('— G4 外部修改防护 —');
  var dExt = AA.makeDraft({ name: '甲', factions: [{ name: '明' }] });
  var xq = 0;
  var rX = await AA.runAuthoringLoop(dExt, '测试外部修改', {
    caller: function () {
      xq++;
      if (xq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'x1', name: 'applyEdit', input: { path: 'name', value: '乙' } }] });
      if (xq === 2) {
        dExt.factions.push({ name: '清' });   // 模拟:agent 运行期间用户在编辑器里改了 factions
        return Promise.resolve({ text: '', toolCalls: [{ id: 'x2', name: 'applyEdit', input: { path: 'factions.0.name', value: '后金' } }] });
      }
      if (xq === 3) return Promise.resolve({ text: '', toolCalls: [{ id: 'x3', name: 'getFields', input: { paths: ['factions'] } }] });   // 按提示重读→刷新指纹
      if (xq === 4) return Promise.resolve({ text: '', toolCalls: [{ id: 'x4', name: 'applyEdit', input: { path: 'factions.0.name', value: '后金' } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'xf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var trX = rX.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  ok(rX.draft.name === '乙', 'G4 无外部改动的写正常落地');
  var xErr = trX.filter(function (t) { return t.content.indexOf('被外部修改') >= 0; });
  ok(xErr.length === 1 && xErr[0].id === 'x2', 'G4 外部改动后的写被拦(external-modified·勿覆盖用户改动)');
  ok(rX.draft.factions[0].name === '后金' && rX.draft.factions[1].name === '清', 'G4 重读刷新指纹后写放行·用户新增的势力保住');
  // 自家连续写不误报
  var dSelf = AA.makeDraft({ name: '甲' });
  var sq3 = 0;
  var rSelf = await AA.runAuthoringLoop(dSelf, '连续写', {
    caller: function () {
      sq3++;
      if (sq3 === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 's1', name: 'applyEdit', input: { path: 'name', value: '乙' } }] });
      if (sq3 === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 's2', name: 'applyEdit', input: { path: 'name', value: '丙' } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'sf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var trSelf = rSelf.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  ok(rSelf.draft.name === '丙' && !trSelf.some(function (t) { return t.content.indexOf('被外部修改') >= 0; }), 'G4 自家连续写同区段不误报(写后指纹即刷新)');

  // ───────── G7 · todo 收尾闸(CC verification nudge 对照) ─────────
  console.log('— G7 todo 收尾闸 —');
  // 7a: finish 时任务表有未完项 → 顶回一次(带原因+出路)·完成后 finish 放行
  var vq = 0;
  var rV = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '两步任务', {
    caller: function () {
      vq++;
      if (vq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'v1', name: 'todoWrite', input: { todos: [{ content: '补三将属性', status: 'in_progress' }, { content: '补势力资料', status: 'pending' }] } }] });
      if (vq === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 'v2', name: 'finish', input: { summary: '做完了' } }] });   // 未完就想溜
      if (vq === 3) return Promise.resolve({ text: '', toolCalls: [{ id: 'v3', name: 'todoWrite', input: { todos: [{ content: '补三将属性', status: 'completed' }, { content: '补势力资料', status: 'completed' }] } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'v4', name: 'finish', input: { summary: '真做完了' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var trV = rV.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  var vBounce = trV.filter(function (t) { return t.content.indexOf('todos-pending') >= 0 || t.content.indexOf('项未完成') >= 0; });
  ok(vBounce.length === 1 && vBounce[0].id === 'v2', 'G7 未完 todo 时 finish → 顶回(带项数与出路)');
  ok(vBounce[0].content.indexOf('补三将属性') >= 0 && vBounce[0].content.indexOf('todoWrite 更新任务表') >= 0, 'G7 顶回消息点名未完项+给"确不需要做"的出路');
  ok(rV.finished && rV.stopReason === 'finish' && rV.todos.length === 0, 'G7 完成任务表后 finish 放行·表已自动清');
  // 7b: 只顶一次(防死循环)——agent 坚持 finish 第二次放行·剩余 todo 经 result.todos 交 UI
  var wq = 0;
  var rW = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '固执收尾', {
    caller: function () {
      wq++;
      if (wq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'w1t', name: 'todoWrite', input: { todos: [{ content: '某项', status: 'pending' }] } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'wf' + wq, name: 'finish', input: { summary: '就这样' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(rW.finished && wq === 3, 'G7 顶回仅一次·坚持 finish 第二次放行(防死循环)');
  ok(rW.todos.length === 1 && rW.todos[0].content === '某项', 'G7 未完项经 result.todos 交 UI(用户可见"没做完啥")');
  // 7c: noToolCalls nudge 感知任务表(点名未完项)
  var nq = 0;
  var rN = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '卡壳任务', {
    caller: function () {
      nq++;
      if (nq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'n1', name: 'todoWrite', input: { todos: [{ content: '补齐某将', status: 'in_progress' }] } }] });
      if (nq === 2) return Promise.resolve({ text: '我想想…', toolCalls: [] });   // 卡壳没调工具
      if (nq === 3) return Promise.resolve({ text: '', toolCalls: [{ id: 'n3', name: 'todoWrite', input: { todos: [{ content: '补齐某将', status: 'completed' }] } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'nf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var nNudge = rN.conversation.filter(function (m) { return m.role === 'user' && /没有调用任何工具/.test(m.text || ''); });
  ok(nNudge.length === 1 && nNudge[0].text.indexOf('补齐某将') >= 0, 'G7 noToolCalls nudge 点名未完 todo(有的放矢)');
  ok(rN.finished, 'G7 nudge 后正常收尾');

  console.log('\nPASS · ' + pass + ' 断言');
})().catch(function (e) { console.error(e); process.exit(1); });
