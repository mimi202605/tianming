const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const apply = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');
const prompt = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
const render = fs.readFileSync(path.join(ROOT, 'tm-endturn-render.js'), 'utf8');
const ai = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');

[
  'sourceType',
  'authorityLevel',
  'confidence',
  'evidenceRefs',
  'generatedBy',
  'factStatus',
].forEach((token) => {
  assert(apply.includes(token), 'currentIssues writeback should preserve metadata token: ' + token);
});

assert(prompt.includes('authority:') && prompt.includes('fact:') && prompt.includes('confidence:'), 'currentIssues prompt injection should include authority/fact/confidence');
assert(render.includes('MemoryEvidenceRegistry.buildBasisRefs'), 'shijiHistory render should attach evidence refs from registry');
assert(render.includes("authorityLevel: 'official_record'"), 'shijiHistory record should mark official_record authority');
assert(render.includes('evidenceRefs: _evidenceRefs'), 'shijiHistory record should store evidenceRefs');

assert(ai.includes('basis_refs'), 'sc1d schema/prompt should allow basis_refs for record lineage');
assert(ai.includes('p1.basis_refs') || ai.includes('p1.basisRefs'), 'sc1d writeback should keep basis refs on p1');

console.log('smoke-memory-evidence-endturn-metadata ok');
