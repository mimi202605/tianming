"""Push the 3 path-fixed keju smokes (g1/g5/h) back to GitHub·恢复测试覆盖."""
import base64, json, subprocess, time
from pathlib import Path

OWNER, REPO, BRANCH = "misfit-user", "tianming", "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
FILES = ["scripts/smoke-g1-special-exams.js", "scripts/smoke-g5-tongzi.js", "scripts/smoke-h-school.js"]

def gh(args, inp=None):
    if inp:
        with open(inp, "rb") as f:
            r = subprocess.run(["gh", "api"] + args, capture_output=True, input=f.read())
            return r.returncode, r.stdout.decode("utf-8", "replace"), r.stderr.decode("utf-8", "replace")
    r = subprocess.run(["gh", "api"] + args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, r.stdout, r.stderr

def head_sha():
    for _ in range(5):
        rc, out, err = gh(["-X", "GET", f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", "--jq", ".object.sha"])
        if rc == 0 and out.strip():
            return out.strip()
        time.sleep(3)
    raise SystemExit("sha fail (network)")

head = head_sha()
print("[head]", head[:7])
adds = [{"path": f, "contents": base64.b64encode((WEB / f).read_bytes()).decode("ascii")} for f in FILES]
mutation = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }"
body = ("原 require(../web/X) 路径错位(项目根约定)·从 web/scripts/ 解析失败。修为 ../X·测活模块 "
        "tm-keju-{special-exams,tongzi,school-network,event-hooks}。跑通·g1 51/52·g5 67/67·h 158/158"
        "(g1 余 1 条 flag-off namespace stale 断言·非回归)。\n\n"
        "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>")
payload = {"query": mutation, "variables": {"input": {
    "branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
    "message": {"headline": "fix·keju g1/g5/h smoke require 路径(../web/→../)·恢复特科/童子/书院测试覆盖", "body": body},
    "fileChanges": {"additions": adds},
    "expectedHeadOid": head}}}
tmp = Path("C:/Users/37814/Desktop/_smoke-restore.json")
tmp.write_text(json.dumps(payload), encoding="utf-8")
out = "{}"
for _ in range(5):
    rc, out, err = gh(["graphql", "--input", str(tmp)], inp=str(tmp))
    if rc == 0 and not json.loads(out or "{}").get("errors"):
        break
    print("  retry...", (err or out)[:160]); time.sleep(3)
tmp.unlink(missing_ok=True)
d = json.loads(out)
if d.get("errors"):
    print("ERRORS", json.dumps(d["errors"])[:400]); raise SystemExit("gql err")
print("[OK]", d["data"]["createCommitOnBranch"]["commit"]["oid"][:7])
