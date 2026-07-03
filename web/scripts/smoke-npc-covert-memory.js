#!/usr/bin/env node
// scripts/smoke-npc-covert-memory.js
// 2026-07-03·着重加强方向B(推演→记忆)——"隐于叙事外"的暗流事件也留个人记忆
//
// 真空:hidden_moves(暗中行动/阴谋) 与 relationship_changes(暗流关系变动)——①不在公开时政记→叙事兜底扫不到
//   ②通道①无记忆钩子(只 addEB/AffinityMap) → 只靠②(sc_memwrite)·②截断/失败即彻底丢·"密谋了却不记得在谋"。
// 修·tm-endturn-followup.js 应用 sc15 时确定性给暗中行动者/关系变动者留记忆。本测复制两处逻辑断言。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

// ── 复制自 tm-endturn-followup.js _tmHiddenMoveForMemory ──
function _tmFirstText(){ for (var i=0;i<arguments.length;i++){ if (arguments[i]!=null && String(arguments[i]).trim()) return String(arguments[i]).trim(); } return ''; }
function _tmHiddenMoveForMemory(h) {
  var actor = "", text = "";
  if (typeof h === "string") { text = h.trim(); var m = text.match(/^([^:：]{1,16})[:：]/); actor = m ? m[1].trim() : ""; }
  else if (h && typeof h === "object") { actor = _tmFirstText(h.char, h.name, h.actor, h.schemer); text = _tmFirstText(h.action, h.move, h.text, h.content, h.plan, h.summary); }
  return { actor: actor, text: text };
}
// ── 复制自 hidden_moves 记忆逻辑 ──
function hiddenMoveMemory(hm) {
  var _hmp = _tmHiddenMoveForMemory(hm);
  if (_hmp.actor && _hmp.text && String(_hmp.actor).length >= 2) {
    var _hmType = /背叛|叛|谋|阴谋|通敌|篡|弑/.test(_hmp.text) ? 'betrayal' : 'general';
    return { name: _hmp.actor, event: '暗中：' + String(_hmp.text).slice(0, 36), emotion: '平', importance: 5, type: _hmType };
  }
  return null;
}
// ── 复制自 relationship_changes 记忆逻辑 ──
function relChangeMemory(rc) {
  var _rcD = clamp(parseInt(rc.delta) || 0, -15, 15);
  if (rc.reason && String(rc.reason).trim() && Math.abs(_rcD) >= 4) {
    var _rcEmo = _rcD <= -8 ? '恨' : _rcD < 0 ? '忧' : _rcD >= 8 ? '敬' : '喜';
    var _rcImp = Math.abs(_rcD) >= 10 ? 5 : 4;
    return { name: rc.a, event: String(rc.reason).slice(0, 40), emotion: _rcEmo, importance: _rcImp, who: rc.b };
  }
  return null;
}

console.log('===== ★hidden_moves·暗中行动者自记其谋 =====');
var h1 = hiddenMoveMemory({ schemer: '周延儒', plan: '密谋倾轧温体仁，散布流言' });
assert(h1 && h1.name === '周延儒' && h1.event.indexOf('暗中：') === 0 && h1.event.indexOf('密谋') >= 0, '结构化暗谋→行动者记忆 (得 ' + JSON.stringify(h1) + ')');
assert(h1 && h1.type === 'betrayal', '含"谋"→betrayal 类型');
var h2 = hiddenMoveMemory('王永光：私通边镇，暗输军情');
assert(h2 && h2.name === '王永光' && h2.event.indexOf('私通') >= 0, '"名：内容"字符串暗流→提取行动者');
var h3 = hiddenMoveMemory({ action: '暗中活动' });   // 无 actor
assert(h3 === null, '无行动者→不写(避免无主记忆)');
var h4 = hiddenMoveMemory({ name: '某', action: '窥探' });  // 单字名
assert(h4 === null, '单字名→不写(过滤噪声)');
var h5 = hiddenMoveMemory({ name: '孙承宗', action: '巡阅边备' });  // 非阴谋
assert(h5 && h5.type === 'general', '非阴谋暗流→general 类型仍留记忆');

console.log('===== ★relationship_changes·关系变动留因 =====');
var r1 = relChangeMemory({ a: '钱龙锡', b: '袁崇焕', delta: -12, reason: '袁擅杀毛文龙，牵连于己' });
assert(r1 && r1.name === '钱龙锡' && r1.who === '袁崇焕' && r1.emotion === '恨' && r1.importance === 5, '大幅恶化→恨/imp5/记对象 (得 ' + JSON.stringify(r1) + ')');
var r2 = relChangeMemory({ a: '甲', b: '乙', delta: 9, reason: '乙荐己于帝' });
assert(r2 && r2.emotion === '敬', '大幅改善→敬');
var r3 = relChangeMemory({ a: '甲', b: '乙', delta: -5, reason: '政见相左' });
assert(r3 && r3.emotion === '忧' && r3.importance === 4, '中度恶化→忧/imp4');
var r4 = relChangeMemory({ a: '甲', b: '乙', delta: -3, reason: '小摩擦' });
assert(r4 === null, '幅度<4→不写(琐碎不留记忆)');
var r5 = relChangeMemory({ a: '甲', b: '乙', delta: -10 });
assert(r5 === null, '无 reason→不写');

console.log('');
console.log(`[smoke-npc-covert-memory] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
