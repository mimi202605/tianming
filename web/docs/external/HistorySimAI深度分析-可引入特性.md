# HistorySimAI 深度分析 - 可引入天命游戏的特性

## 一、核心发现总结

通过深度分析 HistorySimAI（崇祯皇帝模拟器）项目，发现以下可引入天命游戏的高价值特性：

### 1. 刚性触发系统（Rigid Triggers）
**文件**: `rigidTriggers.json`

**核心机制**:
- **阈值触发**: 当某个指标达到阈值时自动触发事件
  - 暗杀风险阈值: 40
  - 曝光阈值: 30
  - 罢朝阈值: 80（分3级）
- **罢朝分级系统**:
  - 1级: 阻力80触发，72解除，持续1回合
  - 2级: 阻力90触发，66解除，持续2回合
  - 3级: 阻力96触发，60解除，持续3回合
- **硬性下限（Hard Floors）**: 某些指标不能低于特定值
  - 朝廷阻力: 最低15
  - 党争: 最低20
  - 皇帝焦虑: 最低20
- **禁止科技关键词**: 防止AI生成不符合时代的科技（蒸汽机、后装枪、电报等）

**引入价值**: ⭐⭐⭐⭐⭐
- 为天命游戏提供自动化的危机管理系统
- 增加游戏的紧张感和策略深度
- 防止玩家过度优化导致游戏失衡

**实施建议**:
```javascript
// 在 index.html 中添加
GM.rigidTriggers = {
  rebellionThreshold: 80,      // 叛乱阈值
  assassinationThreshold: 40,  // 暗杀阈值
  strikeThreshold: 80,         // 罢朝阈值
  strikeLevels: [
    {level: 1, trigger: 80, release: 72, duration: 1},
    {level: 2, trigger: 90, release: 66, duration: 2},
    {level: 3, trigger: 96, release: 60, duration: 3}
  ],
  hardFloors: {
    unrest: 15,           // 民变最低值
    partyStrife: 20,      // 党争最低值
    anxiety: 20           // 焦虑最低值
  }
};

function checkRigidTriggers() {
  var triggers = [];

  // 检查叛乱阈值
  if (GM.unrest >= GM.rigidTriggers.rebellionThreshold) {
    triggers.push({
      type: 'rebellion',
      title: '民变爆发',
      description: '民心过低，各地爆发叛乱'
    });
  }

  // 检查暗杀阈值
  if (GM.anxiety >= GM.rigidTriggers.assassinationThreshold) {
    triggers.push({
      type: 'assassination',
      title: '暗杀风险',
      description: '焦虑过高，面临暗杀风险'
    });
  }

  // 检查罢朝阈值
  for (var i = 0; i < GM.rigidTriggers.strikeLevels.length; i++) {
    var level = GM.rigidTriggers.strikeLevels[i];
    if (GM.partyStrife >= level.trigger && !GM.strikeActive) {
      GM.strikeActive = true;
      GM.strikeLevel = level.level;
      GM.strikeDuration = level.duration;
      triggers.push({
        type: 'strike',
        title: level.level + '级罢朝',
        description: '党争激烈，大臣罢朝' + level.duration + '回合'
      });
    }
  }

  return triggers;
}
```

---

### 2. 历史事件系统（Rigid History Events）
**文件**: `rigidHistoryEvents.json`

**核心机制**:
- **时间触发**: 特定年月自动触发历史事件
- **分支选择**: 部分事件提供多个选项，每个选项有不同的影响
- **多维度影响**: 事件影响朝廷、军事、财政、民生等多个维度
- **事件链**: 事件之间有因果关系，形成历史叙事

**示例事件**:
1. **铲除魏忠贤余党**（1627年10月）
   - 影响: 威望+6，党争+8，焦虑+4

2. **平台召对**（1628年2月）- 有分支选择
   - 选项A: 力主清议肃贪 → 阻力+4，党争+5，威望+2，焦虑+3
   - 选项B: 折中调停两派 → 阻力-2，威望-2，不信任+2

3. **陕西饥荒扩大**（1631年7月）- 有分支选择
   - 选项A: 优先赈灾 → 国库-10，粮食危机-8，辽东士气-4
   - 选项B: 优先军费 → 军费欠款-1，辽东士气+5，叛军规模+3，粮食危机+6

**引入价值**: ⭐⭐⭐⭐⭐
- 为天命游戏提供丰富的历史叙事
- 增加玩家的决策深度和重玩价值
- 可以根据不同朝代配置不同的历史事件

**实施建议**:
```javascript
// 在 P 对象中添加历史事件配置
P.rigidHistoryEvents = [
  {
    id: 'qin_unification',
    name: '统一六国',
    description: '秦王政完成统一大业，但如何治理这个庞大帝国？',
    trigger: {year: -221, month: 1},
    impact: {
      prestige: 20,
      centralization: 15,
      unrest: 10
    },
    branches: [
      {
        id: 'centralize',
        name: '推行郡县制',
        hint: '加强中央集权，但会引发旧贵族不满',
        impact: {
          centralization: 20,
          partyStrife: 15,
          executionRate: 10
        }
      },
      {
        id: 'feudal',
        name: '分封诸子',
        hint: '安抚旧贵族，但削弱中央权力',
        impact: {
          centralization: -10,
          partyStrife: -5,
          stability: 10
        }
      }
    ]
  }
];

function checkHistoryEvents() {
  var currentYear = GM.calendar.year;
  var currentMonth = GM.calendar.month;

  P.rigidHistoryEvents.forEach(function(event) {
    if (event.trigger.year === currentYear &&
        event.trigger.month === currentMonth &&
        !GM.triggeredEvents.includes(event.id)) {

      GM.triggeredEvents.push(event.id);

      if (event.branches && event.branches.length > 0) {
        // 显示分支选择UI
        showEventBranchChoice(event);
      } else {
        // 直接应用影响
        applyEventImpact(event.impact);
        addEB('历史', event.name + ': ' + event.description);
      }
    }
  });
}
```

---

### 3. 记忆系统优化（Memory System）
**文件**: `memory.js`

**核心机制**:
- **记忆锚点（Memory Anchor）**: 记录每回合的关键状态
  - 回合数、年月
  - 局势摘要
  - 风险指标（阻力、焦虑、暗杀风险）
  - 时间戳
- **执行约束记录（Execution Constraint）**: 记录每次决策的执行情况
  - 各层级执行率（内阁、司礼监、六部、地方）
  - 是否被封驳
  - 封驳次数
  - 反弹类型
  - 触发的阈值事件
  - 历史分支事件
- **自动裁剪**: 只保留最近40条记录，避免内存溢出
- **结构化存储**: 便于AI读取和分析

**引入价值**: ⭐⭐⭐⭐
- 优化现有的记忆锚点系统
- 提供更详细的历史记录供AI推演
- 支持玩家回顾历史决策

**实施建议**:
```javascript
// 优化现有的 createMemoryAnchor 函数
function createMemoryAnchor(summary, context) {
  var anchor = {
    turn: GM.turn,
    year: GM.calendar ? GM.calendar.year : 0,
    month: GM.calendar ? GM.calendar.month : 0,
    summary: summary || '局势继续演化',
    risk: {
      unrest: Math.round(GM.unrest || 0),
      partyStrife: Math.round(GM.partyStrife || 0),
      anxiety: Math.round(GM.anxiety || 0),
      assassinationRisk: Math.round(GM.assassinationRisk || 0)
    },
    executionRate: Math.round(GM.executionRate || 100),
    prestige: Math.round(GM.prestige || 50),
    timestamp: new Date().toISOString()
  };

  // 添加到记忆列表
  if (!GM.memoryAnchors) GM.memoryAnchors = [];
  GM.memoryAnchors.push(anchor);

  // 只保留最近40条
  if (GM.memoryAnchors.length > 40) {
    GM.memoryAnchors = GM.memoryAnchors.slice(-40);
  }

  return anchor;
}

// 创建执行约束记录
function createExecutionConstraint(decision, executionRates, triggers) {
  var constraint = {
    turn: GM.turn,
    year: GM.calendar ? GM.calendar.year : 0,
    month: GM.calendar ? GM.calendar.month : 0,
    decision: decision,
    executionRates: executionRates || {
      cabinet: 100,
      eunuch: 100,
      ministry: 100,
      local: 100,
      final: 100
    },
    hadRefute: executionRates.final < 50,
    refuteTimes: GM.refuteTimes || 0,
    triggeredThresholds: triggers || [],
    timestamp: new Date().toISOString()
  };

  if (!GM.executionConstraints) GM.executionConstraints = [];
  GM.executionConstraints.push(constraint);

  if (GM.executionConstraints.length > 40) {
    GM.executionConstraints = GM.executionConstraints.slice(-40);
  }

  return constraint;
}
```

---

### 4. 目标追踪系统（Goal Panel）
**文件**: `goalPanel.js`, `goals.json`

**核心机制**:
- **多目标管理**: 同时追踪多个游戏目标
- **目标状态**: 未完成、追踪中、已完成
- **动态检查**: 每回合自动检查目标完成情况
- **UI交互**: 玩家可以选择追踪特定目标
- **自动切换**: 目标完成后自动取消追踪

**目标类型**（HistorySimAI中的7个目标）:
1. **生存目标**: 维持政权稳定
2. **财政目标**: 国库达到特定数值
3. **民心目标**: 民心达到特定水平
4. **忠诚目标**: 大臣忠诚度达标
5. **边防目标**: 边境安全
6. **议事目标**: 朝堂和谐
7. **消灭外患**: 消灭敌对势力

**引入价值**: ⭐⭐⭐⭐
- 为玩家提供明确的游戏目标
- 增加游戏的可玩性和成就感
- 可以根据不同朝代配置不同的目标

**实施建议**:
```javascript
// 在 GM 对象中添加目标系统
GM.goals = [
  {
    id: 'unify_china',
    title: '统一天下',
    description: '消灭所有敌对势力，统一中国',
    type: 'military',
    condition: function() {
      return GM.facs.filter(function(f) {
        return f.name !== playerFactionName && f.militaryForce > 0;
      }).length === 0;
    }
  },
  {
    id: 'prosperity',
    title: '国富民强',
    description: '国库达到10000，民心达到80',
    type: 'economy',
    condition: function() {
      var playerFac = findFacByName(playerFactionName);
      return playerFac && playerFac.money >= 10000 && GM.stability >= 80;
    }
  },
  {
    id: 'centralization',
    title: '中央集权',
    description: '集权度达到90',
    type: 'political',
    condition: function() {
      return GM.eraState && GM.eraState.centralization >= 90;
    }
  }
];

GM.trackedGoalId = null; // 当前追踪的目标ID

function checkGoalCompleted(goalId) {
  var goal = GM.goals.find(function(g) { return g.id === goalId; });
  if (!goal) return false;
  return goal.condition();
}

function openGoalPanel() {
  var html = '<div class="modal-overlay" onclick="closeGoalPanel()">';
  html += '<div class="modal-content" onclick="event.stopPropagation()">';
  html += '<h2>治国目标</h2>';
  html += '<div class="goal-list">';

  GM.goals.forEach(function(goal) {
    var completed = checkGoalCompleted(goal.id);
    var tracked = !completed && GM.trackedGoalId === goal.id;

    html += '<div class="goal-item' +
            (completed ? ' goal-completed' : '') +
            (tracked ? ' goal-tracked' : '') + '">';
    html += '<div class="goal-status">';
    if (completed) {
      html += '<span class="goal-tag goal-tag-done">已完成</span>';
    } else {
      html += '<span class="goal-tag' + (tracked ? ' goal-tag-active' : '') +
              '" onclick="toggleGoalTracking(\'' + goal.id + '\')">' +
              (tracked ? '追踪中' : '追踪') + '</span>';
    }
    html += '</div>';
    html += '<div class="goal-info">';
    html += '<div class="goal-title">' + goal.title + '</div>';
    html += '<div class="goal-desc">' + goal.description + '</div>';
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  html += '<button onclick="closeGoalPanel()">关闭</button>';
  html += '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

function toggleGoalTracking(goalId) {
  if (GM.trackedGoalId === goalId) {
    GM.trackedGoalId = null;
  } else {
    GM.trackedGoalId = goalId;
  }
  closeGoalPanel();
  openGoalPanel();
}
```

---

### 5. 禁止科技关键词系统
**文件**: `rigidTriggers.json`

**核心机制**:
- **关键词过滤**: 防止AI生成不符合时代的科技
- **硬性约束**: 在AI推演前过滤掉禁止的关键词
- **可配置**: 根据不同朝代配置不同的禁止关键词

**禁止关键词列表**（HistorySimAI中的10个）:
1. 蒸汽机
2. 后装枪
3. 电报
4. 内燃机
5. 铁路快枪
6. 马克沁机枪
7. 坦克
8. 飞机
9. 无线电台
10. 现代化工炸药

**引入价值**: ⭐⭐⭐⭐
- 保证游戏的历史真实性
- 防止AI生成不合理的科技
- 提升玩家的沉浸感

**实施建议**:
```javascript
// 在 P 对象中添加禁止科技关键词
P.forbiddenTechKeywords = [
  // 秦汉时期禁止
  '火药', '指南针', '印刷术', '造纸术',
  // 唐宋时期禁止
  '蒸汽机', '电报', '铁路',
  // 明清时期禁止
  '后装枪', '马克沁机枪', '坦克', '飞机', '无线电台'
];

// 在AI推演前过滤
function filterAIResponse(response) {
  var filtered = response;
  P.forbiddenTechKeywords.forEach(function(keyword) {
    if (filtered.includes(keyword)) {
      console.warn('检测到禁止科技关键词: ' + keyword);
      filtered = filtered.replace(new RegExp(keyword, 'g'), '[不符合时代的科技]');
    }
  });
  return filtered;
}

// 在 callAI 函数中集成
function callAI(prompt, callback) {
  // ... 原有代码 ...

  // 在收到AI响应后过滤
  var filteredResponse = filterAIResponse(response);
  callback(filteredResponse);
}
```

---

## 二、实施优先级建议

### 高优先级（立即实施）⭐⭐⭐⭐⭐
1. **刚性触发系统** - 提供自动化危机管理
2. **历史事件系统** - 增加历史叙事和决策深度

### 中优先级（近期实施）⭐⭐⭐⭐
3. **记忆系统优化** - 改进现有记忆锚点系统
4. **目标追踪系统** - 提供明确的游戏目标
5. **禁止科技关键词** - 保证历史真实性

### 低优先级（可选实施）⭐⭐⭐
6. **大臣对话系统** - 增加角色互动（需要大量对话模板）
7. **朝堂议事系统** - 增加政治玩法（需要复杂的UI）

---

## 三、实施计划

### 阶段一：刚性触发系统（1-2天）
- [ ] 在 GM 对象中添加 rigidTriggers 配置
- [ ] 实现 checkRigidTriggers() 函数
- [ ] 在 endTurn() 中集成触发检查
- [ ] 添加触发事件的UI显示
- [ ] 测试各种阈值触发情况

### 阶段二：历史事件系统（2-3天）
- [ ] 在 P 对象中添加 rigidHistoryEvents 配置
- [ ] 为不同朝代配置历史事件（秦/汉/唐/宋/明/清）
- [ ] 实现 checkHistoryEvents() 函数
- [ ] 实现事件分支选择UI
- [ ] 实现事件影响应用逻辑
- [ ] 在 endTurn() 中集成事件检查
- [ ] 测试事件触发和分支选择

### 阶段三：记忆系统优化（1天）
- [ ] 优化 createMemoryAnchor() 函数
- [ ] 实现 createExecutionConstraint() 函数
- [ ] 在决策执行时记录约束
- [ ] 优化 getMemoryAnchorsForAI() 函数
- [ ] 测试记忆系统的性能

### 阶段四：目标追踪系统（1-2天）
- [ ] 在 GM 对象中添加 goals 数组
- [ ] 为不同朝代配置游戏目标
- [ ] 实现 checkGoalCompleted() 函数
- [ ] 实现 openGoalPanel() UI
- [ ] 实现目标追踪切换逻辑
- [ ] 在 endTurn() 中检查目标完成
- [ ] 测试目标系统

### 阶段五：禁止科技关键词（0.5天）
- [ ] 在 P 对象中添加 forbiddenTechKeywords 配置
- [ ] 实现 filterAIResponse() 函数
- [ ] 在 callAI() 中集成过滤逻辑
- [ ] 测试关键词过滤

---

## 四、代码集成示例

### 在 index.html 的 endTurn() 函数中集成所有系统

```javascript
function endTurn() {
  if (GM.busy) return;
  GM.busy = true;

  // ... 原有代码 ...

  // 6.9 检查刚性触发（新增）
  var triggers = checkRigidTriggers();
  if (triggers.length > 0) {
    triggers.forEach(function(trigger) {
      addEB('系统', trigger.title + ': ' + trigger.description);
      applyTriggerImpact(trigger);
    });
  }

  // 6.10 检查历史事件（新增）
  checkHistoryEvents();

  // 6.11 创建记忆锚点（优化）
  var summary = generateTurnSummary();
  createMemoryAnchor(summary, {
    triggers: triggers,
    events: GM.lastHistoryEvents || []
  });

  // 6.12 检查目标完成（新增）
  if (GM.trackedGoalId && checkGoalCompleted(GM.trackedGoalId)) {
    addEB('成就', '目标达成: ' + GM.goals.find(function(g) {
      return g.id === GM.trackedGoalId;
    }).title);
    GM.trackedGoalId = null;
  }

  // ... 原有代码 ...

  GM.busy = false;
}
```

---

## 五、总结

通过深度分析 HistorySimAI 项目，我们发现了5个高价值的可引入特性：

1. **刚性触发系统** - 自动化危机管理，增加游戏紧张感
2. **历史事件系统** - 丰富历史叙事，增加决策深度
3. **记忆系统优化** - 改进AI推演上下文
4. **目标追踪系统** - 提供明确的游戏目标
5. **禁止科技关键词** - 保证历史真实性

这些特性都可以无缝集成到天命游戏中，且不会破坏现有系统。建议按照优先级逐步实施，预计总工作量为5-8天。

实施完成后，天命游戏将具备：
- ✅ 更强的历史真实感
- ✅ 更深的策略深度
- ✅ 更好的AI推演质量
- ✅ 更明确的游戏目标
- ✅ 更自动化的危机管理

这将显著提升游戏的可玩性和玩家体验。
