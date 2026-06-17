#!/usr/bin/env python3
"""Desktop-only Tianming hot-update repair for 1.3.3.4.

Runs on the server. Pulls the corrected GitHub Release assets and republishes:
- /hot/tianming-hot-1.3.3.4.zip
- /hot/hot-latest.json
- /hot/manifests/1.3.3.4.json
- /hot/files/<sha-addressed files>
- /changelog.json

This intentionally does not touch Android Capgo assets.
"""
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.request
import zipfile

TAG = "ship-1.3.3.4"
VER = "1.3.3.4"
ZIP_NAME = f"tianming-hot-{VER}.zip"
REL = f"https://github.com/misfit-user/tianming/releases/download/{TAG}"

BASE = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
HOT = BASE + "/hot"
FILES = HOT + "/files"
MANIFESTS = HOT + "/manifests"


def download(url, dst, tries=6):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-hot-repair/1"})
            with urllib.request.urlopen(req, timeout=300) as resp, open(dst + ".part", "wb") as fh:
                shutil.copyfileobj(resp, fh, length=1024 * 1024)
            os.replace(dst + ".part", dst)
            return dst
        except Exception as exc:
            last = exc
            print(f"download retry {i + 1}/{tries}: {type(exc).__name__} {exc}", flush=True)
            time.sleep(3)
    raise SystemExit(f"DOWNLOAD FAILED {url}: {last}")


def fetch_json(url, tries=6):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-hot-repair/1"})
            raw = urllib.request.urlopen(req, timeout=120).read()
            return json.loads(raw.decode("utf-8-sig"))
        except Exception as exc:
            last = exc
            print(f"json retry {i + 1}/{tries}: {type(exc).__name__} {exc}", flush=True)
            time.sleep(3)
    raise SystemExit(f"JSON FAILED {url}: {last}")


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def shapath(sha, base):
    return f"{FILES}/{sha[:2]}/{sha[2:]}/{base}"


def main():
    ts = time.strftime("%Y%m%d-%H%M%S")
    os.makedirs(HOT, exist_ok=True)
    os.makedirs(FILES, exist_ok=True)
    os.makedirs(MANIFESTS, exist_ok=True)

    stage = f"{HOT}/_repair_1334_nomin"
    os.makedirs(stage, exist_ok=True)
    zpath = f"{stage}/{ZIP_NAME}"

    print(f"[repair {VER}] fetch hot-latest.json", flush=True)
    feed = fetch_json(f"{REL}/hot-latest.json")
    print(f"[repair {VER}] download desktop zip", flush=True)
    download(f"{REL}/{ZIP_NAME}", zpath)
    zsha = sha256_file(zpath)
    if str(feed.get("sha256", "")).lower() != zsha.lower():
        print("ABORT sha mismatch", feed.get("sha256"), zsha)
        sys.exit(2)

    with zipfile.ZipFile(zpath) as zf:
        manifest_bytes = zf.read("manifest.json")
        manifest = json.loads(manifest_bytes.decode("utf-8"))
        if manifest.get("version") != VER:
            print("ABORT manifest version mismatch", manifest.get("version"))
            sys.exit(3)
        if manifest.get("minAppVersion"):
            print("ABORT minAppVersion still present", manifest.get("minAppVersion"))
            sys.exit(4)

        moved = skipped = 0
        for item in manifest["files"]:
            rel = str(item["path"]).replace("\\", "/")
            data = zf.read(rel)
            actual = hashlib.sha256(data).hexdigest()
            expected = str(item["sha256"]).lower()
            if actual != expected:
                print("ABORT file sha mismatch", rel)
                sys.exit(5)
            dst = shapath(expected, os.path.basename(rel))
            if os.path.exists(dst):
                skipped += 1
                continue
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst + ".tmp-codex", "wb") as fh:
                fh.write(data)
            os.replace(dst + ".tmp-codex", dst)
            os.chmod(dst, 0o644)
            moved += 1

        changelog_bytes = None
        for name in ("changelog.json", "web/changelog.json"):
            try:
                changelog_bytes = zf.read(name)
                break
            except KeyError:
                pass

    mp = f"{MANIFESTS}/{VER}.json"
    if os.path.exists(mp):
        shutil.copy2(mp, mp + f".bak-{ts}")
    with open(mp + ".tmp-codex", "wb") as fh:
        fh.write(manifest_bytes)
    os.replace(mp + ".tmp-codex", mp)
    os.chmod(mp, 0o644)

    final_zip = f"{HOT}/{ZIP_NAME}"
    if os.path.exists(final_zip):
        shutil.copy2(final_zip, final_zip + f".bak-{ts}")
    os.replace(zpath, final_zip)
    os.chmod(final_zip, 0o644)

    hp = f"{HOT}/hot-latest.json"
    if os.path.exists(hp):
        shutil.copy2(hp, hp + f".bak-{ts}")
    with open(hp + ".tmp-codex", "w", encoding="utf-8") as fh:
        json.dump(feed, fh, ensure_ascii=False, indent=2)
    os.replace(hp + ".tmp-codex", hp)
    os.chmod(hp, 0o644)

    if changelog_bytes:
        cp = f"{BASE}/changelog.json"
        if os.path.exists(cp):
            shutil.copy2(cp, cp + f".bak-{ts}")
        with open(cp + ".tmp-codex", "wb") as fh:
            fh.write(changelog_bytes)
        os.replace(cp + ".tmp-codex", cp)
        os.chmod(cp, 0o644)

    print(json.dumps({
        "done": True,
        "version": VER,
        "minAppVersion": manifest.get("minAppVersion"),
        "files": len(manifest["files"]),
        "moved": moved,
        "skipped": skipped,
        "zipSha": zsha,
        "zipSize": os.path.getsize(final_zip),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
