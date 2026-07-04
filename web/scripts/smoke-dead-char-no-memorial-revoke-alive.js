#!/usr/bin/env node
// smoke-dead-char-no-memorial-revoke-alive.js
//   bug1:死者(alive===false 或 dead===true 半死)不得上奏/写信。
//   bug2:廷议"革职"(_ty3_actionRevoke)是革职非死亡·不得设 alive=false。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let assertions = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); assertions++; }

// ── 1) _memCanPresent:死者过滤 ──
{
  const ctx = {
    console, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, isNaN,
    window: null, P: { playerInfo: { characterName: '皇帝' } }, GM: { chars: [] },
    personKey: c => (c && c.name) || ''
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-memorials.js'), 'utf8'), ctx, { filename: 'tm-memorials.js' });
  const live   = { name: '甲', alive: true };
  const deadA  = { name: '乙', alive: false };           // 正常死亡
  const halfB  = { name: '丙', dead: true };              // 半死(只设dead·triggerCharacterDeath旧bug)
  const player = { name: '皇帝', alive: true };
  assert(ctx._memCanPresent(live) === true, '活人可上奏');
  assert(ctx._memCanPresent(deadA) === false, 'alive=false 死者不可上奏');
  assert(ctx._memCanPresent(halfB) === false, 'dead=true 半死者不可上奏(防御)');
  assert(ctx._memCanPresent(player) === false, '皇帝不上奏');
}

// ── 2) _ty3_actionRevoke:革职≠死亡 ──
{
  const ctx = {
    console, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, isNaN, setTimeout(){}, clearTimeout(){},
    window: null, document: { getElementById: () => null, querySelector: () => null, createElement: () => ({ style:{}, appendChild(){}, classList:{add(){},remove(){}} }), body: { appendChild(){} } },
    GM: { turn: 7, chars: [] },
    CY: { _ty3: { attendees: ['革职者', '其他人'] } }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  // 桩:仪式/事件 push(避免 DOM)
  try { vm.runInContext((fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-persona.js'), 'utf8') + '\n' + (fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-edict-personnel.js'), 'utf8')) + '\n' + fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-parties.js'), 'utf8')), ctx, { filename: 'tm-tinyi-v3.js' }); }
  catch (e) { /* IIFE 钩子可能因缺依赖抛错·不影响函数定义 */ }
  // 覆盖可能含 DOM 的仪式函数为桩
  ctx._ty3_runCeremony = function(){};
  assert(typeof ctx._ty3_actionRevoke === 'function', '_ty3_actionRevoke 应已定义');
  const ch = { name: '革职者', alive: true, officialTitle: '吏部尚书', title: '吏部尚书', loyalty: 80, officialTitles: ['吏部尚书'] };
  ctx._ty3_actionRevoke(ch);
  assert(ch.alive !== false, '革职后角色 alive 不得为 false(革职非死亡·原 bug 在此)');
  assert(ch.officialTitle === '', '革职后 officialTitle 应清空');
  assert(ch.title === '', '革职后 title 应清空');
  assert(ch._revoked && ch._revoked.neverReappoint === true, '革职应打永不叙用标记');
  assert(ctx.CY._ty3.attendees.indexOf('革职者') < 0, '革职者应真从 attendees 移除');
  assert(ctx.CY._ty3.attendees.indexOf('其他人') >= 0, '其他人仍在 attendees');
}

// ── 3) 源码契约:triggerCharacterDeath 设 alive=false ──
{
  const eng = fs.readFileSync(path.join(ROOT, 'tm-char-economy-engine.js'), 'utf8');
  const idx = eng.indexOf('function triggerCharacterDeath');
  const seg = eng.slice(idx, idx + 400);
  assert(/ch\.alive\s*=\s*false/.test(seg), 'triggerCharacterDeath 必须设 ch.alive=false');
}

// ── 4) 源码契约:npc_correspondence 过滤死者 ──
{
  const apply = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');
  assert(apply.indexOf('死者不参与密信') >= 0, 'npc_correspondence 应过滤死者');
  assert(/_nlCh\.alive === false \|\| _nlCh\.dead/.test(apply), 'npc_letters 应兼容 dead 半死');
}

console.log('[smoke-dead-char-no-memorial-revoke-alive] pass assertions=' + assertions);
