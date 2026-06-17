# 天命 · 诊断控制台速查表

> 一页纸索引：打开浏览器控制台（F12）即可使用的所有诊断接口。
> 最后更新：2026-04-24

---

## ⚡ 快捷键

| 按键 | 作用 |
|------|------|
| `Ctrl+Shift+E` | 打开 **TM.errors 错误日志面板**（含校验历史+下载 JSON；P4-beta 后由 tm-diagnostics-foundation 提供） |
| `?test=1` | 启动游戏时加到 URL，自动跑全部 smoke test |

---

## 🔍 数据查询 `DA.*`

### 角色
```javascript
DA.chars.player()                 // 玩家角色
DA.chars.findByName('朱由检')      // 按姓名/字/号/别名查（O(1) 索引）
DA.chars.findById('char_001')     // 按 ID 查
DA.chars.allAlive()               // 所有活着的角色
DA.chars.byFaction('大明')        // 按势力筛选
DA.chars.byLocation('京师')       // 按地点筛选（宽松匹配）
DA.chars.countAlive()             // 活着的数量
DA.chars.adjustStat('袁崇焕', 'loyalty', +10, 0, 100)  // 安全增减属性
```

### 势力 / 党派 / 阶层
```javascript
DA.factions.all()                 // 所有势力
DA.factions.findByName('大明')
DA.factions.playerFaction()
DA.factions.byRelation('后金', 50) // 与后金关系 >= 50 的势力

DA.parties.all()
DA.parties.findByName('东林党')
DA.classes.all()
DA.classes.findByName('士绅')
```

### 国库 / 财政
```javascript
DA.guoku.money()                  // 钱库存
DA.guoku.grain()                  // 粮库存
DA.guoku.cloth()                  // 布库存
DA.guoku.allStocks()              // {money, grain, cloth}
DA.guoku.isBankrupt()             // 是否破产
DA.guoku.monthRatio()             // 月→回合乘数
DA.guoku.sources()                // 8 大收入源元信息
DA.guoku.expenses()               // 8 大支出类元信息
DA.guoku.reforms()                // p4 财政改革（可能为 null）
DA.guoku.loanSources()            // p5 借贷源
DA.guoku.spendUnchecked('money', 1000, '赈灾')
DA.guoku.creditUnchecked('grain', 500, '丰收')
```

### 官制 / 行政
```javascript
DA.officeTree.get()               // 官制树（优先 GM）
DA.officeTree.findPosition('户部', '尚书')
DA.officeTree.postsOf('袁崇焕')   // 某人所有兼任 [{dept, position}]

DA.admin.get()                    // 行政区划树
DA.admin.findDivision('辽东')
DA.admin.getProvinceStats('陕西')
```

### 军事
```javascript
DA.armies.all()
DA.armies.findByName('辽东军')
DA.armies.byFaction('大明')
DA.armies.byCommander('袁崇焕')
DA.armies.totalTroops('大明')      // 某势力总兵力
DA.armies.activeWars()
DA.armies.activeBattles()
```

### 后宫 / 权威
```javascript
DA.harem.concubines()
DA.harem.pregnancies()
DA.harem.empress()

DA.authority.huangquan()          // 皇权值
DA.authority.huangwei()           // 皇威值
DA.authority.minxin()             // 民心值
DA.authority.powerMinister()      // 权臣对象
DA.authority.tyrantLevel()        // 暴君等级
```

### 时局 / 诏书 / 回合
```javascript
DA.issues.all()                   // 全部时局要务
DA.issues.pending()               // 待解决
DA.issues.findById('issue_001')
DA.issues.resolve('issue_001', '咸通八年冬')

DA.edict.suggestions()            // 诏书建议库
DA.edict.addSuggestion({from:'张居正', topic:'赋税', content:'...'})

DA.turn.current()                 // 当前回合
DA.turn.date()                    // 游戏日期
DA.turn.dateOfTurn(10)            // 第 10 回合的日期
DA.turn.isRunning()
```

### 历史 / 记忆 / 剧本
```javascript
DA.chronicle.yearly()             // 编年史
DA.chronicle.recent(3)            // 近 3 回合
DA.chronicle.arcs()               // 角色弧
DA.chronicle.afterwords()         // 后评
DA.chronicle.playerDecisions()    // 玩家决策记录

DA.npcMemory.ofChar('袁崇焕')     // 某 NPC 的记忆
DA.qiju.recent(5)                 // 起居注近 5 条
DA.jishi.byChar('袁崇焕')         // 纪事按人筛选
DA.era.dynastyPhase()             // founding/peak/decline/collapse
DA.era.socialStability()
DA.scenario.name()                // 当前剧本名
```

### DAL 元信息
```javascript
DA.meta.coveredGMFields           // 已封装的 28 个 GM 字段清单
DA.meta.enableLog(true)           // 开启访问日志
DA.meta.logSummary()              // 查看热点（按 area.op 计数）
DA.meta.clearLog()
```

---

## 🤖 AI 相关 `TM.*`

### Schema
```javascript
TM_AI_SCHEMA.listFields()                  // 回合推演字段（50+）
TM_AI_SCHEMA.listFields('dialogue')        // 对话字段
TM_AI_SCHEMA.describe('office_changes')    // 查某字段详情
TM_AI_SCHEMA.toKnownFields()               // {name: type} map
TM_AI_SCHEMA.toDeprecatedFields()          // 已废弃字段
TM_AI_SCHEMA.toRequiredSubfields()         // 必填子字段
```

### Validator
```javascript
TM.validateAIOutput(output, 'tag')                  // 默认 turn-full 模式
TM.validateAIOutput(output, 'tag', 'dialogue')      // 对话模式
TM.getLastValidation()                              // 最近一次校验结果
TM.getValidationHistory()                           // 最近 20 次
window.TM_VALIDATOR_OFF = true                      // 全局关 validator
```

---

## 🐛 错误收集 `TM.errors`

```javascript
TM.errors.capture(err, 'module-name', {extra: 'data'})  // 手动记录
TM.errors.getLog()                 // 最近 200 条
TM.errors.getSummary()             // 按 module 分组汇总
TM.errors.byModule('applier')      // 过滤某模块
TM.errors.clear()                  // 清空
TM.errors.openPanel()              // 打开 UI（同 Ctrl+Shift+E）
TM.errors.consoleMirror = false    // 关闭镜像到 console
TM.errors.maxLog = 500             // 改上限
```

---

## 🧪 测试框架 `TM.test`

```javascript
TM.test.run()                      // 跑全部
TM.test.runOnly('DA.guoku')        // 只跑名字包含 guoku 的 suite
TM.test.listSuites()               // 列出所有 suite
TM.test.getLastResults()           // 上次运行结果

// 注册新测试（临时在控制台）
TM.test.describe('我的测试', function(){
  TM.test.it('X 应该等于 Y', function(){
    TM.test.expect(X).toBe(Y);
  });
});
TM.test.run();
```

---

## 💾 存档

```javascript
SAVE_VERSION                       // 当前版本号（v5）
SaveMigrations.stamp(data)         // 给数据打版本戳
SaveMigrations.run(data)           // 运行迁移链（旧→新）
SaveManager.saveToSlot(1, '试存')   // 保存到槽位 1
SaveManager.loadFromSlot(1)        // 加载
SaveManager.deleteSlot(1)
SaveManager.getAllSaves()          // 轻量索引
```

---

## 🔧 子系统引擎

### CorruptionEngine
```javascript
CorruptionEngine.tick(ctx)                    // 手动推进（慎用）
CorruptionEngine.ensureModel()                // 建立默认模型
CorruptionEngine.calcVisibilityTier(50)       // 腐败可见度档位
CorruptionEngine.getMonthRatio()              // 月→回合
CorruptionEngine.EXPOSURE_CASES               // 25 条案件库（p2 新增）
CorruptionEngine.generateExposureCase()       // 生成揭发事件
CorruptionEngine.getGameMode()                // 演义/轻度史实/严格史实（p4）
CorruptionEngine.openJuanna()                 // 卖官鬻爵面板（p4）
```

### AuthorityEngines
```javascript
AuthorityEngines.getHuangweiValue()
AuthorityEngines.getHuangquanValue()
AuthorityEngines.getMinxinValue()
AuthorityEngines.adjustHuangwei('source', +5, '某原因')
AuthorityEngines.adjustHuangquan('source', -3, '某原因')
AuthorityEngines.adjustMinxin('source', +2, '某原因')
AuthorityEngines.executePurge('魏忠贤')
AuthorityEngines.HUANGWEI_SOURCES_14          // 14 源常量
AuthorityEngines.HUANGWEI_DRAINS_14           // 14 降常量
```

### GuokuEngine（LAYERED 5 层）
```javascript
GuokuEngine.tick(ctx)                         // 终版（p6）
GuokuEngine.ensureModel()
GuokuEngine.computeTaxFlow(1000000)           // p2 提供
GuokuEngine.canEnactReform('一条鞭法')         // p4
GuokuEngine.FISCAL_REFORMS                    // p4
GuokuEngine.LOAN_SOURCES                      // p5
GuokuEngine.calcCustomTaxes()                 // p6（终版新增）
```

---

## 🧩 其他重要全局

```javascript
// 时间换算
_getDaysPerTurn()                  // 每回合天数
turnsForMonths(24)                 // 24 个月 → 几回合
ratePerTurn(0.12)                  // 年度 12% → 每回合
getTSText(42)                      // 第 42 回合的游戏日期

// AI 对话字数
_aiDialogueWordHint('wd')          // 问对字数提示
_aiDialogueTok('cy', 3)            // 朝议 3 人 token 预算
_toggleDialogueDebug()             // 开启字数 debug 日志

// 模态框（R17 抽离，P4-beta 并入 tm-ui-foundation.js）
openGenericModal(title, html, onSave)
closeGenericModal()
showModal(title, html, onClose)
gv('input-id')                     // 读 input 值并 trim

// 工具
deepClone(obj)
uid()                              // 生成唯一 ID
escHtml(s)                         // HTML 转义
extractJSON(text)                  // 从文本中提取 JSON
```

---

## 🩺 常见问题诊断流程

### 「AI 推演后某字段没生效」
1. `TM.getLastValidation()` 看 validator 报告
2. 搜 `errors`：返回里是否 unknown/deprecated/type error
3. 若 schema 未覆盖该字段 → 去 `tm-ai-schema.js` 补定义
4. 若 schema 有但 applier 没处理 → 看 `tm-ai-change-applier.js`

### 「某功能不工作/按钮点了没反应」
1. `Ctrl+Shift+E` 打开错误面板 → 按 module 看异常
2. `TM.errors.getSummary()` 汇总
3. 若是 DOM 缺失 → 检查 `#settings-bg` 等元素是否存在
4. 若是全局函数 undefined → 检查 index.html 加载顺序

### 「存档加载后数据不全」
1. 看 console 的 `[SaveMigration]` 日志（版本号是否升级）
2. `SaveMigrations.run(data)` 手动跑一次看是否补字段
3. 检查 `DA.meta.coveredGMFields` 内是否有期望字段

### 「回合结算卡死」
1. 看 `TM.getValidationHistory()` 最近一次校验
2. 看 `TM.errors.byModule('applier')` 是否 applier 异常
3. 看 `GM._turnAiResults.subcall1_raw` 是否是残缺 JSON

### 「官制面板显示不对」
1. `DA.officeTree.get()` 是否有数据
2. 对比 `GM.officeTree` vs `P.officeTree`（运行时应优先前者）

### 「某角色找不到」
1. `DA.chars.findByName(名)` 是否 undefined
2. 可能 `GM._indices.charByName` 索引没刷新 → 调 `buildIndices()`
3. 角色可能已死亡 → `DA.chars.findById(id)` 可找到

---

## 📚 相关文档

- `ARCHITECTURE.md` — 完整架构图
- `MODULE_REGISTRY.md` — 92 文件索引
- `PATCH_CLASSIFICATION.md` — 18+ 补丁分类
- `DEBUG_CHEATSHEET.md` — 本文件
