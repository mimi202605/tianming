#!/usr/bin/env node
// 一次性 codemod:renderGameState 内联「往期诏令档案」改 <details> 展开时懒构建
// (档案体随回合无界增长:全量 _edictTracker 循环×每条 letters.find·默认折叠 99% 时间无人看)
'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'tm-hongyan-office.js');
const lines = fs.readFileSync(f, 'utf8').split('\n');

function findLine(pred, from) {
  for (let i = from || 0; i < lines.length; i++) if (pred(lines[i])) return i;
  return -1;
}

const iStart = findLine(l => l.trim() === '// 往期诏令档案');
const iEnd = findLine(l => l.trim() === '// 结束回合按钮');
if (iStart < 0 || iEnd < 0 || iEnd <= iStart) { console.error('anchors not found', iStart, iEnd); process.exit(1); }

const archive = lines.slice(iStart, iEnd);
const jStart = archive.findIndex(l => l.includes('_edictTurns.forEach(function(turn) {'));
const jEnd = archive.findIndex(l => l.includes("edictHTML += '</div></details>';"));
if (jStart < 0 || jEnd < 0 || jEnd <= jStart) { console.error('inner anchors not found', jStart, jEnd); process.exit(1); }
const inner = archive.slice(jStart, jEnd).map(l => l.split('edictHTML +=').join('_h +='));

const newBlock = [
  '  // 往期诏令档案·性能 2026-06-10:档案体随回合无界增长(全量 _edictTracker 循环×每条再嵌 letters.find)·',
  '  // 而 <details> 默认折叠 99% 时间无人看——改为展开时才构建(每次展开重建·保持新鲜)',
  '  var _edArchCount = (GM._edictTracker || []).filter(function(e) { return e.turn < GM.turn; }).length;',
  '  if (_edArchCount > 0) {',
  "    edictHTML += '<details class=\"ed-archive\" ontoggle=\"if(this.open&&typeof _renderEdictArchiveBody===\\'function\\')_renderEdictArchiveBody();\">';",
  "    edictHTML += '<summary>\\u5F80 \\u671F \\u8BCF \\u4EE4 \\u6863 \\u6848 \\u00B7 ' + _edArchCount + ' \\u6761</summary>';",
  "    edictHTML += '<div style=\"margin-top:var(--space-2);max-height:400px;overflow-y:auto;\" id=\"ed-archive-body\"></div>';",
  "    edictHTML += '</details>';",
  '  }'
];

const fnBlock = [
  '// 往期诏令档案体·懒构建(诏令面板 <details> 展开时调用·2026-06-10 性能·循环体自 renderGameState 原样迁出)',
  'function _renderEdictArchiveBody() {',
  "  var _bodyEl = _$('ed-archive-body');",
  '  if (!_bodyEl) return;',
  '  var _allEdicts = (GM._edictTracker || []).filter(function(e) { return e.turn < GM.turn; });',
  "  if (!_allEdicts.length) { _bodyEl.innerHTML = ''; return; }",
  '  var _edictByTurn = {};',
  '  _allEdicts.forEach(function(e) { if (!_edictByTurn[e.turn]) _edictByTurn[e.turn] = []; _edictByTurn[e.turn].push(e); });',
  '  var _edictTurns = Object.keys(_edictByTurn).sort(function(a,b){ return b-a; });',
  "  var _h = '';"
].concat(inner, [
  '  _bodyEl.innerHTML = _h;',
  '}',
  ''
]);

const iRGS = findLine(l => l.startsWith('function renderGameState(){'));
if (iRGS < 0) { console.error('renderGameState anchor not found'); process.exit(1); }

let out = lines.slice(0, iStart).concat(newBlock, lines.slice(iEnd));
// 重新找 renderGameState(splice 后行号变了)
const iRGS2 = out.findIndex(l => l.startsWith('function renderGameState(){'));
out = out.slice(0, iRGS2).concat(fnBlock, out.slice(iRGS2));
fs.writeFileSync(f, out.join('\n'));
console.log('archive block', iStart + '..' + iEnd, '(' + (iEnd - iStart) + ' lines) -> lazy(' + newBlock.length + ') · fn(' + fnBlock.length + ') inserted before renderGameState');
