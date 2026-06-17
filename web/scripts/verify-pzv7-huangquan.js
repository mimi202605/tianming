#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·P-ZV7 皇权 ③封顶 + ①A选择性衰减 + ⑤读档削平（同骨架·皇权自己的数·高位反噬另走民心倒U不在此）
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(c, l) { if (!c) throw new Error('[FAIL] ' + l); passed++; console.log('  ok ' + l); }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, document: { addEventListener: () => {} }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-integration-bridge.js'), 'utf8'), sandbox, { filename: 'tm-integration-bridge.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), sandbox, { filename: 'tm-authority-engines.js' });
const AE = sandbox.AuthorityEngines;
assert(AE && typeof AE.adjustHuangquan === 'function', 'AuthorityEngines.adjustHuangquan 已导出');
assert(typeof AE.regularizeHuangquanCaps === 'function', 'AuthorityEngines.regularizeHuangquanCaps 已导出');

function freshHQ(chars) {
  sandbox.GM = { turn: 5, chars: chars || [] };
  AE.init();
  var hq = sandbox.GM.huangquan;
  hq.index = 55;
  if (!hq.ministers) hq.ministers = {};
  return hq;
}

// A ③封顶·加分源：大狱清洗 ceiling +18
var hq = freshHQ();
AE.adjustHuangquan('purge', 30, '大狱清洗');
assert(hq.sources.purge === 18 && hq.index === 73, 'A 清洗 +30 → 削到 ceiling +18（index 55→73）·实得 index=' + hq.index + ' src=' + hq.sources.purge);
AE.adjustHuangquan('purge', 30, '再清洗');
assert(hq.sources.purge === 18 && hq.index === 73, 'A2 到顶再加无效·实得 index=' + hq.index);

// B ③封顶·扣分源：主少国疑 floor −25
hq = freshHQ();
AE.adjustHuangquan('youngOrIllness', -40, '主少国疑');
assert(hq.drains.youngOrIllness === 25 && hq.index === 30, 'B 主少国疑 −40 → 削到 floor −25（index 55→30）·实得 index=' + hq.index + ' drain=' + hq.drains.youngOrIllness);

// C ①A 事件类（军败）每回合衰 0.5 回血
hq = freshHQ();
AE.adjustHuangquan('militaryDefeat', -10, '大败');
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.militaryDefeat === 9.5, 'C 军败(事件类) drain 每回合衰 0.5（10→9.5）·实得 ' + hq.drains.militaryDefeat);

// D ①A 状态类·权臣坐大：前因在 → 维持(不回暖)
hq = freshHQ([{ name: '严嵩', officialTitle: '内阁首辅', alive: true, _tenureMonths: 72, ambition: 80 }]);
hq.drains.trustedMinister = 10;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.trustedMinister >= 10, 'D 权臣仍坐大(前因在) → trustedMinister 不回暖（维持·实得 ' + hq.drains.trustedMinister.toFixed(2) + '）');

// E ①A 状态类·权臣倒台：前因消失 → 回暖
hq = freshHQ([]);
hq.drains.trustedMinister = 10;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.trustedMinister === 9.5, 'E 权臣倒台(前因消失) → trustedMinister 回暖 0.5（10→9.5）·实得 ' + hq.drains.trustedMinister);

// （旧 F「内阁化无信号不回血」已被下方 J 取代：内阁化现接 dynamicInstitutions 前因信号）

// G ⑤读档削平：老档超 cap 的 drain 夹回 + 回血 index
hq = freshHQ();
hq.drains.trustedMinister = 40; hq.index = 20;
var r = AE.regularizeHuangquanCaps(sandbox.GM);
assert(hq.drains.trustedMinister === 22, 'G 削平·权臣 drain 40 → 夹回 22·实得 ' + hq.drains.trustedMinister);
assert(hq.index === 38, 'G2 削平·超额 18 回血 index（20→38）·实得 ' + hq.index);
assert(r.adjusted >= 1, 'G3 regularize 报告调整项数·实得 ' + r.adjusted);

// ── 4 个持续状态前因信号：前因在→不回血、消失→回暖（验 ①A heal 侧）──
sandbox.P = { conf: {} };  // 默认 idleGovernMonths=6（沙箱无 turnsForMonths → 阈值=6回合）

// H 主少/病弱
hq = freshHQ([{ isPlayer: true, age: 8, health: 80 }]); hq.drains.youngOrIllness = 10;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.youngOrIllness === 10, 'H 主少(age8·前因在)→youngOrIllness 不回血(仍10)·实得 ' + hq.drains.youngOrIllness);
hq = freshHQ([{ isPlayer: true, age: 30, health: 80 }]); hq.drains.youngOrIllness = 10;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.youngOrIllness === 9.5, 'H2 成年康复(前因消失)→回暖0.5(10→9.5)·实得 ' + hq.drains.youngOrIllness);

// I 党争（>70 维持 / ≤55 回暖 / 55-70 滞回带不动）
hq = freshHQ(); sandbox.GM.partyStrife = 80; hq.drains.factionConsuming = 10; AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.factionConsuming === 10, 'I 党争80(前因在)→不回血(仍10)·实得 ' + hq.drains.factionConsuming);
hq = freshHQ(); sandbox.GM.partyStrife = 50; hq.drains.factionConsuming = 10; AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.factionConsuming === 9.5, 'I2 党争50(≤55消)→回暖(10→9.5)·实得 ' + hq.drains.factionConsuming);
hq = freshHQ(); sandbox.GM.partyStrife = 60; hq.drains.factionConsuming = 10; AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.factionConsuming === 10, 'I3 党争60(滞回带55-70)→不动(仍10)·实得 ' + hq.drains.factionConsuming);

// J 内阁化
hq = freshHQ(); sandbox.GM.dynamicInstitutions = [{ name: '内阁' }]; hq.drains.cabinetization = 10; AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.cabinetization === 10, 'J 内阁机构在→不回血(仍10)·实得 ' + hq.drains.cabinetization);
hq = freshHQ(); sandbox.GM.dynamicInstitutions = []; hq.drains.cabinetization = 10; AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.cabinetization === 9.5, 'J2 内阁机构裁撤→回暖(10→9.5)·实得 ' + hq.drains.cabinetization);

// K 怠政（久不视朝维持 / 近期视朝回暖 / 无记录不判）
hq = freshHQ(); sandbox.GM.turn = 20; sandbox.GM._lastChangchaoDecisionMeta = { turn: 1 }; hq.drains.idleGovern = 10; AE.tick({ turn: 20, monthRatio: 1 });
assert(hq.drains.idleGovern === 10, 'K 久不视朝(19≥6·前因在)→不回血(仍10)·实得 ' + hq.drains.idleGovern);
hq = freshHQ(); sandbox.GM.turn = 20; sandbox.GM._lastChangchaoDecisionMeta = { turn: 18 }; hq.drains.idleGovern = 10; AE.tick({ turn: 20, monthRatio: 1 });
assert(hq.drains.idleGovern === 9.5, 'K2 近期视朝(2<6)→回暖(10→9.5)·实得 ' + hq.drains.idleGovern);
hq = freshHQ(); sandbox.GM.turn = 20; delete sandbox.GM._lastChangchaoDecisionMeta; hq.drains.idleGovern = 10; AE.tick({ turn: 20, monthRatio: 1 });
assert(hq.drains.idleGovern === 10, 'K3 无常朝记录→不判·不回血(仍10)·实得 ' + hq.drains.idleGovern);

// L 怠政阈值随 P.conf.idleGovernMonths 玩家可调（逻辑层·阈值调成3后，4回合没视朝就判怠政，而默认6时不会）
sandbox.P.conf.idleGovernMonths = 3;
hq = freshHQ(); sandbox.GM.turn = 20; sandbox.GM._lastChangchaoDecisionMeta = { turn: 16 }; hq.drains.idleGovern = 10; AE.tick({ turn: 20, monthRatio: 1 });
assert(hq.drains.idleGovern === 10, 'L 阈值调成3·距今4回合没视朝(4≥3)→怠政在·不回血(仍10·证明用的是3不是写死6)·实得 ' + hq.drains.idleGovern);
sandbox.P.conf.idleGovernMonths = 6;

console.log('\nALL PASS · ' + passed + ' assertions · 皇权 ③①A⑤ + 4持续状态前因信号 + 怠政阈值可调 生效');
