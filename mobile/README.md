# 天命 · 移动端（Android/平板）Capacitor 壳

> 移植 Phase 1 · S1.1 脚手架（2026-06-03 建）。设计见 `web/docs/mobile-port-design.md`。

## 这是什么

天命安卓/平板版的 **Capacitor 壳工程**。它**不复制前端代码**——`capacitor.config.json` 的
`webDir` 指向 `../web`，与桌面端 Electron、网页端 GitHub Pages **共享同一套 `web/` 前端源**
（移植宪法①：一套代码库 + 平台抽象层 `TM.platform`，不 fork）。

平台差异由 `web/tm-platform.js` 的 **capacitor 后端**吸收，而非靠改业务代码。WebView 里
IndexedDB / fetch / 御案 UI / 编辑器 / AI 演绎 / 廷议科举财政**全部零改动照跑**——这是
「Web 路径 + 原生补丁」策略：只在 web 路径不够的**缺口**上打原生补丁。

## 四个原生缺口（capacitor 后端要补的，其余复用 web 路径）

| 缺口 | web 路径为何不够 | 原生补丁 | 落点 |
|------|------------------|----------|------|
| ① 在线 HTTP（BYOK/账号/工坊/热更） | WebView fetch 第三方 LLM / 游戏服务器撞 **CORS** | `CapacitorHttp`（原生 HTTP·无 CORS） | S1.3 · **在线一致的关键** |
| ② 资产显示（立绘/音频） | 本地原生文件路径 WebView 读不了 | `Capacitor.convertFileSrc()` | S1.5（`tm-platform.js assetUrl` 已 stub） |
| ③ 存档耐久性（增强项·非必须） | IndexedDB 在 WebView 能用，但 OS 清数据/存储压力可能抹掉 | `@capacitor/filesystem` + `preferences` | S1.2（先复用 IndexedDB·Filesystem 为后置增强） |
| ④ 工坊导包 | 同 ① CORS + 本地解压 | `CapacitorHttp` 下载 + `fflate` 解压 | S1.4（安全校验原样移植） |

> 注：存档/剧本/回合数据在 capacitor 上**优先复用 web 的 IndexedDB 路径**（零新原生风险）。
> 迁移到原生 Filesystem 是耐久性增强，不是 Phase 1 必须项。

## 首次搭建（需 Android Studio + Android SDK · owner 环境步骤）

```bash
cd mobile
npm install                 # 装 Capacitor JS 包（本步不需 Android SDK）
npx cap add android         # 生成 android/ 原生工程（需 Android SDK）
npm run sync                # 把 ../web 同步进原生 assets + 装插件
npm run open                # 用 Android Studio 打开，连平板/模拟器跑
```

`npm install` 只装 JS 包、可在任意机器跑（用于锚定插件 API、写 capacitor 后端）。
`cap add android` 起才需要 Android SDK / Android Studio。

## ⚠️ webDir = ../web 的体积问题（Phase 3 资产分发解决）

`web/` 含 `assets/`（肖像已压到 ~98MB，仍有音频/字体/底图）。`cap sync` 会把 `webDir`
**整个拷进 APK assets**，单 APK 装不下（Google Play 150MB 上限）。

**Phase 3 方案**：小基座 APK（只打代码 + 必要 UI 资源）+ 首启按需下载肖像/音频
（复用热更服务器的 sha 寻址）。Phase 1 调试期可接受大 debug APK 或临时裁剪 `assets/`。

## 状态（2026-06-03）

- [x] **S1.1 脚手架**：本工程 config + package.json + 缺口分析（本文）。
- [ ] **S1.1 真机空跑**：`cap add android` + Android Studio + 平板横屏启动（owner 环境步骤）。
- [ ] **S1.2** capacitor 后端 saves（先复用 IndexedDB / Filesystem 增强）。
- [ ] **S1.3** capacitor 后端 account/workshop/hot → CapacitorHttp（在线一致打通）。
- [ ] **S1.4** 工坊导包 download + 解压。
- [ ] **S1.5** 资产 convertFileSrc 真机显示。

**未 ship、未 commit。** 本工程独立于 Electron 构建（root `package.json`），互不影响。
