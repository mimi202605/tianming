const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const endturnAi = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');

const traceIdx = indexHtml.indexOf('tm-memory-trace.js');
const retrievalIdx = indexHtml.indexOf('tm-memory-retrieval.js');
const endturnIdx = indexHtml.indexOf('tm-endturn-ai.js');

assert(traceIdx >= 0, 'index should load tm-memory-trace.js');
assert(retrievalIdx >= 0, 'index should load tm-memory-retrieval.js');
assert(endturnIdx >= 0, 'index should load tm-endturn-ai.js');
assert(traceIdx < retrievalIdx, 'tm-memory-retrieval.js should load after trace helpers');
assert(retrievalIdx < endturnIdx, 'tm-memory-retrieval.js should load before tm-endturn-ai.js');

assert(endturnAi.includes('TM.MemoryRetrieval.rankHits'), 'SC_RECALL should use MemoryRetrieval.rankHits');
assert(endturnAi.includes('rankHits(allHits, { turn: _curT, GM: GM })'), 'SC_RECALL should pass GM to rankHits for supersedes suppression');
assert(endturnAi.includes('MemoryRetrieval'), 'endturn AI should guard MemoryRetrieval integration');

console.log('smoke-memory-retrieval-integration ok');
