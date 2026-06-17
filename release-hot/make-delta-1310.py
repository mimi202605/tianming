# 生成 1.3.1.0 delta 包:base=本地 1.3.0.0.zip(完整 manifest 含 assets sha),
# delta 只含本版变更/新增的代码文件;assets/ 冻结(用 base sha,服务器 /files/ 已有,deploy 重建时复用)。
import json, zipfile, time, os

BASE_ZIP  = "release-hot/tianming-hot-1.3.0.0.zip"
LOCAL_ZIP = "release-hot/tianming-hot-1.3.1.0.zip"
OUT_DELTA = "release-hot/tianming-hot-1.3.1.0-delta.zip"
OUT_HOT   = "release-hot/hot-latest.json"          # build 已生成·复用其 notes
VER_NEW   = "1.3.1.0"
FREEZE = ("assets/",)   # 冻结前缀:本地此目录不全·一律用 base(线上完整版)

bz = zipfile.ZipFile(BASE_ZIP)
base = json.loads(bz.read("manifest.json"))
base_by = {f["path"]: f for f in base["files"]}

lz = zipfile.ZipFile(LOCAL_ZIP)
local = json.loads(lz.read("manifest.json"))
local_by = {f["path"]: f for f in local["files"]}

# new manifest 从 base 全集起步(冻结 assets + 默认保留 base 一切)
result = dict(base_by)
delta_paths = []
frozen_skipped = 0
for p, lf in local_by.items():
    if p.startswith(FREEZE):
        frozen_skipped += 1
        continue  # 冻结:用 base(已在 result);本地独有 assets 忽略
    bf = base_by.get(p)
    if bf is None or bf["sha256"] != lf["sha256"]:
        result[p] = lf          # 变更/新增 → 用本地
        delta_paths.append(p)   # 进 delta 包
    # else 同 sha:result 保持 base(=local 内容相同)

new_files = list(result.values())

# 复用 build 生成的 hot-latest 的 notes
notes = ""
try:
    notes = json.loads(open(OUT_HOT, encoding="utf-8").read()).get("notes", "")
except Exception:
    pass

# 写 delta zip:变更代码文件内容(从 local zip 提取) + 完整 new manifest
new_manifest = {
    "type": local.get("type", "tianming-hot-update-manifest"),
    "version": VER_NEW,
    "minAppVersion": local.get("minAppVersion", base.get("minAppVersion", "1.2.1.0")),
    "notes": notes,
    "files": new_files,
}
with zipfile.ZipFile(OUT_DELTA, "w", zipfile.ZIP_DEFLATED) as dz:
    for p in delta_paths:
        dz.writestr(p, lz.read(p))
    dz.writestr("manifest.json", json.dumps(new_manifest, ensure_ascii=False))

# hot-latest.json(sha/size 由服务器 deploy 重建后 patch·此处占位)
hot = {
    "type": "tianming-hot-update-feed", "version": VER_NEW,
    "packageUrl": f"tianming-hot-{VER_NEW}.zip",
    "manifestUrl": f"manifests/{VER_NEW}.json",
    "filesBaseUrl": "files/",
    "sha256": "PENDING_SERVER_REBUILD", "size": 0,
    "notes": notes,
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
open(OUT_HOT, "w", encoding="utf-8").write(json.dumps(hot, ensure_ascii=False, indent=2))

dsize = os.path.getsize(OUT_DELTA)
print(f"base files: {len(base['files'])} | local files: {len(local['files'])} | new manifest files: {len(new_files)}")
print(f"frozen assets skipped: {frozen_skipped}")
print(f"delta files (变更/新增·进包): {len(delta_paths)}  | delta zip: {dsize/1024/1024:.2f} MB")
print("--- delta 文件清单 ---")
for p in sorted(delta_paths):
    print("  " + p)
