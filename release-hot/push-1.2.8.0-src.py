"""1.2.8.0 src·廷议/御前 (未能陈词) 残留 bug 二次修·post-render 副作用守卫"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.8.0 src·tinyi/yuqian (未能陈词) 残留 bug 修·post-render 副作用守卫"
BODY = (
    "1.2.4.2 加了 _cy_jishiAdd shim 但「成功生成后变 (未能陈词)」仍偶发。\n\n"
    "根因·NpcMemorySystem.remember / CY._yq2.opinions[name]= / _transcript+= 等\n"
    "post-render 副作用任一行抛错·都会被外层 try{} 包裹·落到 catch·把已经\n"
    "innerHTML 渲染好的气泡覆写成红字「未能陈词」。\n\n"
    "Fix·\n"
    "- tm-chaoyi-tinyi.js·加 _tyRendered=false flag·obj.line / rescue / raw 兜底\n"
    "  3 处渲染成功置 true。_cy_jishiAdd + NpcMemorySystem.remember 各自包\n"
    "  try/catch·错入 TM.errors.captureSilent。catch 改 if (!_tyRendered) 才\n"
    "  覆写红字。\n"
    "- tm-chaoyi-yuqian.js·同 pattern·4 处 post-render 副作用 (opinions /\n"
    "  _transcript / _cy_jishiAdd / NpcMemorySystem.remember) 各自 try/catch·\n"
    "  _yqRendered guard。\n"
    "- index.html·tm-chaoyi-tinyi.js + tm-chaoyi-yuqian.js ?v= → 2026052803。\n"
    "- changelog 1.2.8.0 entry。\n\n"
    "Smoke·node --check 两文件 PASS。\n\n"
    "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
)
FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("tm-chaoyi-tinyi.js", WEB / "tm-chaoyi-tinyi.js"),
    ("tm-chaoyi-yuqian.js", WEB / "tm-chaoyi-yuqian.js"),
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
tmp = Path("C:/Users/37814/Desktop/push-1280-payload.json")
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
