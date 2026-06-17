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

const formalModules = read('phase8-formal-modules.js');
const formalBridge = read('phase8-formal-bridge.js');
const perf = read('tm-perf.js');

const renderRenwuModule = sliceBetween(
  formalModules,
  'function renderRenwuModule',
  'function renderShizhengModule'
);
assert(formalModules.includes('function appendRenwuCardsChunked'), 'formal renwu roster must append cards in chunks');
assert(formalModules.includes('RENWU_INITIAL_RENDER_LIMIT'), 'formal renwu roster must cap initial synchronous cards');
assert(/requestIdleCallback|requestAnimationFrame/.test(formalModules), 'formal renwu roster chunking must yield between batches');
assert(!/people\.map\(function\(p\)\{\s*return tmfRenwuCard/.test(renderRenwuModule), 'formal renwu module must not render every card before first paint');

assert(/function markPinnedCards\s*\(\s*root/.test(formalBridge), 'pinned-card marking must accept a scoped root');
const markPinnedCards = sliceBetween(
  formalBridge,
  'function markPinnedCards',
  'function installContextMenu'
);
assert(!/document\.querySelectorAll/.test(markPinnedCards), 'pinned-card marking must not scan the whole document');

const renderWrapper = sliceBetween(
  formalBridge,
  'if (window.renderGameState && !window.renderGameState.__phase8FormalWrapped)',
  'if (window.addEB && !window.addEB.__phase8FormalWrapped)'
);
assert(formalBridge.includes('function scheduleFormalRuntimeRefresh'), 'formal bridge must coalesce post-render chrome refresh');
assert(/scheduleFormalRuntimeRefresh\s*\(/.test(renderWrapper), 'renderGameState wrapper must use the coalesced refresh scheduler');
assert(!/showHome\s*\(\)/.test(renderWrapper), 'renderGameState wrapper must not call showHome directly');
assert(!/renderEventFeed\s*\(\)/.test(renderWrapper), 'renderGameState wrapper must not call renderEventFeed directly');

assert(/wrapGlobalFunction\s*\(\s*'renderGameState'\s*,\s*'ui\.renderGameState'/.test(perf), 'TM.perf must sample renderGameState');
assert(/wrapGlobalFunction\s*\(\s*'renderRenwuModule'\s*,\s*'ui\.renderRenwuModule'/.test(perf), 'TM.perf must sample formal renwu module rendering');

console.log('smoke-performance-optimization-guards OK');
