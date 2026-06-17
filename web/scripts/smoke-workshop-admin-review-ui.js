#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'workshop-admin.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert(scriptMatch, 'admin page should include an inline script');
new Function(scriptMatch[1]);

[
  'admin/workshop/pending',
  'admin/workshop/moderate',
  'admin/workshop/file?id=',
  '通过并上架',
  '驳回',
  '下载投稿资源包',
  'coverImage',
  'galleryImages',
  'releaseNotes',
  'fileName'
].forEach((needle) => assert(html.includes(needle), 'missing admin review UI affordance: ' + needle));

assert(/function\s+downloadPackage\s*\(/.test(html), 'admin page should download the submitted package');
assert(/function\s+inspectPackage\s*\(/.test(html), 'admin page should preview or describe submitted package content');
assert(/function\s+moderate\s*\(id,\s*action\)/.test(html), 'admin page should moderate by id/action');
assert(/X-Admin-Key/.test(html), 'admin page should send X-Admin-Key');

const verifyAll = fs.readFileSync(path.join(ROOT, 'scripts/verify-all.js'), 'utf8');
assert(verifyAll.includes('smoke-workshop-admin-review-ui.js'), 'verify-all should include admin review UI smoke');

console.log('[smoke-workshop-admin-review-ui] PASS');
