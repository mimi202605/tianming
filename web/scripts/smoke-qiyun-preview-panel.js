// smoke-qiyun-preview-panel.js — 气运趋势上屏（深挖第七轮C·承第四轮③）
// 验：WorldDigest.previewData 抽取(结构化警兆·sev排序·limit4)·previewBlock 喂AI字节级不变·
//     朝野抽屉 §2.937「气运·趋势」面板玩家可见(prompt框头不上屏)·承平无警自然隐藏。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let N = 0;
function assert(c, m) { N++; if (!c) { console.error('ASSERT FAIL [' + N + ']:', m); process.exit(1); } }

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
ctx.addEB = function () {};

const crisisGM = {
  running: true, turn: 30,
  classes: [{ name: '缙绅', satisfaction: 18 }],
  minxin: { trueIndex: 25 },
  guoku: { bankruptcy: { active: true } },
  corruption: { trueIndex: 80 },
  huangwei: { index: 25 },
  huangquan: { powerMinister: { name: '魏忠贤' } },
  _activePlots: [{ stage: 'ripe', ringleader: '崔呈秀' }]
};
ctx.GM = crisisGM;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-world-digest.js'), 'utf8'), ctx, { filename: 'tm-world-digest.js' });
assert(ctx.WorldDigest && typeof ctx.WorldDigest.previewData === 'function', '① previewData 已导出');

// ── previewData 结构化契约 ──
const d = ctx.WorldDigest.previewData(crisisGM);
assert(Array.isArray(d) && d.length === 4, '② 七警兆截 top4(limit 默认)');
assert(d[0].sev >= d[1].sev && d[1].sev >= d[2].sev, '③ 按 sev 降序');
assert(typeof d[0].domain === 'string' && typeof d[0].line === 'string', '④ 每条 {sev,domain,line} 结构');
assert(ctx.WorldDigest.previewData({ running: true }).length === 0, '⑤ 承平返空数组');
assert(ctx.WorldDigest.previewData(crisisGM, { limit: 2 }).length === 2, '⑥ opts.limit 生效');

// ── previewBlock 喂 AI 字节级不变(框头+·[域] 行式) ──
const blk = ctx.WorldDigest.previewBlock(crisisGM);
assert(blk.indexOf('【天下气运·若不干预之趋势】') >= 0 && blk.indexOf('逆之即「改命」') >= 0, '⑦ prompt 框头原样(AI 侧零变化)');
const lines = blk.split('\n').filter(function (l) { return l.indexOf('· [') === 0; });
assert(lines.length === 4, '⑧ prompt 明细 4 行·[域] 格式');
assert(lines[0].indexOf('[' + d[0].domain + ']') >= 0 && lines[0].indexOf(d[0].line) >= 0, '⑨ previewBlock===previewData 同源(重构无漂移)');
assert(ctx.WorldDigest.previewBlock({ running: true }) === '', '⑩ 承平 previewBlock 返空串(旧契约)');

// ── 抽屉面板 runtime ──
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-shell-extras.js'), 'utf8'), ctx, { filename: 'tm-shell-extras.js' });
assert(typeof ctx._renderShellExtrasLeft === 'function', '⑪ _renderShellExtrasLeft 在位');
const gl = makeEl();
ctx._renderShellExtrasLeft(gl);
const panel = gl.children.find(function (c) { return c && c.attrs && c.attrs['data-panel-key'] === 'qiyun'; });
assert(panel, '⑫ 气运面板已渲染(data-panel-key=qiyun)');
const h = panel._html || '';
assert(h.indexOf('气 运') >= 0, '⑬ 面板标题「气运·趋势」');
assert(h.indexOf('逆之即改命') >= 0, '⑭ 玩家语域副题(逆天改命招牌上屏)');
assert(h.indexOf(d[0].line) >= 0, '⑮ 最烈警兆明细行上屏');
assert(h.indexOf('魏忠贤') >= 0 || h.indexOf('崔呈秀') >= 0 || h.indexOf('缙绅') >= 0, '⑯ 警兆具名(权臣/谋主/阶层)');
assert(h.indexOf('【天下气运') < 0 && h.indexOf('君上本回合若不出手') < 0, '⑰ prompt 框头不上屏');
assert(h.indexOf('兆') >= 0, '⑱ 兆字图标');

// ── 承平 GM → 面板自然隐藏 ──
ctx.GM = { running: true, turn: 30, minxin: { trueIndex: 70 }, guoku: { money: 900000 } };
const gl2 = makeEl();
ctx._renderShellExtrasLeft(gl2);
assert(!gl2.children.find(function (c) { return c && c.attrs && c.attrs['data-panel-key'] === 'qiyun'; }), '⑲ 承平无警不显面板');

console.log('smoke-qiyun-preview-panel OK — ' + N + ' 断言全绿（previewData契约/AI侧零漂移/面板上屏/承平隐藏）');
