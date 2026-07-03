#!/usr/bin/env node
// scripts/smoke-memory-loop-closure.js
// 2026-07-03·补强『记忆⇄推演』两方向的闭环:
//   方向A闭环·_injectNpcHearts 保证"最近1回合的经历"必进推演(哪怕低 importance)·令 NPC 对上回合的事有反应。
//   方向B补漏·mood_shifts 心绪突变写个人记忆(reason)·否则 NPC"莫名生气却不记得为何"。
// 本测·复制两处逻辑·断言 recency 强制入选 + mood_shift 写记忆条件。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ═══ 补强1·recency 强制入选(复制自 tm-endturn-prompt.js _injectNpcHearts 记忆筛选) ═══
function selectMemories(memory, GMturn, impMin, perChar) {
  var c = { _memory: memory };
  var sorted = c._memory.slice().sort(function(a,b){ return (b.importance||0) - (a.importance||0); });
  var _recentTurnGate = (GMturn || 0) - 2;
  var top = sorted.filter(function(m){
    return (m.importance||0) >= impMin || ((m.importance||0) >= 6 && (m.turn||0) >= _recentTurnGate);
  }).slice(0, perChar);
  var _lastTurnGate = (GMturn || 0) - 1;
  var _freshest = null;
  for (var _fi = 0; _fi < c._memory.length; _fi++) {
    var _fm = c._memory[_fi];
    if (!_fm || (_fm.turn||0) < _lastTurnGate) continue;
    if (!_freshest || (_fm.turn||0) > (_freshest.turn||0) || ((_fm.turn||0) === (_freshest.turn||0) && (_fm.importance||0) > (_freshest.importance||0))) _freshest = _fm;
  }
  if (_freshest && top.indexOf(_freshest) < 0) {
    top = (perChar <= 1) ? [_freshest] : top.slice(0, perChar - 1).concat([_freshest]);
  }
  return top;
}

console.log('===== 补强1·最近1回合经历必进推演(哪怕低 importance) =====');
// GM.turn=6·impMin=6·perChar=2·记忆:定义性伤疤(imp8,turn1) + 上回合轻记忆(imp4,turn5·如叙事兜底)
var m1 = [{ event: '门生尽死诏狱', importance: 8, turn: 1 }, { event: '上回合目睹朝争', importance: 4, turn: 5 }];
var sel1 = selectMemories(m1, 6, 6, 2);
assert(sel1.some(m => m.turn === 5), '上回合 imp4 轻记忆应被强制入选 (选中turn:' + sel1.map(m=>m.turn).join(',') + ')');
assert(sel1.some(m => m.importance === 8), '定义性伤疤仍在选(perChar=2留1槽)');

console.log('===== 补强1·perChar=1 时最近经历占独槽(伤疤在<self>) =====');
var sel2 = selectMemories(m1, 6, 8, 1);   // impMin8·伤疤imp8过门但被recency换掉
assert(sel2.length === 1 && sel2[0].turn === 5, 'perChar=1→最近经历独占 (得 turn ' + (sel2[0]&&sel2[0].turn) + ')');

console.log('===== 补强1·无最近记忆则不强塞(维持高重要度选取) =====');
var m3 = [{ event: '旧事甲', importance: 9, turn: 1 }, { event: '旧事乙', importance: 7, turn: 2 }];
var sel3 = selectMemories(m3, 6, 6, 2);
assert(sel3.length === 2 && sel3.every(m => m.turn <= 2), '无近忆→按重要度选·不强塞 (得 ' + sel3.map(m=>m.importance).join(',') + ')');

console.log('===== 补强1·最近记忆已因高importance入选则不重复占槽 =====');
var m4 = [{ event: '大事', importance: 9, turn: 6 }, { event: '中事', importance: 7, turn: 3 }];
var sel4 = selectMemories(m4, 6, 6, 2);
assert(sel4.length === 2, '最近高重要度记忆已入选·不额外占槽 (得 ' + sel4.length + ')');

// ═══ 补强2·mood_shifts 写记忆(复制自 tm-endturn-followup.js) ═══
function moodShiftMemory(ms) {
  var out = null;
  var _msLd = Math.abs(parseInt(ms.loyalty_delta) || 0), _msSd = Math.abs(parseInt(ms.stress_delta) || 0);
  var _msMoodChanged = (typeof ms.mood === 'string' && ms.mood.trim() && ms.mood.trim() !== '平');
  if (ms.reason && String(ms.reason).trim() && (_msMoodChanged || _msLd >= 2 || _msSd >= 2)) {
    var _msImp = (_msLd >= 5 || _msSd >= 5) ? 6 : (_msLd >= 3 || _msSd >= 3) ? 5 : 4;
    var _msMood = String(ms.mood || '');
    var _msEmo = /怒|恨|愤|忿/.test(_msMood) ? '怒'
               : /悲|忧|沮|郁|惧|惊|惶/.test(_msMood) ? '忧'
               : /喜|悦|慰|敬|奋/.test(_msMood) ? '喜'
               : ((parseInt(ms.loyalty_delta) || 0) < 0 ? '忧' : '平');
    out = { event: String(ms.reason).slice(0, 40), emotion: _msEmo, importance: _msImp };
  }
  return out;
}

console.log('===== 补强2·心绪突变(怒)写记忆·情绪=怒·imp随幅度 =====');
var r1 = moodShiftMemory({ name: '某臣', mood: '怒', reason: '奏议被同僚当廷驳斥', loyalty_delta: -6 });
assert(r1 && r1.emotion === '怒' && r1.event.indexOf('驳斥') >= 0, '怒·记住原因 (得 ' + JSON.stringify(r1) + ')');
assert(r1 && r1.importance === 6, 'loyalty_delta6→imp6 (得 ' + (r1&&r1.importance) + ')');

console.log('===== 补强2·沮丧/惧→忧·喜悦→喜 =====');
assert(moodShiftMemory({ mood: '沮丧', reason: 'x被贬', stress_delta: 4 }).emotion === '忧', '沮丧→忧');
assert(moodShiftMemory({ mood: '欣喜', reason: '蒙恩擢升', loyalty_delta: 5 }).emotion === '喜', '欣喜→喜');

console.log('===== 补强2·无 reason / 琐碎变化→不写记忆 =====');
assert(moodShiftMemory({ mood: '怒', loyalty_delta: -6 }) === null, '无 reason→不写');
assert(moodShiftMemory({ reason: '微小波动', loyalty_delta: 1, stress_delta: 1 }) === null, '无mood变+delta<2→不写(琐碎)');
assert(moodShiftMemory({ mood: '平', reason: '无事', loyalty_delta: 0 }) === null, 'mood=平+delta0→不写');

// ═══ 补强3·选人热度按近忆重要度分档(复制自 _injectNpcHearts weight 计算) ═══
function freshMemHeat(memory, GMturn) {
  var _heat = 0, _freshImp = 0;
  if (Array.isArray(memory)) {
    for (var _hi = memory.length - 1; _hi >= 0 && _hi >= memory.length - 6; _hi--) {
      var _hmem = memory[_hi];
      if (_hmem && ((GMturn || 0) - (_hmem.turn || 0)) <= 2 && (_hmem.importance || 0) > _freshImp) _freshImp = (_hmem.importance || 0);
    }
    if (_freshImp >= 8) _heat += 10;
    else if (_freshImp >= 5) _heat += 6;
    else if (_freshImp >= 3) _heat += 3;
  }
  return _heat;
}

console.log('===== 补强3·选人热度按近忆重要度分档(刚经历者更易入名额) =====');
assert(freshMemHeat([{ importance: 8, turn: 6 }], 6) === 10, '近忆imp8→+10(保留原行为)');
assert(freshMemHeat([{ importance: 6, turn: 5 }], 6) === 6, '近忆imp6→+6(旧版为0·中等事件也升名额)');
assert(freshMemHeat([{ importance: 4, turn: 6 }], 6) === 3, '近忆imp4(兜底/心绪级)→+3(旧版为0)');
assert(freshMemHeat([{ importance: 2, turn: 6 }], 6) === 0, '近忆imp2(琐碎)→+0');
assert(freshMemHeat([{ importance: 9, turn: 1 }], 6) === 0, 'imp9但陈旧(>2回合)→+0(只奖新近)');
assert(freshMemHeat([], 6) === 0, '无记忆→+0');
assert(freshMemHeat([{ importance: 4, turn: 6 }, { importance: 7, turn: 5 }], 6) === 6, '取近忆最高重要度(imp7→+6)');

console.log('');
console.log(`[smoke-memory-loop-closure] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
