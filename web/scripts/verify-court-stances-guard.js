// 验证：朝议记录 stances 缺失不再崩过回合（消费端护栏 + 生产端兜底）
// 用法: node scripts/verify-court-stances-guard.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log('  PASS', name); }
  else { failed++; console.log('  FAIL', name); }
}

const ROOT = path.join(__dirname, '..');
const promptFile = path.join(ROOT, 'tm-endturn-prompt.js');
const tinyiFile = path.join(ROOT, 'tm-chaoyi-tinyi.js');

// ── 1. 源码断言：两处改动在位，旧裸写已消失 ──
console.log('[1] 源码断言');
const promptSrc = fs.readFileSync(promptFile, 'utf8');
const tinyiSrc = fs.readFileSync(tinyiFile, 'utf8');
assert(promptSrc.includes('Object.keys(cr.stances || {})'), '消费端：Object.keys 加 || {} 护栏');
assert(!/Object\.keys\(cr\.stances\)\.forEach/.test(promptSrc), '消费端：旧裸写 Object.keys(cr.stances) 已消失');
assert(promptSrc.includes('var s = cr.stances[name] || {};'), '消费端：内层 s 也兜底');
assert(tinyiSrc.includes('stances: CY._ty2.stances || {},'), '生产端：tinyi 记录 stances 加 || {} 兜底');

// ── 2. 语法 check（两文件均能被 node 解析，无误伤） ──
console.log('[2] 语法 check');
for (const f of [promptFile, tinyiFile]) {
  let ok = true;
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { ok = false; console.log('    ' + (e.stderr || e.message)); }
  assert(ok, 'node --check ' + path.basename(f));
}

// ── 3. 行为重放：复刻 build() 第 1092-1099 行的注入逻辑，喂坏记录不崩 ──
console.log('[3] 崩溃路径重放');
// 真实失败现场：cr.stances === undefined（旧 tinyi 路 / 旧存档记录）
function injectStances(cr) {
  let tp = '';
  // —— 下列四行逐字对应 tm-endturn-prompt.js:1096-1099（已加护栏版） ——
  Object.keys(cr.stances || {}).forEach(function(name) {
    var s = cr.stances[name] || {};
    tp += '  ' + name + '：' + (s.stance || '') + '——' + (s.brief || '') + '\n';
  });
  return tp;
}

// 3a. stances 为 undefined —— 正是报错现场，须不抛、产出空串
let threw = false, out3a = '';
try { out3a = injectStances({ topic: '阉党清算', mode: 'tinyi', stances: undefined }); }
catch (e) { threw = true; }
assert(!threw, 'stances=undefined 不再抛 Cannot convert undefined or null to object');
assert(out3a === '', 'stances 缺失时该议题不产出立场行（静默跳过）');

// 3b. stances 为 null —— 同样兜住
threw = false;
try { injectStances({ topic: 'x', mode: 'tinyi', stances: null }); } catch (e) { threw = true; }
assert(!threw, 'stances=null 不抛');

// 3c. 正常 stances —— 行为不变，照常产出立场行
const normal = injectStances({
  topic: '盐法', mode: 'tinyi',
  stances: { '韩爌': { stance: '支持', brief: '盐课当清厘' }, '崔呈秀': { stance: '反对', brief: '恐扰商' } }
});
assert(normal.includes('韩爌：支持——盐课当清厘'), '正常 stances 照常产出立场行（行为不变）');
assert(normal.includes('崔呈秀：反对——恐扰商'), '正常 stances 第二条也在');

// 3d. 半残对象（某 name 的值为 undefined）—— 内层兜底防二次崩
threw = false; let out3d = '';
try { out3d = injectStances({ stances: { '甲': undefined, '乙': { stance: '中立' } } }); }
catch (e) { threw = true; }
assert(!threw, '半残 stances（值为 undefined）内层兜底不抛');
assert(out3d.includes('乙：中立——'), '半残时正常条目仍输出');

console.log('\n结果: ' + passed + ' PASS / ' + failed + ' FAIL');
process.exit(failed ? 1 : 0);
