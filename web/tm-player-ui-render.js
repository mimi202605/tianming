// ============================================================
// tm-player-ui-render.js — 穿越模式 Phase A · Task A3 主渲染
// ------------------------------------------------------------
// 暴露：window.TM.PlayerUI.{
//   renderTopBar, renderLeftTabs, render, renderRightPanel,
//   setAiLiveStatus, _varsForRole, _currentScene
// }
// 依赖（软依赖·缺席降级）：
//   TM.Transmigration.isTransmigrationMode / P.playerInfo / GM._playerEconomy 等
//   TM.PlayerSystemsUI.renderTab / TM.PlayerSystemsUI.scenesForRole（A4 提供）
// 双路径挂载：浏览器 window.TM.PlayerUI；node smoke module.exports
// 跨朝代铁律：本文件绝不硬编明清专名·术语一律朝代中立
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerUI) return;  // 防重入

  var _currentScene = 'home';
  var _aiLiveState = 'idle';

  function _isStr(v) { return typeof v === 'string' && v.length > 0; }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _icon(name, size) {
    if (typeof tmIcon === 'function') { try { return tmIcon(name, size || 12); } catch (_) {} }
    return '';
  }
  function _$(id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  }
  function _pi() {
    try { return (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null; } catch(_) { return null; }
  }
  function _isTrans() {
    var pi = _pi();
    return !!(pi && pi.transmigrationMode === true && pi.playerRole && pi.playerRole !== 'emperor');
  }
  function _playerRole() {
    var pi = _pi();
    return pi ? (pi.playerRole || 'commoner') : 'commoner';
  }

  // §2.2 精选变量映射表（按 playerRole）
  var _VARS_FOR_ROLE = {
    minister:        [['官声','reputation'],['俸禄','cash'],['吏治','governance'],['势力','faction']],
    general:         [['官声','reputation'],['俸禄','cash'],['军权','military'],['势力','faction']],
    regent:          [['官声','reputation'],['权柄','power'],['吏治','governance'],['势力','faction']],
    prince:          [['封邑','fiefdom'],['宗禄','stipend'],['宗籍','royalStatus'],['皇恩','sovereignTrust']],
    custom:          [['宠爱','favor'],['宫权','haremPower'],['子嗣','heirs'],['风险','haremRisk']],
    merchant:        [['家资','cash'],['商誉','reputation'],['商路','tradeRoutes'],['风险','tradeRisk']],
    eunuch:          [['君主信任','sovereignTrust'],['内廷权力','innerPower'],['外朝张力','outerTension'],['阉党声势','factionPower']],
    maid:            [['主位宠爱','favor'],['宫女品级','rank'],['消息流通','gossip'],['宫斗风险','haremRisk']],
    commoner:        [['家资','cash'],['名声','fame'],['关系网','connections'],['风险','risk']],
    bandit:          [['山寨大小','stronghold'],['喽啰数','followers'],['声威','prestige'],['围剿压力','siegePressure']],
    monk:            [['戒行','discipline'],['信众','followers'],['寺产','templeAsset'],['风险','risk']],
    artisan:         [['技艺','skill'],['名声','fame'],['银钱','cash'],['风险','risk']],
    infant:          [['健康','health'],['早慧度','prodigy'],['监护人','guardian'],['家族期待','familyExpectation']],
    retired_official:[['余威','residualPower'],['名声','fame'],['银钱','cash'],['起复概率','comebackChance']],
    actor:           [['技艺','skill'],['名声','fame'],['恩客','patrons'],['风险','risk']]
  };

  function _varsForRole(role) {
    var list = _VARS_FOR_ROLE[role] || _VARS_FOR_ROLE.commoner;
    return list.map(function (entry) {
      var label = entry[0], key = entry[1];
      var value = _resolveVarValue(role, key);
      return { key: key, label: label, value: value, icon: _icon('dot', 8) };
    });
  }

  // 从玩家专属账本解析变量值·绝不读 GM.guoku/GM.huangwei 等皇帝模式字段
  function _resolveVarValue(role, key) {
    try {
      if (typeof GM === 'undefined' || !GM) return '—';
      // 银钱·统一走 PlayerEconomy.cash
      if (key === 'cash') {
        if (GM._playerEconomy && typeof GM._playerEconomy.cash === 'number') return GM._playerEconomy.cash + ' 两';
      }
      // 私军训练度
      if (key === 'military' || key === 'followers' && role === 'general') {
        if (GM._playerPrivateArmy && typeof GM._playerPrivateArmy.readiness === 'number') return GM._playerPrivateArmy.readiness;
      }
      // 反叛筹备度
      if (key === 'prestige' && role === 'bandit') {
        if (GM._playerRebel && typeof GM._playerRebel.prepProgress === 'number') return GM._playerRebel.prepProgress;
      }
      // 派系/势力
      if (key === 'faction' || key === 'factionPower') {
        if (GM._playerInteraction && GM._playerInteraction.factionPower != null) return GM._playerInteraction.factionPower;
      }
      // 通用回退
      return '—';
    } catch (_) { return '—'; }
  }

  // ── §2.1 顶栏玩家身份条 ─────────────────────────────────────
  // 优先委托 TM.PlayerShell.renderTopBar（Phase 5.1 重建·四段式顶栏·写 #player-shell-topbar）
  // PlayerShell 缺席/抛异常时降级到本文件原有 bar-player-identity 渲染
  // 铁律：PlayerShell 成功后绝不继续写旧 #bar-player-identity（用户会看到两个顶栏重叠·真事故 2026-07-21）
  function renderTopBar() {
    if (!_isTrans()) return;
    if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.renderTopBar === 'function') {
      try { global.TM.PlayerShell.renderTopBar(); return; }
      catch (_) {}
    }
    var bar = _$('bar-player-identity');
    if (!bar) return;
    bar.style.display = '';
    var pi = _pi() || {};
    var portrait = _$('player-portrait');
    var name = _$('player-name');
    var chip = _$('player-role-chip');
    var loc = _$('player-location');
    var clan = _$('player-clan');
    var age = _$('player-age');
    var sov = _$('player-sovereign');
    if (portrait) portrait.innerHTML = _icon('person', 16);
    if (name) name.textContent = pi.characterName || '玩家';
    if (chip) chip.textContent = pi.characterTitle || pi.playerRole || '';
    if (loc) loc.textContent = pi.location || '';
    if (clan) clan.textContent = pi.clan || '';
    if (age) age.textContent = (typeof pi.age === 'number') ? ('年 ' + pi.age) : '';
    if (sov) sov.textContent = '君主·' + (pi.sovereignName || '某');

    // bar-vars 精选 3-4 变量
    _renderTopBarVars();
  }

  function _renderTopBarVars() {
    var barVars = _$('bar-vars');
    if (!barVars) return;
    var role = _playerRole();
    var vars = _varsForRole(role);
    var html = '';
    vars.forEach(function (v) {
      html += '<span class="bar-var-item" data-key="' + _esc(v.key) + '">' +
              '<span class="bar-var-label">' + _esc(v.label) + '</span>' +
              '<span class="bar-var-value">' + _esc(String(v.value)) + '</span>' +
              '</span>';
    });
    barVars.innerHTML = html;
  }

  // ── §3 左栏 8 场景 tab 树 ───────────────────────────────────
  // 优先委托 TM.PlayerShell.renderLeftTabs（Phase 5.1 重建·8 tab 含 tech·写 #player-left-tabs-shell）
  // PlayerShell 缺席/抛异常时降级到本文件原有 7 tab 渲染（写 #player-left-tabs）
  // 铁律：PlayerShell 成功后绝不继续写旧 #player-left-tabs（用户会看到两套 tab 重叠·真事故 2026-07-21）
  function renderLeftTabs() {
    if (!_isTrans()) return;
    if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.renderLeftTabs === 'function') {
      try { global.TM.PlayerShell.renderLeftTabs(); return; }
      catch (_) {}
    }
    var container = _$('player-left-tabs');
    if (!container) return;
    container.classList.remove('hidden-emperor');
    var gl = _$('gl');
    if (gl) gl.classList.add('hidden-emperor');

    var role = _playerRole();
    var scenes = (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.scenesForRole)
      ? TM.PlayerSystemsUI.scenesForRole(role)
      : ['home','office','social','cultivation','tech','force','special','evolution'];

    var SCENE_DEFS = {
      home:         { icon: '🏠', label: '私宅' },
      office:       { icon: '📜', label: '公务' },
      social:       { icon: '🤝', label: '交际' },
      cultivation:  { icon: '📚', label: '修行' },
      tech:         { icon: '🔬', label: '格物' },
      force:        { icon: '⚔️', label: '势力' },
      special:      { icon: '🎭', label: '特殊' },
      evolution:    { icon: '👤', label: '身份演进' }
    };

    var html = '';
    scenes.forEach(function (sc) {
      var def = SCENE_DEFS[sc] || { icon: '·', label: sc };
      var hasUpdate = (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.hasUpdate)
        ? TM.PlayerSystemsUI.hasUpdate(sc) : false;
      var cls = 'player-tab' + (sc === _currentScene ? ' active' : '');
      html += '<div class="' + cls + '" data-scene="' + sc + '">' +
              '<span class="player-tab-icon">' + def.icon + '</span>' +
              '<span class="player-tab-label">' + _esc(def.label) + '</span>' +
              (hasUpdate ? '<span class="player-tab-redot"></span>' : '') +
              '</div>';
    });
    container.innerHTML = html;

    // 绑定点击
    try {
      container.querySelectorAll('.player-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var sc = tab.getAttribute('data-scene');
          _currentScene = sc;
          renderLeftTabs();
          render(sc);
        });
      });
    } catch (_) {}
  }

  // ── §4 主面板按场景渲染 ─────────────────────────────────────
  // 优先委托 TM.PlayerShell.render（Phase 5.1 重建·含地图+场景+右栏）
  // PlayerShell 缺席/抛异常时降级到本文件原有 gc 渲染
  // 铁律：PlayerShell 渲染成功后 #player-shell-container 在 #gc 内·
  //       绝不能再 gc.innerHTML=html（会抹掉整个 8-tab shell·真事故 2026-07-21）
  function render(sceneKey) {
    if (!_isTrans()) return;
    if (sceneKey) _currentScene = sceneKey;
    // 主路径：PlayerShell 全量渲染（顶栏+左栏+地图+场景+右栏）
    var shellRendered = false;
    if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.render === 'function') {
      try { global.TM.PlayerShell.render(); shellRendered = true; }
      catch (e) {
        try { console.error('[PlayerUI.render] PlayerShell.render failed, fallback to gc', e); } catch (_) {}
      }
    }
    // 兼容路径：仅在 PlayerShell 缺席/失败时降级到 #gc 渲染
    // （成功时 #player-shell-container 已在 #gc 内·renderScene 已写场景块到 #player-scene-section）
    if (!shellRendered) {
      var gc = _$('gc');
      if (!gc) {
        // gc 也没有·只跑 hook 后返回
        if (typeof GameHooks !== 'undefined' && GameHooks.run) {
          try { GameHooks.run('renderPlayerState:after', { sceneKey: _currentScene }); } catch (_) {}
        }
        return;
      }
      var role = _playerRole();
      var html = '';
      if (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.renderTab) {
        try {
          html = TM.PlayerSystemsUI.renderTab(_currentScene, role);
        } catch (e) {
          html = '<div class="player-render-error">场景渲染异常：' + _esc(String(e)) + '</div>';
        }
      } else {
        html = '<div class="player-render-fallback">场景 ' + _esc(_currentScene) + ' 待加载</div>';
      }
      gc.innerHTML = html;
      if (global.TM.PlayerSystemsUI && TM.PlayerSystemsUI.bindEvents) {
        try { TM.PlayerSystemsUI.bindEvents(_currentScene); } catch (_) {}
      }
    }
    if (typeof GameHooks !== 'undefined' && GameHooks.run) {
      try { GameHooks.run('renderPlayerState:after', { sceneKey: _currentScene }); } catch (_) {}
    }
  }

  // ── §5 右栏玩家身份卡 ──────────────────────────────────────
  // 优先委托 TM.PlayerShell.renderRightRail（Phase 5.1 重建·3×3 图标栅格 + drawer·写 #player-right-rail-shell）
  // PlayerShell 缺席/抛异常时降级到本文件原有 player-right-panel 渲染
  // 铁律：PlayerShell 成功后绝不继续写旧 #player-right-panel（用户会看到两套右栏重叠·真事故 2026-07-21）
  function renderRightPanel() {
    if (!_isTrans()) return;
    if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.renderRightRail === 'function') {
      try { global.TM.PlayerShell.renderRightRail(); return; }
      catch (_) {}
    }
    var panel = _$('player-right-panel');
    if (!panel) return;
    panel.classList.remove('hidden-emperor');
    var gr = _$('gr');
    if (gr) gr.classList.add('hidden-emperor');

    var pi = _pi() || {};
    var html = '<div class="player-id-card">';
    html += '<div class="player-id-portrait">' + _icon('person', 32) + '</div>';
    html += '<div class="player-id-info">';
    html += '<div class="player-id-name">' + _esc(pi.characterName || '玩家') + '</div>';
    html += '<div class="player-id-title">' + _esc(pi.characterTitle || pi.playerRole || '') + '</div>';
    html += '<div class="player-id-meta">' + _esc([pi.age != null ? ('年 ' + pi.age) : '', pi.gender, pi.clan].filter(Boolean).join(' · ')) + '</div>';
    if (pi.location) html += '<div class="player-id-loc">现居：' + _esc(pi.location) + '</div>';
    if (pi.sovereignName) html += '<div class="player-id-sov">君主：' + _esc(pi.sovereignName) + '</div>';
    html += '</div></div>';

    // 近况·从 GM.qijuHistory 按 source=player/sovereign-ai 过滤·取最近 5 条
    var recent = [];
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.qijuHistory)) {
        recent = GM.qijuHistory.filter(function (e) { return e && (e.source === 'player' || e.source === 'sovereign-ai'); }).slice(-5).reverse();
      }
    } catch (_) {}
    var recentHtml = recent.length ? recent.map(function (e) {
      return '<div class="player-recent-item">' + _esc((e.ts > 0 ? new Date(e.ts).toLocaleDateString() + '·' : '') + (e.title || e.text || '')) + '</div>';
    }).join('') : '<div class="player-recent-empty">暂无近况</div>';
    html += '<div class="player-id-recent"><div class="player-id-section-title">近况</div>' + recentHtml + '</div>';

    // 关系 TOP 5·从 GM._playerInteraction.relations 取
    var relations = [];
    try {
      if (typeof GM !== 'undefined' && GM && GM._playerInteraction && Array.isArray(GM._playerInteraction.relations)) {
        relations = GM._playerInteraction.relations.slice().sort(function (a, b) {
          return (b.score || 0) - (a.score || 0);
        }).slice(0, 5);
      }
    } catch (_) {}
    var relHtml = relations.length ? relations.map(function (r) {
      return '<div class="player-rel-item">' +
             '<span class="player-rel-name">' + _esc(r.name || '') + '</span>' +
             '<span class="player-rel-kind">' + _esc(r.kind || '') + '</span>' +
             '<span class="player-rel-score">' + _esc(String(r.score != null ? r.score : '')) + '</span>' +
             '</div>';
    }).join('') : '<div class="player-rel-empty">暂无关系</div>';
    html += '<div class="player-id-relations"><div class="player-id-section-title">人际关系 TOP 5</div>' + relHtml + '</div>';

    panel.innerHTML = html;
  }

  // ── §2.3 bar-ai-live 语义切换 ───────────────────────────────
  function setAiLiveStatus(state) {
    _aiLiveState = state || 'idle';
    var el = _$('bar-ai-live');
    if (!el) return;
    var text = 'AI 推演中';
    if (_isTrans()) {
      if (state === 'sovereign') text = '君主圣裁中';
      else if (state === 'npc') text = '市井演化中';
    }
    el.textContent = text;
    el.setAttribute('data-state', _aiLiveState);
  }

  var PlayerUI = {
    renderTopBar: renderTopBar,
    renderLeftTabs: renderLeftTabs,
    render: render,
    renderRightPanel: renderRightPanel,
    setAiLiveStatus: setAiLiveStatus,
    _varsForRole: _varsForRole,
    get _currentScene() { return _currentScene; }
  };

  global.TM.PlayerUI = PlayerUI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerUI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
