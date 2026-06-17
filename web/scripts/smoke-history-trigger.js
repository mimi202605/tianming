#!/usr/bin/env node
'use strict';
// smoke-history-trigger — 刚性史事触发门槛 + narrative 显示(真bug)
//   实跑 checkHistoryEvents:① triggerTurn 把关(魏忠贤 triggerTurn:3 不再开局触发) ② 到回合才触发
//   ③ string-only trigger 无 triggerTurn → 不误触发(hasGate) ④ object trigger year 仍兼容 ⑤ narrative 显示契约
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }
function sliceFn(src, marker){ const a=src.indexOf(marker); if(a<0) return null; let i=src.indexOf('{',a),d=0,j=i; for(;j<src.length;j++){const c=src[j]; if(c==='{')d++; else if(c==='}'){d--; if(d===0){j++;break;}}} return src.slice(a,j); }

console.log('smoke-history-trigger');

const hist = fs.readFileSync(path.join(ROOT,'tm-history-events.js'),'utf8');
const checkSrc = sliceFn(hist, 'function checkHistoryEvents()');
ok(!!checkSrc, 'checkHistoryEvents 抽取成功');

function runTurn(turn, rigids, year){
  const fired = [];
  const ctx = {};
  ctx.getCurrentYear = function(){ return year || 1627; };
  ctx.getCurrentMonth = function(){ return 1; };
  ctx.showHistoryEventModal = function(ev){ fired.push(ev.id); };
  ctx._dbg = function(){};
  ctx.GM = { turn: turn, rigidHistoryEvents: rigids, triggeredHistoryEvents: {} };
  ctx.P = {};
  vm.createContext(ctx);
  vm.runInContext(checkSrc + '\nthis.run = checkHistoryEvents;', ctx);
  ctx.run();
  return fired;
}

const wei = { id:'rh_weiSuicide', triggerTurn:3, name:'魏忠贤自缢阜城', trigger:'阉党权势值 < 50 且 皇威 > 50', narrative:'夜宿阜城·闻歌小曲骂九千岁·遂自缢。' };
const ke  = { id:'rh_keshiDie',   triggerTurn:4, name:'客氏杖毙',       trigger:'魏忠贤已死', narrative:'杖毙于浣衣局。' };

// ① 开局(turn 1)不触发(原 bug:魏忠贤开局即自缢)
var t1 = runTurn(1, [wei, ke]);
ok(t1.indexOf('rh_weiSuicide') < 0, '① ★turn 1 魏忠贤不触发(triggerTurn:3 把关·修开局自缢)');
ok(t1.length === 0, '① turn 1 无任何刚性史事触发');

// ② 到 triggerTurn 才触发
var t3 = runTurn(3, [wei, ke]);
ok(t3.indexOf('rh_weiSuicide') >= 0, '② turn 3 魏忠贤触发(到 triggerTurn)');
ok(t3.indexOf('rh_keshiDie') < 0, '② turn 3 客氏(triggerTurn:4)尚不触发');
var t4 = runTurn(4, [wei, ke]);
ok(t4.indexOf('rh_keshiDie') >= 0 && t4.indexOf('rh_weiSuicide') >= 0, '② turn 4 客氏+魏忠贤皆达回合可触发');

// ③ string-only trigger 无 triggerTurn → 不误触发(hasGate 防御)
var bad = { id:'bad_noGate', trigger:'某些条件', narrative:'x' };
ok(runTurn(1, [bad]).indexOf('bad_noGate') < 0, '③ string trigger 无 triggerTurn → 不开局误触发(原 bug 会触发)');

// ④ object trigger year 结构化仍兼容
var objHit = { id:'obj_hit', trigger:{ year:1627 }, narrative:'y' };
var objMiss = { id:'obj_miss', trigger:{ year:1700 }, narrative:'z' };
ok(runTurn(1, [objHit], 1627).indexOf('obj_hit') >= 0, '④ object trigger year 命中→触发(向后兼容)');
ok(runTurn(1, [objMiss], 1627).indexOf('obj_miss') < 0, '④ object trigger year 不符→不触发');

// ⑤ narrative 显示契约
ok(/event\.narrative \|\| event\.description/.test(hist), '⑤ modal 正文取 narrative||description(原只读 description 致空白)');

console.log('\n结果: '+A+' 通过 / 0 失败');
