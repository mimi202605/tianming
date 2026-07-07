#!/usr/bin/env node
/* eslint-env node */
// smoke-guozuo-junctures.js — D4 一步之遥·临界具名告警（深挖第七轮B）
//   三处终局临界(民变4→5升级/权臣篡位 controlLevel>0.9/流寇建制立国)此前全静默骰点——
//   可升级而未骰中·玩家不知有多险。国祚卡读侧具名告警(带省份/权臣名/巨寇名真数据)·
//   另补「权臣」崩坏因子(cl>0.75·此前篡位死因链只读皇权指数)。同 sliceFn 抽源范式。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const WEB = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(WEB, 'phase8-formal-rightrail.js'), 'utf8');
function sliceFn(s, marker) { const a = s.indexOf(marker); let j = s.indexOf('{', a), d = 0; for (; j < s.length; j++) { const c = s[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } } return s.slice(a, j); }
const fnSrc = sliceFn(src, 'function rightGuozuoCard(');

let A = 0, F = 0;
function ok(c, m) { if (c) { A++; } else { F++; console.log('  ✗ ' + m); } }
function render(GM) {
  const ctx = { Array: Array, Number: Number, Math: Math, console: console,
    rightSocGM: function () { return GM; },
    esc: function (x) { return String(x == null ? '' : x); },
    rightArmyFmtNum: function (n) { return String(n); } };
  vm.createContext(ctx);
  vm.runInContext(fnSrc + '\nthis.go=rightGuozuoCard;', ctx);
  return ctx.go();
}

// ── ① 民变4级(起义)→「一步之遥」具名告警带省份 ──
const h1 = render({ minxin: { revolts: [{ level: 4, region: '陕西' }, { level: 4, region: '河南' }] } });
ok(/一步之遥/.test(h1), '① 民变4级出一步之遥告警');
ok(/陕西/.test(h1) && /河南/.test(h1), '① 告警带真省份(陕西、河南)');
ok(/剿抚迟则天命移/.test(h1), '① 点明杠杆(剿抚)');

// ── ② 民变≤3级无此告警(不制造无谓焦虑) ──
ok(!/一步之遥/.test(render({ minxin: { revolts: [{ level: 3, region: '山东' }] } })), '② 暴动3级无一步之遥告警');

// ── ③ 权臣 controlLevel>0.9 →篡位一步之遥·具名 ──
const h3 = render({ huangquan: { index: 60, powerMinister: { name: '魏忠贤', controlLevel: 0.93 } } });
ok(/一步之遥/.test(h3) && /魏忠贤/.test(h3) && /神器易主/.test(h3), '③ 权柄逾九分→篡位一步之遥·具名魏忠贤');
ok(/权臣/.test(h3) && /柄移私门/.test(h3), '③ 权臣崩坏因子上卡(此前皇权60时全无预警)');

// ── ④ 权臣 cl 0.8：有因子无「一步之遥」(未到临界) ──
const h4 = render({ huangquan: { index: 60, powerMinister: { name: '严嵩', controlLevel: 0.8 } } });
ok(/权臣/.test(h4) && /严嵩/.test(h4), '④ cl0.8 权臣因子在卡');
ok(!/一步之遥/.test(h4), '④ cl0.8 未到临界无告警');

// ── ⑤ 权臣 cl≤0.75 不上卡(承平权臣不虚报) ──
ok(render({ huangquan: { index: 60, powerMinister: { name: '张居正', controlLevel: 0.6 } } }) === '', '⑤ cl0.6 无因子·承平不显');

// ── ⑥ 流寇建制立国→问鼎告警具名 ──
const h6 = render({ minxin: { revolts: [{ level: 2 }] }, _activeRevolts: [{ organizationType: 'builtState', leaderName: '李自成' }] });
ok(/一步之遥/.test(h6) && /李自成/.test(h6) && /问鼎只在旦夕/.test(h6), '⑥ 建制巨寇→问鼎告警具名李自成');

// ── ⑦ 非建制流寇无此告警 ──
ok(!/问鼎/.test(render({ minxin: { revolts: [{ level: 2 }] }, _activeRevolts: [{ organizationType: 'roving', leaderName: '张献忠' }] })), '⑦ 未建制流寇无问鼎告警');

// ── ⑧ 三临界齐现→至多3条告警·卡不塌 ──
const h8 = render({
  minxin: { revolts: [{ level: 4, region: '陕西' }] },
  huangquan: { index: 30, powerMinister: { name: '魏忠贤', controlLevel: 0.95 } },
  _activeRevolts: [{ organizationType: 'builtState', leaderName: '李自成' }]
});
const juncCount = (h8.match(/一步之遥/g) || []).length;
ok(juncCount === 3, '⑧ 三临界齐现三条告警(' + juncCount + ')');
ok(/濒亡/.test(h8), '⑧ 多因聚合仍濒亡档');

// ── ⑨ 旧行为守恒:无临界局面输出与旧版语义一致(无告警块) ──
const h9 = render({ guoku: { money: 100000 } });
ok(/将危/.test(h9) && !/一步之遥/.test(h9), '⑨ 仅度支将危·无告警块(旧行为守恒)');

console.log('[smoke-guozuo-junctures] ' + (F ? 'FAIL' : 'PASS') + ' — ' + A + ' 通过 / ' + F + ' 失败');
process.exit(F ? 1 : 0);
