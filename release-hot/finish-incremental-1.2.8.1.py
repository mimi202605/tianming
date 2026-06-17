"""补跑 1.2.8.1 server-side 增量解包（zip 已在服务器·不重传）。
主 upload 已完成 zip+json+changelog 原子 mv·只因 Windows GBK print 崩在增量前一步。
设 PYTHONIOENCODING=utf-8 跑·复用 upload-hot.py 的 upload_incremental_files。"""
import importlib.util, os, sys

SKILL = r"C:\Users\37814\.claude\skills\tianming-hotupdate-push\scripts\upload-hot.py"
ZIP = r"C:\Users\37814\Desktop\tianming\release-hot\tianming-hot-1.2.8.1.zip"
HOST, PORT, USER = "64.83.47.115", 2222, "root"

spec = importlib.util.spec_from_file_location("upload_hot", SKILL)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

import paramiko
pw = os.environ.get("TIANMING_SSH_PASS")
if not pw:
    print("ERROR: TIANMING_SSH_PASS not set", file=sys.stderr); sys.exit(1)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=pw, timeout=30)
print("[ssh] connected", HOST, PORT)
try:
    mod.upload_incremental_files(c, ZIP)
    print("[OK] incremental done")
finally:
    c.close()
