# NPC Parity Audit·Phase A1·2026-05-10

L3 NPC 完全可玩化第一刀。目标：列出每个 NPC 与 player faction 的字段缺漏·分类后决定哪些补、哪些不补、哪些适配。

## 总览·缺漏数 by 剧本

### 天启七年·九月（官方）
玩家·明朝廷·143 keys
| NPC | keys | missing |
|---|---|---|
| 后金 | 127 | 27 |
| 察哈尔 | 124 | 24 |
| 朝鲜 | 120 | 27 |
| 郑氏海商 | 115 | 34 |
| 葡萄牙·澳门 | 122 | 44 |
| 荷兰·台海 | 124 | 43 |
| 西班牙·马尼拉 | 124 | 44 |
| 播州土司 | 108 | 39 |
| 陕北饥民 | 108 | 38 |
| 奢安联军 | 123 | 45 |
| **科尔沁蒙古** | 70 | **79** |

### 崇祯 / 挽天倾：崇祯死局
玩家·大明·**NOT in sc.factions[]** (剧本数据 bug)·8 NPC 全部 18 keys (基本占位)。
两本是简化模板·非按 player parity 设计·**Phase A 先 skip·留 Phase A2 backlog**。

### 绍宋·建炎元年八月（官方）
玩家·宋朝廷·14 keys (剧本本身字段密度低)·NPC 14-18 keys。
绍宋本身需要先扩展 player template 才能谈 parity·**Phase A 先 skip·留 Phase A2 backlog**。

## 缺漏分类 (天启七年)

### A 类·真该补 (无论 player/NPC 都该有)

补·按 player template 的结构·内容按 NPC 文化适配。

| 字段 | 影响势力 | 默认值策略 |
|---|---|---|
| `relations.{X}` 各两两关系 | 全员 (N×(N-1) 对·只填了对玩家) | 双向对称取最低·或默认 0 |
| `leadership` 整块 + 5 子项 | 科尔沁/葡萄牙·澳门 | 用 leader/leaderInfo 填或留空 |
| `victoryConditions` | 科尔沁等 8 NPC | 默认空数组 + comment |
| `defeatConditions` | 科尔沁等 8 NPC | 默认空数组 + comment |
| `longTermStrategy` | 科尔沁等 9 NPC | 用现有 strategy 填或 '' |
| `offendThresholds` 3 层 | 科尔沁等 8 NPC | 默认 3 层模板 (15/30/60) |
| `history` (跨年时间线) | 科尔沁等 6 NPC | 用 historicalEvents 转或 [] |
| `mainResources` | 科尔沁等 7 NPC | [] (后续可从 territory 推) |
| `ideology` | 科尔沁等 4 NPC | '' |
| `traits` | 科尔沁等 4 NPC | [] |
| `members` (string list of 主要人物) | 科尔沁等 4 NPC | 用 leader 名字 |
| `attitudeDetail.{self,allies,enemies,neutrals}` | 后金/科尔沁等 5 NPC | 默认 {self:[],allies:[],enemies:[],neutrals:[]} |
| `partyRelations` | 科尔沁等 5 NPC | {} (从 internalParties 推) |
| `economicPolicy.labor` | **全员** | 默认 (按文化分: 农耕"赋役制"/游牧"放牧"/商业"雇工") |
| `warState.{active,pending,recent}` | 全员部分缺 | {active:[],pending:[],recent:[]} |
| `capital` | 科尔沁/葡萄牙等 | territory[0] 或 '' |
| `cultureLevel` | 科尔沁 | 50 默认 |
| `courtInfluence` | 科尔沁 | 50 |
| `popularInfluence` | 科尔沁 | 50 |
| `strength` | 科尔沁有 prestige 没 strength | 用 prestige 或 50 |
| `treasury.{money,grain,cloth}` | 科尔沁 | {money:0,grain:0,cloth:0,note:''} |
| `population.{registered,actual,hidden,ethnicities}` | 多数 NPC 是 number 而非 object | 转 object {actual:N} + 补 hidden:0 |
| `id`, `sid` | 科尔沁等 stub 缺 | 自动生成 (按 name hash) |

### B 类·player 专属·NPC **不该补**

- `knownSpies.{in_manchu,in_mongol,in_pirate,...}` — 这是"我在他国的间谍"·明朝廷视角字段。NPC 应有自己的 spies 字段 (e.g. `npcKnownSpies.in_player`)·但这是 Phase C 范围·A 不动。
- `playerRelation` — 对玩家的关系·NPC 自己当然没意义。

### C 类·文化适配·结构对齐但内容按文化定制

- `publicOpinion` — 字段名按文化变：
  - 明朝廷: `amongGentry / amongPeasantry / amongScholars`
  - 后金: `amongNobles / amongWarriors / amongHanSubjects`
  - 朝鲜: `twoBan / commoners`
  - 葡萄牙·澳门: `amongPortuguese / amongTuSheng / amongChinese / amongJesuits`
  - 蒙古: `amongTribes`
  - 已有的 NPC 不动·只对 publicOpinion 完全缺的 NPC (郑氏/播州) 补默认 `{amongCommoners:50}`
- `techLevel.{...}` — 子项各 NPC 有自己的特长 (郑氏 trade·澳门 cartography)·**不强制 9 项**·只补 overall 缺时填 50
- `population.ethnicities.{...}` — 按各自族群结构·不 force 汉/回/藏

### D 类·结构 normalize·已存在但格式不一致

- `population` 现状: 后金/郑氏/播州是 number·察哈尔/朝鲜/澳门是 object
  - 转为 object: number → `{actual: N, registered: 0, hidden: 0, ethnicities: {}}`

## 不补的 backlog (留给 Phase B/C)

- 崇祯/挽天倾·player faction 缺 (剧本数据 bug)·**Phase A2 backlog**
- 绍宋·player template 字段密度低·需先扩 player·**Phase A2 backlog**
- knownSpies → `npcKnownSpies` 重设计·**Phase C**
- relations 自动双向对称化 (现状是单向手填)·**Phase B (derived calc)**
- techLevel 跨势力对比 (帝国 vs 部落 vs 商社)·**Phase B**

## 下一步 (A2/A3)

- A2: 写 `scripts/backfill-npc-parity.js`·实现 A 类 + D 类·skip B/C 类
- A3: 跑天启七年·补 11 NPC·验证 calibrate 报告里 NPC fallback 50 比例下降
