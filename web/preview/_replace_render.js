// 用 _yan_new_render.txt 整函数替换 phase8-formal-drafts.js 里的 renderFormalLetterPanel
// (brace 匹配定位旧函数；自备份 + 幂等)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const target = path.join(ROOT, 'phase8-formal-drafts.js');
let src = fs.readFileSync(target, 'utf8');
if (src.indexOf('function yanContactCard') >= 0) { console.log('yan render already present — abort to avoid dup'); process.exit(1); }
const startMark = '  function renderFormalLetterPanel(){';
const si = src.indexOf(startMark);
if (si < 0) { console.error('renderFormalLetterPanel NOT FOUND'); process.exit(1); }
let i = src.indexOf('{', si), depth = 0, end = -1;
for (; i < src.length; i++) { var ch = src[i]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } } }
if (end < 0) { console.error('brace match failed'); process.exit(1); }
const newFn = fs.readFileSync(path.join(__dirname, '_yan_new_render.txt'), 'utf8').replace(/\s*$/, '\n');
fs.copyFileSync(target, target + '.bak-pre-yan-render');
src = src.slice(0, si) + newFn + src.slice(end + 1);
fs.writeFileSync(target, src);
console.log('OK replaced renderFormalLetterPanel (+yan helpers). oldFnLen=', end - si + 1, 'newFnLen=', newFn.length, 'newSize=', src.length);
