"""1.2.8.1 src·闲置黑屏(渲染OOM)修复 + 移动对账层(下诏移动人物不生效顽疾)·Path B 单 batch"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.8.1 src·闲置黑屏(渲染OOM)修复 + 移动对账层(下诏移动人物不生效顽疾)"
BODY = (
    "两项 high 修复·均 smoke 通过·未 live 实测。\n\n"
    "① 闲置黑屏 (renderer OOM)·tm-save-lifecycle.js\n"
    "   根因·autoSave 的 defer 逻辑使闲置反而是存档最频繁状态——活跃游玩频繁\n"
    "   输入触发 defer(约 3 分钟存一次)·闲置无输入永不 defer·每 60 秒满血\n"
    "   deepClone(P)+GM 快照(~1 秒·数百 MB)+IPC·闲置 10 分钟累积约 10 次峰值\n"
    "   →渲染进程堆耗尽黑屏。Fix·加 _autoSaveLastSavedTurn/_autoSaveIdleSkipStreak·\n"
    "   自上次成功存档以来既无输入又无回合推进时跳过(盘上副本已最新·零数据丢失)。\n\n"
    "② 下诏移动人物不生效顽疾·移动对账层 (4 文件)\n"
    "   根因·人物移动 100% 靠 AI 自愿吐 char_updates.travelTo·只叙事不吐字段就\n"
    "   原地不动·天意规则纯 context 也逼不出字段·历代全在加 prompt 警告(概率\n"
    "   手段补不到 100%)。Fix·\n"
    "   - tm-endturn-edict.js·新 extractEdictMovements 确定性解析诏书移动令\n"
    "     (已知姓名锚定·覆盖 返回/赴/召…延朝/移驻)\n"
    "   - tm-endturn-prep.js·本势力过滤存 GM._turnMoveCommands\n"
    "   - tm-endturn-prompt.js·每回合注入明确移动清单\n"
    "   - tm-ai-change-applier.js·新 _reconcilePlayerMovements 在 AI 变更应用后\n"
    "     逐条核对·AI 漏吐 travelTo 时引擎兜底(抽出 _arriveCharNow 复用到达逻辑)·\n"
    "     有即时抵达天意规则在线则当回合到位+决策1后果(_applyInstantArrivalCost)\n\n"
    "Smoke·新 scripts/smoke-edict-movement-reconcile.js 8 项(含玩家真实诏书措辞)·\n"
    "travel 21 / applier baseline / 问天 hardchange / boot / apply-fields 30 /\n"
    "prompt-tokens 47 / full-turn-flow 全 PASS。index.html cache-bust 5 处。\n\n"
    "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
)
FILES = [
    ("changelog.json", WEB / "changelog.json"),
    ("index.html", WEB / "index.html"),
    ("tm-save-lifecycle.js", WEB / "tm-save-lifecycle.js"),
    ("tm-endturn-edict.js", WEB / "tm-endturn-edict.js"),
    ("tm-endturn-prep.js", WEB / "tm-endturn-prep.js"),
    ("tm-endturn-prompt.js", WEB / "tm-endturn-prompt.js"),
    ("tm-ai-change-applier.js", WEB / "tm-ai-change-applier.js"),
    ("scripts/smoke-edict-movement-reconcile.js", WEB / "scripts" / "smoke-edict-movement-reconcile.js"),
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
total = 0
for rp, lp in FILES:
    c = lp.read_bytes()
    total += len(c)
    additions.append({"path": rp, "contents": base64.b64encode(c).decode('ascii')})
    print("  +", rp, len(c), "bytes")
print("[total raw] %.2f MB" % (total / 1024 / 1024))

mutation = "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid url } } }"
payload = {"query": mutation, "variables": {"input": {
    "branch": {"repositoryNameWithOwner": OWNER + "/" + REPO, "branchName": BRANCH},
    "message": {"headline": BATCH_MSG, "body": BODY},
    "fileChanges": {"additions": additions},
    "expectedHeadOid": head_sha
}}}
tmp = Path("C:/Users/37814/Desktop/push-1281-payload.json")
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
