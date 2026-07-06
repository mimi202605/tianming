#!/usr/bin/env node
// smoke-social-nav-promote.js — 社交层可发现性:擂台/约稿 从别 pane 底部升为一级 nav tab
//   病灶:arenas/commissions 服务端+客户端全接线·却嵌在 renderRanksPane / renderStudioPane 尾部
//   无独立入口·玩家滚不到。修=navItems 加两项 + renderMallPane 加两条路由 + 从父 pane 摘掉嵌套。
//   tm-content-manager.js DOM/state 深耦合·遵既有约定(smoke-content-manager-workshop-fullpage)走静态契约断言。
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const manager = fs.readFileSync(path.join(ROOT, 'tm-content-manager.js'), 'utf8');
const verifyAll = fs.readFileSync(path.join(ROOT, 'scripts/verify-all.js'), 'utf8');
let n = 0;
function ok(cond, msg) { assert(cond, msg); n++; }

// ── nav 定义:擂台/约稿 已入一级导航 ──
ok(/\['arenas',\s*'擂台'\]/.test(manager), '① navItems 含一级 tab「擂台」(arenas)');
ok(/\['commissions',\s*'约稿'\]/.test(manager), '② navItems 含一级 tab「约稿」(commissions)');

// ── 路由:renderMallPane 分派新 pane 到既有 section 渲染器 ──
ok(/if \(pane === 'arenas'\) return renderArenaSection\(\);/.test(manager), '③ renderMallPane 路由 arenas→renderArenaSection');
ok(/if \(pane === 'commissions'\) return renderCommissionSection\(\);/.test(manager), '④ renderMallPane 路由 commissions→renderCommissionSection');

// ── section 渲染器仍在(自带 sec-h 标题·可独立成 pane) ──
ok(/function renderArenaSection\(\)/.test(manager), '⑤ renderArenaSection 定义仍在');
ok(/function renderCommissionSection\(\)/.test(manager), '⑥ renderCommissionSection 定义仍在');
ok(/<h3>擂台 · 同台竞史<\/h3>/.test(manager), '⑦ 擂台 section 自带标题(独立成 pane 不塌)');
ok(/<h3>约稿墙 · 求贤<\/h3>/.test(manager), '⑧ 约稿 section 自带标题(独立成 pane 不塌)');

// ── 父 pane 已摘掉嵌套 trailer(防再被塞回底部隐身) ──
ok(!manager.includes("'</div>' +\n      renderArenaSection();"), '⑨ renderRanksPane 不再尾挂 renderArenaSection(擂台已独立)');
ok(!/\+\s*\n\s*renderCommissionSection\(\);/.test(manager), '⑩ renderStudioPane 不再尾挂 renderCommissionSection(约稿已独立)');

// ── 「我的合集」：在「我」页策展管理·复用现成 openCollection ──
ok(/function loadMyCollections\(\)/.test(manager), '⑪ loadMyCollections 定义');
ok(/function renderMyCollections\(\)/.test(manager), '⑫ renderMyCollections 定义');
ok(/function createMyCollectionUI\(\)/.test(manager), '⑬ createMyCollectionUI 定义');
// 关键:走服务端 collections(?ownerId) 按主人筛(selfId)·非 nick 匹配脏招
ok(/TM\.OnlineClient\.collections\(uid,/.test(manager) && /var uid = selfId\(\);/.test(manager), '⑭ loadMyCollections 用 selfId 走 collections(ownerId) 服务端筛');
// 「我」页 home tab 已挂入我的合集段
ok(/策展 · 我的合集<\/h3><\/div>'\s*\+\s*renderMyCollections\(\)/.test(manager), '⑮ 「我」页 home tab 渲染我的合集段');
ok(/createMyCollectionUI: createMyCollectionUI/.test(manager), '⑯ createMyCollectionUI 已导出(onclick 可达)');

// ── 回归门登记 ──
ok(verifyAll.includes('smoke-social-nav-promote.js'), '⑰ verify-all 已登记本 smoke');

console.log('[smoke-social-nav-promote] pass assertions=' + n);
