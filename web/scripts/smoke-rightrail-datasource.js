#!/usr/bin/env node
'use strict';
// smoke-rightrail-datasource — 新 UI 右栏数据源衔接六修 + 求见删除写口收口 的行为/契约验证(2026-07-19)
//   ① 地块主官走 liveRegionGovernor 活绑定(死官→空缺·活官→显名)
//   ② 问对候旨/远方/求见名单无 24 cap·走渐进水合(保全量不静默截断)
//   ③ 钉选臣僚卡职衔/派系走真源格式化(rightIssuePersonTitle / rightFactionDisplay)
//   ④ 军队 morale/supply 对齐真源(_armyMorale=60 兜底·morale=0 读 0·supplyRatio 优先换算)
//   ⑤ GM._pendingAudiences 删除/清洗唯一写口(rightrail 无裸 splice + 功能按标识删不错位)
// 手法：抽函数源 + new Function 注入桩跑真源码(catch 语义突变)，与 smoke-region-governor-live/
//       smoke-reported-fiscal-wiring 同范式。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0, F = 0;
function ok(c, m){ if (c) { A++; console.log('  ✓ ' + m); } else { F++; console.log('  ✗ FAIL: ' + m); } }
console.log('smoke-rightrail-datasource');

const rail = fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8');
const wendui = fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8');
function grab(src, re, label){ const m = src.match(re); if (!m) throw new Error('抽取失败: ' + label); return m[0]; }

// ── ① 地块主官活绑定 ──────────────────────────────────────────────
const govSrc = grab(rail, /function rightAdminLiveGovernor\(d\)\{[\s\S]*?\n {2}\}/, 'rightAdminLiveGovernor');
function makeGov(liveMap, chars){
  const mockWindow = { findCharByName: function(n){ return chars.find(function(c){ return c.name === n; }) || null; } };
  const mockBridge = { __p8MapParts: { liveRegionGovernor: function(pos){ return liveMap[pos] || null; } } };
  return new Function('bridge', 'window', govSrc + '\nreturn rightAdminLiveGovernor;')(mockBridge, mockWindow);
}
{
  const chars = [{ name: '刘诏', alive: true }, { name: '死督', alive: false }, { name: '活员', alive: true }];
  const gov = makeGov({ '顺天巡抚': { name: '刘诏' } }, chars);
  ok(gov({ officialPosition: '顺天巡抚', governor: '旧档' }) === '刘诏', '① 活官职绑定→显在世持有人(刘诏·非静态旧档)');
  ok(gov({ officialPosition: '空缺职', governor: '死督' }) === '', '① 静态主官已殁→出缺(死字段不再显死人)');
  ok(gov({ governor: '活员' }) === '活员', '① 无官职但静态主官在世→保留');
  ok(gov({ officialPosition: '空缺职', governor: '活员' }) === '活员', '① 无活绑定+静态在世→保留');
  ok(gov({}) === '', '① 无官职无主官→空');
}
ok(/governor: rightAdminLiveGovernor\(d\)/.test(rail), '① rightAdminFromDivision.governor 走活绑定真源');
ok(/x\.governor \|\| '空缺.待补'/.test(rail), '① 主官卡空值显「空缺·待补」');

// ── ② 问对名单无 24 cap·渐进水合 ────────────────────────────────
ok(!/waiting\.slice\(0, 24\)/.test(rail) && !/away\.slice\(0, 24\)/.test(rail), '② 候旨/远方名单去除 slice(0,24) 静默截断');
ok(/waitingBody = waiting\.length \? rightWenduiHydratedList\(/.test(rail)
  && /awayBody = away\.length \? rightWenduiHydratedList\(/.test(rail)
  && /seekerBody = seekers\.length \? rightWenduiHydratedList\(/.test(rail), '② 候旨/远方/求见三名单均走 rightWenduiHydratedList 水合');
{
  const hydSrc = grab(rail, /function rightWenduiHydratedList\(cls, items, renderItem\)\{[\s\S]*?\n {2}\}/, 'rightWenduiHydratedList');
  const hyd = new Function('RIGHT_WENDUI_INITIAL_ROWS', 'rightScheduleWenduiHydration', 'attr', '_rightWenduiRenderSeq',
    hydSrc + '\nreturn rightWenduiHydratedList;')(24, function(){}, String, 0);
  const items = []; for (let i = 0; i < 30; i++) items.push({ name: 'P' + i });
  const out = hyd('c', items, function(p){ return '<i>' + p.name + '</i>'; });
  const rendered = (out.match(/<i>/g) || []).length;
  const note = out.match(/余 (\d+) 人/);
  ok(!!note && rendered + Number(note[1]) === 30, '② 水合保全量(首屏 ' + rendered + ' + 余 ' + (note ? note[1] : '?') + ' = 30·不丢人)');
}

// ── ③ 钉选臣僚卡走真源格式化 ────────────────────────────────────
ok(!/p\.title \|\| p\.office \|\| p\.role \|\| '在朝'/.test(rail), '③ ghost 卡职衔不再读 p.title 原始单值');
ok(!/p\.title \|\| p\.office \|\| p\.role \|\| p\.faction \|\| '未仕'/.test(rail), '③ 实卡职衔不再读 p.title 原始单值');
ok(/esc\(rightFactionDisplay\(p\.faction\) \|\| '.'\)/.test(rail), '③ ghost 卡派系调 rightFactionDisplay(id→中文)');
ok((rail.match(/esc\(rightIssuePersonTitle\(p\)\)/g) || []).length >= 2, '③ 钉选卡职衔调 rightIssuePersonTitle(多职格式化)');

// ── ④ 军队 morale/supply 对齐真源 ──────────────────────────────
{
  const moraleSrc = grab(rail, /function rightArmyMoraleValue\(a\)\{[\s\S]*?\n {2}\}/, 'rightArmyMoraleValue');
  const supplySrc = grab(rail, /function rightArmySupplyValue\(a\)\{[\s\S]*?\n {2}\}/, 'rightArmySupplyValue');
  const realMorale = function(a){ return (a && a.morale != null) ? Number(a.morale) : 60; };  // 镜像 tm-military _armyMorale
  const mF = new Function('window', moraleSrc + '\nreturn rightArmyMoraleValue;')({ _armyMorale: realMorale });
  ok(mF({ morale: 85 }) === 85, '④ morale 有值透传(85)');
  ok(mF({}) === 60, '④ morale 缺省→60(真源 MILITARY_DEFAULT_MORALE·非旧 50)');
  ok(mF({ morale: 0 }) === 0, '④ morale=0 读作 0(不被兜回默认)');
  const mF2 = new Function('window', moraleSrc + '\nreturn rightArmyMoraleValue;')({});
  ok(mF2({}) === 60 && mF2({ moraleValue: 42 }) === 42, '④ 真源缺席兜底 60·兼容 moraleValue');
  const stubPct = function(a, keys, fb){ for (var i = 0; i < keys.length; i++){ var v = a && a[keys[i]]; if (v != null) return Math.max(0, Math.min(100, Number(v))); } return fb; };
  const sF = new Function('rightArmyPercent', supplySrc + '\nreturn rightArmySupplyValue;')(stubPct);
  ok(sF({ supplyRatio: 0.9 }) === 90, '④ supply 有 supplyRatio→换算优先(0.9→90)');
  ok(sF({ supplyRatio: 0.5, supply: 20 }) === 50, '④ supplyRatio 优先于 supply(战力口径)');
  ok(sF({ supply: 55 }) === 55, '④ 无 supplyRatio→读 supply');
  ok(sF({}) === 70, '④ supply 缺省→70');
}

// ── ⑤ _pendingAudiences 删除/清洗唯一写口 ──────────────────────
ok(!/\.splice\(/.test(rail), '⑤ rightrail 无裸 splice(删除全部改走 tm-wendui 唯一写口)');
ok(/window\._wdCleansePendingAudiences\(_wdKeep\)/.test(rail), '⑤ 右栏 render 清洗走 _wdCleansePendingAudiences(按谓词)');
ok(/window\._wdRemovePendingAudience\(GM\._pendingAudiences\[idx\]\)/.test(rail), '⑤ 暂却兜底按对象引用删·非 idx splice');
{
  const remSrc = grab(wendui, /function _wdRemovePendingAudience\(ref\) \{[\s\S]*?\n\}/, '_wdRemovePendingAudience');
  const clnSrc = grab(wendui, /function _wdCleansePendingAudiences\(keepFn\) \{[\s\S]*?\n\}/, '_wdCleansePendingAudiences');
  const GM = { _pendingAudiences: [] };
  const api = new Function('GM', remSrc + '\n' + clnSrc + '\nreturn { rem: _wdRemovePendingAudience, cln: _wdCleansePendingAudiences };')(GM);
  const qA = { name: '甲' }, qB = { name: '乙' }, qC = { name: '丙' };
  GM._pendingAudiences = [qA, qB, qC];
  api.rem(qB);
  ok(GM._pendingAudiences.length === 2 && GM._pendingAudiences.indexOf(qB) < 0 && GM._pendingAudiences[0] === qA && GM._pendingAudiences[1] === qC,
    '⑤ 按对象引用删中 qB(不误删 qA/qC)');
  api.rem(qC);   // 旧 render-time index=2 早失真·按引用仍准
  ok(GM._pendingAudiences.length === 1 && GM._pendingAudiences[0] === qA, '⑤ 数组已缩后仍按引用命中 qC(index 早失真)');
  ok(api.rem('甲') === qA && GM._pendingAudiences.length === 0, '⑤ 按稳定名删');
  const r1 = { name: '外邦', foreign: true }, r2 = { name: '本朝' };
  GM._pendingAudiences = [r1, r2];
  api.cln(function(q){ return !q.foreign; });
  ok(GM._pendingAudiences.length === 1 && GM._pendingAudiences[0] === r2, '⑤ 清洗按谓词滤除(外邦)保留本朝');
  const before = GM._pendingAudiences;
  api.cln(function(){ return true; });
  ok(GM._pendingAudiences === before, '⑤ 无剔除时不重建数组(引用稳定)');
}

console.log('\nsmoke-rightrail-datasource ' + (F === 0 ? 'PASS' : 'FAIL') + ' ' + A + ' assertions, ' + F + ' fail');
process.exit(F === 0 ? 0 : 1);
