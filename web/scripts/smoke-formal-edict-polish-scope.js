#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const hongyan = fs.readFileSync(path.join(ROOT, 'tm-hongyan-office.js'), 'utf8');
const formal = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'phase8-formal-drafts.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

assert(hongyan.includes('function _edictUiRoot'), 'active edict UI root helper missing');
assert(hongyan.includes("document.getElementById('tm-action-edict-overlay')"), 'formal edict overlay is not preferred');
assert(hongyan.includes('function _edictEl'), 'scoped edict element helper missing');
assert(hongyan.includes('var el = _edictEl(cat.id);'), 'polish input collection is not scoped to active panel');
assert(hongyan.includes("var panel = _edictEl('edict-polished');"), 'polish result panel is not scoped to active panel');
assert(hongyan.includes("var ta = _edictEl('edict-polished-text');"), 'polished text apply is not scoped to active panel');
assert(hongyan.includes('window._polishEdicts = _polishEdicts;'), 'polish function is not explicitly exported');
assert(hongyan.includes('window._applyPolishedEdict = _applyPolishedEdict;'), 'apply-polished function is not explicitly exported');
assert(hongyan.includes("onclick=\"_hidePolishedEdict()\""), 'polish hide action still uses global duplicate id lookup');
assert(hongyan.includes("panel.classList.add('show');"), 'polish panel does not enter floating visible state');
assert(hongyan.includes('ed-polish-card'), 'polish result does not use reusable floating card wrapper');
assert(hongyan.includes('formalBridge.applyPolishedEdict'), 'polish apply does not sync back to formal edict drafts');
assert(formal.includes("if(window._polishEdicts)window._polishEdicts();else"), 'formal edict polish button lacks loaded-state feedback');
assert(formal.includes('class="ed-polish-float"'), 'formal polish result container is not a floating overlay');
assert(formal.includes('applyFormalPolishedEdict'), 'formal draft bridge lacks polished-edict apply hook');
assert(!formal.includes(".ed-yuan #edict-polished{display:block !important;margin-top:6px;}"), 'formal polish panel is still forced into the document flow');

console.log(`[smoke-formal-edict-polish-scope] PASS ${passed} assertions`);
