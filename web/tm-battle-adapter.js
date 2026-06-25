/* tm-battle-adapter.js — 御驾亲征接入 · Phase 1「适配器」
 * 把主游戏交战双方的 army.units[](队·Phase0 派生)转成战术原型 `startBattle(config)` 的入参。
 * 纯数据转换(读 GM 不改 GM)·朝代中立(方名由 faction 派生)·规模压缩(场上≤35队/方·超出入 reserves 波次)。
 * 依赖:window.TMArmyUnits(Phase0·units[] 派生/自愈)。node 测试时回退 a.units。
 */
(function () {
  'use strict';

  /* 历练 → 品质(vetFromQuality 的逆·喂原型 effStr 的 quality 段) */
  function qualityFromVet(v) {
    v = +v || 0;
    return v >= 55 ? '精锐' : v >= 40 ? '精兵' : v >= 25 ? '普通' : '新募';
  }

  /* 主将名 → 战斗 gen{n,valor,mil,int}(翻 GM.chars·缺则中庸默认·永不崩) */
  function genFor(commander, GMref) {
    var name = commander || '';
    var g = GMref || (typeof window !== 'undefined' && window.GM) || (typeof GM !== 'undefined' ? GM : null);
    var c = null;
    if (g && Array.isArray(g.chars) && name) {
      for (var i = 0; i < g.chars.length; i++) {
        var ch = g.chars[i];
        if (ch && (ch.name === name || ch['姓名'] === name)) { c = ch; break; }
      }
    }
    function pick(o, keys, d) { for (var k = 0; k < keys.length; k++) { if (o && o[keys[k]] != null) return o[keys[k]]; } return d; }
    return {
      n: name || '裨将',
      valor: c ? Math.round(pick(c, ['valor', '武力', '勇武'], 60)) : 60,
      mil: c ? Math.round(pick(c, ['military', '军事', '统率', '将略'], 62)) : 62,
      int: c ? Math.round(pick(c, ['intelligence', '智力', '智'], 55)) : 55
    };
  }
  /* 麾下分队主官(裨将·主将的削弱影子·避免每队都成具名英雄) */
  function deputyGen(gen) {
    return { n: '裨将', valor: Math.max(38, (gen.valor || 60) - 18), mil: Math.max(38, (gen.mil || 62) - 14), int: Math.max(38, (gen.int || 55) - 8) };
  }

  /* 装备态→品质降级(武库供械不足→战术战斗品质降·与 calculateArmyStrength equipMod 呼应) */
  var _QTIERS = ['新募', '普通', '精兵', '精锐'];
  function degradeQualityByEquip(q, condition) {
    var c = String(condition || '');
    var drop = /严重不足|匮乏|奇缺/.test(c) ? 2 : /简陋|破败|朽钝|不足|短缺/.test(c) ? 1 : 0;
    if (!drop) return q;
    var i = _QTIERS.indexOf(q); if (i < 0) i = 1;
    return _QTIERS[Math.max(0, i - drop)];
  }
  /* 队 → 兵牌(原型 roster 单位形状:type/sub/name/soldiers/mor/training/quality/supply/gen/id/parentArmyId) */
  function unitToToken(u, army, gen) {
    return {
      id: u.id, parentArmyId: u.parentArmyId != null ? u.parentArmyId : (army && army.id) || null,
      type: u.arm || 'step', sub: u.sub || 'sword',
      name: u['番号'] || u.name || (army && army.name) || '队',
      soldiers: Math.max(1, Math.round(u.men || 0)),
      mor: Math.round((army && army.morale) || 60),
      training: Math.round((army && army.training) || 50),
      quality: degradeQualityByEquip(qualityFromVet(u['历练']), army && army.equipmentCondition),
      supply: Math.round((army && army.supply) || 80),
      gen: gen
    };
  }

  function armyUnits(a) {
    var us = ((typeof window !== 'undefined' && window.TMArmyUnits) ? window.TMArmyUnits.ensureArmyUnits(a) : (a && a.units)) || [];
    return us;
  }

  /* 一方军群 → 兵牌列表(每军:首队挂主将·余队挂裨将·联军合流=多军汇一方) */
  function sideTokens(armies, GMref, emperorArmyId) {
    var out = [];
    (armies || []).forEach(function (a) {
      if (!a) return;
      var us = armyUnits(a), gen = genFor(a.commander, GMref), dep = deputyGen(gen);
      var isEmp = emperorArmyId != null && (a.id === emperorArmyId);
      us.forEach(function (u, i) {
        var tok = unitToToken(u, a, i === 0 ? gen : dep);
        if (isEmp && i === 0) tok.emperor = true;   // 御营=御驾亲征者所在军的首队(天子亲临·护住御营)
        out.push(tok);
      });
    });
    return out;
  }

  /* 省名 → 确定性地图种子(同址每战一致·喂 genMap) */
  function provinceSeed(name) {
    var s = String(name || ''), h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return (h >>> 0) || 1;
  }

  /* 省地形标签 → genMap 地形档(§8 适配器·dens/biome)。标签缺省→默认随机感(dens 0.3) */
  var TERRAIN_PROFILE = {
    '平原': { dens: 0.18, biome: 'plain' }, '草原': { dens: 0.10, biome: 'plain' },
    '丘陵': { dens: 0.34, biome: 'verdant' }, '山地': { dens: 0.52, biome: 'verdant' },
    '高原': { dens: 0.26, biome: 'plain' }, '沿海': { dens: 0.22, biome: 'verdant' },
    '边塞': { dens: 0.30, biome: 'snow' }, '林地': { dens: 0.40, biome: 'verdant' }
  };
  function terrainProfile(tag) {
    var p = TERRAIN_PROFILE[String(tag || '')];
    return p ? { dens: p.dens, biome: p.biome } : null;   // null→原型用默认(随机 biome·dens0.3)
  }

  var ONFIELD_CAP = 35;   // 场上≤35队/方(全场≤70·§4/§12.1)·超出入波次 reserves
  var DIVERSE_FLOOR = 2;  // 每个在场兵种至少 N 队上阵(保骑/炮/铳露面·不被步兵挤光)

  /* 场上选取:按兵种(sub)分层比例取样+保底·非「按队序取前N」(否则首支大军步兵占满·骑炮铳全沉预备队)。
   * 御营队(emperor)强制上场;每兵种按其占比分配场上名额(≥DIVERSE_FLOOR·≤该兵种队数)·余数补给最大缺口兵种;剩余入 reserves。确定性(纯排序算术·无随机)。 */
  function selectOnField(tokens, cap) {
    cap = cap || ONFIELD_CAP;
    if (tokens.length <= cap) return { field: tokens.slice(), reserve: [] };
    var forced = [], rest = [];
    tokens.forEach(function (t) { (t && t.emperor ? forced : rest).push(t); });
    var budget = Math.max(0, cap - forced.length);
    var groups = {}, order = [];
    rest.forEach(function (t) { var k = t.sub || t.type || '?'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(t); });
    var total = rest.length || 1, want = {};
    order.forEach(function (k) { var sz = groups[k].length; want[k] = Math.min(sz, Math.max(Math.min(sz, DIVERSE_FLOOR), Math.round(budget * sz / total))); });
    var sum = order.reduce(function (s, k) { return s + want[k]; }, 0);
    var guard = 0;
    while (sum > budget && guard++ < 9999) { var k = order.filter(function (k) { return want[k] > DIVERSE_FLOOR; }).sort(function (a, b) { return want[b] - want[a]; })[0]; if (!k) { k = order.filter(function (k) { return want[k] > 0; }).sort(function (a, b) { return want[b] - want[a]; })[0]; } if (!k) break; want[k]--; sum--; }
    while (sum < budget && guard++ < 9999) { var k2 = order.filter(function (k) { return want[k] < groups[k].length; }).sort(function (a, b) { return (groups[b].length - want[b]) - (groups[a].length - want[a]); })[0]; if (!k2) break; want[k2]++; sum++; }
    var field = forced.slice(), reserve = [];
    order.forEach(function (k) { for (var i = 0; i < groups[k].length; i++) (i < want[k] ? field : reserve).push(groups[k][i]); });
    return { field: field, reserve: reserve };
  }

  /* 主入口:交战双方 army 群 → startBattle(config)。
   * playerArmies/enemyArmies = 该接触节点上 同/敌 faction 在场全部军(联军合流)。
   * opts:{ provinceName, terrainTag, weather, playerFactionName, enemyFactionName, emperorArmyId, GM } */
  function buildBattleConfig(playerArmies, enemyArmies, opts) {
    opts = opts || {};
    var G = opts.GM || (typeof window !== 'undefined' && window.GM) || (typeof GM !== 'undefined' ? GM : null);
    var ming = sideTokens(playerArmies, G, opts.emperorArmyId);
    var jin = sideTokens(enemyArmies, G, null);
    var enemyLead = (enemyArmies && enemyArmies[0] && enemyArmies[0].commander) || '敌帅';
    var mSel = selectOnField(ming, ONFIELD_CAP), jSel = selectOnField(jin, ONFIELD_CAP);   // 兵种分层取样(非按队序截断)
    return {
      mapSeed: provinceSeed(opts.provinceName),
      terrainProfile: terrainProfile(opts.terrainTag),
      weather: opts.weather || 'clear',
      sideName: { ming: opts.playerFactionName || '我军', jin: opts.enemyFactionName || '敌军' },
      lead: enemyLead,
      emperorSide: 'ming',
      armies: { ming: mSel.field, jin: jSel.field },
      reserves: { ming: mSel.reserve, jin: jSel.reserve },   // 溢出波次(接 proto reinf)
      meta: { provinceName: opts.provinceName || '', onFieldCap: ONFIELD_CAP, mingTotal: ming.length, jinTotal: jin.length }
    };
  }

  var API = {
    buildBattleConfig: buildBattleConfig, sideTokens: sideTokens, unitToToken: unitToToken, selectOnField: selectOnField, degradeQualityByEquip: degradeQualityByEquip,
    genFor: genFor, qualityFromVet: qualityFromVet, provinceSeed: provinceSeed, terrainProfile: terrainProfile,
    ONFIELD_CAP: ONFIELD_CAP
  };
  if (typeof window !== 'undefined') window.TMBattleAdapter = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
