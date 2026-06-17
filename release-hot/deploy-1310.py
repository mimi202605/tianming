#!/usr/bin/env python3
"""Server-side deploy for Tianming 1.3.1.0 — runs ON the server (python3), pulls everything
from GitHub over HTTP (no SSH from the dev side needed). Places the delta into the
sha-addressed /files/ store, rebuilds the full zip locally, publishes manifest + hot-latest
(with rebuilt-zip sha) + standalone changelog (邸报).

FAIL-SAFE: if any manifest file is neither already on the server nor in the delta, it ABORTS
without publishing — the server stays on the current live version. Nothing goes live half-baked.

Run on the server (1Panel VNC / web terminal):
  curl -sL https://github.com/misfit-user/tianming/releases/download/hot-1.3.1.0/deploy-1310.py -o /tmp/deploy-1310.py
  python3 /tmp/deploy-1310.py
"""
import urllib.request, json, os, zipfile, hashlib, time, shutil, sys

TAG = "hot-1.3.1.0"
VER = "1.3.1.0"
ZIP_NAME = f"tianming-hot-{VER}.zip"
REL = f"https://github.com/misfit-user/tianming/releases/download/{TAG}"
DELTA_URL = f"{REL}/tianming-hot-{VER}-delta.zip"
HOTLATEST_URL = f"{REL}/hot-latest.json"
CHANGELOG_URL = "https://raw.githubusercontent.com/misfit-user/tianming/main/changelog.json"

BASE = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
REAL = BASE + "/hot"
PARENT = BASE
FILES = REAL + "/files"
MANIFESTS = REAL + "/manifests"

def fetch(url, tries=5):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-deploy/1"})
            return urllib.request.urlopen(req, timeout=180).read()
        except Exception as e:
            last = e; print(f"  fetch retry {i+1}: {type(e).__name__}", flush=True); time.sleep(3)
    raise SystemExit(f"FETCH FAILED {url}: {last}")

def shapath(sha, base): return f"{FILES}/{sha[:2]}/{sha[2:]}/{base}"

def main():
    ts = time.strftime("%Y%m%d-%H%M%S")
    os.makedirs(FILES, exist_ok=True); os.makedirs(MANIFESTS, exist_ok=True)
    print(f"[deploy {VER}] downloading delta + hot-latest + changelog from GitHub...", flush=True)
    delta_bytes = fetch(DELTA_URL)
    open("/tmp/tm-delta.zip", "wb").write(delta_bytes)
    hotlatest = json.loads(fetch(HOTLATEST_URL).decode("utf-8"))
    changelog_bytes = fetch(CHANGELOG_URL)
    print(f"  delta {len(delta_bytes)/1024/1024:.2f}MB | changelog {len(changelog_bytes)} bytes", flush=True)

    z = zipfile.ZipFile("/tmp/tm-delta.zip")
    mbytes = z.read("manifest.json"); m = json.loads(mbytes)

    # 1. place delta files into sha-addressed /files/
    moved = skipped = missing = 0; miss_list = []
    for f in m["files"]:
        dst = shapath(f["sha256"], os.path.basename(f["path"]))
        if os.path.exists(dst): skipped += 1; continue
        try: data = z.read(f["path"])
        except KeyError: missing += 1; miss_list.append(f["path"]); continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst + ".tmp", "wb") as fh: fh.write(data)
        os.replace(dst + ".tmp", dst); moved += 1
    print(f"FILES moved={moved} skipped={skipped} missing={missing}", flush=True)
    if missing > 0:
        print("MISSING_FILES:", miss_list[:30])
        print(f"ABORT_INCOMPLETE: {missing} files neither on server nor in delta -- NOT publishing, server unchanged")
        sys.exit(2)

    # 2. per-version manifest
    mp = f"{MANIFESTS}/{VER}.json"
    with open(mp + ".tmp", "wb") as fh: fh.write(mbytes)
    os.replace(mp + ".tmp", mp); os.chmod(mp, 0o644)

    # 3. rebuild full zip from /files/ + manifest (fallback for old non-incremental clients)
    zp = f"{REAL}/{ZIP_NAME}"; zmiss = 0
    with zipfile.ZipFile(zp + ".tmp", "w", zipfile.ZIP_DEFLATED) as zf:
        for f in m["files"]:
            src = shapath(f["sha256"], os.path.basename(f["path"]))
            if os.path.exists(src):
                with open(src, "rb") as fh: zf.writestr(f["path"], fh.read())
            else: zmiss += 1
        zf.writestr("manifest.json", mbytes)
    if zmiss > 0:
        os.remove(zp + ".tmp")
        print(f"ABORT_INCOMPLETE: zip rebuild missing {zmiss} files -- NOT publishing, server unchanged")
        sys.exit(3)
    os.replace(zp + ".tmp", zp); os.chmod(zp, 0o644)
    h = hashlib.sha256(); sz = 0
    with open(zp, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""): h.update(b); sz += len(b)
    zsha = h.hexdigest()
    print(f"ZIP rebuilt size={sz} sha={zsha} zmiss=0", flush=True)

    # 4. hot-latest.json — patch sha/size to the rebuilt zip, then publish (backup old)
    hotlatest["sha256"] = zsha; hotlatest["size"] = sz; hotlatest["packageUrl"] = ZIP_NAME
    hp = f"{REAL}/hot-latest.json"
    if os.path.exists(hp): shutil.copy2(hp, hp + f".bak-{ts}")
    with open(hp + ".tmp", "w") as fh: json.dump(hotlatest, fh, ensure_ascii=False, indent=2)
    os.replace(hp + ".tmp", hp); os.chmod(hp, 0o644)
    print(f"HOT-LATEST published v{hotlatest['version']}", flush=True)

    # 5. standalone changelog (邸报) -> parent dir (backup old)
    cp = f"{PARENT}/changelog.json"
    if os.path.exists(cp): shutil.copy2(cp, cp + f".bak-{ts}")
    with open(cp + ".tmp", "wb") as fh: fh.write(changelog_bytes)
    os.replace(cp + ".tmp", cp); os.chmod(cp, 0o644)
    cl = json.loads(changelog_bytes)
    print(f"CHANGELOG published top={cl['entries'][0]['date']} {cl['entries'][0]['module'][:28]}", flush=True)

    os.remove("/tmp/tm-delta.zip")
    print(f"\nfiles in store: {sum(len(fs) for _,_,fs in os.walk(FILES))}")
    print("=== DONE 1.3.1.0 PUBLISHED ===")

if __name__ == "__main__":
    main()
