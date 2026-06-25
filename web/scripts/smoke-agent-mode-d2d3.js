'use strict';
// smoke-agent-mode-d2d3.js — 深度保障 D2(deepen_factions/economy/military)+D3(deepen_narrative)
//   验:9 工具齐 + 4 新工具各自落对 GM 字段 + _turnReport 入账 + 兜底
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-ai-change-pathutils.js'));
require(path.join(ROOT, 'tm-endturn-record-specs.js'));   // DA-Q2·共享 record-prompt builder·deepen_narrative 据此走 canonical
require(path.join(ROOT, 'tm-endturn-agent-read-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-write-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-depth-tools.js'));
require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const TM = globalThis.TM;
const DT = TM.Endturn.AgentDepthTools;
const AM = TM.Endturn.AgentMode;

// 9 工具齐
const names = DT.defs().map(function (d) { return d.name; });
['deepen_world', 'deepen_npcs', 'recall_consolidate', 'deepen_letters', 'deepen_cognition', 'deepen_factions', 'deepen_economy', 'deepen_military', 'deepen_narrative'].forEach(function (n) {
  assert(names.indexOf(n) >= 0, '工具在:' + n);
});
assert(TM.Endturn.AgentDepthTools.isToolName('deepen_factions'), 'deepen_factions 已注册可达(auto-suite 收尾跑·循环表不挂维度深化·省 token)');

function makeGM() {
  return {
    turn: 3, _turnReport: [{ type: 'narrative', text: '本回合权臣下狱' }], _agentWriteLog: [{ path: 'x', reason: '权臣下狱' }],
    facs: [{ name: '后金', strength: 82, leader: '皇太极' }, { name: '东林', strength: 50 }],
    armies: [{ name: '关宁军', strength: 60, location: '辽东' }], activeWars: [],
    chars: [{ name: '袁崇焕', alive: true, loyalty: 70 }]
  };
}

// 内容感知 stub(按 prompt 返对应 JSON;deepen_narrative 两遍)
function stub(returnByKind) {
  globalThis.callAIMessages = async function (msgs) {
    var u = (msgs && msgs[1] && msgs[1].content) || '';
    if (/脉络/.test(u)) return JSON.stringify({ beats: ['锁拿魏忠贤', '起用袁崇焕'], tone: '肃杀' });
    if (/撰写《后人戏说》|houren_xishuo/.test(u)) { globalThis.__lastHourenUser = u; return JSON.stringify({ houren_xishuo: '是日崇祯独坐乾清宫，至夜未眠……(场景叙事)' }); }
    if (/据此产出完整史记|据此写史记|史记正文|据此写/.test(u)) { globalThis.__lastNarrSys = (msgs && msgs[0] && msgs[0].content) || ''; return JSON.stringify({ shizhengji: '崇祯初政，锁拿权阉，朝野震动。', shilu: '上谕诛阉。', zhengwen: '阉党势颓。', playerStatus: '威望立。', playerInner: '朝野振奋。', suggestions: ['定阁臣'], title: '初政', summary: '崇祯锁拿魏忠贤' }); }
    return JSON.stringify(returnByKind);
  };
}

(async function () {
  // deepen_factions
  var gm = makeGM();
  stub({ factions: [{ name: '后金', intent: '绕道破塞', move: '联蒙古', toward_player: '敌对·伺机南下', stance_delta: -10 }, { name: '东林', intent: '复起掌朝', move: '荐贤', toward_player: '亲附', stance_delta: 12 }], undercurrents: [{ faction: '阉党残余', type: '离心', description: '失势后暗结', impact: '掣肘新政' }], schemes: [{ schemer: '阉党残余', target: '东林', plan: '构陷反扑', progress: '酝酿' }] });
  var r = await DT.handle('deepen_factions', {}, { GM: gm });
  assert(r.ok === true, 'deepen_factions ok');
  var hj = gm.facs.find(function (f) { return f.name === '后金'; });
  assert(hj._aiAssessment && /绕道破塞/.test(hj._aiAssessment.intent) && hj._aiAssessment._agent, 'deepen_factions 落 facs._aiAssessment');
  assert(hj._stanceShift === -10, 'stance_delta 落 _stanceShift');
  assert(Array.isArray(gm._factionUndercurrents) && gm._factionUndercurrents.some(function (u) { return /暗结/.test(u.description) && u._agent; }), 'deepen_factions 产 _factionUndercurrents(势力暗流·⑤)');
  assert(Array.isArray(gm.activeSchemes) && gm.activeSchemes.some(function (s) { return s.schemer === '阉党残余' && /构陷/.test(s.plan) && s._agent; }), 'deepen_factions 产 activeSchemes(活跃阴谋·⑤)');
  assert(gm._turnReport.some(function (e) { return e._op === 'deepen_factions'; }), 'deepen_factions 入 _turnReport');

  // deepen_economy
  gm = makeGM();
  stub({ assessment: '太仓亏空·九边饷绌', risks: ['辽饷', '赈灾'], trends: ['赤字扩大'], fiscal_pressure: '9·辽饷压顶' });
  r = await DT.handle('deepen_economy', {}, { GM: gm });
  assert(r.ok === true && gm._economyDeepening && /太仓亏空/.test(gm._economyDeepening.assessment) && gm._economyDeepening.risks.length === 2, 'deepen_economy 落 _economyDeepening');
  assert(gm._turnReport.some(function (e) { return e._op === 'deepen_economy'; }), 'deepen_economy 入 _turnReport');

  // deepen_military
  gm = makeGM();
  stub({ assessment: '辽东危殆·关宁独支', threats: ['后金', '蒙古'], recommendations: ['补饷', '固关宁'], war_risk: '8·后金压境' });
  r = await DT.handle('deepen_military', {}, { GM: gm });
  assert(r.ok === true && gm._militaryDeepening && /辽东危殆/.test(gm._militaryDeepening.assessment) && gm._militaryDeepening.threats.length === 2, 'deepen_military 落 _militaryDeepening');
  assert(gm._turnReport.some(function (e) { return e._op === 'deepen_military'; }), 'deepen_military 入 _turnReport');

  // deepen_narrative(两遍·替单遍叙事)
  gm = makeGM();
  stub({});
  r = await DT.handle('deepen_narrative', {}, { GM: gm });
  assert(r.ok === true, 'deepen_narrative ok');
  var narrs = gm._turnReport.filter(function (e) { return e.type === 'narrative'; });
  assert(narrs.length === 1 && narrs[0]._polished && /锁拿权阉/.test(narrs[0].text), 'deepen_narrative 替为打磨稿(单条·_polished)');
  assert(gm._turnReport.some(function (e) { return e.type === 'summary'; }) && gm._narrativePolished, 'deepen_narrative 出摘要 + 标 _narrativePolished');

  // DA-Q2·证 deepen_narrative 史记提示词源自共享 recordSpecs(与 sc1 逐字同源·零 drift·非旧 paraphrase)
  var _ns = globalThis.__lastNarrSys || '';
  assert(/干支/.test(_ns) && /记事不评论/.test(_ns) && /实录体/.test(_ns), 'deepen_narrative 实录用 canonical recordSpecs.shilu(与 sc1 同源·文言实录体强化版)');
  assert(/仿崇祯朝政纪要体/.test(_ns) && /完整因果链/.test(_ns), 'deepen_narrative 时政记正文用 canonical recordSpecs.shizhengji');
  assert(/主角内心独白/.test(_ns), 'deepen_narrative playerInner 用 canonical 主角内心独白(修正旧"朝野反响"语义漂移)');
  assert(!/稗官野史口吻一句/.test(_ns) && !/朝野对君上本回合举措的反响/.test(_ns), 'deepen_narrative 旧 paraphrase(houren 一句/playerInner 朝野反响)已废');
  // DA-Q2b·证 houren 改由专项 pass(镜像管线 sc2·用共享 hourenSpec 全块)·非挤在多字段调用
  var _hu = globalThis.__lastHourenUser || '';
  assert(/撰写《后人戏说》/.test(_hu) && /【字数】/.test(_hu) && /情绪基调/.test(_hu), 'deepen_narrative houren 走专项 pass·用 canonical hourenSpec 全块(镜像 sc2·与 followup 同源)');
  assert(gm._agentChronicle && /场景叙事/.test(gm._agentChronicle.hourenXishuo || ''), 'houren 专项 pass 结果入 _agentChronicle.hourenXishuo(富叙事·替旧≤50一句)');

  // 兜底:网关缺失
  var saved = globalThis.callAIMessages; delete globalThis.callAIMessages;
  r = await DT.handle('deepen_factions', {}, { GM: makeGM() });
  assert(!r.ok && /callAIMessages/.test(r.text), 'deepen_factions 网关缺失→兜底');
  globalThis.callAIMessages = saved;

  console.log('[smoke-agent-mode-d2d3] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
