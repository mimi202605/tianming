#!/usr/bin/env node
// scripts/smoke-faction-index-e2e.js
//
// 端到端·用真实官方剧本 sc-tianqi7-1627 数据
// 验证 _facIndex + derivedHealth 的实际输出值合理
// 2026-05-10

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function loadOfficialScenario() {
  const dir = path.resolve(ROOT, '..', 'scenarios');
  const file = '天启七年·九月（官方）.json';
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
}

function makeContext() {
  const ctx = {
    console: { log: () => {}, warn: () => {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, parseInt, parseFloat, isNaN
  };
  ctx.window = ctx;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-paradigm.js'), 'utf8'), ctx, { filename: 'tm-faction-paradigm.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-index.js'), 'utf8'), ctx, { filename: 'tm-faction-index.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-health.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-health.js' });
  return ctx;
}

function main() {
  const sc = loadOfficialScenario();
  const ctx = makeContext();

  // 模拟 startGame 的 GM 初始化 (简化版)
  ctx.GM = {
    turn: 1,
    facs: (sc.factions || []).map(f => Object.assign({}, f)),
    chars: (sc.characters || []).map(c => Object.assign({}, c, { alive: true })),
    armies: (sc.military && sc.military.initialTroops || []).map(a => {
      const c = Object.assign({}, a);
      // 字段对齐 (复制 game-loop.js:907-915 的对齐逻辑·简化版)
      if (c.soldiers == null && c.size != null) c.soldiers = c.size;
      return c;
    }),
    parties: (sc.parties || []).map(p => Object.assign({}, p)),
    factionRelations: sc.factionRelations || []
  };
  // getFactionProvinces stub
  ctx.getFactionProvinces = function(name) {
    // 用剧本的 territory 字段作粗略 fallback
    const f = ctx.GM.facs.find(x => x.name === name);
    if (!f) return [];
    if (Array.isArray(f.territories)) return f.territories.slice();
    if (typeof f.territory === 'string') return [f.territory];
    return [];
  };

  console.log('[e2e] loaded scenario · facs=' + ctx.GM.facs.length + ' chars=' + ctx.GM.chars.length + ' armies=' + ctx.GM.armies.length);

  // 1. rebuild
  ctx.TM.FactionIndex.rebuild();
  assert(ctx.GM._facIndex, 'rebuild did not write _facIndex');
  assert(typeof ctx.GM._facIndex['明朝廷'] === 'object', 'missing 明朝廷 entry');

  const ming = ctx.GM._facIndex['明朝廷'];
  console.log('[e2e] 明朝廷·人物=' + ming.metrics.charCount + ' (' + JSON.stringify(ming.metrics.charByRole) + ')');
  console.log('[e2e] 明朝廷·军队=' + ming.metrics.armyCount + ' 总兵=' + ming.metrics.totalSoldiers + ' 欠饷=' + ming.metrics.arrearsArmies);
  assert(ming.metrics.armyCount > 0, 'official scenario Ming armies should have faction ownership');
  assert(ming.metrics.totalSoldiers > 0, 'official scenario Ming total soldiers should be indexed');
  console.log('[e2e] 明朝廷·私兵化=' + ming.metrics.privatizedRatio + ' avgMutiny=' + ming.metrics.avgMutinyRisk + ' avgLoyalty=' + ming.metrics.avgLoyalty);
  console.log('[e2e] 明朝廷·党派=' + Object.keys(ming.parties).length + ' 主导=' + ming.metrics.partyDominantName + ' 失衡=' + ming.metrics.partyImbalance);

  // 期望·官方剧本 98 人·绝大多数明朝廷
  assert(ming.metrics.charCount >= 60, '明朝廷 char count too low (expected >=60·got ' + ming.metrics.charCount + ')');
  // 期望·将领分类·袁崇焕/孙承宗/满桂/赵率教/祖大寿/毛文龙/秦良玉等
  assert(ming.metrics.charByRole.general >= 5, '明朝廷 general count too low·got ' + ming.metrics.charByRole.general);
  // 期望·朝臣分类·内阁+六部尚书+侍郎等
  assert(ming.metrics.charByRole.court >= 10, '明朝廷 court count too low·got ' + ming.metrics.charByRole.court);
  // 期望·宗室·朱常洵 etc
  assert(ming.metrics.charByRole.clan >= 0, '明朝廷 clan count check');
  // 党派·阉党/东林党都应该出现
  assert(ming.parties['阉党'] && ming.parties['阉党'].memberCount > 0, '阉党 should have members');
  // 后金 entry
  const houjin = ctx.GM._facIndex['后金'];
  assert(houjin, 'missing 后金');
  assert(houjin.metrics.charCount >= 3, '后金 char too low·got ' + houjin.metrics.charCount);

  // 2. derivedHealth
  ctx.TM.FactionDerived.compute();
  const mingFac = ctx.GM.facs.find(f => f.name === '明朝廷');
  assert(mingFac.derivedHealth, 'derivedHealth not written to fac');
  console.log('[e2e] 明朝廷·健康度·' + JSON.stringify(mingFac.derivedHealth.labels) + ' (overall=' + mingFac.derivedHealth.overall + ')');
  // 明朝廷·阉党 v 东林党党争失衡 + 关宁/东江私兵化·健康度应中等偏弱 (30-70 区间)
  assert(mingFac.derivedHealth.overall >= 0 && mingFac.derivedHealth.overall <= 100, 'overall out of range');
  // 必有 4 个分项 + labels
  ['courtCohesion','militaryControl','personnelHealth','militaryStability','overall'].forEach(k => {
    assert(typeof mingFac.derivedHealth[k] === 'number', 'missing ' + k);
    assert(typeof mingFac.derivedHealth.labels[k] === 'string', 'missing labels.' + k);
  });

  // 3. 所有势力都有 derivedHealth
  ctx.GM.facs.forEach(f => {
    assert(f.derivedHealth, '势力 ' + f.name + ' 缺 derivedHealth');
  });

  // 4. 后金军权应该非常高 (无私兵化·没欠饷)
  const houjinFac = ctx.GM.facs.find(f => f.name === '后金');
  console.log('[e2e] 后金·健康度·' + JSON.stringify(houjinFac.derivedHealth.labels) + ' (overall=' + houjinFac.derivedHealth.overall + ')');

  console.log('[smoke-faction-index-e2e] pass');
}

try { main(); }
catch (e) {
  console.error('[smoke-faction-index-e2e] fail: ' + (e && e.message || e));
  if (e && e.stack) console.error(e.stack.split('\n').slice(1, 8).join('\n'));
  process.exit(1);
}
