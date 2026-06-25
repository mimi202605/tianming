// tm-xinjun-observe.js — 新君观政·百日(新君即位之初的特殊期:百官观望试探·政令初行多阻·根基法理未固)
//   命门/代入:新君刚登大宝,百官未附、号令未孚、君恩未广。绍宋赵玖立国百日根基未固(openingText 已点)、
//             更兼得位经张邦昌让国、法理先天不足——这一段「站不稳」的张力是开局代入感的要害。
//   建模:此乃社会动态(观望/试探/政令阻力),最宜以「相位 + AI 推演 framing」表达——让 AI 世界据此演绎臣下的犹疑持重,
//        而非脆硬数值(本游戏诏令效力本就 AI 判定·"颁布≠见效")。相位=开局首 N 回合(GM.turn ≤ total)。
//   跨朝代:纯通用——任何即位/新立开局(天启崇祯即位亦然)开 xinjunObserveEnabled 即用。默认关·sc 设·绍宋开。
//   surface:御案时政注入 1 条 id=iss_xinjun 朝局status(无 choices·安全),期满自动移除。
(function (global) {
  'use strict';

  function _on(GM) { return !!(GM && GM._xinjunObserveEnabled); }

  function status(GM) {
    var total = (GM && GM._xinjunObserveTurns) || 6;
    var turn = (GM && GM.turn) || 1;
    return { active: turn <= total, turn: turn, total: total, turnsLeft: Math.max(0, total - turn + 1) };
  }

  // 喂主推演:告知 AI 世界正当新君观政之初·臣下当现观望试探之态(政令阻力、未肯尽节)
  function aiContextLine(GM) {
    if (!GM || !_on(GM)) return '';
    var st = status(GM); if (!st.active) return '';
    return '【新君观政】君上新立(观政之初·第' + st.turn + '/' + st.total + '回合)：百官未附，多持观望试探之心；'
      + '政令初行，阻力倍于常时，颁布未必即见效；君恩未广、威权未立、法理待固；潜邸旧人可恃，而新附之臣向背未定。'
      + '臣下应对君命，当现此犹疑持重、观望待时之态(非公然抗命，乃未肯遽然尽节)。\n';
  }

  function _sync(GM) {
    if (!Array.isArray(GM.currentIssues)) GM.currentIssues = [];
    var idx = -1;
    for (var i = 0; i < GM.currentIssues.length; i++) { if (GM.currentIssues[i] && GM.currentIssues[i].id === 'iss_xinjun') { idx = i; break; } }
    var st = status(GM);
    if (!st.active) { if (idx >= 0) GM.currentIssues.splice(idx, 1); return; }  // 观政期满→移除
    var desc = '你新登大宝，正当观政之初(第' + st.turn + '/' + st.total + ' 回合·尚余 ' + st.turnsLeft + ' 回合)。\n\n'
      + '· 百官观望——新附之臣未知君心，多持试探之态，未肯遽然尽节；\n'
      + '· 政令初行——号令未孚，推行阻力倍于常时，颁布未必即见效；\n'
      + '· 根基未固——君恩未广、威权未立、法理待固；\n'
      + '· 潜邸旧人可恃，新附之臣向背未定。\n\n'
      + '待观政期满，威权渐固、号令渐行。其间宜示之以明断、结之以恩信，徐收百官之心。';
    var issue = { id: 'iss_xinjun', title: '新君观政 · 百日根基', description: desc, category: '朝局', status: 'pending', raisedTurn: GM.turn || 1, _xinjun: true, _info: true };
    if (idx >= 0) GM.currentIssues[idx] = issue; else GM.currentIssues.unshift(issue);
  }

  function build(GM) { if (!GM || !_on(GM)) return; _sync(GM); }
  function refresh(GM) { if (!GM || !_on(GM)) return; _sync(GM); }

  global.TMXinjun = { on: _on, status: status, build: build, refresh: refresh, aiContextLine: aiContextLine };
})(typeof window !== 'undefined' ? window : globalThis);
