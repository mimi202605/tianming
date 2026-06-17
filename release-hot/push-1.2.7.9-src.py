"""1.2.7.9 src·CRITICAL fix ownerKey shadow recursion bug"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.9 src CRITICAL·fix map.js ownerKey/ownerName/findFaction shadow alias infinite recursion"
BODY = (
    "Real cause of map not rendering·player console reported:\n"
    "  Uncaught RangeError: Maximum call stack size exceeded at Object.ownerKey (phase8-formal-bridge.js:1376)\n\n"
    "Root cause: map.js head L22-24 had 3 shadow aliases·\n"
    "  var ownerKey = bridge._ownerKey;\n"
    "  var ownerName = bridge._ownerName;\n"
    "  var findFaction = bridge._findFaction;\n"
    "These point to bridge.js wrappers (function ownerKey(r){ return bridge.map.ownerKey(r); }).\n"
    "But map.js also has local function declarations function ownerKey(r){...} at L566+.\n"
    "JS variable hoisting: var assignment runs after function declaration·**overwriting** the local function.\n"
    "Then map.js IIFE end does bridge.map.ownerKey = ownerKey·assigning the WRAPPER.\n"
    "wrapper -> bridge.map.ownerKey (= wrapper) -> infinite recursion·RangeError·map SVG aborts mid-render.\n\n"
    "Existed since Wave 6 split 2026-05-26 but dormant·because syncFormalShellVisibility / hasRegionMap aliases\n"
    "were missing·map render path threw earlier·never reached ownerKey. 1.2.7.7 fixed those aliases·path opened·\n"
    "shadow recursion immediately exposed in 1.2.7.7/1.2.7.8.\n\n"
    "Fix: delete 3 var aliases in map.js head. Local function declarations become canonical binding.\n"
    "1 file change·3 lines deleted.\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)
FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
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
tmp = Path("C:/Users/37814/Desktop/push-1279-payload.json")
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
