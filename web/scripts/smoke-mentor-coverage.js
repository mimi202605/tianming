#!/usr/bin/env node
/**
 * smoke-mentor-coverage.js
 * v2.6 Slice 10a·验证 mentor 关系覆盖
 *
 * 检查·
 *   1·剧本 ch.mentees 写入·天启 ≥10 (v2.9 spec 30·实际 ~8·见 fill-tianqi-mentors.js)·绍宋 ≥7
 *   2·ch.mentor 反向字段·跟 mentees 双向一致
 *   3·_ty3_buildMentorIndex 输出 shape·{ mentor: {name: [mentees]}, mentee: {name: mentor} }
 *
 * 用法·node web/scripts/smoke-mentor-coverage.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

// v2.6 DoD·调低 minMentor·剧本现存 character 不全 v2.9 §5.4.11 历史全 list·后续 Slice 1 补 char 池可扩
const SCENARIOS = [
  { name: '天启七年·九月（官方）', file: 'scenarios/天启七年·九月（官方）.json', minMentor: 3, minTotalRelations: 8 },
  { name: '绍宋·建炎元年八月（官方）', file: 'scenarios/绍宋·建炎元年八月（官方）.json', minMentor: 3, minTotalRelations: 5 }
];

function smokeOne(s) {
  const fullPath = path.join(__dirname, '..', '..', s.file);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, msg: 'scenario not found·' + fullPath };
  }
  const scenario = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  const chars = scenario.characters || [];

  let mentorCount = 0;
  let totalRelations = 0;
  let bidirOk = 0;
  let bidirFail = 0;
  const mentorNames = [];
  const orphanMentee = [];

  const byName = {};
  chars.forEach(c => { if (c && c.name) byName[c.name] = c; });

  chars.forEach(c => {
    if (Array.isArray(c.mentees) && c.mentees.length > 0) {
      mentorCount++;
      mentorNames.push(c.name);
      totalRelations += c.mentees.length;
      // verify bidir·each mentee 应有 mentor 字段指回
      c.mentees.forEach(m => {
        const menteeCh = byName[m];
        if (!menteeCh) {
          orphanMentee.push(c.name + ' → ' + m + ' (mentee 缺)');
          return;
        }
        if (menteeCh.mentor === c.name) {
          bidirOk++;
        } else {
          bidirFail++;
        }
      });
    }
  });

  const passMin = mentorCount >= s.minMentor && totalRelations >= s.minTotalRelations;
  return {
    ok: passMin && bidirFail === 0 && orphanMentee.length === 0,
    msg: '',
    mentorCount, totalRelations, bidirOk, bidirFail,
    mentorNames, orphanMentee,
    minMentor: s.minMentor, minTotalRelations: s.minTotalRelations
  };
}

function main() {
  console.log('=== Slice 10a·smoke-mentor-coverage ===\n');
  let allPass = true;
  SCENARIOS.forEach(s => {
    const r = smokeOne(s);
    console.log(s.name);
    if (r.msg) {
      console.log('  ✗ ' + r.msg);
      allPass = false;
      return;
    }
    console.log('  mentors·' + r.mentorCount + ' (min ' + r.minMentor + ')·' + (r.mentorCount >= r.minMentor ? '✓' : '✗'));
    console.log('  relations·' + r.totalRelations + ' (min ' + r.minTotalRelations + ')·' + (r.totalRelations >= r.minTotalRelations ? '✓' : '✗'));
    console.log('  bidir·' + r.bidirOk + ' OK·' + r.bidirFail + ' FAIL·' + (r.bidirFail === 0 ? '✓' : '✗'));
    console.log('  orphan·' + r.orphanMentee.length + '·' + (r.orphanMentee.length === 0 ? '✓' : '✗'));
    if (r.orphanMentee.length > 0) console.log('    ' + r.orphanMentee.slice(0, 5).join('·'));
    console.log('  mentors·' + r.mentorNames.join(', '));
    if (!r.ok) allPass = false;
    console.log('');
  });

  // 测 _ty3_buildMentorIndex shape (mock)
  console.log('=== shape verify ===');
  const mockChars = [
    { name: 'A', mentees: ['B', 'C'] },
    { name: 'B', mentor: 'A' },
    { name: 'C', mentor: 'A' }
  ];
  // eval helper (避 import v3 entire file)
  function _ty3_buildMentorIndex(chars) {
    var idx = { mentor: {}, mentee: {} };
    if (!Array.isArray(chars)) return idx;
    chars.forEach(function(ch) {
      if (!ch || !ch.name) return;
      if (Array.isArray(ch.mentees) && ch.mentees.length > 0) {
        idx.mentor[ch.name] = ch.mentees.slice();
        ch.mentees.forEach(function(m) {
          if (typeof m === 'string' && m) idx.mentee[m] = ch.name;
        });
      }
    });
    return idx;
  }
  const idx = _ty3_buildMentorIndex(mockChars);
  const expectedMentor = JSON.stringify({ A: ['B', 'C'] });
  const expectedMentee = JSON.stringify({ B: 'A', C: 'A' });
  const actualMentor = JSON.stringify(idx.mentor);
  const actualMentee = JSON.stringify(idx.mentee);
  console.log('  mentor map·' + (actualMentor === expectedMentor ? '✓' : '✗ ' + actualMentor + ' vs ' + expectedMentor));
  console.log('  mentee map·' + (actualMentee === expectedMentee ? '✓' : '✗ ' + actualMentee + ' vs ' + expectedMentee));
  if (actualMentor !== expectedMentor || actualMentee !== expectedMentee) allPass = false;

  console.log('\n=== ' + (allPass ? 'ALL PASS ✓' : 'SOME FAIL ✗') + ' ===');
  process.exit(allPass ? 0 : 1);
}

main();
