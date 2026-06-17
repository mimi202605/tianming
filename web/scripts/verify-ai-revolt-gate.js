#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·AI 起事民心闸修复（2026-05-30）：
//   ①pathutils.findDivisionByNameFuzzy：省名容错（"陕西"→"陕西布政使司"）
//   ②闸决策：解析到→读该省 minxin；解析不到→退回全国 trueIndex 作闸；坐实时叛军 scale 按省人口5%封顶
// gateDecide() 逐字镜像 tm-endturn-apply.js 闸内逻辑。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[FAIL] ' + label); passed += 1; console.log('  ok: ' + label); }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {},
  addEB: () => {}, toast: () => {},
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-ai-change-pathutils.js'), 'utf8'), sandbox, { filename: 'tm-ai-change-pathutils.js' });

const PU = sandbox.TM && sandbox.TM.AIChange && sandbox.TM.AIChange.PathUtils;
assert(PU && typeof PU.findDivisionByNameFuzzy === 'function', 'PathUtils.findDivisionByNameFuzzy 已导出');
assert(typeof PU.findDivisionByNameOrId === 'function', 'PathUtils.findDivisionByNameOrId 仍在（未破坏）');

const GM = {
  turn: 31,
  adminHierarchy: { player: { name: '明廷', divisions: [
    { id: 'sx', name: '陕西布政使司', minxin: 76, populationDetail: { mouths: 3000000 }, children: [
      { id: 'xian', name: '西安府', minxin: 76, populationDetail: { mouths: 1500000 } }
    ] },
    { id: 'gs', name: '甘肃布政使司', minxin: 15, populationDetail: { mouths: 1000000 } },
    { id: 'hn', name: '河南布政使司', minxin: 99, populationDetail: { mouths: 4000000 } }
  ] } },
  minxin: { trueIndex: 98 }
};

// ── 模糊解析 ──
assert(PU.findDivisionByNameFuzzy(GM, '陕西') && PU.findDivisionByNameFuzzy(GM, '陕西').id === 'sx', '①"陕西"→陕西布政使司(去后缀严格相等)');
assert(PU.findDivisionByNameFuzzy(GM, '陕西布政使司') && PU.findDivisionByNameFuzzy(GM, '陕西布政使司').id === 'sx', '②全名精确仍命中');
assert(PU.findDivisionByNameFuzzy(GM, '甘肃') && PU.findDivisionByNameFuzzy(GM, '甘肃').minxin === 15, '③"甘肃"→甘肃布政使司(低民心省)');
assert(PU.findDivisionByNameFuzzy(GM, '不存在地名') === null, '④无此地→null');
assert(PU.findDivisionByNameFuzzy(GM, '山') === null, '⑤单字"山"不模糊匹配(防误中山西/山东)');
assert(PU.findDivisionByNameOrId(GM, '陕西') === null, '⑥精确解析"陕西"仍为 null(证修复确实靠模糊·原坑复现)');

// ── 闸决策（逐字镜像 tm-endturn-apply.js 闸内逻辑）──
function gateDecide(GM, r) {
  var _PUr = PU;
  var _rdiv = _PUr ? (
    (typeof _PUr.findDivisionByNameFuzzy === 'function' && _PUr.findDivisionByNameFuzzy(GM, r.region)) ||
    (typeof _PUr.findDivisionByNameOrId === 'function' && _PUr.findDivisionByNameOrId(GM, r.region)) || null
  ) : null;
  var _rmx = (_rdiv && typeof _rdiv.minxin === 'number') ? _rdiv.minxin
           : (GM.minxin && typeof GM.minxin.trueIndex === 'number') ? GM.minxin.trueIndex : null;
  var P_AI_REVOLT_MX = 50;
  if (_rmx != null && _rmx >= P_AI_REVOLT_MX) return { block: true };
  var P_AI_REVOLT_SCALE_FRAC = 0.05, P_AI_REVOLT_SCALE_ABS = 80000;
  var _mouths = (_rdiv && _rdiv.populationDetail && typeof _rdiv.populationDetail.mouths === 'number') ? _rdiv.populationDetail.mouths : null;
  var _scaleCap = _mouths != null ? Math.max(2000, Math.round(_mouths * P_AI_REVOLT_SCALE_FRAC)) : P_AI_REVOLT_SCALE_ABS;
  var _scale = Math.min(Number(r.scale) || 1000, _scaleCap);
  return { block: false, scale: _scale };
}

assert(gateDecide(GM, { region: '陕西', scale: 300000 }).block === true, '⑦AI 在"陕西"(民心76≥50)凭空起事→挡住（E.B 的 case·原来漏过）');
assert(gateDecide(GM, { region: '河南', scale: 300000 }).block === true, '⑧"河南"(99)→挡住');
var g甘 = gateDecide(GM, { region: '甘肃', scale: 300000 });
assert(g甘.block === false, '⑨"甘肃"(15<50)→真民变坐实（低民心省该反就反）');
assert(g甘.scale === 50000, '⑩甘肃 30万被封顶到 5%人口=5万·实得 ' + g甘.scale);
var gUnknown = gateDecide(GM, { region: '某不存在省', scale: 300000 });
assert(gUnknown.block === true, '⑪解析不到的地名 + 全国民心98→退回全国闸挡住（命名空间不齐也兜得住）');
var GMlow = { adminHierarchy: GM.adminHierarchy, minxin: { trueIndex: 30 } };
function gateDecideLow(r){ var _PUr=PU; var _rdiv=_PUr?((_PUr.findDivisionByNameFuzzy(GMlow,r.region))||(_PUr.findDivisionByNameOrId(GMlow,r.region))||null):null; var _rmx=(_rdiv&&typeof _rdiv.minxin==='number')?_rdiv.minxin:(GMlow.minxin&&typeof GMlow.minxin.trueIndex==='number')?GMlow.minxin.trueIndex:null; if(_rmx!=null&&_rmx>=50)return{block:true}; var _mouths=(_rdiv&&_rdiv.populationDetail&&typeof _rdiv.populationDetail.mouths==='number')?_rdiv.populationDetail.mouths:null; var _cap=_mouths!=null?Math.max(2000,Math.round(_mouths*0.05)):80000; return{block:false,scale:Math.min(Number(r.scale)||1000,_cap)}; }
var gLowUnknown = gateDecideLow({ region: '某不存在省', scale: 300000 });
assert(gLowUnknown.block === false && gLowUnknown.scale === 80000, '⑫全国民心30+解析不到→坐实但走绝对封顶8万·实得 block=' + gLowUnknown.block + ' scale=' + gLowUnknown.scale);

console.log('\nALL PASS · ' + passed + ' assertions');
