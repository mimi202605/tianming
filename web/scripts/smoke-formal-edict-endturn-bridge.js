#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// phase8 desk overlay + edict panel split to phase8-formal-drafts.js on 2026-05-26 (Wave 4)
const bridge = read('phase8-formal-bridge.js');
const drafts = read('phase8-formal-drafts.js');
const phase8 = bridge + '\n' + drafts;
const office = read('tm-office-panel.js');
const prep = read('tm-endturn-prep.js');
const render = read('tm-endturn-render.js');

assert(/function syncFormalEdictDraftsToLegacyInputs\(\)/.test(phase8), 'phase8 bridge sync function is missing');
assert(/function getFormalEdictDraftSnapshot\(\)/.test(phase8), 'phase8 edict snapshot function is missing');
assert(/function clearFormalEdictDrafts\(\)/.test(phase8), 'phase8 edict clear function is missing');
assert(/window\.syncPhase8FormalEdictDrafts\s*=\s*syncFormalEdictDraftsToLegacyInputs/.test(phase8), 'global bridge sync hook is missing');
assert(/syncEdictDraftsToLegacy:\s*syncFormalEdictDraftsToLegacyInputs/.test(phase8), 'TMPhase8FormalBridge sync method is missing');
assert(/clearEdictDrafts:\s*clearFormalEdictDrafts/.test(phase8), 'TMPhase8FormalBridge clear method is missing');

const openZhaoIndex = drafts.indexOf('function openZhaoPreviewPanel()');
const removeHiddenIndex = drafts.indexOf('removeFormalEdictHiddenInputs();', openZhaoIndex);
const openOverlayIndex = drafts.indexOf('openDeskOverlay(', openZhaoIndex);
assert(openZhaoIndex >= 0 && removeHiddenIndex > openZhaoIndex && removeHiddenIndex < openOverlayIndex, 'openZhao must remove bridge inputs before rendering live edict fields');

const ensureIndex = phase8.indexOf('function ensureFormalEdictBridgeInput');
const realInputGuardIndex = phase8.indexOf("data-phase8-edict-bridge') !== '1'", ensureIndex);
const nonEmptyGuardIndex = phase8.indexOf("if (value && 'value' in el) el.value = value;", ensureIndex);
assert(ensureIndex >= 0 && realInputGuardIndex > ensureIndex && nonEmptyGuardIndex > realInputGuardIndex, 'bridge must not overwrite real legacy inputs with empty phase8 drafts');

const confirmIndex = office.indexOf('function confirmEndTurn()');
const confirmSyncIndex = office.indexOf('syncEdictDraftsToLegacy', confirmIndex);
const confirmReadIndex = office.indexOf("var edict=(_$('edict-pol')", confirmIndex);
assert(confirmIndex >= 0 && confirmSyncIndex > confirmIndex && confirmSyncIndex < confirmReadIndex, 'confirmEndTurn must sync phase8 drafts before reading edict inputs');

const collectIndex = prep.indexOf('function _endTurn_collectInput()');
const collectSyncIndex = prep.indexOf('syncEdictDraftsToLegacy', collectIndex);
const collectReadIndex = prep.indexOf("var edicts={political:(_$(\"edict-pol\")", collectIndex);
assert(collectIndex >= 0 && collectSyncIndex > collectIndex && collectSyncIndex < collectReadIndex, '_endTurn_collectInput must sync phase8 drafts before collecting edicts');

const clearInputIndex = render.indexOf('["edict-pol","edict-mil","edict-dip","edict-eco","edict-oth","xinglu","xinglu-pub","xinglu-prv"]');
const clearPhase8Index = render.indexOf('clearEdictDrafts', clearInputIndex);
assert(clearInputIndex >= 0 && clearPhase8Index > clearInputIndex, 'end-turn render must clear phase8 edict drafts after clearing legacy inputs');

console.log('[smoke-formal-edict-endturn-bridge] pass');
