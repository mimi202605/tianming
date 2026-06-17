#!/usr/bin/env node
// scripts/calibrate-derived-health.js — Slice N 校准报告
// 跑所有官方剧本·输出每势力 derivedHealth·跟"史观"对照·人工 review 系数
// 2026-05-10·use: node scripts/calibrate-derived-health.js

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SCN_DIR = path.resolve(ROOT, '..', 'scenarios');

function buildContext() {
  const ctx = { console: { log: () => {}, warn: () => {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, parseInt, parseFloat, isNaN, Set };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-paradigm.js'), 'utf8'), ctx, { filename: 'tm-faction-paradigm.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-index.js'), 'utf8'), ctx, { filename: 'tm-faction-index.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-derived-health.js'), 'utf8'), ctx, { filename: 'tm-faction-derived-health.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-faction-membership.js'), 'utf8'), ctx, { filename: 'tm-faction-membership.js' });
  return ctx;
}

function loadScenarioToGM(ctx, sc) {
  ctx.GM = {
    turn: 1,
    facs: (sc.factions || []).map(f => Object.assign({}, f)),
    chars: (sc.characters || []).map(c => Object.assign({}, c, { alive: c.alive !== false })),
    armies: (sc.military && sc.military.initialTroops || []).map(a => Object.assign({}, a)),
    parties: (sc.parties || []).map(p => Object.assign({}, p)),
    factionRelations: sc.factionRelations || [],
    _provinceToFaction: {}, provinceStats: {}
  };
  ctx.getFactionProvinces = (n) => {
    const f = ctx.GM.facs.find(x => x.name === n);
    if (!f) return [];
    if (Array.isArray(f.territories)) return f.territories.slice();
    return [];
  };
  // 跑 migrations·然后 rebuild + compute
  ctx.TM.FactionMembership.migrateArmyOwnerToFaction();
  ctx.TM.FactionMembership.migrateCharsAddFactionId();
  ctx.TM.FactionMembership.migrateProvinceOwnership();
  ctx.TM.FactionIndex.rebuild();
  ctx.TM.FactionDerived.compute();
}

function reportScenario(scnPath, expectedRanges) {
  const sc = JSON.parse(fs.readFileSync(scnPath, 'utf8'));
  const ctx = buildContext();
  loadScenarioToGM(ctx, sc);

  const fileName = path.basename(scnPath);
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('剧本: ' + fileName + '·' + (sc.name || sc.id || ''));
  console.log('共 ' + ctx.GM.facs.length + ' 势力·' + ctx.GM.chars.length + ' 人物·' + ctx.GM.armies.length + ' 军队');
  console.log('══════════════════════════════════════════════════════════');
  console.log('势力'.padEnd(35) + ' overall  朝堂  军权  人事  兵权  | 史观期望');
  console.log('─'.repeat(95));

  ctx.GM.facs.forEach(f => {
    const dh = f.derivedHealth || {};
    const expected = (expectedRanges && expectedRanges[f.name]) || '(未标注)';
    const isPlayer = sc.playerInfo && sc.playerInfo.factionName === f.name;
    const tag = isPlayer ? '[本朝]' : '';
    const name = (f.name + tag).padEnd(35);
    const o = String(dh.overall || '?').padStart(3);
    const oLab = (dh.labels && dh.labels.overall) || '?';
    const cc = String(dh.courtCohesion || '?').padStart(3) + '/' + ((dh.labels && dh.labels.courtCohesion) || '?');
    const mc = String(dh.militaryControl || '?').padStart(3) + '/' + ((dh.labels && dh.labels.militaryControl) || '?');
    const ph = String(dh.personnelHealth || '?').padStart(3) + '/' + ((dh.labels && dh.labels.personnelHealth) || '?');
    const ms = String(dh.militaryStability || '?').padStart(3) + '/' + ((dh.labels && dh.labels.militaryStability) || '?');
    console.log(name + ' ' + o + '/' + oLab + '  ' + cc + ' ' + mc + ' ' + ph + ' ' + ms + ' | ' + expected);
  });

  // 统计：势力分布健 / 平 / 弱 / 危
  const dist = { 健: 0, 平: 0, 弱: 0, 危: 0 };
  ctx.GM.facs.forEach(f => {
    const lab = f.derivedHealth && f.derivedHealth.labels && f.derivedHealth.labels.overall;
    if (lab && dist[lab] != null) dist[lab]++;
  });
  console.log('\n分布: 健 ' + dist.健 + ' / 平 ' + dist.平 + ' / 弱 ' + dist.弱 + ' / 危 ' + dist.危);
}

// 各剧本"史观期望"·人工标注每个核心势力应该落在哪个区间
const HISTORICAL_EXPECTATIONS = {
  'sc-tianqi7-1627': {
    '明朝廷': '弱/危 (阉党·欠饷·辽东危·小冰河)',
    '后金': '健 (整旗·朝鲜服·虎视辽西)',
    '察哈尔': '弱 (西迁·诸部叛)',
    '朝鲜': '弱 (江都盟受辱)',
    '陕北饥民(将起)': '弱 (聚而未啸)',
    '葡萄牙·澳门': '平 (商贸稳)',
    '荷兰·台海(东印度公司)': '平 (新据)',
    '西班牙·马尼拉': '平 (中转利)',
    '奢安之乱联军': '弱 (残部)',
    '播州土司·杨氏(余裔)': '危 (族灭余裔)',
    '郑氏海商': '平 (海商崛起)',
    '科尔沁蒙古': '健 (附金·联姻)'
  }
};

function main() {
  const wantFiles = ['天启七年·九月（官方）.json', '崇祯.json', '挽天倾：崇祯死局.json', '绍宋·建炎元年八月（官方）.json'];
  wantFiles.forEach(f => {
    const fp = path.join(SCN_DIR, f);
    if (!fs.existsSync(fp)) { console.log('skip·not found: ' + fp); return; }
    const sc = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const expect = HISTORICAL_EXPECTATIONS[sc.id] || null;
    reportScenario(fp, expect);
  });
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log('校准建议·若多势力 overall 偏离史观超 ±20·考虑:');
  console.log('  1. 调系数 P.derivedHealthConfig.coeffs (公开 in tm-faction-derived-health.js)');
  console.log('  2. 给剧本 initialTroops 加 mutinyRisk/payArrearsMonths/controlLevel 初值');
  console.log('  3. 调阈值 P.derivedHealthConfig.thresholds');
  console.log('══════════════════════════════════════════════════════════');
}

try { main(); } catch (e) { console.error(e); process.exit(1); }
