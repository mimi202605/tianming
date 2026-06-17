// 用 _yan_cards.txt 替换 renderFormalInboxItem + renderFormalLetterCard 为米金版
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const target = path.join(ROOT, 'phase8-formal-drafts.js');
let src = fs.readFileSync(target, 'utf8');
if (src.indexOf('class="lcard') >= 0 || src.indexOf('function yanLetterTypeMeta') >= 0) { console.log('cards already migrated — abort'); process.exit(1); }
const m1 = '  function renderFormalInboxItem(item){';
const s1 = src.indexOf(m1);
const m2 = '  function renderFormalLetterCard(l, targetName){';
const s2 = src.indexOf(m2);
if (s1 < 0 || s2 < 0) { console.error('anchors not found', s1, s2); process.exit(1); }
let i = src.indexOf('{', s2), d = 0, e2 = -1;
for (; i < src.length; i++) { var ch = src[i]; if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { e2 = i; break; } } }
if (e2 < 0) { console.error('brace match failed'); process.exit(1); }
const newTxt = fs.readFileSync(path.join(__dirname, '_yan_cards.txt'), 'utf8').replace(/\s*$/, '\n');
fs.copyFileSync(target, target + '.bak-pre-yan-cards');
src = src.slice(0, s1) + newTxt + src.slice(e2 + 1);
fs.writeFileSync(target, src);
console.log('OK replaced inbox+card. range=', s1, '..', e2, 'newSize=', src.length);
