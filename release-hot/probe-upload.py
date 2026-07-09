#!/usr/bin/env python3
"""探测服务器·确认 1.2.8.5 zip 是否在 SFTP 上行（看 .tmp 半成品大小）"""
import paramiko, os, sys
host = os.environ.get('TIANMING_SSH_HOST'); port = int(os.environ.get('TIANMING_SSH_PORT', '2222')); user = os.environ.get('TIANMING_SSH_USER', 'root'); pw = os.environ.get('TIANMING_SSH_PASS')
if not (host and pw):
    print('NO TIANMING_SSH_HOST / TIANMING_SSH_PASS env'); sys.exit(1)
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    c.connect(host, port=port, username=user, password=pw, timeout=25)
    print('CONNECTED', host, port)
    serve = os.environ.get('TIANMING_HOT_DIR', '/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming/hot')
    for d in [serve, '/tmp']:
        cmd = 'ls -la ' + d + '/ 2>/dev/null | grep -iE "1\\.2\\.8\\.5|\\.tmp" || echo "(none matching in ' + d + ')"'
        _in, out, _err = c.exec_command(cmd)
        print('== ' + d + ' =='); print(out.read().decode('utf-8', 'replace').strip())
    c.close()
    print('DONE')
except Exception as e:
    print('PROBE FAIL:', type(e).__name__, str(e)[:200])
