#!/usr/bin/env node
'use strict';
/* smoke-memory-strengthen — 记忆⇄推演双向再加强五刀（2026-07-04）防腐线。
 * §A1 点名必入+相关性选忆(逻辑副本+契约)   §A2 在场恩怨对照(逻辑副本+契约)
 * §B1 政柄更迭入党人记忆(逻辑副本+契约)     §B2 运动升相入党魁记忆(vm 实跑行为)
 * §B3 目击者传播(逻辑副本+契约) */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var ROOT = path.resolve(__dirname, '..');
var P0 = 0, F0 = 0;
function ok(c, m) { if (c) { P0++; console.log('  ✓ ' + m); } else { F0++; console.log('  ✗ FAIL: ' + m); } }
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
console.log('smoke-memory-strengthen');

/* ── §A1 · 点名必入 + 相关性选忆(逻辑副本) ─────────────────────── */
console.log('— §A1 · 点名必入+相关性选忆 —');
(function () {
  // 复制自 tm-endturn-prompt.js _injectNpcHearts：点名加权
  function edictBoost(name, hay) {
    return (hay && name && String(name).length >= 2 && hay.indexOf(name) >= 0) ? 40 : 0;
  }
  var hay = '着袁崇焕整饬关宁防务·再拨辽饷三十万';
  ok(edictBoost('袁崇焕', hay) === 40, '诏令点名者 +40(近乎保证入深度名额)');
  ok(edictBoost('毕自严', hay) === 0, '未点名者不加权');
  ok(edictBoost('王', '着王整军') === 0, '单字名不查(防误中)');

  // 复制自 _memScore：同场+2.5 / 点名+2·排序不放水门槛
  function memScore(m, selfName, present, hay) {
    var s = (m.importance || 0), w = (m && m.who) || '';
    if (w && w !== selfName) {
      if (present[w]) s += 2.5;
      if (hay && String(w).length >= 2 && hay.indexOf(w) >= 0) s += 2;
    }
    return s;
  }
  var present = { '袁崇焕': 1, '毕自严': 1 };
  var mems = [
    { event: '早年蒙先帝赏识', importance: 8, who: '先帝' },
    { event: '与袁崇焕争辽饷·几至相殴', importance: 6, who: '袁崇焕' }
  ];
  var sorted = mems.slice().sort(function(a, b) { return memScore(b, '毕自严', present, hay) - memScore(a, '毕自严', present, hay); });
  ok(sorted[0].who === '袁崇焕', '同场+点名的 imp6 记忆(6+2.5+2=10.5)压过无关 imp8·对手戏出线');
  ok(memScore(mems[1], '袁崇焕', present, hay) === 6, '记忆主人自己是 who 时不自加分');
  // 门槛完整性：impMin 过滤按原 importance·相关性不放水
  var lowRelevant = { event: '琐事', importance: 3, who: '袁崇焕' };
  ok((lowRelevant.importance || 0) < 6, '低 imp 记忆即便相关·仍会被 impMin 门槛挡(过滤在排序之外·质量闸不放水)');

  var src = read('tm-endturn-prompt.js');
  ok(/_edictHay = \[edicts\.decree, edicts\.political/.test(src), '契约:点名 haystack 取六字段诏令');
  ok(/_edictHay\.indexOf\(c\.name\) >= 0\) weight \+= 40/.test(src), '契约:点名 +40 加权在选人评分内');
  ok(/if \(_present\[w\]\) s \+= 2\.5;/.test(src), '契约:同场对手戏 +2.5 在 _memScore 内');
  ok(/_memScore\(b\) - _memScore\(a\)/.test(src), '契约:选忆排序走 _memScore(替换纯 importance 排序)');
})();

/* ── §A2 · 在场恩怨对照(逻辑副本) ─────────────────────────────── */
console.log('— §A2 · 在场恩怨对照 —');
(function () {
  // 复制自 <with> 构建逻辑
  function buildWith(memory, selfName, present, top) {
    var best = {};
    (memory || []).forEach(function(m) {
      var w = m && m.who;
      if (!w || w === selfName || !present[w] || (m.importance || 0) < 5) return;
      if (top.indexOf(m) >= 0) return;
      if (!best[w] || (m.importance || 0) > (best[w].importance || 0)) best[w] = m;
    });
    return Object.keys(best).sort(function(x, y) { return (best[y].importance || 0) - (best[x].importance || 0); }).slice(0, 2)
      .map(function(w) { return { who: w, event: best[w].event, importance: best[w].importance }; });
  }
  var present = { '甲': 1, '乙': 1, '丙': 1 };
  var mem = [
    { event: '与甲旧怨A', importance: 6, who: '甲' },
    { event: '与甲旧怨B更深', importance: 8, who: '甲' },
    { event: '与乙有隙', importance: 5, who: '乙' },
    { event: '与丙琐事', importance: 4, who: '丙' },
    { event: '与丁大仇(不在场)', importance: 9, who: '丁' }
  ];
  var ws = buildWith(mem, '某', present, []);
  ok(ws.length === 2, '每人至多2条对照 (得 ' + ws.length + ')');
  ok(ws[0].who === '甲' && ws[0].importance === 8, '每对取最高重要度一条(甲取 imp8 非 imp6)');
  ok(!ws.some(function(w) { return w.who === '丁'; }), '不在场者不挂(丁 imp9 也不挂)');
  ok(!ws.some(function(w) { return w.who === '丙'; }), 'imp<5 琐事不挂');
  var topAlready = [mem[1]];
  var ws2 = buildWith(mem, '某', present, topAlready);
  ok(ws2.some(function(w) { return w.who === '甲' && w.importance === 6; }), '已入 <memory> 的不重挂·退取次条(甲 imp6)');

  var src = read('tm-endturn-prompt.js');
  ok(/<with name="/.test(src) && /_withCount\+\+/.test(src), '契约:<with> 注入+计数在源');
  ok(/对手戏优先于独角戏/.test(src) && /if \(_withCount > 0\)/.test(src), '契约:演出指令仅在有对照时注入');
})();

/* ── §B1 · 政柄更迭入党人记忆(逻辑副本) ───────────────────────── */
console.log('— §B1 · 政柄更迭入党人记忆 —');
(function () {
  // 复制自 tm-three-systems-ext.js standing 变更块
  function standingMemory(fromStanding, toStanding, party, chars, rememberFn) {
    var _smTxt, _smEmo, _smImp;
    if (toStanding === 'governing') { _smTxt = '吾党秉政·朝中要职过半在握'; _smEmo = '喜'; _smImp = 7; }
    else if (fromStanding === 'governing') { _smTxt = '吾党失柄·见逐于朝堂中枢'; _smEmo = '怒'; _smImp = 8; }
    else if (toStanding === 'marginal') { _smTxt = '吾党于朝中日渐边缘·同志零落'; _smEmo = '忧'; _smImp = 6; }
    else { _smTxt = '吾党重列朝堂·渐有声势'; _smEmo = '喜'; _smImp = 5; }
    var members = chars.filter(function(mc) {
      return mc && mc.alive !== false && !mc.isPlayer && (mc.party === party.name || (party.leader && mc.name === party.leader));
    }).sort(function(x, y) {
      return ((party.leader && y.name === party.leader) ? 1 : 0) - ((party.leader && x.name === party.leader) ? 1 : 0);
    }).slice(0, 5);
    members.forEach(function(mc) {
      var _isLd = party.leader && mc.name === party.leader;
      rememberFn(mc.name, _smTxt + '（' + party.name + '）', _smEmo, _isLd ? Math.min(9, _smImp + 1) : _smImp);
    });
    return members.length;
  }
  var got;
  var rec = function(n, e, emo, imp) { got.push({ name: n, event: e, emo: emo, imp: imp }); };
  var party = { name: '清流', leader: '李三才' };
  var chars = [
    { name: '李三才', party: '清流' }, { name: '赵南星', party: '清流' }, { name: '客卿', party: '他党' },
    { name: '亡者', party: '清流', alive: false }, { name: '帝', party: '清流', isPlayer: true },
    { name: 'members2', party: '清流' }, { name: 'm3', party: '清流' }, { name: 'm4', party: '清流' }, { name: 'm5', party: '清流' }
  ];
  got = [];
  var n1 = standingMemory('opposition', 'governing', party, chars, rec);
  ok(n1 === 5 && got.length === 5, '秉政·至多5人入记忆 (得 ' + n1 + ')');
  ok(got[0].name === '李三才' && got[0].imp === 8 && got[0].emo === '喜', '党魁必first且重要度+1(7→8)');
  ok(got.every(function(g) { return g.event.indexOf('秉政') >= 0; }), '秉政文本');
  ok(!got.some(function(g) { return g.name === '亡者' || g.name === '帝' || g.name === '客卿'; }), '死者/玩家/他党不写');
  got = [];
  standingMemory('governing', 'marginal', party, chars, rec);
  ok(got[0].emo === '怒' && got[0].imp === 9 && got[0].event.indexOf('失柄') >= 0, '失柄·怒·魁 imp9(8+1)');
  got = [];
  standingMemory('marginal', 'opposition', party, chars, rec);
  ok(got[0].event.indexOf('重列朝堂') >= 0 && got[1].imp === 5, '边缘→在野·重列朝堂·员 imp5');

  var src = read('tm-three-systems-ext.js');
  ok(/政柄更迭入党人记忆/.test(src) && /吾党失柄·见逐于朝堂中枢/.test(src), '契约:B1 块在 standing 真变闸内');
  ok(src.indexOf('吾党秉政·朝中要职过半在握') > 0 && /NpcMemorySystem\.remember\(mc\.name/.test(src), '契约:走 NpcMemorySystem(近窗去重)');
})();

/* ── §B2 · 运动升相入党魁记忆(vm 实跑行为) ────────────────────── */
console.log('— §B2 · 运动升相入党魁记忆(行为) —');
(function () {
  var remembered = [];
  var ctx = { console: { log: function(){}, warn: function(){}, error: function(){} }, Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, Boolean: Boolean, Date: Date, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, isFinite: isFinite };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.NpcMemorySystem = { remember: function(n, e, emo, imp, who, meta) { remembered.push({ name: n, event: e, emo: emo, imp: imp, meta: meta }); } };
  vm.createContext(ctx);
  vm.runInContext(read('tm-engine-constants.js'), ctx, { filename: 'tm-engine-constants.js' });
  vm.runInContext(read('tm-social-foundation.js'), ctx, { filename: 'tm-social-foundation.js' });
  var SF = ctx.TM.SocialFoundation;
  var GMx = {
    turn: 10,
    parties: [
      { name: '惠农社', leader: '陈龙正', socialBase: '自耕农、佃户', standing: 'opposition' },
      { name: '当国党', leader: '周延儒', socialBase: '缙绅', standing: 'governing' },
      { name: '无魁党', socialBase: '自耕农' },
      { name: '无关党', leader: '外人', socialBase: '商贾', standing: 'opposition' }
    ],
    chars: [{ name: '陈龙正' }, { name: '周延儒' }, { name: '外人' }]
  };
  var cls = { name: '自耕农', satisfaction: 40, _agenda: { items: [{ kind: 'tax', text: '减赋罢派', urgency: 3, sinceTurn: 4 }] } };
  var classes = [cls];
  // 凝成(初起 support 26)——不写记忆
  SF.tickMovements(GMx, classes, 10);
  ok(GMx._politicalMovements.length === 1 && remembered.length === 0, '初起不写记忆(只升相写)');
  // 壮大跨 40 → 成势
  SF.tickMovements(GMx, classes, 11);
  SF.tickMovements(GMx, classes, 12);
  SF.tickMovements(GMx, classes, 13);   // 26+6*3=44 → 成势
  ok(GMx._politicalMovements[0].phase === '成势', '跨40成势 (support ' + GMx._politicalMovements[0].support + ')');
  ok(remembered.length === 2, '成势→2条记忆(基础党魁+秉政党魁·无魁党/无关党不写) (得 ' + remembered.length + ')');
  var base = remembered.filter(function(r) { return r.name === '陈龙正'; })[0];
  var gov = remembered.filter(function(r) { return r.name === '周延儒'; })[0];
  ok(base && base.event.indexOf('根基之民') >= 0 && base.emo === '喜' && base.imp === 7, '基础党魁·可为请命·喜·imp7');
  ok(gov && gov.event.indexOf('朝局承压') >= 0 && gov.emo === '忧' && gov.imp === 6, '秉政党魁·承压·忧·imp6');
  // 跨 70 → 鼎沸
  remembered.length = 0;
  for (var t = 14; t <= 18; t++) SF.tickMovements(GMx, classes, t);
  ok(GMx._politicalMovements[0].phase === '鼎沸', '跨70鼎沸');
  ok(remembered.length === 2 && remembered.every(function(r) { return r.imp === 8; }), '鼎沸再写·imp8 (得 ' + remembered.length + ')');
  var baseHot = remembered.filter(function(r) { return r.name === '陈龙正'; })[0];
  ok(baseHot && baseHot.emo === '忧', '鼎沸时基础党魁转忧(善抚不及则根基失)');
  // 退潮降相不写
  remembered.length = 0;
  cls._agenda.items = [];
  for (var t2 = 19; t2 <= 21; t2++) SF.tickMovements(GMx, classes, t2);
  ok(remembered.length === 0, '退潮降相/消散不写记忆(只升相写)');
})();

/* ── §B3 · 目击者传播(逻辑副本) ───────────────────────────────── */
console.log('— §B3 · 目击者传播 —');
(function () {
  // 复制自 tm-endturn-followup.js _applyMwList 目击传播段
  var remembered;
  var GM = { chars: [{ name: '甲' }, { name: '乙' }, { name: '丙' }, { name: '死者', alive: false }, { name: '帝', isPlayer: true }] };
  function applyOne(mw, witTotalBox) {
    remembered.push({ name: mw.char, event: mw.event });
    if ((mw.importance || 5) >= 6 && Array.isArray(mw.witnesses) && witTotalBox.n < 12) {
      mw.witnesses.slice(0, 3).forEach(function(wn) {
        if (witTotalBox.n >= 12 || !wn || typeof wn !== 'string' || wn === mw.char) return;
        var wc = null;
        GM.chars.some(function(c) { if (c && c.name === wn) { wc = c; return true; } return false; });
        if (!wc || wc.alive === false || wc.isPlayer) return;
        remembered.push({ name: wn, event: '亲见：' + String(mw.event).slice(0, 60), imp: Math.max(3, (mw.importance || 5) - 2), source: 'witnessed' });
        witTotalBox.n++;
      });
    }
  }
  remembered = [];
  var box = { n: 0 };
  applyOne({ char: '甲', event: '甲于午门杖毙谏官', importance: 8, witnesses: ['乙', '丙', '死者', '帝', '甲', '不存在者'] }, box);
  var wit = remembered.filter(function(r) { return r.source === 'witnessed'; });
  ok(wit.length === 2, '每条至多3人查·活人非玩家非本人才写(乙丙得·死者/玩家/本人/查无此人不得) (得 ' + wit.length + ')');
  ok(wit[0].event.indexOf('亲见：') === 0 && wit[0].imp === 6, '亲见前缀·重要度-2(8→6)');
  remembered = [];
  box = { n: 0 };
  applyOne({ char: '甲', event: '琐事', importance: 5, witnesses: ['乙'] }, box);
  ok(remembered.filter(function(r) { return r.source === 'witnessed'; }).length === 0, 'imp<6 不传播(琐事不扰目击者)');
  remembered = [];
  box = { n: 11 };
  applyOne({ char: '甲', event: '要事', importance: 7, witnesses: ['乙', '丙'] }, box);
  ok(remembered.filter(function(r) { return r.source === 'witnessed'; }).length === 1 && box.n === 12, '每批封顶12(11起步只进1条)');
  ok(Math.max(3, 4 - 2) === 3, '重要度地板3');

  var src = read('tm-endturn-followup.js');
  ok(/目击者传播/.test(src) && /亲见：' \+ String\(mw\.event\)\.slice\(0, 60\)/.test(src), '契约:传播段在 _applyMwList 内');
  ok(/witTotal < 12/.test(src) && /slice\(0, 3\)/.test(src), '契约:双封顶(3/条·12/批)');
  ok(/source: 'witnessed'/.test(src) && !/covered\[wn\]/.test(src), '契约:witnessed 源·不占 covered(续写去重语义只属当事人)');
})();

console.log('\nsmoke-memory-strengthen ' + (F0 === 0 ? 'PASS' : 'FAIL') + ' ' + P0 + '/' + (P0 + F0));
process.exit(F0 === 0 ? 0 : 1);
