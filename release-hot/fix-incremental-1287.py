# -*- coding: utf-8 -*-
import os, sys, paramiko
HOST = os.environ.get("TIANMING_SSH_HOST"); PORT = int(os.environ.get("TIANMING_SSH_PORT", "2222")); USER = os.environ.get("TIANMING_SSH_USER", "root")
HOT = os.environ.get("TIANMING_HOT_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/hot")
PW = os.environ.get("TIANMING_SSH_PASS")
if not (HOST and PW):
    sys.exit("ERROR: 环境变量 TIANMING_SSH_HOST / TIANMING_SSH_PASS 未设（PowerShell: $env:TIANMING_SSH_HOST='...'; $env:TIANMING_SSH_PASS='...'）")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PW,
          timeout=60, banner_timeout=60, auth_timeout=60, look_for_keys=False, allow_agent=False)

server_script = r'''
set -e
python3 << 'PYEOF'
import json, os, zipfile, time
HOT = "%s"
ZIP = HOT + "/tianming-hot-1.2.8.7.zip"
FILES = HOT + "/files"
MANIFESTS = HOT + "/manifests"
t0 = time.time()
with zipfile.ZipFile(ZIP) as z:
    mb = z.read('manifest.json')
    m = json.loads(mb.decode('utf-8'))
    moved = skipped = missing = 0
    for f in m['files']:
        sha = f['sha256']; rel = f['path']
        dd = "%%s/%%s/%%s" %% (FILES, sha[:2], sha[2:])
        dst = "%%s/%%s" %% (dd, os.path.basename(rel))
        if os.path.exists(dst):
            skipped += 1; continue
        try:
            data = z.read(rel)
        except KeyError:
            missing += 1; continue
        os.makedirs(dd, exist_ok=True)
        tmp = dst + ".tmp"
        with open(tmp, 'wb') as fh: fh.write(data)
        os.replace(tmp, dst); moved += 1
    os.makedirs(MANIFESTS, exist_ok=True)
    mp = "%%s/%%s.json" %% (MANIFESTS, m.get('version', 'unknown'))
    with open(mp + ".tmp", 'wb') as fh: fh.write(mb)
    os.replace(mp + ".tmp", mp); os.chmod(mp, 0o644)
    print("version=%%s moved=%%d skipped=%%d missing=%%d (%%0.1fs)" %% (m.get('version'), moved, skipped, missing, time.time() - t0))
    print("manifest:", mp, os.path.getsize(mp), "bytes")
PYEOF
echo "--- ls manifest ---"
ls -la %s/manifests/1.2.8.7.json
echo "files_count=$(find %s/files -type f | wc -l)"
''' % (HOT, HOT, HOT)

i, o, e = c.exec_command(server_script, timeout=300)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace').strip()
if err: print("[stderr]", err[:600])
c.close()
print("DONE")
