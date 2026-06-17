// 把生成的 installHongyanYuanStyles 植入 phase8-formal-drafts.js
// (在奏疏 zou-yuan 段注释之前插入)。自备份 + 幂等。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');           // web/
const target = path.join(ROOT, 'phase8-formal-drafts.js');
let src = fs.readFileSync(target, 'utf8');
if (src.indexOf('function installHongyanYuanStyles') >= 0) {
  console.log('ALREADY present — skip injection');
  process.exit(0);
}
const installer = fs.readFileSync(path.join(__dirname, '_yaninstaller.txt'), 'utf8');
const anchor = '  // ═══ 御案批红 · 百官奏疏 (zou-yuan) · 落地 2026-06-02 ═══';
const idx = src.indexOf(anchor);
if (idx < 0) { console.error('ANCHOR NOT FOUND — abort'); process.exit(1); }
fs.copyFileSync(target, target + '.bak-pre-yan-landing');
src = src.slice(0, idx) + installer + '\n' + src.slice(idx);
fs.writeFileSync(target, src);
console.log('OK injected installHongyanYuanStyles. backup=.bak-pre-yan-landing  newSize=', src.length);
