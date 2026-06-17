# 五个系统重构设计文档

## 设计原则
1. **独立但关联**：每个系统是独立面板，但与其他部分（人物、势力、官制、行政区划、时代背景）关联
2. **完整编辑界面**：像人物、势力、物品一样，有完整的添加/编辑/删除功能
3. **AI生成支持**：支持AI批量生成，整合到"AI一键生成整个剧本"流程
4. **服务于AI推演**：这些系统为AI提供背景知识，不是硬编码的游戏机制

## 1. 经济配置 (economyConfig)

### 数据结构
```javascript
economyConfig: {
  enabled: false,
  currency: '贯',                    // 货币名称
  baseIncome: 10000,                 // 基础收入
  tributeRatio: 0.3,                 // 贡奉比例（已有）
  tributeAdjustment: 0,              // 贡奉调整（已有）
  taxRate: 0.1,                      // 税率（已有）
  inflationRate: 0.02,               // 通货膨胀率（已有）
  economicCycle: 'stable',           // 经济周期：prosperity/stable/recession/depression
  specialResources: '',              // 特殊资源（如：丝绸、茶叶、盐铁）
  tradeSystem: '',                   // 贸易系统描述（如：市舶司管理海外贸易）
  description: ''                    // 总体经济描述
}
```

### UI设计
- 保留现有的滑块和输入框
- 添加：货币名称输入框、经济周期下拉框、特殊资源文本框、贸易系统文本框、总体描述文本域
- AI生成按钮：生成所有字段的建议值

### 关联关系
- 时代背景（繁荣度）→ 影响经济周期和基础收入
- 势力 → 使用这些经济参数计算收入
- 行政区划 → 地方收入使用这些参数

## 2. 建筑系统 (buildingSystem)

### 数据结构
```javascript
buildingSystem: {
  enabled: false,
  buildingTypes: [
    {
      name: '书院',
      category: '文化建筑',           // 分类：军事/经济/文化/行政
      description: '用于教育士子',
      effects: '提升科举、文化',      // 可能的效果（由AI推演决定）
      era: '宋代及以后',              // 适用时代
      relatedTo: ['科举', '文化']     // 关联系统
    }
  ]
}
```

### UI设计
- 启用/禁用开关
- AI生成按钮（批量生成多个建筑类型）
- 建筑类型列表（卡片式显示）
- 添加建筑类型按钮 → 打开模态框
- 每个建筑卡片有编辑/删除按钮

### 模态框字段
- 名称、分类（下拉框）、描述、可能效果、适用时代、关联系统

### 关联关系
- 行政区划 → 每个行政区可以有这些建筑
- 时代背景 → 不同时代有不同的典型建筑
- AI推演 → AI可以提到这些建筑

## 3. 岗位系统 (postSystem)

### 数据结构
```javascript
postSystem: {
  enabled: false,
  postRules: [
    {
      positionName: '节度使',
      succession: 'hereditary',       // 继承方式：hereditary/appointed/mixed
      appointmentAuthority: 'self',   // 任命权：central/self/mixed
      description: '唐末五代节度使世袭，拥有辟署权',
      relatedOffices: ['节度使'],     // 关联的官职
      era: '唐末五代',                // 适用时代
      relatedTo: ['官制', '人物继承'] // 关联系统
    }
  ]
}
```

### UI设计
- 启用/禁用开关
- AI生成按钮（批量生成多个岗位规则）
- 岗位规则列表（卡片式显示）
- 添加岗位规则按钮 → 打开模态框
- 每个规则卡片有编辑/删除按钮

### 模态框字段
- 职位名称、继承方式（下拉框）、任命权（下拉框）、描述、关联官职、适用时代

### 关联关系
- 官制部门 → 官职应用这些规则
- 人物 → 人物的官职继承遵循这些规则
- 时代背景（集权度）→ 影响继承方式

## 4. 封臣系统 (vassalSystem)

### 数据结构
```javascript
vassalSystem: {
  enabled: false,
  vassalRules: [
    {
      name: '藩镇封臣制',
      description: '节度使名义上是朝廷臣子，实际上半独立',
      tributeRule: '每年象征性进贡',
      militaryRule: '朝廷征召困难',
      rebellionConditions: '忠诚度过低、朝廷衰弱',
      strength: 'weak',               // 封臣关系强度：strong/medium/weak
      era: '唐末五代',
      relatedTo: ['势力', '军事', '集权度']
    }
  ]
}
```

### UI设计
- 启用/禁用开关
- AI生成按钮（批量生成多个封臣规则）
- 封臣规则列表（卡片式显示）
- 添加封臣规则按钮 → 打开模态框
- 每个规则卡片有编辑/删除按钮

### 模态框字段
- 名称、描述、贡奉规则、军事规则、叛乱条件、关系强度（下拉框）、适用时代

### 关联关系
- 势力 → 势力之间的宗主-封臣关系
- 军事 → 封臣军队如何征召
- 时代背景（集权度）→ 影响封臣关系强弱

## 5. 头衔系统 (titleSystem)

### 数据结构
```javascript
titleSystem: {
  enabled: false,
  titles: [
    {
      name: '国公',
      type: 'nobility',               // 类型：nobility/official_rank
      rank: 1,                        // 等级（1最高）
      succession: 'hereditary',       // 继承方式
      description: '最高爵位',
      privileges: '封地、税收',       // 特权（由AI推演决定）
      era: '唐宋',
      relatedTo: ['人物', '封地']
    }
  ],
  officialRanks: [
    {
      name: '正一品',
      positions: ['太师', '太傅'],    // 对应官职
      description: '最高官阶',
      era: '唐宋明清'
    }
  ]
}
```

### UI设计
- 启用/禁用开关
- 两个子标签：爵位、官阶
- AI生成按钮（批量生成爵位和官阶）
- 列表（卡片式显示）
- 添加按钮 → 打开模态框
- 每个卡片有编辑/删除按钮

### 模态框字段（爵位）
- 名称、类型（下拉框）、等级、继承方式、描述、特权、适用时代

### 模态框字段（官阶）
- 名称、对应官职、描述、适用时代

### 关联关系
- 人物 → 人物可以拥有这些爵位
- 官制 → 官职对应的品级
- 时代背景 → 不同朝代有不同的爵位制度

## 实现步骤

### 第一步：更新数据结构（editor.js）
- 修改 scriptData 初始化，添加完整的数据结构

### 第二步：重构经济配置面板（editor.html + editor.js）
- 添加缺失的字段输入框
- 更新 renderEconomyConfig() 函数
- 更新 updateEconomyConfig() 函数
- 更新 aiGenerateEconomyConfig() 函数

### 第三步：重构建筑系统面板（editor.html + editor.js）
- 创建建筑类型列表显示
- 创建添加/编辑建筑类型模态框
- 实现 addBuildingType()、editBuildingType()、deleteBuildingType() 函数
- 实现 renderBuildingSystem() 函数
- 更新 aiGenerateBuildingTypes() 函数

### 第四步：重构岗位系统面板（editor.html + editor.js）
- 创建岗位规则列表显示
- 创建添加/编辑岗位规则模态框
- 实现 addPostRule()、editPostRule()、deletePostRule() 函数
- 实现 renderPostSystem() 函数
- 更新 aiGeneratePostRules() 函数

### 第五步：重构封臣系统面板（editor.html + editor.js）
- 创建封臣规则列表显示
- 创建添加/编辑封臣规则模态框
- 实现 addVassalRule()、editVassalRule()、deleteVassalRule() 函数
- 实现 renderVassalSystem() 函数
- 更新 aiGenerateVassalRules() 函数

### 第六步：重构头衔系统面板（editor.html + editor.js）
- 创建爵位和官阶列表显示（两个子标签）
- 创建添加/编辑爵位模态框
- 创建添加/编辑官阶模态框
- 实现相关函数
- 更新 aiGenerateTitleSystem() 函数

### 第七步：整合到AI一键生成流程（editor.js）
- 更新 doFullGenerate() 函数
- 确保五个系统都在生成步骤中
- 更新生成结果处理逻辑

### 第八步：测试
- 测试每个系统的添加/编辑/删除功能
- 测试AI生成功能
- 测试数据保存和加载
- 测试与其他部分的关联
