// @ts-check
// ============================================================
// tm-endturn-mode-contract.js — 正式游戏 LLM/Agent 平行模式契约
//
// 两模式入口互斥、能力对应、结果同构；只共享确定性引擎与下游消费者。
// 任何 Agent 失败都不得静默转入 LLM 主流程。
// ============================================================
(function (root) {
  'use strict';
  var TM = root.TM || (root.TM = {});
  TM.Endturn = TM.Endturn || {};

  var CAPABILITIES = [
    { id: 'basis', label: '回合依据', llm: 'prompt.build', agent: 'TurnSnapshot/context' },
    { id: 'state-delta', label: '状态变化', llm: 'aiResult.changes/applier', agent: 'AgentWriteTools/receipt' },
    { id: 'fiscal', label: '财政经济', llm: 'tax_reforms/fiscal_adjustments', agent: 'adjust_treasury/adjust_fiscal_item/deepen_economy' },
    { id: 'military', label: '军事战争', llm: 'army_changes/sc18', agent: 'command_army/deepen_military' },
    { id: 'personnel', label: '人事朝局', llm: 'personnel_changes/sc15', agent: 'appoint/dismiss/deepen_court' },
    { id: 'factions', label: '势力外交', llm: 'faction_actions/sc16', agent: 'diplomatic_action/deepen_factions' },
    { id: 'relations', label: '人物关系', llm: 'relation_changes/sc07', agent: 'deepen_relations/deepen_cognition' },
    { id: 'letters', label: '书信', llm: 'sc1b', agent: 'deepen_letters' },
    { id: 'edict', label: '法令与后果', llm: 'edict audit', agent: 'Agent EdictOversight owner' },
    { id: 'live-world', label: '势力自主行动', llm: 'FactionNpc dispatcher', agent: 'Agent liveworld owner' },
    { id: 'memory', label: '跨回合记忆', llm: 'sc25/memory', agent: 'recall_consolidate' },
    { id: 'narrative', label: '史记叙事', llm: 'sc2/result narrative', agent: 'deepen_narrative from receipts' },
    { id: 'quality', label: '质量与一致性', llm: 'validity/sc27', agent: 'selfCheck/quality gate' },
    { id: 'result', label: '共同交付', llm: 'aiResult', agent: 'aiResult(agentMode=true)' }
  ];

  function selectedMode(P) {
    P = P || root.P || {};
    var conf = P.conf || {}, ai = P.ai || {};
    var byMode = !!((conf.experimentalEnabled || ai.experimentalEnabled) && ((conf.experimentalMode || ai.experimentalMode) === 'agent'));
    return (byMode || conf.agentModeEnabled || ai.agentModeEnabled) ? 'agent' : 'llm';
  }

  function normalizeResult(result, mode) {
    var out = {};
    Object.keys(result || {}).forEach(function (k) { out[k] = result[k]; });
    out.mode = mode === 'agent' ? 'agent' : 'llm';
    out.agentMode = out.mode === 'agent';
    ['shizhengji', 'zhengwen', 'playerStatus', 'playerInner', 'turnSummary', 'szjTitle', 'szjSummary', 'shiluText', 'hourenXishuo'].forEach(function (k) {
      if (out[k] == null) out[k] = '';
    });
    if (!Array.isArray(out.personnelChanges)) out.personnelChanges = [];
    if (!Array.isArray(out.suggestions)) out.suggestions = [];
    return out;
  }

  function validateResult(result, mode) {
    var problems = [];
    if (!result || typeof result !== 'object') problems.push('aiResult 缺失');
    else {
      if (mode === 'agent' && result.agentMode !== true) problems.push('Agent 结果未标 agentMode=true');
      if (mode === 'llm' && result.agentMode === true) problems.push('LLM 结果误标 Agent');
      if (!Array.isArray(result.personnelChanges)) problems.push('personnelChanges 非数组');
      if (!Array.isArray(result.suggestions)) problems.push('suggestions 非数组');
    }
    return { ok: problems.length === 0, mode: mode, problems: problems };
  }

  function ModeExecutionError(mode, code, reason, meta) {
    this.name = 'ModeExecutionError';
    this.mode = mode || 'unknown';
    this.code = code || 'mode-failed';
    this.message = String(reason || '模式执行失败');
    this.meta = meta || {};
    if (Error.captureStackTrace) Error.captureStackTrace(this, ModeExecutionError);
  }
  ModeExecutionError.prototype = Object.create(Error.prototype);
  ModeExecutionError.prototype.constructor = ModeExecutionError;

  function assertParity() {
    var missing = CAPABILITIES.filter(function (c) { return !c.id || !c.llm || !c.agent; });
    return { ok: missing.length === 0, total: CAPABILITIES.length, missing: missing.map(function (c) { return c.id || '(unknown)'; }) };
  }

  TM.Endturn.ModeContract = {
    MODES: ['llm', 'agent'],
    CAPABILITIES: CAPABILITIES,
    selectedMode: selectedMode,
    normalizeResult: normalizeResult,
    validateResult: validateResult,
    assertParity: assertParity,
    ModeExecutionError: ModeExecutionError
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = TM.Endturn.ModeContract;
})(typeof window !== 'undefined' ? window : globalThis);

