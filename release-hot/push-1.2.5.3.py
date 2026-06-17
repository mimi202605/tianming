#!/usr/bin/env python3
"""1.2.5.3 Path B GitHub push·卡顿二阶修 (defer-during-input) + 邸报 trap fix + dev workflow doc."""
import base64, json, os, subprocess, time
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("tm-save-lifecycle.js", WEB / "tm-save-lifecycle.js"),
]
HEADLINE = "1.2.5.3·卡顿二阶修·defer-during-input 叠在 A-1 之上"
BODY = (
    "60s autoSave setInterval 顶部加 defer 判断·5s 内有 keydown/pointerdown/compositionupdate/input·跳本次 tick·"
    "3 分钟兜底强存·_autoSaveDeferStreak 计数日志。配套·邸报 standalone trap 永久修 (tm-changelog.js fallback + "
    "skill upload-hot.py auto-sync)·dev workflow main.js webRootOverride。\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)


def gh_query(query, variables, retries=3):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-1253.json"
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
