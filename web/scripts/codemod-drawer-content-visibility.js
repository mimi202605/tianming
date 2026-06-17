// perf round5 (2026-06-10) 刀2: 闭合抽屉 content-visibility:auto
//
// 实测(playwright DOM 普查): formal 御案下经典左右抽屉虽然移出视口/宽0·
// 但 display:flex 仍被完整 style+layout(右 13.7k 节点·左 4k·#gl 布局高 2 万 px)·
// 每次任何点击触发的全局样式失效都拖着 1.8 万隐藏节点陪跑。
// content-visibility:auto = 离开视口即整体跳过渲染管线·DOM 读取(textContent)不受影响·
// 抽屉 .open 滑入视口时自动恢复渲染。
// 注意: #gc 不能加(其内含活的 formal 主壳/地图·经典子元素已 display:none 自然豁免)。
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'phase8-formal-bridge.js');
let src = fs.readFileSync(FILE, 'utf8');

const anchor = "      'body.tm-phase8-formal #drawerRight.gs-drawer.right{position:fixed!important;";
const insert = "      'body.tm-phase8-formal #drawerRight.gs-drawer.right:not(.open) .gs-drawer-body,body.tm-phase8-formal #drawerLeft.gs-drawer.left:not(.open) .gs-drawer-body{content-visibility:auto;}',\n";

const n = src.split(anchor).length - 1;
if (n !== 1) { console.error('ANCHOR: expected 1, got ' + n); process.exit(1); }
if (src.includes('content-visibility:auto;}\'')) { console.error('already applied?'); process.exit(1); }
src = src.replace(anchor, insert + anchor);
fs.writeFileSync(FILE, src);
console.log('OK drawer content-visibility rule inserted');
