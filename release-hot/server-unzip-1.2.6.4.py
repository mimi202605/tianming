#!/usr/bin/env python3
"""Server-side·SSH 命令 unzip 1.2.6.4 zip + mv 到 sha-addressed /files/·5-30 秒 vs SFTP 70 分钟。
zip 已在 server 上·只走 server CPU + disk·避免 SFTP 上行带宽瓶颈。"""
import os, sys, time
import paramiko

HOST = os.environ.get("TIANMING_SSH_HOST"); PORT = int(os.environ.get("TIANMING_SSH_PORT", "2222")); USER = os.environ.get("TIANMING_SSH_USER", "root")
REAL = os.environ.get("TIANMING_HOT_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/hot")
VER = "1.2.6.4"
ZIP = f"{REAL}/tianming-hot-{VER}.zip"
FILES = f"{REAL}/files"
MANIFESTS = f"{REAL}/manifests"
TMPDIR = f"/tmp/tm-extract-{VER}"

pw = os.environ.get("TIANMING_SSH_PASS")
if not (HOST and pw): print("ERROR: TIANMING_SSH_HOST / TIANMING_SSH_PASS not set", file=sys.stderr); sys.exit(2)

# 单一 server-side script·python3 必装 (1Panel 标配)
SERVER_CMD = f'''
set -e
rm -rf {TMPDIR}
mkdir -p {TMPDIR} {FILES} {MANIFESTS}
cd {TMPDIR}
echo "=== python3 zipfile extract + mv {ZIP} ==="
time python3 << 'PYEOF'
import json, os, shutil, zipfile, time
ZIP = "{ZIP}"
FILES = "{FILES}"
MANIFESTS = "{MANIFESTS}"
VER = "{VER}"
t0 = time.time()
with zipfile.ZipFile(ZIP) as z:
    manifest_bytes = z.read('manifest.json')
    m = json.loads(manifest_bytes.decode('utf-8'))
    moved = skipped = missing = 0
    for f in m['files']:
        sha = f['sha256']
        rel = f['path']
        dst_dir = f"{{FILES}}/{{sha[:2]}}/{{sha[2:]}}"
        base = os.path.basename(rel)
        dst = f"{{dst_dir}}/{{base}}"
        if os.path.exists(dst):
            skipped += 1
            continue
        try:
            data = z.read(rel)
        except KeyError:
            missing += 1
            continue
        os.makedirs(dst_dir, exist_ok=True)
        # atomic·写 tmp + rename
        tmp = dst + ".tmp." + str(os.getpid())
        with open(tmp, 'wb') as fh:
            fh.write(data)
        os.replace(tmp, dst)
        moved += 1
        if moved % 100 == 0:
            print(f"  ... moved {{moved}} so far ({{time.time()-t0:.1f}}s)", flush=True)
    # manifest copy
    mp = f"{{MANIFESTS}}/{{VER}}.json"
    with open(mp+'.tmp', 'wb') as fh:
        fh.write(manifest_bytes)
    os.replace(mp+'.tmp', mp)
    os.chmod(mp, 0o644)
    print(f"moved {{moved}} skipped {{skipped}} missing {{missing}}·manifest at {{mp}}")
PYEOF
echo "=== verify ==="
echo "files count: $(find {FILES} -type f | wc -l)"
ls -la {MANIFESTS}/{VER}.json
echo "=== cleanup ==="
cd /
rm -rf {TMPDIR}
echo "=== done ==="
'''

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("connecting...")
c.connect(HOST, port=PORT, username=USER, password=pw, timeout=30, banner_timeout=30,
          look_for_keys=False, allow_agent=False)
print("ssh ok·running server-side script...")
t0 = time.time()
stdin, stdout, stderr = c.exec_command(SERVER_CMD, timeout=600)
# stream output as it comes
import select
while not stdout.channel.exit_status_ready():
    if stdout.channel.recv_ready():
        d = stdout.channel.recv(4096).decode('utf-8','replace')
        if d: print(d, end='', flush=True)
    if stdout.channel.recv_stderr_ready():
        d = stdout.channel.recv_stderr(4096).decode('utf-8','replace')
        if d: print(d, end='', flush=True, file=sys.stderr)
    time.sleep(0.1)
# drain remaining
remaining = stdout.read().decode('utf-8','replace')
if remaining: print(remaining, end='', flush=True)
rem_err = stderr.read().decode('utf-8','replace')
if rem_err: print(rem_err, end='', flush=True, file=sys.stderr)
rc = stdout.channel.recv_exit_status()
c.close()
print(f"\n[done] rc={rc}·{time.time()-t0:.1f}s")
