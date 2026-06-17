#!/usr/bin/env python3
"""安卓 Capgo 落位 1.3.1.1 — 服务器跑·从 GitHub Release 拉 bundle + latest.json 放 /tianming/capgo/
  curl -sL https://github.com/misfit-user/tianming/releases/download/hot-1.3.1.1/capgo-deploy-1311.py -o /tmp/c.py
  python3 /tmp/c.py
"""
import urllib.request, os, time, json, shutil
TAG, VER = "hot-1.3.1.1", "1.3.1.1"
REL = f"https://github.com/misfit-user/tianming/releases/download/{TAG}"
DST = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/capgo"

def fetch(u, tries=6):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "tm-deploy/1"})
            return urllib.request.urlopen(req, timeout=600).read()
        except Exception as e:
            last = e; print(f"  retry {i+1}: {type(e).__name__}", flush=True); time.sleep(3)
    raise SystemExit(f"FETCH FAILED {u}: {last}")

def main():
    ts = time.strftime("%Y%m%d-%H%M%S")
    os.makedirs(DST + "/bundles", exist_ok=True)
    print(f"[capgo {VER}] downloading bundle (~460MB) from GitHub...", flush=True)
    z = fetch(f"{REL}/{VER}.zip")
    bp = f"{DST}/bundles/{VER}.zip"
    with open(bp + ".tmp", "wb") as f: f.write(z)
    os.replace(bp + ".tmp", bp); os.chmod(bp, 0o644)
    print(f"  bundle {len(z)/1048576:.1f}MB -> {bp}", flush=True)
    lj = fetch(f"{REL}/latest.json")
    lp = f"{DST}/latest.json"
    if os.path.exists(lp): shutil.copy2(lp, lp + f".bak-{ts}")
    with open(lp + ".tmp", "wb") as f: f.write(lj)
    os.replace(lp + ".tmp", lp); os.chmod(lp, 0o644)
    print(f"  latest.json: {json.loads(lj)}", flush=True)
    print("=== DONE capgo 1.3.1.1 PUBLISHED ===")

if __name__ == "__main__":
    main()
