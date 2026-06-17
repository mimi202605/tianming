#!/usr/bin/env node
// smoke-postturn-court-render-fallback.js
// Guards the deferred post-turn court path against render-time loading deadlocks.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-court-meter.js'), 'utf8');

let passed = 0;
function assert(cond, label) {
  if (!cond) throw new Error('[assert] ' + label);
  passed++;
}

assert(src.indexOf('function _postTurnCourtShowRenderFallback(error)') >= 0, 'post-turn court render fallback helper exists');
assert(src.indexOf("hideLoading();") >= 0, 'fallback hides loading overlay');
assert(src.indexOf("showTurnResult(html, idx);") >= 0, 'fallback opens a result modal');
assert(src.indexOf("btn.textContent = '⏳ 静待时变'") >= 0, 'fallback restores end-turn button text');

const renderCallIdx = src.indexOf('_endTurn_render.apply(null, _payload);');
const fallbackCallIdx = src.indexOf('_postTurnCourtShowRenderFallback(_e);');
assert(renderCallIdx >= 0, 'post-turn court close still invokes _endTurn_render');
assert(fallbackCallIdx > renderCallIdx, 'render catch calls fallback after failed render');
assert(fallbackCallIdx - renderCallIdx < 700, 'fallback is tied to the render catch block');

console.log('[smoke-postturn-court-render-fallback] pass assertions=' + passed);
