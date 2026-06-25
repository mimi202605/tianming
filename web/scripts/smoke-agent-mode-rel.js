'use strict';
// ============================================================
// smoke-agent-mode-rel.js — 「模式 b · 关系写回 + 记忆加厚」(2026-06-22·owner"agent推演完会写回官职/记忆/关系吗")
//   命门:mode A 靠 applyAITurnChanges 把 LLM 吐的 relations 数组→applyNpcInteraction 写回 char.relations;
//         mode B 原本完全没有这条·推演里的人物恩怨落不到关系数据。deepen_relations 走同一入口补齐。
//   验:① deepen_relations 走 canonical applyNpcInteraction 写回(与 mode A 同一入口·零漂移)
//       ② 容错(中文标签→key) + 过滤(自指/不存在人物/势力级 historyType type 全滤)
//       ③ 落 _turnReport type:relation(同 mode A 格式)+ applyNpcInteraction 未加载优雅回落
//       ④ deepen_npcs 除 _scars 外·同步写 canonical _memory(NpcMemorySystem.remember·决策核心字段)
//   纯 node·stub applyNpcInteraction/NpcMemorySystem·断言被正确调用。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
const DT = globalThis.TM.Endturn.AgentDepthTools;
assert(DT && DT.isToolName('deepen_relations'), 'deepen_relations 工具已注册');

// canonical 交互词表(精简·含人际 type + 一个势力级带 historyType 验过滤)
globalThis.NPC_INTERACTION_TYPES = {
  impeach: { label: '弹劾', conflict: 1, effect: { affinity: -15, hostility: 15 } },
  recommend: { label: '举荐', conflict: 0, effect: { respect: 8 } },
  betray: { label: '背叛', conflict: 3, effect: { trust: -50 } },
  declare_war: { label: '宣战', historyType: 'war', effect: { hostility: 50 } }  // 势力级·须被过滤
};

function makeGM() {
  return {
    turn: 5, chars: [
      { name: '袁崇焕', loyalty: 70, alive: true },
      { name: '魏忠贤', loyalty: 20, alive: true },
      { name: '钱龙锡', loyalty: 60, alive: true }
    ],
    _turnReport: [], _agentWriteLog: []
  };
}

(async function () {
  // ── ① + ② + ③ deepen_relations 写回 + 容错 + 过滤 ──
  const gm = makeGM();
  const interactions = [];
  globalThis.applyNpcInteraction = function (actor, target, type, extra) { interactions.push({ actor: actor, target: target, type: type, extra: extra }); return true; };
  globalThis.callAIMessages = async function () {
    return JSON.stringify({ relations: [
      { actor: '袁崇焕', target: '魏忠贤', type: 'impeach', reason: '查辽饷牵出阉党' },
      { actor: '钱龙锡', target: '袁崇焕', type: '举荐', reason: '荐其督师' },        // 中文标签·验容错→recommend
      { actor: '魏忠贤', target: '魏忠贤', type: 'betray', reason: '自指·须滤' },      // 自指·滤
      { actor: '某虚构', target: '袁崇焕', type: 'impeach', reason: '不存在人物·滤' }, // 不存在·滤
      { actor: '袁崇焕', target: '钱龙锡', type: 'declare_war', reason: '势力级type·滤' } // historyType·滤
    ] });
  };
  const r = await DT.handle('deepen_relations', {}, { GM: gm });
  assert(r && r.ok, 'deepen_relations 返回 ok(有落地)');
  assert(interactions.length === 2, '② 只 2 桩合法关系落地(自指/不存在/势力级 type 全滤)·实际=' + interactions.length);
  assert(interactions.some(function (i) { return i.actor === '袁崇焕' && i.target === '魏忠贤' && i.type === 'impeach'; }), '① 弹劾走 applyNpcInteraction 写回(与 mode A 同一入口)');
  assert(interactions.some(function (i) { return i.type === 'recommend'; }), '② 中文标签「举荐」容错→canonical key recommend');
  assert(interactions.every(function (i) { return i.extra && i.extra._agent; }), 'applyNpcInteraction extra 带 _agent 标(可溯源)');
  const relReports = (gm._turnReport || []).filter(function (x) { return x.type === 'relation' && x._op === 'deepen_relations'; });
  assert(relReports.length === 2, '③ 落 2 条 _turnReport type:relation(同 mode A 格式)');
  assert(relReports[0].actor && relReports[0].target && relReports[0].interaction, '③ relation 报告含 actor/target/interaction');

  // applyNpcInteraction 未加载(node 无引擎)→优雅回落不崩
  const gm2 = makeGM(); delete globalThis.applyNpcInteraction;
  const r2 = await DT.handle('deepen_relations', {}, { GM: gm2 });
  assert(r2 && !r2.ok && /applyNpcInteraction 未加载/.test(r2.text), '③ applyNpcInteraction 未加载时优雅回落(不崩)');
  globalThis.applyNpcInteraction = function () { return true; };

  // ── ④ deepen_npcs 同步写 canonical _memory(非只 _scars) ──
  const gm3 = makeGM();
  const remembered = [];
  globalThis.NpcMemorySystem = { remember: function (name, event, emotion, importance, related, meta) { remembered.push({ name: name, event: event, emotion: emotion, importance: importance, meta: meta }); } };
  globalThis.callAIMessages = async function () {
    return JSON.stringify({ npcs: [{ name: '袁崇焕', mood: '忧惧', stress_delta: 12, inner: '辽饷掣肘·恐五年复辽成空', hidden_intent: '暗结东林自固' }] });
  };
  const r3 = await DT.handle('deepen_npcs', {}, { GM: gm3 });
  assert(r3 && r3.ok, 'deepen_npcs 返回 ok');
  const ch = gm3.chars.filter(function (c) { return c.name === '袁崇焕'; })[0];
  assert(Array.isArray(ch._scars) && ch._scars.length === 1, 'deepen_npcs 仍写 _scars(刻骨铭心层·原有不丢)');
  assert(remembered.length === 1 && remembered[0].name === '袁崇焕', '④ deepen_npcs 同步写 canonical _memory(NpcMemorySystem.remember 被调·决策核心字段)');
  assert(remembered[0].emotion === '忧惧' && remembered[0].importance >= 3 && remembered[0].importance <= 9, '④ _memory 记情绪 + importance(随 stress_delta 缩放·3-9)');
  assert(remembered[0].meta && remembered[0].meta._agent, '④ _memory 带 _agent 标(可溯源)');

  // NpcMemorySystem 未加载 → deepen_npcs 不崩(_memory 写在 try 包·_scars 照写)
  const gm4 = makeGM(); delete globalThis.NpcMemorySystem;
  globalThis.callAIMessages = async function () { return JSON.stringify({ npcs: [{ name: '魏忠贤', mood: '惊', stress_delta: 8, inner: '查饷恐露馅' }] }); };
  const r4 = await DT.handle('deepen_npcs', {}, { GM: gm4 });
  assert(r4 && r4.ok, '④ NpcMemorySystem 未加载时 deepen_npcs 仍 ok(_memory 写入 try 包·不崩)');

  console.log('[smoke-agent-mode-rel] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
