#!/usr/bin/env node
// smoke-conspiracy-engine.js — 人物阴谋系统·确定性引擎 (Slice 1)
//   多回合酝酿弧: 萌发(野心/NPC意图) → 招募 → 密谋值/败露累积 → 事泄被擒 / 君威护栏 / 将发交AI / 超时自破。
//   安全边界: 引擎绝不擅自坐实「政变得逞」(无 'succeeded' 自产)·只确定性破获下狱。确定性可复现。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function assert(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ✓ ' + m); }

function makeCtx() {
  const ebLog = [];
  const ctx = {
    console, Math, JSON, RegExp, Array, Object, String, Number, Boolean,
    parseInt, parseFloat, isNaN, isFinite,
    GM: null, P: { playerInfo: { characterName: '崇祯' }, conf: { difficulty: 'standard' } },
    addEB: (cat, msg) => { ebLog.push({ cat, msg }); },
    _ebLog: ebLog
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-conspiracy.js'), 'utf8'), ctx, { filename: 'tm-conspiracy.js' });
  return ctx;
}

function char(name, o) { return Object.assign({ name, alive: true, ambition: 50, loyalty: 50, intelligence: 50, valor: 50 }, o || {}); }

console.log('smoke-conspiracy-engine');
const ctx = makeCtx();
const CE = ctx.ConspiracyEngine;
assert(CE && typeof CE.tick === 'function', '引擎加载·暴露 tick');

// ── ① 萌发: 合格者起意·不合格者不起意·player 永不为主谋 ──
ctx.GM = {
  turn: 3, chars: [
    char('崇祯', { isPlayer: true, ambition: 99, loyalty: 0 }),     // 玩家·不应起意
    char('野心家', { ambition: 90, loyalty: 60 }),                   // 野心≥72 → 起意
    char('忠臣', { ambition: 40, loyalty: 90 }),                     // 不合格
    char('怨望者', { ambition: 60, loyalty: 30 })                    // 忠诚<45且野心≥58 → 起意
  ]
};
CE.ensure(ctx.GM);
CE._spawn(ctx.GM, () => 0.01, 1);   // rng 极低·强制起意
const plots1 = ctx.GM._activePlots;
assert(plots1.length === 2, '① 两名合格者起意(实=' + plots1.length + ')');
assert(!plots1.some(p => p.ringleader === '崇祯'), '① 玩家永不为主谋');
assert(!plots1.some(p => p.ringleader === '忠臣'), '① 不合格者不起意');
const np = plots1.find(p => p.ringleader === '野心家');
assert(np && np.kind === 'coup' && np.target === '崇祯', '① 高位野心→图谋社稷·目标=皇帝');
assert(np.secrecy === CE.CFG.secrecyStart && np.momentum > 0 && np.exposure === 0, '① 新阴谋初值(保密满·密谋>0·败露0)');

// ── ② NPC「暗中串联」意图被消费且优先·针对政敌成构陷 ──
const ctx2 = makeCtx();
ctx2.GM = {
  turn: 4, chars: [char('权臣', { ambition: 80, loyalty: 55, intelligence: 70 }), char('政敌甲', {})],
  _pendingNpcConspiracies: [{ from: '权臣', target: '政敌甲', turn: 4 }]
};
ctx2.ConspiracyEngine.ensure(ctx2.GM);
ctx2.ConspiracyEngine._spawn(ctx2.GM, () => 0.01, 1);
assert(ctx2.GM._pendingNpcConspiracies[0]._engineConsumed === true, '② NPC 意图被引擎消费(防重复折叠)');
const pp = ctx2.GM._activePlots.find(p => p.ringleader === '权臣');
assert(pp && pp.kind === 'plot' && pp.target === '政敌甲', '② 文臣针对政敌→构陷(plot)·目标=政敌甲');

// ── ③ 多回合推进: 密谋值与败露逐回合累积 ──
const ctx3 = makeCtx();
ctx3.GM = { turn: 1, chars: [char('阴谋者', { ambition: 85, intelligence: 50 })] };
const E3 = ctx3.ConspiracyEngine; E3.ensure(ctx3.GM);
E3._spawn(ctx3.GM, () => 0.01, 1);
const p3 = ctx3.GM._activePlots[0];
const m0 = p3.momentum, e0 = p3.exposure;
E3._advance(ctx3.GM, p3, () => 0.5, 1);
const m1 = p3.momentum, e1 = p3.exposure;
E3._advance(ctx3.GM, p3, () => 0.5, 1);
assert(m1 > m0 && p3.momentum > m1, '③ 密谋值逐回合上升');
assert(e1 > e0 && p3.exposure > e1, '③ 败露度逐回合上升');

// ── ④ 事泄被擒: 败露满→落库 suppressed + 主谋下狱 ──
const ctx4 = makeCtx();
ctx4.GM = { turn: 7, chars: [char('败露者', { ambition: 80 })], _activePlots: [], _conspiracies: [] };
const E4 = ctx4.ConspiracyEngine;
const plotE = { ringleader: '败露者', target: '崇祯', kind: 'coup', conspirators: ['同党'], momentum: 50, secrecy: 40, exposure: 105, stage: 'brewing', _ripeSince: null };
const doneE = E4._resolve(ctx4.GM, plotE);
assert(doneE === true, '④ 败露满·阴谋了结');
assert(ctx4.GM._conspiracies.length === 1 && ctx4.GM._conspiracies[0].outcome === 'suppressed', '④ 落 GM._conspiracies·outcome=suppressed');
assert(ctx4.GM._conspiracies[0]._fromEngine === true, '④ 标记 _fromEngine(供 AI 去重)');
assert(ctx4.GM.chars[0]._imprisoned === true && ctx4.GM.chars[0]._conspiracyConvicted === true, '④ 主谋下诏狱');

// ── ⑤ 将发·君威正盛→确定性护栏未遂(_qamGated) ──
const ctx5 = makeCtx();
ctx5.GM = { turn: 9, chars: [char('强臣', { ambition: 95 })], _activePlots: [], _conspiracies: [], huangquan: { index: 80 }, huangwei: { index: 70 } };
const E5 = ctx5.ConspiracyEngine;
assert(E5._throneStrong(ctx5.GM) === true, '⑤ 君威正盛判定(皇权80≥60)');
const plotR = { ringleader: '强臣', target: '崇祯', kind: 'coup', conspirators: [], momentum: 105, secrecy: 60, exposure: 30, stage: 'brewing', _ripeSince: null };
const doneR = E5._resolve(ctx5.GM, plotR);
assert(doneR === true && ctx5.GM._conspiracies[0].action === 'coup_failed', '⑤ 君威盛→coup_failed');
assert(ctx5.GM._conspiracies[0]._qamGated === true && ctx5.GM._conspiracies[0].outcome === 'suppressed', '⑤ 护栏标记·未遂下狱');

// ── ⑥ 将发·君威衰微→不擅自得逞·标 ripe 交 AI·超时自破 ──
const ctx6 = makeCtx();
ctx6.GM = { turn: 12, chars: [char('枭雄', { ambition: 99, loyalty: 5 })], _activePlots: [], _conspiracies: [], huangquan: { index: 20 }, huangwei: { index: 25 } };
const E6 = ctx6.ConspiracyEngine;
const plotW = { ringleader: '枭雄', target: '崇祯', kind: 'coup', conspirators: ['党羽'], momentum: 110, secrecy: 50, exposure: 40, stage: 'brewing', _ripeSince: null };
const d1 = E6._resolve(ctx6.GM, plotW);
assert(d1 === false && plotW.stage === 'ripe' && plotW._ripeSince === 12, '⑥ 君威衰→标「将发」交 AI·未了结');
assert(ctx6.GM._conspiracies.length === 0, '⑥ 引擎不擅自落库得逞(等 AI 叙事)');
ctx6.GM.turn = 14;   // 超过 ripeTimeout(2)
const d2 = E6._resolve(ctx6.GM, plotW);
assert(d2 === true && ctx6.GM._conspiracies[0].outcome === 'failed', '⑥ 超时无收束→自破(failed)');
assert(!ctx6.GM._conspiracies.some(c => c.outcome === 'succeeded'), '⑥ 引擎全程零「succeeded」(安全边界)');

// ── ⑦ 剪枝: 主谋已下狱→tick 移除活跃条目 ──
const ctx7 = makeCtx();
ctx7.GM = { turn: 5, chars: [char('已擒', { ambition: 90, _imprisoned: true, _conspiracyConvicted: true })], _activePlots: [{ ringleader: '已擒', kind: 'coup', conspirators: [], momentum: 50, secrecy: 60, exposure: 10 }], _conspiracies: [] };
ctx7.ConspiracyEngine.tick({ turn: 5, monthRatio: 1 });
assert(ctx7.GM._activePlots.length === 0, '⑦ 主谋已下狱→剪除活跃阴谋');

// ── ⑧ 确定性: 同初态+同回合 → tick 结果逐字节一致 ──
function freshGM() {
  return {
    turn: 6, chars: [
      char('甲', { ambition: 88, loyalty: 30, intelligence: 75 }),
      char('乙', { ambition: 76, loyalty: 60 }),
      char('丙', { ambition: 95, loyalty: 10, valor: 80 }),
      char('丁', { ambition: 50, loyalty: 80 })
    ], _activePlots: [], _conspiracies: [], _pendingNpcConspiracies: [{ from: '甲', target: '丁', turn: 6 }]
  };
}
const ctxA = makeCtx(); ctxA.GM = freshGM(); ctxA.ConspiracyEngine.tick({ turn: 6, monthRatio: 1 });
const ctxB = makeCtx(); ctxB.GM = freshGM(); ctxB.ConspiracyEngine.tick({ turn: 6, monthRatio: 1 });
const sigA = JSON.stringify(ctxA.GM._activePlots) + '|' + JSON.stringify(ctxA.GM._conspiracies);
const sigB = JSON.stringify(ctxB.GM._activePlots) + '|' + JSON.stringify(ctxB.GM._conspiracies);
assert(sigA === sigB, '⑧ 同初态两次 tick 结果一致(确定性)');
assert(ctxA.GM._activePlots.length > 0, '⑧ tick 确有萌发(活跃=' + ctxA.GM._activePlots.length + ')');

// ── ⑨ disabled 开关 + 空 GM 不炸 ──
const ctx9 = makeCtx();
ctx9.GM = { turn: 1, chars: [char('x', { ambition: 99 })], _conspiracyDisabled: true };
ctx9.ConspiracyEngine.tick({ turn: 1, monthRatio: 1 });
assert(!ctx9.GM._activePlots || ctx9.GM._activePlots.length === 0, '⑨ _conspiracyDisabled 时不推演');

// ── ⑩ AI 上下文块: 酝酿/将发分述·将发带 record 提示·空则空串 (Slice 2) ──
const ctxC = makeCtx();
ctxC.GM = { turn: 2, _activePlots: [
  { ringleader: '甲', kind: 'coup', target: '崇祯', momentum: 50, stage: 'brewing', conspirators: ['乙'], _knownToPlayer: true },
  { ringleader: '丙', kind: 'plot', target: '政敌', momentum: 110, stage: 'ripe', conspirators: [] }
] };
const blk = ctxC.ConspiracyEngine.aiContextBlock(ctxC.GM);
assert(/密谋·暗流/.test(blk), '⑩ AI 上下文块·标题');
assert(blk.indexOf('甲') >= 0 && blk.indexOf('渐成气候') >= 0 && blk.indexOf('已露端倪') >= 0, '⑩ 酝酿阴谋入上下文(主谋/热度/已露)');
assert(blk.indexOf('★将发') >= 0 && blk.indexOf('丙') >= 0 && blk.indexOf('record_conspiracy_events') >= 0, '⑩ 将发→交 AI 决成败+记录提示');
assert(ctxC.ConspiracyEngine.aiContextBlock({ turn: 1 }) === '', '⑩ 无活跃阴谋→空串');

// ── ⑪ AI↔引擎去重: AI 走旧路坐实(非引擎来源)→剪除重复·引擎自产日志不剪 (Slice 2) ──
const ctxD = makeCtx();
ctxD.GM = { turn: 10, chars: [char('权奸', { ambition: 50 })],
  _activePlots: [{ ringleader: '权奸', kind: 'coup', momentum: 50, secrecy: 60, exposure: 10, stage: 'brewing' }],
  _conspiracies: [{ turn: 9, instigator: '权奸', action: 'coup_failed', outcome: 'suppressed' }] };
ctxD.ConspiracyEngine.tick({ turn: 10, monthRatio: 1 });
assert(!ctxD.GM._activePlots.some(p => p.ringleader === '权奸'), '⑪ AI 已坐实(record_conspiracy_events)→引擎剪除重复');

const ctxE = makeCtx();
ctxE.GM = { turn: 10, chars: [char('谋士', { ambition: 50 })],
  _activePlots: [{ ringleader: '谋士', kind: 'plot', momentum: 50, secrecy: 60, exposure: 10, stage: 'brewing' }],
  _conspiracies: [{ turn: 9, instigator: '谋士', action: 'plot_failed', outcome: 'failed', _fromEngine: true }] };
ctxE.ConspiracyEngine.tick({ turn: 10, monthRatio: 1 });
assert(ctxE.GM._activePlots.some(p => p.ringleader === '谋士'), '⑪ 引擎自产日志(_fromEngine)不触发去重剪除');

// ── ⑫ 反制·文本解析: 具名查办→命中主谋·泛缉→general·无关「清查钱粮」不误判 (Slice 3) ──
const ctxF = makeCtx();
ctxF.GM = { turn: 3, _activePlots: [
  { ringleader: '权臣', kind: 'coup', conspirators: ['党羽乙'], momentum: 60, exposure: 20, stage: 'brewing' }
] };
const F = ctxF.ConspiracyEngine;
assert(F.scanCounterIntel('命锦衣卫彻查权臣谋逆', ctxF.GM).targets.indexOf('权臣') >= 0, '⑫ 具名「彻查权臣谋逆」→命中主谋');
assert(F.scanCounterIntel('着东厂缉拿党羽乙', ctxF.GM).targets.indexOf('权臣') >= 0, '⑫ 命中同谋→归其主谋');
assert(F.scanCounterIntel('着厂卫密缉逆党', ctxF.GM).general === true, '⑫ 无具名+逆党→泛缉(general)');
const noCI = F.scanCounterIntel('命户部清查钱粮亏空', ctxF.GM);
assert(noCI.targets.length === 0 && noCI.general === false, '⑫ 「清查钱粮」非反制·不误判');

// ── ⑬ investigate: 推高败露+挫密谋+标已知 (Slice 3) ──
const ctxG = makeCtx();
ctxG.GM = { turn: 4, _activePlots: [{ ringleader: '甲', conspirators: [], momentum: 80, exposure: 30, stage: 'brewing', _knownToPlayer: false }] };
const beforeE = ctxG.GM._activePlots[0].exposure, beforeM = ctxG.GM._activePlots[0].momentum;
const nHit = ctxG.ConspiracyEngine.investigate(ctxG.GM, '甲', { intensity: 40 });
assert(nHit === 1 && ctxG.GM._activePlots[0].exposure > beforeE && ctxG.GM._activePlots[0].momentum < beforeM, '⑬ investigate 推高败露·挫密谋');
assert(ctxG.GM._activePlots[0]._knownToPlayer === true, '⑬ investigate 标记已侦知');

// ── ⑭ 既有通道全链: 诏书 _edictTracker 下旨查办→tick 破获就擒 (Slice 3) ──
const ctxH = makeCtx();
ctxH.GM = {
  turn: 8, chars: [char('逆首', { ambition: 50 })],
  _activePlots: [{ ringleader: '逆首', kind: 'coup', target: '崇祯', conspirators: [], momentum: 70, secrecy: 50, exposure: 65, stage: 'brewing' }],
  _conspiracies: [],
  _edictTracker: [{ turn: 7, content: '命锦衣卫彻查逆首谋逆不轨，缉拿究治。' }]
};
ctxH.ConspiracyEngine.tick({ turn: 8, monthRatio: 1 });
assert(!ctxH.GM._activePlots.some(p => p.ringleader === '逆首'), '⑭ 诏书查办→本回合阴谋了结');
assert(ctxH.GM._conspiracies.length === 1 && ctxH.GM._conspiracies[0].outcome === 'suppressed', '⑭ 落库 suppressed');
assert(ctxH.GM.chars[0]._imprisoned === true, '⑭ 主谋下诏狱(走既有通道反制)');

// ── ⑮ 鸿雁/朝议通道亦可·且本回合只扫一次(幂等) (Slice 3) ──
const ctxI = makeCtx();
ctxI.GM = {
  turn: 6, chars: [char('阴公', { ambition: 50 })],
  _activePlots: [{ ringleader: '阴公', kind: 'plot', target: '政敌', conspirators: [], momentum: 40, secrecy: 60, exposure: 20, stage: 'brewing' }],
  _conspiracies: [],
  letters: [{ from: '玩家', sentTurn: 5, to: '厂督', content: '速侦缉阴公阴谋私党，密查其党羽。' }]
};
const IEng = ctxI.ConspiracyEngine;
IEng.tick({ turn: 6, monthRatio: 1 });
const plotAfter = ctxI.GM._activePlots.find(p => p.ringleader === '阴公');
assert(plotAfter && plotAfter._knownToPlayer === true && plotAfter.exposure > 20, '⑮ 鸿雁书信查办→败露上升·已侦知');
assert(ctxI.GM._conspiracyLastScanTurn === 6, '⑮ 记录本回合已扫(幂等防重)');
const expSnapshot = plotAfter.exposure;
const r2 = IEng.applyPlayerCounterIntel(ctxI.GM);   // 同回合再调
assert(r2.targeted === 0 && r2.swept === 0, '⑮ 同回合二次调用不重复施查(幂等)');

console.log('\nPASS · ' + A + ' assertions');
