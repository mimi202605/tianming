#!/usr/bin/env node
'use strict';
/* smoke-settings-ui — 设置面板升级（2026-07-03）防腐线。
 * S0 小薇字库外科(unicode-range 剔九坏字·治全游戏「回合」豆腐)
 * S1 稀签合并  S2 面板全文搜索  S3 视觉归族(杂色→御案palette·签名去emoji·勾选鎏金) */
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var P = 0, F = 0;
function ok(c, m) { if (c) { P++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
console.log('smoke-settings-ui');

console.log('— S0 · 字库外科 —');
var css = read('styles.css');
ok(/TM-ZCOOL-XiaoWei[^}]*unicode-range:U\+0000-56DD/.test(css), '小薇 @font-face 带 unicode-range 白名单');
ok(/U\+56DF-5702,U\+5705-5709,U\+570B-5D2D,U\+5D2F-5F89,U\+5F8B-60FF,U\+6101-6DCA,U\+6DCC-86D3,U\+86D5-10FFFF/.test(css), '九坏字(回圃圄圊崮徊愀淋蛔)全部剔除·坏字回退楷体');
ok((css.match(/@font-face\{font-family:"TM-ZCOOL-XiaoWei"/g) || []).length === 1, '家族 @font-face 声明仍唯一(无第二处抢名)');
ok(/TM-ZCOOL-QingKe[^}]*ZCOOLQingKeHuangYou/.test(css) && !/TM-ZCOOL-QingKe[^}]*unicode-range/.test(css), '黄油体不动(体检通过·粗体≠坏)');

console.log('— S1/S2 · 结构 —');
var patches = (read('tm-patches.js') + '\n' + read('tm-patches-start.js'));
ok(/_settingsMerges = \[/.test(patches) && /战斗规则\|御驾亲征\|玩法机制/.test(patches), '稀签合并规则:玩法三节并一页');
ok(/\^文风\|游戏模式/.test(patches), '稀签合并规则:文风+游戏模式并一页');
ok(/_mergedPaneByRule\[mi\]\.appendChild\(section\)/.test(patches), '后至节并入共享 pane 不出新签');
ok(/window\._settingsFilter = function\(q\)/.test(patches), '全文搜索过滤器在');
ok(/search-miss/.test(patches) && /_settingsSwitchTab\(firstHit\)/.test(patches), '过滤+活签被滤走自动切首个命中');
ok(/id=\\"s-search\\"[^>]*oninput=\\"_settingsFilter/.test(patches), '头部搜索框接线');
ok(/settings-search\{/.test(css) && /settings-tab\.search-miss\{display:none/.test(css), '搜索样式与隐签 CSS 在');
ok(/\.settings-pane \.settings-section \+ \.settings-section\{margin-top/.test(css), '合并页节间距');

console.log('— S3 · 视觉归族 —');
ok(!/8a5cf5|6b9eff|9bbfff|b98bff|c9a9ff/.test(patches), 'tm-patches 紫蓝杂色清零(归御案palette)');
ok(!/8a5cf5|a585ff/.test(read('tm-player-settings.js').replace(/92acd0/g, '')), 'tm-player-settings 杂色清零');
ok(/var\(--celadon-400,#7eb8a7\)/.test(patches) && /var\(--vermillion-400,#c04030\)/.test(patches), '性能→青瓷·实验→朱(palette token 带兜底)');
ok(/uD83C-\\uD83E/.test(patches), '左栏签名去 emoji(右栏 h4 原样)');
ok(/accent-color:var\(--gold\)/.test(css), '勾选/滑条鎏金 accent');

console.log('\nsmoke-settings-ui ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + P + '/' + (P + F));
process.exit(F === 0 ? 0 : 1);
