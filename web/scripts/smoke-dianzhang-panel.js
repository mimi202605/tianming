// smoke-dianzhang-panel.js — Wave5 slice-4 典章面板（朝野内情左抽屉·build 可视化）
// 验：_renderShellExtrasLeft §2.935 对有祖制的局渲染「典章·祖制」面板（数目+双刃摘要+祖制列表历时）·无祖制不显。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
function assert(c, m) { if (!c) { console.error('ASSERT FAIL:', m); process.exit(1); } }

function makeEl() {
  const el = { _html: '', className: '', attrs: {}, children: [],
    appendChild(c) { this.children.push(c); }, setAttribute(k, v) { this.attrs[k] = v; } };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  return el;
}

const ctx = {};
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: makeEl, getElementById: function () { return null; } };
ctx.console = console;
ctx.P = { conf: {}, map: {}, military: {} };
ctx.GM = { running: true, turn: 30, _dianzhang: { statutes: [], _seq: 0 } };
ctx.addEB = function () {};

vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-dianzhang.js'), 'utf8'), ctx, { filename: 'tm-dianzhang.js' });
// 种两条祖制（成宪于不同回合）
ctx.TM.Dianzhang.enshrine(ctx.GM, { kind: 'policy', name: '重农抑商', source: 'r1', enactedTurn: 5 });
ctx.TM.Dianzhang.enshrine(ctx.GM, { kind: 'policy', name: '开海通商', source: 'r2', enactedTurn: 15 });
assert(ctx.TM.Dianzhang.count(ctx.GM) === 2, '前置:2 祖制');

vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-shell-extras.js'), 'utf8'), ctx, { filename: 'tm-shell-extras.js' });
assert(typeof ctx._renderShellExtrasLeft === 'function', '_renderShellExtrasLeft 已定义');

const gl = makeEl();
try { ctx._renderShellExtrasLeft(gl); } catch (e) { console.error('render 抛错:', e && e.message); process.exit(1); }
const panel = gl.children.find(function (c) { return c && c.attrs && c.attrs['data-panel-key'] === 'dianzhang'; });
assert(panel, '① 典章面板已渲染(data-panel-key=dianzhang)');
const h = panel._html || '';
assert(h.indexOf('典 章') >= 0, '② 面板标题「典章」');
assert(h.indexOf('重农抑商') >= 0 && h.indexOf('开海通商') >= 0, '③ 列出祖制');
assert(h.indexOf('正统 +') >= 0, '④ 双刃摘要·正统红利(legitimacyBonus)');
assert(h.indexOf('难轻改') >= 0 || h.indexOf('渐失变通') >= 0, '⑤ 双刃摘要·成宪难改(越僵)');
assert(/历 \d+ 回/.test(h), '⑥ 祖制历时显示');

// 无祖制→不显面板(count=0 guard)
const gl2 = makeEl();
ctx.GM._dianzhang = { statutes: [], _seq: 0 };
ctx._renderShellExtrasLeft(gl2);
assert(!gl2.children.find(function (c) { return c && c.attrs && c.attrs['data-panel-key'] === 'dianzhang'; }), '⑦ 无祖制不显典章面板(guard)');

console.log('smoke-dianzhang-panel OK — 典章面板 build 可视化(7 断言)验证通过');
