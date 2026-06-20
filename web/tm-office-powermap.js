/* tm-office-powermap.js — 官制活化 Slice① 职权舆图(office power map)
 *
 * 用途：把"谁掌什么权·才忠·出缺·料理/履职"压缩成喂给推演/势力决策的紧凑文本。
 * 状态：接线进 tm-endturn-prompt.js（开关 officePowerPerceptionEnabled·默认关·零回归）。
 * 设计依据：docs/officialdom-activation-design.md §3 Slice① + §10.1「怎么喂」四层过滤。
 *
 * 核实过的事实（grep/Read 自证）：
 *   · 人物八才键名 tm-char-full-schema.js:52-59：intelligence(智)/valor(勇)/military(军)/administration(政)
 *     /management(管)/charisma(魅)/diplomacy(交)/benevolence(仁)；心性 loyalty(忠)。integrity(廉) 无 → 待接 corruption。
 *   · 出缺=!p.holder；holder→人 findCharByName(p.holder)；品级 getRankLevel(p.rank) 越小越高(<=6 判高官)。
 *   · relevanceText 料：endturn 作用域 edicts.* 圣旨原文 + 危机信号（在 tm-endturn-prompt.js 接入）。
 * 格式约定：
 *   · 才显示：域才始终显 + 其余≥40 的最高几项(上限3) + 忠（低才滤噪音·但域才即便低也显=才不配位信号）。
 *   · 逐权标档：多权同档→合并 权[征税|辟署]·决策；单权/异档→逐标 权[刑狱·决策][监察·纠察]。
 *   · 履职占位：_dutyState(Slice②真值)有则「履职NN」；在任无则「料理(即时估计)」明示非真履职度。
 */
(function (global) {
  'use strict';

  var POWER_LABEL = {
    taxCollect: '征税', militaryCommand: '调兵', appointment: '辟署',
    impeach: '弹劾', supervise: '监察', yinBu: '荐荫',
    judicial: '刑狱', works: '营造', drafting: '票拟'   // §9 裁示「首发扩」的新域（剧本未必已 author）
  };
  var POWER_DEFAULT_AUTH = {
    taxCollect: 'decision', militaryCommand: 'decision', appointment: 'decision',
    impeach: 'supervision', supervise: 'supervision', yinBu: 'decision',
    judicial: 'decision', works: 'execution', drafting: 'decision'
  };
  var AUTH_LABEL = { decision: '决策', execution: '执行', advisory: '咨询', supervision: '纠察' };
  var DOMAIN_ATTR = {
    militaryCommand: 'military', works: 'management', drafting: 'intelligence'
    // 其余默认 administration（吏治政务为主）
  };
  var ATTR_LABEL = { intelligence: '智', valor: '勇', military: '军', administration: '政', management: '管', charisma: '魅', diplomacy: '交', benevolence: '仁' };
  var EIGHT_TALENTS = ['intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence'];
  var TALENT_FLOOR = 40;   // 才显示阈值（域才豁免）

  function _fn(name) { return (typeof global[name] === 'function') ? global[name] : null; }
  function _holderChar(GM, p) {
    if (!p || !p.holder) return null;
    var find = _fn('findCharByName');
    if (find) return find(p.holder);
    return (GM.chars || []).find(function (c) { return c && c.name === p.holder; }) || null;
  }
  function _powersOf(p) {
    var out = [], pw = p && p.powers;
    if (pw) Object.keys(POWER_LABEL).forEach(function (k) { if (pw[k]) out.push(k); });
    return out;
  }
  function _rankLvl(p) { var g = _fn('getRankLevel'); return g ? g(p.rank) : 99; }
  function _isHead(p) {
    if (_rankLvl(p) <= 6) return true;
    return /尚书|侍郎|都御史|大学士|卿$|总督|巡抚|首辅|长官|令$|尹$|使$/.test(p.name || '');
  }

  // ①多显才：域才始终显 + 其余≥floor 最高项(上限 max)，各带 label
  function _topTalents(ch, domainKey, max, floor) {
    floor = floor || 0;
    var picked = [];
    if (domainKey && ch[domainKey] != null) picked.push(domainKey);
    EIGHT_TALENTS.filter(function (k) { return k !== domainKey && ch[k] != null && ch[k] >= floor; })
      .sort(function (a, b) { return ch[b] - ch[a]; })
      .forEach(function (k) { if (picked.length < max) picked.push(k); });
    return picked.map(function (k) { return (ATTR_LABEL[k] || '才') + ch[k]; }).join(' ');
  }
  function _authFor(powerKey, posAuthority) {
    if (posAuthority) return AUTH_LABEL[posAuthority] || posAuthority;
    return AUTH_LABEL[POWER_DEFAULT_AUTH[powerKey]] || '';
  }
  // ③逐权标档：多权同档→合并；单权/异档→逐标
  function _fmtPowers(pwKeys, posAuthority) {
    if (!pwKeys.length) return '';
    var pairs = pwKeys.map(function (k) { return { label: POWER_LABEL[k], auth: _authFor(k, posAuthority) }; });
    if (pairs.length >= 2) {
      var authSet = {};
      pairs.forEach(function (pr) { authSet[pr.auth] = 1; });
      if (Object.keys(authSet).length === 1) {
        var a = pairs[0].auth;
        return '权[' + pairs.map(function (pr) { return pr.label; }).join('|') + ']' + (a ? '·' + a : '');
      }
    }
    return '权' + pairs.map(function (pr) { return '[' + pr.label + (pr.auth ? '·' + pr.auth : '') + ']'; }).join('');
  }

  // 单官一行：· 兵部·尚书 王某(军45 政40 忠88) 权[调兵·执行] 履职71
  function _fmtPos(GM, deptName, p) {
    var ch = _holderChar(GM, p), pwKeys = _powersOf(p);
    var domainKey = DOMAIN_ATTR[pwKeys[0]] || 'administration';
    var who, duty = '';
    if (!ch) {
      who = '出缺';
    } else {
      var zhong = (ch.loyalty != null) ? (' 忠' + ch.loyalty) : '';
      who = (ch.name || '') + '(' + _topTalents(ch, domainKey, 3, TALENT_FLOOR) + zhong + ')';
      var ds = p._dutyState;
      if (ds && typeof ds.fulfillment === 'number') {
        duty = (ds.fulfillment < 35 ? '失职' : '履职') + ds.fulfillment + (ds.trend === 'falling' ? '↓' : ds.trend === 'rising' ? '↑' : '');
      } else {
        var dv = (ch[domainKey] != null) ? ch[domainKey] : 50;
        var lv = (ch.loyalty != null) ? ch.loyalty : 50;
        var est = dv * 0.6 + lv * 0.4;
        duty = '料理' + (est >= 70 ? '称职' : est >= 45 ? '勉强' : '堪虞');
      }
    }
    var pwStr = _fmtPowers(pwKeys, p.authority);
    return ('· ' + deptName + '·' + (p.name || '') + ' ' + who + (pwStr ? ' ' + pwStr : '') + (duty ? ' ' + duty : '')).replace(/\s+$/, '');
  }

  function _score(p, pwKeys) {
    var s = pwKeys.length * 2;
    if (!p.holder) s += 5;
    if (p._dutyState && p._dutyState.fulfillment < 35) s += 4;
    if (_rankLvl(p) <= 3) s += 3;
    return s;
  }

  function _walk(nodes, topName, visit) {
    (nodes || []).forEach(function (n) {
      var top = topName || n.name;
      (n.positions || []).forEach(function (p) { visit(p, n.name || top, top); });
      if (n.subs && n.subs.length) _walk(n.subs, top, visit);
    });
  }

  /**
   * 生成职权舆图字符串（已封顶·不随官数线性涨）。
   * @param {object} GM 需 GM.officeTree / GM.chars
   * @param {object} [opts] { cap?:number=12, relevanceText?:string 本回合诏令/危机原文（含其字眼的官署上浮） }
   */
  function buildOfficePowerMap(GM, opts) {
    opts = opts || {};
    var cap = opts.cap || 12;
    var relText = (opts.relevanceText || '') + '';
    if (!GM || !GM.officeTree || !GM.officeTree.length) return '';

    var byTop = {}, topOrder = [];
    _walk(GM.officeTree, '', function (p, deptName, topName) {
      var b = byTop[topName];
      if (!b) { b = byTop[topName] = []; topOrder.push(topName); }
      b.push({ p: p, deptName: deptName });
    });

    var overview = topOrder.map(function (n) {
      var list = byTop[n], vac = 0, head = null, headLvl = 9999;
      list.forEach(function (it) {
        if (!it.p.holder) vac++;
        var lvl = _rankLvl(it.p);
        if (lvl < headLvl) { headLvl = lvl; head = it.p; }
      });
      var st = vac === 0 ? '健全' : (head && !head.holder ? '瘫(主官缺)' : '弱(' + vac + '缺)');
      return n + '·' + st;
    }).join(' ┊ ');

    var rows = [];
    topOrder.forEach(function (n) {
      byTop[n].forEach(function (it) {
        var pwKeys = _powersOf(it.p);
        if (!pwKeys.length && !_isHead(it.p)) return;
        var sc = _score(it.p, pwKeys);
        if (relText) {
          var hit = (it.deptName && relText.indexOf(it.deptName) >= 0)
            || (it.p.name && it.p.name.length >= 2 && relText.indexOf(it.p.name) >= 0)
            || pwKeys.some(function (k) { return relText.indexOf(POWER_LABEL[k]) >= 0; });
          if (hit) sc += 8;
        }
        rows.push({ text: _fmtPos(GM, it.deptName, it.p), score: sc });
      });
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    var detail = rows.slice(0, cap).map(function (r) { return r.text; }).join('\n');
    var more = rows.length > cap ? ('\n（另 ' + (rows.length - cap) + ' 掌权要职未列·可按需取数）') : '';

    return '【职权舆图】(才/忠百分制)\n〔衙门概览〕' + overview + '\n〔掌权要职〕\n' + detail + more;
  }

  global.buildOfficePowerMap = buildOfficePowerMap;
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildOfficePowerMap: buildOfficePowerMap };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
