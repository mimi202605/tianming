#!/usr/bin/env python3
"""1.2.6.3 GitHub push·B1 + B2 critical bug fix."""
import base64, json, os, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

FILES = [
    ("changelog.json", WEB / "changelog.json"),
]
HEADLINE = "1.2.6.3·B1+B2 critical fix·hot-update-reload 完整重启 + 上传 mkdir race"
BODY = (
    "B1·main-impl.js hot-update-reload 改 app.relaunch + app.exit(0)·main+preload 也热更后必须重启 app·loadFile 不够。\n"
    "B2·skill upload-hot.py exec_command + sleep(0.5) race·改 _ssh_run_blocking·实测 1.2.6.1/2 server /files/ 全空。\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)


def gh_query(query, variables, retries=3):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-1263.json"
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    for i in range(retries):
        try:
            r = subprocess.run(["gh", "api", "graphql", "--input", str(tmp)],
                capture_output=True, encoding="utf-8", errors="replace", timeout=120)
            if r.returncode == 0:
                tmp.unlink(missing_ok=True)
                return json.loads(r.stdout)
            print(f"  [retry {i+1}/{retries}] rc={r.returncode}", flush=True)
        except Exception as e:
            print(f"  [retry {i+1}/{retries}] exc·{e}", flush=True)
        time.sleep(3)
    tmp.unlink(missing_ok=True)
    raise RuntimeError("gh api graphql failed")


def main():
    q = """query($owner:String!,$name:String!,$branch:String!){
      repository(owner:$owner,name:$name){ref(qualifiedName:$branch){target{... on Commit{oid}}}}}"""
    r = gh_query(q, {"owner": OWNER, "name": REPO, "branch": f"refs/heads/{BRANCH}"})
    head = r["data"]["repository"]["ref"]["target"]["oid"]
    print(f"HEAD = {head[:7]}")

    additions = []
    total = 0
    for repo_path, local in FILES:
        if not local.exists():
            print(f"  ! SKIP·{repo_path} not found")
            continue
        data = local.read_bytes()
        additions.append({"path": repo_path, "contents": base64.b64encode(data).decode("ascii")})
        total += len(data)
        print(f"  + {repo_path} ({len(data)/1024:.1f} KB)")
    print(f"total raw {total/1024:.1f} KB")

    mut = """mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}"""
    var = {"input": {
        "branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
        "message": {"headline": HEADLINE, "body": BODY},
        "fileChanges": {"additions": additions},
        "expectedHeadOid": head,
    }}
    r = gh_query(mut, var)
    if "errors" in r:
        raise RuntimeError(f"GraphQL errors: {json.dumps(r['errors'])[:500]}")
    new = r["data"]["createCommitOnBranch"]["commit"]
    print(f"[OK] {new['oid'][:7]}·{new['url']}")


if __name__ == "__main__":
    main()
