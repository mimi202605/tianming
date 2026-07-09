#!/usr/bin/env python3
"""一次性·只补 1.2.6.4 的 /files/ + /manifests/<ver>.json·跳过 zip 重传 (server zip 已就位)。
基于已修过 B2-B (chunked mkdir) 的 upload_incremental_files 逻辑·避免 ARG_MAX 限制。"""
import os, sys, time, io, json, zipfile
import paramiko

HOST = os.environ.get("TIANMING_SSH_HOST")
PORT = int(os.environ.get("TIANMING_SSH_PORT", "2222"))
USER = os.environ.get("TIANMING_SSH_USER", "root")
ZIP_LOCAL = "C:/Users/37814/Desktop/tianming/release-hot/tianming-hot-1.2.6.4.zip"
REAL = os.environ.get("TIANMING_HOT_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/hot")
FILES_REAL = REAL + "/files"
MANIFESTS_REAL = REAL + "/manifests"

pw = os.environ.get("TIANMING_SSH_PASS")
if not (HOST and pw):
    print("ERROR: TIANMING_SSH_HOST / TIANMING_SSH_PASS not set", file=sys.stderr); sys.exit(2)


def _ssh_run_blocking(c, cmd, timeout=120):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read()
    err = stderr.read()
    rc = stdout.channel.recv_exit_status()
    return rc, out, err


c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("connecting...")
c.connect(HOST, port=PORT, username=USER, password=pw, timeout=30, banner_timeout=30,
          look_for_keys=False, allow_agent=False)
print("ssh ok")

t0 = time.time()
with zipfile.ZipFile(ZIP_LOCAL) as z:
    manifest_raw = z.read('manifest.json')
    manifest = json.loads(manifest_raw.decode('utf-8'))
    files_meta = manifest.get('files') or []
    version = manifest.get('version', 'unknown')
    print(f"  manifest v{version}·{len(files_meta)} files·{sum(f.get('size',0) for f in files_meta)/1024/1024:.1f} MB raw")

    # query existing
    print(f"  scanning {FILES_REAL}/ ...")
    rc, out, _ = _ssh_run_blocking(c, f"if [ -d {FILES_REAL} ]; then find {FILES_REAL} -type f -printf '%P\\n' 2>/dev/null; fi", timeout=60)
    existing = set()
    for line in out.decode('utf-8', 'replace').splitlines():
        parts = line.strip().split('/')
        if len(parts) == 3 and len(parts[0]) == 2 and len(parts[1]) >= 60:
            existing.add(parts[0] + parts[1])
    print(f"  existing sha count: {len(existing)}")

    missing = [f for f in files_meta if (f.get('sha256') or '').lower() not in existing]
    print(f"  to upload: {len(missing)} files ({sum(f.get('size',0) for f in missing)/1024/1024:.2f} MB)")

    if missing:
        # B2-B·chunked mkdir·avoid ARG_MAX
        prefixes = sorted({m['sha256'][:2] + '/' + m['sha256'][2:] for m in missing})
        print(f"  mkdir {len(prefixes)} sha-prefix dirs (chunked, blocking)...")
        t_mk = time.time()
        rc, _, err = _ssh_run_blocking(c, f"mkdir -p {FILES_REAL}", timeout=30)
        if rc != 0:
            raise RuntimeError(f"mkdir FILES_REAL failed rc={rc}·{err.decode('utf-8','replace')[:200]}")
        BATCH = 200
        for i in range(0, len(prefixes), BATCH):
            chunk = prefixes[i:i+BATCH]
            args = " ".join(f"{FILES_REAL}/{p}" for p in chunk)
            rc, _, err = _ssh_run_blocking(c, f"mkdir -p {args}", timeout=120)
            if rc != 0:
                raise RuntimeError(f"mkdir batch {i//BATCH+1} failed rc={rc}·{err.decode('utf-8','replace')[:200]}")
        print(f"  mkdir done {time.time()-t_mk:.1f}s")

        # per-file SFTP put
        sftp = c.open_sftp()
        done = 0; done_bytes = 0
        last_report = time.time()
        failed = 0
        for m in missing:
            sha = m['sha256']
            base = os.path.basename(m['path'])
            remote_path = f"{FILES_REAL}/{sha[:2]}/{sha[2:]}/{base}"
            data = z.read(m['path'])
            with io.BytesIO(data) as bio:
                try:
                    sftp.putfo(bio, remote_path)
                except Exception as e_one:
                    print(f"    [WARN] {m['path']}: {e_one}", file=sys.stderr)
                    failed += 1
                    continue
            done += 1
            done_bytes += len(data)
            if time.time() - last_report > 5 or done == len(missing):
                print(f"    [{done}/{len(missing)}] {done_bytes/1024/1024:.2f} MB·{failed} failed")
                last_report = time.time()
        sftp.close()

    # manifest
    rc, _, err = _ssh_run_blocking(c, f"mkdir -p {MANIFESTS_REAL}", timeout=60)
    sftp = c.open_sftp()
    manifest_remote = f"{MANIFESTS_REAL}/{version}.json"
    manifest_tmp = f"/tmp/manifest-{version}.json.tmp"
    sftp.putfo(io.BytesIO(manifest_raw), manifest_tmp)
    sftp.close()
    rc, _, err = _ssh_run_blocking(c, f"mv {manifest_tmp} {manifest_remote} && chmod 644 {manifest_remote}", timeout=60)
    if rc != 0:
        print(f"  [WARN] manifest mv failed rc={rc}·{err.decode('utf-8','replace')[:200]}", file=sys.stderr)
    print(f"  manifest at {manifest_remote}")

c.close()
print(f"\ndone·{time.time()-t0:.1f}s")
