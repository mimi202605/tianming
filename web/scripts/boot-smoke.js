#!/usr/bin/env node
// Lightweight boot gate: load the index.html script chain up to tm-test-harness.js
// and assert the core boot entrypoints exist. The full TM.test suite remains in
// headless-smoke.js.

'use strict';

if (!process.argv.includes('--boot-only')) {
  process.argv.push('--boot-only');
}

require('./headless-smoke.js');
