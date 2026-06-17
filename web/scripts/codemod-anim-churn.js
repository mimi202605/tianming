// perf round6 (2026-06-10): 常驻动画churn三刀
//
// Tracing 实证：游戏内发呆 6s·主线程 Layerize 2545ms + UpdateLayoutTree 987ms
// ≈60% 主线程被动画烧掉；全动画暂停后归零(6ms/0/16ms)。
// 活体普查(document.getAnimations)：churn 主力 = tmv3-flash ×74
// (事件feed每条 is-new 的 ::before 金线无限闪·每条提为独立合成层→74层逐帧重组)。
//
// E1: tmv3-flash infinite → 8 次(≈19s 提醒后停在 0% 暗线·feed 重渲会重新闪一轮)
// E2: 闭合抽屉内动画一律暂停(content-visibility 跳渲染但动画仍 tick·классика gs-* 残余)
// E3: 9 个 install*Styles 每次无条件重写 st.textContent(=整张样式表重解析+全文档样式重算)
//     → 幂等化：串没变不碰 DOM
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function mustReplaceOnce(src, find, repl, name) {
  const n = src.split(find).length - 1;
  if (n !== 1) { throw new Error('ANCHOR ' + name + ': expected 1, got ' + n); }
  return src.replace(find, repl);
}

// ---- E1 + E2 (bridge) ----
{
  const f = path.join(ROOT, 'phase8-formal-bridge.js');
  let s = fs.readFileSync(f, 'utf8');
  s = mustReplaceOnce(s,
    'animation:tmv3-flash 2.4s ease-in-out infinite;',
    'animation:tmv3-flash 2.4s ease-in-out 8;',
    'E1-tmv3-flash-finite');
  s = mustReplaceOnce(s,
    "'body.tm-phase8-formal #drawerRight.gs-drawer.right:not(.open) .gs-drawer-body,body.tm-phase8-formal #drawerLeft.gs-drawer.left:not(.open) .gs-drawer-body{content-visibility:auto;}',",
    "'body.tm-phase8-formal #drawerRight.gs-drawer.right:not(.open) .gs-drawer-body,body.tm-phase8-formal #drawerLeft.gs-drawer.left:not(.open) .gs-drawer-body{content-visibility:auto;}',\n      'body.tm-phase8-formal #drawerRight.gs-drawer.right:not(.open) .gs-drawer-body *,body.tm-phase8-formal #drawerLeft.gs-drawer.left:not(.open) .gs-drawer-body *{animation-play-state:paused!important;}',",
    'E2-closed-drawer-anim-pause');
  fs.writeFileSync(f, s);
  console.log('OK E1+E2 bridge');
}

// ---- E3: install*Styles 幂等化 ----
// 模式: st.textContent = [ ...行... ].join('\n');
// → var __css = [...].join('\n'); if (st.__tmCss !== __css) { st.__tmCss = __css; st.textContent = __css; }
const E3_TARGETS = [
  ['phase8-formal-bridge.js', ['installTopbarExactStyles', 'installActionEntryExactStyles', 'installFormalVisibilityStyles']],
  ['phase8-formal-drafts.js', ['installDeskPanelExactStyles', 'installActionPanelExactStyles', 'installEdictYuanStyles', 'installMemorialYuanStyles', 'installHongyanYuanStyles']],
  ['phase8-formal-records.js', ['installShiguanYuanStyles']]
];
for (const [file, fns] of E3_TARGETS) {
  const f = path.join(ROOT, file);
  let s = fs.readFileSync(f, 'utf8');
  for (const fn of fns) {
    const fnIdx = s.indexOf('function ' + fn + '(');
    if (fnIdx < 0) throw new Error('E3: function not found ' + fn);
    // 在函数体内找赋值起点(支持 st.textContent = [ / st.textContent = '...')
    const assignIdx = s.indexOf('st.textContent = ', fnIdx);
    if (assignIdx < 0 || assignIdx - fnIdx > 4000) throw new Error('E3: assignment not found in ' + fn);
    // 找赋值语句结束: 从赋值起点起的第一个 ';\n' 不可靠(css 字符串含;)
    // 数组式以 ].join('\n'); 或 ].join(''); 收尾·字符串式以 ';\n' 收尾且后面紧跟 '  }' 或换行
    let endIdx = -1;
    const joinRe = /\]\s*\.join\((?:'\\n'|''|"\\n"|"")\);/g;
    joinRe.lastIndex = assignIdx;
    const jm = joinRe.exec(s);
    if (jm && jm.index - assignIdx < 60000) {
      endIdx = jm.index + jm[0].length;
    } else {
      throw new Error('E3: join terminator not found for ' + fn);
    }
    const stmt = s.slice(assignIdx, endIdx);
    const newStmt = stmt.replace('st.textContent = ', 'var __css = ') +
      ' if (st.__tmCss !== __css) { st.__tmCss = __css; st.textContent = __css; }';
    s = s.slice(0, assignIdx) + newStmt + s.slice(endIdx);
    console.log('OK E3 ' + file + ' :: ' + fn);
  }
  fs.writeFileSync(f, s);
}
console.log('ALL WRITTEN');
