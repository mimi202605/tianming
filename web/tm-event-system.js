// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// 剧情事件总线 (StoryEventBus) + 效果注册表 (EffectRegistry)
// 存档安全（无闭包），AI事件和编辑器事件统一入口
// ============================================================
//
// 🔧 事件系统统一 · Slice 1 激活中（2026-06-20 起 · 详见 docs/event-system-unification-design.md）
//   本骨架（队列 / choices / 可序列化 EffectRegistry）保留并激活为「统一事件总线」的底座。
//   开关：P.conf.eventUnificationEnabled（默认关 · 零回归 · 独立于 agent 总闸，事件统一非 agent 升级）。
//   S1 现状：endturn 已接 cleanExpired drain 钩子（开关门控·tm-endturn-systems.js）；
//            存档往返已现成（tm-save-lifecycle.js:367 存 / :650 恢复·激活后存的即真队列）。
//   待接（渐进收编）：
//     · S2 后果出口改 AI 裁定（resolveChoice 的 effectKey 查表 → 读 choice.aiHint 走 ai-change-applier；EffectRegistry 降兜底）
//     · S3 processNext → 统一事件模态渲染（复用 showHistoryEventModal 范式）
//     · S4 来源涌现（势力动作 / 廷议结论 / 史实节点 / AI events 升格 → enqueue），统一感知表
//   历史：本总线曾于 2026-06-15 标 @vestigial（总线恒空·无驱动）；S1 起按详设激活。当前真跑的事件系统仍含
//         tm-history-events.js（checkHistoryEvents/checkRigidTriggers）+ tm-ai-change-applier 的 AI events（待 S4 收编）。
// ============================================================

/**
 * 剧情事件总线 —— 事件按优先级排队，玩家逐个处理
 * 所有效果通过 effectKey + effectData 执行（可序列化，存档安全）
 */
var StoryEventBus = (function() {
  'use strict';

  var _queue = [];       // 待处理事件队列
  var _processing = null; // 当前正在处理的事件

  /**
   * @typedef {Object} StoryEvent
   * @property {string} id - 事件唯一ID
   * @property {string} title - 事件标题
   * @property {string} description - 事件描述
   * @property {string} source - 来源: 'scripted'|'ai_generated'|'mechanical'|'chain'
   * @property {number} priority - 优先级(1-10, 10=最高)
   * @property {Object[]} choices - 选项列表
   * @property {string} choices[].text - 选项文本
   * @property {string} choices[].effectKey - 效果键（在EffectRegistry中查找）
   * @property {Object} choices[].effectData - 效果数据（JSON可序列化）
   * @property {string} [choices[].aiHint] - AI叙事提示（选择此项后AI据此描写后果）
   * @property {number} [deadline] - 必须在N回合内处理(0=立即)
   * @property {boolean} [pauseGame] - 是否暂停游戏等待玩家选择
   * @property {string} [chainNext] - 链式事件ID（处理完后触发下一个）
   * @property {number} [enqueueTurn] - 入队回合（自动填充）
   * @property {boolean} [active] - [S1预留·危机维度] 派生状态:持续型事件是否处于激活态
   * @property {number} [enterThreshold] - [S1预留·危机维度] 进入阈值
   * @property {number} [exitThreshold] - [S1预留·危机维度] 退出阈值(滞回·防抖动)
   * @property {Object} [history] - [S1预留·危机维度] 生灭归档 {start,end,resolvedBy}
   */

  /**
   * 将事件加入队列
   * @param {StoryEvent} event
   */
  function enqueue(event) {
    if (!event) return;
    event.id = event.id || uid();
    event.enqueueTurn = GM.turn;
    event.priority = event.priority || 5;
    _queue.push(event);
    // 按优先级降序排列
    _queue.sort(function(a, b) { return b.priority - a.priority; });
    _dbg('[EventBus] 入队:', event.title, '优先级:', event.priority, '队列长度:', _queue.length);
  }

  /**
   * 取出下一个待处理事件
   * @returns {StoryEvent|null}
   */
  function processNext() {
    if (_queue.length === 0) return null;
    _processing = _queue.shift();
    return _processing;
  }

  /**
   * 玩家选择某选项后裁定后果（S2：AI 裁定为主·EffectRegistry 兜底）
   * @param {string} eventId
   * @param {number} choiceIndex
   * @param {{viaAI?:boolean}} [opts] - viaAI:false 强制走兜底（超时事件用·endturn 同步流不 await AI）
   * @returns {Promise<boolean>} 是否成功执行
   */
  async function resolveChoice(eventId, choiceIndex, opts) {
    opts = opts || {};
    var event = _processing && _processing.id === eventId ? _processing : null;
    if (!event) {
      // 可能从存档恢复，在队列中查找
      for (var i = 0; i < _queue.length; i++) {
        if (_queue[i].id === eventId) { event = _queue.splice(i, 1)[0]; break; }
      }
    }
    if (!event || !event.choices || !event.choices[choiceIndex]) return false;

    var choice = event.choices[choiceIndex];

    // ── 后果出口（S2）：玩家主动选 + 开关开 + 有 aiHint + AI 接口可用 → AI 据局面裁定硬核连锁后果 ──
    var _adjudicated = false;
    var _viaAI = (opts.viaAI !== false)
      && (typeof eventUnificationOn === 'function' && eventUnificationOn())
      && choice.aiHint
      && (typeof callAIWithTools === 'function')
      && (typeof applyAITurnChanges === 'function');
    if (_viaAI) {
      try {
        _adjudicated = await _adjudicateOutcomeViaAI(event, choice);
      } catch (e) {
        console.warn('[EventBus·S2] AI 裁定失败·回落兜底:', (e && e.message) || e);
      }
    }

    // ── 兜底：AI 未裁定（开关关/无 aiHint/接口缺/失败/超时事件）→ EffectRegistry 查表（原逻辑·存档安全）──
    if (!_adjudicated && choice.effectKey && EffectRegistry[choice.effectKey]) {
      try {
        EffectRegistry[choice.effectKey](choice.effectData || {});
        _dbg('[EventBus] 兜底效果:', choice.effectKey, JSON.stringify(choice.effectData || {}).slice(0, 100));
      } catch(e) {
        console.error('[EventBus] 效果执行失败:', choice.effectKey, e);
      }
    }

    // ── 统一落账（S2·修详设§1.6 落账不一致）：事件簿 + 编年 + 记忆锚 ──
    _recordEventResolution(event, choice);

    // 链式事件
    if (event.chainNext) {
      // 在P.events中查找下一个事件
      var nextEvt = _findEventTemplate(event.chainNext);
      if (nextEvt) enqueue(nextEvt);
    }

    _processing = null;
    return true;
  }

  // ── S2 helpers：AI 裁定事件后果（path 用核心变量中文名·normalizeCoreVarPath 容错落地）──

  /** 核心国势快照（给 AI 裁定参照·读 GM 核心变量） */
  function _coreStateSnapshot() {
    try {
      var G = (typeof GM !== 'undefined') ? GM : (typeof window !== 'undefined' ? window.GM : null);
      if (!G) return '';
      var parts = [];
      if (G.minxin && G.minxin.trueIndex != null) parts.push('民心' + Math.round(G.minxin.trueIndex));
      if (G.huangwei && G.huangwei.index != null) parts.push('皇威' + Math.round(G.huangwei.index));
      if (G.huangquan && G.huangquan.index != null) parts.push('皇权' + Math.round(G.huangquan.index));
      if (G.corruption && G.corruption.trueIndex != null) parts.push('吏治' + Math.round(G.corruption.trueIndex));
      if (G.guoku && G.guoku.money != null) parts.push('国库' + Math.round(G.guoku.money));
      return parts.join('·');
    } catch (e) { return ''; }
  }

  /** 裁定后果的 tool schema（path 用核心变量中文名） */
  function _outcomeAdjudicationTool() {
    return {
      name: 'adjudicate_event_outcome',
      description: '据当前局面与玩家选择，裁定该选择引发的硬核可信连锁后果：一段叙事 + 国势/人物的数值变化',
      parameters: {
        type: 'object',
        properties: {
          narrative: { type: 'string', description: '后果叙事，半文言 60-160 字，写出这个抉择引发的连锁反应' },
          changes: {
            type: 'array',
            description: '硬核后果：调整国势或人物。可空（纯叙事性后果）',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'core 变量:民心|皇威|皇权|吏治|国库|内帑;或人物:chars.<人名>.loyalty / chars.<人名>.ambition 等' },
                delta: { type: 'number', description: '增量(正负)·幅度与事件轻重相称·通常 ±2~±12' },
                reason: { type: 'string', description: '简短原因' }
              },
              required: ['path', 'delta']
            }
          }
        },
        required: ['narrative']
      }
    };
  }

  /** 构造裁定 prompt */
  function _buildOutcomePrompt(event, choice) {
    var L = [];
    L.push('你是历史推演的后果裁定者。一个事件正在发生，君主(玩家)已做出抉择，请裁定这个抉择引发的【硬核可信的连锁后果】。');
    L.push('');
    L.push('【事件】' + (event.title || '') + (event.description ? '：' + event.description : ''));
    L.push('【君主抉择】' + (choice.text || ''));
    if (choice.aiHint) L.push('【裁定要点】' + choice.aiHint);
    var snap = _coreStateSnapshot();
    if (snap) L.push('【当前国势】' + snap);
    L.push('');
    L.push('裁定原则：①后果须符合局面逻辑、有代价、有连锁(一个抉择牵动多方面)；②不夸张不离谱，半文言；③changes 幅度与事件轻重相称。');
    L.push('调用 adjudicate_event_outcome 输出后果。');
    return L.join('\n');
  }

  /** AI 裁定事件后果 → 走 applyAITurnChanges 落地 + 叙事进事件簿 */
  async function _adjudicateOutcomeViaAI(event, choice) {
    var prompt = _buildOutcomePrompt(event, choice);
    var resp = await callAIWithTools(prompt, [_outcomeAdjudicationTool()], { tier: 'secondary', maxTok: 900, id: 'event:adjudicate' });
    var call = resp && resp.toolCalls && resp.toolCalls[0];
    var out = (call && call.input) || null;
    if (!out && resp && resp.text) { try { out = JSON.parse(resp.text); } catch (_) { out = null; } }
    if (!out) return false;
    var changes = Array.isArray(out.changes) ? out.changes : [];
    var narrative = out.narrative || '';
    if (changes.length && typeof applyAITurnChanges === 'function') {
      try { applyAITurnChanges({ narrative: narrative, changes: changes }); }
      catch (e) { console.warn('[EventBus·S2] applyAITurnChanges:', (e && e.message) || e); }
    }
    if (narrative && typeof addEB === 'function') {
      try { addEB('事件·裁定', String(narrative).slice(0, 240)); } catch (_) {}
    }
    return !!(narrative || changes.length);
  }

  /** 统一落账（修§1.6）：事件簿 + 编年 + 记忆锚 */
  function _recordEventResolution(event, choice) {
    try { if (typeof addEB === 'function') addEB('事件', (event.title || '事件') + ' → ' + (choice.text || '')); } catch (_) {}
    try {
      var G = (typeof GM !== 'undefined') ? GM : (typeof window !== 'undefined' ? window.GM : null);
      if (G && Array.isArray(G.biannianItems)) {
        G.biannianItems.push({ turn: G.turn, title: event.title || '事件', content: choice.text || '', type: 'story_event' });
      }
    } catch (_) {}
    try { if (typeof createMemoryAnchor === 'function') createMemoryAnchor('event', event.title || '事件', choice.text || ''); } catch (_) {}
  }

  /**
   * 清理超时事件
   */
  function cleanExpired() {
    if (!_queue.length) return;
    _queue = _queue.filter(function(evt) {
      if (evt.deadline && evt.deadline > 0) {
        var age = GM.turn - (evt.enqueueTurn || 0);
        if (age > evt.deadline) {
          _dbg('[EventBus] 事件超时:', evt.title);
          // 超时默认选第一项（如有）·S2·超时走兜底（viaAI:false·endturn 同步流不 await AI）
          if (evt.choices && evt.choices.length > 0 && evt.choices[0].effectKey) {
            resolveChoice(evt.id, 0, { viaAI: false });
          }
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 从编辑器事件模板中查找
   */
  function _findEventTemplate(eventId) {
    if (!P.events) return null;
    var allEvents = [].concat(P.events.historical||[], P.events.random||[], P.events.conditional||[], P.events.story||[], P.events.chain||[]);
    return allEvents.find(function(e) { return e.id === eventId || e.name === eventId; }) || null;
  }

  // ── 存档接口（完全可序列化，无闭包）──

  function serialize() {
    return { queue: _queue, processing: _processing };
  }

  function deserialize(data) {
    if (!data) return;
    _queue = data.queue || [];
    _processing = data.processing || null;
  }

  return {
    enqueue: enqueue,
    processNext: processNext,
    resolveChoice: resolveChoice,
    cleanExpired: cleanExpired,
    serialize: serialize,
    deserialize: deserialize,
    getQueue: function() { return _queue; },
    isEmpty: function() { return _queue.length === 0; },
    getCurrentEvent: function() { return _processing; }
  };
})();

/**
 * 效果注册表 —— 所有事件效果通过此表执行
 * 无闭包，纯数据驱动，存档安全
 * 新增效果类型只需在此注册即可
 */
var EffectRegistry = {
  /**
   * 修改游戏变量
   * @param {Object} data - {variable:string, delta:number, reason:string}
   */
  'change_variable': function(data) {
    if (!data.variable || !GM.vars) return;
    var v = GM.vars[data.variable];
    if (v) {
      v.value = clamp(v.value + (data.delta || 0), v.min || 0, v.max || 10000);
      if (typeof recordChange === 'function') recordChange('variable', data.variable, 'value', v.value - (data.delta||0), v.value, data.reason || '事件效果');
    }
  },

  /**
   * 修改角色属性
   * @param {Object} data - {character:string, field:string, delta:number}
   */
  'change_character': function(data) {
    if (!data.character) return;
    var char = (typeof findCharByName === 'function') ? findCharByName(data.character) : null;
    if (char && data.field) {
      char[data.field] = clamp((char[data.field] || 0) + (data.delta || 0), 0, 100);
    }
  },

  /**
   * 添加恩怨
   * @param {Object} data - {type:'en'|'yuan', from:string, to:string, 强度:number, 事由:string, 不共戴天:boolean}
   */
  'add_enYuan': function(data) {
    if (typeof EnYuanSystem !== 'undefined') {
      EnYuanSystem.add(data.type, data.from, data.to, data.强度, data.事由, data.不共戴天);
    }
  },

  /**
   * 发动战争
   * @param {Object} data - {attacker:string, defender:string, casusBelli:string}
   */
  'start_war': function(data) {
    if (typeof CasusBelliSystem !== 'undefined') {
      CasusBelliSystem.declareWar(data.attacker, data.defender, data.casusBelli);
    } else {
      if (!GM.activeWars) GM.activeWars = [];
      GM.activeWars.push({ id: uid(), attacker: data.attacker, defender: data.defender, casusBelli: data.casusBelli || 'none', startTurn: GM.turn, warScore: 0 });
    }
  },

  /**
   * 触发链式事件
   * @param {Object} data - {eventId:string}
   */
  'trigger_chain': function(data) {
    if (data.eventId) {
      // 在P.events中查找并入队
      var allEvents = [].concat((P.events&&P.events.story)||[], (P.events&&P.events.chain)||[]);
      var evt = allEvents.find(function(e) { return e.id === data.eventId || e.name === data.eventId; });
      if (evt) StoryEventBus.enqueue(evt);
    }
  },

  /**
   * 建立门生关系
   * @param {Object} data - {座主:string, 门生:string, 关系类型:string, 亲密度:number}
   */
  'establish_patron': function(data) {
    if (typeof PatronNetwork !== 'undefined') {
      PatronNetwork.establish(data.座主, data.门生, data.关系类型, data.亲密度);
    }
  },

  /**
   * 添加特质
   * @param {Object} data - {character:string, traitId:string}
   */
  'add_trait': function(data) {
    var char = (typeof findCharByName === 'function') ? findCharByName(data.character) : null;
    if (char) {
      if (!char.traitIds) char.traitIds = [];
      if (char.traitIds.indexOf(data.traitId) < 0) char.traitIds.push(data.traitId);
    }
  },

  /**
   * 修改面子
   * @param {Object} data - {character:string, delta:number, reason:string}
   */
  'change_face': function(data) {
    if (typeof FaceSystem !== 'undefined') {
      var char = (typeof findCharByName === 'function') ? findCharByName(data.character) : null;
      if (char) FaceSystem.changeFace(char, data.delta || 0, data.reason || '');
    }
  },

  /**
   * 空效果（纯通知事件，选择后无机械影响）
   */
  'noop': function() {}
};

// ── 统一事件总线开关（S1·独立于 agent 总闸：事件系统统一不是 agent 升级·见 docs/event-system-unification-design.md）──
// 读 P.conf.eventUnificationEnabled（或 P.ai.*）·默认关→零回归（drain 不跑·骨架空转·与激活前等价）
function eventUnificationOn() {
  try {
    var _P = (typeof P !== 'undefined' && P) ? P
           : (typeof window !== 'undefined' && window.P) ? window.P
           : (typeof global !== 'undefined' && global.P) ? global.P : {};
    return !!((_P.conf && _P.conf.eventUnificationEnabled) || (_P.ai && _P.ai.eventUnificationEnabled));
  } catch (e) { return false; }
}
if (typeof window !== 'undefined') { window.eventUnificationOn = eventUnificationOn; }

// ── S3 渲染器：事件模态（玩家入口）·复用 showHistoryEventModal 分支卡片范式·openGenericModal 自动后朝排队 ──
function renderStoryEventModal(event) {
  if (!event || !Array.isArray(event.choices) || !event.choices.length) return;
  if (typeof openGenericModal !== 'function' || typeof document === 'undefined') return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); };
  var html = '<div style="padding:0.5rem 0.25rem;">';
  if (event.description) html += '<div style="margin-bottom:1.2rem;color:var(--txt-s);line-height:1.7;">' + esc(event.description) + '</div>';
  html += '<div style="margin-bottom:0.8rem;color:var(--txt-d);font-size:0.85rem;">请抉择应对：</div>';
  event.choices.forEach(function (ch, idx) {
    html += '<div class="story-event-choice" data-evt="' + esc(event.id) + '" data-idx="' + idx + '" '
      + 'style="margin-bottom:0.7rem;padding:0.75rem 0.9rem;background:var(--bg-2);border-radius:6px;cursor:pointer;border:2px solid transparent;transition:all 0.2s;" '
      + 'onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'transparent\'">'
      + '<div style="font-weight:700;color:var(--gold-l);">' + esc(ch.text || ('选项' + (idx + 1))) + '</div>'
      + (ch.aiHint ? '<div style="font-size:0.78rem;color:var(--txt-d);margin-top:0.3rem;line-height:1.5;">' + esc(ch.aiHint) + '</div>' : '')
      + '</div>';
  });
  html += '</div>';
  openGenericModal(event.title || '事件', html, null);
  setTimeout(_bindStoryEventChoices, 0);
}

function _bindStoryEventChoices() {
  if (typeof document === 'undefined') return;
  var els = document.querySelectorAll('.story-event-choice');
  Array.prototype.forEach.call(els, function (el) {
    if (el._seBound) return;
    el._seBound = true;
    el.onclick = async function () {
      var eid = el.getAttribute('data-evt');
      var idx = parseInt(el.getAttribute('data-idx'), 10) || 0;
      try { if (typeof closeGenericModal === 'function') closeGenericModal(); } catch (_) {}
      try {
        if (typeof StoryEventBus !== 'undefined' && StoryEventBus) await StoryEventBus.resolveChoice(eid, idx);
      } catch (e) { console.warn('[EventBus·S3] resolveChoice:', (e && e.message) || e); }
      // 后果已落地(applyAITurnChanges 改 GM·裁定叙事已进事件簿)·UI 下次渲染反映·S3 第一版不强制刷新
    };
  });
}
if (typeof window !== 'undefined') { window.renderStoryEventModal = renderStoryEventModal; }
