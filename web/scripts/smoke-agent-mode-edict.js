'use strict';
// ============================================================
// smoke-agent-mode-edict.js — 切片3·agent 跨回合一致·诏令督查(复用 TM.EdictOversight)
//   验:① activeEdicts 读 _edictTracker(跨模式通用·排除已了结) ② buildRequest opts.evidence(agent 无 subcall1 时用推演实绩·LLM 有 subcall1 则不用·零影响)
//       ③ agent-mode _activeEdictsDossier(在办诏令+近期已故注入)+ agentEdictOversightOn 开关(默认关)
//   纯 node·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-edict-oversight.js'));
const EO = globalThis.TM.EdictOversight;
assert(EO && typeof EO.activeEdicts === 'function', 'EdictOversight.activeEdicts 已导出');

// ① activeEdicts 读 _edictTracker(跨模式通用·排除已了结/已满)
(function () {
  const gm = { turn: 10, _edictTracker: [
    { turn: 6, category: '军务', content: '整饬关宁军备补足火器', status: 'partial', progressPercent: 40, assignee: '袁崇焕' },
    { turn: 9, category: '财赋', content: '彻查辽饷亏空', status: 'pending', progressPercent: 10 },
    { turn: 2, category: '旧诏', content: '历八回合仍在办', status: 'pending', progressPercent: 5 },
    { turn: 5, category: '已完成', content: '已执行不该追', status: 'executed', progressPercent: 100 }
  ] };
  const act = EO.activeEdicts(gm);
  assert(act.length === 3, 'activeEdicts 收未了结活诏令(排除 executed)·得3道');
  assert(act.some(function (e) { return /关宁军备/.test(e.content); }), '含在办军务诏');
  assert(!act.some(function (e) { return /已执行不该追/.test(e.content); }), '已 executed 的不追');
})();

// ② buildRequest opts.evidence(agent 模式无 subcall1·用本回合推演实绩作执行证据)
(function () {
  const gm = { turn: 10, facs: [{ name: '东林', strength: 60, playerRelation: 20 }], _edictTracker: [{ turn: 6, content: '整饬军备', status: 'partial', progressPercent: 40 }] };
  const reqWith = EO.buildRequest(gm, EO.activeEdicts(gm), { evidence: '本回合袁崇焕到任·关宁军补火器三成·然军饷仍欠。' });
  assert(/关宁军补火器三成/.test(reqWith.user), 'agent 模式 opts.evidence 进入督查 prompt(执行证据)');
  // LLM 模式有 subcall1 → ev 来自 p1·不用 opts.evidence(零影响铁证)
  const gm2 = { turn: 10, _turnAiResults: { subcall1: { shizhengji: 'LLM时政记原文' } }, _edictTracker: [{ turn: 6, content: '整饬军备', status: 'partial', progressPercent: 40 }] };
  const reqLLM = EO.buildRequest(gm2, EO.activeEdicts(gm2), { evidence: '不该用的agent证据' });
  assert(/LLM时政记原文/.test(reqLLM.user) && !/不该用的agent证据/.test(reqLLM.user), 'LLM 模式有 subcall1 时不用 opts.evidence(对 LLM 零影响)');
})();

// ③ agent-mode _activeEdictsDossier + 开关
(function () {
  require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
  const AM = globalThis.TM.Endturn.AgentMode;
  assert(typeof AM.agentEdictOversightOn === 'function' && typeof AM.activeEdictsDossier === 'function', '切片3 函数已导出');
  assert(AM.agentEdictOversightOn({ conf: { agentEdictOversightEnabled: true } }) === true, '开关读 P.conf.agentEdictOversightEnabled=true');
  assert(AM.agentEdictOversightOn({ conf: {} }) === false, '默认关(无 agentEdictOversightEnabled)');
  // dossier:在办诏令(进度) + 近期已故(防复活)
  const gm = { turn: 10, _edictTracker: [{ turn: 6, category: '军务', content: '整饬关宁军备', status: 'partial', progressPercent: 40, assignee: '袁崇焕' }], chars: [{ name: '王化贞', alive: false, deathTurn: 8 }, { name: '老臣', alive: false, deathTurn: 1 }] };
  const dossier = AM.activeEdictsDossier(gm);
  assert(/在办诏令/.test(dossier) && /整饬关宁军备/.test(dossier) && /40%/.test(dossier), 'dossier 含在办诏令(进度/跨回合追踪)');
  assert(/已故/.test(dossier) && /王化贞/.test(dossier), 'dossier 含近期已故(T8·防复活/误用)');
  assert(!/老臣/.test(dossier), '太久前死的(T1·距今9回合>8)不列(防 bloat)');
  assert(AM.activeEdictsDossier({ turn: 10, _edictTracker: [], chars: [] }) === '', '无活诏令/无近期死 → 空串(不占位)');
})();

console.log('[smoke-agent-mode-edict] pass assertions=' + passed.value);
