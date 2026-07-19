// ============================================================
// tm-player-private-army.js — 穿越模式 Phase 4.5 · Task 20 玩家私军系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（内阁/票拟/
//   司礼监/东厂/西厂/锦衣卫/军机处/廷杖/八股/巡按/总督/巡抚/郡王/藩王等
//   一律由剧本 hook）。私军类型（家丁/门客剑士/部曲/死士）取中国古代通用
//   称谓，引擎层只提供「招募 / 维护 / 训练 / 装备 / 4 种使用场景 / 僭越
//   风险」通用框架。
//   - "言官""弹劾""问罪""朝廷""调查"为跨朝代通称（不锚某朝某署）
//   - 神机营/锦衣卫等明清专名由剧本 hook
// ------------------------------------------------------------
// 暴露：window.TM.PlayerPrivateArmy.{
//   init, getState, getUnits, getUnit, getTotalCount, getMonthlyCost,
//   recruit, monthlyMaintenance, train, equip,
//   useForEscort, useForSelfDefense, useForCoup, useForPrivateFeud,
//   checkYueYue, getYueYueLevel, tick,
//   computeBattleScore, listUnitTypes, listRecruitSources, listEquipmentTypes,
//   renderPanel,
//   UNIT_TYPES, RECRUIT_SOURCES, EQUIPMENT_TYPES, USAGE_SCENARIOS,
//   YUEYUE_THRESHOLDS, KIND_TAG
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - TM.PlayerEconomy.spend / addCash        （招募/装备/训练消耗）
//   - TM.PlayerInteraction.interact           （招揽名将·关联人物互动）
//   - TM.Transmigration.isTransmigrationMode  （穿越模式判定）
//   - TMArmyUnits.classifyUnitType            （沿用 tm-army-units.js 兵种识别）
//   - GM._playerArmy / GM.chars / GM.turn / P.playerInfo
//   - global.callAI / callLLM                 （运行时 LLM 适配）
// 双路径挂载：浏览器走 window.TM.PlayerPrivateArmy；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  var TM = global.TM = global.TM || {};

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 私军类型（中国古代通用称谓·跨朝代可用）
  //   baseCost:   招募单价（两/人·随规模边际上浮·见 _costWithScale）
  //   baseTrain:  初始训练度
  //   baseEquip:  初始装备度
  //   baseMorale: 初始士气
  //   upkeep:     月维护单价（两/人/月）
  //   upkeepGrain:月维护粮草（斤/人/月）
  //   combatMul:  战斗力系数（沿用 tm-military.js 战力公式·乘子）
  var UNIT_TYPES = {
    jiading: {
      id: 'jiading', label: '家丁', tag: 'light',
      baseCost: 12, baseTrain: 30, baseEquip: 25, baseMorale: 55,
      upkeep: 1.2, upkeepGrain: 1.5, combatMul: 0.85,
      hint: '轻装护卫·常随行商队'
    },
    menjian: {
      id: 'menjian', label: '门客剑士', tag: 'elite',
      baseCost: 35, baseTrain: 55, baseEquip: 50, baseMorale: 65,
      upkeep: 2.4, upkeepGrain: 2.0, combatMul: 1.10,
      hint: '精锐剑士·门客出身·战力强'
    },
    buqu: {
      id: 'buqu', label: '部曲', tag: 'heavy',
      baseCost: 60, baseTrain: 50, baseEquip: 60, baseMorale: 60,
      upkeep: 3.0, upkeepGrain: 3.0, combatMul: 1.25,
      hint: '重装附从部伍·世家私兵主力'
    },
    sishi: {
      id: 'sishi', label: '死士', tag: 'special',
      baseCost: 80, baseTrain: 70, baseEquip: 55, baseMorale: 80,
      upkeep: 2.0, upkeepGrain: 1.5, combatMul: 1.05,
      hint: '敢死之士·专司刺杀/突袭/死地任务'
    }
  };

  // 招募渠道·跨朝代通用（具体来源名目由剧本 hook）
  //   sourceMul: 训练度加成系数（影响初始 training·≤1.0 为衰减·≥1.0 为加成）
  //   equipAdj:  装备度调整
  //   moraleAdj: 士气调整
  var RECRUIT_SOURCES = {
    liumin: {
      id: 'liumin', label: '流民', sourceMul: 0.7, equipAdj: -10, moraleAdj: -5,
      hint: '募之易·战力弱·须久练'
    },
    biao: {
      id: 'biao', label: '镖师', sourceMul: 1.1, equipAdj: +5, moraleAdj: +5,
      hint: '走镖出身·善护商队'
    },
    jianghu: {
      id: 'jianghu', label: '江湖人', sourceMul: 1.0, equipAdj: 0, moraleAdj: +10,
      hint: '草莽武人·散漫不羁'
    },
    tuwu: {
      id: 'tuwu', label: '退役军士', sourceMul: 1.3, equipAdj: +15, moraleAdj: +8,
      hint: '老卒可用·即战之力'
    },
    famous: {
      id: 'famous', label: '名将招揽', sourceMul: 1.6, equipAdj: +25, moraleAdj: +20,
      hint: '人物互动招揽名将·率部来投'
    }
  };

  // 装备类型（关联私产系统·TM.PlayerEconomy.spend 扣银钱）
  //   costPerUnit: 每人装备成本（两）
  //   equipBoost:  装备度提升（0-100·封顶 100）
  var EQUIPMENT_TYPES = {
    weapon: { id: 'weapon', label: '兵器', costPerUnit: 8,  equipBoost: 12, hint: '刀枪剑戟·标配近战兵器' },
    armor:  { id: 'armor',  label: '甲胄', costPerUnit: 20, equipBoost: 18, hint: '皮甲/铁甲/具装·减伤' },
    horse:  { id: 'horse',  label: '战马', costPerUnit: 40, equipBoost: 15, hint: '配马成骑·机动加倍' }
  };

  // 使用场景·跨朝代通用
  var USAGE_SCENARIOS = {
    escort:   { id: 'escort',   label: '护卫商队', hint: '降低山贼劫掠风险·可能伤亡' },
    defense:  { id: 'defense',  label: '自卫',     hint: '反叛筹备期抵御围剿' },
    coup:     { id: 'coup',     label: '政变',     hint: '反叛主力·沿用 tm-battle-*.js' },
    feud:     { id: 'feud',     label: '私斗',     hint: '与 NPC 家族械斗' }
  };

  // 僭越风险阈值（按总人数·朝代中立·数值由引擎兜底·剧本可覆盖）
  //   触发后果：warning=言官风闻 / serious=言官弹劾+朝廷调查 / critical=问罪/讨伐
  var YUEYUE_THRESHOLDS = {
    warning:  100,   // 风闻阶段·言官开始议论
    serious:  300,   // 弹劾+调查
    critical: 600,   // 问罪/讨伐
    max:      1000   // 拥兵自重硬上限
  };

  // 战斗单位账本标记·沿用 tm-army-units.js 但独立账本
  var KIND_TAG = 'private';

  // 月维护规模上限（超此触发财政压力·与 PLAYER_ECONOMY 联动）
  var FISCAL_PRESSURE_THRESHOLD = 300; // 300 人即开始财政压力
  var LEDGER_MAX = 200;

  // 训练度提升参数（沿用 tm-army-units.js 模型·训练度 0-100·封顶 100）
  var TRAIN_GAIN_BASE = 5;     // 每次训练基础提升
  var TRAIN_GAIN_RAND = 4;     // 随机加成上限
  var TRAIN_COST_PER_HEAD = 1.5; // 每人训练成本（两）
  var TRAIN_TIME_HOURS = 4;    // 每次训练耗时（小时）

  var _TIME_PER_TURN = 12; // 累积 12 小时 → GM.turn +1

  // ── 工具函数 ────────────────────────────────────────────────
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _rndId(prefix) {
    return (prefix || 'pa_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerPrivateArmy]', m); } catch (_) {}
  }

  // ── 软依赖·穿越模式判定 ─────────────────────────────────────
  function _isTrans() {
    try {
      if (global.TM && global.TM.Transmigration &&
          typeof global.TM.Transmigration.isTransmigrationMode === 'function') {
        return !!global.TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.transmigrationMode === true;
      }
    } catch (_) {}
    return false;
  }

  function _getPlayerName() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.characterName) {
        return P.playerInfo.characterName;
      }
    } catch (_) {}
    return '玩家';
  }

  function _getPlayerChar() {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      var name = _getPlayerName();
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (!c) continue;
        if (c.isPlayer === true) return c;
        if (name && c.name === name) return c;
      }
    } catch (_) {}
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §2 私军数据结构（SubTask 20.2 · 沿用 tm-army-units.js 模型·独立账本）
  // ════════════════════════════════════════════════════════════
  // 状态挂载点：GM._playerArmy = { units[], monthlyCost, notoriety, events[] }
  // 单位字段：{ id, type, count, training(0-100), equipment(0-100),
  //            morale(0-100), kind:'private', source, arm, sub, flags[],
  //            recruitedAt, lastTrainedAt, ledger[] }

  function _defaultState() {
    return {
      units: [],
      monthlyCost: 0,
      monthlyGrain: 0,
      notoriety: 0,           // 僭越恶名（累计·触发朝廷关注强度）
      yueyueLevel: 'none',    // none/warning/serious/critical
      events: [],
      fiscalPressure: false,
      createdAt: _curTurn()
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerArmy) {
        GM._playerArmy = _defaultState(); // arch-ok
      }
      return GM._playerArmy;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.units)) s.units = []; // arch-ok
    if (!Array.isArray(s.events)) s.events = []; // arch-ok
    if (typeof s.monthlyCost !== 'number') s.monthlyCost = 0; // arch-ok
    if (typeof s.monthlyGrain !== 'number') s.monthlyGrain = 0; // arch-ok
    if (typeof s.notoriety !== 'number') s.notoriety = 0; // arch-ok
    if (typeof s.yueyueLevel !== 'string') s.yueyueLevel = 'none'; // arch-ok
    return s;
  }

  function _pushEvent(s, kind, summary, payload) {
    var ev = {
      id: _rndId('ev_'),
      turn: _curTurn(),
      kind: kind,
      summary: summary || '',
      payload: payload || null,
      at: Date.now()
    };
    s.events.push(ev);
    if (s.events.length > LEDGER_MAX) s.events = s.events.slice(-LEDGER_MAX);
    return ev;
  }

  // ── 兵种识别·沿用 tm-army-units.js ──────────────────────────
  //   主路径：调 TMArmyUnits.classifyUnitType(typeStr, army)
  //   降级：按私军类型 tag 映射（light=step/sword, elite=sword, heavy=heavy, special=sword）
  function _classify(typeStr, unitTypeTag) {
    try {
      if (typeof TMArmyUnits !== 'undefined' && TMArmyUnits &&
          typeof TMArmyUnits.classifyUnitType === 'function') {
        var r = TMArmyUnits.classifyUnitType(typeStr, { equipment: [] });
        if (r && r.arm) return r;
      }
    } catch (_) {}
    // 降级
    var arm = 'step', sub = 'sword', flags = [];
    if (unitTypeTag === 'heavy') { arm = 'step'; sub = 'sword'; flags.push('heavy'); }
    else if (unitTypeTag === 'elite') { arm = 'step'; sub = 'sword'; flags.push('elite'); }
    else if (unitTypeTag === 'special') { arm = 'step'; sub = 'sword'; flags.push('elite'); }
    return { arm: arm, sub: sub, flags: flags, src: 'fallback' };
  }

  // ── 规模边际上浮·防一次性爆兵 ───────────────────────────────
  function _costWithScale(baseCost, totalCount, addCount) {
    var totalAfter = totalCount + addCount;
    var factor = 1.0 + Math.max(0, totalAfter - 50) / 200; // 50 人后每+1人涨 0.5%
    return Math.round(baseCost * factor * addCount);
  }

  // ════════════════════════════════════════════════════════════
  //  §3 招募私军（SubTask 20.3 · 关联人物互动招揽名将）
  // ════════════════════════════════════════════════════════════
  function recruit(type, source, count, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '私军账本未就绪' };
    var typeDef = UNIT_TYPES[type];
    if (!typeDef) return { ok: false, reason: '未知私军类型: ' + type };
    var srcDef = RECRUIT_SOURCES[source];
    if (!srcDef) return { ok: false, reason: '未知招募渠道: ' + source };
    if (!_isNum(count) || count <= 0) return { ok: false, reason: '人数非法' };
    if (Math.floor(count) !== count) return { ok: false, reason: '人数须为整数' };
    opts = opts || {};

    // 名将招揽须先经人物互动
    if (source === 'famous') {
      var npcName = opts.npcName;
      if (!npcName) return { ok: false, reason: '名将招揽须指定 npcName' };
      var interactR = null;
      try {
        if (global.TM && global.TM.PlayerInteraction &&
            typeof global.TM.PlayerInteraction.interact === 'function') {
          interactR = global.TM.PlayerInteraction.interact(npcName, 'recruit', {
            topic: '招揽名将·率部来投',
            intent: 'recruit_general',
            armyType: type,
            armyCount: count
          });
        }
      } catch (_) {}
      if (!interactR || !interactR.ok) {
        return { ok: false, reason: '名将招揽失败（人物互动未就绪或被拒）', interact: interactR };
      }
    }

    // 计算成本·规模边际上浮
    var totalCount = _getTotalCount(s);
    var cost = _costWithScale(typeDef.baseCost, totalCount, count);
    if (cost > 0) {
      var spent = _spendPlayerCash(cost, '招募' + typeDef.label + '·' + count + '人');
      if (!spent.ok) return { ok: false, reason: '银钱不足', need: cost, cash: spent.cash };
    }

    // 兵种识别（沿用 tm-army-units.js）
    var cls = _classify(typeDef.label, typeDef.tag);

    // 初始训练度/装备/士气·按渠道加成
    var training = _clamp(Math.round(typeDef.baseTrain * srcDef.sourceMul + (opts.trainBonus || 0)), 0, 100);
    var equipment = _clamp(typeDef.baseEquip + srcDef.equipAdj + (opts.equipBonus || 0), 0, 100);
    var morale = _clamp(typeDef.baseMorale + srcDef.moraleAdj + (opts.moraleBonus || 0), 0, 100);

    var unit = {
      id: _rndId('unit_'),
      kind: KIND_TAG,             // 独立账本标记
      type: type,
      typeLabel: typeDef.label,
      tag: typeDef.tag,
      count: count,
      training: training,
      equipment: equipment,
      morale: morale,
      source: source,
      sourceLabel: srcDef.label,
      arm: cls.arm,
      sub: cls.sub,
      flags: cls.flags || [],
      combatMul: typeDef.combatMul,
      upkeep: typeDef.upkeep,
      upkeepGrain: typeDef.upkeepGrain,
      recruitedAt: _curTurn(),
      lastTrainedAt: null,
      lastEquippedAt: null,
      ledger: []
    };
    s.units.push(unit); // arch-ok (GM._playerArmy.units 写口)

    _pushEvent(s, 'recruit', '招募 ' + count + ' 名' + typeDef.label + '（来自' + srcDef.label + '）', {
      type: type, source: source, count: count, cost: cost
    });

    // 招募后立即复算月维护 + 僭越风险
    _recomputeMonthly(s);
    var yueyueR = _evaluateYueYue(s, { silent: true });

    return {
      ok: true, unit: unit, cost: cost,
      monthlyCost: s.monthlyCost, monthlyGrain: s.monthlyGrain,
      yueyue: yueyueR
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §4 私军维护（SubTask 20.4 · 月度消耗 / 规模超限触发财政压力）
  // ════════════════════════════════════════════════════════════
  function _recomputeMonthly(s) {
    var cost = 0, grain = 0;
    for (var i = 0; i < s.units.length; i++) {
      var u = s.units[i];
      if (!u) continue;
      cost += (u.upkeep || 0) * (u.count || 0);
      grain += (u.upkeepGrain || 0) * (u.count || 0);
    }
    s.monthlyCost = Math.round(cost); // arch-ok
    s.monthlyGrain = Math.round(grain); // arch-ok
    s.fiscalPressure = (s.monthlyCost > FISCAL_PRESSURE_THRESHOLD * 3); // arch-ok
    return { monthlyCost: s.monthlyCost, monthlyGrain: s.monthlyGrain, fiscalPressure: s.fiscalPressure };
  }

  function monthlyMaintenance(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '私军账本未就绪' };
    opts = opts || {};
    _recomputeMonthly(s);
    var cost = s.monthlyCost;
    var grain = s.monthlyGrain;

    // 扣玩家银钱（关联 TM.PlayerEconomy.spend）
    var spent = null;
    if (cost > 0) {
      spent = _spendPlayerCash(cost, '私军月维护·银钱');
      if (!spent.ok) {
        // 银钱不足·士气下降·有逃亡风险
        _applyUpkeepShortfall(s, cost - (spent.cash || 0));
        _pushEvent(s, 'upkeep_short', '私军月维护银钱不足·士气下降·有逃亡', {
          need: cost, cash: spent.cash || 0, shortfall: cost - (spent.cash || 0)
        });
      }
    }

    // 扣粮草（关联 TM.PlayerEconomy·如支持 grain 字段则扣·否则记录）
    if (grain > 0 && typeof TM !== 'undefined' && TM.PlayerEconomy) {
      try {
        var peS = TM.PlayerEconomy.getState && TM.PlayerEconomy.getState();
        if (peS && typeof peS.grain === 'number') {
          // 若 PlayerEconomy 有 grain 字段·直接扣
          TM.PlayerEconomy.spend && TM.PlayerEconomy.spend(grain, '私军月维护·粮草');
        }
      } catch (_) {}
    }

    // 规模超限触发财政压力
    var totalCount = _getTotalCount(s);
    var fiscalPressure = totalCount > FISCAL_PRESSURE_THRESHOLD;
    if (fiscalPressure) {
      _pushEvent(s, 'fiscal_pressure', '私军规模 ' + totalCount + ' 人·超财政压力阈值 ' + FISCAL_PRESSURE_THRESHOLD + '·入不敷出', {
        totalCount: totalCount, threshold: FISCAL_PRESSURE_THRESHOLD
      });
    }

    // 同时跑僭越风险复算
    var yueyueR = _evaluateYueYue(s, { silent: true });

    return {
      ok: true,
      cost: cost, grain: grain,
      cash: spent ? spent.cash : null,
      fiscalPressure: fiscalPressure,
      totalCount: totalCount,
      yueyue: yueyueR
    };
  }

  function _applyUpkeepShortfall(s, shortfall) {
    for (var i = 0; i < s.units.length; i++) {
      var u = s.units[i];
      if (!u) continue;
      // 士气 -5~15·按缺口比例加重
      var moraleLoss = 5 + Math.min(10, Math.floor(shortfall / 100));
      u.morale = _clamp((u.morale || 0) - moraleLoss, 0, 100); // arch-ok (unit morale)
      // 5% 概率逃亡·按比例减员
      if (Math.random() < 0.05) {
        var loss = Math.max(1, Math.floor(u.count * 0.05));
        u.count = Math.max(0, u.count - loss); // arch-ok (unit count)
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §5 训练私军（SubTask 20.5 · 沿用 tm-army-units.js 训练度模型）
  // ════════════════════════════════════════════════════════════
  function train(unitId, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '私军账本未就绪' };
    if (!unitId) return { ok: false, reason: '未指定 unitId' };
    opts = opts || {};
    var u = _findUnit(s, unitId);
    if (!u) return { ok: false, reason: '未找到该私军单位: ' + unitId };
    if (u.count <= 0) return { ok: false, reason: '该单位已无人可训' };

    // 训练成本：每人 TRAIN_COST_PER_HEAD 两 + 时间 TRAIN_TIME_HOURS 小时
    var cost = Math.round(u.count * TRAIN_COST_PER_HEAD);
    var spent = _spendPlayerCash(cost, '训练' + u.typeLabel + '·' + u.count + '人');
    if (!spent.ok) return { ok: false, reason: '银钱不足', need: cost, cash: spent.cash };

    // 训练度提升·基础 + 随机·按现有训练度衰减（越高越难提升）
    var currentTrain = u.training || 0;
    var decayFactor = 1.0 - currentTrain / 200; // 100 时衰减到 0.5
    var gain = Math.round((TRAIN_GAIN_BASE + Math.random() * TRAIN_GAIN_RAND) * decayFactor);
    gain = Math.max(1, gain);
    u.training = _clamp(currentTrain + gain, 0, 100); // arch-ok (unit training)
    u.lastTrainedAt = _curTurn(); // arch-ok
    if (!Array.isArray(u.ledger)) u.ledger = [];
    u.ledger.push({ turn: _curTurn(), kind: 'train', gain: gain, cost: cost });

    // 时间推进
    var timeRes = _advanceTime(TRAIN_TIME_HOURS);

    _pushEvent(s, 'train', u.typeLabel + ' 训练·训练度 +' + gain + '（→ ' + u.training + '）', {
      unitId: unitId, gain: gain, cost: cost, training: u.training
    });

    return {
      ok: true, unit: u, gain: gain, cost: cost,
      training: u.training,
      time: { hours: TRAIN_TIME_HOURS, turnAdvanced: timeRes.turnAdvanced, turn: timeRes.turn || null }
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 装备私军（SubTask 20.6 · 兵器/甲胄/战马·关联私产系统）
  // ════════════════════════════════════════════════════════════
  function equip(unitId, equipType, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '私军账本未就绪' };
    if (!unitId) return { ok: false, reason: '未指定 unitId' };
    var eqDef = EQUIPMENT_TYPES[equipType];
    if (!eqDef) return { ok: false, reason: '未知装备类型: ' + equipType };
    opts = opts || {};
    var u = _findUnit(s, unitId);
    if (!u) return { ok: false, reason: '未找到该私军单位: ' + unitId };
    if (u.count <= 0) return { ok: false, reason: '该单位已无人可装备' };

    var cost = Math.round(u.count * eqDef.costPerUnit);
    var spent = _spendPlayerCash(cost, '装备' + u.typeLabel + '·' + eqDef.label + '×' + u.count);
    if (!spent.ok) return { ok: false, reason: '银钱不足', need: cost, cash: spent.cash };

    var currentEquip = u.equipment || 0;
    var boost = Math.round(eqDef.equipBoost * (1.0 - currentEquip / 200)); // 衰减
    boost = Math.max(1, boost);
    u.equipment = _clamp(currentEquip + boost, 0, 100); // arch-ok (unit equipment)
    u.lastEquippedAt = _curTurn(); // arch-ok
    if (!Array.isArray(u.ledger)) u.ledger = [];
    u.ledger.push({ turn: _curTurn(), kind: 'equip', equipType: equipType, boost: boost, cost: cost });

    // 战马配骑·arm 升级为 cav（沿用 tm-army-units.js 骑乘识别）
    if (equipType === 'horse' && u.arm !== 'cav') {
      u.arm = 'cav'; // arch-ok (battle unit arm 升级)
      u.sub = (u.flags && u.flags.indexOf('heavy') >= 0) ? 'heavy' : 'horse';
      if (u.flags.indexOf('cavalry') < 0) u.flags.push('cavalry');
    }

    _pushEvent(s, 'equip', u.typeLabel + ' 装备 ' + eqDef.label + '·装备度 +' + boost + '（→ ' + u.equipment + '）', {
      unitId: unitId, equipType: equipType, boost: boost, cost: cost, equipment: u.equipment
    });

    return {
      ok: true, unit: u, boost: boost, cost: cost,
      equipment: u.equipment
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 使用场景·护卫商队（SubTask 20.7 · 降低山贼劫掠风险）
  // ════════════════════════════════════════════════════════════
  function useForEscort(unitIds, opts) {
    return _useScenario('escort', unitIds, opts);
  }

  //  §8 使用场景·自卫（SubTask 20.8 · 反叛筹备期抵御围剿）
  function useForSelfDefense(unitIds, opts) {
    return _useScenario('defense', unitIds, opts);
  }

  //  §9 使用场景·政变（SubTask 20.9 · 反叛主力·沿用 tm-battle-*.js）
  function useForCoup(unitIds, opts) {
    return _useScenario('coup', unitIds, opts);
  }

  //  §10 使用场景·私斗（SubTask 20.10 · 与 NPC 家族械斗）
  function useForPrivateFeud(unitIds, opts) {
    return _useScenario('feud', unitIds, opts);
  }

  // 使用场景通用入口
  function _useScenario(scenario, unitIds, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '私军账本未就绪' };
    var def = USAGE_SCENARIOS[scenario];
    if (!def) return { ok: false, reason: '未知使用场景: ' + scenario };
    if (!Array.isArray(unitIds) || unitIds.length === 0) {
      return { ok: false, reason: '未指定参战私军单位' };
    }
    opts = opts || {};

    // 收集参战单位·计算总战力
    var units = [];
    var totalCount = 0;
    var totalScore = 0;
    for (var i = 0; i < unitIds.length; i++) {
      var u = _findUnit(s, unitIds[i]);
      if (!u) return { ok: false, reason: '未找到私军单位: ' + unitIds[i] };
      if (u.count <= 0) continue;
      var score = computeBattleScore(u);
      units.push({ unit: u, score: score });
      totalCount += u.count;
      totalScore += score * u.count;
    }
    if (units.length === 0) return { ok: false, reason: '无可参战单位' };
    var avgScore = totalScore / totalCount;

    var result = {
      ok: true,
      scenario: scenario,
      scenarioLabel: def.label,
      units: units.map(function (x) { return { id: x.unit.id, type: x.unit.type, count: x.unit.count, score: x.score }; }),
      totalCount: totalCount,
      totalScore: Math.round(totalScore),
      avgScore: Math.round(avgScore * 10) / 10
    };

    // 场景分支
    if (scenario === 'escort') {
      // 护卫商队·降低山贼劫掠风险（按护卫规模/训练度/装备度）
      var escortStrength = avgScore * Math.sqrt(totalCount); // 平方根防规模爆炸
      var riskReduction = _clamp(escortStrength / 100, 0, 0.85); // 最多降 85%
      var casualtyRate = (opts.combatIntensity || 0.3) * 0.05; // 护卫伤亡率较低
      var casualties = _applyCasualties(s, units, casualtyRate, opts);
      _pushEvent(s, 'use:escort', '护卫商队·山贼劫掠风险降低 ' + Math.round(riskReduction * 100) + '%·伤亡 ' + casualties.total, {
        riskReduction: riskReduction, casualties: casualties
      });
      result.riskReduction = riskReduction;
      result.casualties = casualties;
    }
    else if (scenario === 'defense') {
      // 自卫·抵御围剿·战力决定坚守时长
      var defenseStrength = avgScore * totalCount;
      var holdDays = Math.max(1, Math.floor(defenseStrength / 50));
      var casualtyRate = (opts.combatIntensity || 0.5) * 0.15;
      var casualties2 = _applyCasualties(s, units, casualtyRate, opts);
      _pushEvent(s, 'use:defense', '自卫抵御围剿·预计坚守 ' + holdDays + ' 日·伤亡 ' + casualties2.total, {
        holdDays: holdDays, casualties: casualties2
      });
      result.holdDays = holdDays;
      result.casualties = casualties2;
    }
    else if (scenario === 'coup') {
      // 政变·反叛主力·沿用 tm-battle-*.js（此处仅生成参战参数 + 战力评估）
      var coupStrength = avgScore * totalCount;
      var loyalty = opts.loyalty !== undefined ? opts.loyalty : 0.7; // 私军忠诚度·影响哗变概率
      var mutinyRisk = _clamp(1.0 - loyalty - (s.notoriety / 200), 0, 0.8);
      var casualtyRate3 = (opts.combatIntensity || 0.7) * 0.25;
      var casualties3 = _applyCasualties(s, units, casualtyRate3, opts);
      _pushEvent(s, 'use:coup', '政变·反叛主力战力 ' + Math.round(coupStrength) + '·哗变风险 ' + Math.round(mutinyRisk * 100) + '%·伤亡 ' + casualties3.total, {
        coupStrength: coupStrength, mutinyRisk: mutinyRisk, casualties: casualties3
      });
      result.coupStrength = coupStrength;
      result.mutinyRisk = mutinyRisk;
      result.casualties = casualties3;
      // 政变·僭越风险爆顶
      s.notoriety = _clamp(s.notoriety + 30, 0, 200); // arch-ok
    }
    else if (scenario === 'feud') {
      // 私斗·与 NPC 家族械斗
      var opponentStrength = opts.opponentStrength || (avgScore * totalCount * 0.5);
      var myStrength = avgScore * totalCount;
      var win = myStrength > opponentStrength * (0.8 + Math.random() * 0.4);
      var casualtyRate4 = (opts.combatIntensity || 0.4) * 0.20;
      var casualties4 = _applyCasualties(s, units, casualtyRate4, opts);
      _pushEvent(s, 'use:feud', '私斗·我方战力 ' + Math.round(myStrength) + ' vs 对方 ' + Math.round(opponentStrength) + '·' + (win ? '胜' : '败') + '·伤亡 ' + casualties4.total, {
        myStrength: myStrength, opponentStrength: opponentStrength, win: win, casualties: casualties4
      });
      result.myStrength = myStrength;
      result.opponentStrength = opponentStrength;
      result.win = win;
      result.casualties = casualties4;
      // 私斗·小幅增加恶名
      s.notoriety = _clamp(s.notoriety + 5, 0, 200); // arch-ok
    }

    // 复算月维护（伤亡致减员）
    _recomputeMonthly(s);
    return result;
  }

  // ════════════════════════════════════════════════════════════
  //  §11 僭越风险（SubTask 20.11 · 超阈值触发朝廷调查/言官弹劾/问罪）
  // ════════════════════════════════════════════════════════════
  function _evaluateYueYue(s, opts) {
    opts = opts || {};
    var totalCount = _getTotalCount(s);
    var level = 'none';
    if (totalCount >= YUEYUE_THRESHOLDS.critical) level = 'critical';
    else if (totalCount >= YUEYUE_THRESHOLDS.serious) level = 'serious';
    else if (totalCount >= YUEYUE_THRESHOLDS.warning) level = 'warning';

    var prevLevel = s.yueyueLevel || 'none';
    s.yueyueLevel = level; // arch-ok

    // 恶名累计（warning +2/月·serious +5/月·critical +10/月）
    var notorietyGain = 0;
    if (level === 'warning') notorietyGain = 2;
    else if (level === 'serious') notorietyGain = 5;
    else if (level === 'critical') notorietyGain = 10;
    if (notorietyGain > 0) {
      s.notoriety = _clamp((s.notoriety || 0) + notorietyGain, 0, 200); // arch-ok
    }

    // 等级跃升·触发朝廷反应
    var levelUp = _levelOrder(level) > _levelOrder(prevLevel);
    var actions = [];
    if (level === 'warning') {
      actions.push({ kind: 'whisper', label: '言官风闻', detail: '朝野风闻玩家蓄养私兵' });
    } else if (level === 'serious') {
      actions.push({ kind: 'investigate', label: '朝廷调查', detail: '朝廷差人查核私军规模' });
      actions.push({ kind: 'impeach', label: '言官弹劾', detail: '言官上章弹劾拥兵自重' });
    } else if (level === 'critical') {
      actions.push({ kind: 'punish', label: '朝廷问罪', detail: '朝廷下诏问罪·限期裁撤' });
      actions.push({ kind: 'suppression', label: '调兵讨伐', detail: '若不裁撤·朝廷调兵讨伐' });
    }

    // 触发朝廷调查事件链（沿用 tm-corruption-engine.js 的 _charInvestigations 路径·跨朝代通用）
    if (levelUp && (level === 'serious' || level === 'critical')) {
      _triggerCourtInvestigation(s, level, totalCount);
    }

    if (!opts.silent) {
      _pushEvent(s, 'yueyue', '僭越风险等级 ' + level + '·私军 ' + totalCount + ' 人·恶名 ' + s.notoriety, {
        level: level, prevLevel: prevLevel, totalCount: totalCount, notoriety: s.notoriety, actions: actions
      });
    }

    return {
      level: level,
      prevLevel: prevLevel,
      levelUp: levelUp,
      totalCount: totalCount,
      notoriety: s.notoriety,
      actions: actions
    };
  }

  function _levelOrder(l) {
    return l === 'none' ? 0 : l === 'warning' ? 1 : l === 'serious' ? 2 : l === 'critical' ? 3 : 0;
  }

  function _triggerCourtInvestigation(s, level, totalCount) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      if (!GM._charInvestigations) GM._charInvestigations = []; // arch-ok
      var playerName = _getPlayerName();
      GM._charInvestigations.push({ // arch-ok
        target: playerName,
        startTurn: _curTurn(),
        returnTurn: _curTurn() + (level === 'critical' ? 2 : 4),
        status: 'pending',
        reason: '蓄养私军 ' + totalCount + ' 人·僭越' + (level === 'critical' ? '·问罪' : '·调查'),
        severity: level
      });
    } catch (_) {}
  }

  function checkYueYue() {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '私军账本未就绪' };
    return { ok: true, yueyue: _evaluateYueYue(s, {}) };
  }

  function getYueYueLevel() {
    var s = _getState();
    if (!s) return 'none';
    return s.yueyueLevel || 'none';
  }

  // ════════════════════════════════════════════════════════════
  //  §12 战斗单位模型（SubTask 20.12 · 沿用 tm-military.js 战力公式）
  // ════════════════════════════════════════════════════════════
  // 战力评分公式（与 tm-military.js 同源）:
  //   score = combatMul × (0.5 + morale/200) × (0.5 + training/200) × (0.5 + equipment/200) × 100
  function computeBattleScore(unit) {
    if (!unit) return 0;
    var morale = (typeof unit.morale === 'number') ? unit.morale : 50;
    var training = (typeof unit.training === 'number') ? unit.training : 50;
    var equipment = (typeof unit.equipment === 'number') ? unit.equipment : 50;
    var combatMul = (typeof unit.combatMul === 'number') ? unit.combatMul : 1.0;
    var moraleMod = 0.5 + morale / 200;          // 0.5 - 1.0
    var trainMod = 0.5 + training / 200;          // 0.5 - 1.0
    var equipMod = 0.5 + equipment / 200;         // 0.5 - 1.0
    return Math.round(combatMul * moraleMod * trainMod * equipMod * 100);
  }

  // ════════════════════════════════════════════════════════════
  //  §13 御案"私军"面板（SubTask 20.13 · 朝代中立）
  // ════════════════════════════════════════════════════════════
  function renderPanel() {
    var s = _getState();
    if (!s) return '<div class="pa-panel-empty">私军账本未就绪</div>';
    var totalCount = _getTotalCount(s);
    var yueyue = s.yueyueLevel || 'none';
    var yueyueLabel = yueyue === 'none' ? '无' :
                      yueyue === 'warning' ? '风闻' :
                      yueyue === 'serious' ? '弹劾' :
                      yueyue === 'critical' ? '问罪' : '—';

    var h = '<div class="pa-panel" id="paPanel">';
    h += '<div class="pa-section"><div class="pa-section-title">私 军 · 概 览</div>';
    h += '<div class="pa-row"><span>总 兵 力</span><span class="pa-val">' + totalCount + ' 人</span></div>';
    h += '<div class="pa-row"><span>单 位 数</span><span class="pa-val">' + (s.units || []).length + ' 队</span></div>';
    h += '<div class="pa-row"><span>月 耗 银</span><span class="pa-val">' + (s.monthlyCost || 0) + ' 两</span></div>';
    h += '<div class="pa-row"><span>月 耗 粮</span><span class="pa-val">' + (s.monthlyGrain || 0) + ' 斤</span></div>';
    h += '<div class="pa-row"><span>僭 越</span><span class="pa-val' + (yueyue !== 'none' ? ' pa-warn' : '') + '">' + yueyueLabel + '</span></div>';
    h += '<div class="pa-row"><span>恶 名</span><span class="pa-val' + ((s.notoriety || 0) > 30 ? ' pa-warn' : '') + '">' + (s.notoriety || 0) + '</span></div>';
    if (s.fiscalPressure) {
      h += '<div class="pa-row pa-warn-box"><span>财 政 压 力</span><span>规模超限·入不敷出</span></div>';
    }
    h += '</div>';

    if (Array.isArray(s.units) && s.units.length) {
      h += '<div class="pa-section"><div class="pa-section-title">私 军 · 编 制</div>';
      s.units.forEach(function (u) {
        if (!u) return;
        var score = computeBattleScore(u);
        h += '<div class="pa-unit">';
        h += '<div class="pa-unit-head"><span>' + (u.typeLabel || u.type) + ' · ' + (u.sourceLabel || u.source || '') + '</span><span class="pa-val">' + u.count + ' 人 · 战力 ' + score + '</span></div>';
        h += '<div class="pa-unit-stats">';
        h += '<span>训练 ' + (u.training || 0) + '</span>';
        h += '<span>装备 ' + (u.equipment || 0) + '</span>';
        h += '<span>士气 ' + (u.morale || 0) + '</span>';
        h += '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    if (Array.isArray(s.events) && s.events.length) {
      var recent = s.events.slice(-5);
      h += '<div class="pa-section"><div class="pa-section-title">近 事</div>';
      recent.forEach(function (e) {
        if (!e) return;
        h += '<div class="pa-row"><span class="pa-ev-kind">' + (e.kind || '') + '</span><span class="pa-ev-summary">' + (e.summary || '') + '</span></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  // ════════════════════════════════════════════════════════════
  //  内部辅助函数
  // ════════════════════════════════════════════════════════════
  function _findUnit(s, unitId) {
    for (var i = 0; i < s.units.length; i++) {
      if (s.units[i] && s.units[i].id === unitId) return s.units[i];
    }
    return null;
  }

  function _getTotalCount(s) {
    var n = 0;
    if (!s || !Array.isArray(s.units)) return 0;
    for (var i = 0; i < s.units.length; i++) {
      var u = s.units[i];
      if (u && u.count > 0) n += u.count;
    }
    return n;
  }

  // 扣玩家银钱·主路径走 TM.PlayerEconomy.spend·降级直减 P.playerInfo.playerEconomy.cash
  function _spendPlayerCash(cost, reason) {
    // 1) 主路径·TM.PlayerEconomy.spend
    try {
      if (global.TM && global.TM.PlayerEconomy &&
          typeof global.TM.PlayerEconomy.spend === 'function') {
        var r = global.TM.PlayerEconomy.spend(cost, reason);
        if (r && r.ok) return { ok: true, cash: r.cash };
        if (r && r.ok === false) return { ok: false, cash: r.cash };
      }
    } catch (_) {}
    // 2) 降级·直减 P.playerInfo.playerEconomy.cash
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!P.playerInfo.playerEconomy) P.playerInfo.playerEconomy = { cash: 0 }; // arch-ok
        var pe = P.playerInfo.playerEconomy;
        if (typeof pe.cash !== 'number') pe.cash = 0;
        if (pe.cash < cost) return { ok: false, cash: pe.cash };
        pe.cash -= cost; // arch-ok
        return { ok: true, cash: pe.cash };
      }
    } catch (_) {}
    // 3) 缺席·免扣（mock 友好）
    return { ok: true, cash: null };
  }

  // 时间推进（与 tm-player-interaction.js 同款）
  function _advanceTime(hours) {
    if (!hours || hours <= 0) return { turnAdvanced: false };
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return { turnAdvanced: false };
      var pi = P.playerInfo;
      if (typeof pi._timeUsedThisTurn !== 'number') pi._timeUsedThisTurn = 0; // arch-ok
      pi._timeUsedThisTurn += hours; // arch-ok
      if (pi._timeUsedThisTurn >= _TIME_PER_TURN) {
        pi._timeUsedThisTurn -= _TIME_PER_TURN; // arch-ok
        try {
          if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') {
            GM.turn += 1; // arch-ok
            return { turnAdvanced: true, turn: GM.turn };
          }
        } catch (_) {}
        return { turnAdvanced: true };
      }
      return { turnAdvanced: false };
    } catch (_) {}
    return { turnAdvanced: false };
  }

  // 伤亡应用·按单位 count 比例减员·士气下降
  function _applyCasualties(s, units, rate, opts) {
    var total = 0;
    var byUnit = [];
    for (var i = 0; i < units.length; i++) {
      var u = units[i].unit;
      var loss = Math.floor(u.count * rate * (0.7 + Math.random() * 0.6));
      loss = Math.max(0, Math.min(u.count, loss));
      u.count = Math.max(0, u.count - loss); // arch-ok (unit count)
      u.morale = _clamp((u.morale || 0) - Math.floor(loss / Math.max(1, u.count + loss) * 20), 0, 100); // arch-ok
      total += loss;
      byUnit.push({ id: u.id, loss: loss, count: u.count });
    }
    return { total: total, byUnit: byUnit };
  }

  // LLM 调用·备用（招募名将 / 训练叙事·缺席降级·非主流程必需）
  function _callLLM(prompt) {
    try {
      if (typeof global.callAI === 'function') return global.callAI(prompt);
    } catch (_) {}
    try {
      if (typeof callLLM === 'function') return callLLM(prompt);
    } catch (_) {}
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §3 API 入口
  // ════════════════════════════════════════════════════════════
  function init() {
    var s = _ensureState();
    return !!s;
  }

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  function getUnits() {
    var s = _getState();
    if (!s || !Array.isArray(s.units)) return [];
    return JSON.parse(JSON.stringify(s.units));
  }

  function getUnit(unitId) {
    var s = _getState();
    if (!s) return null;
    var u = _findUnit(s, unitId);
    return u ? JSON.parse(JSON.stringify(u)) : null;
  }

  function getTotalCount() {
    var s = _getState();
    return _getTotalCount(s);
  }

  function getMonthlyCost() {
    var s = _getState();
    return s ? (s.monthlyCost || 0) : 0;
  }

  function listUnitTypes() {
    return Object.keys(UNIT_TYPES).map(function (k) {
      var d = UNIT_TYPES[k];
      return { id: d.id, label: d.label, tag: d.tag, hint: d.hint,
               baseCost: d.baseCost, baseTrain: d.baseTrain, combatMul: d.combatMul };
    });
  }

  function listRecruitSources() {
    return Object.keys(RECRUIT_SOURCES).map(function (k) {
      var d = RECRUIT_SOURCES[k];
      return { id: d.id, label: d.label, sourceMul: d.sourceMul, hint: d.hint };
    });
  }

  function listEquipmentTypes() {
    return Object.keys(EQUIPMENT_TYPES).map(function (k) {
      var d = EQUIPMENT_TYPES[k];
      return { id: d.id, label: d.label, costPerUnit: d.costPerUnit, equipBoost: d.equipBoost, hint: d.hint };
    });
  }

  // 月度 tick·复用 monthlyMaintenance
  function tick(ctx) {
    return monthlyMaintenance(ctx || {});
  }

  // ════════════════════════════════════════════════════════════
  //  §14 导出命名空间
  // ════════════════════════════════════════════════════════════
  var ns = {
    KIND_TAG: KIND_TAG,
    UNIT_TYPES: UNIT_TYPES,
    RECRUIT_SOURCES: RECRUIT_SOURCES,
    EQUIPMENT_TYPES: EQUIPMENT_TYPES,
    USAGE_SCENARIOS: USAGE_SCENARIOS,
    YUEYUE_THRESHOLDS: YUEYUE_THRESHOLDS,

    init: init,
    getState: getState,
    getUnits: getUnits,
    getUnit: getUnit,
    getTotalCount: getTotalCount,
    getMonthlyCost: getMonthlyCost,

    recruit: recruit,
    monthlyMaintenance: monthlyMaintenance,
    train: train,
    equip: equip,

    useForEscort: useForEscort,
    useForSelfDefense: useForSelfDefense,
    useForCoup: useForCoup,
    useForPrivateFeud: useForPrivateFeud,

    checkYueYue: checkYueYue,
    getYueYueLevel: getYueYueLevel,
    tick: tick,

    computeBattleScore: computeBattleScore,
    listUnitTypes: listUnitTypes,
    listRecruitSources: listRecruitSources,
    listEquipmentTypes: listEquipmentTypes,
    renderPanel: renderPanel,

    // 暴露内部函数（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _getState: _getState,
    _findUnit: _findUnit,
    _getTotalCount: _getTotalCount,
    _evaluateYueYue: _evaluateYueYue,
    _recomputeMonthly: _recomputeMonthly,
    _applyCasualties: _applyCasualties,
    _classify: _classify,
    _costWithScale: _costWithScale,
    _spendPlayerCash: _spendPlayerCash,
    _callLLM: _callLLM
  };

  // 双路径挂载：浏览器走 window.TM.PlayerPrivateArmy；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerPrivateArmy = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
