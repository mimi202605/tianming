"""GitHub Path B push for 1.2.7.5 source·event feed v3.3·邸抄文字流"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.5 src·event feed v3.3 邸抄文字流·442x240·tmv3 namespace·filter/density/collapse (no hot yet)"
BODY = (
    "Event feed (left-bottom 邸报) ground-up redesign to v3.3 ditucao paradigm.\n\n"
    "Changes in phase8-formal-bridge.js:\n"
    "1) New tmv3-* class namespace (parallel to old tm-event-*, old CSS dormant via class mismatch)\n"
    "2) ensureFormalChrome() notice rebuild as <section class=tmv3-feed> with tmv3-head + tmv3-list\n"
    "3) renderEventFeed() new item template - tmv3-item with ttype char + main + mark - grouped by turn with sticky tmv3-turnhead\n"
    "4) Helpers _eventTypeInfo(type) -> [t-chao chip], _seasonChar(turn, time), _isItemAlert, _isItemHot\n"
    "5) installStyles() appended ~70 lines of v3.3 CSS (442x240, transparency ~6%, item 22px collapsed)\n"
    "6) Click handler split for tmv3-fchip / tmv3-dbtn / tmv3-collapse / tmv3-open / tmv3-item with read-area detection\n"
    "7) state additions - eventFilter / eventDensity / eventCollapsed (persisted across chrome rebuilds)\n\n"
    "Visual changes:\n"
    "- Width 366 -> 442 (+24%), height 252 -> 240 (-5%)\n"
    "- Item collapsed 48px -> 22px (-54%), title 13 -> 14 (+8%)\n"
    "- 8-type ttype char with color tinting (chao yi vermillion / jun blue / shi indigo / etc)\n"
    "- Sticky turn header per turn group (like real dibao - one entry per day)\n"
    "- Non-text opacity ~6% (spine 0.22, top/bottom hairlines 0.22-0.26, expanded borders 0.14)\n"
    "- Filter chips (all/chao/jun/bao/...) replace old turn-scope dropdown\n"
    "- Density toggle (compact/comfortable) for a11y\n"
    "- Horizontal collapse to 28px strip with vertical title\n"
    "- 4 visual states - is-new (gold flash top line), is-hot (vermilion static dot), is-alert (pulsing red dot), is-read (title fade .46)\n"
    "- Expanded state - text segments without chip labels, meta tags + 'go to detail' pill\n\n"
    "Preview at web/preview/event-feed-preview.html (live mockup with JS interaction).\n\n"
    "No hot update yet per user pattern - GitHub source push only.\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("preview/event-feed-preview.html", WEB / "preview" / "event-feed-preview.html"),
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
tmp = Path("C:/Users/37814/Desktop/push-1275-payload.json")
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
