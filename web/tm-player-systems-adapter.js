'use strict';
/**
 * 穿越模式系统渲染适配器（tm-player-systems-adapter.js）
 *
 * 作用：为 15 个 PlayerXxx 系统提供统一的 renderBlock 入口，
 *      消除「无可用渲染入口」提示。
 *
 * 铁律：
 * 1. 绝不调皇帝御案渲染函数 —— 该侧渲染属皇帝御案，穿越模式禁调。
 * 2. 适配器 fn 抛异常时走 fallback，不让单个系统崩掉整页。
 * 3. 跨朝代中立——本文件不写任何朝代特有词。
 */
(function (global) {
  if (global.TM && global.TM.PlayerSystemsAdapter) return;

  var TM = global.TM || (global.TM = {});

  /** HTML 转义 */
  function _esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 包一层 player-block 容器
   * 若 html 已含 class="player-block" 则直接返回，否则包一层带 data-system 的容器
   */
  function _wrapBlock(html, systemKey, title) {
    if (typeof html === 'string' && /class="player-block"/.test(html)) {
      return html;
    }
    return '<div class="player-block" data-system="' + _esc(systemKey) + '">' +
      '<div class="player-block-title">' + _esc(title) + '</div>' +
      (html || '') +
      '</div>';
  }

  /** 软依赖守卫调用器：按方法名优先级链尝试渲染 */
  // 链：_customRender(专用) → renderBlockHTML(role, title) → render<Short>Panel() → getState() → null
  // 注：不吞异常——异常让 renderBlock 顶层 try/catch 捕获返回「渲染异常」
  function _callSystemRender(systemKey, role, title) {
    var sys = (global.TM && global.TM[systemKey]) ? global.TM[systemKey] : null;

    // 0) 专用渲染器（针对无标准 API 但有特定数据接口的系统·如 PlayerInteraction）
    if (sys) {
      var custom = _customRender(systemKey);
      if (custom) return custom;
    } else if (FRIENDLY_FALLBACK[systemKey]) {
      // 系统完全未实现·但登记了友好占位 → 直接走友好占位
      return _friendlyFallback(systemKey, title);
    }

    if (!sys) return null;

    // 1) 标准 renderBlockHTML(role, title)
    if (typeof sys.renderBlockHTML === 'function') {
      return sys.renderBlockHTML(role, title);
    }

    // 2) 现有命名不统一的 render<Short>Panel()（无参数）
    var panelMethod = PANEL_METHOD_MAP[systemKey];
    if (panelMethod && typeof sys[panelMethod] === 'function') {
      return sys[panelMethod]();
    }

    // 3) getState() 兜底·输出 JSON 概要
    if (typeof sys.getState === 'function') {
      var st = sys.getState() || {};
      return _renderStateAsHTML(systemKey, st);
    }

    return null;
  }

  /** 将 getState 返回的对象渲染为可读 HTML 概要 */
  // - 用 FIELD_LABELS 把 raw key 翻译成中文标签
  // - 隐藏空数组/空对象/未定义值（无信息量）
  // - 数字 0 显示（可能是有效状态如 cash=0）·空字符串隐藏
  function _renderStateAsHTML(systemKey, st) {
    var labels = FIELD_LABELS[systemKey] || {};
    var keys = Object.keys(st);
    // 过滤掉空数组/空对象/null/undefined/空字符串
    var visible = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = st[k];
      if (_isEmptyValue(v)) continue;
      visible.push({ key: k, value: v });
    }
    if (!visible.length) {
      return '<div class="player-block-empty">（暂无数据·开局首回合可能尚未生成）</div>';
    }
    var h = '<ul class="player-block-state-list">';
    for (var j = 0; j < visible.length && j < 12; j++) {
      var item = visible[j];
      var label = labels[item.key] || _defaultLabel(item.key);
      var vs = _formatValue(item.value, systemKey, item.key);
      h += '<li><span class="player-block-state-key">' + _esc(label) + '</span>' +
           '<span class="player-block-state-val">' + _esc(vs) + '</span></li>';
    }
    if (visible.length > 12) {
      h += '<li class="player-block-state-more">… 共 ' + visible.length + ' 项</li>';
    }
    h += '</ul>';
    return h;
  }

  /** 判定空值：null/undefined/空字符串/空数组/空对象 → 隐藏 */
  function _isEmptyValue(v) {
    if (v == null) return true;
    if (typeof v === 'string' && v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'object' && !Array.isArray(v)) {
      var ks = Object.keys(v);
      return ks.length === 0;
    }
    return false;
  }

  /** 格式化值：数字/布尔直显·数组显长度·对象显 key 数 */
  function _formatValue(v, systemKey, key) {
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '是' : '否';
    if (typeof v === 'string') {
      // 枚举值翻译
      return _enumLabel(systemKey, key, v);
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return '—';
      if (v.length <= 3) {
        var names = v.map(function (it) {
          if (it == null) return '—';
          if (typeof it === 'string' || typeof it === 'number') return String(it);
          if (typeof it === 'object') {
            return it.name || it.title || it.label || _defaultLabel(Object.keys(it)[0] || '?');
          }
          return String(it);
        });
        return names.join('、') + '（共 ' + v.length + '）';
      }
      return '共 ' + v.length + ' 项';
    }
    if (typeof v === 'object') {
      var ks = Object.keys(v);
      if (!ks.length) return '—';
      if (ks.length <= 3) return ks.join('、');
      return '共 ' + ks.length + ' 项';
    }
    return String(v);
  }

  /** 枚举值翻译表：systemKey.key.value → 中文 */
  var ENUM_LABELS = {
    PlayerIndustry: {
      haoqiangLevel: {
        none: '白身',
        minor: '小豪',
        major: '大豪',
        hegemon: '巨擘'
      }
    }
  };

  function _enumLabel(systemKey, key, value) {
    var tbl = ENUM_LABELS[systemKey] && ENUM_LABELS[systemKey][key];
    if (tbl && Object.prototype.hasOwnProperty.call(tbl, value)) {
      return tbl[value];
    }
    return value;
  }

  /** 默认标签：camelCase → 空格分隔·首字大写 */
  function _defaultLabel(key) {
    if (!key) return '?';
    var s = String(key).replace(/([A-Z])/g, ' $1').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** systemKey → 字段中文标签表（仅翻译实际出现的字段·缺省走 _defaultLabel） */
  var FIELD_LABELS = {
    PlayerEconomy: {
      cash: '现银',
      properties: '田宅',
      investments: '投资',
      grayIncome: '灰色收入',
      corruption: '贪腐度',
      factionRelations: '派系关系',
      confiscated: '已抄没',
      ledger: '账册'
    },
    PlayerIndustry: {
      industries: '产业',
      haoqiangLevel: '豪强等第',
      haoqiangScore: '豪强势力',
      notoriety: '恶名',
      events: '事件',
      createdAt: '创立时间'
    },
    PlayerFamily: {
      head: '家主',
      members: '成员',
      spouse: '配偶',
      children: '子女',
      parents: '父母',
      siblings: '兄弟姐妹',
      clan: '宗族',
      faction: '派系',
      events: '家族事件'
    },
    PlayerPrivateArmy: {
      readiness: '战备度',
      soldiers: '兵员',
      morale: '士气',
      training: '训练度',
      equipment: '装备',
      loyalty: '忠诚'
    },
    PlayerSkill: {
      skills: '技艺',
      mastery: '熟练度',
      studyProgress: '修习进度',
      enlightenment: '顿悟'
    },
    PlayerMarriage: {
      spouse: '配偶',
      fiancee: '未婚妻/夫',
      marriedAt: '成婚于',
      children: '育子女',
      events: '婚姻事件'
    },
    PlayerRebel: {
      prepProgress: '筹备进度',
      faction: '党羽',
      readiness: '举事条件',
      risk: '走漏风险'
    },
    PlayerInteraction: {
      relations: '人际',
      factionPower: '派系势力',
      reputation: '声望'
    },
    PlayerMovement: {
      currentLocation: '现居',
      traveling: '行旅中',
      destination: '目的地',
      eta: '抵达'
    },
    PlayerTech: {
      research: '研发中',
      completed: '已得',
      available: '可研',
      points: '格物点'
    }
  };

  /** systemKey → 现有 render<Short>Panel 方法名映射表 */
  var PANEL_METHOD_MAP = {
    PlayerFamily:      'renderFamilyPanel',
    PlayerMarriage:    'renderMarriagePanel',
    PlayerTech:        'renderTechPanel',
    PlayerMovement:    'renderMovementPanel',
    PlayerRebel:       'renderPanel',      // 戎机 tab 反叛账本
    PlayerSkill:       'renderPanel',      // 修习 tab 技能账本（2026-07-21 修：原漏登·退化到 getState JSON dump）
    PlayerEconomy:     'renderPanel',      // 邸宅 tab 私产账本
    PlayerIndustry:    'renderPanel',      // 邸宅 tab 产业账本
    PlayerPrivateArmy: 'renderPanel'       // 戎机 tab 私军账本
  };

  /**
   * systemKey 专用渲染器（绕过标准链·针对无 renderBlockHTML/getState 但有特定数据接口的系统）
   * 返回 HTML 字符串·出错返回 null 让上层走 fallback
   */
  function _customRender(systemKey) {
    var sys = (global.TM && global.TM[systemKey]) ? global.TM[systemKey] : null;
    if (!sys) return null;

    // PlayerInteraction：无 getState/renderBlockHTML·但有 listInteractableNpcs/getRelationDims
    // 渲染人际列表（按维度分组·显示 NPC 名号+头衔+派系+关系维度概要）
    if (systemKey === 'PlayerInteraction') {
      try { return _renderInteractionPanel(sys); }
      catch (_) { return null; }
    }
    return null;
  }

  /** PlayerInteraction 专用面板：人际列表 + 维度概要 */
  function _renderInteractionPanel(sys) {
    if (typeof sys.listInteractableNpcs !== 'function') return null;
    var npcs = [];
    try { npcs = sys.listInteractableNpcs() || []; } catch (_) { npcs = []; }
    var h = '';
    h += '<div class="pi-panel">';
    h += '<div class="pi-section"><div class="pi-section-title">人 际 · 概 览</div>';
    h += '<div class="pi-row"><span>可互动者</span><span class="pi-val">' + npcs.length + ' 人</span></div>';
    h += '</div>';
    if (!npcs.length) {
      h += '<div class="pi-empty">暂无可互动人物（剧本中无可接触 NPC·或尚未进入游戏回合）</div>';
      h += '</div>';
      return h;
    }
    h += '<div class="pi-section"><div class="pi-section-title">人 际 名 录</div>';
    for (var i = 0; i < npcs.length && i < 20; i++) {
      var n = npcs[i] || {};
      var dims = n.dims || {};
      // 5 维概要（master/friend/rival/colleague/enmity）·0 不显示
      var dimChips = '';
      var dimLabels = { master: '师徒', friend: '亲友', rival: '政敌', colleague: '同僚', enmity: '仇雠' };
      Object.keys(dimLabels).forEach(function (k) {
        var v = dims[k];
        if (typeof v === 'number' && v !== 0) {
          dimChips += '<span class="pi-dim pi-dim-' + k + '">' + dimLabels[k] + ' ' + v + '</span>';
        }
      });
      if (!dimChips) dimChips = '<span class="pi-dim pi-dim-none">无交情</span>';
      h += '<div class="pi-npc">';
      h += '<div class="pi-npc-head">';
      h += '<span class="pi-npc-name">' + _esc(n.name || '—') + '</span>';
      if (n.title) h += '<span class="pi-npc-title">' + _esc(n.title) + '</span>';
      if (n.faction) h += '<span class="pi-npc-faction">' + _esc(n.faction) + '</span>';
      if (n.military) h += '<span class="pi-npc-mil">武</span>';
      h += '</div>';
      h += '<div class="pi-npc-dims">' + dimChips + '</div>';
      h += '</div>';
    }
    if (npcs.length > 20) {
      h += '<div class="pi-more">… 共 ' + npcs.length + ' 人（仅显示前 20）</div>';
    }
    h += '</div>';
    h += '</div>';
    return h;
  }

  /**
   * 未实现系统的友好占位（替代冷冰冰的「XXX 待接入」）
   * 显示中文化的「该系统将在后续版本接入」提示 + 该 tab 可暂且专注的他事引导
   * 注：不输出标题·标题由外层 _wrapBlock 统一处理（避免与 player-block-title 重复·真事故 2026-07-21）
   */
  var FRIENDLY_FALLBACK = {
    PlayerFortune: {
      label: '际遇',
      hint: '际遇系统正在筹备中·当前版本可暂且专注修习、交往、戎机等事。后续版本将接入随机机缘、奇遇事件、人物造化等。'
    },
    PlayerAdversity: {
      label: '变故',
      hint: '变故系统正在筹备中·当前版本可暂且专注日常事务。后续版本将接入天灾、人祸、家变、病厄等突发变故。'
    },
    PlayerMemorial: {
      label: '上奏',
      hint: '上奏系统正在筹备中·当前版本可通过「朝议」槽参与朝政。后续版本将接入本章上奏、密奏、请旨等。'
    },
    PlayerOffice: {
      label: '官职',
      hint: '官职系统正在筹备中·当前版本可暂且专注本职事务。后续版本将接入官职迁转、差遣、考课等。'
    }
  };

  function _friendlyFallback(systemKey, title) {
    var cfg = FRIENDLY_FALLBACK[systemKey];
    if (!cfg) return null;
    var h = '<div class="player-block-soon">';
    // 不再输出 player-block-soon-title·外层 _wrapBlock 已提供 player-block-title（避免标题重复）
    h += '<div class="player-block-soon-hint">' + _esc(cfg.hint) + '</div>';
    h += '</div>';
    return h;
  }

  /** fallback 模板生成器 */
  function _fallback(systemKey, title) {
    return '<div class="player-block">' +
      '<div class="player-block-title">' + _esc(title) + '</div>' +
      '<div class="player-block-empty">（' + _esc(systemKey) + ' 待接入）</div>' +
      '</div>';
  }

  /** 15 个 PlayerXxx 系统 key */
  var SYSTEM_KEYS = [
    'PlayerFamily',
    'PlayerMarriage',
    'PlayerEconomy',
    'PlayerIndustry',
    'PlayerTech',
    'PlayerPrivateArmy',
    'PlayerRebel',
    'PlayerInteraction',
    'PlayerMovement',
    'PlayerMemorial',
    'PlayerCourtDebate',
    'PlayerOffice',
    'PlayerSkill',
    'PlayerFortune',
    'PlayerAdversity'
  ];

  /** 适配器表：每条 { fn, fallback } */
  var RENDER_ADAPTERS = {};
  for (var i = 0; i < SYSTEM_KEYS.length; i++) {
    (function (key) {
      RENDER_ADAPTERS[key] = {
        fn: function (role, title) {
          return _callSystemRender(key, role, title);
        },
        fallback: function (role, title) {
          return _fallback(key, title);
        }
      };
    })(SYSTEM_KEYS[i]);
  }

  /**
   * 渲染指定系统块
   * @param {string} systemKey 系统 key（如 PlayerFamily）
   * @param {object} role 玩家角色
   * @param {string} blockTitle 块标题
   * @returns {string} HTML 字符串
   */
  function renderBlock(systemKey, role, blockTitle) {
    // 1) 取 adapter
    var adapter = RENDER_ADAPTERS[systemKey];

    // 2) adapter 不存在 → 返回空块占位
    if (!adapter) {
      return '<div class="player-block player-block-error">' +
        '<div class="player-block-title">' + _esc(blockTitle || '') + '</div>' +
        '<div class="player-block-empty">未知系统：' + _esc(systemKey) + '</div>' +
        '</div>';
    }

    // 3) 尝试调适配器 fn
    try {
      var html = adapter.fn(role, blockTitle);
      if (html) {
        return _wrapBlock(html, systemKey, blockTitle);
      }
    } catch (e) {
      // 4) 异常 → 错误占位
      return '<div class="player-block player-block-error">' +
        '<div class="player-block-title">' + _esc(blockTitle || '') + '</div>' +
        '<div class="player-block-empty">系统 ' + _esc(systemKey) + ' 渲染异常：' +
        _esc(e && e.message ? e.message : String(e)) + '</div>' +
        '</div>';
    }

    // 5) fn 返回 null/空 → 走 fallback
    return _wrapBlock(adapter.fallback(role, blockTitle), systemKey, blockTitle);
  }

  TM.PlayerSystemsAdapter = {
    renderBlock: renderBlock,
    RENDER_ADAPTERS: RENDER_ADAPTERS,
    _wrapBlock: _wrapBlock
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.PlayerSystemsAdapter;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this)));
