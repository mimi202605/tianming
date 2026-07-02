#!/usr/bin/env node
'use strict';
/* smoke-eunuch-minister — 宦官专权(2026-07-02)
 * 权臣候选此前只认外朝衔(宰相/首辅…)。本刀：内廷近侍(role==='eunuch')居高品要职(品级≤4)
 * 亦可坐大——同闸 powerMinisterEnabled 同弧·事件文案「内竖弄权」·pm.innerCourt 标记。
 * 朝代中立：引擎只读 role/品级·掌印/秉笔等专名归剧本。
 */
const fs = require('fs');
const path = require('path');
const W = path.join(__dirname, '..');

let A = 0, F = 0;
function ok(cond, msg) { if (cond) { A++; console.log('  ✓ ' + msg); } else { F++; console.log('  ✗ ' + msg); } }

const src = fs.readFileSync(path.join(W, 'tm-authority-complete.js'), 'utf8');
// 提取 _detectPowerMinister（花括号计数）+ 其依赖的 _OFF_TENURE_RETIRE_RE
const fnStart = src.indexOf('function _detectPowerMinister(ctx)');
ok(fnStart > 0, '_detectPowerMinister 定义在');
let depth = 0, fnEnd = -1;
for (let i = src.indexOf('{', fnStart); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { fnEnd = i + 1; break; } }
}
const sandbox = {};
sandbox.global = sandbox;
sandbox._OFF_TENURE_RETIRE_RE = /致仕|乞骸|休致|归田|丁忧|守制/;
const mk = new Function('global', '_OFF_TENURE_RETIRE_RE', 'return (' + src.slice(fnStart, fnEnd) + ')');

function run(chars, opts) {
  opts = opts || {};
  sandbox.GM = { huangquan: { index: 50, powerMinister: null }, chars: chars };
  sandbox.TMPromotion = opts.noPromo ? undefined : { resolveRankLevel: function (c) { return c._lv || 0; } };
  sandbox.addEB = function (cat, txt) { sandbox._lastEB = txt; };
  sandbox._lastEB = '';
  const fn = mk(sandbox, sandbox._OFF_TENURE_RETIRE_RE);
  return fn({ turn: 30 });
}

// ① 外朝权臣照旧（回归）
let r = run([{ name: '某相', officialTitle: '内阁首辅', _tenureMonths: 30, ambition: 80, alive: true }]);
ok(!!r && r.name === '某相' && r.innerCourt === false, '① 外朝首辅候选照旧·innerCourt=false');
ok(/坐大为权臣/.test(sandbox._lastEB), '① 外朝文案不变');

// ② 内廷近侍高品要职 → 内竖弄权
r = run([{ name: '某珰', role: 'eunuch', officialTitle: '掌印内官', _lv: 2, _tenureMonths: 30, ambition: 90, alive: true }]);
ok(!!r && r.name === '某珰' && r.innerCourt === true, '② 宦官高品久任高野心 → 权臣候选·innerCourt=true');
ok(/内竖弄权/.test(sandbox._lastEB), '② 事件文案「内竖弄权」');

// ③ 低品宦官不入候选（杂役有衔不算）
r = run([{ name: '小珰', role: 'eunuch', officialTitle: '典簿', _lv: 8, _tenureMonths: 40, ambition: 90, alive: true }]);
ok(r === null, '③ 品级8(低品) → 不候选');

// ④ 非宦官无外朝衔者不入（资格没被放水）
r = run([{ name: '某侍郎', officialTitle: '礼部侍郎', _lv: 3, _tenureMonths: 40, ambition: 90, alive: true }]);
ok(r === null, '④ 外朝侍郎(非相非宦) → 仍不候选');

// ⑤ 任期/野心闸对宦官同样生效
r = run([{ name: '某珰', role: 'eunuch', officialTitle: '掌印内官', _lv: 2, _tenureMonths: 10, ambition: 90, alive: true }]);
ok(r === null, '⑤ 久任<24月 → 不候选');
r = run([{ name: '某珰', role: 'eunuch', officialTitle: '掌印内官', _lv: 2, _tenureMonths: 30, ambition: 50, alive: true }]);
ok(r === null, '⑤ 野心<65 → 不候选');

// ⑥ 无 TMPromotion 且无 rankLevel → 内廷判定安全降级不炸
r = run([{ name: '某珰', role: 'eunuch', officialTitle: '掌印内官', _tenureMonths: 30, ambition: 90, alive: true }], { noPromo: true });
ok(r === null, '⑥ 无品级体系 → 内廷候选降级为否·不炸');

// ⑦ 内外并存 → 野心高者胜（同池竞争）
r = run([
  { name: '某相', officialTitle: '内阁首辅', _tenureMonths: 30, ambition: 70, alive: true },
  { name: '某珰', role: 'eunuch', officialTitle: '掌印内官', _lv: 2, _tenureMonths: 30, ambition: 92, alive: true }
]);
ok(!!r && r.name === '某珰' && r.innerCourt === true, '⑦ 内外同池·野心最高者坐大');

console.log('\n' + (F === 0 ? 'ALL PASS' : 'FAIL') + ' (' + A + ' pass / ' + F + ' fail)');
process.exit(F === 0 ? 0 : 1);
