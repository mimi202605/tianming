#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const indexHtml = read('index.html');
const hougong = read('tm-houguong.js');
const verifyAll = read(path.join('scripts', 'verify-all.js'));

const shellIdx = indexHtml.indexOf('tm-shell-extras.js');
const hougongIdx = indexHtml.indexOf('tm-houguong.js');

assert(shellIdx >= 0, 'index.html must load tm-shell-extras.js');
assert(hougongIdx >= 0, 'index.html must load tm-houguong.js');
assert(
  shellIdx < hougongIdx,
  'tm-houguong.js must load after tm-shell-extras.js so it can replace the harem fallback panel'
);

assert(
  /window\.TM\.hougong\s*=/.test(hougong),
  'tm-houguong.js must export window.TM.hougong'
);
assert(
  /renderPanel\s*:\s*renderPanel/.test(hougong),
  'TM.hougong must expose renderPanel'
);
assert(
  /_enqueuePostTurnJob\('harem'/.test(hougong),
  'tm-houguong.js must register the harem post-turn job hook'
);

assert(
  verifyAll.includes("smoke-houguong-module-load.js"),
  'verify-all.js must include smoke-houguong-module-load.js'
);

console.log('smoke-houguong-module-load PASS');
