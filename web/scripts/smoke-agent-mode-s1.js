'use strict';
// ============================================================
// smoke-agent-mode-s1.js — 「模式 b · agent 模式」S1 骨架守卫
//   验:① 开关 agentModeEnabled 独立于总闸 ② AgentMode 模块 S1 契约(run→fallback)
//       ③ ai 步分叉点已就位且关=零回归(整段 if 守卫·不动原 _endTurn_aiInfer) ④ index.html 已注册
// ============================================================

const fs = require('fs');
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

// ── Part A · 运行时行为(模块加载) ─────────────────────────────
// 干净 globalThis·按 web 脚本顺序 require(自注册到 globalThis)
delete globalThis.P;
require(path.join(ROOT, 'tm-agent-flags.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));

assert(typeof globalThis.agentModeOn === 'function', 'agentModeOn 全局 helper 已导出');
assert(typeof globalThis.agentFlagOn === 'function', 'agentFlagOn 仍在(未破坏)');

// 默认关(无 P)
globalThis.P = undefined;
assert(globalThis.agentModeOn() === false, '默认(无 P)agentModeOn=false');

// 两命名空间都认
globalThis.P = { conf: { agentModeEnabled: true } };
assert(globalThis.agentModeOn() === true, 'P.conf.agentModeEnabled 开 → true');
globalThis.P = { ai: { agentModeEnabled: true } };
assert(globalThis.agentModeOn() === true, 'P.ai.agentModeEnabled 开 → true');

// ★独立于总闸:总闸开 + 没单独开 agentModeEnabled → 模式 b 仍关(总闸不掀翻整局引擎)
globalThis.P = { conf: { agentUpgradesEnabled: true } };
assert(globalThis.agentModeOn() === false, '总闸开但未单独开 → agentModeOn=false(独立)');
assert(globalThis.agentFlagOn('anyUpgradeFlag') === true, '同状态下 agentFlagOn(增量升级)=true(对照:总闸确实管增量)');

// AgentMode S1 契约
globalThis.P = undefined;
const AM = globalThis.TM && globalThis.TM.Endturn && globalThis.TM.Endturn.AgentMode;
assert(AM && typeof AM.run === 'function', 'TM.Endturn.AgentMode.run 已导出');
assert(typeof AM._stage === 'string', 'AgentMode._stage 存在(进度标记)');  // S4 起 = 'S4-loop'

(async function () {
  // 无前置依赖(无 GM / 无 callAIWithTools)时·run 必须优雅回落 {fallback:true}(保回合·这是 S1 分叉的安全底)
  const r = await AM.run({ input: {}, results: {} });
  assert(r && r.ok === false && r.fallback === true, 'run() 无前置依赖时优雅回落 {ok:false, fallback:true}');

  // status 暴露 _agentMode
  const st = globalThis.TM.AgentFlags.status();
  assert(Object.prototype.hasOwnProperty.call(st, '_agentMode'), 'AgentFlags.status() 含 _agentMode');

  // ── Part B · 源码零回归守卫 ─────────────────────────────
  const flagsSrc = fs.readFileSync(path.join(ROOT, 'tm-agent-flags.js'), 'utf8');
  // agentModeEnabled 不在 LIST(独立·不被总闸 reset/status-as-upgrade 扫到)
  const listMatch = flagsSrc.match(/LIST\s*:\s*\[([^\]]*)\]/);
  assert(listMatch, 'tm-agent-flags 有 LIST');
  assert(listMatch[1].indexOf('agentModeEnabled') === -1, 'agentModeEnabled 不在 LIST(独立于总闸)');
  assert(/function agentModeOn\s*\(/.test(flagsSrc), 'agentModeOn 在 tm-agent-flags 定义');

  const stepsSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-pipeline-steps.js'), 'utf8');
  const aiIdx = stepsSrc.indexOf("name: 'ai'");
  // 用 ai 步的下一个顶层 step 作分界(原 goujia-qinzheng·2026-06 已折进 post-ai-edict·audit §4 六段化)
  const aiEndIdx = stepsSrc.indexOf("name: 'post-ai-edict'");
  assert(aiIdx >= 0 && aiEndIdx > aiIdx, '定位到 ai 步区间');
  const aiBlock = stepsSrc.slice(aiIdx, aiEndIdx);

  // 分叉点在 ai 步内·且被 typeof+agentModeOn() 守卫(关=跳过=零回归)
  assert(/typeof agentModeOn === 'function' && agentModeOn\(\)/.test(aiBlock), 'ai 步分叉受 typeof+agentModeOn() 守卫(关则整段跳过)');
  assert(/TM\.Endturn\.AgentMode\.run/.test(aiBlock), 'ai 步调用 AgentMode.run');
  assert(/_agentModeRan/.test(aiBlock), 'ai 步标记 _agentModeRan');
  assert(/_agentRes\.ok && !_agentRes\.fallback/.test(aiBlock), '仅 ok&&!fallback 才接管(否则回落)');

  // 分叉点在原 _endTurn_aiInfer 调用之前(=顶部 fork)·且原调用仍在(未删=零回归)
  const branchPos = aiBlock.indexOf('agentModeOn()');
  const inferPos = aiBlock.indexOf('_endTurn_aiInfer(');
  assert(branchPos >= 0 && inferPos > branchPos, '分叉在原 _endTurn_aiInfer 调用之前(顶部 fork)');
  assert(/var aiResult = await _endTurn_aiInfer\(/.test(aiBlock), '原 sc0-sc28 主调用 _endTurn_aiInfer 仍在(未删·零回归)');

  // index.html 注册·且在 tm-agent-flags 之后
  const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const regAgent = indexSrc.indexOf('tm-endturn-agent-mode.js');
  const regFlags = indexSrc.indexOf('tm-agent-flags.js');
  assert(regAgent >= 0, 'index.html 注册 tm-endturn-agent-mode.js');
  assert(regFlags >= 0 && regFlags < regAgent, 'agent-mode 在 tm-agent-flags 之后加载');

  console.log('[smoke-agent-mode-s1] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
