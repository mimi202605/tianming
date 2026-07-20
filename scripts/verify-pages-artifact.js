#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const releaseTree = require('./lib/release-tree.js');

function arg(name, fallback) {
  const index = process.argv.indexOf('--' + name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const repoRoot = path.resolve(arg('repo-root', path.resolve(__dirname, '..')));
const sourceRoot = path.resolve(arg('source', path.join(repoRoot, 'web')));
const targetRoot = path.resolve(arg('target', ''));

try {
  assert(process.argv.includes('--target'), '--target is required');
  const result = releaseTree.verifyTree({ repoRoot, sourceRoot, targetRoot });
  assert(fs.existsSync(path.join(targetRoot, '.nojekyll')), 'Pages artifact must include web/.nojekyll');
  const html = fs.readFileSync(path.join(targetRoot, 'index.html'), 'utf8');
  assert(/<meta\s+name=["']tm-version["']\s+content=["'][\d.]+["']/.test(html), 'index is not the versioned game shell');
  assert(html.includes('id="launch"'), 'index is missing the game launch surface');
  assert(html.includes('bundled-scenarios/manifest.js'), 'index is missing official scenario metadata');
  assert(html.includes('tm-official-scenario-loader.js'), 'index is missing the official scenario loader');
  const manifest = JSON.parse(fs.readFileSync(path.join(targetRoot, 'bundled-scenarios', 'manifest.json'), 'utf8'));
  assert(Array.isArray(manifest.entries) && manifest.entries.length >= 2, 'official scenario manifest is incomplete');
  console.log('[pages] artifact PASS · files=' + result.fileCount + ' bytes=' + result.totalBytes + ' sha256=' + result.treeSha256);
} catch (error) {
  console.error('[pages] artifact FAIL\n' + (error && error.stack || error));
  process.exit(1);
}
