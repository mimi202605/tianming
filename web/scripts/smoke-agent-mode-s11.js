'use strict';
// ============================================================
// smoke-agent-mode-s11.js — 「模式 b · agent 模式」S11 深化工具·deepen_npcs(复用 sc15)
//   验:NPC 内心(心绪/压力/暗筹)真落 GM.chars(_mood/stress/_scars·sc15 自读字段·闭环)
//       + stress clamp + 选人(focus/自动) + 网关/解析兜底 + agent-mode 接入
// ============================================================

const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const DT = TM.Endturn.AgentDepthTools;
const AM = TM.Endturn.AgentMode;

assert(DT.isToolName('deepen_npcs') && DT.isToolName('deepen_world'), 'deepen_npcs/deepen_world 工具在(不锁总数·后续刀另加)');

function makeGM() {
  return {
    turn: 9, _turnReport: [{ type: 'narrative', text: '本回合权臣下狱·北境告急' }], _agentWriteLog: [{ path: 'x', reason: '权臣下狱' }],
    chars: [
      { name: '张三', alive: true, loyalty: 20, ambition: 80, stress: 40 },
      { name: '李四', alive: true, loyalty: 60, ambition: 40, stress: 10 },
      { name: '王五', alive: false, loyalty: 50 }
    ]
  };
}

(async function () {
  // ── deepen_npcs 真落角色 ──
  var gm = makeGM(); var zhang = gm.chars[0];
  globalThis.callAIMessages = async function () {
    return '{"npcs":[{"name":"张三","mood":"忧惧","stress_delta":999,"inner":"大祸将至","hidden_intent":"暗通北敌自保"},{"name":"查无此人","mood":"喜","stress_delta":5,"inner":"x"}]}';
  };
  var r = await DT.handle('deepen_npcs', {}, { GM: gm });
  assert(r.ok === true, 'deepen_npcs 成功');
  assert(zhang._mood === '忧惧', '心绪落到 c._mood');
  assert(zhang.stress === 60, 'stress clamp(40+clamp(999→20)=60)');
  assert(Array.isArray(zhang._scars) && zhang._scars.some(function (s) { return /暗筹.*暗通北敌/.test(s.event) && s._agent; }), '暗筹+内心落到 c._scars(sc15 自读·闭环)');
  assert(zhang._changed === true, 'c._changed 置位');
  assert(gm._turnReport.some(function (e) { return e._op === 'deepen_npcs'; }), '入 _turnReport(可见)');
  // "查无此人" 跳过(只应用到匹配的存活角色)
  assert(/已深化 1 名/.test(r.text), '只深化匹配的存活角色(查无此人跳过)');

  // ── focus 指定 ──
  gm = makeGM();
  globalThis.callAIMessages = async function () { return '{"npcs":[{"name":"李四","mood":"隐忍","stress_delta":5,"inner":"静观"}]}'; };
  r = await DT.handle('deepen_npcs', { focus: ['李四'] }, { GM: gm });
  assert(r.ok && gm.chars[1]._mood === '隐忍', 'focus 指定李四 → 落到李四');

  // ── 死人不深化 ──
  gm = makeGM();
  globalThis.callAIMessages = async function () { return '{"npcs":[{"name":"王五","mood":"x","stress_delta":0}]}'; };
  r = await DT.handle('deepen_npcs', { focus: ['王五'] }, { GM: gm });
  assert(!r.ok, '死人(王五 alive:false)不深化');

  // ── 兜底 ──
  var saved = globalThis.callAIMessages;
  delete globalThis.callAIMessages;
  r = await DT.handle('deepen_npcs', {}, { GM: makeGM() });
  assert(!r.ok && /callAIMessages/.test(r.text), '网关缺失→兜底');
  globalThis.callAIMessages = async function () { return '废话非JSON'; };
  r = await DT.handle('deepen_npcs', {}, { GM: makeGM() });
  assert(!r.ok && /解析失败|空/.test(r.text), '解析失败→兜底');
  globalThis.callAIMessages = saved;

  // ── agent-mode 接入 ──
  assert(globalThis.TM.Endturn.AgentDepthTools.isToolName('deepen_npcs'), 'deepen_npcs 已注册可达(auto-suite·循环表不挂维度深化)');

  console.log('[smoke-agent-mode-s11] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
