#!/usr/bin/env node
/* eslint-env node */
// smoke-gongming-consequence.js — 功名系统·天花板机械后果接线源码契约 (2026-06-13)
// 验证：① tm-promotion.runAutoPromotion 自动升迁尊重出身天花板；② tm-ai-change-applier 越出身天花板擢用叠加皇威损+清议。
'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('  PASS', msg); }
  else { failed += 1; console.error('  FAIL', msg); }
}

// ── ① 自动升迁天花板 gate ──
const PROM = fs.readFileSync(path.join(__dirname, '..', 'tm-promotion.js'), 'utf8');
ok(/glob\.TMGongming && glob\.TMGongming\.canReach && !glob\.TMGongming\.canReach\(ch, lv - 1, G\)\) continue;/.test(PROM),
  'runAutoPromotion 出身天花板 gate(canReach 否则不升)');
// gate 须在升迁判定之前(出现在 ch.rankLevel = lv - 1 之前)
var gateIdx = PROM.indexOf('!glob.TMGongming.canReach(ch, lv - 1, G)) continue;');
var promoteIdx = PROM.indexOf('ch.rankLevel = lv - 1;');
ok(gateIdx > 0 && promoteIdx > gateIdx, 'gate 位于实际升迁之前');

// ── ② 越级强擢·出身天花板加重 ──
const APP = fs.readFileSync(path.join(__dirname, '..', 'tm-ai-change-applier.js'), 'utf8');
ok(/_TG\.ceilingGap\(ch, _newLv, G\)/.test(APP), 'applier 取出身天花板级差 ceilingGap');
ok(/promotion_overceiling/.test(APP), '越天花板擢用→皇威损(promotion_overceiling)');
ok(/越次逾品·名分有亏/.test(APP), '越天花板皇威损叙事');
ok(/出身.*异途.*骤膺逾品之任/.test(APP), '越天花板→清议劾出身异途/资浅');
ok(/玷污清班/.test(APP), '异途入清要政治区→玷污清班加叙事');
// 加重独立于既有功名缺口惩罚(两块各自 if)
ok(/_pen\.severity >= 2/.test(APP) && /_cg > 0/.test(APP), '出身加重独立于功名缺口惩罚(双闸并存)');

console.log('\n[smoke-gongming-consequence] ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
