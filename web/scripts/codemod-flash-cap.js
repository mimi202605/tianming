// perf round6 刀2: tmv3-flash 收口·只最新4条闪·闪3次
// 背景: renderEventFeed 每次重建 innerHTML 动画都重播一轮·活跃操作期闪烁窗口一直续期·
// 74 条全闪=74 个合成层逐帧重组。改为: is-new 全员保留静态金线(0%态 opacity .28)+新徽章·
// 仅前 4 条加 is-flash 播 3 次(7.2s 注意力提示)。
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'phase8-formal-bridge.js');
let s = fs.readFileSync(FILE, 'utf8');

function once(find, repl, name) {
  const n = s.split(find).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + name + ': expected 1, got ' + n);
  s = s.replace(find, repl);
  console.log('OK ' + name);
}

// CSS: is-new 静态线 + is-flash 才动
once(
  "'body.tm-phase8-formal .tmv3-feed .tmv3-item.is-new:before{content:\"\";position:absolute;left:7px;right:7px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,238,180,.72),transparent);animation:tmv3-flash 2.4s ease-in-out 8;}',",
  "'body.tm-phase8-formal .tmv3-feed .tmv3-item.is-new:before{content:\"\";position:absolute;left:7px;right:7px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,238,180,.72),transparent);opacity:.28;}',\n      'body.tm-phase8-formal .tmv3-feed .tmv3-item.is-flash:before{animation:tmv3-flash 2.4s ease-in-out 3;}',",
  'css-flash-split');

// JS: 仅前4条 is-new 加 is-flash
once(
  "      if (turn >= currentTurn) classes.push('is-new');\r\n      else if (turn < currentTurn - 1) classes.push('is-read');",
  "      if (turn >= currentTurn) {\r\n        classes.push('is-new');\r\n        if (newFlashCount < 4) { classes.push('is-flash'); newFlashCount++; }\r\n      }\r\n      else if (turn < currentTurn - 1) classes.push('is-read');",
  'js-flash-cap');

// 声明计数器: 在渲染循环外·找 lastTurn 声明处挂上
{
  const decl = /var lastTurn = [^;]+;/.exec(s);
  if (!decl) throw new Error('lastTurn decl not found');
  if (!s.includes('newFlashCount = 0')) {
    s = s.replace(decl[0], decl[0] + ' var newFlashCount = 0;');
    console.log('OK js-counter-decl (after ' + decl[0] + ')');
  }
}

fs.writeFileSync(FILE, s);
console.log('WRITTEN');
