// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-history-events.js — 历史事件系统 + 时间工具
//
// R93 从 tm-endturn.js §A 抽出·原 L1997-2387 (391 行)
// 9 函数：
//   历史事件框架：checkHistoryEvents / showHistoryEventModal / applyEventBranch
//   刚性触发器：   checkRigidTriggers / triggerRigidEvent
//   路径工具：     getValueByPath / setValueByPath
//   时间工具：     getCurrentYear (外部 6 处调用) / getCurrentMonth (2 处)
//
// 外部调用：getCurrentYear 6 处·getCurrentMonth 2 处·其他 0
// 依赖外部：GM / P / openGenericModal / _dbg / addEB（均 window 全局）
//
// 加载顺序：必须在 tm-endturn.js 之前（而 getCurrentYear 调用方也必须在此之后）
// ============================================================

// ============================================================
//  历史事件系统 - 通用时间触发+分支选择框架
// ============================================================

/**
 * 检查并触发历史事件
 * 框架特性：
 * - 基于年月的时间触发
 * - 多分支选择系统
 * - 影响自动应用
 * - 事件去重（已触发不再触发）
 */
function checkHistoryEvents() {
  // 剧本隔离根治：gameplay 只读当前局 GM.rigidHistoryEvents(doActualStart 已建的单剧本干净副本)·
  // 绝不读跨剧本累积的 P.rigidHistoryEvents 库(官方天启快照常驻·会让绍宋触发天启的「魏忠贤自缢」等)。
  // 旧存档无 GM.rigidHistoryEvents 时按当前 sid 过滤 P 兜底(纵深防御)。
  var _rigids = (GM && Array.isArray(GM.rigidHistoryEvents)) ? GM.rigidHistoryEvents
    : (typeof _tmActiveScenarioRows==='function'?_tmActiveScenarioRows(P.rigidHistoryEvents):(P.rigidHistoryEvents||[]));
  if (!_rigids || _rigids.length === 0) return;
  if (!GM.triggeredHistoryEvents) GM.triggeredHistoryEvents = {};

  var currentYear = getCurrentYear();
  var currentMonth = getCurrentMonth();

  _rigids.forEach(function(event) {
    // 跳过已触发事件
    if (GM.triggeredHistoryEvents[event.id]) return;

    // 触发回合门槛(刚性史事剧本写 triggerTurn:N·如魏忠贤自缢 triggerTurn:3)·未到回合不触发
    // 原 bug:triggerTurn 从不读·且 string 型 trigger(如「阉党权势值 < 50 且 皇威 > 50」)被当对象→
    //   trigger.year/.month 恒 undefined → year/monthMatch 恒 true → 开局第一回合即无条件触发(魏忠贤开局自缢·破坏史实代入)
    if (typeof event.triggerTurn === 'number' && (GM.turn || 0) < event.triggerTurn) return;

    // 仅当 trigger 为结构化对象时按 year/month/condition 判定;字符串/缺省 trigger 不构成时间门(其文本是设计者条件注记·交 triggerTurn 把关)
    var trigger = (event.trigger && typeof event.trigger === 'object') ? event.trigger : {};
    var yearMatch = trigger.year === undefined || trigger.year === currentYear;
    var monthMatch = trigger.month === undefined || trigger.month === currentMonth;

    // 自定义条件检查（可选·函数型·注:存档 deepClone 会剥函数·剧本宜用 triggerTurn/year/month 数据型门槛）
    var customMatch = true;
    if (typeof trigger.condition === 'function') {
      try {
        customMatch = trigger.condition(GM, P);
      } catch (e) {
        customMatch = false;
      }
    }

    // 门槛防御:既无 triggerTurn 又无任何结构化 trigger(year/month/condition 全缺)→不每回合无条件触发(原 string-trigger 事件即此情形被误开局触发)
    var hasGate = (typeof event.triggerTurn === 'number') || trigger.year !== undefined || trigger.month !== undefined || typeof trigger.condition === 'function';
    if (!hasGate) return;

    if (yearMatch && monthMatch && customMatch) {
      // 标记为已触发
      GM.triggeredHistoryEvents[event.id] = {
        turn: GM.turn,
        year: currentYear,
        month: currentMonth
      };

      // 显示事件选择界面（v0.2·事件并入御案时政:开关开 → 收编进 currentIssues·关 → 原独立事件框·零回归）
      if (typeof _eventAdjudicationOn === 'function' && _eventAdjudicationOn() && typeof _pushHistoryEventToIssues === 'function') {
        _pushHistoryEventToIssues(event);
      } else {
        showHistoryEventModal(event);
      }
    }
  });
}

/**
 * v0.2·史实事件收编御案时政:rigidHistoryEvent → currentIssues 的 issue
 * branch{name,description,impact} → choice{text,desc,effect,aiHint}·effect=impact(固定·_chooseIssueOption 兜底)·开关开则 AI 据局面裁
 */
function _historyEventToIssue(event) {
  return {
    id: 'hist_' + (event.id || 'x'),
    title: event.name || '历史事件',
    description: event.narrative || event.description || '',
    category: '史实',
    status: 'pending',
    raisedTurn: (typeof GM !== 'undefined' && GM.turn) || 1,
    raisedDate: (typeof GM !== 'undefined' && GM._gameDate) || '',
    historicalNote: event.historicalNote || '',
    choices: (event.branches || []).map(function (b) {
      return { text: b.name || '应对', desc: b.description || '', effect: b.impact || null, aiHint: b.aiHint || '' };
    })
  };
}
function _pushHistoryEventToIssues(event) {
  try {
    if (typeof GM === 'undefined' || !GM) return;
    if (!Array.isArray(GM.currentIssues)) GM.currentIssues = [];
    var issue = _historyEventToIssue(event);
    if (!GM.currentIssues.some(function (i) { return i && i.id === issue.id; })) {
      GM.currentIssues.push(issue);
      if (typeof addEB === 'function') { try { addEB('要务', '史事临御案：' + issue.title); } catch (_) {} }
    }
  } catch (e) { try { console.warn('[史实收编] push currentIssues 失败:', (e && e.message) || e); } catch (_) {} }
}
if (typeof window !== 'undefined') { window._pushHistoryEventToIssues = _pushHistoryEventToIssues; }

/**
 * 显示历史事件选择模态框
 */
function showHistoryEventModal(event) {
  var html = '<div style="padding: 1rem;">';
  html += '<div style="margin-bottom: 1rem; color: var(--gold); font-size: 1.1rem; font-weight: 700;">' + (event.name || '历史事件') + '</div>';

  // 正文优先取 narrative(刚性史事剧本字段)·回退 description·原 bug:只读 description→剧本 narrative 文本被丢弃·弹窗正文空白
  var _body = event.narrative || event.description;
  if (_body) {
    html += '<div style="margin-bottom: 1.5rem; color: var(--txt-s); line-height: 1.6;">' + _body + '</div>';
  }

  html += '<div style="margin-bottom: 1rem; color: var(--txt-d); font-size: 0.9rem;">请选择应对方式：</div>';

  // 渲染分支选项
  if (event.branches && event.branches.length > 0) {
    event.branches.forEach(function(branch, idx) {
      html += '<div style="margin-bottom: 0.8rem; padding: 0.8rem; background: var(--bg-2); border-radius: 6px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s;" ';
      html += 'onmouseover="this.style.borderColor=\'var(--gold)\'" ';
      html += 'onmouseout="this.style.borderColor=\'transparent\'" ';
      html += 'onclick="applyEventBranch(\'' + event.id + '\', ' + idx + ')">';
      html += '<div style="font-weight: 700; color: var(--gold-l); margin-bottom: 0.3rem;">' + (branch.name || '选项' + (idx + 1)) + '</div>';

      if (branch.description) {
        html += '<div style="font-size: 0.85rem; color: var(--txt-d); margin-bottom: 0.5rem;">' + branch.description + '</div>';
      }

      // 显示影响预览
      if (branch.impact) {
        html += '<div style="font-size: 0.8rem; color: var(--txt-s);">影响：';
        var impacts = [];
        Object.keys(branch.impact).forEach(function(key) {
          var val = branch.impact[key];
          var sign = val > 0 ? '+' : '';
          impacts.push(({strength:'国力',morale:'士气',population:'人口',treasury:'国库',money:'国库',stability:'稳定',legitimacy:'法统',military:'兵力',economy:'经济',minxin:'民心',authority:'威权',corruption:'贪腐',satisfaction:'满意度',influence:'影响力',unrest:'动荡',loyalty:'忠诚',prestige:'威望'}[key]||key) + ' ' + sign + val);
        });
        html += impacts.join(', ');
        html += '</div>';
      }

      html += '</div>';
    });
  } else {
    html += '<div style="text-align: center; color: var(--txt-d); padding: 1rem;">此事件无可选分支</div>';
    html += '<button class="bt bp" onclick="closeModal()" style="width: 100%; margin-top: 1rem;">确认</button>';
  }

  html += '</div>';

  openGenericModal('历史事件', html, null);
}

/**
 * 应用事件分支效果
 */
function applyEventBranch(eventId, branchIdx) {
  // 剧本隔离根治：从当前局 GM.rigidHistoryEvents 找(单剧本)·不在多剧本 P 库里找·旧档按 sid 过滤兜底
  var _rigids = (GM && Array.isArray(GM.rigidHistoryEvents)) ? GM.rigidHistoryEvents
    : (typeof _tmActiveScenarioRows==='function'?_tmActiveScenarioRows(P.rigidHistoryEvents):(P.rigidHistoryEvents||[]));
  var event = _rigids.find(function(e) { return e.id === eventId; });
  if (!event || !event.branches || !event.branches[branchIdx]) {
    closeModal();
    return;
  }

  var branch = event.branches[branchIdx];

  // 应用影响
  if (branch.impact) {
    Object.keys(branch.impact).forEach(function(key) {
      var val = branch.impact[key];

      // 尝试应用到变量
      if (GM.vars[key]) {
        GM.vars[key].value = Math.max(0, Math.min(100, (GM.vars[key].value || 0) + val));
      }

      // 尝试应用到 GM 直接属性
      if (GM[key] !== undefined && typeof GM[key] === 'number') {
        GM[key] = Math.max(0, Math.min(100, GM[key] + val));
      }
    });
  }

  // 执行自定义效果
  if (typeof branch.effect === 'function') {
    try {
      branch.effect(GM, P);
    } catch (e) {
      console.error('Event branch effect error:', e);
    }
  }

  // 记录到编年
  if (GM.biannianItems) {
    GM.biannianItems.push({
      turn: GM.turn,
      year: getCurrentYear(),
      month: getCurrentMonth(),
      title: event.name + '：' + branch.name,
      content: branch.description || '',
      type: 'history_event'
    });
  }

  // 创建记忆锚点
  createMemoryAnchor('event', event.name, branch.name + '：' + (branch.description || ''), {
    eventId: eventId,
    branchId: branch.id || branchIdx
  });

  if (typeof recordPlayerDecision === 'function') recordPlayerDecision('event', event.name + ':' + branch.name, branch.description || '');
  if (typeof recordCharacterArc === 'function' && event.actors) {
    event.actors.forEach(function(actor) { recordCharacterArc(actor, 'event', event.name + '：' + branch.name); });
  }

  toast('✅ ' + branch.name);
  closeModal();
}

// ============================================================
//  刚性触发系统 - 通用阈值触发框架
// ============================================================

/**
 * 检查刚性触发器
 * 框架特性：
 * - 基于阈值的自动触发
 * - 支持多级触发（如：罢工三级）
 * - 硬性下限（防止过度优化）
 * - 可配置触发条件
 */
function checkRigidTriggers() {
  if (!GM.rigidTriggers || Object.keys(GM.rigidTriggers).length === 0) return;

  var triggers = GM.rigidTriggers;

  // 检查单一阈值触发器
  Object.keys(triggers).forEach(function(key) {
    if (key === 'hardFloors' || key === 'levels') return; // 跳过特殊配置

    var config = triggers[key];
    if (typeof config !== 'object' || !config.threshold) return;

    var currentValue = getValueByPath(config.valuePath || key);
    if (currentValue === undefined) return;

    // 检查是否超过阈值
    if (currentValue >= config.threshold) {
      // 检查是否已触发（避免重复）
      var triggerKey = key + '_' + GM.turn;
      if (GM._triggeredThisTurn && GM._triggeredThisTurn[triggerKey]) return;

      if (!GM._triggeredThisTurn) GM._triggeredThisTurn = {};
      GM._triggeredThisTurn[triggerKey] = true;

      // 触发事件
      triggerRigidEvent(key, config, currentValue);
    }
  });

  // 检查多级触发器（如罢工等级）
  if (triggers.levels && Array.isArray(triggers.levels)) {
    triggers.levels.forEach(function(level) {
      if (!level.valuePath || !level.threshold) return;

      var currentValue = getValueByPath(level.valuePath);
      if (currentValue === undefined) return;

      if (currentValue >= level.threshold) {
        var triggerKey = 'level_' + level.id + '_' + GM.turn;
        if (GM._triggeredThisTurn && GM._triggeredThisTurn[triggerKey]) return;

        if (!GM._triggeredThisTurn) GM._triggeredThisTurn = {};
        GM._triggeredThisTurn[triggerKey] = true;

        triggerRigidEvent(level.id, level, currentValue);
      }
    });
  }

  // 应用硬性下限
  if (triggers.hardFloors) {
    Object.keys(triggers.hardFloors).forEach(function(key) {
      var floor = triggers.hardFloors[key];
      var currentValue = getValueByPath(key);

      if (currentValue !== undefined && currentValue < floor) {
        setValueByPath(key, floor);
      }
    });
  }

  // 清空本回合触发记录（下回合重新检查）
  if (GM._triggeredThisTurn) {
    delete GM._triggeredThisTurn;
  }
}

/**
 * 触发刚性事件
 */
function triggerRigidEvent(id, config, currentValue) {
  var html = '<div style="padding: 1rem;">';
  html += '<div style="margin-bottom: 1rem; color: var(--red); font-size: 1.1rem; font-weight: 700;">';
  html += '⚠️ ' + (config.name || '触发事件');
  html += '</div>';

  html += '<div style="margin-bottom: 1rem; color: var(--txt-s); line-height: 1.6;">';
  html += config.description || ('当前值 ' + currentValue + ' 已达到阈值 ' + config.threshold);
  html += '</div>';

  // 显示影响
  if (config.impact) {
    html += '<div style="margin-top: 1rem; padding: 0.8rem; background: var(--bg-2); border-radius: 6px;">';
    html += '<div style="font-weight: 700; color: var(--gold); margin-bottom: 0.5rem;">影响：</div>';
    Object.keys(config.impact).forEach(function(key) {
      var val = config.impact[key];
      var sign = val > 0 ? '+' : '';
      html += '<div style="font-size: 0.9rem; color: var(--txt-d);">' + ({strength:'国力',morale:'士气',population:'人口',treasury:'国库',money:'国库',stability:'稳定',legitimacy:'法统',military:'兵力',economy:'经济',minxin:'民心',authority:'威权',corruption:'贪腐',satisfaction:'满意度',influence:'影响力',unrest:'动荡',loyalty:'忠诚',prestige:'威望'}[key]||key) + ': ' + sign + val + '</div>';
    });
    html += '</div>';
  }

  html += '<button class="bt bp" onclick="closeModal()" style="width: 100%; margin-top: 1rem;">确认</button>';
  html += '</div>';

  // 应用影响
  if (config.impact) {
    Object.keys(config.impact).forEach(function(key) {
      var val = config.impact[key];

      if (GM.vars[key]) {
        GM.vars[key].value = Math.max(0, Math.min(100, (GM.vars[key].value || 0) + val));
      }

      if (GM[key] !== undefined && typeof GM[key] === 'number') {
        GM[key] = Math.max(0, Math.min(100, GM[key] + val));
      }
    });
  }

  // 执行自定义效果
  if (typeof config.effect === 'function') {
    try {
      config.effect(GM, P);
    } catch (e) {
      console.error('Rigid trigger effect error:', e);
    }
  }

  // 记录到编年
  if (GM.biannianItems) {
    GM.biannianItems.push({
      turn: GM.turn,
      year: getCurrentYear(),
      month: getCurrentMonth(),
      title: config.name || '触发事件',
      content: config.description || '',
      type: 'rigid_trigger'
    });
  }

  // v0.2·事件并入御案时政:阈值刚性事件无决断分支·属"近事警讯"(按正式面板架构「近事归事件栏·御案时政只承接待裁议题」·故不进 currentIssues 待决)。
  //   开关开 → 走事件栏 addEB 统一播报(消灭独立"系统事件"modal·应 owner「不要独立事件框 ui」)·关 → 原 openGenericModal(零回归)。
  //   上方 impact / 编年已照常落地(刚性阈值后果·与开关无关)。
  if (typeof _eventAdjudicationOn === 'function' && _eventAdjudicationOn() && typeof addEB === 'function') {
    var _ebMsg = (config.name || '刚性触发') + (config.description ? ('·' + config.description) : '');
    try { addEB(config.ebCategory || '警讯', _ebMsg); } catch (_) { openGenericModal('系统事件', html, null); }
  } else {
    openGenericModal('系统事件', html, null);
  }
}

/**
 * 辅助函数：通过路径获取值
 */
function getValueByPath(path) {
  if (!path) return undefined;

  // 支持 "GM.xxx" 或 "vars.xxx" 格式
  var parts = path.split('.');
  var obj = parts[0] === 'GM' ? GM : (parts[0] === 'vars' ? GM.vars : GM);

  for (var i = (parts[0] === 'GM' || parts[0] === 'vars' ? 1 : 0); i < parts.length; i++) {
    if (obj === undefined) return undefined;
    obj = obj[parts[i]];
  }

  // 如果是变量对象，返回 value
  if (obj && typeof obj === 'object' && obj.value !== undefined) {
    return obj.value;
  }

  return obj;
}

/**
 * 辅助函数：通过路径设置值
 */
function setValueByPath(path, value) {
  if (!path) return;

  var parts = path.split('.');
  var obj = parts[0] === 'GM' ? GM : (parts[0] === 'vars' ? GM.vars : GM);

  for (var i = (parts[0] === 'GM' || parts[0] === 'vars' ? 1 : 0); i < parts.length - 1; i++) {
    if (obj === undefined) return;
    obj = obj[parts[i]];
  }

  var lastKey = parts[parts.length - 1];

  // 如果是变量对象，设置 value
  if (obj[lastKey] && typeof obj[lastKey] === 'object' && obj[lastKey].value !== undefined) {
    obj[lastKey].value = value;
  } else {
    obj[lastKey] = value;
  }
}

/**
 * 辅助函数：获取当前年份
 */
function getCurrentYear() {
  if (!P.time) return 0;
  if (typeof calcDateFromTurn === 'function') return calcDateFromTurn(GM.turn || 1).adYear;
  var dpv = (typeof _getDaysPerTurn === 'function') ? _getDaysPerTurn() : 30;
  var yearOffset = Math.floor(((GM.turn || 1) - 1) * dpv / 365);
  return (P.time.year || 0) + yearOffset;
}

/**
 * 辅助函数：获取当前月份
 */
function getCurrentMonth() {
  if (!P.time) return 1;
  if (typeof calcDateFromTurn === 'function') return calcDateFromTurn(GM.turn || 1).solarMonth;
  var dpv = (typeof _getDaysPerTurn === 'function') ? _getDaysPerTurn() : 30;
  var monthOffset = Math.floor((((GM.turn || 1) - 1) * dpv) / 30);
  return ((P.time.startMonth || 1) - 1 + monthOffset) % 12 + 1;
}
