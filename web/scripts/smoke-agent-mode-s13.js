'use strict';
// ============================================================
// smoke-agent-mode-s13.js — 「模式 b · agent 模式」S13 深化工具·deepen_letters(sc1b)/deepen_cognition(sc07)
//   验:书信→GM.letters(正确形状) + 认知→_npcCognition(动态层·保留稳定画像) + 兜底 + 接入
// ============================================================

const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const DT = TM.Endturn.AgentDepthTools;
const AM = TM.Endturn.AgentMode;

assert(DT.isToolName('deepen_letters') && DT.isToolName('deepen_cognition'), 'deepen_letters/deepen_cognition 工具在');

function makeGM() {
  return {
    turn: 9, _turnReport: [{ type: 'narrative', text: '权臣下狱·北境告急' }], _agentWriteLog: [{ path: 'x', reason: '权臣下狱' }],
    chars: [{ name: '张三', alive: true, loyalty: 20, ambition: 80, faction: '北府' }, { name: '李四', alive: true, loyalty: 60 }],
    letters: []
  };
}

(async function () {
  // ── deepen_letters → GM.letters ──
  var gm = makeGM();
  globalThis.callAIMessages = async function () {
    return JSON.stringify({ letters: [
      { from: '张三', to: '玩家', letterType: 'plea', urgency: 'urgent', content: '臣冤·乞陛下明察' },
      { from: '李四', to: '张三', letterType: 'private', content: '兄稍安' }
    ] });
  };
  var r = await DT.handle('deepen_letters', {}, { GM: gm });
  assert(r.ok === true && gm.letters.length === 2, 'deepen_letters 推 2 封入 GM.letters');
  var L0 = gm.letters[0];
  assert(L0.from === '张三' && L0.to === '玩家' && /乞陛下明察/.test(L0.content) && L0.status === 'delivered' && L0._npcInitiated && L0._playerRead === false && L0._agent && L0.id, '书信形状正确(from/to/content/status/_npcInitiated/_playerRead/id)');
  assert(gm._turnReport.some(function (e) { return e._op === 'deepen_letters'; }), '书信入 _turnReport');

  // ── deepen_cognition → _npcCognition(保留稳定画像) ──
  gm = makeGM();
  gm._npcCognition = { '张三': { selfIdentity: '忠直老臣', personalityCore: '刚介' } };  // 预置稳定画像
  globalThis.callAIMessages = async function () {
    return JSON.stringify({ npcs: [
      { name: '张三', currentView: '疑君上受奸佞蒙蔽', recognition: '已察觉构陷出自政敌' },
      { name: '查无此人', currentView: 'x' }
    ] });
  };
  r = await DT.handle('deepen_cognition', {}, { GM: gm });
  assert(r.ok === true, 'deepen_cognition 成功');
  var cog = gm._npcCognition['张三'];
  assert(cog && /疑君上受奸佞/.test(cog.currentView) && /已察觉构陷/.test(cog.recognition) && cog._agent && cog._lastCogTurn === 9, '动态认知层落 _npcCognition(currentView/recognition)');
  assert(cog.selfIdentity === '忠直老臣' && cog.personalityCore === '刚介', '★保留稳定画像(selfIdentity/personalityCore 没被覆盖)');
  assert(!gm._npcCognition['查无此人'], '名字不匹配存活角色 → 跳过');

  // ── 兜底 ──
  var saved = globalThis.callAIMessages;
  delete globalThis.callAIMessages;
  r = await DT.handle('deepen_letters', {}, { GM: makeGM() });
  assert(!r.ok && /callAIMessages/.test(r.text), 'letters 网关缺失→兜底');
  r = await DT.handle('deepen_cognition', {}, { GM: makeGM() });
  assert(!r.ok && /callAIMessages/.test(r.text), 'cognition 网关缺失→兜底');
  globalThis.callAIMessages = async function () { return '非JSON'; };
  r = await DT.handle('deepen_letters', {}, { GM: makeGM() });
  assert(!r.ok && /解析失败|空/.test(r.text), 'letters 解析失败→兜底');
  globalThis.callAIMessages = saved;

  // ── 接入(注册可达·auto-suite 收尾跑·循环表不再挂维度深化)──
  var _DTn = globalThis.TM.Endturn.AgentDepthTools;
  assert(_DTn.isToolName('deepen_letters') && _DTn.isToolName('deepen_cognition'), '两新工具已注册可达(auto-suite·循环表不挂)');

  console.log('[smoke-agent-mode-s13] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
