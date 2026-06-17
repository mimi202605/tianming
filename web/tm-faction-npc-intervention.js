// @ts-check
/// <reference path="types.d.ts" />
/*
 * tm-faction-npc-intervention.js — Player 干预 NPC 内政 (Phase F2·2026-05-10)
 *
 * 4 类干预动作·player 在 NPC 势力"查阅·内政"面板里点按钮·消耗资源·影响 NPC 数据。
 *
 *   bribe (暗结)       — 收买某 NPC char·loyalty 大降·若超阈值翻面 (faction → player)
 *                        cost: 5 万两·影响: target.loyalty -25·若 < 30 标 _bribed
 *   sponsorRebellion (资助叛乱) — 资助 NPC 内某派系·partyImbalance 升·触发 chaoyi infight
 *                        cost: 10 万两·粮 5 万石·影响: 某 party loyalty -10·infight 必发
 *   spreadRumor (散播谣言) — 制造 NPC 内部猜疑·下回合诏令偏向"罢党争"
 *                        cost: 2 万两·影响: fac._rumorTurn = current·NPC 多 1 doubt event
 *   espionage (间谍策反) — 多次后 NPC 内部某 char 永久转投
 *                        cost: 8 万两·影响: target.loyalty -15·_espionageStacks++·满 3 次翻面
 *
 * 不可对 player faction 用 (没意义)·必须 P.playerInfo.factionName 对照检查。
 *
 * 写入 GM._npcInterventions[]·log 留 player 翻历史
 *
 * Schema:
 *   { id, turn, action, fromPlayer, targetFac, targetChar?, cost, effects, success/fail }
 */
(function(global) {
  'use strict';

  function _safeNum(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function _payerFaction() {
    return (global.P && global.P.playerInfo && global.P.playerInfo.factionName) || '';
  }

  // 资源扣·从 player faction.treasury 扣·若不够 → 返 false
  function _deductCost(cost) {
    var pn = _payerFaction();
    var fac = (global.GM && Array.isArray(GM.facs)) ? GM.facs.find(function(x){ return x && x.name === pn; }) : null;
    if (!fac) return false;
    if (!fac.treasury || typeof fac.treasury !== 'object') fac.treasury = { money: 0, grain: 0, cloth: 0 };
    if (cost.money && _safeNum(fac.treasury.money) < cost.money) return false;
    if (cost.grain && _safeNum(fac.treasury.grain) < cost.grain) return false;
    if (cost.money) fac.treasury.money -= cost.money;
    if (cost.grain) fac.treasury.grain -= cost.grain;
    return true;
  }

  function _logIntervention(rec) {
    if (typeof global.GM === 'undefined') return;
    if (!Array.isArray(global.GM._npcInterventions)) global.GM._npcInterventions = [];
    if (global.GM._npcInterventions.length > 50) global.GM._npcInterventions = global.GM._npcInterventions.slice(-50);
    global.GM._npcInterventions.push(rec);
  }

  function _findCharInFac(facName, charName) {
    if (!global.GM || !Array.isArray(global.GM.chars)) return null;
    return global.GM.chars.find(function(c){
      return c && c.name === charName && c.faction === facName;
    });
  }

  // ── 4 干预动作 ──

  function bribe(targetFacName, targetCharName) {
    var pn = _payerFaction();
    if (!pn || pn === targetFacName) return { ok: false, reason: '目标须为他朝' };
    var c = _findCharInFac(targetFacName, targetCharName);
    if (!c) return { ok: false, reason: '目标人物不存在·' + targetCharName };
    var cost = { money: 50000 };
    if (!_deductCost(cost)) return { ok: false, reason: '太仓不足·需 5 万两' };

    var loyBefore = _safeNum(c.loyalty);
    c.loyalty = _clamp(loyBefore - 25, 0, 100);
    var bribed = c.loyalty < 30;
    if (bribed) c._bribed = true;

    var rec = {
      id: 'npci_' + (_safeNum(global.GM.turn) || 1) + '_bribe_' + targetCharName,
      turn: _safeNum(global.GM.turn) || 1,
      action: 'bribe',
      fromPlayer: pn,
      targetFac: targetFacName,
      targetChar: targetCharName,
      cost: cost,
      effects: { loyaltyBefore: loyBefore, loyaltyAfter: c.loyalty, bribed: bribed },
      success: true
    };
    _logIntervention(rec);
    if (global.TM && global.TM.FactionNpcNewsBridge) {
      try { global.TM.FactionNpcNewsBridge.pushIntervention(rec); } catch(_){}
    }
    return { ok: true, rec: rec };
  }

  function sponsorRebellion(targetFacName) {
    var pn = _payerFaction();
    if (!pn || pn === targetFacName) return { ok: false, reason: '不能资助本朝' };
    var fac = (global.GM.facs || []).find(function(x){ return x.name === targetFacName; });
    if (!fac) return { ok: false, reason: '目标势力不存在' };
    var cost = { money: 100000, grain: 50000 };
    if (!_deductCost(cost)) return { ok: false, reason: '资源不足·需 10 万两 + 5 万石粮' };

    // partyImbalance 升·影响下回合 chaoyi
    if (fac.derivedHealth && fac.derivedHealth._source) {
      fac.derivedHealth._source.partyImbalance = _clamp(_safeNum(fac.derivedHealth._source.partyImbalance) + 0.2, 0, 1);
    }
    // 标 fac _rebellionSponsoredTurn·下 NPC chaoyi 必 infight + ruler decide 不安
    fac._rebellionSponsoredTurn = _safeNum(global.GM.turn) || 1;
    // chars loyalty 散点降 (随机 2-3 个 -10)
    var entry = global.GM._facIndex && global.GM._facIndex[targetFacName];
    var alive = (entry && entry.chars) ? entry.chars.filter(function(c){ return c.alive !== false; }) : [];
    var picks = alive.slice().sort(function(){ return Math.random() - 0.5; }).slice(0, 3);
    picks.forEach(function(c){ c.loyalty = _clamp(_safeNum(c.loyalty) - 10, 0, 100); });

    var rec = {
      id: 'npci_' + (_safeNum(global.GM.turn) || 1) + '_sponsor_' + targetFacName,
      turn: _safeNum(global.GM.turn) || 1,
      action: 'sponsorRebellion',
      fromPlayer: pn,
      targetFac: targetFacName,
      cost: cost,
      effects: { partyImbalanceDelta: 0.2, charsAffected: picks.map(function(c){ return c.name; }) },
      success: true
    };
    _logIntervention(rec);
    if (global.TM && global.TM.FactionNpcNewsBridge) {
      try { global.TM.FactionNpcNewsBridge.pushIntervention(rec); } catch(_){}
    }
    return { ok: true, rec: rec };
  }

  function spreadRumor(targetFacName) {
    var pn = _payerFaction();
    if (!pn || pn === targetFacName) return { ok: false, reason: '不能对本朝散谣' };
    var fac = (global.GM.facs || []).find(function(x){ return x.name === targetFacName; });
    if (!fac) return { ok: false, reason: '目标势力不存在' };
    var cost = { money: 20000 };
    if (!_deductCost(cost)) return { ok: false, reason: '太仓不足·需 2 万两' };

    fac._rumorTurn = _safeNum(global.GM.turn) || 1;
    // courtCohesion 临时降 5 (下 derived rebuild 会重算·短效)
    if (fac.derivedHealth) {
      fac.derivedHealth.courtCohesion = _clamp(_safeNum(fac.derivedHealth.courtCohesion) - 5, 0, 100);
    }

    var rec = {
      id: 'npci_' + (_safeNum(global.GM.turn) || 1) + '_rumor_' + targetFacName,
      turn: _safeNum(global.GM.turn) || 1,
      action: 'spreadRumor',
      fromPlayer: pn,
      targetFac: targetFacName,
      cost: cost,
      effects: { rumorTurn: fac._rumorTurn, courtCohesionDelta: -5 },
      success: true
    };
    _logIntervention(rec);
    if (global.TM && global.TM.FactionNpcNewsBridge) {
      try { global.TM.FactionNpcNewsBridge.pushIntervention(rec); } catch(_){}
    }
    return { ok: true, rec: rec };
  }

  function espionage(targetFacName, targetCharName) {
    var pn = _payerFaction();
    if (!pn || pn === targetFacName) return { ok: false, reason: '不能策反本朝' };
    var c = _findCharInFac(targetFacName, targetCharName);
    if (!c) return { ok: false, reason: '目标人物不存在·' + targetCharName };
    var cost = { money: 80000 };
    if (!_deductCost(cost)) return { ok: false, reason: '太仓不足·需 8 万两' };

    var loyBefore = _safeNum(c.loyalty);
    c.loyalty = _clamp(loyBefore - 15, 0, 100);
    c._espionageStacks = (_safeNum(c._espionageStacks) || 0) + 1;
    var defected = false;
    if (c._espionageStacks >= 3) {
      // 翻面 — 改 c.faction 为 player faction (走 Membership API)
      if (global.TM && global.TM.FactionMembership && global.TM.FactionMembership.assignChar) {
        global.TM.FactionMembership.assignChar(c, pn, { reason: 'espionage flip after 3 stacks' });
      } else {
        c.faction = pn;
      }
      defected = true;
    }

    var rec = {
      id: 'npci_' + (_safeNum(global.GM.turn) || 1) + '_espionage_' + targetCharName,
      turn: _safeNum(global.GM.turn) || 1,
      action: 'espionage',
      fromPlayer: pn,
      targetFac: targetFacName,
      targetChar: targetCharName,
      cost: cost,
      effects: { loyaltyBefore: loyBefore, loyaltyAfter: c.loyalty, stacks: c._espionageStacks, defected: defected },
      success: true
    };
    _logIntervention(rec);
    if (global.TM && global.TM.FactionNpcNewsBridge) {
      try { global.TM.FactionNpcNewsBridge.pushIntervention(rec); } catch(_){}
    }
    return { ok: true, rec: rec };
  }

  function getInterventionLog(facName) {
    if (typeof global.GM === 'undefined') return [];
    if (!Array.isArray(global.GM._npcInterventions)) return [];
    if (!facName) return global.GM._npcInterventions.slice();
    return global.GM._npcInterventions.filter(function(r){ return r.targetFac === facName; });
  }

  global.TM = global.TM || {};
  global.TM.FactionNpcIntervention = {
    bribe: bribe,
    sponsorRebellion: sponsorRebellion,
    spreadRumor: spreadRumor,
    espionage: espionage,
    getLog: getInterventionLog,
    COSTS: {
      bribe: { money: 50000 },
      sponsorRebellion: { money: 100000, grain: 50000 },
      spreadRumor: { money: 20000 },
      espionage: { money: 80000 }
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.TM.FactionNpcIntervention;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
