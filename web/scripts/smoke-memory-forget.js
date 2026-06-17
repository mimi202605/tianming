#!/usr/bin/env node
'use strict';
// S3 守护（2026-06-03·DELETE/forget）：AI 吐 memory_forgets 标某事实作废(恩怨已了/承诺兑现/事实更正)。
// 候选走 draft 人审(绝不自动接受)；人审接受后目标 active accepted 翻 deleted_tombstone + markedFalse → 不再被投影/注入。
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
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-retrieval.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js',
  'tm-memory-writegate.js',
  'tm-memory-turn-inference.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const WG = sandbox.TM && sandbox.TM.MemoryWriteGate;
const MTI = sandbox.TM && sandbox.TM.MemoryTurnInference;
const ME = sandbox.TM && sandbox.TM.MemoryEnvelope;
assert(WG && typeof WG.acceptDraft === 'function', 'WriteGate.acceptDraft exported');
assert(MTI && typeof MTI.forgetCandidates === 'function', 'turn-inference.forgetCandidates exported');

function accepted(id, actor, mt, body, turn, extra) {
  return Object.assign({ id: id, type: 'character_memory', status: 'active', body: body, safeBody: body, authority: 'ai_extracted', turn: turn, entities: [actor], readScope: 'public', extra: Object.assign({ actor: actor, memoryType: mt }, extra || {}), sourceRefs: [{ type: 'jishiRecords', id: 'jr-' + id }] });
}

// ── A) forget by (actor, memoryType): clean -> draft -> human accept -> target tombstoned & desuppressed ──
const GM = { turn: 30, _memoryAccepted: [ accepted('fact-favor-bi', '毕自严', 'favor', '毕自严受赐金犒劳。', 20, { eventCount: 2 }) ] };
const fc = MTI.forgetCandidates(GM, { memory_forgets: [
  { actor: '毕自严', memory_type: 'favor', reason: '毕自严旧怨已了结、不再计较。', confidence: 0.85, source_refs: [{ type: 'courtRecords', id: 'cr-forgive' }] }
] }, { sourceId: 'SC1' });
assert.strictEqual(fc.length, 1, 'one forget candidate');
assert.strictEqual(fc[0].type, 'memory_forget', 'type is memory_forget');
assert(!fc[0].status, 'clean forget carries no preset status (-> evaluateCandidate makes it draft)');
const q = MTI.enqueueCandidates(GM, fc, { forceDraft: true });
const fid = q.items[0].id;
assert.strictEqual(q.items[0].status, 'draft', 'clean forget lands as DRAFT (not auto-applied)');
assert.strictEqual(GM._memoryAccepted.find((x) => x.id === 'fact-favor-bi').status, 'active', 'target still active before human review');
WG.acceptDraft(GM, fid, { reviewer: 'player' });
const tgt = GM._memoryAccepted.find((x) => x.id === 'fact-favor-bi');
assert.strictEqual(tgt.status, 'deleted_tombstone', 'target tombstoned after forget accepted');
assert(GM._memoryControls && GM._memoryControls['fact-favor-bi'] && GM._memoryControls['fact-favor-bi'].markedFalse === true, 'markedFalse control set on target');
const envs = ME.collect(GM, { turn: 31 });
assert(!envs.some((e) => String(e.safeBody || e.body || '').indexOf('受赐金犒劳') >= 0), 'tombstoned fact is NOT projected into memory envelopes');

// ── B) bad forget (no target / no source_refs) -> quarantined, never applied ──
const GM2 = { turn: 5 };
const bad = MTI.forgetCandidates(GM2, { memory_forgets: [{ reason: '忘了点什么', confidence: 0.8 }] }, {});
assert.strictEqual(bad.length, 1, 'one bad forget candidate');
assert.strictEqual(bad[0].status, 'quarantined', 'forget without target/source_refs is quarantined');
assert(bad[0].reasons.some((r) => r.code === 'missing_forget_target'), 'cites missing_forget_target');
assert(bad[0].reasons.some((r) => r.code === 'missing_source_refs'), 'cites missing_source_refs');

// ── C) forget is NEVER auto-accepted, even on the trusted lane (destructive -> human review) ──
const GM3 = { turn: 7, _memoryAccepted: [ accepted('f2', '孙传庭', 'favor', '孙传庭蒙信任。', 6) ] };
MTI.enqueuePostTurnCandidates(GM3, { memory_forgets: [
  { actor: '孙传庭', memory_type: 'favor', reason: '此恩已报。', confidence: 0.95, source_refs: [{ type: 'courtRecords', id: 'cr-st' }] }
] }, { sourceId: 'SC1', forceDraft: true, autoAcceptTrusted: true });
assert.strictEqual(GM3._memoryAccepted.find((x) => x.id === 'f2').status, 'active', 'forget NOT auto-accepted by trusted lane; target stays active');
assert(Array.isArray(GM3._memoryDraftInbox) && GM3._memoryDraftInbox.some((x) => x.type === 'memory_forget'), 'forget routed to draft for review');

// ── D) forget by explicit target_id (generic factual memory) ──
const GM4 = { turn: 9, _memoryAccepted: [ accepted('specific-1', '袁崇焕', 'memory', '袁崇焕驻宁远(此事有误)。', 8) ] };
const fc4 = MTI.forgetCandidates(GM4, { memory_forgets: [
  { target_id: 'specific-1', reason: '该记载有误，予以更正作废。', confidence: 0.9, source_refs: [{ type: 'courtRecords', id: 'cr-correct' }] }
] }, {});
const q4 = MTI.enqueueCandidates(GM4, fc4, { forceDraft: true });
WG.acceptDraft(GM4, q4.items[0].id, { reviewer: 'player' });
assert.strictEqual(GM4._memoryAccepted.find((x) => x.id === 'specific-1').status, 'deleted_tombstone', 'forget by explicit target_id tombstones the target');

// ── E) forget CANNOT tombstone authoritative facts (engine_state/player_pin/裁断/编年) ──
const GM5 = { turn: 11, _memoryAccepted: [
  { id: 'pin-1', type: 'court_resolution', status: 'active', body: '皇帝诏准盐法改革。', safeBody: '皇帝诏准盐法改革。', authority: 'player_pin', turn: 10, entities: ['盐法'], readScope: 'public', sourceRefs: [{ type: 'courtRecords', id: 'cr-pin' }] }
] };
const fc5 = MTI.forgetCandidates(GM5, { memory_forgets: [
  { target_id: 'pin-1', reason: 'AI 想抹掉皇帝裁断(应被拒)。', confidence: 0.99, source_refs: [{ type: 'aiTurnResult', id: 'SC1' }] }
] }, {});
const q5 = MTI.enqueueCandidates(GM5, fc5, { forceDraft: true });
WG.acceptDraft(GM5, q5.items[0].id, { reviewer: 'player' });
assert.strictEqual(GM5._memoryAccepted.find((x) => x.id === 'pin-1').status, 'active', 'forget must NOT tombstone an authoritative (player_pin) fact');

console.log('smoke-memory-forget ok');
