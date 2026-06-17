#!/usr/bin/env node
// Guard end-turn result modal from global theme leakage.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

const sepia = css.match(/\[data-theme="sepia"\],\[data-theme="scroll"\]\s*\{([\s\S]*?)\n\}/);
assert(sepia, 'sepia theme block exists');
assert(!/#faf6e8|#f4ecd8|#f0e8d0|#e8dcc0|#d8ccb0/.test(sepia[1]),
  'sepia theme must not keep light paper legacy bg tokens');
assert(/--color-background:#1a1510/.test(sepia[1]), 'sepia background stays dark');
assert(/--txt:#e0d4be/.test(sepia[1]), 'sepia text stays light on dark');

const turnModal = css.match(/\.turn-modal\s*\{([\s\S]*?)\n\}/);
assert(turnModal, 'turn-modal scoped token block exists');
assert(/--color-surface:#2a2218/.test(turnModal[1]), 'turn modal surface is theme-isolated dark');
assert(/--color-foreground:#f4eadd/.test(turnModal[1]), 'turn modal foreground is theme-isolated light');
assert(/--bg-2:#1c1914/.test(turnModal[1]), 'turn modal legacy bg tokens are theme-isolated');
assert(/--txt:#f4eadd/.test(turnModal[1]), 'turn modal legacy text token is theme-isolated');

console.log('[smoke-turn-result-theme-guard] PASS');
