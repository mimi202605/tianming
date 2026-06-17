// verify-wentian-army-hardchange.js — P-D4J 波5：问天直改名册 军队解析自检
//   从 tm-game-loop.js 真源码切出 3 个 army helper + 依赖的 token 归一函数（不复制·用实文件），验：
//   ①字段别名 ②前缀路径(armies/军)允许模糊 ③裸军名只认精确 ④绝不劫持 guoku/民心 等 GM 字段路径 ⑤解析到真军对象(非数组幽灵属性)。
//   跑：node scripts/verify-wentian-army-hardchange.js
'use strict';
var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, '..', 'tm-game-loop.js'), 'utf8');
function slice(from, to) {
  var i = src.indexOf(from);
  var j = src.indexOf(to, i + from.length);
  if (i < 0 || j < 0) { console.log('slice 失败: ' + from); process.exit(1); }
  return src.slice(i, j);
}
var blockNorm = slice('function _wtNormalizeCharacterLookupToken', 'function _wtFindCharacterHardChangeTarget');
var blockArmy = slice('function _wtCanonicalArmyHardChangeField', 'function _wtApplyHardChange');

global.GM = { armies: [
  { name: '天龙军', soldiers: 2000, morale: 40 },
  { name: '神机营', soldiers: 8000 }
] };

eval(blockNorm + '\n' + blockArmy +
  '\nglobal.__resolve = _wtResolveArmyHardChange; global.__canon = _wtCanonicalArmyHardChangeField;');
var resolve = global.__resolve, canon = global.__canon;

var pass = 0, fail = 0;
function check(d, c) { if (c) { pass++; console.log('  ✓ ' + d); } else { fail++; console.log('  ✗ ' + d); } }

console.log('案1·字段别名归一');
check('兵力→soldiers', canon('兵力') === 'soldiers');
check('主帅→commander', canon('主帅') === 'commander');
check('士气→morale·欠饷→payArrearsMonths', canon('士气') === 'morale' && canon('欠饷') === 'payArrearsMonths');

console.log('案2·前缀路径 armies.天龙军.soldiers');
var r1 = resolve(['armies', '天龙军', 'soldiers']);
check('解析命中·field=soldiers', r1 && r1.field === 'soldiers');
check('指向真军对象（GM.armies[0]·非幽灵）', r1 && r1.army === GM.armies[0] && r1.index === 0);

console.log('案3·中文前缀 军.天龙军.士气');
var r2 = resolve(['军', '天龙军', '士气']);
check('解析命中·field=morale', r2 && r2.field === 'morale' && r2.army === GM.armies[0]);

console.log('案4·裸军名（精确）天龙军.兵力');
var r3 = resolve(['天龙军', '兵力']);
check('裸名精确命中·field=soldiers', r3 && r3.field === 'soldiers' && r3.army === GM.armies[0]);

console.log('案5·前缀允许模糊·armies.天龙.soldiers');
var r4 = resolve(['armies', '天龙', 'soldiers']);
check('前缀模糊命中天龙军（唯一 loose）', r4 && r4.army === GM.armies[0]);

console.log('案6·安全：绝不劫持 GM 字段路径');
check('guoku.money 不被当军队', resolve(['guoku', 'money']) === null);
check('minxin.trueIndex 不被当军队', resolve(['minxin', 'trueIndex']) === null);
check('裸名模糊不放行：天龙.兵力 → null（无精确军名 天龙）', resolve(['天龙', '兵力']) === null);

console.log('\n结果：' + pass + ' 过 / ' + fail + ' 败');
process.exit(fail ? 1 : 0);
