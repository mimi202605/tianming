#!/usr/bin/env node
// scripts/smoke-char-delete-blacklist.js
// 锁定「玩家手删黑名单·AI 撞同名永不重生」契约 (GM.deletedCharNames)
// 拦截点：aiGenerateCompleteCharacter 入口 / addPendingCharacter / scanMentionedCharacters
// (运行时删除级联在 tm-player-core.js·依赖过多无法 vm 单测·此处只锁黑名单防重生)

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const sandbox = {
  console,
  window: {},
  global: {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  _dbg: function(){},
  toast: function(){},
  GM: {
    year: 1628,
    turn: 1,
    chars: [],
    _pendingCharacters: [],
    deletedCharNames: [],
    _indices: { charByName: new Map() },
    facs: [{ id: 'ming', name: '大明', leader: '朱由检', territory: '京师' }],
    factions: {},
    parties: {}
  },
  P: {
    ai: { key: 'test-key' },
    conf: { maxOutputTokens: 4000 },
    playerInfo: { characterName: '朱由检' },
    time: { year: 1628 }
  },
  findCharByName: function(name) {
    return sandbox.GM.chars.find(function(c){ return c && c.name === name; }) || null;
  },
  buildIndices: function(){},
  renderRenwu: function(){},
  renderGameState: function(){},
  callAISmart: async function() {
    return JSON.stringify({
      isHistorical: false, name: '王五', age: 34, gender: '男', origin: '京师',
      title: '给事中', bio: '京师士人。', ambition: 55, intelligence: 78,
      administration: 58, valor: 32, benevolence: 61, loyalty: 72, integrity: 74,
      wuchang: { ren: 61, yi: 70, li: 76, zhi: 78, xin: 74 }, faction: '大明'
    });
  },
  extractJSON: function(raw) { return JSON.parse(raw); }
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-char-autogen.js'), 'utf8'), sandbox, { filename: 'tm-char-autogen.js' });

let pass = 0, fail = 0;
function expect(label, cond) {
  if (cond) { console.log('  PASS ' + label); pass++; }
  else { console.log('  FAIL ' + label); fail++; }
}

async function main() {
  // ── 1. 黑名单读写助手 ──
  sandbox.markCharNameDeleted('张三');
  expect('markCharNameDeleted 写入 GM.deletedCharNames', sandbox.GM.deletedCharNames.indexOf('张三') >= 0);
  expect('isCharNameDeleted 命中', sandbox.isCharNameDeleted('张三') === true);
  expect('isCharNameDeleted 未命中返回 false', sandbox.isCharNameDeleted('李四') === false);
  sandbox.markCharNameDeleted('张三'); // 幂等
  expect('markCharNameDeleted 幂等去重', sandbox.GM.deletedCharNames.filter(function(n){return n==='张三';}).length === 1);

  // ── 2. aiGenerateCompleteCharacter 入口拦截·黑名单名永不重生 ──
  const blocked = await sandbox.aiGenerateCompleteCharacter('张三', { reason: '推演涌现' });
  expect('黑名单角色生成返回 null', blocked === null);
  expect('黑名单角色不入 GM.chars', sandbox.GM.chars.length === 0);

  // ── 3. 非黑名单名正常生成 (确认 gate 不误伤) ──
  const ok = await sandbox.aiGenerateCompleteCharacter('王五', { reason: '推演涌现' });
  expect('非黑名单角色正常生成', !!ok);
  expect('非黑名单角色入 GM.chars', sandbox.GM.chars.length === 1);

  // ── 4. addPendingCharacter 拦截·黑名单名不入待结晶池 ──
  const pBlocked = sandbox.addPendingCharacter({ name: '张三', source: '推演', snippet: '...' });
  expect('黑名单名 addPendingCharacter 返回 null', pBlocked === null);
  expect('黑名单名不入 _pendingCharacters', !sandbox.GM._pendingCharacters.some(function(p){ return p.name === '张三'; }));

  // ── 5. 非黑名单名正常入 pending ──
  const pOk = sandbox.addPendingCharacter({ name: '赵六', source: '推演', snippet: '...' });
  expect('非黑名单名正常入 pending', !!pOk && sandbox.GM._pendingCharacters.some(function(p){ return p.name === '赵六'; }));

  console.log('\n[smoke-char-delete-blacklist] ' + pass + ' passed / ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch(function(err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
