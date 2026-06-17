"""GitHub Path B push for 1.2.7.1·single batch·12 files·~1.8 MB raw"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.7.1 formal UI keju entry + keyi tier fix + phase8 split wave1-2"
BODY = """3 UI fixes + 4 LLM tier corrections + bridge.js wave 1-2 split.

UI Fix 1 - right rail wenshi tab: renderWenRich() top adds golden keju card (current state + jinshi count + onclick openKejuPanel). Recovers the button lost when V0 renderWen was cleaned as dead code while Rich never ported it.

UI Fix 2 - keju module stub: renderKejuModule() now reads P.keju + GM._kejuParadigm (paradigm.subjects/tiers/quota/initEra/reformChronicle) - shows real data + prominent open-keju-panel button. New dispatcher action open-keju-panel routes to openKejuPanel().

Tier Fix - tm-chaoyi-tinyi.js 4 callAI sites: L591/L658/L695/L934 added tier=secondary gate matching L504 paradigm. Keyi/tinyi/yuqian all 3 alchemy types now uniformly go to secondary API (falls back to primary if not configured).

Phase 8 bridge split Wave 1+2: 10603 -> 9766 lines. Wave 1 records.js (484 lines, 29 functions). Wave 2 topbar.js (239 lines, 5 main + 9 helpers). V0 dead actionTraySpecs cleaned. 6 skeleton modules ready for waves 3-6. 23 helpers exposed via bridge._xxx. Late-bound TMPhase8FormalBridge.topbar.X() calls. 8 formal smokes + 4 tinyi smokes all PASS, zero regression.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"""

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("phase8-formal-bridge.js", WEB / "phase8-formal-bridge.js"),
    ("phase8-formal-records.js", WEB / "phase8-formal-records.js"),
    ("phase8-formal-topbar.js", WEB / "phase8-formal-topbar.js"),
    ("phase8-formal-map.js", WEB / "phase8-formal-map.js"),
    ("phase8-formal-modules.js", WEB / "phase8-formal-modules.js"),
    ("phase8-formal-drafts.js", WEB / "phase8-formal-drafts.js"),
    ("phase8-formal-rightrail.js", WEB / "phase8-formal-rightrail.js"),
    ("tm-chaoyi-tinyi.js", WEB / "tm-chaoyi-tinyi.js"),
    ("scripts/smoke-formal-records-fulltext.js", WEB / "scripts" / "smoke-formal-records-fulltext.js"),
    ("docs/phase8-formal-bridge-split-sprint.md", WEB / "docs" / "phase8-formal-bridge-split-sprint.md"),
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
    if not local_path.exists():
        print("  SKIP (missing)", repo_path)
        continue
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
tmp = Path("C:/Users/37814/Desktop/push-1271-payload.json")
tmp.write_text(json.dumps(payload), encoding='utf-8')
print("[payload]", tmp.stat().st_size, "bytes ({:.2f} MB)".format(tmp.stat().st_size/1024/1024))

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
