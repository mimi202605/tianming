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
  // 链：renderBlockHTML(role, title) → render<Short>Panel() → getState() → null
  // 注：不吞异常——异常让 renderBlock 顶层 try/catch 捕获返回「渲染异常」
  function _callSystemRender(systemKey, role, title) {
    var sys = (global.TM && global.TM[systemKey]) ? global.TM[systemKey] : null;
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
    PlayerFamily:    'renderFamilyPanel',
    PlayerMarriage:  'renderMarriagePanel',
    PlayerTech:      'renderTechPanel',
    PlayerMovement:  'renderMovementPanel'
  };

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
