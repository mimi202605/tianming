"""GitHub Path B push for 1.2.7.7 source·6 more wave-split aliases (showHome / isPinned / etc)"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.7 src hotfix·6 more wave-split aliases·showHome / isPinned / issueRank / renderIssueCard / renderIssueDetail / toast (no hot yet)"
BODY = (
    "Continuation of 1.2.7.6 wave-split alias hotfix. Broader ident scan found 6 more missing.\n\n"
    "map.js·showHome (L96 back.onclick = showHome - assignment not call, missed last grep)\n"
    "modules.js·isPinned / issueRank / renderIssueCard / renderIssueDetail (renwu+issue panels)\n"
    "rightrail.js·toast (L998/1013/1032/1280 user-action toasts)\n\n"
    "Bridge expose 6 _xxx helpers. Split files head alias 6 var X = bridge._X.\n\n"
    "Players on 1.2.7.6 hot report: console still spamming 'showHome is not defined', map not rendering\n"
    "(ensureMainShell catches but null onclick breaks home-return button + main shell layout).\n\n"
    "Source push only - no hot ship yet.\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("phase8-formal-map.js", WEB / "phase8-formal-map.js"),
    ("phase8-formal-modules.js", WEB / "phase8-formal-modules.js"),
    ("phase8-formal-rightrail.js", WEB / "phase8-formal-rightrail.js"),
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
    raise SystemExit("get sha fail " + err[:200])
head_sha = out.strip()
print("[head]", head_sha)

additions = []
raw_size = 0
for rp, lp in FILES:
    c = lp.read_bytes()
    raw_size += len(c)
    additions.append({"path": rp, "contents": base64.b64encode(c).decode('ascii')})
    print("  +", rp, len(c), "bytes")
print("[raw]", raw_size, "bytes ({:.2f} MB)".format(raw_size/1024/1024))

mutation = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid url } } }"
payload = {"query": mutation, "variables": {"input": {
    "branch": {"repositoryNameWithOwner": OWNER + "/" + REPO, "branchName": BRANCH},
    "message": {"headline": BATCH_MSG, "body": BODY},
    "fileChanges": {"additions": additions},
    "expectedHeadOid": head_sha
}}}
tmp = Path("C:/Users/37814/Desktop/push-1277-payload.json")
tmp.write_text(json.dumps(payload), encoding='utf-8')

rc, out, err = gh_api(["graphql", "--input", str(tmp)], stdin_path=str(tmp))
if rc != 0:
    print("STDERR:", err[:600]); raise SystemExit("push fail")
d = json.loads(out)
if d.get("errors"):
    print("GraphQL errors:", d["errors"]); raise SystemExit("graphql errors")
oid = d["data"]["createCommitOnBranch"]["commit"]["oid"]
url = d["data"]["createCommitOnBranch"]["commit"]["url"]
print("[OK]", oid[:7], url)
try: tmp.unlink()
except: pass
