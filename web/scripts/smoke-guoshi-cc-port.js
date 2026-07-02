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

  // ───────── G8 · 宏压缩 + 超限自愈(CC autocompact 对照) ─────────
  console.log('— G8 宏压缩/超限自愈 —');
  // 8a: 超限文案识别(四 provider + 阴性)
  ok(AA._OVERFLOW_RE.test("This model's maximum context length is 65536 tokens. However, your messages resulted in 80000 tokens"), 'G8 识别 OpenAI/DeepSeek 超限文案');
  ok(AA._OVERFLOW_RE.test('prompt is too long: 210942 tokens > 200000 maximum'), 'G8 识别 Anthropic 超限文案');
  ok(AA._OVERFLOW_RE.test('The input token count (1189256) exceeds the maximum number of tokens allowed (1048576)'), 'G8 识别 Gemini 超限文案');
  ok(AA._OVERFLOW_RE.test('input length and max_tokens exceed context limit: 195000 + 8000 > 200000'), 'G8 识别 Anthropic 新式超限文案');
  ok(!AA._OVERFLOW_RE.test('Invalid request: model `gpt-99` not found') && !AA._OVERFLOW_RE.test('invalid tool schema at tools[3]'), 'G8 普通 400 不误判为超限');
  // 8b: 尾部切片轮界对齐(落在 tool 上前挪含配对 assistant·短对话整段保留)
  var cv8 = [{ role: 'user', text: 'u' }, { role: 'assistant', text: '', toolCalls: [{ id: 'a', name: 'x', input: {} }] }, { role: 'tool', toolResults: [] }, { role: 'assistant', text: '', toolCalls: [{ id: 'b', name: 'y', input: {} }] }, { role: 'tool', toolResults: [] }];
  var t8 = AA._compactTailSlice(cv8, 3);
  ok(t8.length === 4 && t8[0].role === 'assistant' && t8[0].toolCalls[0].id === 'a', 'G8 切片起点落 tool → 前挪对齐配对 assistant(不孤儿化)');
  ok(AA._compactTailSlice(cv8, 9).length === 5 && AA._compactTailSlice(cv8, 0).length === 0, 'G8 短对话整段保留·keep=0 全压');
  // 8c: 主动宏压缩经 loop——对话吃到高水位 → 摘要请求 → 替换旧对话 → 继续收尾
  var big8 = '事'.repeat(30000);
  var mq = 0, sumReqs = 0;
  var r8 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '压缩演练', {
    macroCompactAt: 0.2, macroKeepTail: 0,
    caller: function (conv, tools2) {
      if (tools2 && tools2.length === 1 && tools2[0].name === 'submitSummary') {
        sumReqs++;
        ok(String(conv[0].text).indexOf('七段') >= 0 && String(conv[0].text).indexOf('压缩演练') >= 0, 'G8 摘要请求带七段要求+拍平的对话记录');
        return Promise.resolve({ text: '', toolCalls: [{ id: 'sm', name: 'submitSummary', input: { summary: '①用户要求压缩演练 ②已改 name 字段并写入长注 ③任务表无未完项 ④草稿结构完好 ⑤无错误 ⑥正准备收尾 ⑦下一步:finish。' + '摘'.repeat(200) } }] });
      }
      mq++;
      if (mq === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'm1', name: 'applyEdit', input: { path: 'name', value: big8 } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'mf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 200000
  });
  ok(sumReqs === 1 && r8.macroCompactions === 1, 'G8 高水位触发宏压缩恰一次');
  ok(r8.finished && r8.conversation[0].text.indexOf('【前情摘要·上下文已压缩】') === 0, 'G8 压缩后对话以前情摘要开头·任务照常收尾');
  ok(r8.conversation[0].text.indexOf('当前草稿最新状态') >= 0 && r8.conversation[0].text.indexOf('当中断从未发生') >= 0, 'G8 摘要头带草稿重读+续作指令(不复述不寒暄)');
  ok(JSON.stringify(r8.conversation).length < big8.length, 'G8 旧巨型内容真被压掉(对话体量骤减)');
  ok(r8.transcript.some(function (t) { return t.name === 'macroCompact' && t.result && t.result.ok; }), 'G8 宏压缩留 transcript 记录(UI 可见)');
  // 8d: 超限被动自愈——真实请求抛 overflow → 压缩 → 重试本轮成功
  var oq = 0, oSum = 0;
  var fatReq = '需求很长' + '求'.repeat(28000);
  var r9 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), fatReq, {
    macroKeepTail: 0,
    caller: function (conv, tools2) {
      if (tools2 && tools2.length === 1 && tools2[0].name === 'submitSummary') { oSum++; return Promise.resolve({ text: '①用户给了超长需求 ②尚未改动 ③无任务表 ④草稿完好 ⑤首轮请求超窗 ⑥压缩自救 ⑦下一步:直接完成需求并 finish。' + '摘'.repeat(200), toolCalls: [] }); }
      oq++;
      if (oq === 1) { var eo = new Error('上下文超限（对话+工具已超过模型窗口）：prompt is too long'); eo.status = 400; eo.overflow = true; return Promise.reject(eo); }
      return Promise.resolve({ text: '', toolCalls: [{ id: 'of', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(oSum === 1 && r9.finished && r9.macroCompactions === 1, 'G8 超限 → 宏压缩 → 重试本轮成功(纯文本摘要兜底也认)');
  ok(r9.iterations <= 2, 'G8 超限重试不计入迭代预算');
  // 8e: 对话太小压了也救不了 → 不浪费摘要调用·失败原样抛·partial 挂已完成工作
  var pq = 0;
  var e8 = null;
  try {
    await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '小对话', {
      caller: function () {
        pq++;
        var eo = new Error('上下文超限（对话+工具已超过模型窗口）：prompt is too long'); eo.status = 400; eo.overflow = true; return Promise.reject(eo);
      }, conventions: '', blockingChecks: [], maxTokens: 5000000
    });
  } catch (ex) { e8 = ex; }
  ok(e8 && pq === 1, 'G8 小对话超限不尝试压缩(不多打一次摘要调用)·原样失败');
  ok(e8 && e8.partial && Array.isArray(e8.partial.transcript) && Array.isArray(e8.partial.todos) && e8.partial.conversation, 'G8 终局失败 err.partial 保留已完成工作(调用方可续)');
  // 8f: 非瞬态 API 错误(鉴权等)也挂 partial
  var e9 = null;
  try {
    await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '鉴权炸', {
      caller: function () { var ea = new Error('API Key 无效（HTTP 401）'); ea.status = 401; return Promise.reject(ea); },
      conventions: '', blockingChecks: [], maxTokens: 5000000
    });
  } catch (ex2) { e9 = ex2; }
  ok(e9 && e9.partial && e9.partial.draft, 'G8 非瞬态错误同样挂 partial(草稿引用在内·改动不丢)');

  // ───────── G9 · 运行中插话 steering(CC message queue 对照) ─────────
  console.log('— G9 运行中插话 —');
  // 9a: 跑动中 steer → 本轮工具结果后注入 → 下一轮照办 → 收尾
  var sa = 0, saOk = null;
  var rS = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '先查一下', {
    caller: function () {
      sa++;
      if (sa === 1) { saOk = AA.steer('把名字改成乙'); return Promise.resolve({ text: '', toolCalls: [{ id: 'sa1', name: 'getFields', input: { paths: ['name'] } }] }); }
      if (sa === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 'sa2', name: 'applyEdit', input: { path: 'name', value: '乙' } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'saf', name: 'finish', input: { summary: '按新指示改完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(saOk === true, 'G9 运行中 steer() 返回 true(已入队)');
  var sMsg = rS.conversation.filter(function (m) { return m.role === 'user' && /用户在你工作期间发来新指示/.test(m.text || ''); });
  ok(sMsg.length === 1 && sMsg[0].text.indexOf('把名字改成乙') >= 0 && sMsg[0].text.indexOf('勿忽略') >= 0, 'G9 插话包装注入(CC 必须处理·勿忽略语义)');
  ok(rS.finished && rS.draft.name === '乙' && rS.steered === 1, 'G9 agent 按插话照办·result.steered 计数');
  ok(rS.transcript.some(function (t) { return t.name === 'steer'; }), 'G9 插话留 transcript 记录(UI 可见)');
  // 9b: 插话与 finish 同轮竞速 → finish 顶回(steer-pending)·处理完再收尾
  var sb = 0;
  var rS2 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '改个名', {
    caller: function () {
      sb++;
      if (sb === 1) { AA.steer('慢着·改成丙不是乙'); return Promise.resolve({ text: '', toolCalls: [{ id: 'sb1', name: 'applyEdit', input: { path: 'name', value: '乙' } }, { id: 'sbf', name: 'finish', input: { summary: '完' } }] }); }
      if (sb === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 'sb2', name: 'applyEdit', input: { path: 'name', value: '丙' } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'sbf2', name: 'finish', input: { summary: '真完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var sbTr = rS2.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  ok(sbTr.some(function (t) { return t.id === 'sbf' && t.content.indexOf('steer-pending') >= 0; }), 'G9 未处理插话时 finish → 顶回(steer-pending)');
  ok(rS2.finished && rS2.draft.name === '丙', 'G9 顶回后按新指示改·再收尾成功');
  // 9c: 无活跃运行 steer → false
  ok(AA.steer('没人在跑') === false, 'G9 无活跃运行时 steer 返回 false');
  // 9d: 模型卡壳(没调工具)时插话即推动力·不打泛泛 nudge
  var sd = 0;
  var rS3 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '干活', {
    caller: function () {
      sd++;
      if (sd === 1) { AA.steer('直接把名字改成丁然后结束'); return Promise.resolve({ text: '我想想…', toolCalls: [] }); }
      if (sd === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 'sd2', name: 'applyEdit', input: { path: 'name', value: '丁' } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'sdf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(!rS3.conversation.some(function (m) { return m.role === 'user' && /没有调用任何工具/.test(m.text || ''); }), 'G9 卡壳时插话顶替泛泛 nudge(不耗配额)');
  ok(rS3.finished && rS3.draft.name === '丁', 'G9 卡壳被插话重新推动·照办收尾');
  // 9e: UI 接线源契约(编辑器输入框运行中回车 → onSteer·运行态占位提示插话)
  var uiSrc = require('fs').readFileSync(path.join(__dirname, '..', 'editor-authoring-agent-ui.js'), 'utf8');
  ok(/ui\.running && typeof onSteer === 'function'\) onSteer\(\)/.test(uiSrc) && /function onSteer\(\)/.test(uiSrc), 'G9 UI 接线:运行中回车路由到 onSteer');
  ok(uiSrc.indexOf('回车可随时插话') >= 0 && /AA\.steer\(t\)/.test(uiSrc), 'G9 UI 接线:运行态占位提示+steer 调用');

  // ───────── H1 · 输出截断自愈(CC max_tokens 动态调整对照) ─────────
  console.log('— H1 输出截断自愈 —');
  // 1: parse 层 surfacing(三 provider)·斩断的 toolCall 不再吞成空入参执行
  var pT = AA._parseOpenAI({ choices: [{ finish_reason: 'length', message: { content: '写到一半', tool_calls: [{ id: 't1', function: { name: 'applyEdit', arguments: '{"path":"na' } }] } }] });
  ok(pT.truncated === true && pT.badToolJson === true && pT.toolCalls.length === 0, 'H1 OpenAI 截断+斩断JSON → truncated/badToolJson·坏调用不执行(旧行为:空入参静默跑)');
  var pC = AA._parseOpenAI({ choices: [{ finish_reason: 'stop', message: { content: '', tool_calls: [{ id: 't2', function: { name: 'applyEdit', arguments: '{"path":"name","value":"乙"}' } }] } }] });
  ok(pC.truncated === false && !pC.badToolJson && pC.toolCalls[0].input.value === '乙', 'H1 正常响应不受影响');
  ok(AA._parseAnthropic({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'x' }] }).truncated === true, 'H1 Anthropic stop_reason=max_tokens → truncated');
  ok(AA._parseGemini({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'x' }] } }] }).truncated === true, 'H1 Gemini MAX_TOKENS → truncated');
  // 2: 循环自愈——截断 → maxTok ×2 重试本轮·斩断响应整体弃置·bump 后全程沿用·不计迭代
  var hq = 0, seenTok = [];
  var rH = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '大改动', {
    caller: function (conv, tools2, cOpts) {
      hq++; seenTok.push(cOpts && cOpts.maxTok);
      if (hq === 1) return Promise.resolve({ text: '写到一半被截', toolCalls: [], truncated: true });
      if (hq === 2) return Promise.resolve({ text: '又截', toolCalls: [{ id: 'h2', name: 'applyEdit', input: { path: 'name', value: '坏' } }], truncated: true, badToolJson: true });
      if (hq === 3) return Promise.resolve({ text: '', toolCalls: [{ id: 'h3', name: 'applyEdit', input: { path: 'name', value: '乙' } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'hf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  ok(seenTok[1] === 6000 && seenTok[2] === 12000 && seenTok[3] === 12000, 'H1 截断 → 输出上限 6000→12000 且 bump 后全程沿用(实测 ' + seenTok.slice(1).join('/') + ')');
  ok(rH.finished && rH.draft.name === '乙', 'H1 斩断响应整体弃置(「坏」未落地)·重试后正常改动落地');
  ok(rH.iterations === 2, 'H1 截断重试不计迭代(实 2 轮:改动+finish)');
  // 3: bump 耗尽(2次)后不再无限重试·走正常 noToolCalls 路径收场
  var hx = 0;
  var rH2 = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '永远截断', {
    caller: function () {
      hx++;
      if (hx <= 3) return Promise.resolve({ text: '截', toolCalls: [], truncated: true });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'hxf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000, maxNoToolNudges: 1
  });
  ok(rH2.finished && hx === 4, 'H1 bump 耗尽后第3次截断按 noToolCalls 处理(nudge→finish)·不无限重试');

  // ───────── H3 · 会话线程持久化/恢复(CC session resume 对照) ─────────
  console.log('— H3 会话恢复 —');
  // 1: initialTodos 回灌——恢复的未完任务表接着管收尾(G7 闸认账)
  var rq2 = 0;
  var rR = await AA.runAuthoringLoop(AA.makeDraft({ name: '甲' }), '继续上次的活', {
    initialTodos: [{ content: '上次没补完的势力', status: 'in_progress' }, { content: '坏项', status: '不合法' }, { content: '', status: 'pending' }],
    caller: function () {
      rq2++;
      if (rq2 === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'r1', name: 'finish', input: { summary: '想直接溜' } }] });
      if (rq2 === 2) return Promise.resolve({ text: '', toolCalls: [{ id: 'r2', name: 'todoWrite', input: { todos: [{ content: '上次没补完的势力', status: 'completed' }] } }] });
      return Promise.resolve({ text: '', toolCalls: [{ id: 'rf', name: 'finish', input: { summary: '完' } }] });
    }, conventions: '', blockingChecks: [], maxTokens: 5000000
  });
  var rTr = rR.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  var rB = rTr.filter(function (t) { return t.content.indexOf('todos-pending') >= 0; });
  ok(rB.length === 1 && rB[0].content.indexOf('上次没补完的势力') >= 0, 'H3 恢复的任务表接着管收尾(finish 被 G7 闸按恢复项顶回)');
  ok(rR.finished && rR.todos.length === 0, 'H3 补完恢复项后正常收尾');
  ok(!JSON.stringify(rR.todos).match(/坏项/), 'H3 非法 status/空 content 的恢复项被滤掉');
  // 2: UI 源契约(存/取/清/回灌四处接线·jsdom 行为由真机验)
  var uiSrc3 = require('fs').readFileSync(path.join(__dirname, '..', 'editor-authoring-agent-ui.js'), 'utf8');
  ok(/ui\.conversation = res\.conversation;[^\n]*\n\s*_saveThread\(res\);/.test(uiSrc3.replace(/\r/g, '')), 'H3 UI:跑完即存线程(_saveThread 紧随 conversation 赋值)');
  ok(/_maybeRestoreThread\(\); _autoWinMode\(\); \}/.test(uiSrc3) && /48 \* 3600 \* 1000/.test(uiSrc3), 'H3 UI:开面板自动恢复(48h 新鲜度守卫)+首开默认全屏窗');
  ok(/pack\.sid !== _scenKey\(\)/.test(uiSrc3), 'H3 UI:剧本 id 对不上不恢复(跨剧本不串线程)');
  ok(/900000/.test(uiSrc3) && /_compactOldToolResults\(copy, 4\)/.test(uiSrc3), 'H3 UI:存前压缩副本+体量上限护 quota');
  var _clrN = (uiSrc3.match(/_clearThread\(\);/g) || []).length;
  ok(_clrN >= 3, 'H3 UI:新对话/撤销/回退检查点三处清存档(实 ' + _clrN + ' 处)');
  ok(/initialTodos: _rtd,/.test(uiSrc3) && /ui\._restoredTodos = null;/.test(uiSrc3), 'H3 UI:恢复的任务表一次性回灌 initialTodos');

  // ───────── H4 · API 连接·模型选择弹层(模型徽即入口·owner 定案) ─────────
  console.log('— H4 API连接·模型弹层 —');
  var uiSrc4 = require('fs').readFileSync(path.join(__dirname, '..', 'editor-authoring-agent-ui.js'), 'utf8');
  ok(/id="tm-aa-modelpop"/.test(uiSrc4) && /id="tm-aa-api-url"/.test(uiSrc4) && /id="tm-aa-api-key"/.test(uiSrc4) && /id="tm-aa-api-detect"/.test(uiSrc4) && /id="tm-aa-api-model"/.test(uiSrc4) && /id="tm-aa-api-save"/.test(uiSrc4), 'H4 弹层五件套(地址/Key/检测/模型选/保存)在位');
  ok(/generativelanguage\\\.googleapis\\\.com/.test(uiSrc4) && /anthropic-dangerous-direct-browser-access/.test(uiSrc4) && /'Authorization': 'Bearer ' \+ \(key \|\| ''\)/.test(uiSrc4), 'H4 检测覆盖三家 provider(Gemini/Anthropic/OpenAI兼容含中转)');
  ok(/\['tm_P_lite', 'tm_P'\]\.forEach/.test(uiSrc4) && /localStorage\.setItem\('tm_api'/.test(uiSrc4), 'H4 保存写 tm_api+镜像游戏存档 P.ai(否则被存档优先级压掉)');
  ok(/_refreshModelChip/.test(uiSrc4) && /'配置 API'/.test(uiSrc4) && /classList\.toggle\('warn', !ok\)/.test(uiSrc4), 'H4 模型徽未配置显「配置 API」警示态');
  var wsSrc = require('fs').readFileSync(path.join(__dirname, '..', 'preview', 'scenario-editor-reset-preview.html'), 'utf8');
  ok(/\.je-aa-apicfg \{ display: none !important; \}|\.je-aa-stop, \.je-aa-apicfg \{ display: none !important; \}/.test(wsSrc), 'H4 工坊旧 API 抽屉已退役(功能移模型徽弹层)');

  // ───────── H5 · 权限模式(问策/共审/放行·CC permission modes 对照·owner 点名缺失件) ─────────
  console.log('— H5 权限模式 —');
  var uiSrc5 = require('fs').readFileSync(path.join(__dirname, '..', 'editor-authoring-agent-ui.js'), 'utf8');
  ok(/id="tm-aa-perm"/.test(uiSrc5) && /id="tm-aa-permpop"/.test(uiSrc5) && /data-pm="plan"/.test(uiSrc5) && /data-pm="review"/.test(uiSrc5) && /data-pm="auto"/.test(uiSrc5), 'H5 权限 pill+弹层三模式(问策/共审/放行)在位');
  ok(/ui\.planMode = p\.mode === 'plan'/.test(uiSrc5) && /ui\.autonomy = p\.mode === 'auto' \? 'auto' : 'review'/.test(uiSrc5) && /ui\.allowDestructive = p\.allowDestructive !== false/.test(uiSrc5), 'H5 模式映射既有引擎旗标(planMode/autonomy/allowDestructive·非新权限系统)');
  ok(/localStorage\.setItem\(PERM_KEY/.test(uiSrc5) && /_applyPerm\(_loadPerm\(\)\)/.test(uiSrc5), 'H5 模式持久+启动即布防');
  ok(/id="tm-aa-perm-danger"/.test(uiSrc5), 'H5 危险操作开关(允许删除/改名联动)');
  var wsSrc5 = require('fs').readFileSync(path.join(__dirname, '..', 'preview', 'scenario-editor-reset-preview.html'), 'utf8');
  ok(/\.je-aa-planmode:not\(\.je-aa-fewshot\) \{ display: none !important; \}/.test(wsSrc5), 'H5 工坊旧计划模式勾选退役(升级为问策·少样例开关保留)');

  console.log('\nPASS · ' + pass + ' 断言');
})().catch(function (e) { console.error(e); process.exit(1); });
