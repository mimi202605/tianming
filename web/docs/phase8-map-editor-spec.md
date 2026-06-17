# Phase 8·地图编辑器·spec (P 社级·全朝代)

date·2026-05-06·status·**P0·user 已 ACK·开始实施 (暂停 image gen)**·owner·Claude·

---

## §0·决策记录

```
轮 1-7·       12 殿设计反复·user 选 P 社 paradigm (B 方案)
B 方案根基·   地图永驻 + 抽屉 panel + outliner
依据·         P 社地图 = 数据库·非图片·**编辑器 = 让人定义这个数据库的工具**
              没编辑器·游戏只能 hardcode 1 张死地图·**等于没 P 社感**

user 决 (4 项)·
  1·  入口·          独立 web/map-editor.html
  2·  范围·          全中国古代朝代 (商周 / 秦 / 汉 / 唐 / 宋 / 元 / 明 / 清 / 民)
  3·  schema·        参考现有游戏行政区划字段 (~50 字段·6 层 + 5 自治)
  4·  时机·          现在开·暂停 Phase 8 image gen

paradigm·     D 法 (bitmap base + polygon overlay)·canvas 2D·无第三方依赖
```

---

## §1·删除清单 (~5040 行废)

```
删·  editor-map.js              825 行  Voronoi 不用
删·  map-editor-pro.html/js    1318 行  Leaflet 重·非地理坐标系
删·  map-annotator.html         570 行  POC 残
删·  map-region-editor.js       435 行  冗余多 canvas
删·  map-editor-smart.js       1680 行  无序复杂
删·  editor.html 内 map link    ~50 行  入口
合计·                          ~5040 行
```

## §2·保留清单 (~2840 行有用)

```
保·  map-integration.js         346 行  game runtime 业务 (terrain modifier / 移动成本)
保·  map-converter.js           312 行  格式转换·适配新编辑器
保·  map-display.js             318 行  runtime canvas 渲染 (游戏内显地图)
保·  map-recognition.js        1771 行  image → polygon (flood fill / RDP·import 用)
保·  default-map.json         13613 行  ~100 省 sample·测试 fixture
保·  schema·                            6 层 + 5 自治 + ~50 字段
```

## §3·salvage 算法

```
- polygon 扁平化   [x1,y1,x2,y2,...] ↔ [[x1,y1],[x2,y2],...]
- color region detect  flood fill (map-recognition)
- RDP polygon simplify  (map-recognition)
- edge adjacency     邻省自动检测
```

---

## §4·新文件清单

```
新加·
  web/map-editor.html               入口 page (独立)
  web/map-editor-core.js            主 state + render loop + camera
  web/map-editor-tools.js           pen / edit / split / merge / select 工具
  web/map-editor-panel.js           right panel·6 tab 字段表单
  web/map-editor-layers.js          涂层切 + 热图算法
  web/map-editor-validation.js      validation
  web/map-editor-dynasty.js         朝代 preset·level label / 默认值 / sample
  web/map-editor-ai.js              AI 辅助 (接 editor-ai-gen)
  web/map-editor-timeline.js        时序剧本 (阶段 3)
  web/map-editor-io.js              import (image / json) + export (json / GeoJSON)
  web/map-editor-undo.js            undo / redo stack

修·
  web/editor.html                   移除 map link
  web/index.html                    加 map editor 独立 entry (页脚 link)

后期可加·
  web/data/maps/dynasty/han.json    汉地图模板
  web/data/maps/dynasty/tang.json   唐
  web/data/maps/dynasty/song.json   宋
  web/data/maps/dynasty/yuan.json   元
  web/data/maps/dynasty/ming.json   明
  web/data/maps/dynasty/qing.json   清
  ...
```

---

## §5·schema·**参考现有游戏 (6 层 + 5 自治 + ~50 字段)**

完整 schema 抽自现有代码 (editor-administration.js / editor-division-deep.js / tm-feudal.js)·

### A·identity (10)
```
id (auto·div_<timestamp>)
name (required)
level (country/province/prefecture/county/district)
levelLabel (per dynasty·"行省"/"路"/"府"/"州"/"县")
description
officialPosition (郡守/县令/...)
governor (current holder name)
dejureOwner (de jure 派系)
capitalChildId (子级 id·继承 governor/tax)
regionType (normal/jimi/tusi/fanbang/imperial_clan)
```

### B·geometry (新加·9)
```
polygon       顶点链 [[x,y],...] (or flat [x,y,x,y,...])
centroid      [x,y] 自动算
area          自动算
neighbors     [id, ...] 自动算 + 手动覆盖
bbox          边界盒
bitmap_color  bitmap 法的省色 RGB tag
z_order       覆盖顺序
treats_as     "实控" / "羁縻" / "朝贡"
treaty_year   边界生效年份
```

### C·population (12·复用)
```
population            number | populationDetail
populationDetail·
  households · mouths · ding · fugitives · hiddenCount
byAge·                old / ding / young (count + ratio)
byGender·             male · female · sexRatio (default 1.04)
bySettlement·         fang / shi / zhen / cun (mouths + households)
byEthnicity·          {汉:0.95, 满:0.03, ...}
byFaith·              {儒:0.3, 佛:0.2, 道:0.15, 民间:0.35, ...}
baojia·               baoCount / jiaCount / paiCount / leadingGentry / registerAccuracy
```

### D·economy & fiscal (10·复用)
```
prosperity            0-100
taxLevel              轻/中/重
terrain               平原/丘陵/山地/水乡/沿海/沙漠/草原
specialResources      "盐、铁、丝绸"
carryingCapacity·     arable · water · climate · historicalCap · currentLoad · regime
fiscalDetail·         claimedRevenue · actualRevenue · remittedToCenter
                      retainedBudget · compliance · skimmingRate · autonomyLevel
publicTreasuryInit·   money · grain · cloth
```

### E·governance & autonomy (10·复用)
```
minxinLocal           0-100
corruptionLocal       0-100
autonomy·
  type (zhixia/fanguo/fanzhen/jimi/chaogong)
  subtype (fanguo: real/nominal)
  holder (vassal/tributary 派系)
  suzerain (玩家派系)
  loyalty (60-100)
  tributeRate (0.01-0.3)
permissions·
  appoint / tax / edict / reform·each: { allow, mode, cost }
```

### F·history (新加·递归·5)
```
timeline      [{year, name, level, owner, governor, ...} 快照] 数组
establishedYear
abolishedYear
renamedFrom
renamedTo
```

### G·flags (新加·9)
```
isCapital · isFrontier · isDeposit · isJunDi · isTunTian
isPiao · isTradePort · isPilgrim · isHistoric
```

---

## §6·朝代 preset (map-editor-dynasty.js)

```js
DYNASTY_PRESETS = {
  shang_zhou: {
    label: '商·周',
    levels: ['天下', '邦国', '采邑'],
    autonomy_default: 'fanguo',
    bitmap_anchor: '中原 + 四夷'
  },
  qin: {
    label: '秦',
    levels: ['天下', '郡', '县'],
    autonomy_default: 'zhixia',
    bitmap_anchor: '36 郡'
  },
  han: {
    label: '汉',
    levels: ['天下', '州', '郡国', '县'],
    autonomy_default: 'mixed',
    bitmap_anchor: '13 州 + 西域都护府'
  },
  tang: {
    label: '唐',
    levels: ['天下', '道', '州', '县'],
    autonomy_default: 'zhixia + jimi (西域)',
    bitmap_anchor: '10 道 + 都护府'
  },
  song: {
    label: '宋',
    levels: ['天下', '路', '府/州', '县'],
    autonomy_default: 'zhixia',
    bitmap_anchor: '23 路'
  },
  yuan: {
    label: '元',
    levels: ['天下', '行省', '路', '府', '州', '县'],   // 5 levels !!
    autonomy_default: 'zhixia + jimi (吐蕃)',
    bitmap_anchor: '11 行省 + 宣政院'
  },
  ming: {
    label: '明',
    levels: ['天下', '布政司/都司', '府/直隶州', '州', '县'],
    autonomy_default: 'zhixia',
    bitmap_anchor: '13 布政司 + 7 都司 + 2 直隶'
  },
  qing: {
    label: '清',
    levels: ['天下', '省/将军辖区', '府/直隶州', '县/散州'],
    autonomy_default: 'zhixia + jimi (蒙/藏/疆)',
    bitmap_anchor: '18 省 + 5 将军辖区'
  },
  republic: {
    label: '民国',
    levels: ['天下', '省', '行政督察区', '县'],
    autonomy_default: 'zhixia',
    bitmap_anchor: '35 省'
  }
}
```

---

## §7·主屏 layout

```
┌──────────────────────────────────────────────────────────────┐
│ ① toolbar (44px)                                             │
│   new · open · save · import · export · undo · redo · ?    │
│   [朝代 dropdown]  [时序 dropdown]  [layer 切]               │
├──────────────────────────────────────────────────────────────┤
│ ② left panel (~200px) │  ③ canvas 主体  │ ④ right (~360px)  │
│   - layer toggle      │                  │   tab·            │
│     ☑ bitmap          │   pen / select   │     geo · pop ·   │
│     ☑ polygon         │   drag / zoom    │     econ · gov ·  │
│     ☑ label           │   hover 高亮省   │     history ·     │
│     ☐ heat (4 切)     │   click 选省     │     flags         │
│     ☑ border          │                  │   字段表单 ~50    │
│     ☐ centroid        │                  │   validation chip │
│     ☐ history         │                  │                   │
├──────────────────────────────────────────────────────────────┤
│ ⑤ status (28px)·总省 N · 当前 X · [x,y] · zoom % · stack    │
└──────────────────────────────────────────────────────────────┘
```

---

## §8·工具栏 (canvas left·~9 工具)

```
V·  select  单选·shift 多选·ctrl 取消
P·  pen     画 polygon·点顶点·dbl 闭合·esc 取消
E·  edit    拖顶点·alt+click add·shift+click del
S·  split   剪刀·划线分省 (polygon split + 数值 split prosperity 等比)
M·  merge   合并选省 (polygon merge + 数值 sum)
T·  text    label 标注 (大字 / 小字 / 旧名)
H·  hand    拖图
Z·  zoom    点放大·alt 缩小
A·  AI fill 选省 → AI 推默认 (基于 name + level + region + dynasty)
```

---

## §9·涂层 (4 切 + 默认)

```
none·       原色 polygon
人口热图·   mouths 段色 (5 段·浅紫 → 深红)
税热图·     fiscalDetail.actualRevenue 段色
兵热图·     军额 (从 GM.armies join) 段色
文化·       byEthnicity dominant 色
宗教·       byFaith dominant 色
边界·       autonomy.type 色 (实控蓝 / 羁縻黄 / 朝贡浅 / 藩镇红)
自治类·     regionType + autonomy.type 双色
```

---

## §10·validation (实时·绿黄红)

```
邻省闭合·   省 A 邻 B → 必须 B 邻 A (绿) / 一边邻 (黄·提示) / 完全无 (红)
人口和·     儿和 ≤ 父总 (绿) / > 父总 (红)
治所唯一·   capitalChildId 必须存在·非循环
autonomy·   autonomy.type ≠ '' 时·suzerain 必填
level 兼容· dynasty 不允许的 level 报警 (秦·level=district 红)
geometry·   polygon ≥ 3 顶点·area > 0·闭合
neighbor 算 自动·与 manual 不一致时显两数
```

---

## §11·阶段 1·MVP (~2 周·从今起)

```
目标·  能用·任意朝代任意省份数·画 polygon + 编 5 字段表层 + 全 schema 后台

文件·
  i.    web/map-editor.html (~150 行 DOM)
  ii.   web/map-editor-core.js (~600 行·state + render loop + camera)
  iii.  web/map-editor-tools.js (~400 行·pen + select + edit + drag + zoom)
  iv.   web/map-editor-panel.js (~500 行·right panel·5 字段表层 + 完整 schema 后台)
  v.    web/map-editor-undo.js (~150 行·undo stack)
  vi.   web/map-editor-io.js (~300 行·image import + json import/export)
  vii.  web/map-editor-dynasty.js (~250 行·9 朝代 preset)

字段表层·  
  阶段 1 right panel 暴 5 字段·全 schema 在后台·import/export 完整保留
    - name
    - level (按朝代 levelLabel)
    - terrain
    - mouths (population.mouths)
    - autonomy.type

测试·  能加载 default-map.json·画 5-10 polygon·切朝代·导出 / 导入

完成 marker·  user 能开 web/map-editor.html·画一张明末 13 布政司轮廓·导出 JSON
```

## §12·阶段 2·**P 社 schema** (~3 周)

```
- 全 ~50 字段 right panel 6 tab 分组 (geo / pop / econ / gov / history / flags)
- 4 涂层切 (人口 / 税 / 文化 / 边界)
- batch select + 公字段编辑
- AI 辅助 (editor-ai-gen 接入)·选省 → AI 填默认
- validation chip 全套
- 邻省自动检测 + manual override
```

## §13·阶段 3·**时序剧本** (~2 周)

```
- timeline array·快照 diff view
- 朝代切换 (load 不同 base bitmap·切 levelLabel)
- 跨剧本 diff·"明 1627 vs 1644 失土显红"
- 历史考据 source 引用字段
- 朝代 → 朝代 transition (元 → 明 / 明 → 清)
```

## §14·阶段 4·**全朝代复用** (~3 周)

```
- 9 朝代 preset 全实装 (商周 / 秦 / 汉 / 唐 / 宋 / 元 / 明 / 清 / 民)
- 朝代 schema 差异 (路 / 道 / 行省 / 布政司·level 名字)
- 跨朝代字段映射 (同一土地不同朝代叫名)
- 历史 timeline 拖拽看朝代切换
- 默认 sample data per 朝代 (web/data/maps/dynasty/*.json)
```

总·**~10 周·阶段 1 优先 2 周内**·

---

## §15·与 Phase 8 image gen 的关系

```
当前·    Phase 8 image gen 暂停 (Wave 0 trial v3 docs 留档备查)
       地图编辑器优先·根基级
       
原因·    P 社 paradigm = 地图驱动·没编辑器游戏只有死地图
       image gen 是 visual surface·地图是 data layer·数据先于图

恢复·    阶段 1 完后 (能开编辑器画 polygon)·可恢复 image gen·并行 Codex 出图
       Wave 0 trial v3 letter 仍 ready·随时启
       建议·  阶段 1 完后·Codex 出 1 张皇城鸟瞰 trial·验视觉 + 同期编辑器进 phase 2
```

---

## §16·next step

```
1·  user 接受 spec → ACK
2·  Claude 开始·
    a)  删旧 5 文件 (~5040 行)
    b)  创建 web/map-editor.html + 7 新 js 文件 (~2400 行)
    c)  阶段 1 MVP·~2 周内 user 可开页画图导出
3·  阶段 1 完后 user 试用·决定阶段 2 范围
```

---

ready·

— Claude (Phase 8·map editor spec·全朝代·P 社级·2026-05-06)
