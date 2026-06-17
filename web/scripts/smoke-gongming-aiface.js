#!/usr/bin/env node
/* eslint-env node */
// smoke-gongming-aiface.js — 功名系统·AI面+编辑器面源码契约 (2026-06-13)
// 验证：① endturn-prompt 逐人注入 chushen(出身) + 出身规则说明；② 编辑器 learning 字段承载出身(可编辑往返+AI-gen 指引)。
'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('  PASS', msg); }
  else { failed += 1; console.error('  FAIL', msg); }
}

// ── ① AI prompt 出身注入 ──
const PR = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-prompt.js'), 'utf8');
ok(/chushen="' \+ _xE\(TMGongming\.summaryLine\(c, GM\)\)/.test(PR), 'npc-hearts 逐人注入 chushen(出身摘要)');
ok(/!c\.isPlayer/.test(PR) && /chushen/.test(PR), '君上不注出身');
ok(/出身\(chushen·/.test(PR), 'prompt 含出身规则说明段');
ok(/仕途循资不得逾出身天花板/.test(PR), '说明含天花板规则');
ok(/清流.*异途.*清议|异途.*清议所讥/.test(PR), '说明含清流/异途清议');
ok(/gongming_grants\(奏荫|授功名走 gongming_grants/.test(PR), '说明教 AI 用 gongming_grants 授功名');

// ── ② 编辑器面：learning 承载出身 ──
const CRUD = fs.readFileSync(path.join(__dirname, '..', 'editor-crud.js'), 'utf8');
ok(/charLearning'\)\.value = c\.learning/.test(CRUD), '编辑器载入 learning(charLearning)');
ok(/c\.learning = document\.getElementById\('charLearning'\)\.value/.test(CRUD), '编辑器保存 learning(往返)');

const GEN = fs.readFileSync(path.join(__dirname, '..', 'editor-ai-gen.js'), 'utf8');
ok(/科第出身如"进士""举人"/.test(GEN), 'AI-gen learning 字段指引注明科第出身');
ok(/驱动功名出身系统/.test(GEN), 'AI-gen 点明 learning 驱动功名出身系统');

console.log('\n[smoke-gongming-aiface] ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
