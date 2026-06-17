// M7 codemod — 字段组改 <details open> 可折叠 + 折子顶组导航 strip。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;

const ANCHOR =
  "      groups.map(function (group) {\n" +
  "        return '<section class=\"folio-group\">' +\n" +
  "          '<header class=\"folio-group-head\">' + escapeHtml(group.title) +\n" +
  "          '<span class=\"folio-group-count\">' + group.fields.length + '</span></header>' +\n" +
  "          '<div class=\"folio-rows\">' + group.fields.map(renderFolioRow).join('') + '</div>' +\n" +
  "        '</section>';\n" +
  "      }).join('') +";

const NEW =
  "      '<div class=\"folio-groupnav\">' + groups.map(function (g, gi) {\n" +
  "        return '<button type=\"button\" class=\"folio-groupnav-btn\" data-folio-group-jump=\"' + gi + '\">' + escapeHtml(g.title) + '</button>';\n" +
  "      }).join('') + '</div>' +\n" +
  "      groups.map(function (group, gi) {\n" +
  "        return '<details class=\"folio-group\" open data-folio-group=\"' + gi + '\">' +\n" +
  "          '<summary class=\"folio-group-head\">' + escapeHtml(group.title) +\n" +
  "          '<span class=\"folio-group-count\">' + group.fields.length + '</span></summary>' +\n" +
  "          '<div class=\"folio-rows\">' + group.fields.map(renderFolioRow).join('') + '</div>' +\n" +
  "        '</details>';\n" +
  "      }).join('') +";

const n = s.split(ANCHOR).length - 1;
if (n !== 1) throw new Error('ANCHOR matched ' + n + ' (need 1)');
s = s.replace(ANCHOR, NEW);
fs.writeFileSync(path, s, 'utf8');
console.log('OK | delta bytes:', s.length - orig.length);
