// ============================================================
// tm-player-systems-ui.js — 穿越模式 Phase A · Task A4 14 系统御案 tab
// ------------------------------------------------------------
// 暴露：window.TM.PlayerSystemsUI.{
//   scenesForRole, renderTab, renderBlock, bindEvents, hasUpdate,
//   SCENES, ROLE_SCENES
// }
// 依赖（软依赖）：TM.PlayerXxx.* 系列 14 系统 + P.playerInfo
// 跨朝代铁律：本文件绝不硬编明清专名·术语一律朝代中立
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerSystemsUI) return;

  var SCENES = ['home','office','social','cultivation','tech','force','special','evolution'];

  // §3.2 角色可见性矩阵
  // ✓ = 1, — = 0
  // tech（格物）tab：所有非 emperor 角色可见（maid/infant 由门控灰显）
  var ROLE_SCENES = {
    emperor:           [],
    regent:            ['home','office','social','cultivation','tech','force','evolution'],
    minister:          ['home','office','social','cultivation','tech','evolution'],
    general:           ['home','office','social','cultivation','tech','force','evolution'],
    prince:            ['home','office','social','cultivation','tech','force','evolution'],
    custom:            ['home','social','cultivation','tech','evolution'],
    merchant:          ['home','social','cultivation','tech','force','evolution'],
    eunuch:            ['home','office','social','cultivation','tech','special','evolution'],
    maid:              ['social','cultivation','tech','special','evolution'],
    commoner:          ['home','social','cultivation','tech','force','evolution'],
    bandit:            ['home','social','cultivation','tech','force','special','evolution'],
    monk:              ['home','social','cultivation','tech','special','evolution'],
    artisan:           ['home','social','cultivation','tech','force','special','evolution'],
    infant:            ['home','tech','special','evolution'],
    retired_official:  ['home','office','social','cultivation','tech','special','evolution'],
    actor:             ['home','social','cultivation','tech','special','evolution']
  };

  function scenesForRole(role) {
    return (ROLE_SCENES[role] || ROLE_SCENES.commoner).slice();
  }

  // ── 14 系统接入映射 ────────────────────────────────────────
  var SCENE_BLOCKS = {
    home: [
      { systemKey: 'PlayerFamily',        blockTitle: '家族' },
      { systemKey: 'PlayerMarriage',      blockTitle: '婚姻' },
      { systemKey: 'PlayerEconomy',       blockTitle: '私产' },
      { systemKey: 'PlayerIndustry',      blockTitle: '产业' }
    ],
    office: [
      { systemKey: 'PlayerMemorial',      blockTitle: '上奏' },
      { systemKey: 'PlayerCourtDebate',   blockTitle: '朝议列朝' },
      { systemKey: 'PlayerTingTui',       blockTitle: '廷推' },
      { systemKey: 'PlayerOffice',        blockTitle: '官职' },
      { systemKey: 'PlayerKeju',          blockTitle: '科举' },
      { systemKey: 'PlayerAnnualReview',  blockTitle: '考课' }
    ],
    social: [
      { systemKey: 'PlayerInteraction',   blockTitle: '人物互动' },
      { systemKey: 'PlayerLetter',        blockTitle: '书信' },
      { systemKey: 'PlayerMarriage',      blockTitle: '联姻', alt: true }
    ],
    cultivation: [
      { systemKey: 'PlayerTech',          blockTitle: '科技研发' },
      { systemKey: 'PlayerSkill',         blockTitle: '修习' },
      { systemKey: 'PlayerSkill',         blockTitle: '游学', alt: true }
    ],
    tech: [
      { systemKey: 'PlayerTech',          blockTitle: '格物' },
      { systemKey: 'PlayerTech',          blockTitle: '研发日志', alt: true }
    ],
    force: [
      { systemKey: 'PlayerPrivateArmy',   blockTitle: '私军' },
      { systemKey: 'PlayerTrade',         blockTitle: '商队' },
      { systemKey: 'PlayerMovement',      blockTitle: '移动' },
      { systemKey: 'PlayerReclaim',       blockTitle: '开垦' },
      { systemKey: 'PlayerRebel',         blockTitle: '反叛筹备' }
    ],
    special: [
      { systemKey: 'PlayerSpecialIdentity', blockTitle: '身份专有动作' }
    ],
    evolution: [
      { systemKey: 'PlayerRoleChange',   blockTitle: '身份演进路径' }
    ]
  };

  // 软依赖·按 systemKey 取系统命名空间·缺席时返回 null
  function _sys(systemKey) {
    try { return global.TM && global.TM[systemKey] ? global.TM[systemKey] : null; } catch(_) { return null; }
  }

  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── 解析真实玩家角色状态（身份演进路径门控用） ─────────────
  // 优先级：GM.chars 中 isPlayer 角色 > P.playerInfo 缓存 > {} 兜底
  function _resolvePlayerChar() {
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        for (var i = 0; i < GM.chars.length; i++) {
          if (GM.chars[i] && GM.chars[i].isPlayer) return GM.chars[i];
        }
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) return P.playerInfo;
    } catch (_) {}
    return {};
  }

  // ── 身份演进路径面板（evolution 场景专用） ─────────────────
  function renderRoleChangePaths(role) {
    var paths = (global.TM && global.TM.Transmigration && global.TM.Transmigration.getRoleChangePaths)
      ? global.TM.Transmigration.getRoleChangePaths(role) : [];
    var ch = _resolvePlayerChar();
    var html = '<div class="player-evolution">';
    html += '<div class="player-evolution-current">当前身份：' + _esc(role) + '</div>';
    if (!paths.length) {
      html += '<div class="player-evolution-empty">无可行走变更路径</div>';
      html += '</div>';
      return html;
    }
    html += '<div class="player-evolution-paths">';
    paths.forEach(function (p) {
      var condOk = !p.condition || (typeof p.condition === 'function' && p.condition(ch));
      html += '<div class="player-evolution-path' + (condOk ? '' : ' locked') + '" data-kind="' + _esc(p.kind) + '">';
      html += '<div class="player-evolution-path-head">';
      html += '<span class="player-evolution-path-label">' + _esc(p.label) + '</span>';
      html += '<span class="player-evolution-path-arrow">→</span>';
      html += '<span class="player-evolution-path-next">' + _esc(p.nextRole) + '</span>';
      html += '</div>';
      html += '<div class="player-evolution-path-desc">' + _esc(p.desc) + '</div>';
      html += '<button type="button" class="player-evolution-path-btn" data-kind="' + _esc(p.kind) + '" data-system="Transmigration" data-action="triggerRoleChange" ' + (condOk ? '' : 'disabled') + '>触发</button>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  // ── 单区块渲染 ─────────────────────────────────────────────
  // 优先委托 TM.PlayerSystemsAdapter.renderBlock（Phase 5.1 重建·15 systemKey 适配表）
  // adapter 缺席时降级到本文件原有逻辑（sys.renderBlockHTML / state / list）
  // 绝不返回「无可用渲染入口」——adapter 总有 fallback
  function renderBlock(blockDef, role) {
    var adapter = (global.TM && global.TM.PlayerSystemsAdapter && typeof global.TM.PlayerSystemsAdapter.renderBlock === 'function')
      ? global.TM.PlayerSystemsAdapter : null;
    if (adapter) {
      try {
        return adapter.renderBlock(blockDef.systemKey, role, blockDef.blockTitle);
      } catch (e) {
        // adapter 抛异常 → 走本文件降级路径
      }
    }
    var sys = _sys(blockDef.systemKey);
    var html = '<div class="player-block" data-system="' + _esc(blockDef.systemKey) + '">';
    html += '<div class="player-block-title">' + _esc(blockDef.blockTitle) + '</div>';
    if (!sys) {
      html += '<div class="player-block-empty">（' + _esc(blockDef.systemKey) + ' 待接入）</div>';
      html += '</div>';
      return html;
    }
    // 优先调系统自己的 renderBlockHTML·否则调 state()/list() 兜底
    try {
      if (typeof sys.renderBlockHTML === 'function') {
        html += sys.renderBlockHTML(role);
      } else if (typeof sys.state === 'function') {
        var st = sys.state() || {};
        html += '<pre class="player-block-state">' + _esc(JSON.stringify(st, null, 2)) + '</pre>';
      } else if (typeof sys.list === 'function') {
        var arr = sys.list() || [];
        html += '<ul class="player-block-list">';
        arr.forEach(function (it) { html += '<li>' + _esc(typeof it === 'string' ? it : JSON.stringify(it)) + '</li>'; });
        html += '</ul>';
      } else {
        html += '<div class="player-block-empty">（' + _esc(blockDef.systemKey) + ' 无可用渲染入口）</div>';
      }
    } catch (e) {
      html += '<div class="player-block-error">渲染异常：' + _esc(String(e)) + '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── 单场景 tab 渲染 ────────────────────────────────────────
  function renderTab(sceneKey, role) {
    // evolution 场景：走专用面板·不走通用 SCENE_BLOCKS 渲染
    if (sceneKey === 'evolution') {
      return '<div class="player-scene" data-scene="' + _esc(sceneKey) + '">' + renderRoleChangePaths(role) + '</div>';
    }
    var blocks = SCENE_BLOCKS[sceneKey] || [];
    var html = '<div class="player-scene" data-scene="' + _esc(sceneKey) + '">';

    // 摄政代诏区块（仅 regent·office 场景首位）
    if (sceneKey === 'office' && role === 'regent') {
      html += '<div class="player-block player-block-regent-decree" data-system="RegentDecree">';
      html += '<div class="player-block-title">代诏</div>';
      html += '<div class="player-block-body">';
      html += '<p>摄政权臣可代君主下诏。代诏需承担架空危机风险。</p>';
      html += '<button type="button" class="bt bp" data-system="Transmigration" data-action="runRegentAction" data-payload="proxyEdict">代下诏令</button>';
      html += '<button type="button" class="bt bs" data-system="Transmigration" data-action="runRegentAction" data-payload="returnPower">还政</button>';
      html += '</div></div>';
    }

    if (!blocks.length && !(sceneKey === 'office' && role === 'regent')) {
      html += '<div class="player-scene-empty">该场景无内容</div>';
      html += '</div>';
      return html;
    }
    blocks.forEach(function (b) {
      // 角色门控·例如反叛筹备仅 prince/regent/general/minister/merchant 可见
      if (b.systemKey === 'PlayerRebel' &&
          ['prince','regent','general','minister','merchant'].indexOf(role) < 0) return;
      if (b.systemKey === 'PlayerKeju' && role !== 'commoner') return;
      if (b.systemKey === 'PlayerAnnualReview' &&
          ['minister','general','regent'].indexOf(role) < 0) return;
      html += renderBlock(b, role);
    });
    html += '</div>';
    return html;
  }

  // ── 事件绑定（按钮点击） ────────────────────────────────────
  function bindEvents(sceneKey) {
    // 占位·各系统按钮的具体事件由其自己的 bindEvents 提供
    // 这里只负责将场景容器内的 [data-action] 转发到对应系统的 action 方法
    if (typeof document === 'undefined') return;
    var gc = document.getElementById('gc');
    if (!gc) return;
    try {
      gc.querySelectorAll('[data-action]').forEach(function (btn) {
        if (btn.__playerBound) return;
        // triggerRoleChange 由专属包装处理·跳过通用转发以避免重复绑定
        if (btn.getAttribute('data-action') === 'triggerRoleChange') return;
        btn.__playerBound = true;
        btn.addEventListener('click', function () {
          var sysKey = btn.getAttribute('data-system');
          var action = btn.getAttribute('data-action');
          var sys = _sys(sysKey);
          if (sys && typeof sys[action] === 'function') {
            try { sys[action](btn.getAttribute('data-payload') || {}); } catch (e) {
              if (typeof toast === 'function') toast('动作异常：' + e);
            }
          }
        });
      });
      // triggerRoleChange 专属包装：调 TM.Transmigration.triggerRoleChange 并 toast 反馈
      gc.querySelectorAll('[data-action="triggerRoleChange"]').forEach(function (btn) {
        if (btn.__playerBound) return;
        btn.__playerBound = true;
        btn.addEventListener('click', function () {
          var kind = btn.getAttribute('data-kind');
          var r = (global.TM && global.TM.Transmigration && global.TM.Transmigration.triggerRoleChange)
            ? global.TM.Transmigration.triggerRoleChange(kind) : { ok: false };
          if (r.ok) {
            if (typeof toast === 'function') toast('已触发：' + (r.path ? r.path.label : kind));
          } else {
            if (typeof toast === 'function') toast('触发失败：' + (r.reason || '未知'));
          }
        });
      });
    } catch (_) {}
  }

  // ── 红点判定 ──────────────────────────────────────────────
  function hasUpdate(sceneKey) {
    try {
      if (typeof GM === 'undefined' || !GM) return false;
      if (sceneKey === 'home' && GM._playerFamily && GM._playerFamily.updated) return true;
      if (sceneKey === 'force' && GM._playerRebel && GM._playerRebel.readiness > 0) return true;
      return false;
    } catch (_) { return false; }
  }

  var PlayerSystemsUI = {
    scenesForRole: scenesForRole,
    renderTab: renderTab,
    renderBlock: renderBlock,
    bindEvents: bindEvents,
    hasUpdate: hasUpdate,
    SCENES: SCENES,
    ROLE_SCENES: ROLE_SCENES
  };

  // ── PlayerCourtDebate 系统 stub（B5） ──────────────────────────
  // 朝议活跃状态用 CY.open 判断（非 GM.courtDebate·后者不存在）
  // 君主 AI 准否反馈链路推迟到 Phase C·此处只写 CY._pendingCourtierSpeech 队列留接口
  var PlayerCourtDebate = {
    state: function () {
      try {
        if (typeof CY === 'undefined' || !CY || !CY.open) return { active: false };
        // topic 兜底链：v3 优先（_ty3）→ v2（_ty2）→ 御前（_yq2）→ 顶层（CY.topic）
        // 注：v3 重构后 _ty3 是优先字段·仅查 _ty2 在 v3 模式下会读到空字符串
        var topic = '';
        if (CY._ty3 && CY._ty3.topic) topic = CY._ty3.topic;
        else if (CY._ty2 && CY._ty2.topic) topic = CY._ty2.topic;
        else if (CY._yq2 && CY._yq2.topic) topic = CY._yq2.topic;
        else if (CY.topic) topic = CY.topic;
        return { active: true, topic: topic, phase: CY.phase || '' };
      } catch (_) { return { active: false }; }
    },
    petitionToSpeak: function () {
      try {
        if (typeof CY === 'undefined' || !CY || !CY.open) {
          if (typeof toast === 'function') toast('朝议未开·无法请旨');
          return { ok: false, reason: 'not_active' };
        }
        // 写入待审队列·供君主 AI 准否（Phase C 接 SovereignAI.runTurn）
        // 含 topic 字段·避免 Phase C 异步窗口切议题后无法回溯
        if (!CY._pendingCourtierSpeech) CY._pendingCourtierSpeech = [];
        var ch = _resolvePlayerChar();
        var name = (ch && ch.name) || '玩家';
        var st = this.state();
        CY._pendingCourtierSpeech.push({ name: name, line: '臣请旨发言', topic: st.topic || '', ts: Date.now() });
        if (typeof toast === 'function') toast('已请旨发言·待君主裁决');
        return { ok: true };
      } catch (e) {
        if (typeof toast === 'function') toast('请旨异常：' + e);
        return { ok: false, reason: String(e) };
      }
    },
    renderBlockHTML: function (role) {
      var st = this.state();
      if (!st.active) {
        return '<div class="player-block-empty">（君主未开朝议）</div>';
      }
      var html = '<div class="player-court-debate-active">';
      if (st.topic) html += '<div class="player-court-debate-topic">当前议题：' + _esc(st.topic) + '</div>';
      else html += '<div class="player-court-debate-topic">（议题未明）</div>';
      html += '<button type="button" class="bt bp" data-system="PlayerCourtDebate" data-action="petitionToSpeak">请旨发言</button>';
      html += '</div>';
      return html;
    }
  };

  global.TM.PlayerSystemsUI = PlayerSystemsUI;
  global.TM.PlayerCourtDebate = PlayerCourtDebate;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerSystemsUI;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
