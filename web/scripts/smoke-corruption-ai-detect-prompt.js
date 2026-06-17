#!/usr/bin/env node
'use strict';

const { createHarness, makeBaseGM, makeBaseP } = require('./smoke-corruption-harness');

let ASSERTS = 0;
function assert(cond, msg) {
  ASSERTS++;
  if (!cond) throw new Error('[assert] ' + msg);
}
function eq(actual, expected, msg) {
  ASSERTS++;
  if (actual !== expected) throw new Error('[assert] ' + msg + ' expected=' + expected + ' actual=' + actual);
}

let seenPrompt = '';
let seenTokens = 0;
const h = createHarness({
  GM: makeBaseGM({ turn: 18 }),
  P: makeBaseP({ ai: { key: 'smoke-key' } }),
  random: function() { return 0.25; },
  callAI: async function(prompt, maxTokens) {
    seenPrompt = prompt;
    seenTokens = maxTokens;
    return '臣谨奏：宜先整肃最重一部。';
  }
});

h.load('tm-corruption-engine.js');

const CE = h.context.CorruptionEngine;
CE.ensureModel();
h.context.GM.corruption.trueIndex = 76;
h.context.GM.corruption.supervision.level = 45;
h.context.GM.corruption.subDepts.central.true = 88;
h.context.GM.corruption.subDepts.provincial.true = 71;
h.context.GM.corruption.subDepts.military.true = 67;
h.context.GM.corruption.subDepts.fiscal.true = 79;
h.context.GM.corruption.subDepts.judicial.true = 73;
h.context.GM.corruption.subDepts.imperial.true = 74;
h.context.GM.corruption.entrenchedFactions = [
  { name: '东林旧党', dept: 'central', strength: 82 },
  { name: '内监党羽', dept: 'imperial', strength: 77 }
];
h.context.GM.guoku.balance = 1500000;
h.context.GM.guoku.annualIncome = 1200000;
h.context.GM.minxin.trueIndex = 48;
h.context.GM.huangwei.index = 62;
h.context.GM.huangquan.index = 58;

(async function() {
  const result = await CE.aiPurgeAdvisor();
  assert(result && result.available === true, 'AI purge advisor should be available');
  eq(result.analysis, '臣谨奏：宜先整肃最重一部。', 'AI advisor should return stub text');
  assert(seenPrompt.indexOf('全局腐败') >= 0, 'prompt should include corruption state');
  assert(seenPrompt.indexOf('皇权') >= 0, 'prompt should include emperor authority');
  assert(seenPrompt.indexOf('盘根集团') >= 0, 'prompt should include entrenched factions');
  eq(seenTokens, 500, 'prompt token cap should match advisor call');
  console.log('[smoke-corruption-ai-detect-prompt] pass assertions=' + ASSERTS);
})().catch(function(err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
