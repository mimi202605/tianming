const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const endturnAi = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');

const infraIdx = indexHtml.indexOf('tm-ai-infra.js');
const traceIdx = indexHtml.indexOf('tm-memory-trace.js');
const endturnIdx = indexHtml.indexOf('tm-endturn-ai.js');

assert(infraIdx >= 0, 'index should load tm-ai-infra.js');
assert(traceIdx >= 0, 'index should load tm-memory-trace.js');
assert(endturnIdx >= 0, 'index should load tm-endturn-ai.js');
assert(infraIdx < traceIdx, 'tm-memory-trace.js should load after tm-ai-infra.js');
assert(traceIdx < endturnIdx, 'tm-memory-trace.js should load before tm-endturn-ai.js');

assert(endturnAi.includes('TM.MemoryTrace.ensureTurnTrace'), 'runMain should initialize MemoryTrace');
assert(endturnAi.includes('TM.MemoryTrace.recordSubcall'), '_callEndturnAI should record subcall traces');
assert(endturnAi.includes('TM.MemoryTrace.recordRetrieval'), 'SC_RECALL should record retrieval traces');
assert(endturnAi.includes('TM.MemoryTrace.recordInjection'), 'SC_RECALL injection should record prompt-lane traces');
assert(!/recordSubcall\([^)]*promptPreview\s*:\s*(body|raw|JSON\.stringify)/.test(endturnAi), 'integration must not pass raw prompt/response as previews');

console.log('smoke-memory-trace-integration ok');
