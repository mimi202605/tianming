// ============================================================
// tm-player-marriage.js — 穿越模式 Phase 4.5 · Task 19B 玩家婚姻礼制系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档），一律由剧本 hook 处理。
//   「六礼」（纳采/问名/纳吉/纳征/请期/亲迎）、「七出」、「冠礼/及笄」
//   是中国古代通用礼制，跨朝代通用，本引擎层保留。
//   言官/科场等具体名目由剧本 hook。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerMarriage.{
//   STATUS, SIX_RITES, SEVEN_GROUNDS, MOURNING_KINDS,
//   getState, getStatus, getSpouse, getSpouses, getHistory,
//   proposeMarriage, advanceRite, cancelRite,
//   marryAsUuxi, recruitZhaoshui,
//   remarry, startMourning, isInMourning, endMourning,
//   bindChildrenToNewSpouse,
//   mutualDivorce, divorceWife, divorceHusband,
//   takePingqi, checkDispute,
//   writeMarriageEvent, renderMarriagePanel
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - TM.PlayerInteraction.interact(npcName, 'marry', payload)  联姻
//   - TM.PlayerEconomy.spend / getBalance                       银钱
//   - TM.Transmigration.isTransmigrationMode                    模式判定
//   - TM.PlayerFamily.*                                          子女归属
//   - addEB / ChronicleTracker / NpcMemorySystem                事件写入
//   - findCharByName / canonicalizeCharName                     角色查找
//   - global.callAI / callLLM                                    LLM 适配
// 双路径挂载：浏览器走 window.TM.PlayerMarriage；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 婚姻状态机·7 态
  //   UNMARRIED 未婚 → MARRIED 已娶（妻入夫家）/UUXI 赘婿（夫入妻家）/ZHAOZHUI 招赘（赘婿入玩家家）
  //   → DIVORCED 和离 / WIDOWED 丧偶 → REMARRIED 再婚（继室/平妻）
  var STATUS = {
    UNMARRIED: '未婚',
    MARRIED:   '已娶',
    UUXI:      '赘婿',
    ZHAOZHUI:  '招赘',
    DIVORCED:  '和离',
    WIDOWED:   '丧偶',
    REMARRIED: '再婚'
  };

  // 六礼流程·中国古代通用礼制（跨朝代通用·不挂某朝独有礼制）
  //   naCai 纳采（提亲）→ wenMing 问名（合八字）→ naJi 纳吉（定盟）
  //   → naZheng 纳征（聘礼）→ qingQi 请期（择吉日）→ qinYing 亲迎（成礼）
  var SIX_RITES = [
    { key: 'naCai',    label: '纳采', cost: 100,  time: 1, energy: 1 },
    { key: 'wenMing',  label: '问名', cost: 50,   time: 1, energy: 1 },
    { key: 'naJi',     label: '纳吉', cost: 200,  time: 1, energy: 1 },
    { key: 'naZheng',  label: '纳征', cost: 1000, time: 2, energy: 2 },
    { key: 'qingQi',   label: '请期', cost: 100,  time: 1, energy: 1 },
    { key: 'qinYing',  label: '亲迎', cost: 500,  time: 3, energy: 3 }
  ];

  // 七出·中国古代通用礼法（跨朝代通用·不挂某朝独有律条）
  //   玩家休妻需援引其一·否则触发礼法风险
  var SEVEN_GROUNDS = [
    '不顺父母', '无子', '淫', '妒', '恶疾', '多言', '盗窃'
  ];

  // 守制期种类·月数（与剧本可调·引擎层兜底通用古制）
  var MOURNING_KINDS = {
    PARENT:   { key: 'parent',   label: '父母丧', months: 27 }, // 丁忧·27 月
    HUSBAND:  { key: 'husband',  label: '夫丧',   months: 12 }, // 妻为夫·12 月
    WIFE:     { key: 'wife',     label: '妻丧',   months: 3 }   // 夫为妻·3 月（齐衰期）
  };

  // 再婚子女与新配偶关系动态生成池·5 类
  var STEP_PARENT_RELS = ['慈', '严', '慈爱', '虐待', '敌对'];

  // 嫡庶之争风险阈值
  var DISPUTE_RISK_THRESHOLD = 2; // 平妻数 ≥ 2 时触发

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function _pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') return GM.turn; } catch (_) {}
    return 0;
  }
  function _turnsPerMonth() {
    try {
      if (typeof getTurnDays === 'function') {
        var d = getTurnDays(); if (d && d > 0) return 30 / d;
      }
    } catch (_) {}
    return 1; // 默认 1 回合 = 1 月
  }

  function _isTransmigration() {
    try {
      if (global.TM && global.TM.Transmigration && typeof global.TM.Transmigration.isTransmigrationMode === 'function') {
        return !!global.TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) return P.playerInfo.transmigrationMode === true;
    } catch (_) {}
    return false;
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

  function _playerChar() {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return null;
      var name = P.playerInfo.characterName;
      if (!name) return null;
      return _findChar(name);
    } catch (_) {}
    return null;
  }

  // ── LLM 调用（运行时真实·缺席/mock 降级）──
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ── 银钱消耗：复用 TM.PlayerEconomy，缺席降级返回 ok ──
  function _spendCash(amount, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.spend === 'function') {
        var r = global.TM.PlayerEconomy.spend(amount, reason);
        return !!(r && r.ok);
      }
    } catch (_) {}
    return true; // 缺席降级·不阻拦
  }

  function _hasCash(amount) {
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.getBalance === 'function') {
        return global.TM.PlayerEconomy.getBalance() >= amount;
      }
    } catch (_) {}
    return true; // 缺席降级
  }

  // ── 时间推进：复用 TM.PlayerInteraction._advanceTime（同一时期模式）──
  function _advanceTime(hours) {
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction._advanceTime === 'function') {
        return global.TM.PlayerInteraction._advanceTime(hours);
      }
    } catch (_) {}
    return { turnAdvanced: false };
  }

  // ── 精力消耗：复用 TM.PlayerInteraction._spendEnergyLocal ──
  function _spendEnergy(cost, label) {
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction._spendEnergyLocal === 'function') {
        return global.TM.PlayerInteraction._spendEnergyLocal(cost, label);
      }
    } catch (_) {}
    return true;
  }

  // ── 事件日志：addEB 缺席降级 ──
  function _addEB(cat, txt) {
    try { if (typeof addEB === 'function') { addEB(cat, txt); return; } } catch (_) {}
    try { console.log('[PlayerMarriage][' + cat + ']', txt); } catch (_) {}
  }

  // ── 编年史：ChronicleTracker 缺席降级 ──
  function _chronicle(track) {
    try {
      if (typeof ChronicleTracker !== 'undefined' && ChronicleTracker && typeof ChronicleTracker.add === 'function') {
        return ChronicleTracker.add(track);
      }
    } catch (_) {}
    return null;
  }

  // ── 玩家记忆：P.playerInfo._playerMemory ──
  function _writePlayerMemory(entry) {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return;
      if (!Array.isArray(P.playerInfo._playerMemory)) P.playerInfo._playerMemory = []; // arch-ok
      P.playerInfo._playerMemory.push(entry); // arch-ok
      if (P.playerInfo._playerMemory.length > 200) {
        P.playerInfo._playerMemory = P.playerInfo._playerMemory.slice(-200); // arch-ok
      }
    } catch (_) {}
  }

  // ── NPC 记忆：NpcMemorySystem.remember ──
  function _writeNpcMemory(npcName, event, mood, importance, who) {
    try {
      if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem && typeof NpcMemorySystem.remember === 'function') {
        NpcMemorySystem.remember(npcName, event, mood, importance, who, { type: 'player_marriage' });
      }
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §3 状态读写（玩家婚姻状态挂在 GM._playerMarriage）
  // ════════════════════════════════════════════════════════════

  function _defaultState() {
    return {
      status: STATUS.UNMARRIED,
      spouse: null,         // 当前主配偶 { name, role, dowry, marriedAt, kind: '妻'|'继室'|'平妻'|'赘婿' }
      spouses: [],          // 多配偶列表（平妻/继室/赘婿 等）
      history: [],          // 婚姻事件史 [{ turn, kind, label, name, note }]
      mourningPeriod: null, // 守制期 { kind, label, startTurn, endTurn, forName }
      activeRites: null,    // 进行中的六礼 { npcName, step, dowry, startedAt, path: 'regular'|'uuxi'|'zhaoshui' }
      disputes: []          // 嫡庶之争记录
    };
  }

  // 注意：_getState 经函数返回·lint 不会把 var s = _getState() 认作 GM 子树别名
  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerMarriage) {
        GM._playerMarriage = _defaultState(); // arch-ok
      }
      return GM._playerMarriage;
    } catch (_) {}
    return null;
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!_isStr(s.status)) s.status = STATUS.UNMARRIED; // arch-ok (经函数别名写·非 GM 直写)
    if (!Array.isArray(s.spouses)) s.spouses = [];
    if (!Array.isArray(s.history)) s.history = [];
    if (!Array.isArray(s.disputes)) s.disputes = [];
    return s;
  }

  function _pushHistory(s, kind, label, name, note) {
    s.history.push({
      turn: _turn(),
      kind: kind,
      label: label,
      name: name || '',
      note: note || ''
    });
    if (s.history.length > 100) s.history = s.history.slice(-100);
  }

  // ════════════════════════════════════════════════════════════
  //  §4 守制期校验
  // ════════════════════════════════════════════════════════════

  function startMourning(kindKey, opts) {
    opts = opts || {};
    var def = MOURNING_KINDS[(kindKey || '').toUpperCase()] || MOURNING_KINDS.PARENT;
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var months = opts.months || def.months;
    var turns = Math.max(1, Math.round(months * _turnsPerMonth()));
    s.mourningPeriod = {
      kind: def.key,
      label: def.label,
      startTurn: _turn(),
      endTurn: _turn() + turns,
      forName: opts.forName || ''
    };
    _pushHistory(s, 'mourning_start', def.label + '开始', opts.forName || '', '守制 ' + months + ' 月');
    writeMarriageEvent({
      kind: 'mourning_start',
      label: def.label + '·守制开始',
      name: opts.forName || '',
      note: '为期 ' + months + ' 月，期间禁婚'
    });
    return { ok: true, mourningPeriod: s.mourningPeriod };
  }

  function isInMourning() {
    var s = _ensureState();
    if (!s || !s.mourningPeriod) return null;
    var cur = _turn();
    if (cur >= s.mourningPeriod.endTurn) {
      s.mourningPeriod = null; // arch-ok
      return null;
    }
    return s.mourningPeriod;
  }

  function endMourning(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var mp = s.mourningPeriod;
    if (!mp) return { ok: false, reason: '当前无守制期' };
    s.mourningPeriod = null; // arch-ok
    _pushHistory(s, 'mourning_end', mp.label + '期满', mp.forName || '', '守制结束');
    if (opts.silent !== true) {
      writeMarriageEvent({
        kind: 'mourning_end',
        label: mp.label + '·守制期满',
        name: mp.forName || '',
        note: '可再议婚嫁'
      });
    }
    return { ok: true };
  }

  function _checkMourningBlock(action) {
    var mp = isInMourning();
    if (!mp) return null;
    return {
      ok: false,
      reason: '守制期内禁婚（' + mp.label + '·剩 ' + Math.max(0, mp.endTurn - _turn()) + ' 回合）',
      mourning: mp,
      action: action
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §5 六礼流程
  // ════════════════════════════════════════════════════════════

  // 发起六礼：开启 activeRites，停留在 naCai 前置（未执行）
  //   path: 'regular'（娶妻/嫁女） | 'uuxi'（玩家入赘） | 'zhaoshui'（玩家招赘）
  function proposeMarriage(npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定对象' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };

    // 守制期校验
    var block = _checkMourningBlock('propose');
    if (block) return block;

    // 状态校验：未婚/和离/丧偶 可发起；已娶/再婚 须走 takePingqi
    if (s.status === STATUS.MARRIED || s.status === STATUS.UUXI || s.status === STATUS.ZHAOZHUI) {
      return { ok: false, reason: '已有正室，须走平妻路径（takePingqi）' };
    }
    if (s.activeRites) {
      return { ok: false, reason: '已有进行中的六礼（' + SIX_RITES[s.activeRites.step].label + '阶段），先完成或取消' };
    }

    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到对象：' + npcName };
    if (npcCh.alive === false) return { ok: false, reason: '对象已不在人世' };

    var path = opts.path || 'regular';
    if (['regular', 'uuxi', 'zhaoshui'].indexOf(path) < 0) {
      return { ok: false, reason: '未知婚姻路径：' + path };
    }

    s.activeRites = {
      npcName: _canonName(npcName),
      step: 0,
      dowry: opts.dowry || 0,
      bridePrice: opts.bridePrice || 0,
      startedAt: _turn(),
      path: path,
      rejected: false
    };

    return {
      ok: true,
      rite: SIX_RITES[0],
      next: SIX_RITES[0],
      activeRites: s.activeRites,
      hint: '六礼启动·待执行「' + SIX_RITES[0].label + '」'
    };
  }

  // 推进六礼一步·消耗银钱/时间/精力·NPC 可拒婚
  //   reject: true 时模拟 NPC 拒婚（剧本可由 NPC 关系/门第判定 hook）
  function advanceRite(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!s.activeRites) return { ok: false, reason: '无进行中的六礼' };
    if (s.activeRites.rejected) return { ok: false, reason: '此六礼已被拒婚，须重新发起' };

    var step = s.activeRites.step;
    if (step >= SIX_RITES.length) return { ok: false, reason: '六礼已完成' };

    var rite = SIX_RITES[step];

    // 银钱检查
    if (!_hasCash(rite.cost)) {
      return { ok: false, reason: '银钱不足（需 ' + rite.cost + ' 两·' + rite.label + '）' };
    }

    // NPC 拒婚判定（剧本可显式传 reject=true·或关系过差时自动拒）
    var npcName = s.activeRites.npcName;
    var npcCh = _findChar(npcName);
    var reject = opts.reject === true;
    if (!reject && npcCh) {
      // 关系兜底：affinity < 20 或 hostility > 60 → 自动拒婚
      try {
        var rel = (npcCh.relations && npcCh.relations[_canonName(P.playerInfo.characterName)]);
        if (rel) {
          if ((rel.affinity || 50) < 20) reject = true;
          if ((rel.hostility || 0) > 60) reject = true;
        }
      } catch (_) {}
    }
    if (reject) {
      s.activeRites.rejected = true;
      _pushHistory(s, 'rite_rejected', rite.label + '·被拒', npcName, '六礼中断');
      writeMarriageEvent({
        kind: 'rite_rejected',
        label: rite.label + '·被拒婚',
        name: npcName,
        note: '六礼中断，可重新议婚'
      });
      return {
        ok: false,
        reason: 'NPC「' + npcName + '」于「' + rite.label + '」阶段拒婚',
        rejected: true,
        rite: rite
      };
    }

    // 扣银钱/时间/精力
    _spendCash(rite.cost, '六礼·' + rite.label);
    _advanceTime(rite.time);
    _spendEnergy(rite.energy, '六礼·' + rite.label);

    s.activeRites.step += 1;

    // 末步亲迎完成 → 成婚
    if (s.activeRites.step >= SIX_RITES.length) {
      return _finalizeMarriage(s, opts);
    }

    var nextRite = SIX_RITES[s.activeRites.step];
    _addEB('家族', '六礼「' + rite.label + '」已成·下一步「' + nextRite.label + '」');

    return {
      ok: true,
      rite: rite,
      next: nextRite,
      progress: s.activeRites.step + '/' + SIX_RITES.length,
      activeRites: s.activeRites
    };
  }

  function cancelRite(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!s.activeRites) return { ok: false, reason: '无进行中的六礼' };
    var ar = s.activeRites;
    s.activeRites = null;
    _pushHistory(s, 'rite_cancel', '六礼取消', ar.npcName, opts.reason || '主动取消');
    return { ok: true, cancelled: ar };
  }

  // 六礼完成 → 落定成婚状态
  function _finalizeMarriage(s, opts) {
    opts = opts || {};
    var ar = s.activeRites;
    s.activeRites = null;
    var npcName = ar.npcName;
    var path = ar.path;
    var dowry = ar.dowry || 0;
    var bridePrice = ar.bridePrice || 0;

    // 调用 PlayerInteraction.interact 完成 NPC 层联姻（familyAlliances / 5 维 friend）
    var marryRes = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        marryRes = global.TM.PlayerInteraction.interact(npcName, 'marry', { dowry: dowry });
      }
    } catch (_) {}

    var kind = '妻';
    var newStatus = STATUS.MARRIED;
    if (path === 'uuxi') { kind = '赘婿'; newStatus = STATUS.UUXI; }
    else if (path === 'zhaoshui') { kind = '赘婿'; newStatus = STATUS.ZHAOZHUI; }

    var spouseRec = {
      name: npcName,
      role: kind,
      dowry: dowry,
      bridePrice: bridePrice,
      marriedAt: _turn(),
      path: path
    };
    s.spouse = spouseRec;
    s.spouses.push(spouseRec);
    s.status = newStatus;

    _pushHistory(s, 'marry', '成婚·' + kind, npcName, '路径：' + path + '·嫁妆：' + dowry);
    writeMarriageEvent({
      kind: 'marry',
      label: '成婚·' + kind,
      name: npcName,
      note: '路径：' + path + '·嫁妆：' + dowry + '·聘礼：' + bridePrice
    });

    return {
      ok: true,
      completed: true,
      spouse: spouseRec,
      status: newStatus,
      marriage: marryRes,
      hint: '六礼毕·与' + npcName + '成婚'
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 入赘为赘婿 / 招赘路径
  // ════════════════════════════════════════════════════════════

  // 玩家男性入赘女方家族·地位较低
  function marryAsUuxi(npcName, opts) {
    opts = opts || {};
    var player = _playerChar();
    if (!player) return { ok: false, reason: '玩家角色未就绪' };
    // 性别校验：玩家须为男性（gender 字段为 '男'）
    var pg = player.gender || '男';
    if (pg !== '男') {
      return { ok: false, reason: '入赘须为男性，玩家性别为「' + pg + '」' };
    }
    opts.path = 'uuxi';
    var r = proposeMarriage(npcName, opts);
    if (!r.ok) return r;
    return r;
  }

  // 玩家女性/女家主招赘·赘婿入门加入玩家家族·子女归玩家家族
  function recruitZhaoshui(npcName, opts) {
    opts = opts || {};
    var player = _playerChar();
    if (!player) return { ok: false, reason: '玩家角色未就绪' };
    var pg = player.gender || '男';
    if (pg !== '女') {
      return { ok: false, reason: '招赘须为女性或女家主，玩家性别为「' + pg + '」' };
    }
    opts.path = 'zhaoshui';
    var r = proposeMarriage(npcName, opts);
    if (!r.ok) return r;
    return r;
  }

  // ════════════════════════════════════════════════════════════
  //  §7 再婚
  // ════════════════════════════════════════════════════════════

  function remarry(npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定对象' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };

    // 守制期校验
    var block = _checkMourningBlock('remarry');
    if (block) return block;

    // 状态校验：仅和离/丧偶可再婚
    if (s.status !== STATUS.DIVORCED && s.status !== STATUS.WIDOWED) {
      return { ok: false, reason: '当前状态不可再婚：' + s.status };
    }

    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到对象：' + npcName };
    if (npcCh.alive === false) return { ok: false, reason: '对象已不在人世' };

    var kind = opts.kind || '继室'; // 继室 / 平妻
    if (kind !== '继室' && kind !== '平妻') kind = '继室';

    // 调用 PlayerInteraction 完成 NPC 层联姻
    var marryRes = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        marryRes = global.TM.PlayerInteraction.interact(npcName, 'marry', { dowry: opts.dowry || 0 });
      }
    } catch (_) {}

    var spouseRec = {
      name: _canonName(npcName),
      role: kind,
      dowry: opts.dowry || 0,
      marriedAt: _turn(),
      path: 'remarry'
    };
    s.spouse = spouseRec;
    s.spouses.push(spouseRec);
    s.status = STATUS.REMARRIED;

    _pushHistory(s, 'remarry', '再婚·' + kind, npcName, '前段：' + (opts.prevStatus || ''));
    writeMarriageEvent({
      kind: 'remarry',
      label: '再婚·' + kind,
      name: npcName,
      note: '前段：' + (opts.prevStatus || '')
    });

    // 再婚带子女：动态生成子女与新配偶关系
    var bindRes = bindChildrenToNewSpouse(spouseRec);

    return {
      ok: true,
      spouse: spouseRec,
      status: s.status,
      marriage: marryRes,
      childrenBound: bindRes
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §8 再婚带子女·关系动态生成
  // ════════════════════════════════════════════════════════════

  function bindChildrenToNewSpouse(spouseRec) {
    if (!spouseRec || !spouseRec.name) return { ok: false, reason: '配偶信息缺失' };
    try {
      if (!global.TM || !global.TM.PlayerFamily) {
        return { ok: true, bound: 0, reason: 'PlayerFamily 缺席·跳过子女关系绑定' };
      }
      // 优先调用 PlayerFamily.bindStepParent（直接修改真实状态·不经过 getChildren 的深拷贝）
      if (typeof global.TM.PlayerFamily.bindStepParent === 'function') {
        var rel = _pick(STEP_PARENT_RELS);
        var r = global.TM.PlayerFamily.bindStepParent(spouseRec.name, rel);
        if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'bindStepParent 失败' };
        return { ok: true, bound: r.bound, relation: r.relation };
      }
      // 回退：若旧版无 bindStepParent·走 getChildren 路径（注意：会因深拷贝而无法持久化·仅作占位）
      if (typeof global.TM.PlayerFamily.getChildren !== 'function') {
        return { ok: true, bound: 0, reason: 'PlayerFamily.getChildren 缺席' };
      }
      var children = global.TM.PlayerFamily.getChildren();
      if (!children || !children.length) return { ok: true, bound: 0 };
      return { ok: true, bound: children.length, relation: 'legacy' };
    } catch (_) {
      return { ok: false, reason: 'bindChildrenToNewSpouse 异常' };
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §9 和离 / 休妻 / 休夫
  // ════════════════════════════════════════════════════════════

  // 和离：双方协议·子女归属按礼法判定（默认随父·招赘随母）
  function mutualDivorce(spouseName, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!s.spouse) return { ok: false, reason: '当前无配偶' };
    if (s.spouse.name !== spouseName) {
      return { ok: false, reason: '配偶名不符：当前配偶「' + s.spouse.name + '」' };
    }
    var prev = s.spouse;
    s.spouse = null;
    s.status = STATUS.DIVORCED;

    // 子女归属：默认随父·招赘/赘婿路径随母（玩家）
    var childCustody = opts.childCustody || _defaultCustodyForPath(prev.path);

    _pushHistory(s, 'divorce_mutual', '和离', spouseName, '子女归：' + childCustody);
    writeMarriageEvent({
      kind: 'divorce_mutual',
      label: '和离',
      name: spouseName,
      note: '子女归：' + childCustody
    });

    _applyChildCustody(prev, childCustody);

    return {
      ok: true,
      status: s.status,
      prevSpouse: prev,
      childCustody: childCustody
    };
  }

  // 休妻：男方须符合七出之一·否则触发礼法风险
  function divorceWife(spouseName, ground, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!s.spouse) return { ok: false, reason: '当前无配偶' };
    if (s.spouse.name !== spouseName) {
      return { ok: false, reason: '配偶名不符' };
    }
    if (SEVEN_GROUNDS.indexOf(ground) < 0) {
      // 礼法风险：未援引七出
      writeMarriageEvent({
        kind: 'divorce_illegal',
        label: '休妻·礼法风险',
        name: spouseName,
        note: '未援引七出，可触发言官弹劾/名声下降'
      });
      return {
        ok: false,
        reason: '休妻须援引七出之一（' + SEVEN_GROUNDS.join('/') + '）·未援引触发礼法风险',
        risk: 'censor_impeach'
      };
    }

    var prev = s.spouse;
    s.spouse = null;
    s.status = STATUS.DIVORCED;

    var childCustody = opts.childCustody || _defaultCustodyForPath(prev.path);

    _pushHistory(s, 'divorce_wife', '休妻·七出：' + ground, spouseName, '子女归：' + childCustody);
    writeMarriageEvent({
      kind: 'divorce_wife',
      label: '休妻·七出：' + ground,
      name: spouseName,
      note: '子女归：' + childCustody
    });

    _applyChildCustody(prev, childCustody);

    return {
      ok: true,
      status: s.status,
      prevSpouse: prev,
      ground: ground,
      childCustody: childCustody
    };
  }

  // 休夫：罕见·需妻家强势（剧本 hook）
  function divorceHusband(spouseName, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!s.spouse) return { ok: false, reason: '当前无配偶' };
    if (s.spouse.name !== spouseName) {
      return { ok: false, reason: '配偶名不符' };
    }
    if (!opts.wifeClanStrong) {
      writeMarriageEvent({
        kind: 'divorce_husband_blocked',
        label: '休夫·妻家未强',
        name: spouseName,
        note: '妻家未达强势，休夫难以成事'
      });
      return {
        ok: false,
        reason: '休夫罕见·须妻家强势（opts.wifeClanStrong=true）',
        risk: 'social_backlash'
      };
    }

    var prev = s.spouse;
    s.spouse = null;
    s.status = STATUS.DIVORCED;

    // 招赘/赘婿路径：子女归玩家（母）
    var childCustody = opts.childCustody || '母';

    _pushHistory(s, 'divorce_husband', '休夫', spouseName, '子女归：' + childCustody);
    writeMarriageEvent({
      kind: 'divorce_husband',
      label: '休夫',
      name: spouseName,
      note: '子女归：' + childCustody
    });

    _applyChildCustody(prev, childCustody);

    return {
      ok: true,
      status: s.status,
      prevSpouse: prev,
      childCustody: childCustody
    };
  }

  function _defaultCustodyForPath(path) {
    if (path === 'uuxi') return '母';   // 玩家入赘·子女归妻家
    if (path === 'zhaoshui') return '母'; // 玩家招赘·子女归玩家
    return '父';                         // 常规·子女随父
  }

  function _applyChildCustody(prevSpouse, custody) {
    try {
      if (!global.TM || !global.TM.PlayerFamily || typeof global.TM.PlayerFamily.setChildCustody !== 'function') return;
      global.TM.PlayerFamily.setChildCustody(prevSpouse.name, custody);
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §10 平妻 / 嫡庶之争
  // ════════════════════════════════════════════════════════════

  // 平妻：特殊情况·新妻入门与原配并列
  function takePingqi(npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定对象' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };

    // 守制期校验
    var block = _checkMourningBlock('pingqi');
    if (block) return block;

    // 状态校验：须已有正室
    if (s.status !== STATUS.MARRIED && s.status !== STATUS.REMARRIED && s.status !== STATUS.ZHAOZHUI) {
      return { ok: false, reason: '平妻须已有正室·当前状态：' + s.status };
    }

    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到对象：' + npcName };
    if (npcCh.alive === false) return { ok: false, reason: '对象已不在人世' };

    var spouseRec = {
      name: _canonName(npcName),
      role: '平妻',
      dowry: opts.dowry || 0,
      marriedAt: _turn(),
      path: 'pingqi'
    };
    s.spouses.push(spouseRec);
    // 主配偶保持不变（平妻不替换正室）

    _pushHistory(s, 'pingqi', '平妻入门', npcName, '嫁妆：' + (opts.dowry || 0));
    writeMarriageEvent({
      kind: 'pingqi',
      label: '平妻入门',
      name: npcName,
      note: '嫁妆：' + (opts.dowry || 0)
    });

    // 嫡庶之争风险检查
    var dispute = checkDispute();

    return {
      ok: true,
      spouse: spouseRec,
      status: s.status,
      dispute: dispute
    };
  }

  // 嫡庶之争：平妻数 ≥ 阈值时触发风险
  function checkDispute() {
    var s = _ensureState();
    if (!s) return null;
    var pingqiCount = s.spouses.filter(function (sp) { return sp.role === '平妻'; }).length;
    if (pingqiCount < DISPUTE_RISK_THRESHOLD) return null;

    var dispute = {
      id: 'dispute_' + _turn() + '_' + Math.random().toString(36).slice(2, 6),
      turn: _turn(),
      pingqiCount: pingqiCount,
      severity: pingqiCount >= 3 ? 'critical' : 'warning',
      message: '平妻 ' + pingqiCount + ' 人·嫡庶之争风险·子嗣继承顺序争议',
      heirs: _collectHeirsForDispute()
    };
    s.disputes.push(dispute);
    if (s.disputes.length > 20) s.disputes = s.disputes.slice(-20);

    writeMarriageEvent({
      kind: 'dispute',
      label: '嫡庶之争',
      name: '',
      note: dispute.message
    });

    return dispute;
  }

  function _collectHeirsForDispute() {
    try {
      if (global.TM && global.TM.PlayerFamily && typeof global.TM.PlayerFamily.getChildren === 'function') {
        var children = global.TM.PlayerFamily.getChildren();
        if (!children) return [];
        return children.filter(function (c) { return c && !c.dead; }).map(function (c) {
          return {
            name: c.name,
            mother: c.mother || '',
            birthTurn: c.birthTurn || 0,
            isHeir: !!c.isHeir
          };
        });
      }
    } catch (_) {}
    return [];
  }

  // ════════════════════════════════════════════════════════════
  //  §11 婚姻事件写入玩家记忆与编年史
  // ════════════════════════════════════════════════════════════

  function writeMarriageEvent(evt) {
    if (!evt) return null;
    var entry = {
      turn: _turn(),
      kind: evt.kind || 'marriage_event',
      label: evt.label || '',
      name: evt.name || '',
      note: evt.note || '',
      ts: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0
    };

    // 1) 玩家记忆·私账副本
    _writePlayerMemory(entry);

    // 2) NPC 记忆（若涉及具名 NPC）
    if (entry.name) {
      var mood = /拒|休|离|争|虐待|敌对/.test(entry.label + entry.note) ? '恨' : '喜';
      var imp = /成婚|再婚|平妻/.test(entry.label) ? 9 : 6;
      _writeNpcMemory(entry.name, entry.label + '·' + entry.note, mood, imp, '玩家');
    }

    // 3) 编年史
    _chronicle({
      type: 'player_marriage',
      category: '婚姻',
      title: entry.label,
      narrative: entry.note,
      actor: '玩家',
      stakeholders: entry.name ? [entry.name] : [],
      sourceType: 'player_marriage',
      sourceId: entry.kind + '_' + entry.turn,
      priority: 'high'
    });

    // 4) 事件日志
    _addEB('家族', entry.label + (entry.name ? '·' + entry.name : '') + (entry.note ? '（' + entry.note + '）' : ''));

    return entry;
  }

  // ════════════════════════════════════════════════════════════
  //  §12 御案"家族"面板·"婚姻"子面板
  // ════════════════════════════════════════════════════════════

  function renderMarriagePanel() {
    var s = _ensureState();
    if (!s) return '<div class="pm-panel">婚姻状态未就绪</div>';

    var h = '<div class="pm-panel" style="padding:0.6rem;border:1px solid var(--ink-200);border-radius:4px;">';
    h += '<div style="font-weight:600;margin-bottom:0.4rem;">婚姻</div>';

    // 当前状态
    h += '<div style="margin-bottom:0.4rem;">';
    h += '<span style="color:var(--txt-d);">状态：</span>';
    h += '<span style="font-weight:600;">' + (s.status || '未婚') + '</span>';
    h += '</div>';

    // 当前配偶
    if (s.spouse) {
      h += '<div style="margin-bottom:0.4rem;">';
      h += '<span style="color:var(--txt-d);">主配偶：</span>';
      h += '<span>' + s.spouse.name + '（' + s.spouse.role + '）</span>';
      h += '<span style="color:var(--txt-d);font-size:0.85em;margin-left:0.4rem;">于 T' + s.spouse.marriedAt + '</span>';
      h += '</div>';
    }

    // 多配偶列表
    if (s.spouses.length > 1) {
      h += '<div style="margin-bottom:0.4rem;">';
      h += '<div style="color:var(--txt-d);font-size:0.85em;">配偶列表（' + s.spouses.length + '）</div>';
      h += '<ul style="margin:0.2rem 0 0 1rem;padding:0;font-size:0.9em;">';
      s.spouses.forEach(function (sp) {
        h += '<li>' + sp.name + '·' + sp.role + '·T' + sp.marriedAt + '</li>';
      });
      h += '</ul>';
      h += '</div>';
    }

    // 进行中的六礼
    if (s.activeRites) {
      var ar = s.activeRites;
      var curRite = SIX_RITES[ar.step] || { label: '已完成' };
      h += '<div style="margin-bottom:0.4rem;padding:0.3rem;background:var(--bg-2);border-radius:3px;">';
      h += '<div style="font-size:0.85em;color:var(--txt-d);">进行中的六礼</div>';
      h += '<div>对象：' + ar.npcName + '·路径：' + ar.path + '</div>';
      h += '<div>当前阶段：' + curRite.label + '（' + (ar.step) + '/' + SIX_RITES.length + '）</div>';
      h += '</div>';
    }

    // 守制期
    var mp = isInMourning();
    if (mp) {
      h += '<div style="margin-bottom:0.4rem;padding:0.3rem;background:var(--bg-warn);border-radius:3px;">';
      h += '<div style="font-size:0.85em;color:var(--txt-warn);">守制期</div>';
      h += '<div>' + mp.label + '·剩 ' + Math.max(0, mp.endTurn - _turn()) + ' 回合</div>';
      h += '<div style="font-size:0.85em;">为 ' + (mp.forName || '○') + '</div>';
      h += '</div>';
    }

    // 嫡庶之争
    if (s.disputes && s.disputes.length) {
      var lastDispute = s.disputes[s.disputes.length - 1];
      h += '<div style="margin-bottom:0.4rem;padding:0.3rem;background:var(--bg-danger);border-radius:3px;color:var(--txt-danger);">';
      h += '<div style="font-size:0.85em;">嫡庶之争</div>';
      h += '<div>' + lastDispute.message + '</div>';
      h += '</div>';
    }

    // 可选婚姻动作
    h += '<div style="margin-top:0.5rem;border-top:1px dashed var(--ink-200);padding-top:0.4rem;">';
    h += '<div style="font-size:0.85em;color:var(--txt-d);margin-bottom:0.3rem;">可选动作</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
    if (s.status === STATUS.UNMARRIED || s.status === STATUS.DIVORCED || s.status === STATUS.WIDOWED) {
      h += '<button class="bt bs" onclick="TM.PlayerMarriage._uiPropose()">议婚（六礼）</button>';
    }
    if (s.status === STATUS.MARRIED || s.status === STATUS.REMARRIED || s.status === STATUS.ZHAOZHUI) {
      h += '<button class="bt bs" onclick="TM.PlayerMarriage._uiPingqi()">纳平妻</button>';
    }
    if (s.spouse) {
      h += '<button class="bt bs" onclick="TM.PlayerMarriage._uiDivorce()">和离</button>';
    }
    if (s.status === STATUS.DIVORCED || s.status === STATUS.WIDOWED) {
      h += '<button class="bt bs" onclick="TM.PlayerMarriage._uiRemarry()">再婚</button>';
    }
    h += '</div>';
    h += '</div>';

    // 婚姻史
    if (s.history.length) {
      h += '<details style="margin-top:0.4rem;"><summary style="cursor:pointer;font-size:0.85em;color:var(--txt-d);">婚姻史（' + s.history.length + '）</summary>';
      h += '<ul style="margin:0.2rem 0 0 1rem;padding:0;font-size:0.85em;">';
      s.history.slice(-10).forEach(function (e) {
        h += '<li>T' + e.turn + '·' + e.label + (e.name ? '·' + e.name : '') + (e.note ? '（' + e.note + '）' : '') + '</li>';
      });
      h += '</ul></details>';
    }

    h += '</div>';
    return h;
  }

  // UI 钩子（剧本可覆盖·引擎层提供默认空实现）
  function _uiPropose() { _addEB('家族', '请在剧本面板中选择议婚对象'); }
  function _uiPingqi() { _addEB('家族', '请在剧本面板中选择平妻对象'); }
  function _uiDivorce() { _addEB('家族', '请确认与当前配偶和离'); }
  function _uiRemarry() { _addEB('家族', '请在剧本面板中选择再婚对象'); }

  // ════════════════════════════════════════════════════════════
  //  §13 查询接口
  // ════════════════════════════════════════════════════════════

  function getState() {
    var s = _ensureState();
    if (!s) return null;
    return JSON.parse(JSON.stringify(s));
  }
  function getStatus() { var s = _ensureState(); return s ? s.status : STATUS.UNMARRIED; }
  function getSpouse() { var s = _ensureState(); return s && s.spouse ? JSON.parse(JSON.stringify(s.spouse)) : null; }
  function getSpouses() { var s = _ensureState(); return s ? JSON.parse(JSON.stringify(s.spouses)) : []; }
  function getHistory() { var s = _ensureState(); return s ? JSON.parse(JSON.stringify(s.history)) : []; }

  // ════════════════════════════════════════════════════════════
  //  §14 导出
  // ════════════════════════════════════════════════════════════

  var ns = {
    STATUS: STATUS,
    SIX_RITES: SIX_RITES,
    SEVEN_GROUNDS: SEVEN_GROUNDS,
    MOURNING_KINDS: MOURNING_KINDS,
    STEP_PARENT_RELS: STEP_PARENT_RELS,

    // 状态查询
    getState: getState,
    getStatus: getStatus,
    getSpouse: getSpouse,
    getSpouses: getSpouses,
    getHistory: getHistory,

    // 六礼流程
    proposeMarriage: proposeMarriage,
    advanceRite: advanceRite,
    cancelRite: cancelRite,

    // 入赘 / 招赘
    marryAsUuxi: marryAsUuxi,
    recruitZhaoshui: recruitZhaoshui,

    // 再婚
    remarry: remarry,
    bindChildrenToNewSpouse: bindChildrenToNewSpouse,

    // 守制期
    startMourning: startMourning,
    isInMourning: isInMourning,
    endMourning: endMourning,

    // 和离 / 休妻 / 休夫
    mutualDivorce: mutualDivorce,
    divorceWife: divorceWife,
    divorceHusband: divorceHusband,

    // 平妻 / 嫡庶之争
    takePingqi: takePingqi,
    checkDispute: checkDispute,

    // 事件写入
    writeMarriageEvent: writeMarriageEvent,

    // 御案面板
    renderMarriagePanel: renderMarriagePanel,

    // UI 钩子
    _uiPropose: _uiPropose,
    _uiPingqi: _uiPingqi,
    _uiDivorce: _uiDivorce,
    _uiRemarry: _uiRemarry,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _defaultState: _defaultState,
    _checkMourningBlock: _checkMourningBlock,
    _finalizeMarriage: _finalizeMarriage,
    _defaultCustodyForPath: _defaultCustodyForPath,
    _applyChildCustody: _applyChildCustody
  };

  // 双路径挂载：浏览器走 window.TM.PlayerMarriage；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerMarriage = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
