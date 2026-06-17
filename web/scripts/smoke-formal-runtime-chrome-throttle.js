// smoke-formal-runtime-chrome-throttle.js - guard phase8 runtime chrome polling cost.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

assert(src.includes('function formalRuntimeChromeSignature()'), 'formal runtime chrome signature helper missing');
assert(src.includes('function ensureFormalRuntimeChrome(force)'), 'ensureFormalRuntimeChrome should accept force flag');
assert(src.includes('state.runtimeChromeSig = state.runtimeChromeSig ||'), 'runtime chrome signature state should be initialized');
assert(src.includes('if (!force && state.runtimeChromeSig === sig)'), 'runtime chrome should skip unchanged non-forced ticks');
assert(src.includes('ensureFormalRuntimeChrome(false);') && src.includes('}, 3000);'), 'runtime chrome polling should be low-frequency and non-forced');
assert(src.includes('ensureFormalRuntimeChrome(true)'), 'render/start paths should keep a forced refresh entry');

console.log('[smoke-formal-runtime-chrome-throttle] PASS');
