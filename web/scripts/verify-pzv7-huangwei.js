#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·P-ZV7 皇威 ③封顶 + ①衰减 + ⑤读档削平（同民心骨架·皇威自己的数）
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
assert(AE && typeof AE.adjustHuangwei === 'function', 'AuthorityEngines.adjustHuangwei 已导出');
assert(typeof AE.regularizeHuangweiCaps === 'function', 'AuthorityEngines.regularizeHuangweiCaps 已导出');

function freshHW() { sandbox.GM = { turn: 30 }; AE.init(); return sandbox.GM.huangwei; }

// A ③封顶·扣分源：军败 floor −18，单源最多拉低 18
var hw = freshHW();
AE.adjustHuangwei('militaryDefeat', -30, '大败');
assert(hw.drains.militaryDefeat === 18 && hw.index === 32, 'A 军败 −30 → 削到 floor −18（index 50→32·drain=18）·实得 index=' + hw.index + ' drain=' + hw.drains.militaryDefeat);
AE.adjustHuangwei('militaryDefeat', -30, '再败');
assert(hw.drains.militaryDefeat === 18 && hw.index === 32, 'A2 军败已到顶·再扣无效（index 仍 32）·实得 index=' + hw.index);

// B ③封顶·亡国级：天子北狩 floor −50，能把皇威打到崩
hw = freshHW();
AE.adjustHuangwei('imperialFlight', -80, '土木堡');
assert(hw.drains.imperialFlight === 50 && hw.index === 0, 'B 天子北狩 −80 → 削到 −50·皇威 50→0（亡国级真崩）·实得 index=' + hw.index + ' drain=' + hw.drains.imperialFlight);

// C ③封顶·加分源：军功 ceiling +20
hw = freshHW();
AE.adjustHuangwei('militaryVictory', 30, '大捷');
assert(hw.sources.militaryVictory === 20 && hw.index === 70, 'C 军功 +30 → 削到 ceiling +20（index 50→70）·实得 index=' + hw.index + ' src=' + hw.sources.militaryVictory);

// D ①衰减·扣分项每回合衰 0.5 回血 index
hw = freshHW();
AE.adjustHuangwei('courtScandal', -12, '丑闻');
var idxBefore = hw.index; // 38
AE.tick({ monthRatio: 1, turn: 31 });
assert(hw.drains.courtScandal === 11.5, 'D 朝堂丑闻 drain 每回合衰 0.5（12→11.5）·实得 ' + hw.drains.courtScandal);
assert(hw.index >= idxBefore + 0.5 - 1e-9, 'D2 衰减回血 index（≥+0.5）·实得 ' + hw.index + '(was ' + idxBefore + ')');

// E ①加分不衰：sources 经 tick 不变
hw = freshHW();
AE.adjustHuangwei('militaryVictory', 10, '小胜');
AE.tick({ monthRatio: 1, turn: 31 });
assert(hw.sources.militaryVictory === 10, 'E 军功加分 tick 后不衰（仍 +10）·实得 ' + hw.sources.militaryVictory);

// F 天象保留 P-5TK 特殊数（0.10 比例·不是 0.5）
hw = freshHW();
AE.adjustHuangwei('heavenlySign', -20, '荧惑守心');
AE.tick({ monthRatio: 1, turn: 31 });
assert(hw.drains.heavenlySign === 18, 'F 天象 drain 走 P-5TK 0.10（20→18·衰 2·非 0.5）·实得 ' + hw.drains.heavenlySign);

// G ⑤读档削平：老档超 cap 的 drain 夹回 + 回血 index
sandbox.GM = { turn: 40 }; AE.init(); hw = sandbox.GM.huangwei;
hw.drains.militaryDefeat = 40; hw.index = 20;   // 造老档：军败 drain 累到 40（超 cap 18）、index 被压到 20
var r = AE.regularizeHuangweiCaps(sandbox.GM);
assert(hw.drains.militaryDefeat === 18, 'G 削平·军败 drain 40 → 夹回 18·实得 ' + hw.drains.militaryDefeat);
assert(hw.index === 42, 'G2 削平·超额 22 回血 index（20→42）·实得 ' + hw.index);
assert(r.adjusted >= 1, 'G3 regularize 报告调整项数·实得 ' + r.adjusted);

// H 罪己诏·关键词触发：本回合诏书含"罪己"→ −8皇威(进drain) + 民心 + 核心重臣 loyalty+4
sandbox.GM = {
  turn: 10,
  minxin: { trueIndex: 60, perceivedIndex: 60, phase: 'peace', sources: {}, byRegion: {}, prophecy: { intensity: 0 } },
  adminHierarchy: { player: { divisions: [{ id: 'a', name: '甲', population: { mouths: 1000 }, minxin: 60 }] } },
  chars: [
    { name: '张三', officialTitle: '内阁首辅', alive: true, loyalty: 50 },
    { name: '李四', officialTitle: '知县', alive: true, loyalty: 50 }
  ],
  _playerActionSignals: { items: [{ turn: 10, text: '朕下罪己诏·引咎自责以谢天下' }] }
};
AE.init();
sandbox.GM.huangwei.index = 60;
AE.tick({ turn: 10, monthRatio: 1 });
hw = sandbox.GM.huangwei;
assert(hw.index === 52, 'H 罪己诏触发 → 皇威 −8（60→52）·实得 ' + hw.index);
assert(hw.drains.selfBlame === 8, 'H2 −8 进 drains.selfBlame·实得 ' + hw.drains.selfBlame);
assert(hw._selfBlameLastTurn === 10, 'H3 冷却时间戳记 turn 10·实得 ' + hw._selfBlameLastTurn);
assert(sandbox.GM.chars[0].loyalty === 54, 'H4 核心重臣(首辅) loyalty +4（50→54）·实得 ' + sandbox.GM.chars[0].loyalty);
assert(sandbox.GM.chars[1].loyalty === 50, 'H5 非重臣(知县) loyalty 不动（仍 50）·实得 ' + sandbox.GM.chars[1].loyalty);
assert((Number(sandbox.GM.minxin.sources.imperialVirtue) || 0) >= 4, 'H6 民心 imperialVirtue 源 +5（罪己收揽人心）·实得 ' + sandbox.GM.minxin.sources.imperialVirtue);

// I 冷却：下回合再下罪己诏不触发
sandbox.GM.turn = 11;
sandbox.GM._playerActionSignals.items = [{ turn: 11, text: '再下罪己诏' }];
var loyBefore = sandbox.GM.chars[0].loyalty;
AE.tick({ turn: 11, monthRatio: 1 });
assert(hw._selfBlameLastTurn === 10, 'I 冷却中(11-10<6)→不再触发(时间戳仍10)·实得 ' + hw._selfBlameLastTurn);
assert(sandbox.GM.chars[0].loyalty === loyBefore, 'I2 冷却中重臣 loyalty 不再加·实得 ' + sandbox.GM.chars[0].loyalty);

// J 冷却满(6回合)后可再下
sandbox.GM.turn = 16;
sandbox.GM._playerActionSignals.items = [{ turn: 16, text: '三下罪己诏' }];
AE.tick({ turn: 16, monthRatio: 1 });
assert(hw._selfBlameLastTurn === 16, 'J 冷却满(16-10=6)→重新可触发(时间戳→16)·实得 ' + hw._selfBlameLastTurn);

console.log('\nALL PASS · ' + passed + ' assertions · 皇威 ③①⑤ + 罪己诏 生效');
