// verify-edict-armybuild.js — P-D4J 波1：诏令建军确定性解析 自检
//   真加载 tm-endturn-edict.js 的 extractEdictActions，喂样本诏令，断言 armyBuilds 解析正确。
//   只验"质/有无 + 防误判"——兵力规模/招募成本由 sc18 AI 定，不在此断言。
//   跑：node scripts/verify-edict-armybuild.js
'use strict';
var fs = require('fs');
var path = require('path');

// ── 最小 stub（extractEdictActions 只用到 GM.chars/officeTree/armies + _dbg）──
global.window = global;
global._dbg = function () {};
global.GM = {
  chars: [],            // 无已知人物——只测建军路（不触发任命/赐死分支）
  officeTree: [],
  armies: [{ name: '京营', soldiers: 50000 }, { name: '天龙军', soldiers: 12000, payArrearsMonths: 3 }]  // 已在册：用于验"同名不重建" + 点名补饷
};
global.P = {};

// 真加载文件，把 extractEdictActions 暴露到 global
var src = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-edict.js'), 'utf8');
eval(src + '\nglobal.__extractEdictActions = extractEdictActions;');
var extract = global.__extractEdictActions;

var pass = 0, fail = 0;
function check(desc, cond) {
  if (cond) { pass++; console.log('  ✓ ' + desc); }
  else { fail++; console.log('  ✗ ' + desc); }
}
function names(text) {
  var a = extract(text);
  return (a.armyBuilds || []).map(function (b) { return b.name; });
}
function builds(text) { return extract(text).armyBuilds || []; }

console.log('案1·正常建军（无兵额）');
var b1 = builds('诏：组建安民锄奸军，装备新式火器，吸纳西北精锐，以靖地方。');
check('识别出 安民锄奸军', b1.length === 1 && b1[0].name === '安民锄奸军');
check('兵额未写 → strength=null（留给 sc18 定）', b1.length === 1 && b1[0].strength == null);
check('特色写入 special（含来头）', b1.length === 1 && /火器|精锐/.test(b1[0].special || ''));

console.log('案2·建军带兵额（中文数字）');
var b2 = builds('诏组建忠勇营五千人，驻宣府。');
check('识别出 忠勇营', b2.length === 1 && b2[0].name === '忠勇营');
check('五千 → strength=5000', b2.length === 1 && b2[0].strength === 5000);

console.log('案3·建军带兵额（三万）');
var b3 = builds('编练破虏军，募三万众。');
check('识别出 破虏军', b3.some(function (b) { return b.name === '破虏军'; }));
check('三万 → 30000', b3.length && b3.filter(function(b){return b.name==='破虏军';})[0].strength === 30000);

console.log('案4·防误判：调动/提及现有军 不当建军');
check('"令京营移驻通州" 不建军', names('令京营移驻通州，加强戒备。').length === 0);
check('"着天龙军开赴辽东" 不建军', names('着天龙军开赴辽东御敌。').length === 0);
check('同名 京营 已在册 → 不重建', names('整顿京营，重振军威。').indexOf('京营') < 0);

console.log('案5·防误判：跨句/连接词 不误抓');
check('"以靖边为名"类不串成军名', names('组建以靖边为名之策，命边将筹画。').every(function (n) { return !/以|为/.test(n); }));

console.log('案6·纯人事诏令 不产生 armyBuilds');
check('任命诏令 armyBuilds 为空', builds('擢孙承宗为兵部尚书。').length === 0);

console.log('案7·补饷诏令解析（波3b）');
function pa(text) { return extract(text).payArrears || []; }
var pa1 = pa('着户部速发九边欠饷·安定军心。');
check('"发九边欠饷" 命中·all=true（泛指九边）', pa1.length === 1 && pa1[0].all === true);
var pa2 = pa('补发天龙军积欠军饷。');
check('"补发天龙军军饷" 点名 天龙军', pa2.length === 1 && pa2[0].names.indexOf('天龙军') >= 0);
check('"整顿京营·重振军威" 无饷字不触发补饷', pa('整顿京营，重振军威。').length === 0);
check('"边军欠饷已逾三月" 纯陈述（无发/补动词）不触发', pa('边军欠饷已逾三月，将士困苦。').length === 0);
var pa3 = pa('着户部发饷·先济京师。');
check('"发饷"无点名 → all=true（泛指）', pa3.length === 1 && pa3[0].all === true);

console.log('\n结果：' + pass + ' 过 / ' + fail + ' 败');
process.exit(fail ? 1 : 0);
