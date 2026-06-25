'use strict';
// ============================================================
// smoke-agent-mode-liveworld.js — agent 模式·活世界(势力③ 自主 agent 决策·扩展①)
//   病灶:agent 模式开启时 agentFlagOn('factionAgentEnabled') 被互斥关 + endturn-systems 不跑 NPC → 势力全程不决策(死世界)。
//   修:agent 模式专属子开关 agentLiveWorldEnabled(绕过 LLM 升级互斥)·run() 后台复用 _runOneInTurn 跑势力自主决策。
//   验:① agentLiveWorldOn 开关逻辑(仅 agent 模式有意义)② driver _isEnabled 绕过"精算"gate ③ 关闭零回归 ④ 不破坏 LLM 升级互斥 ⑤ run() 活世界 job wired。
//   纯 node·stub·不调真模型。
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(c, m) { if (!c) throw new Error(m); passed++; }
function runFile(ctx, f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }

async function main() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, parseInt, parseFloat,
    setTimeout: function (fn) { return { fn }; }, clearTimeout: function () {}
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);

  runFile(ctx, 'tm-agent-flags.js');
  runFile(ctx, 'tm-faction-npc-settings.js');
  runFile(ctx, 'tm-faction-npc-in-turn-driver.js');

  assert(typeof ctx.agentLiveWorldOn === 'function', 'agentLiveWorldOn 已导出');

  // ① 开关逻辑:仅 agent 模式下有意义(LLM 模式用 factionAgentEnabled·此开关绕过 agent 互斥)
  ctx.P = { conf: {}, ai: {} };
  assert(ctx.agentLiveWorldOn() === false, '默认(无开关)→ false');
  ctx.P.conf.agentLiveWorldEnabled = true;
  assert(ctx.agentLiveWorldOn() === false, 'LLM 模式(非 agent)+ 活世界开 → false(仅 agent 模式有意义)');
  ctx.P.conf.agentModeEnabled = true;
  assert(ctx.agentLiveWorldOn() === true, 'agent 模式 + 活世界开 → true');
  ctx.P.conf.agentLiveWorldEnabled = false;
  assert(ctx.agentLiveWorldOn() === false, 'agent 模式但活世界关 → false');
  ctx.P.ai.agentLiveWorldEnabled = true;  // 两命名空间都认
  assert(ctx.agentLiveWorldOn() === true, 'P.ai 命名空间亦认');

  // ④ 活世界例外 + 互斥边界:factionAgentEnabled 经 agentLiveWorld 在 agent 模式放行(满血)·其余升级仍互斥关
  ctx.P = { conf: { factionAgentEnabled: true }, ai: {} };
  assert(ctx.agentFlagOn('factionAgentEnabled') === true, 'LLM 模式·factionAgentEnabled 开 → agentFlagOn=true');
  ctx.P.conf.agentModeEnabled = true;  // agent 模式·活世界未开
  assert(ctx.agentFlagOn('factionAgentEnabled') === false, 'agent 模式 + 活世界未开 → factionAgentEnabled 仍互斥关');
  ctx.P.conf.agentLiveWorldEnabled = true;  // 开活世界
  assert(ctx.agentFlagOn('factionAgentEnabled') === true, '★活世界例外:agent 模式 + 活世界开 → factionAgentEnabled 放行(势力 agent 满血:top3 激活+prompt 增强)');
  assert(ctx.agentFlagOn('courtDebateEnabled') === false && ctx.agentFlagOn('memoryStewardEnabled') === false, '活世界例外仅限 factionAgentEnabled·其余 LLM 升级仍互斥关(不波及)');

  // ② driver _isEnabled:agent 模式活世界绕过"势力精算"gate(精算关也能跑·只要 agent 模式+活世界+key)
  ctx.P = { playerInfo: { factionName: '明朝廷' }, conf: { agentModeEnabled: true, agentLiveWorldEnabled: true, npcAiPrecision: false, npcInTurnMaxPerTurn: 8 }, ai: { key: 'fake' } };
  ctx.GM = { turn: 7, facs: [ { name: '明朝廷', derivedStrength: { value: 99 } }, { name: '后金', derivedStrength: { value: 80 } }, { name: '察哈尔', derivedStrength: { value: 20 } } ], qijuHistory: [] };
  ctx.TM.FactionNpcLlmDecision = { calls: [], hasRunThisTurn: function () { return false; }, decideFor: async function (name) { this.calls.push(name); return { applied: true, rationale: name + ' 自主措置' }; } };
  ctx.TM.FactionNpcNewsBridge = {};
  assert(ctx.TM.FactionNpcSettings.isAiPrecisionEnabled() === false, '前提:势力精算关闭(npcAiPrecision=false)');
  const r1 = await ctx.TM.FactionNpcInTurnDriver._runOneInTurn(7, 'lw-test');
  assert(r1 && !r1.skipped && r1.applied === true, '精算关·但 agent 模式+活世界+key → _runOneInTurn 仍跑(绕过精算 gate)');
  assert(ctx.TM.FactionNpcLlmDecision.calls.length === 1, '活世界确实调了一次 decideFor(势力自主决策落地)');

  // ③ 对照·零回归:活世界关 + 精算关 → _isEnabled 挡(原逻辑·不绕过)
  ctx.P.conf.agentLiveWorldEnabled = false;
  ctx.GM.facs.forEach(function (f) { delete f._inTurnLlmRanTurns; });
  const r2 = await ctx.TM.FactionNpcInTurnDriver._runOneInTurn(7, 'off-test');
  assert(r2 && r2.skipped && /precision/.test(r2.reason || ''), '活世界关+精算关 → skipped(precision off·零回归)');
  // 且非 agent 模式 + 活世界开 + 精算关 → 仍挡(活世界仅 agent 模式有意义)
  ctx.P.conf.agentModeEnabled = false;
  ctx.P.conf.agentLiveWorldEnabled = true;
  ctx.GM.facs.forEach(function (f) { delete f._inTurnLlmRanTurns; });
  const r3 = await ctx.TM.FactionNpcInTurnDriver._runOneInTurn(7, 'llm-mode-test');
  assert(r3 && r3.skipped, 'LLM 模式(非 agent)+ 活世界开 + 精算关 → 仍 skipped(活世界不在 LLM 模式生效)');

  // ⑤ run() 活世界 job wired(源码静态验·不跑 run)
  const amSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-agent-mode.js'), 'utf8');
  assert(/_agentLiveWorldOn/.test(amSrc), 'agent-mode 含 _agentLiveWorldOn 开关 helper');
  assert(/FactionNpcInTurnDriver\._runOneInTurn/.test(amSrc), 'agent-mode run() 活世界阶段复用 _runOneInTurn');
  assert(/agent-lw-/.test(amSrc), 'agent-mode 活世界 job 用 agent-lw- 标签(可观测)');
  assert(/_agentLiveWorldRan/.test(amSrc), 'agent-mode 记 _agentLiveWorldRan(观测落地势力数)');

  // ⑥ 设置面板 toggle wired(tm-patches.js·agent 模式专属)
  const patchSrc = fs.readFileSync(path.join(ROOT, 'tm-patches.js'), 'utf8');
  assert(/s-agent-liveworld/.test(patchSrc), 'patches 含活世界 toggle(id s-agent-liveworld)');
  // 注:onchange 内是 JS 字符串·单引号被转义为 \'·故用 indexOf 宽松匹配(同 smoke-agent-mode-s6 做法)
  assert(patchSrc.indexOf('agentLiveWorldEnabled') >= 0 && patchSrc.indexOf('_togglePConf') >= 0, 'patches 活世界 toggle 绑 _togglePConf(agentLiveWorldEnabled)');
  assert(/🌍 活世界/.test(patchSrc), 'patches 活世界组标题(🌍 活世界)');

  console.log('[smoke-agent-mode-liveworld] PASS assertions=' + passed);
}
main().catch(function (e) { console.error(e); process.exit(1); });
