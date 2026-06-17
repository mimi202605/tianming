#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error('[smoke-css-resource-retry] FAIL:', msg);
    process.exit(1);
  }
}

const index = read('index.html');
const tinyi = read('tm-tinyi-v3.js');
const changchao = read('tm-chaoyi-changchao.js');

assert(/TM_CSS_RETRY/.test(index), 'index.html should define shared CSS retry helper');
assert(/TM_CSS_LOADED/.test(index), 'index.html should define CSS load success helper');
assert(/<link[^>]+styles\.css\?v=[^"'\s>]+[^>]+onerror="window\.TM_CSS_RETRY/.test(index), 'styles.css link should call retry helper on load error');
assert(/<link[^>]+styles\.css\?v=[^"'\s>]+[^>]+data-css-fallback=/.test(index), 'styles.css link should declare fallback URL');

const helperMatch = index.match(/<script>\s*([\s\S]*?TM_CSS_RETRY[\s\S]*?)<\/script>/);
assert(helperMatch, 'index.html should contain an inline CSS retry helper script');

const timers = [];
const sandbox = {
  window: { console: { warn: function(){} } },
  console: { warn: function(){} },
  Date: { now: function(){ return 12345; } },
  setTimeout: function(fn, delay) {
    timers.push({ fn, delay });
    return timers.length;
  },
  clearTimeout: function(){},
};
vm.createContext(sandbox);
vm.runInContext(helperMatch[1], sandbox);
assert(typeof sandbox.window.TM_CSS_RETRY === 'function', 'retry helper should install window.TM_CSS_RETRY');

const fakeLink = {
  href: 'styles.css?v=x',
  _attrs: {
    href: 'styles.css?v=x',
    'data-css-base': 'styles.css?v=x',
    'data-css-fallback': 'https://cdn.example/styles.css?v=x',
  },
  getAttribute: function(name) { return this._attrs[name] || ''; },
  setAttribute: function(name, value) { this._attrs[name] = String(value); },
};
sandbox.window.TM_CSS_RETRY(fakeLink);
assert(timers.length === 1 && timers[0].delay === 1000, 'first retry should be quick');
timers.shift().fn();
assert(/styles\.css\?v=x&cssRetry=12345-1/.test(fakeLink.href), 'first retry should reuse primary CSS URL with cache-bust');
sandbox.window.TM_CSS_RETRY(fakeLink);
timers.shift().fn();
sandbox.window.TM_CSS_RETRY(fakeLink);
timers.shift().fn();
assert(/^https:\/\/cdn\.example\/styles\.css\?v=x&cssRetry=12345-3/.test(fakeLink.href), 'third retry should switch to fallback CSS URL');

assert(/tm-tinyi-v3\.css\?v=/.test(tinyi), 'tm-tinyi-v3.js should still load tinyi css');
assert(/TM_CSS_RETRY/.test(tinyi), 'tm-tinyi-v3.js dynamic CSS should bind retry helper');
assert(/data-css-fallback/.test(tinyi), 'tm-tinyi-v3.js dynamic CSS should declare fallback URL');

assert(/tm-chaoyi-changchao\.css/.test(changchao), 'tm-chaoyi-changchao.js should still load changchao css');
assert(/TM_CSS_RETRY/.test(changchao), 'tm-chaoyi-changchao.js dynamic CSS should bind retry helper');
assert(/data-css-fallback/.test(changchao), 'tm-chaoyi-changchao.js dynamic CSS should declare fallback URL');

console.log('[smoke-css-resource-retry] PASS');
