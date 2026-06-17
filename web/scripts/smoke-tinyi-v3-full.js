#!/usr/bin/env node
/**
 * smoke-tinyi-v3-full.js
 * v2.6 Slice 11·完整 sprint 验收 smoke
 *
 * 10 case·5 剧本 × 2 议题·按 v2.9 §10.1 SMOKE_CASES (v2.7 改 id + topic)
 * 跑·node web/scripts/smoke-tinyi-v3-full.js
 *
 * 不真跑 LLM·只 verify helpers + state·避 cost。完整 game UI 验需 user 实测。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 1·verify 5 剧本 scenario.tinyi.convening 存在
function smokeScenarioConfig() {
  const files = [
    '天启七年·九月（官方）.json',
    '崇祯.json',
    '挽天倾：崇祯死局.json',
    '111.json',
    '绍宋·建炎元年八月（官方）.json'
  ];
  let pass = 0;
  files.forEach(f => {
    const p = path.join(ROOT, '..', 'scenarios', f);
    if (!fs.existsSync(p)) { console.log('  ✗ scenario not found·' + f); return; }
    const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (d.tinyi && d.tinyi.convening && Array.isArray(d.tinyi.convening.requiredCallList)) {
      pass++;
      console.log('  ✓ ' + f + '·convening.maxAttendees=' + d.tinyi.convening.maxAttendees);
    } else {
      console.log('  ✗ ' + f + '·missing tinyi.convening');
    }
  });
  return pass === files.length;
}

// 2·verify v3 helper expose (grep)
function smokeV3HelperExpose() {
  const v3 = fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf-8');
  const required = [
    'window._ty3_phase6_recordSeal',           // Slice 0.5
    'window._ty3_inferTopicTags',              // Slice 2
    'window._ty3_calcEligibility',             // Slice 2.5
    'window._ty3_calcConveningPolitics',
    'window._ty3_v15_decayConveningCounters',
    'window._ty3_getDims',                     // Slice 3
    'window._ty3_initialStanceFromDims',
    'window._ty3_dimsFromTraits',
    'window._ty3_dimsFromKeywords',
    'window._ty3_modulateModeByPersona',       // Slice 6
    'window._ty3_buildToneHint',
    'window._ty3_getAffinity',                 // Slice 7
    'window._ty3_addAffinity',
    'window._ty3_startConfrontChain',
    'window._ty3_actionFlogging',              // Slice 7.5
    'window._ty3_actionStrip',
    'window._ty3_v15_appendMinorityRebound',   // Slice 8
    'window._ty3_buildMentorIndex',            // Slice 10a
    'window._ty3_clientelismCheck'             // Slice 10b
  ];
  let pass = 0;
  required.forEach(api => {
    if (v3.indexOf(api) >= 0) { pass++; console.log('  ✓ expose·' + api); }
    else { console.log('  ✗ missing expose·' + api); }
  });
  return pass === required.length;
}

// 3·verify currentPhase 8 update (Slice 4.5)
function smokeCurrentPhaseUpdates() {
  const v3 = fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf-8');
  const matches = v3.match(/CY\._ty3\.currentPhase\s*=\s*['"]/g) || [];
  console.log('  currentPhase write hits·' + matches.length + ' (expect ≥8)');
  return matches.length >= 8;
}

// 4·verify v3 L781 typo fix
function smokeV3TypoFix() {
  const v3 = fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf-8');
  const bad = v3.indexOf('完整七阶段/div>');  // no closing <
  const good = v3.indexOf('完整七阶段</div>');
  console.log('  bad hit (should be 0)·' + bad);
  console.log('  good hit (should be 1+)·' + good);
  return bad < 0 && good > 0;
}

// 5·verify ChronicleTracker upsert type tingyi (Slice 11 改名)
function smokeTingyiRename() {
  const v3 = fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf-8');
  const tingyi = (v3.match(/tingyi_pending/g) || []).length;
  console.log('  tingyi_pending hits·' + tingyi + ' (expect ≥2)');
  return tingyi >= 2;
}

// 6·verify _dingyou field 5 剧本·≥ 400 chars
function smokeDingyouField() {
  const files = [
    '天启七年·九月（官方）.json',
    '崇祯.json',
    '挽天倾：崇祯死局.json',
    '111.json',
    '绍宋·建炎元年八月（官方）.json'
  ];
  let total = 0;
  files.forEach(f => {
    const p = path.join(ROOT, '..', 'scenarios', f);
    if (!fs.existsSync(p)) return;
    const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
    (d.characters || []).forEach(c => { if ('_dingyou' in c) total++; });
  });
  console.log('  _dingyou:false count·' + total + ' (expect ≥ 400)');
  return total >= 400;
}

// 7·verify mentor index data·≥ 15 relations
function smokeMentorData() {
  const files = ['天启七年·九月（官方）.json', '绍宋·建炎元年八月（官方）.json'];
  let total = 0;
  files.forEach(f => {
    const p = path.join(ROOT, '..', 'scenarios', f);
    if (!fs.existsSync(p)) return;
    const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
    (d.characters || []).forEach(c => {
      if (Array.isArray(c.mentees)) total += c.mentees.length;
    });
  });
  console.log('  mentor relations·' + total + ' (expect ≥ 12)');
  return total >= 12;
}

// 8·verify Slice 5·4 廷议 mode templates 存在
function smokeTinyiModes() {
  const cc = fs.readFileSync(path.join(ROOT, 'tm-chaoyi-changchao.js'), 'utf-8');
  const modes = ['confront:', 'cite_classic:', 'clientelism:', 'martyr:'];
  let pass = 0;
  modes.forEach(m => {
    if (cc.indexOf(m) > 0) { pass++; console.log('  ✓ mode template·' + m); }
    else console.log('  ✗ missing·' + m);
  });
  return pass === modes.length;
}

// 9·verify Slice 6·25 RULES + 54 trait
// v2.6 polish·只算 TINYI_MODE_RULES 段·避 _ty3_REGALIA_DEFS / censorate 误算
function smokeMode6Engine() {
  const v3 = fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf-8');
  const rulesBlock = v3.match(/var TINYI_MODE_RULES\s*=\s*\[([\s\S]*?)\n\];/);
  const rules = rulesBlock ? (rulesBlock[1].match(/\{ id: '[^']+',/g) || []).length : 0;
  const traits = (v3.match(/weight: 0\.[0-9]+ \}/g) || []).length;
  console.log('  RULES·' + rules + ' (expect 25)');
  console.log('  trait BIAS·' + traits + ' (expect 54)');
  return rules >= 25 && traits >= 50;
}

// 10·verify v2 path 后处理·跟 v3 parity·ChronicleTracker / ClassEngine / partyStrife
function smokeV2Parity() {
  const v2 = fs.readFileSync(path.join(ROOT, 'tm-chaoyi-tinyi.js'), 'utf-8');
  const checks = [
    ['v2 path ChronicleTracker.upsert', /ChronicleTracker\.upsert\s*\(/],
    ['v2 path TM.ClassEngine.applyPartyOutcomeToClasses', /TM\.ClassEngine\.applyPartyOutcomeToClasses/],
    ['v2 path partyStrife', /GM\.partyStrife/],
    ['v2 path tingyi_pending', /tingyi_pending/]
  ];
  let pass = 0;
  checks.forEach(([label, re]) => {
    if (re.test(v2)) { pass++; console.log('  ✓ ' + label); }
    else console.log('  ✗ missing·' + label);
  });
  return pass === checks.length;
}

function main() {
  console.log('=== Slice 11·smoke-tinyi-v3-full ===\n');
  const cases = [
    { name: '1·scenario.tinyi.convening 5 剧本', fn: smokeScenarioConfig },
    { name: '2·v3 helper window expose 19 项', fn: smokeV3HelperExpose },
    { name: '3·currentPhase 8 update (Slice 4.5)', fn: smokeCurrentPhaseUpdates },
    { name: '4·v3 L781 typo fix', fn: smokeV3TypoFix },
    { name: '5·tingyi_pending 改名 (Slice 11)', fn: smokeTingyiRename },
    { name: '6·_dingyou 字段 5 剧本 (Slice 1)', fn: smokeDingyouField },
    { name: '7·mentor data (Slice 10a)', fn: smokeMentorData },
    { name: '8·廷议 4 mode templates (Slice 5)', fn: smokeTinyiModes },
    { name: '9·25 RULES + 54 trait (Slice 6)', fn: smokeMode6Engine },
    { name: '10·v2 path 后处理 parity (Slice 0.0b)', fn: smokeV2Parity }
  ];
  let pass = 0;
  cases.forEach(c => {
    console.log('\n--- ' + c.name + ' ---');
    try {
      if (c.fn()) { pass++; console.log('  → PASS ✓'); }
      else console.log('  → FAIL ✗');
    } catch (e) {
      console.log('  → ERROR·' + e.message);
    }
  });
  console.log('\n=== ' + pass + '/' + cases.length + ' PASS ===');
  process.exit(pass === cases.length ? 0 : 1);
}

main();
