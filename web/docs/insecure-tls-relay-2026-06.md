# 中转站不安全证书放行（Insecure TLS Relay）· 2026-06-11

## 背景 / 症状

玩家 BYOK（自带 key）常把 API 指向第三方**中转站 / 反代**，这些站点的 TLS 证书经常：

- **证书域名（CN/SAN）与访问地址不匹配**（玩家填了 IP，或一个没配证书的子域）——最常见，对应 `net::ERR_CERT_COMMON_NAME_INVALID`；
- 自签名 / 证书链不全（`ERR_CERT_AUTHORITY_INVALID`）。

> 注意：**反代本身不会导致 SSL 对不上**。配置正确的反代用匹配公网域名的证书终止 TLS。对不上的根因是上面两类**证书配置问题**——有些中转站只要换成它文档里给的正确 https 域名即可，不必改代码。本功能针对的是确实配坏、玩家无法换地址的中转站。

客户端标准 TLS 校验拒绝连接 →「所有有反代的中转站都用不了」。

## 设计决策（owner 拍板）

- **开关 + 只放行玩家填的 API 地址**：设置里加复选框 `P.conf.insecureTlsRelay`；开启后**仅对玩家配置的中转站 host**跳过校验，官方服务器 / 热更 / 账号通道**仍严格校验**（纵深防御：杜绝中间人用伪造证书推恶意热更）。
- **桌面 + 安卓都做**；**在线网页版做不到**（浏览器强制证书校验是安全底线，JS 层无法绕过——开关对在线版静默无效）。
- 等价于 `curl -k`，但作用域锁死到单一 host。

## 三端请求路径与可修性（实查）

| 端 | LLM 请求怎么出去 | 拦截点 |
|---|---|---|
| 桌面 Electron | 渲染层 `fetch()`（editor-ai-gen.js:1695 / tm-endturn-ai.js:371）→ Chromium 网络栈 | 主进程 `app.on('certificate-error')` |
| 安卓 Capacitor | `CapacitorHttp.enabled=true` → `fetch()` 改写走原生 `HttpsURLConnection` | `setDefaultHostnameVerifier` + `setDefaultSSLSocketFactory`（按 host 作用域） |
| 在线网页版 | 浏览器 `fetch()` | **无**（浏览器强制） |

## 实现

放行 host 来源：`P.ai.url`（主）+ `P.ai.secondary.url`（次）+ `tm_api_image.url`（生图），三者的 hostname，**排除官方域名** `api.themisfitserspeople.top` / `themisfitserspeople.top`。

### 1. JS 接线（web·走热更/Capgo）
- `web/tm-player-settings.js`：
  - `_tmInsecureHostOf` / `_tmGatherRelayHosts`：从配置取 host（去端口、去官方域名）。
  - `tmApplyInsecureTlsConfig()`：把 `{enabled, hosts}` 下发给桌面（`window.tianming.setInsecureTlsConfig`）与安卓（`Capacitor.Plugins.InsecureTls.setConfig`）·**幂等**·非对应平台静默跳过。
  - `sToggleInsecureTlsRelay(on)`：开关 onchange·写 `P.conf.insecureTlsRelay` + saveP + 下发。
  - 启动钩子：监听 `tm:p-restored` + `load` 各下发一次（P 异步恢复后）。
- `web/tm-patches.js`：主 API 段加复选框 UI（id `s-insecure-tls`·onchange `sToggleInsecureTlsRelay`）；`sSaveAPI`/`sSaveSecondaryAPI` 保存后调 `tmApplyInsecureTlsConfig()`（地址变了刷新白名单）。
- `web/tm-save-lifecycle.js`：`insecureTlsRelay` 加进 `PREF_CONF_KEYS`（fullLoadGame 读档保护·接 2026-06-11 conf 持久化修复）。

### 2. 桌面主进程（Electron·随热更 `_app_main.js`/`_app_preload.js`）
- `main-impl.js`：
  - 状态 `_insecureTlsState{enabled,hosts}`·落盘 `CONTENT_DIR/insecure-tls-config.json`·启动先读盘（覆盖渲染层尚未下发的早期请求）。
  - `_insecureTlsHostOf` / `_insecureTlsShouldBypass`（官方域名 deny 写死）。
  - `ipcMain.handle('set-insecure-tls-config')`。
  - `app.on('certificate-error')`：命中放行 host → `event.preventDefault()+callback(true)`；否则 `callback(false)`（默认严格）。
- `preload-impl.js`：暴露 `setInsecureTlsConfig`。

### 3. 安卓原生（Capacitor·**须重打 APK**）
- `mobile/android/app/src/main/java/com/tianming/history/InsecureTlsPlugin.java`：`@CapacitorPlugin(name="InsecureTls")`·`setConfig` 收 `{enabled,hosts}`·`load()` 安装作用域 `HostnameVerifier` + `ScopedSSLSocketFactory`（仅放行 host 用 trust-all·其余委托系统默认严格·官方域名 deny）。
- `MainActivity.java`：`onCreate` 中 `registerPlugin(InsecureTlsPlugin.class)`（super.onCreate 之前）。
- **注**：Java 注释**纯 ASCII**——构建机若默认 GBK 编码，UTF-8 中文注释会让 javac/Gradle 报 `unmappable character` 致 APK 构建失败。

## 验证

- `_codex_tmp/test-insecure-tls-main.js`：桌面判定 **16 断言 PASS**（host 提取 / 开关闸 / 精确命中 / 官方域名永不放行 / certificate-error 放行与拒绝路径）。
- `_codex_tmp/test-insecure-tls-wiring.js`：JS 接线 **12 断言 PASS**（主/次/生图 host 汇集去端口 / 官方排除 / 双端下发 / 开关写 P.conf 与撤销放行）。
- 安卓 Java：JDK17 + 精确 Capacitor stub **编译 EXIT 0**（含默认 GBK 编码下·证 `SSLSocketFactory` 抽象方法完整 + Capacitor API 用法正确）。**真实 APK 构建 + 真机连坏证书中转站验证须 owner 侧完成**（本环境无完整 Android 工具链/设备）。

## 发版

- **桌面**：web 改动 + `_app_main.js`(main-impl) + `_app_preload.js`(preload-impl) 全走热更包（build-hot-update-package.js 已带）→ 现有桌面玩家**热更即得**·无需重装。
- **安卓**：JS 走 Capgo；但原生插件 **Capgo 带不了**·须 `npx cap sync android` + 重打 APK + 重新分发安装。旧 APK + 新 web 包时 JS 调用被守卫为 no-op（不崩·功能在安卓侧静默直到装新 APK）。
- 备份：`.bak-insecuretls-20260611`（main-impl.js / preload-impl.js / tm-player-settings.js / tm-save-lifecycle.js / MainActivity.java）。tm-patches.js 未留 .bak（改动小·可对照本文档回退）。

**未 ship·待 owner 触发。**
