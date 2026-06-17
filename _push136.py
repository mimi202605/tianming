#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""1.3.3.6 GitHub Path B source sync — auto-batch from git diff (repo root = web/).
Pushes changed code files (vs origin/main) via GraphQL createCommitOnBranch.
Excludes godot/, dev-tools/, >2MB binaries. Resume: PUSH_START_FROM=N python _push136.py
"""
import base64, json, os, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
MAX_BATCH = 4 * 1024 * 1024
MAX_FILE = 2 * 1024 * 1024
EXCLUDE = ("godot/", "dev-tools/", "node_modules/", "backups/", "_screenshots/",
           ".playwright-cli/", "test-results/", ".git/")
START_FROM = int(os.environ.get("PUSH_START_FROM", "1"))

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, encoding='utf-8', errors='replace')
    return r.returncode, r.stdout, r.stderr

def gh_api(args):
    r = subprocess.run(["gh", "api"] + args, capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    return r.returncode, r.stdout, r.stderr

def get_main_sha():
    for attempt in range(5):
        rc, out, err = gh_api(["-X", "GET", f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", "--jq", ".object.sha"])
        if rc == 0 and out.strip():
            return out.strip()
        print(f"    [retry get_main_sha {attempt+1}/5] {err[:100]}")
        time.sleep(3)
    raise RuntimeError("get sha fail after retries")

# ── compute changed files (exist in HEAD, differ from origin/main) ──
rc, out, err = run(["git", "-C", str(WEB), "-c", "core.quotepath=false", "diff",
                    "--diff-filter=d", "--name-only", "origin/main", "HEAD"])
if rc != 0:
    raise SystemExit("git diff fail: " + err)
allfiles = [l.strip() for l in out.splitlines() if l.strip()]
files, skipped_big = [], 0
for f in allfiles:
    if any(f.startswith(p) for p in EXCLUDE):
        continue
    lp = WEB / f
    try:
        if not lp.exists():
            continue
        if lp.stat().st_size > MAX_FILE:
            skipped_big += 1
            continue
    except Exception:
        continue
    files.append(f)
print(f"[plan] diff={len(allfiles)} -> push={len(files)} (skipped_big={skipped_big})")

# ── batch ≤4MB raw ──
batches, cur, cursz = [], [], 0
for f in files:
    sz = (WEB / f).stat().st_size
    if cur and cursz + sz > MAX_BATCH:
        batches.append(cur); cur, cursz = [], 0
    cur.append(f); cursz += sz
if cur:
    batches.append(cur)
M = len(batches)
print(f"[plan] {M} batches")

def push_batch(bf, idx):
    additions, raw = [], 0
    for f in bf:
        c = (WEB / f).read_bytes(); raw += len(c)
        additions.append({"path": f, "contents": base64.b64encode(c).decode('ascii')})
    print(f"[batch {idx}/{M}] {len(additions)} files raw {raw/1024/1024:.2f}MB")
    mutation = 'mutation($input: CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}'
    tmp = Path(f"C:/Users/37814/Desktop/_push136-{idx}.json")
    for attempt in range(6):
        try:
            head = get_main_sha()
        except Exception as e:
            print(f"  [retry head {attempt+1}/6] {e}"); time.sleep(4); continue
        inp = {"branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
               "message": {"headline": f"1.3.3.6 source sync {idx}/{M} ({len(additions)} files)",
                           "body": "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},
               "fileChanges": {"additions": additions}, "expectedHeadOid": head}
        tmp.write_text(json.dumps({"query": mutation, "variables": {"input": inp}}), encoding='utf-8')
        rc, out, err = gh_api(["graphql", "--input", str(tmp)])
        if rc != 0:
            print(f"  [retry push {attempt+1}/6] rc={rc} {err[:120]}"); time.sleep(4); continue
        try:
            d = json.loads(out)
            node = d.get("data", {}).get("createCommitOnBranch")
            if node:
                print("  [OK]", node["commit"]["oid"][:7])
                try: tmp.unlink()
                except Exception: pass
                return True
            print(f"  [retry push {attempt+1}/6] graphql errors: {json.dumps(d.get('errors'))[:200]}"); time.sleep(4); continue
        except Exception as e:
            print(f"  [retry push {attempt+1}/6] parse fail {e} | {out[:160]}"); time.sleep(4); continue
    return False

print(f"[push136] {OWNER}/{REPO} branch={BRANCH} {M} batches START_FROM={START_FROM}")
for idx, b in enumerate(batches, 1):
    if idx < START_FROM:
        print("[skip]", idx); continue
    if not push_batch(b, idx):
        print(f"[STOP at {idx}] resume: PUSH_START_FROM={idx} python _push136.py"); raise SystemExit(1)
    time.sleep(2)
print("[done] all batches pushed")
