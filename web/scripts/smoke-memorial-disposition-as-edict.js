#!/usr/bin/env node
// smoke-memorial-disposition-as-edict.js — C1 御批处置:玩家批复即处置旨意·如诏令般处理
//   病灶(修前):批复段(tm-endturn-prompt.js:616)只带 from+type+朱批(memRes 无 content)·且仅「让AI知道」告知性·
//   非诏令级强制(诏令段强制落 fiscal/office/personnel_changes + 每道有 shizhengji/shilu 叙事段)。
//   owner 裁定(2026-07-06):朱批时奏折全文要一起带过去·批复能像诏书一样影响推演+进时政记/实录/后人戏说。
//   修=御批处置段:GM.memorials 直取本回合准/驳/批注奏疏·带 title+content 全文+朱批+处置·诏令级强制指令。
//   巨型 prompt 函数难 runtime·走静态契约(同 smoke-renli-reported-fog T9 风范)。
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
let n = 0;
function ok(c, m) { if (!c) { console.error('FAIL: ' + m); process.exit(1); } n++; }

// ── 御批处置段存在·取本回合准/驳/批注奏疏 ──
ok(/var _dispMems = \(GM\.memorials\|\|\[\]\)\.filter/.test(src), '① _dispMems 直取 GM.memorials(非 memRes 投影)');
ok(/m\.turn === GM\.turn/.test(src) && /m\.status==='approved'/.test(src) && /m\.status==='rejected'/.test(src) && /m\.status==='annotated'/.test(src), '② 取本回合 准/驳/批注 奏疏');
ok(/【本回合御批处置——皇帝对臣下奏疏之批复即处置旨意/.test(src), '③ 御批处置段头');

// ── ★奏折全文随朱批一并带过去(owner 本质要点·此前 memRes 无 content) ──
ok(/String\(m\.title\)/.test(src) && /String\(m\.content\)/.test(src), '④ 带奏折 title+content 全文(随行)');
ok(/String\(m\.content\)\.slice\(0,600\)/.test(src) && !/String\(m\.content\)\.slice\(0,120\)/.test(src), '④b content 带足量(600·非120硬截·Codex审后 honor owner「全部带过去」)');
ok(/String\(m\.reply\)/.test(src), '⑤ 带朱批 reply');

// ── ★诏令级强制:结构化落后果(影响推演) ──
ok(/fiscal_adjustments/.test(src.slice(src.indexOf('御批处置'))) && /office_assignments/.test(src.slice(src.indexOf('御批处置'))) && /personnel_changes/.test(src.slice(src.indexOf('御批处置'))), '⑥ 强制据批复落 fiscal/office/personnel_changes(影响推演)');
ok(/准弹劾→查办或罢黜被劾者/.test(src), '⑦ 举例:准弹劾→查办/罢黜(原 C1 目标·今泛化)');

// ── ★进时政记/实录/后人戏说(如诏令之有叙事段) ──
ok(/shizhengji／shilu／后人戏说/.test(src) || (/shizhengji/.test(src) && /shilu/.test(src) && /后人戏说/.test(src)), '⑧ 强制在 shizhengji/shilu/后人戏说 记批复与执行');
ok(/与诏令同等/.test(src), '⑨ 明示「与诏令同等处理」(和诏书一样被处理)');

// ── 旧告知性段已除(不再只带 from+type+朱批) ──
ok(!/var approvedMem = memRes\.filter/.test(src), '⑩ 旧 approvedMem/rejectedMem 告知段已除');
ok(!/rejectedMem/.test(src), '⑪ 无残留 rejectedMem 引用');

// ── reviewMem(留中)保留·未误删 ──
ok(/var reviewMem = memRes\.filter\(function\(m\)\{return m\.status==='pending_review';\}\)/.test(src), '⑫ 留中(reviewMem)段保留未误删');

console.log('[smoke-memorial-disposition-as-edict] pass assertions=' + n);
