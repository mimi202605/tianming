// build-official-workshop-pack.js
// 为「官方剧本」构建创意工坊在线市场的 .tm-pack + catalog.json 条目。
// .tm-pack 本质是 zip：manifest.json + scenario.json（entry）。服务器静态 catalog 合并入 /workshop/catalog。
//
// 用法:
//   node web/scripts/build-official-workshop-pack.js <scenario.json路径> \
//       --id <英文id> --pack <英文文件名.tm-pack> --version <x.y.z.w> \
//       [--title <标题>] [--desc <简介>] [--out <输出目录>]
//
// 产物（输出目录，默认 release-hot/_workshop/）:
//   <pack>.tm-pack          —— 待托管到 BASE/workshop/packs/
//   <pack>.catalog-entry.json —— 单条 catalog 条目（含 sha256/size），合并进 BASE/workshop/catalog.json 的 packs[]
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const scenarioPath = process.argv[2];
if (!scenarioPath || scenarioPath.startsWith('--')) {
  console.error('缺少 scenario.json 路径。用法见文件头。');
  process.exit(1);
}
const ROOT = path.resolve(__dirname, '..', '..');
const absScenario = path.isAbsolute(scenarioPath) ? scenarioPath : path.join(ROOT, scenarioPath);
const rawBuf = fs.readFileSync(absScenario);        // 原始字节，打包保真（不经字符串 round-trip）
const data = JSON.parse(rawBuf.toString('utf8'));   // 仅用于校验合法 JSON + 取展示字段

const id = arg('id');
const packName = arg('pack');
const version = arg('version', '1.0.0');
if (!id || !/^[A-Za-z0-9._-]+$/.test(id)) { console.error('--id 必填且只允许 [A-Za-z0-9._-]'); process.exit(1); }
if (!packName || !/^[A-Za-z0-9._-]+\.tm-pack$/.test(packName)) { console.error('--pack 必填，形如 name.tm-pack（ASCII）'); process.exit(1); }

const title = arg('title', data.name || data.title || id);
let desc = arg('desc', '');
if (!desc) {
  // 兜底：openingHook 首句
  desc = String(data.openingHook || data.overview || data.background || '').replace(/\s+/g, ' ').slice(0, 160);
}
const tags = Array.isArray(data.tags) && data.tags.length ? data.tags.slice(0, 12) : ['官方'];

const manifest = {
  id,
  title,
  version,
  type: 'scenario',
  entry: 'scenario.json',
  author: '天命官方',
  description: desc,
  tags
};

const outDir = path.isAbsolute(arg('out', '')) ? arg('out') : path.join(ROOT, arg('out', 'release-hot/_workshop'));
fs.mkdirSync(outDir, { recursive: true });

// 构建 .tm-pack（zip：manifest.json + scenario.json）
// 可选：把本体资源引用改为包内 @pack/，并按需 png→webp（用于随包内嵌压缩立绘）
let scenarioBuf = rawBuf;
const rewritePrefix = arg('rewrite-portraits', ''); // 例: assets/portraits/shaosong/
if (rewritePrefix) {
  const escP = rewritePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escP + '([^"\\\\]+)\\.png', 'g');
  let n = 0;
  const txt = rawBuf.toString('utf8').replace(re, function (_, rest) { n++; return '@pack/' + rewritePrefix + rest + '.webp'; });
  scenarioBuf = Buffer.from(txt, 'utf8');
  console.log('重写立绘引用:', n, '处 → @pack/' + rewritePrefix + '*.webp');
}

const zip = new AdmZip();
zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
zip.addFile('scenario.json', scenarioBuf);

// 可选：把资源目录内容按相对结构打进包
const assetsDir = arg('assets-dir', '');
if (assetsDir) {
  const absAssets = path.isAbsolute(assetsDir) ? assetsDir : path.join(ROOT, assetsDir);
  zip.addLocalFolder(absAssets);
  let cnt = 0; (function walk(dir) { fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else cnt++; }); })(absAssets);
  console.log('打包资源:', cnt, '文件 ←', path.relative(ROOT, absAssets));
}

const packPath = path.join(outDir, packName);
zip.writeZip(packPath);

const buf = fs.readFileSync(packPath);
const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
const size = buf.length;

const catalogEntry = {
  id,
  title,
  version,
  author: '天命官方',
  type: 'scenario',
  description: desc,
  tags,
  packageUrl: 'packs/' + packName,
  sha256,
  size
};
const entryPath = path.join(outDir, packName.replace(/\.tm-pack$/, '') + '.catalog-entry.json');
fs.writeFileSync(entryPath, JSON.stringify(catalogEntry, null, 2), 'utf8');

console.log('=== 官方工坊包构建完成 ===');
console.log('剧本源:', path.relative(ROOT, absScenario));
console.log('标题:', title);
console.log('简介:', desc);
console.log('tags:', JSON.stringify(tags));
console.log('.tm-pack:', path.relative(ROOT, packPath), '·', Math.round(size / 1024) + 'KB');
console.log('sha256:', sha256);
console.log('catalog条目:', path.relative(ROOT, entryPath));
console.log('packageUrl:', catalogEntry.packageUrl);
