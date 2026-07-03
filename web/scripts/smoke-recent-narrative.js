#!/usr/bin/env node
// scripts/smoke-recent-narrative.js
// 2026-07-03·方向B加强·时政记/实录回喂推演·治"叙事与推演断裂"·两层叙事记忆
//
// 断裂点·喂下回合推演的仅 chronicleAfterwords(2句/200字)·完整时政记/实录未留→AI 每回合接不上真实叙事。
// 修·apply.js 存 GM._recentNarrative(近6回合原文)·超6回合折入 GM._narrativeDigest(压缩梗概·每回合更新·封顶15)·
//   prompt.js 注入=长线综述(digest) + 近3回合原文(最新全额+前两回合半额·按上下文预算)。
// 本测·复制存储(5原文+digest压缩) + 注入(综述+3原文)两处逻辑断言。

'use strict';
let passed = 0, failed = 0;
function assert(cond, msg){ if(cond) passed++; else { failed++; console.error('  ✗ '+msg); } }

// ── 复制自 apply.js 存储逻辑 ──
function storeRecent(GM, shizhengji, shiluText, szjSummary) {
  try {
    var _szjFull = String(shizhengji || ''), _shiluFull = String(shiluText || '');
    if ((_szjFull + _shiluFull).replace(/\s/g, '').length >= 20) {
      if (!Array.isArray(GM._recentNarrative)) GM._recentNarrative = [];
      var _szjSum = String(szjSummary || '').trim();
      if (!_szjSum) {
        var _ss = _szjFull.split(/[。！？\n]/).map(function(x){ return x.trim(); }).filter(function(x){ return x.length >= 4; });
        if (_ss.length) _szjSum = _ss[0] + (_ss.length > 1 ? '…' + _ss[_ss.length - 1] : '');
      }
      GM._recentNarrative.push({ turn: GM.turn, shizhengji: _szjFull.slice(0, 2600), shilu: _shiluFull.slice(0, 1300), summary: _szjSum.slice(0, 200) });
      if (!Array.isArray(GM._narrativeDigest)) GM._narrativeDigest = [];
      while (GM._recentNarrative.length > 6) {
        var _evNarr = GM._recentNarrative.shift();
        if (_evNarr && _evNarr.summary) GM._narrativeDigest.push({ turn: _evNarr.turn, summary: _evNarr.summary });
      }
      if (GM._narrativeDigest.length > 15) GM._narrativeDigest = GM._narrativeDigest.slice(-15);
    }
  } catch (_e) {}
}
// ── 复制自 prompt.js 注入逻辑(scale 直接传入) ──
function injectRecent(GM, scale) {
  var tp = '';
  if ((Array.isArray(GM._recentNarrative) && GM._recentNarrative.length > 0) || (Array.isArray(GM._narrativeDigest) && GM._narrativeDigest.length > 0)) {
    var _rnScale = scale || 1;
    var _rnBudget = Math.max(700, Math.min(2000, Math.round(1100 * _rnScale)));
    var _digSrc = (GM._narrativeDigest || []).slice();
    var _rnMid = (GM._recentNarrative || []).slice(0, -3);   // 存了原文但未全文注入的较近回合→用摘要补进综述
    for (var _mi = 0; _mi < _rnMid.length; _mi++) { if (_rnMid[_mi]) _digSrc.push({ turn: _rnMid[_mi].turn, summary: _rnMid[_mi].summary || '' }); }
    if (_digSrc.length > 0) {
      var _digTxt = _digSrc.map(function(d){ return 'T' + (d.turn || '?') + '：' + (d.summary || ''); }).join('；');
      var _digBud = Math.max(500, Math.min(1600, Math.round(800 * _rnScale + 300)));
      var _digOut = _digTxt.length > _digBud ? _digTxt.slice(-_digBud) : _digTxt;
      tp += '\n【长线叙事综述（更早各回合梗概·把握长期走向与未了之局，本回合叙事勿与之矛盾）】\n' + _digOut + '\n';
    }
    if (Array.isArray(GM._recentNarrative) && GM._recentNarrative.length > 0) {
      var _rnSlice = GM._recentNarrative.slice(-3);
      var _rnBlocks = [];
      for (var _rni = _rnSlice.length - 1; _rni >= 0; _rni--) {
        var _rnItem = _rnSlice[_rni];
        if (!_rnItem || !(_rnItem.shizhengji || _rnItem.shilu)) continue;
        var _isLatest = (_rni === _rnSlice.length - 1);
        var _bud = _isLatest ? _rnBudget : Math.round(_rnBudget / 2);
        var _rnT = String(_rnItem.shizhengji || '').slice(0, _bud);
        if (_rnItem.shilu && _isLatest) _rnT += '\n〔实录〕' + String(_rnItem.shilu).slice(0, Math.round(_bud / 2));
        var _rnLbl = _isLatest ? '·上回合' : ('·前' + (_rnSlice.length - 1 - _rni) + '回合');
        _rnBlocks.push('〖T' + (_rnItem.turn || '?') + _rnLbl + '〗\n' + _rnT);
      }
      if (_rnBlocks.length) tp += '\n【近回合时政记·实录原文（本回合叙事须承接其中未决之事、延续情节线与人物动向，收束或推进已开之伏笔，不得凭空遗忘或前后矛盾）】\n' + _rnBlocks.join('\n') + '\n';
    }
  }
  return tp;
}
function longTxt(tag){ return tag + '回合的时政记叙事内容足够长以通过存储长度阈值检查确保无误。'; }

console.log('===== 存储·时政记/实录原文+摘要入 _recentNarrative =====');
var GM = { turn: 5 };
storeRecent(GM, '孙传庭出关剿贼，然粮饷不继，军心浮动，未决之忧甚重。', '实录：本月辽东告急。', '孙传庭出关，粮饷不继');
assert(GM._recentNarrative.length === 1 && GM._recentNarrative[0].turn === 5, '存入1条+回合');
assert(GM._recentNarrative[0].shizhengji.indexOf('孙传庭') >= 0 && GM._recentNarrative[0].shilu.indexOf('辽东告急') >= 0, '存时政记+实录全文');
assert(GM._recentNarrative[0].summary === '孙传庭出关，粮饷不继', 'szjSummary 优先作压缩摘要');

console.log('===== 存储·无 szjSummary→确定性提首末句作摘要 =====');
var GMs = { turn: 1 };
storeRecent(GMs, '开篇某事起。中间经过若干。结尾某局成，此局悬而未决。', '', '');
assert(GMs._recentNarrative[0].summary.indexOf('开篇某事起') >= 0 && GMs._recentNarrative[0].summary.indexOf('…') >= 0, '无AI摘要→首句…末句 (得 ' + GMs._recentNarrative[0].summary + ')');

console.log('===== ★存储·近6回合原文·超出折入压缩综述(每回合更新) =====');
var GM8 = { turn: 0 };
for (var _t = 1; _t <= 8; _t++) { GM8.turn = _t; storeRecent(GM8, longTxt('第' + _t), '', 'T' + _t + '摘要'); }
assert(GM8._recentNarrative.length === 6, '原文窗口留6回合 (得 ' + GM8._recentNarrative.length + ')');
assert(GM8._recentNarrative[0].turn === 3 && GM8._recentNarrative[5].turn === 8, '原文留最近6回合(T3-T8)');
assert(GM8._narrativeDigest.length === 2, '超出的T1-T2折入长线综述 (得 ' + GM8._narrativeDigest.length + ')');
assert(GM8._narrativeDigest[0].turn === 1 && GM8._narrativeDigest[0].summary === 'T1摘要', '综述含被挤出回合的压缩摘要');

console.log('===== 存储·长线综述封顶15回合 =====');
var GM22 = { turn: 0 };
for (var _t2 = 1; _t2 <= 22; _t2++) { GM22.turn = _t2; storeRecent(GM22, longTxt('第' + _t2), '', 'S' + _t2); }
assert(GM22._narrativeDigest.length === 15, '综述封顶15回合 (得 ' + GM22._narrativeDigest.length + ')');
assert(GM22._narrativeDigest[GM22._narrativeDigest.length - 1].turn === 16, '综述留最近的被挤出者(T16·因T17-22仍在6原文窗)');
assert(GM22._narrativeDigest[0].turn === 2, '综述最老=T2(封顶15挤掉T1)');

console.log('===== 存储·梗概长度上限稍扩至200 =====');
var GMlen = { turn: 1 };
storeRecent(GMlen, longTxt('长摘要'), '', 'A'.repeat(300));
assert(GMlen._recentNarrative[0].summary.length === 200, '超长 szjSummary 截至200 (得 ' + GMlen._recentNarrative[0].summary.length + ')');

console.log('===== 存储·过短叙事不入 =====');
var GM4 = { turn: 1 };
storeRecent(GM4, '', ''); storeRecent(GM4, '太短。', '');
assert(!GM4._recentNarrative || GM4._recentNarrative.length === 0, '空/过短不存');

console.log('===== ★注入·上回合原文 + 承接指令 =====');
var inj = injectRecent(GM, 2.0);
assert(inj.indexOf('近回合时政记') >= 0 && inj.indexOf('孙传庭出关剿贼') >= 0, '注入含上回合时政记原文');
assert(inj.indexOf('〔实录〕') >= 0 && inj.indexOf('辽东告急') >= 0, '注入含实录');
assert(inj.indexOf('承接其中未决之事') >= 0 && inj.indexOf('收束或推进已开之伏笔') >= 0, '有承接+收伏笔硬指令');
assert(inj.indexOf('〖T5·上回合〗') >= 0, '带 T5·上回合 标注');

console.log('===== ★注入·近3回合(最新全额+前1/前2回合)带标注排序 =====');
var GM3i = { turn: 0 };
GM3i.turn = 1; storeRecent(GM3i, '前2回合：伏笔初起，边报将至，此事悬而未决须承下文交代清楚。', '');
GM3i.turn = 2; storeRecent(GM3i, '前1回合：某臣密谋渐显，危机酝酿，朝局暗流涌动人心不安。', '');
GM3i.turn = 3; storeRecent(GM3i, '最新回合：密谋事发，边镇失守，牵动朝局，新的危局已然形成。', '');
var inj3 = injectRecent(GM3i, 2.0);
assert(inj3.indexOf('〖T3·上回合〗') >= 0 && inj3.indexOf('〖T2·前1回合〗') >= 0 && inj3.indexOf('〖T1·前2回合〗') >= 0, '三回合各带标注(T3上回合/T2前1/T1前2)');
assert(inj3.indexOf('密谋事发') >= 0 && inj3.indexOf('伏笔初起') >= 0, '三回合原文都在');
var _i3 = inj3.indexOf('〖T3'), _i2 = inj3.indexOf('〖T2'), _i1 = inj3.indexOf('〖T1');
assert(_i3 < _i2 && _i2 < _i1, '最新回合排最前(T3<T2<T1)');

console.log('===== ★注入·长线综述无缝衔接(digest + 超近3全文回合摘要·不留空档) =====');
var injDig = injectRecent(GM8, 2.0);
// GM8:存6回合[T3..T8]·digest[T1,T2]·全文注入近3[T6,T7,T8]·综述应连续覆盖 T1..T5(digest T1-T2 + 原文窗内超3全文的 T3-T5 摘要)
assert(injDig.indexOf('长线叙事综述') >= 0, '有综述块');
assert(injDig.indexOf('T1：T1摘要') >= 0 && injDig.indexOf('T2：T2摘要') >= 0, '综述含 digest 梗概(T1-T2)');
assert(injDig.indexOf('T4：T4摘要') >= 0 && injDig.indexOf('T5：T5摘要') >= 0, '★综述含"存原文但超近3全文"回合梗概(T4/T5·补 N-4~N-6 空档·紧接全文无缝)');
assert(injDig.indexOf('〖T8·上回合〗') >= 0 && injDig.indexOf('〖T6·前2回合〗') >= 0, '近3回合全文(T6-T8)');
assert(injDig.indexOf('〖T4') < 0 && injDig.indexOf('〖T5') < 0, 'T4/T5 只入综述不入全文(不双注入)');

console.log('===== 注入·近回合原文预算按上下文缩放 =====');
var GMbig = { turn: 1 }; storeRecent(GMbig, 'X'.repeat(2600), '');
var _xs = (injectRecent(GMbig, 0.2).match(/X/g) || []).length, _xb = (injectRecent(GMbig, 2.0).match(/X/g) || []).length;
assert(_xs === 700 && _xb === 2000, '小上下文700/大上下文2000 (得 ' + _xs + '/' + _xb + ')');

console.log('===== 注入·空→不注入 =====');
assert(injectRecent({ turn: 1 }, 1) === '', '无近叙事无综述→空注入');

console.log('');
console.log(`[smoke-recent-narrative] ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
