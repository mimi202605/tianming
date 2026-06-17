#!/usr/bin/env node
'use strict';
// S5 守护（2026-06-03·pin/resident 存储保护）：
// ① _memoryAccepted 80-cap 淘汰避让 pinned/resident/高权威(治"pinned 记忆被 FIFO 淘汰"数据丢失隐患)；
// ② pruneControls 保护 pinned/resident/supersededBy/markedFalse 控制不被 FIFO 剪掉(治"pin 丢/旧事实复活")。
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
  'tm-memory-controls.js',
  'tm-memory-writegate.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const WG = sandbox.TM && sandbox.TM.MemoryWriteGate;
const MC = sandbox.TM && sandbox.TM.MemoryControls;
assert(WG && typeof WG.pruneQueues === 'function', 'WriteGate.pruneQueues exported');
assert(MC && typeof MC.pruneControls === 'function', 'MemoryControls.pruneControls exported');

// ── 1) _memoryAccepted over 80-cap: pinned + 高权威 survive, ordinary oldest evicted ──
const GM = { turn: 100, _memoryControls: { 'pin-1': { key: 'pin-1', pinned: true, _seq: 1 } }, _memoryAccepted: [] };
// front (oldest) = the two we expect to SURVIVE despite being oldest
GM._memoryAccepted.push({ id: 'pin-1', type: 'character_memory', status: 'active', authority: 'ai_extracted', body: '受恩之事·已pin。', turn: 1 });
GM._memoryAccepted.push({ id: 'hi-1', type: 'court_resolution', status: 'active', authority: 'player_pin', body: '皇帝裁断·高权威。', turn: 2 });
for (var i = 0; i < 80; i++) {
  GM._memoryAccepted.push({ id: 'ord-' + i, type: 'character_memory', status: 'active', authority: 'ai_extracted', body: '寻常记忆' + i, turn: 10 + i });
}
assert.strictEqual(GM._memoryAccepted.length, 82, 'setup: 82 accepted (2 over cap)');
WG.pruneQueues(GM);
assert.strictEqual(GM._memoryAccepted.length, 80, 'accepted capped to 80');
assert(GM._memoryAccepted.some((x) => x.id === 'pin-1'), 'PINNED accepted memory survives cap eviction (was oldest)');
assert(GM._memoryAccepted.some((x) => x.id === 'hi-1'), 'HIGH-AUTHORITY (player_pin) accepted memory survives cap eviction (was oldest)');
assert(!GM._memoryAccepted.some((x) => x.id === 'ord-0'), 'oldest ordinary memory evicted instead');
assert(!GM._memoryAccepted.some((x) => x.id === 'ord-1'), 'second-oldest ordinary memory evicted instead');

// ── 2) tombstoned/archived are evicted FIRST (most evictable) ──
const GM2 = { turn: 100, _memoryControls: {}, _memoryAccepted: [] };
GM2._memoryAccepted.push({ id: 'tomb-1', type: 'character_memory', status: 'deleted_tombstone', authority: 'ai_extracted', body: '已作废', turn: 5 });
for (var k = 0; k < 80; k++) {
  GM2._memoryAccepted.push({ id: 'live-' + k, type: 'character_memory', status: 'active', authority: 'ai_extracted', body: '活记忆' + k, turn: 10 + k });
}
WG.pruneQueues(GM2); // 81 -> 80, need evict 1
assert.strictEqual(GM2._memoryAccepted.length, 80, 'capped to 80');
assert(!GM2._memoryAccepted.some((x) => x.id === 'tomb-1'), 'tombstoned memory evicted first; no live memory dropped');
assert(GM2._memoryAccepted.some((x) => x.id === 'live-0'), 'oldest LIVE memory retained (tombstone took the eviction)');

// ── 3) pruneControls: pinned/supersededBy/markedFalse survive FIFO prune; ordinary evicted ──
const GM3 = { turn: 100, _memoryControls: {} };
GM3._memoryControls['pinned-ctrl'] = { key: 'pinned-ctrl', pinned: true, _seq: 1 };       // oldest, protected
GM3._memoryControls['super-ctrl'] = { key: 'super-ctrl', supersededBy: 'new-x', _seq: 2 }; // oldest, protected
GM3._memoryControls['false-ctrl'] = { key: 'false-ctrl', markedFalse: true, _seq: 3 };     // oldest, protected
for (var j = 0; j < 80; j++) {
  GM3._memoryControls['ord-' + j] = { key: 'ord-' + j, archived: true, _seq: 100 + j };
}
assert.strictEqual(Object.keys(GM3._memoryControls).length, 83, 'setup: 83 controls (3 over limit)');
MC.pruneControls(GM3, { limit: 80 });
assert.strictEqual(Object.keys(GM3._memoryControls).length, 80, 'controls capped to 80');
assert(GM3._memoryControls['pinned-ctrl'], 'PINNED control survives FIFO prune (was oldest)');
assert(GM3._memoryControls['super-ctrl'], 'supersededBy control survives (prevents superseded fact revival)');
assert(GM3._memoryControls['false-ctrl'], 'markedFalse control survives (prevents false fact revival)');
assert(!GM3._memoryControls['ord-0'], 'oldest ordinary control evicted instead');

console.log('smoke-memory-capacity ok');
