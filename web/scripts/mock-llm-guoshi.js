#!/usr/bin/env node
/* eslint-env node */
'use strict';

// 本地 mock LLM 中转 —— 补回 demo-guoshi.html 预置的 127.0.0.1:8799。
// OpenAI 兼容 /v1/chat/completions：按国师 loop 的模式（作者/审阅/问答/讲解/计划）与会审角色（史官/谏官）
// 返回合理 tool_calls，让「生成 / 审阅 / 🏛️三堂会审」的完整 UI 在本地浏览器跑起来。
// 这是 mock 行为（非真智能），用于验 UI 流程渲染（进度清单 / 两官报告 / diff / 应用审）。
//
// 用法：node scripts/mock-llm-guoshi.js   （监听 127.0.0.1:8799），再开 demo-guoshi.html。

const http = require('http');
const PORT = 8799;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': '*' };
const CORS_JSON = Object.assign({ 'Content-Type': 'application/json' }, CORS);

let _seq = 0;
function tc(name, input) { return { id: 'call_' + (++_seq) + '_' + name, type: 'function', function: { name: name, arguments: JSON.stringify(input) } }; }

// 按 loop 当前模式/阶段决定返回哪些 tool_calls（mock 行为，够推进流程 + 展示各刀 UI）
function decide(messages, toolNames, allText, userText) {
  const has = function (n) { return toolNames.indexOf(n) >= 0; };
  const aTurns = messages.filter(function (m) { return m.role === 'assistant'; }).length;
  const didMutate = messages.some(function (m) { return m.role === 'assistant' && /applyPush|applyEdit|multiEdit|bulkAdd/.test(JSON.stringify(m.tool_calls || [])); });

  // ── 审阅模式（史官 / 谏官 / 通用体检）──
  if (has('submitReview')) {
    if (/史官/.test(allText)) return [tc('submitReview', { summary: '（mock·史官）史实大体可考，一处纪年需复核', findings: [{ dimension: '史实合理性', severity: '中', location: '新增人物', issue: '任职年份与设定时代纪年可能错位', suggestion: '核对正史纪年；拿不准改保守措辞并标存疑' }] })];
    if (/谏官/.test(allText)) return [tc('submitReview', { summary: '（mock·谏官）整体可玩，留意一处强弱', findings: [{ dimension: '平衡性', severity: '低', location: '新增势力', issue: '初始资源略高于同类势力', suggestion: '下调一档，与既有势力齐平' }] })];
    return [tc('submitReview', { summary: '（mock）体检完成，无重大阻塞', findings: [{ dimension: '内容缺口', severity: '低', location: '整体', issue: '部分人物缺 AI 人格', suggestion: '补 aiPersona 让其在推演里有行为' }] })];
  }
  if (has('submitAnswer')) return [tc('submitAnswer', { answer: '（mock）基于剧本数据的回答：当前剧本结构正常。' })];
  if (has('submitExplanation')) return [tc('submitExplanation', { summary: '（mock）剧本讲解总览。', points: [{ topic: '核心看点', detail: '（mock）讲解要点。' }] })];
  if (has('proposePlan')) return [tc('proposePlan', { summary: '（mock）改动计划', steps: ['第一步（mock）', '第二步（mock）'] })];

  // ── 作者模式 ──
  // 会审修订阶段
  if (/三堂会审[··].*修订|据.*意见.*修订/.test(userText)) {
    if (!didMutate && has('applyEdit')) return [tc('applyEdit', { path: 'worldSettings.note', value: '（mock）已据史官·谏官意见修订：纪年改保守措辞、新势力资源下调一档' })];
    return [tc('finish', { summary: '（mock）已逐条采纳两官意见并修订完成' })];
  }
  // 刀1：明显硬伤 → 进谏（仅首轮）
  // 硬伤信号须「需求级」且不撞历史叙述常用词——国师把剧本已有内容当 exemplars 塞进 user，
  // 范例里「灭亡/歼灭」等历史词若被匹配会误触发进谏。故收窄为现代器物 + 明确的开局清零指令。
  if (aTurns === 0 && has('remonstrate') && /AK\s*-?\s*47|步枪|坦克|冲锋枪|机枪|火箭炮|导弹|核弹|核武器|战斗机|航空母舰|手机|互联网/.test(userText)) {
    return [tc('remonstrate', { concern: '该需求含明显硬伤：时代错置的器物，或令某方开局即灭的设定，会破坏硬核可信与可玩性', severity: '史实', suggestion: '改用契合时代的设定（如冷兵器名将）；势力存废给出可玩的博弈过程，而非开局直接清零' })];
  }
  // 刀2：涉及具体史实 → 先自核（首轮），再落字 + 标存疑
  var didCheck = messages.some(function (m) { return m.role === 'assistant' && /checkHistory/.test(JSON.stringify(m.tool_calls || [])); });
  if (!didCheck && has('checkHistory') && /生卒|生平|官职|年号|纪年|史实|张居正|海瑞|戚继光|某位历史/.test(userText)) {
    return [tc('checkHistory', { facts: [{ claim: '该人物的生卒年与最高官职', verdict: '存疑', note: '（mock）需正史核对，先标存疑' }] })];
  }
  // 已动过手 → 收尾
  if (didMutate || aTurns >= 2) return [tc('finish', { summary: '（mock）本次改动已完成' })];
  // 实质改动：加一个势力 + 一名人物（+ 对没把握处标存疑）
  const out = [];
  if (has('applyPush')) {
    out.push(tc('applyPush', { path: 'factions', value: { name: '东林文官集团', leader: '顾宪成', desc: '（mock）以江南士大夫清流为主的政治集团' } }));
    out.push(tc('applyPush', { path: 'characters', value: { name: '顾宪成', faction: '东林文官集团', office: '吏部文选司郎中', aiPersona: '（mock）清议领袖，重名节、好结党议政' } }));
  }
  if (has('flagUncertain')) out.push(tc('flagUncertain', { path: 'characters.顾宪成.office', reason: '（mock）具体任期年份需正史核对' }));
  return out.length ? out : [tc('finish', { summary: '（mock）暂无可改' })];
}

function reply(res, toolCalls) {
  const msg = { role: 'assistant', content: '' };
  if (toolCalls && toolCalls.length) msg.tool_calls = toolCalls;
  res.writeHead(200, CORS_JSON);
  res.end(JSON.stringify({
    id: 'mock-' + (++_seq), object: 'chat.completion', model: 'mock-guoshi',
    choices: [{ index: 0, message: msg, finish_reason: (toolCalls && toolCalls.length) ? 'tool_calls' : 'stop' }],
    usage: { prompt_tokens: 100, completion_tokens: 60, total_tokens: 160 }
  }));
}

http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(200, CORS_JSON); res.end(JSON.stringify({ ok: true, hint: 'POST /v1/chat/completions' })); return; }
  let buf = '';
  req.on('data', function (c) { buf += c; });
  req.on('end', function () {
    let body = {};
    try { body = JSON.parse(buf || '{}'); } catch (e) {}
    const messages = body.messages || [];
    const toolNames = (body.tools || []).map(function (t) { return t.function ? t.function.name : t.name; });
    const allText = JSON.stringify(messages);
    let userText = '';
    for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === 'user') { userText = typeof messages[i].content === 'string' ? messages[i].content : JSON.stringify(messages[i].content); break; } }
    let calls;
    try { calls = decide(messages, toolNames, allText, userText); }
    catch (e) { calls = [tc('finish', { summary: '（mock）decide 出错：' + (e && e.message) })]; }
    reply(res, calls);
  });
}).listen(PORT, '127.0.0.1', function () {
  console.log('[mock-llm-guoshi] listening on http://127.0.0.1:' + PORT + '/v1  · 国师 demo 可直接本地跑（Ctrl+C 停）');
});
