#!/usr/bin/env node
// smoke-tinyi-topic-localization.js - court pending topic labels stay localized.

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const src = (fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-persona.js'), 'utf8') + '\n' + (fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-edict-personnel.js'), 'utf8')) + '\n' + fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-parties.js'), 'utf8'));

assert(/function\s+_ty3_localizeCourtTopicText\s*\(/.test(src), 'court topic localization helper should exist');
assert(/function\s+_ty3_topicDisplayText\s*\(/.test(src), 'court topic display helper should exist');
assert(src.includes('清偿军饷拖欠'), 'military wage arrears should localize');
assert(src.includes('缓解税负与积欠'), 'tax and arrear pressure should localize');
assert(src.includes('清偿欠饷并安定驻军'), 'arrears and garrison stabilization should localize');
assert(/_ty3_topicDisplayText\(p,\s*50\)/.test(src), 'pending select options should use display topic text');
assert(/topicText\s*=\s*_ty3_topicDisplayText\(topicSeed\)/.test(src), 'preaudit seed input should use display topic text');
assert(/var\s+t\s*=\s*_ty3_topicDisplayText\(item\)/.test(src), 'picking pending topic should fill localized text');
assert(/topicObj\.topicDisplay\s*=\s*_ty3_topicDisplayText\(topicObj\)/.test(src), 'new pending topics should store localized display text');
assert(/goalTextDisplay/.test(src) && /demandTextDisplay/.test(src), 'goal/demand display text should be stored');
assert(!/t\.slice\(0,\s*50\)\s*\+\s*prop/.test(src), 'raw topic slicing should not bypass localization');

console.log('[smoke-tinyi-topic-localization] PASS localized court topic labels');
