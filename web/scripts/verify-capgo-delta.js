// ============================================================
//  verify-capgo-delta.js — S8 安卓差量构建验证（合成树·真跑 PowerShell 构建器）
//  覆盖：全量 zip 照打 / manifest schema / files 内容寻址库 / 基线差分新对象包 /
//        build.json 摘要 / 无 BOM / verify-artifacts 复验器（含坏对象侦测）
//  运行：node web/scripts/verify-capgo-delta.js
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BUILDER = path.join(ROOT, 'mobile', 'scripts', 'build-capgo-bundle.ps1');
const VA = require(path.join(ROOT, 'scripts', 'lib', 'verify-artifacts.js'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-verify-capgo-'));

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exit(1); }
}

const WEB = path.join(TMP, 'web');
const OUT = path.join(TMP, 'out');
fs.mkdirSync(path.join(WEB, 'sub'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'index.html'), '<html>capgo</html>');
fs.writeFileSync(path.join(WEB, 'a.js'), 'var a=1;');
fs.writeFileSync(path.join(WEB, 'b.js'), 'var b=2;');
fs.writeFileSync(path.join(WEB, 'sub', 'c.js'), 'var c=3;');
fs.writeFileSync(path.join(WEB, 'junk.js.bak-old'), 'junk'); // 应被剔
fs.mkdirSync(path.join(WEB, 'node_modules', 'x'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'node_modules', 'x', 'y.js'), 'no'); // 应被剔

function build(args) {
  return spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BUILDER,
    '-WebDir', WEB, '-OutDir', OUT].concat(args), { encoding: 'utf-8' });
}

// ── A·差量模式·全量 zip + manifest + files 库 + 对象包 一遍全出 ──
let r = build(['-Version', '0.0.0.1', '-Manifest', '-PackFiles']);
assert(r.status === 0, 'A·构建退出 0（' + (r.status === 0 ? 'ok' : (r.stderr || r.stdout)) + '）');
assert(fs.existsSync(path.join(OUT, '0.0.0.1.zip')), 'A·全量 zip 照打（旧客户端 url 兜底）');
const AdmZip = require('adm-zip');
const zipEntries = new AdmZip(path.join(OUT, '0.0.0.1.zip')).getEntries().filter(e => !e.isDirectory).map(e => e.entryName.replace(/\\/g, '/'));
assert(zipEntries.indexOf('index.html') !== -1, 'A·index.html 在 zip 根');
assert(zipEntries.indexOf('junk.js.bak-old') === -1 && !zipEntries.some(p => p.indexOf('node_modules') === 0), 'A·垃圾剔除生效');

const mfRaw = fs.readFileSync(path.join(OUT, '0.0.0.1-manifest.json'));
assert(mfRaw[0] !== 0xEF, 'A·manifest 无 BOM（node/python 直读）');
const mf = JSON.parse(mfRaw.toString('utf-8'));
assert(mf.version === '0.0.0.1' && Array.isArray(mf.manifest) && mf.manifest.length === 4, 'A·manifest 4 文件（index/a/b/sub/c）');
mf.manifest.forEach(e => {
  assert(/^[0-9a-f]{64}$/.test(e.file_hash), 'A·' + e.file_name + ' hash 64hex 小写');
  assert(e.download_url === 'https://api.themisfitserspeople.top/tianming/capgo/files/' + e.file_hash, 'A·' + e.file_name + ' download_url 合约');
});
const filesDir = path.join(OUT, 'files');
mf.manifest.forEach(e => assert(fs.existsSync(path.join(filesDir, e.file_hash)), 'A·对象落库·' + e.file_name));

const pack1 = path.join(OUT, 'capgo-files-0.0.0.1.zip');
assert(fs.existsSync(pack1), 'A·新对象包存在（无基线=全新）');
const pack1Set = new Set(new AdmZip(pack1).getEntries().map(e => path.basename(e.entryName)));
assert(pack1Set.size === new Set(mf.manifest.map(e => e.file_hash)).size, 'A·对象包=全部唯一哈希');

const build1 = JSON.parse(fs.readFileSync(path.join(OUT, '0.0.0.1-build.json'), 'utf-8'));
assert(build1.manifestCount === 4 && build1.packedCount === pack1Set.size && build1.zipBytes > 0, 'A·build.json 摘要正确');

// ── B·改一个文件 + 基线差分 → 对象包恰 1 个 ──
fs.writeFileSync(path.join(WEB, 'b.js'), 'var b=22; // changed');
r = build(['-Version', '0.0.0.2', '-Manifest', '-PackFiles', '-BaselineManifest', path.join(OUT, '0.0.0.1-manifest.json')]);
assert(r.status === 0, 'B·二次构建退出 0');
const build2 = JSON.parse(fs.readFileSync(path.join(OUT, '0.0.0.2-build.json'), 'utf-8'));
assert(build2.packedCount === 1, 'B·相对基线恰 1 个新对象（只改了 b.js）');
const mf2 = VA.readJson(path.join(OUT, '0.0.0.2-manifest.json'));
const newHash = mf2.manifest.find(e => e.file_name === 'b.js').file_hash;
const pack2Set = new Set(new AdmZip(path.join(OUT, 'capgo-files-0.0.0.2.zip')).getEntries().map(e => path.basename(e.entryName)));
assert(pack2Set.size === 1 && pack2Set.has(newHash), 'B·对象包正是新 b.js 的哈希');

// ── C·verify-artifacts 复验器·健康通过 ──
let res = VA.verifyCapgo({
  manifestPath: path.join(OUT, '0.0.0.2-manifest.json'),
  zipPath: path.join(OUT, '0.0.0.2.zip'),
  filesDir,
  filesZipPath: path.join(OUT, 'capgo-files-0.0.0.2.zip'),
  baselinePath: path.join(OUT, '0.0.0.1-manifest.json'),
  version: '0.0.0.2'
});
assert(res.ok, 'C·复验器通过（' + JSON.stringify(res.stats) + '）');

// ── D·坏对象侦测·篡改库中一个对象 → 复验失败 ──
fs.writeFileSync(path.join(filesDir, newHash), 'tampered!');
res = VA.verifyCapgo({ manifestPath: path.join(OUT, '0.0.0.2-manifest.json'), filesDir, version: '0.0.0.2', sampleN: 100 });
assert(!res.ok && res.problems.some(p => p.indexOf('内容与哈希不符') !== -1), 'D·库被写坏 → 复验逮住');

// ── E·版本不符侦测 ──
res = VA.verifyCapgo({ manifestPath: path.join(OUT, '0.0.0.2-manifest.json'), filesDir: '', version: '9.9.9.9' });
assert(!res.ok && res.problems.some(p => p.indexOf('≠ 期望') !== -1), 'E·版本不符 → 复验逮住');

console.log('PASS assertions=' + assertions);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
