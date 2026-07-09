#!/usr/bin/env python3
"""仅同步 standalone web/changelog.json -> server /tianming/changelog.json·补救 stale。
密码走 env TIANMING_SSH_PASS·不入脚本。"""
import os, sys, time, hashlib
import paramiko

HOST = os.environ.get("TIANMING_SSH_HOST")
PORT = int(os.environ.get("TIANMING_SSH_PORT", "2222"))
USER = os.environ.get("TIANMING_SSH_USER", "root")
LOCAL = "C:/Users/37814/Desktop/tianming/web/changelog.json"
SERVE = os.environ.get("TIANMING_SERVE_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming")
REMOTE = SERVE + "/changelog.json"

pw = os.environ.get("TIANMING_SSH_PASS")
if not (HOST and pw):
    print("ERROR: TIANMING_SSH_HOST / TIANMING_SSH_PASS not set", file=sys.stderr); sys.exit(2)

size = os.path.getsize(LOCAL)
sha = hashlib.sha256(open(LOCAL, "rb").read()).hexdigest()
print(f"local: {LOCAL}  size={size:,}  sha={sha[:16]}...")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("connecting...")
c.connect(HOST, port=PORT, username=USER, password=pw, timeout=30, banner_timeout=30,
          look_for_keys=False, allow_agent=False)
print("ssh ok")

ts = time.strftime("%Y%m%d-%H%M%S")
sftp = c.open_sftp()
tmp = "/tmp/changelog.json.tmp"
print(f"sftp put -> {tmp}")
sftp.put(LOCAL, tmp)
sftp.close()

script = f"""
set -e
echo '--- backup live ---'
[ -f {REMOTE} ] && cp {REMOTE} {REMOTE}.bak-{ts} || echo 'no live yet'
echo '--- atomic mv ---'
mv {tmp} {REMOTE}
chmod 644 {REMOTE}
echo '--- head ---'
head -c 400 {REMOTE}; echo
echo '--- size ---'
wc -c {REMOTE}
"""
_, o, e = c.exec_command(script, timeout=60)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace").strip()
if err: print("[stderr]", err, file=sys.stderr)
c.close()
print("done")
