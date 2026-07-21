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

  /** 软依赖守卫调用器：仅当对应系统已挂载且提供 renderBlockHTML 时才调，否则返回 null */
  function _callSystemRender(systemKey, role, title) {
    if (global.TM && global.TM[systemKey] && typeof global.TM[systemKey].renderBlockHTML === 'function') {
      return global.TM[systemKey].renderBlockHTML(role, title);
    }
    return null;
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
