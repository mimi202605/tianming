// smoke-dianzhang.js — Wave5 典章/祖制建构轴·地基 slice-1
// 验：TM.Dianzhang.tick 扫国策·熬过考验(存续>=MATURE_TURNS·非压制)者升祖制·dedup·空兜底。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
function assert(c, m) { if (!c) { console.error('ASSERT FAIL:', m); process.exit(1); } }

const ctx = { console: console, Math: Math, JSON: JSON, String: String, Number: Number, Array: Array, Object: Object };
ctx.window = ctx; ctx.globalThis = ctx;
var eb = [];
ctx.addEB = function (k, t) { eb.push(k + ':' + t); };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-dianzhang.js'), 'utf8'), ctx, { filename: 'tm-dianzhang.js' });
const D = ctx.TM.Dianzhang;
assert(D && typeof D.tick === 'function', '模块加载·TM.Dianzhang.tick');
assert(D.MATURE_TURNS === 12, 'MATURE_TURNS=12');

// 国策册·三条：熬过 / 太年轻 / 被压制
const GM = { turn: 20, _globalRules: [
  { id: 'r1', name: '重农抑商', enactedTurn: 5, status: 'entrenched' },   // 存续15>=12·非压制 → 升
  { id: 'r2', name: '开海通商', enactedTurn: 15, status: 'established' },  // 存续5<12 → 未成熟
  { id: 'r3', name: '厂卫缉事', enactedTurn: 2, status: 'suppressed' }     // 存续18·但被压制 → 不算立住
]};
var r = D.tick(GM);
assert(r.promoted === 1, '① 只升 1 条(熬过+非压制)·实 ' + r.promoted);
assert(D.count(GM) === 1, '② 典章 1 条');
assert(D.list(GM)[0].name === '重农抑商', '③ 升的是熬过考验的重农抑商');
assert(D.list(GM)[0].kind === 'policy' && D.list(GM)[0].source === 'r1', '④ 祖制 kind/source');
assert(D.list(GM)[0].enactedTurn === 5 && D.list(GM)[0].maturedTurn === 20, '⑤ 立于 T5·成宪于 T20');
assert(D.has(GM, 'policy', 'r1') && !D.has(GM, 'policy', 'r2'), '⑥ has 判定');
assert(eb.some(function (e) { return e.indexOf('典章') >= 0 && e.indexOf('重农抑商') >= 0; }), '⑦ addEB 著祖制事件');

// 再 tick·dedup 不重复升
var r2 = D.tick(GM);
assert(r2.promoted === 0 && D.count(GM) === 1, '⑧ 再 tick 不重复升(dedup)');

// 时间推进·r2 熬过后也成宪
GM.turn = 28;   // r2 enactedTurn15·存续13>=12
var r3 = D.tick(GM);
assert(r3.promoted === 1 && D.count(GM) === 2 && D.has(GM, 'policy', 'r2'), '⑨ 时间到·开海通商也著为成宪');

// 空/无国策·不炸
assert(D.tick({ turn: 1 }).promoted === 0 && D.tick(null).promoted === 0, '⑩ 空 GM/无国策 兜底不炸');

// ── slice-3 双刃 helper（红利 + 成宪难改 + AI 注入）──
GM.turn = 30;
assert(D.count(GM) === 2, '⑪ (前置)此时典章 2 条(r1+r2)');
assert(D.legitimacyBonus(GM) === 3, '⑫ 红利 legitimacyBonus=round(2×1.5)=3(封顶15)');
assert(D.legitimacyBonus({}) === 0, '⑬ 空典章无红利');
var f = D.abolishFriction(GM, 'policy', 'r1');   // r1 maturedTurn20·turn30·age10
assert(f === 25, '⑭ 成宪难改 abolishFriction=15+age10=25(封顶40)·实 ' + f);
assert(D.abolishFriction(GM, 'policy', 'r_none') === 0, '⑮ 非祖制无成宪阻力');
var inj = D.promptInjection(GM);
assert(inj.indexOf('祖制') >= 0 && inj.indexOf('稳') >= 0 && inj.indexOf('僵') >= 0, '⑯ promptInjection 体现双刃(稳/僵)');
assert(D.promptInjection({}) === '', '⑰ 空典章无注入');

console.log('smoke-dianzhang OK — 典章建构轴(地基10 + 双刃helper7 = 17 断言)验证通过');
