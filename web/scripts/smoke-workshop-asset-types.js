#!/usr/bin/env node
// smoke-workshop-asset-types.js — 工坊四类接口·批Ⅱ/Ⅲ/Ⅳ防腐线（2026-07-22）：
// 刀A=网页发资产包 zip 内置 manifest.json（桌面 validateWorkshopPack 强制要求·旧裸 zip 装不上）·
//    id 与服务器同规则预生成·files 带真实文件名（BGM 生效链靠它定位曲目）；
// 刀B=桌面端已装 type=music 工坊包经 tm-content:// 协议并入 BGM 轮播·loadPlaylist 重建保工坊轨；
// 批Ⅲ=编辑器出品幕指路游戏内工坊发资产包（案台剧本专营·不重复建设）；
// 批Ⅳ=编辑器橱窗四类页签（剧本默认·mod 有货才现签）+资产包详情清单行。

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0;
function assert(cond, msg) {
  if (cond) { A++; console.log('  PASS ' + msg); }
  else { F++; console.log('  FAIL ' + msg); }
}

console.log('smoke-workshop-asset-types');

// ── 刀A：manifest 入包（tm-content-manager.js）──
const cm = fs.readFileSync(path.join(ROOT, 'tm-content-manager.js'), 'utf8');
assert(/entries\.unshift\(\{ name: 'manifest\.json'/.test(cm), '发布 zip 内置 manifest.json（桌面安装器硬要求）');
assert(/packIdSlug = String\(title\)\.trim\(\)\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9_\\-\]\+\/g, '-'\)/.test(cm),
  'id 预生成与服务器同规则（slug 一致·装载可覆盖更新）');
assert(/files: files\.map\(function\(f\)\{ return String\(f\.name\); \}\)/.test(cm),
  'manifest.files 带真实文件名（含扩展名·曲目定位用）');
assert(/id: packIdSlug,\s*\n\s*version:/.test(cm.replace(/title: title,\s*\n\s*/g, '')) || /title: title, id: packIdSlug/.test(cm),
  'meta.id 与 manifest.id 对齐（服务器包 id=本地安装 id）');
assert(/packageKind: 'store-zip'/.test(cm), 'packageKind 标注 store-zip（服务器 v2 入库）');

// ── 刀B：BGM 工坊轨（tm-audio-theme.js）──
const au = fs.readFileSync(path.join(ROOT, 'tm-audio-theme.js'), 'utf8');
assert(/loadWorkshopTracks: function/.test(au), 'loadWorkshopTracks 生效函数在');
assert(/tm-content:\/\/workshop\/' \+ encodeURIComponent\(p\.id\) \+ '\/manifest\.json/.test(au),
  '经 tm-content 协议读 manifest（零新 IPC）');
assert(/p\.type === 'music' && p\.enabled !== false/.test(au), '只并入已启用的 music 类包');
assert(/\/\\\.\(mp3\|ogg\|wav\)\$\/i/.test(au), '曲目按音频扩展名过滤（与主进程 ALLOWED_PACK_EXTS 同族）');
assert(/t && \(t\.user \|\| t\.workshop\)/.test(au), 'loadPlaylist 重建时保工坊轨（与导入轨同命·不被冲掉）');
assert(/this\.loadWorkshopTracks\(function/.test(au), 'init 接线（异步就绪后刷新音声面板）');
assert(/workshop: true/.test(au), '工坊轨带 workshop 标（区别内置/导入）');

// ── 批Ⅲ：出品幕指路（adapters）──
const ad = fs.readFileSync(path.join(ROOT, 'preview', 'scenario-editor-reset-adapters.js'), 'utf8');
assert(/发音乐 \/ 立绘 \/ 地图资产包？/.test(ad) && /tmOpenWorkshop=1/.test(ad),
  '出品幕资产包指路（复用 tmOpenWorkshop 入口参数）');

// ── 批Ⅳ：橱窗四类页签（adapters）──
assert(/catType: 'scenario'/.test(ad), '初始态默认剧本签');
assert(/\['scenario', '剧本'\], \['portrait', '立绘'\], \['music', '音乐'\], \['map', '地图'\]/.test(ad),
  '四类页签（mod 缓议·目录真有货才现签）');
assert(/p && p\.type === 'mod';.*_typeTabs\.push\(\['mod', 'MOD'\]\)/s.test(ad), 'mod 签按需出现');
assert(/String\(p\.type \|\| 'scenario'\) === ct/.test(ad), 'catList 按签过滤');
assert(/act === 'cat-type'/.test(ad), '页签点击接线');
assert(/\{ music: '曲目', portrait: '立绘', map: '图幅' \}/.test(ad), '资产包详情清单行（服务器 v2 assets 点亮）');
assert(/这一类还没有上架条目/.test(ad), '资产签空态文案指路发布');
assert(!/橱窗只列剧本类/.test(ad), '旧「只列剧本」过滤已退役（收全类）');

console.log('smoke-workshop-asset-types ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
