#!/usr/bin/env node
'use strict';
// S2 守护（2026-06-03·恩德/关系 netting 治本）：
// 同 actor 同立场类(受恩/恩怨/承诺) character_memory 在 accept 时塌缩成「一条演化累加记录」(eventCount 累计)，
// 而非各自堆积；E2 立场综述读 eventCount 出净账。普通事实型/跨类/跨可见性/显式 supersedes 不被误并。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Date, Math, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'tm-memory-evidence-registry.js',
  'tm-memory-issue-governance.js',
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-writegate.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const WG = sandbox.TM && sandbox.TM.MemoryWriteGate;
const ME = sandbox.TM && sandbox.TM.MemoryEnvelope;
assert(WG && typeof WG.enqueue === 'function', 'TM.MemoryWriteGate.enqueue exported');
assert(ME && typeof ME.collect === 'function', 'TM.MemoryEnvelope.collect exported');

let _seq = 0;
function feed(GM, actor, mt, body, conf, extra) {
  _seq++;
  const cand = Object.assign({
    id: 'cm-' + _seq,
    type: 'character_memory',
    status: 'active',
    reviewStatus: 'accepted',
    reviewedBy: 'test',
    body: body,
    safeBody: body,
    authority: 'ai_extracted',
    turn: GM.turn,
    entities: [actor],
    readScope: 'public',
    sourceRefs: [{ type: 'jishiRecords', id: 'jr-' + _seq }],
    extra: { actor: actor, memoryType: mt, confidence: conf == null ? 0.8 : conf }
  }, extra || {});
  return WG.enqueue(GM, cand, { reviewer: 'test' });
}
function activeAccepted(GM) {
  return (GM._memoryAccepted || []).filter((x) => x && String(x.status || 'active') === 'active');
}

// ── 1) 同 actor 同类(favor)×3 → 塌缩成 1 条 active 累加器, eventCount=3 ──
const GM = { turn: 30 };
feed(GM, '毕自严', 'favor', '毕自严受赐金犒劳。', 0.8);
feed(GM, '毕自严', 'favor', '毕自严获皇帝复核辽饷之许。', 0.7);
feed(GM, '毕自严', 'favor', '毕自严蒙皇帝面谕嘉勉。', 0.9);

const biFavor = activeAccepted(GM).filter((x) => x.extra && x.extra.actor === '毕自严' && x.extra.memoryType === 'favor');
assert.strictEqual(biFavor.length, 1, '3 favor events collapse to ONE active favor record (got ' + biFavor.length + ')');
assert.strictEqual(Number(biFavor[0].extra.eventCount), 3, 'accumulator eventCount === 3');
assert(Math.abs(Number(biFavor[0].extra.weightedSum) - 2.4) < 1e-6, 'weightedSum sums confidences (0.8+0.7+0.9=2.4)');
assert(String(biFavor[0].safeBody).indexOf('面谕嘉勉') >= 0, 'latest event body becomes representative 近事');
assert(biFavor[0].extra.firstTurn != null, 'firstTurn stamped');
// merged inputs are archived, not piled active
const merged = (GM._memoryWriteQueue || []).filter((x) => x && x.reviewStatus === 'merged');
assert.strictEqual(merged.length, 2, 'two later favor events recorded as merged (archived), not active');

// ── 2) 同 actor 不同类(grudge) → 独立第二条累加器(不并入 favor) ──
feed(GM, '毕自严', 'grudge', '毕自严因被言官弹劾而稍生怨。', 0.6);
const biGrudge = activeAccepted(GM).filter((x) => x.extra && x.extra.actor === '毕自严' && x.extra.memoryType === 'grudge');
assert.strictEqual(biGrudge.length, 1, 'grudge is a SEPARATE accumulator from favor');
assert.strictEqual(activeAccepted(GM).filter((x) => x.extra && x.extra.actor === '毕自严').length, 2, '毕自严 has exactly 2 active stance records (favor+grudge)');

// ── 3) E2 立场综述读 eventCount 出净账(累计4·受恩3·恩怨1·净+2) ──
const envs = ME.collect(GM, { turn: 31 });
const stance = envs.filter((e) => e.reason === 'projection:character_stance' && String(e.safeBody || '').indexOf('毕自严') >= 0)[0];
assert(stance, '毕自严 gets a stance synthesis envelope');
assert(String(stance.safeBody).indexOf('累计4条') >= 0, 'stance total counts merged events (3 favor + 1 grudge = 4): ' + stance.safeBody);
assert(String(stance.safeBody).indexOf('受恩3') >= 0, 'favor net = 3 (merged)');
assert(String(stance.safeBody).indexOf('恩怨1') >= 0, 'grudge = 1');
assert(String(stance.safeBody).indexOf('净+2') >= 0, 'favor-grudge net shown as 净+2');

// ── 4) 普通事实型 character memory(memoryType 非立场类) NOT collapsed ──
const GM2 = { turn: 5 };
feed(GM2, '孙传庭', 'memory', '孙传庭任陕西巡抚。', 0.8);
feed(GM2, '孙传庭', 'memory', '孙传庭奏请增饷十万。', 0.8);
assert.strictEqual(activeAccepted(GM2).filter((x) => x.extra && x.extra.actor === '孙传庭').length, 2, 'generic factual character memories are NOT stance-collapsed (stay 2)');

// ── 5) 跨可见性(public favor vs private belief favor)不并 ──
const GM3 = { turn: 8 };
feed(GM3, '温体仁', 'favor', '温体仁蒙恩(公开)。', 0.8);
feed(GM3, '温体仁', 'favor', '温体仁私忖蒙恩(私密)。', 0.8, { type: 'character_belief', readScope: 'npc:温体仁' });
assert.strictEqual(activeAccepted(GM3).filter((x) => x.extra && x.extra.actor === '温体仁').length, 2, 'public favor and private-belief favor do NOT merge (different readScope)');

// ── 6) 显式 supersedesRefs 绕过自动塌缩(尊重 AI 显式治理) ──
const GM4 = { turn: 12 };
feed(GM4, '袁崇焕', 'favor', '袁崇焕蒙信任。', 0.8);
feed(GM4, '袁崇焕', 'favor', '袁崇焕再蒙信任。', 0.8, { supersedesRefs: [{ type: 'accepted_memory', id: 'some-old-id' }] });
const ycFavor = activeAccepted(GM4).filter((x) => x.extra && x.extra.actor === '袁崇焕' && x.extra.memoryType === 'favor');
assert(ycFavor.length === 2 || ycFavor.some((x) => Number(x.extra.eventCount) === 1), 'explicit supersedesRefs bypasses auto stance-merge');

console.log('smoke-memory-stance-netting ok');
