#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验证「整体颁行诏书」：润色采用后作为一道完整诏书整体推演·不拆进政令类。
// 覆盖三情形：不润色(分类)/润色留档(draft)/润色采用(promulgated)。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const drafts = fs.readFileSync(path.join(ROOT, 'phase8-formal-drafts.js'), 'utf8');
const prep = fs.readFileSync(path.join(ROOT, 'tm-endturn-prep.js'), 'utf8');
const prompt = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');

let passed = 0;
function assert(cond, msg) { if (!cond) { console.error('FAIL: ' + msg); process.exit(1); } passed++; }

// ── 源码契约 ──
// applyFormalPolishedEdict：颁行时不再把全文灌进政令(edict-pol)·改为清空五类
const apf = drafts.slice(drafts.indexOf('function applyFormalPolishedEdict'), drafts.indexOf('function formalEdictDraftValue'));
assert(apf.indexOf("syncFormalEdictDraft('edict-pol', text)") < 0, 'applyFormalPolishedEdict 不应再把诏书全文写进政令(edict-pol)');
assert(/\['edict-pol', 'edict-mil', 'edict-dip', 'edict-eco', 'edict-oth'\]\.forEach/.test(apf), 'applyFormalPolishedEdict 应清空全部五类草拟');
assert(apf.indexOf("mode !== 'replace'") >= 0, '仅 replace(颁行天下) 触发·留档(keep)不动分类草拟');

// prep：从本回合 promulgated 诏书注入 edicts.decree·并入 allEdictText
assert(prep.indexOf("e.status === 'promulgated'") >= 0, 'prep 按 status=promulgated 过滤本回合颁行诏书');
assert(/if \(_thisTurnPromulgated\.length > 0\)[\s\S]{0,260}edicts\.decree = _decreeText/.test(prep), 'prep 应据本回合颁行诏书注入 edicts.decree');
assert(prep.indexOf('edicts.other, edicts.decree].join') >= 0, 'allEdictText 应并入 edicts.decree(供任命/钱粮/军务提取器通览)');
assert(prep.indexOf("edicts.decree ? '诏书'") >= 0, '_edictCategory 应识别诏书类');

// prompt：edicts.decree 作为一道「颁行诏书·全文」整块渲染·并计入 _hasEdicts
assert(prompt.indexOf('|| edicts.decree') >= 0, '_hasEdicts 应计入 edicts.decree');
assert(prompt.indexOf('【颁行诏书·全文】') >= 0, 'prompt 应把诏书全文作为一道完整诏书整块下达');
assert(/【颁行诏书·全文】[\s\S]{0,300}office_assignments/.test(prompt), 'prompt 应提示 AI 通览全文识别任命/钱粮等各项');

// ── 三情形行为（复刻 prep 的过滤+注入逻辑）──
function injectDecree(GM, edicts) {
  var promulgated = (GM.edicts || []).filter(function (e) { return e && typeof e === 'object' && e.turn === GM.turn && e.status === 'promulgated'; });
  if (promulgated.length > 0) {
    var t = promulgated.map(function (e) { return String((e && e.text) || '').trim(); }).filter(Boolean).join('\n\n');
    if (t) edicts.decree = t;
  }
  return edicts;
}
// 情形1：不润色·直接按分类
var e1 = injectDecree({ turn: 5, edicts: [] }, { political: '着户部清丈田亩', military: '', diplomatic: '', economic: '', other: '' });
assert(!e1.decree && e1.political === '着户部清丈田亩', '情形1·不润色：无 decree·政令各归其类');
// 情形2：润色留档(手稿入档·status=draft)·分类仍生效
var e2 = injectDecree({ turn: 5, edicts: [{ turn: 5, status: 'draft', text: '（润色留档稿）' }] }, { political: '着户部清丈田亩', military: '着兵部核九边军饷', diplomatic: '', economic: '', other: '' });
assert(!e2.decree, '情形2·润色留档(draft)：不注入 decree');
assert(e2.political && e2.military, '情形2·留档：原分类草拟保留·分别推演');
// 情形3：润色采用(颁行天下·status=promulgated)·整体一道诏书
var e3 = injectDecree({ turn: 5, edicts: [{ turn: 5, status: 'promulgated', text: '奉天承运皇帝诏曰：着户部清丈田亩，着兵部核九边军饷……布告天下。' }] }, { political: '', military: '', diplomatic: '', economic: '', other: '' });
assert(e3.decree && e3.decree.indexOf('清丈田亩') >= 0 && e3.decree.indexOf('核九边军饷') >= 0, '情形3·颁行：整道诏书全文注入 decree(含原军务/政务)');
assert(!e3.political && !e3.military, '情形3·颁行：不再拆进政令/军令类');
// 情形3b：上一回合的颁行诏书不串本回合
var e3b = injectDecree({ turn: 6, edicts: [{ turn: 5, status: 'promulgated', text: '旧诏' }] }, { political: '', military: '', diplomatic: '', economic: '', other: '' });
assert(!e3b.decree, '情形3b·跨回合：上回合颁行诏书不注入本回合');

console.log('[smoke-edict-decree-whole] PASS ' + passed + ' assertions');
