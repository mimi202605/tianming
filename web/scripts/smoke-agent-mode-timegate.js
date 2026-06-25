'use strict';
// ============================================================
// smoke-agent-mode-timegate.js — agent 模式:本回合时间上下文 + 诏令登记兜底 + 质量闸修补健壮
//   ① _timeContext:纪元日期(getTSText)+ 本回合历时(_getDaysPerTurn)+ 时间相关后果指引·缺函数降级不崩
//   ② _registerPlayerEdicts:登记 input.edicts → _edictTracker(prep 未跑时兜底)·去重(prep 已登记的不重复)
//   ③ qualityGate 修补健壮:畸形 JSON 修补响应仍能抽出 shizhengji 并应用(治"抓到却没修补")
//   纯 node·stub·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const AM = globalThis.TM.Endturn.AgentMode;
assert(typeof AM.timeContext === 'function' && typeof AM.registerPlayerEdicts === 'function', '新函数已导出');

// ① _timeContext
(function () {
  globalThis.getTSText = function (t) { return '崇祯元年' + (t === 6 ? '八月' : (t === 7 ? '九月' : ('第' + t + '期'))); };
  globalThis._getDaysPerTurn = function () { return 30; };
  const tc = AM.timeContext({ turn: 7, eraName: '崇祯' }, 6);
  assert(/本回合时间/.test(tc) && /崇祯元年八月/.test(tc), '_timeContext 含纪元+当前日期(getTSText)');
  assert(/九月/.test(tc), '_timeContext 含本回合终点日期(→下回合·跨度)');
  assert(/30 天/.test(tc) && /个月/.test(tc), '_timeContext 含本回合历时(天+月)');
  assert(/十日内|赴任|行程|换季|跨回合/.test(tc), '_timeContext 含时间相关后果推演指引(期限/行程/农时)');
  delete globalThis.getTSText;
  const tc2 = AM.timeContext({ turn: 7, eraName: '崇祯' }, 6);
  assert(typeof tc2 === 'string' && /第6回|本回合时间/.test(tc2), '_timeContext 缺 getTSText → 降级不崩(报回合数)');
})();

// ② _registerPlayerEdicts
(function () {
  const gm1 = { turn: 6 };
  const n1 = AM.registerPlayerEdicts(gm1, { input: { edicts: ['彻查辽饷亏空·户部三日具实数', '命袁崇焕经略辽东整饬关宁'] } }, 6);
  assert(n1 === 2 && Array.isArray(gm1._edictTracker) && gm1._edictTracker.length === 2, '登记 2 道诏令进 _edictTracker(prep 未跑时兜底)');
  assert(gm1._edictTracker[0].content && gm1._edictTracker[0].status === 'pending' && gm1._edictTracker[0].turn === 6 && gm1._edictTracker[0].progressPercent === 0 && gm1._edictTracker[0]._agentRegistered, '登记形状对齐 prep(content/status/turn/progressPercent)+_agentRegistered 标');
  const gm2 = { turn: 6, _edictTracker: [{ id: 'prep1', content: '彻查辽饷亏空·户部三日具实数·严禁冒支', category: '财政', turn: 6, status: 'pending', progressPercent: 10 }] };
  const n2 = AM.registerPlayerEdicts(gm2, { input: { edicts: ['彻查辽饷亏空·户部三日具实数'] } }, 6);
  assert(n2 === 0 && gm2._edictTracker.length === 1, '去重:prep 已登记同源诏令 → 不重复登记(防双登记)');
  assert(AM.registerPlayerEdicts({ turn: 6 }, { input: {} }, 6) === 0, '无诏令 → 登记0');
})();

// ③ 质量闸修补健壮(畸形 JSON 仍抽出 shizhengji)
(async function () {
  globalThis.getTSText = function (t) { return 'D' + t; };
  globalThis.P = { conf: {} };
  globalThis.callAIMessages = async function (msgs) {
    const sys = (msgs && msgs[0] && msgs[0].content) || '';
    if (/审读官/.test(sys)) return JSON.stringify({ pass: false, issues: [{ dim: '一致', problem: '让已故者上奏', fix: '改他人' }] });
    if (/据审读意见修订/.test(sys)) return '{"shizhengji":"修订后:改由孙承宗上奏\n朝野称便，物议稍平。","shilu":"实录修订"}'; // 字面换行→标准 JSON.parse 失败·须健壮抽取
    return '{}';
  };
  const longSzj = '崇祯元年春，陛下诏彻查辽饷，户部三日呈实数，然积弊已深，实数迟迟未上，边军告急，物议沸然，朝野侧目，督师忧之。';
  const gm = { turn: 5, _agentChronicle: { shizhengji: longSzj }, _turnReport: [], chars: [] };
  const r = await AM.qualityGate({ GM: gm }, gm, {}, longSzj);
  assert(r && r.repaired === true && /改由孙承宗/.test(r.narrative), '质量闸:畸形 JSON 修补响应仍健壮抽出 shizhengji 并应用(治抓到却没修补)');
  assert(/改由孙承宗/.test(gm._agentChronicle.shizhengji) && gm._agentQualityReport.repaired === true, '_agentChronicle.shizhengji 更新+_agentQualityReport.repaired=true');

  console.log('[smoke-agent-mode-timegate] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
