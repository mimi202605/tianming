#!/usr/bin/env python3
import base64
import json
import os
import subprocess
import time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
FILES = [
    "README.md",
    "changelog.json",
    "tm-electron.js",
    "preview/scenario-editor-sandbox-bridge.js",
    "scripts/verify-all.js",
    "scripts/smoke-start-game-scenario-library.js",
]


def gh_query(query, variables, retries=8):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload-1334.json"
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    for i in range(retries):
        result = subprocess.run(
            ["gh", "api", "graphql", "--input", str(tmp)],
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=240,
        )
        if result.returncode == 0:
            tmp.unlink(missing_ok=True)
            return json.loads(result.stdout)
        print(f"  retry {i + 1}/{retries}: rc={result.returncode} {(result.stderr or '')[:240]}", flush=True)
        time.sleep(4)
    tmp.unlink(missing_ok=True)
    raise RuntimeError("gh api graphql failed")


def main():
    missing = [p for p in FILES if not (WEB / p).exists()]
    if missing:
        raise SystemExit("missing files: " + ", ".join(missing))

    head_query = """query($owner:String!,$name:String!,$branch:String!){
      repository(owner:$owner,name:$name){
        ref(qualifiedName:$branch){target{... on Commit{oid}}}
      }
    }"""
    head = gh_query(head_query, {"owner": OWNER, "name": REPO, "branch": f"refs/heads/{BRANCH}"})
    oid = head["data"]["repository"]["ref"]["target"]["oid"]
    print("remote HEAD", oid[:7], flush=True)

    additions = []
    raw_size = 0
    for p in FILES:
        data = (WEB / p).read_bytes()
        raw_size += len(data)
        additions.append({"path": p, "contents": base64.b64encode(data).decode("ascii")})
    print(f"{len(additions)} files raw={raw_size:,} bytes", flush=True)

    mutation = """mutation($input:CreateCommitOnBranchInput!){
      createCommitOnBranch(input:$input){commit{oid url}}
    }"""
    variables = {"input": {
        "branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
        "message": {
            "headline": "1.3.3.4: 自制剧本保存后可在开始游戏选择",
            "body": (
                "1.3.3.4 紧急修复补丁:\n"
                "- 开始游戏合并官方剧本、桌面用户剧本与 P.scenarios 自制剧本\n"
                "- 不再隐藏 playable=false、草稿态或未完善剧本\n"
                "- 剧本编辑器写回正式页后同步调用桌面 saveScenario 落盘\n"
                "- README / 邸报同步到 1.3.3.4，并注册回归 smoke\n"
            ),
        },
        "fileChanges": {"additions": additions},
        "expectedHeadOid": oid,
    }}
    result = gh_query(mutation, variables)
    if result.get("errors"):
        raise SystemExit(json.dumps(result["errors"], ensure_ascii=False, indent=2))
    commit = result["data"]["createCommitOnBranch"]["commit"]
    print("DONE", commit["oid"], commit["url"], flush=True)


if __name__ == "__main__":
    main()
