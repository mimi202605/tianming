#!/usr/bin/env python3
# Push 1.3.3.2 changed web/ files to GitHub main (Path B: GraphQL createCommitOnBranch, no clone).
# Repo root = web/. Files relative to web/. Files = web changes since 1.3.3.1 ship.
import base64, json, os, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
MAX_RAW = 850 * 1024  # ~0.85MB raw/batch -> base64 ~1.1MB, small payload survives weak network

FILES = [
    "README.md",
    "changelog.json",
    "index.html",
    "scripts/verify-secondary-fallback.js",
    "tm-ai-infra.js",
    "tm-class-character-relations.js",
    "tm-endturn-ai.js",
    "tm-party-class-llm-calibrator.js",
]

def gh_query(query, variables, retries=8):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-1332.json"
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    for i in range(retries):
        try:
            r = subprocess.run(["gh", "api", "graphql", "--input", str(tmp)],
                               capture_output=True, encoding="utf-8", errors="replace", timeout=180)
            if r.returncode == 0:
                tmp.unlink(missing_ok=True); return json.loads(r.stdout)
            print(f"  [retry {i+1}/{retries}] rc={r.returncode} {(r.stderr or '')[:200]}", flush=True)
        except Exception as e:
            print(f"  [retry {i+1}/{retries}] exc {e}", flush=True)
        time.sleep(4)
    tmp.unlink(missing_ok=True); raise RuntimeError("gh api graphql failed")

# split into batches
batches = []; cur = []; cur_sz = 0
for p in FILES:
    local = WEB / p
    if not local.exists():
        print("  ! SKIP not found:", p); continue
    sz = local.stat().st_size
    if cur and cur_sz + sz > MAX_RAW:
        batches.append(cur); cur = []; cur_sz = 0
    cur.append(p); cur_sz += sz
if cur: batches.append(cur)
print(f"{sum(len(b) for b in batches)} files -> {len(batches)} batches", flush=True)

q = """query($owner:String!,$name:String!,$branch:String!){repository(owner:$owner,name:$name){ref(qualifiedName:$branch){target{... on Commit{oid}}}}}"""
r = gh_query(q, {"owner": OWNER, "name": REPO, "branch": f"refs/heads/{BRANCH}"})
oid = r["data"]["repository"]["ref"]["target"]["oid"]
print("HEAD", oid[:7], flush=True)

mut = """mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}"""
START = int(os.environ.get("PUSH_START_FROM", "1"))
last_url = ""
for i, batch in enumerate(batches, 1):
    if i < START:
        print(f"skip batch {i}", flush=True); continue
    additions = []
    for p in batch:
        data = (WEB / p).read_bytes()
        additions.append({"path": p, "contents": base64.b64encode(data).decode("ascii")})
    var = {"input": {
        "branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
        "message": {"headline": f"1.3.3.2 part {i}/{len(batches)}: 过回合卡死残留路径(calibrator) + 深推超大AI响应内存崩溃防护 + 邸报/README",
                    "body": "1.3.3.2 紧急修复补丁:\n- calibrator 关系校准逐项重建镜像补 skipMirrors(过回合卡死残留路径)\n- robustParseJSON 超大响应 OOM 护栏 + _callEndturnAI 源头封顶 + 深推子调用堆水位日志\n- 邸报 + README 版本\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},
        "fileChanges": {"additions": additions},
        "expectedHeadOid": oid,
    }}
    r = gh_query(mut, var)
    if "errors" in r:
        raise RuntimeError(f"batch {i} GraphQL errors: {json.dumps(r['errors'])[:400]}")
    c = r["data"]["createCommitOnBranch"]["commit"]
    oid = c["oid"]; last_url = c["url"]
    print(f"[OK] batch {i}/{len(batches)} ({len(batch)} files) -> {oid[:7]}", flush=True)
    time.sleep(2)
print("DONE main HEAD", oid[:7], last_url, flush=True)
