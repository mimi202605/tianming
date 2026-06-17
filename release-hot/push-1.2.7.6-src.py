"""GitHub Path B push for 1.2.7.6 source·map.js alias hotfix + chaoyi ststmem light"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.6 src hotfix·map.js missing 6 aliases (syncFormalShellVisibility etc) + chaoyi seating ststmem dark-text fix"
BODY = (
    "Two bugs reported by player on hot 1.2.7.3:\n\n"
    "1) Console flooded with 2000+ ReferenceError during endturn pipeline\n"
    "   - 'syncFormalShellVisibility is not defined' at phase8-formal-map.js:57 (ensureMainShell)\n"
    "   - 'hasRegionMap is not defined' at phase8-formal-map.js:204 (getMapData via EndTurnHooks)\n"
    "   - Root cause: Wave 6 bridge.js -> map.js split (2026-05-26) missed 6 helper aliases.\n"
    "   - Fix: bridge.js expose _syncFormalShellVisibility / _hasRegionMap / _getScenarioMapData /\n"
    "     _activeScenarioId / _mapIdentity / _isGameVisible. map.js head alias 5 of them (the\n"
    "     getScenarioMapData / activeScenarioId / mapIdentity also used internally without alias).\n"
    "   - Endturn pipeline succeeds despite errors (try/catch in EndTurnHooks) but console spam.\n\n"
    "2) Chaoyi 'qiyi-zhanban' (party seating) modal - official names invisible\n"
    "   - .ty3-st-mem CSS used color: var(--ink-700, #d9c9a9) expecting light fallback\n"
    "   - But styles.css :root L3373 has --ink-700: #1c1914 (almost black)\n"
    "   - Fallback never kicks in -> dark-on-dark text\n"
    "   - Fix: change to literal color #e6d4a0 + slightly transparent bg + text-shadow for safety\n\n"
    "Files changed:\n"
    "- web/phase8-formal-bridge.js (expose 6 helpers)\n"
    "- web/phase8-formal-map.js (alias 6 helpers in head)\n"
    "- web/tm-tinyi-v3.css (.ty3-st-mem literal colors)\n"
    "- web/tm-tinyi-v3.js (css cache version bump)\n"
    "- web/index.html (bridge.js + map.js cache version bump)\n"
    "- web/changelog.json (1.2.7.6 entry)\n\n"
    "No hot update yet - source push only.\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("phase8-formal-map.js", WEB / "phase8-formal-map.js"),
    ("tm-tinyi-v3.css", WEB / "tm-tinyi-v3.css"),
    ("tm-tinyi-v3.js", WEB / "tm-tinyi-v3.js"),
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
tmp = Path("C:/Users/37814/Desktop/push-1276-payload.json")
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
