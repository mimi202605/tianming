#!/usr/bin/env node
// 一次性 codemod:高频全屏遮罩去 backdrop-filter(blur)·alpha 小幅补偿
// (登基 _enthrone-event / 终局 _endgame / 联机更新仪式 tm-update-ritual 三个一次性仪式遮罩保留不动)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function patch(file, edits) {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const [a, b] of edits) {
    if (s.includes(a)) { s = s.split(a).join(b); n++; }
    else console.log('MISS', file, a.slice(0, 70));
  }
  fs.writeFileSync(p, s);
  console.log(file, n + '/' + edits.length);
}

patch('tm-shizheng-panel.js', [
  ['background:rgba(18,12,6,0.85);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);',
   'background:rgba(18,12,6,0.88);z-index:9998;display:flex;align-items:center;justify-content:center;'],
  ['background:rgba(15,10,5,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);',
   'background:rgba(15,10,5,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;'],
  ['background:rgba(15,10,5,0.88);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);',
   'background:rgba(15,10,5,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;'],
  ['background:rgba(15,10,5,0.88);z-index:10001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);',
   'background:rgba(15,10,5,0.9);z-index:10001;display:flex;align-items:center;justify-content:center;'],
  ['background:rgba(10,8,4,0.85);z-index:10010;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);',
   'background:rgba(10,8,4,0.88);z-index:10010;display:flex;align-items:center;justify-content:center;']
]);

patch('tm-office-panel.js', [
  ['background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);',
   'background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;']
]);

patch('tm-office-runtime.js', [
  ['background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);',
   'background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;']
]);

patch('tm-content-manager.js', [
  ['rgba(3,2,1,.86);display:none;align-items:center;justify-content:center;backdrop-filter:blur(5px);}',
   'rgba(3,2,1,.9);display:none;align-items:center;justify-content:center;}'],
  ['.tm-detail-layer{position:fixed;inset:0;z-index:2680;display:grid;place-items:center;background:rgba(4,2,1,.72);backdrop-filter:blur(3px);',
   '.tm-detail-layer{position:fixed;inset:0;z-index:2680;display:grid;place-items:center;background:rgba(4,2,1,.78);']
]);

// tm-launch.js 三个开局弹窗:同一 style 串前缀·按 id 唯一锚替换整段前缀
patch('tm-launch.js', [
  ['background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fi 0.2s ease;" id="_scnPreview"',
   'background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;animation:fi 0.2s ease;" id="_scnPreview"'],
  ['background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fi 0.2s ease;" id="_mapModeChoice"',
   'background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;animation:fi 0.2s ease;" id="_mapModeChoice"'],
  ['background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fi 0.2s ease;" id="_gameSetupModal"',
   'background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;animation:fi 0.2s ease;" id="_gameSetupModal"']
]);
console.log('done');
