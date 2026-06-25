'use strict';
// ============================================================
// smoke-agent-mode-court.js — 「模式 b · 御案时政演化 + 求见 + NPC↔NPC 书信」(2026-06-22·owner"agent 回合推演要产出奏疏/鸿雁/问对/御案时政")
//   命门:老 LLM 推演本有这些·agent 缺。补:① deepen_court 御案时政(新增/更新/解决·镜像 current_issues_update)+ 群臣求见(→_pendingAudiences·tm-wendui 阶下待见消费)
//        ② deepen_letters 改 NPC↔NPC(人物活动·非给君上·允许 0 封)
//   纯 node·stub callAIMessages·断言落到 canonical 字段。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
const DT = globalThis.TM.Endturn.AgentDepthTools;
assert(DT && DT.isToolName('deepen_court'), 'deepen_court 工具已注册');
assert(DT.isToolName('deepen_letters'), 'deepen_letters 工具在');

function makeGM() {
  return {
    turn: 5, chars: [
      { name: '袁崇焕', loyalty: 70, alive: true }, { name: '魏忠贤', loyalty: 20, alive: true },
      { name: '崔呈秀', loyalty: 30, alive: true }, { name: '孙承宗', loyalty: 90, alive: true }
    ],
    currentIssues: [
      { id: 'issue_x', title: '辽饷亏空', description: '旧述', status: 'pending' },
      { id: 'issue_y', title: '旧案待结', description: '陈年', status: 'pending' }
    ],
    _turnReport: [], _agentWriteLog: []
  };
}

(async function () {
  // ── ① deepen_court:御案时政 add/update/resolve + 求见 ──
  const gm = makeGM();
  globalThis.callAIMessages = async function () {
    return JSON.stringify({
      issue_updates: [
        { action: 'add', title: '陕西灾荒', category: '民生', description: '赤地千里·民有流亡之兆' },
        { action: 'update', id: 'issue_x', description: '查出亏空一百六十万两' },
        { action: 'resolve', id: 'issue_y' },
        { action: 'update', id: 'issue_不存在', description: '滤' },        // 不存在 id·滤
        { action: 'add' }                                                  // 缺 title·滤
      ],
      audiences: [
        { name: '袁崇焕', reason: '面陈辽事·请增饷' },
        { name: '某虚构', reason: '不存在人物·滤' },
        { name: '袁崇焕', reason: '重复·去重' }
      ]
    });
  };
  const r = await DT.handle('deepen_court', {}, { GM: gm });
  assert(r && r.ok, 'deepen_court 返回 ok(有产出)');
  // 御案时政
  assert(gm.currentIssues.length === 3, '① 新增 1 条议题(原2→3·缺title/不存在id 被滤)·实=' + gm.currentIssues.length);
  const _new = gm.currentIssues.filter(function (i) { return i.title === '陕西灾荒'; })[0];
  assert(_new && _new.status === 'pending' && _new._agent && _new.category === '民生', '① add:新议题入 currentIssues(status pending·_agent·category)');
  const _x = gm.currentIssues.filter(function (i) { return i.id === 'issue_x'; })[0];
  assert(_x && /一百六十万/.test(_x.description), '① update:旧议题 issue_x 描述被更新(更新旧·非只新增)');
  const _y = gm.currentIssues.filter(function (i) { return i.id === 'issue_y'; })[0];
  assert(_y && _y.status === 'resolved' && _y.resolvedTurn === 5, '① resolve:issue_y 标解决(status resolved + resolvedTurn)');
  // 求见 → _pendingAudiences
  assert(Array.isArray(gm._pendingAudiences) && gm._pendingAudiences.length === 1, '① 求见 1 人入 _pendingAudiences(虚构滤·重复去重)·实=' + (gm._pendingAudiences || []).length);
  assert(gm._pendingAudiences[0].name === '袁崇焕' && /面陈辽事/.test(gm._pendingAudiences[0].reason) && gm._pendingAudiences[0]._agent, '① 求见结构 {name,reason,_agent}(tm-wendui 阶下待见消费)');
  const _cr = (gm._turnReport || []).filter(function (e) { return e._op === 'deepen_court'; });
  assert(_cr.length === 1, '① 落 _turnReport(_op=deepen_court)');

  // ── 全空:本回合无新待决事务 → ok:false 不崩 ──
  const gm2 = makeGM();
  globalThis.callAIMessages = async function () { return JSON.stringify({ issue_updates: [], audiences: [] }); };
  const r2 = await DT.handle('deepen_court', {}, { GM: gm2 });
  assert(r2 && !r2.ok && /无新待决/.test(r2.text), '① 空产出→ok:false(本回合无新待决·不强凑·不崩)');
  assert(gm2.currentIssues.length === 2 && (!gm2._pendingAudiences || !gm2._pendingAudiences.length), '① 空时不污染 currentIssues/_pendingAudiences');

  // ── ② deepen_letters:NPC↔NPC(收信人非玩家) ──
  const gm3 = makeGM();
  globalThis.callAIMessages = async function () {
    return JSON.stringify({ letters: [{ from: '魏忠贤', to: '崔呈秀', letterType: 'intelligence', urgency: 'urgent', content: '密谋拖延辽饷核册·销毁底簿' }] });
  };
  const r3 = await DT.handle('deepen_letters', {}, { GM: gm3 });
  assert(r3 && r3.ok, 'deepen_letters 返回 ok');
  assert(Array.isArray(gm3.letters) && gm3.letters.length === 1, '② 生成 1 封书信入 GM.letters');
  assert(gm3.letters[0].to === '崔呈秀' && gm3.letters[0].to !== '玩家', '② 收信人是 NPC(非玩家·人物活动)');
  assert(gm3.letters[0]._npcInitiated && gm3.letters[0]._agent, '② 书信标 _npcInitiated + _agent');

  // ── ② 允许 0 封:本回合无通信由头 → ok:false 不崩 ──
  const gm4 = makeGM();
  globalThis.callAIMessages = async function () { return JSON.stringify({ letters: [] }); };
  const r4 = await DT.handle('deepen_letters', {}, { GM: gm4 });
  assert(r4 && !r4.ok, '② 空 letters→ok:false(允许 0 封·不强凑·不崩)');
  assert(!gm4.letters || !gm4.letters.length, '② 空时不污染 GM.letters');

  console.log('[smoke-agent-mode-court] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
