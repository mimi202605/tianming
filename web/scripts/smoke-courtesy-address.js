#!/usr/bin/env node
// smoke-courtesy-address.js - A2 字系统:语义生成 + 完整称呼树
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }
function load(ctx, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel }); }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN,
    Error, TypeError, RangeError,
    GM: { turn: 1, clans: {}, chars: [], guoku: {}, neitang: {}, corruption: { subDepts: {} }, facs: [], regions: {}, officeTree: [] },
    addEB: function() {}, random: function() { return 0.3; }
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  load(ctx, 'tm-char-economy-engine.js');
  const CE = ctx.CharEconEngine;

  // ── 语义词库命中：诸葛亮→义根"亮"→典型表字 ──
  const TEMPL_LIANG = ['孔明', '景仁', '元辉'];
  for (let i = 0; i < 12; i++) {
    const zi = CE.generateCourtesyName('诸葛亮');
    assert(TEMPL_LIANG.indexOf(zi) >= 0, '亮→词库表字, got ' + zi);
  }
  // ── 语义关联：李青山→义根"山"→排行前缀+关联字 ──
  const SEM_SHAN = ['岳', '峰', '嵩', '岱'];
  for (let i = 0; i < 12; i++) {
    const zi = CE.generateCourtesyName('李青山');
    assert(zi.length === 2 && SEM_SHAN.indexOf(zi.charAt(1)) >= 0, '山→关联字结尾, got ' + zi);
  }
  // ── 兜底：罕见义根→前缀+后缀池(双字) ──
  const ziRare = CE.generateCourtesyName('赵錤');
  assert(typeof ziRare === 'string' && ziRare.length === 2, '罕见字兜底双字, got ' + ziRare);
  assert(CE.generateCourtesyName('') === '', '空名→空字');

  // ── 完整称呼树 ──
  const emperor = { name: '朱由检', role: '皇帝', zi: '', officialTitle: '皇帝' };
  const minister = { name: '徐光启', surname: '徐', zi: '子先', officialTitle: '礼部尚书' };
  const foe = { name: '魏忠贤', surname: '魏', zi: '完吾', officialTitle: '司礼监掌印' };

  assert(CE.formatAddress(emperor, {}) === '陛下', '皇帝→陛下');
  assert(CE.formatAddress(minister, { speaker: emperor, formality: 'intimate' }) === '子先', '帝眷顾→称字');
  assert(CE.formatAddress(minister, { speaker: emperor }) === '徐光启', '帝朝堂→称名');
  assert(CE.formatAddress(minister, { formality: 'formal' }) === '礼部尚书', '正式→官衔');
  assert(CE.formatAddress(minister, { hierarchical: 'upward' }) === '礼部尚书', '下对上→尊称官衔');
  assert(CE.formatAddress(minister, { intimacy: 0.8 }) === '子先', '挚友→称字');
  assert(CE.formatAddress(foe, { intimacy: -0.5 }) === '魏司礼监掌印', '敌对→姓+官衔, got ' + CE.formatAddress(foe, { intimacy: -0.5 }));
  assert(CE.formatAddress(minister, { intimacy: 0.4 }) === '徐光启', '平常→称名');
  assert(CE.formatAddress(minister, {}) === '徐光启', '默认→称名');
  assert(CE.formatAddress(minister, { relationship: 'friend' }) === '子先', '旧键friend兼容→字');
  // 长辈对晚辈称字
  assert(CE.formatAddress(minister, { sameFamily: true, isElder: true }) === '子先', '家族长辈→称字');

  console.log('[smoke-courtesy-address] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-courtesy-address] FAIL'); console.error(err && err.stack || err); process.exit(1); }
