'use strict';
// smoke-agent-mode-d7.js — D7 产出焊缝:agent 的 aiResult 映射成史记弹窗渲染器期望的富结构
//   验:① 调 deepen_narrative → _agentChronicle → aiResult.shizhengji/szjTitle/hourenXishuo/szjSummary 富
//       ② 未调 → shizhengji 回落 finalize narrative(主体不空) ③ personnelChanges 从 _turnReport 抽
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));   // DA-Q2/Q2b·recordSpecs + hourenSpec(deepen_narrative 史记/houren 专项)
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const AM = TM.Endturn.AgentMode;

delete globalThis._endTurn_updateSystems;
// 仅断 prompt.build(强制薄 baseline·聚焦产出焊缝)·保留 recordSpecs/hourenSpec 供 deepen_narrative 史记/houren 专项
if (TM.Endturn.AI && TM.Endturn.AI.prompt) TM.Endturn.AI.prompt.build = null;
globalThis.P = { conf: { agentModeDepthGate: false } };  // 门关·聚焦产出焊缝

(async function () {
  // ── A:调 deepen_narrative → 富 aiResult ──
  globalThis.callAIMessages = async function (msgs) {
    var u = (msgs && msgs[1] && msgs[1].content) || '';
    if (/脉络/.test(u)) return JSON.stringify({ beats: ['甲'], tone: 't' });
    if (/撰写《后人戏说》|houren_xishuo/.test(u)) return JSON.stringify({ houren_xishuo: '史家曰：刚毅之始。' });   // DA-Q2b·houren 专项 pass
    if (/史记/.test(u)) return JSON.stringify({ shizhengji: '崇祯锁拿权阉，朝野肃然。', shilu: '上谕：魏忠贤罪恶昭彰，著锁拿究问。', zhengwen: '是月阉党势颓，东林渐起。', playerStatus: '新帝威望渐立。', playerInner: '朝野振奋，观望者众。', suggestions: ['宜速定阁臣', '防辽东兵变'], title: '初政诛阉', summary: '锁拿魏忠贤' });
    return JSON.stringify({});
  };
  var siA = 0; var scriptA = [{ toolCalls: [{ name: 'deepen_narrative', input: {} }, { name: 'finalize_turn', input: { narrative: '兜底叙事', summary: '兜底摘要' } }], text: '' }];
  globalThis.callAIWithTools = async function () { var r = scriptA[siA] || { toolCalls: [], text: '' }; siA++; return r; };
  var gmA = { turn: 1, guoku: { money: 1, balance: 1 }, chars: [], facs: [], _turnReport: [{ type: 'change', _op: 'dismiss', path: 'chars/魏忠贤', reason: '夺职下狱', _agent: true }] };  // _op:'dismiss'=写工具真实值(非 dismiss_official)
  var resA = await AM.run({ GM: gmA, input: {} });
  var ar = resA.aiResult;
  assert(resA.ok === true && ar, 'A·run 成功 + 带 aiResult');
  assert(ar.shizhengji === '崇祯锁拿权阉，朝野肃然。', 'A·shizhengji(时政记)来自 deepen_narrative·非兜底');
  assert(ar.shiluText === '上谕：魏忠贤罪恶昭彰，著锁拿究问。', 'A·shiluText(实录)填·四体之一');
  assert(ar.zhengwen === '是月阉党势颓，东林渐起。', 'A·zhengwen(政文)填·四体之一');
  assert(ar.szjTitle === '初政诛阉', 'A·szjTitle(时政记标题)填');
  assert(ar.hourenXishuo === '史家曰：刚毅之始。', 'A·hourenXishuo(后人系说)填');
  assert(ar.turnSummary === '锁拿魏忠贤' && ar.szjSummary === '锁拿魏忠贤', 'A·turnSummary/szjSummary 填(键对渲染器)');
  assert(ar.playerStatus === '新帝威望渐立。' && ar.playerInner === '朝野振奋，观望者众。', 'A·playerStatus/playerInner(君上状态/朝野反响)填·record 契约');
  assert(Array.isArray(ar.suggestions) && ar.suggestions.length === 2 && /阁臣/.test(ar.suggestions[0]), 'A·suggestions(宰辅进言)填·record 契约');
  assert(Array.isArray(ar.personnelChanges) && ar.personnelChanges.some(function (p) { return /魏忠贤/.test(p.name) && p.action === 'dismiss'; }), 'A·personnelChanges 从 _turnReport 抽(人物变动非空)');
  // 旧键也在(兼容)
  assert(ar.agentMode === true && ar.narrative && typeof ar.writeOk === 'number', 'A·agent 元字段仍在(agentMode/narrative/writeOk)');

  // ── B:未调 deepen_narrative → shizhengji 回落 finalize narrative ──
  var siB = 0; var scriptB = [{ toolCalls: [{ name: 'finalize_turn', input: { narrative: '本回合无大事，君上理政。', summary: '理政' } }], text: '' }];
  globalThis.callAIWithTools = async function () { var r = scriptB[siB] || { toolCalls: [], text: '' }; siB++; return r; };
  var gmB = { turn: 1, guoku: { money: 1, balance: 1 }, chars: [], facs: [], _turnReport: [] };
  var resB = await AM.run({ GM: gmB, input: {} });
  assert(resB.aiResult.shizhengji === '本回合无大事，君上理政。', 'B·无 deepen_narrative → shizhengji 回落 finalize narrative(主体仍不空)');
  assert(resB.aiResult.turnSummary === '理政', 'B·turnSummary 仍填');
  assert(Array.isArray(resB.aiResult.personnelChanges) && resB.aiResult.personnelChanges.length === 0, 'B·无人事变动时 personnelChanges 空数组(不报错)');

  console.log('[smoke-agent-mode-d7] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
