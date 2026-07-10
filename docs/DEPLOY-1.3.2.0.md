# 天命 1.3.2.0 发版 · 服务器部署命令

> 在服务器 **1Panel 终端 / VNC**(root)粘贴运行。SSH 从开发会话被封,所有落位都走 GitHub Release 拉取。
> 本次发布:**创意工坊全面升级(社交层 + UI 重做)+ 剧本工坊 + 本地近期引擎改动 rollup**;配套服务器后端 **1.4.0**。
> 客户端热更版本 **1.3.2.0**(电脑 Electron 547MB + 安卓 Capgo 533MB,均含 preview/剧本工坊)。

---

## ⭐ 最省事:一行搞定全部(推荐)

在服务器终端粘这**一行**,自动跑完「服务器1.4.0 + 双端热更 + 邸报 + 清老版本 + 验证」:

```bash
curl -fsSL https://github.com/misfit-user/tianming/releases/download/ship-1.3.2.0/deploy-all.sh | bash
```

> 若终端出现 `>` 一直等输入,先按 **Ctrl-C** 清掉再粘这行。
> 跑完末尾会打印三处 version(电脑/安卓应=1.3.2.0,API=1.4.0)。CDN 偶有 30-60s 缓存,显旧稍等再验。

下面 ①②③④ 是这一行的分解版,想分步跑或排查时用。

---

## ① 服务器 API 升 1.4.0(社交后端,必须先做)

```bash
curl -fsSL https://github.com/misfit-user/tianming/releases/download/server-api-1.4.0/tianming_deploy_local.py -o /root/tm-deploy.py && python3 /root/tm-deploy.py
```

验证:
```bash
curl -s https://api.themisfitserspeople.top/tianming-api/health
# 期望:version 1.4.0 + features.feed/follow/favorites/arenas/collections/circles/revisions/commissions 全 true
```

---

## ② 客户端双端热更 + 邸报落位

```bash
REL=https://github.com/misfit-user/tianming/releases/download/ship-1.3.2.0
SITE=/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming

# --- 电脑端 Electron 热更 ---
curl -L -o /tmp/hot.zip "$REL/tianming-hot-1.3.2.0.zip"
curl -L -o /tmp/hot-latest.json "$REL/hot-latest.json"
mv /tmp/hot.zip $SITE/hot/tianming-hot-1.3.2.0.zip
mv /tmp/hot-latest.json $SITE/hot/hot-latest.json

# --- 安卓 Capgo 热更 ---
mkdir -p $SITE/capgo/bundles
curl -L -o $SITE/capgo/bundles/1.3.2.0.zip "$REL/1.3.2.0.zip"
curl -L -o $SITE/capgo/latest.json "$REL/latest.json"

# --- 邸报 standalone(游戏内邸报弹窗读这个,别漏) ---
curl -L -o $SITE/changelog.json "$REL/changelog.json"
```

---

## ③ 清理老版本(保留 1.2.9.2 及以后,删更老的)

```bash
HOT=$SITE/hot
CAPGO=$SITE/capgo

# 先看占用与现有版本
du -sh $HOT $CAPGO
ls -lah $HOT/tianming-hot-*.zip $CAPGO/bundles/*.zip 2>/dev/null

# 删电脑端整包中 < 1.2.9.2 的(sort -V 版本排序判断)
for f in $HOT/tianming-hot-*.zip; do
  v=$(echo "$f" | sed -E 's#.*/tianming-hot-(.*)\.zip#\1#')
  if [ "$(printf '%s\n1.2.9.2\n' "$v" | sort -V | head -1)" = "$v" ] && [ "$v" != "1.2.9.2" ]; then
    echo "rm $f"; rm -f "$f"
  fi
done

# 删安卓 Capgo bundle 中 < 1.2.9.2 的
for f in $CAPGO/bundles/*.zip; do
  v=$(basename "$f" .zip)
  if [ "$(printf '%s\n1.2.9.2\n' "$v" | sort -V | head -1)" = "$v" ] && [ "$v" != "1.2.9.2" ]; then
    echo "rm $f"; rm -f "$f"
  fi
done

# 删旧备份
rm -f $HOT/*.bak-* $CAPGO/*.bak-*
```

> ⚠️ **别动**:`hot/files/`(sha 增量仓,跨版本去重)、`hot/hot-latest.json`、`capgo/latest.json`、`changelog.json`。只删老的整包 zip 和 .bak-*。
> 保留版本:1.2.9.2 / 1.3.0.0 / 1.3.1.0 / 1.3.1.1 / 1.3.2.0。

---

## ④ 落位后公网验证

```bash
echo '--- 电脑端 ---'; curl -s "https://api.themisfitserspeople.top/tianming/hot/hot-latest.json" | head
echo '--- 安卓端 ---'; curl -s "https://api.themisfitserspeople.top/tianming/capgo/latest.json"
echo '--- 邸报 ---';   curl -s "https://api.themisfitserspeople.top/tianming/changelog.json" | head -c 200; echo
echo '--- 后端 ---';   curl -s "https://api.themisfitserspeople.top/tianming-api/health" | head -c 400; echo
# 三处 version 都应 = 1.3.2.0;health 应 = 1.4.0
```

---

## 附:Cloudflare 缓存

落位后 hot-latest.json / latest.json 偶有 30–60s CDN 同步延迟。验证看到旧版先等一会儿,或 `?cb=$(date +%s)` 加 query 绕缓存。

---

## 一键全跑(可整段粘贴 ②③④;① 单独先跑)

```bash
REL=https://github.com/misfit-user/tianming/releases/download/ship-1.3.2.0
SITE=/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming
HOT=$SITE/hot; CAPGO=$SITE/capgo
# 落位
curl -L -o /tmp/hot.zip "$REL/tianming-hot-1.3.2.0.zip" && mv /tmp/hot.zip $HOT/tianming-hot-1.3.2.0.zip
curl -L -o $HOT/hot-latest.json "$REL/hot-latest.json"
mkdir -p $CAPGO/bundles
curl -L -o $CAPGO/bundles/1.3.2.0.zip "$REL/1.3.2.0.zip"
curl -L -o $CAPGO/latest.json "$REL/latest.json"
curl -L -o $SITE/changelog.json "$REL/changelog.json"
# 清老版(留 ≥1.2.9.2)
for f in $HOT/tianming-hot-*.zip; do v=$(echo "$f"|sed -E 's#.*/tianming-hot-(.*)\.zip#\1#'); [ "$(printf '%s\n1.2.9.2\n' "$v"|sort -V|head -1)" = "$v" ] && [ "$v" != "1.2.9.2" ] && rm -f "$f" && echo "rm $f"; done
for f in $CAPGO/bundles/*.zip; do v=$(basename "$f" .zip); [ "$(printf '%s\n1.2.9.2\n' "$v"|sort -V|head -1)" = "$v" ] && [ "$v" != "1.2.9.2" ] && rm -f "$f" && echo "rm $f"; done
rm -f $HOT/*.bak-* $CAPGO/*.bak-*
# 验证
echo PC:; curl -s "https://api.themisfitserspeople.top/tianming/hot/hot-latest.json"|head -c 120; echo
echo AND:; curl -s "https://api.themisfitserspeople.top/tianming/capgo/latest.json"; echo
```
