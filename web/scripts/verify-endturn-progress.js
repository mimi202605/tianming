// 拍表引擎（tm-endturn-progress.js）+ tm-utils 爬升上界 验证
// 用法: node scripts/verify-endturn-progress.js
'use strict';
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { passed++; console.log('  PASS', name); }
  else { failed++; console.log('  FAIL', name); }
}

const ROOT = path.join(__dirname, '..');

// ───── 1. tm-utils 源码断言（爬升上界三处改动在位） ─────
console.log('[1] tm-utils.js 源码断言');
const utilsSrc = fs.readFileSync(path.join(ROOT, 'tm-utils.js'), 'utf8');
assert(utilsSrc.includes('function setLoadingCrawlCeil(v)'), 'setLoadingCrawlCeil 已定义');
assert(utilsSrc.includes('if(cur>_loadingCrawlCeil)cur=_loadingCrawlCeil;'), '爬升 interval 使用可调上界');
assert(utilsSrc.includes('if(cur<_loadingMaxPct)cur=_loadingMaxPct;'), '爬升不回退保护在位');
assert(/hideLoading\(\)\{[\s\S]{0,400}_loadingCrawlCeil = 95;/.test(utilsSrc), 'hideLoading 复位上界');

// ───── 2. index.html 接线断言 ─────
console.log('[2] index.html 接线断言');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(idxSrc.includes('tm-endturn-progress.js?v='), 'tm-endturn-progress.js 已接入');
assert(idxSrc.includes('tm-endturn-loading.js?v='), 'tm-endturn-loading.js 已接入');

// ───── 3. 引擎行为：stub 环境重放真实标签序列 ─────
console.log('[3] 拍表引擎行为重放');
global.window = global;

// stub：模拟 tm-utils showLoading 合约（单调钳制）
const shown = [];           // {msg, pct, displayed}
const ceilCalls = [];
let stubMaxPct = 0;
global.showLoading = function(msg, pct) {
  const requested = pct || 5;
  const displayed = Math.max(requested, stubMaxPct);
  stubMaxPct = displayed;
  shown.push({ msg: String(msg), pct: requested, displayed });
};
global.hideLoading = function() { stubMaxPct = 0; };
global.setLoadingCrawlCeil = function(v) { ceilCalls.push(v); };

// 加载真实引擎文件
eval(fs.readFileSync(path.join(ROOT, 'tm-endturn-progress.js'), 'utf8'));

const events = [];
TM.Endturn.Progress.on((type, payload) => events.push({ type, payload }));

// —— 3a. 非过回合流程直通（开局生成式调用） ——
showLoading('生成世界中', 0);
showLoading('构建索引...', 50);
assert(!TM.Endturn.Progress.isActive(), '非过回合调用不开闸');
assert(shown[shown.length - 1].pct === 50, '非过回合 pct 原样直通');
hideLoading();
stubMaxPct = 0; shown.length = 0; ceilCalls.length = 0; events.length = 0;

// —— 3b. 真实过回合标签序列（含全部倒序病灶） ——
const SEQ = [
  ['时移事去', 10],
  ['回合阶段 1/6 · 整理本回合操作', 18],
  ['回合阶段 2/6 · 预取辅助资料', 30],
  ['回合阶段 3/6 · AI 主推演', 42],
  ['检索数据库中', 20],            // 倒序 real 20
  ['打包数据', 25],                // 倒序 real 25
  ['AI深度思考', 42],
  ['AI推演 (1/2)', 50],            // 双段式别名 → 流式拍位
  ['AI推演中·已生成3.2k字', 52],   // 流式真实公式值
  ['AI推演中·已生成12.8k字', 58],
  ['深度回顾', 48],                // 倒序 real 48
  ['史官成文', 57],
  ['文事·势力·并行推演', 58],
  ['NPC全面推演', 60],
  ['势力自主推演', 63],
  ['经济财政推演', 65],
  ['军事态势推演', 67],
  ['NPC记忆回写', 67],
  ['AI撰写后人戏说', 70],
  ['叙事质量审查', 85],
  ['NPC 认知整合', 89],
  ['历史检查', 85],                // 倒序病灶①
  ['解析', 90],
  ['回合阶段 4/6 · 应用诏令附效', 54],   // 母拍倒序
  ['考官拟题中...', 50],           // 横插未知标签（科举）
  ['回合阶段 5/6 · 系统结算', 66],
  ['更新数据', 92],
  ['运行 NPC Engine', 94.5],
  ['计算领地产出', 92.5],          // 倒序病灶②
  ['财政结算', 93],
  ['应用决策变动', 93],
  ['检查历史事件', 93.4],
  ['检查职位与寿数', 93.7],
  ['处理监听队列', 94],
  ['清理回合缓存', 94.3],
  ['回合阶段 6/6 · 生成史记弹窗', 78],
  ['生成史记弹窗', 97]
];
for (const [msg, pct] of SEQ) showLoading(msg, pct);

assert(TM.Endturn.Progress.isActive(), '「时移事去」开闸');
assert(events.some(e => e.type === 'start'), '发 start 事件');

// 显示值全程单调
let monotonic = true;
for (let i = 1; i < shown.length; i++) if (shown[i].displayed < shown[i - 1].displayed) monotonic = false;
assert(monotonic, '显示 pct 全程单调不回退');

// 拍只进不退
const beatIdxSeq = events.filter(e => e.type === 'beat').map(e => e.payload.index);
let beatsMono = true;
for (let i = 1; i < beatIdxSeq.length; i++) if (beatIdxSeq[i] < beatIdxSeq[i - 1]) beatsMono = false;
assert(beatsMono, '拍序只进不退');

// 倒序标签拿到表值（不再用原始倒序值）
const find = m => shown.find(s => s.msg === m);
assert(find('检索数据库中').pct === 42.3, '检索数据库中: real 20 → 表值 42.3');
assert(find('历史检查').pct === 89.5, '历史检查: real 85 → 表值 89.5（≥认知整合 89）');
assert(find('计算领地产出').pct === 93.1, '计算领地产出: real 92.5 → 表值 93.1（单调段内）');
assert(find('回合阶段 4/6 · 应用诏令附效').pct === 91, '母拍 4/6: real 54 → 表值 91');
assert(find('生成史记弹窗').pct === 97, '生成史记弹窗保持 97');

// 流式拍尊重调用方实算值
assert(find('AI推演中·已生成3.2k字').pct === 52, '流式拍用调用方实算 52');
assert(find('AI推演中·已生成12.8k字').pct === 58, '流式拍用调用方实算 58');
assert(find('AI推演 (1/2)').pct === 50, '双段式别名并入流式拍位(50)');

// 未知标签：直通、不动拍
const kejuShown = find('考官拟题中...');
assert(kejuShown.pct === 50, '横插未知标签 pct 原样传递（由钳制兜底）');
const labelEvt = events.find(e => e.type === 'label' && e.payload.label === '考官拟题中...');
assert(!!labelEvt, '未知标签发 label 事件不发 beat');
const beatAtKeju = beatIdxSeq.filter((_, i) => i < beatIdxSeq.length); // 拍序里不含未知标签
assert(events.filter(e => e.type === 'beat').every(e => e.payload.label !== '考官拟题中...'), '未知标签不进拍序');

// 爬升上界全程 < 下一拍表值
const BEATS = TM.Endturn.Progress.BEATS;
let ceilOk = ceilCalls.length > 0;
assert(ceilOk, '每拍设置爬升上界');
const lastCeil = ceilCalls[ceilCalls.length - 1];
assert(lastCeil === 98.5, '末拍上界 98.5（生成史记后可爬向收满）');

// hideLoading 收束
hideLoading();
assert(!TM.Endturn.Progress.isActive(), 'hideLoading 关闸');
assert(events.some(e => e.type === 'done'), '发 done 事件');

// —— 3c. 二次开闸（下一回合）重置干净 ——
shown.length = 0;
showLoading('时移事去', 10);
assert(TM.Endturn.Progress.isActive(), '下一回合重新开闸');
assert(shown[0].displayed === 10, '新回合从 10 起步（残值已清）');
hideLoading();
assert(!TM.Endturn.Progress.isActive(), '未到末拍且不忙：abort 关闸');
assert(events.some(e => e.type === 'abort'), '发 abort 事件（中止路）');

// —— 3d. 中途 hideLoading（朝会/横插）：busy 时 pause 不关闸，可复出 ——
global.GM = { _endTurnBusy: true };
events.length = 0;
showLoading('时移事去', 10);
showLoading('回合阶段 3/6 · AI 主推演', 42);
showLoading('深度回顾', 48);
hideLoading();                                  // 中途 hide（如朝会 deferred 路）
assert(TM.Endturn.Progress.isActive(), '回合仍忙：pause 不关闸');
assert(events.some(e => e.type === 'pause'), '发 pause 事件');
showLoading('史官成文', 57);                    // 推演继续 → 复出
assert(events.filter(e => e.type === 'beat').some(e => e.payload.beat.id === 'ai-text'), 'pause 后拍继续推进');
GM._endTurnBusy = false;
hideLoading();                                  // 不忙了 → 中止收闸
assert(!TM.Endturn.Progress.isActive(), '不忙后 hideLoading 关闸（abort）');
delete global.GM;

// —— 3e. 正常收尾：到末拍的 hideLoading 必须是 done（即使 busy 仍 true） ——
global.GM = { _endTurnBusy: true };
events.length = 0;
showLoading('时移事去', 10);
showLoading('生成史记弹窗', 97);
hideLoading();
assert(events.some(e => e.type === 'done'), '末拍 hideLoading = done（busy 仍 true 也算正常落幕）');
assert(!TM.Endturn.Progress.isActive(), 'done 后关闸');
delete global.GM;

console.log('\n结果: ' + passed + ' PASS / ' + failed + ' FAIL');
process.exit(failed ? 1 : 0);
