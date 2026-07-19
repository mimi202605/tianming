'use strict';
// 国师/正式 Agent 共用底座：工具协议、回执、预算、追踪与取消。
const path = require('path');
const { ROOT, makeAssert } = require('./smoke-endturn-baseline-helpers');
const passed = { value: 0 };
const assert = makeAssert(passed);

const K = require(path.join(ROOT, 'tm-agent-kernel.js'));
assert(K && typeof K.createRegistry === 'function', 'AgentKernel 可加载');

const registry = K.createRegistry([
  { name: 'look', description: 'read', effect: 'read' },
  { name: 'write', description: 'write', effect: 'runtime-write', risk: 'high', postconditions: ['state verified'] }
], { defaults: { domain: 'test', pack: 'core' } });
assert(registry.names().join(',') === 'look,write', 'registry 保留稳定顺序');
assert(registry.get('write').risk === 'high' && registry.get('write').effect === 'runtime-write', 'ToolSpec 风险/副作用元数据保留');
assert(registry.defs()[0].name === 'look' && !Object.prototype.hasOwnProperty.call(registry.defs()[0], 'effect'), 'provider schema 不泄露内部元数据');

const readReceipt = registry.receipt('look', { ok: true });
assert(readReceipt.ok && readReceipt.changed === false && readReceipt.verified === true, '读工具回执默认只读且已验证');
const noopReceipt = registry.receipt('write', { ok: true, changed: false, verified: true });
assert(noopReceipt.ok && !noopReceipt.changed && noopReceipt.verified, '写工具 no-op 不冒充落地');
const writeReceipt = registry.receipt('write', { ok: true, changed: true, verified: true }, { paths: ['GM.x'] });
assert(writeReceipt.changed && writeReceipt.verified && writeReceipt.paths[0] === 'GM.x', '真实写入回执携 changed/verified/path');

let duplicateRejected = false;
try { K.createRegistry([{ name: 'x' }, { name: 'x' }]); } catch (_) { duplicateRejected = true; }
assert(duplicateRejected, 'registry 拒绝重名工具');

const trace = K.createTrace({ runId: 'smoke' });
const budget = K.createBudget({ maxCalls: 3, maxTokens: 100, reserveCalls: 1 }, trace);
assert(budget.claim('work', { calls: 2, tokens: 40 }).ok, '普通调用可用非保留预算');
assert(!budget.claim('more-work', { calls: 1 }).ok, '普通调用不能侵占收尾保留调用');
assert(budget.claim('finalize', { calls: 1 }, { essential: true }).ok, '必要收尾可使用保留调用');
assert(budget.snapshot().used.calls === 3 && trace.list().some(function (e) { return e.type === 'budget_denied'; }), '预算与拒绝事件可追踪');

const run = K.createRun({ budget: { maxCalls: 1 }, meta: { mode: 'smoke' } });
run.abort('user');
assert(run.signal.aborted === true && run.snapshot().trace.events.some(function (e) { return e.type === 'abort'; }), 'run 支持 AbortSignal 与取消追踪');

console.log('[smoke-agent-kernel] pass assertions=' + passed.value);
