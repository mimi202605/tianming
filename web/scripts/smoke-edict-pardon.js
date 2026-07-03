#!/usr/bin/env node
// scripts/smoke-edict-pardon.js
// 2026-07-02·锁住『下诏放人/官复原职没用』的确定性通道
//
// 玩家报·给卢象升下狱后下诏释放+官复原职·无效(人仍在狱/无官职)。真因=诏令解析器只认
// 任命/免职/赐死/赏赐/募兵/补饷 6 类·无"释放/赦免/起复/官复原职"类→全靠 LLM 自觉;
// 且无恢复官职代码(_origOfficialTitle 只存不读)。
// 修·extractEdictActions 加 pardons 类·applyEdictActions 清羁束 + 从 _origOfficialTitle 复官。

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

function makeCtx(chars) {
  const ctx = { console: { log(){}, warn(){}, error(){} }, Date, JSON, Math, RegExp, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.GM = { turn: 10, month: 1, officeTree: [], chars: chars };
  ctx.P = { playerInfo: { characterName: '崇祯', factionName: '明朝廷' } };
  ctx.addEB = () => {};
  ctx.toast = () => {};
  // findCharByName 在 tm-indices.js·此处 stub 免拉整套索引依赖
  ctx.findCharByName = (name) => (ctx.GM.chars || []).find(c => c && c.name === name) || null;
  ctx.recordCharacterArc = () => {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-endturn-edict.js'), 'utf8'), ctx, { filename: 'tm-endturn-edict.js' });
  return ctx;
}
function jailed(name, origTitle) { return { name, alive: true, faction: '明朝廷', _imprisoned: true, _imprisonedTurn: 6, officialTitle: null, position: '', _origOfficialTitle: origTitle }; }

console.log('===== 检测·extractEdictActions 认出赦免/起复 =====');
(function(){
  const ctx = makeCtx([ jailed('卢象升', '兵部侍郎'), { name: '孙传庭', alive: true, officialTitle: '陕西巡抚' } ]);
  var a1 = ctx.extractEdictActions('释放卢象升，以彰宽仁。');
  assert(a1.pardons.length === 1 && a1.pardons[0].character === '卢象升' && a1.pardons[0].restore === false, '「释放卢象升」→pardon(release) 得 ' + JSON.stringify(a1.pardons));
  var a2 = ctx.extractEdictActions('起复卢象升，官复原职。');
  assert(a2.pardons.some(p => p.character === '卢象升' && p.restore === true), '「起复…官复原职」→pardon(restore=true) 得 ' + JSON.stringify(a2.pardons));
  var a3 = ctx.extractEdictActions('大赦天下，与民更始。');
  assert(a3.pardons.length === 0, '「大赦天下」不应把"天下"当人 得 ' + JSON.stringify(a3.pardons));
})();

console.log('===== ★应用·下诏赦免+官复原职·真出狱+复衔 =====');
(function(){
  const ctx = makeCtx([ jailed('卢象升', '兵部侍郎') ]);
  var acts = ctx.extractEdictActions('赦免卢象升，官复原职，仍督师陕西。');
  ctx.applyEdictActions(acts);
  var lu = ctx.GM.chars[0];
  assert(lu._imprisoned === false, '应真出狱 _imprisoned=false (得 ' + lu._imprisoned + ')');
  assert(lu._releasedTurn === 10 && lu._recalledTurn === 10, '应盖释放/召回回合戳(令校验器不再复关) 得 released=' + lu._releasedTurn + ' recalled=' + lu._recalledTurn);
  assert(lu.officialTitle === '兵部侍郎', '官复原职应从 _origOfficialTitle 复衔 (得 ' + lu.officialTitle + ')');
})();

console.log('===== 应用·仅释放(不复职)·出狱但不复衔 =====');
(function(){
  const ctx = makeCtx([ jailed('卢象升', '兵部侍郎') ]);
  ctx.applyEdictActions(ctx.extractEdictActions('开释卢象升，暂归田里。'));
  var lu = ctx.GM.chars[0];
  assert(lu._imprisoned === false, '仅释放也应出狱 (得 ' + lu._imprisoned + ')');
  assert(!lu.officialTitle, '仅释放不复职·官衔仍空 (得 ' + lu.officialTitle + ')');
})();

console.log('===== ★多人诏令·只求释放者不被误复职(Codex Bug3) =====');
(function(){
  const ctx = makeCtx([ jailed('魏忠贤', '司礼监掌印'), jailed('卢象升', '兵部侍郎') ]);
  var acts = ctx.extractEdictActions('释放魏忠贤，起复卢象升，官复原职。');
  ctx.applyEdictActions(acts);
  var wei = ctx.GM.chars[0], lu = ctx.GM.chars[1];
  assert(wei._imprisoned === false && lu._imprisoned === false, '两人都应出狱');
  assert(!wei.officialTitle, '只求释放的魏忠贤不应被误复职 (得 ' + wei.officialTitle + ')');
  assert(lu.officialTitle === '兵部侍郎', '起复的卢象升应复原职 (得 ' + lu.officialTitle + ')');
})();

console.log('===== 反例·无关诏令不误产 pardon =====');
(function(){
  const ctx = makeCtx([ { name: '孙传庭', alive: true, officialTitle: '陕西巡抚' } ]);
  var a = ctx.extractEdictActions('着孙传庭督师陕西，剿灭流寇。');
  assert(a.pardons.length === 0, '任命诏不应产生 pardon 得 ' + JSON.stringify(a.pardons));
})();

console.log('');
console.log(`[smoke-edict-pardon] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
