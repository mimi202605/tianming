#!/usr/bin/env bash
# 天命 1.3.3.5 双端热更服务器落位脚本（owner 在 1Panel 终端/VNC 跑）
# 一行调用: curl -fsSL https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.5/deploy-1335.sh | bash
set -e
ROOT=/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming
B=https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.5

echo "[1/5] 电脑端热更: zip + feed + 全量清单"
mkdir -p "$ROOT/hot/manifests"
cd "$ROOT/hot"
curl -fL -o tianming-hot-1.3.3.5.zip "$B/tianming-hot-1.3.3.5.zip"
curl -fL -o hot-latest.json "$B/hot-latest.json"
curl -fL -o manifests/1.3.3.5.json "$B/1.3.3.5.json"

echo "[2/5] 解 zip 成 files/ sha 仓（已热更玩家增量更新靠它，漏了这批玩家收不到）"
python3 << 'PY'
import zipfile,json,os,shutil
z=zipfile.ZipFile('tianming-hot-1.3.3.5.zip'); m=json.loads(z.read('manifest.json'))
n=0
for f in m['files']:
    s=f['sha256']; d=os.path.join('files',s[:2],s[2:]); os.makedirs(d,exist_ok=True)
    p=os.path.join(d,os.path.basename(f['path']))
    if not os.path.exists(p):
        with z.open(f['path']) as a, open(p,'wb') as b: shutil.copyfileobj(a,b)
    n+=1
print('  files/ repo:',n,'files')
PY

echo "[3/5] 邸报 changelog"
curl -fL -o "$ROOT/changelog.json" "$B/changelog.json"

echo "[4/5] 安卓 capgo"
mkdir -p "$ROOT/capgo/bundles"
curl -fL -o "$ROOT/capgo/bundles/1.3.3.5.zip" "$B/1.3.3.5.zip"
curl -fL -o "$ROOT/capgo/latest.json" "$B/latest.json"

echo "[5/5] 公网验证（三处 version 应=1.3.3.5）"
set +e
echo -n "  hot:     "; curl -s "https://api.themisfitserspeople.top/tianming/hot/hot-latest.json" | head -c 90; echo
echo -n "  capgo:   "; curl -s "https://api.themisfitserspeople.top/tianming/capgo/latest.json" | head -c 90; echo
echo -n "  邸报:    "; curl -s "https://api.themisfitserspeople.top/tianming/changelog.json" | head -c 60; echo
echo "==== 1.3.3.5 双端落位完成 ===="
