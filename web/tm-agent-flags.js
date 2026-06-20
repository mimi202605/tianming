// @ts-check
// ============================================================
// tm-agent-flags.js — 「agent 升级（实验）」总开关
//
// 把至今所有 agent 化升级的独立开关收成一个总闸·方便统一开关。
// 涉及 6 个 agent（历史上散在 P.conf 和 P.ai 两个命名空间·此处统一）：
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
      // 总闸（任一命名空间设了都认）
      if (ai.agentUpgradesEnabled || conf.agentUpgradesEnabled) return true;
      // 否则各自独立开关（同时认两个命名空间·解决历史不一致）
      return !!(ai[name] || conf[name]);
    } catch (e) { return false; }
  }
  global.agentFlagOn = agentFlagOn;

  var TM = global.TM = global.TM || {};
  TM.AgentFlags = {
    MASTER: 'agentUpgradesEnabled',
    LIST: ['agentRecallEnabled', 'factionGoalStackEnabled', 'anomalyRoutingEnabled', 'courtDebateEnabled', 'memoryStewardEnabled', 'reflectionAgentEnabled', 'edictOversightEnabled', 'historyAdvisorEnabled', 'factionAgentEnabled', 'factionToolDecisionEnabled'],
    on: agentFlagOn,
    // 一键设/读总闸（写 P.conf·与多数独立开关同命名空间·随游戏设置持久）
    setMaster: function (v) { var P = global.P; if (P) { P.conf = P.conf || {}; P.conf.agentUpgradesEnabled = !!v; } return !!v; },
    masterOn: function () { var P = global.P || {}; return !!((P.ai && P.ai.agentUpgradesEnabled) || (P.conf && P.conf.agentUpgradesEnabled)); },
    // 清空所有独立开关(两命名空间)·让总闸成为唯一控制（"方便"：reset() 后只用 setMaster 一键开关）
    reset: function () { var P = global.P; if (!P) return; ['conf', 'ai'].forEach(function (ns) { if (!P[ns]) return; TM.AgentFlags.LIST.forEach(function (n) { try { delete P[ns][n]; } catch (e) {} }); }); },
    // 调试用：返回各 agent 当前生效态
    status: function () { var o = {}; this.LIST.forEach(function (n) { o[n] = agentFlagOn(n); }); o._master = this.masterOn(); return o; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
