# -*- coding: utf-8 -*-
import os, sys, paramiko
HOT = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/hot"
PARENT = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
PW = os.environ.get("TIANMING_SSH_PASS")
if not PW:
    sys.exit("ERROR: 环境变量 TIANMING_SSH_PASS 未设（PowerShell: $env:TIANMING_SSH_PASS='...'）")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("64.83.47.115", port=2222, username="root", password=PW,
          timeout=60, banner_timeout=60, auth_timeout=60, look_for_keys=False, allow_agent=False)

def run(cmd):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    return out + (("\n[stderr] " + err) if err.strip() else "")

print("=== df -h (overall) ===")
print(run("df -h"))
print("=== hot dir zips (ls -lah) ===")
print(run("ls -lah %s/ | grep -E 'tianming-hot|hot-latest' " % HOT))
print("=== hot dir total + files store + manifests ===")
print(run("du -sh %s %s/files %s/manifests 2>/dev/null" % (HOT, HOT, HOT)))
print("=== /tmp leftovers + size ===")
print(run("ls -lah /tmp/*.tmp 2>/dev/null; echo '---'; du -sh /tmp 2>/dev/null"))
print("=== hot-latest.json.bak count ===")
print(run("ls %s/hot-latest.json.bak-* 2>/dev/null | wc -l; ls %s/changelog.json.bak-* 2>/dev/null | wc -l" % (HOT, PARENT)))
c.close()
print("DONE")
