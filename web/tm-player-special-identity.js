// ============================================================
// tm-player-special-identity.js — 穿越模式 Phase 4.5 · Task 26C 9 类特殊身份路线
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档），一律由剧本 hook 处理。
//   太监路线用「内廷近侍 / 内廷掌印 / 批红近侍」等朝代中立表述；
//   「内廷缉事机构」替代任何朝代专属缉事专名。
//   「采女 / 御女 / 宝林 / 才人 / 嫔 / 妃」「致仕」「寺观」「漕运」「海贸」
//   「御赐官商」「御用匠人」是中国古代跨朝代通用称谓，本引擎层保留。
//   剧本可经 registerCustomIdentity hook 注入朝代专属身份（如军户/乐户/匠户等户籍）。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerSpecialIdentity.{
//   IDENTITY_KINDS, EUNUCH_RANKS, MAID_RANKS, COMMONER_PATHS, BANDIT_BRANCH,
//   INFANT_EVENTS, RETIRED_BRANCH, MONK_SERVICES, MERCHANT_TIERS, ARTISAN_TIERS,
//   init, getState, getCurrentIdentity, setCurrentIdentity,
//   getRoute, listActionsForRole, checkEvents, triggerEvent,
//   registerCustomIdentity, listCustomIdentities,
//   eunuchInit, eunuchAdvanceRank, eunuchClassifyFaction, eunuchTriggerQingliuBackfire,
//   maidInit, maidPromote, maidTriggerCourtIntrigue,
//   commonerInit, commonerChoosePath, commonerTriggerBaiyiQingxiang,
//   banditInit, banditOccupyMountain, banditAcceptAmnesty, banditLaunchRebellion,
//   infantInit, infantAutoGrow, infantTriggerProdigyOrMischievous,
//   retiredInit, retiredTriggerComeback, retiredTriggerPeacefulAging,
//   monkInit, monkPracticeService, monkTriggerSummonToCourt,
//   merchantInit, merchantCrossBorderTrade, merchantTriggerMagnate, merchantBestowCourtMerchant,
//   artisanInit, artisanTributeToCourt, artisanTriggerRoyalArtisan, artisanPetitionToPromulgate,
//   renderIdentityPanel,
//   _ensureState, _getState, _defaultState, _callLLM, _spendPlayerCash, _addPlayerCash,
//   _interactSoft, _kejuApplySoft, _tradeDispatchSoft, _techStartSoft, _techPetitionSoft,
//   _rebelLaunchSoft, _movementTravelSoft, _familyMarrySoft, _familyBirthSoft,
//   _chronicleSoft, _addEBSoft
// }
// 依赖（运行时软依赖·缺席时降级）：
//   - TM.Transmigration.isTransmigrationMode      模式判定
//   - TM.PlayerInteraction.interact               通用互动
//   - TM.PlayerTrade.dispatchTrade                商贾跨国贸易
//   - TM.PlayerTech.startResearch / petitionToPromulgate   匠人技艺研发/推广
//   - TM.PlayerFamily.marry / birthChild          婴儿/婚育挂接
//   - TM.PlayerKeju.applyForExam                  布衣应科考
//   - TM.PlayerRebel.launch                       盗贼造反分支
//   - GM._playerSpecialIdentity / GM.turn / P.playerInfo
//   - global.callAI / callLLM                     运行时 LLM 适配
// 双路径挂载：浏览器走 window.TM.PlayerSpecialIdentity；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  if (!global.TM) global.TM = {};

  // ════════════════════════════════════════════════════════════
  //  §1 SubTask 26C.1 命名空间 · 9 类身份常量 + 各路线专属常量
  // ════════════════════════════════════════════════════════════

  // 9 类特殊身份（与 playerRole 并列·剧本可经 registerCustomIdentity 扩展）
  //   每条路线都有自己的"成长曲线 / 专有动作 / 专有风险 / 晋升转线可能"
  var IDENTITY_KINDS = {
    eunuch:           { id: 'eunuch',           label: '太监',     desc: '净身入内廷·权力线与外朝紧张' },
    maid:             { id: 'maid',             label: '宫女',     desc: '内廷伺候主位·可晋升妃嫔' },
    commoner:         { id: 'commoner',         label: '布衣',     desc: '白身百姓·多出路可切换' },
    bandit:           { id: 'bandit',           label: '盗贼',     desc: '落草为寇·招安或造反' },
    infant:           { id: 'infant',           label: '婴儿',     desc: '0-3 岁·自动成长·由长辈决策' },
    retired_official: { id: 'retired_official', label: '退休官员', desc: '致仕顾问·可起复或颐养' },
    monk:             { id: 'monk',             label: '方外',     desc: '僧道清修·可入朝参俗务' },
    merchant:         { id: 'merchant',         label: '商贾',     desc: '跨国贸易·可获御赐官商' },
    artisan:          { id: 'artisan',          label: '匠人',     desc: '技艺传承·可上奏推广' }
  };

  // 太监路线·内廷权力线 4 阶（朝代中立表述·剧本可 hook 重命名）
  //   ATTEND     亲近君主（侍奉近侧·通消息）
  //   CONTROL    把持内廷（执掌内廷事务）
  //   SEAL       内廷掌印（掌御宝·承旨）
  //   REDBRUSH   批红近侍（代君主批红·权倾朝野）
  var EUNUCH_RANKS = {
    ATTEND:   { key: 'attend',   label: '亲近君主', power: 25, sovereignTrust: 30, outerTension: 10 },
    CONTROL:  { key: 'control',  label: '把持内廷', power: 55, sovereignTrust: 50, outerTension: 30 },
    SEAL:     { key: 'seal',     label: '内廷掌印', power: 80, sovereignTrust: 70, outerTension: 60 },
    REDBRUSH: { key: 'redbrush', label: '批红近侍', power: 100, sovereignTrust: 85, outerTension: 90 }
  };

  // 宫女晋升路径·6 阶（采女→御女→宝林→才人→嫔→妃·跨朝代通用嫔御等级）
  var MAID_RANKS = {
    CAINU:  { key: 'cainu',  label: '采女', favor: 5,  power: 2 },
    YUNU:   { key: 'yunu',   label: '御女', favor: 15, power: 5 },
    BAOLIN: { key: 'baolin', label: '宝林', favor: 30, power: 10 },
    CAIREN: { key: 'cairen', label: '才人', favor: 50, power: 20 },
    PIN:    { key: 'pin',    label: '嫔',   favor: 70, power: 40 },
    FEI:    { key: 'fei',    label: '妃',   favor: 90, power: 70 }
  };

  // 布衣路线·6 种出路选择
  var COMMONER_PATHS = {
    STUDY:   { key: 'study',   label: '读书考科举', nextRole: 'minister',   desc: '苦读经史·应科考出仕' },
    TRADE:   { key: 'trade',   label: '经商',       nextRole: 'merchant',  desc: '贩货求利·求富家业' },
    FARM:    { key: 'farm',    label: '务农',       nextRole: 'commoner',  desc: '耕读传家·守田度日' },
    ENLIST:  { key: 'enlist',  label: '投军',       nextRole: 'general',   desc: '投军立功·博个出身' },
    JIANGHU: { key: 'jianghu', label: '入江湖',     nextRole: 'custom',    desc: '习武游侠·浪迹江湖' },
    HERMIT:  { key: 'hermit',  label: '隐居',       nextRole: 'custom',    desc: '隐居山林·远离朝堂' }
  };

  // 盗贼路线·占山后两分支
  var BANDIT_BRANCH = {
    AMNESTY: { key: 'amnesty', label: '招安', nextRole: 'general',  desc: '受朝廷招安·转为武官' },
    REBEL:   { key: 'rebel',   label: '造反', nextRole: 'emperor',  desc: '举旗造反·成王败寇' }
  };

  // 婴儿路线事件
  var INFANT_EVENTS = {
    PRODIGY:     { key: 'prodigy',     label: '神童', learning: +12, intelligence: +8 },
    MISCHIEVOUS: { key: 'mischievous', label: '顽童', valor: +4,     discipline: -6 }
  };

  // 退休官员路线两分支
  var RETIRED_BRANCH = {
    COMEBACK:     { key: 'comeback',     label: '东山再起', nextRole: 'minister', desc: '朝廷起复·再登朝堂' },
    PEACEFUL_AGE: { key: 'peaceful_age', label: '颐养天年', nextRole: null,      desc: '在乡经营·安享晚年' }
  };

  // 方外路线·3 种世俗服务
  var MONK_SERVICES = {
    HEAL:    { key: 'heal',    label: '医病', merit: +6, fame: +4 },
    BLESS:   { key: 'bless',   label: '祈福', merit: +4, fame: +3 },
    PREACH:  { key: 'preach',  label: '讲法', merit: +8, fame: +6 }
  };

  // 商贾扩展路线·3 档（朝代中立·「御赐官商」替代朝代专属商爵名目）
  var MERCHANT_TIERS = {
    LOCAL:     { key: 'local',     label: '地方商',     capital: 1000,  tradeRange: 'local' },
    MAGNATE:   { key: 'magnate',   label: '巨贾行商',   capital: 8000,  tradeRange: 'cross_border' },
    COURT_BESTOWED: { key: 'court_bestowed', label: '御赐官商', capital: 20000, tradeRange: 'cross_border', permit: 'imperial' }
  };

  // 匠人扩展路线·3 档
  var ARTISAN_TIERS = {
    APPRENTICE: { key: 'apprentice', label: '匠徒',   skill: 20, fame: 0 },
    MASTER:     { key: 'master',     label: '匠师',   skill: 60, fame: 10 },
    ROYAL:      { key: 'royal',      label: '御用匠人', skill: 90, fame: 30, permit: 'imperial' }
  };

  // 阉党/清流派系（自动归类用·跨朝代通用派系名）
  var FACTION_TAGS = {
    EUNUCH_PARTY:  'eunuch_party',   // 内侍派系（自动归类）
    QINGLIU:       'qingliu'         // 清流派系（反扑源）
  };

  // 事件触发器阈值
  var EVENT_THRESHOLDS = {
    EUNUCH_QINGLIU_BACKFIRE:   50,   // 太监外朝紧张度 ≥ 50 → 触发清流反扑
    MAID_INTRIGUE_FAVOR_DELTA: 20,   // 宫女宠爱升降 ≥ 20 → 触发宫斗
    COMMONER_BAIYI_FAME:       60,   // 布衣声望 ≥ 60 → 触发白衣卿相
    BANDIT_OCCUPY_TURNS:       3,    // 盗贼占山 ≥ 3 回合 → 触发官府围剿
    INFANT_PRODIGY_LEARNING:   70,   // 婴儿学习 ≥ 70 → 触发神童
    INFANT_MISCHIEVOUS_DISCIPLINE: 30, // 婴儿管教 < 30 → 触发顽童
    RETIRED_COMEBACK_FAME:     50,   // 退休官员声望 ≥ 50 → 触发东山再起
    MONK_SUMMON_MERIT:         70,   // 方外功德 ≥ 70 → 触发高僧入朝
    MERCHANT_MAGNATE_CAPITAL:  8000, // 商贾资本 ≥ 8000 → 触发巨贾行商
    ARTISAN_ROYAL_SKILL:       80    // 匠人技艺 ≥ 80 → 触发御用匠人
  };

  var LEDGER_MAX = 200;

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数 / 软依赖降级
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }
  function _rndId(prefix) {
    return (prefix || 'sid_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _curYear() {
    try {
      if (typeof GM !== 'undefined' && GM && _isNum(GM.year)) return GM.year;
      if (typeof getCurrentYear === 'function') return getCurrentYear();
    } catch (_) {}
    return 0;
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerSpecialIdentity]', m); } catch (_) {}
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
      if (typeof _isTransmigration === 'function') return !!_isTransmigration();
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

  function _getPlayerRole() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.playerRole) {
        return P.playerInfo.playerRole;
      }
    } catch (_) {}
    return null;
  }

  function _setPlayerRole(newRole, reason) {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        var prev = P.playerInfo.playerRole;
        P.playerInfo.playerRole = newRole; // arch-ok
        _chronicleSoft({ cat: '身份转线', text: _getPlayerName() + ' 身份转线：' + prev + ' → ' + newRole + (reason ? '（' + reason + '）' : '') });
        return true;
      }
    } catch (_) {}
    return false;
  }

  // ── LLM 调用·缺席降级返回 null ──────────────────────────────
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ── 银钱消耗·主路径走 TM.PlayerEconomy.spend·降级直减 ──
  function _spendPlayerCash(cost, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy &&
          typeof global.TM.PlayerEconomy.spend === 'function') {
        var r = global.TM.PlayerEconomy.spend(cost, reason);
        if (r && r.ok) return { ok: true, cash: r.cash };
        if (r && r.ok === false) return { ok: false, cash: r.cash };
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

  function _addPlayerCash(amount, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy &&
          typeof global.TM.PlayerEconomy.addCash === 'function') {
        var r = global.TM.PlayerEconomy.addCash(amount, reason);
        if (r && r.ok) return { ok: true, cash: r.cash };
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!P.playerInfo.playerEconomy) P.playerInfo.playerEconomy = { cash: 0 }; // arch-ok
        var pe = P.playerInfo.playerEconomy;
        if (typeof pe.cash !== 'number') pe.cash = 0;
        pe.cash += amount; // arch-ok
        return { ok: true, cash: pe.cash };
      }
    } catch (_) {}
    return { ok: true, cash: null };
  }

  // ── 软依赖·各 PlayerXxx 模块桥接（缺席降级 ok=true 不阻拦）──
  function _interactSoft(npcName, kind, payload) {
    try {
      if (global.TM && global.TM.PlayerInteraction &&
          typeof global.TM.PlayerInteraction.interact === 'function') {
        return global.TM.PlayerInteraction.interact(npcName, kind, payload || {});
      }
    } catch (_) {}
    return { ok: true, scene: 'interaction-fallback' };
  }

  function _kejuApplySoft(stage, opts) {
    try {
      if (global.TM && global.TM.PlayerKeju) {
        if (typeof global.TM.PlayerKeju.applyForExam === 'function') {
          return global.TM.PlayerKeju.applyForExam(stage, opts);
        }
        if (typeof global.TM.PlayerKeju.takeExam === 'function') {
          return global.TM.PlayerKeju.takeExam(stage, opts);
        }
      }
    } catch (_) {}
    return { ok: true, scene: 'keju-fallback' };
  }

  function _tradeDispatchSoft(caravanId, opts) {
    try {
      if (global.TM && global.TM.PlayerTrade) {
        if (typeof global.TM.PlayerTrade.dispatchTrade === 'function') {
          return global.TM.PlayerTrade.dispatchTrade(caravanId, opts);
        }
        if (typeof global.TM.PlayerTrade.dispatchCaravan === 'function') {
          return global.TM.PlayerTrade.dispatchCaravan(caravanId, opts);
        }
      }
    } catch (_) {}
    return { ok: true, scene: 'trade-fallback' };
  }

  function _techStartSoft(field, opts) {
    try {
      if (global.TM && global.TM.PlayerTech &&
          typeof global.TM.PlayerTech.startResearch === 'function') {
        return global.TM.PlayerTech.startResearch(field, opts);
      }
    } catch (_) {}
    return { ok: true, scene: 'tech-fallback' };
  }

  function _techPetitionSoft(techId, opts) {
    try {
      if (global.TM && global.TM.PlayerTech &&
          typeof global.TM.PlayerTech.petitionToPromulgate === 'function') {
        return global.TM.PlayerTech.petitionToPromulgate(techId, opts);
      }
    } catch (_) {}
    return { ok: true, scene: 'tech-petition-fallback' };
  }

  function _rebelLaunchSoft(opts) {
    try {
      if (global.TM && global.TM.PlayerRebel &&
          typeof global.TM.PlayerRebel.launch === 'function') {
        return global.TM.PlayerRebel.launch(opts);
      }
    } catch (_) {}
    return { ok: false, reason: '反叛引擎未就绪' };
  }

  function _movementTravelSoft(dest, opts) {
    try {
      if (global.TM && global.TM.PlayerMovement) {
        if (typeof global.TM.PlayerMovement.travelTo === 'function') {
          return global.TM.PlayerMovement.travelTo(dest, opts);
        }
        if (typeof global.TM.PlayerMovement.moveTo === 'function') {
          return global.TM.PlayerMovement.moveTo(dest, opts);
        }
      }
    } catch (_) {}
    return { ok: true, scene: 'movement-fallback' };
  }

  function _familyMarrySoft(opts) {
    try {
      if (global.TM && global.TM.PlayerFamily &&
          typeof global.TM.PlayerFamily.marry === 'function') {
        return global.TM.PlayerFamily.marry(opts);
      }
    } catch (_) {}
    return { ok: true, scene: 'marry-fallback' };
  }

  function _familyBirthSoft(opts) {
    try {
      if (global.TM && global.TM.PlayerFamily) {
        if (typeof global.TM.PlayerFamily.birthChild === 'function') {
          return global.TM.PlayerFamily.birthChild(opts);
        }
        if (typeof global.TM.PlayerFamily.haveChild === 'function') {
          return global.TM.PlayerFamily.haveChild(opts);
        }
      }
    } catch (_) {}
    return { ok: true, scene: 'birth-fallback' };
  }

  function _chronicleSoft(entry) {
    try {
      if (typeof addToChronicle === 'function') { addToChronicle(entry); return; }
    } catch (_) {}
    try {
      if (typeof _chroniclePush === 'function') { _chroniclePush(entry); return; }
    } catch (_) {}
    try {
      if (typeof ChronicleTracker !== 'undefined' && ChronicleTracker &&
          typeof ChronicleTracker.add === 'function') {
        ChronicleTracker.add(entry); return;
      }
    } catch (_) {}
    try { console.log('[PlayerSpecialIdentity][chronicle]', entry && entry.text); } catch (_) {}
  }

  function _addEBSoft(cat, txt) {
    try { if (typeof addEB === 'function') { addEB(cat, txt); return; } } catch (_) {}
    try { console.log('[PlayerSpecialIdentity][' + cat + ']', txt); } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §3 状态管理
  // ════════════════════════════════════════════════════════════
  // 状态挂载点：GM._playerSpecialIdentity = {
  //   currentIdentity, identityData: { eunuch:{}, maid:{}, ... },
  //   customIdentities: { role: def }, events: [], createdAt
  // }

  function _defaultState() {
    return {
      currentIdentity: null,
      identityData: {},
      customIdentities: {},
      events: [],
      createdAt: _curTurn()
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerSpecialIdentity) {
        GM._playerSpecialIdentity = _defaultState(); // arch-ok
      }
      return GM._playerSpecialIdentity;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!s.identityData || typeof s.identityData !== 'object') s.identityData = {}; // arch-ok
    if (!s.customIdentities || typeof s.customIdentities !== 'object') s.customIdentities = {}; // arch-ok
    if (!Array.isArray(s.events)) s.events = []; // arch-ok
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

  // 取当前身份数据子树（按 identityKind）
  function _getIdentityData(s, kind) {
    if (!s || !kind) return null;
    if (!s.identityData[kind]) s.identityData[kind] = {}; // arch-ok
    return s.identityData[kind];
  }

  function _setIdentityData(s, kind, data) {
    if (!s || !kind) return;
    s.identityData[kind] = data; // arch-ok
  }

  function setCurrentIdentity(kind, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!IDENTITY_KINDS[kind] && !(s.customIdentities && s.customIdentities[kind])) {
      return { ok: false, reason: '未知身份类型: ' + kind };
    }
    var prev = s.currentIdentity;
    s.currentIdentity = kind; // arch-ok
    _pushEvent(s, 'set_identity', '身份切换：' + (prev || '—') + ' → ' + kind, { prev: prev, next: kind, opts: opts });
    return { ok: true, prev: prev, current: kind };
  }

  function getCurrentIdentity() {
    var s = _getState();
    return s ? s.currentIdentity : null;
  }

  // ════════════════════════════════════════════════════════════
  //  §4 SubTask 26C.2 太监路线
  // ════════════════════════════════════════════════════════════

  function eunuchInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'eunuch');
    d.castrated = true; // arch-ok
    d.rank = d.rank || EUNUCH_RANKS.ATTEND.key; // arch-ok
    d.power = d.power || EUNUCH_RANKS.ATTEND.power; // arch-ok
    d.sovereignTrust = d.sovereignTrust || EUNOCK_TRUST_INIT(); // arch-ok
    d.outerTension = d.outerTension || EUNUCH_RANKS.ATTEND.outerTension; // arch-ok
    d.factionTag = FACTION_TAGS.EUNUCH_PARTY; // arch-ok
    d.qingliuBackfireCount = d.qingliuBackfireCount || 0; // arch-ok
    s.currentIdentity = 'eunuch'; // arch-ok
    _pushEvent(s, 'eunuch_init', '净身入内廷·为「亲近君主」近侍', { rank: d.rank });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 净身入内廷·始为近侍' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function EUNOCK_TRUST_INIT() { return EUNUCH_RANKS.ATTEND.sovereignTrust; }

  function eunuchAdvanceRank(targetRank, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'eunuch');
    if (!d.castrated) return { ok: false, reason: '尚未净身·非太监身份' };
    var rankKey = (typeof targetRank === 'string') ? targetRank : (targetRank && targetRank.key);
    var def = EUNUCH_RANKS[(rankKey || '').toUpperCase()];
    if (!def) return { ok: false, reason: '未知内廷权力阶：' + rankKey };
    // 晋升须君主信任度 ≥ 阶阈 - 10
    var requiredTrust = Math.max(0, def.sovereignTrust - 10);
    if ((d.sovereignTrust || 0) < requiredTrust) {
      return { ok: false, reason: '君主信任不足·当前 ' + (d.sovereignTrust || 0) + '·需 ' + requiredTrust };
    }
    var prev = d.rank;
    d.rank = def.key; // arch-ok
    d.power = def.power; // arch-ok
    d.outerTension = _clamp((d.outerTension || 0) + def.outerTension * 0.4, 0, 100); // arch-ok
    _pushEvent(s, 'eunuch_advance', '内廷权力线晋升：' + _eunuchRankLabel(prev) + ' → ' + def.label, { prev: prev, next: def.key });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 晋至「' + def.label + '」' });
    // 推升外朝紧张度 → 可能触发清流反扑
    if (d.outerTension >= EVENT_THRESHOLDS.EUNUCH_QINGLIU_BACKFIRE) {
      var backfire = eunuchTriggerQingliuBackfire({ auto: true });
      return { ok: true, data: JSON.parse(JSON.stringify(d)), backfire: backfire };
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function _eunuchRankLabel(key) {
    var d = EUNUCH_RANKS[(key || '').toUpperCase()];
    return d ? d.label : (key || '—');
  }

  function eunuchClassifyFaction() {
    var s = _getState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = s.identityData && s.identityData.eunuch;
    if (!d || !d.castrated) return { ok: false, reason: '非太监身份' };
    // 自动归类为内侍派系（朝代中立·剧本可经 hook 重命名派系显示）
    d.factionTag = FACTION_TAGS.EUNUCH_PARTY; // arch-ok
    _pushEvent(s, 'eunuch_faction', '派系自动归类：内侍派系', { factionTag: d.factionTag });
    return { ok: true, factionTag: d.factionTag, label: '内侍派系' };
  }

  function eunuchTriggerQingliuBackfire(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'eunuch');
    if (!d.castrated) return { ok: false, reason: '非太监身份' };
    if ((d.outerTension || 0) < EVENT_THRESHOLDS.EUNUCH_QINGLIU_BACKFIRE && !opts.force) {
      return { ok: false, reason: '外朝紧张度不足·未触发清流反扑' };
    }
    d.qingliuBackfireCount = (d.qingliuBackfireCount || 0) + 1; // arch-ok
    // 反扑效果：君主信任下降·权力略降
    d.sovereignTrust = _clamp((d.sovereignTrust || 0) - 12, 0, 100); // arch-ok
    d.power = _clamp((d.power || 0) - 8, 0, 100); // arch-ok
    d.outerTension = _clamp((d.outerTension || 0) - 10, 0, 100); // arch-ok
    _pushEvent(s, 'eunuch_qingliu', '清流派系反扑·君主信任下降', {
      qingliuBackfireCount: d.qingliuBackfireCount,
      sovereignTrustDelta: -12, powerDelta: -8
    });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 遭清流反扑·内廷权势暂挫' });
    return { ok: true, qingliuBackfireCount: d.qingliuBackfireCount, sovereignTrust: d.sovereignTrust, power: d.power };
  }

  // ════════════════════════════════════════════════════════════
  //  §5 SubTask 26C.3 宫女路线
  // ════════════════════════════════════════════════════════════

  function maidInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'maid');
    d.rank = d.rank || MAID_RANKS.CAINU.key; // arch-ok
    d.favor = d.favor || MAID_RANKS.CAINU.favor; // arch-ok
    d.power = d.power || MAID_RANKS.CAINU.power; // arch-ok
    d.intrigueCount = d.intrigueCount || 0; // arch-ok
    d.servedMaster = (opts && opts.servedMaster) || d.servedMaster || '主位'; // arch-ok
    s.currentIdentity = 'maid'; // arch-ok
    _pushEvent(s, 'maid_init', '入内廷为「采女」·伺候主位', { rank: d.rank, servedMaster: d.servedMaster });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 入内廷为采女' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function maidPromote(targetRank, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'maid');
    var rankKey = (typeof targetRank === 'string') ? targetRank : (targetRank && targetRank.key);
    var def = MAID_RANKS[(rankKey || '').toUpperCase()];
    if (!def) return { ok: false, reason: '未知嫔御阶：' + rankKey };
    if ((d.favor || 0) < def.favor - 10) {
      return { ok: false, reason: '宠爱不足·当前 ' + (d.favor || 0) + '·需 ≥ ' + (def.favor - 10) };
    }
    var prev = d.rank;
    d.rank = def.key; // arch-ok
    // 宠爱是晋升「货币」（类比 eunuch.sovereignTrust）·不重置·仅在低于阶基线时抬升至基线
    if ((d.favor || 0) < def.favor) d.favor = def.favor; // arch-ok
    d.power = def.power; // arch-ok
    _pushEvent(s, 'maid_promote', '嫔御晋升：' + _maidRankLabel(prev) + ' → ' + def.label, { prev: prev, next: def.key });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 晋至「' + def.label + '」' });
    // 晋升至「妃」可触发身份转线为后宫主位
    if (def.key === MAID_RANKS.FEI.key && (opts && opts.transitionToHouguang !== false)) {
      _setPlayerRole('houguang', '宫女晋妃');
      return { ok: true, data: JSON.parse(JSON.stringify(d)), transition: { to: 'houguang' } };
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function _maidRankLabel(key) {
    var d = MAID_RANKS[(key || '').toUpperCase()];
    return d ? d.label : (key || '—');
  }

  function maidTriggerCourtIntrigue(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'maid');
    // 宫斗触发：他嫔妃宠爱变化 ≥ 20 即触发·降对方宠爱·自方可能受牵连
    d.intrigueCount = (d.intrigueCount || 0) + 1; // arch-ok
    var targetFavorDelta = -(8 + Math.floor(Math.random() * 12));
    var selfFavorDelta = Math.floor(Math.random() * 6) - 8;
    d.favor = _clamp((d.favor || 0) + selfFavorDelta, 0, 100); // arch-ok
    _pushEvent(s, 'maid_intrigue', '宫斗事件·宠爱升降', {
      intrigueCount: d.intrigueCount,
      targetFavorDelta: targetFavorDelta,
      selfFavorDelta: selfFavorDelta
    });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 卷入宫斗·宠爱 ' + (selfFavorDelta >= 0 ? '+' : '') + selfFavorDelta });
    return {
      ok: true,
      intrigueCount: d.intrigueCount,
      targetFavorDelta: targetFavorDelta,
      selfFavorDelta: selfFavorDelta,
      favor: d.favor
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 SubTask 26C.4 布衣路线
  // ════════════════════════════════════════════════════════════

  function commonerInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'commoner');
    d.fame = d.fame || 0; // arch-ok
    d.learning = d.learning || 0; // arch-ok
    d.valor = d.valor || 0; // arch-ok
    d.wealth = d.wealth || 0; // arch-ok
    d.chosenPath = d.chosenPath || null; // arch-ok
    s.currentIdentity = 'commoner'; // arch-ok
    _pushEvent(s, 'commoner_init', '白身布衣·可选择出路', { fame: d.fame });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 以白身布衣入世' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function commonerChoosePath(pathKey, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'commoner');
    var def = COMMONER_PATHS[(pathKey || '').toUpperCase()];
    if (!def) return { ok: false, reason: '未知出路：' + pathKey };
    var prev = d.chosenPath;
    d.chosenPath = def.key; // arch-ok
    _pushEvent(s, 'commoner_choose', '布衣择路：' + def.label, { prev: prev, next: def.key });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 择路「' + def.label + '」' });
    // 软依赖触发外部模块
    var bridge = null;
    if (def.key === 'study') {
      bridge = _kejuApplySoft('initial', opts);
    } else if (def.key === 'trade') {
      bridge = _tradeDispatchSoft(null, opts);
    } else if (def.key === 'enlist') {
      bridge = _interactSoft('地方镇将', 'enlist', { path: def.key });
    } else if (def.key === 'jianghu' || def.key === 'hermit') {
      bridge = _movementTravelSoft(def.key === 'jianghu' ? '江湖' : '山林', { path: def.key });
    } else if (def.key === 'farm') {
      bridge = { ok: true, scene: 'farm-settle' };
    }
    // 转线
    if (def.nextRole && def.nextRole !== 'custom') {
      _setPlayerRole(def.nextRole, '布衣择路·' + def.label);
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), bridge: bridge };
  }

  function commonerTriggerBaiyiQingxiang(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'commoner');
    if ((d.fame || 0) < EVENT_THRESHOLDS.COMMONER_BAIYI_FAME && !opts.force) {
      return { ok: false, reason: '声望不足·未触发白衣卿相' };
    }
    d.fame = _clamp((d.fame || 0) + 15, 0, 100); // arch-ok
    d.learning = _clamp((d.learning || 0) + 10, 0, 100); // arch-ok
    _pushEvent(s, 'commoner_baiyi', '白衣卿相事件·声望大增', { fame: d.fame, learning: d.learning });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 名动公卿·白衣卿相' });
    return { ok: true, fame: d.fame, learning: d.learning };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 SubTask 26C.5 盗贼路线
  // ════════════════════════════════════════════════════════════

  function banditInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'bandit');
    d.occupyTurns = d.occupyTurns || 0; // arch-ok
    d.banditCount = d.banditCount || 30; // arch-ok
    d.infamy = d.infamy || 10; // arch-ok
    d.branch = d.branch || null; // arch-ok
    d.amnestyCount = d.amnestyCount || 0; // arch-ok
    d.rebellionLaunched = d.rebellionLaunched || false; // arch-ok
    s.currentIdentity = 'bandit'; // arch-ok
    _pushEvent(s, 'bandit_init', '落草为寇·啸聚山林', { banditCount: d.banditCount });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 落草为寇' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function banditOccupyMountain(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'bandit');
    d.occupyTurns = (d.occupyTurns || 0) + 1; // arch-ok
    d.banditCount = Math.round((d.banditCount || 30) * 1.15); // arch-ok
    d.infamy = _clamp((d.infamy || 0) + 5, 0, 100); // arch-ok
    _pushEvent(s, 'bandit_occupy', '占山为王·势扩张（第 ' + d.occupyTurns + ' 回合）', {
      occupyTurns: d.occupyTurns, banditCount: d.banditCount, infamy: d.infamy
    });
    // 占山 ≥ 阈值 → 触发官府围剿（可选招安或造反）
    var surrounded = null;
    if (d.occupyTurns >= EVENT_THRESHOLDS.BANDIT_OCCUPY_TURNS) {
      surrounded = { threaten: true, message: '官府围剿·可选招安或造反' };
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), surrounded: surrounded };
  }

  function banditAcceptAmnesty(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'bandit');
    d.branch = BANDIT_BRANCH.AMNESTY.key; // arch-ok
    d.amnestyCount = (d.amnestyCount || 0) + 1; // arch-ok
    _pushEvent(s, 'bandit_amnesty', '受朝廷招安·转为武官', { amnestyCount: d.amnestyCount });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 受招安·转为武官' });
    _setPlayerRole(BANDIT_BRANCH.AMNESTY.nextRole, '盗贼招安');
    return { ok: true, data: JSON.parse(JSON.stringify(d)), transition: { to: BANDIT_BRANCH.AMNESTY.nextRole } };
  }

  function banditLaunchRebellion(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'bandit');
    d.branch = BANDIT_BRANCH.REBEL.key; // arch-ok
    d.rebellionLaunched = true; // arch-ok
    var launch = _rebelLaunchSoft(opts || {});
    _pushEvent(s, 'bandit_rebel', '举旗造反·成王败寇', { launchResult: launch });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 举旗造反' });
    // 反叛成功 → playerRole 转 emperor（失败由外部 rebel 引擎处理）
    if (launch && launch.ok && launch.success) {
      _setPlayerRole(BANDIT_BRANCH.REBEL.nextRole, '盗贼造反成功');
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), launch: launch, transition: launch && launch.success ? { to: BANDIT_BRANCH.REBEL.nextRole } : null };
  }

  // ════════════════════════════════════════════════════════════
  //  §8 SubTask 26C.6 婴儿路线
  // ════════════════════════════════════════════════════════════

  function infantInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'infant');
    d.age = d.age != null ? d.age : 0; // arch-ok  (0-3 岁)
    d.learning = d.learning || 0; // arch-ok
    d.intelligence = d.intelligence || 0; // arch-ok
    d.valor = d.valor || 0; // arch-ok
    d.discipline = d.discipline || 50; // arch-ok
    d.guardian = (opts && opts.guardian) || d.guardian || '父母'; // arch-ok
    d.eventFlags = d.eventFlags || {}; // arch-ok
    s.currentIdentity = 'infant'; // arch-ok
    _pushEvent(s, 'infant_init', '婴儿出生·由 ' + d.guardian + ' 抚养', { age: d.age, guardian: d.guardian });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 降生·由 ' + d.guardian + ' 抚养' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function infantAutoGrow(yearsDelta, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'infant');
    var yrs = (typeof yearsDelta === 'number') ? yearsDelta : 0.5;
    d.age = (d.age || 0) + yrs; // arch-ok
    // 自动成长：随年龄增长各属性缓慢上升·由父母/塾师决策影响
    d.learning = _clamp((d.learning || 0) + Math.round(yrs * 6), 0, 100); // arch-ok
    d.intelligence = _clamp((d.intelligence || 0) + Math.round(yrs * 4), 0, 100); // arch-ok
    d.discipline = _clamp((d.discipline || 50) + (opts && opts.tutored ? 3 : -1), 0, 100); // arch-ok
    _pushEvent(s, 'infant_grow', '自动成长·年龄 ' + d.age.toFixed(1) + ' 岁', { age: d.age });
    // 检查神童/顽童事件
    var evt = null;
    if ((d.learning || 0) >= EVENT_THRESHOLDS.INFANT_PRODIGY_LEARNING && !d.eventFlags.prodigy) {
      evt = infantTriggerProdigyOrMischievous('prodigy', { auto: true });
    } else if ((d.discipline || 0) < EVENT_THRESHOLDS.INFANT_MISCHIEVOUS_DISCIPLINE && !d.eventFlags.mischievous) {
      evt = infantTriggerProdigyOrMischievous('mischievous', { auto: true });
    }
    // 满 3 岁 → 转线为儿童（playerRole 由家族出身推导）
    var transition = null;
    if (d.age >= 3 && (opts && opts.transitionOnAdult !== false)) {
      var nextRole = (opts && opts.nextRole) || _inferInfantNextRole();
      _setPlayerRole(nextRole, '婴儿满 3 岁');
      transition = { to: nextRole, age: d.age };
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), event: evt, transition: transition };
  }

  function _inferInfantNextRole() {
    // 跨朝代通用：根据家族出身推导（剧本可经 hook 覆盖）
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        var pi = P.playerInfo;
        if (pi.royalRelation === 'prince') return 'prince';
        if (pi.familyRank === 'minister') return 'minister';
        if (pi.familyRank === 'merchant') return 'merchant';
      }
    } catch (_) {}
    return 'commoner';
  }

  function infantTriggerProdigyOrMischievous(eventKey, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'infant');
    var def = INFANT_EVENTS[(eventKey || '').toUpperCase()];
    if (!def) return { ok: false, reason: '未知婴儿事件：' + eventKey };
    d.eventFlags[def.key] = true; // arch-ok
    if (def.learning) d.learning = _clamp((d.learning || 0) + def.learning, 0, 100); // arch-ok
    if (def.intelligence) d.intelligence = _clamp((d.intelligence || 0) + def.intelligence, 0, 100); // arch-ok
    if (def.valor) d.valor = _clamp((d.valor || 0) + def.valor, 0, 100); // arch-ok
    if (def.discipline) d.discipline = _clamp((d.discipline || 0) + def.discipline, 0, 100); // arch-ok
    _pushEvent(s, 'infant_event', def.label + '事件触发', { event: def.key, deltas: def });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 显「' + def.label + '」之姿' });
    return { ok: true, event: def.key, label: def.label, data: JSON.parse(JSON.stringify(d)) };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 SubTask 26C.7 退休官员路线
  // ════════════════════════════════════════════════════════════

  function retiredInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'retired_official');
    d.fame = d.fame || 30; // arch-ok
    d.localInfluence = d.localInfluence || 20; // arch-ok
    d.courtAdvisory = d.courtAdvisory !== false; // arch-ok  // 朝廷顾问身份默认开启
    d.branch = d.branch || null; // arch-ok
    s.currentIdentity = 'retired_official'; // arch-ok
    _pushEvent(s, 'retired_init', '致仕归乡·朝廷顾问身份', { fame: d.fame, courtAdvisory: d.courtAdvisory });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 致仕归乡·为朝廷顾问' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function retiredTriggerComeback(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'retired_official');
    if ((d.fame || 0) < EVENT_THRESHOLDS.RETIRED_COMEBACK_FAME && !opts.force) {
      return { ok: false, reason: '声望不足·未触发东山再起' };
    }
    d.branch = RETIRED_BRANCH.COMEBACK.key; // arch-ok
    d.fame = _clamp((d.fame || 0) + 10, 0, 100); // arch-ok
    _pushEvent(s, 'retired_comeback', '朝廷起复·东山再起', { fame: d.fame });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 受朝廷起复·东山再起' });
    _setPlayerRole(RETIRED_BRANCH.COMEBACK.nextRole, '退休官员起复');
    return { ok: true, data: JSON.parse(JSON.stringify(d)), transition: { to: RETIRED_BRANCH.COMEBACK.nextRole } };
  }

  function retiredTriggerPeacefulAging(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'retired_official');
    d.branch = RETIRED_BRANCH.PEACEFUL_AGE.key; // arch-ok
    d.localInfluence = _clamp((d.localInfluence || 0) + 8, 0, 100); // arch-ok
    _pushEvent(s, 'retired_peaceful', '颐养天年·在乡经营', { localInfluence: d.localInfluence });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 颐养天年·在乡经营' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  // ════════════════════════════════════════════════════════════
  //  §10 SubTask 26C.8 方外路线
  // ════════════════════════════════════════════════════════════

  function monkInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'monk');
    d.merit = d.merit || 10; // arch-ok  // 功德
    d.fame = d.fame || 5; // arch-ok
    d.services = d.services || 0; // arch-ok
    d.summoned = d.summoned || false; // arch-ok  // 是否已入朝
    d.sect = (opts && opts.sect) || d.sect || '僧'; // arch-ok  // 僧/道
    s.currentIdentity = 'monk'; // arch-ok
    _pushEvent(s, 'monk_init', '入寺观清修·为' + d.sect + '家', { sect: d.sect });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 入寺观清修' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function monkPracticeService(serviceKey, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'monk');
    var def = MONK_SERVICES[(serviceKey || '').toUpperCase()];
    if (!def) return { ok: false, reason: '未知方外世俗服务：' + serviceKey };
    d.services = (d.services || 0) + 1; // arch-ok
    d.merit = _clamp((d.merit || 0) + def.merit, 0, 100); // arch-ok
    d.fame = _clamp((d.fame || 0) + def.fame, 0, 100); // arch-ok
    _pushEvent(s, 'monk_service', '方外世俗服务·' + def.label, { service: def.key, merit: d.merit, fame: d.fame });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 行「' + def.label + '」之务' });
    // 功德 ≥ 阈值 → 触发高僧入朝
    var summon = null;
    if ((d.merit || 0) >= EVENT_THRESHOLDS.MONK_SUMMON_MERIT && !d.summoned) {
      summon = monkTriggerSummonToCourt({ auto: true });
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), summon: summon };
  }

  function monkTriggerSummonToCourt(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'monk');
    if ((d.merit || 0) < EVENT_THRESHOLDS.MONK_SUMMON_MERIT && !opts.force) {
      return { ok: false, reason: '功德不足·未触发高僧入朝' };
    }
    d.summoned = true; // arch-ok
    d.fame = _clamp((d.fame || 0) + 20, 0, 100); // arch-ok
    _pushEvent(s, 'monk_summon', '高僧入朝·朝廷咨询方外事务', { merit: d.merit, fame: d.fame });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 受朝廷礼请入朝' });
    return { ok: true, summoned: true, fame: d.fame };
  }

  // ════════════════════════════════════════════════════════════
  //  §11 SubTask 26C.9 商贾扩展路线（关联 TM.PlayerTrade）
  // ════════════════════════════════════════════════════════════

  function merchantInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'merchant');
    d.tier = d.tier || MERCHANT_TIERS.LOCAL.key; // arch-ok
    d.capital = d.capital || MERCHANT_TIERS.LOCAL.capital; // arch-ok
    d.tradeRange = d.tradeRange || MERCHANT_TIERS.LOCAL.tradeRange; // arch-ok
    d.crossBorderTrades = d.crossBorderTrades || 0; // arch-ok
    d.caoYunHook = d.caoYunHook !== false; // arch-ok  // 漕运 hook（剧本可挂接）
    d.haiMaoHook = d.haiMaoHook !== false; // arch-ok  // 海贸 hook（剧本可挂接）
    d.bestowedCourtMerchant = d.bestowedCourtMerchant || false; // arch-ok
    s.currentIdentity = 'merchant'; // arch-ok
    _pushEvent(s, 'merchant_init', '商贾启业·为「地方商」', { tier: d.tier, capital: d.capital });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 启商贾之业' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function merchantCrossBorderTrade(caravanSpec, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'merchant');
    // 跨国贸易·关联 TM.PlayerTrade.dispatchTrade（软依赖降级）
    var dispatch = _tradeDispatchSoft(caravanSpec && (caravanSpec.caravanId || caravanSpec.id), opts);
    d.crossBorderTrades = (d.crossBorderTrades || 0) + 1; // arch-ok
    d.capital = _clamp((d.capital || 0) + (opts && opts.profit ? opts.profit : 500), 0, 100000); // arch-ok
    _pushEvent(s, 'merchant_cross_border', '跨国贸易·第 ' + d.crossBorderTrades + ' 次', {
      crossBorderTrades: d.crossBorderTrades, capital: d.capital, dispatch: dispatch && dispatch.ok
    });
    // 漕运/海贸 hook（剧本可挂接具体路线·本引擎层不编朝代专属名目）
    var hooks = {};
    if (d.caoYunHook) hooks.caoYun = 'pending';
    if (d.haiMaoHook) hooks.haiMao = 'pending';
    // 资本 ≥ 阈值 → 触发巨贾行商
    var magnate = null;
    if ((d.capital || 0) >= EVENT_THRESHOLDS.MERCHANT_MAGNATE_CAPITAL && d.tier === MERCHANT_TIERS.LOCAL.key) {
      magnate = merchantTriggerMagnate({ auto: true });
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), dispatch: dispatch, hooks: hooks, magnate: magnate };
  }

  function merchantTriggerMagnate(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'merchant');
    if ((d.capital || 0) < EVENT_THRESHOLDS.MERCHANT_MAGNATE_CAPITAL && !opts.force) {
      return { ok: false, reason: '资本不足·未触发巨贾行商' };
    }
    d.tier = MERCHANT_TIERS.MAGNATE.key; // arch-ok
    d.tradeRange = MERCHANT_TIERS.MAGNATE.tradeRange; // arch-ok
    _pushEvent(s, 'merchant_magnate', '巨贾行商事件·升档为「巨贾行商」', { tier: d.tier });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 成巨贾行商·声名远播' });
    return { ok: true, tier: d.tier, data: JSON.parse(JSON.stringify(d)) };
  }

  function merchantBestowCourtMerchant(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'merchant');
    if (d.tier !== MERCHANT_TIERS.MAGNATE.key && !(opts && opts.force)) {
      return { ok: false, reason: '须先达巨贾行商档' };
    }
    d.tier = MERCHANT_TIERS.COURT_BESTOWED.key; // arch-ok
    d.bestowedCourtMerchant = true; // arch-ok
    d.tradeRange = MERCHANT_TIERS.COURT_BESTOWED.tradeRange; // arch-ok
    _pushEvent(s, 'merchant_bestow', '朝廷特赐「御赐官商」身份', { tier: d.tier });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 获朝廷特赐·为御赐官商' });
    return { ok: true, tier: d.tier, label: '御赐官商', data: JSON.parse(JSON.stringify(d)) };
  }

  // ════════════════════════════════════════════════════════════
  //  §12 SubTask 26C.10 匠人扩展路线（关联 TM.PlayerTech）
  // ════════════════════════════════════════════════════════════

  function artisanInit(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'artisan');
    d.tier = d.tier || ARTISAN_TIERS.APPRENTICE.key; // arch-ok
    d.skill = d.skill || ARTISAN_TIERS.APPRENTICE.skill; // arch-ok
    d.fame = d.fame || ARTISAN_TIERS.APPRENTICE.fame; // arch-ok
    d.field = (opts && opts.field) || d.field || 'craft'; // arch-ok  // 技艺领域（剧本 hook）
    d.royal = d.royal || false; // arch-ok  // 御用匠人
    d.tributes = d.tributes || 0; // arch-ok
    s.currentIdentity = 'artisan'; // arch-ok
    _pushEvent(s, 'artisan_init', '匠徒拜师·习' + d.field + '艺', { tier: d.tier, field: d.field });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 入匠徒·习艺' });
    return { ok: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function artisanTributeToCourt(opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'artisan');
    d.tributes = (d.tributes || 0) + 1; // arch-ok
    d.fame = _clamp((d.fame || 0) + 6, 0, 100); // arch-ok
    _pushEvent(s, 'artisan_tribute', '进贡朝廷·第 ' + d.tributes + ' 件', { tributes: d.tributes, fame: d.fame });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 进贡朝廷·声誉加身' });
    // 技艺 ≥ 阈值 → 触发御用匠人
    var royal = null;
    if ((d.skill || 0) >= EVENT_THRESHOLDS.ARTISAN_ROYAL_SKILL && !d.royal) {
      royal = artisanTriggerRoyalArtisan({ auto: true });
    }
    return { ok: true, data: JSON.parse(JSON.stringify(d)), royal: royal };
  }

  function artisanTriggerRoyalArtisan(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'artisan');
    if ((d.skill || 0) < EVENT_THRESHOLDS.ARTISAN_ROYAL_SKILL && !opts.force) {
      return { ok: false, reason: '技艺不足·未触发御用匠人' };
    }
    d.tier = ARTISAN_TIERS.ROYAL.key; // arch-ok
    d.royal = true; // arch-ok
    d.skill = _clamp((d.skill || 0) + 5, 0, 100); // arch-ok
    _pushEvent(s, 'artisan_royal', '御用匠人事件·获朝廷征召', { tier: d.tier, skill: d.skill });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 受朝廷征召·为御用匠人' });
    return { ok: true, tier: d.tier, royal: true, data: JSON.parse(JSON.stringify(d)) };
  }

  function artisanPetitionToPromulgate(techId, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var d = _getIdentityData(s, 'artisan');
    // 上奏推广技艺·关联 TM.PlayerTech.petitionToPromulgate（软依赖降级）
    var bridge = _techPetitionSoft(techId, opts);
    _pushEvent(s, 'artisan_petition', '上奏推广技艺', { techId: techId, bridge: bridge && bridge.ok });
    _chronicleSoft({ cat: '身份', text: _getPlayerName() + ' 上奏推广技艺' });
    return { ok: true, bridge: bridge, data: JSON.parse(JSON.stringify(d)) };
  }

  // ════════════════════════════════════════════════════════════
  //  §13 SubTask 26C.11 路由函数 getRoute(playerRole, char)
  // ════════════════════════════════════════════════════════════
  // 根据 playerRole + 角色属性返回当前可用的特殊路线动作集
  //   返回 { ok, identity, actions: [{ key, label, hint, available, reason? }] }

  function getRoute(playerRole, char) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var role = playerRole || _getPlayerRole();
    var c = char || {};
    var identity = _resolveIdentityFromRole(role, c);
    if (!identity) {
      return { ok: false, reason: '当前 playerRole 无对应特殊身份路线: ' + role };
    }
    var actions = _buildActionsForIdentity(identity, c, s);
    return {
      ok: true,
      identity: identity,
      identityLabel: _identityLabel(identity),
      actions: actions
    };
  }

  function _resolveIdentityFromRole(role, char) {
    // 直接命中 9 类特殊身份
    if (IDENTITY_KINDS[role]) return role;
    // 已注册的自定义身份
    var s = _getState();
    if (s && s.customIdentities && s.customIdentities[role]) return role;
    // 由角色属性推断（剧本可经 hook 覆盖）
    if (char) {
      if (char.castrated === true) return 'eunuch';
      if (char.maidStatus) return 'maid';
      if (char.banditFlag === true) return 'bandit';
      if (char.age != null && char.age >= 0 && char.age < 3) return 'infant';
      if (char.retired === true) return 'retired_official';
      if (char.sect === '僧' || char.sect === '道') return 'monk';
    }
    return null;
  }

  function _identityLabel(identity) {
    if (IDENTITY_KINDS[identity]) return IDENTITY_KINDS[identity].label;
    var s = _getState();
    if (s && s.customIdentities && s.customIdentities[identity]) return s.customIdentities[identity].label;
    return identity;
  }

  function _buildActionsForIdentity(identity, char, s) {
    var acts = [];
    if (identity === 'eunuch') {
      acts.push({ key: 'eunuch_init', label: '净身入内廷', hint: '净身标记·为亲近君主近侍', available: true });
      Object.keys(EUNUCH_RANKS).forEach(function (k) {
        acts.push({ key: 'eunuch_advance:' + EUNUCH_RANKS[k].key, label: '晋至「' + EUNUCH_RANKS[k].label + '」', hint: '内廷权力线·需君主信任 ' + EUNUCH_RANKS[k].sovereignTrust, available: true });
      });
      acts.push({ key: 'eunuch_classify', label: '派系归类', hint: '自动归为内侍派系', available: true });
      acts.push({ key: 'eunuch_qingliu', label: '清流反扑', hint: '外朝紧张度高时触发', available: true });
    } else if (identity === 'maid') {
      acts.push({ key: 'maid_init', label: '入内廷为采女', hint: '伺候主位·起步', available: true });
      Object.keys(MAID_RANKS).forEach(function (k) {
        acts.push({ key: 'maid_promote:' + MAID_RANKS[k].key, label: '晋至「' + MAID_RANKS[k].label + '」', hint: '嫔御晋升·需宠爱 ' + MAID_RANKS[k].favor, available: true });
      });
      acts.push({ key: 'maid_intrigue', label: '宫斗', hint: '与他嫔妃宠爱升降', available: true });
    } else if (identity === 'commoner') {
      acts.push({ key: 'commoner_init', label: '白身布衣', hint: '可选择出路', available: true });
      Object.keys(COMMONER_PATHS).forEach(function (k) {
        acts.push({ key: 'commoner_choose:' + COMMONER_PATHS[k].key, label: COMMONER_PATHS[k].label, hint: COMMONER_PATHS[k].desc, available: true });
      });
      acts.push({ key: 'commoner_baiyi', label: '白衣卿相', hint: '声望高时触发', available: true });
    } else if (identity === 'bandit') {
      acts.push({ key: 'bandit_init', label: '落草为寇', hint: '啸聚山林', available: true });
      acts.push({ key: 'bandit_occupy', label: '占山为王', hint: '扩张势力·累积恶名', available: true });
      acts.push({ key: 'bandit_amnesty', label: '受招安', hint: '转为武官', available: true });
      acts.push({ key: 'bandit_rebel', label: '举旗造反', hint: '成王败寇', available: true });
    } else if (identity === 'infant') {
      acts.push({ key: 'infant_init', label: '婴儿出生', hint: '由父母/乳母/塾师决策', available: true });
      acts.push({ key: 'infant_grow', label: '自动成长', hint: '随年龄增长·属性缓升', available: true });
      acts.push({ key: 'infant_prodigy', label: '神童', hint: '学习≥70 触发', available: true });
      acts.push({ key: 'infant_mischievous', label: '顽童', hint: '管教<30 触发', available: true });
    } else if (identity === 'retired_official') {
      acts.push({ key: 'retired_init', label: '致仕归乡', hint: '朝廷顾问身份·在乡绅经营', available: true });
      acts.push({ key: 'retired_comeback', label: '东山再起', hint: '声望≥50 触发', available: true });
      acts.push({ key: 'retired_peaceful', label: '颐养天年', hint: '在乡经营·安享晚年', available: true });
    } else if (identity === 'monk') {
      acts.push({ key: 'monk_init', label: '入寺观清修', hint: '僧道身份', available: true });
      Object.keys(MONK_SERVICES).forEach(function (k) {
        acts.push({ key: 'monk_service:' + MONK_SERVICES[k].key, label: MONK_SERVICES[k].label, hint: '方外世俗服务', available: true });
      });
      acts.push({ key: 'monk_summon', label: '高僧入朝', hint: '功德≥70 触发', available: true });
    } else if (identity === 'merchant') {
      acts.push({ key: 'merchant_init', label: '商贾启业', hint: '为地方商', available: true });
      acts.push({ key: 'merchant_cross_border', label: '跨国贸易', hint: '关联 TM.PlayerTrade + 漕运/海贸 hook', available: true });
      acts.push({ key: 'merchant_magnate', label: '巨贾行商', hint: '资本≥8000 触发', available: true });
      acts.push({ key: 'merchant_bestow', label: '御赐官商', hint: '朝廷特赐身份', available: true });
    } else if (identity === 'artisan') {
      acts.push({ key: 'artisan_init', label: '匠徒拜师', hint: '习艺起步', available: true });
      acts.push({ key: 'artisan_tribute', label: '进贡朝廷', hint: '声誉加身', available: true });
      acts.push({ key: 'artisan_royal', label: '御用匠人', hint: '技艺≥80 触发', available: true });
      acts.push({ key: 'artisan_petition', label: '上奏推广技艺', hint: '关联 TM.PlayerTech', available: true });
    } else {
      // 自定义身份·剧本 hook 提供 actions
      var customDef = s.customIdentities && s.customIdentities[identity];
      if (customDef && Array.isArray(customDef.actions)) {
        customDef.actions.forEach(function (a) { acts.push(a); });
      }
    }
    return acts;
  }

  function listActionsForRole(playerRole, char) {
    var r = getRoute(playerRole, char);
    return r.ok ? r.actions : [];
  }

  // ════════════════════════════════════════════════════════════
  //  §14 SubTask 26C.12 事件触发器·每回合检查
  // ════════════════════════════════════════════════════════════

  function checkEvents(ctx) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    ctx = ctx || {};
    var triggered = [];
    var identity = s.currentIdentity;
    if (!identity) return { ok: true, triggered: [], note: '未设定当前身份' };
    var d = s.identityData && s.identityData[identity];
    if (!d) return { ok: true, triggered: [], note: '身份数据未初始化' };

    if (identity === 'eunuch') {
      if ((d.outerTension || 0) >= EVENT_THRESHOLDS.EUNUCH_QINGLIU_BACKFIRE && !ctx.skipEunuchBackfire) {
        var r = eunuchTriggerQingliuBackfire({ auto: true });
        if (r.ok) triggered.push({ identity: 'eunuch', event: 'qingliu_backfire', result: r });
      }
    } else if (identity === 'maid') {
      // 宫斗每回合有概率触发
      if (d.favor != null && Math.random() < 0.3 && !ctx.skipMaidIntrigue) {
        var r2 = maidTriggerCourtIntrigue({ auto: true });
        if (r2.ok) triggered.push({ identity: 'maid', event: 'court_intrigue', result: r2 });
      }
    } else if (identity === 'commoner') {
      if ((d.fame || 0) >= EVENT_THRESHOLDS.COMMONER_BAIYI_FAME && !ctx.skipBaiyi) {
        var r3 = commonerTriggerBaiyiQingxiang({ auto: true });
        if (r3.ok) triggered.push({ identity: 'commoner', event: 'baiyi_qingxiang', result: r3 });
      }
    } else if (identity === 'bandit') {
      if ((d.occupyTurns || 0) >= EVENT_THRESHOLDS.BANDIT_OCCUPY_TURNS && !ctx.skipBanditSurround) {
        triggered.push({ identity: 'bandit', event: 'official_surround', result: { threaten: true, message: '官府围剿·可选招安或造反' } });
      }
    } else if (identity === 'infant') {
      if ((d.learning || 0) >= EVENT_THRESHOLDS.INFANT_PRODIGY_LEARNING && !d.eventFlags.prodigy) {
        var r4 = infantTriggerProdigyOrMischievous('prodigy', { auto: true });
        if (r4.ok) triggered.push({ identity: 'infant', event: 'prodigy', result: r4 });
      }
      if ((d.discipline || 50) < EVENT_THRESHOLDS.INFANT_MISCHIEVOUS_DISCIPLINE && !d.eventFlags.mischievous) {
        var r5 = infantTriggerProdigyOrMischievous('mischievous', { auto: true });
        if (r5.ok) triggered.push({ identity: 'infant', event: 'mischievous', result: r5 });
      }
    } else if (identity === 'retired_official') {
      if ((d.fame || 0) >= EVENT_THRESHOLDS.RETIRED_COMEBACK_FAME && !d.branch && !ctx.skipComeback) {
        var r6 = retiredTriggerComeback({ auto: true });
        if (r6.ok) triggered.push({ identity: 'retired_official', event: 'comeback', result: r6 });
      }
    } else if (identity === 'monk') {
      if ((d.merit || 0) >= EVENT_THRESHOLDS.MONK_SUMMON_MERIT && !d.summoned && !ctx.skipMonkSummon) {
        var r7 = monkTriggerSummonToCourt({ auto: true });
        if (r7.ok) triggered.push({ identity: 'monk', event: 'summon_to_court', result: r7 });
      }
    } else if (identity === 'merchant') {
      if ((d.capital || 0) >= EVENT_THRESHOLDS.MERCHANT_MAGNATE_CAPITAL && d.tier === MERCHANT_TIERS.LOCAL.key && !ctx.skipMagnate) {
        var r8 = merchantTriggerMagnate({ auto: true });
        if (r8.ok) triggered.push({ identity: 'merchant', event: 'magnate', result: r8 });
      }
    } else if (identity === 'artisan') {
      if ((d.skill || 0) >= EVENT_THRESHOLDS.ARTISAN_ROYAL_SKILL && !d.royal && !ctx.skipRoyal) {
        var r9 = artisanTriggerRoyalArtisan({ auto: true });
        if (r9.ok) triggered.push({ identity: 'artisan', event: 'royal_artisan', result: r9 });
      }
    }
    return { ok: true, triggered: triggered, identity: identity };
  }

  function triggerEvent(identity, eventKey, opts) {
    if (!_isTrans()) return { ok: false, reason: '非穿越模式' };
    if (!identity) return { ok: false, reason: '缺 identity' };
    opts = opts || {};
    if (identity === 'eunuch' && eventKey === 'qingliu') return eunuchTriggerQingliuBackfire(opts);
    if (identity === 'maid' && eventKey === 'intrigue') return maidTriggerCourtIntrigue(opts);
    if (identity === 'commoner' && eventKey === 'baiyi') return commonerTriggerBaiyiQingxiang(opts);
    if (identity === 'infant' && (eventKey === 'prodigy' || eventKey === 'mischievous')) return infantTriggerProdigyOrMischievous(eventKey, opts);
    if (identity === 'retired_official' && eventKey === 'comeback') return retiredTriggerComeback(opts);
    if (identity === 'retired_official' && eventKey === 'peaceful') return retiredTriggerPeacefulAging(opts);
    if (identity === 'monk' && eventKey === 'summon') return monkTriggerSummonToCourt(opts);
    if (identity === 'merchant' && eventKey === 'magnate') return merchantTriggerMagnate(opts);
    if (identity === 'artisan' && eventKey === 'royal') return artisanTriggerRoyalArtisan(opts);
    return { ok: false, reason: '未支持的事件: ' + identity + '/' + eventKey };
  }

  // ════════════════════════════════════════════════════════════
  //  §15 SubTask 26C.13 御案"身份路线"面板
  // ════════════════════════════════════════════════════════════

  function renderIdentityPanel(opts) {
    opts = opts || {};
    var s = _getState();
    var identity = s && s.currentIdentity;
    var role = _getPlayerRole();
    var playerName = _getPlayerName();
    var h = '<div class="psi-panel" style="border:1px solid var(--border,#ccc);border-radius:6px;padding:0.5rem;font-size:0.9em;background:var(--bg-panel,#fafafa);">';
    h += '<div style="font-weight:bold;font-size:1.05em;margin-bottom:0.3rem;">身 份 路 线 · ' + _escHtml(playerName) + '</div>';

    if (!identity) {
      h += '<div class="psi-empty" style="color:var(--txt-d,#888);">当前 playerRole = ' + _escHtml(role || '—') + '·无对应特殊身份路线</div>';
      h += '<div class="psi-hint" style="font-size:0.85em;color:var(--txt-d,#888);margin-top:0.2rem;">剧本可经 registerCustomIdentity hook 注入朝代专属身份</div>';
      h += '</div>';
      return h;
    }

    h += '<div class="psi-section" style="margin-bottom:0.4rem;">';
    h += '<div class="psi-row"><span class="psi-key">当前身份</span><span class="psi-val">' + _escHtml(_identityLabel(identity)) + '</span></div>';
    var d = s.identityData && s.identityData[identity];
    if (d) {
      h += _renderIdentityStats(identity, d);
    }
    h += '</div>';

    // 动作集
    var route = getRoute(role);
    if (route.ok && route.actions && route.actions.length) {
      h += '<div class="psi-section"><div class="psi-section-title" style="font-weight:bold;margin-bottom:0.2rem;">可 用 动 作</div>';
      h += '<ul class="psi-actions" style="margin:0;padding:0 0 0 1rem;">';
      route.actions.forEach(function (a) {
        h += '<li><span class="psi-act-key">' + _escHtml(a.key) + '</span> · <span class="psi-act-label">' + _escHtml(a.label) + '</span>';
        if (a.hint) h += ' <span class="psi-act-hint" style="color:var(--txt-d,#888);">（' + _escHtml(a.hint) + '）</span>';
        h += '</li>';
      });
      h += '</ul></div>';
    }

    // 近事
    if (s.events && s.events.length) {
      var recent = s.events.slice(-5);
      h += '<div class="psi-section"><div class="psi-section-title" style="font-weight:bold;margin:0.2rem 0;">近 事</div>';
      recent.forEach(function (e) {
        if (!e) return;
        h += '<div class="psi-row"><span class="psi-ev-kind">T' + e.turn + '·' + _escHtml(e.kind) + '</span><span class="psi-ev-summary"> ' + _escHtml(e.summary) + '</span></div>';
      });
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  function _renderIdentityStats(identity, d) {
    var h = '';
    var parts = [];
    if (identity === 'eunuch') {
      parts.push('阶 ' + _eunuchRankLabel(d.rank));
      parts.push('权 ' + (d.power || 0));
      parts.push('君主信任 ' + (d.sovereignTrust || 0));
      parts.push('外朝紧张 ' + (d.outerTension || 0));
      parts.push('反扑 ' + (d.qingliuBackfireCount || 0) + ' 次');
    } else if (identity === 'maid') {
      parts.push('阶 ' + _maidRankLabel(d.rank));
      parts.push('宠爱 ' + (d.favor || 0));
      parts.push('宫斗 ' + (d.intrigueCount || 0) + ' 次');
    } else if (identity === 'commoner') {
      parts.push('出路 ' + (d.chosenPath || '未定'));
      parts.push('声望 ' + (d.fame || 0));
      parts.push('学问 ' + (d.learning || 0));
    } else if (identity === 'bandit') {
      parts.push('占山 ' + (d.occupyTurns || 0) + ' 回合');
      parts.push('喽啰 ' + (d.banditCount || 0));
      parts.push('恶名 ' + (d.infamy || 0));
      parts.push('分支 ' + (d.branch || '未定'));
    } else if (identity === 'infant') {
      parts.push('年龄 ' + ((d.age || 0).toFixed(1)) + ' 岁');
      parts.push('学问 ' + (d.learning || 0));
      parts.push('管教 ' + (d.discipline || 0));
      parts.push('监护人 ' + (d.guardian || '—'));
    } else if (identity === 'retired_official') {
      parts.push('声望 ' + (d.fame || 0));
      parts.push('乡里影响 ' + (d.localInfluence || 0));
      parts.push('朝廷顾问 ' + (d.courtAdvisory ? '是' : '否'));
      parts.push('分支 ' + (d.branch || '未定'));
    } else if (identity === 'monk') {
      parts.push('宗门 ' + (d.sect || '—'));
      parts.push('功德 ' + (d.merit || 0));
      parts.push('声誉 ' + (d.fame || 0));
      parts.push('世俗服务 ' + (d.services || 0) + ' 次');
      parts.push('入朝 ' + (d.summoned ? '是' : '否'));
    } else if (identity === 'merchant') {
      parts.push('档 ' + (d.tier || '—'));
      parts.push('资本 ' + (d.capital || 0));
      parts.push('跨国贸易 ' + (d.crossBorderTrades || 0) + ' 次');
      parts.push('御赐官商 ' + (d.bestowedCourtMerchant ? '是' : '否'));
    } else if (identity === 'artisan') {
      parts.push('档 ' + (d.tier || '—'));
      parts.push('技艺 ' + (d.skill || 0));
      parts.push('声誉 ' + (d.fame || 0));
      parts.push('进贡 ' + (d.tributes || 0) + ' 件');
      parts.push('御用 ' + (d.royal ? '是' : '否'));
    } else {
      // 自定义身份·剧本可 hook
      Object.keys(d).slice(0, 5).forEach(function (k) {
        parts.push(_escHtml(k) + ': ' + _escHtml(String(d[k])));
      });
    }
    if (parts.length) {
      h += '<div class="psi-stats" style="margin-top:0.2rem;color:var(--txt,#333);font-size:0.9em;">' + parts.join(' · ') + '</div>';
    }
    return h;
  }

  function _escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;';
    });
  }

  // ════════════════════════════════════════════════════════════
  //  §16 SubTask 26C.14 跨朝代 hook·自定义身份
  // ════════════════════════════════════════════════════════════
  // 剧本可经此 hook 注入朝代专属身份（如某些朝代的「军户/乐户/匠户」等户籍身份）
  //   def: { id, label, desc, actions: [{ key, label, hint, available }] }

  function registerCustomIdentity(role, def) {
    if (!_isStr(role)) return { ok: false, reason: '缺 role' };
    if (!def || typeof def !== 'object') return { ok: false, reason: '缺 def' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var entry = {
      id: def.id || role,
      label: def.label || role,
      desc: def.desc || '',
      actions: Array.isArray(def.actions) ? def.actions : [],
      custom: true
    };
    s.customIdentities[role] = entry; // arch-ok
    _pushEvent(s, 'register_custom', '注册自定义身份：' + entry.label, { role: role });
    return { ok: true, role: role, entry: entry };
  }

  function listCustomIdentities() {
    var s = _getState();
    if (!s || !s.customIdentities) return [];
    return Object.keys(s.customIdentities).map(function (k) {
      return JSON.parse(JSON.stringify(s.customIdentities[k]));
    });
  }

  // ════════════════════════════════════════════════════════════
  //  §17 主入口 init + getState
  // ════════════════════════════════════════════════════════════

  function init() {
    var s = _ensureState();
    return !!s;
  }

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  // ════════════════════════════════════════════════════════════
  //  §18 导出命名空间
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    IDENTITY_KINDS: IDENTITY_KINDS,
    EUNUCH_RANKS: EUNUCH_RANKS,
    MAID_RANKS: MAID_RANKS,
    COMMONER_PATHS: COMMONER_PATHS,
    BANDIT_BRANCH: BANDIT_BRANCH,
    INFANT_EVENTS: INFANT_EVENTS,
    RETIRED_BRANCH: RETIRED_BRANCH,
    MONK_SERVICES: MONK_SERVICES,
    MERCHANT_TIERS: MERCHANT_TIERS,
    ARTISAN_TIERS: ARTISAN_TIERS,
    FACTION_TAGS: FACTION_TAGS,
    EVENT_THRESHOLDS: EVENT_THRESHOLDS,

    // 主入口
    init: init,
    getState: getState,
    getCurrentIdentity: getCurrentIdentity,
    setCurrentIdentity: setCurrentIdentity,

    // 路由 / 动作集
    getRoute: getRoute,
    listActionsForRole: listActionsForRole,

    // 事件触发器
    checkEvents: checkEvents,
    triggerEvent: triggerEvent,

    // 跨朝代 hook
    registerCustomIdentity: registerCustomIdentity,
    listCustomIdentities: listCustomIdentities,

    // 26C.2 太监路线
    eunuchInit: eunuchInit,
    eunuchAdvanceRank: eunuchAdvanceRank,
    eunuchClassifyFaction: eunuchClassifyFaction,
    eunuchTriggerQingliuBackfire: eunuchTriggerQingliuBackfire,

    // 26C.3 宫女路线
    maidInit: maidInit,
    maidPromote: maidPromote,
    maidTriggerCourtIntrigue: maidTriggerCourtIntrigue,

    // 26C.4 布衣路线
    commonerInit: commonerInit,
    commonerChoosePath: commonerChoosePath,
    commonerTriggerBaiyiQingxiang: commonerTriggerBaiyiQingxiang,

    // 26C.5 盗贼路线
    banditInit: banditInit,
    banditOccupyMountain: banditOccupyMountain,
    banditAcceptAmnesty: banditAcceptAmnesty,
    banditLaunchRebellion: banditLaunchRebellion,

    // 26C.6 婴儿路线
    infantInit: infantInit,
    infantAutoGrow: infantAutoGrow,
    infantTriggerProdigyOrMischievous: infantTriggerProdigyOrMischievous,

    // 26C.7 退休官员路线
    retiredInit: retiredInit,
    retiredTriggerComeback: retiredTriggerComeback,
    retiredTriggerPeacefulAging: retiredTriggerPeacefulAging,

    // 26C.8 方外路线
    monkInit: monkInit,
    monkPracticeService: monkPracticeService,
    monkTriggerSummonToCourt: monkTriggerSummonToCourt,

    // 26C.9 商贾扩展路线
    merchantInit: merchantInit,
    merchantCrossBorderTrade: merchantCrossBorderTrade,
    merchantTriggerMagnate: merchantTriggerMagnate,
    merchantBestowCourtMerchant: merchantBestowCourtMerchant,

    // 26C.10 匠人扩展路线
    artisanInit: artisanInit,
    artisanTributeToCourt: artisanTributeToCourt,
    artisanTriggerRoyalArtisan: artisanTriggerRoyalArtisan,
    artisanPetitionToPromulgate: artisanPetitionToPromulgate,

    // 26C.13 面板
    renderIdentityPanel: renderIdentityPanel,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _getState: _getState,
    _defaultState: _defaultState,
    _getIdentityData: _getIdentityData,
    _setIdentityData: _setIdentityData,
    _pushEvent: _pushEvent,
    _resolveIdentityFromRole: _resolveIdentityFromRole,
    _buildActionsForIdentity: _buildActionsForIdentity,
    _identityLabel: _identityLabel,
    _eunuchRankLabel: _eunuchRankLabel,
    _maidRankLabel: _maidRankLabel,
    _inferInfantNextRole: _inferInfantNextRole,
    _escHtml: _escHtml,
    _callLLM: _callLLM,
    _spendPlayerCash: _spendPlayerCash,
    _addPlayerCash: _addPlayerCash,
    _interactSoft: _interactSoft,
    _kejuApplySoft: _kejuApplySoft,
    _tradeDispatchSoft: _tradeDispatchSoft,
    _techStartSoft: _techStartSoft,
    _techPetitionSoft: _techPetitionSoft,
    _rebelLaunchSoft: _rebelLaunchSoft,
    _movementTravelSoft: _movementTravelSoft,
    _familyMarrySoft: _familyMarrySoft,
    _familyBirthSoft: _familyBirthSoft,
    _chronicleSoft: _chronicleSoft,
    _addEBSoft: _addEBSoft,
    _isTrans: _isTrans
  };

  // 双路径挂载：浏览器走 window.TM.PlayerSpecialIdentity；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerSpecialIdentity = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
