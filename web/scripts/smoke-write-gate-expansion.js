#!/usr/bin/env node
// scripts/smoke-write-gate-expansion.js
// 2026-07-19·刀C·写端反向闸扩面(四通道)·正反用例集成断言(真 applier/preflight 链·源码判据)。
//   C1·结构化 character_deaths 键补来源判据(reconcile.preflightAIWriteBack)
//   C2·personnel_changes 司法类动词补来源判据(applier.applyAITurnChanges 兜底段)
//   C3·char_updates 敏感字段来源判据 + 万能键(anyPathChanges/changes)禁区(applier + pathutils)
//   C4·events 键时点闸(applier.applyAITurnChanges 事件段)
// 范式复用刀9：拒写降级→GM._aiWeakWriteHints 留痕·宁漏勿误杀(有任一源即放行)。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function ok(c, m) { if (c) { passed++; console.log('  ✓ ' + m); } else { failed++; console.error('  ✗ ' + m); } }

function makeCtx() {
  const ctx = {
    console: { log() {}, warn() {}, info() {}, error() {} },
    Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp,
    isFinite, isNaN, parseInt, parseFloat, Promise, Symbol, Map, Set,
    setTimeout: () => 0, clearTimeout: () => {}, Error, TypeError, RangeError
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = { errors: { capture() {}, captureSilent() {} } };
  ctx.GameEventBus = { emit() {}, on() {} };
  ctx._dbg = () => {};
  ctx.getTSText = () => '';
  ctx._eb = [];
  ctx.addEB = (cat, msg) => { ctx._eb.push({ cat, msg }); };
  ctx.findCharByName = (name) => (ctx.GM.chars || []).find(c => c && c.name === name);
  ctx._fuzzyFindChar = (name) => (ctx.GM.chars || []).find(c => c && c.name === name);
  vm.createContext(ctx);
  ['tm-time-utils.js', 'tm-ai-change-pathutils.js', 'tm-ai-change-army.js', 'tm-ai-change-narrative.js',
   'tm-ai-change-applier.js', 'tm-ai-change-applier-validators.js', 'tm-ai-change-applier-reconcile.js',
   'tm-ai-apply-deaths.js', 'tm-endturn-apply-stages.js']
    .forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); } catch (_) {} });
  // C4·当前游戏年权威=calcDateFromTurn(真机读 P.time.year 真开局年+按 turn 推进)。此 stub 同款语义：有 P.time.year 则据其推进·否则 adYear=0(回落 GM.year)。
  ctx.calcDateFromTurn = function (t) {
    if (!(ctx.P && ctx.P.time && ctx.P.time.year)) return { adYear: 0 };
    return { adYear: Number(ctx.P.time.year) + Math.floor((((Number(t) || 1) - 1) * 30) / 365) };
  };
  return ctx;
}

function baseGM(chars, extra) {
  return Object.assign({
    turn: 5, year: 1626, facs: [{ name: '明朝廷' }], officeTree: [], _turnReport: [], armies: [],
    memorials: [], currentIssues: [], _playerDirectives: [],
    publicTreasury: {}, guoku: { money: 100000 }, neitang: { money: 50000 }, chars: chars
  }, extra || {});
}
function hintNames(GM) { return (GM._aiWeakWriteHints || []).map(h => h && h.itemName); }
function hintCount(GM) { return (GM._aiWeakWriteHints || []).length; }
function findCh(GM, n) { return (GM.chars || []).find(c => c && c.name === n); }

(function () {
  console.log('smoke-write-gate-expansion');

  // ══════════════════════════════════════════════════════════════════
  //  C1·结构化 character_deaths 补来源判据(preflightAIWriteBack)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C1·结构化 character_deaths 来源判据 =====');
  // C1-neg·裸死因(病故=bare)+无任何源头 → 拦下+弱提示留痕
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', resources: {} }]);   // 魏忠贤·无司法态
    const ai = { character_deaths: [{ name: '魏忠贤', reason: '病故' }] };   // 病故·bare·无源
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 0, 'C1-neg 裸病故无源→结构化死条被拦(不落库)');
    ok(hintNames(ctx.GM).indexOf('魏忠贤') >= 0, 'C1-neg 拒写降级→弱自查纸条留痕(itemName=魏忠贤)');
  }
  // C1-pos·裸死因但有司法前置态(_imprisoned·有源) → 放行·不误杀
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, _imprisoned: true, faction: '明朝廷', resources: {} }]);
    const ai = { character_deaths: [{ name: '魏忠贤', reason: '狱中病故' }] };   // 狱中病故·bare·司法态有源
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 1, 'C1-pos(司法态) 裸死因但已下狱=有源→放行(不误杀)');
    ok(hintCount(ctx.GM) === 0, 'C1-pos(司法态) 放行→零弱提示');
  }
  // C1-pos·active 死因(奉旨赐死·含本局具体事由) → 放行·不误杀
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '陈新甲', alive: true, faction: '明朝廷', resources: {} }]);
    const ai = { character_deaths: [{ name: '陈新甲', reason: '奉旨赐死' }] };   // 奉旨赐死·active
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 1, 'C1-pos(active) 奉旨赐死=active→放行(非 bare 不入闸)');
    ok(hintCount(ctx.GM) === 0, 'C1-pos(active) 放行→零弱提示');
  }
  // C1-pos·裸死因但玩家诏令点名(path4·有源) → 放行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '李四', alive: true, faction: '明朝廷', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '李四论罪当诛，着即拿问' }] });   // 玩家诏令点名李四
    const ai = { character_deaths: [{ name: '李四', reason: '伏诛' }] };   // 伏诛·bare·但玩家诏令有源
    ctx.preflightAIWriteBack(ai, { source: 'test-c1' });
    ok(ai.character_deaths.length === 1, 'C1-pos(诏令) 裸伏诛但玩家诏令点名=有源→放行');
    ok(hintCount(ctx.GM) === 0, 'C1-pos(诏令) 放行→零弱提示');
  }

  // ══════════════════════════════════════════════════════════════════
  //  C2·personnel_changes 司法类动词补来源判据(applyAITurnChanges 兜底段)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C2·personnel_changes 司法类动作来源判据 =====');
  // C2-neg·下诏狱·无任何源头 → 不执行(未下狱)+弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', position: '司礼', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }]);
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '魏忠贤', change: '下狱究问' }] });
    ok(!findCh(ctx.GM, '魏忠贤')._imprisoned, 'C2-neg 下诏狱无源→不执行(魏忠贤未下狱)');
    ok(hintNames(ctx.GM).indexOf('魏忠贤') >= 0, 'C2-neg 拒写降级→弱自查纸条留痕');
  }
  // C2-pos·玩家诏令点名(有源) → 照常执行(已下狱)·无 C2 弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', position: '司礼', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '着锦衣卫拿魏忠贤下诏狱究问' }] });
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '魏忠贤', change: '下狱究问' }] });
    ok(!!findCh(ctx.GM, '魏忠贤')._imprisoned, 'C2-pos(诏令) 玩家诏令点名=有源→司法动作照常落(已下狱)');
    ok(hintCount(ctx.GM) === 0, 'C2-pos(诏令) 放行→零弱提示(不误杀)');
  }
  // C2-pos·本回合弹劾奏疏点名(输入面扫描·有源) → 照常执行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', position: '司礼', officialTitle: '司礼', alive: true, faction: '明朝廷', resources: {} }],
      { memorials: [{ from: '御史', text: '臣劾魏忠贤十大罪，乞下诏狱明正典刑' }] });
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '魏忠贤', change: '下狱' }] });
    ok(!!findCh(ctx.GM, '魏忠贤')._imprisoned, 'C2-pos(弹劾) 本回合弹劾奏疏点名=有源→司法动作照常落');
    ok(hintCount(ctx.GM) === 0, 'C2-pos(弹劾) 放行→零弱提示');
  }
  // C2-pos·普通任免(致仕·非司法)无源也不入闸
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '孙承宗', position: '督师', officialTitle: '督师', alive: true, faction: '明朝廷', resources: {} }]);
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '孙承宗', change: '乞骸骨致仕' }] });
    ok(hintCount(ctx.GM) === 0, 'C2-pos(致仕) 普通任免不入司法闸→零弱提示(宁漏勿误杀)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  C3·char_updates 敏感字段来源判据 + 万能键(anyPathChanges)禁区
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C3·char_updates 敏感字段来源判据 + 万能键禁区 =====');
  // C3-neg·无源敏感字段(stance/fame)跳过+弱提示·非敏感字段(age)照常 merge
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', stance: '忠', fame: 50, age: 59, resources: {} }]);
    ctx.applyAITurnChanges({ char_updates: [{ name: '魏忠贤', updates: { stance: '奸佞', fame: 5, age: 60 } }] });
    const ch = findCh(ctx.GM, '魏忠贤');
    ok(ch.stance === '忠' && ch.fame === 50, 'C3-neg 无源敏感字段(stance/fame)→跳过不落库(原值不变)');
    ok(ch.age === 60, 'C3-neg 非敏感字段(age)→照常 merge(其余字段不受影响)');
    ok(hintNames(ctx.GM).indexOf('魏忠贤') >= 0, 'C3-neg 拒写降级→弱自查纸条留痕');
  }
  // C3-pos·玩家诏令点名(有源)→敏感字段照常落·无弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', stance: '忠', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '魏忠贤结党营私，着夺其清誉' }] });
    ctx.applyAITurnChanges({ char_updates: [{ name: '魏忠贤', updates: { stance: '奸佞' } }] });
    ok(findCh(ctx.GM, '魏忠贤').stance === '奸佞', 'C3-pos(诏令) 玩家诏令点名=有源→敏感字段照常落');
    ok(hintCount(ctx.GM) === 0, 'C3-pos(诏令) 放行→零弱提示(不误杀)');
  }
  // C3-pos·本回合弹劾奏疏点名(输入面·有源)→敏感字段照常落
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', fame: 80, resources: {} }],
      { memorials: [{ from: '御史', text: '劾魏忠贤欺君罔上、党同伐异' }] });
    ctx.applyAITurnChanges({ char_updates: [{ name: '魏忠贤', updates: { fame: 10 } }] });
    ok(findCh(ctx.GM, '魏忠贤').fame === 10, 'C3-pos(弹劾) 本回合弹劾输入点名=有源→敏感字段照常落');
    ok(hintCount(ctx.GM) === 0, 'C3-pos(弹劾) 放行→零弱提示');
  }
  // C3-backdoor·万能键 anyPathChanges 改敏感字段→禁区拦(不落库)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '魏忠贤', alive: true, faction: '明朝廷', stance: '忠', resources: {} }]);
    ctx.applyAITurnChanges({ anyPathChanges: [{ path: 'chars.魏忠贤.stance', op: 'set', value: '奸佞' }] });
    ok(findCh(ctx.GM, '魏忠贤').stance === '忠', 'C3-backdoor anyPathChanges 改敏感字段→_isPathBlocked 禁区拦(不落库·不绕闸)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  C4·events 键时点闸(applyAITurnChanges 事件段)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== C4·events 时点闸 =====');
  function eventReportCount(GM) { return (GM._turnReport || []).filter(e => e && e.type === 'event').length; }
  // C4-neg·带未来年份的事件→硬拒(不播报)+弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([], { year: 1626 });
    ctx.applyAITurnChanges({ events: [{ title: '己巳之变', year: 1700, text: '后金破关而入，京师戒严。' }] });
    ok(eventReportCount(ctx.GM) === 0, 'C4-neg 未来年份(1700>1626)事件→硬拒(不落 turnReport 播报)');
    ok((ctx.GM._aiWeakWriteHints || []).some(h => h && h.label === '未来时点事件'), 'C4-neg 拒写降级→弱自查纸条留痕');
  }
  // C4-pos·当年/过去年份事件→照常播报·无弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([], { year: 1626 });
    ctx.applyAITurnChanges({ events: [{ title: '本年时政', year: 1626, text: '整饬边备。' }] });
    ok(eventReportCount(ctx.GM) === 1, 'C4-pos(当年) 当前年份事件→照常播报(不误拦)');
    ok(hintCount(ctx.GM) === 0, 'C4-pos(当年) 放行→零弱提示');
  }
  // C4-pos·无年份字段事件→照常播报(宁漏勿误杀·无从判时点不拦)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([], { year: 1626 });
    ctx.applyAITurnChanges({ events: [{ title: '寻常朝报', text: '雨顺风调，四境安堵。' }] });
    ok(eventReportCount(ctx.GM) === 1, 'C4-pos(无年份) 无时点标注→照常播报(保守不拦)');
    ok(hintCount(ctx.GM) === 0, 'C4-pos(无年份) 放行→零弱提示');
  }
  // C4-soft·未到 triggerTurn 的既定史实名现于事件文本→软提示(不硬拒·仍播报)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([], { year: 1626, rigidHistoryEvents: [{ name: '甲申国难', triggerTurn: 99 }] });
    ctx.applyAITurnChanges({ events: [{ title: '坊间流言', text: '市井传言，恐有甲申国难之厄。' }] });
    ok(eventReportCount(ctx.GM) === 1, 'C4-soft 未到期史实名现于文本→软闸不硬拒(仍播报·防同名议论误杀)');
    ok((ctx.GM._aiWeakWriteHints || []).some(h => h && h.label === '未到期史实事件'), 'C4-soft 软提示留痕(供自查·不阻断)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  返工·issue2·C4 历法权威取正(calcDateFromTurn 读 P.time.year·非 startYear·避 1901 毒值)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== 返工·issue2·C4 历法权威(真实 P.time 形状) =====');
  // issue2-A·真实 P.time.year=1627·turn 推进到 1628 → 1628 事件不误拒(证读推进后真年·非 startYear/固定值)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([], { turn: 14 });   // 1627 + floor(13*30/365)=1628
    ctx.P = { time: { year: 1627, startMonth: 9, startDay: 1 } };
    ctx.applyAITurnChanges({ events: [{ title: '崇祯元年时政', year: 1628, text: '整饬边镇。' }] });
    ok(eventReportCount(ctx.GM) === 1, 'issue2-A calcDateFromTurn 读 P.time.year 推进=1628→当年事件不误拒');
    const ctx2 = makeCtx();
    ctx2.GM = baseGM([], { turn: 14 });
    ctx2.P = { time: { year: 1627, startMonth: 9, startDay: 1 } };
    ctx2.applyAITurnChanges({ events: [{ title: '甲申国难', year: 1700, text: '未来之厄。' }] });
    ok(eventReportCount(ctx2.GM) === 0, 'issue2-A 真年 1628·1700 事件仍硬拒(未来)');
  }
  // issue2-B·异常年值(非1000-2099·如唐 850 或缺 P.time)→视为无从确定·不硬拦(避旧 1901 毒值误判)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([], { turn: 1, year: 850 });   // 唐·全局年亦 850(非1000-2099)
    ctx.P = { time: { year: 850 } };    // 唐·calcDateFromTurn→850·非1000-2099
    ctx.applyAITurnChanges({ events: [{ title: '未来事', year: 1700, text: '越界年份。' }] });
    ok(eventReportCount(ctx.GM) === 1, 'issue2-B 当前年异常(850·非1000-2099·含回落)→无从确定不拦(1700 事件放行·非毒值误判)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  返工·issue3·朝议/常朝裁决进来源扫描面(GM._lastChangchaoDecisions / _courtRecords)
  // ══════════════════════════════════════════════════════════════════
  console.log('===== 返工·issue3·朝议裁决来源面 =====');
  // issue3-neg·无任何来源·下狱→拦(对照)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '杨涟', position: '都御史', officialTitle: '都御史', alive: true, faction: '明朝廷', resources: {} }]);
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '杨涟', change: '下狱究问' }] });
    ok(!findCh(ctx.GM, '杨涟')._imprisoned && hintNames(ctx.GM).indexOf('杨涟') >= 0, 'issue3-neg 无朝议裁决·下狱被拦(对照)');
  }
  // issue3-pos·本回合常朝裁决(_lastChangchaoDecisions)点名→有源放行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '杨涟', position: '都御史', officialTitle: '都御史', alive: true, faction: '明朝廷', resources: {} }],
      { _lastChangchaoDecisions: [{ action: 'adopt', title: '论杨涟结党植私之罪', dept: '都察院', extra: '着锦衣卫拿杨涟下诏狱' }] });
    ctx.applyAITurnChanges({ personnel_changes: [{ name: '杨涟', change: '下狱究问' }] });
    ok(!!findCh(ctx.GM, '杨涟')._imprisoned && hintCount(ctx.GM) === 0, 'issue3-pos 常朝裁决(_lastChangchaoDecisions)点名=有源→放行');
  }
  // issue3-pos·_courtRecords(常朝/廷议统一快照)决议/转录点名→有源放行(char_updates 敏感字段)
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '杨涟', alive: true, faction: '明朝廷', stance: '清流', resources: {} }],
      { _courtRecords: [{ turn: 5, targetTurn: 5, decisions: [{ title: '杨涟一案', detail: '廷议决罢黜杨涟', presenter: '首辅' }], transcript: [] }] });
    ctx.applyAITurnChanges({ char_updates: [{ name: '杨涟', updates: { stance: '获罪' } }] });
    ok(findCh(ctx.GM, '杨涟').stance === '获罪' && hintCount(ctx.GM) === 0, 'issue3-pos _courtRecords 决议点名=有源→敏感字段放行');
  }

  // ══════════════════════════════════════════════════════════════════
  //  返工·issue1·真实 SC1 扁平 char_updates(new_stance/new_party) 补来源判据
  // ══════════════════════════════════════════════════════════════════
  console.log('===== 返工·issue1·扁平 char_updates 敏感字段 =====');
  // issue1·扁平 schema 判源(真实消费点 tm-endturn-apply.js:1094 调 _sensitiveCharFieldSourced)：无源→false+留痕 / 有源→true
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '杨涟', alive: true, faction: '明朝廷', stance: '清流', resources: {} }]);
    const bkt = ctx.TM.__acaParts;
    const ch = findCh(ctx.GM, '杨涟');
    const p1flat = { char_updates: [{ name: '杨涟', new_stance: '失势', new_party: '' }], shizhengji: '杨涟渐失圣眷。' };   // 真实扁平 SC1 形状
    ok(bkt._sensitiveCharFieldSourced(ctx.GM, p1flat, ch, 'stance', '杨涟') === false, 'issue1 扁平 new_stance 无源→判 false(消费点据此跳过写 ch.stance)');
    ok(hintNames(ctx.GM).indexOf('杨涟') >= 0, 'issue1 无源→弱自查纸条留痕');
    const ctx2 = makeCtx();
    ctx2.GM = baseGM([{ name: '杨涟', alive: true, faction: '明朝廷', stance: '清流', resources: {} }],
      { _playerDirectives: [{ id: 'd1', content: '杨涟结党，着夺其清望' }] });
    const p1b = { char_updates: [{ name: '杨涟', new_stance: '失势' }] };
    ok(ctx2.TM.__acaParts._sensitiveCharFieldSourced(ctx2.GM, p1b, findCh(ctx2.GM, '杨涟'), 'stance', '杨涟') === true, 'issue1 扁平 new_stance 有玩家诏令源→判 true(照落)');
  }
  // issue1·契约：真实消费点 tm-endturn-apply.js 扁平 new_stance/new_party 处确已接 _sensitiveCharFieldSourced 闸
  {
    // 文件名拼接构造(非 split-family 装载序消费·只作源码契约 grep·避免 smoke-family-order 误判提及序)
    const _epName = 'tm-endturn-apply' + '.js';
    const src = fs.readFileSync(path.join(ROOT, _epName), 'utf8');
    const seg = src.slice(src.indexOf('if (cu.new_stance'), src.indexOf('if (cu.new_stance') + 700);
    ok(/_sensitiveCharFieldSourced\([^)]*'stance'/.test(seg) && /_sensitiveCharFieldSourced\([^)]*'party'/.test(seg),
      'issue1 契约·消费点 new_stance/new_party 均已内联 _sensitiveCharFieldSourced 判源(扁平绕过已堵)');
  }

  // ══════════════════════════════════════════════════════════════════
  //  返工·issue5·allegiance_changes 改 canonical faction 补来源判据
  // ══════════════════════════════════════════════════════════════════
  console.log('===== 返工·issue5·改换门庭判源 =====');
  function facOf(GM, n) { const c = findCh(GM, n); return c && c.faction; }
  // issue5-neg·无诱因无来源·裸改换门庭→拦(faction 不变)+弱提示
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '祖大寿', alive: true, faction: '明朝廷', resources: {} }],
      { facs: [{ name: '明朝廷' }, { name: '后金' }] });
    ctx.applyAITurnChanges({ allegiance_changes: [{ character: '祖大寿', newFaction: '后金', reason: '' }] });
    ok(facOf(ctx.GM, '祖大寿') === '明朝廷', 'issue5-neg 无诱因无来源→改换门庭被拦(faction 不变)');
    ok(hintNames(ctx.GM).indexOf('祖大寿') >= 0, 'issue5-neg 拒写降级→弱自查纸条留痕');
  }
  // issue5-pos·reason 含军政诱因(战败/力屈而降)→有源放行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '祖大寿', alive: true, faction: '明朝廷', resources: {} }],
      { facs: [{ name: '明朝廷' }, { name: '后金' }] });
    ctx.applyAITurnChanges({ allegiance_changes: [{ character: '祖大寿', newFaction: '后金', reason: '大凌河围城日久，粮尽援绝，力屈请降' }] });
    ok(facOf(ctx.GM, '祖大寿') === '后金', 'issue5-pos(诱因) reason 含围城/请降=有源→改换门庭照落');
    ok(hintCount(ctx.GM) === 0, 'issue5-pos(诱因) 放行→零弱提示');
  }
  // issue5-pos·玩家诏令点名→有源放行
  {
    const ctx = makeCtx();
    ctx.GM = baseGM([{ name: '祖大寿', alive: true, faction: '明朝廷', resources: {} }],
      { facs: [{ name: '明朝廷' }, { name: '后金' }], _playerDirectives: [{ id: 'd1', content: '着祖大寿反正归明' }] });
    ctx.applyAITurnChanges({ allegiance_changes: [{ character: '祖大寿', newFaction: '后金', reason: '' }] });
    ok(facOf(ctx.GM, '祖大寿') === '后金', 'issue5-pos(诏令) 玩家诏令点名=有源→放行');
  }

  console.log('');
  console.log('[smoke-write-gate-expansion] ' + passed + ' passed / ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
