// ============================================================
// tm-player-memorial.js — 穿越模式 Phase 4.5 · 玩家上奏系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档），一律由剧本 hook 处理。
//   「本章/密奏/请旨/强谏」「批答/准奏/驳回/留中」是中国古代通用奏政语汇·
//   跨朝代通用，本引擎层保留。
//   「批红」（red-ink endorsement）跨朝代通用，本引擎层允许使用。
//   朝代专属机构名目由剧本 hook。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerMemorial.{
//   MEMORIAL_KINDS, MEMORIAL_STATUS, STATUS_LABEL,
//   getState, getMemorials, getPendingCount, getStats,
//   submit, writeMemorialEvent, renderMemorialPanel,
//   _uiSubmitBenzhang, _uiSubmitMizou, _uiSubmitQingzhi, _uiSubmitQiangzhen,
//   _refreshPanel
// }
// 依赖（运行时软依赖·缺席时降级）：
//   - TM.Transmigration.isTransmigrationMode / getSovereignName  模式与君主
//   - TM.PlayerShell.refreshAll                                   面板刷新
//   - addEB / ChronicleTracker / NpcMemorySystem                 事件写入
//   - findCharByName / canonicalizeCharName                      角色查找
// 双路径挂载：浏览器走 window.TM.PlayerMemorial；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 奏疏类型·4 类（跨朝代通用奏政语汇·不挂某朝独有机构）
  //   benzhang 本章：常规奏事·陈政议事
  //   mizou    密奏：密陈机要·不公开
  //   qingzhi  请旨：请君主定夺之事
  //   qiangzhen 强谏：犯颜直谏·高风险
  var MEMORIAL_KINDS = {
    BENZHANG:  { key: 'benzhang',  label: '本章',  desc: '常规奏事·陈政议事' },
    MIZOU:     { key: 'mizou',     label: '密奏',  desc: '密陈机要·不公开' },
    QINGZHI:   { key: 'qingzhi',   label: '请旨',  desc: '请君主定夺之事' },
    QIANGZHEN: { key: 'qiangzhen', label: '强谏',  desc: '犯颜直谏·高风险' }
  };

  // 奏疏状态·4 态
  //   pending  待批红（已呈上·君主未表态）
  //   approved 准奏（君主依议）
  //   rejected 驳回（君主不允）
  //   shelved  留中（君主不愿表态·留中不发）
  var MEMORIAL_STATUS = {
    PENDING:  'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SHELVED:  'shelved'
  };

  var STATUS_LABEL = {
    pending:  '待批红',
    approved: '准奏',
    rejected: '驳回',
    shelved:  '留中'
  };

  // 君主尊号通用别名（跨朝代中立·与 tm-transmigration._SOVEREIGN_TITLE_RE 同源）
  var _SOVEREIGN_TITLE_RE = /^(皇帝|天子|大汗|可汗|单于|大王|王上|国主|主公|君主|汗王|天可汗)$/;

  // 奏疏保留上限（防长档膨胀）
  var MEMORIAL_KEEP_MAX = 100;

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') return GM.turn; } catch (_) {}
    return 0;
  }
  function _now() {
    return (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
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

  // 玩家角色：优先 isPlayer 标记·回退到 P.playerInfo.characterName 查找
  function _playerChar() {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return null;
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        for (var i = 0; i < GM.chars.length; i++) {
          var c = GM.chars[i];
          if (c && c.isPlayer === true) return c;
        }
      }
      var name = P.playerInfo.characterName;
      if (!name) return null;
      return _findChar(name);
    } catch (_) {}
    return null;
  }

  // 君主查找：优先复用 TM.Transmigration.getSovereignName·缺席降级用本模块通用别名表
  //   参考 tm-transmigration.js _isSovereignChar（lines 75-83）
  function _findSovereign() {
    try {
      if (global.TM && global.TM.Transmigration && typeof global.TM.Transmigration.getSovereignName === 'function') {
        var nm = global.TM.Transmigration.getSovereignName();
        if (nm) {
          var ch = _findChar(nm);
          if (ch) return ch;
        }
      }
    } catch (_) {}
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        for (var i = 0; i < GM.chars.length; i++) {
          var c = GM.chars[i];
          if (!c) continue;
          if (c.isEmperor === true || c.role === '皇帝') return c;
          var t = (c.officialTitle || '').trim();
          if (_SOVEREIGN_TITLE_RE.test(t)) return c;
        }
      }
    } catch (_) {}
    return null;
  }

  function _sovereignName() {
    var s = _findSovereign();
    return s ? (s.name || '君主') : '君主';
  }

  function _kindDef(kindKey) {
    if (!_isStr(kindKey)) return null;
    var keys = Object.keys(MEMORIAL_KINDS);
    for (var i = 0; i < keys.length; i++) {
      if (MEMORIAL_KINDS[keys[i]].key === kindKey) return MEMORIAL_KINDS[keys[i]];
    }
    return null;
  }

  function _kindDefByEnumKey(enumKey) {
    return MEMORIAL_KINDS[enumKey] || null;
  }

  function _genId() {
    return 'm_' + _turn() + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ── HTML 转义（面板渲染用） ──
  function _escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── 事件日志：addEB 缺席降级 ──
  function _addEB(cat, txt) {
    try { if (typeof addEB === 'function') { addEB(cat, txt); return; } } catch (_) {}
    try { console.log('[PlayerMemorial][' + cat + ']', txt); } catch (_) {}
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
        NpcMemorySystem.remember(npcName, event, mood, importance, who, { type: 'player_memorial' });
      }
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §3 状态读写（玩家上奏状态挂在 GM._playerMemorial）
  // ════════════════════════════════════════════════════════════

  function _defaultState() {
    return {
      memorials: [],        // 已上奏列表 [{id, turn, kind, kindLabel, title, content, status, response, submittedAt, playerName, sovereignName, riskDelta}]
      pendingCount: 0,      // 待批红数
      approvedCount: 0,     // 准奏数
      rejectedCount: 0,     // 驳回数
      updatedAt: 0
    };
  }

  // 注意：_getState 经函数返回·lint 不会把 var s = _getState() 认作 GM 子树别名
  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerMemorial) {
        GM._playerMemorial = _defaultState(); // arch-ok
      }
      return GM._playerMemorial;
    } catch (_) {}
    return null;
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.memorials)) s.memorials = []; // arch-ok
    if (typeof s.pendingCount !== 'number') s.pendingCount = 0; // arch-ok
    if (typeof s.approvedCount !== 'number') s.approvedCount = 0; // arch-ok
    if (typeof s.rejectedCount !== 'number') s.rejectedCount = 0; // arch-ok
    if (typeof s.updatedAt !== 'number') s.updatedAt = 0; // arch-ok
    return s;
  }

  // 由 memorials 实时重算计数器（避免缓存漂移）
  function _recalcCounters(s) {
    var p = 0, a = 0, r = 0;
    for (var i = 0; i < s.memorials.length; i++) {
      var m = s.memorials[i];
      if (!m) continue;
      if (m.status === MEMORIAL_STATUS.PENDING) p++;
      else if (m.status === MEMORIAL_STATUS.APPROVED) a++;
      else if (m.status === MEMORIAL_STATUS.REJECTED) r++;
    }
    s.pendingCount = p; // arch-ok
    s.approvedCount = a; // arch-ok
    s.rejectedCount = r; // arch-ok
    s.updatedAt = _now(); // arch-ok
  }

  // ════════════════════════════════════════════════════════════
  //  §4 君主回应（内部·基础逻辑·不调 LLM）
  //    返回 {status, response, riskDelta}
  // ════════════════════════════════════════════════════════════

  function _sovereignReplyText(status, kindKey) {
    if (status === MEMORIAL_STATUS.APPROVED) {
      return kindKey === MEMORIAL_KINDS.QINGZHI.key
        ? '君主准所请·依议施行'
        : '君主准奏·付所司施行';
    }
    if (status === MEMORIAL_STATUS.REJECTED) {
      return kindKey === MEMORIAL_KINDS.QIANGZHEN.key
        ? '君主震怒·驳回此奏（犯颜直谏·触怒）'
        : '君主驳所请·所奏不允';
    }
    if (status === MEMORIAL_STATUS.SHELVED) {
      return kindKey === MEMORIAL_KINDS.MIZOU.key
        ? '君主览密奏·留中不宣'
        : '君主留中·暂不表态';
    }
    return '奏疏呈上·待君主批答';
  }

  function _sovereignRespond(memorial, opts) {
    opts = opts || {};
    var kindKey = memorial.kind;

    // 显式覆盖：forceSovereignResponse 指定状态字符串
    if (_isStr(opts.forceSovereignResponse)) {
      var forced = opts.forceSovereignResponse;
      if (forced === MEMORIAL_STATUS.APPROVED ||
          forced === MEMORIAL_STATUS.REJECTED ||
          forced === MEMORIAL_STATUS.SHELVED ||
          forced === MEMORIAL_STATUS.PENDING) {
        return {
          status: forced,
          response: _sovereignReplyText(forced, kindKey),
          riskDelta: 0
        };
      }
    }

    var roll = Math.random();
    var riskOverride = opts.riskOverride === true;

    // 强谏：30% 驳回 + 触发君主怒（risk）
    if (kindKey === MEMORIAL_KINDS.QIANGZHEN.key) {
      if (roll < 0.30 && !riskOverride) {
        return {
          status: MEMORIAL_STATUS.REJECTED,
          response: '君主震怒·驳回此奏（犯颜直谏·触怒）',
          riskDelta: 1
        };
      }
      // 余下：均分准奏/留中
      if (roll < 0.65) {
        return {
          status: MEMORIAL_STATUS.APPROVED,
          response: '君主纳谏·准奏（从谏如流）',
          riskDelta: 0
        };
      }
      return {
        status: MEMORIAL_STATUS.SHELVED,
        response: '君主不悦·留中不发',
        riskDelta: 0
      };
    }

    // 密奏：60% 留中
    if (kindKey === MEMORIAL_KINDS.MIZOU.key) {
      if (roll < 0.60) {
        return {
          status: MEMORIAL_STATUS.SHELVED,
          response: '君主览密奏·留中不宣',
          riskDelta: 0
        };
      }
      if (roll < 0.85) {
        return {
          status: MEMORIAL_STATUS.APPROVED,
          response: '君主准密奏·默允所请',
          riskDelta: 0
        };
      }
      return {
        status: MEMORIAL_STATUS.REJECTED,
        response: '君主驳密奏·所请不允',
        riskDelta: 0
      };
    }

    // 本章/请旨：70% 准奏
    if (kindKey === MEMORIAL_KINDS.BENZHANG.key || kindKey === MEMORIAL_KINDS.QINGZHI.key) {
      if (roll < 0.70) {
        return {
          status: MEMORIAL_STATUS.APPROVED,
          response: kindKey === MEMORIAL_KINDS.QINGZHI.key
            ? '君主准所请·依议施行'
            : '君主准奏·付所司施行',
          riskDelta: 0
        };
      }
      if (roll < 0.90) {
        return {
          status: MEMORIAL_STATUS.SHELVED,
          response: '君主留中·暂不表态',
          riskDelta: 0
        };
      }
      return {
        status: MEMORIAL_STATUS.REJECTED,
        response: '君主驳所请·所奏不允',
        riskDelta: 0
      };
    }

    // 兜底：未识别类型·留待批红
    return {
      status: MEMORIAL_STATUS.PENDING,
      response: '奏疏呈上·待君主批答',
      riskDelta: 0
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §5 上奏：核心入口
  // ════════════════════════════════════════════════════════════

  function submit(kind, title, content, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };

    // 校验 kind
    var kindDef = _kindDef(kind);
    if (!kindDef) return { ok: false, reason: '未知奏疏类型：' + kind };

    // 校验 title/content 非空
    if (!_isStr(title) || !title.trim()) return { ok: false, reason: '奏疏标题不可为空' };
    if (!_isStr(content) || !content.trim()) return { ok: false, reason: '奏疏正文不可为空' };

    // 玩家角色校验
    var player = _playerChar();
    if (!player) return { ok: false, reason: '玩家角色未就绪' };

    // 君主存在校验
    var sovereign = _findSovereign();
    if (!sovereign) return { ok: false, reason: '朝中未立君主·无可上奏' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };

    var memorial = {
      id: _genId(),
      turn: _turn(),
      kind: kindDef.key,
      kindLabel: kindDef.label,
      title: title.trim(),
      content: content.trim(),
      status: MEMORIAL_STATUS.PENDING,
      response: '',
      submittedAt: _now(),
      playerName: _canonName(player.name || ''),
      sovereignName: _canonName(sovereign.name || '君主'),
      riskDelta: 0
    };

    // 君主回应（基础逻辑）
    var resp = _sovereignRespond(memorial, opts);
    memorial.status = resp.status;
    memorial.response = resp.response;
    memorial.riskDelta = resp.riskDelta || 0;

    s.memorials.push(memorial);
    if (s.memorials.length > MEMORIAL_KEEP_MAX) {
      s.memorials = s.memorials.slice(-MEMORIAL_KEEP_MAX); // arch-ok
    }
    _recalcCounters(s);

    // 事件日志 + 编年史 + 玩家记忆
    _addEB('朝堂', kindDef.label + '·「' + memorial.title + '」·君主' + (STATUS_LABEL[memorial.status] || memorial.status));
    writeMemorialEvent({
      kind: 'memorial_submit',
      label: kindDef.label + '·' + memorial.title,
      name: sovereign.name || '君主',
      note: '君主' + (STATUS_LABEL[memorial.status] || memorial.status) + (memorial.response ? '·' + memorial.response : '')
    });

    // 强谏触怒 → 写 NPC 记忆（君主对玩家印象转差）
    if (resp.riskDelta && resp.riskDelta > 0) {
      _writeNpcMemory(sovereign.name || '君主', '玩家强谏触怒·' + memorial.title, '怒', 8, '玩家');
    } else if (memorial.status === MEMORIAL_STATUS.APPROVED) {
      _writeNpcMemory(sovereign.name || '君主', '玩家上奏获准·' + memorial.title, '喜', 6, '玩家');
    }

    return { ok: true, memorial: memorial };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 查询接口
  // ════════════════════════════════════════════════════════════

  function getState() {
    var s = _ensureState();
    if (!s) return null;
    return JSON.parse(JSON.stringify(s));
  }

  function getMemorials() {
    var s = _ensureState();
    if (!s || !s.memorials.length) return [];
    return JSON.parse(JSON.stringify(s.memorials));
  }

  function getPendingCount() {
    var s = _ensureState();
    if (!s) return 0;
    var n = 0;
    for (var i = 0; i < s.memorials.length; i++) {
      if (s.memorials[i] && s.memorials[i].status === MEMORIAL_STATUS.PENDING) n++;
    }
    return n;
  }

  function getStats() {
    var s = _ensureState();
    var stats = { pending: 0, approved: 0, rejected: 0, shelved: 0, total: 0 };
    if (!s) return stats;
    for (var i = 0; i < s.memorials.length; i++) {
      var m = s.memorials[i];
      if (!m) continue;
      stats.total++;
      if (m.status === MEMORIAL_STATUS.PENDING) stats.pending++;
      else if (m.status === MEMORIAL_STATUS.APPROVED) stats.approved++;
      else if (m.status === MEMORIAL_STATUS.REJECTED) stats.rejected++;
      else if (m.status === MEMORIAL_STATUS.SHELVED) stats.shelved++;
    }
    return stats;
  }

  // ════════════════════════════════════════════════════════════
  //  §7 上奏事件写入玩家记忆与编年史
  // ════════════════════════════════════════════════════════════

  function writeMemorialEvent(evt) {
    if (!evt) return null;
    var entry = {
      turn: _turn(),
      kind: evt.kind || 'memorial_event',
      label: evt.label || '',
      name: evt.name || '',
      note: evt.note || '',
      ts: _now()
    };

    // 1) 玩家记忆·私账副本
    _writePlayerMemory(entry);

    // 2) NPC 记忆（若涉及具名 NPC·多为君主）
    if (entry.name) {
      var mood = /驳回|震怒|触怒/.test(entry.label + entry.note) ? '怒' : '平';
      var imp = /强谏|触怒|震怒/.test(entry.label + entry.note) ? 8 : 5;
      _writeNpcMemory(entry.name, entry.label + '·' + entry.note, mood, imp, '玩家');
    }

    // 3) 编年史
    _chronicle({
      type: 'player_memorial',
      category: '朝堂',
      title: entry.label,
      narrative: entry.note,
      actor: '玩家',
      stakeholders: entry.name ? [entry.name] : [],
      sourceType: 'player_memorial',
      sourceId: entry.kind + '_' + entry.turn,
      priority: 'high'
    });

    // 4) 事件日志
    _addEB('朝堂', entry.label + (entry.name ? '·' + entry.name : '') + (entry.note ? '（' + entry.note + '）' : ''));

    return entry;
  }

  // ════════════════════════════════════════════════════════════
  //  §8 朝堂面板·"上奏"子面板
  // ════════════════════════════════════════════════════════════

  function renderMemorialPanel() {
    var s = _ensureState();
    if (!s) return '<div class="pm-panel">上奏状态未就绪</div>';

    var stats = getStats();
    var sovereignName = _sovereignName();

    var h = '<div class="pm-panel" style="padding:0.6rem;border:1px solid var(--ink-200);border-radius:4px;">';
    h += '<div style="font-weight:600;margin-bottom:0.4rem;">上奏</div>';

    // 当前君主
    h += '<div style="margin-bottom:0.4rem;font-size:0.9em;">';
    h += '<span style="color:var(--txt-d);">君主：</span>';
    h += '<span>' + _escHtml(sovereignName) + '</span>';
    h += '</div>';

    // 统计概要（待批 X / 准 X / 驳 X / 留中 X）
    h += '<div style="margin-bottom:0.4rem;font-size:0.9em;">';
    h += '<span style="color:var(--txt-d);">概要：</span>';
    h += '<span>待批 <b>' + stats.pending + '</b></span>';
    h += '<span style="margin-left:0.5rem;">准 <b>' + stats.approved + '</b></span>';
    h += '<span style="margin-left:0.5rem;">驳 <b>' + stats.rejected + '</b></span>';
    h += '<span style="margin-left:0.5rem;">留中 <b>' + stats.shelved + '</b></span>';
    h += '<span style="margin-left:0.5rem;color:var(--txt-d);">共 ' + stats.total + '</span>';
    h += '</div>';

    // 最近 5 条奏疏列表（标题 + 状态徽章 + 君主回应）
    if (s.memorials.length) {
      h += '<div style="margin-bottom:0.4rem;">';
      h += '<div style="color:var(--txt-d);font-size:0.85em;margin-bottom:0.2rem;">近奏（' + Math.min(5, s.memorials.length) + '）</div>';
      h += '<ul style="margin:0;padding:0;list-style:none;font-size:0.88em;">';
      var recent = s.memorials.slice(-5).reverse();
      for (var i = 0; i < recent.length; i++) {
        var m = recent[i];
        if (!m) continue;
        var badgeColor = '';
        if (m.status === MEMORIAL_STATUS.APPROVED) badgeColor = 'color:#2a7;';
        else if (m.status === MEMORIAL_STATUS.REJECTED) badgeColor = 'color:#c33;';
        else if (m.status === MEMORIAL_STATUS.SHELVED) badgeColor = 'color:#888;';
        else badgeColor = 'color:#a73;';
        h += '<li style="padding:0.2rem 0;border-bottom:1px dashed var(--ink-200);">';
        h += '<div>';
        h += '<span style="color:var(--txt-d);font-size:0.85em;">T' + m.turn + '·' + _escHtml(m.kindLabel || m.kind) + '</span> ';
        h += '<span style="font-weight:600;">' + _escHtml(m.title) + '</span> ';
        h += '<span style="padding:0 0.3rem;border-radius:3px;font-size:0.8em;' + badgeColor + '">' + _escHtml(STATUS_LABEL[m.status] || m.status) + '</span>';
        h += '</div>';
        if (m.response) {
          h += '<div style="color:var(--txt-d);font-size:0.85em;margin-top:0.1rem;">君主批答：' + _escHtml(m.response) + '</div>';
        }
        h += '</li>';
      }
      h += '</ul>';
      h += '</div>';
    } else {
      h += '<div style="color:var(--txt-d);font-size:0.85em;margin-bottom:0.4rem;">尚无上奏记录</div>';
    }

    // 可选动作区（4 个按钮：上奏本章 / 密奏 / 请旨 / 强谏）
    h += '<div class="player-block-actions" style="margin-top:0.5rem;border-top:1px dashed var(--ink-200);padding-top:0.4rem;">';
    h += '<div style="font-size:0.85em;color:var(--txt-d);margin-bottom:0.3rem;">可选动作</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
    h += '<button class="bt bs" onclick="TM.PlayerMemorial._uiSubmitBenzhang()">上奏本章</button>';
    h += '<button class="bt bs" onclick="TM.PlayerMemorial._uiSubmitMizou()">密奏机要</button>';
    h += '<button class="bt bs" onclick="TM.PlayerMemorial._uiSubmitQingzhi()">请旨定夺</button>';
    h += '<button class="bt bd" onclick="TM.PlayerMemorial._uiSubmitQiangzhen()">犯颜强谏</button>';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ════════════════════════════════════════════════════════════
  //  §9 UI 钩子（4 个·showPrompt 收标题和正文·调 submit）
  // ════════════════════════════════════════════════════════════

  function _refreshPanel() {
    try {
      if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.refreshAll === 'function') {
        global.TM.PlayerShell.refreshAll();
      }
    } catch (_) {}
  }

  function _toast(msg) {
    try { if (typeof toast === 'function') { toast(msg); return; } } catch (_) {}
    try { _addEB('朝堂', msg); } catch (_) {}
  }

  // 通用上奏 UI 工具：showPrompt 收标题 → showPrompt 收正文 → 调 submit
  function _uiSubmit(kind) {
    var s = _ensureState();
    if (!s) { _toast('上奏状态未就绪'); return; }
    if (!_isTransmigration()) { _toast('非穿越模式·不可上奏'); return; }
    if (typeof showPrompt !== 'function') {
      _addEB('朝堂', 'showPrompt 缺席·无法发起上奏');
      return;
    }
    var kindDef = _kindDef(kind);
    if (!kindDef) { _toast('未知奏疏类型：' + kind); return; }

    showPrompt('上奏·' + kindDef.label + '（' + kindDef.desc + '）\n奏疏标题：', '', function (title) {
      if (!title || !title.trim()) { _toast('已取消上奏'); return; }
      var t = title.trim();
      showPrompt('上奏·' + kindDef.label + '·「' + t + '」\n奏疏正文（可简陈事由）：', '', function (content) {
        if (!content || !content.trim()) { _toast('已取消上奏（正文为空）'); return; }
        var r = submit(kind, t, content, {});
        if (r && r.ok) {
          _toast(kindDef.label + '「' + t + '」已呈·君主' + (STATUS_LABEL[r.memorial.status] || r.memorial.status));
        } else {
          _toast('上奏失败：' + (r && r.reason ? r.reason : '未知'));
        }
        _refreshPanel();
      });
    });
  }

  function _uiSubmitBenzhang()  { _uiSubmit(MEMORIAL_KINDS.BENZHANG.key); }
  function _uiSubmitMizou()     { _uiSubmit(MEMORIAL_KINDS.MIZOU.key); }
  function _uiSubmitQingzhi()   { _uiSubmit(MEMORIAL_KINDS.QINGZHI.key); }
  function _uiSubmitQiangzhen() { _uiSubmit(MEMORIAL_KINDS.QIANGZHEN.key); }

  // ════════════════════════════════════════════════════════════
  //  §10 导出
  // ════════════════════════════════════════════════════════════

  var ns = {
    MEMORIAL_KINDS: MEMORIAL_KINDS,
    MEMORIAL_STATUS: MEMORIAL_STATUS,
    STATUS_LABEL: STATUS_LABEL,

    // 查询
    getState: getState,
    getMemorials: getMemorials,
    getPendingCount: getPendingCount,
    getStats: getStats,

    // 上奏
    submit: submit,
    writeMemorialEvent: writeMemorialEvent,

    // 面板
    renderMemorialPanel: renderMemorialPanel,

    // UI 钩子
    _uiSubmitBenzhang: _uiSubmitBenzhang,
    _uiSubmitMizou: _uiSubmitMizou,
    _uiSubmitQingzhi: _uiSubmitQingzhi,
    _uiSubmitQiangzhen: _uiSubmitQiangzhen,
    _refreshPanel: _refreshPanel,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _defaultState: _defaultState,
    _sovereignRespond: _sovereignRespond,
    _findSovereign: _findSovereign,
    _playerChar: _playerChar,
    _kindDef: _kindDef
  };

  // 双路径挂载：浏览器走 window.TM.PlayerMemorial；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerMemorial = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
