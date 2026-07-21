#!/usr/bin/env node
// ============================================================
// smoke-transmigration-drawer-close.js — 右栏 drawer X 关闭功能回归
// ------------------------------------------------------------
// 2026-07-21 根治「穿越模式右栏点 X 无法关闭 drawer」bug。
//
// 历史根因:
//   tm-player-rail.js 的 _ensureDrawerDOM 创建 #player-rail-drawer 元素·
//   openDrawer 加 .open class·closeDrawer 移除 .open class。
//   但 tm-transmigration-ui.css 完全未定义 .player-rail-drawer 默认隐藏
//   和 .open 状态切换规则 → drawer 创建后始终可见 → 点 X 移除 .open 无 CSS 效果 →
//   用户感觉「X 无法关闭」。
//
// 修复:
//   CSS 补 .player-rail-drawer { transform: translateX(100%); pointer-events: none; }
//   和 .player-rail-drawer.open { transform: translateX(0); pointer-events: auto; }
//   以及 overlay 默认隐藏 + .open 显示。
//
// 断言:
//   场景 1: CSS 含 .player-rail-drawer 默认 translateX(100%) 规则
//   场景 2: CSS 含 .player-rail-drawer.open 切回 translateX(0) 规则
//   场景 3: CSS 含 overlay 默认隐藏 + .open 显示规则
//   场景 4: closeDrawer 移除 .open class（JS 行为正确·配合 CSS 才有效）
//   场景 5: openDrawer 加 .open class
//   场景 6: badge class 命名对齐 ps-rail-slot-badge（与 CSS 一致）
//   场景 7: renderPlayerState 异常分支不调 renderEmperorState（穿越铁律）
//
// 末尾打印 [smoke-transmigration-drawer-close] PASS · N sub-tests
// ============================================================
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

// ── 源码契约断言（无需 DOM） ────────────────────────────────
var cssSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-transmigration-ui.css'), 'utf8');
var railSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-player-rail.js'), 'utf8');
var shellSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-game-ui-shell.js'), 'utf8');

console.log('── 场景 1-3: CSS drawer 规则存在 ──');

// 场景 1: .player-rail-drawer 默认 translateX(100%)（滑出视口外）
ok('CSS 含 .player-rail-drawer 默认 translateX(100%) 隐藏规则',
   /\.player-rail-drawer\s*\{[^}]*transform:\s*translateX\(100%\)/.test(cssSrc),
   '需 .player-rail-drawer { transform: translateX(100%) }');

// 场景 2: .player-rail-drawer.open 切回 translateX(0)
ok('CSS 含 .player-rail-drawer.open 切回 translateX(0) 显示规则',
   /\.player-rail-drawer\.open\s*\{[^}]*transform:\s*translateX\(0\)/.test(cssSrc),
   '需 .player-rail-drawer.open { transform: translateX(0) }');

// 场景 3a: overlay 默认隐藏
ok('CSS 含 .player-rail-drawer-overlay 默认隐藏规则',
   /\.player-rail-drawer-overlay\s*\{[^}]*(?:visibility:\s*hidden|opacity:\s*0)/.test(cssSrc),
   '需 .player-rail-drawer-overlay { visibility: hidden 或 opacity: 0 }');

// 场景 3b: overlay.open 显示
ok('CSS 含 .player-rail-drawer-overlay.open 显示规则',
   /\.player-rail-drawer-overlay\.open\s*\{[^}]*(?:visibility:\s*visible|opacity:\s*1)/.test(cssSrc),
   '需 .player-rail-drawer-overlay.open { visibility: visible 或 opacity: 1 }');

console.log('── 场景 4-5: JS openDrawer/closeDrawer 行为 ──');

// 场景 4: closeDrawer 移除 .open class
ok('closeDrawer 实现移除 .open class',
   /function closeDrawer\(\)\s*\{[\s\S]*?classList\.remove\(['"]open['"]\)/.test(railSrc),
   'closeDrawer 须调 classList.remove(\'open\')');

// 场景 5: openDrawer 加 .open class
ok('openDrawer 实现加 .open class',
   /function openDrawer\([\s\S]*?\)\s*\{[\s\S]*?classList\.add\(['"]open['"]\)/.test(railSrc),
   'openDrawer 须调 classList.add(\'open\')');

// 场景 6: badge class 命名对齐 ps-rail-slot-badge（与 CSS 已定义的 .ps-rail-slot-badge 对齐）
ok('rail 输出 badge class 为 ps-rail-slot-badge（与 CSS 对齐）',
   railSrc.indexOf('ps-rail-slot-badge') >= 0 && railSrc.indexOf('ps-rail-badge') < 0,
   'rail 须用 ps-rail-slot-badge·不再用 ps-rail-badge');

console.log('── 场景 7: renderPlayerState 异常不降级皇帝御案（穿越铁律） ──');

// 场景 7a: renderPlayerState 异常分支（catch 块）不调 renderEmperorState
// 抓 renderPlayerState 函数体（从 function 到下一个 function renderEmperorState）
// 注意：函数开头 `if (!window.TM || !TM.PlayerUI) return renderEmperorState()` 是 PlayerUI 完全缺席时的合理降级·保留
//       此处只断言 catch 块（异常分支）不再调 return renderEmperorState()
var renderPlayerStateMatch = shellSrc.match(/function renderPlayerState\(\)\s*\{[\s\S]*?(?=function renderEmperorState\(\))/);
var catchBlockMatch = renderPlayerStateMatch && renderPlayerStateMatch[0].match(/catch\(_e\)\s*\{[\s\S]*?\}\s*\}/);
ok('renderPlayerState catch 块不调 return renderEmperorState（穿越铁律）',
   catchBlockMatch && catchBlockMatch[0].indexOf('return renderEmperorState()') < 0,
   'catch 块须不再调 return renderEmperorState()·改为渲染异常占位');

// 场景 7b: 异常分支渲染「穿越模式 UI 异常」占位
ok('renderPlayerState 异常分支渲染「穿越模式 UI 异常」占位',
   renderPlayerStateMatch && renderPlayerStateMatch[0].indexOf('穿越模式 UI 异常') >= 0,
   '须渲染友好占位提示·不降级皇帝御案');

console.log('── 场景 8: PlayerUI 顶栏/左栏/右栏不再新旧双写 ──');

var uiRenderSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-player-ui-render.js'), 'utf8');

// 场景 8a: renderTopBar 调 PlayerShell.renderTopBar 成功后 early-return
ok('renderTopBar 调 PlayerShell 后 early-return（不再双写）',
   /function renderTopBar\(\)\s*\{[\s\S]*?PlayerShell\.renderTopBar\(\);\s*return;/.test(uiRenderSrc),
   'renderTopBar 须在 PlayerShell 成功后 return·不再写旧 #bar-player-identity');

// 场景 8b: renderLeftTabs 同上
ok('renderLeftTabs 调 PlayerShell 后 early-return（不再双写）',
   /function renderLeftTabs\(\)\s*\{[\s\S]*?PlayerShell\.renderLeftTabs\(\);\s*return;/.test(uiRenderSrc),
   'renderLeftTabs 须在 PlayerShell 成功后 return·不再写旧 #player-left-tabs');

// 场景 8c: renderRightPanel 同上
ok('renderRightPanel 调 PlayerShell 后 early-return（不再双写）',
   /function renderRightPanel\(\)\s*\{[\s\S]*?PlayerShell\.renderRightRail\(\);\s*return;/.test(uiRenderSrc),
   'renderRightPanel 须在 PlayerShell 成功后 return·不再写旧 #player-right-panel');

console.log('── 场景 9: 节气 mon=1/2 不再越界 ──');

var playerShellSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-player-shell.js'), 'utf8');
var playerCoreSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-player-core.js'), 'utf8');

// 场景 9a: tm-player-shell.js 节气冬季分支用 (mon===12?0:mon) 而非 (mon===12?0:mon+1)
ok('tm-player-shell.js 节气冬季分支用 (mon===12?0:mon)（不再越界）',
   /var wi = \(mon === 12 \? 0 : mon\)/.test(playerShellSrc),
   '须用 (mon === 12 ? 0 : mon)·mon=1→wi=1→仲冬·mon=2→wi=2→季冬');

// 场景 9b: tm-player-core.js 同步修复
ok('tm-player-core.js 节气冬季分支同步修复',
   /var _wi=\(_mon===12\?0:_mon\)/.test(playerCoreSrc),
   '皇帝模式源逻辑也须同步修');

console.log('── 场景 10: PANEL_METHOD_MAP 补全 + FRIENDLY_FALLBACK 扩展 ──');

var adapterSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-player-systems-adapter.js'), 'utf8');

// 场景 10a: PlayerSkill/Economy/Industry/PrivateArmy 都登记 renderPanel
['PlayerSkill', 'PlayerEconomy', 'PlayerIndustry', 'PlayerPrivateArmy'].forEach(function (k) {
  ok('PANEL_METHOD_MAP 含 ' + k + ': \'renderPanel\'',
     new RegExp(k + ":\\s*'renderPanel'").test(adapterSrc),
     'PANEL_METHOD_MAP 须登记 ' + k + '·否则退化到 getState JSON dump');
});

// 场景 10b: FRIENDLY_FALLBACK 含 PlayerMemorial / PlayerOffice
ok('FRIENDLY_FALLBACK 含 PlayerMemorial（友好占位）',
   /PlayerMemorial:\s*\{[\s\S]*?hint:/.test(adapterSrc),
   '未实现的 PlayerMemorial 须走友好占位·不显示「待接入」');

ok('FRIENDLY_FALLBACK 含 PlayerOffice（友好占位）',
   /PlayerOffice:\s*\{[\s\S]*?hint:/.test(adapterSrc),
   '未实现的 PlayerOffice 须走友好占位·不显示「待接入」');

// 场景 10c: _friendlyFallback 不再输出 player-block-soon-title（避免与 _wrapBlock 重复）
// 检查 _friendlyFallback 函数体不含该 class 的 HTML 输出（注释忽略）
var friendlyFallbackMatch = adapterSrc.match(/function _friendlyFallback\([\s\S]*?\)\s*\{[\s\S]*?return h;\s*\}/);
ok('_friendlyFallback 不再输出 player-block-soon-title HTML（避免标题重复）',
   friendlyFallbackMatch && friendlyFallbackMatch[0].indexOf("'player-block-soon-title'") < 0
     && friendlyFallbackMatch[0].indexOf('"player-block-soon-title"') < 0,
   '标题由外层 _wrapBlock 统一处理·_friendlyFallback 只输出 hint');

console.log('── 场景 11: role 中文化 + NaN 兜底 ──');

// 场景 11a: ROLE_LABELS 定义
ok('tm-player-shell.js 定义 ROLE_LABELS 中文化表',
   /var ROLE_LABELS\s*=\s*\{/.test(playerShellSrc) && playerShellSrc.indexOf('minister: \'朝臣\'') >= 0,
   '须定义 ROLE_LABELS·避免顶栏 chip 显示英文 role key');

// 场景 11b: _renderBarStats 兜底 NaN
ok('_renderBarStats 兜底 NaN/Infinity（不泄漏到 UI）',
   /typeof val === 'number' && !isFinite\(val\)/.test(playerShellSrc),
   '须加 typeof val === \'number\' && !isFinite(val) → 显示「—」');

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-drawer-close] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-drawer-close] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
