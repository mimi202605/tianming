#!/usr/bin/env node
'use strict';
// smoke-promotion-subs-walk — 品级解析器官制树子键修(Tier1·簇1#2)
//   resolveRankLevel 遍历树用 n.children/n.depts，但真实子键是 n.subs(office-system 全走它)→holder 匹配对整棵嵌套树失效。
//   验:源含 n.subs 遍历 + 复刻 walk 证 subs 子衙门 positions 被收集。
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }

console.log('smoke-promotion-subs-walk');
const prom = fs.readFileSync(path.join(ROOT,'tm-promotion.js'),'utf8');
ok(/if \(n\.subs\) walk\(n\.subs\)/.test(prom), '★resolveRankLevel walk 现遍历 n.subs(真实子键)');
ok(/if \(n\.children\) walk\(n\.children\)/.test(prom), '保留 children 兜底(防御)');

// 复刻 walk:子衙门(subs)里的 positions 必须被收集到 poss
function collectPoss(ot, includeSubs){
  var poss = [];
  (function walk(ns){ (ns||[]).forEach(function(n){ if(!n) return; if(Array.isArray(n.positions)) n.positions.forEach(function(p){ if(p) poss.push(p); }); if(includeSubs && n.subs) walk(n.subs); if(n.children) walk(n.children); if(n.depts) walk(n.depts); }); })(Array.isArray(ot)?ot:[ot]);
  return poss;
}
// 模拟明制:内阁(顶层) → 六部(subs) → 司(subs.subs)·holder 在子衙门
const tree = [{ name:'内阁', positions:[{name:'大学士', holder:'张三'}], subs:[
  { name:'吏部', positions:[{name:'尚书', holder:'李四'}], subs:[
    { name:'文选司', positions:[{name:'郎中', holder:'王五'}] }
  ]}
]}];
const withSubs = collectPoss(tree, true).map(function(p){return p.holder;});
const withoutSubs = collectPoss(tree, false).map(function(p){return p.holder;});
ok(withSubs.indexOf('李四') >= 0 && withSubs.indexOf('王五') >= 0, '★走 subs:子衙门(尚书/郎中)holder 被收集');
ok(withoutSubs.indexOf('李四') < 0, '★swap-test:不走 subs→子衙门 holder 漏掉(复现旧 bug)');
ok(withoutSubs.indexOf('张三') >= 0, '顶层 holder 两种走法都在');

console.log('\n结果: '+A+' 通过 / 0 失败');
