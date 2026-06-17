#!/usr/bin/env node
/* eslint-env node */
// smoke-gongming-production.js — 功名系统·生成路径源码契约 (2026-06-13)
// 验证：① 科举放榜盖结构化出身(进士·一甲授翰林)；② AI gongming_grants op 登记白名单+schema+apply 消费。
'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('  PASS', msg); }
  else { failed += 1; console.error('  FAIL', msg); }
}

// ── ① 科举盖印升级 ──
const KJ = fs.readFileSync(path.join(__dirname, '..', 'tm-keju-allocation.js'), 'utf8');
ok(/window\.TMGongming/.test(KJ) && /TMGongming\.grant\(ch, \{ path: 'keju', tier: '进士'/.test(KJ), '科举放榜盖结构化进士出身');
ok(/_gmRk === 1 \? \['状元', '翰林'\]/.test(KJ), '一甲(状元/榜眼/探花)直授翰林荣衔');
ok(/source: 'keju'/.test(KJ), '出身来源标 keju');

// ── ② AI op 三处接线齐 ──
const VAL = fs.readFileSync(path.join(__dirname, '..', 'tm-ai-output-validator.js'), 'utf8');
ok(/gongming_grants: 'array'/.test(VAL), 'validator 白名单登记 gongming_grants(防剥)');

const SCH = fs.readFileSync(path.join(__dirname, '..', 'tm-ai-schema.js'), 'utf8');
ok(/gongming_grants:\s*\{ type: 'array'/.test(SCH), 'schema 声明 gongming_grants(教 AI)');
ok(/menyin门荫\/nazi捐纳\/junggong军功\/lijin吏进\/enci/.test(SCH), 'schema 列五路径 action 取值');

const APP = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-apply.js'), 'utf8');
ok(/p1\.gongming_grants && Array\.isArray\(p1\.gongming_grants\)/.test(APP), 'apply 消费 gongming_grants');
ok(/TMGongming\.grantPreset\(_gch, gg\.action/.test(APP), 'apply 走 grantPreset(五路径)');
ok(/gg\.action === 'honor' && gg\.honor/.test(APP) && /TMGongming\.addHonor/.test(APP), 'apply 支持 honor 加衔(馆选庶吉士)');
ok(/gg\.name === _gmPName.*已过滤|已过滤.*君上功名/.test(APP), 'apply 玩家保护(不替君上改功名)');

// ── 引擎五路径预设齐 ──
const ENG = fs.readFileSync(path.join(__dirname, '..', 'tm-gongming.js'), 'utf8');
['menyin', 'nazi', 'junggong', 'lijin', 'enci'].forEach(function (k) {
  ok(new RegExp(k + ':\\s*\\{ path:').test(ENG), 'PRODUCTION_PRESETS 含 ' + k);
});

console.log('\n[smoke-gongming-production] ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
