# KingOfIreland 项目架构分析报告

## 一、核心架构特点

### 1. 数据驱动的 System 架构

**核心组件：**
- `SystemManager`: 系统管理器，负责注册和调度所有系统
- `ISystem`: 系统接口，所有游戏逻辑系统都实现此接口
- `IDataChangeSystem`: 数据变化监听系统
- `IDataCreateSystem`: 数据创建监听系统
- `IDataDeleteSystem`: 数据删除监听系统

**工作原理：**
```csharp
// 1. 通过特性标记监听哪些属性变化
[DataChangeSystem(typeof(Court), "MonthlyTax", "CourtTaxRate")]
public class CourtMonthlyTaxExp_CourtChangeSystem : IDataChangeSystem
{
    public void Excute(IModel model)
    {
        if (model is Court c)
        {
            GameNumCalculation.SetCourtMonthlyTaxExp(c);
        }
    }
}

// 2. 数据变化时自动触发相关系统
court.ChangeAndExcute(c => c.MonthlyTax, newValue);
```

**优势：**
- 解耦：业务逻辑与数据模型分离
- 自动化：数据变化自动触发相关计算
- 可扩展：新增系统只需实现接口并添加特性
- 性能优化：只在数据变化时才执行相关逻辑

### 2. 人物-头衔-封地系统（Character-Title-Court）

**核心模型：**

```csharp
// Character: 人物
public class Character : ICommonModel, IModel
{
    public int Id { get; private set; }
    public string Name { get; private set; }
    public int CourtId { get; private set; }  // 所属宫廷
    public float GoldCoin { get; private set; }
}

// Title: 头衔（男爵领、伯国、公国、王国）
public class Title : ICommonModel, IModel
{
    public int Id { get; private set; }
    public string Name { get; private set; }
    public TitleLevelEnum TitleLevel { get; private set; }
    public int HigherTitle { get; private set; }  // 上级头衔
    public int Hold_Court { get; private set; }   // 持有者宫廷
    public List<int> LowerTitles { get; private set; }  // 下级头衔
}

// Court: 宫廷（管理领地和封臣）
public class Court : ICommonModel, IModel
{
    public int Id { get; private set; }
    public int HolderId { get; private set; }  // 领主
    public int HigherCourtId { get; private set; }  // 上级宫廷
    public List<int> BaronyTitles { get; private set; }  // 直辖男爵领
    public List<int> LowerCourts { get; private set; }  // 下级宫廷（封臣）
    public List<int> SeniorTitles { get; private set; }  // 高级头衔
    public float MonthlyTax { get; private set; }  // 月收入
    public float CourtTaxRate { get; private set; }  // 税率
}

// Barony: 男爵领（最小领地单位）
public class Barony : ICommonModel, IModel
{
    public int Id { get; private set; }
    public string Name { get; private set; }
    public int Holder { get; private set; }  // 持有者
    public float MonthlyTax { get; private set; }
    public float SoldierNum { get; private set; }
}
```

**层级关系：**
```
王国 (Kingdom)
  └─ 公国 (Duchy)
      └─ 伯国 (County)
          └─ 男爵领 (Barony)

宫廷层级：
国王宫廷
  └─ 公爵宫廷（封臣）
      └─ 伯爵宫廷（封臣）
```

**优势：**
- 清晰的封建层级结构
- 头衔与领地分离，支持复杂的继承和转移
- 直辖与封臣系统完整实现
- 税收自动向上汇总

### 3. 经济系统的自动计算

**税收计算链：**
```csharp
// 男爵领税收变化 → 触发宫廷税收重算
[DataChangeSystem(typeof(Barony), "MonthlyTax", "Holder")]
public class CourtMonthlyTax_BaronyChangeSystem : IDataChangeSystem
{
    public void Excute(IModel model)
    {
        var province = model as Barony;
        var court = CourtUtil.GetCourtById(province.Holder);
        GameNumCalculation.SetCourtMonthlyTax(court);
    }
}

// 宫廷税收计算：直辖收入 + 封臣上缴
public static void SetCourtMonthlyTax(Court court)
{
    var monthlyTax = 0f;
    // 直辖男爵领收入
    monthlyTax += court.BaronyTitles.Select(bid =>
        WorldHelper.GetById<Barony>(bid).MonthlyTax).Sum();
    // 封臣上缴
    monthlyTax += court.LowerCourts.Select(cid =>
        CourtUtil.GetCourtById(cid).MonthlyTaxExp).Sum();
    court.ChangeAndExcute(c => c.MonthlyTax, monthlyTax);
}

// 宫廷上缴计算：总收入 × 税率
public static void SetCourtMonthlyTaxExp(Court court)
{
    var monthlyTaxExp = court.MonthlyTax * court.CourtTaxRate;
    court.ChangeAndExcute(c => c.MonthlyTaxExp, monthlyTaxExp);
}
```

**自动级联更新：**
1. 男爵领建筑升级 → MonthlyTax 增加
2. 触发 CourtMonthlyTax_BaronyChangeSystem
3. 重算宫廷 MonthlyTax
4. 触发 CourtMonthlyTaxExp_CourtChangeSystem
5. 重算宫廷 MonthlyTaxExp
6. 触发上级宫廷的 CourtMonthlyTax_LowerCourtChangeSystem
7. 递归向上更新所有上级宫廷

### 4. 军队系统

**军队类型：**
```csharp
// 基础军队
public class Army : ICommonModel, IModel
{
    public int Id { get; private set; }
    public int OwnerCourtId { get; private set; }
    public int LocationBaronyId { get; private set; }
    public float SoldierCurrentNum { get; private set; }
    public float SoldierMaxNum { get; private set; }
    public HashSet<int> LevyArmies { get; set; }  // 征召兵
    public HashSet<int> LowerCourtArmy { get; set; }  // 封臣军队
}

// 征召兵（从领地征召）
public class LevyArmy : ICommonModel, IModel
{
    public int Id { get; private set; }
    public int BaronyId { get; private set; }
    public float SoldierMaxNum { get; private set; }
}

// 封臣军队（从封臣征召）
public class LowerCourtArmy : ICommonModel, IModel
{
    public int Id { get; private set; }
    public int CourtId { get; private set; }
    public float SoldierMaxNum { get; private set; }
}
```

**特点：**
- 军队由征召兵和封臣军队组成
- 征召兵来自直辖领地
- 封臣军队来自下级宫廷
- 支持复杂的军队组合和调度

---

## 二、与天命游戏的对比分析

### 1. 架构对比

| 维度 | KingOfIreland | 天命游戏 | 优劣分析 |
|------|---------------|----------|----------|
| **数据管理** | 数据驱动 + 自动监听 | 手动更新 + 事件日志 | KOI 更自动化，天命更灵活 |
| **系统架构** | SystemManager + ISystem | 函数式 + 全局状态 | KOI 更模块化，天命更简洁 |
| **封建系统** | Court 层级 + Title 系统 | Faction 势力系统 | KOI 更符合封建制，天命更通用 |
| **官制系统** | 无独立官制 | officeTree + Post 系统 | 天命更适合中国古代 |
| **经济系统** | 自动级联计算 | 手动调用 updateEconomy | KOI 更自动，天命更可控 |
| **军队系统** | Army + Levy + LowerCourt | Army + Unit 系统 | 各有特色，可互补 |

### 2. 天命游戏的优势

1. **朝代感知系统**：eraState 支持跨朝代配置，KOI 只针对中世纪欧洲
2. **AI 驱动**：全程 AI 推演，KOI 是规则驱动
3. **官制系统**：完整的中国古代官僚体系，KOI 无此概念
4. **灵活性**：支持自定义剧本和规则，KOI 较固定

### 3. KingOfIreland 的优势

1. **数据驱动架构**：自动化程度高，减少手动维护
2. **封建层级**：Court 系统完美实现封臣关系
3. **性能优化**：只在数据变化时才执行相关逻辑
4. **代码组织**：模块化清晰，易于扩展

---

## 三、可引入天命游戏的改进建议

### 改进方案 1：引入数据监听系统（高优先级）

**目标：** 减少手动维护，提高自动化程度

**实现方案：**

```javascript
// 1. 添加数据变化监听机制
var DataChangeListeners = {
  // 监听角色属性变化
  'character.loyalty': [
    function(char) {
      // 忠诚度变化时自动检查是否需要叛乱
      if (char.loyalty < 30) {
        triggerRebellionCheck(char);
      }
    }
  ],

  // 监听势力财政变化
  'faction.money': [
    function(faction) {
      // 财政变化时自动更新经济繁荣度
      updateEconomicProsperity(faction);
    }
  ],

  // 监听领地税收变化
  'territory.tax': [
    function(territory) {
      // 税收变化时自动更新势力总收入
      var faction = findFacByName(territory.faction);
      recalculateFactionIncome(faction);
    }
  ]
};

// 2. 封装数据变化函数
function changeValue(obj, property, newValue) {
  var oldValue = obj[property];
  obj[property] = newValue;

  // 触发监听器
  var key = getObjectType(obj) + '.' + property;
  var listeners = DataChangeListeners[key];
  if (listeners) {
    listeners.forEach(function(listener) {
      listener(obj, oldValue, newValue);
    });
  }
}

// 3. 使用示例
changeValue(character, 'loyalty', 25);  // 自动触发叛乱检查
changeValue(faction, 'money', 10000);   // 自动更新经济繁荣度
```

**优势：**
- 减少 endTurn 中的手动调用
- 数据变化立即生效
- 易于追踪数据流向

**工作量：** 中等（需要重构部分代码）

---

### 改进方案 2：优化封臣系统（中优先级）

**目标：** 借鉴 Court 系统，完善天命的势力层级关系

**当前问题：**
- 天命的 Faction 系统较扁平，缺少明确的封臣关系
- 税收和军队征召没有层级传递

**改进方案：**

```javascript
// 1. 为 Faction 添加封臣关系
function enhanceFactionSystem() {
  GM.facs.forEach(function(faction) {
    if (!faction.vassals) {
      faction.vassals = [];  // 封臣列表
    }
    if (!faction.liege) {
      faction.liege = null;  // 宗主
    }
    if (!faction.tributeRate) {
      faction.tributeRate = 0.1;  // 贡奉比例
    }
  });
}

// 2. 自动计算层级税收
function calculateHierarchicalTax(faction) {
  var totalTax = 0;

  // 直辖领地收入
  var directTerritories = GM.map.filter(function(t) {
    return t.faction === faction.name && !t.isVassalTerritory;
  });
  totalTax += directTerritories.reduce(function(sum, t) {
    return sum + (t.tax || 0);
  }, 0);

  // 封臣贡奉
  faction.vassals.forEach(function(vassalName) {
    var vassal = findFacByName(vassalName);
    if (vassal) {
      var vassalTax = calculateHierarchicalTax(vassal);
      totalTax += vassalTax * faction.tributeRate;
    }
  });

  return totalTax;
}

// 3. 封臣军队征召
function levyVassalArmies(faction) {
  var armies = [];

  // 直辖军队
  armies = armies.concat(GM.armies.filter(function(a) {
    return a.faction === faction.name && !a.isVassalArmy;
  }));

  // 征召封臣军队
  faction.vassals.forEach(function(vassalName) {
    var vassal = findFacByName(vassalName);
    if (vassal && vassal.loyalty > 50) {
      var vassalArmies = GM.armies.filter(function(a) {
        return a.faction === vassalName;
      });
      // 只能征召部分封臣军队
      var levyRatio = 0.5 + (vassal.loyalty - 50) / 100;
      vassalArmies.forEach(function(army) {
        armies.push({
          name: army.name + '（征召）',
          soldiers: Math.floor(army.soldiers * levyRatio),
          isVassalArmy: true,
          originalFaction: vassalName
        });
      });
    }
  });

  return armies;
}
```

**优势：**
- 更真实的封建关系
- 税收和军队自动层级传递
- 支持复杂的宗主-封臣互动

**工作量：** 较大（需要重构势力系统）

---

### 改进方案 3：头衔系统与官制系统融合（低优先级）

**目标：** 借鉴 Title 系统，增强天命的官制系统

**改进方案：**

```javascript
// 1. 为官职添加头衔属性
function enhanceOfficeSystem() {
  if (!GM.officeTree) return;

  GM.officeTree.forEach(function(dept) {
    if (!dept.titleLevel) {
      // 根据官职等级设置头衔级别
      dept.titleLevel = calculateTitleLevel(dept.rank);
    }

    dept.positions.forEach(function(pos) {
      if (!pos.titleName) {
        // 生成头衔名称（如"兵部尚书"）
        pos.titleName = dept.name + pos.name;
      }

      if (!pos.privileges) {
        // 头衔特权（如辟署权、继承权）
        pos.privileges = {
          canAppoint: pos.rank <= 3,  // 三品以上可任命下属
          canInherit: pos.rank <= 2,   // 二品以上可世袭
          canLevy: pos.rank <= 4       // 四品以上可征兵
        };
      }
    });
  });
}

// 2. 头衔继承系统
function inheritTitle(deceasedChar) {
  var office = findNpcOffice(deceasedChar.name);
  if (!office || !office.privileges || !office.privileges.canInherit) {
    return null;  // 不可继承
  }

  // 查找继承人（优先子女）
  var heirs = GM.chars.filter(function(c) {
    return c.father === deceasedChar.name || c.mother === deceasedChar.name;
  });

  if (heirs.length === 0) return null;

  // 选择最合适的继承人
  var heir = selectBestHeir(heirs, office);

  // 继承头衔
  if (heir) {
    appointToOffice(office.id, heir.name);
    addEB('继承', heir.name + ' 继承了 ' + deceasedChar.name + ' 的 ' + office.titleName);
  }

  return heir;
}
```

**优势：**
- 官职更有意义和价值
- 支持世袭和继承
- 增加游戏深度

**工作量：** 中等

---

## 四、实施建议

### 阶段一：数据监听系统（1-2周）

1. 实现基础的 DataChangeListeners 机制
2. 为关键属性添加监听器（loyalty, money, tax）
3. 重构 endTurn 中的部分手动调用

**预期效果：**
- 减少 30% 的手动维护代码
- 提高数据一致性

### 阶段二：封臣系统优化（2-3周）

1. 为 Faction 添加 vassals 和 liege 属性
2. 实现层级税收计算
3. 实现封臣军队征召
4. 添加宗主-封臣互动事件

**预期效果：**
- 封建关系更真实
- 增加战略深度

### 阶段三：头衔系统融合（1-2周）

1. 为官职添加头衔属性和特权
2. 实现头衔继承系统
3. 添加头衔相关事件

**预期效果：**
- 官制系统更丰富
- 增加长期运转的趣味性

---

## 五、总结

KingOfIreland 项目的核心优势在于：
1. **数据驱动架构**：自动化程度高，易于维护
2. **封建层级系统**：Court 系统完美实现封臣关系
3. **自动级联计算**：数据变化自动触发相关逻辑

天命游戏可以借鉴的核心理念：
1. **数据监听机制**：减少手动维护，提高自动化
2. **封臣层级系统**：完善势力关系，增加战略深度
3. **头衔特权系统**：增强官制系统的意义和价值

建议优先实施数据监听系统，这是性价比最高的改进方案。
