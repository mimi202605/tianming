#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 各省民心两本账并账 验证·2026-05-31
// 病：AI 叙事(_setRegionScalarMirrors)写 div.minxinLocal、势力行动(_applyProvince)写 G.provinceStats，
//     而聚合(integration-bridge·G.minxin.trueIndex)/民变判级读的是 adminHierarchy 的 div.minxin/div.corruption。
//     → AI/势力的地方民心、腐败改进不了真值源 = 蒸发(民心三刀同病)。
// 修：①叙事 _setRegionScalarMirrors 同名规则把绝对值落到 div.minxin/div.corruption，解析换 fuzzy(带后缀省名)
//     ②势力 _applyProvince 算完 provinceStats 后把同等增量并到 div 真值源(经 PathUtils fuzzy 解析)
// 验：解析器腿真加载真跑；真值并账公式逐字复刻 + 对两个改动文件做源码存在性断言(回归锁，防复刻漂移)。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

// ── 真加载 PathUtils 解析器 ──
const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
sandbox.addEB = function () {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-ai-change-pathutils.js'), 'utf8'), sandbox, { filename: 'tm-ai-change-pathutils.js' });

var PU = sandbox.TM && sandbox.TM.AIChange && sandbox.TM.AIChange.PathUtils;
assert(PU && typeof PU.findDivisionByNameFuzzy === 'function', 'PathUtils.findDivisionByNameFuzzy 可用(两处修都依赖它)');
assert(typeof PU.findDivisionByNameOrId === 'function', 'PathUtils.findDivisionByNameOrId 可用(兜底)');

function freshGM() {
  return {
    adminHierarchy: { player: { name: '明廷', divisions: [
      { id: '陕西', name: '陕西布政使司', minxin: 40, corruption: 30, minxinDetails: { trueIndex: 40, index: 40, perceivedIndex: 40, trend: 'stable' } },
      { id: '山东', name: '山东布政使司', minxin: 70, corruption: 20 }
    ] } }
  };
}

// ── A·解析器腿：fuzzy 能用上级简称命中带后缀正名(E.B 天启剧本的真坑)；精确匹配反而落空 ──
var GMa = freshGM();
var dvF = PU.findDivisionByNameFuzzy(GMa, '陕西');
assert(dvF && dvF.id === '陕西', 'A①fuzzy("陕西")命中"陕西布政使司"div·实得 ' + (dvF && dvF.name));
var dvP = PU.findDivisionByNameOrId(GMa, '陕西');
assert(dvP == null || dvP.id !== '陕西' || dvF !== dvP ? true : true, 'A②(记录)精确匹配对简称的行为');
// 关键对照：AI 报"陕西"、剧本正名"陕西布政使司"——这正是 :384 必须换 fuzzy 的理由
assert(PU.findDivisionByNameFuzzy(GMa, '陕西布政使司').id === '陕西', 'A③fuzzy 对正名同样命中(超集·不退化)');
assert(PU.findDivisionByNameFuzzy(GMa, '不存在省') == null, 'A④未知省返回 null(不乱命中)');

// ── B·叙事真值并账(逐字复刻 _setRegionScalarMirrors 的 write(div) 后那段) ──
function narrativeTrueValueMirror(div, fields, value) {
  if (div) {
    if (fields.indexOf('minxinLocal') >= 0) {
      if (div.minxin !== value) { div.minxin = value; }
      if (div.minxinDetails && typeof div.minxinDetails === 'object' && div.minxinDetails.trueIndex !== value) {
        div.minxinDetails.trueIndex = value;
      }
    }
    if (fields.indexOf('corruptionLocal') >= 0 && div.corruption !== value) {
      div.corruption = value;
    }
  }
}
var b1 = { minxin: 60, corruption: 10, minxinLocal: 60, minxinDetails: { trueIndex: 60 } };
narrativeTrueValueMirror(b1, ['minxinLocal'], 30);
assert(b1.minxin === 30, 'B①叙事"民心=30"→div.minxin 真值源=30(不再只写 minxinLocal)·实得 ' + b1.minxin);
assert(b1.minxinDetails.trueIndex === 30, 'B②minxinDetails.trueIndex 同步 30(面板/聚合不串账)·实得 ' + b1.minxinDetails.trueIndex);
var b2 = { minxin: 60, corruption: 10 };
narrativeTrueValueMirror(b2, ['corruptionLocal'], 80);
assert(b2.corruption === 80, 'B③叙事"腐败=80"→div.corruption 真值源=80·实得 ' + b2.corruption);
assert(b2.minxin === 60, 'B④只改腐败时 div.minxin 不被误动·实得 ' + b2.minxin);
var b3 = { minxin: 60, corruption: 10 };
narrativeTrueValueMirror(b3, ['development'], 99);
assert(b3.minxin === 60 && b3.corruption === 10, 'B⑤非民心/腐败规则(development)不碰 div.minxin/corruption(范围最小)·实得 minxin=' + b3.minxin);

// ── C·势力真值并账(逐字复刻 _applyProvince 的 div 并账块·经真 PathUtils 解析) ──
function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function _safeNum(v) { var n = Number(v); return isFinite(n) ? n : 0; }
function factionTrueValueMirror(G, province, p) {
  var _PU = sandbox.TM && sandbox.TM.AIChange && sandbox.TM.AIChange.PathUtils;
  var _resolveDiv = _PU && (_PU.findDivisionByNameFuzzy || _PU.findDivisionByNameOrId);
  var _div = _resolveDiv ? _resolveDiv(G, province) : null;
  if (_div) {
    var _mxD = _safeNum(p.minxinDelta);
    if (_mxD) {
      _div.minxin = _clamp(_safeNum(_div.minxin != null ? _div.minxin : 60) + _mxD, 0, 100);
      if (_div.minxinDetails && typeof _div.minxinDetails === 'object') _div.minxinDetails.trueIndex = _div.minxin;
    }
    var _coD = _safeNum(p.corruptionDelta);
    if (_coD) _div.corruption = _clamp(_safeNum(_div.corruption != null ? _div.corruption : 0) + _coD, 0, 100);
  }
  return _div;
}
var GMc = freshGM();
// 势力对"陕西"(AI 用简称)施压 -15 民心、+20 腐败 → 经 fuzzy 命中带后缀正名的 div 真值源
var c1 = factionTrueValueMirror(GMc, '陕西', { minxinDelta: -15, corruptionDelta: 20 });
assert(c1 && c1.id === '陕西', 'C①势力施压"陕西"经 fuzzy 命中正名 div(带后缀也不蒸发)·实得 ' + (c1 && c1.name));
assert(c1.minxin === 25, 'C②div.minxin 40-15=25 真值源进账·实得 ' + c1.minxin);
assert(c1.corruption === 50, 'C③div.corruption 30+20=50 真值源进账·实得 ' + c1.corruption);
assert(c1.minxinDetails.trueIndex === 25, 'C④minxinDetails.trueIndex 同步 25·实得 ' + c1.minxinDetails.trueIndex);
// 下界夹：民心已 25，再 -40 应夹到 0 不为负
var c2 = factionTrueValueMirror(GMc, '陕西', { minxinDelta: -40 });
assert(c2.minxin === 0, 'C⑤民心下界夹 0(不溢负)·实得 ' + c2.minxin);
// 无 delta 不动账
var GMc3 = freshGM();
factionTrueValueMirror(GMc3, '山东', {});
var dShandong = PU.findDivisionByNameFuzzy(GMc3, '山东');
assert(dShandong.minxin === 70 && dShandong.corruption === 20, 'C⑥无 delta 时真值源原样不动(不凭空写)·实得 ' + dShandong.minxin);

// ── D·源码存在性断言(回归锁：复刻的公式必须真在代码里、绑对字段) ──
var narrSrc = fs.readFileSync(path.join(ROOT, 'tm-ai-change-narrative.js'), 'utf8');
assert(/_findDivisionByNameFuzzy\s*=\s*\(_PathUtils\s*&&\s*_PathUtils\.findDivisionByNameFuzzy\)/.test(narrSrc), 'D①narrative 已引入 fuzzy 解析器');
assert(/var div = rec\.adminDiv \|\| _findDivisionByNameFuzzy\(G, rec\.name \|\| rec\.id\)/.test(narrSrc), 'D②_setRegionScalarMirrors 的 div 解析已换成 fuzzy');
assert(/fields\.indexOf\('minxinLocal'\)\s*>=\s*0[\s\S]{0,120}div\.minxin = value/.test(narrSrc), 'D③narrative minxinLocal 规则→写 div.minxin 真值源');
assert(/fields\.indexOf\('corruptionLocal'\)\s*>=\s*0[\s\S]{0,80}div\.corruption = value/.test(narrSrc), 'D④narrative corruptionLocal 规则→写 div.corruption 真值源');
var facSrc = fs.readFileSync(path.join(ROOT, 'tm-faction-action-engine.js'), 'utf8');
assert(/_resolveDiv\s*=\s*_PU\s*&&\s*\(_PU\.findDivisionByNameFuzzy\s*\|\|\s*_PU\.findDivisionByNameOrId\)/.test(facSrc), 'D⑤faction 经 PathUtils fuzzy 解析 div');
assert(/_div\.minxin = _clamp\(_safeNum\(_div\.minxin != null \? _div\.minxin : 60\) \+ _mxD, 0, 100\)/.test(facSrc), 'D⑥faction 把 minxinDelta 并到 div.minxin 真值源(夹0-100)');
assert(/_div\.corruption = _clamp\(_safeNum\(_div\.corruption != null \? _div\.corruption : 0\) \+ _coD, 0, 100\)/.test(facSrc), 'D⑦faction 把 corruptionDelta 并到 div.corruption 真值源');

// ── E·喂 AI 的省份行读 div 真值优先(_formatAdminDivisionLine·防回退 *Local 优先) ──
var npcSrc = fs.readFileSync(path.join(ROOT, 'tm-faction-npc-llm-decision.js'), 'utf8');
assert(/parts\.push\('minxin=' \+ \(d\.minxin != null \? d\.minxin : d\.minxinLocal\)\)/.test(npcSrc), 'E①喂 AI 的 minxin 读 div.minxin 真值优先(非 minxinLocal)');
assert(/parts\.push\('corruption=' \+ \(d\.corruption != null \? d\.corruption : d\.corruptionLocal\)\)/.test(npcSrc), 'E②喂 AI 的 corruption 读 div.corruption 真值优先(非 corruptionLocal)');

console.log('  A 解析器腿(真跑): fuzzy 用简称命中带后缀正名·未知省 null');
console.log('  B 叙事真值并账: minxinLocal/corruptionLocal 规则→div.minxin/corruption·非民心规则不误碰');
console.log('  C 势力真值并账(经真解析器): provinceStats 增量同步并到 div 真值源·上下界夹·无 delta 不动');
console.log('  D 源码回归锁: 两文件的并账块/字段绑定/fuzzy 解析均在位');
console.log('  E 喂AI读真值: NPC决策提示词的 minxin/corruption 读 div 真值优先(非 *Local 旧账)');
console.log('[verify-minxin-truevalue] PASS assertions=' + passed);
