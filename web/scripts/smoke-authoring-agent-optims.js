#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 国师 agent 工作流程/工具调用四项优化:
//   A 批量读 getFields · B 写后回读 · C 工具调用容错自纠 · D 上下文瘦身+预算反馈
const path = require('path');
const AA = require(path.join(__dirname, '..', 'editor-authoring-agent.js'));
let pass = 0;
function ok(cond, msg) { if (!cond) { console.error('  ✗ FAIL: ' + msg); throw new Error('FAIL: ' + msg); } pass++; console.log('  ✓ ' + msg); }

(async function main() {
  // ───────── A · getFields 批量读 ─────────
  console.log('— A 批量读 getFields —');
  ok(AA.AGENT_TOOLS.some(function (t) { return t.name === 'getFields'; }), 'A getFields 已注册进工具清单');
  var dA = AA.makeDraft({ name: '剧本甲', factions: [{ name: '明' }, { name: '清' }], playerInfo: { factionName: '明' } });
  var rA = AA.dispatchTool(dA, 'getFields', { paths: ['name', 'playerInfo.factionName', 'factions', '不存在.路径'] });
  ok(rA.ok && rA.count === 4, 'A getFields 一次返回多路径(4)');
  var byPath = {}; rA.values.forEach(function (v) { byPath[v.path] = v; });
  ok(byPath['name'].value === '剧本甲' && byPath['playerInfo.factionName'].value === '明', 'A 标量值正确');
  ok(byPath['不存在.路径'].found === false, 'A 缺失路径标 found:false(不炸)');
  ok(AA.dispatchTool(dA, 'getFields', { paths: [] }).ok === false, 'A 空 paths → ok:false');
  // 过大值截断
  var bigArr = []; for (var i = 0; i < 500; i++) bigArr.push({ name: 'x' + i, desc: '一段较长的描述文字用于撑大体积测试'.repeat(3) });
  var dBig = AA.makeDraft({ characters: bigArr });
  var rBig = AA.dispatchTool(dBig, 'getFields', { paths: ['characters'] });
  ok(rBig.values[0].value && rBig.values[0].value._truncated === true && rBig.values[0].value.length === 500, 'A 过大值截断为预览+规模(_truncated)');

  // ───────── C · 工具调用容错自纠 ─────────
  console.log('— C 工具调用容错自纠 —');
  var rC1 = AA.dispatchTool(dA, 'getfield', { path: 'name' });   // 大小写错/近似名
  ok(rC1.ok === false && /未知工具/.test(rC1.reason) && /getField/.test(rC1.reason), 'C 近似名(getfield)→提示 getField');
  var rC2 = AA.dispatchTool(dA, 'applyEditt', { path: 'name', value: 'x' });   // 拼写错
  ok(rC2.ok === false && /applyEdit/.test(rC2.reason), 'C 拼写错(applyEditt)→提示 applyEdit');
  var rC3 = AA.dispatchTool(dA, 'totallyMadeUp', {});
  ok(rC3.ok === false && /未知工具/.test(rC3.reason), 'C 完全臆造名→明确报未知工具');

  // ───────── D · 上下文瘦身(_compactOldToolResults) ─────────
  console.log('— D 上下文瘦身 —');
  var conv = [{ role: 'user', text: 'hi' }];
  for (var r = 0; r < 8; r++) {
    conv.push({ role: 'assistant', text: '', toolCalls: [{ id: 't' + r, name: 'getField', input: {} }] });
    conv.push({ role: 'tool', toolResults: [{ id: 't' + r, name: 'getField', content: '这是一段足够长的工具结果内容'.repeat(10) }] });
  }
  AA._compactOldToolResults(conv, 6);
  var toolMsgs = conv.filter(function (m) { return m.role === 'tool'; });
  ok(toolMsgs.length === 8, 'D 仍有 8 条 tool 消息(结构不删·只压内容)');
  ok(toolMsgs[0].toolResults[0].content.indexOf('[已省略') === 0 && toolMsgs[1].toolResults[0].content.indexOf('[已省略') === 0, 'D 最早 2 轮被压成占位');
  ok(toolMsgs[7].toolResults[0].content.indexOf('[已省略') !== 0 && toolMsgs[6].toolResults[0].content.indexOf('[已省略') !== 0, 'D 最近 6 轮保持详尽');
  ok(toolMsgs[2].toolResults[0].id === 't2', 'D 占位仍保 id(provider 配对不破)');
  AA._compactOldToolResults(conv, 6);   // 幂等
  ok(toolMsgs[0].toolResults[0].content.indexOf('[已省略') === 0, 'D 再压幂等(不重复套娃)');

  // ───────── B+D · 经 loop:写后回读 + 预算反馈 ─────────
  console.log('— B 写后回读 + D 预算反馈(经 runAuthoringLoop·mock caller) —');
  var dL = AA.makeDraft({ name: '原名', factions: [{ name: '明' }], characters: [] });
  var round = 0;
  var caller = function () {
    round++;
    if (round === 1) return Promise.resolve({ text: '', toolCalls: [{ id: 'w1', name: 'applyEdit', input: { path: 'name', value: '新名' } }] });
    return Promise.resolve({ text: '', toolCalls: [{ id: 'f1', name: 'finish', input: { summary: '改名完成' } }] });
  };
  var resB = await AA.runAuthoringLoop(dL, '把剧本改名为新名', { caller: caller, conventions: '', blockingChecks: [], maxTokens: 1000000 });
  ok(resB.draft.name === '新名', 'B applyEdit 经 loop 落地');
  ok(resB.finished && resB.stopReason === 'finish', 'B finish 正常结束');
  var allTR = resB.conversation.filter(function (m) { return m.role === 'tool'; }).reduce(function (a, m) { return a.concat(m.toolResults || []); }, []);
  var aeTR = allTR.filter(function (tr) { return tr.name === 'applyEdit'; })[0];
  ok(aeTR && aeTR.content.indexOf('nowValue') >= 0 && aeTR.content.indexOf('新名') >= 0, 'B applyEdit 结果回挂 nowValue(写后回读·含新值)');

  // 预算反馈:用大 text 撑爆 token → 注入"预算"提醒 + tokenBudget 收场
  var dP = AA.makeDraft({ name: '原', factions: [{ name: '明' }] });
  var big = 'x'.repeat(400000);   // ~100000 tokens(other*0.25)·一轮即越 90%
  var pcaller = function () { return Promise.resolve({ text: big, toolCalls: [{ id: 'n1', name: 'note', input: { text: 'thinking' } }] }); };
  var resP = await AA.runAuthoringLoop(dP, '长任务', { caller: pcaller, conventions: '', blockingChecks: [], maxTokens: 100000 });
  var hasBudgetMsg = resP.conversation.some(function (m) { return m.role === 'user' && typeof m.text === 'string' && m.text.indexOf('预算') >= 0; });
  ok(hasBudgetMsg, 'D 越预算阈值 → 注入「预算」收尾提醒');
  ok(resP.stopReason === 'tokenBudget', 'D 最终 tokenBudget 收场(未死循环)');

  console.log('\nPASS · ' + pass + ' 断言');
})().catch(function (e) { console.error(e); process.exit(1); });
