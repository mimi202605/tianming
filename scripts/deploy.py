#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tianming 通用服务器部署脚本 — 在服务器上跑（python3·stdlib only·单文件）。
2026-06-11·更新功能全面升级 S9·取代每版手写 deploy-XXXX.py。

从 GitHub Release 拉制品（dev 侧 SSH 被墙·全走 HTTP），内存安全（大 zip 全程流式落盘），
全部写入原子化（.tmp + os.replace）+ 旧 feed 留 .bak-<ts>，发布顺序「内容先、feed 最后」
（杜绝 feed 已说新版、包还没到位的 404 竞态）。

服务器一行（release.js 会按版补好 DEFAULT_TAG 并把本文件传到 release 资产里）：
  curl -sL https://github.com/misfit-user/tianming/releases/download/ship-X.Y.Z.W/deploy.py -o /tmp/d.py && python3 /tmp/d.py

参数：
  --tag ship-X.Y.Z.W | --version X.Y.Z.W   二选一（默认 DEFAULT_TAG）
  --only desktop,capgo,changelog,installer  只发某几端（默认全部·installer 资产不在则自动跳过）
  --enable-manifest                         capgo latest.json 携带差量 manifest（默认剥掉=全量兜底·灰度试差量时再开）
  --disable-manifest                        只把服务器现有 capgo/latest.json 的 manifest 剥掉重发（即时回退·不下载任何资产）
  --force                                   允许发布相同/更低版本（默认单调闸拒绝）
  --dry-run                                 下载+全套校验·不写任何对外文件
  --base-dir DIR                            服务器根（默认 1Panel 路径·本地模拟传临时目录）
  --assets-dir DIR                          从本地目录取资产（本地模拟·不访问 GitHub）
  --skip-verify                             跳过发布后公网回读校验
"""
import urllib.request, json, os, zipfile, hashlib, time, shutil, sys, re, base64

DEFAULT_TAG = ""  # release.js 每版自动补 "ship-X.Y.Z.W"
REPO = "misfit-user/tianming"
DEFAULT_BASE = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
PUBLIC_BASE = "https://api.themisfitserspeople.top/tianming"

# ── 参数 ──────────────────────────────────────────────────────────────────────
def arg(name, dflt=None):
    if "--" + name in sys.argv:
        i = sys.argv.index("--" + name)
        if i + 1 < len(sys.argv) and not sys.argv[i + 1].startswith("--"):
            return sys.argv[i + 1]
        return True
    return dflt

def flag(name):
    return ("--" + name) in sys.argv

TAG = str(arg("tag", "") or "")
VER = str(arg("version", "") or "")
if not TAG and VER: TAG = "ship-" + VER
if not TAG: TAG = DEFAULT_TAG
if not VER and TAG.startswith("ship-"): VER = TAG[5:]
if not TAG or not VER:
    print("缺 --tag/--version 且 DEFAULT_TAG 未补"); sys.exit(2)

BASE = str(arg("base-dir", DEFAULT_BASE))
ASSETS_DIR = str(arg("assets-dir", "") or "")
ONLY = [s.strip() for s in str(arg("only", "") or "").split(",") if s.strip()]
DRY = flag("dry-run")
FORCE = flag("force")
ENABLE_MANIFEST = flag("enable-manifest")
DISABLE_MANIFEST = flag("disable-manifest")
SKIP_VERIFY = flag("skip-verify") or bool(ASSETS_DIR) or (BASE != DEFAULT_BASE)

REL = f"https://github.com/{REPO}/releases/download/{TAG}"
HOT = BASE + "/hot"
FILES = HOT + "/files"
MANIFESTS = HOT + "/manifests"
CAPGO = BASE + "/capgo"
CAPGO_BUNDLES = CAPGO + "/bundles"
CAPGO_FILES = CAPGO + "/files"
RELEASES_WIN = BASE + "/releases/win"
TS = time.strftime("%Y%m%d-%H%M%S")

def want(channel):
    return (not ONLY) or (channel in ONLY)

# ── 基础设施（承袭 deploy-1334.py 验证过的范式） ───────────────────────────────
def log(msg): print(msg, flush=True)

def download(name, dst, tries=6):
    """资产 → dst·流式 1MB chunk·恒定低内存。--assets-dir 时从本地拷。"""
    if ASSETS_DIR:
        src = os.path.join(ASSETS_DIR, name)
        if not os.path.exists(src): raise FileNotFoundError(src)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst + ".part"); os.replace(dst + ".part", dst)
        return dst
    url = f"{REL}/{name}"
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tm-deploy/2"})
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with urllib.request.urlopen(req, timeout=900) as r, open(dst + ".part", "wb") as fh:
                shutil.copyfileobj(r, fh, length=1024 * 1024)
            os.replace(dst + ".part", dst)
            return dst
        except Exception as e:
            last = e; log(f"  download retry {i+1}: {type(e).__name__} {e}"); time.sleep(3)
    raise SystemExit(f"DOWNLOAD FAILED {url}: {last}")

def asset_exists(name):
    if ASSETS_DIR:
        return os.path.exists(os.path.join(ASSETS_DIR, name))
    try:
        req = urllib.request.Request(f"{REL}/{name}", headers={"User-Agent": "tm-deploy/2"}, method="HEAD")
        urllib.request.urlopen(req, timeout=60)
        return True
    except Exception:
        return False

def fetch_small(name, tries=6):
    if ASSETS_DIR:
        with open(os.path.join(ASSETS_DIR, name), "rb") as fh: return fh.read()
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(f"{REL}/{name}", headers={"User-Agent": "tm-deploy/2"})
            return urllib.request.urlopen(req, timeout=120).read()
        except Exception as e:
            last = e; log(f"  fetch retry {i+1}: {type(e).__name__}"); time.sleep(3)
    raise SystemExit(f"FETCH FAILED {name}: {last}")

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""): h.update(chunk)
    return h.hexdigest()

def sha512_b64_file(path):
    h = hashlib.sha512()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""): h.update(chunk)
    return base64.b64encode(h.digest()).decode("ascii")

def parse_json_bytes(raw): return json.loads(raw.decode("utf-8-sig"))

def ver_tuple(v):
    parts = re.split(r"[.+-]", str(v or "0"))
    out = []
    for p in parts[:4]:
        try: out.append(int(p))
        except ValueError: out.append(0)
    while len(out) < 4: out.append(0)
    return tuple(out)

def publish_bytes(path, data, label):
    """原子发布·旧文件留 .bak-<ts>·dry-run 只演不写。"""
    if DRY:
        log(f"  [dry-run] 将发布 {label} → {path} ({len(data)} bytes)")
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path): shutil.copy2(path, path + f".bak-{TS}")
    with open(path + ".tmp", "wb") as fh: fh.write(data)
    os.replace(path + ".tmp", path); os.chmod(path, 0o644)
    log(f"  发布 {label} → {path}")

def publish_move(src, dst, label):
    if DRY:
        log(f"  [dry-run] 将移动就位 {label} → {dst} ({os.path.getsize(src)/1048576:.1f}MB)")
        try: os.remove(src)
        except OSError: pass
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    os.replace(src, dst); os.chmod(dst, 0o644)
    log(f"  就位 {label} → {dst}")

def gate_monotonic(live_path, new_ver, channel):
    """版本单调闸。返回 'publish' | 'skip'（相同版本幂等重跑）。更低版本 → abort（除非 --force）。"""
    if not os.path.exists(live_path): return "publish"
    try:
        if live_path.endswith(".yml"):
            m = re.search(r"^version:\s*([\w.\-]+)", open(live_path, encoding="utf-8").read(), re.M)
            live = m.group(1) if m else "0"
        else:
            live = str(parse_json_bytes(open(live_path, "rb").read()).get("version", "0"))
    except Exception as e:
        log(f"  [gate] 现有 {channel} feed 读取失败(视为可发)·{e}"); return "publish"
    nt, lt = ver_tuple(new_ver), ver_tuple(live)
    if nt > lt: return "publish"
    if nt == lt:
        log(f"  [gate] {channel} 已是 v{live}·feed 不重发（内容落位仍幂等执行）")
        return "skip"
    if FORCE:
        log(f"  [gate] WARN·{channel} 降级发布 v{new_ver} < 线上 v{live}·--force 放行（客户端会拒装·确认这是你要的）")
        return "publish"
    log(f"ABORT: {channel} 版本不单调·新 v{new_ver} < 线上 v{live}。降级会让全部客户端拒装/搁浅。--force 可强行。")
    sys.exit(5)

# ── 电脑端 Electron 热更 ──────────────────────────────────────────────────────
def deploy_desktop():
    zip_name = f"tianming-hot-{VER}.zip"
    log(f"[desktop] 下载热更整包（流式·落 serve 真实磁盘）...")
    os.makedirs(FILES, exist_ok=True); os.makedirs(MANIFESTS, exist_ok=True)
    zpath = f"{HOT}/{zip_name}.new"
    download(zip_name, zpath)
    zsha = sha256_file(zpath)
    log(f"  zip {os.path.getsize(zpath)/1048576:.1f}MB sha={zsha[:12]}")

    hotlatest = parse_json_bytes(fetch_small("hot-latest.json"))
    if str(hotlatest.get("version", "")) != VER:
        os.remove(zpath); log(f"ABORT: hot-latest.json version={hotlatest.get('version')} ≠ {VER}"); sys.exit(2)
    if hotlatest.get("sha256") and hotlatest["sha256"].lower() != zsha.lower():
        os.remove(zpath); log("ABORT: hot-latest.json sha256 ≠ 实际 zip sha·不发布"); sys.exit(2)
    if hotlatest.get("size") and int(hotlatest["size"]) != os.path.getsize(zpath):
        os.remove(zpath); log("ABORT: hot-latest.json size ≠ 实际 zip 大小·不发布"); sys.exit(2)

    feed_action = gate_monotonic(f"{HOT}/hot-latest.json", VER, "desktop")

    z = zipfile.ZipFile(zpath)
    mbytes = z.read("manifest.json"); m = json.loads(mbytes)
    znames = set(z.namelist())
    # 完备闸·manifest 每个文件都必须在 zip 里（1.3.3.4 类事故在服务器侧的最后防线）
    miss = [f["path"] for f in m["files"] if f["path"] not in znames]
    if miss:
        z.close(); os.remove(zpath)
        log(f"ABORT_INCOMPLETE: manifest 有 {len(miss)} 个文件不在 zip 里（前 10: {miss[:10]}）·服务器未动")
        sys.exit(3)

    moved = skipped = 0
    for f in m["files"]:
        dst = f"{FILES}/{f['sha256'][:2]}/{f['sha256'][2:]}/{os.path.basename(f['path'])}"
        if os.path.exists(dst): skipped += 1; continue
        data = z.read(f["path"])  # 单文件逐个读·内存安全
        if DRY: moved += 1; continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst + ".tmp", "wb") as fh: fh.write(data)
        os.replace(dst + ".tmp", dst); moved += 1
    log(f"  files 库·新入 {moved}·已有跳过 {skipped}")

    if not DRY:
        with open(f"{MANIFESTS}/{VER}.json.tmp", "wb") as fh: fh.write(mbytes)
        os.replace(f"{MANIFESTS}/{VER}.json.tmp", f"{MANIFESTS}/{VER}.json")
        os.chmod(f"{MANIFESTS}/{VER}.json", 0o644)
        log(f"  manifest 就位 manifests/{VER}.json ({len(m['files'])} 文件)")

    changelog_bytes = None
    for nm in ("changelog.json", "web/changelog.json"):
        try: changelog_bytes = z.read(nm); break
        except KeyError: continue
    z.close()
    publish_move(zpath, f"{HOT}/{zip_name}", "热更整包")
    if feed_action == "publish":
        publish_bytes(f"{HOT}/hot-latest.json",
                      json.dumps(hotlatest, ensure_ascii=False, indent=2).encode("utf-8"),
                      f"hot-latest.json v{VER}")
    return changelog_bytes

# ── 邸报 ─────────────────────────────────────────────────────────────────────
def deploy_changelog(from_zip_bytes=None):
    data = None
    if asset_exists("changelog.json"):
        data = fetch_small("changelog.json")
    elif from_zip_bytes:
        data = from_zip_bytes
    if not data:
        log("[changelog] WARN·release 里没有 changelog.json 资产·且 zip 内未取到·邸报未更新"); return
    cl = parse_json_bytes(data)
    top = cl["entries"][0]
    if VER not in str(top.get("module", "")):
        log(f"  [changelog] WARN·顶条目 module 未含 {VER}·确认 changelog 是否漏写（仍发布）")
    publish_bytes(f"{BASE}/changelog.json", data, f"邸报 top={top.get('date')}·{str(top.get('module'))[:28]}")

# ── 安卓 Capgo ───────────────────────────────────────────────────────────────
def deploy_capgo():
    # 即时回退快路·只剥服务器现有 latest.json 的 manifest·不下载任何资产
    if DISABLE_MANIFEST:
        clp = f"{CAPGO}/latest.json"
        if not os.path.exists(clp): log("ABORT: 服务器无 capgo/latest.json 可改"); sys.exit(6)
        cur = parse_json_bytes(open(clp, "rb").read())
        cur.pop("manifest", None)
        publish_bytes(clp, json.dumps(cur, ensure_ascii=False, indent=2).encode("utf-8"),
                      f"latest.json（manifest 已剥·全量回退）v{cur.get('version')}")
        return

    zip_name = f"{VER}.zip"
    os.makedirs(CAPGO_BUNDLES, exist_ok=True)
    latest = parse_json_bytes(fetch_small("latest.json"))
    if str(latest.get("version", "")) != VER:
        log(f"ABORT: capgo latest.json version={latest.get('version')} ≠ {VER}"); sys.exit(2)
    if not latest.get("url"):
        log("ABORT: capgo latest.json 缺 url（旧客户端兜底字段·绝不能少）"); sys.exit(2)

    feed_action = gate_monotonic(f"{CAPGO}/latest.json", VER, "capgo")

    # 差量对象包（可选资产）→ capgo/files/·条目名必须 64hex
    pack_name = f"capgo-files-{VER}.zip"
    if asset_exists(pack_name):
        ppath = f"{CAPGO}/{pack_name}.new"
        download(pack_name, ppath)
        pz = zipfile.ZipFile(ppath)
        added = skipped = bad = 0
        os.makedirs(CAPGO_FILES, exist_ok=True)
        for nm in pz.namelist():
            base = os.path.basename(nm)
            if not re.fullmatch(r"[0-9a-f]{64}", base): bad += 1; continue
            dst = f"{CAPGO_FILES}/{base}"
            if os.path.exists(dst): skipped += 1; continue
            data = pz.read(nm)
            if hashlib.sha256(data).hexdigest() != base: bad += 1; continue  # 名实必须相符
            if DRY: added += 1; continue
            with open(dst + ".tmp", "wb") as fh: fh.write(data)
            os.replace(dst + ".tmp", dst); os.chmod(dst, 0o644); added += 1
        pz.close(); os.remove(ppath)
        log(f"  [capgo] 对象包·新入 {added}·已有 {skipped}·非法/名实不符 {bad}")
        if bad: log("ABORT: 对象包内有名实不符条目·不发布"); sys.exit(7)
    else:
        log("  [capgo] 无 capgo-files 对象包资产（纯全量发布或对象已全在服务器）")

    # manifest 完备闸·latest.json 带 manifest 时·每个 hash 必须已在 capgo/files/（否则差量客户端会 404）
    has_manifest = isinstance(latest.get("manifest"), list) and len(latest["manifest"]) > 0
    if has_manifest:
        missing = [e["file_hash"] for e in latest["manifest"]
                   if not os.path.exists(f"{CAPGO_FILES}/{str(e.get('file_hash','')).lower()}")]
        if missing and not DRY:
            log(f"ABORT: manifest 有 {len(missing)} 个对象不在 capgo/files/（前 5: {missing[:5]}）·latest.json 未发布")
            sys.exit(7)
        if missing and DRY:
            log(f"  [dry-run] WARN·manifest 缺对象 {len(missing)} 个（dry-run 下 files 未真写·此警告可能为演练假象）")

    # 全量 bundle（永远要发·url 兜底）·已存在且大小一致 → 跳过下载（幂等/二次 enable 跑不重拉 500MB）
    cbp = f"{CAPGO_BUNDLES}/{zip_name}"
    need_dl = True
    if os.path.exists(cbp) and latest.get("size") and os.path.getsize(cbp) == int(latest["size"]):
        log(f"  [capgo] bundle 已在位且大小一致·跳过下载"); need_dl = False
    if need_dl:
        log(f"[capgo] 下载全量 bundle（流式）...")
        download(zip_name, cbp + ".new")
        got = os.path.getsize(cbp + ".new")
        if latest.get("size") and int(latest["size"]) != got:
            os.remove(cbp + ".new"); log(f"ABORT: latest.size({latest['size']}) ≠ 实际({got})"); sys.exit(4)
        publish_move(cbp + ".new", cbp, f"capgo bundle ({got/1048576:.1f}MB)")

    # feed·默认剥 manifest（全量兜底=今天的行为）·--enable-manifest 才带差量上线
    out = dict(latest)
    if not ENABLE_MANIFEST:
        out.pop("manifest", None)
    if feed_action == "publish" or ENABLE_MANIFEST:
        publish_bytes(f"{CAPGO}/latest.json",
                      json.dumps(out, ensure_ascii=False, indent=2).encode("utf-8"),
                      f"capgo latest.json v{VER}" + ("·携带差量 manifest(" + str(len(out.get('manifest', []))) + "条)" if out.get("manifest") else "·全量(url 兜底)"))

# ── 本体安装包（electron-updater 通道） ───────────────────────────────────────
def deploy_installer():
    if not asset_exists("latest.yml"):
        log("[installer] release 无 latest.yml 资产·跳过本体通道"); return
    yml_text = fetch_small("latest.yml").decode("utf-8-sig")
    def yfield(name):
        m = re.search(r"^\s*" + name + r":\s*(.+)$", yml_text, re.M)
        return m.group(1).strip().strip("'\"") if m else ""
    yver, ypath, ysha, ysize = yfield("version"), yfield("path"), yfield("sha512"), yfield("size")
    if not yver or not ypath or not ysha:
        log("ABORT: latest.yml 缺 version/path/sha512"); sys.exit(8)
    gate = gate_monotonic(f"{RELEASES_WIN}/latest.yml", yver, "installer")

    os.makedirs(RELEASES_WIN, exist_ok=True)
    alias = f"tianming-setup-{VER}-x64.exe"   # gh 资产用 ASCII 别名（中文文件名会被改写）·落位时还原 yml 的 path
    exe_dst = f"{RELEASES_WIN}/{ypath}"
    if os.path.exists(exe_dst) and ysize and os.path.getsize(exe_dst) == int(ysize) and sha512_b64_file(exe_dst) == ysha:
        log("  [installer] exe 已在位且 sha512 一致·跳过下载")
    else:
        log(f"[installer] 下载本体安装包（~{int(ysize or 0)/1048576:.0f}MB·流式）...")
        download(alias, exe_dst + ".new")
        actual = sha512_b64_file(exe_dst + ".new")
        if actual != ysha:
            os.remove(exe_dst + ".new"); log("ABORT: 安装包 sha512 与 latest.yml 不符·不发布"); sys.exit(8)
        publish_move(exe_dst + ".new", exe_dst, f"本体 {ypath}")
    if asset_exists(alias + ".blockmap"):
        download(alias + ".blockmap", f"{RELEASES_WIN}/{ypath}.blockmap.new")
        publish_move(f"{RELEASES_WIN}/{ypath}.blockmap.new", f"{RELEASES_WIN}/{ypath}.blockmap", "blockmap（差量安装）")
    if gate == "publish":
        publish_bytes(f"{RELEASES_WIN}/latest.yml", yml_text.encode("utf-8"), f"latest.yml v{yver}")

# ── 发布后公网回读 ────────────────────────────────────────────────────────────
def post_verify():
    if SKIP_VERIFY or DRY:
        log("[verify] 跳过公网回读（本地模拟/dry-run/--skip-verify）"); return
    def get(url):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 tm-deploy"})
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:
            return ("ERR " + str(e)).encode()
    checks = []
    if want("desktop"):
        checks.append(("desktop", f"{PUBLIC_BASE}/hot/hot-latest.json"))
    if want("capgo"):
        checks.append(("capgo", f"{PUBLIC_BASE}/capgo/latest.json"))
    for name, url in checks:
        fresh = get(url + "?cb=" + str(int(time.time())))
        bare = get(url)
        try:
            fv = parse_json_bytes(fresh).get("version"); bv = parse_json_bytes(bare).get("version")
            mark = "OK" if fv == VER else "源站未更新?!"
            cdn = "" if bv == fv else f"·CDN 缓存仍旧(v{bv})·等 TTL 或手动 purge"
            log(f"  [verify] {name}·源站 v{fv} {mark}{cdn}")
        except Exception:
            log(f"  [verify] {name}·回读异常·fresh={fresh[:80]!r}")

def main():
    log(f"=== tianming deploy v{VER}（tag {TAG}）{'·DRY-RUN' if DRY else ''} ===")
    log(f"    base={BASE}{'·assets=' + ASSETS_DIR if ASSETS_DIR else ''}·only={ONLY or '全部'}")
    changelog_from_zip = None
    if DISABLE_MANIFEST:
        deploy_capgo(); log("=== DONE（manifest 已剥·全量回退） ==="); return
    if want("desktop"):
        changelog_from_zip = deploy_desktop()
    if want("changelog"):
        deploy_changelog(changelog_from_zip)
    if want("capgo"):
        deploy_capgo()
    if want("installer"):
        deploy_installer()
    post_verify()
    log(f"=== DONE v{VER} ===")
    log(f"验证: curl -s {PUBLIC_BASE}/hot/hot-latest.json | head -3")
    log(f"      curl -s {PUBLIC_BASE}/capgo/latest.json | head -3")

if __name__ == "__main__":
    main()
