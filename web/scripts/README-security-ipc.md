# 安全 IPC 加固 · 边角矩阵与验证清单

配套测试：`web/scripts/smoke-security-ipc-hardening.js`（`node web/scripts/smoke-security-ipc-hardening.js`）。

本文档记录两处绿档安全修的对抗式复审边角矩阵，以及纯 node 测不到的完整 IPC 链的手动/集成验证步骤。

复审对象（`main-impl.js`）：
- **修A · read-turns-summary 路径遍历修**（`:2345`）：`fromTurn/toTurn` 先 `Math.floor(Number())`、非有限即空返回；回合段走 `turnSeg()`（`:151`，`replace(/[^0-9]/g,'')`，空串 throw）。
- **修B · 工坊包强制 hash 修**（`:2756`）：`if (!/^[0-9a-f]{64}$/.test(expectedHash)) throw`，再比对 `downloadRemoteFile` 本地算出的 `fileInfo.sha256`。

> ⚠ 测试文件里的 `turnSeg / isInsideDir / sanitize / hash 门 / 循环边界` 是 **纯函数复刻**，须与 `main-impl.js` 保持同步：改了主进程实现，回来同步改测试复刻。

---

## 结论摘要

- 两处修的**核心目标都成立**：`turnSeg` 输出纯数字段，不可能逃出 `saveDir`（空段已被 `throw` 挡住，不会退化成 `saveDir` 本身）；hash 门 `toLowerCase` + 锚定正则 + 与**本地重算**的 `fileInfo.sha256` 比对，MITM 与「无 hash 静默安装」均被堵死。
- 残余点集中在 **DoS 与 saveName 侧**，都属修A 邻域（非遍历逃逸）：
  - **A4** `toTurn` 远大于 `fromTurn` → 十亿级循环冻结主进程（无跨度封顶）。
  - **A5** `fromTurn=toTurn≥2^53` → `t++` 自增停滞 → **死循环永久挂起**（`Number.isFinite` 门放行）。
  - **A8** `sanitize()` 不中和 `.`/`..` → `saveName=".."` 令 `path.join` **上跳一级**，读/写逃出 `turn-data`（仅一级、叶子限 `<数字>/context.json`，但读+写都中招）。
- 修B 侧无需再加固：TOCTOU 属本地威胁模型外且被下游校验兜底；大小写/空白/换行均 fail-closed；`fileInfo.sha256` 可信（本地算，非服务器自报）。

---

## 修A · read-turns-summary / turnSeg 边角矩阵

| # | 输入 | 期望 | 当前行为 | 需再加固 |
|---|------|------|----------|:---:|
| A1 | `turn="../../etc/passwd"` | 不逃 saveDir | 剥成空串 → **throw 非法回合**，含入成立 | 否（已固） |
| A2 | `turnSeg("..")=""` 空段是否退化成 saveDir 本身 | 不得退化 | 空串 → **throw**，不会 `path.join(dir,"")` | 否（已固·这正是最初担心，`:153` 的 throw 已覆盖） |
| A3 | `fromTurn=2.9, toTurn=5.1`（浮点） | floor 成整数 | `Math.floor` → 2..5，正确 | 否 |
| A4 | `fromTurn=0, toTurn=1e9`（巨跨度） | 有上限·不冻主进程 | **无跨度封顶** → ~10⁹ 次 `existsSync`，主进程冻结 | **是**（DoS） |
| A5 | `fromTurn=toTurn=1e21`（≥2⁵³） | 有限即跑·须能终止 | `isFinite` 放行，但 `t++` 在 1e21 停滞 → **死循环永久挂起** | **是**（更重·永久挂起） |
| A6 | `fromTurn=-3` | 不读错回合 | `turnSeg(-3)="3"` → **别名读到回合3**（仍在 saveDir 内·非逃逸） | 是（低·纠偏） |
| A7 | `turn="3.5"`（read-turn-data） | 无回合3.5 | `turnSeg→"35"` → **别名读回合35**（含入·非安全问题） | 低（纠偏） |
| A8 | `saveName=".."` + 任意 turn | 不逃 turn-data | `sanitize` 不剥 `.` → `path.join(turn-data,"..")` = **上跳一级** 到 USER_DATA，读/写 `<数字>/context.json` | **是**（saveName 侧穿越·读+写·`write-turn-data :2276` 同源） |
| A9 | `saveName="."` | 每档独立子目录 | → `turn-data` 本身，跨档串档（in-bounds） | 是（低） |
| A10 | `saveName` 超长/含 `<>:"/\|?*` | 消毒 | `sanitize` 替换特殊字符 + 截断 100，OK（唯独漏 `.` 段） | 否（除 A8/A9） |

**含入证明**：`turnSeg` 输出 `∈ [0-9]+`（或 throw），纯数字段不含 `/ \ . ..`，`path.join(saveDir, "<digits>", "context.json")` 恒在 `saveDir` 内。遍历逃逸不成立——残余项均为 DoS 或一级 saveName 穿越，**非** turn 段逃逸。

---

## 修B · 工坊 hash 门边角矩阵

| # | 输入 | 期望 | 当前行为 | 需再加固 |
|---|------|------|----------|:---:|
| B1 | `expectedHash` 全大写 | 大小写不敏感·接受 | `.toLowerCase()` 后匹配，比对侧也 lower，**正确** | 否 |
| B2 | `expectedHash` 首尾空白 | 拒绝或 trim | 锚定正则不容空白 → **拒绝**（fail-closed；可选 trim 改善体验） | 否 |
| B3 | `expectedHash` 缺失/空 | 拒绝安装 | `""` → 正则 fail → **throw**（=本次修核心） | 否（已固） |
| B4 | `expectedHash="<64hex>\n"` | 拒绝 | JS `$`（无 `m`）不匹配尾换行 → 65 长 → **拒绝** | 否 |
| B5 | `fileInfo.sha256` 可信度 | 须本地算·非服务器头 | 三条 return 均本地算（inline stream / `sha256FileStream` / `sha256File`），**可信** | 否 |
| B6 | `fileInfo.sha256` 是否可能 undefined 致 `.toLowerCase()` 崩 | 不崩 | 三路径都赋值 sha256，且外层 try/catch 兜底 | 否 |
| B7 | hash 校验后、`extractZipToTemp` 前替换 zipPath（TOCTOU） | 理想·从已校验字节解压 | hash 在下载流上算，解压从磁盘**重读**——存在窗口，但需本地写权限 + 子秒窗口，且下游 zip-slip/扩展名白名单/尺寸再复检 | 否/低（本地威胁模型外·可选加固） |
| B8 | hash 对但内容含 `.js/.exe/`zip-slip | 拒绝危险内容 | hash 只保完整性；内容安全靠 `extractZipToTemp`(zip-slip) + `validateWorkshopPack`(BLOCKED/ALLOWED 白名单·250MB·entry 越界) | 否（分层正确） |
| B9 | catalog 走明文被 MITM 换 hash+file | 拒绝 | `isAllowedRemoteUrl` 强制 HTTPS（localhost 例外）→ MITM 改不了 catalog·hash 链完整 | 否 |

---

## 手动/集成验证清单（跑起 Electron·渲染进程 devtools console 造 payload）

前置：用项目 preload 暴露的 invoke（下用占位 `invoke(channel, payload)`）。

**修A · read-turns-summary / write-turn-data**
1. 正常玩几回合，造出 `turn-data/<存档>/1,2,3/context.json`。
2. `invoke("read-turns-summary",{saveName:"<存档>",fromTurn:1,toTurn:3})` → 期望 `turns` 3 条。
3. 穿越：`fromTurn:"../../../../etc", toTurn:"x"` → 期望 `{turns:[]}`（isFinite 门空返回·不抛不读）。
4. **DoS 巨跨度**：`fromTurn:0, toTurn:1e9` → 当前：主进程冻结数分钟（UI 卡死）；加固后：秒回（封顶 2 万）。
5. **DoS 死循环**：`fromTurn:1e21, toTurn:1e21` → 当前：永久挂起（须杀进程）；加固后：即回 `{turns:[]}`。
6. **saveName 穿越**：`saveName:"..", fromTurn:1, toTurn:1` 观察是否读到 `turn-data` 上级（USER_DATA）；写侧同验 `invoke("write-turn-data",{saveName:"..",turn:1,data:{context:{x:1}}})` 后到磁盘看 `%APPDATA%/<app>/` 下是否冒出 `1/context.json`（在 `turn-data` 之外 = 越界）。加固后应落在 `turn-data/_/1/`。

**修B · workshop-install-from-url**（需一个能 HTTPS 下载的 `.tm-pack` 及其真实 sha256）
7. 正常：`invoke("workshop-install-from-url",{packageUrl:"https://.../x.tm-pack", sha256:"<真hash>"})` → success。
8. 缺 hash：去掉 `sha256` → 期望 `{success:false, error:"…缺少 sha256…拒绝安装"}`（修B 核心）。
9. 错 hash：`sha256` 改 1 位 → 期望 `{success:false, error:"…sha256 不一致"}`（本地重算兜底）。
10. 大写/空白：`sha256` 全大写 → 仍 success；首尾加空格 → 期望拒绝（fail-closed·非崩溃）。
11. 恶意内容（hash 对）：打一个 hash 正确但含 `evil.js`/`evil.exe` 的包 → 期望解压后 `validateWorkshopPack` 以「禁止/未允许文件类型」拒绝（证明 hash 只保完整性，内容安全靠白名单层）。
12. zip-slip：构造条目名含 `../` 的包 → `extractZipToTemp` 抛「压缩包包含越界路径」。

---

## 建议加固（详见对应 slice 报告；本文档只索引）

- **Diff 1**（`read-turns-summary`，信心高）：`Number.isFinite` 门后补 `Number.isSafeInteger` 门 + `_from<0→0` + 回合上限 `1e7` + 跨度封顶 `20000`。堵 A4/A5/A6。
- **Diff 2**（`sanitize`，信心中·共享函数须验调用方）：纯点段整体替占位 `/^\.+$/.test(s) ? '_' : s`。堵 A8/A9，并让所有 turn-data 读/写 handler 一并受益。
