// @ts-check
// ============================================================
// tm-agent-flags.js — 「LLM 升级（实验）」总开关 + 「agent 模式(模式 b)」门控
//
// 【概念厘清·2026-06-20】本文件门控两类**互斥**的实验:
//   1. agentUpgradesEnabled = 「LLM 模式」的升级——对现有 LLM 回合管线(sc0-sc28)的**增量增强**。
//      (历史上叫「agent 升级」是误名:它们是 LLM 管线增强·不是 agent 模式。现正名为「LLM 升级」。)
//   2. agentModeOn()        = 「agent 模式(模式 b)」——**替换整个回合推演**的平行引擎(局内 Claude Code)。
//   UI:先「开启实验模式」→ 再选「LLM 模式」(类 1) 或「Agent 模式」(类 2)。二者互斥(见 agentFlagOn 守卫)。
//
// 「LLM 升级」收下面这些独立开关到一个总闸(P.conf/P.ai 两命名空间统一):
//   agentRecallEnabled        ② 按需取数（记忆检索 agent 化）
//   factionGoalStackEnabled   ③ NPC/势力前瞻式目标栈
//   anomalyRoutingEnabled     ① 主推演异常路由（冷门动作识别）
//   courtDebateEnabled        朝堂博弈（廷议真辩论）+ B 方案跨场景链路
//   memoryStewardEnabled      记忆管家（compress×3+L2/L3 → 单次固化）
//   reflectionAgentEnabled    自我反思（_scReflect → 滚动偏差画像注入 sc0）
//   factionToolDecisionEnabled ③ 势力决策按需取数（decideFor 改 tool-calling·A 方案·②③合并）
// （注：edictOversight/historyAdvisor/factionAgent 等后续 agent 亦在 LIST·此列表仅示例最初几个）
//
// 语义：总闸 || 各独立开关。
//   · P.conf.agentUpgradesEnabled（或 P.ai.agentUpgradesEnabled）= true → 6 个 agent 全部启用（实验）
//   · 总闸关 + 某独立开关 = true → 仅那个启用（保留细粒度调试能力·不破坏既有用法）
//   · 全关 → 零回归（写死路径原样跑）
//
// 用法（控制台或存档设一个即可）：P.conf.agentUpgradesEnabled = true
// 各读取点统一调 agentFlagOn('xxxEnabled')。helper 内部对 P/P.conf/P.ai 缺失静默降级（保持原 `P.conf && P.conf.x` 的不抛语义）。
// ============================================================

(function (global) {
  function agentFlagOn(name) {
    try {
      var P = global.P || {};
      var ai = P.ai || {}, conf = P.conf || {};
      // 【S6 模式互斥】agent 模式(模式 b)启用时·「LLM 升级」一律关:它们是「LLM 模式」内容·
      //   而 agent 模式已替换整个回合推演管线·这些管线增强不再适用。(非破坏:旧测试不开 agent 模式故不受影响。)
      // 【活世界例外】唯独势力 agent③(factionAgentEnabled)可经 agent 模式专属开关 agentLiveWorldEnabled 单独放行——
      //   填"agent 模式下势力不决策(死世界)"黑洞·让激活策略(top3 最强优先)+ decideFor prompt 增强(边境军情/双向外交)满血;其余 LLM 升级仍互斥关。
      if (agentModeOn() && name === 'factionAgentEnabled' && agentLiveWorldOn()) return true;
      if (agentModeOn()) return false;
      // 总闸（任一命名空间设了都认）
      if (ai.agentUpgradesEnabled || conf.agentUpgradesEnabled) return true;
      // 否则各自独立开关（同时认两个命名空间·解决历史不一致）
      return !!(ai[name] || conf[name]);
    } catch (e) { return false; }
  }
  global.agentFlagOn = agentFlagOn;

  // ── 模式 b · agent 模式(平行回合引擎)门控 ──
  // 【独立于「LLM 升级」总闸】：LLM 升级只增强现管线·agent 模式**替换整个回合引擎**(详设 docs/agent-mode-design.md)。
  // 正途(UI):「开启实验模式」(experimentalEnabled) + 选「Agent 模式」(experimentalMode==='agent')。
  // 旁路(测试/控制台):显式 P.conf.agentModeEnabled = true。两命名空间都认。
  function agentModeOn() {
    try {
      var P = global.P || {};
      var conf = P.conf || {}, ai = P.ai || {};
      var byMode = !!((conf.experimentalEnabled || ai.experimentalEnabled) && ((conf.experimentalMode || ai.experimentalMode) === 'agent'));
      return !!(byMode || conf.agentModeEnabled || ai.agentModeEnabled);
    } catch (e) { return false; }
  }
  global.agentModeOn = agentModeOn;

  // ── 模式 b 子开关 · 活世界(agent 模式下势力③ 自主 agent 决策·绕过 LLM 升级互斥)──
  //   agent 模式开启时 agentFlagOn('factionAgentEnabled') 被互斥关→势力退确定性引擎·且 endturn-systems 已不跑 NPC(decideFor 承载)→势力全程不决策(死世界)。
  //   此独立子开关让 agent 模式可单独启用势力 agent(后台·命门活世界)·默认关·仅 agent 模式下有意义(LLM 模式仍用 factionAgentEnabled)。
  function agentLiveWorldOn() {
    try {
      if (!agentModeOn()) return false;
      var P = global.P || {};
      return !!((P.conf && P.conf.agentLiveWorldEnabled) || (P.ai && P.ai.agentLiveWorldEnabled));
    } catch (e) { return false; }
  }
  global.agentLiveWorldOn = agentLiveWorldOn;

  var TM = global.TM = global.TM || {};
  TM.AgentFlags = {
    MASTER: 'agentUpgradesEnabled',
    LIST: ['agentRecallEnabled', 'factionGoalStackEnabled', 'anomalyRoutingEnabled', 'courtDebateEnabled', 'memoryStewardEnabled', 'reflectionAgentEnabled', 'edictOversightEnabled', 'historyAdvisorEnabled', 'factionAgentEnabled', 'factionToolDecisionEnabled'],
    on: agentFlagOn,
    agentModeOn: agentModeOn,  // 模式 b 平行引擎开关(独立于总闸)
    // 一键设/读总闸（写 P.conf·与多数独立开关同命名空间·随游戏设置持久）
    setMaster: function (v) { var P = global.P; if (P) { P.conf = P.conf || {}; P.conf.agentUpgradesEnabled = !!v; } return !!v; },
    masterOn: function () { var P = global.P || {}; return !!((P.ai && P.ai.agentUpgradesEnabled) || (P.conf && P.conf.agentUpgradesEnabled)); },
    // 清空所有独立开关(两命名空间)·让总闸成为唯一控制（"方便"：reset() 后只用 setMaster 一键开关）
    reset: function () { var P = global.P; if (!P) return; ['conf', 'ai'].forEach(function (ns) { if (!P[ns]) return; TM.AgentFlags.LIST.forEach(function (n) { try { delete P[ns][n]; } catch (e) {} }); }); },
    // 调试用：返回各 agent 当前生效态
    status: function () { var o = {}; this.LIST.forEach(function (n) { o[n] = agentFlagOn(n); }); o._master = this.masterOn(); o._agentMode = agentModeOn(); return o; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
