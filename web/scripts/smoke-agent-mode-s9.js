'use strict';
// ============================================================
// smoke-agent-mode-s9.js — 「模式 b · agent 模式」S9 依据同源守卫
//   验:agent baseline 复用 LLM prompt builder 产出(ctx.prompt.sysP+tp)→ LLM 依据自动同步进 agent
//       + 框住"忽略输出指令" + build 不可用时回落薄 baseline + _basisDossier 单元
// ============================================================

const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const AM = TM.Endturn.AgentMode;

function makeGM() { return { turn: 5, guoku: { balance: 1000 }, chars: [], facs: [], evtLog: [], _turnReport: [] }; }
function setCap() { var prompts = []; var i = 0; var script = [{ toolCalls: [{ name: 'finalize_turn', input: { narrative: 'x', summary: 's' } }], text: '' }]; globalThis.callAIWithTools = async function (p) { prompts.push(p); return script[i++] || { toolCalls: [], text: '' }; }; return prompts; }

(async function () {
  globalThis.P = { conf: { agentModeDepthGate: false } };  // S9 测依据同源·深度门(D1)由 d1d6 专测
  delete globalThis._endTurn_updateSystems; // 不跑 engine-first(node 无引擎)

  // ── A·依据同源:stub LLM build 注入 sysP/tp·验 agent transcript 含之 ──
  TM.Endturn.AI = TM.Endturn.AI || {};
  TM.Endturn.AI.prompt = { build: async function (c) { c.prompt = { sysP: '<<SYSP_MARK 敌方宁远74 边境军情>>', tp: '<<TP_MARK 驿路 阻力 诏令生命周期>>' }; } };
  var gmA = makeGM(); var ctxA = { GM: gmA, input: { edicts: ['诏令A'] } };
  var promptsA = setCap();
  var resA = await AM.run(ctxA);
  assert(resA.ok === true, 'A·run 成功');
  assert(promptsA.length >= 1, 'A·捕获到 transcript');
  var t = promptsA[0];
  assert(t.indexOf('<<SYSP_MARK') >= 0 && t.indexOf('<<TP_MARK') >= 0, 'A·transcript 含 LLM 注入的 sysP+tp 依据(自动同步)');
  assert(t.indexOf('与 LLM 模式同源') >= 0 && t.indexOf('忽略') >= 0, 'A·含"同源"框住语 + "忽略输出指令"');
  assert(t.indexOf('局内执政') >= 0, 'A·mode B 自身 system prompt(执政 agent 角色)仍在');
  assert(ctxA.prompt && ctxA.prompt.tp, 'A·build(ctx) 被调用·ctx.prompt 已建');

  // ── B·build 不可用 → 回落薄 baseline ──
  delete TM.Endturn.AI.prompt;
  var gmB = makeGM(); var ctxB = { GM: gmB, input: { edicts: ['诏令B'] } };
  var promptsB = setCap();
  var resB = await AM.run(ctxB);
  assert(resB.ok === true, 'B·回落路径 run 成功');
  var tb = promptsB[0];
  assert(tb.indexOf('<<SYSP_MARK') < 0 && tb.indexOf('<<TP_MARK') < 0, 'B·无 LLM 依据(build 不可用)');
  assert(tb.indexOf('君上') >= 0 || tb.indexOf('速览') >= 0 || tb.indexOf('本回合') >= 0, 'B·用薄 baseline(君上诏令/速览)');
  assert(tb.indexOf('局内执政') >= 0, 'B·mode B system prompt 仍在');

  // ── C·_basisDossier 单元(若导出) ──
  if (typeof AM._basisDossier === 'function') {
    TM.Endturn.AI.prompt = { build: async function (c) { c.prompt = { sysP: 'S1', tp: 'T1' }; } };
    var d = await AM._basisDossier({ GM: makeGM(), input: {} }, makeGM());
    assert(d && d.indexOf('S1') >= 0 && d.indexOf('T1') >= 0, 'C·_basisDossier 返含 sysP+tp');
    delete TM.Endturn.AI.prompt;
    var d2 = await AM._basisDossier({ GM: makeGM(), input: {} }, makeGM());
    assert(d2 === null, 'C·build 不可用 → _basisDossier 返 null');
  } else {
    assert(true, 'C·_basisDossier 未单独导出(跳过单元·已由 A/B 间接验)');
  }

  console.log('[smoke-agent-mode-s9] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
