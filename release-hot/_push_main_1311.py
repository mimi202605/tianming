#!/usr/bin/env python3
# Push 1.3.1.1 变更文件到 GitHub main (Path B: GraphQL createCommitOnBranch·不 clone·repo 大 clone 不可行)
# 文件列表 = release-hot/_gh_delta_1311.txt (89 个·自 1.3.1.0 发版后改动的代码/数据·不含 assets)
import base64, json, os, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
LIST = Path("C:/Users/37814/Desktop/tianming/release-hot/_gh_delta_1311.txt")
MAX_RAW = 900 * 1024  # 0.9MB raw/batch -> base64 ~1.2MB·小 payload 抗弱网 499/EOF

def gh_query(query, variables, retries=8):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-1311.json"
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

paths = [ln.strip() for ln in LIST.read_text(encoding="utf-8").splitlines() if ln.strip()]

# 分 batch
batches = []; cur = []; cur_sz = 0
for p in paths:
    local = WEB / p
    if not local.exists():
        print("  ! SKIP not found:", p); continue
    sz = local.stat().st_size
    if cur and cur_sz + sz > MAX_RAW:
        batches.append(cur); cur = []; cur_sz = 0
    cur.append(p); cur_sz += sz
if cur: batches.append(cur)
print(f"{len([p for p in paths if (WEB/p).exists()])} files -> {len(batches)} batches", flush=True)

# HEAD oid
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
        "message": {"headline": f"release 1.3.1.1 part {i}/{len(batches)}: 人物图志御案米金重做 + 近期内部优化",
                    "body": "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},
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
