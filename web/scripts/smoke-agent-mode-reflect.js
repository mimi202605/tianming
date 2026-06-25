'use strict';
// ============================================================
// smoke-agent-mode-reflect.js — 切片1·agent 自我反思·校准(复用 TM.ReflectionAgent·适配 agent 模式)
//   验:① _actualStructured 在 agent 模式(无 subcall1)回落读 _turnReport 作 ground truth(LLM 模式有 subcall1 则不回落·零影响)
//       ② run(opts.thinking) 用 agent 推演叙事作"预测"基线:首回合存基线不调 AI·次回合比对更新滚动偏差画像
//       ③ formatBiasForSc0 产出注入文本 ④ agent-mode agentSelfReflectOn 开关读 P.conf(默认关)
//   纯 node·stub callAIMessages·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-reflection-agent.js'));
const RA = globalThis.TM.ReflectionAgent;
assert(RA && typeof RA.run === 'function', 'ReflectionAgent.run 已导出');
assert(typeof RA._actualStructured === 'function', '_actualStructured 已导出(测试用)');

// ① agent 模式(无 subcall1)→ _actualStructured 回落读 _turnReport(守护写实际改动)
(function () {
  const gm = { turn: 6, _turnReport: [
    { type: 'change', _op: 'appoint', path: 'chars/袁崇焕', reason: '授蓟辽督师', _agent: true },
    { type: 'change', path: 'guoku', new: 320000, reason: '拨关宁军资', _agent: true },
    { type: 'narrative', text: '叙事条目不算结构化实际', _agent: true }
  ] };
  const actual = RA._actualStructured(gm);
  assert(/袁崇焕/.test(actual) && /appoint/.test(actual), 'agent 模式 _actualStructured 回落读 _turnReport(含守护写改动)');
  assert(/guoku/.test(actual), '_turnReport 中的数值改动也纳入实际');
  assert(!/叙事条目不算结构化/.test(actual), '_actualStructured 不纳入 narrative/summary 条目(只结构化实际)');
})();

// ①-b LLM 模式有 subcall1 → 不触发 _turnReport 回落(零影响铁证)
(function () {
  const gm = { turn: 6, _turnAiResults: { subcall1: { faction_changes: [{ name: '东林', strength_delta: 5 }] } }, _turnReport: [{ type: 'change', path: 'guoku', new: 999, _agent: true }] };
  const actual = RA._actualStructured(gm);
  assert(/东林/.test(actual), 'LLM 模式 _actualStructured 读 subcall1');
  assert(!/999/.test(actual), 'LLM 模式有 subcall1 时不回落 _turnReport(对 LLM 零影响)');
})();

// ③ formatBiasForSc0
(function () {
  const gm = { _aiBiasProfile: { biases: [{ domain: '军事', direction: '高估', correction: '边军战力按七折估' }] } };
  const s = RA.formatBiasForSc0(gm);
  assert(/系统性偏差/.test(s) && /军事/.test(s) && /边军战力按七折估/.test(s), 'formatBiasForSc0 产出偏差校正注入文本');
  assert(RA.formatBiasForSc0({}) === '', '无偏差画像 → 空串(不占位)');
})();

(async function () {
  // ② run(opts.thinking):首回合存基线·次回合比对更新画像
  globalThis.P = { ai: { key: 'test-key' } };
  globalThis.extractJSON = function (s) { try { return JSON.parse(s); } catch (e) { return null; } };
  let calls = 0;
  globalThis.callAIMessages = async function () {
    calls++;
    return JSON.stringify({ predictedLast: '辽东趋稳', actualThis: '边军哗变', divergence: 'high', lesson: '低估欠饷致哗变', confidence_calibration: -0.3, systematic_biases: [{ domain: '军事', direction: '低估', evidence: '连两回合边军异动', correction: '欠饷>2回合即估哗变' }] });
  };
  // 首回合:无 _lastTurnPredictions → baseline(不调 AI)
  const gm1 = { turn: 5, _turnReport: [{ type: 'change', path: 'guoku', new: 1, _agent: true }] };
  const r1 = await RA.run(gm1, { thinking: '本回合推演:辽东局势趋稳。' });
  assert(r1 && r1.skipped === 'baseline', '首回合(无上回合预测)→ baseline');
  assert(gm1._lastTurnPredictions && /辽东局势趋稳/.test(gm1._lastTurnPredictions.thinking), '首回合存本回合推演为下回合基线(opts.thinking)');
  assert(calls === 0, '首回合不消耗 AI 调用');
  // 次回合:有 _lastTurnPredictions → 比对·单跳·更新画像
  const gm2 = { turn: 6, _lastTurnPredictions: { turn: 5, thinking: '辽东局势趋稳' }, _turnReport: [{ type: 'change', _op: 'dismiss', path: 'chars/某将', reason: '边军哗变', _agent: true }] };
  const r2 = await RA.run(gm2, { thinking: '本回合推演:边军哗变骤起。' });
  assert(calls === 1, '次回合调一次 AI(单跳·不自主循环)');
  assert(r2 && r2.ok && r2.biases >= 1, '次回合比对成功·产出偏差画像');
  assert(gm2._aiBiasProfile && gm2._aiBiasProfile.biases.some(function (b) { return /军事/.test(b.domain); }), '更新 _aiBiasProfile(供下回合 basis 注入)');
  assert(Array.isArray(gm2._aiReflections) && gm2._aiReflections.length >= 1, '写 _aiReflections(向后兼容 _scReflect 形状)');
  assert(/边军哗变骤起/.test(gm2._lastTurnPredictions.thinking), '次回合更新 _lastTurnPredictions 为本回合推演');
  assert(/欠饷.*哗变|系统性偏差/.test(RA.formatBiasForSc0(gm2)), '更新后 formatBiasForSc0 含新校正(闭环)');

  // ④ agent-mode 开关 agentSelfReflectOn(P.conf 命名空间·默认关)
  require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
  const AM = globalThis.TM.Endturn.AgentMode;
  assert(AM && typeof AM.agentSelfReflectOn === 'function', 'AgentMode.agentSelfReflectOn 已导出');
  assert(AM.agentSelfReflectOn({ conf: { agentSelfReflectEnabled: true } }) === true, '开关读 P.conf.agentSelfReflectEnabled=true');
  assert(AM.agentSelfReflectOn({ conf: {} }) === false, '默认关(无 agentSelfReflectEnabled→false)');

  console.log('[smoke-agent-mode-reflect] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
