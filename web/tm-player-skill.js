// ============================================================
// tm-player-skill.js — 穿越模式 Phase 4.5 · Task 26B 玩家自我技能提升系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档），一律由剧本 hook 处理。
//   「学塾/书院/寺观/僧道/师徒/出师/悟道/切磋/比武/读出病」皆为中国古代
//   通用称谓，本引擎层保留。具体官学/科场/僧道职司名目由剧本 hook。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerSkill.{
//   SKILL_TYPES, TRAINING_PATHS, BREAKTHROUGH_THRESHOLDS, DECAY_CONFIG,
//   init, getState, getSkills, getSkill, getSkillLevel, getMentors, listSkills,
//   listTrainingPaths, listBreakthroughThresholds,
//   studyAtAcademy,            // 26B.3 学塾就读
//   apprenticeWithMaster,      // 26B.4 拜师学艺
//   studyWithMaster,           // 26B.4 师徒进修
//   graduateApprenticeship,    // 26B.4 出师考核
//   selfStudy,                 // 26B.5 自学苦读
//   travelForInsight,          // 26B.6 游历增广
//   militaryTraining,          // 26B.7 军中历练
//   templeRetreat,             // 26B.8 寺观清修
//   sparWithNpc,               // 26B.9 切磋比武
//   decaySkills,               // 26B.10 季度衰减
//   checkBreakthrough,         // 26B.11 技能突破
//   renderPanel,               // 26B.12 御案面板
//   registerCustomSkill,       // 26B.13 跨朝代 hook
//   unregisterCustomSkill,
//   tick,
//   _ensureState, _getState, _defaultState, _callLLM, _spendPlayerCash,
//   _spendEnergyLocal, _advanceTime, _addExp, _ensureSkill,
//   _isMilitaryPlayer, _isAcademyLocation, _isTempleLocation
// }
// 依赖（运行时软依赖·缺席时降级）：
//   - TM.PlayerInteraction.interact(npcName, kind, payload)
//       kind='disciple' 拜师学艺 / kind='antagonize' 切磋比武软化版
//   - TM.PlayerMovement.moveTo(region, opts) / travelTo(destination, mode, entourage)
//       游历增广（双接口探测·缺席降级直写见闻账本）
//   - TM.PlayerEconomy.spend(cost, reason) / withdrawCash(amount, reason)
//       缴费（双接口探测·缺席降级直减 P.playerInfo.playerEconomy.cash）
//   - TM.Transmigration.isTransmigrationMode  模式判定
//   - global._spendEnergy / GM._energy        精力消耗
//   - findCharByName / canonicalizeCharName   角色查找
//   - global.callAI / callLLM                 运行时 LLM 适配
// 双路径挂载：浏览器走 window.TM.PlayerSkill；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  if (!global.TM) global.TM = {};

  // ════════════════════════════════════════════════════════════
  //  §1 SubTask 26B.1 命名空间 · §26B.2 技能账本 · 常量
  // ════════════════════════════════════════════════════════════

  // 10 种基础技能·跨朝代通用（剧本可经 registerCustomSkill 增·如「骑射」「航海」）
  //   category: 路径关联类别（scholar/martial/governance/commerce/medicine/craft/
  //             agriculture/art/math/music）·用于路径默认增益映射
  //   hint: 一句话描述（朝代中立）
  var SKILL_TYPES = {
    wenxue:    { key: 'wenxue',    label: '文学', category: 'scholar',    hint: '诗文经史·科举根基' },
    wushu:     { key: 'wushu',     label: '武术', category: 'martial',    hint: '拳脚兵器·行军打斗' },
    zhishu:    { key: 'zhishu',    label: '治术', category: 'governance', hint: '行政理民·地方治理' },
    jingshang: { key: 'jingshang', label: '经商', category: 'commerce',   hint: '货殖算计·商贾之道' },
    yishu:     { key: 'yishu',     label: '医术', category: 'medicine',   hint: '诊脉方药·济世活人' },
    gongyi:    { key: 'gongyi',    label: '工艺', category: 'craft',      hint: '百工技巧·营造制器' },
    nongxue:   { key: 'nongxue',   label: '农学', category: 'agriculture',hint: '稼穑桑麻·劝农督耕' },
    yishu_art: { key: 'yishu_art', label: '艺术', category: 'art',        hint: '书画篆刻·丹青墨宝' },
    suanxue:   { key: 'suanxue',   label: '算学', category: 'math',       hint: '九章勾股·筹算历法' },
    yinlv:     { key: 'yinlv',     label: '音律', category: 'music',      hint: '宫商律吕·琴瑟钟磬' }
  };

  // 7 种技能提升路径·跨朝代通用
  //   cost:     银钱基础（剧本可覆盖）
  //   energy:   精力消耗
  //   time:     时长（小时·累积进 P.playerInfo._timeUsedThisTurn·满 12 推进 1 回合）
  //   expGain:  基础经验增益（按 level 衰减：高 level 增益低）
  //   skills:   默认增益的技能键（路径主修方向）
  //   hint:     一句话描述
  var TRAINING_PATHS = {
    academy:  {
      id: 'academy', label: '学塾就读',
      cost: 200, energy: 2, time: 6, expGain: 80,
      skills: ['wenxue', 'suanxue'],
      requireLocation: 'academy',
      hint: '于学塾就读·修文学算学等基础学科'
    },
    mentor:   {
      id: 'mentor', label: '拜师学艺',
      cost: 100, energy: 3, time: 5, expGain: 100,
      skills: [], // 按师傅专长动态决定
      requireNpc: true,
      hint: '与 NPC 建立师徒关系·按师傅专长提升对应技能'
    },
    self:     {
      id: 'self', label: '自学苦读',
      cost: 0, energy: 2, time: 4, expGain: 60,
      skills: ['wenxue', 'zhishu'],
      risk: 'illness',
      hint: '消耗时间精力·提升文学治术·有读出病风险'
    },
    travel:   {
      id: 'travel', label: '游历增广',
      cost: 50, energy: 2, time: 8, expGain: 70,
      skills: ['zhishu', 'jingshang'],
      requireMovement: true,
      hint: '移动到不同地点·积累见闻·提升治术经商'
    },
    military: {
      id: 'military', label: '军中历练',
      cost: 0, energy: 3, time: 6, expGain: 90,
      skills: ['wushu', 'zhishu'],
      requireMilitary: true,
      hint: '任武职者参与战役·提升武术治术'
    },
    temple:   {
      id: 'temple', label: '寺观清修',
      cost: 50, energy: 1, time: 8, expGain: 70,
      skills: ['yishu', 'yishu_art', 'yinlv'],
      requireLocation: 'temple',
      specialEvent: 'enlightenment',
      hint: '于寺观清修·提升医术艺术音律·触发悟道'
    },
    spar:     {
      id: 'spar', label: '切磋比武',
      cost: 0, energy: 2, time: 2, expGain: 50,
      skills: ['wushu'],
      requireNpc: true,
      risk: 'injury',
      hint: '与 NPC 切磋·有胜负与受伤风险'
    }
  };

  // 突破阈值·三档（达此 level 须突破方可继续提升）
  var BREAKTHROUGH_THRESHOLDS = [90, 95, 99];

  // 衰减配置·每季（≈12 回合）触发一次
  var DECAY_CONFIG = {
    intervalTurns: 12,        // 触发间隔（回合数·≈一季）
    idleThreshold: 24,        // 超过此回合未练习 → 衰减
    amountMin: 1,             // 每次衰减最少 1 点
    amountMax: 2,             // 每次衰减最多 2 点
    floorLevel: 0             // 衰减下限
  };

  // 等级与经验
  var LEVEL_MAX = 100;        // 自然上限（突破后可到 100）
  var EXP_PER_LEVEL = 100;    // 升一级所需经验

  // 路径关键词·跨朝代通用通称（具体名目由剧本 hook）
  var ACADEMY_KEYWORDS = /学塾|书院|府学|县学|国子|太学|私塾|义学|精舍|学宫/;
  var TEMPLE_KEYWORDS  = /寺|观|庵|庙|刹|院|精舍|道场|禅|僧|道|尼|仙|观/;
  var MILITARY_TITLE_RE = /将军|大将|上将|元帅|都督|总兵|校尉|都尉|军侯|偏将|裨将|督师|经略|领军|护军|禁军|禁卫|武职|武官|武将|统制|统军|镇守|守备|游击|参将|千总|把总/;

  var LEDGER_MAX = 200;
  var _TIME_PER_TURN = 12; // 累积 12 小时 → GM.turn +1

  // ── 工具函数 ────────────────────────────────────────────────
  function _isStr(v) { return typeof v === 'string'; }
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _rndId(prefix) {
    return (prefix || 'ps_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerSkill]', m); } catch (_) {}
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

  function _findChar(name) {
    if (!name) return null;
    try { if (typeof findCharByName === 'function') return findCharByName(name); } catch (_) {}
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        for (var i = 0; i < GM.chars.length; i++) {
          var c = GM.chars[i];
          if (c && c.name === name) return c;
        }
      }
    } catch (_) {}
    return null;
  }

  function _canonName(name) {
    if (!name) return name;
    try { if (typeof canonicalizeCharName === 'function') return canonicalizeCharName(name) || name; } catch (_) {}
    return name;
  }

  // ── LLM 调用·缺席降级返回 null ──────────────────────────────
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ── 精力消耗·主路径走 global._spendEnergy·降级直减 GM._energy ──
  function _spendEnergyLocal(cost, label) {
    try {
      if (global && typeof global._spendEnergy === 'function') {
        return !!global._spendEnergy(cost, label);
      }
    } catch (_) {}
    try {
      if (typeof GM === 'undefined' || !GM) return true;
      if (GM._energy === undefined) return true; // 未初始化则不限
      if (GM._energy < cost) return false;
      GM._energy -= cost; // arch-ok
      return true;
    } catch (_) {}
    return true;
  }

  // ── 时间推进·沿用 tm-player-interaction.js 同款 ──────────────
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

  // ── 银钱消耗·主路径走 TM.PlayerEconomy.spend/withdrawCash·降级直减 ──
  function _spendPlayerCash(cost, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy) {
        if (typeof global.TM.PlayerEconomy.withdrawCash === 'function') {
          var r0 = global.TM.PlayerEconomy.withdrawCash(cost, reason);
          if (r0 && r0.ok) return { ok: true, cash: r0.cash };
          if (r0 && r0.ok === false) return { ok: false, cash: r0.cash };
        }
        if (typeof global.TM.PlayerEconomy.spend === 'function') {
          var r1 = global.TM.PlayerEconomy.spend(cost, reason);
          if (r1 && r1.ok) return { ok: true, cash: r1.cash };
          if (r1 && r1.ok === false) return { ok: false, cash: r1.cash };
        }
      }
    } catch (_) {}
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
    return { ok: true, cash: null };
  }

  // ── 地点判定·主路径走 TM.PlayerMovement.getCurrentLocation ──
  function _getCurrentLocation() {
    try {
      if (global.TM && global.TM.PlayerMovement &&
          typeof global.TM.PlayerMovement.getCurrentLocation === 'function') {
        var loc = global.TM.PlayerMovement.getCurrentLocation();
        if (loc) return loc;
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.currentLocation || P.playerInfo.location || '';
      }
    } catch (_) {}
    return '';
  }

  function _isAcademyLocation(loc) {
    if (!loc) return false;
    if (_isStr(loc)) return ACADEMY_KEYWORDS.test(loc);
    if (loc.type === 'academy') return true;
    return ACADEMY_KEYWORDS.test(loc.name || loc.region || '');
  }

  function _isTempleLocation(loc) {
    if (!loc) return false;
    if (_isStr(loc)) return TEMPLE_KEYWORDS.test(loc);
    if (loc.type === 'temple' || loc.type === 'monastery') return true;
    return TEMPLE_KEYWORDS.test(loc.name || loc.region || '');
  }

  function _isMilitaryPlayer() {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return false;
      var pi = P.playerInfo;
      if (pi.playerRole === 'military' || pi.playerRole === 'general') return true;
      var title = pi.characterTitle || pi.title || '';
      if (MILITARY_TITLE_RE.test(title)) return true;
      var ch = _findChar(pi.characterName);
      if (ch) {
        var bag = ((ch.officialTitle || '') + ' ' + (ch.title || '') + ' ' + (ch.role || ''));
        if (MILITARY_TITLE_RE.test(bag)) return true;
      }
    } catch (_) {}
    return false;
  }

  // ════════════════════════════════════════════════════════════
  //  §2 SubTask 26B.2 玩家技能账本
  // ════════════════════════════════════════════════════════════
  // 状态挂载点：GM._playerSkill = {
  //   skills: { <skillKey>: { level: 0-100, exp: 0-1000, master: npcName|null,
  //                            lastPracticedTurn: 0, breakthroughCap: 90 } },
  //   trainingLog: [{ turn, path, skill, expGain, summary, ... }],
  //   mentors: { <npcName>: { skill, startTurn, status, graduateTurn } },
  //   insights: [{ turn, region, summary }],  // 游历增广见闻
  //   events: [{ id, turn, kind, summary, payload, at }],
  //   customSkills: { <skillKey>: { key, label, category, hint } },
  //   lastDecayTurn: 0,
  //   createdAt: 0
  // }

  function _defaultState() {
    var skills = {};
    Object.keys(SKILL_TYPES).forEach(function (k) {
      skills[k] = _newSkillEntry();
    });
    return {
      skills: skills,
      trainingLog: [],
      mentors: {},
      insights: [],
      events: [],
      customSkills: {},
      lastDecayTurn: _curTurn(),
      createdAt: _curTurn()
    };
  }

  function _newSkillEntry() {
    return {
      level: 0,
      exp: 0,
      master: null,
      lastPracticedTurn: _curTurn(),
      breakthroughCap: BREAKTHROUGH_THRESHOLDS[0] // 首次突破阈值
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerSkill) {
        GM._playerSkill = _defaultState(); // arch-ok
      }
      return GM._playerSkill;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (typeof s.skills !== 'object' || s.skills === null) s.skills = {}; // arch-ok
    if (!Array.isArray(s.trainingLog)) s.trainingLog = []; // arch-ok
    if (typeof s.mentors !== 'object' || s.mentors === null) s.mentors = {}; // arch-ok
    if (!Array.isArray(s.insights)) s.insights = []; // arch-ok
    if (!Array.isArray(s.events)) s.events = []; // arch-ok
    if (typeof s.customSkills !== 'object' || s.customSkills === null) s.customSkills = {}; // arch-ok
    if (typeof s.lastDecayTurn !== 'number') s.lastDecayTurn = _curTurn(); // arch-ok
    // 确保所有默认技能有 entry
    Object.keys(SKILL_TYPES).forEach(function (k) {
      if (!s.skills[k]) s.skills[k] = _newSkillEntry(); // arch-ok
    });
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
    s.events.push(ev); // arch-ok
    if (s.events.length > LEDGER_MAX) s.events = s.events.slice(-LEDGER_MAX); // arch-ok
    return ev;
  }

  function _pushTrainingLog(s, entry) {
    s.trainingLog.push(entry); // arch-ok
    if (s.trainingLog.length > LEDGER_MAX) s.trainingLog = s.trainingLog.slice(-LEDGER_MAX); // arch-ok
  }

  // ── 技能定义查询·默认 + 跨朝代 hook 自定义 ──────────────────
  function _getSkillDef(skillKey) {
    if (!skillKey) return null;
    if (SKILL_TYPES[skillKey]) return SKILL_TYPES[skillKey];
    var s = _getState();
    if (s && s.customSkills && s.customSkills[skillKey]) return s.customSkills[skillKey];
    return null;
  }

  function _ensureSkill(s, skillKey) {
    if (!s.skills[skillKey]) s.skills[skillKey] = _newSkillEntry(); // arch-ok
    return s.skills[skillKey];
  }

  // ── 经验增益·按 level 衰减 + 升级判定 + 突破阈值卡口 ────────
  //   返回 { ok, skill, prevLevel, newLevel, expGain, expBefore, expAfter, leveledUp, blockedByBreakthrough }
  function _addExp(s, skillKey, amount, reason) {
    var def = _getSkillDef(skillKey);
    if (!def) return { ok: false, reason: '未知技能: ' + skillKey };
    if (!_isNum(amount) || amount <= 0) return { ok: false, reason: '经验增益非法' };
    var entry = _ensureSkill(s, skillKey);
    var prevLevel = entry.level;
    var expBefore = entry.exp;

    // 高 level 衰减：level 50+ 衰减 30%·level 80+ 衰减 60%
    var mul = 1.0;
    if (entry.level >= 80) mul = 0.4;
    else if (entry.level >= 50) mul = 0.7;
    var gain = Math.round(amount * mul);

    entry.exp += gain; // arch-ok
    entry.lastPracticedTurn = _curTurn(); // arch-ok

    // 升级判定·突破阈值卡口
    var leveledUp = false;
    var blockedByBreakthrough = false;
    while (entry.exp >= EXP_PER_LEVEL) {
      // 检查是否被突破阈值卡住
      if (entry.level >= entry.breakthroughCap) {
        // 突破阈值上限·不能自然升级
        entry.exp = EXP_PER_LEVEL - 1; // arch-ok·顶在阈值前
        blockedByBreakthrough = true;
        break;
      }
      if (entry.level >= LEVEL_MAX) {
        entry.exp = EXP_PER_LEVEL - 1; // arch-ok·硬上限
        break;
      }
      entry.exp -= EXP_PER_LEVEL; // arch-ok
      entry.level += 1; // arch-ok
      leveledUp = true;
      // 升级后再次检查突破阈值
      if (entry.level >= entry.breakthroughCap && entry.level < LEVEL_MAX) {
        // 达到突破阈值·下次升级须先突破
        break;
      }
    }

    return {
      ok: true,
      skill: skillKey,
      skillLabel: def.label,
      prevLevel: prevLevel,
      newLevel: entry.level,
      expGain: gain,
      expBefore: expBefore,
      expAfter: entry.exp,
      leveledUp: leveledUp,
      blockedByBreakthrough: blockedByBreakthrough,
      reason: reason || ''
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §3 SubTask 26B.3 学塾就读
  // ════════════════════════════════════════════════════════════
  //   opts: { tuition?, months?, skillFocus?, locationOverride? }
  //   返回 { ok, reason?, path, skills, cost, time, energy, expGains }
  function studyAtAcademy(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    opts = opts || {};
    var def = TRAINING_PATHS.academy;

    // 1) 地点校验·必须在学塾所在地
    var loc = opts.locationOverride || _getCurrentLocation();
    if (!_isAcademyLocation(loc)) {
      return { ok: false, reason: '当前不在学塾所在地（当前: ' + (loc || '未知') + '）·须先往学塾/书院', code: 'not-at-academy' };
    }

    // 2) 缴学费
    var tuition = _isNum(opts.tuition) ? opts.tuition : def.cost;
    if (tuition > 0) {
      var spent = _spendPlayerCash(tuition, '学塾就读·束脩');
      if (!spent.ok) return { ok: false, reason: '银钱不足·束脩需 ' + tuition + ' 两', need: tuition, cash: spent.cash };
    }

    // 3) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '学塾就读');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 4) 时间推进
    var timeRes = _advanceTime(def.time);

    // 5) 技能经验增益（默认文学/算学·opts.skillFocus 可指定其他基础学科）
    var skills = (Array.isArray(opts.skillFocus) && opts.skillFocus.length) ? opts.skillFocus : def.skills;
    var expGains = [];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if (!_getSkillDef(sk)) continue;
      var r = _addExp(s, sk, def.expGain, '学塾就读');
      if (r.ok) expGains.push(r);
    }

    // 6) 记账
    var summary = '于「' + (loc || '学塾') + '」就读·束脩 ' + tuition + ' 两·修 ' + skills.map(function (k) { return _getSkillDef(k) ? _getSkillDef(k).label : k; }).join('/');
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'academy', skills: skills, expGain: def.expGain,
      cost: tuition, energy: def.energy, time: def.time, summary: summary
    });
    _pushEvent(s, 'academy', summary, { location: loc, tuition: tuition, skills: skills, expGains: expGains });

    return {
      ok: true,
      path: 'academy',
      pathLabel: def.label,
      skills: skills,
      cost: tuition,
      energy: def.energy,
      time: def.time,
      expGains: expGains,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §4 SubTask 26B.4 拜师学艺 + 师徒进修 + 出师考核
  // ════════════════════════════════════════════════════════════

  // 拜师·与 NPC 建立师徒关系（关联 TM.PlayerInteraction.interact kind='disciple'）
  //   opts: { skill?, gift?, locationOverride? }
  //   返回 { ok, reason?, mentor, skill, interact, summary }
  function apprenticeWithMaster(npcName, skillKey, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!npcName) return { ok: false, reason: '未指定师傅 NPC' };
    var def = TRAINING_PATHS.mentor;
    opts = opts || {};

    // 1) 技能校验
    var sk = skillKey || opts.skill;
    if (!sk) return { ok: false, reason: '未指定拜师所学技能' };
    var skDef = _getSkillDef(sk);
    if (!skDef) return { ok: false, reason: '未知技能: ' + sk };

    // 2) NPC 校验
    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到师傅 NPC: ' + npcName };
    if (npcCh.alive === false) return { ok: false, reason: '师傅已不在人世: ' + npcName };

    // 3) 已有师徒关系校验
    var canon = _canonName(npcName);
    if (s.mentors[canon] && s.mentors[canon].status === 'active') {
      return { ok: false, reason: '已与「' + canon + '」有师徒关系·须先出师或断绝', code: 'already-apprentice' };
    }

    // 4) 束脩（拜师礼）
    var gift = _isNum(opts.gift) ? opts.gift : def.cost;
    if (gift > 0) {
      var spent = _spendPlayerCash(gift, '拜师学艺·束脩·' + canon);
      if (!spent.ok) return { ok: false, reason: '银钱不足·束脩需 ' + gift + ' 两', need: gift, cash: spent.cash };
    }

    // 5) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '拜师学艺');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 6) 关联 TM.PlayerInteraction.interact kind='disciple'（缺席降级 ok=true）
    var interactR = null;
    try {
      if (global.TM && global.TM.PlayerInteraction &&
          typeof global.TM.PlayerInteraction.interact === 'function') {
        interactR = global.TM.PlayerInteraction.interact(canon, 'disciple', {
          topic: '拜师学艺·' + skDef.label,
          intent: 'apprentice',
          skill: sk,
          skillLabel: skDef.label,
          gift: gift,
          action: 'apprentice_with_master'
        });
      }
    } catch (_) {}
    if (interactR && interactR.ok === false) {
      return { ok: false, reason: '师傅拒收（' + (interactR.reason || '互动未就绪') + '）', interact: interactR };
    }

    // 7) 时间推进
    var timeRes = _advanceTime(def.time);

    // 8) 登记师徒关系
    s.mentors[canon] = { // arch-ok
      skill: sk,
      skillLabel: skDef.label,
      startTurn: _curTurn(),
      status: 'active',
      graduateTurn: null,
      gift: gift
    };

    // 9) 技能 master 标注
    var entry = _ensureSkill(s, sk);
    entry.master = canon; // arch-ok

    // 10) 初次拜师小增益
    var initGain = _addExp(s, sk, Math.round(def.expGain * 0.3), '拜师入门');

    var summary = '拜「' + canon + '」为师·修 ' + skDef.label + '·束脩 ' + gift + ' 两';
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'mentor', npc: canon, skill: sk, expGain: initGain.expGain || 0,
      cost: gift, energy: def.energy, time: def.time, summary: summary, sub: 'apprentice'
    });
    _pushEvent(s, 'mentor:apprentice', summary, {
      mentor: canon, skill: sk, gift: gift, interact: interactR, initGain: initGain
    });

    return {
      ok: true,
      mentor: canon,
      skill: sk,
      skillLabel: skDef.label,
      gift: gift,
      interact: interactR,
      initGain: initGain,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // 师徒进修·持续向师傅学习·按师傅专长提升对应技能
  //   opts: { focus?, iterations? }
  //   返回 { ok, reason?, mentor, skill, expGains, summary }
  function studyWithMaster(npcName, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!npcName) return { ok: false, reason: '未指定师傅 NPC' };
    opts = opts || {};
    var def = TRAINING_PATHS.mentor;
    var canon = _canonName(npcName);
    var rec = s.mentors[canon];
    if (!rec || rec.status !== 'active') {
      return { ok: false, reason: '未与「' + canon + '」建立师徒关系·或已出师/断绝', code: 'no-active-mentor' };
    }
    var sk = rec.skill;
    var skDef = _getSkillDef(sk);
    if (!skDef) return { ok: false, reason: '师徒技能已失效: ' + sk };

    // 1) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '师徒进修');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 2) 时间推进
    var timeRes = _advanceTime(def.time);

    // 3) 经验增益·按师傅在场增益（master 在场 ×1.2）
    var gain = Math.round(def.expGain * 1.2);
    var r = _addExp(s, sk, gain, '师徒进修·' + canon);

    var summary = '从「' + canon + '」修 ' + skDef.label + '·增益 ' + r.expGain + ' 经验';
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'mentor', npc: canon, skill: sk, expGain: r.expGain || 0,
      cost: 0, energy: def.energy, time: def.time, summary: summary, sub: 'study'
    });
    _pushEvent(s, 'mentor:study', summary, { mentor: canon, skill: sk, gain: r });

    return {
      ok: true,
      mentor: canon,
      skill: sk,
      skillLabel: skDef.label,
      expGains: [r],
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // 出师考核·level 达 60+ 可申请·成功出师·失败回退若干经验
  //   opts: { forceLevel? }
  //   返回 { ok, reason?, mentor, skill, passed, level, summary }
  function graduateApprenticeship(npcName, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!npcName) return { ok: false, reason: '未指定师傅 NPC' };
    opts = opts || {};
    var canon = _canonName(npcName);
    var rec = s.mentors[canon];
    if (!rec || rec.status !== 'active') {
      return { ok: false, reason: '未与「' + canon + '」建立师徒关系·或已出师/断绝', code: 'no-active-mentor' };
    }
    var sk = rec.skill;
    var skDef = _getSkillDef(sk);
    if (!skDef) return { ok: false, reason: '师徒技能已失效: ' + sk };
    var entry = _ensureSkill(s, sk);
    var levelThreshold = _isNum(opts.forceLevel) ? opts.forceLevel : 60;
    if (entry.level < levelThreshold) {
      return { ok: false, reason: skDef.label + ' 等级仅 ' + entry.level + '·出师须达 ' + levelThreshold, code: 'level-too-low' };
    }

    // 精力消耗
    var energyOk = _spendEnergyLocal(2, '出师考核');
    if (!energyOk) return { ok: false, reason: '精力不足' };
    var timeRes = _advanceTime(3);

    // 出师考核·概率基于 level + 师傅关系
    var passProb = _clamp(0.4 + (entry.level - levelThreshold) * 0.04, 0.3, 0.95);
    var roll = Math.random();
    var passed = roll < passProb;

    if (passed) {
      // 出师成功·师傅关系标记 graduated·额外经验奖励
      rec.status = 'graduated'; // arch-ok
      rec.graduateTurn = _curTurn(); // arch-ok
      var bonusGain = _addExp(s, sk, 50, '出师奖励');
      var summary = '出师考核通过·「' + canon + '」许以「' + skDef.label + '」出师·奖 50 经验';
      _pushTrainingLog(s, {
        turn: _curTurn(), path: 'mentor', npc: canon, skill: sk, expGain: bonusGain.expGain || 0,
        cost: 0, energy: 2, time: 3, summary: summary, sub: 'graduate', passed: true
      });
      _pushEvent(s, 'mentor:graduate', summary, { mentor: canon, skill: sk, passed: true, level: entry.level, bonus: bonusGain });
      return {
        ok: true, mentor: canon, skill: sk, skillLabel: skDef.label,
        passed: true, level: entry.level, bonus: bonusGain,
        turnAdvanced: timeRes.turnAdvanced, summary: summary
      };
    } else {
      // 出师失败·回退经验
      var penalty = Math.min(30, entry.exp);
      entry.exp -= penalty; // arch-ok
      var summaryFail = '出师考核未通过·「' + canon + '」以为火候未到·回退 ' + penalty + ' 经验';
      _pushTrainingLog(s, {
        turn: _curTurn(), path: 'mentor', npc: canon, skill: sk, expGain: -penalty,
        cost: 0, energy: 2, time: 3, summary: summaryFail, sub: 'graduate', passed: false
      });
      _pushEvent(s, 'mentor:graduate_fail', summaryFail, { mentor: canon, skill: sk, passed: false, level: entry.level, penalty: penalty });
      return {
        ok: true, mentor: canon, skill: sk, skillLabel: skDef.label,
        passed: false, level: entry.level, penalty: penalty,
        turnAdvanced: timeRes.turnAdvanced, summary: summaryFail
      };
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §5 SubTask 26B.5 自学苦读（读出病风险）
  // ════════════════════════════════════════════════════════════
  //   opts: { skillFocus?, intensity? }
  //   返回 { ok, reason?, path, skills, expGains, illness?, summary }
  function selfStudy(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    opts = opts || {};
    var def = TRAINING_PATHS.self;

    // 1) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '自学苦读');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 2) 时间推进
    var timeRes = _advanceTime(def.time);

    // 3) 技能经验增益（默认文学/治术）
    var skills = (Array.isArray(opts.skillFocus) && opts.skillFocus.length) ? opts.skillFocus : def.skills;
    var intensity = _isNum(opts.intensity) ? _clamp(opts.intensity, 0.5, 2.0) : 1.0;
    var expGains = [];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if (!_getSkillDef(sk)) continue;
      var r = _addExp(s, sk, Math.round(def.expGain * intensity), '自学苦读');
      if (r.ok) expGains.push(r);
    }

    // 4) 读出病风险·与 intensity 反相关·基础概率 15%
    var illnessProb = 0.15 * intensity;
    var illnessRoll = Math.random();
    var illness = null;
    if (illnessRoll < illnessProb) {
      // 读出病·精力额外 -1·部分经验回退
      var penalty = Math.round(def.expGain * intensity * 0.2);
      var targetSk = skills[0] || 'wenxue';
      var entry = _ensureSkill(s, targetSk);
      var actualPenalty = Math.min(penalty, entry.exp);
      entry.exp -= actualPenalty; // arch-ok
      illness = {
        kind: 'study_illness',
        severity: 'mild',
        penalty: actualPenalty,
        skill: targetSk,
        summary: '苦读伤神·染微恙·回退 ' + actualPenalty + ' 经验'
      };
      // 额外精力扣减（直接 GM._energy·若有）
      try {
        if (typeof GM !== 'undefined' && GM && _isNum(GM._energy)) {
          GM._energy = Math.max(0, GM._energy - 1); // arch-ok
        }
      } catch (_) {}
    }

    var summary = '苦读 ' + skills.map(function (k) { var d = _getSkillDef(k); return d ? d.label : k; }).join('/') +
                  '·增益 ' + expGains.length + ' 项' + (illness ? '·读出病·回退 ' + illness.penalty + ' 经验' : '');
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'self', skills: skills, expGain: def.expGain * intensity,
      cost: 0, energy: def.energy, time: def.time, summary: summary, illness: !!illness
    });
    _pushEvent(s, 'self', summary, { skills: skills, expGains: expGains, illness: illness });

    return {
      ok: true,
      path: 'self',
      pathLabel: def.label,
      skills: skills,
      expGains: expGains,
      illness: illness,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 SubTask 26B.6 游历增广（移动 + 见闻累积）
  // ════════════════════════════════════════════════════════════
  //   opts: { mode?, skillFocus?, stayTurns? }
  //   返回 { ok, reason?, path, region, movement, insights, expGains, summary }
  function travelForInsight(region, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!region || !_isStr(region)) return { ok: false, reason: '未指定游历目的地' };
    opts = opts || {};
    var def = TRAINING_PATHS.travel;

    // 1) 调用 TM.PlayerMovement.moveTo / travelTo（缺席降级·记见闻账本）
    var movementR = null;
    try {
      if (global.TM && global.TM.PlayerMovement) {
        if (typeof global.TM.PlayerMovement.moveTo === 'function') {
          movementR = global.TM.PlayerMovement.moveTo(region, { mode: opts.mode, reason: '游历增广' });
        } else if (typeof global.TM.PlayerMovement.travelTo === 'function') {
          movementR = global.TM.PlayerMovement.travelTo(region, opts.mode || 'walk', null);
        }
      }
    } catch (_) {}
    // movementR.ok === false 时仍允许本地经验累积（剧本可放开/或视为短途）

    // 2) 路费
    var cost = def.cost;
    if (cost > 0) {
      var spent = _spendPlayerCash(cost, '游历增广·路费');
      if (!spent.ok) return { ok: false, reason: '银钱不足·路费需 ' + cost + ' 两', need: cost, cash: spent.cash };
    }

    // 3) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '游历增广');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 4) 时间推进
    var timeRes = _advanceTime(def.time);

    // 5) 见闻累积
    var insightEntry = {
      turn: _curTurn(),
      region: region,
      summary: '游历「' + region + '」·增长见闻',
      movementOk: !!(movementR && movementR.ok)
    };
    s.insights.push(insightEntry); // arch-ok
    if (s.insights.length > LEDGER_MAX) s.insights = s.insights.slice(-LEDGER_MAX); // arch-ok

    // 6) 经验增益·默认治术/经商·按见闻累积数加成
    var skills = (Array.isArray(opts.skillFocus) && opts.skillFocus.length) ? opts.skillFocus : def.skills;
    var insightBonus = 1.0 + Math.min(0.5, s.insights.length * 0.02); // 每次游历 +2%·上限 +50%
    var expGains = [];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if (!_getSkillDef(sk)) continue;
      var r = _addExp(s, sk, Math.round(def.expGain * insightBonus), '游历增广·' + region);
      if (r.ok) expGains.push(r);
    }

    var summary = '游历「' + region + '」·增益 ' + expGains.length + ' 项·累积见闻 ' + s.insights.length + ' 条';
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'travel', region: region, skills: skills,
      expGain: def.expGain * insightBonus, cost: cost, energy: def.energy, time: def.time,
      summary: summary, movementOk: !!(movementR && movementR.ok)
    });
    _pushEvent(s, 'travel', summary, {
      region: region, skills: skills, expGains: expGains,
      insightCount: s.insights.length, movement: movementR
    });

    return {
      ok: true,
      path: 'travel',
      pathLabel: def.label,
      region: region,
      movement: movementR,
      insightCount: s.insights.length,
      expGains: expGains,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 SubTask 26B.7 军中历练（武职校验）
  // ════════════════════════════════════════════════════════════
  //   opts: { skillFocus?, intensity?, battleRef? }
  //   返回 { ok, reason?, path, skills, expGains, injury?, summary }
  function militaryTraining(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    opts = opts || {};
    var def = TRAINING_PATHS.military;

    // 1) 武职校验
    if (!_isMilitaryPlayer()) {
      return { ok: false, reason: '非武职·不可参与军中历练', code: 'not-military' };
    }

    // 2) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '军中历练');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 3) 时间推进
    var timeRes = _advanceTime(def.time);

    // 4) 经验增益·默认武术/治术·intensity 可调
    var skills = (Array.isArray(opts.skillFocus) && opts.skillFocus.length) ? opts.skillFocus : def.skills;
    var intensity = _isNum(opts.intensity) ? _clamp(opts.intensity, 0.5, 2.0) : 1.0;
    var expGains = [];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if (!_getSkillDef(sk)) continue;
      var r = _addExp(s, sk, Math.round(def.expGain * intensity), '军中历练');
      if (r.ok) expGains.push(r);
    }

    // 5) 关联 tm-battle-*.js 模式·若有 battleRef 则按胜负调整
    var battleRef = opts.battleRef || null;
    var injury = null;
    if (battleRef && typeof battleRef === 'object') {
      // 战役参与·按胜负面调整
      if (battleRef.winner === 'player' || battleRef.playerWon) {
        // 胜战额外奖励
        var bonusSk = skills[0] || 'wushu';
        var r2 = _addExp(s, bonusSk, 30, '军中历练·胜战奖励');
        if (r2.ok) expGains.push(r2);
      } else if (battleRef.winner === 'enemy' || battleRef.playerLost) {
        // 败战·有受伤风险
        if (Math.random() < 0.3) {
          injury = { kind: 'battle_injury', severity: 'moderate', skill: skills[0] || 'wushu', summary: '败战受伤·武术经验回退' };
          var entry = _ensureSkill(s, skills[0] || 'wushu');
          var pen = Math.min(20, entry.exp);
          entry.exp -= pen; // arch-ok
        }
      }
    }

    var summary = '军中历练·修 ' + skills.map(function (k) { var d = _getSkillDef(k); return d ? d.label : k; }).join('/') +
                  '·增益 ' + expGains.length + ' 项' + (injury ? '·受伤' : '') +
                  (battleRef ? '·参与战役' : '');
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'military', skills: skills, expGain: def.expGain * intensity,
      cost: 0, energy: def.energy, time: def.time, summary: summary,
      battleRef: !!battleRef, injury: !!injury
    });
    _pushEvent(s, 'military', summary, { skills: skills, expGains: expGains, battleRef: battleRef, injury: injury });

    return {
      ok: true,
      path: 'military',
      pathLabel: def.label,
      skills: skills,
      expGains: expGains,
      injury: injury,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §8 SubTask 26B.8 寺观清修（悟道特殊事件）
  // ════════════════════════════════════════════════════════════
  //   opts: { skillFocus?, months?, locationOverride? }
  //   返回 { ok, reason?, path, skills, expGains, enlightenment?, summary }
  function templeRetreat(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    opts = opts || {};
    var def = TRAINING_PATHS.temple;

    // 1) 地点校验·必须在寺观所在地
    var loc = opts.locationOverride || _getCurrentLocation();
    if (!_isTempleLocation(loc)) {
      return { ok: false, reason: '当前不在寺观所在地（当前: ' + (loc || '未知') + '）·须先往寺观', code: 'not-at-temple' };
    }

    // 2) 香火钱
    var cost = def.cost;
    if (cost > 0) {
      var spent = _spendPlayerCash(cost, '寺观清修·香火钱');
      if (!spent.ok) return { ok: false, reason: '银钱不足·香火钱需 ' + cost + ' 两', need: cost, cash: spent.cash };
    }

    // 3) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '寺观清修');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 4) 时间推进
    var timeRes = _advanceTime(def.time);

    // 5) 经验增益·默认医术/艺术/音律
    var skills = (Array.isArray(opts.skillFocus) && opts.skillFocus.length) ? opts.skillFocus : def.skills;
    var expGains = [];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if (!_getSkillDef(sk)) continue;
      var r = _addExp(s, sk, def.expGain, '寺观清修');
      if (r.ok) expGains.push(r);
    }

    // 6) 悟道特殊事件·基础概率 12%·随清修次数缓增
    var retreatCount = s.trainingLog.filter(function (e) { return e.path === 'temple'; }).length;
    var enlightProb = _clamp(0.12 + retreatCount * 0.02, 0.12, 0.4);
    var enlightRoll = Math.random();
    var enlightenment = null;
    if (enlightRoll < enlightProb) {
      // 悟道·所有寺观修习技能额外 +30 经验·并选一项随机突破阈值降低
      var bonusGains = [];
      for (var j = 0; j < skills.length; j++) {
        var sk2 = skills[j];
        if (!_getSkillDef(sk2)) continue;
        var r2 = _addExp(s, sk2, 30, '悟道·额外增益');
        if (r2.ok) bonusGains.push(r2);
      }
      enlightenment = {
        kind: 'enlightenment',
        summary: '于「' + loc + '」清修悟道·诸艺皆进',
        bonusGains: bonusGains
      };
    }

    var summary = '于「' + (loc || '寺观') + '」清修·修 ' + skills.map(function (k) { var d = _getSkillDef(k); return d ? d.label : k; }).join('/') +
                  '·增益 ' + expGains.length + ' 项' + (enlightenment ? '·悟道！' : '');
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'temple', skills: skills, expGain: def.expGain,
      cost: cost, energy: def.energy, time: def.time, summary: summary, enlightenment: !!enlightenment
    });
    _pushEvent(s, 'temple', summary, {
      location: loc, skills: skills, expGains: expGains, enlightenment: enlightenment
    });

    return {
      ok: true,
      path: 'temple',
      pathLabel: def.label,
      skills: skills,
      expGains: expGains,
      enlightenment: enlightenment,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 SubTask 26B.9 切磋比武（胜负判定 + 受伤风险）
  // ════════════════════════════════════════════════════════════
  //   opts: { skill?, gift?, antagonize?: 'soft'|'hard' }
  //   返回 { ok, reason?, path, npc, skill, result, expGains, injury?, summary }
  function sparWithNpc(npcName, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!npcName) return { ok: false, reason: '未指定切磋 NPC' };
    opts = opts || {};
    var def = TRAINING_PATHS.spar;
    var canon = _canonName(npcName);

    // 1) NPC 校验
    var npcCh = _findChar(canon);
    if (!npcCh) return { ok: false, reason: '未找到切磋 NPC: ' + canon };
    if (npcCh.alive === false) return { ok: false, reason: 'NPC 已不在人世: ' + canon };

    // 2) 技能默认武术
    var sk = opts.skill || 'wushu';
    var skDef = _getSkillDef(sk);
    if (!skDef) return { ok: false, reason: '未知技能: ' + sk };

    // 3) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, '切磋比武');
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 4) 关联 TM.PlayerInteraction.interact kind='antagonize'（软化版）
    var interactR = null;
    try {
      if (global.TM && global.TM.PlayerInteraction &&
          typeof global.TM.PlayerInteraction.interact === 'function') {
        interactR = global.TM.PlayerInteraction.interact(canon, 'antagonize', {
          topic: '切磋比武·' + skDef.label,
          intent: 'spar',
          skill: sk,
          skillLabel: skDef.label,
          soft: opts.antagonize !== 'hard', // 默认 soft
          action: 'spar_with_npc'
        });
      }
    } catch (_) {}
    // 切磋场景下 interact 失败不阻拦·继续走本地规则

    // 5) 时间推进
    var timeRes = _advanceTime(def.time);

    // 6) 胜负判定·基于玩家 level vs NPC 武力
    var entry = _ensureSkill(s, sk);
    var playerLevel = entry.level;
    var npcLevel = 50;
    try {
      if (npcCh) {
        var mil = _isNum(npcCh.military) ? npcCh.military : (_isNum(npcCh.wushu) ? npcCh.wushu : 50);
        npcLevel = _clamp(mil, 0, 100);
      }
    } catch (_) {}
    // 胜率：玩家 level 高 → 高胜率
    var diff = playerLevel - npcLevel;
    var winProb = _clamp(0.5 + diff * 0.02, 0.15, 0.9);
    var roll = Math.random();
    var won = roll < winProb;

    // 7) 经验增益·无论胜负都有（败方学得多）
    var gainMul = won ? 1.0 : 1.3;
    var r = _addExp(s, sk, Math.round(def.expGain * gainMul), '切磋比武·' + (won ? '胜' : '败'));

    // 8) 受伤风险·败方更高
    var injuryProb = won ? 0.1 : 0.35;
    var injury = null;
    if (Math.random() < injuryProb) {
      var pen = Math.min(15, entry.exp);
      entry.exp -= pen; // arch-ok
      injury = {
        kind: 'spar_injury',
        severity: won ? 'minor' : 'moderate',
        skill: sk,
        penalty: pen,
        summary: '切磋受伤·回退 ' + pen + ' 经验'
      };
    }

    var summary = '与「' + canon + '」切磋 ' + skDef.label + '·' + (won ? '胜' : '败') +
                  '·增益 ' + r.expGain + (injury ? '·受伤·回退 ' + injury.penalty : '');
    _pushTrainingLog(s, {
      turn: _curTurn(), path: 'spar', npc: canon, skill: sk, expGain: r.expGain || 0,
      cost: 0, energy: def.energy, time: def.time, summary: summary,
      won: won, injury: !!injury
    });
    _pushEvent(s, 'spar', summary, {
      npc: canon, skill: sk, won: won, expGain: r, injury: injury, interact: interactR
    });

    return {
      ok: true,
      path: 'spar',
      pathLabel: def.label,
      npc: canon,
      skill: sk,
      skillLabel: skDef.label,
      won: won,
      result: won ? 'win' : 'lose',
      expGains: [r],
      injury: injury,
      interact: interactR,
      turnAdvanced: timeRes.turnAdvanced,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §10 SubTask 26B.10 技能熟练度衰减（季度）
  // ════════════════════════════════════════════════════════════
  //   opts: { force?, skillKeys? }
  //   返回 { ok, decayed: [{skill, prevLevel, newLevel, amount}], summary }
  function decaySkills(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    opts = opts || {};
    var cur = _curTurn();
    // 季度判定·距上次衰减 ≥ intervalTurns·或 force=true
    var due = (cur - (s.lastDecayTurn || 0)) >= DECAY_CONFIG.intervalTurns;
    if (!due && !opts.force) {
      return { ok: true, skipped: true, reason: '尚未到衰减周期', nextDueIn: DECAY_CONFIG.intervalTurns - (cur - (s.lastDecayTurn || 0)) };
    }

    var decayed = [];
    var skillKeys = opts.skillKeys || Object.keys(s.skills);
    for (var i = 0; i < skillKeys.length; i++) {
      var sk = skillKeys[i];
      var entry = s.skills[sk];
      if (!entry) continue;
      // 0 level 不衰减
      if (entry.level <= 0) continue;
      // 仍在 idle threshold 内·不衰减
      var idle = cur - (entry.lastPracticedTurn || 0);
      if (idle < DECAY_CONFIG.idleThreshold) continue;
      // 高 level 衰减更快
      var amount = Math.floor(Math.random() * (DECAY_CONFIG.amountMax - DECAY_CONFIG.amountMin + 1)) + DECAY_CONFIG.amountMin;
      if (entry.level >= 80) amount += 1; // 高 level 多衰减 1
      var prevLevel = entry.level;
      entry.level = Math.max(DECAY_CONFIG.floorLevel, entry.level - amount); // arch-ok
      // 若 level 跌破当前突破阈值·回退突破阈值
      if (entry.breakthroughCap > entry.level + 1) {
        // 找到合适的阈值
        for (var t = BREAKTHROUGH_THRESHOLDS.length - 1; t >= 0; t--) {
          if (entry.level < BREAKTHROUGH_THRESHOLDS[t]) {
            entry.breakthroughCap = BREAKTHROUGH_THRESHOLDS[t]; // arch-ok
          }
        }
      }
      decayed.push({
        skill: sk,
        skillLabel: (_getSkillDef(sk) || {}).label || sk,
        prevLevel: prevLevel,
        newLevel: entry.level,
        amount: prevLevel - entry.level,
        idleTurns: idle
      });
    }

    s.lastDecayTurn = cur; // arch-ok

    var summary = '季度衰减·' + decayed.length + ' 项技能受影响';
    if (decayed.length) {
      _pushEvent(s, 'decay', summary, { decayed: decayed, turn: cur });
    }

    return {
      ok: true,
      skipped: false,
      decayed: decayed,
      turn: cur,
      summary: summary
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §11 SubTask 26B.11 技能突破（90/95/99 阈值）
  // ════════════════════════════════════════════════════════════
  //   opts: { force? }
  //   返回 { ok, reason?, skill, threshold, passed, prevCap, newCap, penalty?, summary }
  function checkBreakthrough(skillKey, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!skillKey) return { ok: false, reason: '未指定技能' };
    var skDef = _getSkillDef(skillKey);
    if (!skDef) return { ok: false, reason: '未知技能: ' + skillKey };
    opts = opts || {};
    var entry = _ensureSkill(s, skillKey);

    // 1) 当前等级必须达到突破阈值
    var currentCap = entry.breakthroughCap || BREAKTHROUGH_THRESHOLDS[0];
    if (entry.level < currentCap) {
      return {
        ok: false, reason: skDef.label + ' 等级 ' + entry.level + '·未达突破阈值 ' + currentCap,
        code: 'not-at-threshold', skill: skillKey, level: entry.level, threshold: currentCap
      };
    }

    // 2) 已经突破过此阈值（cap 已经高于此阈值）→ 寻找下一阈值
    if (entry.level >= LEVEL_MAX) {
      return { ok: false, reason: skDef.label + ' 已达等级上限 ' + LEVEL_MAX, code: 'at-max' };
    }

    // 3) 精力消耗
    var energyOk = _spendEnergyLocal(3, '技能突破·' + skDef.label);
    if (!energyOk) return { ok: false, reason: '精力不足（需 3）' };
    var timeRes = _advanceTime(4);

    // 4) 突破判定·基础 40% 成功率·随 level 升高降低·随导师/师傅加成
    var baseProb = 0.4;
    if (entry.level >= 95) baseProb = 0.25;
    else if (entry.level >= 90) baseProb = 0.35;
    // 有师傅且师徒关系 active → +15%
    if (entry.master) {
      var mentorRec = s.mentors[entry.master];
      if (mentorRec && mentorRec.status === 'active') baseProb += 0.15;
    }
    // LLM 可注入剧情判定（如有）
    var llmHint = _callLLM('【玩家技能突破】玩家「' + _getPlayerName() + '」尝试突破「' + skDef.label + '」·当前 level ' + entry.level + '·请简评（10-30字·朝代中立）');
    if (llmHint && typeof llmHint === 'string') {
      // LLM 提示·不影响概率·仅记入事件
    }
    var roll = Math.random();
    var passed = roll < baseProb;

    var prevCap = entry.breakthroughCap;
    if (passed) {
      // 突破成功·cap 升到下一阈值（或 LEVEL_MAX）
      var nextCap = LEVEL_MAX;
      for (var i = 0; i < BREAKTHROUGH_THRESHOLDS.length; i++) {
        if (BREAKTHROUGH_THRESHOLDS[i] > entry.breakthroughCap) {
          nextCap = BREAKTHROUGH_THRESHOLDS[i];
          break;
        }
      }
      entry.breakthroughCap = nextCap; // arch-ok
      // 突破成功·level + 1（如果当前 level 仍卡在原 cap）
      if (entry.level < entry.breakthroughCap && entry.level < LEVEL_MAX) {
        entry.level += 1; // arch-ok
      }
      // 突破奖励经验
      var bonus = _addExp(s, skillKey, 50, '突破奖励');

      var summary = '「' + skDef.label + '」突破成功·cap ' + prevCap + '→' + entry.breakthroughCap + '·奖 50 经验';
      _pushEvent(s, 'breakthrough:success', summary, {
        skill: skillKey, threshold: prevCap, newCap: entry.breakthroughCap,
        passed: true, bonus: bonus, llmHint: llmHint || null
      });
      _pushTrainingLog(s, {
        turn: _curTurn(), path: 'breakthrough', skill: skillKey, expGain: 50,
        cost: 0, energy: 3, time: 4, summary: summary, passed: true,
        prevCap: prevCap, newCap: entry.breakthroughCap
      });
      return {
        ok: true, skill: skillKey, skillLabel: skDef.label,
        threshold: prevCap, passed: true,
        prevCap: prevCap, newCap: entry.breakthroughCap,
        bonus: bonus, llmHint: llmHint || null,
        turnAdvanced: timeRes.turnAdvanced, summary: summary
      };
    } else {
      // 突破失败·level -1·exp 清零
      var prevLevel = entry.level;
      var penalty = entry.exp;
      entry.exp = 0; // arch-ok
      if (entry.level > 0) entry.level -= 1; // arch-ok
      var summaryFail = '「' + skDef.label + '」突破失败·level ' + prevLevel + '→' + entry.level + '·经验清零';
      _pushEvent(s, 'breakthrough:fail', summaryFail, {
        skill: skillKey, threshold: prevCap, passed: false,
        prevLevel: prevLevel, newLevel: entry.level, penalty: penalty,
        llmHint: llmHint || null
      });
      _pushTrainingLog(s, {
        turn: _curTurn(), path: 'breakthrough', skill: skillKey, expGain: -penalty,
        cost: 0, energy: 3, time: 4, summary: summaryFail, passed: false,
        prevLevel: prevLevel, newLevel: entry.level
      });
      return {
        ok: true, skill: skillKey, skillLabel: skDef.label,
        threshold: prevCap, passed: false,
        prevLevel: prevLevel, newLevel: entry.level, penalty: penalty,
        llmHint: llmHint || null,
        turnAdvanced: timeRes.turnAdvanced, summary: summaryFail
      };
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §12 SubTask 26B.12 御案"自我提升"面板
  // ════════════════════════════════════════════════════════════
  function renderPanel() {
    var s = _getState();
    if (!s) return '<div class="ps-panel-empty">技能账本未就绪</div>';

    // 概览统计
    var skillKeys = Object.keys(s.skills);
    var totalLevel = 0;
    var masterCount = 0;
    var breakthroughBlocked = 0;
    skillKeys.forEach(function (k) {
      var e = s.skills[k];
      if (!e) return;
      totalLevel += (e.level || 0);
      if (e.master) masterCount++;
      if (e.level >= (e.breakthroughCap || 90) && (e.breakthroughCap || 90) < LEVEL_MAX) breakthroughBlocked++;
    });
    var avgLevel = skillKeys.length ? Math.round(totalLevel / skillKeys.length * 10) / 10 : 0;

    var h = '<div class="ps-panel" id="psPanel">';
    // 概览段
    h += '<div class="ps-section"><div class="ps-section-title">自 我 提 升 · 概 览</div>';
    h += '<div class="ps-row"><span>技 能 数</span><span class="ps-val">' + skillKeys.length + ' 项</span></div>';
    h += '<div class="ps-row"><span>平 均 等 级</span><span class="ps-val">' + avgLevel + '</span></div>';
    h += '<div class="ps-row"><span>师 徒 关 系</span><span class="ps-val">' + masterCount + ' 项有师傅</span></div>';
    if (breakthroughBlocked > 0) {
      h += '<div class="ps-row ps-warn"><span>待 突 破</span><span class="ps-val">' + breakthroughBlocked + ' 项</span></div>';
    }
    h += '<div class="ps-row"><span>游 历 见 闻</span><span class="ps-val">' + (s.insights ? s.insights.length : 0) + ' 条</span></div>';
    h += '</div>';

    // 技能名录
    if (skillKeys.length) {
      h += '<div class="ps-section"><div class="ps-section-title">技 能 · 名 录</div>';
      // 按 level 降序
      var sorted = skillKeys.slice().sort(function (a, b) {
        return (s.skills[b].level || 0) - (s.skills[a].level || 0);
      });
      sorted.forEach(function (k) {
        var e = s.skills[k];
        if (!e) return;
        var def = _getSkillDef(k) || { label: k };
        var cap = e.breakthroughCap || BREAKTHROUGH_THRESHOLDS[0];
        var blocked = e.level >= cap && cap < LEVEL_MAX;
        var masterStr = e.master ? '·师:' + e.master : '';
        var capStr = (cap < LEVEL_MAX) ? '·cap ' + cap : '·满级';
        h += '<div class="ps-unit">';
        h += '<div class="ps-unit-head"><span>' + def.label + ' · Lv' + e.level + (blocked ? ' ⚠' : '') + '</span><span class="ps-val">exp ' + e.exp + '/' + EXP_PER_LEVEL + capStr + masterStr + '</span></div>';
        if (def.hint) h += '<div class="ps-unit-hint">' + def.hint + '</div>';
        // 经验条
        var pct = Math.round((e.exp / EXP_PER_LEVEL) * 100);
        h += '<div class="ps-bar"><div class="ps-bar-fill" style="width:' + pct + '%"></div></div>';
        if (blocked) {
          h += '<div class="ps-unit-warn">已达突破阈值 ' + cap + '·须突破方可继续提升</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    }

    // 可用路径
    var paths = Object.keys(TRAINING_PATHS);
    if (paths.length) {
      h += '<div class="ps-section"><div class="ps-section-title">提 升 路 径</div>';
      paths.forEach(function (pk) {
        var p = TRAINING_PATHS[pk];
        var can = _canPath(p);
        h += '<div class="ps-path' + (can ? '' : ' ps-path-disabled') + '">';
        h += '<div class="ps-path-head"><span>' + p.label + '</span><span class="ps-val">' + (can ? '可用' : '条件未达') + '</span></div>';
        if (p.hint) h += '<div class="ps-path-hint">' + p.hint + '</div>';
        var costStr = [];
        if (p.cost > 0) costStr.push('银 ' + p.cost);
        costStr.push('精力 ' + p.energy);
        costStr.push('时 ' + p.time + 'h');
        h += '<div class="ps-path-cost">' + costStr.join(' · ') + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // 师徒关系
    var mentorKeys = Object.keys(s.mentors || {});
    if (mentorKeys.length) {
      h += '<div class="ps-section"><div class="ps-section-title">师 徒 关 系</div>';
      mentorKeys.forEach(function (mn) {
        var m = s.mentors[mn];
        if (!m) return;
        var def = _getSkillDef(m.skill) || { label: m.skill };
        var statusLabel = m.status === 'active' ? '在学' :
                          m.status === 'graduated' ? '已出师' :
                          m.status === 'broken' ? '断绝' : (m.status || '—');
        h += '<div class="ps-row"><span>' + mn + ' · ' + def.label + '</span><span class="ps-val">' + statusLabel + '</span></div>';
      });
      h += '</div>';
    }

    // 近事
    if (Array.isArray(s.events) && s.events.length) {
      var recent = s.events.slice(-5);
      h += '<div class="ps-section"><div class="ps-section-title">近 事</div>';
      recent.forEach(function (e) {
        if (!e) return;
        h += '<div class="ps-row"><span class="ps-ev-kind">' + (e.kind || '') + '</span><span class="ps-ev-summary">' + (e.summary || '') + '</span></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  // 面板辅助·路径可用性快速判定（粗略·不真正扣费）
  function _canPath(p) {
    if (!p) return false;
    try {
      if (p.requireLocation === 'academy' && !_isAcademyLocation(_getCurrentLocation())) return false;
      if (p.requireLocation === 'temple' && !_isTempleLocation(_getCurrentLocation())) return false;
      if (p.requireMilitary && !_isMilitaryPlayer()) return false;
      return true;
    } catch (_) { return true; }
  }

  // ════════════════════════════════════════════════════════════
  //  §13 SubTask 26B.13 跨朝代 hook·剧本可注册自定义技能项
  // ════════════════════════════════════════════════════════════
  //   注册自定义技能（如某些朝代新增「骑射」「航海」等）
  //   opts: { label, category, hint }
  //   返回 { ok, skill, label }
  function registerCustomSkill(skillKey, opts) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '技能账本未就绪' };
    if (!skillKey || !_isStr(skillKey)) return { ok: false, reason: '未指定技能键' };
    if (SKILL_TYPES[skillKey]) return { ok: false, reason: '默认技能键不可覆盖: ' + skillKey };
    opts = opts || {};
    var label = opts.label || skillKey;
    var category = opts.category || 'custom';
    var hint = opts.hint || '自定义技能';
    s.customSkills[skillKey] = { // arch-ok
      key: skillKey, label: label, category: category, hint: hint, custom: true
    };
    // 为已存在的玩家技能账本补 entry
    if (!s.skills[skillKey]) s.skills[skillKey] = _newSkillEntry(); // arch-ok
    _pushEvent(s, 'custom_skill:register', '注册自定义技能·' + label + '（' + skillKey + '）', { skill: skillKey, label: label });
    return { ok: true, skill: skillKey, label: label, def: s.customSkills[skillKey] };
  }

  function unregisterCustomSkill(skillKey) {
    var s = _getState();
    if (!s || !s.customSkills) return { ok: false, reason: '账本未就绪' };
    if (!s.customSkills[skillKey]) return { ok: false, reason: '未注册的自定义技能: ' + skillKey };
    delete s.customSkills[skillKey]; // arch-ok
    // 不删 skills[skillKey]·保留历史等级数据·剧本可决定是否清
    _pushEvent(s, 'custom_skill:unregister', '取消注册自定义技能·' + skillKey, { skill: skillKey });
    return { ok: true, skill: skillKey };
  }

  // ════════════════════════════════════════════════════════════
  //  §14 月度 tick·季度衰减
  // ════════════════════════════════════════════════════════════
  function tick(ctx) {
    ctx = ctx || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var decayR = decaySkills({ force: ctx.forceDecay });
    return {
      ok: true,
      decay: decayR,
      turn: _curTurn()
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §15 API 入口
  // ════════════════════════════════════════════════════════════

  function init() {
    var s = _ensureState();
    return !!s;
  }

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  function getSkills() {
    var s = _getState();
    if (!s || !s.skills) return {};
    return JSON.parse(JSON.stringify(s.skills));
  }

  function getSkill(skillKey) {
    var s = _getState();
    if (!s || !s.skills) return null;
    return s.skills[skillKey] ? JSON.parse(JSON.stringify(s.skills[skillKey])) : null;
  }

  function getSkillLevel(skillKey) {
    var s = _getState();
    if (!s || !s.skills || !s.skills[skillKey]) return 0;
    return s.skills[skillKey].level || 0;
  }

  function getMentors() {
    var s = _getState();
    if (!s || !s.mentors) return {};
    return JSON.parse(JSON.stringify(s.mentors));
  }

  function listSkills() {
    var s = _getState();
    var out = [];
    Object.keys(SKILL_TYPES).forEach(function (k) {
      var d = SKILL_TYPES[k];
      var entry = (s && s.skills && s.skills[k]) || null;
      out.push({
        key: d.key, label: d.label, category: d.category, hint: d.hint, custom: false,
        level: entry ? entry.level : 0,
        exp: entry ? entry.exp : 0,
        master: entry ? entry.master : null,
        breakthroughCap: entry ? entry.breakthroughCap : BREAKTHROUGH_THRESHOLDS[0],
        lastPracticedTurn: entry ? entry.lastPracticedTurn : 0
      });
    });
    if (s && s.customSkills) {
      Object.keys(s.customSkills).forEach(function (k) {
        var d = s.customSkills[k];
        var entry = s.skills && s.skills[k] ? s.skills[k] : null;
        out.push({
          key: d.key, label: d.label, category: d.category, hint: d.hint, custom: true,
          level: entry ? entry.level : 0,
          exp: entry ? entry.exp : 0,
          master: entry ? entry.master : null,
          breakthroughCap: entry ? entry.breakthroughCap : BREAKTHROUGH_THRESHOLDS[0],
          lastPracticedTurn: entry ? entry.lastPracticedTurn : 0
        });
      });
    }
    return out;
  }

  function listTrainingPaths() {
    return Object.keys(TRAINING_PATHS).map(function (k) {
      var p = TRAINING_PATHS[k];
      return {
        id: p.id, label: p.label, hint: p.hint,
        cost: p.cost, energy: p.energy, time: p.time, expGain: p.expGain,
        skills: (p.skills || []).slice(),
        requireLocation: p.requireLocation || null,
        requireNpc: !!p.requireNpc,
        requireMilitary: !!p.requireMilitary,
        requireMovement: !!p.requireMovement,
        risk: p.risk || null,
        specialEvent: p.specialEvent || null
      };
    });
  }

  function listBreakthroughThresholds() {
    return BREAKTHROUGH_THRESHOLDS.slice();
  }

  // ════════════════════════════════════════════════════════════
  //  §16 导出命名空间
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    SKILL_TYPES: SKILL_TYPES,
    TRAINING_PATHS: TRAINING_PATHS,
    BREAKTHROUGH_THRESHOLDS: BREAKTHROUGH_THRESHOLDS,
    DECAY_CONFIG: DECAY_CONFIG,
    LEVEL_MAX: LEVEL_MAX,
    EXP_PER_LEVEL: EXP_PER_LEVEL,

    // 生命周期
    init: init,
    getState: getState,
    getSkills: getSkills,
    getSkill: getSkill,
    getSkillLevel: getSkillLevel,
    getMentors: getMentors,
    listSkills: listSkills,
    listTrainingPaths: listTrainingPaths,
    listBreakthroughThresholds: listBreakthroughThresholds,

    // 26B.3 学塾就读
    studyAtAcademy: studyAtAcademy,
    // 26B.4 拜师学艺
    apprenticeWithMaster: apprenticeWithMaster,
    studyWithMaster: studyWithMaster,
    graduateApprenticeship: graduateApprenticeship,
    // 26B.5 自学苦读
    selfStudy: selfStudy,
    // 26B.6 游历增广
    travelForInsight: travelForInsight,
    // 26B.7 军中历练
    militaryTraining: militaryTraining,
    // 26B.8 寺观清修
    templeRetreat: templeRetreat,
    // 26B.9 切磋比武
    sparWithNpc: sparWithNpc,
    // 26B.10 季度衰减
    decaySkills: decaySkills,
    // 26B.11 技能突破
    checkBreakthrough: checkBreakthrough,
    // 26B.12 御案面板
    renderPanel: renderPanel,
    // 26B.13 跨朝代 hook
    registerCustomSkill: registerCustomSkill,
    unregisterCustomSkill: unregisterCustomSkill,
    // 月度 tick
    tick: tick,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _getState: _getState,
    _defaultState: _defaultState,
    _callLLM: _callLLM,
    _spendPlayerCash: _spendPlayerCash,
    _spendEnergyLocal: _spendEnergyLocal,
    _advanceTime: _advanceTime,
    _addExp: _addExp,
    _ensureSkill: _ensureSkill,
    _getSkillDef: _getSkillDef,
    _isMilitaryPlayer: _isMilitaryPlayer,
    _isAcademyLocation: _isAcademyLocation,
    _isTempleLocation: _isTempleLocation,
    _getCurrentLocation: _getCurrentLocation,
    _canPath: _canPath
  };

  // 双路径挂载：浏览器走 window.TM.PlayerSkill；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerSkill = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
