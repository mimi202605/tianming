/* tm-office-dutystate.js — 官制活化 Slice② 履职度(duty state) tick + 对称域效果
 *
 * 用途：每回合更新每个主官/掌权官职的履职度 _dutyState，并算出"失职扣/称职奖"的域效果(delta)。
 * 状态：PoC·纯函数(返回 delta·不调 FE)·未接线。挂 FiscalEngine/接 endturn 管线/UI 是下一子步。
 * 设计依据：docs/officialdom-activation-design.md §3 Slice② + owner 力度裁示(2026-06-20·对称档)。
 *
 * 政策(§9)：引擎管数(履职度分值)，AI 管料(backlog 内容·此 PoC 暂不含 backlog)。
 * 力度(owner·对称档·均为每回合·持续累积·夹既有引擎量纲)：
 *   出缺/履职<35：掌 taxCollect → compliance -0.025；掌 supervise|impeach → corruption +2.5
 *   履职>70(称职)：掌 taxCollect → compliance +0.01；掌 supervise|impeach → corruption -1
 *   35~70：无（中性·新官起步 fulfillment=50 即此带·先不奖不罚）
 * 跨朝代：按抽象 power 映射杠杆(taxCollect→实征率·supervise/impeach→腐败)，不认官署专名。
 * v1 域覆盖：仅 taxCollect/supervise/impeach 两类已接杠杆；military/personnel/justice/works 待接杠杆再扩。
 */
(function (global) {
  'use strict';

  var POWER_KEYS = ['taxCollect', 'militaryCommand', 'appointment', 'impeach', 'supervise', 'yinBu', 'judicial', 'works', 'drafting'];
  var DOMAIN_ATTR = { militaryCommand: 'military', works: 'management', drafting: 'intelligence' }; // 其余默认 administration

  // owner 裁示·对称档（可调）
  var DEFAULT_FORCE = {
    vacancyDecay: 12,   // 出缺·履职度每回合衰减
    driftRate: 0.3,     // 在任·履职度漂向"承载力"的速率
    lowBand: 35, highBand: 70,
    compLow: 0.025, compHigh: 0.01,  // 实征率：失职扣 / 称职奖
    corrLow: 2.5, corrHigh: 1        // 腐败：失职涨 / 称职降
  };

  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _fn(name) { return (typeof global[name] === 'function') ? global[name] : null; }
  function _holderChar(GM, p) {
    if (!p || !p.holder) return null;
    var find = _fn('findCharByName');
    if (find) return find(p.holder);
    return (GM.chars || []).find(function (c) { return c && c.name === p.holder; }) || null;
  }
  function _powersOf(p) {
    var out = [], pw = p && p.powers;
    if (pw) POWER_KEYS.forEach(function (k) { if (pw[k]) out.push(k); });
    return out;
  }
  function _rankLvl(p) { var g = _fn('getRankLevel'); return g ? g(p.rank) : 99; }
  function _isHead(p) {
    if (_rankLvl(p) <= 6) return true;
    return /尚书|侍郎|都御史|大学士|卿$|总督|巡抚|首辅|长官|令$|尹$|使$/.test(p.name || '');
  }
  function _walk(nodes, visit) {
    (nodes || []).forEach(function (n) {
      (n.positions || []).forEach(function (p) { visit(p, n.name || ''); });
      if (n.subs && n.subs.length) _walk(n.subs, visit);
    });
  }

  // 在任者对该职位的"承载力"(0-100)：域才0.6+忠0.4（同舆图料理估计口径）
  function _capacity(ch, pwKeys) {
    var domainKey = DOMAIN_ATTR[pwKeys[0]] || 'administration';
    var dv = (ch[domainKey] != null) ? ch[domainKey] : 50;
    var lv = (ch.loyalty != null) ? ch.loyalty : 50;
    return dv * 0.6 + lv * 0.4;
  }

  /**
   * 每回合 tick：更新各主官/掌权官职 _dutyState，返回本回合应施加的对称域效果。
   * @param {object} GM 需 GM.officeTree / GM.chars / GM.turn
   * @param {object} [opts] { force?:object 覆盖力度 }
   * @returns {{compliance:number, corruption:number, details:Array}} 聚合 delta（caller 调 FE 施加）
   */
  function tickOfficeDutyState(GM, opts) {
    opts = opts || {};
    var F = opts.force || DEFAULT_FORCE;
    var agg = { compliance: 0, corruption: 0, details: [] };
    if (!GM || !GM.officeTree || !GM.officeTree.length) return agg;
    var turn = (GM.turn != null) ? GM.turn : 0;

    _walk(GM.officeTree, function (p, deptName) {
      var pwKeys = _powersOf(p);
      if (!pwKeys.length && !_isHead(p)) return;     // 同舆图过滤：只主官/掌权
      var ds = p._dutyState || (p._dutyState = { fulfillment: 50, trend: 'stable', lastTurn: null });
      if (ds.lastTurn === turn) return;              // 本回合已 tick·防重复施加

      var ch = _holderChar(GM, p);
      var prev = (typeof ds.fulfillment === 'number') ? ds.fulfillment : 50;
      var delta;
      if (!ch) {
        delta = -F.vacancyDecay;                     // 出缺·快衰
      } else {
        delta = (_capacity(ch, pwKeys) - prev) * F.driftRate;  // 在任·漂向承载力
      }
      var next = _clamp(prev + delta, 0, 100);
      ds.fulfillment = next;
      ds.trend = next > prev + 0.5 ? 'rising' : next < prev - 0.5 ? 'falling' : 'stable';
      ds.lastTurn = turn;

      // 域效果（带 × power·仅 v1 已接杠杆）
      var band = next < F.lowBand ? 'low' : next > F.highBand ? 'high' : 'mid';
      if (band === 'mid') return;
      var did = {};   // 每杠杆每官最多记一次（防 supervise+impeach 同署双扣腐败）
      pwKeys.forEach(function (k) {
        if (k === 'taxCollect' && !did.compliance) {
          did.compliance = 1;
          var d = band === 'low' ? -F.compLow : F.compHigh;
          agg.compliance += d;
          agg.details.push({ dept: deptName, pos: p.name || '', lever: 'compliance', delta: d, fulfillment: Math.round(next), band: band });
        } else if ((k === 'supervise' || k === 'impeach') && !did.corruption) {
          did.corruption = 1;
          var c = band === 'low' ? F.corrLow : -F.corrHigh;
          agg.corruption += c;
          agg.details.push({ dept: deptName, pos: p.name || '', lever: 'corruption', delta: c, fulfillment: Math.round(next), band: band });
        }
      });
    });
    return agg;
  }

  global.tickOfficeDutyState = tickOfficeDutyState;
  if (typeof module !== 'undefined' && module.exports) module.exports = { tickOfficeDutyState: tickOfficeDutyState, DEFAULT_FORCE: DEFAULT_FORCE };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
