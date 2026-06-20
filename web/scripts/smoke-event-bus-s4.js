#!/usr/bin/env node
'use strict';
// smoke-event-bus-s4 — 事件系统统一 · Slice 4：来源涌现（AI events 中 critical 升格 enqueue）
// 静态断言三处改动到位(applier 升格 / prompt 节制引导 / schema 说明)。
// 升格的运行行为(applyAITurnChanges→enqueue→弹模态)走真机验(preview·加载整个 applier 依赖太重)。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ok ' + m); }
console.log('smoke-event-bus-s4');

// ① applier 升格逻辑(critical + choices + 开关 → enqueue·寄生为主:寻常事仍 addEB)
const ap = fs.readFileSync(path.join(ROOT, 'tm-ai-change-applier.js'), 'utf8');
ok(/e\.critical && Array\.isArray\(e\.choices\)/.test(ap), '① applier:critical+choices 判定');
ok(/global\.eventUnificationOn\(\)/.test(ap), '① applier:开关门控(eventUnificationOn)');
ok(/global\.StoryEventBus\.enqueue/.test(ap), '① applier:critical 事件 enqueue 升格');
ok(/return; \/\/ 升格了不再 addEB/.test(ap), '① 升格后 return(不重复播报)');
ok(/if \(global\.addEB\) global\.addEB/.test(ap), '① 寻常事件仍走 addEB 播报(寄生为主·零回归)');

// ② prompt 引导:教 AI 标 critical 且节制
const pr = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
ok(/critical:true/.test(pr), '② prompt 教 AI 标 critical:true');
ok(/choices:\[\{text/.test(pr), '② prompt 要 choices[{text,aiHint}]');
ok(/节制使用/.test(pr) && /不可滥标/.test(pr), '② prompt 强调节制(寄生为主·关键才弹)');

// ③ schema events 说明 critical 升格
const sc = fs.readFileSync(path.join(ROOT, 'tm-ai-schema.js'), 'utf8');
ok(/critical:true\+choices/.test(sc) && /升格为君主决策事件/.test(sc), '③ schema events 说明 critical 升格');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
