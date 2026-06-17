#!/usr/bin/env node
/* eslint-env node */
// smoke-gongming-engine.js — 功名系统·出身资格引擎 (2026-06-13)
// 功名=资格(出身)⊕政绩(virtueMerit)。本 smoke 实跑 tm-gongming.js：解析 learning 串→结构化出身·派生正异途/清浊流/天花板/优免·授功名·天花板 gating。
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'tm-gongming.js'), 'utf8');

// 沙箱：context 自身即 global 对象·裸 TMPromotion / global.TMPromotion 同解
const sandbox = { console: console };
sandbox.global = sandbox;
sandbox.window = undefined;
// 桩 TMPromotion(确定性天花板/品名)
sandbox.TMPromotion = {
  resolveRankLevel: function (ch) { return (ch && ch._lv) || 18; },
  rankNameOf: function (lv) { return ({ 1: '正一品', 2: '从一品', 5: '正三品', 7: '正四品', 9: '正五品', 11: '正六品', 13: '正七品', 14: '从七品' })[lv] || ('第' + lv + '级'); }
};
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox);
const TG = sandbox.TMGongming;

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('  PASS', msg); }
  else { failed += 1; console.error('  FAIL', msg); }
}

// ── 0. 模块加载 ──
ok(!!TG, '模块加载·TMGongming 存在');
ok(typeof TG.parseLearning === 'function' && typeof TG.describe === 'function', '门面方法齐备');

// ── 1. parseLearning：从 learning 串解析出身 ──
var pJin = TG.parseLearning('进士');
ok(pJin && pJin.path === 'keju' && pJin.tier === '进士', '进士 → keju·进士');
var pHan = TG.parseLearning('进士(翰林)');
ok(pHan && pHan.tier === '进士' && pHan.honors.indexOf('翰林') >= 0, '进士(翰林) → honors 含翰林');
var pZhuang = TG.parseLearning('进士(状元)');
ok(pZhuang && pZhuang.honors.indexOf('状元') >= 0 && pZhuang.honors.indexOf('翰林') >= 0, '进士(状元) → 状元隐含翰林');
var pJu = TG.parseLearning('举人');
ok(pJu && pJu.tier === '举人' && pJu.path === 'keju', '举人 → keju·举人');
var pNum = TG.parseLearning(42);
ok(pNum && pNum._academicScore === 42 && !pNum.tier, 'learning 误为数字 → _academicScore·非出身');
ok(TG.parseLearning('') === null && TG.parseLearning(null) === null, '空串/null → null');
var pJuan = TG.parseLearning('捐纳出身');
ok(pJuan && pJuan.path === 'nazi' && pJuan.tier === '例监', '捐纳 → 纳赀·例监');
var pYin = TG.parseLearning('荫生');
ok(pYin && pYin.path === 'menyin', '荫生 → 门荫');
var pLi = TG.parseLearning('吏员出身');
ok(pLi && pLi.path === 'lijin', '吏员 → 吏进');

// ── 2. deriveFields：派生正异途/清浊流/天花板/优免 ──
function derived(learn, lv) {
  var g = TG.parseLearning(learn) || {};
  if (!g.honors) g.honors = [];
  TG.deriveFields(g, { _lv: lv }, null);
  return g;
}
var dJin = derived('进士');
ok(dJin.ceiling === 1 && dJin.zhengtu === true && dJin.tierRank === 90, '进士派生·天花板正一品·正途·tierRank90');
ok(dJin.youmian === 16, '进士优免16丁');
var dHan = derived('进士(翰林)');
ok(dHan.liupin === 'qing' && dHan.ceiling === 1 && dHan.tierRank === 94, '进士(翰林)·清流·天花板1·tierRank94');
var dZhuang = derived('进士(状元)');
ok(dZhuang.liupin === 'qing' && dZhuang.tierRank === 100, '进士(状元)·清流·tierRank封顶100');
var dJu = derived('举人');
ok(dJu.ceiling === 7 && dJu.zhengtu === true && dJu.liupin === 'mid', '举人·天花板正四品·正途·中流');
var dJuan = derived('例监');
ok(dJuan.zhengtu === false && dJuan.liupin === 'zhuo' && dJuan.ceiling === 10, '例监·异途·浊流·天花板从五品');
var dLi = derived('吏员');
ok(dLi.zhengtu === false && dLi.liupin === 'zhuo', '吏员·异途·浊流');
var dWu = derived('武进士');
ok(dWu.liupin === 'wu' && dWu.zhengtu === true && dWu.ceiling === 2, '武进士·武班·正途·天花板从一品');

// ── 3. ensureGongming：幂等·从 ch.learning 解析 ──
var chJin = { name: '甲', learning: '进士(翰林)', _lv: 18, resources: {} };
var g1 = TG.ensureGongming(chJin, null);
ok(g1.path === 'keju' && g1.liupin === 'qing', 'ensureGongming 从 learning 解析翰林清流');
var g2 = TG.ensureGongming(chJin, null);
ok(g1 === g2, 'ensureGongming 幂等(同引用·命中 _derivedScale)');
ok(chJin.resources.gongming === g1, '结构化出身落 ch.resources.gongming');

// 无 learning → 按官职推定
var chInfer = { name: '乙', officialTitle: '兵部尚书', _lv: 3, resources: {} };
var gInfer = TG.ensureGongming(chInfer, null);
ok(gInfer.source === 'inferred' && gInfer.tier === '进士', '无 learning·正二品文官 → 推定进士');
var chMartial = { name: '丙', officialTitle: '辽东总兵官', _lv: 4, resources: {} };
var gM = TG.ensureGongming(chMartial, null);
ok(gM.path === 'junggong', '无 learning·总兵 → 推定军功');
var chBuyi = { name: '丁', resources: {} };
ok(TG.ensureGongming(chBuyi, null).path === 'buyi', '无官无 learning → 布衣');

// 剧本显式 gongmingOrigin 优先
var chExp = { name: '戊', learning: '举人', gongmingOrigin: { path: 'menyin', tier: '荫生', honors: [] }, resources: {} };
ok(TG.ensureGongming(chExp, null).path === 'menyin', '剧本显式 gongmingOrigin 压过 learning');

// ── 4. 天花板 gating ──
var chJu = { name: '己', learning: '举人', _lv: 18, resources: {} };
ok(TG.ceilingLevel(chJu, null) === 7, '举人天花板 level=7(正四品)');
ok(TG.canReach(chJu, 9, null) === true, '举人可达正五品(9≥7)');
ok(TG.canReach(chJu, 3, null) === false, '举人不得径入正二品(3<7·未在其上)');
ok(TG.ceilingGap(chJu, 3, null) === 4, '举人逾天花板至正二品·级差4');
ok(TG.ceilingGap(chJu, 7, null) === 0, '举人达天花板内·级差0');
// 已超出身上限者·天花板=现品(不贬黜)
var chJuHigh = { name: '庚', learning: '举人', _lv: 4, resources: {} };
ok(TG.ceilingLevel(chJuHigh, null) === 4, '举人已居从二品·有效天花板=现品4(不贬黜)');
ok(TG.canReach(chJuHigh, 4, null) === true, '举人居从二品·可守现品');
ok(TG.canReach(chJuHigh, 3, null) === false, '举人居从二品·仍不得再越至正二品');

// ── 5. 授功名(生成路径) ──
var chGr = { name: '辛', _lv: 18, resources: {} };
var gGr = TG.grant(chGr, { path: 'menyin', tier: '荫生', source: 'menyin' }, { turn: 5 });
ok(gGr.path === 'menyin' && gGr.zhengtu === true && gGr.grantedTurn === 5, '授荫生·门荫正途·记授予回合');
var gNz = TG.grant(chGr, { path: 'nazi', tier: '例监', source: 'edict' }, null);
ok(gNz.zhengtu === false && gNz.liupin === 'zhuo', '授例监(捐纳)·异途浊流·覆盖前出身');

// addHonor：馆选庶吉士
var chShu = { name: '壬', learning: '进士', _lv: 8, resources: {} };
TG.ensureGongming(chShu, null);
var gShu = TG.addHonor(chShu, '庶吉士', null);
ok(gShu.liupin === 'qing' && gShu.ceiling === 1 && (gShu.tags || []).indexOf('储相') >= 0, '馆选庶吉士·清流·储相·天花板拔正一品');

// grantPreset：五生成路径
var chP1 = { name: 'P1', _lv: 18, resources: {} };
ok(TG.grantPreset(chP1, 'menyin', null, null).path === 'menyin', 'grantPreset 门荫→荫生');
ok(TG.grantPreset(chP1, 'nazi', null, null).zhengtu === false, 'grantPreset 捐纳→异途');
ok(TG.grantPreset(chP1, 'junggong', { tier: '武进士' }, null).tier === '武进士', 'grantPreset 军功·opts.tier 升武进士');
ok(TG.grantPreset(chP1, 'lijin', null, null).liupin === 'zhuo', 'grantPreset 吏进→浊流');
var gEnci = TG.grantPreset(chP1, 'enci', null, null);
ok(gEnci.tier === '进士' && gEnci.zhengtu === true && gEnci.liupin !== 'qing', 'grantPreset 特赐→进士正途但非清流');
ok(TG.grantPreset(chP1, 'bogus', null, null) === null, 'grantPreset 未知路径→null');

// ── 6. 展示/摘要 ──
var d = TG.describe(chJin, null);
ok(d.qing === true && d.title === '科举·进士' && d.honors.indexOf('翰林') >= 0, 'describe·清流·标题·荣衔');
var line = TG.summaryLine(chJin, null);
ok(/进士/.test(line) && /清流/.test(line) && /正途/.test(line) && /仕至/.test(line), 'summaryLine 含出身/清流/正途/天花板·got: ' + line);
var lineJuan = TG.summaryLine({ name: '癸', learning: '捐纳', _lv: 18, resources: {} }, null);
ok(/异途/.test(lineJuan) && /浊流/.test(lineJuan), '捐纳摘要·异途·浊流·got: ' + lineJuan);

// ── 7. migrateAll 幂等 ──
var G = { turn: 3, chars: [{ name: 'a', learning: '进士', resources: {} }, { name: 'b', learning: '举人', resources: {} }, null] };
var n1 = TG.migrateAll(G);
ok(n1 === 2, 'migrateAll 首遍处理 2 人(跳 null)·got ' + n1);
var n2 = TG.migrateAll(G);
ok(n2 === 0, 'migrateAll 再遍 0(幂等)');
ok(G.chars[0].resources.gongming.tier === '进士' && G.chars[1].resources.gongming.tier === '举人', 'migrateAll 后各人出身就位');

// ── 8. 机械后果：名望底偏置 / 党派引力 / 优免聚合 ──
ok(TG.fameBias({ name: 'h', learning: '进士(翰林)', resources: {} }, null) >= 6, '清流(翰林)名望底 +(≥6)');
ok(TG.fameBias({ name: 'i', learning: '进士(状元)', resources: {} }, null) === 11, '状元清流·名望底 +11(6清流+5状元)');
ok(TG.fameBias({ name: 'j', learning: '捐纳', resources: {} }, null) === -6, '捐纳异途浊流·名望底 −6');
ok(TG.fameBias({ name: 'k', learning: '举人', resources: {} }, null) === 0, '举人中流·名望底 0');

var affQ = TG.liupinAffinity({ name: 'l', learning: '进士(翰林)', resources: {} }, null);
ok(affQ.camp === 'qing' && affQ.strength >= 2, '翰林→清流阵营拉力');
var affZ = TG.liupinAffinity({ name: 'm', learning: '吏员', resources: {} }, null);
ok(affZ.camp === 'zhuo', '吏员→浊流阵营拉力');
ok(TG.liupinAffinity({ name: 'n', learning: '举人', resources: {} }, null).camp === 'neutral', '举人中流→中立');

// applyGongmingBias：幂等·仅 fame 已就位时落·跳君上
var chB = { name: 'o', learning: '进士(翰林)', resources: { fame: 50 } };
var d1 = TG.applyGongmingBias(chB, null);
ok(d1 >= 6 && chB.resources.fame >= 56, '名望底偏置落 fame(50→≥56)');
ok(TG.applyGongmingBias(chB, null) === 0 && chB.resources.fame >= 56, '名望底偏置幂等(再调 0·不重复加)');
var chNoFame = { name: 'p', learning: '捐纳', resources: {} };
ok(TG.applyGongmingBias(chNoFame, null) === 0 && chNoFame.resources.fame === undefined, 'fame 未就位→不抢先创建(防 clobber)');
var chPlayer = { name: 'q', isPlayer: true, learning: '进士', resources: { fame: 50 } };
ok(TG.applyGongmingBias(chPlayer, null) === 0 && chPlayer.resources.fame === 50, '君上无功名偏置');

// totalYoumian：在世个人优免合计
var Gy = { turn: 1, chars: [
  { name: 'r', learning: '进士', resources: {} },
  { name: 's', learning: '举人', resources: {} },
  { name: 't', learning: '捐纳', alive: false, resources: {} }
] };
ok(TG.totalYoumian(Gy) === 24, '在世优免合计=进士16+举人8=24(殁者不计)·got ' + TG.totalYoumian(Gy));

console.log('\n[smoke-gongming-engine] ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
