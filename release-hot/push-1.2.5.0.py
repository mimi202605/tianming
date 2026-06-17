#!/usr/bin/env python3
"""1.2.5.0 Path B GitHub push·廷议 v3 + 科举 Phase E+F + bug 修。"""
import base64
import json
import os
import subprocess
import time
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
SCEN = Path("C:/Users/37814/Desktop/tianming/scenarios")
START_FROM = int(os.environ.get("PUSH_START_FROM", "1"))

BATCHES = [
    ("1.2.5.0 part 1/3·changelog + index.html + endturn 修 + save-lifecycle A-1", [
        ("changelog.json", WEB / "changelog.json"),
        ("index.html", WEB / "index.html"),
        ("tm-endturn-ai.js", WEB / "tm-endturn-ai.js"),
        ("tm-endturn-render.js", WEB / "tm-endturn-render.js"),
        ("tm-endturn-followup.js", WEB / "tm-endturn-followup.js"),
        ("tm-patches.js", WEB / "tm-patches.js"),
        ("tm-save-lifecycle.js", WEB / "tm-save-lifecycle.js"),
    ]),
    ("1.2.5.0 part 2/3·廷议 v3 sprint·17 slice + 5 audit", [
        ("tm-tinyi-v3.js", WEB / "tm-tinyi-v3.js"),
        ("tm-chaoyi-tinyi.js", WEB / "tm-chaoyi-tinyi.js"),
        ("tm-chaoyi-changchao.js", WEB / "tm-chaoyi-changchao.js"),
    ]),
    ("1.2.5.0 part 3/3·科举 Phase E+F + 全 keju phase 文件", [
        # Phase A·learning + activation
        ("tm-keju-learning-traits.js", WEB / "tm-keju-learning-traits.js"),
        ("tm-keju-activation.js", WEB / "tm-keju-activation.js"),
        # Phase B·tier + presets + topic-router
        ("tm-keju-tier.js", WEB / "tm-keju-tier.js"),
        ("tm-keju-presets.js", WEB / "tm-keju-presets.js"),
        ("tm-keju-topic-router.js", WEB / "tm-keju-topic-router.js"),
        ("tm-keju.js", WEB / "tm-keju.js"),
        # Phase C·tension/corruption/examiner-view/budget/question-ui
        ("tm-keju-tension.js", WEB / "tm-keju-tension.js"),
        ("tm-keju-corruption.js", WEB / "tm-keju-corruption.js"),
        ("tm-keju-examiner-view.js", WEB / "tm-keju-examiner-view.js"),
        ("tm-keju-budget-ui.js", WEB / "tm-keju-budget-ui.js"),
        ("tm-keju-question-ui.js", WEB / "tm-keju-question-ui.js"),
        # Phase D·dianshi-events
        ("tm-keju-dianshi-events.js", WEB / "tm-keju-dianshi-events.js"),
        # Phase E·mentor + runtime (大) + allocation
        ("tm-keju-mentor.js", WEB / "tm-keju-mentor.js"),
        ("tm-keju-runtime.js", WEB / "tm-keju-runtime.js"),
        ("tm-keju-allocation.js", WEB / "tm-keju-allocation.js"),
        # Phase F·disciple-graph + disciple-memorial + cohort-meet + yanguan-attribution + yanguan-qingyi
        ("tm-keju-disciple-graph.js", WEB / "tm-keju-disciple-graph.js"),
        ("tm-keju-disciple-memorial.js", WEB / "tm-keju-disciple-memorial.js"),
        ("tm-keju-cohort-meet.js", WEB / "tm-keju-cohort-meet.js"),
        ("tm-keju-yanguan-attribution.js", WEB / "tm-keju-yanguan-attribution.js"),
        ("tm-keju-yanguan-qingyi.js", WEB / "tm-keju-yanguan-qingyi.js"),
    ]),
]


def gh_query(query, variables, retries=3):
    payload = {"query": query, "variables": variables}
    tmp = Path(os.environ.get("TEMP", "C:/Users/37814/AppData/Local/Temp")) / "gh-payload.json"
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    for i in range(retries):
        try:
            r = subprocess.run(
                ["gh", "api", "graphql", "--input", str(tmp)],
                capture_output=True, encoding="utf-8", errors="replace", timeout=180
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


def get_head_oid():
    q = """
    query($owner:String!,$name:String!,$branch:String!){
      repository(owner:$owner,name:$name){
        ref(qualifiedName:$branch){
          target{ ... on Commit { oid } }
        }
      }
    }"""
    r = gh_query(q, {"owner": OWNER, "name": REPO, "branch": f"refs/heads/{BRANCH}"})
    return r["data"]["repository"]["ref"]["target"]["oid"]


def push_batch(idx, headline, files, head_oid):
    additions = []
    total_raw = 0
    for repo_path, local_path in files:
        data = local_path.read_bytes()
        b64 = base64.b64encode(data).decode("ascii")
        additions.append({"path": repo_path, "contents": b64})
        total_raw += len(data)
        print(f"    + {repo_path} ({len(data)/1024:.1f} KB → b64 {len(b64)/1024:.1f} KB)", flush=True)
    print(f"  [batch {idx}] raw {total_raw/1024:.1f} KB·{len(additions)} files", flush=True)

    mut = """
    mutation($input:CreateCommitOnBranchInput!){
      createCommitOnBranch(input:$input){
        commit{ oid url }
      }
    }"""
    var = {
        "input": {
            "branch": {
                "repositoryNameWithOwner": f"{OWNER}/{REPO}",
                "branchName": BRANCH,
            },
            "message": {
                "headline": headline,
                "body": (
                    "1.2.5.0·廷议 v3 全 17 slice + 科举 v7.1 Phase E+F 进士长期反馈 + 桌面 3s 卡顿修 + 4 处 pre-existing ReferenceError 修\n\n"
                    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
                ),
            },
            "fileChanges": {"additions": additions},
            "expectedHeadOid": head_oid,
        }
    }
    r = gh_query(mut, var)
    if "errors" in r:
        raise RuntimeError(f"GraphQL errors: {json.dumps(r['errors'])[:500]}")
    new_oid = r["data"]["createCommitOnBranch"]["commit"]["oid"]
    url = r["data"]["createCommitOnBranch"]["commit"]["url"]
    print(f"  [batch {idx}] OK·{new_oid[:7]}·{url}", flush=True)
    return new_oid


def main():
    head = get_head_oid()
    print(f"[start] HEAD = {head[:7]}·branch = {BRANCH}·START_FROM={START_FROM}", flush=True)
    for i, (headline, files) in enumerate(BATCHES, 1):
        if i < START_FROM:
            print(f"[batch {i}] SKIP (resume from {START_FROM})", flush=True)
            continue
        print(f"\n[batch {i}/{len(BATCHES)}] {headline}", flush=True)
        head = push_batch(i, headline, files, head)
        if i < len(BATCHES):
            time.sleep(2)
    print(f"\n[done] all {len(BATCHES)} batches·final HEAD = {head[:7]}", flush=True)


if __name__ == "__main__":
    main()
