// ============================================================
//  verify-hot-builder-gates.js — S7 构建器防呆闸门验证（合成树）
//  GATE-0 部分包禁用 / GATE-2 完整性 / GATE-3 版本单调 / GATE-4 zip↔manifest / GATE-5 版本戳
//  运行：node web/scripts/verify-hot-builder-gates.js
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BUILDER = path.join(ROOT, 'web', 'tools', 'build-hot-update-package.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-verify-gates-'));

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exit(1); }
}

// ── 合成 web 树 ──
const WEB = path.join(TMP, 'web');
const APP = path.join(TMP, 'app');
function resetTree(ver) {
  fs.rmSync(WEB, { recursive: true, force: true });
  fs.rmSync(APP, { recursive: true, force: true });
  fs.mkdirSync(WEB, { recursive: true });
  fs.mkdirSync(path.join(APP, 'scenarios'), { recursive: true });
  fs.writeFileSync(path.join(WEB, 'index.html'),
    '<html><head><meta name="tm-version" content="' + ver + '"><title>t</title></head>' +
    '<body><script src="a.js?v=1"></script><script src="b.js"></script></body></html>');
  fs.writeFileSync(path.join(WEB, 'a.js'), 'var a=1;');
  fs.writeFileSync(path.join(WEB, 'b.js'), 'var b=2;');
  fs.writeFileSync(path.join(WEB, 'styles.css'), 'body{}');
  fs.writeFileSync(path.join(WEB, 'changelog.json'), JSON.stringify({ entries: [] }));
  fs.writeFileSync(path.join(WEB, 'version.json'), JSON.stringify({ version: ver }));
  fs.writeFileSync(path.join(APP, 'main-impl.js'), '// main impl');
  fs.writeFileSync(path.join(APP, 'preload-impl.js'), '// preload impl');
  fs.writeFileSync(path.join(APP, 'scenarios', '官方剧本.json'), '{"id":"x"}');
}
function build(args) {
  return spawnSync('node', [BUILDER].concat(args, ['--web-root', WEB, '--app-root', APP]), { encoding: 'utf-8' });
}

// ── A·健康全量构建通过·zip↔manifest 对账一致 ──
resetTree('9.0.0.1');
const outA = path.join(TMP, 'outA');
let r = build(['--version', '9.0.0.1', '--out', outA, '--notes', 't']);
assert(r.status === 0, 'A·健康树全量构建通过（' + (r.status === 0 ? 'exit 0' : r.stderr) + '）');
const feedA = JSON.parse(fs.readFileSync(path.join(outA, 'hot-latest.json'), 'utf-8'));
assert(feedA.version === '9.0.0.1', 'A·feed 版本正确');
const manifestA = JSON.parse(fs.readFileSync(path.join(outA, 'manifests', '9.0.0.1.json'), 'utf-8'));
const paths = manifestA.files.map(f => f.path);
['index.html', 'a.js', 'b.js', 'styles.css', 'changelog.json', 'version.json', '_app_main.js', '_app_preload.js', 'bundled-scenarios/官方剧本.json']
  .forEach(p => assert(paths.indexOf(p) !== -1, 'A·清单含 ' + p));

// ── B·GATE-0·--files 部分包默认禁 ──
r = build(['--version', '9.0.0.2', '--files', 'a.js', '--out', path.join(TMP, 'outB')]);
assert(r.status !== 0 && /GATE-0/.test(r.stderr), 'B·GATE-0 拦 --files 部分包');
r = build(['--version', '9.0.0.2', '--files', 'a.js', '--allow-partial-DANGEROUS', '--out', path.join(TMP, 'outB')]);
assert(r.status === 0, 'B·危险旗标放行（调试用）');

// ── C·GATE-2·index 引用不在清单（删 b.js 但 script 标签还在） ──
resetTree('9.0.0.1');
fs.rmSync(path.join(WEB, 'b.js'));
r = build(['--version', '9.0.0.1', '--out', path.join(TMP, 'outC')]);
assert(r.status !== 0 && /GATE-2/.test(r.stderr) && /b\.js/.test(r.stderr), 'C·GATE-2 拦 index 引用缺失（1.3.3.4 病灶类）');

// ── D·GATE-2·必含文件缺失（删 changelog.json） ──
resetTree('9.0.0.1');
fs.rmSync(path.join(WEB, 'changelog.json'));
r = build(['--version', '9.0.0.1', '--out', path.join(TMP, 'outD')]);
assert(r.status !== 0 && /GATE-2/.test(r.stderr) && /changelog\.json/.test(r.stderr), 'D·GATE-2 拦必含文件缺失');

// ── E·GATE-3·版本单调（同 outDir 二次构建相同/更低版本） ──
resetTree('9.0.0.1');
const outE = path.join(TMP, 'outE');
r = build(['--version', '9.0.0.1', '--out', outE]);
assert(r.status === 0, 'E·首次构建通过');
r = build(['--version', '9.0.0.1', '--out', outE]);
assert(r.status !== 0 && /GATE-3/.test(r.stderr), 'E·GATE-3 拦相同版本重发');
resetTree('9.0.0.0');
fs.writeFileSync(path.join(WEB, 'version.json'), JSON.stringify({ version: '9.0.0.0' }));
r = build(['--version', '9.0.0.0', '--out', outE]);
assert(r.status !== 0 && /GATE-3/.test(r.stderr), 'E·GATE-3 拦更低版本');
resetTree('9.0.0.2');
r = build(['--version', '9.0.0.2', '--out', outE]);
assert(r.status === 0, 'E·更高版本放行');

// ── F·GATE-5·版本戳不一致 ──
resetTree('9.0.0.1');
fs.writeFileSync(path.join(WEB, 'version.json'), JSON.stringify({ version: '8.0.0.0' })); // 戳没盖
r = build(['--version', '9.0.0.1', '--out', path.join(TMP, 'outF')]);
assert(r.status !== 0 && /GATE-5/.test(r.stderr) && /version\.json/.test(r.stderr), 'F·GATE-5 拦 version.json 戳不一致');
r = build(['--version', '9.0.0.1', '--skip-stamp-check', '--out', path.join(TMP, 'outF')]);
assert(r.status === 0, 'F·--skip-stamp-check 放行（调试用）');
resetTree('9.0.0.1');
fs.writeFileSync(path.join(WEB, 'index.html'),
  '<html><head><title>t</title></head><body><script src="a.js"></script><script src="b.js"></script></body></html>'); // 无 meta
r = build(['--version', '9.0.0.1', '--out', path.join(TMP, 'outF2')]);
assert(r.status !== 0 && /GATE-5/.test(r.stderr) && /tm-version/.test(r.stderr), 'F·GATE-5 拦 meta 缺失');

// ── G·GATE-4 对账逻辑存在性（健康构建即隐式跑过·此处验源码在位） ──
const builderSrc = fs.readFileSync(BUILDER, 'utf-8');
assert(/GATE-4/.test(builderSrc) && /zipSet/.test(builderSrc), 'G·GATE-4 zip↔manifest 对账在构建路径上');

console.log('PASS assertions=' + assertions);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
