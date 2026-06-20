#!/usr/bin/env node
'use strict';
// smoke-eventbus-vestigial — StoryEventBus「激活进度」守卫（原死代码归档·2026-06-20 S1-S3 渐进激活）
// 背景:本总线曾标 @vestigial(死代码)·事件系统统一 S1-S3 渐进激活(S1骨架/S2后果AI裁定/S3渲染入口)。
// 现守:① enqueue 仍零 gameplay 调用(来源 S4 未接) + processNext 已被 S3 drain 接(渲染入口·1处)
//   ② serialize/deserialize 仅 save-compat(×2) ③ S1 激活态头注到位 ④ history-events 仍驱动(待 S4 收编) ⑤ 模块正常加载
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

function grepCount(re) {
  let n = 0;
  fs.readdirSync(ROOT).forEach(function (f) {
    if (!/\.(js)$/.test(f) || f === 'tm-event-system.js') return;
    if (!/^(tm-|phase8-)/.test(f)) return;
    let s; try { s = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { return; }
    const m = s.match(re); if (m) n += m.length;
  });
  return n;
}

console.log('smoke-eventbus-vestigial');

// ── ① 激活边界:processNext 已 S3 接(渲染入口·1处)·enqueue 仍零 gameplay 调用(来源 S4 未接) ──
ok(grepCount(/\.processNext\(/g) === 1, '① processNext 仅 endturn S3 drain 1 处(渲染入口·非 S4 来源)');
ok(grepCount(/StoryEventBus\.enqueue\(/g) === 0, '① StoryEventBus.enqueue 零 gameplay 调用(来源 S4 未接·队列恒空)');
// ── ② serialize/deserialize 仅 save-compat ──
ok(grepCount(/StoryEventBus\.(serialize|deserialize)/g) === 2, '② serialize/deserialize 仅 2 处(save-lifecycle·save-compat)');

// ── ③ S1 激活态头注(曾 @vestigial·2026-06-20 按详设激活) ──
const src = fs.readFileSync(path.join(ROOT, 'tm-event-system.js'), 'utf8');
ok(/Slice 1 激活|事件系统统一/.test(src), '③ 头注标 S1 激活态(事件系统统一)');
ok(/eventUnificationEnabled/.test(src), '③ 头注点明开关 eventUnificationEnabled(默认关)');
ok(/tm-history-events\.js/.test(src), '③ 头注仍指 tm-history-events(并存·待 S4 收编)');
ok(/checkHistoryEvents|checkRigidTriggers/.test(src), '③ 头注点明现存真驱动(checkHistoryEvents/checkRigidTriggers)');
ok(/tm-save-lifecycle|存档往返/.test(src), '③ 头注说明存档往返已现成');

// ── ④ 真系统每回合驱动确认(tm-endturn-systems) ──
const sys = fs.readFileSync(path.join(ROOT, 'tm-endturn-systems.js'), 'utf8');
ok(/checkHistoryEvents\(\)/.test(sys) && /checkRigidTriggers\(\)/.test(sys), '④ tm-endturn-systems 每回合驱动真事件系统');

// ── ⑤ 纯注释改·模块仍正常加载(零行为变更) ──
const ctx = { console: { log() {}, warn() {}, error() {} }, Math, JSON, String, Array, Object, Date: { now: () => 0 } };
ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx; ctx.GM = { turn: 1 };
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'tm-event-system.js' });
ok(ctx.StoryEventBus && typeof ctx.StoryEventBus.processNext === 'function', '⑤ StoryEventBus 仍正常导出(processNext 在·未删·save-compat 保留)');
ok(typeof ctx.StoryEventBus.serialize === 'function' && typeof ctx.StoryEventBus.deserialize === 'function', '⑤ serialize/deserialize 仍在(存档兼容不破)');
ok(ctx.EffectRegistry && typeof ctx.EffectRegistry === 'object', '⑤ EffectRegistry 仍在(骨架保留)');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
