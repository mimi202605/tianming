#!/usr/bin/env node
'use strict';
// S7 守护（2026-06-03·分层压缩进 v6 主路）：
// 把多个「年」chronicle rollup 折成「era 大略」第二层 recap(RAPTOR collapsed-tree·年=细节/era=数年大略并存)，
// 经 v6 Envelope 投影进 chronology(compileFromGM→sc1 主路)，而非只在 legacy anchors 喂 sc05。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Date, Math, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'tm-memory-evidence-registry.js',
  'tm-memory-issue-governance.js',
  'tm-memory-turn-rollup.js',
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-retrieval.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const TR = sandbox.TM && sandbox.TM.MemoryTurnRollup;
const ME = sandbox.TM && sandbox.TM.MemoryEnvelope;
const MCC = sandbox.TM && sandbox.TM.MemoryContextCompiler;
assert(TR && typeof TR.rebuildFromArchive === 'function', 'MemoryTurnRollup.rebuildFromArchive exported');
assert(typeof TR.buildEraRollups === 'function', 'buildEraRollups exported');

// ── 0) buildEraRollups 直测：4 年 chronicle rollup → 1 era(eraSize 4) ──
const yearRolls = [
  { id: 'chronicle-rollup-y1', yearKey: '天启元年', body: '天启元年 chronicle rollup: 辽事起。', startTurn: 1, endTurn: 12 },
  { id: 'chronicle-rollup-y2', yearKey: '天启二年', body: '天启二年 chronicle rollup: 广宁失。', startTurn: 13, endTurn: 24 },
  { id: 'chronicle-rollup-y3', yearKey: '天启三年', body: '天启三年 chronicle rollup: 阉党炽。', startTurn: 25, endTurn: 36 },
  { id: 'chronicle-rollup-y4', yearKey: '天启四年', body: '天启四年 chronicle rollup: 东林危。', startTurn: 37, endTurn: 48 }
];
const eras = TR.buildEraRollups({}, yearRolls, { eraSize: 4 });
assert.strictEqual(eras.length, 1, 'four year-rollups fold into one era rollup (eraSize 4)');
const era = eras[0];
assert(era.extra && era.extra.tier === 2, 'era rollup is tier 2');
assert(era.lane === 'L7_chronicle_context', 'era rollup lands in chronicle lane');
assert(era.body.indexOf('天启元年') >= 0 && era.body.indexOf('天启四年') >= 0, 'era body spans first..last year');
assert(era.body.indexOf('辽事起') >= 0 && era.body.indexOf('东林危') >= 0, 'era body folds each year summary');
assert(Array.isArray(era.sourceRefs) && era.sourceRefs.length >= 1, 'era rollup keeps lineage to year rollups');
// 单年不折叠
assert.strictEqual(TR.buildEraRollups({}, [yearRolls[0]], {}).length, 0, 'a single year does not fold into an era');

// ── 1) rebuildFromArchive 端到端：多年存档 → 年 rollup + era rollup 都进 GM ──
function bundle(turn, year, chronText) {
  return { schemaVersion: 'memory-turn-archive/v0', turn: turn, year: year, chronicle: [{ turn: turn, body: chronText }] };
}
const GM = { turn: 50, _turnMemoryArchive: [
  bundle(6, '天启元年', '辽东军情告急。'),
  bundle(18, '天启二年', '广宁兵败、熊廷弼下狱。'),
  bundle(30, '天启三年', '魏忠贤擅权、东厂横行。'),
  bundle(42, '天启四年', '东林党人遭清洗。')
] };
const res = TR.rebuildFromArchive(GM, { eraSize: 4 });
assert(res.chronicleRollups >= 4, 'four year chronicle rollups built (got ' + res.chronicleRollups + ')');
assert(res.eraRollups >= 1, 'at least one era rollup built (got ' + res.eraRollups + ')');
assert(Array.isArray(GM._memoryEraRollups) && GM._memoryEraRollups.length >= 1, 'GM._memoryEraRollups populated');

// ── 2) Envelope 投影 era rollup（进 chronology·经 compileFromGM 注 sc1 主路）──
const envs = ME.collect(GM, { turn: 51 });
const eraEnv = envs.filter(function(e) { return e && e.extra && e.extra.stream === 'eraRollup'; });
assert(eraEnv.length >= 1, 'era rollup projected into v6 envelopes');
const compiled = MCC.compileFromGM(GM, { turn: 51, audience: 'system', actorScope: 'system', intent: 'turn_inference', maxTokens: 6000 });
assert(compiled.text.indexOf('编年大略') >= 0, 'era rollup injected via compileFromGM (sc1 main path), in chronology');
assert(compiled.text.indexOf('<chronology') >= 0, 'chronology section present');

console.log('smoke-memory-era-rollup ok');
