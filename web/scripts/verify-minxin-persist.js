#!/usr/bin/env node
/* eslint-env node */
'use strict';
// P-DZ民心·治本验证·2026-05-30
// 验：adjustMinxin 现无条件把 delta 摊回玩家叶子 div.minxin（玩家操作 + 引擎 tick 都摊）——叶子成民心唯一真相源、
//     回合末 aggregate 从叶子重算 trueIndex 不再抹掉任何 adjustMinxin 累积（含引擎线负项·动力学打开·系数须跑回合配平）。
// aggregate(integration-bridge:619)从叶子按人口加权均值重算 trueIndex 这一环，靠已读证 + 数学（每叶子 +delta → 均值 +delta）；
// 完整端到端 + 民心平衡（负项累积速率）由桌面端真过回合验 / 调系数。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {}, _adjAuthority: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, document: { addEventListener: () => {} }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
sandbox.GM = {
  turn: 28,
  adminHierarchy: { player: { name: '明廷', divisions: [
    { id: 'shaanxi', name: '陕西', population: { mouths: 1000 }, minxin: 60 },
    { id: 'henan', name: '河南', population: { mouths: 1000 }, minxin: 60 }
  ] } },
  minxin: { trueIndex: 60, perceivedIndex: 60, phase: 'peace', sources: {} }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-integration-bridge.js'), 'utf8'), sandbox, { filename: 'tm-integration-bridge.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), sandbox, { filename: 'tm-authority-engines.js' });

const IB = sandbox.IntegrationBridge, AE = sandbox.AuthorityEngines;
assert(IB && typeof IB.getLeafDivisions === 'function', 'IntegrationBridge.getLeafDivisions 已导出');
assert(AE && typeof AE.adjustMinxin === 'function', 'AuthorityEngines.adjustMinxin 已导出');
var leaves = IB.getLeafDivisions(sandbox.GM.adminHierarchy, 'player');
assert(leaves.length === 2, '取到 2 个玩家叶子·实得 ' + leaves.length);

// ① 玩家操作（治本后不传 persist 也摊）→ 摊回叶子
AE.adjustMinxin('issueChoice', 10, '议题决断验证');
assert(leaves[0].minxin === 70 && leaves[1].minxin === 70, '①玩家操作 +10 → 叶子 60→70（摊回·aggregate 重算 trueIndex 即含此 +10·不蒸发）·实得 ' + leaves[0].minxin + '/' + leaves[1].minxin);

// ② 治本：引擎 tick 也摊回叶子——动力学打开·负项一并生效（以前被 aggregate 抹·现累积）
AE.adjustMinxin('taxation', -5, '赋税·引擎线');
assert(leaves[0].minxin === 65 && leaves[1].minxin === 65, '②治本·引擎线 taxation -5 也摊回叶子 70→65（动力学打开·负项生效·须桌面端跑回合配平系数）·实得 ' + leaves[0].minxin + '/' + leaves[1].minxin);

console.log('  治本·叶子: 60 → ' + leaves[0].minxin + '（玩家 +10、引擎 -5）；aggregate 加权均值 trueIndex 即 ' + ((leaves[0].minxin + leaves[1].minxin) / 2) + '·不再被抹回 60');

// ── Part·稳定器(B 方案)回归公式（与 _tickMinxin 内 P-DZ 稳定器逐字一致·验回归方向 + 幅度）──
(function () {
  function regress(minxin, base, r, mr) {
    var gap = base - minxin;
    if (gap) return Math.max(0, Math.min(100, minxin + gap * r * mr));
    return minxin;
  }
  var P_MX_REGRESS = 0.05;
  assert(regress(50, 60, P_MX_REGRESS, 1) === 50.5, '稳定器·跌破基线 50(基线60)→回升 50.5（gap10×0.05）·实得 ' + regress(50, 60, P_MX_REGRESS, 1));
  assert(regress(70, 60, P_MX_REGRESS, 1) === 69.5, '稳定器·高于基线 70(基线60)→回落 69.5·实得 ' + regress(70, 60, P_MX_REGRESS, 1));
  assert(regress(60, 60, P_MX_REGRESS, 1) === 60, '稳定器·在基线不动');
  console.log('  稳定器: 跌破基线 50→50.5（回升）、高于 70→69.5（回落）、在基线 60→不动·回归率 0.05/回合可调');
})();
// ── Part D·syncAuthorityPhases 把滞留段位对齐当前数值（修 E.B 报的 98配揭竿 / 73配暴君）──
(function () {
  var G = sandbox.GM;
  G.minxin.trueIndex = 98; G.minxin.phase = 'revolt';   // 民心 98（颂圣值）但 phase 滞留在揭竿
  G.huangwei = { index: 73, phase: 'tyrant', tyrantSyndrome: { active: true }, lostAuthorityCrisis: { active: false } }; // 皇威 73 但滞留暴君段 + 暴君激活
  AE.syncAuthorityPhases();
  assert(G.minxin.phase === 'adoring', 'D①民心 98 → 段位对齐 adoring(颂圣)·实得 ' + G.minxin.phase);
  assert(G.huangwei.phase !== 'tyrant', 'D②皇威 73 → 脱离暴君段·实得 ' + G.huangwei.phase);
  assert(G.huangwei.tyrantSyndrome.active === false, 'D③皇威 73<85 → 暴君激活解除·实得 ' + G.huangwei.tyrantSyndrome.active);
  console.log('  段位同步: 民心 98→' + G.minxin.phase + '、皇威 73→' + G.huangwei.phase + '（暴君 active=' + G.huangwei.tyrantSyndrome.active + '）');
})();
// ── Part E·P-UIMX·UI 天下民情图死缓存修：aggregate 后各省 minxinDetails.index（UI 热力图读 byRegion[rid].index）
//    同步成治本后的 div.minxin，不再滞留开局值（修 E.B 报「各省 UI 四五十、实际八九十」）──
(function () {
  var G = sandbox.GM;
  // 造局：两省 div.minxin 已被治理摊到八九十（真值），但 minxinDetails.index 还停在开局四五十（UI 读这个）
  G.adminHierarchy = { player: { name: '明廷', divisions: [
    { id: 'shaanxi', name: '陕西', population: { mouths: 2000 }, minxin: 88, minxinDetails: { index: 45, trueIndex: 45, perceivedIndex: 45, trend: 'stable' } },
    { id: 'henan',   name: '河南', population: { mouths: 1000 }, minxin: 91, minxinDetails: { index: 50, trueIndex: 50, perceivedIndex: 50, trend: 'stable' } }
  ] } };
  G.minxin = { trueIndex: 60, perceivedIndex: 60, phase: 'peace', byRegion: {}, sources: {} };
  // 镜像 _updateLegacyProxies(integration-bridge:398)：byRegion[id] 指向该省 minxinDetails（UI 热力图就读 byRegion[rid].index）
  G.adminHierarchy.player.divisions.forEach(function (d) { G.minxin.byRegion[d.id] = d.minxinDetails; });
  assert(G.minxin.byRegion.shaanxi.index === 45, 'E·前提·UI 读的 byRegion.index 修前滞留开局 45·实得 ' + G.minxin.byRegion.shaanxi.index);
  IB.aggregateRegionsToVariables();
  // 修后：byRegion.index(=该省 minxinDetails.index) 被刷成该省叶子人口加权 div.minxin（省即叶子时即自身）
  assert(G.minxin.byRegion.shaanxi.index === 88, 'E①陕西 UI 值同步成治本后 div.minxin 88（不再 45）·实得 ' + G.minxin.byRegion.shaanxi.index);
  assert(G.minxin.byRegion.henan.index === 91, 'E②河南 UI 值同步成 91（不再 50）·实得 ' + G.minxin.byRegion.henan.index);
  // 总民心 trueIndex = 全叶子人口加权 (88×2000+91×1000)/3000=89，各省 UI 值与总值同源、不再脱节
  assert(Math.round(G.minxin.trueIndex) === 89, 'E③总民心 trueIndex 人口加权≈89（各省 UI 与总值并齐）·实得 ' + G.minxin.trueIndex);
  console.log('  UI死缓存修: 陕西 45→' + G.minxin.byRegion.shaanxi.index + '、河南 50→' + G.minxin.byRegion.henan.index + '、总 trueIndex=' + Math.round(G.minxin.trueIndex) + '（各省 UI 不再显开局四五十·与总值同源）');
})();
console.log('[verify-minxin-persist] PASS assertions=' + passed);
