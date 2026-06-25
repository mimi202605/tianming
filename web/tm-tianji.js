// tm-tianji.js — 史实「天机」·改命(穿越者/上帝视角剧本:预知正史走向 + 改命追踪)
//   命门:operationalize《绍宋》的核心——赵玖身负后世记忆、明知正史(苗刘之变/二圣命运/岳飞之祸)偏要逆天改命。
//   机制:开局把「未来的刚性史事(rigidHistoryEvents·按 triggerTurn)」化为玩家可见的「天机」(预知),
//         每回合判定每件史事是「重演(happened·已触发)」还是「改命(averted·过了该回合却未触发)」,
//         并把「君上有后世记忆、力图改命」喂入主推演——让 AI 世界对玩家的逆天之举给出可信回应。
//   跨朝代:纯通用——任何史实剧本(有 rigidHistoryEvents)只需开 tianjiEnabled 即用;
//           默认关(GM._tianjiEnabled 由 doActualStart 从 sc.tianjiEnabled 设)。非穿越剧本(如天启崇祯)不开,
//           则玩家无上帝视角、行为如常。绍宋(赵玖穿越)开。
//   surface:复用「御案时政 currentIssues」——注入 1 条 id=iss_tianji 的信息条目(无 choices·渲染器对 choices 有守卫·安全),
//           随改命进度每回合刷新。不泛滥(只 1 条)。
(function (global) {
  'use strict';

  function _on(GM) { return !!(GM && GM._tianjiEnabled); }

  // 开局:从 GM.rigidHistoryEvents 建天机录(未来史事·按回合排序)
  function build(GM) {
    if (!GM || !_on(GM)) return;
    var rs = (GM.rigidHistoryEvents || []).filter(function (e) {
      return e && typeof e.triggerTurn === 'number' && e.triggerTurn >= (GM.turn || 1);
    });
    rs.sort(function (a, b) { return (a.triggerTurn || 0) - (b.triggerTurn || 0); });
    GM._tianji = rs.map(function (e) {
      return {
        id: e.id, turn: e.triggerTurn,
        name: e.name || e.title || '(史事)',
        narrative: String(e.narrative || e.description || '').slice(0, 160),
        status: 'pending'   // pending → happened(重演) / averted(改命)
      };
    });
    if (!GM._gaiming) GM._gaiming = { averted: [], happened: [] };
    _sync(GM);
  }

  // 每回合:判定过了触发回合的史事是重演还是改命
  function update(GM) {
    if (!GM || !_on(GM) || !Array.isArray(GM._tianji)) return;
    var trig = GM.triggeredHistoryEvents || {};
    if (!GM._gaiming) GM._gaiming = { averted: [], happened: [] };
    var cur = GM.turn || 1;
    GM._tianji.forEach(function (t) {
      if (t.status !== 'pending') return;
      if (trig[t.id]) {
        t.status = 'happened';
        if (GM._gaiming.happened.indexOf(t.id) < 0) GM._gaiming.happened.push(t.id);
      } else if (cur > t.turn) {
        t.status = 'averted';   // 过了正史该发生的回合却未触发 = 改命
        if (GM._gaiming.averted.indexOf(t.id) < 0) GM._gaiming.averted.push(t.id);
      }
    });
    _sync(GM);
  }

  // 复用御案时政:刷新/注入唯一的「天机」信息条目
  function _sync(GM) {
    if (!Array.isArray(GM._tianji)) return;
    if (!Array.isArray(GM.currentIssues)) GM.currentIssues = [];
    var pend = GM._tianji.filter(function (t) { return t.status === 'pending'; });
    var av = (GM._gaiming && GM._gaiming.averted) || [];
    var hp = (GM._gaiming && GM._gaiming.happened) || [];
    function nm(id) { var t = GM._tianji.find(function (x) { return x.id === id; }); return t ? t.name : id; }
    var lines = pend.slice(0, 10).map(function (t) { return '· 约第 ' + t.turn + ' 回合 — ' + t.name; });
    var desc = '你身负后世记忆，正史走向了然于胸——然史册可改，命数在人。\n\n【正史将至】\n'
      + (lines.length ? lines.join('\n') : '(暂无可预见之未来史事)')
      + (av.length ? '\n\n【已改命 · ' + av.length + '】正史未得重演：' + av.map(nm).join('、') : '')
      + (hp.length ? '\n\n【已重演 · ' + hp.length + '】终未能改：' + hp.map(nm).join('、') : '');
    var issue = {
      id: 'iss_tianji', title: '天机 · 正史走向(可改写)', description: desc,
      category: '天机', status: 'pending', raisedTurn: GM.turn || 1, _tianji: true, _info: true
    };
    var idx = -1;
    for (var i = 0; i < GM.currentIssues.length; i++) {
      if (GM.currentIssues[i] && GM.currentIssues[i].id === 'iss_tianji') { idx = i; break; }
    }
    if (idx >= 0) GM.currentIssues[idx] = issue; else GM.currentIssues.unshift(issue);
  }

  // 喂主推演:让 AI 世界知晓君上有后世记忆、力图改命(其决策每每逆常理而合后见之明)
  function aiContextLine(GM) {
    if (!GM || !_on(GM) || !Array.isArray(GM._tianji)) return '';
    var pend = GM._tianji.filter(function (t) { return t.status === 'pending'; }).slice(0, 6);
    var av = (GM._gaiming && GM._gaiming.averted) || [];
    if (!pend.length && !av.length) return '';
    var s = '【天机·改命】君上身负后世记忆(穿越者)，预知正史走向并力图改写——其决断每每逆常理而暗合后见之明，臣下虽不解其故，事后常验其先识。\n';
    if (pend.length) s += '  正史本将：' + pend.map(function (t) { return '约第' + t.turn + '回合 ' + t.name; }).join('；') + '\n';
    if (av.length) s += '  已改命：' + av.length + ' 件(正史未得重演)\n';
    return s;
  }

  global.TMTianji = { on: _on, build: build, update: update, aiContextLine: aiContextLine };
})(typeof window !== 'undefined' ? window : globalThis);
