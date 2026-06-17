#!/usr/bin/env python3
"""Audit the server's sha-addressed /files/ store against the 1.2.9.2 manifest.
Reports entries whose STORED content sha != the path's sha (corruption), and missing entries.
Read-only. Run on the server (1Panel VNC):
  curl -sL https://github.com/misfit-user/tianming/releases/download/hot-1.2.9.2/audit-1292.py -o /tmp/audit.py
  python3 /tmp/audit.py
Output (paste back to Claude): the BAD/MISSING lines.
"""
import json, os, hashlib

BASE = "/opt/1panel/apps/openresty/openresty/www/sites/api.themisfitserspeople.top/index/tianming"
REAL = BASE + "/hot"
FILES = REAL + "/files"
MANIFESTS = REAL + "/manifests"
VER = "1.2.9.2"

m = json.load(open(f"{MANIFESTS}/{VER}.json", encoding="utf-8"))
def shapath(sha, base): return f"{FILES}/{sha[:2]}/{sha[2:]}/{base}"

corrupt = []; missing = []; ok = 0
for f in m["files"]:
    sha = f["sha256"]; base = os.path.basename(f["path"])
    p = shapath(sha, base)
    if not os.path.exists(p):
        missing.append(f["path"]); continue
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if h != sha:
        corrupt.append((f["path"], sha, h, f["size"], os.path.getsize(p)))
    else:
        ok += 1

print(f"=== AUDIT 1.2.9.2 /files/ store ===")
print(f"manifest files: {len(m['files'])} | OK: {ok} | MISSING: {len(missing)} | CORRUPT: {len(corrupt)}")
print("--- MISSING (in manifest, not in /files/) ---")
for x in missing[:40]: print("  MISS", x)
if len(missing) > 40: print(f"  ... +{len(missing)-40} more")
print("--- CORRUPT (stored content sha != path sha) ---")
for path, exp, got, esz, gsz in corrupt[:60]:
    print(f"  BAD {path}  expect={exp[:12]} got={got[:12]}  esize={esz} gsize={gsz}")
if len(corrupt) > 60: print(f"  ... +{len(corrupt)-60} more")
# machine-readable list for Claude to build the fix
print("--- CORRUPT_PATHS_JSON ---")
print(json.dumps([c[0] for c in corrupt] + ["__MISSING__"] + missing, ensure_ascii=False))
