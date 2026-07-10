# 奏报失真层（真值 vs 上报值）· 全域战役设计稿

- 日期：2026-07-11 · owner 拍板「全域一次到位」（玩家反馈：严格史实模式真数值仍显示·朝廷数值成摆设）
- 源头共识（2026-07-04 群议·owner 认可）：底层核心数据为真值，玩家（皇帝视角）看到的是加工过的上报值。吏治管「面」（地方汇总数按吏治偏移·方向固定往粉饰偏），忠诚/性格管「点」（单个 NPC 奏报真不真、怎么歪法）。
- 先例：役政域已跑通（tm-renli.js：`GM.renli.byRegion` 真值 / `GM.renli.reported` 官报口径·奏疏读粉饰值·门生密报读真值·方志对照行）。本战役 = 把这个范式推广到全域并接通显示侧。

## 一、架构铁律（源头共识·不可违）

1. **上报值必须是视图层纯推导**：`上报值 = f(真值, 经手人忠诚/性格, 吏治, 回合内确定性种子)`。**不落库、不做第二本账**——否则核验盲区 + 同回合数字跳动被当 bug 报。
2. **GM 永远是真值本账**：确定性系统、AI 推演引擎全部照旧读真值，零改动。失真只发生在「给玩家看」的最后一层。
3. **面板会骗人 = 换游戏契约**：必须做成可开关玩法层——只在严格史实模式（`P.conf.gameMode === 'strict_hist'`）激活，另配设置开关可关（家规：设 flag 必配设置开关）。演义/正剧模式一切照旧。
4. **据奏值 UI 必须明确标注**（「据奏」徽/tooltip 注明口径），否则故意偏差会污染 bug 反馈渠道。
5. **同回合内数字必须稳定**：种子 = hash(sid, turn, domain, key)。回合推进上报值才变。
6. **失败禁玄幻**：偏移量有据可依（吏治分值、经手人忠诚），不是随机骰。

## 二、核心引擎（S1·tm-reported-view.js）

```
TM.ReportedView = {
  active(P)                      // strict_hist && 设置开关 → true
  value(domain, key, trueVal, ctx) // → { shown, distorted, basis }  纯函数
  badge(basis)                   // 「据奏」徽 HTML（tooltip：经手/口径）
  revealed(domain, key)          // 该键是否已被掀开（读 GM._reportedReveals）
  reveal(domain, key, source, turns) // 揭真登记（厂卫/动刑/查案 掀开后 N 回合内显真值）
}
```

- **偏移模型**（镜像 renli.refreshReported 的手法·推广化）：
  - 面偏移：`吏治因子 = clamp((60 - 吏治) / 60, 0, 1)`——吏治越烂粉饰越狠；方向固定：坏消息缩小（灾荒/欠饷/流民报少），好消息放大（岁入/兵额/垦田报多）。
  - 点偏移：ctx.handler（经手人）忠诚 < 40 或性格贪伪 → 追加个人歪曲；忠诚 > 75 的直臣经手 → 偏移减半。
  - 种子抖动：±小幅确定性噪声，防「一眼看出固定比例」被玩家心算还原。
  - 幅度封顶：偏移绝对值 ≤ 真值的 35%（防荒诞）。
- **揭真状态**（唯一落库的小状态）：`GM._reportedReveals = { 'fiscal:guoku': {turn, source, ttl} }`——记录「哪些键已掀、几回合内显真」。这不是第二本账（不存数值，只存许可），情势推移（ttl 过）后重新蒙尘。
- **AI 侧一致性**（S7）：NPC 奏疏/对话引用数字时用据奏口径（奏疏已有先例）；玩家动刑/厂卫所得引真值。

## 三、揭真通道（复用既有机制·不新造）

| 通道 | 现状 | 接线 |
|---|---|---|
| 派员查案 | 闭环已做（揭隐产开抄家门） | 查案成功 → reveal(域, 键) |
| 厂卫密奏 | 谍报 S3 暗流风闻已有 | 密奏产出附真值段 + reveal |
| 门生密报 | renli 已有（读真值） | 范式照搬到新域 |
| 动刑/诏狱 | 下狱识别已有单一真源 | 拷问产出 → reveal 对应域 |
| 方志对照 | renli 已有对照行 | 各域详情页加「据奏 vs 密报」对照（已揭时） |

## 四、分波（S1-S7·每波独立可验可推）

- **S1 核心引擎**：tm-reported-view.js + 设置开关（典章册页）+ smoke（纯函数性/确定性/封顶/揭真 ttl）。
- **S2 财政域**：国库/太仓/岁入岁出显示面接 ReportedView（rightrail 户部财计 + 御案财政卡双轨 + 抽屉）。内帑（皇帝私账）永远真值——皇帝自己的钱骗不了自己。
- **S3 民生域**：民心/阶层满意度显示面（纲纪总览紧凑行 + 详情 flyout + 舆图热力 + 民心抽屉）。
- **S4 役政/人口接通**：renli.reported 既有产线接通面板显示侧（方志/地块检签/行政区划人口）。
- **S5 军额域**：名员 vs 实额（剧本已有「名员12万实6万」文案先例）——名册显名员（据奏），核饷/整训/亲征点验掀实额。
- **S6 揭真通道统一接线**：三、表中四通道全部接 reveal()。
- **S7 AI 侧口径**：奏疏/NPC 对话引用数字走据奏口径注入（sysP 侧）·厂卫/拷问产出走真值。
- 波序理由：S1 打地基；S2 财政是玩家最常盯的数字（反馈点名「朝廷数值」）；S3-S5 铺面；S6-S7 收口。每波之间回桌。

## 五、显示面清单（S2-S5 施工图·2026-07-11 侦察·行号为侦察时点值）

### 贯穿性发现（改写波次策略）
- **民心/吏治/皇威的双轨字段早已存在**：`GM.minxin.perceivedIndex`、`GM.corruption.perceivedIndex`、`GM.huangwei.perceivedIndex`（产线：tm-minxin-ledger / tm-corruption-engine / tm-authority-engines / tm-integration-bridge）——但所有顶栏/抽屉把真值当标题、perceived 塞 tooltip 小字。→ S3 对这三域是「掉头」（据奏当标题·真值须揭）不是从零造。
- **财政/户口(全国口径)/军额三域连 perceived 字段都没有**——全程真值。
- **strict_hist 空头承诺**：tm-endturn-prompt.js:2220 已向 AI 声明「严格史实=官报粉饰率更高、信息偏差更大」——纯文案、无数据管线。本战役就是兑现这行承诺。review 时勿被这行误导以为已实现。
- **renli.reported 是落库第二本账**（与本稿铁律①冲突的既成先例）——新引擎一律纯推导；renli 产线暂不动（自洽且有消费端），S4 只接显示侧，长期归并另议。

### 域面清单
- **财政（S2·改造面最重）**：顶栏帑廪 `tm-topbar-vars.js:108-170 _renderGuoku`（GM.guoku.money/grain+岁入岁出）；内帑 `:172-234`（**永真值**）；右rail 户部财计 `phase8-formal-rightrail.js:1216-1240 renderFinanceRich`；帑廪抽屉 `tm-guoku-panel.js:67-270 renderGuokuPanel` + `tm-var-drawers.js:1239-1385 _extraForGuoku`；地块财赋志 `phase8-formal-map-dossier.js:1095±`。**现成接点**：央地分账表已有「名义 claimedRevenue vs 实征 actualRevenue」列（tm-guoku-panel + tm-var-drawers:1305-1315）。
- **民心（S3）**：顶栏 `tm-topbar-vars.js:306-332 _renderMinxin`（标题=trueIndex·tooltip 已有「朝廷视野 perceivedIndex」行→掉头）；民心抽屉 `tm-var-drawers.js:145-201`（双轨都显·真值在前→掉头）；纲纪总览阶层满意度 `phase8-formal-rightrail-social.js:685± rightSocNum(satisfaction)`（真值·但 `GM.minxin.byClass[key].true/.perceived` 阶层级双轨已备 `:588-629`）；舆图民情冷暖/阶层压力热力 `phase8-formal-map.js:653-697,1585-1670,1884`（按真值着色→严格史实下按据奏着色）。
- **人口/役政（S4·先例接通）**：reported 产线 `tm-renli.js:889-922 refreshReported`（concealFactor=0.45·压力+0.35·不忠+0.20·邀名·危局×1.5·封顶0.6·方向固定少报坏消息）；已接消费端=户口志丁口（dossier:930-938 **默认据报**·真值 hover）/役政志（:1076-1082 **默认真值+督抚奏报对照行**）/奏疏+门生密报(spawnReportedChannels)。未接=顶栏户口 `tm-topbar-vars.js:237-266`（GM.population 全国真值）+ 户口抽屉 `tm-var-drawers.js:1061-1585`。**★口径拍板项：户口志默认据报 vs 役政志默认真值——两 pilot 自相矛盾·S4 须统一（建议：严格史实下一律据奏当默认+已揭显对照）**。
- **军额（S5·从零造）**：名册/详情/汇总全读真值 `soldiers`（phase8-formal-rightrail.js:593 rightArmySoldiers·:700-715 分组小计·:822-868 详情卡·:958 renderArmy 总兵力）。「名员12万实6万/空饷」只活在剧本 prose + 无消费端变量「卫所虚额率」。造法：据奏名员=ReportedView 对 soldiers 的虚增偏移（吃空饷方向=多报），核饷(:860 已有钮)/整训/御驾亲征接敌点验 → reveal 实额。
- **吏治（S5½·掉头）**：顶栏 `tm-topbar-vars.js:268-304 _renderLizhi`（墨点按 trueIndex 分档→按 perceived·真浊度须揭）；抽屉 `tm-var-drawers.js:1592-1670`；舆图官守治理层 `phase8-formal-map.js:1659,1888`（corruptionLocal 真值着色）；区划危机预警 `phase8-formal-rightrail.js:1156`。
- **揭真通道（S6）**：派员查案 `tm-audit.js:42 dispatchAudit→:100 _exposeFraud`（现状=纠正真值·须加 reveal 许可）；查访 `tm-authority-deep.js:249-254`；抄家闭环 `tm-ai-change-applier.js:513-590`；门生密报 `tm-renli.js:1020-1032`（唯一已读真值通道·sourceType renli_truth）；厂卫密折（tm-memorials.js:760 intelligence 类·未附真值段）；诏狱拷问（tm-wendui-prison.js·未产 reveal）。
- **AI 口径（S7）**：奏疏 `tm-memorials.js:139-670 genMemorialsAI`（注入 eraState/taxPressure/vars/provinceStats 全真值·gameMode 只改文风）；回合 sysP `tm-endturn-prompt.js`（真值+:2220 空承诺）；问对 `tm-wendui.js:1582-1590`（内帑真值）。先例=`tm-renli.js:938 formatReportedForPrompt`。
- **Gate 勿漏**：strict_hist 消费 40+ 处全是 AI 文风/校验；另有并行命名 `G._gameMode`（tm-authority-deep.js:368）与 `standard/historical/sandbox`（tm-edict-complete.js:439）两套——ReportedView.active() 统一走 `P.conf.gameMode==='strict_hist'`，别沾并行命名。

### 三大穿帮雷（施工时逐波核）
1. **顶栏七变量是覆盖面最广处**（tm-topbar-vars.js）——玩家第一眼是真值；只改右rail 忘顶栏=白做。
2. **聚合面板与地块 dossier 双渲染**（phase8-formal-map.js 热力+tip vs -map-dossier.js 七志）——只改一边=「顶栏粉饰、点地块见真值」穿帮。
3. **军额从零 + :2220 空承诺**——最容易被误判「已有机制」的两处。

## 五½、待 owner 拍板（S4 前须答）

1. **默认口径统一**：严格史实下「据奏当默认标题、真值须揭」全域一律？（现状两 pilot 矛盾：户口志默认据报 / 役政志默认真值+对照行。建议：一律据奏默认·已揭后显「据奏 vs 实情」对照行。）
2. **顶栏掉头幅度**：顶栏民心/吏治标题数字直接换 perceived，还是保双显（据奏大字+真值小字须揭后现）？（建议前者——骗就骗彻底，揭开才见真。）
3. **军额虚增幅度源**：吃空饷偏移吃 吏治×军队分部门(corruption.subDepts.military) 还是统帅忠诚？（建议面=军队吏治·点=统帅忠诚，与共识分工一致。）

## 六、风险与回退

- 玩家误报 bug：据奏徽 + changelog 明说「严格史实模式下朝廷数字有水分，厂卫能掀」——这本身就是卖点文案。
- 性能：value() 是 O(1) 纯函数，渲染处调用，无回合末批处理。
- 回退：设置开关一关 = 全部显真值，零残留（唯一状态 _reportedReveals 无害）。
