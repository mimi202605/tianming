#!/usr/bin/env node
'use strict';
// smoke-divergence-ledger — 刀D·「史实注定死」降级为「史实锚点」+ 分歧账 V1
//   机制：史实知识转存 GM.histAnchors(认知背景·不杀人)·_tcAppendDivergence 把「史载已故而本局
//   仍在世」的分歧喂给 AI 时空约束(读锚点·文案中立·以本局为准)。合成 fixture 测机制·不依赖运行时。
//   ① 魏在世+turn≥3 → 分歧条目出现且含「以本局为准」   ② 魏已死 → 不出该条目
//   ③ 无 histAnchors 老剧本 → 零条目零报错             ④ clauseOnly → 无逐条名单·压成一句
//   ⑤ 官方剧本真源 JSON：rigidHistoryEvents 已无那 2 条 + histAnchors 存在(读真源断言)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');           // web/
const REPO = path.resolve(ROOT, '..');                // 仓根
let A = 0;
function ok(c, m) { if (!c) throw new Error('assert failed -> ' + m); A++; console.log('  ✓ ' + m); }
function sliceFn(src, marker) {
  const a = src.indexOf(marker); if (a < 0) return null;
  let i = src.indexOf('{', a), d = 0, j = i;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return src.slice(a, j);
}

console.log('smoke-divergence-ledger');

// —— 抽取 _tcAppendDivergence 本体(安家于 tm-history-events.js·史实域) ——
const hist = fs.readFileSync(path.join(ROOT, 'tm-history-events.js'), 'utf8');
const divSrc = sliceFn(hist, 'function _tcAppendDivergence');
ok(!!divSrc, '_tcAppendDivergence 抽取成功');

// 隔离跑：findCharByName/_rigidFindChar 缺位(typeof 守卫)→回落 GM.chars 线性查·vm 无害
function runDiv(gm, clauseOnly) {
  const lines = [];
  const ctx = { GM: gm };
  vm.createContext(ctx);
  vm.runInContext(divSrc + '\nthis.f = _tcAppendDivergence;', ctx);
  ctx.f(lines, !!clauseOnly);
  return lines;
}

const weiAnchor = { id: 'ha_weizhongxian', name: '魏忠贤', histTurn: 3, histDate: '天启七年十一月', fate: '自缢身亡', kind: 'death' };
const keAnchor  = { id: 'ha_keshi', name: '客氏', histTurn: 4, histDate: '天启七年十一月', fate: '杖毙', kind: 'death' };
const WEI = '魏忠贤';   // 魏忠贤
const YIBEN = '以本局为准'; // 以本局为准

// ① 魏在世 + turn≥3 → 出条目·含「以本局为准」
var g1 = { turn: 5, histAnchors: [weiAnchor, keAnchor], chars: [{ name: WEI, alive: true }, { name: '客氏', alive: false, dead: true }] };
var L1 = runDiv(g1, false);
ok(L1.some(function (l) { return l.indexOf(WEI) >= 0 && l.indexOf(YIBEN) >= 0; }), '① 魏在世+turn≥3 → 分歧条目出现且含「以本局为准」');
ok(L1.every(function (l) { return l.indexOf('客氏') < 0; }), '① 客氏已死 → 不出其条目(与史实同向)');

// ② 魏已死 → 不出该条目(本局已按别法了结·与史实同向)
var g2 = { turn: 5, histAnchors: [weiAnchor], chars: [{ name: WEI, alive: false, dead: true }] };
var L2 = runDiv(g2, false);
ok(L2.every(function (l) { return l.indexOf(WEI) < 0; }), '② 魏已死 → 不出该分歧条目');

// ②b 未到史实原线之回合(turn<histTurn) → 尚不构成分歧
var g2b = { turn: 2, histAnchors: [weiAnchor], chars: [{ name: WEI, alive: true }] };
ok(runDiv(g2b, false).length === 0, '②b turn<histTurn → 未到史实原线之时·零条目');

// ②c 查无此人(锚点点名者不在册) → 不臆断·不出条目
var g2c = { turn: 5, histAnchors: [weiAnchor], chars: [{ name: '张三', alive: true }] };
ok(runDiv(g2c, false).length === 0, '②c 查无此人 → 不臆断·零条目');

// ③ 无 histAnchors 老剧本 → 零条目零报错
var okNoThrow = true, L3 = [];
try { L3 = runDiv({ turn: 9, chars: [{ name: WEI, alive: true }] }, false); } catch (e) { okNoThrow = false; }
ok(okNoThrow && L3.length === 0, '③ 无 histAnchors 老剧本 → 零条目零报错');
var okEmpty = true, L3b = [];
try { L3b = runDiv({ turn: 9, histAnchors: [], chars: [] }, false); } catch (e) { okEmpty = false; }
ok(okEmpty && L3b.length === 0, '③b histAnchors=[] → 零条目零报错');

// ④ clauseOnly → 无逐条名单·压成一句总纲
var L4 = runDiv(g1, true);
ok(L4.length === 1, '④ clauseOnly → 只一条(压成一句总纲)');
ok(L4[0].indexOf('· ' + WEI) < 0, '④ clauseOnly → 无逐条姓名名单段(不含「· 魏忠贤」)');
ok(L4[0].indexOf(YIBEN.slice(1)) >= 0 || L4[0].indexOf('以本局 GM') >= 0, '④ clauseOnly 总纲仍归「以本局为准」');

// ④b cap 8：给 10 个在世死亡锚点·只出 8 条(+ 1 表头)
var many = [], chMany = [];
for (var k = 0; k < 10; k++) { var nm = 'N' + k; many.push({ id: 'a' + k, name: nm, histTurn: 1, histDate: 'X', fate: 'Y', kind: 'death' }); chMany.push({ name: nm, alive: true }); }
var L4c = runDiv({ turn: 9, histAnchors: many, chars: chMany }, false);
ok(L4c.length === 1 + 8, '④b cap 8 → 表头 + 最多 8 条');

// ⑤ 官方剧本真源 JSON：rigidHistoryEvents 已无那 2 条 + histAnchors 存在
var scRaw = fs.readFileSync(path.join(REPO, 'scenarios', '天启七年·九月（官方）.json'), 'utf8');
var sc = JSON.parse(scRaw);
ok(Array.isArray(sc.rigidHistoryEvents) && sc.rigidHistoryEvents.length === 0, '⑤ 真源 JSON：rigidHistoryEvents 已为空数组');
ok(scRaw.indexOf('rh_weiSuicide') < 0 && scRaw.indexOf('rh_keshiDie') < 0, '⑤ 真源 JSON：rh_weiSuicide / rh_keshiDie 已无残留');
ok(Array.isArray(sc.histAnchors) && sc.histAnchors.length === 2, '⑤ 真源 JSON：histAnchors 存在且为 2 条');
ok(sc.histAnchors.every(function (a) { return a && a.kind === 'death' && a.name && typeof a.histTurn === 'number'; }), '⑤ histAnchors 字段齐(kind/name/histTurn)');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
