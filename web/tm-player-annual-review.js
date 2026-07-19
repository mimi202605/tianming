// ============================================================
// tm-player-annual-review.js — 穿越模式 Phase 4.5 · Task 25 玩家官员年终考核
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（一律由剧本 hook）。
//   「九等考核」（上上/上中/上下/中上/中中/中下/下上/下中/下下）是中国古代
//   通用考核制度，跨朝代通用，本引擎层保留。
//   朝代专属考核名目（如某些朝代的京考/外考/大计等）一律由剧本 hook，
//   引擎层只提供「年末考核 + 6 维指标 + 九等结果 + 后果触发」的通用框架。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerAnnualReview.{
//   INDICATORS, GRADES, CONSEQUENCES, OPERATION_KINDS,
//   getState, getHistory, getCurrentYear, getIndicators,
//   getPendingReview, getNotifications, clearNotification, dismissPendingReview,
//   triggerReview, computeIndicators, generateComment, deriveGrade, applyConsequences,
//   operateBribe, operateNetwork,
//   writeReviewEvent, renderAnnualReviewPanel
// }
// 依赖（运行时软依赖·缺席降级）：
//   - TM.Transmigration.isTransmigrationMode          模式判定
//   - TM.PlayerInteraction.interact(npc,'entrust')    托人情
//   - TM.PlayerInteraction.getRelationDims            5 维关系
//   - TM.PlayerEconomy.spend / getState               贿赂成本 / 廉洁度
//   - ChronicleTracker.add                            编年史写入
//   - addEB                                           事件日志
//   - findCharByName / canonicalizeCharName           角色查找
//   - global.callAI / callLLM                         LLM 适配
//   - GM._playerAnnualReview / GM.turn / GM.minxin / P.playerInfo.*
// 双路径挂载：浏览器走 window.TM.PlayerAnnualReview；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  if (!global.TM) global.TM = {};

  // ════════════════════════════════════════════════════════════
  //  §1 SubTask 25.1 常量
  // ════════════════════════════════════════════════════════════

  // 6 维考核指标·中国古代通用考核维度（跨朝代通用·不挂某朝独有考核名目）
  //   每维 0-100·权重合计 1.0
  var INDICATORS = {
    duty:           { label: '履职',     weight: 0.20, desc: '本职履职情况' },
    administration: { label: '政务',     weight: 0.20, desc: '政务成绩' },
    integrity:      { label: '廉洁',     weight: 0.20, desc: '廉洁度' },
    interpersonal:  { label: '人际',     weight: 0.15, desc: '人际关系' },
    superior:       { label: '上级评价', weight: 0.15, desc: '上级评价' },
    public:         { label: '民众口碑', weight: 0.10, desc: '民众口碑' }
  };

  // 九等考核·中国古代通用考核制度（跨朝代通用·不挂某朝独有考核名目）
  //   gradeIdx 0-8·分数由高到低
  var GRADES = [
    { key: 'shangshang', label: '上上', minScore: 90, idx: 0 },
    { key: 'shangzhong', label: '上中', minScore: 80, idx: 1 },
    { key: 'shangxia',   label: '上下', minScore: 70, idx: 2 },
    { key: 'zhongshang', label: '中上', minScore: 65, idx: 3 },
    { key: 'zhongzhong', label: '中中', minScore: 55, idx: 4 },
    { key: 'zhongxia',   label: '中下', minScore: 45, idx: 5 },
    { key: 'xiashang',   label: '下上', minScore: 35, idx: 6 },
    { key: 'xiazhong',   label: '下中', minScore: 25, idx: 7 },
    { key: 'xiaxia',     label: '下下', minScore: 0,  idx: 8 }
  ];

  // 后果触发·按等级映射（升迁/贬谪/加俸/罚俸/赐物/记过/罢黜）
  //   - 升迁: playerRole 升级或品级下降（数字越小品级越高）
  //   - 贬谪: playerRole 降级或品级上升
  //   - 加俸/罚俸: 调整 salaryMultiplier（PlayerEconomy 读取）
  //   - 赐物: 颁赐物品（写入 inventory）
  //   - 记过: 累计 demerits 字段·满阈值触发贬谪
  //   - 罢黜: playerRole → 'retired_official'
  var CONSEQUENCES = {
    shangshang: ['promote', 'salaryRaise'],
    shangzhong: ['salaryRaise', 'gift'],
    shangxia:   ['gift'],
    zhongshang: [],
    zhongzhong: [],
    zhongxia:   ['salaryCut'],
    xiashang:   ['salaryCut', 'demerit'],
    xiazhong:   ['demerit', 'demote'],
    xiaxia:     ['dismiss']
  };

  // 主动运作种类·贿赂考官 / 托人情
  //   cost:     银钱成本（贿赂）/ 0 走人物互动（托人情）
  //   boost:    指标向上偏移幅度
  //   risk:     被发现风险
  //   via:      'economy' 走 PlayerEconomy / 'interaction' 走 PlayerInteraction
  var OPERATION_KINDS = {
    bribe:   { label: '贿赂考官', cost: 1000, boost: 10, risk: 0.30, via: 'economy',   boostDims: ['duty','administration','integrity','interpersonal','superior','public'] },
    network: { label: '托人情',   cost: 0,    boost: 6,  risk: 0.15, via: 'interaction', boostDims: ['interpersonal','superior'] }
  };

  // 后果参数（朝代中立·数值由引擎兜底·剧本可覆盖）
  var SALARY_RAISE_STEP = 0.10;   // 加俸：salaryMultiplier +0.10
  var SALARY_CUT_STEP   = 0.15;   // 罚俸：salaryMultiplier -0.15
  var DEMERIT_THRESHOLD = 3;      // 记过累计 ≥3 触发贬谪
  var GIFT_ITEM_POOL = ['绢帛', '银两', '茶叶', '玉器', '良马', '书籍'];
  var HISTORY_MAX = 50;
  var NOTIFICATIONS_MAX = 20;
  var OPERATIONS_MAX = 50;

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数（朝代中立·软依赖降级）
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _rnd() {
    try { if (typeof Math !== 'undefined' && Math.random) return Math.random(); } catch (_) {}
    return 0.5;
  }
  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _pick(arr) { return arr.length ? arr[Math.floor(_rnd() * arr.length)] : ''; }

  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerAnnualReview]', m); } catch (_) {}
  }

  function _esc(s) {
    if (typeof escHtml === 'function') { try { return escHtml(s); } catch (_) {} }
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

  // ── LLM 调用·主路径 global.callAI·备用 callLLM·缺席返回 null ──
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
    return true;
  }

  // ── 事件日志：addEB 缺席降级 ──
  function _addEB(cat, txt) {
    try { if (typeof addEB === 'function') { addEB(cat, txt); return; } } catch (_) {}
    try { console.log('[PlayerAnnualReview][' + cat + ']', txt); } catch (_) {}
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

  // ── 玩家记忆：P.playerInfo._playerMemory（沿用 tm-player-interaction.js 同款）──
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
        NpcMemorySystem.remember(npcName, event, mood, importance, who, { type: 'player_annual_review' });
      }
    } catch (_) {}
  }

  // ── 玩家角色字段读取（朝代中立·缺席 50 中性值）──
  function _playerStat(field, dflt) {
    var c = _playerChar();
    if (c && _isNum(c[field])) return c[field];
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isNum(P.playerInfo[field])) {
        return P.playerInfo[field];
      }
    } catch (_) {}
    return (typeof dflt === 'number') ? dflt : 50;
  }

  // 民心读取·GM.minxin.trueIndex 主路径·GM.minxin 兼容旧数字·缺席 50
  function _minxinValue() {
    try {
      if (typeof GM !== 'undefined' && GM && GM.minxin) {
        if (_isNum(GM.minxin.trueIndex)) return _clamp(GM.minxin.trueIndex, 0, 100);
        if (_isNum(GM.minxin.index)) return _clamp(GM.minxin.index, 0, 100);
        if (_isNum(GM.minxin)) return _clamp(GM.minxin, 0, 100);
      }
    } catch (_) {}
    return 50;
  }

  // ════════════════════════════════════════════════════════════
  //  §3 SubTask 25.1 状态读写（账本挂在 GM._playerAnnualReview）
  // ════════════════════════════════════════════════════════════
  //
  // 账本挂在 GM._playerAnnualReview（与 task spec 规范 4 一致·arch-ok 行内豁免）：
  //   {
  //     history:              [ { year, turn, grade, gradeIdx, indicators, comment, consequences, operations } ],
  //     currentYear:          null | number,
  //     indicators:           { duty, administration, integrity, interpersonal, superior, public },
  //     pendingReview:        null | full review object,
  //     operations:           [ { turn, kind, label, target, cost, boost, detected } ],
  //     pendingNotifications: [ { id, turn, kind, title, body, ts } ],
  //     salaryMultiplier:     1.0,   // 加俸/罚俸累计调整
  //     demerits:             0,     // 记过累计
  //     detectedOpCount:      0      // 被发现运作次数（累计·影响上级评价）
  //   }

  function _defaultState() {
    return {
      history: [],
      currentYear: null,
      indicators: {},
      pendingReview: null,
      operations: [],
      pendingNotifications: [],
      salaryMultiplier: 1.0,
      demerits: 0,
      detectedOpCount: 0
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerAnnualReview || typeof GM._playerAnnualReview !== 'object') {
        GM._playerAnnualReview = _defaultState(); // arch-ok (玩家考核账本初始化·task spec 规范 4)
      }
      return GM._playerAnnualReview;
    } catch (_) {}
    return null;
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.history)) s.history = []; // arch-ok
    if (!Array.isArray(s.operations)) s.operations = []; // arch-ok
    if (!Array.isArray(s.pendingNotifications)) s.pendingNotifications = []; // arch-ok
    if (!s.indicators || typeof s.indicators !== 'object') s.indicators = {}; // arch-ok
    if (typeof s.salaryMultiplier !== 'number') s.salaryMultiplier = 1.0; // arch-ok
    if (typeof s.demerits !== 'number') s.demerits = 0; // arch-ok
    if (typeof s.detectedOpCount !== 'number') s.detectedOpCount = 0; // arch-ok
    return s;
  }

  function _pushNotification(s, kind, title, body) {
    var id = 'rn_' + _turn() + '_' + (s.pendingNotifications.length + 1);
    s.pendingNotifications.push({ // arch-ok (经函数别名写·非 GM 直写)
      id: id,
      turn: _turn(),
      kind: kind,
      title: title,
      body: body || '',
      ts: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0
    });
    if (s.pendingNotifications.length > NOTIFICATIONS_MAX) {
      s.pendingNotifications = s.pendingNotifications.slice(-NOTIFICATIONS_MAX); // arch-ok
    }
    return id;
  }

  function _pushOperation(s, op) {
    s.operations.push(op); // arch-ok
    if (s.operations.length > OPERATIONS_MAX) {
      s.operations = s.operations.slice(-OPERATIONS_MAX); // arch-ok
    }
  }

  function _pushHistory(s, entry) {
    s.history.push(entry); // arch-ok
    if (s.history.length > HISTORY_MAX) {
      s.history = s.history.slice(-HISTORY_MAX); // arch-ok
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §4 SubTask 25.2 + 25.3 6 维指标计算 + 年末触发
  // ════════════════════════════════════════════════════════════
  //
  // 年末触发：每年末由主控调用 triggerReview(year)
  //   1) 综合玩家 1 年行为生成 6 维指标（computeIndicators）
  //   2) 应用主动运作的偏移与被发现风险
  //   3) LLM 生成评语（generateComment）
  //   4) 按指标加权综合分 → 九等（deriveGrade）
  //   5) 按等级触发后果（applyConsequences）
  //   6) 写入编年史 + 玩家记忆 + 通知队列

  // 玩家本年行为扫描窗口·默认近 12 回合（剧本可挂 P.playerInfo.turnsPerYear）
  function _turnsPerYear() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isNum(P.playerInfo.turnsPerYear)) {
        return Math.max(1, P.playerInfo.turnsPerYear);
      }
    } catch (_) {}
    return 12;
  }

  function _scanPlayerMemoryYear(windowLen) {
    var mem = [];
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && Array.isArray(P.playerInfo._playerMemory)) {
        mem = P.playerInfo._playerMemory;
      }
    } catch (_) {}
    var curTurn = _turn();
    var fromTurn = curTurn - windowLen;
    return mem.filter(function (m) {
      return m && _isNum(m.turn) && m.turn > fromTurn && m.turn <= curTurn;
    });
  }

  // 6 维指标计算·每维 0-100·缺席 50 中性
  function computeIndicators(opts) {
    opts = opts || {};
    var windowLen = opts.windowLen || _turnsPerYear();
    var mem = _scanPlayerMemoryYear(windowLen);

    // 1) 履职（duty）：base 50 + 履职类记忆条目数 ×3·上限 +30
    //    履职类互动：visit/secretTalk/entrust/recruit/disciple（与 tm-player-interaction KINDS 同源）
    var dutyKinds = { visit: 1, secretTalk: 1, entrust: 1, recruit: 1, disciple: 1, duty_complete: 1, task_complete: 1 };
    var dutyCount = mem.reduce(function (n, m) {
      return n + (m.kind && dutyKinds[m.kind] ? 1 : 0);
    }, 0);
    var duty = _clamp(50 + Math.min(30, dutyCount * 3), 0, 100);

    // 2) 政务（administration）：base 50 + (learning-50)/2 + (administration-50)/2·±30
    var learning = _playerStat('learning', 50);
    var adminStat = _playerStat('administration', 50);
    var adminBoost = 0;
    // 已完成的科技研发·每项 +2·上限 +10
    try {
      if (typeof GM !== 'undefined' && GM && GM._playerTech && Array.isArray(GM._playerTech.completed)) {
        adminBoost = Math.min(10, GM._playerTech.completed.length * 2);
      }
    } catch (_) {}
    var administration = _clamp(50 + (learning - 50) / 2 + (adminStat - 50) / 2 + adminBoost, 0, 100);

    // 3) 廉洁（integrity）：100 - corruption*100·corruption 来自 PlayerEconomy
    var corruption = 0;
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.getState === 'function') {
        var es = global.TM.PlayerEconomy.getState();
        if (es && _isNum(es.corruption)) corruption = es.corruption;
      }
    } catch (_) {}
    // 兜底·读玩家角色 corruption 字段
    if (!corruption) {
      var c = _playerChar();
      if (c && _isNum(c.corruption)) corruption = c.corruption;
    }
    var integrity = _clamp(100 - corruption * 100, 0, 100);

    // 4) 人际（interpersonal）：base 50 + (avg friend dim - 50)·读取所有可互动 NPC 的 friend 维
    var friendSum = 0, friendN = 0;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.listInteractableNpcs === 'function') {
        var list = global.TM.PlayerInteraction.listInteractableNpcs();
        list.forEach(function (n) {
          if (n && n.dims && _isNum(n.dims.friend)) {
            friendSum += n.dims.friend;
            friendN += 1;
          }
        });
      }
    } catch (_) {}
    var friendAvg = friendN > 0 ? friendSum / friendN : 50;
    // 友好互动 +/敌对互动 -（frame/antagonize 反向）
    var frameCount = mem.reduce(function (n, m) {
      return n + (m.kind === 'frame' || m.kind === 'antagonize' ? 1 : 0);
    }, 0);
    var interpersonal = _clamp(50 + (friendAvg - 50) - frameCount * 2, 0, 100);

    // 5) 上级评价（superior）：base 50 + (sovereignRelation-50)/2 + (prestige-50)/3
    var sovRel = _playerStat('sovereignRelation', 50);
    var prestige = _playerStat('prestige', 50);
    var superior = _clamp(50 + (sovRel - 50) / 2 + (prestige - 50) / 3, 0, 100);

    // 6) 民众口碑（public）：base 50 + (minxin-50)/2
    var minxin = _minxinValue();
    var public_ = _clamp(50 + (minxin - 50) / 2, 0, 100);

    var indicators = {
      duty: Math.round(duty),
      administration: Math.round(administration),
      integrity: Math.round(integrity),
      interpersonal: Math.round(interpersonal),
      superior: Math.round(superior),
      public: Math.round(public_)
    };

    // 主动运作偏移（computeIndicators 不应用风险·风险在 triggerReview 中处理）
    if (opts.applyOps !== false) {
      indicators = _applyOperationBoosts(indicators, opts.detectedOps || null);
    }

    return indicators;
  }

  // 应用主动运作偏移·若被发现则反向（扣分）
  function _applyOperationBoosts(indicators, detectedOpsMap) {
    var s = _ensureState();
    if (!s) return indicators;
    var out = Object.assign({}, indicators);
    s.operations.forEach(function (op) {
      if (!op || !op.kind || !op.appliedToCurrentYear) return;
      var def = OPERATION_KINDS[op.kind];
      if (!def) return;
      var detected = detectedOpsMap ? !!detectedOpsMap[op.id] : false;
      var sign = detected ? -1 : 1;
      // 被发现的运作：boost 反向 + 额外 -5 上级评价
      def.boostDims.forEach(function (dim) {
        if (_isNum(out[dim])) out[dim] = _clamp(out[dim] + sign * (op.boost || def.boost), 0, 100);
      });
      if (detected) {
        out.superior = _clamp((out.superior || 50) - 5, 0, 100);
      }
    });
    return out;
  }

  // ════════════════════════════════════════════════════════════
  //  §5 SubTask 25.4 LLM 生成评语
  // ════════════════════════════════════════════════════════════

  function generateComment(year, indicators, grade) {
    var pName = '玩家';
    var pTitle = '';
    try { if (typeof P !== 'undefined' && P && P.playerInfo) { pName = P.playerInfo.characterName || pName; pTitle = P.playerInfo.characterTitle || ''; } } catch (_) {}

    var dimLines = Object.keys(INDICATORS).map(function (k) {
      var v = indicators ? indicators[k] : 50;
      return INDICATORS[k].label + '：' + v;
    }).join('，');

    var prompt = [
      '【玩家官员年终考核·评语生成】',
      '年份：' + year,
      '玩家：' + pName + (pTitle ? '（' + pTitle + '）' : ''),
      '考核等级：' + (grade ? grade.label : '中中'),
      '考核指标：' + dimLines,
      '请基于以上指标与等级，生成一段 60-120 字的考核评语（朝代中立·古风简练·评语风格参照古代考课制度）。',
      '评语应突出该官员本年的优缺点，并给出处置建议（与等级一致）。'
    ].filter(Boolean).join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    // 降级·规则引擎兜底（按等级 + 短板维度）
    return _ruleBasedComment(year, pName, pTitle, indicators, grade);
  }

  function _ruleBasedComment(year, pName, pTitle, indicators, grade) {
    if (!grade) grade = GRADES[4];
    var head = (pTitle ? pTitle : '官员') + pName + '·' + year + '年考核' + grade.label + '。';
    // 找短板·最低维度
    var lowKey = null, lowVal = 100;
    Object.keys(INDICATORS).forEach(function (k) {
      var v = indicators ? indicators[k] : 50;
      if (v < lowVal) { lowVal = v; lowKey = k; }
    });
    var lowLabel = lowKey ? INDICATORS[lowKey].label : '履职';

    var tail = '';
    if (grade.idx <= 2) {
      tail = '本年政绩斐然·诸项可观·' + lowLabel + '稍弱亦可补进。';
    } else if (grade.idx <= 5) {
      tail = '本年循分供职·中规中矩·' + lowLabel + '有待加强。';
    } else {
      tail = '本年' + lowLabel + '亏缺·实难掩过·当议处分。';
    }
    return head + tail;
  }

  // ════════════════════════════════════════════════════════════
  //  §6 SubTask 25.5 九等结果
  // ════════════════════════════════════════════════════════════

  // 综合分 → 九等
  function deriveGrade(indicators) {
    if (!indicators) return GRADES[4]; // 中中
    var score = 0;
    Object.keys(INDICATORS).forEach(function (k) {
      var v = indicators[k];
      if (_isNum(v)) score += v * INDICATORS[k].weight;
    });
    for (var i = 0; i < GRADES.length; i++) {
      if (score >= GRADES[i].minScore) return GRADES[i];
    }
    return GRADES[GRADES.length - 1];
  }

  function _gradeByKey(key) {
    for (var i = 0; i < GRADES.length; i++) {
      if (GRADES[i].key === key) return GRADES[i];
    }
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §7 SubTask 25.6 后果触发
  // ════════════════════════════════════════════════════════════

  function applyConsequences(grade, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (!grade) return { ok: false, reason: '未指定等级' };

    var acts = CONSEQUENCES[grade.key] || [];
    var applied = [];
    var roleChange = null;

    acts.forEach(function (act) {
      switch (act) {
        case 'salaryRaise':
          s.salaryMultiplier = Math.min(2.0, (s.salaryMultiplier || 1.0) + SALARY_RAISE_STEP); // arch-ok
          applied.push({ act: 'salaryRaise', delta: +SALARY_RAISE_STEP, multiplier: s.salaryMultiplier });
          break;
        case 'salaryCut':
          s.salaryMultiplier = Math.max(0.2, (s.salaryMultiplier || 1.0) - SALARY_CUT_STEP); // arch-ok
          applied.push({ act: 'salaryCut', delta: -SALARY_CUT_STEP, multiplier: s.salaryMultiplier });
          break;
        case 'gift':
          var gift = _pick(GIFT_ITEM_POOL);
          applied.push({ act: 'gift', item: gift });
          break;
        case 'demerit':
          s.demerits = (s.demerits || 0) + 1; // arch-ok
          applied.push({ act: 'demerit', total: s.demerits });
          // 记过满阈值 → 自动贬谪
          if (s.demerits >= DEMERIT_THRESHOLD) {
            roleChange = _demotePlayer();
            applied.push({ act: 'demote', reason: '记过满阈值', roleChange: roleChange });
          }
          break;
        case 'promote':
          roleChange = _promotePlayer();
          applied.push({ act: 'promote', roleChange: roleChange });
          break;
        case 'demote':
          roleChange = _demotePlayer();
          applied.push({ act: 'demote', roleChange: roleChange });
          break;
        case 'dismiss':
          roleChange = _dismissPlayer();
          applied.push({ act: 'dismiss', roleChange: roleChange });
          break;
      }
    });

    return { ok: true, applied: applied, roleChange: roleChange, salaryMultiplier: s.salaryMultiplier, demerits: s.demerits };
  }

  // 升迁：rankLevel 下降（数字越小品级越高）·playerRole 不变（仍是 minister/general 等）
  //   - 调用 _offAppointPerson 由剧本 hook 具体职务·缺席时仅调整 rankLevel
  function _promotePlayer() {
    var change = { kind: 'promote', from: null, to: null, field: null };
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return change;
      var c = _playerChar();
      if (c) {
        var oldRank = _isNum(c.rankLevel) ? c.rankLevel : 6;
        var newRank = Math.max(1, oldRank - 1);
        if (newRank !== oldRank) {
          c.rankLevel = newRank; // arch-ok (玩家角色私账·非 GM/P 单例)
          change.from = oldRank;
          change.to = newRank;
          change.field = 'rankLevel';
        }
      }
    } catch (_) {}
    return change;
  }

  // 贬谪：rankLevel 上升
  function _demotePlayer() {
    var change = { kind: 'demote', from: null, to: null, field: null };
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return change;
      var c = _playerChar();
      if (c) {
        var oldRank = _isNum(c.rankLevel) ? c.rankLevel : 6;
        var newRank = Math.min(9, oldRank + 1);
        if (newRank !== oldRank) {
          c.rankLevel = newRank; // arch-ok
          change.from = oldRank;
          change.to = newRank;
          change.field = 'rankLevel';
        }
      }
    } catch (_) {}
    return change;
  }

  // 罢黜：playerRole → 'retired_official'（沿用 tm-transmigration ROLE）
  function _dismissPlayer() {
    var change = { kind: 'dismiss', from: null, to: null, field: 'playerRole' };
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return change;
      var oldRole = P.playerInfo.playerRole || 'minister';
      P.playerInfo.playerRole = 'retired_official'; // arch-ok (罢黜·身份变更·task spec 规范 4)
      change.from = oldRole;
      change.to = 'retired_official';
      // 同步玩家角色 role 字段
      var c = _playerChar();
      if (c) c.role = '致仕'; // arch-ok (玩家角色私账)
    } catch (_) {}
    return change;
  }

  // ════════════════════════════════════════════════════════════
  //  §8 SubTask 25.7 主动运作考核
  // ════════════════════════════════════════════════════════════

  // 贿赂考官：cost 银钱·+boost 到所有 6 维·risk 被发现
  function operateBribe(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var def = OPERATION_KINDS.bribe;
    var cost = opts.cost || def.cost;
    var boost = opts.boost || def.boost;

    // 银钱扣除
    if (_hasCash(cost)) {
      var spent = _spendCash(cost, '贿赂考官');
      if (!spent) return { ok: false, reason: '银钱不足' };
    } else {
      return { ok: false, reason: '银钱不足', cost: cost };
    }

    // 被发现风险判定
    var detected = _rnd() < def.risk;
    var op = {
      id: 'op_' + _turn() + '_' + (s.operations.length + 1),
      turn: _turn(),
      kind: 'bribe',
      label: def.label,
      target: opts.target || '考官',
      cost: cost,
      boost: boost,
      risk: def.risk,
      detected: detected,
      appliedToCurrentYear: true
    };
    _pushOperation(s, op);
    if (detected) s.detectedOpCount = (s.detectedOpCount || 0) + 1; // arch-ok

    // 玩家记忆 + 事件日志
    _writePlayerMemory({
      turn: _turn(),
      kind: 'annual_review_op',
      label: def.label,
      note: detected ? '被发现' : '未被发现',
      cost: cost,
      detected: detected
    });
    _addEB('考核', def.label + '·银钱 ' + cost + (detected ? '·被发现' : '·未被发现'));

    return { ok: true, operation: op, detected: detected, cost: cost };
  }

  // 托人情：通过 TM.PlayerInteraction.interact(npc, 'entrust', payload)
  function operateNetwork(npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定托人情对象' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    var def = OPERATION_KINDS.network;
    var boost = opts.boost || def.boost;
    var npcCanon = _canonName(npcName);

    // 关联人物互动·entrust
    var interactRes = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        interactRes = global.TM.PlayerInteraction.interact(npcCanon, 'entrust', {
          topic: '考核托人情',
          intent: '运作考核'
        });
      }
    } catch (_) {}
    if (!interactRes || !interactRes.ok) {
      return { ok: false, reason: (interactRes && interactRes.reason) || '人物互动失败', interact: interactRes };
    }

    // 被发现风险判定
    var detected = _rnd() < def.risk;
    var op = {
      id: 'op_' + _turn() + '_' + (s.operations.length + 1),
      turn: _turn(),
      kind: 'network',
      label: def.label,
      target: npcCanon,
      cost: 0,
      boost: boost,
      risk: def.risk,
      detected: detected,
      appliedToCurrentYear: true
    };
    _pushOperation(s, op);
    if (detected) s.detectedOpCount = (s.detectedOpCount || 0) + 1; // arch-ok

    _writePlayerMemory({
      turn: _turn(),
      kind: 'annual_review_op',
      label: def.label,
      npc: npcCanon,
      note: detected ? '被发现' : '未被发现',
      detected: detected
    });
    if (detected) {
      _writeNpcMemory(npcCanon, '托人情败露·连累己身', '恨', 8, '玩家');
    }
    _addEB('考核', def.label + '·对象 ' + npcCanon + (detected ? '·被发现' : '·未被发现'));

    return { ok: true, operation: op, detected: detected, interact: interactRes };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 SubTask 25.8 + 25.9 编年史写入 + 御案通知
  // ════════════════════════════════════════════════════════════

  function writeReviewEvent(review) {
    if (!review) return null;
    var entry = {
      turn: _turn(),
      kind: 'annual_review',
      year: review.year,
      grade: review.grade ? review.grade.label : '',
      label: '年终考核·' + (review.grade ? review.grade.label : ''),
      note: review.comment || '',
      consequences: review.consequences || [],
      ts: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0
    };

    // 1) 玩家记忆·私账副本
    _writePlayerMemory(entry);

    // 2) 编年史（沿用 tm-chronicle-system.js 的 ChronicleTracker.add）
    _chronicle({
      type: 'player_annual_review',
      category: '考核',
      title: entry.label,
      narrative: review.comment || '',
      actor: '玩家',
      stakeholders: [],
      sourceType: 'player_annual_review',
      sourceId: 'review_' + review.year + '_' + _turn(),
      priority: 'high',
      meta: {
        year: review.year,
        grade: review.grade ? review.grade.key : '',
        indicators: review.indicators || {},
        consequences: review.consequences || []
      }
    });

    // 3) 事件日志
    _addEB('考核', entry.label + '·' + (review.comment || '').slice(0, 40));

    return entry;
  }

  // ════════════════════════════════════════════════════════════
  //  §10 主入口：年末触发考核
  // ════════════════════════════════════════════════════════════

  function triggerReview(year, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };

    // 仅 minister/general/regent/prince 等官员身份参加考核
    var role = '';
    try { if (typeof P !== 'undefined' && P && P.playerInfo) role = P.playerInfo.playerRole || ''; } catch (_) {}
    var officialRoles = { minister: 1, general: 1, regent: 1, prince: 1, retired_official: 1 };
    if (role && !officialRoles[role] && !opts.force) {
      return { ok: false, reason: '非官员身份·不参加考核', role: role };
    }

    var yr = (typeof year === 'number') ? year : (_turn() + 1);
    s.currentYear = yr; // arch-ok

    // 1) 计算指标·先不应用运作偏移（先采集运作·再统一应用·便于风险判定）
    var baseIndicators = computeIndicators({ applyOps: false });

    // 2) 主动运作风险判定 + 偏移应用
    var detectedOpsMap = {};
    s.operations.forEach(function (op) {
      if (!op || !op.appliedToCurrentYear) return;
      if (op.detected) detectedOpsMap[op.id] = true;
    });
    var indicators = _applyOperationBoosts(baseIndicators, detectedOpsMap);

    s.indicators = indicators; // arch-ok

    // 3) LLM 评语
    var grade = deriveGrade(indicators);
    var comment = (opts.useLLM === false) ? _ruleBasedComment(yr, '玩家', '', indicators, grade)
                                          : generateComment(yr, indicators, grade);

    // 4) 后果触发
    var consRes = applyConsequences(grade, opts);

    // 5) 组装 review 对象
    var review = {
      year: yr,
      turn: _turn(),
      indicators: indicators,
      score: _weightedScore(indicators),
      grade: grade,
      comment: comment,
      consequences: consRes.applied || [],
      roleChange: consRes.roleChange || null,
      salaryMultiplier: consRes.salaryMultiplier || 1.0,
      demerits: consRes.demerits || 0,
      operations: s.operations.filter(function (op) { return op && op.appliedToCurrentYear; }).map(function (op) {
        return { kind: op.kind, label: op.label, target: op.target, detected: op.detected };
      })
    };

    // 6) 写入编年史 + 玩家记忆
    writeReviewEvent(review);

    // 7) 入 history
    _pushHistory(s, {
      year: yr,
      turn: _turn(),
      grade: grade.label,
      gradeIdx: grade.idx,
      indicators: indicators,
      comment: comment,
      consequences: review.consequences,
      roleChange: review.roleChange
    });

    // 8) 御案通知
    var title = '年终考核·' + grade.label;
    var body = comment + '\n（' + _consequenceSummary(review.consequences) + '）';
    var notifId = _pushNotification(s, 'annual_review', title, body);

    // 9) 清空本年运作标记（下次考核归零）
    s.operations.forEach(function (op) {
      if (op) op.appliedToCurrentYear = false; // arch-ok
    });

    // 10) 待玩家查看的考核通知
    s.pendingReview = review; // arch-ok

    return {
      ok: true,
      review: review,
      notificationId: notifId,
      year: yr,
      grade: grade,
      indicators: indicators,
      comment: comment,
      consequences: review.consequences
    };
  }

  function _weightedScore(indicators) {
    if (!indicators) return 50;
    var score = 0;
    Object.keys(INDICATORS).forEach(function (k) {
      var v = indicators[k];
      if (_isNum(v)) score += v * INDICATORS[k].weight;
    });
    return Math.round(score * 10) / 10;
  }

  function _consequenceSummary(cons) {
    if (!cons || !cons.length) return '无处分';
    var map = {
      promote: '升迁', demote: '贬谪', salaryRaise: '加俸', salaryCut: '罚俸',
      gift: '赐物', demerit: '记过', dismiss: '罢黜'
    };
    return cons.map(function (c) { return map[c.act] || c.act; }).join('·');
  }

  // ════════════════════════════════════════════════════════════
  //  §11 SubTask 25.9 御案面板 + 通知 API
  // ════════════════════════════════════════════════════════════

  function getState() {
    var s = _getState();
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  function getHistory() {
    var s = _ensureState();
    return s ? s.history.slice() : [];
  }

  function getCurrentYear() {
    var s = _ensureState();
    return s ? s.currentYear : null;
  }

  function getIndicators() {
    var s = _ensureState();
    return s ? Object.assign({}, s.indicators) : {};
  }

  function getPendingReview() {
    var s = _ensureState();
    return s ? s.pendingReview : null;
  }

  function dismissPendingReview() {
    var s = _ensureState();
    if (!s) return { ok: false };
    s.pendingReview = null; // arch-ok
    return { ok: true };
  }

  function getNotifications() {
    var s = _ensureState();
    return s ? s.pendingNotifications.slice() : [];
  }

  function clearNotification(id) {
    var s = _ensureState();
    if (!s) return { ok: false };
    var before = s.pendingNotifications.length;
    s.pendingNotifications = s.pendingNotifications.filter(function (n) { return n.id !== id; }); // arch-ok
    return { ok: true, removed: before - s.pendingNotifications.length };
  }

  function renderAnnualReviewPanel(targetEl) {
    var s = _ensureState();
    if (!s) return '<div class="par-panel">考核状态未就绪</div>';

    var h = '<div class="par-panel" style="padding:0.6rem;border:1px solid var(--ink-200);border-radius:4px;">';
    h += '<div style="font-weight:600;margin-bottom:0.4rem;">官员考核</div>';

    // 当前年份
    h += '<div style="margin-bottom:0.4rem;">';
    h += '<span style="color:var(--txt-d);">考核年份：</span>';
    h += '<span style="font-weight:600;">' + (s.currentYear != null ? s.currentYear : '—') + '</span>';
    h += '</div>';

    // 当前指标
    var inds = s.indicators || {};
    if (Object.keys(inds).length) {
      h += '<div style="margin-bottom:0.4rem;padding:0.3rem;background:var(--bg-2);border-radius:3px;">';
      h += '<div style="font-size:0.85em;color:var(--txt-d);margin-bottom:0.2rem;">本年指标（6 维）</div>';
      h += '<ul style="margin:0;padding:0 0 0 1rem;font-size:0.9em;">';
      Object.keys(INDICATORS).forEach(function (k) {
        var v = inds[k];
        var valStr = (typeof v === 'number') ? v : '—';
        var color = (typeof v === 'number') ? (v >= 70 ? 'var(--txt-ok)' : v < 40 ? 'var(--txt-warn)' : 'inherit') : 'inherit';
        h += '<li><span style="color:var(--txt-d);">' + INDICATORS[k].label + '</span>：<span style="color:' + color + ';font-weight:600;">' + valStr + '</span></li>';
      });
      h += '</ul>';
      h += '</div>';
    }

    // 待查看的考核结果
    if (s.pendingReview) {
      var rv = s.pendingReview;
      h += '<div style="margin-bottom:0.4rem;padding:0.3rem;background:var(--bg-warn);border-radius:3px;">';
      h += '<div style="font-size:0.85em;color:var(--txt-warn);margin-bottom:0.2rem;">考核通知</div>';
      h += '<div style="font-weight:600;">' + rv.year + '年·等级 ' + (rv.grade ? rv.grade.label : '') + '</div>';
      h += '<div style="font-size:0.9em;margin:0.2rem 0;">' + _esc(rv.comment || '') + '</div>';
      if (rv.consequences && rv.consequences.length) {
        h += '<div style="font-size:0.85em;color:var(--txt-d);">处置：' + _consequenceSummary(rv.consequences) + '</div>';
      }
      h += '</div>';
    }

    // 历年记录（最近 3 条）
    var recent = s.history.slice(-3).reverse();
    if (recent.length) {
      h += '<div style="margin-bottom:0.4rem;">';
      h += '<div style="font-size:0.85em;color:var(--txt-d);margin-bottom:0.2rem;">历年考核</div>';
      h += '<ul style="margin:0;padding:0 0 0 1rem;font-size:0.85em;">';
      recent.forEach(function (r) {
        h += '<li>' + r.year + '年·<span style="font-weight:600;">' + r.grade + '</span>·T' + r.turn + '</li>';
      });
      h += '</ul>';
      h += '</div>';
    }

    // 俸禄倍率 / 记过
    h += '<div style="margin-bottom:0.4rem;font-size:0.85em;color:var(--txt-d);">';
    h += '俸禄倍率：<span style="font-weight:600;">' + (s.salaryMultiplier || 1.0).toFixed(2) + '</span>';
    h += '·记过：<span style="font-weight:600;">' + (s.demerits || 0) + '</span>';
    h += '</div>';

    // 通知队列
    if (s.pendingNotifications.length) {
      h += '<div style="margin-bottom:0.4rem;">';
      h += '<div style="font-size:0.85em;color:var(--txt-d);margin-bottom:0.2rem;">通知（' + s.pendingNotifications.length + '）</div>';
      h += '<ul style="margin:0;padding:0 0 0 1rem;font-size:0.85em;">';
      s.pendingNotifications.slice(-3).forEach(function (n) {
        h += '<li><span style="font-weight:600;">' + _esc(n.title) + '</span>·T' + n.turn + '</li>';
      });
      h += '</ul>';
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  // ════════════════════════════════════════════════════════════
  //  §12 导出命名空间
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    INDICATORS: INDICATORS,
    GRADES: GRADES,
    CONSEQUENCES: CONSEQUENCES,
    OPERATION_KINDS: OPERATION_KINDS,

    // 状态读取
    getState: getState,
    getHistory: getHistory,
    getCurrentYear: getCurrentYear,
    getIndicators: getIndicators,
    getPendingReview: getPendingReview,
    dismissPendingReview: dismissPendingReview,
    getNotifications: getNotifications,
    clearNotification: clearNotification,

    // 主入口
    triggerReview: triggerReview,

    // 拆分函数（smoke/调试·非游戏调用入口）
    computeIndicators: computeIndicators,
    generateComment: generateComment,
    deriveGrade: deriveGrade,
    applyConsequences: applyConsequences,

    // 主动运作
    operateBribe: operateBribe,
    operateNetwork: operateNetwork,

    // 编年史写入
    writeReviewEvent: writeReviewEvent,

    // 御案面板
    renderAnnualReviewPanel: renderAnnualReviewPanel,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _defaultState: _defaultState,
    _weightedScore: _weightedScore,
    _ruleBasedComment: _ruleBasedComment,
    _applyOperationBoosts: _applyOperationBoosts,
    _promotePlayer: _promotePlayer,
    _demotePlayer: _demotePlayer,
    _dismissPlayer: _dismissPlayer,
    _pushNotification: _pushNotification,
    _pushOperation: _pushOperation,
    _pushHistory: _pushHistory
  };

  // 双路径挂载：浏览器走 window.TM.PlayerAnnualReview；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerAnnualReview = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
