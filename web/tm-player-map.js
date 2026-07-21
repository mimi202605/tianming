'use strict';
/**
 * 穿越模式专属大地图（tm-player-map.js）
 *
 * 作用：独立 SVG 渲染，不耦合皇帝御案地图。
 *
 * 铁律：
 * 1. 绝不调皇帝御案渲染函数 / phase8 formal bridge —— 二者属皇帝侧，穿越模式禁调。
 * 2. 独立 SVG，不耦合 phase8-formal-map.js。
 * 3. 渲染失败走占位，不让地图崩掉整页。
 */
(function (global) {
  if (global.TM && global.TM.PlayerMap) return;

  var TM = global.TM || (global.TM = {});

  /** 三态高度 */
  var STATE_HEIGHTS = {
    expanded: '45vh',
    fullscreen: '90vh',
    collapsed: '24vh'
  };

  var DEFAULT_STATE = 'expanded';

  /** 地图模式 */
  var MODES = ['faction', 'terrain', 'admin'];

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

  /** 读状态（localStorage 不存在时默认 expanded） */
  function _loadState() {
    try {
      if (global.localStorage) {
        var s = global.localStorage.getItem('playerMapState');
        if (s && STATE_HEIGHTS[s]) return s;
      }
    } catch (e) {}
    return DEFAULT_STATE;
  }

  /** 写状态（try-catch 守卫） */
  function _saveState(state) {
    try {
      if (global.localStorage) global.localStorage.setItem('playerMapState', state);
    } catch (e) {}
  }

  // 模块内部状态
  var _state = _loadState();
  var _mode = 'faction';
  var _highlighted = null;
  var _flyTo = null;
  var _onClickCb = null;
  var _lastData = null;

  /** 取当前状态 */
  function getState() {
    return _state;
  }

  /** 设置状态（合法值才接受） */
  function setState(state) {
    if (STATE_HEIGHTS[state]) {
      _state = state;
      _saveState(_state);
    }
  }

  /** 切换三态：expanded → fullscreen → collapsed → expanded */
  function toggleState() {
    if (_state === 'expanded') _state = 'fullscreen';
    else if (_state === 'fullscreen') _state = 'collapsed';
    else _state = 'expanded';
    _saveState(_state);
    render();
  }

  /** 切换地图模式：faction / terrain / admin */
  function setMode(mode) {
    if (MODES.indexOf(mode) !== -1) {
      _mode = mode;
      render();
    }
  }

  /** 注册点击回调 */
  function onRegionClick(cb) {
    _onClickCb = typeof cb === 'function' ? cb : null;
  }

  /** 高亮指定区域 */
  function highlight(regionId) {
    _highlighted = regionId;
    render();
  }

  /** 切换视图中心 */
  function flyTo(regionId) {
    _flyTo = regionId;
    render();
  }

  /** refresh = render 别名 */
  function refresh() {
    render();
  }

  /** 从 GM.mapData 或 GM.regions 取地图数据（try-catch 守卫） */
  function _getMapData() {
    try {
      var gm = global.GM;
      if (!gm) return null;
      if (gm.mapData) return gm.mapData;
      if (gm.regions) return { regions: gm.regions };
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 内部 SVG 生成器
   * 生成简化 SVG 字符串：SVG 容器 + region path 占位 + 玩家位置标记（金色脉动圆点）
   */
  function _renderSVG(data) {
    var regions = [];
    if (data && data.regions && data.regions.length) {
      regions = data.regions;
    } else if (Array.isArray(data)) {
      regions = data;
    }

    var paths = '';
    for (var i = 0; i < regions.length; i++) {
      var r = regions[i] || {};
      var id = r.id || r.regionId || ('region_' + i);
      var name = r.name || r.title || ('区域' + i);
      var d = r.path || ('M' + (50 + i * 80) + ',50 L' + (130 + i * 80) + ',50 L' + (130 + i * 80) + ',120 L' + (50 + i * 80) + ',120 Z');
      var cls = 'player-map-region';
      if (_highlighted && String(_highlighted) === String(id)) {
        cls += ' player-map-region-highlight';
      }
      if (_flyTo && String(_flyTo) === String(id)) {
        cls += ' player-map-region-flyto';
      }
      paths += '<path class="' + cls + '" data-region-id="' + _esc(id) + '" d="' + _esc(d) + '">' +
        '<title>' + _esc(name) + '</title>' +
        '</path>';
    }

    // 没有区域数据 → 给一个默认占位区域
    if (!paths) {
      paths = '<path class="player-map-region" data-region-id="default" d="M50,50 L750,50 L750,400 L50,400 Z">' +
        '<title>默认区域</title>' +
        '</path>';
    }

    // 玩家位置标记（金色脉动圆点）
    var playerX = 400, playerY = 225;
    if (data && data.playerPos) {
      playerX = data.playerPos.x || 400;
      playerY = data.playerPos.y || 225;
    }
    var marker = '<circle class="player-map-marker" cx="' + _esc(playerX) + '" cy="' + _esc(playerY) + '" r="8" fill="#d4af37">' +
      '<animate attributeName="r" values="6;10;6" dur="1.6s" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="1;0.5;1" dur="1.6s" repeatCount="indefinite"/>' +
      '</circle>';

    return '<svg class="player-map-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="player-map-bg" x="0" y="0" width="800" height="450" fill="#1a1a2e"/>' +
      paths +
      marker +
      '</svg>';
  }

  /** 绑定区域点击 */
  function _bindClicks(container) {
    try {
      var regions = container.querySelectorAll('[data-region-id]');
      for (var i = 0; i < regions.length; i++) {
        (function (el) {
          el.addEventListener('click', function () {
            var rid = el.getAttribute('data-region-id');
            if (_onClickCb) {
              try { _onClickCb(rid); } catch (e) {}
            }
          });
        })(regions[i]);
      }
    } catch (e) {}
  }

  /**
   * 渲染地图
   * - 取容器 #player-map-section，不存在则返回
   * - 从 GM.mapData 或 GM.regions 取地图数据（try-catch 守卫）
   * - 渲染 SVG 容器 + toolbar（标题 + 模式切换按钮 + 折叠按钮）
   * - 渲染失败 → 显示「地图加载失败·[重试]」占位
   * - 调 _renderSVG(data) 生成 SVG 字符串
   * 铁律：绝不调皇帝御案渲染函数 / phase8 formal bridge —— 本函数不做任何相关调用。
   */
  function render() {
    var container;
    try {
      container = global.document && global.document.getElementById('player-map-section');
    } catch (e) {
      return;
    }
    if (!container) return;

    var data = _getMapData();
    _lastData = data;

    var height = STATE_HEIGHTS[_state] || STATE_HEIGHTS[DEFAULT_STATE];

    var html = '<div class="player-map-wrap" style="height:' + height + ';">' +
      '<div class="player-map-toolbar">' +
        '<span class="player-map-title">天下大势</span>' +
        '<div class="player-map-modes">' +
          '<button class="player-map-mode-btn' + (_mode === 'faction' ? ' active' : '') + '" data-mode="faction">势力</button>' +
          '<button class="player-map-mode-btn' + (_mode === 'terrain' ? ' active' : '') + '" data-mode="terrain">地形</button>' +
          '<button class="player-map-mode-btn' + (_mode === 'admin' ? ' active' : '') + '" data-mode="admin">政区</button>' +
        '</div>' +
        '<div class="player-map-actions">' +
          '<button class="player-map-toggle" title="切换大小">' + _esc(_state) + '</button>' +
          '<button class="player-map-collapse" title="折叠/展开">' + (_state === 'collapsed' ? '展开' : '折叠') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="player-map-canvas">';

    var svgHtml;
    try {
      svgHtml = _renderSVG(data);
    } catch (e) {
      svgHtml = '<div class="player-map-error">地图加载失败·<a href="#" class="player-map-retry">[重试]</a></div>';
    }

    html += svgHtml + '</div></div>';

    container.innerHTML = html;

    // 绑定区域点击
    _bindClicks(container);

    // 绑定 toolbar 按钮
    try {
      var modeBtns = container.querySelectorAll('.player-map-mode-btn');
      for (var i = 0; i < modeBtns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var m = btn.getAttribute('data-mode');
            setMode(m);
          });
        })(modeBtns[i]);
      }
      var toggleBtn = container.querySelector('.player-map-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () { toggleState(); });
      }
      var collapseBtn = container.querySelector('.player-map-collapse');
      if (collapseBtn) {
        collapseBtn.addEventListener('click', function () { toggleState(); });
      }
      var retryLink = container.querySelector('.player-map-retry');
      if (retryLink) {
        retryLink.addEventListener('click', function (e) {
          if (e && e.preventDefault) e.preventDefault();
          render();
        });
      }
    } catch (e) {}
  }

  TM.PlayerMap = {
    render: render,
    refresh: refresh,
    highlight: highlight,
    flyTo: flyTo,
    setMode: setMode,
    onRegionClick: onRegionClick,
    toggleState: toggleState,
    getState: getState,
    setState: setState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.PlayerMap;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this)));
