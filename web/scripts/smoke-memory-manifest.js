const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SCRIPTS = __dirname;
const verifyAllPath = path.join(SCRIPTS, 'verify-all.js');
const verifyAll = fs.readFileSync(verifyAllPath, 'utf8');

const memorySmokes = fs.readdirSync(SCRIPTS)
  .filter((file) => /^smoke-memory-.*\.js$/.test(file))
  .sort();

const registered = new Set();
const fileRe = /file:\s*['"]([^'"]*smoke-memory-[^'"]+\.js)['"]/g;
let match;
while ((match = fileRe.exec(verifyAll))) registered.add(match[1]);

const missing = memorySmokes.filter((file) => !registered.has(file));
assert.strictEqual(
  missing.length,
  0,
  'verify-all.js must register every smoke-memory-*.js file; missing: ' + missing.join(', ')
);

assert(registered.has('smoke-memory-manifest.js'), 'memory manifest smoke should register itself');

console.log('smoke-memory-manifest ok');
