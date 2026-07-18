#!/usr/bin/env node
// scripts/smoke-narrative-execution-consistency.js
// 2026-07-02·锁住『叙事提及处决但 AI 未填结构化死亡 → 人物复活』的修复
//
// Bug 历史(玩家报)·上月月报叙事"孙传庭在陕西把胡廷晏砍了"·但 AI 未把胡廷晏写进
//   character_deaths → alive 从未置 false → 下月名册照旧当活人喂 AI → 胡廷晏"复活"。
//   兜底解析器 _validatePersonnelConsistency 旧动词表无"砍/斩/杀"口语·且 {2,4} 贪婪
//   捕获会把"把"吞进人名 → 漏抓。
//
// 修复(tm-ai-change-applier.js)·
//   1. execute 移出通用 pat1/pat2·改 _scanExecutions 受事锚定扫描器
//      (被动 X被斩 / 处置式 把X砍了 / 动宾 斩X / 自戕 X自尽)·抓口语又不误杀施事者
//   2. onDismissal 处决正则补全多字处决词 + 自戕词·两表一致
//   3. character_deaths 计入 handled·AI 正经上报的不重复补录
//
// 端到端: 真 applyAITurnChanges → 真 _validatePersonnelConsistency → 真 onDismissal
// 断言: 受事者 alive===false·施事者/被查办者 alive 不变

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }

function makeCtx() {
  const ctx = { console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, setTimeout: () => 0, clearTimeout: () => {}, Error };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  // 无害 stub·避免 applyAITurnChanges 内部可选依赖抛错
  ctx.GameEventBus = { emit(){}, on(){} };
  ctx.addEB = () => {};
  ctx.getTSText = () => '';
  // 本 smoke 聚焦叙事受事识别，不复制死亡实现；提供最小语义 sink，锁定所有死亡均经
  // applyOneDeath 路由（完整级联/玩家裁决由死亡管线专项 smoke 覆盖）。
  ctx._deathSinkCalls = [];
  ctx.applyOneDeath = (death) => {
    const name = death && death.name;
    ctx._deathSinkCalls.push(name);
    const target = ((ctx.GM && ctx.GM.chars) || []).find(c => c && c.name === name);
    if (!target || target.alive === false || target.dead === true) return { ok: false, reason: 'missing-or-dead' };
    target.alive = false;
    target.dead = true;
    target.deathReason = String((death && (death.reason || death.cause)) || '');
    return { ok: true };
  };
  vm.createContext(ctx);
  ['tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js', 'tm-ai-change-applier.js', 'tm-ai-change-applier-validators.js', 'tm-ai-change-applier-reconcile.js']
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

// 每个 case 用全新 ctx + GM·避免串味
// opts(刀9 源头 seed·证「有源→照旧补录」)：
//   { imprison:'名'|['名'..] }  受害者已下狱(司法态·源②)
//   { isPlayer:'名' }           受害者为玩家角色(源①)
//   { directive:'诏令文本' }     玩家诏令/裁决(源④·文本含受害者名即命中)
function runCase(names, aiOutput, opts) {
  opts = opts || {};
  const ctx = makeCtx();
  ctx.GM = {
    turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [],
    publicTreasury: {}, guoku: { money: 100000 }, neitang: { money: 50000 },
    chars: names.map(n => ({ name: n, position: '巡抚', officialTitle: '巡抚', loyalty: 60, alive: true, faction: '明朝廷', resources: {} }))
  };
  if (opts.imprison) (Array.isArray(opts.imprison) ? opts.imprison : [opts.imprison]).forEach(nm => { const c = ctx.GM.chars.find(x => x.name === nm); if (c) c._imprisoned = true; });
  if (opts.isPlayer) { const c = ctx.GM.chars.find(x => x.name === opts.isPlayer); if (c) c.isPlayer = true; }
  if (opts.directive) ctx.GM._playerDirectives = [{ id: 'd1', type: 'correction', content: opts.directive, turn: 5 }];   // 持久·不带移除标记
  // 一次性纠正指令(带 _pendingRemovalAfterApply)：applyAITurnChanges 内 _applyDirectiveCompliance 会在 personnel validator 之前删除它·
  //   验证源头判据仍能经 _directivesAppliedThisTurn 暂存读到(修 issue 2)
  if (opts.correctionDirective) ctx.GM._playerDirectives = [{ id: 'c1', type: 'correction', content: opts.correctionDirective, _pendingRemovalAfterApply: true, turn: 5 }];
  // agent 模式近回合诏书·真实 schema {turn,edicts:[],xinglu}(修 issue 1)
  if (opts.agentEdicts || opts.agentXinglu) ctx.GM._agentRecentDirectives = [{ turn: 5, edicts: opts.agentEdicts || [], xinglu: opts.agentXinglu || '' }];
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  try { ctx.AIChangeApplier.applyAITurnChanges(aiOutput || {}); }
  catch (e) { console.error('  ! applyAITurnChanges threw: ' + (e && e.message)); }
  const dead = ctx.GM.chars.filter(c => c.alive === false).map(c => c.name).sort();
  const hints = (ctx.GM._aiWeakWriteHints || []).map(h => h && h.itemName);
  const skipped = [];
  (ctx.GM._personnelValidatorLog || []).forEach(L => (L.skipped || []).forEach(s => skipped.push(s)));
  return { dead, routed: ctx._deathSinkCalls.slice().sort(), hints, skipped };
}
function eq(a, b){ return JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort()); }
// check：断言受害者落库(死亡+经死亡管线)·opts.aiExtra 并入 aiOutput(结构化触及源③)·opts 其余为 GM seed
function check(desc, names, narrative, expectDead, field, opts) {
  opts = opts || {};
  const out = Object.assign({}, opts.aiExtra || {}); out[field || 'shizhengji'] = narrative;
  const result = runCase(names, out, opts);
  const ok = eq(result.dead, expectDead) && eq(result.routed, expectDead);
  if (ok) { passed++; console.log('  ✓ ' + desc + '  → 死亡sink[' + result.dead.join('、') + ']'); }
  else { failed++; console.error('  ✗ ' + desc + '\n      期望sink/死亡[' + expectDead.join('、') + '] 实际sink[' + result.routed.join('、') + '] 死亡[' + result.dead.join('、') + ']'); }
}
// checkWithheld：刀9·断言「无源孤立叙事死亡」不落库(未死+未经死亡管线)·且转弱自查纸条 + skipped 留痕
function checkWithheld(desc, names, narrative, victim, field, opts) {
  const out = {}; out[field || 'shizhengji'] = narrative;
  const result = runCase(names, out, opts || {});
  const notDead = result.dead.indexOf(victim) < 0 && result.routed.indexOf(victim) < 0;
  const inHints = result.hints.indexOf(victim) >= 0;
  const inSkipped = result.skipped.some(s => s.name === victim && s.reason === 'no-source-isolated-death');
  const ok = notDead && inHints && inSkipped;
  if (ok) { passed++; console.log('  ✓ ' + desc + '  → 未落库·入弱自查纸条[' + victim + ']'); }
  else { failed++; console.error('  ✗ ' + desc + '\n      notDead=' + notDead + ' inHints=' + inHints + ' inSkipped=' + inSkipped + ' 死亡[' + result.dead.join('、') + ']'); }
}

const CAST = ['孙传庭', '胡廷晏', '黄得功', '曹变蛟', '方正化', '魏忠贤'];

console.log('===== 正例·受事者应判死 =====');
check('★真bug: 把X砍了', CAST, '孙传庭在陕西把胡廷晏砍了，传首九边。', ['胡廷晏']);
check('被动: X被斩首', CAST, '胡廷晏贪墨事发，被斩首于市。', ['胡廷晏']);
check('动宾: 赐死X', CAST, '帝震怒，赐死魏忠贤。', ['魏忠贤']);
// 裸自戕/裸伏诛(reI)为刀9 gated 形态·须带源头才落库(此处证「有源→照旧补录」·回归保护)
check('名前不及物: X伏诛(有源·下狱前置)', CAST, '首恶胡廷晏伏诛，陕西大定。', ['胡廷晏'], 'shizhengji', { imprison: '胡廷晏' });
check('自戕: X畏罪自缢(有源·玩家诏令彻查)', CAST, '魏忠贤畏罪自缢于宅。', ['魏忠贤'], 'shizhengji', { directive: '彻查魏忠贤及阉党余孽' });
check('走 shilu_text 字段也扫', CAST, '把胡廷晏正法。', ['胡廷晏'], 'shilu_text');
// Codex Bug2: 动宾+受害者身份词窗口·斩杀叛将X→X 应死
check('动宾+身份词: 斩杀叛将X', CAST, '官军斩杀叛将胡廷晏于阵前。', ['胡廷晏']);
check('动宾+身份词: 处决逆首X', CAST, '诏处决逆首魏忠贤。', ['魏忠贤']);

console.log('===== 反例·绝不可误杀 =====');
check('★当月真叙事(尚未到任+被查办·无人死)', CAST,
  '陕西方面，孙传庭尚未到任，原巡抚胡廷晏闻诏后连夜调阅积欠案卷，闻将补饷，竟私扣三千两作道途支应，被厂卫密探报知，上密令方正化查办。京营整顿中，黄得功、曹变蛟巡查五军营、神枢营。', []);
check('施事者: X斩获甚众', CAST, '孙传庭出关，斩获甚众，贼势大挫。', []);
check('施事者: X杀敌三千', CAST, '曹变蛟率骑突阵，杀敌三千。', []);
check('施事者受命去杀别人', CAST, '命孙传庭斩杀叛军，克期荡平。', []);
check('把总(把+军衔非人名)', CAST, '把总孙传庭巡查五军营。', []);
check('赐赏非赐死', CAST, '帝赐孙传庭尚方宝剑，令便宜行事。', []);
// Codex Bug1: "X被命令/被令斩杀…"=受命施事者·绝不可误杀
check('★受命施事者: X被命令斩杀叛军', CAST, '孙传庭被命令斩杀叛军，克期荡平。', []);
check('★受命施事者: X被令斩杀流贼', CAST, '曹变蛟被令斩杀流贼于河南。', []);
check('受命施事者: X被遣讨贼', CAST, '孙传庭被遣斩贼于潼关。', []);

console.log('===== 结构化死亡不重复补录 =====');
(function(){
  // AI 已填 character_deaths·叙事又提及·验证 validator 不重复补调(handled 生效)
  // character_deaths 由外层 end-turn dispatcher 统一交给死亡管线；此处只锁 validator 不重复补录。
  const ctx = makeCtx();
  ctx.GM = { turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], publicTreasury: {},
    guoku: { money: 100000 }, neitang: { money: 50000 },
    chars: [{ name: '胡廷晏', officialTitle: '巡抚', alive: true, faction: '明朝廷', resources: {} }] };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  try {
    ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '把胡廷晏砍了。', character_deaths: [{ name: '胡廷晏', reason: '处决' }] });
  } catch (e) { console.error('  ! threw: ' + (e && e.message)); }
  const ch = ctx.GM.chars[0];
  const log = ctx.GM._personnelValidatorLog || [];
  const patchedHu = log.some(L => (L.missing || []).some(m => m.name === '胡廷晏'));
  assert(!patchedHu, '已填 character_deaths 的胡廷晏不应被 validator 重复补录 (patched=' + patchedHu + ')');
  console.log('  ✓ character_deaths 已上报者·validator 不重复补录');
})();

// ═══════════════════════════════════════════════════════════════════
// 2026-07-04·补：自然/含糊死亡 + zhengwen 字段扫描 + 家属误杀守卫
//   玩家复报"陕西巡抚死后下月还在任"·根因:①校验器漏扫 zhengwen ②只认处决词不认
//   病故/薨/遇害/城破身死等自然/含糊死亡(巡抚死于民变常被叙作这些)。
// ═══════════════════════════════════════════════════════════════════
console.log('===== 自然/含糊死亡·受事者应判死 =====');
// 暴力殉难(遇害/城破身死/殉城/为…所杀)隐含本回合致死事件·deathKind='active'·不入刀9 闸·照旧补录
check('遇害身亡(暴力·隐含致死事件)', CAST, '胡廷晏遇害身亡，陕西震动。', ['胡廷晏']);
check('城破身死(暴力·隐含城陷)', CAST, '西安城破，胡廷晏城破身死。', ['胡廷晏']);
check('殉城(暴力·隐含城陷)', CAST, '胡廷晏殉城，士民哀之。', ['胡廷晏']);
check('为乱兵所杀(带前置副词竟)', CAST, '巡抚胡廷晏，竟为乱兵所杀。', ['胡廷晏']);
check('为乱民所害', CAST, '胡廷晏为乱民所害，阖署遇难。', ['胡廷晏']);
// 纯自然死(病故/薨逝)为刀9 gated 形态·须带源头才落库(此处证「有源→照旧补录」·回归保护)
check('病故于任(有源·下狱前置)', CAST, '胡廷晏病故于任所，年五十有三。', ['胡廷晏'], 'shizhengji', { imprison: '胡廷晏' });
check('薨逝(有源·玩家诏令留意)', CAST, '老臣魏忠贤薨逝于府第。', ['魏忠贤'], 'shizhengji', { directive: '密切留意老臣魏忠贤动向' });

console.log('===== zhengwen(邸报/政闻)字段也须扫 =====');
check('处决写在 zhengwen(主动·被斩)', CAST, '邸报：陕西巡抚胡廷晏贪墨事发，被斩于市。', ['胡廷晏'], 'zhengwen');
check('自然死写在 zhengwen(有源·下狱前置)', CAST, '胡廷晏病逝于西安任所。', ['胡廷晏'], 'zhengwen', { imprison: '胡廷晏' });

console.log('===== 自然死·家属/歧义误杀守卫 =====');
check('X之子病故(死的是儿子·非X)', CAST, '胡廷晏之子病故，廷晏悲恸不能视事。', []);
check('被陷害≠死(构陷非处决)', CAST, '孙传庭被奸党陷害，下诏狱待勘。', []);
check('被迫害≠死', CAST, '胡廷晏被阉党迫害有年，郁郁难伸。', []);
check('为流民所困但获解围(未死)', CAST, '胡廷晏为流民所困于城中，旋得援兵解围。', []);

// ═══════════════════════════════════════════════════════════════════
// 2026-07-19·刀9·无源史实幻觉死亡反向闸
//   背景(owner 亲报平行历史存档污染)：本局玩家没杀魏忠贤·AI 却按真实历史在自由叙事写「魏忠贤伏诛/薨逝」·
//   旧兜底把幻觉当真落库成永久死亡。修：裸自戕(reI)/纯自然死(reN-plain)若本回合无任何源头→不落库·转弱自查纸条留痕。
//   主动致死/暴力殉难(deathKind='active')不入此闸(见上方各正例·零改动)。
// ═══════════════════════════════════════════════════════════════════
console.log('===== 刀9·有源·裸自戕/纯自然死→照旧补录(回归保护·各源头信号) =====');
// (a) 结构化死亡意图/触及源：AI 本回合在结构化字段点名该人(char_updates 非状态触及)→有源→照旧补录
check('★刀9-a 结构化触及(char_updates)+裸伏诛→照旧补录', CAST, '魏忠贤伏诛。', ['魏忠贤'], 'shizhengji',
  { aiExtra: { char_updates: [{ name: '魏忠贤', updates: { loyalty: 10 } }] } });
// (b) 玩家诏令处决源：玩家诏令明令处决该人→有源→照旧补录
check('★刀9-b 玩家诏令处决+裸伏诛→照旧补录', CAST, '魏忠贤伏诛，朝野称快。', ['魏忠贤'], 'shizhengji',
  { directive: '处决魏忠贤，以谢天下' });
// 源①玩家角色：玩家角色裸自缢恒经玩家之死裁决器(合法继统/终局门)·绝不拦(城破崇祯自缢)
check('★刀9 玩家角色裸自缢→恒补录(经裁决器)', ['崇祯', '魏忠贤', '胡廷晏'], '城破，崇祯自缢于煤山。', ['崇祯'], 'shizhengji',
  { isPlayer: '崇祯' });
// 源②司法态：已下狱者裸伏诛→有源
check('★刀9 司法态(已下狱)+裸伏诛→照旧补录', CAST, '胡廷晏伏诛。', ['胡廷晏'], 'shizhengji', { imprison: '胡廷晏' });

console.log('===== 刀9·无源·孤立叙事死亡→★不落库★+弱自查纸条留痕(核心) =====');
checkWithheld('★核心 无源裸伏诛(本局未杀魏忠贤·AI 史实幻觉)→不落库', CAST, '魏忠贤伏诛，朝野称快。', '魏忠贤');
checkWithheld('无源裸自缢→不落库', CAST, '魏忠贤自缢于宅。', '魏忠贤');
checkWithheld('无源纯自然死·病故→不落库', CAST, '胡廷晏病故于任所，年五十有三。', '胡廷晏');
checkWithheld('无源纯自然死·薨逝→不落库', CAST, '老臣魏忠贤薨逝于府第。', '魏忠贤');
checkWithheld('无源裸弃市→不落库', CAST, '逆党胡廷晏弃市。', '胡廷晏');
checkWithheld('无源纯自然死·病逝(zhengwen)→不落库', CAST, '胡廷晏病逝于西安任所。', '胡廷晏', 'zhengwen');
// 对照·闸不误拦「合法处决/主动致死」：无源但主动致死(把X砍了/斩X)→仍照旧补录
check('对照·无源但主动致死(把X砍了)→仍补录(不误拦)', CAST, '孙传庭把胡廷晏砍了。', ['胡廷晏']);
check('对照·无源但主动致死(赐死X)→仍补录(不误拦)', CAST, '帝赐死魏忠贤。', ['魏忠贤']);
check('对照·无源但暴力殉难(遇害)→仍补录(不误拦)', CAST, '胡廷晏遇害身亡。', ['胡廷晏']);

// ═══════════════════════════════════════════════════════════════════
// 2026-07-19·刀9·Codex 复审返工·源头判据四补漏
// ═══════════════════════════════════════════════════════════════════
const CAST_WA = ['孙传庭', '王安', '王安石', '魏忠贤'];   // 含重名前缀两字名(王安/王安石)·验最长实体匹配

console.log('===== 刀9·返工①·_agentRecentDirectives 真实 schema(edicts[]/xinglu)读取 =====');
check('★①agent近回合诏 edicts[「赐死王安」]+王安病故→有源照旧补录', CAST_WA, '王安病故于任所。', ['王安'], 'shizhengji', { agentEdicts: ['赐死王安'] });
check('①agent行止 xinglu 含名+裸自缢→有源照旧补录', CAST_WA, '王安自缢于宅。', ['王安'], 'shizhengji', { agentXinglu: '亲鞫王安逆案，令其自裁' });

console.log('===== 刀9·返工②·一次性纠正指令闸前被删·经暂存仍识源 =====');
check('★②一次性纠正诏「处决王安」(闸前被_applyDirectiveCompliance删)+王安病故→有源照旧补录', CAST_WA, '王安病故于任所。', ['王安'], 'shizhengji', { correctionDirective: '处决王安，以正国法' });

console.log('===== 刀9·返工③·人名最长实体匹配·防裸子串误命中 =====');
checkWithheld('★③无关诏「起复王安石」+王安病故→不误当源·仍不落库', CAST_WA, '王安病故于任所。', '王安', 'shizhengji', { directive: '起复王安石，复其新法' });
check('③对照·诏「赐死王安」+王安病故→真源·照旧补录', CAST_WA, '王安病故于任所。', ['王安'], 'shizhengji', { directive: '赐死王安' });

console.log('===== 刀9·返工④·SC1 主链走标准 character_deaths 键·进 handled·墓志铭消费者不漏(Codex二审) =====');
(function () {
  // 标准 character_deaths 键(弃 advisory 影子键)：该人进 handled→validator 不误记无源/不吐垃圾弱提示；
  //   且 _processDeathEpitaphs 消费生成墓志铭(影子键漏为0)。真stage链+完整对照法(sink0→sink1)见 smoke-no-source-death-guard。
  const ctx = makeCtx();
  ctx.GM = { turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], publicTreasury: {},
    guoku: { money: 100000 }, neitang: { money: 50000 },
    chars: [{ name: '魏忠贤', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }] };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '老臣魏忠贤薨逝于府第。', character_deaths: [{ name: '魏忠贤', reason: '病笃' }] });
  const G = ctx.GM;
  const hinted = (G._aiWeakWriteHints || []).some(h => h && h.itemName === '魏忠贤');
  const withheld = (G._personnelValidatorLog || []).some(L => (L.skipped || []).some(s => s.name === '魏忠贤' && s.reason === 'no-source-isolated-death'));
  const epitaph = (G._turnReport || []).some(e => e && e.type === 'epitaph' && e.char === '魏忠贤');
  assert(!hinted && !withheld, '★④标准 character_deaths 键→魏忠贤进 handled·不误记无源/不吐垃圾弱提示');
  assert(epitaph, '★④标准键→_processDeathEpitaphs 消费生成墓志铭(advisory 影子键会漏为0)');
})();

console.log('===== 刀9·返工③b·同回合双 pass·一次性诏令快照 turn 级存活(非每 pass 清) =====');
(function () {
  const ctx = makeCtx();
  ctx.GM = { turn: 5, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], publicTreasury: {},
    guoku: { money: 100000 }, neitang: { money: 50000 },
    chars: [{ name: '王安', position: '巡抚', officialTitle: '巡抚', alive: true, faction: '明朝廷', resources: {} }],
    _playerDirectives: [{ id: 'c1', type: 'correction', content: '处决王安，以正国法', _pendingRemovalAfterApply: true, turn: 5 }] };
  ctx.P = { playerInfo: { factionName: '明朝廷' } };
  // pass 1(同回合)：一次性纠正诏令被 _applyDirectiveCompliance 删除+快照·此 pass 无死亡叙事
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '本月整饬吏治，诏下有司。' });
  // pass 2(同回合·同 GM)：王安病故裸死亡·此 pass 无诏令·但快照应 turn 级存活→判有源落库(旧每pass清会误判无源)
  ctx.AIChangeApplier.applyAITurnChanges({ shizhengji: '王安病故于任所。' });
  const G = ctx.GM;
  const dead = G.chars.find(c => c.name === '王安').alive === false;
  const hinted = (G._aiWeakWriteHints || []).some(h => h && h.itemName === '王安');
  assert(dead && !hinted, '★③b 双pass·一次性诏令快照跨pass存活→王安病故判有源落库(非误判无源)');
})();

console.log('');
console.log(`[smoke-narrative-execution-consistency] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
