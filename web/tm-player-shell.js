// ============================================================
// tm-player-shell.js — 穿越模式专属 shell 主壳（Phase 5.1 重建）
// ------------------------------------------------------------
// 作用：组合顶栏 / 左栏 / 主面板[地图+场景] / 右栏，提供单一渲染入口。
// 暴露：window.TM.PlayerShell.{
//   render, refreshAll, switchTab, renderScene, renderTopBar,
//   renderLeftTabs, renderRightRail, notify, notifyRail, retry,
//   _assertInvariants, SCENE_BLOCKS
// }
// 软依赖：TM.PlayerSystemsAdapter / TM.PlayerMap / TM.PlayerRail
//   - TM.PlayerSystemsAdapter.renderBlock(systemKey, role, blockTitle) 场景块
//   - TM.PlayerMap.render()                                            地图区
//   - TM.PlayerRail.render()                                           右栏
// 缺席任一软依赖均显示占位·绝不抛异常中断渲染。
// 双路径挂载：浏览器 window.TM.PlayerShell；node smoke module.exports
// 跨朝代铁律：本文件绝不硬编明清专名·术语一律朝代中立
//
// 铁律：
//   1. 穿越模式下绝不调皇帝御案渲染函数 / phase8 formal bridge（保持 UI 隔离）
//   2. 任何子模块抛异常 → 显示错误占位·绝不降级到皇帝界面
//   3. 跨朝代中立·不硬编任何朝代专名
//   4. 软依赖 TM.PlayerSystemsAdapter / TM.PlayerMap / TM.PlayerRail
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerShell) return;  // 防重入

  // ── 内部状态 ───────────────────────────────────────────────
  var _currentTab = 'home';
  var _tabReddots = {};       // tabId → bool
  var _railReddots = {};      // slotIndex → bool
  var _initialized = false;

  // ── 8 tab 配置（与场景块对齐） ────────────────────────────
  // 每个 tab.id 对应左栏一项；systems 列出该 tab 下要渲染的系统 key。
  var SCENE_BLOCKS = [
    { id: 'home',      label: '邸宅', icon: '🏠', systems: ['PlayerFamily', 'PlayerMarriage', 'PlayerEconomy', 'PlayerIndustry'] },
    { id: 'court',     label: '朝堂', icon: '⚖️', systems: ['PlayerMemorial', 'PlayerCourtDebate', 'PlayerOffice'] },
    { id: 'social',    label: '交往', icon: '🤝', systems: ['PlayerInteraction', 'PlayerMovement'] },
    { id: 'study',     label: '修习', icon: '📚', systems: ['PlayerSkill'] },
    { id: 'tech',      label: '格物', icon: '🔬', systems: ['PlayerTech'] },
    { id: 'military',  label: '戎机', icon: '⚔️', systems: ['PlayerPrivateArmy', 'PlayerRebel'] },
    { id: 'fortune',   label: '际遇', icon: '✨', systems: ['PlayerFortune'] },
    { id: 'adversity', label: '变故', icon: '📜', systems: ['PlayerAdversity'] }
  ];

  // ── 顶栏状态字段映射（14 角色 + custom） ──────────────────
  // _renderBarStats 软依赖从 pi.stats 读值，缺席显示「—」。
  var ROLE_STATS = {
    minister:         ['政声', '圣眷', '党望'],
    regent:           ['权势', '圣眷', '人望'],
    general:          ['圣眷', '军威', '兵权'],
    prince:           ['圣眷', '宗望'],
    merchant:         ['财望', '商誉'],
    eunuch:           ['圣眷', '权势'],
    maid:             ['圣眷', '宫望'],
    commoner:         ['民望'],
    bandit:           ['威望', '兵权'],
    monk:             ['德望'],
    artisan:          ['匠望', '财望'],
    infant:           ['监护'],
    retired_official: ['故望'],
    actor:            ['名望'],
    custom:           ['声望']
  };

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
  function _isTrans() {
    var pi = _pi();
    return !!(pi && pi.transmigrationMode === true && pi.playerRole && pi.playerRole !== 'emperor');
  }
  function _playerRole() {
    var pi = _pi();
    return pi ? (pi.playerRole || 'commoner') : 'commoner';
  }

  // ═══ 顶栏四段式 ═══════════════════════════════════════════
  // 1) 身份：角色名 + 头衔 chip
  function _renderBarIdentity(pi, role) {
    var name = (pi && pi.characterName) || '玩家';
    var title = (pi && (pi.characterTitle || pi.playerRole)) || role;
    var h = '';
    h += '<div class="ps-bar-id">';
    h += '<span class="ps-bar-name">' + _esc(name) + '</span>';
    h += '<span class="ps-bar-chip">' + _esc(title) + '</span>';
    h += '</div>';
    return h;
  }

  // 2) 派系 / 势力
  function _renderBarAffiliation(pi) {
    var faction = (pi && (pi.faction || pi.factionName)) || '';
    var clan = (pi && pi.clan) || '';
    var h = '';
    h += '<div class="ps-bar-aff">';
    if (faction) h += '<span class="ps-bar-faction">' + _esc(faction) + '</span>';
    if (clan)    h += '<span class="ps-bar-clan">' + _esc(clan) + '</span>';
    if (!faction && !clan) h += '<span class="ps-bar-aff-empty">—</span>';
    h += '</div>';
    return h;
  }

  // 3) 时间：与皇帝模式完全一致（getTSText + calcDateFromTurn + 节气）
  // 主串：getTSText(GM.turn) → 如「天启七年仲秋甲子日」
  // 副串：公元 N 年（calcDateFromTurn.adYear）
  // 节气：按 lunarMonth 推算孟春/仲春/季春/...
  // 回合：第 N 回合
  function _renderBarTime() {
    var turn = '—', main = '—', sub = '', jieqi = '', jieqiDesc = '';
    try {
      if (typeof GM !== 'undefined' && GM) {
        if (GM.turn != null) turn = GM.turn;
        // 主串：年号+年+季+月+干支日（与皇帝 #bar-time-main 同源）
        if (typeof global.getTSText === 'function') {
          try { main = global.getTSText(GM.turn || 1); } catch (_) {}
        }
        // 副串：公元 N 年（与皇帝 #bar-time-sub 同源）
        if (typeof global.calcDateFromTurn === 'function') {
          try {
            var di = global.calcDateFromTurn(GM.turn || 1);
            if (di && typeof di.adYear !== 'undefined') {
              var ay = di.adYear;
              sub = (ay < 0) ? ('公元前 ' + Math.abs(ay) + ' 年') : ('公元 ' + ay + ' 年');
              // 节气：按 lunarMonth 推算（与 tm-player-core.js:1687-1693 同逻辑）
              var mon = (di.lunarMonth || di.solarMonth) || ((((GM.turn || 1) - 1) % 12) + 1);
              if (mon >= 3 && mon <= 5) { jieqi = ['孟春', '仲春', '季春'][mon - 3]; jieqiDesc = ['立春·东风解冻', '春分·雷乃发声', '谷雨·萍始生'][mon - 3]; }
              else if (mon >= 6 && mon <= 8) { jieqi = ['孟夏', '仲夏', '季夏'][mon - 6]; jieqiDesc = ['立夏·蝼蝈鸣', '夏至·蜩始鸣', '大暑·腐草为萤'][mon - 6]; }
              else if (mon >= 9 && mon <= 11) { jieqi = ['孟秋', '仲秋', '季秋'][mon - 9]; jieqiDesc = ['立秋·凉风至', '秋分·鸿雁来', '霜降·草木黄落'][mon - 9]; }
              else { var wi = (mon === 12 ? 0 : mon + 1); jieqi = ['孟冬', '仲冬', '季冬'][wi]; jieqiDesc = ['立冬·水始冰', '冬至·蚯蚓结', '大寒·鸡始乳'][wi]; }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
    var h = '';
    h += '<div class="ps-bar-time">';
    h += '<span class="ps-bar-time-main">' + _esc(main) + '</span>';
    if (sub) h += '<span class="ps-bar-time-sub">' + _esc(sub) + '</span>';
    if (jieqi) {
      h += '<span class="ps-bar-time-jieqi" title="' + _esc(jieqiDesc) + '">' + _esc(jieqi) + '</span>';
    }
    h += '<span class="ps-bar-turn">第' + _esc(turn) + '回合</span>';
    h += '</div>';
    return h;
  }

  // 4) 状态：按 role 选 2-3 个字段（软依赖 pi.stats·缺席显示「—」）
  function _renderBarStats(pi, role) {
    var keys = ROLE_STATS[role] || ROLE_STATS.custom;
    var stats = (pi && pi.stats) || {};
    var h = '';
    h += '<div class="ps-bar-stats">';
    for (var i = 0; i < keys.length; i++) {
      var label = keys[i];
      var val = stats[label];
      if (val == null) val = '—';
      h += '<span class="ps-bar-stat"><em>' + _esc(label) + '</em><b>' + _esc(val) + '</b></span>';
    }
    h += '</div>';
    return h;
  }

  function renderTopBar() {
    if (!_isTrans()) return;
    var bar = _$('player-shell-topbar');
    if (!bar) return;
    var pi = _pi() || {};
    var role = _playerRole();
    var h = '';
    h += _renderBarIdentity(pi, role);
    h += _renderBarAffiliation(pi);
    h += _renderBarTime();
    h += _renderBarStats(pi, role);
    bar.innerHTML = h;
  }

  // ═══ 左栏 8 tab ═══════════════════════════════════════════
  function renderLeftTabs() {
    var rail = _$('player-left-tabs-shell');
    if (!rail) return;
    var h = '';
    for (var i = 0; i < SCENE_BLOCKS.length; i++) {
      var b = SCENE_BLOCKS[i];
      var active = (b.id === _currentTab) ? ' active' : '';
      var dot = _tabReddots[b.id] ? '<span class="ps-tab-reddot"></span>' : '';
      h += '<div class="ps-tab' + active + '" data-tab="' + _esc(b.id) + '" onclick="TM.PlayerShell.switchTab(\'' + b.id + '\')">';
      h += '<span class="ps-tab-icon">' + b.icon + '</span>';
      h += '<span class="ps-tab-label">' + _esc(b.label) + '</span>';
      h += dot;
      h += '</div>';
    }
    rail.innerHTML = h;
  }

  // ═══ 场景区：遍历 tab.systems 调 adapter ═══════════════════
  function renderScene(tabId) {
    var section = _$('player-scene-section');
    if (!section) return;
    if (!tabId) tabId = _currentTab;
    var block = null;
    for (var i = 0; i < SCENE_BLOCKS.length; i++) {
      if (SCENE_BLOCKS[i].id === tabId) { block = SCENE_BLOCKS[i]; break; }
    }
    if (!block) {
      section.innerHTML = '<div class="ps-scene-empty">未知场景：' + _esc(tabId) + '</div>';
      return;
    }
    var role = _playerRole();
    var adapter = (global.TM && global.TM.PlayerSystemsAdapter) ? global.TM.PlayerSystemsAdapter : null;
    var h = '';
    h += '<div class="ps-scene-title">' + _esc(block.label) + '</div>';
    if (adapter && typeof adapter.renderBlock === 'function') {
      // 主路径：逐系统调 adapter.renderBlock
      h += '<div class="ps-scene-blocks">';
      for (var j = 0; j < block.systems.length; j++) {
        var sysKey = block.systems[j];
        h += '<div class="ps-scene-block" data-system="' + _esc(sysKey) + '">';
        try {
          h += adapter.renderBlock(sysKey, role, block.label);
        } catch (e) {
          h += '<div class="ps-scene-err">场景块渲染失败：' + _esc(sysKey) + '</div>';
          try { console.error('[PlayerShell.renderScene]', sysKey, e); } catch (_) {}
        }
        h += '</div>';
      }
      h += '</div>';
    } else if (global.TM && global.TM.PlayerSystemsUI && typeof global.TM.PlayerSystemsUI.renderTab === 'function') {
      // 降级：adapter 不在时调 PlayerSystemsUI.renderTab
      try {
        h += '<div class="ps-scene-fallback">';
        h += global.TM.PlayerSystemsUI.renderTab(tabId, role);
        h += '</div>';
      } catch (e) {
        h += '<div class="ps-scene-err">场景渲染失败（降级路径）</div>';
        try { console.error('[PlayerShell.renderScene fallback]', tabId, e); } catch (_) {}
      }
    } else {
      h += '<div class="ps-scene-empty">场景渲染器缺席（adapter / PlayerSystemsUI 均不可用）</div>';
    }
    section.innerHTML = h;
  }

  // ═══ 右栏：软依赖 TM.PlayerRail ═══════════════════════════
  function renderRightRail() {
    var rail = _$('player-right-rail-shell');
    if (!rail) return;
    var PlayerRail = (global.TM && global.TM.PlayerRail) ? global.TM.PlayerRail : null;
    if (PlayerRail && typeof PlayerRail.render === 'function') {
      try {
        PlayerRail.render();
      } catch (e) {
        rail.innerHTML = '<div class="ps-rail-err">右栏渲染失败</div>';
        try { console.error('[PlayerShell.renderRightRail]', e); } catch (_) {}
      }
    } else {
      rail.innerHTML = '<div class="ps-rail-placeholder">右栏待接入</div>';
    }
  }

  // ═══ 主渲染：组装 DOM 骨架 + 调四区 ═══════════════════════
  function _ensureShell() {
    if (typeof document === 'undefined') return null;
    var root = _$('player-shell-container');
    if (!root) {
      root = document.createElement('div');
      root.id = 'player-shell-container';
      root.className = 'player-shell-container';
      var gc = _$('gc');
      (gc || document.body).appendChild(root);
    }
    if (!root.innerHTML) {
      var h = '';
      h += '<div id="player-shell-topbar" class="player-shell-topbar"></div>';
      h += '<div class="player-shell-body">';
      h += '<div id="player-left-tabs-shell" class="player-left-tabs-shell"></div>';
      h += '<div class="player-main-shell">';
      h += '<div id="player-map-section" class="player-map-section"></div>';
      h += '<div id="player-scene-section" class="player-scene-section"></div>';
      h += '</div>';
      h += '<div id="player-right-rail-shell" class="player-right-rail-shell"></div>';
      h += '</div>';
      root.innerHTML = h;
    }
    return root;
  }

  function _renderMap() {
    var map = _$('player-map-section');
    if (!map) return;
    var PlayerMap = (global.TM && global.TM.PlayerMap) ? global.TM.PlayerMap : null;
    if (PlayerMap && typeof PlayerMap.render === 'function') {
      try {
        PlayerMap.render();
      } catch (e) {
        map.innerHTML = '<div class="ps-map-err">地图渲染失败</div>';
        try { console.error('[PlayerShell._renderMap]', e); } catch (_) {}
      }
    } else {
      map.innerHTML = '<div class="ps-map-placeholder">地图待接入</div>';
    }
  }

  function render() {
    // 非 transmigration 模式早返回·绝不调皇帝御案渲染函数
    if (!_isTrans()) return;
    var root = _ensureShell();
    if (!root) return;
    _initialized = true;
    // 每个子区都包 try/catch·任一抛异常 → 显示错误占位·绝不降级到皇帝界面
    try { renderTopBar(); } catch (e) {
      var bar = _$('player-shell-topbar');
      if (bar) bar.innerHTML = '<div class="ps-bar-err">顶栏渲染失败</div>';
      try { console.error('[PlayerShell.render topbar]', e); } catch (_) {}
    }
    try { renderLeftTabs(); } catch (e) {
      var tabs = _$('player-left-tabs-shell');
      if (tabs) tabs.innerHTML = '<div class="ps-tabs-err">左栏渲染失败</div>';
      try { console.error('[PlayerShell.render leftTabs]', e); } catch (_) {}
    }
    try { _renderMap(); } catch (e) {
      var map = _$('player-map-section');
      if (map) map.innerHTML = '<div class="ps-map-err">地图渲染失败</div>';
      try { console.error('[PlayerShell.render map]', e); } catch (_) {}
    }
    try { renderScene(_currentTab); } catch (e) {
      var sec = _$('player-scene-section');
      if (sec) sec.innerHTML = '<div class="ps-scene-err">场景渲染失败</div>';
      try { console.error('[PlayerShell.render scene]', e); } catch (_) {}
    }
    try { renderRightRail(); } catch (e) {
      var r = _$('player-right-rail-shell');
      if (r) r.innerHTML = '<div class="ps-rail-err">右栏渲染失败</div>';
      try { console.error('[PlayerShell.render rail]', e); } catch (_) {}
    }
  }

  // ═══ tab 切换 ═════════════════════════════════════════════
  function switchTab(tabId) {
    _currentTab = tabId || 'home';
    _tabReddots[_currentTab] = false;  // 切到该 tab 即清红点
    try { renderLeftTabs(); } catch (e) { try { console.error('[PlayerShell.switchTab leftTabs]', e); } catch (_) {} }
    try { renderScene(_currentTab); } catch (e) { try { console.error('[PlayerShell.switchTab scene]', e); } catch (_) {} }
  }

  // ═══ 红点 ═════════════════════════════════════════════════
  function notify(tabId) {
    if (!tabId) return;
    _tabReddots[tabId] = true;
    try { renderLeftTabs(); } catch (_) {}
  }
  function notifyRail(slotIndex) {
    _railReddots[slotIndex] = true;
    var rail = (global.TM && global.TM.PlayerRail) ? global.TM.PlayerRail : null;
    if (rail && typeof rail.notifyRail === 'function') {
      try { rail.notifyRail(slotIndex); } catch (_) {}
    }
  }

  // ═══ 全量重渲染 ═══════════════════════════════════════════
  function refreshAll() {
    render();
  }

  // ═══ 按 scope 重渲染 ═════════════════════════════════════
  function retry(scope) {
    try {
      switch (scope) {
        case 'topbar': renderTopBar(); break;
        case 'tabs':   renderLeftTabs(); break;
        case 'scene':  renderScene(_currentTab); break;
        case 'rail':   renderRightRail(); break;
        case 'map':    _renderMap(); break;
        case 'all':
        default:       render(); break;
      }
    } catch (e) {
      try { console.error('[PlayerShell.retry]', scope, e); } catch (_) {}
    }
  }

  // ═══ 8 条不变量自检 ═══════════════════════════════════════
  // 失败时返回 report { ok, fixed: [] }·不抛异常
  function _assertInvariants() {
    var report = { ok: true, fixed: [] };
    try {
      var pi = _pi();
      // 1. transmigrationMode 必须为布尔（pi 存在时）
      if (pi && typeof pi.transmigrationMode !== 'boolean') {
        report.ok = false; report.fixed.push('transmigrationMode 非布尔');
      }
      // 2. playerRole 必须在合法枚举内（含 custom/emperor）
      var validRoles = ['minister', 'regent', 'general', 'prince', 'merchant', 'eunuch',
        'maid', 'commoner', 'bandit', 'monk', 'artisan', 'infant', 'retired_official',
        'actor', 'custom', 'emperor'];
      if (pi && pi.playerRole && validRoles.indexOf(pi.playerRole) < 0) {
        report.ok = false; report.fixed.push('playerRole 非法：' + pi.playerRole);
      }
      // 3. _currentTab 必须在 SCENE_BLOCKS 内
      var tabFound = false;
      for (var i = 0; i < SCENE_BLOCKS.length; i++) {
        if (SCENE_BLOCKS[i].id === _currentTab) { tabFound = true; break; }
      }
      if (!tabFound) { report.ok = false; report.fixed.push('_currentTab 不在 SCENE_BLOCKS：' + _currentTab); }
      // 4. SCENE_BLOCKS 必须 8 条
      if (SCENE_BLOCKS.length !== 8) {
        report.ok = false; report.fixed.push('SCENE_BLOCKS 非 8 条：' + SCENE_BLOCKS.length);
      }
      // 5. 每个 SCENE_BLOCK 必须含 id/label/icon/systems(非空数组)
      for (var k = 0; k < SCENE_BLOCKS.length; k++) {
        var b = SCENE_BLOCKS[k];
        if (!b.id || !b.label || !b.icon || !b.systems || !b.systems.length) {
          report.ok = false; report.fixed.push('SCENE_BLOCK[' + k + '] 字段不全');
          break;
        }
      }
      // 6. ROLE_STATS 必须含 14 + custom 共 15 行
      var roleKeys = Object.keys(ROLE_STATS);
      if (roleKeys.length < 15) {
        report.ok = false; report.fixed.push('ROLE_STATS 行数 < 15：' + roleKeys.length);
      }
      // 7. shell DOM 应已挂载（_initialized 后才检查）
      if (_initialized) {
        var root = _$('player-shell-container');
        if (!root) { report.ok = false; report.fixed.push('#player-shell-container 未挂载'); }
      }
      // 8. _tabReddots / _railReddots 必须为对象
      if (typeof _tabReddots !== 'object' || typeof _railReddots !== 'object') {
        report.ok = false; report.fixed.push('reddots 状态非对象');
      }
    } catch (e) {
      report.ok = false;
      report.fixed.push('自检异常：' + (e && e.message));
    }
    return report;
  }

  // ── 导出 ───────────────────────────────────────────────────
  global.TM.PlayerShell = {
    render: render,
    refreshAll: refreshAll,
    switchTab: switchTab,
    renderScene: renderScene,
    renderTopBar: renderTopBar,
    renderLeftTabs: renderLeftTabs,
    renderRightRail: renderRightRail,
    notify: notify,
    notifyRail: notifyRail,
    retry: retry,
    _assertInvariants: _assertInvariants,
    SCENE_BLOCKS: SCENE_BLOCKS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.TM.PlayerShell;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
