#!/usr/bin/env node
'use strict';
// smoke-search-empty-state — 御案地图搜索 + 人物名册筛选 零结果空状态(纯安全·原空白似面板坏)
//   ① 地图搜索:rows.length 三元·无匹配/未输入两态文案
//   ② 名册筛选:shown===0 注入 #renwu-filter-empty·有结果则 remove·区分搜索空 vs 暂无人物
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }

console.log('smoke-search-empty-state');

// ── ① 地图搜索 ──
const mapSrc = fs.readFileSync(path.join(ROOT,'phase8-formal-map.js'),'utf8');
ok(/host\.innerHTML = rows\.length \?/.test(mapSrc), '① 地图结果走 rows.length 三元(空不再清空 host)');
ok(mapSrc.indexOf('无匹配地块')>=0, '① 有查询无命中→「无匹配地块」');
ok(mapSrc.indexOf('输入地名以检索')>=0, '① 空查询→「输入地名以检索」');
ok(/\(query \? '无匹配地块' : '输入地名以检索'\)/.test(mapSrc), '① 两态按 query 区分');

// ── ② 人物名册筛选 ──
const modSrc = fs.readFileSync(path.join(ROOT,'phase8-formal-modules.js'),'utf8');
ok(/var _rlist = renwuRosterList\(root\)/.test(modSrc), '② 取 .renwu-roster-list 容器');
ok(/getElementById|createElement\('div'\)/.test(modSrc) && modSrc.indexOf("_empty.id = 'renwu-filter-empty'")>=0, '② shown===0 注入 #renwu-filter-empty');
ok(/if \(shown === 0\)/.test(modSrc), '② 条件为 shown===0');
ok(modSrc.indexOf('朝野寂寂·无匹配之人')>=0, '② 筛选/搜索空→「朝野寂寂·无匹配之人」');
ok(/\} else if \(_empty\) \{\s*_empty\.remove\(\);/.test(modSrc), '② 有结果时移除空状态(不残留)');
ok(/q \|\| group !== 'all' \|\| faction !== 'all' \|\| status !== 'all'/.test(modSrc), '② 区分「有筛选条件的空」vs「暂无人物」');

console.log('\n结果: '+A+' 通过 / 0 失败');
