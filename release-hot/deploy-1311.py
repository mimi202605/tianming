#!/usr/bin/env python3
"""Server-side deploy for Tianming 1.3.1.1 (电脑端热更) — runs ON the server (python3),
pulls the FULL hot package from the GitHub Release over HTTP (no SSH from dev side).
Full-zip (not delta): unpacks into the sha-addressed /files/ store + writes /manifests/,
places the zip + hot-latest.json, and updates the standalone changelog (邸报) FROM THE ZIP
itself (so it does not depend on the GitHub main push having landed first).

Run on the server (1Panel VNC / web terminal):
  curl -sL https://github.com/misfit-user/tianming/releases/download/hot-1.3.1.1/deploy-1311.py -o /tmp/d.py
  python3 /tmp/d.py
"""
import urllib.request, json, os, zipfile, hashlib, time, shutil, sys

TAG = "hot-1.3.1.1"
VER = "1.3.1.1"
ZIP_NAME = f"tianming-hot-{VER}.zip"
REL = f"https://github.com/misfit-user/tianming/releases/download/{TAG}"
ZIP_URL = f"{REL}/{ZIP_NAME}"
HOTLATEST_URL = f"{REL}/hot-latest.json"

BASE = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
REAL = BASE + "/hot"
PARENT = BASE
FILES = REAL + "/files"
MANIFESTS = REAL + "/manifests"

def fetch(url, tries=6):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-deploy/1"})
            return urllib.request.urlopen(req, timeout=600).read()
        except Exception as e:
            last = e; print(f"  fetch retry {i+1}: {type(e).__name__}", flush=True); time.sleep(3)
    raise SystemExit(f"FETCH FAILED {url}: {last}")

def shapath(sha, base): return f"{FILES}/{sha[:2]}/{sha[2:]}/{base}"

def main():
    ts = time.strftime("%Y%m%d-%H%M%S")
    os.makedirs(FILES, exist_ok=True); os.makedirs(MANIFESTS, exist_ok=True)
    print(f"[deploy {VER}] downloading full hot zip (~210MB) + hot-latest from GitHub...", flush=True)
    zip_bytes = fetch(ZIP_URL)
    open("/tmp/tm-1311.zip", "wb").write(zip_bytes)
    zsha = hashlib.sha256(zip_bytes).hexdigest()
    print(f"  zip {len(zip_bytes)/1024/1024:.1f}MB sha={zsha[:12]}", flush=True)
    hotlatest = json.loads(fetch(HOTLATEST_URL).decode("utf-8"))
    if hotlatest.get("sha256") and hotlatest["sha256"].lower() != zsha.lower():
        print(f"ABORT: hot-latest sha != downloaded zip sha -- NOT publishing"); sys.exit(2)

    z = zipfile.ZipFile("/tmp/tm-1311.zip")
    mbytes = z.read("manifest.json"); m = json.loads(mbytes)

    # 1. unpack every file into sha-addressed /files/ (full zip -> nothing can be missing)
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
        print("MISSING:", miss_list[:20]); print("ABORT_INCOMPLETE -- server unchanged"); sys.exit(3)

    # 2. per-version manifest (for incremental clients)
    mp = f"{MANIFESTS}/{VER}.json"
    with open(mp + ".tmp", "wb") as fh: fh.write(mbytes)
    os.replace(mp + ".tmp", mp); os.chmod(mp, 0o644)

    # 3. place the full zip (for non-incremental clients)
    zp = f"{REAL}/{ZIP_NAME}"
    shutil.move("/tmp/tm-1311.zip", zp); os.chmod(zp, 0o644)
    print(f"ZIP placed {ZIP_NAME}", flush=True)

    # 4. hot-latest.json (sha/size already match the built zip) — publish (backup old)
    hp = f"{REAL}/hot-latest.json"
    if os.path.exists(hp): shutil.copy2(hp, hp + f".bak-{ts}")
    with open(hp + ".tmp", "w") as fh: json.dump(hotlatest, fh, ensure_ascii=False, indent=2)
    os.replace(hp + ".tmp", hp); os.chmod(hp, 0o644)
    print(f"HOT-LATEST published v{hotlatest['version']}", flush=True)

    # 5. standalone changelog (邸报) FROM THE ZIP -> parent dir (backup old)
    try:
        changelog_bytes = z.read("changelog.json")
    except KeyError:
        try: changelog_bytes = z.read("web/changelog.json")
        except KeyError: changelog_bytes = None
    if changelog_bytes:
        cp = f"{PARENT}/changelog.json"
        if os.path.exists(cp): shutil.copy2(cp, cp + f".bak-{ts}")
        with open(cp + ".tmp", "wb") as fh: fh.write(changelog_bytes)
        os.replace(cp + ".tmp", cp); os.chmod(cp, 0o644)
        cl = json.loads(changelog_bytes)
        print(f"CHANGELOG published top={cl['entries'][0]['date']} {cl['entries'][0]['module'][:28]}", flush=True)
    else:
        print("WARN: changelog.json not found in zip -- 邸报 not updated", flush=True)

    print(f"\nfiles in store: {sum(len(fs) for _,_,fs in os.walk(FILES))}")
    print("=== DONE 1.3.1.1 (desktop hot) PUBLISHED ===")

if __name__ == "__main__":
    main()
