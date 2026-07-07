// smoke-rumor-mill-agg.js — 风闻坊录·读时聚合（深挖第七轮E）
// 验：GM.rumors/_rumors 全库零写入端(死壳常空)→ 右抽屉「风闻坊录」改读时聚合三活源
//     (责任链坊间风闻/一级民变流言/AI推演流言字符串切条)·GM.rumors 有人写仍优先直用·
//     全空不显·封顶4条。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(c, m) { N++; if (!c) { console.error('ASSERT FAIL [' + N + ']:', m); process.exit(1); } }

function makeEl() {
  const el = { _html: '', className: '', attrs: {}, children: [], style: { cssText: '' }, id: '',
    appendChild(c) { this.children.push(c); }, setAttribute(k, v) { this.attrs[k] = v; },
    querySelector() { return null; }, querySelectorAll() { return []; }, remove() {} };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  return el;
}
const els = { gr: makeEl() };

const ctx = {};
ctx.window = ctx; ctx.globalThis = ctx;
ctx.document = { createElement: makeEl, getElementById: function (id) { return els[id] || null; } };
ctx.console = console;
ctx.P = { conf: {}, map: {}, military: {}, playerInfo: { name: '朱由检' } };
ctx.addEB = function () {};

function freshGM(over) {
  return Object.assign({
    running: true, turn: 20,
    chars: [{ isPlayer: true, name: '朱由检', age: 20, alive: true }],
    minxin: { revolts: [] }
  }, over || {});
}

vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-shell-extras.js'), 'utf8'), ctx, { filename: 'tm-shell-extras.js' });
assert(typeof ctx._renderShellExtrasRight === 'function', '① _renderShellExtrasRight 在位');

function rumorPanel() {
  els.gr.children.length = 0;
  ctx._renderShellExtrasRight();
  const wrap = els.gr.children[0];
  if (!wrap) return null;
  return wrap.children.find(function (c) { return c && c.attrs && c.attrs['data-panel-key'] === 'rumor'; }) || null;
}

// ── 三活源聚合 ──
ctx.GM = freshGM({
  _minxinResponsibilityChain: { rumors: [
    { text: '坊间风闻：陕西役重，怨声渐起', severity: 'hot' },
    { text: '坊间风闻：漕粮愆期，仓吏诿过', severity: 'watch' }
  ] },
  minxin: { revolts: [{ level: 1, region: '山东' }, { level: 3, region: '河南' }] },
  _turnAiResults: { subcall15n: { extended: { rumors: '有传国库空虚，内帑充盈；又闻边将骄横，饷不至则噪' } } }
});
const p1 = rumorPanel();
assert(p1, '② 有活源→风闻坊录面板出现(此前死壳常空)');
const h1 = p1._html || '';
assert(h1.indexOf('陕西役重') >= 0, '③ 责任链风闻入录');
assert(h1.indexOf('·沸') >= 0 && h1.indexOf('·中') >= 0, '④ severity 映射可信度(沸/中)');
assert(h1.indexOf('山东') >= 0 && h1.indexOf('人心浮动') >= 0, '⑤ 一级民变=坊间流言入录');
assert(h1.indexOf('河南') < 0, '⑥ 三级民变(已成暴动)不入坊录');
assert(h1.indexOf('国库空虚') >= 0, '⑦ AI 推演流言切条入录');
const cnt1 = (h1.match(/gs-rumor-item/g) || []).length;
assert(cnt1 === 4, '⑧ 封顶4条(2+1+2=5→4·计' + cnt1 + ')');

// ── GM.rumors 有人写→优先直用不聚合 ──
ctx.GM = freshGM({
  rumors: [{ text: '模组自写风闻', credibility: '高' }],
  _minxinResponsibilityChain: { rumors: [{ text: '不该出现的聚合条', severity: 'hot' }] }
});
const p2 = rumorPanel();
assert(p2 && p2._html.indexOf('模组自写风闻') >= 0 && p2._html.indexOf('不该出现') < 0, '⑨ GM.rumors 直写优先·不叠聚合');

// ── 全空→不显(承平坊间无风) ──
ctx.GM = freshGM();
assert(rumorPanel() === null, '⑩ 全源空不显面板');

// ── AI rumors 为数组形态也兼容 ──
ctx.GM = freshGM({ _turnAiResults: { subcall15n: { extended: { rumors: [{ text: '数组形流言' }, '裸串流言'] } } } });
const p4 = rumorPanel();
assert(p4 && p4._html.indexOf('数组形流言') >= 0 && p4._html.indexOf('裸串流言') >= 0, '⑪ AI rumors 数组形兼容');

console.log('smoke-rumor-mill-agg OK — ' + N + ' 断言全绿（三源聚合/直写优先/封顶/全空隐藏）');
