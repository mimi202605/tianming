"""GitHub Path B push for 1.2.6.4·Stage 2·Phase L·Slice L1·5 files·~70 KB raw"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.6.4 Stage 2·Phase L·Slice L1·KejuParadigm 地基"
BODY = "新建 GM._kejuParadigm namespace·11 类 30+ 字段 (题目/tier/考生/主考/录取/授官/身份/联动/仪轨/惩罚/语言/元 ideology)·9 朝代 paradigm-specific addon (汉/魏晋/隋/唐/北宋/南宋/元/明/清+fallback)·version migration 框架·export/import·reset·validate·lint stub·3 新文件 (tm-keju-paradigm.js + tm-keju-paradigm-presets.js + smoke 40 case 95 assertion 全 PASS)·集成 tm-keju-runtime.js + tm-save-lifecycle.js·flag gate 无·0 game behavior 变化·**改革效果 L7 才生效·L1 是 baseline**·Phase L 50 slice 第一刀·Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("tm-keju-paradigm.js", WEB / "tm-keju-paradigm.js"),
    ("tm-keju-paradigm-presets.js", WEB / "tm-keju-paradigm-presets.js"),
    ("tm-keju-runtime.js", WEB / "tm-keju-runtime.js"),
    ("tm-save-lifecycle.js", WEB / "tm-save-lifecycle.js"),
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
tmp = Path("C:/Users/37814/Desktop/push-1264-payload.json")
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
    raise SystemExit("graphql error")
commit = d["data"]["createCommitOnBranch"]["commit"]
print("[OK]", commit["oid"][:7], commit["url"])
tmp.unlink()
