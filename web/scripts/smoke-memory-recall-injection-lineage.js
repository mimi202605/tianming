const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const endturnAi = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');
const traceSrc = fs.readFileSync(path.join(ROOT, 'tm-memory-trace.js'), 'utf8');

assert(endturnAi.includes('<recalled-memories>'), 'SC_RECALL should inject recalled-memories XML');
assert(endturnAi.includes('source-refs="'), 'SC_RECALL hit XML should include source-refs attribute');
assert(endturnAi.includes('basis-refs="'), 'SC_RECALL hit XML should include basis-refs attribute');
assert(endturnAi.includes('authority="'), 'SC_RECALL hit XML should include authority attribute');
assert(endturnAi.includes('fact-status="'), 'SC_RECALL hit XML should include fact-status attribute');
assert(endturnAi.includes('lane="'), 'SC_RECALL hit XML should include lane attribute');

assert(/sourceRefs:\s*Array\.isArray\(hit\.sourceRefs\)/.test(endturnAi), 'SC_RECALL trace items should preserve hit.sourceRefs');
assert(/basisRefs:\s*Array\.isArray\(hit\.basisRefs\)/.test(endturnAi), 'SC_RECALL trace items should preserve hit.basisRefs');
assert(/authority:\s*hit\.authority/.test(endturnAi), 'SC_RECALL trace items should preserve hit.authority');
assert(/authorityRank:\s*hit\.authorityRank/.test(endturnAi), 'SC_RECALL trace items should preserve hit.authorityRank');
assert(/factStatus:\s*hit\.factStatus/.test(endturnAi), 'SC_RECALL trace items should preserve hit.factStatus');
assert(/lane:\s*hit\.lane/.test(endturnAi), 'SC_RECALL trace items should preserve hit.lane');

assert(traceSrc.includes('copyEvidenceMeta(item, it)'), 'MemoryTrace injection compaction should copy evidence metadata');
assert(traceSrc.includes('sourceRefs') && traceSrc.includes('basisRefs'), 'MemoryTrace should support sourceRefs/basisRefs');

console.log('smoke-memory-recall-injection-lineage ok');
