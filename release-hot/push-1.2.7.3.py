"""GitHub Path B push for 1.2.7.3·Rail SVG + IIFE crash fix"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.3 right rail icons SVG + fix wave 3-6 IIFE crash (critical)"
BODY = (
    "Two changes\n\n"
    "1) Right rail 8 slots switched from Chinese-character buttons to inline SVG icons (\n"
    "ol=Si Nan compass, issue=Yamen palace, policy=bamboo slips scroll, office=court audience trio,\n"
    "army=split tiger tally, map=fish-scale land cadastre, finance=abacus, archive=org chart tree).\n"
    "All pure SVG path, zero image dep, zero hanzi rendering (avoid diffusion glyph trap). Total ~8KB inline.\n\n"
    "2) CRITICAL fix - phase8-formal-bridge.js IIFE was crashing since wave 3-6 split (2026-05-26)\n"
    "because 12 functions migrated to drafts.js/map.js but bridge.js L2304-L2438 still had bare\n"
    "references to them. IIFE threw ReferenceError on first bare ref, TMPhase8FormalBridge was\n"
    "never set, all 6 submodules reported 'bridge.js must load first'. body.tm-phase8-formal\n"
    "class was never added (installFormalShell never fired). Effectively all players have been\n"
    "running old sidebar-ui (CSS hidden but JS still rendering) instead of new yu-an desktop UI.\n"
    "Fix - added 12 late-bind shim functions in bridge.js following the ensureMainShell/renderFormalMap\n"
    "paradigm. Console error count 8 -> 0. Bridge now initializes correctly, body class set,\n"
    "old #bar and .gs-rail-left hidden, new #topbar + #tm-right-rail + #tm-phase8-main-shell render.\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("preview/right-rail-icons-preview.html", WEB / "preview" / "right-rail-icons-preview.html"),
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
tmp = Path("C:/Users/37814/Desktop/push-1273-payload.json")
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
    raise SystemExit("graphql errors")
oid = d["data"]["createCommitOnBranch"]["commit"]["oid"]
url = d["data"]["createCommitOnBranch"]["commit"]["url"]
print("[OK]", oid[:7], url)
try:
    tmp.unlink()
except Exception:
    pass
