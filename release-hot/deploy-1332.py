#!/usr/bin/env python3
"""Server-side deploy for Tianming 1.3.3.2 — runs ON the server (python3), pulls from the
GitHub Release over HTTP (no SSH from dev side). MEMORY-SAFE: streams big zips to disk in
chunks (never reads a whole 282MB/515MB file into RAM — small VPS would OOM). Handles both
ends + 邸报:
  - 电脑端 Electron 热更: full-zip -> sha-addressed /hot/files/ + /hot/manifests/1.3.3.2.json
    (incremental·1.3.3.1 玩家只下变动的 ~8 文件) + 整包 + hot-latest.json
  - 安卓 Capgo 热更: /capgo/bundles/1.3.3.2.zip + /capgo/latest.json
  - 邸报 standalone: /changelog.json (FROM THE DESKTOP ZIP)

Run on the server (1Panel VNC / web terminal):
  curl -sL https://github.com/misfit-user/tianming/releases/download/ship-1.3.3.2/deploy-1332.py -o /tmp/d.py
  python3 /tmp/d.py
"""
import urllib.request, json, os, zipfile, hashlib, time, shutil, sys

TAG = "ship-1.3.3.2"
VER = "1.3.3.2"
ZIP_NAME = f"tianming-hot-{VER}.zip"
CAPGO_ZIP = f"{VER}.zip"
REL = f"https://github.com/misfit-user/tianming/releases/download/{TAG}"

BASE = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
REAL = BASE + "/hot"
PARENT = BASE
FILES = REAL + "/files"
MANIFESTS = REAL + "/manifests"
CAPGO = BASE + "/capgo"
CAPGO_BUNDLES = CAPGO + "/bundles"

def download(url, dst, tries=6):
    """Stream url -> dst file in chunks (constant low memory). Returns dst."""
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-deploy/1"})
            with urllib.request.urlopen(req, timeout=900) as r, open(dst + ".part", "wb") as fh:
                shutil.copyfileobj(r, fh, length=1024 * 1024)  # 1MB chunks
            os.replace(dst + ".part", dst)
            return dst
        except Exception as e:
            last = e; print(f"  download retry {i+1}: {type(e).__name__} {e}", flush=True); time.sleep(3)
    raise SystemExit(f"DOWNLOAD FAILED {url}: {last}")

def fetch_small(url, tries=6):
    """Small JSON only (feeds) — safe to read fully."""
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-deploy/1"})
            return urllib.request.urlopen(req, timeout=120).read()
        except Exception as e:
            last = e; print(f"  fetch retry {i+1}: {type(e).__name__}", flush=True); time.sleep(3)
    raise SystemExit(f"FETCH FAILED {url}: {last}")

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def shapath(sha, base): return f"{FILES}/{sha[:2]}/{sha[2:]}/{base}"

def main():
    ts = time.strftime("%Y%m%d-%H%M%S")
    os.makedirs(FILES, exist_ok=True); os.makedirs(MANIFESTS, exist_ok=True)

    # ===== 电脑端 Electron 热更 =====
    # 直接下到 serve 真实磁盘(不碰 /tmp·避免 tmpfs 占内存 OOM)·校验通过即对外整包
    print(f"[deploy {VER}] 下载电脑端热更整包 (~282MB·流式·落真实磁盘) ...", flush=True)
    zp = f"{REAL}/{ZIP_NAME}"
    zpath = zp + ".new"
    download(f"{REL}/{ZIP_NAME}", zpath)
    zsha = sha256_file(zpath)
    print(f"  zip {os.path.getsize(zpath)/1024/1024:.1f}MB sha={zsha[:12]}", flush=True)
    hotlatest = json.loads(fetch_small(f"{REL}/hot-latest.json").decode("utf-8"))
    if hotlatest.get("sha256") and hotlatest["sha256"].lower() != zsha.lower():
        os.remove(zpath); print("ABORT: hot-latest sha != downloaded zip sha -- NOT publishing"); sys.exit(2)

    z = zipfile.ZipFile(zpath)
    mbytes = z.read("manifest.json"); m = json.loads(mbytes)

    moved = skipped = missing = 0; miss_list = []
    for f in m["files"]:
        dst = shapath(f["sha256"], os.path.basename(f["path"]))
        if os.path.exists(dst): skipped += 1; continue
        try: data = z.read(f["path"])      # one file at a time (largest ~few MB) — memory-safe
        except KeyError: missing += 1; miss_list.append(f["path"]); continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst + ".tmp", "wb") as fh: fh.write(data)
        os.replace(dst + ".tmp", dst); moved += 1
    print(f"FILES moved={moved} skipped={skipped} missing={missing}", flush=True)
    if missing > 0:
        print("MISSING:", miss_list[:20]); print("ABORT_INCOMPLETE -- server unchanged"); sys.exit(3)

    mp = f"{MANIFESTS}/{VER}.json"
    with open(mp + ".tmp", "wb") as fh: fh.write(mbytes)
    os.replace(mp + ".tmp", mp); os.chmod(mp, 0o644)

    # 先从 zip 读邸报字节 → 关闭 → 把整包原子移到位 → 再发 feed(避免「feed已说新版但整包还没到位」的 404 竞态)
    changelog_bytes = None
    for nm in ("changelog.json", "web/changelog.json"):
        try: changelog_bytes = z.read(nm); break
        except KeyError: continue
    z.close()
    os.replace(zpath, zp); os.chmod(zp, 0o644)   # 校验通过的 .new 原子移成对外整包
    print(f"电脑端整包就位 {ZIP_NAME}", flush=True)

    hp = f"{REAL}/hot-latest.json"
    if os.path.exists(hp): shutil.copy2(hp, hp + f".bak-{ts}")
    with open(hp + ".tmp", "w") as fh: json.dump(hotlatest, fh, ensure_ascii=False, indent=2)
    os.replace(hp + ".tmp", hp); os.chmod(hp, 0o644)
    print(f"电脑端 hot-latest 发布 v{hotlatest['version']}", flush=True)

    # ===== 邸报 standalone (从电脑端 zip 取) =====
    if changelog_bytes:
        cp = f"{PARENT}/changelog.json"
        if os.path.exists(cp): shutil.copy2(cp, cp + f".bak-{ts}")
        with open(cp + ".tmp", "wb") as fh: fh.write(changelog_bytes)
        os.replace(cp + ".tmp", cp); os.chmod(cp, 0o644)
        cl = json.loads(changelog_bytes)
        print(f"邸报发布 top={cl['entries'][0]['date']} {cl['entries'][0]['module'][:28]}", flush=True)
    else:
        print("WARN: changelog.json 不在 zip 内 -- 邸报未更新", flush=True)

    # ===== 安卓 Capgo 热更 (515MB·流式直落·全程不进内存) =====
    print(f"[deploy {VER}] 下载安卓 Capgo bundle (~515MB·流式) ...", flush=True)
    os.makedirs(CAPGO_BUNDLES, exist_ok=True)
    capgo_latest = json.loads(fetch_small(f"{REL}/latest.json").decode("utf-8"))
    cbp = f"{CAPGO_BUNDLES}/{CAPGO_ZIP}"
    download(f"{REL}/{CAPGO_ZIP}", cbp)
    got = os.path.getsize(cbp)
    if capgo_latest.get("size") and int(capgo_latest["size"]) != got:
        print(f"ABORT: capgo latest.size({capgo_latest['size']}) != downloaded({got})"); sys.exit(4)
    os.chmod(cbp, 0o644)
    clp = f"{CAPGO}/latest.json"
    if os.path.exists(clp): shutil.copy2(clp, clp + f".bak-{ts}")
    with open(clp + ".tmp", "w") as fh: json.dump(capgo_latest, fh, ensure_ascii=False, indent=2)
    os.replace(clp + ".tmp", clp); os.chmod(clp, 0o644)
    print(f"安卓 Capgo 发布 v{capgo_latest['version']} ({got/1024/1024:.1f}MB)", flush=True)

    print(f"\nfiles in store: {sum(len(fs) for _,_,fs in os.walk(FILES))}")
    print(f"=== DONE 1.3.3.2 双端热更 + 邸报 全部发布 ===")
    print("验证: curl -s https://api.themisfitserspeople.top/tianming/hot/hot-latest.json | head")
    print("      curl -s https://api.themisfitserspeople.top/tianming/capgo/latest.json")

if __name__ == "__main__":
    main()
