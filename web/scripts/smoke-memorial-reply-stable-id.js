#!/usr/bin/env node
// smoke-memorial-reply-stable-id.js — 奏疏批复卡死修复回归
//   bug: genMemorialsAI 异步 `GM.memorials = localMems` 整组替换数组后·按钮里旧数字下标错位·
//        _approveMemorial(idx) 取 GM.memorials[idx]=undefined → if(!m)return 静默·点批复无反应。
//   fix: 按钮改传稳定 id·_memResolve 按 id 解析(回退数字下标)·数组重排/替换后仍命中正确奏疏。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

const dom = {};
let _uid = 0;
const ctx = {
  console, Math, JSON, RegExp, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite, Date,
  GM: { turn: 5, memorials: [] },
  P: { conf: {} },
  _$: (id) => dom[id] || null,
  uid: () => 'id_' + (++_uid),
  toast: () => {},
  renderMemorials: () => {},
  escHtml: (s) => String(s == null ? '' : s),
  findCharByName: () => null,
  _memMarkIllegalPresenter: () => false,
  _isSameLocation: (a, b) => a === b,
  getRankLevel: () => 9,
  document: { getElementById: (id) => dom[id] || null, createElement: () => ({ style: {}, appendChild() {}, remove() {} }), body: { appendChild() {} } }
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-memorials.js'), 'utf8'), ctx, { filename: 'tm-memorials.js' });

console.log('smoke-memorial-reply-stable-id');
const G = ctx.GM;
function mk(id, from) { return { id, from: from || ('臣' + id), title: '', type: '政务', subtype: '题本', content: from + '奏报', status: 'pending', turn: 5, reply: '' }; }

assert(typeof ctx._memResolve === 'function', '_memResolve 已定义');

// ── ① _memResolve 按 id 命中·与位置无关 ──
G.memorials = [mk('a'), mk('b'), mk('c')];
assert(ctx._memResolve('b') === G.memorials[1], '① id 命中正确奏疏');
assert(ctx._memResolve(0) === G.memorials[0], '① 数字下标回退仍可用(兼容)');
assert(ctx._memResolve('zzz') === null, '① 未知 id → null(不抛)');

// ── ② 核心: 数组被异步整组替换/重排后·按 id 批复仍命中正确奏疏(原 bug 场景) ──
G.memorials = [mk('a'), mk('b'), mk('c')];
const B = G.memorials[1];                 // 渲染时 B 在下标 1·按钮 onclick=_approveMemorial('b')
dom['mem-reply-b'] = { value: '准卿所奏' };
// 模拟 genMemorialsAI: GM.memorials = localMems(全新数组·B 挪到下标 0·A/C 丢弃·X 新增)
G.memorials = [B, mk('x')];
assert(G.memorials[1] !== B, '② 替换后旧下标1已不指向B(旧数字下标会错位)');
ctx._approveMemorial('b');                // 走稳定 id
assert(B.status === 'approved' && B.reply === '准卿所奏', '② 数组替换后·按 id 批复仍命中 B 并落「准奏」');

// ── ③ 驳回/批示/留中 同样按 id 命中 ──
G.memorials = [mk('p'), mk('q'), mk('r')];
const Q = G.memorials[1];
dom['mem-reply-q'] = { value: '所奏不准' };
G.memorials = [mk('y'), mk('z'), Q];      // Q 移到下标 2
ctx._rejectMemorial('q');
assert(Q.status === 'rejected', '③ 驳回按 id 命中');

const R2 = mk('s'); G.memorials = [R2];
dom['mem-reply-s'] = { value: '准其半·驳其半' };
ctx._annotateMemorial('s');
assert(R2.status === 'annotated' && R2.reply === '准其半·驳其半', '③ 批示意见按 id 命中');

ctx._holdMemorial('s');
assert(R2.status === 'pending_review', '③ 留中按 id 命中');

// ── ④ 奏疏已被替换移除(genMemorialsAI 换了全新批次)→ 批复优雅 no-op·不抛 ──
G.memorials = [mk('new1'), mk('new2')];
let threw = false;
try { ctx._approveMemorial('gone'); } catch (e) { threw = true; }
assert(!threw, '④ 对已移除奏疏批复不抛错(优雅 no-op·待重渲清理)');

console.log('\nPASS · ' + A + ' assertions');
