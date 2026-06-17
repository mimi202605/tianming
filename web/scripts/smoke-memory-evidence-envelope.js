const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date, Math, JSON, window: {} };
sandbox.window.window = sandbox.window;
sandbox.window.ChronicleSystem = {
  monthDrafts: {
    '1-1': { turn: 40, summary: 'Monthly river draft', detail: 'Dikes weakened.' },
  },
  yearChronicles: {
    1: { year: 1, content: 'Year river summary', summary: 'Floods shaped the year.' },
  },
};

[
  'tm-memory-evidence-registry.js',
  'tm-memory-envelope.js',
  'tm-memory-retrieval.js',
].forEach((file) => {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox.window, { filename: file });
});

const ME = sandbox.window.TM && sandbox.window.TM.MemoryEnvelope;
const MR = sandbox.window.TM && sandbox.window.TM.MemoryRetrieval;
assert(ME, 'TM.MemoryEnvelope should be exported');
assert(MR, 'TM.MemoryRetrieval should be exported');

const GM = {
  turn: 42,
  qijuHistory: [
    { turn: 42, edictsSource: 'promulgated', edicts: { political: 'Repair river dikes' }, xinglu: 'Inspect river works' },
    { turn: 41, category: '民变', content: 'Villagers report broken dikes.' },
  ],
  jishiRecords: [
    { turn: 42, char: 'Hai Rui', playerSaid: 'Investigate river works', npcSaid: 'I will inspect.', mode: 'mizhao' },
  ],
  currentIssues: [
    { id: 'issue-flood', title: 'River floods', category: '民生', status: 'pending', confidence: 0.55, evidenceRefs: [{ type: 'shijiHistory', id: 'shiji-41' }] },
  ],
  biannianItems: [
    { id: 'bn-flood', turn: 41, title: 'Flood rises', content: 'Yellow River floods several counties.', type: 'disaster' },
  ],
  _chronicleTracks: [
    { id: 'track-river', title: 'River repair', status: 'active', progress: 35, sourceType: 'edict', sourceId: 'edict-river' },
    { id: 'track-scheme', title: 'Hidden grain hoarding', status: 'active', hidden: true, sourceType: 'scheme', sourceId: 'scheme-grain' },
  ],
};

const envelopes = ME.collect(GM, { turn: GM.turn });
assert(envelopes.every((e) => e.authorityRank != null), 'all envelopes should carry authorityRank');
assert(envelopes.every((e) => Array.isArray(e.sourceRefs) && e.sourceRefs.length > 0), 'all envelopes should carry sourceRefs');

function findBy(type, refType) {
  return envelopes.find((e) => e.type === type && e.sourceRefs.some((r) => r.type === refType));
}

const qijuAction = findBy('player_action_record', 'qijuHistory');
assert(qijuAction, 'qiju edict/action record should become player_action_record envelope');
assert.strictEqual(qijuAction.authority, 'player_pin', 'promulgated qiju action should be player_pin authority');
assert.strictEqual(qijuAction.lane, 'L2_active_law_commitment', 'qiju action should use active law lane');
assert(qijuAction.body.includes('Repair river dikes'), 'qiju action body should include edict text');

const qijuEvent = envelopes.find((e) => e.type === 'episodic_event' && e.sourceRefs.some((r) => r.type === 'qijuHistory'));
assert(qijuEvent, 'qiju event content should become episodic_event envelope');
assert.strictEqual(qijuEvent.authority, 'event_log', 'qiju event content should use event_log authority');

const jishi = findBy('court_dialogue_record', 'jishiRecords');
assert(jishi, 'jishiRecords should become court_dialogue_record envelope');
assert.strictEqual(jishi.authority, 'court_report', 'jishi record should be court_report authority');
assert(jishi.entities.includes('Hai Rui'), 'jishi record should keep NPC entity');

const issue = findBy('strategic_issue', 'currentIssues');
assert(issue, 'currentIssues should become strategic_issue envelope');
assert.strictEqual(issue.authority, 'ai_analysis', 'currentIssues should be ai_analysis authority');
assert.strictEqual(issue.factStatus, 'advisory', 'currentIssues should be advisory factStatus');
assert.strictEqual(issue.confidence, 0.55, 'currentIssues should preserve confidence');

const chronTrack = findBy('ongoing_affair', 'chronicleTrack');
assert(chronTrack, 'visible ChronicleTracker item should become ongoing_affair envelope');
assert.strictEqual(chronTrack.authority, 'rule_validated', 'edict-backed chronicle track should be rule_validated');

const hiddenTrack = envelopes.find((e) => e.id === 'chron-track-scheme-grain' || e.id === 'chron-track-track-scheme');
assert(hiddenTrack, 'hidden ChronicleTracker item should be projected');
assert.strictEqual(hiddenTrack.authority, 'internal_sim_state', 'hidden scheme track should be internal_sim_state');
assert.strictEqual(hiddenTrack.visibility, 'gm_hidden', 'hidden scheme track should be gm_hidden');

const biannian = findBy('chronicle_event', 'biannianItems');
assert(biannian, 'biannianItems should become chronicle_event envelope');
assert.strictEqual(biannian.authority, 'structured_chronicle', 'biannianItems should use structured_chronicle authority');

const year = findBy('historiography_summary', 'chronicleYear');
assert(year, 'ChronicleSystem yearChronicles should become historiography_summary envelope');
assert.strictEqual(year.authority, 'ai_summary', 'year chronicle should remain ai_summary authority');

const hits = MR.collectPriorityHits(GM, { keywords: ['river'], participant: 'Hai Rui' }, { turn: GM.turn });
assert(hits.some((h) => h.id === chronTrack.id && h.source === 'chronicle'), 'retrieval should consume ongoing affairs from envelope');
assert(hits.some((h) => h.id === qijuAction.id && h.source === 'playerAction'), 'retrieval should consume player action records from envelope');
assert(hits.every((h) => h.authorityRank == null || typeof h.authorityRank === 'number'), 'retrieval hits should preserve authority ranks when present');

console.log('smoke-memory-evidence-envelope ok');
