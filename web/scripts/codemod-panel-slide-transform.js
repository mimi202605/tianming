// perf round5 (2026-06-10): 面板开合动画 width 过渡 → transform 滑入
//
// 病灶：#rpanel / #drawerRight 用 transition:width 开合·180ms 内每帧对刚
// innerHTML 重建的整个面板子树重新布局+绘制(~11 趟全量重排)·正是
// 「点面板按钮固定卡 250-500ms·js≈0」的主成本。
// 修法：宽度恒定·开合改 transform:translateX(合成器动画·零布局)；
// 事件 feed 的 width 过渡直接去掉(折叠/展开瞬时·一趟布局)。
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'phase8-formal-bridge.js');
let src = fs.readFileSync(FILE, 'utf8');

const edits = [
  // ---- #rpanel：基态宽度落定 312·闭态移出屏外 ----
  {
    name: 'rpanel-base-width',
    find: 'body.tm-phase8-formal #rpanel{position:fixed;right:48px;top:56px;bottom:32px;z-index:68;width:0;flex:0 0 0;margin:0;pointer-events:none;overflow:hidden;',
    repl: 'body.tm-phase8-formal #rpanel{position:fixed;right:48px;top:56px;bottom:32px;z-index:68;width:312px;flex:0 0 312px;transform:translateX(calc(100% + 110px));margin:0;pointer-events:none;overflow:hidden;'
  },
  {
    name: 'rpanel-transition',
    find: 'color:#eadfbd;transition:width .18s;}body.tm-phase8-formal #rpanel.show{width:312px;flex-basis:312px;overflow-y:auto;',
    repl: 'color:#eadfbd;transition:transform .18s ease;}body.tm-phase8-formal #rpanel.show{transform:translateX(0);overflow-y:auto;'
  },
  // ---- #drawerRight：同病同修 ----
  {
    name: 'drawer-base',
    find: 'left:auto!important;width:0!important;transform:none!important;overflow:hidden!important;',
    repl: 'left:auto!important;width:390px!important;transform:translateX(calc(100% + 130px))!important;overflow:hidden!important;'
  },
  {
    name: 'drawer-transition',
    find: 'transition:width .18s ease,box-shadow .18s ease!important;z-index:9996!important;}body.tm-phase8-formal #drawerRight.gs-drawer.right.open{width:390px!important;overflow-y:auto!important;',
    repl: 'transition:transform .18s ease,box-shadow .18s ease!important;z-index:9996!important;}body.tm-phase8-formal #drawerRight.gs-drawer.right.open{transform:translateX(0)!important;overflow-y:auto!important;'
  },
  // ---- 事件 feed：去 width 过渡（折叠/展开瞬时） ----
  {
    name: 'event-feed-no-width-transition',
    find: 'pointer-events:auto!important;transition:width .18s ease!important;}',
    repl: 'pointer-events:auto!important;}'
  }
];

let fail = 0;
for (const e of edits) {
  const n = src.split(e.find).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + e.name + ': expected 1 occurrence, got ' + n); fail++; continue; }
  src = src.replace(e.find, e.repl);
  console.log('OK ' + e.name);
}
if (fail) { console.error('ABORT: ' + fail + ' anchors failed; file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('WRITTEN ' + FILE);
