#!/usr/bin/env node
// Safe by default: print the recommended main-branch protection plan.
// Only --apply performs the GitHub API write, and that remains an owner action.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(ROOT, '.github', 'branch-protection-main.json');

function arg(name) {
  const index = process.argv.indexOf('--' + name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : '';
}

function repositoryFromOrigin() {
  const result = spawnSync('git', ['config', '--get', 'remote.origin.url'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const value = String(result.stdout || '').trim();
  const match = value.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return match ? match[1] + '/' + match[2] : '';
}

const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const repository = arg('repo') || repositoryFromOrigin();
console.log(JSON.stringify({
  repository: repository || '<owner>/<repo>',
  branch: 'main',
  configFile: path.relative(ROOT, CONFIG).replace(/\\/g, '/'),
  protection: config
}, null, 2));

if (!process.argv.includes('--apply')) {
  console.log('\nPREVIEW ONLY. Owner applies with:');
  console.log('node scripts/configure-branch-protection.js --apply' + (repository ? '' : ' --repo <owner>/<repo>'));
  process.exit(0);
}

if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
  console.error('Cannot determine GitHub repository; pass --repo owner/name.');
  process.exit(1);
}
const result = spawnSync('gh', [
  'api', '--method', 'PUT',
  'repos/' + repository + '/branches/main/protection',
  '--input', CONFIG
], { cwd: ROOT, stdio: 'inherit' });
process.exit(result.status == null ? 1 : result.status);
