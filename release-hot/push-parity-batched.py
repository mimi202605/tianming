"""Full source-parity sync to GitHub·batched GraphQL createCommitOnBranch.
Reads release-hot/_push-list.json (from _diff-full.py)·pushes all changed+new source files
in <=3MB raw batches·refetches HEAD oid before each batch. PYTHONIOENCODING=utf-8 recommended."""
import base64, json, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
BATCH_RAW_LIMIT = 3 * 1024 * 1024  # 3MB raw per batch (base64 ~4MB·well under 10MB GraphQL cap)

push_list = json.loads(Path("C:/Users/37814/Desktop/tianming/release-hot/_push-list.json").read_text(encoding="utf-8"))["files"]

# build batches by cumulative raw size
batches, cur, cur_sz = [], [], 0
for rel in push_list:
    sz = (WEB / rel).stat().st_size
    if cur and cur_sz + sz > BATCH_RAW_LIMIT:
        batches.append(cur); cur, cur_sz = [], 0
    cur.append(rel); cur_sz += sz
if cur:
    batches.append(cur)
M = len(batches)
print(f"[plan] {len(push_list)} files -> {M} batches")

def gh_api(args, stdin_path=None):
    cmd = ["gh", "api"] + args
    if stdin_path:
        with open(stdin_path, "rb") as f:
            r = subprocess.run(cmd, capture_output=True, input=f.read())
            return r.returncode, r.stdout.decode("utf-8", "replace"), r.stderr.decode("utf-8", "replace")
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, r.stdout, r.stderr

import os
START = int(os.environ.get("PUSH_START_FROM", "1"))
mutation = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid url } } }"

for i, batch in enumerate(batches, 1):
    if i < START:
        print(f"[skip] batch {i}/{M}"); continue
    rc, out, err = gh_api(["-X", "GET", f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", "--jq", ".object.sha"])
    if rc != 0:
        raise SystemExit(f"batch {i}: get sha fail " + err[:200])
    head = out.strip()
    additions, raw = [], 0
    for rel in batch:
        b = (WEB / rel).read_bytes(); raw += len(b)
        additions.append({"path": rel, "contents": base64.b64encode(b).decode("ascii")})
    msg = f"src parity sync part {i}/{M}·补齐 GitHub 历史漂移(跨 1.2.7.x~1.2.8.4·{len(batch)} files)"
    payload = {"query": mutation, "variables": {"input": {
        "branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
        "message": {"headline": msg,
                    "body": "全量源码对齐·历代每版只推头牌文件累积漂移·本次补齐(排除 preview/vendor-models/.bak dev 产物)。\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},
        "fileChanges": {"additions": additions},
        "expectedHeadOid": head}}}
    tmp = Path(f"C:/Users/37814/Desktop/_parity-batch-{i}.json")
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    rc, out, err = gh_api(["graphql", "--input", str(tmp)], stdin_path=str(tmp))
    try: tmp.unlink()
    except Exception: pass
    if rc != 0:
        print("STDERR:", err[:500]); raise SystemExit(f"batch {i} push fail (rerun with PUSH_START_FROM={i})")
    d = json.loads(out)
    if d.get("errors"):
        print("GraphQL errors:", json.dumps(d["errors"])[:500]); raise SystemExit(f"batch {i} graphql err (rerun PUSH_START_FROM={i})")
    oid = d["data"]["createCommitOnBranch"]["commit"]["oid"]
    print(f"[OK] batch {i}/{M}·{len(batch)} files·{raw/1024/1024:.2f}MB·{oid[:7]}")
    time.sleep(2)

print("[DONE] parity sync complete")
