#!/usr/bin/env node
'use strict';
/* smoke-bgm-import — 设置·声乐「导入音乐」功能源契约:
 * AudioSystem 加 importUserMusic/loadUserTracks/removeUserTrack/_openUserBgmDB/_pickMusicFiles;
 * 音乐文件大→存 IndexedDB(tmUserBgm/tracks blob)跨会话持久·每次加载 object URL 接入 playlist;
 * init 恢复·面板加「导入音乐」按钮 + 导入轨可删(✕)。DOM/IndexedDB 行为已真浏览器端到端验证(导入/持久/复原/删除)·此 smoke 守接线防腐。 */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'tm-audio-theme.js'), 'utf8');
let A = 0, F = 0; function ok(c, m) { if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-bgm-import');

// 方法存在
['importUserMusic', 'loadUserTracks', 'removeUserTrack', '_openUserBgmDB', '_pickMusicFiles'].forEach(function (fn) {
  ok(new RegExp('\\b' + fn + ':\\s*function').test(src), '方法存在: ' + fn);
});
// IndexedDB blob 存储(不进 localStorage)
ok(/indexedDB\.open\('tmUserBgm'/.test(src), 'IndexedDB 库 tmUserBgm');
ok(/createObjectStore\('tracks', \{ keyPath: 'id' \}\)/.test(src), 'objectStore tracks(keyPath id)');
// 导入:过滤音频 + 即时 object URL + 持久 blob
ok(/\/\^audio\\\//.test(src) && /mp3\|ogg\|wav/.test(src), 'importUserMusic 过滤 audio/* 或扩展名');
ok(/URL\.createObjectURL\(m\.file\)/.test(src) && /store\.put\(\{ id: m\.id[^}]*blob: m\.file/.test(src), '导入:object URL 即时接入 + IndexedDB 存 blob');
ok(/replace\(\/\[<>"\]\/g/.test(src), '导入标题 sanitize(剥 <>")防 HTML 注入');
// 恢复:init 调 loadUserTracks·从 getAll 重建 object URL
ok(/this\.loadUserTracks\(/.test(src) && /this\.loadPlaylist\(\);/.test(src), 'init 在 loadPlaylist 后调 loadUserTracks');
ok(/getAll\(\)/.test(src) && /URL\.createObjectURL\(rec\.blob\)/.test(src), 'loadUserTracks 从 IndexedDB getAll 重建 object URL');
// 删除:撤 URL + 删 IndexedDB + 出 playlist
ok(/URL\.revokeObjectURL\(t\.src\)/.test(src) && /objectStore\('tracks'\)\.delete\(id\)/.test(src), 'removeUserTrack 撤 URL + 删 IndexedDB');
ok(/return x\.id !== id/.test(src), 'removeUserTrack 出 playlist');
// 面板 UI:导入按钮 + 导入轨 ✕
ok(/_pickMusicFiles\(\);">导 入 音 乐<\/button>/.test(src), '面板「导入音乐」按钮接 _pickMusicFiles');
ok(/track\.user \? '<button class="gs-audio-del"/.test(src) && /removeUserTrack\(/.test(src), '导入轨渲染 ✕ 删除钮(仅 user 轨)');

console.log('\nsmoke-bgm-import ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + '/' + (A + F));
process.exit(F === 0 ? 0 : 1);
