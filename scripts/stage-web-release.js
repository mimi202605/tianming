#!/usr/bin/env node
// Stage/verify a deployable web tree using scripts/release-excludes.json.
'use strict';

const path = require('path');
const releaseTree = require('./lib/release-tree.js');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes('--' + name); }

const repoRoot = path.resolve(arg('repo-root', path.resolve(__dirname, '..')));
const sourceRoot = path.resolve(arg('source', path.join(repoRoot, 'web')));
const targetArg = arg('target', '');
const label = arg('label', 'web-release');
// --tracked-only(默认关·opt-in)：只 stage git 跟踪文件·供 OTA(Capgo 安卓热更)用；
// 全量安装包(APK/Pages)不传此旗标·行为不变·继续带 assets/vendor 等未跟踪运行素材。
const trackedOnly = flag('tracked-only');

try {
  const configInfo = releaseTree.loadConfig(repoRoot);
  const source = releaseTree.walkTree(sourceRoot, configInfo.config, { trackedOnly });
  const problems = releaseTree.validateSource(sourceRoot, source, configInfo.config);
  const limits = releaseTree.enforceLimits(source.kept, configInfo.config);
  problems.push.apply(problems, limits.problems);

  if (flag('dry-run')) {
    if (problems.length) throw new Error(problems.join('\n'));
    console.log('[release-tree] dry-run PASS · files=' + source.kept.length + ' bytes=' + limits.totalBytes + ' excluded=' + source.excluded.length);
    process.exit(0);
  }
  if (!targetArg) throw new Error('--target is required unless --dry-run is used');
  const targetRoot = path.resolve(targetArg);
  if (flag('verify')) {
    const result = releaseTree.verifyTree({ repoRoot, sourceRoot, targetRoot });
    console.log('[release-tree] verify PASS · files=' + result.fileCount + ' bytes=' + result.totalBytes + ' sha256=' + result.treeSha256);
  } else {
    const result = releaseTree.stageTree({ repoRoot, sourceRoot, targetRoot, label, trackedOnly });
    console.log('[release-tree] stage PASS · files=' + result.manifest.fileCount + ' bytes=' + result.manifest.totalBytes + ' sha256=' + result.manifest.sourceTreeSha256);
  }
} catch (err) {
  console.error('[release-tree] FAIL\n' + (err && err.stack || err));
  process.exit(1);
}
