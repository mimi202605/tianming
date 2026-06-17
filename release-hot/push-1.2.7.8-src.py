"""1.2.7.8 src·map diag + renderGameState try/catch"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.8 src·map render diag + renderGameState wrap try/catch isolation (no hot yet)"
BODY = (
    "Player reports map still not rendering after 1.2.7.7 alias fix.\n"
    "Two changes:\n"
    "1) phase8-formal-bridge.js renderGameState wrap - try/catch isolation so renderEventFeed failure "
    "doesn't block showHome -> renderFormalMapSoon -> map render\n"
    "2) phase8-formal-map.js renderFormalMap - add console.warn diagnostics on shell/stage/visible "
    "missing and on getMapData null (every 20 retries) with full data source state\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)
FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("phase8-formal-map.js", WEB / "phase8-formal-map.js"),
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
for rp, lp in FILES:
    c = lp.read_bytes()
    additions.append({"path": rp, "contents": base64.b64encode(c).decode('ascii')})
    print("  +", rp, len(c), "bytes")

mutation = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid url } } }"
payload = {"query": mutation, "variables": {"input": {
    "branch": {"repositoryNameWithOwner": OWNER + "/" + REPO, "branchName": BRANCH},
    "message": {"headline": BATCH_MSG, "body": BODY},
    "fileChanges": {"additions": additions},
    "expectedHeadOid": head_sha
}}}
tmp = Path("C:/Users/37814/Desktop/push-1278-payload.json")
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
