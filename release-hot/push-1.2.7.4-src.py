"""GitHub Path B push for 1.2.7.4 source·gc hide + rail center + rail 印钮 chrome (无热更)"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.4 src·gc legacy hide fix + rail center + rail 印钮 chrome (no hot ship yet)"
BODY = (
    "Three CSS changes in phase8-formal-bridge.js. No hot update yet - user wants more UI work first.\n\n"
    "1) gc legacy hide regression fix (L1890)\n"
    "Selector changed from `body.tm-phase8-home .gc > :not(#tm-phase8-main-shell){display:none}`\n"
    "to `body.tm-phase8-formal:not(.tm-phase8-legacy) .gc > :not(#tm-phase8-main-shell){display:none}`.\n"
    "Old selector depended on tm-phase8-home class which races with bridge install timing -\n"
    "if #G not visible at install time, showHome() returns early and home class never added,\n"
    "leading to new UI + old .gc 19-tab bar (zhaozheng/edict/memorial/...) double-rendering.\n"
    "New selector defaults to hidden; legacy-mode openLegacyTab() explicitly opts in.\n\n"
    "2) Right rail vertical center (L1877)\n"
    "#tm-right-rail position from `top:78px` (flush below topbar) to `top:50%; transform:translateY(-50%)`.\n"
    "User reported the rail was hugging the top after 1.2.7.3, wanted it more centered.\n"
    "1080p viewport - rail height ~410px - leaves ~325px equal padding top/bottom.\n\n"
    "3) Rail button chrome - 印钮 (seal-knob) paradigm (L1878-L1889)\n"
    "From flat 42x42 dark-gradient tiles to 44x46 stereoscopic seal knobs.\n"
    "- six-layer box-shadow (top highlight / left bevel / right bevel / bottom inset / inner glow / outer drop)\n"
    "- :before pseudo for top gold lip (1.5px gold gradient ridge)\n"
    "- hover translateY(-1px) lift (replaces translateX slide)\n"
    "- :active translateY(+1px) press (印章 stamp feel matching 诏付有司 paradigm)\n"
    "- .hot adds vermilion outer halo + dark-red inner gradient\n"
    "- .ok adds jade outer halo + dark-jade inner gradient\n"
    "- .active adds 1px inner gold ring + 20px gold outer halo + brightened :before lip\n"
    "- .tm-rc-cap (国事 cap) - vermilion radial overlay + serif spacing .32em + multilayer shadow\n"
    "- .tm-rc-divider - was 1px fade line, now double-line + radial vermilion rivet center\n"
    "- .tm-rc-count - was pill-shape sans-serif, now 2px square corners + STSong serif + vermilion lacquer\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
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
tmp = Path("C:/Users/37814/Desktop/push-1274-payload.json")
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
