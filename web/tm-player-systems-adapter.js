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
    PlayerMemorial:    'renderMemorialPanel',
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

  /** PlayerInteraction 专用面板：人际列表 + 维度概要 + 互动动作菜单 + 结果区
   * 2026-07-22 修「交往界面无法实现与他人交往交互」：
   *   历史根因：本函数原只渲染只读人际名录（NPC 名号+头衔+派系+维度概要）·
   *     完全没有调用 TM.PlayerInteraction.interact 的按钮·
   *     导致"关系模式下的交往界面无法实现与他人交往交互"。
   *   修复：每个 NPC 行加「行动 ▾」按钮 + 折叠动作菜单（10 种互动类型·
   *     每种显示 label + 精力/时间 hint） + 结果区（场景描述 + 关系变化 +
   *     精力/时间消耗 + 事件钩子提示）。
   *     按钮走 data-npc / data-kind 属性 + 内联 onclick 调 adapter 暴露的
   *     _toggleInteractionMenu / _doInteraction（避免 NPC 名含引号时的转义问题）。
   */
  function _renderInteractionPanel(sys) {
    if (typeof sys.listInteractableNpcs !== 'function') return null;
    var npcs = [];
    try { npcs = sys.listInteractableNpcs() || []; } catch (_) { npcs = []; }
    // 取动作菜单（getActionMenu 与 NPC 无关·只需取一次）
    var menu = [];
    try { menu = (typeof sys.getActionMenu === 'function') ? (sys.getActionMenu() || []) : []; } catch (_) { menu = []; }

    var h = '';
    h += '<div class="pi-panel">';
    h += '<div class="pi-section"><div class="pi-section-title">人 际 · 概 览</div>';
    h += '<div class="pi-row"><span>可互动者</span><span class="pi-val">' + npcs.length + ' 人</span></div>';
    if (menu.length) {
      h += '<div class="pi-row"><span>可行动作</span><span class="pi-val">' + menu.length + ' 种</span></div>';
    }
    h += '</div>';
    if (!npcs.length) {
      h += '<div class="pi-empty">暂无可互动人物（剧本中无可接触 NPC·或尚未进入游戏回合）</div>';
      h += '</div>';
      return h;
    }
    h += '<div class="pi-section"><div class="pi-section-title">人 际 名 录</div>';
    h += '<div class="pi-hint">点「行动 ▾」展开 10 种互动·选定动作后即与该 NPC 行事</div>';
    for (var i = 0; i < npcs.length && i < 20; i++) {
      var n = npcs[i] || {};
      var dims = n.dims || {};
      // 5 维概要（master/friend/rival/colleague/enemy）·0 不显示
      var dimChips = '';
      var dimLabels = { master: '师徒', friend: '亲友', rival: '政敌', colleague: '同僚', enemy: '仇雠' };
      Object.keys(dimLabels).forEach(function (k) {
        var v = dims[k];
        if (typeof v === 'number' && v !== 0) {
          dimChips += '<span class="pi-dim pi-dim-' + k + '">' + dimLabels[k] + ' ' + v + '</span>';
        }
      });
      if (!dimChips) dimChips = '<span class="pi-dim pi-dim-none">无交情</span>';
      var npcName = n.name || ('NPC' + i);
      // data-npc 同时挂在 NPC 行、行动按钮、菜单、结果区上·供 _doInteraction/_toggleInteractionMenu 定位
      h += '<div class="pi-npc" data-npc="' + _esc(npcName) + '">';
      h += '<div class="pi-npc-head">';
      h += '<span class="pi-npc-name">' + _esc(npcName) + '</span>';
      if (n.title) h += '<span class="pi-npc-title">' + _esc(n.title) + '</span>';
      if (n.faction) h += '<span class="pi-npc-faction">' + _esc(n.faction) + '</span>';
      if (n.military) h += '<span class="pi-npc-mil">武</span>';
      h += '<button class="pi-npc-action-btn" data-npc="' + _esc(npcName) + '" ' +
           'onclick="TM.PlayerSystemsAdapter._toggleInteractionMenu(this)">行动 ▾</button>';
      h += '</div>';
      h += '<div class="pi-npc-dims">' + dimChips + '</div>';
      // 折叠动作菜单（默认隐藏）
      if (menu.length) {
        h += '<div class="pi-npc-menu" data-npc="' + _esc(npcName) + '" hidden>';
        h += '<div class="pi-menu-grid">';
        for (var m = 0; m < menu.length; m++) {
          var it = menu[m] || {};
          h += '<button class="pi-menu-btn" data-npc="' + _esc(npcName) + '" data-kind="' + _esc(it.kind || '') + '" ' +
               'onclick="TM.PlayerSystemsAdapter._doInteraction(this)">';
          h += '<span class="pi-menu-btn-label">' + _esc(it.label || it.kind) + '</span>';
          h += '<span class="pi-menu-btn-meta">精' + _esc(it.energy) + ' · ' + _esc(it.time) + '时 · ' + _esc(it.dimLabel) + '</span>';
          if (it.hint) h += '<span class="pi-menu-btn-hint">' + _esc(it.hint) + '</span>';
          h += '</button>';
        }
        h += '</div>';
        h += '</div>';
      }
      // 结果区（默认空·interact 后填充）
      h += '<div class="pi-result" data-npc="' + _esc(npcName) + '" hidden></div>';
      h += '</div>';
    }
    if (npcs.length > 20) {
      h += '<div class="pi-more">… 共 ' + npcs.length + ' 人（仅显示前 20）</div>';
    }
    h += '</div>';
    h += '</div>';
    return h;
  }

  // ── PlayerInteraction 交互处理（2026-07-22 新增）──────────────
  // 通过 data-npc 属性查找元素·避免 CSS 选择器对中文/特殊字符的转义问题
  function _findElByDataNpc(container, selector, npcName) {
    try {
      var els = container.querySelectorAll(selector);
      for (var i = 0; i < els.length; i++) {
        if (els[i].getAttribute('data-npc') === npcName) return els[i];
      }
    } catch (_) {}
    return null;
  }

  /** 展开/收起指定 NPC 的动作菜单 */
  function _toggleInteractionMenu(btn) {
    try {
      if (!btn) return;
      var npc = btn.getAttribute('data-npc');
      if (!npc) return;
      var doc = global.document;
      if (!doc) return;
      // 在最近的 .pi-panel 容器中查找·避免误中其他面板
      var panel = btn.closest ? btn.closest('.pi-panel') : null;
      var container = panel || doc;
      var menu = _findElByDataNpc(container, '.pi-npc-menu', npc);
      if (!menu) return;
      var isHidden = menu.hasAttribute('hidden');
      if (isHidden) {
        menu.removeAttribute('hidden');
        btn.textContent = '行动 ▴';
        btn.classList.add('open');
      } else {
        menu.setAttribute('hidden', '');
        btn.textContent = '行动 ▾';
        btn.classList.remove('open');
      }
    } catch (e) {
      try { console.warn('[PlayerSystemsAdapter._toggleInteractionMenu]', e); } catch (_) {}
    }
  }

  /** 维度 key → 中文标签（从 TM.PlayerInteraction.DIMS 取·缺席兜底） */
  function _dimLabel(k) {
    var labels = { master: '师徒', friend: '亲友', rival: '政敌', colleague: '同僚', enemy: '仇雠' };
    try {
      if (global.TM && global.TM.PlayerInteraction && global.TM.PlayerInteraction.DIMS &&
          global.TM.PlayerInteraction.DIMS[k] && global.TM.PlayerInteraction.DIMS[k].label) {
        return global.TM.PlayerInteraction.DIMS[k].label;
      }
    } catch (_) {}
    return labels[k] || k;
  }

  /** 执行互动·把结果写入该 NPC 的结果区·成功后刷新维度 chip */
  function _doInteraction(btn) {
    try {
      if (!btn) return;
      var npc = btn.getAttribute('data-npc');
      var kind = btn.getAttribute('data-kind');
      if (!npc || !kind) return;
      var doc = global.document;
      if (!doc) return;
      var panel = btn.closest ? btn.closest('.pi-panel') : null;
      var container = panel || doc;

      var sys = (global.TM && global.TM.PlayerInteraction) ? global.TM.PlayerInteraction : null;
      if (!sys || typeof sys.interact !== 'function') {
        _renderInteractionResult(container, npc, { ok: false, reason: '交往系统未就绪' });
        return;
      }

      // 调用引擎层 interact
      var res;
      try { res = sys.interact(npc, kind, {}); }
      catch (e) { res = { ok: false, reason: '调用异常: ' + (e && e.message ? e.message : String(e)) }; }

      // 渲染结果
      _renderInteractionResult(container, npc, res);

      // 成功后刷新该 NPC 行的维度 chip
      if (res && res.ok && typeof sys.getRelationDims === 'function') {
        try { _refreshNpcDims(container, npc, sys.getRelationDims(npc)); } catch (_) {}
      }
    } catch (e) {
      try { console.warn('[PlayerSystemsAdapter._doInteraction]', e); } catch (_) {}
    }
  }

  /** 把 interact 结果渲染进该 NPC 的结果区 */
  function _renderInteractionResult(container, npc, res) {
    var box = _findElByDataNpc(container, '.pi-result', npc);
    if (!box) return;
    if (!res || !res.ok) {
      box.innerHTML = '<div class="pi-result-err">✗ ' + _esc((res && res.reason) || '未知错误') + '</div>';
      box.removeAttribute('hidden');
      return;
    }
    var h = '<div class="pi-result-ok">';
    h += '<div class="pi-result-head">✓ ' + _esc(res.label || res.kind) + ' · ' + _esc(res.npc || npc) + '</div>';
    if (res.scene) h += '<div class="pi-result-scene">' + _esc(res.scene) + '</div>';
    h += '<div class="pi-result-stats">';
    if (res.energy && typeof res.energy.cost === 'number') h += '<span>精力 −' + res.energy.cost + '</span>';
    if (res.time) {
      h += '<span>耗时 ' + _esc(res.time.hours) + ' 时';
      if (res.time.turnAdvanced) h += ' · 时局推进至第 ' + _esc(res.time.turn) + ' 回合';
      h += '</span>';
    }
    h += '</div>';
    if (res.relation && res.relation.dims) {
      h += '<div class="pi-result-dims">';
      Object.keys(res.relation.dims).forEach(function (k) {
        var v = res.relation.dims[k];
        if (typeof v === 'number') {
          h += '<span class="pi-dim pi-dim-' + k + '">' + _dimLabel(k) + ' ' + v + '</span>';
        }
      });
      h += '</div>';
    }
    if (res.eventHooks && res.eventHooks.length) {
      h += '<div class="pi-result-hooks">';
      for (var i = 0; i < res.eventHooks.length; i++) {
        var hk = res.eventHooks[i] || {};
        h += '<div class="pi-result-hook pi-result-hook-' + _esc(hk.severity || 'info') + '">' + _esc(hk.message || '') + '</div>';
      }
      h += '</div>';
    }
    if (res.marriage) {
      h += '<div class="pi-result-hook pi-result-hook-info">姻亲已立：' + _esc(res.marriage.player) + ' ⇆ ' + _esc(res.marriage.npc) + '</div>';
    }
    h += '</div>';
    box.innerHTML = h;
    box.removeAttribute('hidden');
  }

  /** 成功互动后刷新该 NPC 行的维度 chip */
  function _refreshNpcDims(container, npc, dims) {
    if (!dims) return;
    var dimBox = _findElByDataNpc(container, '.pi-npc-dims', npc);
    if (!dimBox) return;
    var labels = { master: '师徒', friend: '亲友', rival: '政敌', colleague: '同僚', enemy: '仇雠' };
    var h = '';
    Object.keys(labels).forEach(function (k) {
      var item = dims[k];
      var v = (item && typeof item.value === 'number') ? item.value : 0;
      if (v !== 0) h += '<span class="pi-dim pi-dim-' + k + '">' + labels[k] + ' ' + v + '</span>';
    });
    if (!h) h = '<span class="pi-dim pi-dim-none">无交情</span>';
    dimBox.innerHTML = h;
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
    _wrapBlock: _wrapBlock,
    // 2026-07-22 新增：PlayerInteraction 交往界面交互入口（供内联 onclick 调用）
    _doInteraction: _doInteraction,
    _toggleInteractionMenu: _toggleInteractionMenu,
    _renderInteractionResult: _renderInteractionResult,
    _refreshNpcDims: _refreshNpcDims
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.PlayerSystemsAdapter;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : this)));
