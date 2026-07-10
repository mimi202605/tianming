# 天命 1.3.3.2 发版 · 服务器部署命令

> 在服务器 **1Panel 终端 / VNC**（root）粘贴运行。SSH 从开发会话被封，所有落位都走 GitHub Release 拉取。
> 本次：**1.3.3.2 紧急修复补丁**（① 过回合卡死残留路径补全 ② 深度推演超大 AI 响应内存崩溃防护）。
> 客户端热更版本 **1.3.3.2**（电脑 Electron 282MB + 安卓 Capgo 515MB，均含 preview）。无服务器后端改动（沿用 1.4.0）。

---

## ⭐ 一行搞定（推荐）

在服务器终端粘这一行，自动跑完「双端热更 + 邸报 + 增量 files/ + 验证」：

```bash
curl -sL https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.2/deploy-1332.py -o /tmp/d.py && python3 /tmp/d.py
```

> 跑完末尾会打印电脑/安卓两处 version（应均 = 1.3.3.2）。CDN 偶有 30–60s 缓存，显旧稍等再验。
> 脚本做的事：下载电脑端整包→解进 sha 寻址 `/hot/files/` + 写 `/hot/manifests/1.3.3.2.json`（1.3.3.1 玩家只下变动的 ~8 文件增量）→放整包 + `hot-latest.json`→从 zip 更新邸报 `/changelog.json`→下载安卓 capgo bundle→`/capgo/bundles/1.3.3.2.zip` + `/capgo/latest.json`。

---

## 分步版（排查时用）

```bash
REL=https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.2
SITE=/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming

# --- 电脑端 Electron 热更 ---
curl -L -o /tmp/hot.zip "$REL/tianming-hot-1.3.3.2.zip"
curl -L -o /tmp/hot-latest.json "$REL/hot-latest.json"
mv /tmp/hot.zip $SITE/hot/tianming-hot-1.3.3.2.zip
mv /tmp/hot-latest.json $SITE/hot/hot-latest.json

# --- 安卓 Capgo 热更 ---
mkdir -p $SITE/capgo/bundles
curl -L -o $SITE/capgo/bundles/1.3.3.2.zip "$REL/1.3.3.2.zip"
curl -L -o $SITE/capgo/latest.json "$REL/latest.json"

# --- 邸报 standalone（游戏内邸报弹窗读这个，别漏） ---
curl -L -o $SITE/changelog.json "$REL/changelog.json"
```

> 分步版**不含**电脑端增量 `files/` + `manifests/`（一行版的 deploy-1332.py 才有）。
> 只跑分步版时，电脑端玩家会走整包路径（下 282MB）；要增量请用一行版。

---

## 验证

```bash
curl -s https://api.themisfitserspeople.top/tianming/hot/hot-latest.json | head      # 期望 version 1.3.3.2
curl -s https://api.themisfitserspeople.top/tianming/capgo/latest.json                # 期望 version 1.3.3.2
curl -s https://api.themisfitserspeople.top/tianming/changelog.json | head -c 200     # 邸报顶部应是 1.3.3.2
```

---

## 本地安装包（全新安装，不走热更）

`E:\版本\测试版1.3.3.2\`
- `天命-1.3.3.2-x64.exe`（443MB·Windows NSIS·含 preview·排 godot·内置 bge 模型）
- `天命-1.3.3.2.apk`（564MB·安卓 debug·含全量 preview·排 godot）

> 全新安装首次联网会按「首装增量」自动更到 1.3.3.2（基线 manifest 仍 1.3.3.1.0·属设计内行为）。
