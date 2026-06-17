"""GitHub Path B push for 1.2.5.1·single batch·15 files·~1.6 MB raw"""
import base64, json, os, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.5.1 D1 endTurn hookup + audit P0/P1 + F1 bugs"
BODY = "F2/F3/F4c trigger endTurn hookup (deferred phase5 + render-finalize 2 处)·scenario.keju.enabled boolean 优先 guard 3 路径·D4 寒门/门阀 keyword 扩绍宋 classes 可触发·F1 lastInteractionYear 替 turn 推算 / 中立 party 排除 / endTurn 不 mutate strength·Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("tm-keju-runtime.js", WEB / "tm-keju-runtime.js"),
    ("tm-keju-dianshi-events.js", WEB / "tm-keju-dianshi-events.js"),
    ("tm-keju-disciple-graph.js", WEB / "tm-keju-disciple-graph.js"),
    ("tm-keju-mentor.js", WEB / "tm-keju-mentor.js"),
    ("tm-keju-disciple-memorial.js", WEB / "tm-keju-disciple-memorial.js"),
    ("tm-keju-cohort-meet.js", WEB / "tm-keju-cohort-meet.js"),
    ("tm-keju-yanguan-attribution.js", WEB / "tm-keju-yanguan-attribution.js"),
    ("tm-keju-yanguan-qingyi.js", WEB / "tm-keju-yanguan-qingyi.js"),
    ("tm-chaoyi.js", WEB / "tm-chaoyi.js"),
    ("tm-chaoyi-changchao.js", WEB / "tm-chaoyi-changchao.js"),
    ("tm-chaoyi-tinyi.js", WEB / "tm-chaoyi-tinyi.js"),
    ("tm-player-core.js", WEB / "tm-player-core.js"),
    ("tm-endturn-pipeline-steps.js", WEB / "tm-endturn-pipeline-steps.js"),
]

def gh_api(args, stdin_path=None):
    cmd = ["gh", "api"] + args
    if stdin_path:
        with open(stdin_path, 'rb') as f:
            r = subprocess.run(cmd, capture_output=True, input=f.read())
            return r.returncode, r.stdout.decode('utf-8', errors='replace'), r.stderr.decode('utf-8', errors='replace')
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode, r.stdout, r.stderr

rc, out, err = gh_api(["-X", "GET", "repos/" + OWNER + "/" + REPO + "/git/ref/heads/" + BRANCH, "--jq", ".object.sha"])
if rc != 0:
    raise SystemExit("get sha fail rc=" + str(rc) + " " + err[:200])
head_sha = out.strip()
print("[head]", head_sha)

additions = []
raw_size = 0
for repo_path, local_path in FILES:
    content = local_path.read_bytes()
    raw_size += len(content)
    additions.append({"path": repo_path, "contents": base64.b64encode(content).decode('ascii')})
    print("  +", repo_path, len(content), "bytes")
print("[raw total]", raw_size, "bytes ({:.2f} MB)".format(raw_size/1024/1024))

mutation = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid url } } }"
payload = {
    "query": mutation,
    "variables": {"input": {
        "branch": {"repositoryNameWithOwner": OWNER + "/" + REPO, "branchName": BRANCH},
        "message": {"headline": BATCH_MSG, "body": BODY},
        "fileChanges": {"additions": additions},
        "expectedHeadOid": head_sha
    }}
}
tmp = Path("C:/Users/37814/Desktop/push-1251-payload.json")
tmp.write_text(json.dumps(payload), encoding='utf-8')
print("[payload]", tmp.stat().st_size, "bytes")

rc, out, err = gh_api(["graphql", "--input", str(tmp)], stdin_path=str(tmp))
print("[rc]", rc)
if rc != 0:
    print("STDOUT:", out[:600])
    print("STDERR:", err[:600])
    raise SystemExit("push fail")
d = json.loads(out)
if d.get("errors"):
    print("GraphQL errors:", d["errors"])
    raise SystemExit("graphql error")
commit = d["data"]["createCommitOnBranch"]["commit"]
print("[OK]", commit["oid"][:7], commit["url"])
tmp.unlink()
