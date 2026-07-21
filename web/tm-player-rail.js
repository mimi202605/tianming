// ============================================================
// tm-player-rail.js — 穿越模式右栏 3×3 图标栅格 + drawer（Phase 5.1 重建）
// ------------------------------------------------------------
// 暴露：window.TM.PlayerRail.{
//   render, refresh, openDrawer, closeDrawer, clearReddot,
//   notifyRail, getSlotState, _slotDisplay, SCENE_RAIL, RAIL_MATRIX
// }
// 软依赖：TM.PlayerSystemsAdapter.renderBlock（drawer body 复用·与场景区一致）
//   P.playerInfo / GM.turn
// 双路径挂载：浏览器 window.TM.PlayerRail；node smoke module.exports
// 跨朝代铁律：本文件绝不硬编明清专名·术语一律朝代中立
//
// 铁律：
//   1. 穿越铁律：绝不调皇帝御案渲染函数 / phase8 formal bridge（保持 UI 隔离）
//   2. drawer body 复用 TM.PlayerSystemsAdapter.renderBlock（与场景区一致）
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerRail) return;  // 防重入

  // ── 9 槽配置（3×3 栅格） ─────────────────────────────────
  // 槽 8（军务/反叛）含 altKey=PlayerRebel：v2 矩阵允许部分角色启用反叛路径。
  var SCENE_RAIL = [
    { idx: 0, icon: '👨‍👩‍👧', label: '家族', systemKey: 'PlayerFamily',       drawerKey: 'PlayerFamily' },
    { idx: 1, icon: '💍',     label: '婚姻', systemKey: 'PlayerMarriage',     drawerKey: 'PlayerMarriage' },
    { idx: 2, icon: '💰',     label: '私产', systemKey: 'PlayerEconomy',      drawerKey: 'PlayerEconomy' },
    { idx: 3, icon: '🏭',     label: '产业', systemKey: 'PlayerIndustry',     drawerKey: 'PlayerIndustry' },
    { idx: 4, icon: '📜',     label: '上奏', systemKey: 'PlayerMemorial',     drawerKey: 'PlayerMemorial' },
    { idx: 5, icon: '⚖️',     label: '朝议', systemKey: 'PlayerCourtDebate',  drawerKey: 'PlayerCourtDebate' },
    { idx: 6, icon: '🤝',     label: '关系', systemKey: 'PlayerInteraction',  drawerKey: 'PlayerInteraction' },
    { idx: 7, icon: '🚶',     label: '移动', systemKey: 'PlayerMovement',     drawerKey: 'PlayerMovement' },
    { idx: 8, icon: '⚔️',     label: '军务', systemKey: 'PlayerPrivateArmy',  drawerKey: 'PlayerPrivateArmy', altKey: 'PlayerRebel' }
  ];

  // ── RAIL_MATRIX v2（15 行 × 9 列） ────────────────────────
  // 14 角色 + custom。每行 9 元素数组·按 SCENE_RAIL 顺序（0-8）。
  // 值：'enabled' / 'disabled' / 'restricted' / 'special:caravan' /
  //     'special:guardian' / 'special:advice'
  //
  // v2 放宽规则（历史依据：王莽/董卓/十常侍/武则天/陈胜吴广）：
  //   - 槽 8（军务/反叛）：minister/regent/eunuch/custom/commoner = 'enabled'
  //   - 槽 8：maid = 'disabled'
  //   - 槽 8：merchant = 'special:caravan'
  //   - 槽 8：general/bandit/prince = 'enabled'
  //   - 槽 0：infant = 'special:guardian'
  //   - 槽 4：retired_official = 'special:advice'
  //   - infant 大多 disabled（除 home/special）·maid 槽 0-3 disabled
  var RAIL_MATRIX = {
    minister:         ['enabled',         'enabled',  'enabled',  'enabled',  'enabled',         'enabled',    'enabled',    'enabled',  'enabled'],
    regent:           ['enabled',         'enabled',  'enabled',  'enabled',  'enabled',         'enabled',    'enabled',    'enabled',  'enabled'],
    general:          ['enabled',         'enabled',  'enabled',  'enabled',  'enabled',         'enabled',    'enabled',    'enabled',  'enabled'],
    prince:           ['enabled',         'enabled',  'enabled',  'enabled',  'restricted',      'restricted', 'enabled',    'enabled',  'enabled'],
    merchant:         ['enabled',         'enabled',  'enabled',  'enabled',  'disabled',        'disabled',   'enabled',    'enabled',  'special:caravan'],
    eunuch:           ['restricted',      'disabled', 'enabled',  'enabled',  'enabled',         'enabled',    'enabled',    'enabled',  'enabled'],
    maid:             ['disabled',        'disabled', 'disabled', 'disabled', 'disabled',        'disabled',   'enabled',    'restricted', 'disabled'],
    commoner:         ['enabled',         'enabled',  'enabled',  'enabled',  'disabled',        'disabled',   'enabled',    'enabled',  'enabled'],
    bandit:           ['enabled',         'enabled',  'enabled',  'restricted', 'disabled',      'disabled',   'enabled',    'enabled',  'enabled'],
    monk:             ['disabled',        'disabled', 'restricted', 'restricted', 'disabled',    'disabled',   'enabled',    'enabled',  'disabled'],
    artisan:          ['enabled',         'enabled',  'enabled',  'enabled',  'disabled',        'disabled',   'enabled',    'enabled',  'disabled'],
    infant:           ['special:guardian', 'disabled', 'restricted', 'disabled', 'disabled',     'disabled',   'restricted', 'disabled', 'disabled'],
    retired_official: ['enabled',         'enabled',  'enabled',  'enabled',  'special:advice',  'restricted', 'enabled',    'enabled',  'disabled'],
    actor:            ['enabled',         'enabled',  'enabled',  'enabled',  'disabled',        'disabled',   'enabled',    'enabled',  'disabled'],
    custom:           ['enabled',         'enabled',  'enabled',  'enabled',  'restricted',      'restricted', 'enabled',    'enabled',  'enabled']
  };

  // ── 内部状态 ───────────────────────────────────────────────
  var _reddots = {};          // slotIndex → bool
  var _openSlotIndex = -1;    // 当前打开的 drawer 槽位·-1 表示无

  // ── 辅助函数 ───────────────────────────────────────────────
  function _esc(s) {
    if (typeof escHtml === 'function') { try { return escHtml(s); } catch (_) {} }
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _$(id) {
    if (typeof document === 'undefined') return null;
    try { return document.getElementById(id); } catch (_) { return null; }
  }
  function _pi() {
    try { return (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null; } catch (_) { return null; }
  }
  function _playerRole() {
    var pi = _pi();
    return pi ? (pi.playerRole || 'commoner') : 'commoner';
  }

  // ── 槽状态查询 ─────────────────────────────────────────────
  function getSlotState(role, slotIndex) {
    var row = RAIL_MATRIX[role || 'commoner'] || RAIL_MATRIX.commoner;
    if (slotIndex < 0 || slotIndex >= row.length) return 'disabled';
    return row[slotIndex];
  }

  // 返回 { icon, label, state, drawerKey, badge }
  function _slotDisplay(slot, role) {
    var state = getSlotState(role, slot.idx);
    var badge = '';
    if (typeof state === 'string' && state.indexOf('special:') === 0) {
      badge = state.slice('special:'.length);  // caravan / guardian / advice
    }
    return { icon: slot.icon, label: slot.label, state: state, drawerKey: slot.drawerKey, badge: badge };
  }

  // ═══ 渲染：身份卡 + 3×3 图标栅格 ═════════════════════════
  function render() {
    if (typeof document === 'undefined') return;
    var rail = _$('player-right-rail-shell');
    if (!rail) rail = document.getElementById('player-rail');  // 独立容器兜底
    if (!rail) return;
    var role = _playerRole();
    var pi = _pi() || {};
    // 头衔缺失时用中文化 role·避免显示英文枚举（如 'commoner'）
    var ROLE_LABELS = {
      minister: '朝臣', regent: '权臣', general: '武将', prince: '宗室',
      merchant: '商贾', eunuch: '内侍', maid: '宫人', commoner: '平民',
      bandit: '豪强', monk: '方外', artisan: '匠户', infant: '稚子',
      retired_official: '致仕', actor: '优伶', custom: '异人', emperor: '君主'
    };
    var roleText = pi.characterTitle || ROLE_LABELS[role] || role || '—';
    var h = '';
    // 身份卡
    h += '<div class="ps-rail-card">';
    h += '<div class="ps-rail-card-name">' + _esc(pi.characterName || '玩家') + '</div>';
    h += '<div class="ps-rail-card-role">' + _esc(roleText) + '</div>';
    h += '</div>';
    // 3×3 图标栅格
    h += '<div class="ps-rail-grid">';
    for (var i = 0; i < SCENE_RAIL.length; i++) {
      var slot = SCENE_RAIL[i];
      var disp = _slotDisplay(slot, role);
      // state-class：enabled/disabled/restricted/special-xxx
      var stateCls = 'state-' + String(disp.state).replace(':', '-');
      var clickable = (disp.state === 'enabled' ||
                       disp.state === 'restricted' ||
                       (typeof disp.state === 'string' && disp.state.indexOf('special:') === 0));
      var cls = 'ps-rail-slot ' + stateCls + (clickable ? ' clickable' : '');
      var onclick = clickable ? ' onclick="TM.PlayerRail.openDrawer(' + slot.idx + ')"' : '';
      var tabindex = clickable ? '0' : '-1';
      var dot = _reddots[slot.idx] ? '<span class="ps-rail-reddot"></span>' : '';
      var badgeHtml = disp.badge ? '<span class="ps-rail-slot-badge">' + _esc(disp.badge) + '</span>' : '';
      h += '<div class="' + cls + '"' + onclick + ' role="button" tabindex="' + tabindex + '" data-slot="' + slot.idx + '">';
      h += '<span class="ps-rail-slot-icon">' + disp.icon + '</span>';
      h += '<span class="ps-rail-slot-label">' + _esc(disp.label) + '</span>';
      h += badgeHtml;
      h += dot;
      h += '</div>';
    }
    h += '</div>';
    rail.innerHTML = h;
  }

  function refresh() {
    render();
  }

  // ═══ drawer DOM 懒构建 ═══════════════════════════════════
  function _ensureDrawerDOM() {
    if (typeof document === 'undefined' || !document.body) return null;
    var drawer = document.getElementById('player-rail-drawer');
    if (drawer) return drawer;
    // overlay：点空白处关 drawer
    var overlay = document.createElement('div');
    overlay.id = 'player-rail-drawer-overlay';
    overlay.className = 'player-rail-drawer-overlay';
    overlay.onclick = function () { closeDrawer(); };
    document.body.appendChild(overlay);
    // panel：标题 + 关闭按钮 + body
    drawer = document.createElement('div');
    drawer.id = 'player-rail-drawer';
    drawer.className = 'player-rail-drawer';
    var panel = document.createElement('div');
    panel.className = 'player-rail-drawer-panel';
    panel.innerHTML =
      '<div class="player-rail-drawer-head">' +
      '<span class="player-rail-drawer-title"></span>' +
      '<button type="button" class="player-rail-drawer-close" onclick="TM.PlayerRail.closeDrawer()">×</button>' +
      '</div>' +
      '<div class="player-rail-drawer-body"></div>';
    drawer.appendChild(panel);
    document.body.appendChild(drawer);
    return drawer;
  }

  // ═══ openDrawer：懒创建 + 渲染 body + 滑入 ═══════════════
  // 同时只能开一个 drawer（开新关旧）。
  function openDrawer(slotIndex) {
    if (typeof document === 'undefined') return;
    // 找槽定义
    var slot = null;
    for (var i = 0; i < SCENE_RAIL.length; i++) {
      if (SCENE_RAIL[i].idx === slotIndex) { slot = SCENE_RAIL[i]; break; }
    }
    if (!slot) return;
    var role = _playerRole();
    var state = getSlotState(role, slotIndex);
    if (state === 'disabled') return;  // 禁用槽不可开
    // 开新关旧
    if (_openSlotIndex >= 0 && _openSlotIndex !== slotIndex) {
      closeDrawer();
    }
    var drawer = _ensureDrawerDOM();
    if (!drawer) return;
    var titleEl = drawer.querySelector('.player-rail-drawer-title');
    var bodyEl = drawer.querySelector('.player-rail-drawer-body');
    if (titleEl) titleEl.textContent = slot.label;
    if (bodyEl) {
      // drawer body 复用 adapter.renderBlock（与场景区一致）
      var adapter = (global.TM && global.TM.PlayerSystemsAdapter) ? global.TM.PlayerSystemsAdapter : null;
      var html = '';
      if (adapter && typeof adapter.renderBlock === 'function') {
        try {
          html = adapter.renderBlock(slot.drawerKey, role, slot.label);
        } catch (e) {
          html = '<div class="ps-drawer-err">抽屉渲染失败：' + _esc(slot.drawerKey) + '</div>';
          try { console.error('[PlayerRail.openDrawer]', slot.drawerKey, e); } catch (_) {}
        }
      } else {
        html = '<div class="ps-drawer-empty">场景渲染器缺席（' + _esc(slot.drawerKey) + '）</div>';
      }
      bodyEl.innerHTML = html;
    }
    _openSlotIndex = slotIndex;
    // 滑入：setTimeout 让浏览器先布局再 add open class（CSS 过渡）
    var drawerRef = drawer;
    setTimeout(function () {
      drawerRef.classList.add('open');
      var ov = document.getElementById('player-rail-drawer-overlay');
      if (ov) ov.classList.add('open');
    }, 10);
    // 开 drawer 即清该槽红点
    clearReddot(slotIndex);
  }

  function closeDrawer() {
    if (typeof document === 'undefined') return;
    var drawer = document.getElementById('player-rail-drawer');
    if (drawer) drawer.classList.remove('open');  // 移除 open class 滑出
    var ov = document.getElementById('player-rail-drawer-overlay');
    if (ov) ov.classList.remove('open');
    _openSlotIndex = -1;
  }

  // ═══ 红点 ═════════════════════════════════════════════════
  function clearReddot(slotIndex) {
    _reddots[slotIndex] = false;
    // 同步刷新栅格上的红点 DOM
    try {
      var node = document.querySelector('.ps-rail-slot[data-slot="' + slotIndex + '"] .ps-rail-reddot');
      if (node && node.parentNode) node.parentNode.removeChild(node);
    } catch (_) {}
  }
  function notifyRail(slotIndex) {
    _reddots[slotIndex] = true;
    try { render(); } catch (_) {}
  }

  // ── 导出 ───────────────────────────────────────────────────
  global.TM.PlayerRail = {
    render: render,
    refresh: refresh,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    clearReddot: clearReddot,
    notifyRail: notifyRail,
    getSlotState: getSlotState,
    _slotDisplay: _slotDisplay,
    SCENE_RAIL: SCENE_RAIL,
    RAIL_MATRIX: RAIL_MATRIX
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.TM.PlayerRail;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
