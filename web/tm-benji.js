// @ts-check
// tm-benji.js — 帝王本纪·终局回顾式修史（鼎革R1g·2026-07-07·owner 提案+时序裁定）
//
// 「玩家死或亡国都走太史公——让 AI 详细看他的整局活动和时政记实录等内容，一部分一部分
//   生成玩家的本纪，严格按本纪、实录文言文撰写。」时序=终局时刻回顾式修史（非过程增量·
//   实录本就是皇帝死后按起居注修纂的）：在位 N 回合按每 12 回合一卷（≈一年一卷·按年编次）
//   串行分段调用，段间以前卷末 ~200 字衔接，末卷并入死亡/亡国之事与「赞曰」论赞。
//
// 素材（史料保全已审：起居注/史记实录全程无 cap·编年>50 清过期条→缺段如实短卷）：
//   起居注 GM.qijuHistory + 实录/时政记 GM.shijiHistory(shilu/shizhengji) + 编年 GM.biannianItems。
// 成品：GM._benji（随终局档）+ 战绩侧 tm_playHistory（主菜单「历代亲历」可重读历局本纪）。
// flag benjiEnabled 默认关+设置开关；无 key 诚实不修（不生成占位文）。
(function (global) {
  'use strict';

  var SEG_TURNS = 12;   // 一卷跨度（≈一年·owner 裁定·6 回合太短已弃）
  var CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

  function _gm() { return global.GM; }
  function _p() { return (typeof global.P !== 'undefined') ? global.P : null; }
  function enabled(P) { return !!(P && P.conf && P.conf.benjiEnabled === true); }
  function _ts(turn) { try { return (typeof global.getTSText === 'function') ? global.getTSText(turn) : ('第' + turn + '回合'); } catch (_) { return '第' + turn + '回合'; } }

  // ── 段落素材组装（fromTurn..toTurn 窗·摘要化控输入量）──
  function collectWindow(GM, fromTurn, toTurn) {
    var parts = [];
    try {
      (GM.qijuHistory || []).filter(function (r) { return r && r.turn >= fromTurn && r.turn <= toTurn; })
        .slice(0, 36).forEach(function (r) {
          var t = String(r.content || r.text || '').slice(0, 90);
          if (t) parts.push('起居注·第' + r.turn + '回：' + t);
        });
    } catch (_) {}
    try {
      (GM.shijiHistory || []).filter(function (s) { return s && s.turn >= fromTurn && s.turn <= toTurn; })
        .forEach(function (s) {
          var t = String(s.shilu || s.shiluText || s.shizhengji || s.szjSummary || '').slice(0, 200);
          if (t) parts.push('实录·第' + s.turn + '回：' + t);
        });
    } catch (_) {}
    try {
      (GM.biannianItems || []).filter(function (b) { var t0 = Number(b && (b.startTurn != null ? b.startTurn : b.turn)) || 0; return b && t0 >= fromTurn && t0 <= toTurn; })
        .slice(0, 10).forEach(function (b) {
          var t = String(b.title || b.narrative || b.text || '').slice(0, 60);
          if (t) parts.push('编年：' + t);
        });
    } catch (_) {}
    return parts;
  }

  function buildPrompt(GM, seg) {
    var pName = seg.playerName || '上';
    var s = '你是史馆修纂官。据下列史料，为' + pName + '修撰本纪之一卷。\n';
    s += '【体例·严格遵行】仿正史本纪/实录体：文言文；编年直书，按时序纪事，纪年纪月（如「' + _ts(seg.fromTurn) + '春正月」式）；';
    s += '称传主为「上」；据史料直书，不虚构史料所无之人事，人名只用史料中出现者；不作议论评赞';
    s += (seg.isLast ? '——唯本卷为末卷，卷末以「赞曰」起段作一段总评（80字内）。' : '。');
    s += '全卷 300-600 字。直接返回正文，不要标题、不要 JSON、不要现代语。\n';
    s += '【本卷范围】' + _ts(seg.fromTurn) + ' 至 ' + _ts(seg.toTurn) + '（在位第' + seg.fromTurn + '至' + seg.toTurn + '回合）\n';
    if (seg.prevTail) s += '【前卷之末（承接续书·勿复述）】…' + seg.prevTail + '\n';
    if (seg.isLast && seg.deathLine) s += '【末卷须并书】' + seg.deathLine + '\n';
    var mat = seg.material || [];
    if (mat.length) s += '【史料】\n' + mat.join('\n') + '\n';
    else s += '【史料】此段史料散佚无存——如实短卷：仅按范围纪年，书「史阙有间」之意，勿虚构。\n';
    // 时空约束·本纪终局修史·clauseOnly裁剪版(本纪已「人名只用史料中出现者」强局部锚·full大名单反诱其引入册外人;此处补卒年铁律/不越终局引后事/本局以GM为准)（typeof守卫防加载序）
    if (typeof global._buildTemporalConstraint === 'function') { try { s += '\n' + global._buildTemporalConstraint(null, { clauseOnly: true }); } catch (_) {} }
    return s;
  }

  /**
   * 终局回顾式修纂（串行分段·逐卷回调）。
   * opts: { deathLine, playerName, onSection(idx,total,text), P }
   * @returns {Promise<{ok:boolean, reason?:string, sections?:number}>}
   */
  function compose(GM, opts) {
    opts = opts || {};
    GM = GM || _gm();
    var Pref = opts.P || _p() || {};
    if (!enabled(Pref)) return Promise.resolve({ ok: false, reason: 'disabled' });
    if (!(Pref.ai && Pref.ai.key) || typeof global.callAISmart !== 'function') return Promise.resolve({ ok: false, reason: 'no_ai' });
    if (!GM) return Promise.resolve({ ok: false, reason: 'no_gm' });
    var totalTurns = Math.max(1, Number(GM.turn) || 1);
    var segCount = Math.ceil(totalTurns / SEG_TURNS);
    GM._benji = { sections: [], composedTurn: 0, playerName: opts.playerName || '' }; // arch-ok: 本纪成品子树·本模块唯一写主(R1g)
    var chain = Promise.resolve();
    var _mkSeg = function (idx) {
      return function () {
        var fromTurn = idx * SEG_TURNS + 1;
        var toTurn = Math.min(totalTurns, (idx + 1) * SEG_TURNS);
        var isLast = (idx === segCount - 1);
        var prevSec = GM._benji.sections[idx - 1];
        var seg = {
          idx: idx, fromTurn: fromTurn, toTurn: toTurn, isLast: isLast,
          material: collectWindow(GM, fromTurn, toTurn),
          prevTail: prevSec ? String(prevSec.text || '').slice(-200) : '',
          deathLine: opts.deathLine || '',
          playerName: opts.playerName || ''
        };
        return global.callAISmart(buildPrompt(GM, seg), 3000).then(function (txt) {
          var clean = String(txt || '').trim();
          GM._benji.sections.push({ fromTurn: fromTurn, toTurn: toTurn, text: clean, isLast: isLast });
          if (typeof opts.onSection === 'function') { try { opts.onSection(idx, segCount, clean); } catch (_) {} }
        });
      };
    };
    for (var i = 0; i < segCount; i++) chain = chain.then(_mkSeg(i));
    return chain.then(function () {
      GM._benji.composedTurn = GM.turn || 0;
      try { attachToPlayHistory(GM); } catch (_) {}
      return { ok: true, sections: GM._benji.sections.length };
    }).catch(function (e) {
      // 中途断卷：已成之卷保留（诚实半卷·可重触发续修）
      return { ok: false, reason: 'ai_error', error: (e && e.message) || String(e), sections: (GM._benji.sections || []).length };
    });
  }

  function fullText(GM) {
    GM = GM || _gm();
    var b = GM && GM._benji;
    if (!b || !Array.isArray(b.sections) || !b.sections.length) return '';
    return b.sections.map(function (s, i) {
      return '【卷' + (CN_NUM[i] || (i + 1)) + '·起' + _ts(s.fromTurn) + ' 讫' + _ts(s.toTurn) + '】\n' + (s.text || '');
    }).join('\n\n');
  }

  // 战绩侧留存（A1 tm_playHistory·主菜单「历代亲历」重读历局本纪）——匹配本局 sid+回合的最近一条
  function attachToPlayHistory(GM) {
    if (typeof global.localStorage === 'undefined' || !global.localStorage) return;
    var txt = fullText(GM);
    if (!txt || txt.length > 100000) return;
    var raw = global.localStorage.getItem('tm_playHistory');
    var arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return;
    for (var i = 0; i < arr.length; i++) {
      var rec = arr[i];
      if (rec && rec.sid === GM.sid && rec.turns === GM.turn) { rec.benji = txt; break; }
    }
    global.localStorage.setItem('tm_playHistory', JSON.stringify(arr));
  }

  // 终局富屏集成：#_endgame 内追加「本纪」区·逐卷上屏（史馆修纂进度感·先显既有太史公不空等）
  function composeForEndgame(GM, ctx) {
    GM = GM || _gm();
    ctx = ctx || {};
    var Pref = _p() || {};
    if (!enabled(Pref) || !(Pref.ai && Pref.ai.key)) return;
    if (typeof global.document === 'undefined') return;
    var host = global.document.querySelector('#_endgame > div');
    if (!host) return;
    var pName = (Pref.playerInfo && Pref.playerInfo.characterName) || '大行皇帝';
    var box = global.document.createElement('div');
    box.id = '_benji_scroll';
    box.innerHTML = '<hr style="border:none;height:1px;background:var(--color-border-subtle);margin:1.2rem 0;">'
      + '<div style="text-align:center;font-size:0.95rem;color:var(--gold-400);letter-spacing:0.25em;margin-bottom:0.4rem;">' + (typeof global.escHtml === 'function' ? global.escHtml(pName) : pName) + ' 本 纪</div>'
      + '<div id="_benji_status" style="text-align:center;font-size:0.72rem;color:var(--color-foreground-muted);margin-bottom:0.6rem;">史馆修纂中……</div>'
      + '<div id="_benji_body" style="font-size:0.82rem;line-height:1.9;color:var(--txt-s);"></div>';
    host.appendChild(box);
    var deathLine = '';
    if (ctx.failGoal) deathLine = String(ctx.failGoal.title || '') + '。' + String(ctx.failGoal.description || '');
    compose(GM, {
      deathLine: deathLine,
      playerName: pName,
      onSection: function (idx, total, text) {
        var body = global.document.getElementById('_benji_body');
        var st = global.document.getElementById('_benji_status');
        if (st) st.textContent = '史馆修纂中……第' + (idx + 1) + '/' + total + '卷成';
        if (body) {
          var sec = GM._benji.sections[idx] || {};
          var esc = (typeof global.escHtml === 'function') ? global.escHtml : function (x) { return String(x); };
          body.innerHTML += '<div style="margin-bottom:0.9rem;"><div style="color:var(--gold-400);font-size:0.76rem;margin-bottom:0.2rem;">卷' + (CN_NUM[idx] || (idx + 1)) + ' · 起' + esc(_ts(sec.fromTurn || 1)) + ' 讫' + esc(_ts(sec.toTurn || 1)) + '</div><div style="white-space:pre-wrap;">' + esc(text) + '</div></div>';
        }
      }
    }).then(function (r) {
      var st = global.document.getElementById('_benji_status');
      if (!st) return;
      if (r && r.ok) st.textContent = '本纪修讫 · 凡' + r.sections + '卷（已存入历代亲历）';
      else if (r && r.reason === 'ai_error') st.textContent = '史馆搁笔（' + (r.sections || 0) + '卷已成·余卷因故未竟）';
    });
  }

  var api = { compose: compose, composeForEndgame: composeForEndgame, fullText: fullText, collectWindow: collectWindow, buildPrompt: buildPrompt, enabled: enabled, SEG_TURNS: SEG_TURNS };
  if (typeof global.TM === 'undefined') global.TM = {};
  global.TM.Benji = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
