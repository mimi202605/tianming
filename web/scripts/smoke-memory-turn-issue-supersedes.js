#!/usr/bin/env node
'use strict';

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
  'tm-memory-issue-governance.js',
  'tm-memory-retrieval.js'
].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
});

const MIG = sandbox.TM && sandbox.TM.MemoryIssueGovernance;
const MR = sandbox.TM && sandbox.TM.MemoryRetrieval;
assert(MIG, 'MemoryIssueGovernance should be exported');
assert(MR, 'MemoryRetrieval should be exported');
assert.strictEqual(typeof MIG.createIssueResolutionEdge, 'function', 'issue resolution edge helper should be exported');

const GM = { turn: 12 };
const edge = MIG.createIssueResolutionEdge(GM, 'issue-tax', 'issue-tax', 12);
assert(edge, 'resolution edge should be created');
assert.strictEqual(edge.type, 'supersedes', 'resolution edge should supersede');
assert.strictEqual(edge.src, 'issue_resolution:issue-tax', 'resolution edge source should target typed resolution node');
assert.strictEqual(edge.dst, 'strategic_issue:issue-tax', 'resolution edge destination should target typed active issue node');

const hits = [
  {
    id: 'issue-tax',
    type: 'strategic_issue',
    source: 'issue',
    text: 'liao-pay levy remains unresolved',
    status: 'active',
    sourceRefs: [{ type: 'currentIssues', id: 'issue-tax' }]
  },
  {
    id: 'issue-tax',
    type: 'issue_resolution',
    source: 'issue',
    text: 'liao-pay levy resolved by edict',
    status: 'active',
    sourceRefs: [{ type: 'currentIssues', id: 'issue-tax' }]
  }
];

const current = MR.rankHitsDetailed(hits, { turn: 12, GM, intent: 'turn_inference' });
assert(current.ranked.some((hit) => hit.text.includes('resolved by edict')), 'current retrieval keeps the resolution');
assert(!current.ranked.some((hit) => hit.text.includes('remains unresolved')), 'current retrieval suppresses stale active issue');
assert(current.suppressed.some((hit) => hit.reason === 'superseded' && hit.by === 'issue_resolution:issue-tax'), 'suppression should cite the resolution edge');

const historical = MR.rankHitsDetailed(hits, { turn: 12, GM, intent: 'historical_evidence', includeSuperseded: true });
assert(historical.ranked.some((hit) => hit.text.includes('resolved by edict')), 'historical retrieval keeps resolution');
assert(historical.ranked.some((hit) => hit.text.includes('remains unresolved')), 'historical retrieval can keep superseded issue');
assert(historical.ranked.some((hit) => hit.staleStatus === 'superseded'), 'historical superseded issue should be marked stale');

console.log('smoke-memory-turn-issue-supersedes ok');
