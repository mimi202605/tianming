#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// desk overlay + edict panel split to phase8-formal-drafts.js on 2026-05-26 (Wave 4)
const bridge = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'phase8-formal-drafts.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

assert(bridge.includes('function normalizeFormalImageSrc'), 'formal image src normalizer missing');
assert(bridge.includes('function findFormalEdictPerson'), 'edict source person resolver missing');
assert(bridge.includes('portrait: x.portrait || x.avatar || x.image'), 'edict suggestion portrait fields not preserved');
assert(bridge.includes('tmfRenwuPortrait(person)'), 'edict portrait does not reuse character portrait helper');
assert(bridge.includes('function edictSuggestionPortraitHtml'), 'edict portrait html wrapper missing');
assert(bridge.includes('edict-sug-portrait-wrap'), 'edict portrait fallback wrapper CSS/HTML missing');
assert(bridge.includes('onerror="this.style.display='), 'edict portrait image error fallback missing');
assert(bridge.includes('edictSuggestionPortraitHtml(x)'), 'edict suggestion renderer does not use portrait wrapper');

console.log(`[smoke-formal-edict-portrait] PASS ${passed} assertions`);
