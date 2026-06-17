#!/usr/bin/env python3
"""1.2.6.1 GitHub push·incremental hot update + main.js 可热更新。
注·main.js/main-impl.js/package.json 不在 GitHub repo (repo root = web/)·不 push。"""
import base64, json, os, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("tools/build-hot-update-package.js", WEB / "tools" / "build-hot-update-package.js"),
    ("docs/incremental-hot-update-sprint.md", WEB / "docs" / "incremental-hot-update-sprint.md"),
]
HEADLINE = "1.2.6.0/1.2.6.1·incremental hot update + main.js 可热更新"
BODY = (
    "解 'ship 1 文件改动也得拉 430MB 全包' 痛点·~100-400x 节省。\n"
    "- Server: upload-hot.py (skill·不在 repo) 加 sha-content-addressable files/ + per-version manifests/\n"
    "- Client: main.js (installer·不在 repo) 加 incremental install path·diff + per-file fetch + hardlink unchanged\n"
    "- Build: tools/build-hot-update-package.js·hot-latest.json 加 manifestUrl + filesBaseUrl·把 main-impl.js 打成 _app_main.js\n"
    "- Main hot: main.js 拆 shim + main-impl.js (installer·不在 repo)·shim prefer hot dir _app_main.js·fallback bundled\n"
    "- Installer 1.2.6.0 重打到 E:\\版本\\1.2.6.0·一次性 onboarding·此后 main 改动全走 hot\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)


def gh_query(query, variables, retries=3):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-1261.json"
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    for i in range(retries):
        try:
            r = subprocess.run(
                ["gh", "api", "graphql", "--input", str(tmp)],
                capture_output=True, encoding="utf-8", errors="replace", timeout=120
            )
            if r.returncode == 0:
                tmp.unlink(missing_ok=True)
                return json.loads(r.stdout)
            print(f"  [retry {i+1}/{retries}] rc={r.returncode}·{r.stderr[:200]}", flush=True)
        except Exception as e:
            print(f"  [retry {i+1}/{retries}] exc·{e}", flush=True)
        time.sleep(3)
    tmp.unlink(missing_ok=True)
    raise RuntimeError("gh api graphql failed after retries")


def main():
    q = """query($owner:String!,$name:String!,$branch:String!){
      repository(owner:$owner,name:$name){
        ref(qualifiedName:$branch){ target{ ... on Commit { oid } } }
      }}"""
    r = gh_query(q, {"owner": OWNER, "name": REPO, "branch": f"refs/heads/{BRANCH}"})
    head = r["data"]["repository"]["ref"]["target"]["oid"]
    print(f"HEAD = {head[:7]}", flush=True)

    additions = []
    total = 0
    for repo_path, local in FILES:
        if not local.exists():
            print(f"  ! SKIP·{repo_path} ({local}) not found", flush=True)
            continue
        data = local.read_bytes()
        additions.append({"path": repo_path, "contents": base64.b64encode(data).decode("ascii")})
        total += len(data)
        print(f"  + {repo_path} ({len(data)/1024:.1f} KB)", flush=True)
    print(f"total raw {total/1024:.1f} KB", flush=True)

    mut = """mutation($input:CreateCommitOnBranchInput!){
      createCommitOnBranch(input:$input){ commit{ oid url } }
    }"""
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
    print(f"[OK] {new['oid'][:7]}·{new['url']}", flush=True)


if __name__ == "__main__":
    main()
