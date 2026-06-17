#!/bin/bash
# Tianming 1.3.3.6 dual hot-update deploy. Run on server (1Panel terminal):
#   curl -sL https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.6/deploy-1336.sh | bash
set -e
REL=https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.6
BASE=/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming

echo "[1/3] desktop hot -> hot/"
curl -fSL -o /tmp/tianming-hot-1.3.3.6.zip "$REL/tianming-hot-1.3.3.6.zip"
curl -fSL -o /tmp/hot-latest.json "$REL/hot-latest.json"
mkdir -p "$BASE/hot"
mv -f /tmp/tianming-hot-1.3.3.6.zip "$BASE/hot/"
mv -f /tmp/hot-latest.json "$BASE/hot/"

echo "[2/3] android capgo -> capgo/"
mkdir -p "$BASE/capgo/bundles"
curl -fSL -o "$BASE/capgo/bundles/1.3.3.6.zip" "$REL/1.3.3.6.zip"
curl -fSL -o "$BASE/capgo/latest.json" "$REL/latest.json"

echo "[3/3] changelog standalone -> changelog.json"
curl -fSL -o "$BASE/changelog.json" "$REL/changelog.json"

echo "==== done. verify (all should contain 1.3.3.6) ===="
echo "-- hot feed --";   curl -s "https://api.themisfitserspeople.top/tianming/hot/hot-latest.json"  | head -c 90; echo
echo "-- capgo feed --"; curl -s "https://api.themisfitserspeople.top/tianming/capgo/latest.json"    | head -c 90; echo
echo "-- changelog --";  curl -s "https://api.themisfitserspeople.top/tianming/changelog.json"       | head -c 70; echo
echo "OK if the three lines above show 1.3.3.6"
