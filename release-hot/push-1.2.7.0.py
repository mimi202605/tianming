"""GitHub Path B push for 1.2.7.0·Stage 2 大里程碑
   Phase G 4/5 (G1+G2+G3+G5) + Phase H 12 维深嵌入 + G5 v2 全面优化 + 科举 audit 6 fix + G4 删
"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
ROOT = Path("C:/Users/37814/Desktop/tianming")
WEB = ROOT / "web"
SCR = ROOT / "scripts"

BATCH_MSG = "1.2.7.0 Stage 2·Phase G 4/5 + Phase H 12 维 + G5 v2 优化 + audit 6 fix + G4 删"
BODY = (
    "Phase G·特科系统 4/5 完工·G1 (shared infra) + G2 (恩科 mini-keju) + G3 (武举 mini-keju) + G5 (童子科 mini-keju + v2 全面优化)·G4 翻译科 user 拍删冗余·"
    "Phase H·私学/书院 mini-system 12 维深嵌入·山长真 NPC + 党派真 spawn + 学说改 paradigm + 5 watershed + F4c 言官 + 反馈循环·"
    "G5 v2 全面优化·4 archetype 扩 (早卒/大器晚成/奇行隐/才尽辍考) + trigger 扩 4 类 + user 钦点 mode + late_bloomer 50 岁真入会试 + 跨系统 wire (民心/解额/F4c/H)·"
    "科举 audit 6 fix·CRITICAL settings panel 加 5 toggle (D2/G2/G3/G5/H) + CRITICAL G5 问礼部 button + HIGH late_bloomer 真入 G2 enke pool + HIGH turned_eccentric 真 spawn shanzhang + HIGH reset 补 3 字段 + MID 人物面板 _origin 5 类彩色 tag·"
    "全 735+ smoke PASS / 1 preexisting baseline / 零回归·跟 G2/G3/G5/H/L1-L12/F1-F4c 完全兼容·"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)

# 全改动文件清单
FILES = [
    # ── 核心邸报 + 文档 ──
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("docs/keju-G5-sprint.md", WEB / "docs" / "keju-G5-sprint.md"),
    ("docs/keju-H-sprint.md", WEB / "docs" / "keju-H-sprint.md"),
    ("docs/phase-G-finalize-audit.md", WEB / "docs" / "phase-G-finalize-audit.md"),
    # ── 新主文件 (Phase H + G5) ──
    ("tm-keju-school-network.js", WEB / "tm-keju-school-network.js"),
    ("tm-keju-tongzi.js", WEB / "tm-keju-tongzi.js"),
    # ── G1/G2/G3 改动 (callback router + decorator + trigger 扩) ──
    ("tm-keju-special-exams.js", WEB / "tm-keju-special-exams.js"),
    ("tm-keju-enke.js", WEB / "tm-keju-enke.js"),
    # ── 共享 hook + pipeline + edict + chaoyi ──
    ("tm-keju-event-hooks.js", WEB / "tm-keju-event-hooks.js"),
    ("tm-edict-lifecycle.js", WEB / "tm-edict-lifecycle.js"),
    ("tm-endturn-pipeline-steps.js", WEB / "tm-endturn-pipeline-steps.js"),
    ("tm-chaoyi.js", WEB / "tm-chaoyi.js"),
    # ── UI (问学政 + 问礼部 button·人物面板 _origin tag·settings panel 5 toggle) ──
    ("tm-hongyan-office.js", WEB / "tm-hongyan-office.js"),
    ("tm-patches.js", WEB / "tm-patches.js"),
    ("tm-player-core.js", WEB / "tm-player-core.js"),
    # ── smoke·新 H/G5 + 改 G1 ──
    ("scripts/smoke-h-school.js", SCR / "smoke-h-school.js"),
    ("scripts/smoke-g5-tongzi.js", SCR / "smoke-g5-tongzi.js"),
    ("scripts/smoke-g1-special-exams.js", SCR / "smoke-g1-special-exams.js"),
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
        print("  ! MISSING:", local_path)
        continue
    content = local_path.read_bytes()
    raw_size += len(content)
    additions.append({"path": repo_path, "contents": base64.b64encode(content).decode('ascii')})
    print("  +", repo_path, len(content), "bytes")
print("[raw total]", raw_size, "bytes ({:.2f} MB)".format(raw_size/1024/1024))

if raw_size > 5 * 1024 * 1024:
    print("[WARN] raw >5MB·may approach GraphQL 10MB base64 limit·若 fail 用 split")

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
tmp = Path("C:/Users/37814/Desktop/push-1270-payload.json")
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
