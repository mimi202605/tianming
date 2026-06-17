"""GitHub Path B push for 1.2.7.2·Phase 8 split Wave 3-6 + 科举 gate + 科议 tier fix"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.2 Phase 8 split Wave 3-6 + 科举主面板入口修 + 科议 tier 修"
BODY = "phase8-formal-bridge.js 从 10603 行拆到 2445 行·新建 4 大模块·rightrail (1696L) / drafts (2068L) / modules (1319L) / map (2689L)·~438 函数迁出·wrapper 策略保 callsite 0 改动·8 smoke 全 PASS·零回归。tm-keju.js 反转改革范式 gate (默认开)·加科举生态状态条 (恩科/武举/童子科/书院/学派 计数)·使主面板能跳完整科举改革面板。tm-chaoyi-tinyi.js 4 处 callAI 加 _useSecondaryTier 优先·解决科议默认走主 API 的回归。Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("phase8-formal-rightrail.js", WEB / "phase8-formal-rightrail.js"),
    ("phase8-formal-drafts.js", WEB / "phase8-formal-drafts.js"),
    ("phase8-formal-modules.js", WEB / "phase8-formal-modules.js"),
    ("phase8-formal-map.js", WEB / "phase8-formal-map.js"),
    ("phase8-formal-records.js", WEB / "phase8-formal-records.js"),
    ("phase8-formal-topbar.js", WEB / "phase8-formal-topbar.js"),
    ("tm-keju.js", WEB / "tm-keju.js"),
    ("tm-chaoyi-tinyi.js", WEB / "tm-chaoyi-tinyi.js"),
    ("scripts/smoke-formal-edict-endturn-bridge.js", WEB / "scripts/smoke-formal-edict-endturn-bridge.js"),
    ("scripts/smoke-formal-edict-polish-scope.js", WEB / "scripts/smoke-formal-edict-polish-scope.js"),
    ("scripts/smoke-formal-edict-portrait.js", WEB / "scripts/smoke-formal-edict-portrait.js"),
    ("scripts/smoke-formal-hongyan-fulltext.js", WEB / "scripts/smoke-formal-hongyan-fulltext.js"),
    ("scripts/smoke-formal-module-modal-size.js", WEB / "scripts/smoke-formal-module-modal-size.js"),
    ("scripts/smoke-formal-records-fulltext.js", WEB / "scripts/smoke-formal-records-fulltext.js"),
    ("scripts/smoke-formal-ui-bridge-state.js", WEB / "scripts/smoke-formal-ui-bridge-state.js"),
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
tmp = Path("C:/Users/37814/Desktop/push-1272-payload.json")
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
