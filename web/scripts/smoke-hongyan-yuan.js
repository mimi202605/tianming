#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 鸿雁御案落地 smoke：验证 renderFormalLetterPanel 已换米金 .yan-yuan，且功能属性/动作全保留
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
// 第二十六拆：鸿雁面板整体迁出 phase8-formal-drafts-message-panels.js·本 smoke 检查项全在 sibling
const src = fs.readFileSync(path.join(ROOT, 'phase8-formal-drafts.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'phase8-formal-drafts-message-panels.js'), 'utf8');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); passed += 1; }

// 注入器
assert(src.includes('function installHongyanYuanStyles'), 'installHongyanYuanStyles 注入器缺失');
assert(src.includes('tm-hongyan-yuan-style'), '注入器 style id 缺失');
assert(src.includes('body.tm-phase8-formal .yan-yuan'), 'scoped .yan-yuan CSS 缺失');
// 主渲染换成米金结构
assert(src.includes("'<section class=\"yan-yuan\">'"), 'renderFormalLetterPanel 未输出 .yan-yuan 容器');
assert(src.includes('installHongyanYuanStyles()'), 'renderFormalLetterPanel 未调用注入器');
assert(!src.includes("return '<section class=\"hy-office-v5\">'"), '仍残留 hy-office-v5 主渲染（未换干净）');
// 辅助 helper
['yanContactCard', 'yanTokenBadge', 'yanCipherGauge', 'yanFaceImg', 'yanRouteBlock', 'yanLetterTypeMeta'].forEach(function (fn) {
  assert(src.includes('function ' + fn), 'helper 缺失: ' + fn);
});
// 信卡/来函米金
assert(src.includes('class="lcard '), '信卡未换米金 .lcard');
assert(src.includes('class="incard '), '来函未换米金 .incard');
assert(src.includes('class="contact '), '名册卡未换米金 .contact');
// 立绘
assert(src.includes('class="pt-img"'), '立绘 img 缺失');
assert(src.includes('parentNode.classList.add'), '立绘字形降级 onerror 缺失');
// 功能属性全保留
['letter-send-desk', 'letter-draft-desk', 'letter-memory-desk', 'letter-target-desk', 'letter-multi-toggle-desk', 'letter-filter-desk', 'letter-thread-action-desk'].forEach(function (act) {
  assert(src.includes("'" + act + "'"), 'desk-action 丢失: ' + act);
});
['recall', 'resend-secret', 'resend-fast', 'bypass', 'reply', 'verify', 'excerpt', 'star'].forEach(function (la) {
  assert(src.includes("letterAction:'" + la + "'"), 'letterAction 丢失: ' + la);
});
assert(src.includes('data-letter-draft-field'), 'data-letter-draft-field 丢失');
assert(src.includes('data-desk-letter-search'), '搜索绑定丢失');
assert(src.includes('data-desk-letter-to'), '收信人绑定丢失');
// 复用引擎 helper（未误删）
['getLetters()', 'normalizeLetterPeople()', 'letterPersonCounts(', 'letterFilterMatchFormal(', 'formalIncomingLetters(', 'letterStatusTextFormal('].forEach(function (h) {
  assert(src.includes(h), '引擎 helper 调用丢失: ' + h);
});

console.log('[smoke-hongyan-yuan] PASS ' + passed + ' assertions');
