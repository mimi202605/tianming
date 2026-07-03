#!/usr/bin/env node
'use strict';
/* smoke-workshop-ui-redo — 剧本工坊 UI 全面重做（2026-07-03 玄墨案头 W1-W4）防腐线。
 * W1 壳：灭照片纹理(ancient-tabletop-board 不再被引用)·JE-* 自带字体按 ../assets/fonts 声明·玄墨 token 层。
 * W2 rail：九章书脊(朱印左标接管 Slice52 ::before·雕版 glyph 走 --je-font-seal)。
 * W3 纸面：.inspector 语义 token 作用域翻转(纸上墨字)·折子组白面朱丝栏。
 * W4 功能：dock 让宽回退 420 与面板一致·hd 安全插入(✕ 嵌套 .tm-aa-hdbtns 后 insertBefore 不再炸)·
 *          跨模块搜索(他章命中签 data-cross-jump)·换章翻页动效 jePageTurn·
 *          agent-ui 字体基址按脚本位置解析(子目录宿主不再 404)。
 * (视觉真机截图另验·此 smoke 守结构接线防回退) */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'preview', 'scenario-editor-reset-preview.html'), 'utf8');
const app = fs.readFileSync(path.resolve(__dirname, '..', 'preview', 'scenario-editor-reset-app.js'), 'utf8');
const ui = fs.readFileSync(path.resolve(__dirname, '..', 'editor-authoring-agent-ui.js'), 'utf8');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-workshop-ui-redo');

console.log('— W1 壳 · 玄墨地基 —');
ok(!/url\("img\/ancient-tabletop-board\.png"/.test(html), 'W1 照片纹理零真实引用(body 背景不再走图片·仅注释存目)');
ok(/@font-face\s*\{\s*font-family:\s*"JE-XiaoWei";\s*src:\s*url\("\.\.\/assets\/fonts\/ZCOOLXiaoWei-Regular\.ttf"\)/.test(html), 'W1 JE-XiaoWei 自带字体按 ../assets/fonts 正确路径声明');
ok(/--je-chrome-1:\s*#1b1917/.test(html) && /--je-hairline:\s*rgba\(245, 240, 232, \.08\)/.test(html), 'W1 玄墨 chrome token 层在');
ok(/--je-font-seal:\s*"JE-MaShanZheng"/.test(html), 'W1 印章字体栈(毛笔楷)在');

console.log('— W2 rail · 九章书脊 —');
ok(/#module-rail \.module-tile\.active::before\s*\{[^}]*#c04030/.test(html), 'W2 朱印左标接管 Slice52 ::before(朱砂渐变)');
ok(/#module-rail \.module-glyph\s*\{[^}]*var\(--je-font-seal\)/.test(html), 'W2 章 glyph 走毛笔印章字体');
ok(/#module-rail \.module-tile\.active\s*\{[^}]*box-shadow:\s*none/.test(html), 'W2 压掉旧内嵌金圈');

console.log('— W3 纸面 · 案卷=一整张纸 —');
ok(/\.editor-grid > \.inspector\s*\{[^}]*--paper-strong:\s*#262014/.test(html), 'W3 语义 token 纸面作用域翻转(纸上墨字)');
ok(/\.inspector \.folio-group\s*\{[^}]*rgba\(255, 253, 246, \.55\)/.test(html), 'W3 折子组白面');
ok(/\.inspector \.folio-group-head::before\s*\{[^}]*#b23c2c/.test(html), 'W3 组头朱丝栏');
ok(/\.inspector \.je-health\s*\{[^}]*border-left:\s*3px solid #a83228/.test(html), 'W3 体检横幅=朱批眉批条');

console.log('— W4 功能件 —');
ok(/padding-right: calc\(var\(--tm-aa-dock-w, 420px\) \+ 14px\)/.test(html), 'W4 dock 让宽回退 420(与面板 width 回退一致·不再钻面板底下)');
ok(!/hdRow\.insertBefore\(\w+, hdRow\.querySelector\('#tm-aa-x'\)\)/.test(html), 'W4 头部注入无裸 insertBefore(#tm-aa-x 已嵌套·全走安全插入)');
ok((html.match(/xb\.parentNode\s*===?\s*h(?:dRow2?)?\b/g) || []).length >= 2, 'W4 安全插入含 parentNode 直系判定');
ok(/data-cross-jump/.test(app) && /他章命中/.test(app), 'W4 跨模块搜索:他章命中签在 app.js');
ok(/function jePageTurn\(\)/.test(app) && /jeSwitched/.test(app), 'W4 换章翻页动效(重选同章不闪)');
ok(/@keyframes jePageTurn/.test(html) && /\.field-cross-hits/.test(html), 'W4 翻页动画与命中签样式在');
ok(/var FONT_BASE = /.test(ui) && /url\("' \+ FONT_BASE \+ 'assets\/fonts\/ZCOOLXiaoWei-Regular\.ttf"\)/.test(ui), 'W4 agent-ui 字体基址按脚本位置解析(子目录宿主不 404)');

console.log('— X1 总览控制台内部玄墨化 —');
ok(/\.main-stack \.metric,\s*\n\s*\.main-stack \.mode-card/.test(html) && /background: var\(--je-chrome-2\)/.test(html), 'X1 卡片族(统计/模式/健康/模板…)成批玄墨');
ok(/\.main-stack \.section-nav-pill\[data-active="true"\]\s*\{[^}]*rgba\(184, 154, 83, \.14\)/.test(html), 'X1 分节导航 active=金tint(压掉旧金玉渐变)');
ok(/\.main-stack \.workflow-step-card,[\s\S]{0,400}rgba\(126, 184, 167, \.06\)/.test(html), 'X1 青瓷件统一 celadon 色相');
console.log('— X2 弹窗族收敛 —');
ok(/\.je-cmdk,\s*\n\s*\.je-import,\s*\n\s*\.je-pv-modal\s*\{\s*\n\s*background: var\(--je-chrome-2\)/.test(html), 'X2 ⌘K/导入/玩家视角容器=玄墨浮层(去暗金渐变)');
ok(/\.je-cmdk \.je-cmdk-item\.active,[\s\S]{0,80}rgba\(184, 154, 83, \.15\)/.test(html), 'X2 ⌘K active 行金tint');
console.log('— X3 横幅+深度台漏网 —');
ok(/\.je-guard-toast\s*\{\s*\n\s*background: var\(--je-chrome-2\);\s*\n\s*border: 1px solid rgba\(192, 64, 48, \.5\);\s*\n\s*border-left: 3px solid #c04030/.test(html), 'X3 一致性横幅=玄墨朱批浮签(亮珊瑚块退役)');
ok(/\.inspector #field-editor-value\s*\{\s*\n\s*background: #f6f0df/.test(html) && /var\(--je-font-mono\)/.test(html), 'X3 JSON编辑器本尊纸面井+等宽(上轮漏网)');
ok(/\.inspector \.missing-field-callout b \{ color: #7d5e22; \}/.test(html), 'X3 字段缺失 callout 纸上墨字');

console.log('\nsmoke-workshop-ui-redo ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
