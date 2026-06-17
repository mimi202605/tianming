const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function assert(cond, msg) {
  if (!cond) {
    console.error('[smoke-endturn-token-guard] FAIL:', msg);
    process.exit(1);
  }
}

const followup = read('tm-endturn-followup.js');
const prompt = read('tm-endturn-prompt.js');
const ai = read('tm-endturn-ai.js');
const helpers = read('tm-endturn-ai-helpers.js');

assert(helpers.includes('_tmBuildCompactConversationForSubcall'), 'SC2 compact conversation helper missing');
assert(followup.includes('_tmPrepareSc2Messages(sysP, GM.conv, tp2, _maybeCacheSys)'), 'SC2 must use guarded message preparation');
assert(!followup.includes('.concat(GM.conv)'), 'SC2 must not append raw GM.conv');
assert(followup.includes('_tmLimitPromptSection'), 'SC2 prompt section limiter missing');
assert(helpers.includes("recordAIDiagnostic('prompt_trimmed'"), 'SC2 token trim diagnostic missing');

assert(prompt.includes('_convUserPrompt') && prompt.includes('原始输入') && prompt.includes('GM.conv.push({role:"user",content:_convUserPrompt})'),
  'end-turn user prompt must be compacted before writing GM.conv');

assert(ai.includes('!Array.isArray(GM._aiDispatchStats.errorLog)') && ai.includes('GM._aiDispatchStats.errorLog = []'),
  'AI dispatch stats must normalize legacy errorLog');

console.log('[smoke-endturn-token-guard] all assertions pass');
