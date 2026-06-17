# 天命·移动端调研 (mobile port research)

**date**·2026-05-21·**status**·调研 draft·**owner**·Claude·

调研目标·判断是否做移动版·若做·怎么做·什么时机·跨设备同步如何实现。

---

## §1 现状盘点

| 维度 | 现状 |
|---|---|
| **平台** | Windows desktop (Electron 33)·1.2.2 testing channel·iOS/Android 均无 |
| **代码规模** | 363 web/·100+ JS·几个 5k 行 mega file (apply 4843·tinyi-v3 3942·chaoyi-changchao 3932·prompt 3353) |
| **UI 范式** | **混合** — 旧 21 左 panel + 13 右 panel (tm-sidebar-ui / tm-shell-extras) + **新 12-palace v2 (phase8-formal-bridge.js·10603 行·部分覆盖)** |
| **新 UI 进度** | per `project_phase8_12palace_lock.md`·v2 锁定·estimate 75-110d·当前 partial deploy |
| **包大小** | installer 700MB / hot update zip 450MB·主因 portraits 336MB + preview 140MB (热更已排) + fonts 25MB + vendor 25MB + assets ui 37MB |
| **存档** | 单机文件系统 (saveToSlot deepClone GM)·**无云同步** |
| **AI 集成** | user-provided API key (callAI base)·每回合多 sub-call·long-running·可能数秒-数分钟 |
| **服务器** | api.themisfitserspeople.top (openresty + sqlite)·账号 + 工坊 + 热更·已运营 |

---

## §2 目标用户分析 (开放问题)

| 用户类型 | 期望 | 设备 |
|---|---|---|
| **(a) 已有 PC 玩家** | 手机看状态 / 简单决策·主玩仍在 PC | 手机 companion |
| **(b) 新玩家·无 PC** | 完整游戏·手机即可玩 | 手机 full |
| **(c) 平板玩家** | 桌面级体验·只是小屏 | iPad / 大安卓平板 |
| **(d) 触摸桌面** | Surface / 触屏笔电·混合输入 | (B/C 的副产物) |

**调研问题**·目标用户是 a / b / c 哪一类·或全要？决定路线优先级。

---

## §3 五条技术路径对比

| 路径 | 时间 | UX | 优劣 |
|---|---|---|---|
| **A·Capacitor 壳** | 2-4 周 | 卡 / 不可玩 (混合 UI 桌面尺寸塞手机) | 90% 代码复用·但全是滚动条 + 误触·失败 |
| **A'·Capacitor 壳·只针对 12-palace v2 (待完成)** | 2 周 (新 UI 完后) | 好·CK3/EU4 mobile-friendly | **强烈推荐**·新 UI 天然适配 |
| **B·响应式重做** (针对当前混合 UI) | 2-4 月 | 中 | 重复劳动·12-palace v2 完成后白做 |
| **C·React Native / Flutter 全重写** | 6-12 月 | 顶 (native feel) | 重写 100k+ JS·扔现有 UI·成本极高·**不推荐**除非目标 App Store 付费榜 |
| **D·Cloud streaming** | 3 月 + 持续服务器 GPU 成本 | 取决于网络 | 玩家网差就废·$$ |
| **E·Companion app** | 1-2 月 | 限定场景 | 适合 (a) 用户·不是 "mobile version" |

**强力推荐·A'** — 等 12-palace v2 完成·然后 Capacitor 壳。

---

## §4 12-palace v2 为什么 mobile-friendly (key insight)

新 UI (per `phase8-12palace-plan-B-LOCKED.md`) 是 EU4/CK3 hybrid·空间结构·

```
顶栏 56px·perpetual
├ 左栏 280-320px·Character Panel (CK3·永驻)
├ 中央·地图区 (永驻·不替换)
├ 右栏 36-280px·Management 7 menu (CK3·折叠)
└ 底栏 36px·status
右下浮按钮·诏付有司
```

天然 mobile mapping·

| 12-palace 桌面 | mobile 适配 | 改动 |
|---|---|---|
| 地图永驻 | mobile 全屏 canvas·背景 | 0 改 (touch zoom 已有) |
| 左 Character Panel | 左 drawer (滑出) | drawer pattern·标准·1 周 |
| 右 7 menu (折叠) | mobile bottom tab bar | 已有 collapse 态·CSS 切 1 周 |
| province click popup | mobile bottom sheet | 标准·overlay 改 sheet·1 周 |
| 顶栏 7 资源 chip | 顶部 chip 横滑 | overflow-x scroll·1 天 |
| 诏付有司 FAB | mobile FAB·拇指刚好 | 0 改·位置 OK |

**这正是 Civilization 6 mobile / CK3 mobile 的范式**。

---

## §5 跨设备互通 (云存档)

**100% 可行·1-2 周**·

### §5.1 服务端新增

```
POST   /save/upload         Body: { scenario, turn, savedAt, gz_data, sha256 }
GET    /save/list           Query: ?user=X
GET    /save/download/{id}  
DELETE /save/{id}
```

存档 ~500KB-2MB / 个·1000 用户 ×5 存档 = ~5-10GB·VPS 30GB 够。

### §5.2 客户端

PC 加 UI·"上传到云" / "下载云存档" 按钮 (在 现有 saveSlot 旁边)·1 周·
手机版本天然走云·主存档机制不变。

### §5.3 同步模型

| 模型 | 简单度 | 冲突 |
|---|---|---|
| **手动同步** (推荐起步) | 易 | 无 — 玩家自己决定上传/下载 |
| 自动同步 (过回合后台 upload) | 中 | 有 — 两设备同玩冲突 |
| 实时同步 (live mirror) | 难 | 有 — 多端协同 |

起步走手动·满足 95% 用例。

---

## §6 关键改造点 (mobile-specific)

### §6.1 屏幕

- 桌面 1920×1080 → 平板 ~1024×768 (横) → 手机 ~414×896 (竖)
- breakpoint·>1024 = 桌面·768-1024 = 平板·<768 = 手机
- 平板基本能跑桌面 layout·只小幅 zoom 适配。**手机需 layout 真改**

### §6.2 触摸

- hover → 长按 (long-press)
- 拖拽 → swipe (左/右切换 panel)
- 右键 → 长按弹菜单
- 滚动条 → 隐藏·只在 touch 时显

### §6.3 资源大小

- iOS 安装包硬限 50MB·初始 download
- Google Play 150MB·初始
- **必须 split asset·首启动 download 真资源**
- portraits 336MB → 用户按剧本下载·首次开局拉 30MB / scenario
- fonts 25MB → 改系统字体 (思源黑体安卓 / 苹方 iOS) 省
- vendor 25MB (BGE 模型) → 改云端调或不带

### §6.4 输入

- 中文输入·iOS / Android IME 弹起会导致 viewport 跳·已知坑
- AI key 输入·要 paste-friendly
- 鸿雁传书 / 朝议长文本·要适配 textarea autosize

### §6.5 AI 调用

- 桌面·long-running OK (Electron 进程不死)
- 手机·iOS 后台 30s 限·Android 7+ 也严格 Doze
- **必须**·把 AI call 改 chunked·或前台保活 (foreground service)·或后端代理 (server 转 AI·客户端只 polling)

### §6.6 存档

- 桌面·tianming.saveScenario 写文件
- 手机·Capacitor Filesystem plugin·或 IndexedDB
- 云存档优先 (per §5)·本地只缓存

### §6.7 横竖屏

- 平板·锁横屏 (与桌面同 layout)
- 手机·锁竖屏 (新 12-palace 已优化竖屏布局)

---

## §7 资源 + 代价

### §7.1 人时估算

| 阶段 | 工作 | 人时 |
|---|---|---|
| Phase 0 | 云存档·服务端 4 API + PC 客户端 + 同步 UI | 60-100h |
| Phase 1 | Capacitor 壳·iPad 优先·新 UI 后做 | 60-80h |
| Phase 2 | 手机响应式·drawer / sheet / tab bar | 120-160h |
| Phase 3 | 资源拆 / 系统字体 / IME 适配 / AI 后台 | 80-120h |
| Phase 4 (可选) | App Store / Play 上架·icon / 截图 / 描述 | 30-60h |

**总·~350-520 人时** (8-13 周 / 1 人 full time)·**前置·12-palace v2 完成 (75-110d)**

### §7.2 实际开支

- Apple Developer 99 USD/年
- Google Play 一次性 25 USD
- 云存档服务器存储·当前 VPS 够·~0 USD
- 中文 AI API call (玩家自付·跟桌面一样)
- 测试设备·iPhone / iPad / Android phone / Android tablet·~3000 RMB

### §7.3 ROI 评估

- **正面**·手机用户基数远超桌面·中文历史 sim 在 iOS App Store 有空缺·Steam 桌面有 P 社 / 三国志·手机有缝隙
- **负面**·中文历史 sim 在国区上架审 30-90 天·内容 (谋反 / 暗杀 / 党争 / 严讯) 易被请下架
- **建议**·先 TestFlight / 安卓内测·收数据再决定是否冲 App Store

---

## §8 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| **App Store 内容审核** (谋反/暗杀/严讯) | 🔴 高 | 准备审核版·关键词软化·关键玩法标"历史模拟" |
| **手机性能·5295 行 ai-change-applier 在 SoC 慢** | 🟡 中 | 已拆 4 模块·继续优化·或服务端代理 AI |
| **12-palace v2 未完成·过早 mobile = 重做两次** | 🔴 高 | **mobile v1 必须等 12-palace 完成**·不可并行 |
| **AI API 在手机后台被杀** | 🟡 中 | foreground service + 服务端代理 |
| **iOS 50MB 安装包限** | 🟡 中 | asset split + on-demand download |
| **中文字体在手机表现** | 🟢 低 | 系统字体足 |
| **服务器扛 mobile 用户增量负载** | 🟡 中 | CDN 已 in place·云存档增量·VPS 升级 |

---

## §9 推荐 roadmap

### 短期 (1 个月)·**独立有用·不阻塞**

**Phase 0·云存档**·~1-2 周·

- 服务端 4 API + sqlite schema
- PC 客户端 "上传/下载" UI 入口
- 玩家手动同步·零冲突

ROI·桌面玩家立刻受益·手机版到时直接 ready。

### 中期 (12-palace v2 完成后·~3 个月)·**MVP**

**Phase 1·Capacitor 壳 (iPad / 大平板)**·~2 周·

- electron → capacitor (90% 代码同源)
- 平板 横屏 layout·几乎不改 CSS
- 上 TestFlight + 安卓内测
- 收 100-500 玩家反馈

### 中后期 (~半年)·若反馈好

**Phase 2·手机响应式**·~3 月·

- 左 panel → drawer
- 右 menu → bottom tab bar  
- province popup → bottom sheet
- AI 后台保活 / 服务端代理
- asset split / 系统字体

**Phase 3·上架**·~2 月·

- 国区 App Store / Play 上架准备
- 内容审核版·敏感词软化
- icon / 截图 / 介绍

---

## §10 开放问题 (调研待定·决定再启动)

1. **目标用户优先级**·a (companion) / b (full mobile) / c (iPad) 哪个先做？
2. **iOS 优先 vs Android 优先**·iOS 用户少但付费高·Android 反之·中文 historical sim 哪个市场更值？
3. **上架渠道**·App Store / Play / 网页 PWA / 企业证书内部分发·选哪个？
4. **AI 代理**·要不要服务端代 AI call (省手机后台保活·但 server $$$)？
5. **离线模式**·允许离线玩 (本地 AI fallback / 无 AI 推演)·还是必须联网？
6. **收费模型**·一次性买断·订阅·F2P 内购·还是免费 + 工坊收费？
7. **mobile 上架前·是否先做 PWA 探路** (零成本·浏览器即玩·中国用户教育)？

---

## §11 结论·一句话

**能做·100% 可行**。**最现实路径·**

1. 现在·**云存档 (Phase 0)** 独立做·1-2 周
2. 12-palace v2 桌面继续推 (本就在做)
3. v2 完成后·**Capacitor 壳 iPad MVP·2 周出货**
4. iPad 有市场再下手机响应式·**别在新 UI 完成前做任何手机适配**

**核心判断·** 新 12-palace v2 paradigm 是 mobile-friendly 的·**它就是为了 P 社范式设计的·而 P 社范式跟 CK3 mobile / Civ 6 mobile 一脉相承**。等它做完·手机几乎"白送"。

**反过来说·**·若现在为 mobile 重做当前混合 UI·**v2 一完成全部白做**。最高 ROI 的事·**推 v2 + 加云存档**·mobile 拖到 v2 完成。

— Claude·2026-05-21
