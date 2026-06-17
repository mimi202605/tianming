# WorldHelper 数据查询系统使用指南

## 概述

WorldHelper 是天命游戏的统一数据查询接口，借鉴了 KingOfIreland 项目的 WorldHelper 设计，提供了高效、易用的数据访问方法。

## 核心特性

✅ **统一接口**：所有数据类型使用相同的查询方法
✅ **链式查询**：支持 filter、map、reduce 等链式操作
✅ **关系查询**：快速查询上下级、封臣、宗主等关系
✅ **查询缓存**：自动缓存查询结果，提升性能
✅ **统计函数**：内置 count、sum、avg、max、min 等统计方法

## 基础查询

### 1. 获取所有实体

```javascript
// 获取所有角色
var allCharacters = WorldHelper.getAll('character');

// 获取所有势力
var allFactions = WorldHelper.getAll('faction');

// 获取所有军队
var allArmies = WorldHelper.getAll('army');

// 支持的类型：
// 'character', 'faction', 'party', 'class', 'army',
// 'extForce', 'tech', 'civic', 'post', 'scenario', 'region'
```

### 2. 按名字查询

```javascript
// 查询角色
var char = WorldHelper.getByName('character', '张三');

// 查询势力
var faction = WorldHelper.getByName('faction', '大唐');

// 查询军队
var army = WorldHelper.getByName('army', '禁军');
```

### 3. 按 ID 查询

```javascript
// 查询剧本
var scenario = WorldHelper.getById('scenario', 'scenario_001');

// 查询岗位
var post = WorldHelper.getById('post', 'post_123');
```

## 条件查询

### 1. where 条件过滤

```javascript
// 查询所有忠诚度低于 30 的角色
var disloyal = WorldHelper.where('character', function(c) {
  return c.loyalty < 30;
});

// 查询所有财政赤字的势力
var bankrupt = WorldHelper.where('faction', function(f) {
  return f.money < 0;
});

// 查询所有士气低落的军队
var demoralized = WorldHelper.where('army', function(a) {
  return a.morale < 30;
});
```

### 2. 链式查询

```javascript
// 查询所有忠诚度低于 30 的角色名字
var names = WorldHelper.where('character', function(c) {
  return c.loyalty < 30;
}).map(function(c) {
  return c.name;
});

// 查询所有势力的总财政
var totalMoney = WorldHelper.getAll('faction')
  .reduce(function(sum, f) {
    return sum + (f.money || 0);
  }, 0);
```

## 统计查询

### 1. 计数

```javascript
// 统计角色总数
var charCount = WorldHelper.count('character');

// 统计忠诚度低于 30 的角色数量
var disloyalCount = WorldHelper.count('character', function(c) {
  return c.loyalty < 30;
});
```

### 2. 求和

```javascript
// 统计所有军队的总兵力
var totalSoldiers = WorldHelper.sum('army', 'soldiers');

// 统计某势力的总兵力
var factionSoldiers = WorldHelper.sum('army', 'soldiers', function(a) {
  return a.faction === '大唐';
});
```

### 3. 平均值

```javascript
// 计算所有角色的平均忠诚度
var avgLoyalty = WorldHelper.avg('character', 'loyalty');

// 计算某势力角色的平均智谋
var avgIntelligence = WorldHelper.avg('character', 'intelligence', function(c) {
  return c.faction === '大唐';
});
```

### 4. 最大值/最小值

```javascript
// 查找忠诚度最高的角色
var mostLoyal = WorldHelper.max('character', 'loyalty');
console.log(mostLoyal.name + ' 忠诚度：' + mostLoyal.loyalty);

// 查找财政最少的势力
var poorest = WorldHelper.min('faction', 'money');
console.log(poorest.name + ' 财政：' + poorest.money);
```

## 关系查询（中国古代背景）

### 1. 上下级关系

```javascript
// 获取角色的所有下属
var subordinates = WorldHelper.getSubordinates('李世民');
console.log('下属数量：' + subordinates.length);

// 获取角色的上级
var superior = WorldHelper.getSuperior('魏征');
if (superior) {
  console.log('上级：' + superior.name);
}
```

### 2. 封臣关系

```javascript
// 获取势力的所有封臣
var vassals = WorldHelper.getVassals('大唐');
console.log('封臣数量：' + vassals.length);

// 获取势力的宗主
var liege = WorldHelper.getLiege('河东节度使');
if (liege) {
  console.log('宗主：' + liege.name);
}
```

### 3. 家族关系

```javascript
// 获取角色的所有关系（子女、配偶、上下级）
var relations = WorldHelper.getRelations('李世民');
relations.forEach(function(rel) {
  console.log(rel.type + '：' + rel.target);
});

// 输出示例：
// 子女：李承乾
// 子女：李泰
// 配偶：长孙皇后
// 下属：魏征
// 下属：房玄龄
```

## 辅助查询

### 1. 势力相关

```javascript
// 获取角色所在势力
var faction = WorldHelper.getCharacterFaction('李世民');

// 获取势力的所有角色
var characters = WorldHelper.getFactionCharacters('大唐');

// 获取势力的所有军队
var armies = WorldHelper.getFactionArmies('大唐');

// 获取势力的总兵力
var totalSoldiers = WorldHelper.getFactionTotalSoldiers('大唐');
```

### 2. 官职相关

```javascript
// 查找官职
var office = WorldHelper.findOffice('兵部尚书');
console.log('品级：' + office.rank);
console.log('部门：' + office.deptName);

// 查找部门
var dept = WorldHelper.findDepartment('dept_001');
console.log('部门名称：' + dept.name);

// 获取下属官职
var subordinateOffices = WorldHelper.getSubordinateOffices(office);
```

### 3. 权力计算

```javascript
// 计算角色的权力值（综合官职和能力）
var power = WorldHelper.getCharacterPower('李世民');
console.log('权力值：' + power);

// 权力值计算公式：
// 基础能力（智谋×0.3 + 武力×0.2 + 仁德×0.1）
// + 官职加成（(10-品级)×10）
// + 下属数量×5
```

## 查询缓存

### 缓存机制

WorldHelper 自动缓存查询结果，提升性能：

```javascript
// 第一次查询：从数据源读取
var char1 = WorldHelper.getByName('character', '李世民');

// 第二次查询：从缓存读取（更快）
var char2 = WorldHelper.getByName('character', '李世民');

// 缓存有效期：1000ms（1秒）
// 每回合结束时自动清空缓存
```

### 手动清空缓存

```javascript
// 清空所有查询缓存
WorldHelper.clearCache();

// 禁用缓存（调试用）
WorldHelper._cacheEnabled = false;

// 启用缓存
WorldHelper._cacheEnabled = true;

// 调整缓存有效期（毫秒）
WorldHelper._cacheTTL = 2000; // 2秒
```

## 实战示例

### 示例 1：查找所有叛乱风险角色

```javascript
// 查找忠诚度低且野心高的角色
var rebels = WorldHelper.where('character', function(c) {
  return c.loyalty < 30 && c.ambition > 70;
});

console.log('叛乱风险角色：');
rebels.forEach(function(c) {
  console.log('- ' + c.name + '（忠诚：' + c.loyalty + '，野心：' + c.ambition + '）');
});
```

### 示例 2：统计势力实力

```javascript
function analyzeFactionPower(factionName) {
  var faction = WorldHelper.getByName('faction', factionName);
  if (!faction) return;

  var characters = WorldHelper.getFactionCharacters(factionName);
  var armies = WorldHelper.getFactionArmies(factionName);
  var totalSoldiers = WorldHelper.getFactionTotalSoldiers(factionName);
  var avgLoyalty = WorldHelper.avg('character', 'loyalty', function(c) {
    return c.faction === factionName;
  });

  console.log('=== ' + factionName + ' 实力分析 ===');
  console.log('财政：' + faction.money);
  console.log('粮食：' + faction.food);
  console.log('民心：' + faction.popularity);
  console.log('角色数量：' + characters.length);
  console.log('军队数量：' + armies.length);
  console.log('总兵力：' + totalSoldiers);
  console.log('平均忠诚度：' + Math.round(avgLoyalty));
}

analyzeFactionPower('大唐');
```

### 示例 3：查找最佳继承人

```javascript
function findBestHeir(deceasedName) {
  // 查找所有子女
  var heirs = WorldHelper.where('character', function(c) {
    return c.father === deceasedName || c.mother === deceasedName;
  });

  if (heirs.length === 0) {
    console.log('无继承人');
    return null;
  }

  // 按综合能力排序
  heirs.sort(function(a, b) {
    var scoreA = (a.intelligence || 0) + (a.valor || 0) + (a.benevolence || 0);
    var scoreB = (b.intelligence || 0) + (b.valor || 0) + (b.benevolence || 0);
    return scoreB - scoreA;
  });

  var best = heirs[0];
  console.log('最佳继承人：' + best.name);
  console.log('智谋：' + best.intelligence + '，武力：' + best.valor + '，仁德：' + best.benevolence);

  return best;
}

findBestHeir('李渊');
```

### 示例 4：分析权力结构

```javascript
function analyzePowerStructure() {
  var allChars = WorldHelper.getAll('character');

  // 按权力值排序
  var powerRanking = allChars.map(function(c) {
    return {
      name: c.name,
      power: WorldHelper.getCharacterPower(c.name),
      position: c.position || '无官职'
    };
  }).sort(function(a, b) {
    return b.power - a.power;
  });

  console.log('=== 权力排行榜 ===');
  powerRanking.slice(0, 10).forEach(function(p, i) {
    console.log((i + 1) + '. ' + p.name + '（' + p.position + '）- 权力值：' + p.power);
  });
}

analyzePowerStructure();
```

### 示例 5：检测势力危机

```javascript
function detectFactionCrisis(factionName) {
  var faction = WorldHelper.getByName('faction', factionName);
  if (!faction) return;

  var crises = [];

  // 财政危机
  if (faction.money < 0) {
    crises.push('财政赤字（' + faction.money + '）');
  }

  // 粮食危机
  if (faction.food < 0) {
    crises.push('粮食短缺（' + faction.food + '）');
  }

  // 民心危机
  if (faction.popularity < 30) {
    crises.push('民心过低（' + faction.popularity + '）');
  }

  // 忠诚危机
  var disloyalCount = WorldHelper.count('character', function(c) {
    return c.faction === factionName && c.loyalty < 30;
  });
  if (disloyalCount > 0) {
    crises.push('忠诚危机（' + disloyalCount + '人忠诚度过低）');
  }

  // 军事危机
  var totalSoldiers = WorldHelper.getFactionTotalSoldiers(factionName);
  if (totalSoldiers < 1000) {
    crises.push('兵力不足（仅' + totalSoldiers + '人）');
  }

  if (crises.length > 0) {
    console.log('⚠️ ' + factionName + ' 面临危机：');
    crises.forEach(function(c) {
      console.log('  - ' + c);
    });
  } else {
    console.log('✓ ' + factionName + ' 运转正常');
  }
}

detectFactionCrisis('大唐');
```

## 性能优化建议

### 1. 使用缓存

```javascript
// ✅ 好：多次查询同一角色，利用缓存
var char = WorldHelper.getByName('character', '李世民');
var power = WorldHelper.getCharacterPower('李世民'); // 内部会复用缓存

// ❌ 差：每次都遍历数组
var char = GM.chars.find(function(c) { return c.name === '李世民'; });
```

### 2. 使用统计函数

```javascript
// ✅ 好：使用内置统计函数
var totalSoldiers = WorldHelper.sum('army', 'soldiers');

// ❌ 差：手动遍历计算
var totalSoldiers = 0;
GM.armies.forEach(function(a) {
  totalSoldiers += a.soldiers;
});
```

### 3. 避免重复查询

```javascript
// ✅ 好：查询一次，多次使用
var allChars = WorldHelper.getAll('character');
var loyalCount = allChars.filter(function(c) { return c.loyalty > 70; }).length;
var disloyalCount = allChars.filter(function(c) { return c.loyalty < 30; }).length;

// ❌ 差：多次查询
var loyalCount = WorldHelper.count('character', function(c) { return c.loyalty > 70; });
var disloyalCount = WorldHelper.count('character', function(c) { return c.loyalty < 30; });
```

## 与旧代码的兼容性

WorldHelper 完全兼容旧的查询函数：

```javascript
// 旧代码（仍然可用）
var char = findCharByName('李世民');
var faction = findFacByName('大唐');

// 新代码（推荐）
var char = WorldHelper.getByName('character', '李世民');
var faction = WorldHelper.getByName('faction', '大唐');
```

## 总结

WorldHelper 提供了：

✅ **统一接口**：所有数据类型使用相同的查询方法
✅ **高性能**：自动缓存 + 索引优化
✅ **易用性**：链式查询 + 丰富的统计函数
✅ **关系查询**：快速查询上下级、封臣、家族关系
✅ **向后兼容**：不影响现有代码

建议在新代码中优先使用 WorldHelper，享受更好的开发体验和性能。
