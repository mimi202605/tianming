'use strict';
// 正式游戏 LLM/Agent 平行模式：入口互斥、能力对应、失败不穿越。
const fs = require('fs');
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-agent-kernel.js'));
const MC = require(path.join(ROOT, 'tm-endturn-mode-contract.js'));
assert(MC.MODES.join(',') === 'llm,agent', '正式模式仅有平行的 llm/agent 两入口');
const parity = MC.assertParity();
assert(parity.ok && parity.total >= 14, 'LLM/Agent 能力对应表完整');
assert(MC.selectedMode({ conf: {} }) === 'llm', '默认选 LLM');
assert(MC.selectedMode({ conf: { agentModeEnabled: true } }) === 'agent', '玩家选择 Agent 时只选 Agent');
assert(MC.selectedMode({ conf: { experimentalEnabled: true, experimentalMode: 'agent' } }) === 'agent', '实验模式选择 Agent 时只选 Agent');

const ar = MC.normalizeResult({ summary: 'x' }, 'agent');
assert(ar.agentMode === true && ar.mode === 'agent' && Array.isArray(ar.personnelChanges), 'Agent 结果归一到共同 aiResult 契约');
assert(MC.validateResult(ar, 'agent').ok, '归一后的 Agent 结果通过契约');
assert(!MC.validateResult({ agentMode: true, personnelChanges: [], suggestions: [] }, 'llm').ok, 'LLM 结果不能冒充 Agent');

const steps = fs.readFileSync(path.join(ROOT, 'tm-endturn-pipeline-steps.js'), 'utf8');
const aiStart = steps.indexOf("name: 'ai'");
const aiEnd = steps.indexOf("name: 'post-ai-edict'");
const aiBlock = steps.slice(aiStart, aiEnd);
assert(/_selectedMode === 'agent'/.test(aiBlock) && /TM\.Endturn\.AgentMode\.run/.test(aiBlock), 'ai 步按唯一入口运行 Agent');
assert(/throw new _mc\.ModeExecutionError\('agent'/.test(aiBlock), 'Agent 失败向外抛而非转 LLM');
assert(aiBlock.indexOf('AgentMode.run') < aiBlock.indexOf('_endTurn_aiInfer('), 'Agent/LLM 分支在共同结果前互斥');
assert(/!ctx\.input\._agentModeRan/.test(steps), 'LLM 专属后处理在 Agent 模式禁用');
assert(/!ctx\.input\._agentEdictActionsApplied/.test(steps) && /!ctx\.input\._agentTyrantActivitiesApplied/.test(steps), 'Agent 前置的玩家规则动作不会在公共步骤重复落地');
assert(/_ar && !ctx\.input\._agentModeRan/.test(steps), 'Agent 叙事不再经过 LLM 文本侧通道二次写状态');

const preStart = steps.indexOf("name: 'plan-prefetch'");
const preEnd = steps.indexOf("name: 'ai'");
const preBlock = steps.slice(preStart, preEnd);
assert(/_selectedMode === 'agent'/.test(preBlock) && /_agentPlanPrefetchSkipped/.test(preBlock), 'Agent 模式不暗启 LLM prefetch');

const mode = fs.readFileSync(path.join(ROOT, 'tm-endturn-agent-mode.js'), 'utf8');
assert(/fallback:\s*false/.test(mode), 'Agent 运行结果明确禁止 LLM fallback');
assert(/var _acted = \(state\.writeOk > _wB\)/.test(mode), '停滞判定只计算已验证写入');
assert(/_agentToolReceipts/.test(mode), '正式 Agent 留存工具回执');
assert(/_applyAgentDeterministicInputs\(ctx, gm\)/.test(mode) && mode.indexOf('_applyAgentDeterministicInputs(ctx, gm)') < mode.indexOf("root._endTurn_updateSystems(tr, '')"), 'Agent 在 engine-first 前落地玩家确定性动作');

console.log('[smoke-endturn-mode-parity] pass assertions=' + passed.value);
