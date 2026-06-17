# Phase 8·12 殿设计·**A 方案** (Claude 提)

date·2026-05-06·status·已存档·待 user 决定主案 / 重做·owner·Claude·

---

## 来源·会话决策路径

```
轮 1·  御书房作 hub        →  user 否·"作中心十分不妥"
轮 2·  紫宸殿 (常朝)作 hub →  user 否·"中心应皇城/宫城"
轮 3·  3 层 (京师 > 皇城 > 宫城)→  user 改"2 层即可"
轮 4·  皇城 (内) + 京师 (外)→  user "分工不满意"
轮 5·  11 殿 mood-based       →  user "再重新设计"
轮 6·  9 殿 workflow-aligned  →  user "你把 ui 职能列出来 我自己分"
轮 7·  全 ui 职能清单         →  当前·user 自分配中

→ 此 A 方案 = 轮 6 (9 殿 workflow-aligned)·留档备查
```

---

## §1·空间结构·**2 层**

```
皇城 (内·主 hub)·  ~70% 时间·开局点·见 7 殿屋顶 + 京师入口指示
京师 (外·副 hub)·  ~10% 时间·见 3 京师场所
```

---

## §2·9 殿 + 1 visit·**workflow-aligned**

| # | 殿名 | task flow | 承载 UI | surface |
|---|---|---|---|---|
| 1 | **御书房** | 决策·私 (起草/批奏/召对/真值) | gt-edict · gt-memorial · gt-wendui (formal+private) · 议事清册 (诏书建议库·13 source) · 朱批 7 选 · 屏风后密档 · 真假切 · item · issue · huangwei/minxin/lizhi true 值 | ~9 |
| 2 | **紫宸殿** | 公议 (朝议/常朝/大朝) | gt-chaoyi (4 phase + 常朝 4 幕 + 大朝礼内态) · party · huangquan · huangwei/minxin/lizhi perceived 值 | ~6 |
| 3 | **鉴人堂** | **任免·人事**·凌烟阁+铨衡所合并 | gt-renwu · gt-office · char (25 字段) · rel · family · harem · censor · lizhi · openCharDetail / viewRenwu modal · 任免 reform | ~9 |
| 4 | **户部** | 财赋 | class · price · fin · guoku · neitang · hukou | ~6 |
| 5 | **舆图厅** | 军地 | gt-difang (5 自治) · fac · army · admin · map · bian | ~6 |
| 6 | **礼神坛** | **礼神天**·太常+司天合并 | jifa · minxin · weather · time · 灾异 / 谶纬 / 天象 · 朝代 phase 反馈循环可视化 | ~6 |
| 7 | **兰台** | 史档 | gt-biannian · gt-qiju · gt-jishi · gt-shiji · book · 5 史风格 (biannian/shilu/jizhuan/jishi/biji) · turn-modal 切场入口 | ~6 |
| 8 | **学宫** (京师) | 文教 | gt-keju (8 phase) · gt-wenyuan · keju · school | ~4 |
| 9 | **风闻阁** (京师) | 言路 | gt-letter · news · rumor · 邸报当期 · NPC 抗疏起源 | ~5 |
| + | **大臣府邸** (visit) | 私访·非殿 | gt-wendui out-mode·1 通用底图·访不同臣换 props | 1 |

合计·**9 殿 + 1 visit·~58 surface**·

---

## §3·universal overlay·**跨殿永驻**

```
顶栏 (top·56px)·
  era stack + 物候印 + 7 var 印石 + 已存 + AI live + 待办 badge + 全部变量 btn

帝王侧栏 (right·~280px·可折)·
  self (朕亲·6 stat + 5 wuchang) · goal (大志) · agenda (日程) · energy (精力)

浮按钮 (4)·
  史记 (左下) / 存档 (左下) / 御案时政 (中下) / 诏付有司 (右下·唯一 endTurn)

6 fab (跨殿快捷·visual home 御书房桌)·
  拟诏 / 发信 / 召对 / 朝议 / 奏疏 / 纪事

状态栏 (bottom·36px)·
  AI / 存档 / 回合 / tip / Ctrl+1..9 / Ctrl+S / F1

modal universal·
  问天 / 设置 / 全部变量 / 暂停 / 帮助 / 邸报 / turn-modal / 存档

hub 水印·
  dyn (朝代主题) + palace (宫殿之序) → 鸟瞰底部小字
  "明 · 天启 · 衰期 · 紫禁城" 跨殿小标识
```

---

## §4·两大合并·**vs 上轮 11 殿**

```
合并 1·  凌烟阁 (人物 panel) + 铨衡所 (官制+监察) → 鉴人堂
         理由·  "看人 → 用人 → 监察"是同一 task flow
                user 任免一臣 = char info + family + party + 监察 record + 官制 vacancy 一脉
                上轮拆 4 殿太碎
         合后·  ~9 surface·一殿一脉·任免 task 单殿完成

合并 2·  太常寺 (祭祀+民心) + 司天监 (天文+物候+灾异) → 礼神坛
         理由·  古"礼通天"·祭祀以禳灾·民心受天象动·气数与天命挂
                两殿各 ~3 surface 太薄·合一 ~6 surface 丰满
         合后·  一殿两区 (主祭坛 indoor + 副观星台 outdoor)·朱漆烟雾 + 浑天仪星图
```

---

## §5·真假双值·空间隐喻

```
3 var·  lizhi / minxin / huangwei

御书房 (私场)·  显 true 值·屏风后密档·"屏风后听政"古典隐喻
紫宸殿 (公场)·  显 perceived 值·"朝廷视野"百官见
真假切·         按钮 idle (公场) → click → 切到御书房 (私场)·切殿 = 切真假
```

---

## §6·内态 / sub-scene·**~9 张**

```
御书房 §2·  屏风后密档 (真值视图·真假切 active)
御书房 §3·  召对近景 (NPC portrait 大图)
紫宸殿 §1-4·朝议 4 phase (议题/发言/裁决/草拟)
紫宸殿 §5·  常朝 4 幕代表 1 张
紫宸殿 §6·  大朝礼 (登基/改元/受贺)
礼神坛 §2·  大祀礼 transition (祭天/祭祖)
大臣府邸·   visit 私场夜景
切场过场·   出宫 / 入宫 fade (~2 张·或 CSS)
```

---

## §7·总场景计数

```
hub view·    2 张 (皇城鸟瞰 + 京师鸟瞰)
9 殿 base·   9 张
visit base·  1 张 (大臣府邸)
内态·        ~9 张
切场·        ~2 张
合计·        ~23 张主场景

切片资产 Wave 5 另算·人物 ~50-100 + 物品 ~30-50 + 朝代主题 ~120-180
```

---

## §8·Wave 规划

```
Wave 0 v4·  皇城鸟瞰 baseline                      1 张
Wave 1·     京师鸟瞰 + 御书房 + 紫宸殿              3 张
Wave 2·     鉴人堂 + 礼神坛 + 兰台                  3 张
Wave 3·     户部 + 舆图厅                            2 张
Wave 4·     学宫 + 风闻阁 + 大臣府邸                3 张
Wave 5·     内态 / transition                        ~9 张
Wave 6·     切片资产                                 ~150-300 张分批
Wave 7·     DOM overlay 全 wire                      Claude 主导
```

---

## §9·user 不满 (此为 A 方案被搁置原因)

```
轮 6 提出后·user 评·"这个分工安排我还是不是很满意 你再重新设计一下"
轮 7·user 决·"你把全部需要被承担的 ui 职能及其功能说一下 我来分配吧"

→ A 方案的"按 task flow 分殿"策略 user 仍不接受
→ user 选择自己分配·Claude 提供原料 (UI 职能清单)
→ B 方案 = user 自己设计 (待写)
```

---

## §10·此方案档存目的

```
1·  保存路径选择·避免回到此设计
2·  对比 B 方案 (user 自己分配) 时作参照
3·  B 失败 / user 反复时·留有 fallback
4·  保留"鉴人堂 / 礼神坛"两个合并构思·user 若部分采纳可挑回
```

---

— Claude (Phase 8·A 方案存档·2026-05-06)
