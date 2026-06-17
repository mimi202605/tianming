#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'phase8-formal-drafts.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

function sliceBetween(startNeedle, endNeedle) {
  const start = src.indexOf(startNeedle);
  const end = endNeedle ? src.indexOf(endNeedle, start + startNeedle.length) : -1;
  assert(start >= 0, `${startNeedle} missing`);
  return src.slice(start, end >= 0 ? end : undefined);
}

const panel = sliceBetween('function renderFormalLetterPanel()', 'function formalGroupBy');
const inbox = sliceBetween('function renderFormalInboxItem(item)', 'function renderFormalLetterCard');
const card = sliceBetween('function renderFormalLetterCard(l, targetName)', 'function renderFormalLetterPanel');
const styles = sliceBetween('function installActionPanelExactStyles()', 'function actionShell');

assert(src.includes('function fullHongyanText('), 'full Hongyan text helper is missing');
assert(styles.includes('.hy-fulltext-v5'), 'Hongyan full-text CSS is missing');
assert(panel.includes('fullHongyanText(route'), 'route disruption text must render through full-text helper');
assert(panel.includes('data-hy-contact-role'), 'contact role needs a full-text searchable/display node');
assert(panel.includes('data-hy-contact-location'), 'contact location needs a full-text searchable/display node');
assert(card.includes('fullHongyanText(l.content'), 'thread letter body must not be clipped');
assert(card.includes('fullHongyanText(l.reply'), 'thread reply body must not be clipped');
assert(inbox.includes('fullHongyanText(item.title'), 'inbox title must not be clipped');
assert(inbox.includes('fullHongyanText(item.content'), 'inbox content must not be clipped');
assert(/hy-person-main-v5 b\{[^}]*white-space:normal/.test(styles), 'contact names should wrap instead of ellipsis');
assert(/hy-inbox-open-v5 b\{[^}]*white-space:normal/.test(styles), 'inbox sender names should wrap instead of ellipsis');
assert(!/hy-letter-body-v5[^=;]*=\s*[^;]*compactText/.test(card), 'thread body must not call compactText');
assert(!/hy-inbox-body-v5[^=;]*=\s*[^;]*compactText/.test(inbox), 'inbox body must not call compactText');
// 中栏往来信札正文 .lc-body 不得被数字行夹截断——展阅后中侧须见全文（bug 2026-06-11）
assert(!/\.lc-body\{[^}]*-webkit-line-clamp\s*:\s*[1-9]/.test(src), 'thread letter body (.lc-body) must not be line-clamped — middle column must show full text after 展阅');

console.log(`[smoke-formal-hongyan-fulltext] PASS ${passed} assertions`);
