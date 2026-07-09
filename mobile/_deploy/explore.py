#!/usr/bin/env python3
# 探服务器·为 Capgo 热更部署做准备（只读 + 一个临时 POST 测试文件，用完即删）
import os, sys, time, paramiko

HOST = os.environ.get("TIANMING_SSH_HOST"); PORT = int(os.environ.get("TIANMING_SSH_PORT", "2222")); USER = os.environ.get("TIANMING_SSH_USER", "root")
PW = os.environ.get("TIANMING_SSH_PASS")
if not (HOST and PW):
    print("ERROR: TIANMING_SSH_HOST / TIANMING_SSH_PASS 未设"); sys.exit(1)

TM = os.environ.get("TIANMING_SERVE_DIR", "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
# 服务器有 SSH 防爆破/过载·banner EOF 时重试 + 指数退避（同 upload-hot.py）
last = None
for attempt in range(1, 7):
    try:
        print(f"connecting ({attempt}/6)...", flush=True)
        c.connect(HOST, port=PORT, username=USER, password=PW, timeout=90,
                  banner_timeout=90, auth_timeout=90, look_for_keys=False, allow_agent=False)
        try: c.get_transport().set_keepalive(30)
        except Exception: pass
        print("ssh ok\n", flush=True); break
    except Exception as ex:
        last = ex; print(f"  failed: {type(ex).__name__}: {ex}", flush=True)
        if attempt < 6:
            w = min(12 * attempt, 50); print(f"  retry in {w}s...", flush=True); time.sleep(w)
else:
    print(f"SSH 连接 6 次都失败: {last}"); sys.exit(2)

def run(cmd, t=60):
    _in, out, err = c.exec_command(cmd, timeout=t)
    o = out.read().decode("utf-8", "replace"); e = err.read().decode("utf-8", "replace")
    return o, e

script = f"""
echo '=== python3 ==='; which python3 && python3 --version
echo '=== tianming serve dir ==='; ls -la {TM}/ | head -30
echo '=== capgo dir 存在? ==='; ls -la {TM}/capgo/ 2>/dev/null || echo '(无 capgo/·需新建)'
echo '=== POST-to-static 测试 ==='
mkdir -p {TM}/capgo
echo '{{"_posttest":1}}' > {TM}/capgo/_posttest.json
echo -n 'POST http_code: '; curl -s -o /dev/null -w '%{{http_code}}' -X POST https://api.themisfitserspeople.top/tianming/capgo/_posttest.json; echo
echo -n 'GET  http_code: '; curl -s -o /dev/null -w '%{{http_code}}' https://api.themisfitserspeople.top/tianming/capgo/_posttest.json; echo
rm -f {TM}/capgo/_posttest.json
echo '=== /hot/ 现有结构(参考·确认增量库) ==='; ls {TM}/hot/ 2>/dev/null | head
echo '=== 现有文件 owner/perm(部署要对齐) ==='; ls -la {TM}/hot/hot-latest.json 2>/dev/null
"""
o, e = run(script, t=120)
print(o)
if e.strip(): print("[stderr]", e[:600])
c.close()
