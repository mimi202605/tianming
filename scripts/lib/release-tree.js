// Shared release-tree filter, copier and hash verifier.
// Desktop hot update, Capgo/APK staging and Pages must all interpret
// scripts/release-excludes.json with these exact semantics.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MANIFEST_NAME = '.tm-release-manifest.json';

function normalizeRel(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function sha256File(file) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(file);
  hash.update(data);
  return hash.digest('hex');
}
function loadConfig(repoRoot) {
  const file = path.join(repoRoot, 'scripts', 'release-excludes.json');
  const raw = fs.readFileSync(file);
  const config = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
  return { file, raw, config, sha256: sha256(raw) };
}
function globToRegExp(pattern) {
  let input = normalizeRel(pattern);
  if (input.startsWith('web/')) input = input.slice(4);
  let out = '^';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '*') {
      if (input[i + 1] === '*') {
        i++;
        if (input[i + 1] === '/') { i++; out += '(?:.*/)?'; }
        else out += '.*';
      } else out += '[^/]*';
    } else if (ch === '?') out += '[^/]';
    else out += /[\\^$+.[\]{}()|]/.test(ch) ? '\\' + ch : ch;
  }
  return new RegExp(out + '$', 'i');
}
function compiled(config) {
  if (!config.__compiledReleaseTree) {
    Object.defineProperty(config, '__compiledReleaseTree', {
      enumerable: false,
      value: (config.globs || []).map((pattern) => ({ pattern, re: globToRegExp(pattern) }))
    });
  }
  return config.__compiledReleaseTree;
}
function excludedReason(relValue, config) {
  const rel = normalizeRel(relValue);
  if (!rel || rel === '.' || rel === '..' || rel.startsWith('../') || rel.includes('/../')) return 'unsafe-path';
  const segments = rel.split('/');
  const dirs = new Set(config.dirs || []);
  for (const segment of segments.slice(0, -1)) {
    if (dirs.has(segment)) return 'dir:' + segment;
  }
  for (const segment of segments) {
    for (const prefix of (config.prefixes || [])) {
      if (prefix && segment.startsWith(prefix)) return 'prefix:' + prefix;
    }
  }
  for (const item of compiled(config)) {
    if (item.re.test(rel)) return 'glob:' + item.pattern;
  }
  if (config.previewMockup && rel.startsWith('preview/')) {
    const base = segments[segments.length - 1];
    if (base.startsWith('_')) return 'preview:private';
    if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(base) && !rel.startsWith('preview/img/')) return 'preview:mockup-image';
    if (/\.(log|txt|ya?ml)$/i.test(base)) return 'preview:mockup-text';
  }
  return '';
}

// OTA 专用·取 root 下的 git 跟踪文件集（相对 root 的正斜杠路径），供 --tracked-only 用。
// 返回 null 表示「取不到跟踪集」（root 不在 git 仓、git 缺失、或空集）——调用方据此决定是
// 兜底放行（合成树/离线）还是 fail-closed（正式 OTA）。-z 免引号且原样输出 UTF-8 中文名。
function trackedRelSet(root) {
  try {
    const res = spawnSync('git', ['ls-files', '-z'], {
      cwd: path.resolve(root), encoding: 'buffer', maxBuffer: 256 * 1024 * 1024
    });
    if (!res || res.status !== 0 || !res.stdout || !res.stdout.length) return null;
    const set = new Set();
    for (const piece of res.stdout.toString('utf8').split('\0')) {
      const rel = normalizeRel(piece);
      if (rel) set.add(rel);
    }
    return set.size ? set : null;
  } catch (_) { return null; }
}

function walkTree(root, config, options) {
  root = path.resolve(root);
  options = options || {};
  // --tracked-only(仅 OTA)：只保留 git 跟踪文件·跳过本机散落的未跟踪资产/dev 产物。
  // 取不到跟踪集(root 不在 git 仓·如合成测试树/离线)→ 不过滤·保留旧行为(与 build-hot-update
  // 收集器同口径兜底)；真实 OTA 恒在仓内跑·git 必返非空跟踪集→过滤生效·绝不夹带未跟踪污染。
  let tracked = null;
  if (options.trackedOnly) tracked = trackedRelSet(root);
  const kept = [];
  const excluded = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = normalizeRel(path.relative(root, abs));
      // Directory probing must not use an underscore sentinel: previewMockup treats any
      // preview/_* basename as private and the old '/_' probe therefore dropped the
      // entire preview tree, including preview/img and scenario-editor runtime files.
      const reason = excludedReason(rel + (entry.isDirectory() ? '/directory' : ''), config);
      if (reason) { excluded.push({ rel, reason, directory: entry.isDirectory() }); continue; }
      if (entry.isSymbolicLink()) { excluded.push({ rel, reason: 'symlink', directory: false }); continue; }
      if (entry.isDirectory()) { walk(abs); continue; }
      if (!entry.isFile() || rel === MANIFEST_NAME) continue;
      if (tracked && !tracked.has(rel)) { excluded.push({ rel, reason: 'untracked', directory: false }); continue; }
      const stat = fs.statSync(abs);
      kept.push({ abs, rel, size: stat.size });
    }
  }
  walk(root);
  kept.sort((a, b) => a.rel.localeCompare(b.rel, 'en'));
  return { root, kept, excluded };
}

function localIndexReferences(sourceRoot) {
  const index = path.join(sourceRoot, 'index.html');
  if (!fs.existsSync(index)) return [];
  const html = fs.readFileSync(index, 'utf8');
  const refs = new Set();
  const re = /(?:\s)(?:src|href)\s*=\s*["']([^"'#]+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    let ref = match[1].split(/[?#]/)[0].trim();
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
    try { ref = decodeURIComponent(ref); } catch (_) {}
    ref = normalizeRel(ref);
    if (ref) refs.add(ref);
  }
  return Array.from(refs).sort();
}

function validateSource(sourceRoot, tree, config) {
  const problems = [];
  const kept = new Set(tree.kept.map((item) => item.rel));
  for (const required of (config.requiredFiles || [])) {
    if (!kept.has(normalizeRel(required))) problems.push('required file missing/excluded: ' + required);
  }
  for (const ref of localIndexReferences(sourceRoot)) {
    if (excludedReason(ref, config)) problems.push('index reference excluded: ' + ref);
    else if (!fs.existsSync(path.join(sourceRoot, ref.replace(/\//g, path.sep)))) {
      // Missing large assets are allowed in a git-only checkout; they are still
      // caught by the product smoke allowlist and full release artifact gates.
      if (!/^(?:assets|vendor)\//.test(ref)) problems.push('index reference missing: ' + ref);
    }
  }
  return problems;
}

function enforceLimits(entries, config) {
  const limits = config.limits || {};
  const problems = [];
  const totalBytes = entries.reduce((sum, row) => sum + row.size, 0);
  if (limits.minFiles && entries.length < limits.minFiles) problems.push('file count ' + entries.length + ' < minFiles ' + limits.minFiles);
  if (limits.maxFiles && entries.length > limits.maxFiles) problems.push('file count ' + entries.length + ' > maxFiles ' + limits.maxFiles);
  if (limits.maxTotalBytes && totalBytes > limits.maxTotalBytes) problems.push('total bytes ' + totalBytes + ' > maxTotalBytes ' + limits.maxTotalBytes);
  if (limits.maxSingleFileBytes) {
    entries.filter((row) => row.size > limits.maxSingleFileBytes).forEach((row) => {
      problems.push('oversized file ' + row.rel + ' = ' + row.size + ' > ' + limits.maxSingleFileBytes);
    });
  }
  return { problems, totalBytes };
}

function hashEntries(entries) {
  return entries.map((row) => ({ path: row.rel, size: row.size, sha256: sha256File(row.abs) }));
}
function treeHash(entries) {
  const hash = crypto.createHash('sha256');
  entries.forEach((row) => hash.update(row.path + '\0' + row.size + '\0' + row.sha256 + '\n'));
  return hash.digest('hex');
}
function writeManifest(targetRoot, hashed, configInfo, label) {
  const totalBytes = hashed.reduce((sum, row) => sum + row.size, 0);
  const manifest = {
    schemaVersion: 1,
    label: label || 'web-release',
    releaseExcludesSha256: configInfo.sha256,
    sourceTreeSha256: treeHash(hashed),
    fileCount: hashed.length,
    totalBytes,
    files: hashed
  };
  fs.writeFileSync(path.join(targetRoot, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
function isStrictChild(parentValue, childValue) {
  const parent = comparablePath(parentValue);
  const child = comparablePath(childValue);
  return child !== parent && child.startsWith(parent + path.sep);
}
function assertSafeTarget(sourceRoot, targetRoot) {
  const source = path.resolve(sourceRoot);
  const target = path.resolve(targetRoot);
  if (comparablePath(source) === comparablePath(target) || isStrictChild(target, source)) {
    throw new Error('refuse target that contains source: ' + target);
  }
  if (isStrictChild(source, target)) throw new Error('refuse target inside source: ' + target);
  if (target === path.parse(target).root) throw new Error('refuse filesystem-root target: ' + target);
  return { source, target };
}

function hasValidReleaseManifest(target) {
  const manifestPath = path.join(target, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath) || fs.lstatSync(manifestPath).isSymbolicLink()) return false;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
    return manifest && manifest.schemaVersion === 1 && Array.isArray(manifest.files) &&
      typeof manifest.sourceTreeSha256 === 'string';
  } catch (_) { return false; }
}

// stageTree recursively replaces its target.  Only delete a directory when it
// is an explicit derived output, a temp child, empty, or already carries our
// valid release manifest.  A typo pointing at an ordinary existing folder must
// fail closed instead of erasing unrelated files.
function assertSafeStageTarget(repoRoot, sourceRoot, targetRoot) {
  const safe = assertSafeTarget(sourceRoot, targetRoot);
  if (!fs.existsSync(safe.target)) return safe;
  const stat = fs.lstatSync(safe.target);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('refuse non-directory/symlink stage target: ' + safe.target);

  const mobileWww = path.resolve(repoRoot, 'mobile', 'www');
  const isKnownDerived = comparablePath(safe.target) === comparablePath(mobileWww);
  const isEmpty = fs.readdirSync(safe.target).length === 0;
  if (!isKnownDerived && !isEmpty && !hasValidReleaseManifest(safe.target)) {
    throw new Error('refuse to replace unmarked existing stage target: ' + safe.target);
  }
  return safe;
}

function stageTree(options) {
  const safe = assertSafeStageTarget(options.repoRoot, options.sourceRoot, options.targetRoot);
  const configInfo = loadConfig(options.repoRoot);
  // trackedOnly 仅作用于「源」的枚举（OTA 只收跟踪文件）；目标是刚拷出的临时树、非 git 仓，
  // 重扫时不能再要求 tracked，否则会 fail-closed。目标只含已过滤后的文件，重扫集合本就一致。
  const tree = walkTree(safe.source, configInfo.config, { trackedOnly: !!options.trackedOnly });
  const problems = validateSource(safe.source, tree, configInfo.config);
  const limits = enforceLimits(tree.kept, configInfo.config);
  problems.push.apply(problems, limits.problems);
  if (problems.length) throw new Error('release source gate failed:\n  - ' + problems.join('\n  - '));

  fs.rmSync(safe.target, { recursive: true, force: true });
  fs.mkdirSync(safe.target, { recursive: true });
  for (const row of tree.kept) {
    const dest = path.join(safe.target, row.rel.replace(/\//g, path.sep));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(row.abs, dest);
  }
  const staged = walkTree(safe.target, configInfo.config);
  const hashed = hashEntries(staged.kept);
  const manifest = writeManifest(safe.target, hashed, configInfo, options.label);
  return { tree, manifest };
}

function verifyTree(options) {
  const safe = assertSafeTarget(options.sourceRoot, options.targetRoot);
  const configInfo = loadConfig(options.repoRoot);
  const source = walkTree(safe.source, configInfo.config);
  const target = walkTree(safe.target, configInfo.config);
  const problems = validateSource(safe.source, source, configInfo.config);
  const limits = enforceLimits(target.kept, configInfo.config);
  problems.push.apply(problems, limits.problems);

  const sourceMap = new Map(source.kept.map((row) => [row.rel, row]));
  const targetMap = new Map(target.kept.map((row) => [row.rel, row]));
  for (const rel of sourceMap.keys()) if (!targetMap.has(rel)) problems.push('staged file missing: ' + rel);
  for (const rel of targetMap.keys()) if (!sourceMap.has(rel)) problems.push('staged file extra/forbidden: ' + rel);

  const targetHashed = hashEntries(target.kept);
  const targetHashMap = new Map(targetHashed.map((row) => [row.path, row]));
  for (const [rel, sourceRow] of sourceMap) {
    const targetRow = targetHashMap.get(rel);
    if (!targetRow) continue;
    if (sourceRow.size !== targetRow.size || sha256File(sourceRow.abs) !== targetRow.sha256) problems.push('staged hash mismatch: ' + rel);
  }

  const manifestPath = path.join(safe.target, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) problems.push('staging manifest missing: ' + MANIFEST_NAME);
  else {
    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '')); }
    catch (err) { problems.push('staging manifest invalid JSON: ' + err.message); }
    if (manifest) {
      if (manifest.releaseExcludesSha256 !== configInfo.sha256) problems.push('staging manifest exclusion hash stale');
      if (manifest.sourceTreeSha256 !== treeHash(targetHashed)) problems.push('staging manifest tree hash stale');
      if (manifest.fileCount !== targetHashed.length || manifest.totalBytes !== limits.totalBytes) problems.push('staging manifest counts stale');
    }
  }
  if (problems.length) throw new Error('release staging gate failed:\n  - ' + problems.join('\n  - '));
  return { source, target, totalBytes: limits.totalBytes, fileCount: target.kept.length, treeSha256: treeHash(targetHashed) };
}

module.exports = {
  MANIFEST_NAME, normalizeRel, sha256, sha256File, loadConfig, excludedReason,
  trackedRelSet, walkTree, localIndexReferences, validateSource, enforceLimits, hashEntries,
  treeHash, assertSafeTarget, assertSafeStageTarget, stageTree, verifyTree
};
