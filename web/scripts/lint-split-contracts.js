// @ts-check
// scripts/lint-split-contracts.js — 保序切割契约守卫（2026-07-04）
//
// 背景：巨石立项拆的行为等价性完全建立在「sibling 紧挨 origin 按序装载」上——
//   执行顺序与拆分前逐字节等价。此前只靠 <script> 里的「勿动位置」注释裸奔；
//   任何人（含未来的自己/并行会话/发版工具）挪动或在中间插入脚本都会静默破坏等价性。
// 契约：每座已拆巨石登记一条 [before..., origin, after...] 序列，
//   要求它在对应入口 html 的 <script src> 顺序里**连续且按序**出现。
// 新拆一座巨石 → 在对应入口的 CONTRACTS 里加一条（拆分脚本收尾步骤之一）。
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/** index.html 入口的拆分家族（含 origin 自身·按应有顺序） */
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
  // 第十拆(IIFE 型首例)：tm-corruption 三片·R9 假性 IIFE(engine+p2+p4 嵌套)倒回·engine 先(挂 CorruptionEngine)→ cases/extras monkey-patch
  ['tm-corruption-engine.js', 'tm-corruption-cases.js', 'tm-corruption-extras.js'],
  // 第十二拆(顶层函数型后缀切)：tm-mechanics NPC记忆/成长片·memory 紧挨 origin(其后为 mechanics-world)
  ['tm-mechanics.js', 'tm-mechanics-memory.js'],
  // 第十三拆(顶层函数型后缀切)：tm-feudal §G-§N warfare片·紧挨 origin
  ['tm-feudal.js', 'tm-feudal-warfare.js'],
  // 第十四拆(顶层函数型中段切)：tm-game-loop §5b 问天直改引擎·紧挨 origin
  ['tm-game-loop.js', 'tm-game-loop-wentian-hardchange.js'],
  // 第十五拆(顶层函数型中段切)：tm-hongyan-office letter 主域留守·中段切出 renderGameState(game-ui-shell)+edict UI(edict-ui)
  //   letter 夹在两片外侧(head=letter part1·tail=register('letters')/doctor/diag)·origin=head+tail·三片须连序
  ['tm-hongyan-office.js', 'tm-game-ui-shell.js', 'tm-hongyan-edict-ui.js'],
];

/** editor.html 入口的拆分家族（编辑器侧巨石） */
const EDITOR_CONTRACTS = [
  // 第十一拆(真 IIFE alias 首例)：editor-authoring-agent Provider 簇(D)迁出·provider 须在 origin【之前】装载(填 TM.__aaParts bucket·origin 顶部读 alias)
  ['editor-authoring-agent-provider.js', 'editor-authoring-agent.js'],
  // 第十二拆(editor.html 侧同族)：tm-mechanics memory 片(index.html + editor.html 双入口装载)
  ['tm-mechanics.js', 'tm-mechanics-memory.js'],
  // 第十三拆(editor.html 侧同族)：tm-feudal warfare 片(index.html + editor.html 双入口装载)
  ['tm-feudal.js', 'tm-feudal-warfare.js'],
];

// 提取 <script src="X.js?v=..."> 的有序文件名列表（裸文件名·忽略 query）
function loadOrder(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const order = [];
  const re = /<script[^>]+src="([^"?]+)(?:\?[^"]*)?"/g;
  let m;
  while ((m = re.exec(html)) !== null) order.push(m[1]);
  return order;
}

function checkContracts(order, contracts, entry) {
  let failed = 0;
  for (const seq of contracts) {
    const idxs = seq.map(f => order.indexOf(f));
    const missing = seq.filter((f, i) => idxs[i] === -1);
    if (missing.length) {
      console.error(`[lint-split-contracts] FAIL ${seq[0]} 家族：${entry} 缺装载点 ${missing.join(', ')}`);
      failed++;
      continue;
    }
    // 连续且按序：idxs 必须严格 +1 递增
    let ok = true;
    for (let i = 1; i < idxs.length; i++) if (idxs[i] !== idxs[i - 1] + 1) ok = false;
    if (!ok) {
      console.error(`[lint-split-contracts] FAIL ${seq[0]} 家族：${entry} 装载序被打断/乱序（实际位次 ${idxs.join(',')}）——保序切割等价性要求 sibling 紧挨 origin`);
      console.error(`  应为连续序列：${seq.join(' → ')}`);
      failed++;
    }
  }
  // 附加不变量：每片有且仅有一个装载点（重复装载=同名顶层函数静默覆盖）
  for (const seq of contracts) for (const f of seq) {
    const n = order.filter(x => x === f).length;
    if (n > 1) { console.error(`[lint-split-contracts] FAIL ${f}：${entry} 装载 ${n} 次（应恰 1 次）`); failed++; }
  }
  return failed;
}

let failed = 0;
failed += checkContracts(loadOrder('index.html'), CONTRACTS, 'index.html');
failed += checkContracts(loadOrder('editor.html'), EDITOR_CONTRACTS, 'editor.html');

const total = CONTRACTS.length + EDITOR_CONTRACTS.length;
if (failed === 0) {
  console.log(`[lint-split-contracts] PASS · ${total} 座拆分家族装载序契约全部成立（index.html ${CONTRACTS.length} + editor.html ${EDITOR_CONTRACTS.length}）`);
  process.exit(0);
}
process.exit(1);
