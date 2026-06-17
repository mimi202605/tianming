# Incremental Hot Update Sprint·plan v1

**目标**·把 hot update 从 "每次拉 430MB 全包" 变成 "只拉变化文件·典型 ship 1-5 MB"·400x 节省。

**触发**·2026-05-23 1.2.5.3 ship 后 user 反馈"但凡一点更新就拉整个包"。

**复杂度**·~3-5 天·5 slice。

---

## 1·架构

### Server 布局

```
/opt/.../api.themisfitserspeople.top/index/tianming/hot/
  ├── hot-latest.json                    # 已有·加 manifestUrl + filesBaseUrl 字段
  ├── tianming-hot-1.2.5.3.zip           # 已有·保留作首装 fallback
  ├── manifests/
  │   ├── 1.2.5.3.json                   # 新·per-version manifest (path/sha256/size)
  │   ├── 1.2.5.4.json
  │   └── ...
  └── files/                             # 新·sha-addressed file store
      ├── 96/f218bf.../tm-save-lifecycle.js
      ├── 5f/e1132e.../changelog.json
      └── ...                            # 跨版本同 sha 自动 dedup
```

**sha 寻址 (`files/<sha[0:2]>/<sha[2:]>/<basename>`)**·

- 跨版本同文件自动去重·90% 文件 (assets/portraits) 永不复制
- 任意旧版 manifest 引用仍可解析 → 支持回滚到任意版本
- GC 简单·扫所有 manifests/*·收活 sha set·prune 之外的

### hot-latest.json 新格式 (向后兼容)

```json
{
  "type": "tianming-hot-update-feed",
  "version": "1.2.5.4",
  "packageUrl": "tianming-hot-1.2.5.4.zip",   // 兼容·首装走这
  "manifestUrl": "manifests/1.2.5.4.json",    // 新·incremental 走这
  "filesBaseUrl": "files/",                   // 新·sha-addressed root
  "sha256": "...",
  "size": 451499582,
  "notes": "...",
  "generatedAt": "..."
}
```

老客户端读不到 `manifestUrl` → 走 packageUrl → 旧 zip 流程·不破坏。

### Client install 路径 (改 main.js)

```js
async installHotUpdateFromFeed_v2(){
  const feed = await readHotUpdateFeed();
  const newManifest = await fetchRemoteJson(feed.manifestUrl);
  const localMani = readJsonSafe(versions/<currentVer>/.hot-update-manifest.json);

  if (!localMani || !feed.manifestUrl) {
    // 首装·或 server 不支持·走老 zip 路径
    return await installHotUpdateFromFeed_zipFallback(...);
  }

  // diff
  const localShaMap = Object.fromEntries(localMani.files.map(f => [f.path, f.sha256]));
  const toFetch = newManifest.files.filter(f => localShaMap[f.path] !== f.sha256);
  const toFetchBytes = toFetch.reduce((a,f)=>a+f.size, 0);
  console.log(`incremental: ${toFetch.length}/${newManifest.files.length} files·${toFetchBytes} bytes`);

  // staging
  const staging = HOT_UPDATE_DIR/__staging_<ts>;
  ensureDir(staging);

  // 复制不变文件 (hardlink 优先·fallback copy)
  for (const f of newManifest.files) {
    if (toFetch.find(t => t.path === f.path)) continue;
    const src = path.join(currentDir, f.path);
    const dst = path.join(staging, f.path);
    ensureDir(path.dirname(dst));
    try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); }
  }

  // 拉 changed (concurrency=4·verify sha each)
  for (const f of toFetch) {
    const url = `${feed.filesBaseUrl}${f.sha256.slice(0,2)}/${f.sha256.slice(2)}/${path.basename(f.path)}`;
    const dst = path.join(staging, f.path);
    ensureDir(path.dirname(dst));
    await downloadAndVerify(url, dst, f.sha256, f.size);
  }

  // 写 manifest·atomic rename
  writeJson(path.join(staging, '.hot-update-manifest.json'), newManifest);
  fs.renameSync(staging, path.join(versions, newManifest.version));
  writeHotUpdateState({...});
}
```

### Build 端 (build-hot-update-package.js 不动)

仍产 zip + manifest in zip。zip 仍是首装 fallback·必保。

### Upload 端 (改 skill upload-hot.py·~中改)

1. SCP zip → `hot/tianming-hot-X.zip` (已有)
2. SCP hot-latest.json → `hot/hot-latest.json` (已有·改 schema 加 manifestUrl)
3. SCP changelog.json → `tianming/changelog.json` (1.2.5.3 已加·保留)
4. **新**·解 zip·foreach file·sha 已知·`scp file → hot/files/<sha2>/<sha-rest>/<basename>` (重复 sha skip)
5. **新**·SCP manifest → `hot/manifests/X.json`

### GC (Optional·后置)

cron 周扫·

```bash
ACTIVE=$(jq -r '.files[].sha256' /opt/.../hot/manifests/*.json | sort -u)
for f in /opt/.../hot/files/*/*/*; do
  basename_sha=$(echo $f | awk -F/ '{print $(NF-2)$(NF-1)}')
  grep -q $basename_sha <<< "$ACTIVE" || rm -f $f
done
```

---

## 2·Slice 拆分

| Slice | 内容 | 文件 | 工时 | 风险 |
|---|---|---|---|---|
| **S1** | server upload-hot.py extension·extract zip + sha-upload + manifest upload·新增 `/manifests/` + `/files/<sha2>/<sha>/<base>/` | `~/.claude/skills/.../upload-hot.py` | 0.5-1d | 上传时间 (首次全量上)·之后 dedup |
| **S2** | hot-latest.json schema bump·`manifestUrl + filesBaseUrl` 字段·build 脚本也加 | `build-hot-update-package.js`·`upload-hot.py` | 0.3d | 老 client 兼容性已保 (向后忽略 unknown 字段) |
| **S3** | main.js incremental install·新 path + 老 fallback·sha verify·atomic rename·hardlink 优先 | `main.js:installHotUpdateFromFeed` | 1.5-2d | partial 失败 rollback·rename 原子性 |
| **S4** | 测试·首装·incremental (1 文件变)·全文件变·sha mismatch·partial fail·rollback·hardlink fail (跨盘) | 写 `scripts/test-incremental-install.js` | 1d | edge case 多 |
| **S5** (optional) | GC cron + 监控·`prune-orphaned-sha.sh` | 服务端 | 0.5d | 防 sha 漏算误删·先 dry-run |
| **总计** | | | **3.8-5d** | |

---

## 3·过渡兼容

- 老 .exe (1.2.2.0 等)·只读 `packageUrl`·走 zip 全包·**继续工作**
- 新 .exe (装了 main.js incremental patch)·优先 `manifestUrl + filesBaseUrl`·失败 fallback 老 zip
- server·zip + manifest + files/ 三套都保·支持新老 client 共存

**滚动升级**·先 ship 新 main.js (走老 zip)·下次 ship 起新 client 就能享 incremental。

---

## 4·关键决策待 user 拍板

### Q1·sha 路径风格

- A·`files/<sha[0:2]>/<sha[2:]>/<basename>` — 推荐·避免单 dir 过多 file·basename 保留方便 debug·`scp file files/96/f218bf.../tm-save-lifecycle.js`
- B·`files/<sha>/<basename>` — 简单·但 N 万 file 在一 dir 慢
- C·`files/<sha>` — 最紧凑·失 debug 友好性

### Q2·首装策略

- A·首装拉全 zip (~430MB·已有) — 推荐·simple·已 work
- B·首装也 incremental·拉 manifest 后 N 次 fetch — 慢 (上千 HTTP 请求)·不划算

### Q3·下载并发度

- A·n=4·稳·~1MB ship 在 1 秒内 → 推荐
- B·n=1·串行·安全但慢
- C·n=8·快但易触 CF rate limit

### Q4·hardlink vs copy unchanged

- A·hardlink 优先 fallback copy — 推荐·NTFS 支持 hardlink·秒级 + 不占空间
- B·总是 copy — 简单·但每装一版多 ~400MB 占盘

### Q5·先做哪个 slice

- 顺序 S1 → S2 → S3 → S4 (S5 optional·后置)
- 或并行·S1+S2 一起 (都在 skill / build 端·我可一次写完)

---

## 5·预期效果

| Ship 类型 | 旧 | 新 |
|---|---|---|
| 几个 .js 改动 (1.2.5.3 这种) | 430 MB | **1-3 MB·~400x** |
| 加新剧本 (~10 MB) | 430 MB | **~13 MB·~33x** |
| 加新 portraits (~50 MB) | 430 MB | **~52 MB·~8x** |
| 首装 / 跳版巨大 (assets 全换) | 430 MB | **430 MB·一致** (走 zip 兜底) |

---

## 6·风险

| 风险 | 缓解 |
|---|---|
| sha-addressed dir 文件数爆 (>1M 个 small file) | 2-level sha bucket (`files/<2>/<rest>/<base>`) 平均 256 dirs·OK |
| upload-hot.py 上传时间·首次走 sha-upload 慢 | 增量·只上传新 sha (本地 cache 已有的 sha 跳)·首装上传全·之后 ship 几个文件·秒级 |
| 客户端 N 个 HTTP 请求·CF rate limit | 并发 4·CF 普通·若打 429 → 退避·失败 fallback 全 zip |
| partial install·中途断网 | atomic rename·staging 失败不影响 currentDir·已有机制 |
| sha 冲突 / 篡改 | 客户端逐文件 sha verify·mismatch reject·已有 |

---

## 7·下一步

等 user 拍板 Q1-Q5·然后启动 S1 (skill upload-hot.py 扩 sha-upload)。
