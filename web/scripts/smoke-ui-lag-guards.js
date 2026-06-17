#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERT FAIL:', msg);
    process.exit(1);
  }
}

function sliceBetween(src, start, end) {
  const a = src.indexOf(start);
  assert(a >= 0, `missing start marker: ${start}`);
  const b = src.indexOf(end, a + start.length);
  assert(b > a, `missing end marker: ${end}`);
  return src.slice(a, b);
}

const gameLoop = read('tm-game-loop.js');
const renwuUi = read('tm-renwu-ui.js');
const playerCore = read('tm-player-core.js');
const formalModules = read('phase8-formal-modules.js');
const calibrator = read('tm-party-class-llm-calibrator.js');

const afterHardChange = sliceBetween(
  gameLoop,
  'function _wtAfterHardChange',
  'function _wtCleanHardChangeToken'
);
assert(afterHardChange.includes('_wtScheduleHardChangeRefresh'), 'wentian hardChange must schedule a coalesced refresh');
[
  'renderGameState',
  'renderRenwu',
  'renderWenduiPanel',
  'renderShizhengPanel'
].forEach((name) => {
  assert(!new RegExp(`\\b${name}\\s*\\(`).test(afterHardChange), `_wtAfterHardChange must not synchronously call ${name}`);
});

assert(renwuUi.includes('function _rwAppendCardsChunked'), 'old renwu roster must append cards in chunks');
assert(renwuUi.includes('_rwRenderInitialLimit'), 'old renwu roster must cap initial synchronous cards');
assert(/requestIdleCallback|requestAnimationFrame/.test(renwuUi), 'old renwu roster chunking must yield between batches');

const openDetailUntilPaint = sliceBetween(
  playerCore,
  'function openCharRenwuPage',
  'panel.innerHTML = h;'
);
assert(playerCore.includes('function _rwpLoadLazyTab'), 'full character detail must have lazy tab loader');
assert(playerCore.includes('data-rwp-lazy-tab'), 'full character detail must mark deferred tab content');
assert(!/_rwpOlderMem\.forEach/.test(openDetailUntilPaint), 'full character detail must not build all old memories before first paint');

assert(formalModules.includes('function shouldCalibrateUiAction'), 'formal module UI action calibration must be gated');
assert(/shouldCalibrateUiAction\s*\(\s*action\s*,\s*data/.test(formalModules), 'recordUiActionSignal must consult the calibration gate');
assert(/partyClassLlmObserveUiClicks\s*===\s*true/.test(calibrator), 'global player-action observer must be opt-in');

console.log('smoke-ui-lag-guards OK');
