'use strict';
// 阶段1地基验证：map-editor-to-game.js 的 convertMapEditorToAdminHierarchy 应按 parentId 建层级树
// (省→府→县·children 嵌套·非全平铺并列)·且树结构支持 liveRegionVitals 式叶子人口加权聚合(府县数据→省)。
var path = require('path');
var bridge = require(path.join(__dirname, '..', 'map-editor-to-game.js'));
var convert = bridge && bridge.convertMapEditorToAdminHierarchy;

var fails = 0, passes = 0;
function ok(c, m){ if (c){ passes++; } else { fails++; console.error('  ✗ ' + m); } }

if (typeof convert !== 'function'){ console.error('convertMapEditorToAdminHierarchy 未导出 (require global 形态)'); process.exit(1); }

// 省(明·无父) + 2府(parentId=省) + 1县(parentId=顺天府)
var meData = {
  factions: [{ id: 'ming', name: '大明' }],
  divisions: [
    { id: 'prov1', name: '北直隶', level: 'province', factionId: 'ming', population: { mouths: 0 }, minxinLocal: 60, prosperity: 50 },
    { id: 'pref1', name: '顺天府', level: 'prefecture', parentId: 'prov1', factionId: 'ming', population: { mouths: 0 }, minxinLocal: 70, prosperity: 80 },
    { id: 'pref2', name: '保定府', level: 'prefecture', parentId: 'prov1', factionId: 'ming', population: { mouths: 500000 }, minxinLocal: 40, prosperity: 30, economyBase: { farmland: 1000, commerceVolume: 500 } },
    { id: 'county1', name: '大兴县', level: 'county', parentId: 'pref1', factionId: 'ming', population: { mouths: 200000 }, minxinLocal: 75, prosperity: 85, economyBase: { farmland: 800, commerceVolume: 300 } }
  ]
};

var ah = convert(meData);
ok(ah && ah['大明'], 'adminHierarchy 有「大明」势力组');
var divs = ah && ah['大明'] && ah['大明'].divisions;
ok(divs && divs.length === 1, '顶层只 1 个省(府县不再平铺并列)·实际=' + (divs ? divs.length : 'n/a'));
var prov = divs && divs[0];
ok(prov && prov.name === '北直隶', '顶层=北直隶');
ok(prov && prov.children && prov.children.length === 2, '省下挂 2 府·实际=' + (prov && prov.children ? prov.children.length : 'n/a'));
var st = prov && prov.children && prov.children.filter(function(c){ return c.name === '顺天府'; })[0];
ok(st && st.children && st.children.length === 1, '顺天府下挂 1 县');
ok(st && st.children && st.children[0] && st.children[0].name === '大兴县', '顺天府的子=大兴县');
ok(prov && prov.minxin === 60, 'minxinLocal→minxin 字段对齐·省 minxin=60·实际=' + (prov && prov.minxin));

// 模拟 liveRegionVitals 叶子人口加权聚合(府县→省)：叶子=保定府(40·50万)+大兴县(75·20万)
// 顺天府有子(非叶·跳)。加权 = (40*500000 + 75*200000)/700000 = 50.0
// 镜像 phase8 liveRegionVitals 聚合(补1)：民心人口加权平均 + 人口/田亩求和
function aggVitals(node){
  var mxW = 0, wsum = 0, popSum = 0, farmSum = 0;
  function leafPop(d){ return (d.population && d.population.mouths) || 0; }
  (function walk(d){
    var kids = d.children || d.divisions;
    if (kids && kids.length){ kids.forEach(walk); return; }
    var w = leafPop(d) > 0 ? leafPop(d) : 1;
    if (typeof d.minxin === 'number' && isFinite(d.minxin)){ mxW += d.minxin * w; wsum += w; }
    popSum += leafPop(d);
    farmSum += Number((d.economyBase || {}).farmland) || 0;
  })(node);
  return { minxin: wsum ? Math.round((mxW / wsum) * 10) / 10 : null, population: popSum, farmland: farmSum };
}
var pv = aggVitals(prov);
ok(pv.minxin === 50, '省民心=府县叶子人口加权=50(加权平均)·实际=' + pv.minxin);
ok(pv.population === 700000, '省人口=府县叶子求和=70万(补1·sum)·实际=' + pv.population);
ok(pv.farmland === 1800, '省田亩=府县叶子求和=1800(补1·economyBase sum)·实际=' + pv.farmland);

// 无 parentId 的老剧本(全平铺)仍应工作：3 个无父 div 都进顶层
var flatData = { factions: [{ id: 'ming', name: '大明' }], divisions: [
  { id: 'a', name: '甲省', level: 'province', factionId: 'ming' },
  { id: 'b', name: '乙省', level: 'province', factionId: 'ming' },
  { id: 'c', name: '丙省', level: 'province', factionId: 'ming' }
]};
var ah2 = convert(flatData);
ok(ah2 && ah2['大明'] && ah2['大明'].divisions.length === 3, '无 parentId 老剧本回落全平铺(3 顶层)·向后兼容·实际=' + (ah2 && ah2['大明'] ? ah2['大明'].divisions.length : 'n/a'));

// 补3·region 几何父子索引(镜像 phase8 regionChildIndex·io 导出 regions 带 parentId)
var regions = [
  { id: 'prov1', name: '北直隶', level: 'province', parentId: null },
  { id: 'pref1', name: '顺天府', level: 'prefecture', parentId: 'prov1' },
  { id: 'pref2', name: '保定府', level: 'prefecture', parentId: 'prov1' },
  { id: 'county1', name: '大兴县', level: 'county', parentId: 'pref1' }
];
var byParent = {};
regions.forEach(function(r){ if (r.parentId){ (byParent[r.parentId] = byParent[r.parentId] || []).push(r); } });
ok((byParent['prov1'] || []).length === 2, 'region 索引:省含 2 府 region(补3)·实际=' + ((byParent['prov1'] || []).length));
ok((byParent['pref1'] || []).length === 1, 'region 索引:顺天府含 1 县 region(补3)·实际=' + ((byParent['pref1'] || []).length));

// 阶段2a·按 mapScale 分级过滤(镜像 phase8 visibleRegionsForScale)
function regionTier2(r){ return String((r && (r.level || (r.data && r.data.level))) || ''); }
function levelsForScale2(scale){
  if (scale === 'prefecture') return ['prefecture', 'county', 'district'];
  if (scale === 'region') return ['province'];
  if (scale === 'realm') return ['country', 'power', 'empire', 'kingdom'];
  return null;
}
function visibleForScale(rs, scale){
  if (!rs.length) return rs;
  var want = levelsForScale2(scale);
  if (!want) return rs;
  if (!rs.some(function(r){ return regionTier2(r); })) return rs;
  var f = rs.filter(function(r){ return want.indexOf(regionTier2(r)) >= 0; });
  return f.length ? f : rs;
}
var mixed = [{ id: 'p1', level: 'province' }, { id: 'p2', level: 'province' }, { id: 'f1', level: 'prefecture' }, { id: 'f2', level: 'prefecture' }, { id: 'c1', level: 'county' }];
ok(visibleForScale(mixed, 'region').length === 2, '行省视域→只 2 省·实际=' + visibleForScale(mixed, 'region').length);
ok(visibleForScale(mixed, 'prefecture').length === 3, '府县视域→2府+1县=3·实际=' + visibleForScale(mixed, 'prefecture').length);
ok(visibleForScale(mixed, 'realm').length === 5, '天下视域(剧本无country级)→回落全量5不空屏·实际=' + visibleForScale(mixed, 'realm').length);
ok(visibleForScale([{ id: 'a' }, { id: 'b' }], 'region').length === 2, '老剧本无level→全量(向后兼容)');

// 阶段3·zoom 联动阈值(镜像 phase8 scaleToBand/bandToScale)
function scaleToBand(sc){ sc = Number(sc) || 1; return sc >= 2.3 ? 'prefecture' : (sc >= 1.3 ? 'region' : 'realm'); }
function bandToScale(b){ return b === 'prefecture' ? 3.0 : (b === 'realm' ? 1.0 : 1.7); }
ok(scaleToBand(1.0) === 'realm', 'zoom 1.0→天下(realm)');
ok(scaleToBand(1.7) === 'region', 'zoom 1.7→行省(region)');
ok(scaleToBand(3.0) === 'prefecture', 'zoom 3.0→府县(prefecture)');
['realm', 'region', 'prefecture'].forEach(function(b){
  ok(scaleToBand(bandToScale(b)) === b, '按钮切「' + b + '」带动缩放→反推同 band 不切回(防冲突)·实际=' + scaleToBand(bandToScale(b)));
});

console.log((fails ? '✗ ' : '✓ ') + passes + ' 通过·' + fails + ' 失败 [建树+聚合+region索引+分级过滤+zoom联动阈值]');
process.exit(fails ? 1 : 0);
