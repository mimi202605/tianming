const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const endturnAi = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');
const traceSrc = fs.readFileSync(path.join(ROOT, 'tm-memory-trace.js'), 'utf8');
const zonesSrc = fs.readFileSync(path.join(ROOT, 'tm-context-zones.js'), 'utf8');

assert(endturnAi.includes("stage:'sc05-recall'") || endturnAi.includes("stage: 'sc05-recall'"), 'SC_RECALL should record ContextZones injection with stage sc05-recall');
assert(endturnAi.includes('TM.ContextZones.packZones') || endturnAi.includes('global.TM.ContextZones.packZones'), 'SC_RECALL should use ContextZones.packZones');
assert(endturnAi.includes('memoryRecallZoneTokenBudget'), 'SC_RECALL zone packing should use a recall zone token budget knob');
assert(endturnAi.includes('recall-header') && endturnAi.includes('recall-footer'), 'SC_RECALL zones should keep XML wrapper zones');
assert(endturnAi.includes("lane:'L6_retrieved_evidence'") || endturnAi.includes("lane: 'L6_retrieved_evidence'"), 'SC_RECALL hit zones should use L6_retrieved_evidence lane');

assert(zonesSrc.includes('suppressed: packed.suppressed'), 'ContextZones trace should pass suppressed budget drops');
assert(traceSrc.includes('suppressed: Array.isArray(data.suppressed)'), 'MemoryTrace injection should persist suppressed dropped zones');

const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;
vm.runInNewContext(traceSrc, sandbox.window, { filename: 'tm-memory-trace.js' });
vm.runInNewContext(zonesSrc, sandbox.window, { filename: 'tm-context-zones.js' });

const CZ = sandbox.window.TM && sandbox.window.TM.ContextZones;
const GM = { turn: 12, _turnAiResults: {} };
const packed = CZ.packZones([
  { id: 'recall-header', lane: 'L6_retrieved_evidence', text: '<recalled-memories>\n', mustKeep: true, order: 0 },
  { id: 'keep-hard', lane: 'L1_world_truth', text: 'hard state '.repeat(10), source: 'hard_state', score: 0.5, order: 10 },
  { id: 'drop-old', lane: 'L6_retrieved_evidence', text: 'old vector '.repeat(120), source: 'vector', score: 0.4, order: 20 },
  { id: 'recall-footer', lane: 'L6_retrieved_evidence', text: '</recalled-memories>\n', mustKeep: true, order: 999 },
], { maxTokens: 80 });
const trace = CZ.recordZoneInjection(GM, packed, { stage: 'sc05-recall' });
assert(trace && trace.stage === 'sc05-recall', 'recordZoneInjection should persist sc05-recall stage');
assert(trace.suppressed && trace.suppressed.some((s) => s.reason === 'zone_budget_exceeded'), 'zone injection trace should preserve dropped zone reason');

console.log('smoke-memory-recall-context-zones ok');
