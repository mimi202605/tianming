# Phase 8·12 殿设计·**B 方案 LOCKED** (P 社范式·锚法 2 混合)

date·2026-05-07·status·**paradigm 锁定·可启动 Slice 1**·owner·Claude·
基础 draft·`phase8-12palace-plan-B.md`·

---

## §0·锚法

```
锚法 2·混合·EU4 / CK3 各取所长·
锚 EU4·  province click·9-11 map mode·顶栏左资源条
锚 CK3·  character 左侧永驻 panel·顶栏 alert + 右侧 7 management menu

锚法 2 的理由·
  天命字段密度 (省 25+ / 角色 30+) 接近 EU4·
  天命角色密度 (百官 / 后宫 / 宗室) 远超 EU4·CK3 character panel 才够承载·
  task 高频 (每回合奏疏 5-15 件)·CK3 alert + 右侧 menu 适配·
  EU4 国徽 popup 14 tab 不适合天命 (回合制 + 高频 task)·
```

---

## §1·七锁·全部锁定值

| 锁 | 锁定值 | 来源 | 备注 |
|---|---|---|---|
| **1·Hub 模型** | 地图永驻 (B1-α) | claude 起草 | EU4/CK3 共有的 P 社核心 paradigm |
| **2·时间模型** | 纯回合·右下"诏付有司"= 唯一 endTurn (B2-α) | user 2026-05-07 | 不与 P 社实时模型混搭 |
| **3·province click** | EU4 法·popup panel·浮地图上·7 子区 + 2 tab | user 2026-05-07 | 字段密·一屏铺开 |
| **4·character click** | CK3 法·**左侧永驻 panel**·click 任意角色头像 panel 切·内 4 tab | user 2026-05-07 | 多角色高频切·永驻 panel 最适 |
| **5·诏 / 议 / 疏 task 入口** | CK3 法·顶栏 alert + 右侧固定 menu·**8 占位**·内容分配延后 | user 2026-05-07 | shell first·分配后做 |
| **6·view modes / 真假双值** | **暂不做** | user 2026-05-07 | 真假双值不空间化·维持现状 (顶栏 var hover tip 显双值) |
| **7·朝代风格** | 待定 | — | 锁 1-6 优先·朝代视觉留 polish 阶段决定 |

---

## §2·空间结构 (锁定)

```
┌────────────────────────────────────────────────────────────────┐
│ ① 顶栏 56px·perpetual                                          │
│   logo + 资源条 + alert + ... + 时间区 (右上)                   │
├──────────┬───────────────────────────────────────┬─────────────┤
│ ② 左栏   │                                       │ ③ 右栏       │
│ Character│   ④ 中央地图区·永驻                    │ Management   │
│ Panel    │     hover/click province → popup      │ 7 menu icon  │
│ 280-320px│     panel 浮于地图上                   │ 折叠 36px    │
│ (CK3 风) │     地图始终在底·永不替换              │ (CK3 风)     │
│          │                                       │              │
├──────────┴───────────────────────────────────────┴─────────────┤
│ ⑤ 底栏 36px·status / tip / 提示快捷                             │
└────────────────────────────────────────────────────────────────┘

右下浮按钮·诏付有司 (endTurn 唯一·锁 2)
```

---

## §3·顶栏 ① 完整布局 (锁定)

源·维持 `tm-topbar-vars.js` 现状大部·新增右上时间显示区·

```
left ─────────────────────────────────────────────────────────────────── right

[① logo·"天命"印 + 问天]
[② resource 条·7 var 印石·guoku/neitang/hukou/lizhi/minxin/huangquan/huangwei]
[③ alerts 区·彩色 flag·issue/opportunity·click 处理·右键 dismiss]    ← 锁 5 入口之一
[④ 待办 badge·与 alerts 同区或合并]
[⑤ 全部变量 btn]
[⑥ 时间区·**右上**]                                                   ← 锁·时间显示
   主格式·{年号 X 年}{季节}{月分}{干支日}日
         e.g. 崇祯元年春正月乙亥日
              建武十三年夏六月辛子日
   副格式·{公元年} 年 (悬于主格式下方·小字 / 灰)
   源·getTSText(GM.turn) 已实现·公元年 = GM.year / P.time.year
[⑦ 已存 / AI / 设置]
```

### §3.1 时间区视觉细节

```
┌─────────────────────┐
│ 崇祯元年春正月乙亥日  │   主格式·亮色·中号字·color-primary
│   公元 1628 年       │   副格式·灰色·小字·color-tertiary
└─────────────────────┘

→ 右上角·宽度 ~140px·高 ~36px (含 padding)
→ click → 弹小 modal·切到/查看 公元年完整时间 + 节气 + 物候
   (兼容现 #bar-weather 内容·物候并入此 click modal)
→ 顶栏物候印 (#bar-weather) 是否保留 = §3.2 待定
```

### §3.2 顶栏待细拍

```
- 现有物候印 (#bar-weather·季印 + 节气名 + 物候描述) 是否保留 / 折叠 / 并入时间区?
- alerts 与 todo badge 是否合并 1 区?
- 资源条 7 印石位置维持中段还是下移到副条?
```

---

## §4·左栏 ②·Character Panel (锁定·CK3 法)

### §4.1 默认态·永驻·显帝王

```
┌──────────────────┐
│ [画像 + 朝服]     │   ← portrait·按帝王朝代 / 体貌生成·复用现有 char.appearance
│  天启帝            │   ← 称号·{庙号 / 在位皇帝} + (生年 - 卒年 if 已殁)
│  在位 6 年·22 岁    │   ← 计算自 GM.turn 与 character.birthTurn
├──────────────────┤
│ 6 stat bar         │   ← 果敢 / 仁恕 / 智 / 武 / 学 / 工
│ 5 wuchang chip     │   ← 仁义礼智信
├──────────────────┤
│ 大志 (goal)         │   ← character.goal·当朝目标·1-2 行
│ 日程 (agenda)       │   ← 7 日内事·alert stack 一部分
│ 精力 (energy)       │   ← X / Y bar
├──────────────────┤
│ 头衔 / claim       │   ← 朝代 / 国号 / 年号 / 即位日期
│ 关系网快捷 4 chip   │   ← 后 / 储 / 权臣 / 心腹 (each click → 切到该角色)
├──────────────────┤
│ 4 tab              │   ← Family / Social / Court / Vassals
│  Family·  皇族 / 后妃 / 子嗣
│  Social·  友 / 敌 / 师友 / 联姻
│  Court·   召对范围 / 内臣 / 私人
│  Vassals· 藩王 / 节度使 / 外戚封土
└──────────────────┘
```

### §4.2 切角色行为

```
任意位置 click 角色头像 (左栏 4 chip / tab portraits / 朝议 portrait / 起居注 person tag / 
                       右栏 province panel 守土官 / 顶栏 todo 角色 alert)
   ↓
左栏 panel 切到该角色·panel 内容全部刷新
   ↓
panel 顶端出"返回"chip·click 回 player character (帝王自己)·
```

### §4.3 折叠

```
左栏 panel 可折·折后剩 36px 边条·只显帝王画像 + 切角色 chip
hotkey·  Ctrl+1·开关左栏
```

---

## §5·右栏 ③·8 Menu 占位 (shell only·内容分配延后)

### §5.1 决策·**shell first·content later**

```
B 方案 LOCKED 时·user 决·
  现做·  shell (壳子) = 8 个 menu icon 占位·click → 展开右栏 panel·
        panel 内容 placeholder·只显"待分配"
  后做·  content allocation = 把现 95 UI 触点 (21 左 + 13 右 + 15 tab + 7 var
        + 4 浮按钮 + 6 fab + 17 modal) 分到 8 个 menu·
        独立 slice·与 shell 解耦·

理由·
  - shell 是视觉 + 交互范式·与具体内容无关
  - shell 锁定后·内容分配怎么变·壳不动
  - Claude 前次提分组 (#4 百官重 / 史档无归处 / 文教无归处 / ...) 错位·
    全部留待内容分配 slice 讨论·
  - shell 实施后·user 可对实际 UI 反馈·再分配更准
```

### §5.2 8 个 menu icon 占位 (shell)

```
right side·vertical 8 icon 列·CK3 风
默认 collapsed·只显 icon (~36px 宽)
click icon → 展开右栏·宽 280-320px·panel 显占位文字 "待分配"
ESC / 再 click icon → 折回 36px

8 个 icon 暂用占位符·
  Slot 1 / Slot 2 / Slot 3 / Slot 4 / Slot 5 / Slot 6 / Slot 7 / Slot 8

每 slot icon 用通用 glyph (圆 / 方 / 横线·或编号 1-8)·
content allocation 后再换具体 icon (官印 / 兵符 / 玺 / ...)·
```

### §5.3 menu icon 行为

```
hotkey·  数字 1-8·切 menu·与 CK3 同 (CK3 是 1-7·此处扩 8)
        Ctrl+2·开关右栏 (任 menu)

panel 行为·
  click slot → 展开右栏 280-320px·panel 显占位 "待分配"
  hover slot → tooltip "Slot N·待分配"
  右键 slot → 暂无行为
  
shell 测试用 demo content·
  panel 顶端·"Slot N"·副 "shell only·content TBD"
  panel 中央·占位图 (border + 文字)
  panel 底端·"关闭" btn·== ESC 行为
```

### §5.4 内容分配 slice (后做·非本 LOCKED 范围)

```
独立 slice·参 §11 Slice 4-5·
input·  现 95 UI 触点 (清单 §10 + §11)
output· 8 个 menu 各 1 个具体内容映射 (类似 §11 12 殿稿·但 8 而非 12)
负责·   user 主导·Claude 提原料 (UI 触点清单 + 7-12 候选分组)·
        非"Claude 提案 + user 圈选"模式·
触发·   shell 实施 (Slice 1-3) 完成后启动·
```

---

## §6·中央区 ④·地图永驻 (锁定)

```
P 社核心·**地图永远在底·任何 panel 浮于其上·panel 不替换地图**·
左栏 / 右栏可半透 / 完全覆盖地图边·中央始终是地图·

interaction·
  hover province → tooltip (省名 + 户口 + 民心·5 字段)
  left click province → popup panel (锁 3·EU4 法·见 §7)
  right click province → diplomatic / 外交·若属敌势力
  drag → 平移地图
  wheel → 缩放
  
mapmode·  右下角按钮·与 EU4 / CK3 同位
         天命 mapmode 候选 (待细拍)·
           1·政区 (势力色·default)
           2·民心 (5 段染色)
           3·财赋 (按年税)
           4·军事 (驻军 / 战略)
           5·文化 (汉 / 各族)
           6·宗教·若启用
         锁 6 决·**真假双值 mapmode 不做** (3 var 双值仍在顶栏 hover tip 显)
```

---

## §7·province click → popup panel (锁定·EU4 法)

### §7.1 panel 形态

```
左键省 → popup panel 浮于地图上 (像 EU4)·
panel 不覆盖左 / 右栏·浮在中央地图上·~360px 宽 × ~480px 高·
非全屏·非右滑·非 modal·关闭按钮在右上角·或 ESC 关·

panel 显示时·该省高亮虚框·邻省可仍 click 切·
```

### §7.2 7 子区结构 (EU4 对应天命)

| EU4 段 | 天命对应 | 字段 |
|---|---|---|
| **top line** | 省名 + 守土官 | 省名 / 等级 (郡 / 州 / 县) / 隶属朝廷 / 历史 / 关闭 |
| **地形 + 发展** | 地理 + 户口 | 地形 / 户口数 / 户口等级 / 增长率 |
| **税收 + 不满** | 财赋 + 民心 | 年税 (银 / 粮 / 布) / 当年缴 / 民心 / 灾异 |
| **demographics** | 文化 + 宗教 | 主体民族 / 占比 / 宗教 / 占比 / 户口构成 (士 / 农 / 工 / 商) |
| **队列 / 建设** | 大役 / 屯田 | 进行中的徭役 / 屯田 / 修筑 / ETA |
| **兵源 / Fort** | 驻军 + 防务 | 驻军兵力 / 主官 / 城防 / 战时状态 |
| **贸易** | 商路 | 商市 / 物产 / 商税·若有 (非全省都有) |

### §7.3 2 tab (EU4 对应)

```
EU4·   Buildings tab + Institutions tab
天命·  Buildings → "建筑 / 设施" tab·显省内·官署 / 仓库 / 漕运 / 武库 / 兵营 / 学
       Institutions → "祭祀 / 文化推行" tab·显省内·庙学 / 礼制 / 移风易俗
       (institutions 在 EU4 是科技扩散·天命可换为"礼制推行" / "汉化进度"·待细拍)
```

### §7.4 守土官 click

```
panel 内 "守土官" 字段是角色名 link·
click → 左栏 character panel 切到该官·**与省 popup 不冲突**·
       省 popup 仍 open·user 可看任免后回省·
```

---

## §8·跨屏永驻·universal overlay

```
顶栏 ①·              永驻·resources + alerts + 时间 (右上)
左栏 ②·              永驻·character panel (折后 36px)
中央 ④·              永驻·地图
右栏 ③·              永驻 icon 列 (折后 36px)·展开 280-320px
底栏 ⑤·              永驻·status / tip
浮按钮 (右下)·       诏付有司 (endTurn 唯一)
modal universal·     问天 / 设置 / 全部变量 / 暂停 / 帮助 / 邸报 / 存档·浮于全屏

不存在·
  - "ledger 子屏"·B 方案 LOCKED 不要·所有内容并入右栏 7 menu
  - "切屏 / replace 地图"·任何 panel 都浮于地图·非替换
  - "全屏 modal" 形 panel·只 universal modal (问天 / 邸报 / 设置) 是全屏覆盖
```

---

## §9·与 A 方案对应表 (LOCKED 版·B 方案承担)

| A 方案·9 殿 | B 方案·落点 | 迁移成本 |
|---|---|---|
| 御书房 | 右栏 #7"诏议疏" + 顶栏 alerts | 重 |
| 紫宸殿 (朝议) | 右栏 #7"议" sub (锁 5 候选 1) | 中 |
| 鉴人堂 (官制 / 人物 / 任免) | 右栏 #4"百官" + 左栏 character panel | 中 (一分二) |
| 户部 | 右栏 #1"朝政" 内·或 顶栏 var click | 待细拍 |
| 舆图厅 | 中央地图 + 右栏 #2"军地" | 轻 |
| 礼神坛 | 待·暂入右栏 #1"朝政" sub | 中 |
| 兰台 (史档) | 待·候选位置·universal modal·或第 8 menu | 待细拍 |
| 学宫 | 待·候选位置·右栏 #1"朝政" sub | 待细拍 |
| 风闻阁 | 右栏 #5"风闻" | 轻 |
| 大臣府邸 visit | 左栏 character panel 内"召对" sub-action | 中 |

> 注·B 方案 LOCKED 后右栏 7 menu 已定·**史档 / 文教 / 礼神** 三块尚无明确归属·属 §10 的 follow-up 决策·

---

## §10·LOCKED 后的 follow-up 决策清单 (要 user 二轮拍)

```
F1·  ★内容分配 slice·把 95 UI 触点分到 8 menu·shell 完成后启动·
     - input·  清单 §10·95 触点 + §11 12 殿初稿
     - output· 8 个 menu 各 1 映射·user 主导·Claude 提原料
F2·  锁 6 复议·真假双值是否在顶栏 var hover tip 显双值 (现状已显·确认即可)
F3·  锁 7·朝代风格 polish 阶段决·暂不锁
F4·  顶栏物候印 (#bar-weather) 保留 / 折叠 / 并入时间 click modal·§3.2
F5·  province popup 内 "Institutions tab" 改名"礼制推行" / "汉化"·§7.3
F6·  mapmode 6 套候选确认·§6
F7·  shell 完成后·user 反馈右栏 8 是否合适·或调 6 / 9 / 10·
```

旧 F5 (党争 / 风闻 合并) 与 F6 (史档 / 文教 / 礼神 归属) 撤·
  → 这些是内容分配问题·入 F1 处理·

---

## §11·实施切片 (LOCKED 后·shell first)

```
═══════ shell phase·内容分配前·~10-14 工作日 ═══════

Slice 1·  顶栏布局重排
          + 新增右上时间区·主+副格式·复用 getTSText (tm-ai-infra.js:1884)
          + 右下"诏付有司" floating btn 样式调整 (现已有)
          目标·顶栏 + 右下 endTurn 完成
          ~2-3 工作日·

Slice 2·  左栏 character panel shell
          frame + 帝王 portrait + 6 stat + 4 tab 占位
          click 角色头像 → panel 切·先用现 viewRenwu 数据
          ~3-4 工作日·

Slice 3·  右栏 8 menu icon shell
          vertical 8 icon 列·click → 展开 280-320px panel·
          panel 内容 placeholder "Slot N·待分配"·
          hotkey 1-8 / Ctrl+2 折叠
          ~2-3 工作日·

Slice 4·  province click → popup panel shell·EU4 法
          7 子区 + 2 tab 框架·字段先 placeholder·
          关闭 + 守土官 click → 切左栏 character
          ~3-4 工作日·

═══════ content allocation·shell 完成后启动·user 主导 ═══════

Slice 5·  内容分配 slice (F1)·user 决·8 menu 各 1 映射
          input·清单 95 触点·output·8 menu 内容表
          ~独立讨论·非 coding 时间

═══════ content phase·分配完成后·~18-25 工作日 ═══════

Slice 6·  右栏 8 menu 内容实装·按 Slice 5 的分配·从最高频 menu 起
          ~7-10 工作日·

Slice 7·  province popup 字段 wire (依 Slice 4 框架)
          GM.provinceStats / div.fiscalDetail / div.populationDetail·
          ~3-4 工作日·

Slice 8·  顶栏 alerts 区改造·CK3 法 event icon + Situational Report
          ~3-4 工作日·

Slice 9·  Codex Wave·地图底纹 + 框纹 + menu icon raster + portrait base
          ~30-50 张·分 3-4 批·

Slice 10· polish·折叠动画 / hotkey / mapmode / 朝代风格 (锁 7)
          ~5-7 工作日·

合计·   shell ~10-14 + content ~18-25 = ~28-39 工作日·
        分两段·shell 锁定后内容分配可慢慢谈·非阻塞·
```

---

## §12·废弃 (前次 draft 中的错断·留档)

```
废 1·  "右滑面板覆盖 30% 地图" → 实 EU4 是 popup 浮地图上·已改 §7
废 2·  "alert stack 在 P 社右上" → 实 EU4 在顶栏左 / CK3 在顶栏 (event icon)·
       已改 §3 + §5
废 3·  "hover 小卡 + click 全面板·CK3 风" → 实 CK3 是左侧永驻 panel·click 切·
       已改 §4
废 4·  "7 var click → ledger 子屏" → 实 EU4 / CK3 都没"ledger 切屏"·
       维持现状·var click → modal·已改 §3
废 5·  "ledger 屏会替换地图" → 实地图永驻·已改 §6 + §8
废 6·  锁 6 真假 mapmode·user 暂不要·维持顶栏 hover tip 双值

教训·  Claude 没玩过 P 社·训练数据 UI 描述零散·5 处 paradigm 全错·
       已存 memory·feedback_paradox_ui_unreliable
```

---

— Claude·Phase 8·B 方案 LOCKED·锚法 2 混合 EU4/CK3·2026-05-07·

**下一动·user 拍 F1 (锁 5 细拍·诏议疏 = 候选 1 / 2 / 3) → 启动 Slice 1**·
