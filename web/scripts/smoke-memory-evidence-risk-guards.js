const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ai = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');
const post = fs.readFileSync(path.join(ROOT, 'tm-post-turn-jobs.js'), 'utf8');
const render = fs.readFileSync(path.join(ROOT, 'tm-endturn-render.js'), 'utf8');
const perfSmoke = fs.readFileSync(path.join(ROOT, 'scripts', 'smoke-endturn-performance-optimizations.js'), 'utf8');

assert(ai.includes('_dedupeMemTableOps'), 'MemTables apply path should dedupe JSON/tableEdit duplicate ops');
assert(/_mtTotalOps\s*=\s*_dedupeMemTableOps\(_mtTotalOps\)/.test(ai), 'MemTables ops should be deduped before applyAIOps');
assert(/MemTables\.applyAIOps\(_mtTotalOps/.test(ai), 'MemTables should still apply the deduped ops');

assert(/_POST_TURN_SAVE_REQUIRED_IDS\s*=\s*\{[\s\S]*sc25c:\s*true/.test(post), 'post-turn save-required ids should include sc25c');
assert(render.includes('_postTurnSaveRequiredIds()'), 'autosave should use post-turn save-required ids instead of hardcoded sc25');
assert(!render.includes("_awaitPostTurnJobsForSave(['sc25'])"), 'autosave should not hardcode only sc25');
assert(perfSmoke.includes('_postTurnSaveRequiredIds'), 'performance smoke should lock dynamic save-required ids');

console.log('smoke-memory-evidence-risk-guards ok');
