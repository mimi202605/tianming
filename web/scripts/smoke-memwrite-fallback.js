#!/usr/bin/env node
// scripts/smoke-memwrite-fallback.js
// 2026-07-03·锁住『方向B(推演→记忆)真空兜底』——纯叙事涉事 NPC 不因通道②(sc_memwrite)截断/失败而失忆
//
// 背景·NPC 记忆写回两通道:①结构化(tm-endturn-apply·可靠·tag=本回合T)②叙事 sc_memwrite(脆·截断不重试/失败静默吞·post-turn tag=T+1)。
//   "叙事独有事件"(只在时政记散文·无结构字段)只能靠②·②一失败即永久丢失→NPC 停在开局。
// 修·tm-endturn-followup.js 加 _memWriteFallbackFromNarrative(p1)·置于②的 catch 之后(②成功/截断/抛错均执行)·
//   对叙事提到、在 GM.chars、且本回合起(m.turn>=GM.turn-1·覆盖①T与②T+1)无记忆的活人 NPC·确定性补一条轻量亲历记忆。
// 本测·复制该函数逻辑·mock GM/NpcMemorySystem·验补漏/去重(①②皆不重复)/时序/排除死者玩家。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ── mock 环境 ──
let GM, remembered;
const NpcMemorySystem = {
  remember: function(name, event, emotion, importance, related, meta){
    remembered.push({ name, event, emotion, importance, related, meta });
    // 真 remember 会 push 进 ch._memory(tag GM.turn)·此处镜像以模拟真实副作用
    const ch = (GM.chars||[]).find(c => c && c.name === name);
    if (ch) { if(!ch._memory) ch._memory=[]; ch._memory.push({ turn: GM.turn, event, importance }); }
  }
};
function _dbg(){}

// ── 复制自 tm-endturn-followup.js 的 _memWriteFallbackFromNarrative (Codex 审后·判重基准=源回合T) ──
function _memWriteFallbackFromNarrative(p1, sourceTurn) {
  try {
    if (!p1 || typeof GM === 'undefined' || !GM.chars) return 0;
    if (typeof NpcMemorySystem === 'undefined' || !NpcMemorySystem.remember) return 0;
    var text = String(p1.shizhengji || '') + '\n' + String(p1.shilu_text || p1.zhengwen || '');
    if (Array.isArray(p1.npc_actions)) p1.npc_actions.slice(0, 60).forEach(function(a){ if (a) text += '\n' + (a.name || '') + (a.action || '') + (a.result || '') + (a.target || ''); });
    if (Array.isArray(p1.faction_events)) p1.faction_events.slice(0, 30).forEach(function(fe){ if (fe) text += '\n' + (fe.actor || '') + (fe.action || '') + (fe.result || '') + (fe.target || ''); });
    if (Array.isArray(p1.events)) p1.events.slice(0, 30).forEach(function(e){ if (e && e.desc) text += '\n' + String(e.desc); });
    if (text.replace(/\s/g, '').length < 8) return 0;
    // 判重基准=源回合T:显式 sourceTurn > post-turn 队列 GM._postTurnJobs.turn > 回退 GM.turn-1(旧行为)
    var recent = (typeof sourceTurn === 'number') ? sourceTurn
      : (GM._postTurnJobs && typeof GM._postTurnJobs.turn === 'number') ? GM._postTurnJobs.turn
      : (typeof GM.turn === 'number' ? Math.max(0, GM.turn - 1) : 0);
    var sentences = text.split(/[。！？!?\n；;]/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length >= 4; });
    var n = 0, CAP = 50;
    for (var i = 0; i < GM.chars.length && n < CAP; i++) {
      var ch = GM.chars[i];
      if (!ch || !ch.name || String(ch.name).length < 2 || ch.alive === false || ch.isPlayer) continue;
      if (text.indexOf(ch.name) < 0) continue;
      if (Array.isArray(ch._memory) && ch._memory.some(function(m){ return m && typeof m.turn === 'number' && m.turn >= recent; })) continue;
      var sent = null;
      for (var j = 0; j < sentences.length; j++) { if (sentences[j].indexOf(ch.name) >= 0) { sent = sentences[j]; break; } }
      if (!sent) continue;
      var ev = sent.length > 48 ? sent.slice(0, 48) + '…' : sent;
      try { NpcMemorySystem.remember(ch.name, ev, '平', 4, '', { source: 'witnessed', type: 'general', _fallback: true }); n++; } catch(_re) {}
    }
    if (n > 0 && typeof _dbg === 'function') _dbg('[MemWrite] 真空兜底·补 ' + n + ' 名');
    return n;
  } catch(_e) { return 0; }
}

function setup() {
  remembered = [];
  // GM.turn=6 模拟 post-turn(T+1·T=5)·_postTurnJobs.turn=5 为源回合权威·recent=5·①tag5/②tag6 皆覆盖
  GM = { turn: 6, _postTurnJobs: { turn: 5 }, chars: [
    { name: '孙传庭', alive: true, _memory: [{ turn: 5, event: '结构化:奉诏督师' }] },   // 通道①本回合已写(T=5)
    { name: '卢象升', alive: true, _memory: [] },                                         // ★纯叙事涉事·无记忆→应补
    { name: '魏忠贤', alive: true, _memory: [{ turn: 6, event: '通道②已写' }] },          // 通道②已写(T+1=6)→不重复
    { name: '袁崇焕', alive: true, _memory: [{ turn: 2, event: '陈年旧事' }] },           // 仅旧记忆→本回合提到应补
    { name: '某死者', alive: false, _memory: [] },                                        // 死者→跳过
    { name: '崇祯', alive: true, isPlayer: true, _memory: [] },                           // 玩家→跳过
    { name: '闲人甲', alive: true, _memory: [] }                                          // 叙事未提及→不补
  ] };
}

console.log('===== ★纯叙事涉事者(无记忆)获兜底记忆 =====');
setup();
var p1 = { shizhengji: '孙传庭奉诏督师陕西。卢象升于朝堂力陈边饷之急，众皆动容。魏忠贤旧党暗中串联。袁崇焕上疏自辩，崇祯留中不发。某死者之事已了。', shilu_text: '' };
var n = _memWriteFallbackFromNarrative(p1);
var got = remembered.map(r => r.name).sort();
assert(got.indexOf('卢象升') >= 0, '卢象升(纯叙事无记忆)应获兜底 (得 ' + got.join('、') + ')');
assert(got.indexOf('袁崇焕') >= 0, '袁崇焕(仅旧记忆·本回合提到)应获兜底');

console.log('===== 去重·通道①(T)/②(T+1)已写者不重复 =====');
assert(got.indexOf('孙传庭') < 0, '孙传庭(通道①本回合已写 turn5)不应重复补');
assert(got.indexOf('魏忠贤') < 0, '魏忠贤(通道②本回合已写 turn6)不应重复补');

console.log('===== 排除·死者/玩家/未提及者 =====');
assert(got.indexOf('某死者') < 0, '死者不补');
assert(got.indexOf('崇祯') < 0, '玩家不补');
assert(got.indexOf('闲人甲') < 0, '叙事未提及者不补');

console.log('===== 记忆内容·取含其名的叙事句·importance=4·source=witnessed =====');
var luMem = remembered.find(r => r.name === '卢象升');
assert(luMem && luMem.event.indexOf('卢象升') >= 0 && luMem.event.indexOf('边饷') >= 0, '卢象升记忆=含其名的叙事句 (得 ' + (luMem && luMem.event) + ')');
assert(luMem && luMem.importance === 4 && luMem.meta && luMem.meta.source === 'witnessed' && luMem.meta._fallback === true, '轻量亲历·imp4/witnessed/_fallback');

console.log('===== 幂等·同回合再跑不重复(第二次 remembered 为空) =====');
remembered = [];
var n2 = _memWriteFallbackFromNarrative(p1);  // 卢象升/袁崇焕 上轮已写 turn6→now m.turn>=5→跳过
assert(n2 === 0, '同回合二次运行应零补录(已写者被 m.turn>=recent 挡) (得 ' + n2 + ')');

console.log('===== 边界·空叙事/无 chars 不崩 =====');
setup();
assert(_memWriteFallbackFromNarrative({ shizhengji: '' }) === 0, '空叙事→0');
assert(_memWriteFallbackFromNarrative(null) === 0, 'null p1→0');

console.log('===== npc_actions 也算涉事来源 =====');
setup();
var p1b = { shizhengji: '朝局平静。', npc_actions: [{ name: '卢象升', action: '整饬边备', result: '军心稍安' }] };
_memWriteFallbackFromNarrative(p1b);
assert(remembered.some(r => r.name === '卢象升'), 'npc_actions 里的涉事者也获兜底');

console.log('===== ★扩源·仅在 faction_events/events 里的涉事者也获兜底 =====');
setup();
var p1c = { shizhengji: '边事未宁。',
  faction_events: [{ actor: '袁崇焕', action: '整军备战', result: '关宁稍固' }],
  events: [{ desc: '卢象升巡视九边，劾贪墨之将。' }] };
_memWriteFallbackFromNarrative(p1c);
assert(remembered.some(r => r.name === '袁崇焕'), 'faction_events 涉事者(袁崇焕)获兜底');
assert(remembered.some(r => r.name === '卢象升'), 'events.desc 涉事者(卢象升)获兜底');

console.log('===== ★时序健壮性·判重基准=源回合T·不依赖 GM.turn++ 与本兜底完成先后(Codex) =====');
// 模拟"兜底在 GM.turn++ 之前完成":GM.turn 仍=源回合5(未++)·但 post-turn 队列已记源回合 _postTurnJobs.turn=5。
// NPC 仅有上一回合(turn4)旧记忆·本回合(T=5)叙事提到他→应补(不能被 turn4 旧记忆经旧 recent=GM.turn-1=4 误挡)。
remembered = [];
GM = { turn: 5, _postTurnJobs: { turn: 5 }, chars: [
  { name: '洪承畴', alive: true, _memory: [{ turn: 4, event: '上回合旧事' }] }
] };
_memWriteFallbackFromNarrative({ shizhengji: '洪承畴督师援锦，力战突围。' });
assert(remembered.some(r => r.name === '洪承畴'), '源回合5→turn4旧记忆不误挡·本回合涉事者补写(修 GM.turn 未++时的偏移)');

console.log('===== 时序·显式 sourceTurn 优先 + 无源回合线索回退 GM.turn-1 =====');
remembered = [];
GM = { turn: 99, chars: [ { name: '祖大寿', alive: true, _memory: [{ turn: 5, event: '旧' }] } ] };
_memWriteFallbackFromNarrative({ shizhengji: '祖大寿据守大凌河。' }, 6);
assert(remembered.some(r => r.name === '祖大寿'), '显式 sourceTurn=6→turn5旧记忆不挡·补写');
remembered = [];
GM = { turn: 6, chars: [ { name: '祖大寿', alive: true, _memory: [{ turn: 5, event: '旧' }] } ] };
_memWriteFallbackFromNarrative({ shizhengji: '祖大寿据守大凌河。' });
assert(!remembered.some(r => r.name === '祖大寿'), '无源回合线索→回退 GM.turn-1=5·turn5记忆挡(旧行为保留·不误伤)');

console.log('');
console.log(`[smoke-memwrite-fallback] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
