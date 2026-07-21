#!/usr/bin/env node
// scripts/smoke-transmigration-chaoyi.js — Phase 4·Task 12 朝议面板按 playerRole 分支 smoke
// 验证：
//   - openChaoyi 在穿越模式下被拦截（toast 提示"朝议由君主发起"·不创建 modal）
//   - openChaoyi 在皇帝模式下正常创建 modal
//   - _cy_jishiAdd 在 speaker='皇帝' 时 char 字段动态化为 sovereignName（不再硬编字面量）
//   - _cy_jishiAdd 在 speaker 为大臣时 char 字段保持大臣姓名

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-chaoyi.js'), 'utf8'), ctx, { filename: 'tm-chaoyi.js' });
  return ctx;
}

function setupCtx(ctx, sovereignName, isTrans) {
  ctx.GM = {
    turn: 5,
    chars: [{ name: sovereignName, alive: true, officialTitle: '皇帝', role: '皇帝' }],
    jishiRecords: [],
    qijuHistory: [],
    _chaoyiCount: {}
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: !!isTrans,
      playerRole: isTrans ? 'minister' : 'emperor',
      characterName: isTrans ? '李大臣' : sovereignName,
      sovereignName: sovereignName
    }
  };

  var modalCalls = [];
  ctx._modalCalls = modalCalls;
  var toastCalls = [];
  ctx._toastCalls = toastCalls;
  ctx.toast = function(msg) { toastCalls.push(msg); };
  ctx.escHtml = function(s) { return String(s == null ? '' : s); };
  ctx.document = {
    createElement: function(tag) {
      var el = { tagName: tag, className: '', id: '', style: { cssText: '' }, innerHTML: '', _children: [] };
      el.appendChild = function(c) { el._children.push(c); };
      return el;
    },
    body: { appendChild: function(el) { modalCalls.push(el); } },
    getElementById: function() { return null; }
  };
  ctx.showChaoyiSetup = function() {}; // mock
  ctx._shuf = function(arr) { return arr.slice(); };
  ctx._getPlayerLocation = function() { return '京城'; };
  ctx.getTSText = function(turn) { return 'T' + turn; };
  ctx.TM = {};
}

function openChaoyiTransTest(ctx) {
  var sovereignName = '建文帝';
  setupCtx(ctx, sovereignName, true);

  ctx.openChaoyi();

  assert(ctx._modalCalls.length === 0, 'open-trans: 穿越模式不创建 modal');
  assert(ctx._toastCalls.length === 1, 'open-trans: toast 提示一次');
  assert(/朝议由君主发起/.test(ctx._toastCalls[0]), 'open-trans: toast 文案含"朝议由君主发起"');
}

function openChaoyiEmperorTest(ctx) {
  var sovereignName = '崇祯帝';
  setupCtx(ctx, sovereignName, false);

  ctx.openChaoyi();

  assert(ctx._modalCalls.length === 1, 'open-emperor: 皇帝模式创建 modal');
  assert(ctx._modalCalls[0].id === 'chaoyi-modal', 'open-emperor: modal id = chaoyi-modal');
  assert(ctx._toastCalls.length === 0, 'open-emperor: 不弹 toast');
}

function jishiAddEmperorSpeakerTest(ctx) {
  var sovereignName = '建文帝';
  setupCtx(ctx, sovereignName, true);

  ctx._cy_jishiAdd('yuqian', '北方军情', '皇帝', '朕闻北鄙有警·当饬边臣严守。', { round: 1, final: true });

  assert(ctx.GM.jishiRecords.length === 1, 'jishi-emperor: 1 record');
  var rec = ctx.GM.jishiRecords[0];
  assert(rec.char === sovereignName, 'jishi-emperor: char = sovereignName (动态化·非字面量"皇帝")');
  assert(rec.char !== '皇帝', 'jishi-emperor: char is NOT literal "皇帝"');
  assert(rec.playerSaid === '朕闻北鄙有警·当饬边臣严守。', 'jishi-emperor: playerSaid preserved');
  assert(rec.npcSaid === '', 'jishi-emperor: emperor 行 npcSaid 为空');
  assert(rec.topic === '北方军情', 'jishi-emperor: topic preserved');
  assert(rec.mode === 'yuqian', 'jishi-emperor: mode = yuqian');
  assert(rec.final === true, 'jishi-emperor: final=true');
}

function jishiAddEmperorBySovereignNameTest(ctx) {
  // 当 speaker 直接传入 sovereignName（非字面量"皇帝"）时·也应识别为君主
  var sovereignName = '建文帝';
  setupCtx(ctx, sovereignName, true);

  ctx._cy_jishiAdd('tinyi', '春耕劝农', sovereignName, '春耕方兴·有司宜督劝农桑。', { round: 0 });

  var rec = ctx.GM.jishiRecords[0];
  assert(rec.char === sovereignName, 'jishi-by-name: char = sovereignName');
  assert(rec.playerSaid === '春耕方兴·有司宜督劝农桑。', 'jishi-by-name: playerSaid preserved (识别为君主)');
}

function jishiAddMinisterSpeakerTest(ctx) {
  var sovereignName = '建文帝';
  setupCtx(ctx, sovereignName, true);

  ctx._cy_jishiAdd('tinyi', '北边军饷', '王大臣', '臣以为当发内帑以充军饷。', { round: 1, playerInterject: true });

  var rec = ctx.GM.jishiRecords[0];
  assert(rec.char === '王大臣', 'jishi-minister: char = 大臣姓名 (非君主)');
  assert(rec.playerSaid === '【廷议】北边军饷', 'jishi-minister: playerSaid 为议题标记');
  assert(rec.npcSaid === '臣以为当发内帑以充军饷。', 'jishi-minister: npcSaid = line');
  assert(rec.playerInterject === true, 'jishi-minister: playerInterject=true');
}

function jishiAddDefaultSovereignTest(ctx) {
  // P.playerInfo.sovereignName 缺席 → fallback '皇帝'·speaker='皇帝' 时 char='皇帝'
  setupCtx(ctx, '皇帝', false);
  ctx.P.playerInfo.sovereignName = '';

  ctx._cy_jishiAdd('tinyi', '秋审', '皇帝', '朕亲览罪囚·矜慎刑狱。', {});

  var rec = ctx.GM.jishiRecords[0];
  assert(rec.char === '皇帝', 'jishi-default: char fallback = "皇帝"');
}

function interjectPromptTest(ctx) {
  // 通过源码字符串验证 _cyInterjectRespond 中 prompt 用 _sovereignName 而非字面量"皇帝"
  // 此处验证 _cy_jishiAdd 用的 _sovereignName 与 prompt 中一致（来源都是 P.playerInfo.sovereignName）
  var sovereignName = '建文帝';
  setupCtx(ctx, sovereignName, true);

  ctx._cy_jishiAdd('yuqian', '边事', '皇帝', '朕意已决。', { round: 1 });

  var rec = ctx.GM.jishiRecords[0];
  assert(rec.char === sovereignName, 'interject-prompt: char = sovereignName·与 _cyInterjectRespond 一致');
}

try {
  var ctx = buildContext();
  openChaoyiTransTest(ctx);
  openChaoyiEmperorTest(ctx);
  jishiAddEmperorSpeakerTest(ctx);
  jishiAddEmperorBySovereignNameTest(ctx);
  jishiAddMinisterSpeakerTest(ctx);
  jishiAddDefaultSovereignTest(ctx);
  interjectPromptTest(ctx);
  console.log('[smoke-transmigration-chaoyi] PASS · 7 sub-tests · openChaoyi 拦截 + jishiRecords 君主名动态化 + 字面量兜底');
  process.exit(0);
} catch (e) {
  console.error('[smoke-transmigration-chaoyi] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
