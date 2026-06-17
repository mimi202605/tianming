#!/usr/bin/env python3
"""Push tm-changelog.js fallback fix via Path B GraphQL·1 batch."""
import base64, json, os, subprocess, time
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

FILES = [
    ("tm-changelog.js", WEB / "tm-changelog.js"),
]
HEADLINE = "tm-changelog.js·_load() 改取 entries 多·解 standalone changelog stale 单点依赖"
BODY = (
    "改 _load() Promise.all 的 then·从 'remote-first·fallback only on error' 改成 "
    "'两边都拿·取 entries 多的那份'·避免 server 端 /tianming/changelog.json 漏同步时玩家永远看旧。\n\n"
    "配套·skill upload-hot.py 已加 web/changelog.json auto-detect 同步到 /tianming/changelog.json·\n"
    "下次任何 hot ship 走 upload-hot.py 即自动同步邸报 standalone 文件。\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)


def gh_query(query, variables, retries=3):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-cl.json"
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
