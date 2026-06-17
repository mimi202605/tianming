# 地图编辑器使用指南·tianming

date·2026-05-06·target·user·tester·

---

## 0·入口

```
独立 page·         web/map-editor.html
                   双击直接开 (不必起 server·所有 JS 都本地)
                   兼容 Chrome / Edge / Firefox 现代版

集成入口·         web/editor.html 侧栏 [地图编辑器] (新窗口打开)
```

---

## 1·快速 5 分钟·从零到一

```
1·  开 web/map-editor.html
    默认载明朝·空地图
    
2·  载样本·  顶栏 [载样本]
    按当前朝代 (默认明) 生成 24 省 placeholder polygon
    布局按近似地理 hint·东南西北位置基本对
    
3·  V 工具选省·shift 多选·点 [载样本] 已选省继续
    或 P 工具自己画 polygon (闭合·点首点 / 距 ≤ 12px)
    
4·  右 panel 编省字段·6 tab (基本/人口/经济/治理/史/标)
    阶段 1 表层 5 字段·完整 ~50 字段后台保留
    
5·  改朝代 (顶栏 dropdown) → [载样本] 载入清朝·覆盖
    ⤴  此前数据不会丢·可保存到 atlas
    
6·  顶栏 [atlas] → [⤴ 保存当前到库] → 当前朝代入 localStorage
    切朝代再载样本·共可保存 9 朝代地图同时
    
7·  导出 JSON·  顶栏 [导出]·下载 .json (含 timeline / sources / 全字段)
```

---

## 2·工具栏·9 工具

```
┌──┬──────────────────────────────────────────────────────────┐
│V │ 选 (select)·点选省·shift 多选·click 空白清选            │
│P │ 画 (pen)·点顶点·近首点闭合·snap 邻省顶点                │
│E │ 编 (edit)·拖顶点·alt+click 边·加点·shift+click 顶点·删点│
│H │ 拖 (hand)·或按住空格·拖图                                │
│Z │ 缩 (zoom)·点放大·alt+点缩小·或滚轮·zoom 0.1×-10×        │
│M │ 合 (merge)·阶段 2 待·选多省合并 polygon + 数值           │
│S │ 切 (split)·阶段 2 待·剪刀划线分省                        │
│T │ 字 (text)·阶段 2 待·画 label / 注释                      │
│A │ AI 填·阶段 2·选省 → AI 推默认字段值 (无 AI 时 rule)      │
└──┴──────────────────────────────────────────────────────────┘
```

---

## 3·快捷键

```
V/P/E/H/Z       切工具
空格 (按住)      暂时拖图
Esc             pen 中清当前·或 select 中清选
Del / Backspace 删选省
Ctrl+Z          undo (max 50 深)
Ctrl+Y          redo (or Ctrl+Shift+Z)
0               居中·适配视图
+ / -           zoom in/out
```

---

## 4·schema·~50 字段·6 tab

### A·基本 tab (10)

```
name              省名 (必)
description       备注
level             级别 (按朝代切 levelLabel)
officialPosition  主官称呼 (郡守/县令/...)
governor          当任 (人物名)
dejureOwner       法定派系
regionType        normal/jimi/tusi/fanbang/imperial_clan
treats_as         实控/羁縻/朝贡/虚封/名义
treaty_year       条约年
z_order           覆盖序
capitalChildId    子级 div id (继承 governor/tax)
crossDynastyId    跨朝代地点链接 (atlas 用)
```

### B·人口 tab (12)

```
populationDetail.households   户数
populationDetail.mouths       口数 (主)
populationDetail.ding         丁数 (能服役者)
populationDetail.fugitives    逃户
populationDetail.hiddenCount  隐户

byEthnicity                   族群占比 ratio map (sum=1)
byFaith                       信仰占比 ratio map (sum=1)

baojia                        保甲 (阶段 3 编)
```

### C·经济 tab (16)

```
prosperity                    繁荣 0-100
taxLevel                      轻/中/重
terrain                       平原/丘陵/山地/水乡/沿海/沙漠/草原/高原
specialResources              主产物 (盐/铁/丝绸/茶/...)

carryingCapacity·6 字段       arable / water / climate / historicalCap / currentLoad / regime

fiscalDetail·7 字段           claimed / actual / remitted / retained / compliance / skimming / autonomyLevel

publicTreasuryInit·3 字段     money / grain / cloth
```

### D·治理 tab (~20·含 permissions)

```
minxinLocal       地方民心 0-100
corruptionLocal   地方腐败 0-100

autonomy·         type (zhixia/fanguo/fanzhen/jimi/chaogong)
                  subtype (real/nominal·只对 fanguo)
                  holder (受封者派系)
                  suzerain (宗主派系)
                  loyalty 0-100
                  tributeRate 0-1

permissions·4×3   appoint / tax / edict / reform·each: { allow, mode, cost }
```

### E·史 tab

```
establishedYear   设置年
abolishedYear     废止年 (空 = 一直在)
renamedFrom       前名
renamedTo         后名
timeline·         快照 array·{year, ...partial fields} 增量 patch
sources·          史源 array·{title, author, juan, page, year, note}
```

### F·标 tab·9 flags

```
isCapital·         都城
isFrontier·        边镇
isJunDi·           军镇
isTunTian·         屯田
isTradePort·       商埠
isPiao·            流放地
isPilgrim·         宗教圣地
isHistoric·        历史名城
isDeposit·         矿藏
```

---

## 5·9 朝代·level 差异

```
商周·     天下 / 邦国 / 采邑                  (3 级·分封)
秦·       天下 / 郡 / 县                      (3 级·郡县制起源)
汉·       天下 / 州 / 郡国 / 县                (4 级·郡国并行)
唐·       天下 / 道 / 州/府 / 县                (4 级·道为监察)
宋·       天下 / 路 / 府/州 / 县                (4 级·路司分掌)
元·       天下 / 行省 / 路 / 府 / 州 / 县        (5 级!)
明·       天下 / 布政司/都司 / 府/直隶州 / 州 / 县 (5 级·分军民)
清·       天下 / 省/将军辖区 / 府/直隶州 / 县/散州 (4 级·内地+将军辖)
民国·     天下 / 省 / 行政督察区 / 县            (4 级)
```

切朝代·  顶栏 dropdown → 自动切 level 显名·已存 division 的 level 字段不变
        若 level 与新朝代不兼容·validation 会报警

---

## 6·5 自治类型·permission 矩阵

| 类 | 中文 | 任免 | 征税 | 诏令 | 改制 |
|---|---|---|---|---|---|
| zhixia | 直辖 | 直接 | 直收 | 诏令直达 | 可推行 |
| fanguo (real) | 藩国实封 | 不干涉 | 仅贡奉 | 经藩王 | 不干涉 |
| fanguo (nominal) | 藩国虚封 | 中央节制 | 食邑比例 | 直达 | 可推行 |
| fanzhen | 藩镇 | 自任 | 仅名义贡 | 须先请 | 强推必反 |
| jimi | 羁縻土司 | 世袭承袭 | 定额土贡 | 敕谕转达 | 需改土归流 |
| chaogong | 朝贡外藩 | 不干预 | 仅朝贡物 | 仅外交 | 不干涉 |

---

## 7·涂层·5 模式

```
none            默认·按 autonomy.type 着色
人口            mouths 段色·5 段·浅紫 → 深红
税              actualRevenue / claimedRevenue 段色
族群            byEthnicity dominant key 着色
信仰            byFaith dominant key 着色
自治类          autonomy.type 5 类着色 + dashed border
```

切·  顶栏 [涂层] dropdown
legend·  canvas 右上自动显·按选项动态

---

## 8·校验·7 类规则·实时

```
GEO_POLY        polygon < 3 顶点                   (error)
GEO_AREA        area = 0 (可能自相交)              (warn)
LVL_INCOMPAT    level 不在朝代允许                 (warn)
AUT_HOLDER      autonomy ≠ zhixia 但 holder 空     (warn)
AUT_LOYALTY     loyalty < 0 或 > 100               (error)
AUT_TRIBUTE     tributeRate < 0 或 > 1             (error)
POP_ETH         byEthnicity sum ≠ 1                (warn)
POP_FAITH       byFaith sum ≠ 1                    (warn)
POP_AVG         户均口 < 1 或 > 12                 (warn)
POP_DING        ding > mouths                      (error)
POP_FUG         fugitives > households             (warn)
NB_GHOST        neighbor 指向不存在                 (warn)
NB_ASYM         邻省非对称 (A→B 但 B 不→A)         (warn)
CAP_GHOST       capitalChildId 不存在               (warn)
CAP_SELF        capitalChildId = self               (error)
DUP_NAME        重名                                (warn)
```

底栏校验 chip·click → 详情 list·click 行 → 跳转省

---

## 9·timeline·时序剧本

### 9.1·snapshot 是什么

```
每 division 有 timeline 数组·each 元素 = { year, ...partial 字段 }
解析·  base + 累积所有 year ≤ Y 的 patch·余顺序覆盖
有效·  establishedYear ≤ Y < abolishedYear 时 active
不画·  Y < establishedYear 或 Y ≥ abolishedYear

例·辽东都司·  established 1375·abolished 1644
              1644 起在地图上消失
              if name 在 1644 timeline 里改了·1644 之前显旧名
```

### 9.2·time slider

```
顶栏 time slider·拖动 = 切 viewYear
canvas 实时反映·active 省份·
当前观年下面状态栏显·"观年·1627·在场 X / Y 省"
× 钮清观年 (回 base view)
```

### 9.3·diff·两年比对

```
顶栏 [diff] btn → 弹模态·设 yearA / yearB → 进 diff 模式
canvas 染 6 色·
  绿·新立 (B 出 A 没)
  红·废止 (A 有 B 没)
  蓝·改名
  金·宗主关系变 (autonomy.type 或 holder)
  橙·失/复土 (polygon 变)
  灰·不变

顶部 banner 显 yearA → yearB·色码 legend
[报告] btn → list 明细·click 行跳转
[退出] 退出 diff 模式
```

### 9.4·snapshot 增/编/删

```
单选省 → 史 tab → [+ 加快照]
弹模态·  填 year + 改名 / 改 governor / 改自治 / 此年起废止 / 备注
        每 snapshot = 增量 patch·base 字段不变

[捕快现状]·  把当前 base 关键字段 (name/level/autonomy/governor/dejureOwner/polygon)
              一键写到指定年的 snapshot·便于"截至此年"回溯
```

---

## 10·sources·历史考据

```
单选省 → 史 tab → [+ 加考据]
弹模态·title (必) / author / juan (卷) / page / year / note
sources 数组·导入导出全保留

每条考据·  click [×] 删
```

---

## 11·atlas·跨朝代

### 11.1·crossDynastyId 链接

```
crossDynastyId·   一个唯一 id·标记"同地异朝"
                  例·汉河西郡 / 唐凉州 / 明甘肃·全 cid = pl_xxxx_yy

basic tab 底·     [链接] btn (无 cid 时) / [查看] btn (有 cid 时)
点 [链接]·         弹模态·
                   - 库内同名 / 字面相似 → 建议 list (按 score 排序·100/70/40)
                   - 选一个 → cid 自动生成·两边都 set
                   - 或 [生成新 ID·独立此地]·只本朝独立 cid

点 [查看]·         弹模态·
                   - 显此 cid 的跨朝代历史·按朝代序
                   - 例·汉 河西郡 → 唐 凉州 → 明 甘肃 → 清 甘肃省
                   - [解除链接] 把当前省的 cid 清空 (其他朝代不动)
```

### 11.2·atlas 库 (localStorage)

```
顶栏 [atlas] btn → 弹库浏览模态
[⤴ 保存当前到库]·  当前朝代地图入 localStorage·按朝代 id 索引
                   每朝代只能存 1 张·覆盖

[🔍 跨朝搜地名]·    跨当前 + 库·部分匹配·显多朝代 hits

[载 9 朝代样本]·    一键按朝代 id 载样本·9 朝代任选

库列表·            已存朝代·click [载] 切到此地图·click [删] 移除
```

### 11.3·跨朝代用例

```
1·  为 9 朝各载样本 → atlas 库满·9 朝代地图同存
2·  打开明朝地图·选 "山东布政司" → [链接] → 弹模态
    - 建议·清·山东省 (score 100·完全匹配)·清·山东 (备选)
    - 元·山东 (score 70)·汉·青州 (score 40)
3·  点 链接清山东省 → cid 生成·明清两边都填 cid
4·  切清朝·选 山东省 → [查看] → 显 明 山东布政司 / 清 山东省
```

---

## 12·import / export

### 12.1·image (作 base bitmap)

```
顶栏 [载图]·  png / jpg / bmp / svg / webp
              历史古地图扫描最佳·user 用 P 工具贴边描省界
              半透明显示·不影响看·layer 可关
```

### 12.2·json (整 map state)

```
[载剧]·   .json 解析·覆盖当前
[导出]·   下载 .json·按朝代 + 日期命名
          eg·  ming_2026-05-06.json
          含·全 division + 全字段 + timeline + sources + crossDynastyId

auto-save 30s·  到 localStorage·browser 关也不丢
                draft 自动·下次开询问 [载入草稿]
```

### 12.3·schema 兼容

```
import·   只校 minimal·必含 dynasty + divisions
          缺字段 createDivision 自动补默认
          不识别字段·preserved (forward compat)
          
export·   完整·import 后 export 应等价 (round-trip)
```

---

## 13·性能

```
~50 省·     舒适·所有特性 ok
~500 省·    舒适·neighbor 检测 ~50ms (spatial grid)
~3000 省·   勉强·neighbor ~500ms·undo snapshot 较大 (~500KB / 50 深)
~10000 省· 不推荐·性能未优化到此规模

优化建议·
  - 大地图禁用 label / centroid layer (减 render 工作)
  - 关闭 heat layer (省 quantile 算)
  - 不点 [检邻] 全图·只 [检邻 选省] 增量
  - 频 export·清 localStorage draft (saveDraft 占空间)
```

---

## 14·常见问题

### Q·polygon 画错·怎么改?

```
1·  E 工具·选省·拖顶点
2·  alt+click 边·加顶点
3·  shift+click 顶点·删 (≥ 4 顶点)
4·  全删 polygon → V 工具选省·Del 删·再 P 重画
5·  极其错·导出 JSON·手编 polygon array·重导入
```

### Q·载样本后省的位置不对·怎么办?

```
sample-gen 给的是 placeholder·按 hint 大概位置·
不是真实历史地理·user 后期·
1·  V 选省·拖图找参考底图·E 拖顶点贴边
2·  载真历史地图 png 作底图·overlay 顶替·重画
3·  好版本保留·导出 json·下次直接 [载剧]
```

### Q·atlas 链接错了·怎么解开?

```
basic tab → [查看] → [解除链接]
仅当前省解·其他朝代相同 cid 不动 (你想全解·去其他朝代再点一次)
```

### Q·undo 找不回·怎么办?

```
undo stack max 50 深·超过会丢
长期保存·  [导出] 下载 json·后期可 [载剧] 恢复
auto-save 也会救·下次开会询问 [载入草稿]
```

### Q·diff 模式·canvas 全灰·怎么回事?

```
1·  确认 diff 模式·顶部 banner 是否显
2·  yearA / yearB 设错·或都在 establishedYear 之前 / abolishedYear 之后
3·  没 timeline 数据·只算 base + established/abolished·改 timeline 加 snapshot
4·  退出 diff 模式·[退出 diff 模式] btn
```

### Q·校验 chip 一直红·改不了·

```
点 chip → 看详情列表·click 行跳转省·按 code 修
typical fix·
  - GEO_POLY·polygon < 3·删省 / 重画
  - LVL_INCOMPAT·改 level 字段到当朝代允许的
  - AUT_HOLDER·autonomy ≠ zhixia·填 holder 字段
  - POP_ETH/FAITH·调比例·sum 应 = 1
  - DUP_NAME·改其中一个名
```

### Q·sample-gen 的 polygon 都是 hex·能换形吗?

```
当前·hex 形 (6 边)·  cleaner visual
后期·  user E 工具自由编·任意多边形
如要其他默认形·  改 sample-gen.js makeHexAt 函数·
                例·5 边 = pentagon·8 边 = octagon·circle ~ 12 边
```

---

## 15·dev·扩展点

```
新加朝代·         dynasty.js DYNASTY_PRESETS·复制现有结构
新加 geo hint·    sample-gen.js GEO_HINTS·{ name: { x, y } } 0-1
新加 涂层·        layers.js·POP_RAMP / TAX_RAMP 类·扩 getHeatColor
新加校验·         validation.js·writeNew check function·plug 进 validateOne
新加工具·         tools.js·onMouseDown / onKeyDown 加 case·HTML 加 btn
新加字段·         core.js createDivision·加默认值·panel.js·加表单·sample-gen·default
```

---

## 16·已知不足 (TODO·后期)

```
× 多 polygon 表示飞地 (一个 division 不连续区域)·目前 1 polygon
× ring·polygon 内 hole·目前不支持
× 标签自动避让·polygon 重叠时标签互压
× 分省工具·剪刀划线·阶段 2
× 合省工具·polygon merge + 数值 sum·阶段 2
× 多 polygon overlay 渲染优先级·complex z-order
× 时间线 transition 动画·快进时省份淡入淡出
× 朝代切换 transition (元 → 明 失土地图)
× export 多格式·目前只 json·后加 GeoJSON / 剧本编辑器 schema
× 性能·~10000 省·neighbor 检测 spatial grid 仍偏慢·需 quadtree
```

---

— Claude·tianming map editor user manual·2026-05-06·~5600 行 production code
