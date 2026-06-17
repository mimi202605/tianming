// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// 剧情事件总线 (StoryEventBus) + 效果注册表 (EffectRegistry)
// 存档安全（无闭包），AI事件和编辑器事件统一入口
// ============================================================
//
// ⚠️ @vestigial（2026-06-15 审计标注·勿误认为活路径）
//   本总线的【事件处理逻辑】当前未接入任何 gameplay 驱动：
//     · processNext / enqueue / resolveChoice / EffectRegistry —— 全库无外部调用方，
//       没有任何代码每回合调 processNext，也没有 gameplay 路径 enqueue 事件（总线恒空）。
//     · 唯一在用的是 serialize/deserialize（tm-save-lifecycle.js:365/645·typeof 守卫），
//       读写存档时持久化一个【空】总线，无害但无实效。
//   ★当前真正在跑的事件系统是 tm-history-events.js（checkHistoryEvents / checkRigidTriggers，
//     由 tm-endturn-systems.js 每回合驱动）+ tm-ai-change-applier 的 AI events。改事件请去那里。
//   保留原因：存档兼容（已有存档含 _savedEventBus 字段）+ 留作未来「可序列化事件总线」接通的骨架。
//   若决定接通：在 endturn 管线加 processNext 钩子 + 事件模态渲染器，并从 gameplay 侧 enqueue。
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
   * 玩家选择某选项后执行效果
   * @param {string} eventId
   * @param {number} choiceIndex
   * @returns {boolean} 是否成功执行
   */
  function resolveChoice(eventId, choiceIndex) {
    var event = _processing && _processing.id === eventId ? _processing : null;
    if (!event) {
      // 可能从存档恢复，在队列中查找
      for (var i = 0; i < _queue.length; i++) {
        if (_queue[i].id === eventId) { event = _queue.splice(i, 1)[0]; break; }
      }
    }
    if (!event || !event.choices || !event.choices[choiceIndex]) return false;

    var choice = event.choices[choiceIndex];

    // 通过EffectRegistry执行效果（存档安全）
    if (choice.effectKey && EffectRegistry[choice.effectKey]) {
      try {
        EffectRegistry[choice.effectKey](choice.effectData || {});
        _dbg('[EventBus] 执行效果:', choice.effectKey, JSON.stringify(choice.effectData || {}).slice(0, 100));
      } catch(e) {
        console.error('[EventBus] 效果执行失败:', choice.effectKey, e);
      }
    }

    // 记录到事件日志
    addEB('事件', event.title + ' → ' + choice.text);

    // 链式事件
    if (event.chainNext) {
      // 在P.events中查找下一个事件
      var nextEvt = _findEventTemplate(event.chainNext);
      if (nextEvt) enqueue(nextEvt);
    }

    _processing = null;
    return true;
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
          // 超时默认选第一项（如有）
          if (evt.choices && evt.choices.length > 0 && evt.choices[0].effectKey) {
            resolveChoice(evt.id, 0);
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
