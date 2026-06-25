'use strict';
// ============================================================
// smoke-agent-mode-anomaly.js — 切片4·agent 冷门动作深查(硬核×自由命门交点)
//   验:① agentAnomalyOn 开关(默认关) ② anomalyNudge 指引格式 ③ anomalyScan 非常规→{unusual,aspect,precedentQuery}·寻常→null·无举措→null不耗调用
//   纯 node·stub callAIMessages·不调真模型。
// ============================================================
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

require(path.join(ROOT, 'tm-endturn-agent-mode.js'));
const AM = globalThis.TM.Endturn.AgentMode;
assert(typeof AM.agentAnomalyOn === 'function' && typeof AM.anomalyScan === 'function' && typeof AM.anomalyNudge === 'function', '切片4 函数已导出');
assert(AM.agentAnomalyOn({ conf: { agentAnomalyEnabled: true } }) === true, '开关读 P.conf.agentAnomalyEnabled=true');
assert(AM.agentAnomalyOn({ conf: {} }) === false, '默认关(无 agentAnomalyEnabled)');

// nudge 格式(深查指引·命门)
(function () {
  const n = AM.anomalyNudge({ unusual: true, aspect: '迁都南京避虏锋', precedentQuery: '迁都' });
  assert(/非常规/.test(n) && /迁都南京避虏锋/.test(n), 'nudge 含非常规标记+aspect');
  assert(/硬核可信/.test(n) && /有史可依/.test(n), 'nudge 含命门铁律(硬核×自由)');
  assert(/read_records|read_chronicle|get_dossier/.test(n) && /迁都/.test(n), 'nudge 引导用读工具深查+检索词');
  assert(AM.anomalyNudge(null) === '' && AM.anomalyNudge({ unusual: false }) === '', '无异常→空 nudge(不占位)');
})();

(async function () {
  // ① 非常规举措 → unusual:true + 深查指引
  globalThis.callAIMessages = async function (msgs) {
    const sys = (msgs && msgs[0] && msgs[0].content) || '';
    if (/史识判官/.test(sys)) return JSON.stringify({ unusual: true, aspect: '裁撤整个都察院', precedentQuery: '裁撤监察机构' });
    return '{}';
  };
  const r1 = await AM.anomalyScan({ input: { edicts: ['裁撤都察院全部御史·废止监察'] } }, { turn: 5 });
  assert(r1 && r1.unusual === true && /裁撤整个都察院/.test(r1.aspect) && /裁撤监察机构/.test(r1.precedentQuery), '非常规举措→unusual:true+aspect+precedentQuery');

  // ② 寻常举措 → null(不 nudge)
  globalThis.callAIMessages = async function () { return JSON.stringify({ unusual: false }); };
  const r2 = await AM.anomalyScan({ input: { edicts: ['擢李某为侍郎'] } }, { turn: 5 });
  assert(r2 === null, '寻常举措→null(不 nudge)');

  // ③ 玩家无举措 → null·不调 AI
  let calls = 0;
  globalThis.callAIMessages = async function () { calls++; return '{}'; };
  const r3 = await AM.anomalyScan({ input: {} }, { turn: 5 });
  assert(r3 === null && calls === 0, '玩家本回合无举措→null·不耗 AI 调用');

  console.log('[smoke-agent-mode-anomaly] pass assertions=' + passed.value);
})().catch(function (e) { console.error(e); process.exit(1); });
