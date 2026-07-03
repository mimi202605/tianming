#!/usr/bin/env node
'use strict';
/* smoke-workshop-preflight-access — 剧本工坊 W1:确定性 preflight 体检的可达性。
 * W1a 体检(runPreflightUI·跑 AA.preflight 确定性免API)可达。2026-07-03 更新：国师 UI 重做后
 *     旧「常驻 🩺 头部钮」按设计退役，可达路径改为三条：＋能力菜单 / 空态 chip / ⌘K 命令面板——断言随之对齐新形态。
 * W1b 快速测试(quickTestScenario)接入 AA.preflight·把运行时 blockers 并入预检 issues(补 ad-hoc 检查的运行时盲区)。
 * (DOM/点击行为另真浏览器验证·此 smoke 守接线防腐) */
const fs = require('fs'), path = require('path');
const ui = fs.readFileSync(path.resolve(__dirname, '..', 'editor-authoring-agent-ui.js'), 'utf8');
const fg = fs.readFileSync(path.resolve(__dirname, '..', 'editor-fullgen.js'), 'utf8');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-workshop-preflight-access');

// W1a · 体检三条可达路径（＋能力菜单 / 空态 chip / ⌘K 命令面板·2026-07-03 对齐重做后形态）
ok(/act: 'preflight'[^\n]*运行时体检[^\n]*免 API/.test(ui), 'W1a ＋能力菜单含「运行时体检」(确定性·免 API)');
ok(/label: '体检（免 API）', act: 'preflight'/.test(ui), 'W1a 空态 chip「体检（免 API）」在');
ok(/k: 'preflight'[^\n]*run: function \(\) \{ _plusAct\('preflight'\); \}/.test(ui), 'W1a ⌘K 命令面板含体检命令');
ok(/querySelector\('#tm-aa-preflight'\)[\s\S]{0,80}addEventListener\('click', function \(\) \{ runPreflightUI\(\)/.test(ui), 'W1a 按钮接 runPreflightUI');
ok(/function runPreflightUI/.test(ui) && /AA\.preflight\(AA\.makeDraft/.test(ui), 'W1a runPreflightUI 跑确定性 AA.preflight(已有·复用)');

// W1b · 快速测试接入 preflight
ok(/function quickTestScenario/.test(fg), 'W1b quickTestScenario 存在');
ok(/TM\.AuthoringAgent[\s\S]{0,120}preflight/.test(fg) && /_AA\.preflight\(JSON\.parse\(JSON\.stringify\(scriptData\)\)\)/.test(fg), 'W1b quickTest 调 AA.preflight(深克隆·不污染 scriptData)');
ok(/_pf && _pf\.blockers \|\| \[\]\)\.forEach[\s\S]{0,60}issues\.push\('运行时体检/.test(fg), 'W1b 运行时 blockers 并入预检 issues');

console.log('\nsmoke-workshop-preflight-access ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
