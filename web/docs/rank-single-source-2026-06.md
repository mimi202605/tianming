# 品级单一真相源治本 · 2026-06（人物官职品级不同步）

> owner 报：官方剧本「大量官职品级是错的」。实证后定位为**运行时人物品级真相源混乱**（非官制树源数据——源数据品级逐衙门核对基本正确、考据扎实）。
> owner 拍板：①阁臣按**本官 + 识别加衔**算品级；②**连 officeTree 单一真相源一起治本**（不在显示层打补丁）。

## 一、实证诊断（真存档 turn-18·`diag-rank.js`·30 抽样 18 不一致）

| 症状 | 实例 | 根因 |
|---|---|---|
| 高官品级**显示空白/错** | 黄立极(首辅)/崔呈秀(兵部尚书)/郭允厚(户部尚书)/南京尚书 `rankLevel=18` → 图志「—」 | `_rankLabel` 的 `getRankLevel(官衔)` 失效（官衔串无"正X品"字样必返99）→ 落 `rankLevel` 散阶；散阶=18(未设)或残留旧值(你看到的"尚书六品") |
| 权威解析也对**大学士错** | 大学士 → `resolveRankLevel` 返**从九品** | `SUPPLEMENTARY_OFFICE_RANK` 缺核心京官关键字（尚书/侍郎/大学士/学士/卿） |
| **巡抚品级偏高** | 毛一鹭 `应天巡抚·都察院右副都御史` → 权威**正二品**(应从二品) | `indexOf("都御史")` 把"右副都御史"截胡成正二品（子串误配） |
| **兼职丢高职**(症状B) | 张瑞图 `officialTitle="武英殿大学士"` 但 `title="武英殿大学士·礼部尚书"`（丢礼部尚书正二品） | officialTitle 只存一职·兼职落在更全的 title 里·解析只读 officialTitle |

## 二、数据基础（dump 实测）

- 人物官职/加衔 = **「·」「兼」「加」分隔的复合串**（非数组）。`officialTitles[]`/`concurrentTitles` 运行时**全空**。
- `title` 字段常比 `officialTitle` **信息更全**（张瑞图 title 含礼部尚书、officialTitle 不含）。
- `rankLevel` 散阶字段**填充不全**（大量=18），不可作品级真相源。
- 单一真相源前重构（[[官制树人物官职同步]]/[[ghost累积]]）已治"座位归属"，**从没碰品级**。

## 三、治本：品级纳入单一真相源

**品级真源 = 解析「实职复合串」取最高品**，与已有的 holder 派生一脉相承：

```
rankOfChar(ch) =
  segs = split(officialTitle ∪ title, /[·,，、；;]|兼|加授?|署理?|总督|提督.../) 去状态词/括注
  for each seg:
    lv = officeTree 职位名表匹配(seg) 或 SUPPLEMENTARY 最长关键字匹配(seg)
  return min(lv)   // 取最高品（本官+加衔自然合流）
```

- **最长匹配**：seg 含多个关键字时取**最长**的（"右副都御史"取"副都御史"正三品·不被"都御史"正二品截胡）。
- **合并 officialTitle ∪ title**：title 常含 officialTitle 缺的兼职（修张瑞图）。
- **本官+加衔**（owner 决策）：拆段取最高自然实现——武之望`总督·兼兵部尚书·太子少保`→ 尚书(正二品)+少保(从一品)取从一品；黄立极无加衔数据→本官大学士正五品。

### 补全 `SUPPLEMENTARY_OFFICE_RANK` 核心京官（缺失项）

尚书 3 / 侍郎 5 / 大学士 9(本官正五品) / 学士 9 / 寺卿 5 / 少卿 9 / 祭酒 8 / 司业 11 / 都给事中 13 / 给事中 14 / 副都御史 5(修子串) / 佥都御史 6 …

## 四、刀法（保守拆分·逐刀验证·未 ship + .bak）

- 刀1 **解析器强化** `resolveRankLevel`：补关键字 + 拆段最长匹配 + 合并 officialTitle∪title + 修子串误配。smoke 实算。
- 刀2 **显示统一**：`_rankLabel` 及各品级显示点改走 `resolveRankLevel`（权威·实职派生），弃 `rankLevel` 散阶兜底。
- 刀3 **头衔兼职合并**：图志/AI 头衔显示更全的实职串（officialTitle 与 title 取信息更全/合并），不只主职。
- 刀4 **阁臣加衔数据**：天启剧本阁臣补三孤加衔（黄立极少傅等），让"识别加衔"有米（运行时吃快照·须同步制品 + bump SNAP_QS）。
- 刀5 **总验证**：诊断 18/30→0·实拍·office/promotion/renwu/功名 回归全绿·文档/记忆。

## 五、与已有重构的关系

holder 派生、ghost 让位已治（座位归属）。本轮治**品级层**——品级从同一真相源（实职复合串）派生，复用解析评分精神。`resolveRankLevel` 强化后，功名系统天花板（亦用它）对阁臣/兼职也一并修正。

---

## 六、落地状态（2026-06-13·刀1–3b 全落·未 ship）

备份 `*.bak-ranksrc-20260613`（tm-promotion/tm-renwu-tuzhi/tm-office-system/tm-endturn-prompt）。

| 刀 | 内容 | 文件 |
|---|---|---|
| 1 解析器 | `_rankOfSeg`/`_rankFromTitleStr`（拆段·最长匹配）+ SUPPLEMENTARY 补全京官 + resolveRankLevel 合并 officialTitle∪title 取最高 + 修子串误配 | tm-promotion.js |
| 2 品级显示 | `_rankLabel` 走 `TMPromotion.resolveRankLevel`（实职派生·弃滞后散阶）；图志全显示点（花名册/头屏/身份页）共用 `p.rank` 自动修 | tm-renwu-tuzhi.js |
| 3a 头衔真源 | `_offGetCharOfficeTitles` 吸收 `title` 官职段（官职后缀过滤+已罢保护）；图志 officeTitles 体系全点（pills/line/concurrent）自动得完整兼职 | tm-office-system.js |
| 3b AI 头衔 | npc-hearts `curTitle` 走 `_offFormatCharTitles`（主⊕兼·治"AI 只认主职"） | tm-endturn-prompt.js |

**验证（实查）**：
- `smoke-rank-resolve`（**20** 实算）+ `smoke-rank-display-sources`（**13** 源码契约）全绿。
- **诊断转正**（`diag-rank.js`·真存档 201 人）：修复前 30 抽样 **18 不一致**（空白/从九品/误配）→ 修复后 **30/30 品级正确**：尚书正二品、大学士正五品（本官）、巡抚从二品、武之望从一品（加衔）、张瑞图正二品（兼职 title 取回）。
- **实拍图志 UI**：张瑞图身份页「武英殿大学士　兼 礼部尚书 · 正二品」（症状B视觉铁证 rk-01）；黄立极「内阁首辅·建极殿大学士 · 正五品」；崔呈秀「兵部尚书·总督京营戎政 · 正二品」；毛一鹭「应天巡抚·都察院右副都御史 · 从二品」。
- **回归全绿**：office 批（derive-contract/apply-resolve-vacate/appointment-sync/imprison-dismiss/concurrent）+ 功名 5 smoke + map-live-vitals 零破坏。

## 七、刀4（阁臣加衔数据）— 已落（owner 选"补加衔"·首辅→从一品）

实证数据流：**运行时官制树/人物吃 6.1MB 快照**（改源 character/buildOfficeTree 不生效）。故加衔补在**快照 character 的 title/officialTitle**（resolveRankLevel 拆段识别·holder 本官正五品被加衔取最高压过）：
- 黄立极(首辅)/施凤来(次辅) +少傅 → **从一品**；李国普(新入阁)保持本官东阁大学士兼礼部右侍郎 = 正三品；张瑞图已正二品(兼礼部尚书)不动。
- 工具 `_pw-scratch/patch-snapshot-honorary.js`（精确带引号替换·不误伤 officeTree position「首辅·建极殿大学士」）·**web + godot 双快照同步** + bump `SNAP_QS`（`20260612-armyhint`→`20260613-cabinet-honor`）·源 character 7236/7246 同步（数据正确·将来快照重生带上）。
- **附带修解析器太子衔误配**：「太子太保」(从一品)被子串「太保」(正一品)、「太子少保」(正二品)被「少保」(从一品)截胡 → SUPPLEMENTARY 补太子三师/三少精确条目（武之望从误判从一品 → 正确**正二品**）。
- 验证：smoke-rank-resolve **22**（含太子衔断言）；诊断阁臣 黄立极/施凤来从一品、李国普正三品、武之望正二品；office/功名回归零破坏。
