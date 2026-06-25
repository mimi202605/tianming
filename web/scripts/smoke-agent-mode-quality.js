'use strict';
// ============================================================
// smoke-agent-mode-quality.js — 切片2·agent 内容质量闸(成文后审查因果/信史/一致·不过则一轮修补)
//   验:① agentQualityGateOn 开关(默认关) ② 审查通过→不修补原文不动 ③ 审查不过→单发修补一次(防循环)·_agentChronicle 更新 ④ 内容太短→跳过不耗调用
//   纯 node·stub callAIMessages·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const AM = globalThis.TM.Endturn.AgentMode;
assert(typeof AM.agentQualityGateOn === 'function' && typeof AM.qualityGate === 'function', '切片2 函数已导出');
assert(AM.agentQualityGateOn({ conf: { agentQualityGateEnabled: true } }) === true, '开关读 P.conf.agentQualityGateEnabled=true');
assert(AM.agentQualityGateOn({ conf: {} }) === false, '默认关(无 agentQualityGateEnabled)');

(async function () {
  const longSzj = '崇祯元年春，陛下诏彻查辽饷亏空，户部三日内呈实数，又命袁崇焕经略辽东，整饬关宁军备。然辽饷积弊已深，户部阳奉阴违，实数迟迟未上。';

  // ① 审查通过(无问题)→ 不修补·narrative 不变
  globalThis.callAIMessages = async function (msgs) {
    const sys = (msgs && msgs[0] && msgs[0].content) || '';
    if (/审读官/.test(sys)) return JSON.stringify({ pass: true, issues: [] });
    return '{}';
  };
  const gm1 = { turn: 3, _agentChronicle: { shizhengji: longSzj, shilu: '实录原文' }, _turnReport: [], chars: [] };
  const r1 = await AM.qualityGate({ GM: gm1 }, gm1, {}, longSzj);
  assert(r1 && r1.pass === true && r1.narrative === longSzj, '审查通过→不修补·原文不变');
  assert(gm1._agentQualityReport && gm1._agentQualityReport.pass === true && !gm1._agentQualityReport.repaired, '_agentQualityReport pass=true·未修补');
  assert(gm1._agentChronicle.shizhengji === longSzj, '通过时 _agentChronicle 不动');

  // ② 审查不过(有问题)→ 一轮修补·_agentChronicle 更新
  let reviewCalls = 0, fixCalls = 0;
  globalThis.callAIMessages = async function (msgs) {
    const sys = (msgs && msgs[0] && msgs[0].content) || '';
    if (/审读官/.test(sys)) { reviewCalls++; return JSON.stringify({ pass: false, issues: [{ dim: '一致', problem: '让已故的王化贞上奏', fix: '改为他人或追述' }] }); }
    if (/据审读意见修订/.test(sys)) { fixCalls++; return JSON.stringify({ shizhengji: '修订后:改由孙承宗上奏。', shilu: '修订实录', zhengwen: '修订政文' }); }
    return '{}';
  };
  const gm2 = { turn: 5, _agentChronicle: { shizhengji: longSzj, shilu: '原实录' }, _turnReport: [{ type: 'change', path: 'chars/王化贞', reason: '上奏' }], chars: [{ name: '王化贞', alive: false, deathTurn: 4 }] };
  const r2 = await AM.qualityGate({ GM: gm2 }, gm2, {}, longSzj);
  assert(reviewCalls === 1 && fixCalls === 1, '不过→审查1次+修补1次(各单发·防循环)');
  assert(r2 && r2.repaired === true && /改由孙承宗/.test(r2.narrative), '修补后 narrative=修订史记');
  assert(/改由孙承宗/.test(gm2._agentChronicle.shizhengji), '_agentChronicle.shizhengji 更新为修订版');
  assert(gm2._agentChronicle.shilu === '修订实录', '_agentChronicle.shilu 一并更新');
  assert(gm2._agentQualityReport.repaired === true && gm2._agentQualityReport.issues.length === 1, '_agentQualityReport 记 repaired+issues(观测)');

  // ③ 内容太短 → 跳过(不审·不调 AI)
  let anyCall = 0;
  globalThis.callAIMessages = async function () { anyCall++; return '{}'; };
  const gm3 = { turn: 1, _agentChronicle: { shizhengji: '短' }, _turnReport: [], chars: [] };
  const r3 = await AM.qualityGate({ GM: gm3 }, gm3, {}, '短');
  assert(r3 && r3.skipped === 'tooShort' && anyCall === 0, '内容太短→跳过·不耗 AI 调用');

  console.log('[smoke-agent-mode-quality] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
