# HistorySimAI (崇祯皇帝模拟器) 项目深度分析报告

## 一、项目概览

**项目类型**: 基于 LLM 的历史模拟游戏（崇祯末年背景）
**技术栈**: JavaScript (ES6+), HTML5, CSS3, Node.js (后端代理)
**核心特色**: AI 驱动的动态剧情生成 + 硬编码规则引擎的混合架构

---

## 二、核心架构设计

### 2.1 双模式系统

#### Classic 模式（经典模式）
- **特点**: LLM 自由生成剧情，玩家选择影响游戏状态
- **适用**: 开放式玩法，高自由度
- **数据流**: 玩家选择 → LLM 生成剧情 → 解析效果 → 更新状态

#### Rigid 模式（困难模式）
- **特点**: 硬编码规则引擎，精确的数值计算和触发器系统
- **适用**: 挑战性玩法，历史还原度高
- **核心机制**:
  - **决策验证**: 罢朝期间只能执行复朝决策
  - **执行折扣**: 六科封驳、内阁票拟、司礼监批红、六部执行、地方落实的多层衰减
  - **阈值触发**: 阻力、暗杀风险、罢朝等级的自动触发
  - **历史事件**: 时间线驱动的历史事件（如袁崇焕案、己巳之变）
  - **分支选择**: 历史节点的多分支决策

### 2.2 状态管理系统

```javascript
// 核心状态结构
const state = {
  // 基础信息
  currentDay: 1,
  currentPhase: "morning",  // morning/afternoon/evening
  currentMonth: 4,
  currentYear: 3,  // 相对年份（崇祯3年）

  // 国家状态
  nation: {
    treasury: 500000,        // 国库银两
    grain: 30000,            // 粮食储备
    militaryStrength: 60,    // 军事实力
    civilMorale: 35,         // 民心
    borderThreat: 75,        // 边患威胁
    disasterLevel: 70,       // 灾害程度
    corruptionLevel: 80      // 腐败程度
  },

  // 角色系统
  allCharacters: [],         // 所有角色
  ministers: [],             // 在朝大臣（派生）
  appointments: {},          // 职位任命映射
  characterStatus: {},       // 角色状态（生死）
  loyalty: {},               // 忠诚度映射

  // 派系系统
  factions: [],              // 派系列表
  factionSupport: {},        // 派系支持度
  partyStrife: 62,           // 党争激烈度

  // 核心玩法系统
  prestige: 58,              // 威望
  executionRate: 72,         // 执行力
  unrest: 18,                // 动乱程度
  taxPressure: 52,           // 税收压力

  // 进阶系统
  playerAbilities: {         // 玩家能力
    management: 0,
    military: 0,
    scholarship: 0,
    politics: 0
  },
  unlockedPolicies: [],      // 已解锁国策
  customPolicies: [],        // 自定义国策
  hostileForces: [],         // 敌对势力

  // 季度议程系统
  currentQuarterAgenda: [],  // 当前季度议题
  currentQuarterFocus: null, // 选定的议题焦点
  pendingConsequences: [],   // 待触发后果

  // 省级数据
  provinceStats: {},         // 省级经济民生数据

  // Rigid 模式专属
  rigid: {
    calendar: { year: 1627, month: 8, turn: 1 },
    court: {
      resistance: 50,        // 朝堂阻力
      factionFight: 40,      // 派系斗争
      authority: 60,         // 皇权威信
      refuteTimes: 0         // 封驳次数
    },
    chongZhen: {
      anxiety: 30,           // 焦虑度
      distrust: 25,          // 猜忌度
      exposureRisk: 20,      // 暴露风险
      assassinateRisk: 15    // 暗杀风险
    },
    offendScores: {          // 得罪分数
      scholar: 0,
      general: 0,
      eunuch: 0,
      royal: 0,
      people: 0
    },
    strikeLevel: 0,          // 罢朝等级
    pendingEvents: [],       // 待触发历史事件
    eventHistory: [],        // 已触发事件历史
    memoryAnchors: [],       // 记忆锚点
    executionConstraints: [] // 执行约束记录
  }
};
```

---

## 三、核心系统详解

### 3.1 角色与任命系统

#### 角色数据结构
```javascript
{
  id: "bi_ziyan",
  name: "毕自严",
  courtesyName: "景曾",
  birthYear: 1569,
  deathYear: 1638,
  hometown: "山东淄川",
  positions: ["hubu_shangshu"],
  faction: "donglin",
  factionLabel: "东林党",
  loyalty: 20,
  isAlive: true,
  tags: ["理财能手", "户部尚书", "清廉"],
  summary: "...",
  attitude: "...",
  openingLine: "..."
}
```

#### 任命系统特点
- **职位持久化**: 职位独立于角色存在
- **自动派生**: ministers 数组从 appointments 自动派生
- **生死管理**: characterStatus 追踪角色生死状态
- **职位空缺**: 角色死亡自动清空职位

### 3.2 派系系统

#### 五大派系
1. **东林党** (donglin): 江南士大夫，主张清廉、轻徭薄赋
2. **阉党余部** (eunuch): 魏忠贤残余势力，善于权术
3. **中立派** (neutral): 务实官员，不参与党争
4. **军事将领** (military): 统兵在外，关注军饷
5. **帝党** (imperial): 内廷力量，唯皇命是从

#### 派系支持度计算
```javascript
// 根据玩家选择动态调整
if (tags.relief) {
  add("donglin", 5);
  add("neutral", 2);
}
if (tags.tax) {
  add("military", 4);
  add("donglin", -6);
}
```

#### 党争计算
```javascript
// 基于派系支持度的离散程度
const spread = Math.max(...values) - Math.min(...values);
partyStrife = currentValue * 0.55 + spread * 0.5;
```

### 3.3 国策系统（Policy System）

#### 国策树结构
- **6 大分支**: 内政、军事、政治、科技、外交、民生
- **渐进解锁**: 每个国策需要前置国策
- **点数消耗**: 每季度获得 1 点国策点
- **效果叠加**: 多个国策效果累加

#### 国策效果示例
```javascript
{
  id: "civil_tax_reform",
  branch: "内政",
  title: "税制改革",
  cost: 1,
  requires: ["civil_light_tax"],
  description: "稳定财政，打击偷税漏税",
  effects: {
    quarterlyTreasuryRatio: +0.12  // 季度财政收入 +12%
  }
}
```

#### 自定义国策
- **AI 提取**: 从诏书文本中提取"定为国策"的内容
- **自动分类**: 根据关键词推断类别（军事/农业/财政/治理）
- **效果计算**: 按类别给予固定加成

### 3.4 季度议程系统（Quarter Agenda）

#### 议程生成逻辑
```javascript
// 根据当前局势动态生成 3-5 个议题
if (nation.treasury < 400000) {
  pushAgenda("fiscal_gap", "军饷与财政缺口", "财政已逼近红线", ["财政", "军饷"], "急");
}
if (nation.grain < 25000) {
  pushAgenda("relief_shaanxi", "陕西赈灾与安民", "粮储偏低", ["民心", "粮储"], "急");
}
```

#### 议题焦点机制
- **四种立场**: support（支持）、compromise（妥协）、oppose（反对）、suppress（压制）
- **效果调整**: 根据立场调整税压、动乱、党争、威望
- **派系影响**: 选择焦点会影响对应派系的支持度

### 3.5 敌对势力系统（Hostile Forces）

#### 势力数据结构
```javascript
{
  id: "hostile_houjin",
  name: "后金(清)",
  leader: "皇太极",
  status: "暂无情报",
  level: "critical",
  power: 88,              // 势力值 0-100
  isDefeated: false,
  storylineTag: "后金(清)_线",
  defeatedYear: null,
  defeatedMonth: null
}
```

#### 军事打击机制
```javascript
// 基础伤害 = 6 + 军事能力 * 1.5 + 国策加成
const baseDamage = 6 + militaryLevel * 1.5 + policyBonus.militaryDamageFlat;

// 失败反弹
if (isMilitaryFailure) {
  force.power += Math.round(damage * 0.7);
  effectsPatch.borderThreat += Math.round(damage / 3);
}

// 成功削弱
force.power -= damage;
if (force.power <= 0) {
  force.isDefeated = true;
  // 关闭相关故事线
  closedStorylines.push(force.storylineTag);
}
```

### 3.6 省级经济系统（Province Stats）

#### 省级数据结构
```javascript
{
  "陕西": {
    taxSilver: 50000,      // 税银
    taxGrain: 8000,        // 税粮
    recruits: 2000,        // 可征兵数
    morale: 50,            // 民心
    corruption: 50,        // 腐败
    disaster: 50,          // 灾害
    __baseTaxSilver: 50000,  // 基础值（用于计算）
    __baseTaxGrain: 8000,
    __baseRecruits: 2000
  }
}
```

#### 动态演化
```javascript
// 每回合根据国家状态调整省级数据
const moraleTarget = (nation.civilMorale || 50) - unrest * 0.12;
const corruptionTarget = (nation.corruptionLevel || 50) + partyStrife * 0.1;

// 税收受民心、腐败、灾害影响
const taxFactor = 0.95 + (morale - 50) / 220 - (corruption - 50) / 240 - (disaster - 50) / 280;
const nextTaxSilver = Math.round(baseTaxSilver * taxFactor);
```

---

## 四、Rigid 模式核心机制

### 4.1 执行折扣系统

#### 多层衰减
```javascript
// 1. 六科封驳检查
const sixkePass = resistance < 70 && refuteTimes < 3;

// 2. 内阁票拟折扣
const neigeRate = 0.85 - resistance * 0.003;

// 3. 司礼监批红折扣
const silijianRate = 0.9 - distrust * 0.004;

// 4. 六部执行折扣
const libuRate = 0.88 - factionFight * 0.003;

// 5. 地方落实折扣
const localRate = 0.82 - exposureRisk * 0.004;

// 最终执行率
const finalMultiplier = neigeRate * silijianRate * libuRate * localRate;
```

### 4.2 阈值触发系统

#### 触发器配置
```javascript
{
  resistance: {
    thresholds: [
      { level: 70, event: "strike_level_1", message: "朝堂阻力过大，百官开始消极怠工" },
      { level: 85, event: "strike_level_2", message: "阻力达到临界，部分官员拒绝上朝" }
    ]
  },
  assassinateRisk: {
    thresholds: [
      { level: 60, event: "assassinate", message: "暗杀风险过高，发生刺杀事件" }
    ]
  }
}
```

### 4.3 历史事件系统

#### 事件数据结构
```javascript
{
  id: "yuan_chonghua_case",
  name: "袁崇焕案",
  triggerYear: 1630,
  triggerMonth: 8,
  type: "branch",  // 分支事件
  branches: [
    {
      id: "execute",
      name: "处死袁崇焕",
      impact: {
        court: { resistance: -15, authority: 10 },
        chongZhen: { distrust: 8 },
        offend: { general: 15, scholar: 10 }
      }
    },
    {
      id: "exile",
      name: "流放边疆",
      impact: {
        court: { resistance: -8, authority: 5 },
        chongZhen: { distrust: 5 },
        offend: { general: 8, scholar: 5 }
      }
    }
  ]
}
```

### 4.4 记忆锚点系统

#### 锚点结构
```javascript
{
  turn: 15,
  year: 1628,
  month: 2,
  summary: "诏令'增加辽饷'已入档，阻力65，暗杀风险42%",
  snapshot: {
    resistance: 65,
    assassinateRisk: 42,
    authority: 58
  }
}
```

#### 用途
- **AI 上下文**: 提供历史决策记录给 LLM
- **趋势分析**: 追踪关键指标变化
- **回溯调试**: 定位问题决策点

---

## 五、AI 集成架构

### 5.1 LLM 代理服务

#### 后端配置
```javascript
// server/config.json
{
  "LLM_API_KEY": "your_api_key",
  "LLM_API_BASE": "https://open.bigmodel.cn/api/paas/v4",
  "LLM_MODEL": "glm-4-flash",
  "LLM_CHAT_MODEL": "glm-4-flash",
  "PORT": 3002
}
```

#### 接口路由
- `/api/chongzhen/story`: 诏书剧情生成
- `/api/chongzhen/ministerChat`: 朝堂大臣对话

### 5.2 请求上下文构建

#### 剧情生成上下文
```javascript
{
  // 基础信息
  currentYear: 3,
  currentMonth: 4,
  currentPhase: "morning",

  // 国家状态
  nation: { treasury, grain, militaryStrength, ... },

  // 角色信息
  ministers: [...],
  loyalty: {...},

  // 历史记录
  storyHistory: [...],
  lastChoice: "...",

  // Rigid 模式专属
  rigid: {
    court: {...},
    chongZhen: {...},
    memoryAnchors: [...]
  },

  // 故事事实（Story Facts）
  storyFacts: {
    keyCharacters: [...],
    recentEvents: [...],
    currentCrisis: [...]
  }
}
```

### 5.3 效果解析系统

#### 从 LLM 响应中提取效果
```javascript
// 解析选项效果
{
  treasury: -50000,
  grain: 2000,
  militaryStrength: 5,
  civilMorale: -3,
  loyalty: {
    "bi_ziyan": 5,
    "wen_tiren": -3
  },
  appointments: {
    "hubu_shangshu": "new_minister_id"
  },
  hostileDamage: {
    "hostile_houjin": 10
  }
}
```

---

## 六、可借鉴的核心设计

### 6.1 双模式架构
**适用场景**: 需要同时支持自由玩法和挑战玩法的游戏

**实现要点**:
- Classic 模式：AI 自由发挥，规则宽松
- Rigid 模式：硬编码规则，数值精确
- 共享状态结构，模式切换无缝

### 6.2 季度议程系统
**适用场景**: 需要引导玩家关注当前局势的策略游戏

**实现要点**:
- 根据当前状态动态生成议题
- 玩家选择焦点议题和立场
- 立场影响效果和派系关系
- 季度结算给予奖励

### 6.3 敌对势力系统
**适用场景**: 需要长期军事目标的游戏

**实现要点**:
- 势力值 0-100，可持续削弱
- 军事失败会导致势力反弹
- 势力灭亡关闭相关故事线
- 与边患威胁联动

### 6.4 省级经济系统
**适用场景**: 需要地区差异化的游戏

**实现要点**:
- 每个省份独立的经济民生数据
- 根据国家状态动态演化
- 税收受民心、腐败、灾害影响
- 保留基础值用于计算

### 6.5 国策树系统
**适用场景**: 需要长期发展路线的游戏

**实现要点**:
- 多分支国策树，渐进解锁
- 国策效果叠加计算
- 支持自定义国策（AI 提取）
- 效果上限（避免过度强化）

### 6.6 执行力系统
**适用场景**: 需要模拟政令执行难度的游戏

**实现要点**:
- 威望影响执行力
- 执行力影响效果衰减
- 玩家能力和国策可提升执行力
- 执行力上限（避免过度强化）

### 6.7 记忆锚点系统
**适用场景**: 需要 AI 记住历史决策的游戏

**实现要点**:
- 每回合记录关键状态快照
- 提供给 LLM 作为上下文
- 限制数量（最近 10 条）
- 包含摘要和数值快照

---

## 七、与天命游戏的对比

### 7.1 相似之处
- 都是历史模拟游戏
- 都有角色、派系、任命系统
- 都有国家状态管理
- 都支持 AI 生成内容

### 7.2 差异之处

| 维度 | HistorySimAI | 天命游戏 |
|------|-------------|---------|
| **时代背景** | 单一朝代（崇祯末年） | 跨朝代（秦汉到明清） |
| **玩法模式** | 双模式（Classic + Rigid） | 单一模式 |
| **规则引擎** | Rigid 模式有完整规则引擎 | 规则较为简单 |
| **地图系统** | 无地图 | 有多边形地图系统 |
| **军事系统** | 抽象的敌对势力 | 具体的军队和战斗 |
| **经济系统** | 省级经济 + 季度结算 | 势力经济 + 回合结算 |
| **时间系统** | 月度推进 + 三时段 | 回合推进 |
| **国策系统** | 完整的国策树 | 无国策系统 |
| **议程系统** | 季度议程 + 焦点选择 | 无议程系统 |

### 7.3 可引入天命的特性

#### 高优先级
1. **季度议程系统**: 引导玩家关注当前局势
2. **国策树系统**: 提供长期发展路线
3. **执行力系统**: 增加政令执行的真实感
4. **省级经济系统**: 增加地区差异化

#### 中优先级
5. **敌对势力系统**: 改进当前的军队系统
6. **记忆锚点系统**: 改进 AI 上下文
7. **自定义国策**: AI 提取玩家创新政策

#### 低优先级
8. **Rigid 模式**: 可选的困难模式
9. **三时段系统**: 细化回合内的时间流逝

---

## 八、实施建议

### 8.1 第一阶段：基础系统引入

#### 任务 1: 执行力系统
```javascript
// 在 GM 对象中添加
GM.prestige = 58;  // 威望
GM.executionRate = 72;  // 执行力

// 计算执行力
function computeExecutionRate(prestige) {
  if (prestige >= 80) return 95;
  if (prestige >= 50) return 70 + Math.round((prestige - 50) / 3);
  return 50 - Math.round((50 - prestige) / 2);
}

// 应用执行力折扣
function applyExecutionDiscount(effects, executionRate) {
  const ratio = executionRate / 100;
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'number') {
      effects[key] = Math.round(value * ratio);
    }
  }
  return effects;
}
```

#### 任务 2: 国策树系统
- 创建 6 大分支国策树数据
- 实现国策解锁逻辑
- 实现国策效果计算
- 添加编辑器配置界面

#### 任务 3: 季度议程系统
- 实现议程生成逻辑
- 实现焦点选择机制
- 实现立场效果计算
- 添加季度结算奖励

### 8.2 第二阶段：高级系统引入

#### 任务 4: 省级经济系统
- 为每个地区添加省级数据
- 实现动态演化逻辑
- 实现税收计算
- 添加可视化展示

#### 任务 5: 敌对势力系统
- 重构当前军队系统
- 实现势力值机制
- 实现军事打击计算
- 实现故事线关闭

#### 任务 6: 记忆锚点系统
- 实现锚点记录逻辑
- 集成到 AI 上下文
- 限制锚点数量
- 添加可视化展示

### 8.3 第三阶段：可选系统引入

#### 任务 7: Rigid 模式（可选）
- 实现执行折扣系统
- 实现阈值触发系统
- 实现历史事件系统
- 添加模式切换

---

## 九、总结

HistorySimAI 项目展示了一个成熟的历史模拟游戏架构，其核心优势在于：

1. **双模式设计**: 兼顾自由度和挑战性
2. **精细的数值系统**: Rigid 模式的多层衰减和阈值触发
3. **动态议程系统**: 引导玩家关注当前局势
4. **完整的国策树**: 提供长期发展路线
5. **省级经济系统**: 增加地区差异化
6. **AI 集成架构**: 清晰的上下文构建和效果解析

这些设计可以显著提升天命游戏的深度和可玩性，建议分阶段引入，优先实施执行力系统、国策树系统和季度议程系统。
