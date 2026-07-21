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
 *
 * 2026-07-22 修「大地图显示有问题·无法缩放」：
 *   历史根因：
 *   ① viewBox 硬编码 "0 0 800 450"·但实际剧本数据是 1200×720·区域坐标普遍 >800·
 *     被 SVG 裁到画布外·视觉上"地图显示有问题"。
 *   ② region 渲染只取 r.path·但运行时 region 是 {type:'poly', coords:[x1,y1,...]} 格式·
 *     没有 path 字段·导致 d 字段恒为兜底几何 "M50+i*80,50 ..."·区域画到错误位置。
 *   ③ 无任何缩放/平移交互·用户"无法缩放"。
 *   修复：
 *   - viewBox 改用 data.width/height（缺省时按 coords 实际范围推算）。
 *   - 新增 _regionPathD·从 coords/points/polygon/path/d 多格式统一生成 SVG path d 字符串。
 *   - 新增 zoom/pan 状态机（_zoom/_panX/_panY）·viewBox 动态变换。
 *   - 绑定 wheel（以鼠标位置为中心缩放）+ mousedown/move/up（拖拽平移）+ touch。
 *   - toolbar 加 +/−/重置 缩放控件按钮 + 缩放百分比指示。
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

  /** 缩放上下限 */
  var ZOOM_MIN = 0.5;
  var ZOOM_MAX = 8.0;

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

  // ═══ 视图变换状态（2026-07-22 新增）═══════════════════════
  // _baseVB：地图数据自身的坐标系范围（即 data.width × data.height）。
  // _zoom/_panX/_panY：用户视图变换·panX/panY 为视口左上角在数据坐标系中的坐标。
  //   zoom=1·pan=(0,0) → viewBox=(0,0,VW,VH)·显示整图。
  //   zoom=2·pan=(0,0) → viewBox=(0,0,VW/2,VH/2)·显示左上角四分之一（放大 2×）。
  var _zoom = 1.0;
  var _panX = 0;
  var _panY = 0;
  var _baseVB = { x: 0, y: 0, w: 800, h: 450 };

  // 拖拽状态（模块级·避免每次 render 重复绑 doc 监听）
  var _drag = {
    active: false, startX: 0, startY: 0,
    startPanX: 0, startPanY: 0, moved: 0,
    svg: null, container: null
  };
  var _docListenersBound = false;

  /** 取当前状态 */
  function getState() { return _state; }
  function getZoom() { return _zoom; }

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
   * 把 region 的几何数据统一转成 SVG path 的 d 字符串。
   * 运行时 region 多为 {type:'poly', coords:[x1,y1,x2,y2,...]}（normalizeGameMapRuntime
   * 后还会生成 points:[[x,y],...] / polygon:[{x,y},...] / center:[x,y]）。
   * 兼容旧式 r.path / r.d 字符串。
   */
  function _regionPathD(r) {
    if (!r) return '';
    // 1) 显式 d 字符串优先
    if (typeof r.d === 'string' && r.d) return r.d;
    if (typeof r.path === 'string' && r.path) return r.path;

    var pts = [];
    // 2) points: [[x,y],...]
    if (Array.isArray(r.points) && r.points.length) {
      for (var i = 0; i < r.points.length; i++) {
        var p = r.points[i];
        if (Array.isArray(p) && p.length >= 2) pts.push(p[0] + ',' + p[1]);
        else if (p && typeof p === 'object' && 'x' in p && 'y' in p) pts.push(p.x + ',' + p.y);
      }
    }
    // 3) polygon: [{x,y},...]
    if (!pts.length && Array.isArray(r.polygon) && r.polygon.length) {
      for (var i = 0; i < r.polygon.length; i++) {
        var p = r.polygon[i];
        if (p && typeof p === 'object' && 'x' in p && 'y' in p) pts.push(p.x + ',' + p.y);
      }
    }
    // 4) coords: [x1,y1,x2,y2,...] 扁平数组
    if (!pts.length && Array.isArray(r.coords) && r.coords.length >= 2) {
      for (var i = 0; i + 1 < r.coords.length; i += 2) {
        pts.push(r.coords[i] + ',' + r.coords[i + 1]);
      }
    }
    if (!pts.length) return '';
    return 'M' + pts.join(' L') + ' Z';
  }

  /** 计算当前应用的 viewBox（基础 VB 经 zoom/pan 后的子矩形） */
  function _currentVB() {
    var w = _baseVB.w / _zoom;
    var h = _baseVB.h / _zoom;
    return { x: _panX, y: _panY, w: w, h: h };
  }

  /**
   * 内部 SVG 生成器
   * 生成 SVG 字符串：SVG 容器 + region path + 玩家位置标记（金色脉动圆点）
   *
   * 2026-07-22 修：
   *   - viewBox 用 data.width/height（缺省时按 coords 实际范围推算）·取代硬编码 800×450
   *   - region 渲染走 _regionPathD（兼容 poly+coords / points / polygon / path 多格式）
   *   - 应用当前 _zoom/_panX/_panY 视图变换
   */
  function _renderSVG(data) {
    var regions = [];
    if (data && data.regions && data.regions.length) {
      regions = data.regions;
    } else if (Array.isArray(data)) {
      regions = data;
    }

    // 计算基础 viewBox：优先用 data.width/height·缺省时按 coords 实际范围推算
    var vw = (data && Number(data.width)) || 0;
    var vh = (data && Number(data.height)) || 0;
    if (!vw || !vh) {
      var maxX = 0, maxY = 0;
      for (var i = 0; i < regions.length; i++) {
        var r = regions[i] || {};
        var cs = Array.isArray(r.coords) ? r.coords : null;
        if (!cs && Array.isArray(r.points)) {
          cs = [];
          for (var k = 0; k < r.points.length; k++) {
            var p = r.points[k];
            if (Array.isArray(p) && p.length >= 2) { cs.push(p[0]); cs.push(p[1]); }
            else if (p && typeof p === 'object') { cs.push(p.x); cs.push(p.y); }
          }
        }
        if (cs) {
          for (var j = 0; j + 1 < cs.length; j += 2) {
            var x = Number(cs[j]) || 0, y = Number(cs[j + 1]) || 0;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      vw = vw || (maxX + 50) || 800;
      vh = vh || (maxY + 50) || 450;
    }
    _baseVB = { x: 0, y: 0, w: vw, h: vh };

    // 应用当前 zoom/pan 计算 viewBox
    var vb = _currentVB();

    // 玩家位置标记（缺省居中）
    var playerX = vw / 2, playerY = vh / 2;
    if (data && data.playerPos) {
      playerX = Number(data.playerPos.x) || playerX;
      playerY = Number(data.playerPos.y) || playerY;
    }
    var markerR = Math.max(6, Math.round(vw / 120));
    var markerR2 = Math.round(markerR * 1.4);
    var markerR3 = Math.round(markerR * 0.85);

    var paths = '';
    for (var i = 0; i < regions.length; i++) {
      var r = regions[i] || {};
      var id = r.id || r.regionId || ('region_' + i);
      var name = r.name || r.title || ('区域' + i);
      var d = _regionPathD(r);
      if (!d) continue; // 几何缺失跳过·不画兜底矩形（避免视觉错位）
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

    // 无任何区域几何 → 给一个默认占位矩形
    if (!paths) {
      paths = '<path class="player-map-region" data-region-id="default" d="M50,50 L' + (vw - 50) + ',50 L' + (vw - 50) + ',' + (vh - 50) + ' L50,' + (vh - 50) + ' Z">' +
        '<title>默认区域</title>' +
        '</path>';
    }

    var marker = '<circle class="player-map-marker" cx="' + _esc(playerX) + '" cy="' + _esc(playerY) + '" r="' + markerR + '" fill="#d4af37">' +
      '<animate attributeName="r" values="' + markerR3 + ';' + markerR2 + ';' + markerR3 + '" dur="1.6s" repeatCount="indefinite"/>' +
      '<animate attributeName="opacity" values="1;0.5;1" dur="1.6s" repeatCount="indefinite"/>' +
      '</circle>';

    return '<svg class="player-map-svg" viewBox="' + _esc(vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h) + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="player-map-bg" x="0" y="0" width="' + _esc(vw) + '" height="' + _esc(vh) + '" fill="#1a1a2e"/>' +
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
            // 拖拽刚结束·抑制本次 click（避免误触区域点击）
            if (el._dragSuppress) { el._dragSuppress = false; return; }
            var rid = el.getAttribute('data-region-id');
            if (_onClickCb) {
              try { _onClickCb(rid); } catch (e) {}
            }
          });
        })(regions[i]);
      }
    } catch (e) {}
  }

  /** 把屏幕坐标 (clientX, clientY) 转 SVG 数据坐标系点 */
  function _svgPoint(svg, clientX, clientY) {
    try {
      var pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      var ctm = svg.getScreenCTM();
      if (ctm) pt = pt.matrixTransform(ctm.inverse());
      return { x: pt.x, y: pt.y };
    } catch (e) {
      return { x: 0, y: 0 };
    }
  }

  /** 直接改 SVG viewBox 属性·不重渲染 DOM */
  function _applyZoomPan() {
    try {
      var doc = global.document;
      if (!doc) return;
      var svg = doc.querySelector('#player-map-section .player-map-svg');
      if (svg) {
        var vb = _currentVB();
        svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
      }
      var zEl = doc.querySelector('#player-map-section .player-map-zoom-level');
      if (zEl) zEl.textContent = Math.round(_zoom * 100) + '%';
    } catch (e) {}
  }

  /**
   * 设置缩放·可指定缩放中心（数据坐标系）。
   * centerX/centerY 缺省时保持当前视口中心不动。
   */
  function setZoom(newZoom, centerX, centerY) {
    newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(newZoom) || 1));
    var oldW = _baseVB.w / _zoom;
    var oldH = _baseVB.h / _zoom;
    if (centerX == null || centerY == null) {
      // 保持当前视口中心
      var cx = _panX + oldW / 2;
      var cy = _panY + oldH / 2;
      _zoom = newZoom;
      var newW = _baseVB.w / _zoom;
      var newH = _baseVB.h / _zoom;
      _panX = cx - newW / 2;
      _panY = cy - newH / 2;
    } else {
      // 保持 (centerX, centerY) 在屏幕上不动
      var ratioX = (centerX - _panX) / oldW;
      var ratioY = (centerY - _panY) / oldH;
      _zoom = newZoom;
      var newW = _baseVB.w / _zoom;
      var newH = _baseVB.h / _zoom;
      _panX = centerX - newW * ratioX;
      _panY = centerY - newH * ratioY;
    }
    _applyZoomPan();
  }

  function zoomIn() { setZoom(_zoom * 1.25); }
  function zoomOut() { setZoom(_zoom / 1.25); }
  function resetView() {
    _zoom = 1.0;
    _panX = 0;
    _panY = 0;
    _applyZoomPan();
  }

  /** 拖拽开始 */
  function _dragStart(clientX, clientY, svg, container) {
    _drag.active = true;
    _drag.moved = 0;
    _drag.startX = clientX;
    _drag.startY = clientY;
    _drag.startPanX = _panX;
    _drag.startPanY = _panY;
    _drag.svg = svg;
    _drag.container = container;
  }

  /** 拖拽移动（鼠标/触屏共用） */
  function _dragMove(clientX, clientY) {
    if (!_drag.active || !_drag.svg) return;
    var dx = clientX - _drag.startX;
    var dy = clientY - _drag.startY;
    _drag.moved += Math.abs(dx) + Math.abs(dy);
    var rect = _drag.svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      // 1 像素 = (viewBox.w / rect.width) 数据单位（x 方向）
      // viewBox.w = baseW / zoom·所以 unitPerPxX = baseW / (zoom * rect.width)
      var unitPerPxX = (_baseVB.w / _zoom) / rect.width;
      var unitPerPxY = (_baseVB.h / _zoom) / rect.height;
      // 拖右 (dx>0) → 视图应左移 → 视口左上角在数据坐标系中左移 → panX 减小
      _panX = _drag.startPanX - dx * unitPerPxX;
      _panY = _drag.startPanY - dy * unitPerPxY;
      _applyZoomPan();
    }
  }

  /** 拖拽结束 */
  function _dragEnd() {
    if (!_drag.active) return;
    _drag.active = false;
    // 移动 >5px → 标记所有 region·下次 click 抑制（避免误触区域点击）
    if (_drag.moved > 5 && _drag.container) {
      try {
        var rs = _drag.container.querySelectorAll('[data-region-id]');
        for (var i = 0; i < rs.length; i++) rs[i]._dragSuppress = true;
      } catch (_) {}
    }
  }

  /** 一次性绑定 document 级 mousemove/mouseup（拖拽过程中鼠标可能离开 svg） */
  function _bindDocListenersOnce() {
    if (_docListenersBound) return;
    _docListenersBound = true;
    try {
      var doc = global.document;
      if (!doc) return;
      doc.addEventListener('mousemove', function (e) {
        if (_drag.active) _dragMove(e.clientX, e.clientY);
      });
      doc.addEventListener('mouseup', _dragEnd);
    } catch (_) {}
  }

  /**
   * 绑定缩放/平移交互
   * - wheel：以鼠标位置为中心缩放
   * - mousedown/move/up：拖拽平移（左键）·doc 级 move/up 仅绑一次
   * - touch：单指拖拽
   * 铁律：拖拽位移 >5px 时·mouseup 后抑制一次 click（避免误触区域点击）
   */
  function _bindInteractions(container) {
    try {
      var svg = container.querySelector('.player-map-svg');
      if (!svg) return;
      _bindDocListenersOnce();

      // 滚轮缩放
      svg.addEventListener('wheel', function (e) {
        try {
          if (e.preventDefault) e.preventDefault();
          var pt = _svgPoint(svg, e.clientX, e.clientY);
          var factor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
          setZoom(_zoom * factor, pt.x, pt.y);
        } catch (_) {}
      }, { passive: false });

      // 鼠标拖拽（mousedown 在 svg 上·move/up 在 doc 上）
      svg.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return; // 仅左键
        _dragStart(e.clientX, e.clientY, svg, container);
        try { if (svg.setCapture) svg.setCapture(); } catch (_) {}
      });

      // 触屏拖拽
      svg.addEventListener('touchstart', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        _dragStart(e.touches[0].clientX, e.touches[0].clientY, svg, container);
      }, { passive: true });
      svg.addEventListener('touchmove', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        _dragMove(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      svg.addEventListener('touchend', _dragEnd, { passive: true });
      svg.addEventListener('touchcancel', _dragEnd, { passive: true });
    } catch (e) {}
  }

  /**
   * 渲染地图
   * - 取容器 #player-map-section，不存在则返回
   * - 从 GM.mapData 或 GM.regions 取地图数据（try-catch 守卫）
   * - 渲染 SVG 容器 + toolbar（标题 + 模式切换 + 缩放控件 + 折叠按钮）
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
          '<button class="player-map-zoom-btn" data-zoom="in" title="放大">+</button>' +
          '<span class="player-map-zoom-level">' + Math.round(_zoom * 100) + '%</span>' +
          '<button class="player-map-zoom-btn" data-zoom="out" title="缩小">−</button>' +
          '<button class="player-map-zoom-btn" data-zoom="reset" title="重置视图">⟲</button>' +
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

    // 绑定缩放/平移交互
    _bindInteractions(container);

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
      var zoomBtns = container.querySelectorAll('.player-map-zoom-btn');
      for (var i = 0; i < zoomBtns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var z = btn.getAttribute('data-zoom');
            if (z === 'in') zoomIn();
            else if (z === 'out') zoomOut();
            else if (z === 'reset') resetView();
          });
        })(zoomBtns[i]);
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
    setState: setState,
    // 2026-07-22 新增：缩放/平移 API
    getZoom: getZoom,
    setZoom: setZoom,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    resetView: resetView
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.PlayerMap;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this)));
