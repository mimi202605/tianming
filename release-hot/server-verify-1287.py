# -*- coding: utf-8 -*-
import os, sys, paramiko
HOST = os.environ.get("TIANMING_SSH_HOST"); PORT = int(os.environ.get("TIANMING_SSH_PORT", "2222")); USER = os.environ.get("TIANMING_SSH_USER", "root")
HOT = os.environ.get("TIANMING_HOT_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/hot")
PARENT = os.environ.get("TIANMING_SERVE_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming")
LOCAL_SHA = "3a844fbf14a18db33b957f82a2bbefb28f77c357dcd2e3bf0cad6936fabcc77d"
PW = os.environ.get("TIANMING_SSH_PASS")
if not (HOST and PW):
    sys.exit("ERROR: 环境变量 TIANMING_SSH_HOST / TIANMING_SSH_PASS 未设（PowerShell: $env:TIANMING_SSH_HOST='...'; $env:TIANMING_SSH_PASS='...'）")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PW,
          timeout=60, banner_timeout=60, auth_timeout=60, look_for_keys=False, allow_agent=False)

def run(cmd, t=180):
    i, o, e = c.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8','replace') + (("\n[stderr]"+e.read().decode('utf-8','replace')) if False else "")

print("=== server-side sha256 of in-place zip (takes a few s) ===")
print(run("sha256sum %s/tianming-hot-1.2.8.7.zip" % HOT))
print("local sha =", LOCAL_SHA)
print("=== server hot-latest.json ===")
print(run("cat %s/hot-latest.json" % HOT))
print("=== manifest + files store for 1.2.8.7 ===")
print(run("ls -la %s/manifests/1.2.8.7.json 2>/dev/null; echo files_count=$(find %s/files -type f 2>/dev/null | wc -l)" % (HOT, HOT)))
print("=== standalone changelog top (邸报) ===")
print(run("head -c 240 %s/changelog.json" % PARENT))
c.close()
print("DONE")
