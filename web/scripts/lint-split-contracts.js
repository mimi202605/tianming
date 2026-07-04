// @ts-check
// scripts/lint-split-contracts.js — 保序切割契约守卫（2026-07-04）
//
// 背景：巨石立项拆的行为等价性完全建立在「sibling 紧挨 origin 按序装载」上——
//   执行顺序与拆分前逐字节等价。此前只靠 index.html 里的「勿动位置」注释裸奔；
//   任何人（含未来的自己/并行会话/发版工具）挪动或在中间插入脚本都会静默破坏等价性。
// 契约：每座已拆巨石登记一条 [before..., origin, after...] 序列，
//   要求它在 index.html 的 <script src> 顺序里**连续且按序**出现。
// 新拆一座巨石 → 在 CONTRACTS 里加一条（拆分脚本收尾步骤之一）。
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/** 每条 = 拆分家族的完整装载序（含 origin 自身·按 index.html 应有顺序） */
const CONTRACTS = [
  // 第一拆+第八拆(二切)：tm-tinyi-v3 四片
  ['tm-tinyi-v3-persona.js', 'tm-tinyi-v3.js', 'tm-tinyi-v3-edict-personnel.js', 'tm-tinyi-v3-parties.js'],
  // 第二拆：tm-chaoyi-changchao 三片
  ['tm-chaoyi-changchao-adapter.js', 'tm-chaoyi-changchao.js', 'tm-chaoyi-changchao-flows.js'],
  // 第三拆：tm-keju-runtime 两片
  ['tm-keju-runtime.js', 'tm-keju-runtime-keyi.js'],
  // 第四拆：tm-wendui 两片
  ['tm-wendui.js', 'tm-wendui-persona-views.js'],
  // 第五拆：tm-npc-decision 两片
  ['tm-npc-decision.js', 'tm-npc-decision-ai-driven.js'],
  // 第六拆：tm-patches 两片
  ['tm-patches.js', 'tm-patches-start.js'],
  // 第七拆：tm-economy-engine 两片(头切·currency 在前)
  ['tm-economy-engine-currency.js', 'tm-economy-engine.js'],
  // 第九拆(alias 范式首例)：keju-paradigm-panel·render 必须在前(alias 装载期解析·错序=undefined)
  ['tm-keju-paradigm-panel-render.js', 'tm-keju-paradigm-panel.js'],
];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// 提取 <script src="X.js?v=..."> 的有序文件名列表（仅裸文件名·忽略路径子目录项）
const order = [];
const re = /<script[^>]+src="([^"?]+)(?:\?[^"]*)?"/g;
let m;
while ((m = re.exec(html)) !== null) order.push(m[1]);

let failed = 0;
for (const seq of CONTRACTS) {
  const idxs = seq.map(f => order.indexOf(f));
  const missing = seq.filter((f, i) => idxs[i] === -1);
  if (missing.length) {
    console.error(`[lint-split-contracts] FAIL ${seq[0]} 家族：index.html 缺装载点 ${missing.join(', ')}`);
    failed++;
    continue;
  }
  // 连续且按序：idxs 必须是严格 +1 递增
  let ok = true;
  for (let i = 1; i < idxs.length; i++) if (idxs[i] !== idxs[i - 1] + 1) ok = false;
  if (!ok) {
    console.error(`[lint-split-contracts] FAIL ${seq[0]} 家族：装载序被打断/乱序（实际位次 ${idxs.join(',')}）——保序切割等价性要求 sibling 紧挨 origin`);
    console.error(`  应为连续序列：${seq.join(' → ')}`);
    failed++;
  }
}

// 附加不变量：每片有且仅有一个装载点（重复装载=同名顶层函数静默覆盖）
for (const seq of CONTRACTS) for (const f of seq) {
  const n = order.filter(x => x === f).length;
  if (n > 1) { console.error(`[lint-split-contracts] FAIL ${f}：index.html 装载 ${n} 次（应恰 1 次）`); failed++; }
}

if (failed === 0) {
  console.log(`[lint-split-contracts] PASS · ${CONTRACTS.length} 座拆分家族装载序契约全部成立`);
  process.exit(0);
}
process.exit(1);
