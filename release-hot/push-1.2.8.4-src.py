"""1.2.8.4 src·P-VWF 财政改革对账 + 民心写入端修复 + 删角色 + 删环保死代码·Path B 单 batch"""
import base64, json, subprocess
from pathlib import Path

OWNER = "misfit-user"
REPO = "tianming"
BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")

BATCH_MSG = "1.2.8.4 src·开源改革接入央地真账(P-VWF) + 民心写入端修复 + 玩家删角色 + 删环保诏令死代码"
BODY = (
    "本次合并发布 1.2.8.2~1.2.8.4 三版累积改动(此前被 ship 冻结卡着·桌面端核实后一并发)。\n\n"
    "① P-VWF 财政改革对账层 (1.2.8.4)·根治『中央月入死焊·开源改革只改叙事不进真账』\n"
    "   - tm-endturn-prep.js·extractEdictFiscalReforms 捕获肃贪/清丈/开海/盐法/劝农诏令存 GM._turnFiscalReforms\n"
    "   - tm-endturn-prompt.js·注入改革清单·教 AI 吐 reform_effects 力度\n"
    "   - tm-ai-change-applier.js·_reconcilePlayerFiscalReforms 确定性拨开关(必生效兜底·照移动对账范式)\n"
    "   - tm-fiscal-engine.js·adjustPlayerCompliance/triggerPlayerSurvey 真改 cascade 底数\n"
    "   实测·肃贪升 compliance 后中央月入 86907→97771 (+12.5%·toCentral∝compliance)\n\n"
    "② 民心三刀 (1.2.8.3)·玩家民心/皇威/皇权操作不再蒸发\n"
    "   - tm-endturn-apply.js / tm-keju-enke.js / tm-endturn-helpers.js·三条通道改走 AuthorityEngines.adjust* 写 trueIndex\n"
    "   实测·议题 民心:+10 → trueIndex 50→60 (不再蒸发)\n\n"
    "③ 玩家手动删角色 (1.2.8.2)·tm-player-core.js / tm-char-autogen.js·硬编码后门 + 黑名单防重生\n\n"
    "④ 清理·tm-edict-parser.js 删 R12 遗留环保诏令路由死代码(POLICY_KEYWORDS/detectEnvPolicy/routeEnvPolicy·主流程零调用)\n\n"
    "测试·新增 smoke-fiscal-reform-reconcile(13) / smoke-pvwf-income-flow(6) / smoke-minxin-3dao-writeback(7)·\n"
    "edict layered(47) + p5-gamma(61) + authority(18+60) 全 PASS。\n\n"
    "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
)
FILES = [
    ("changelog.json", WEB / "changelog.json"),
    # P-VWF
    ("tm-endturn-prep.js", WEB / "tm-endturn-prep.js"),
    ("tm-endturn-prompt.js", WEB / "tm-endturn-prompt.js"),
    ("tm-ai-change-applier.js", WEB / "tm-ai-change-applier.js"),
    ("tm-fiscal-engine.js", WEB / "tm-fiscal-engine.js"),
    # 民心三刀
    ("tm-endturn-apply.js", WEB / "tm-endturn-apply.js"),
    ("tm-endturn-helpers.js", WEB / "tm-endturn-helpers.js"),
    ("tm-keju-enke.js", WEB / "tm-keju-enke.js"),
    # 删角色
    ("tm-player-core.js", WEB / "tm-player-core.js"),
    ("tm-char-autogen.js", WEB / "tm-char-autogen.js"),
    # 删死代码
    ("tm-edict-parser.js", WEB / "tm-edict-parser.js"),
    # tests
    ("scripts/smoke-fiscal-reform-reconcile.js", WEB / "scripts" / "smoke-fiscal-reform-reconcile.js"),
    ("scripts/smoke-pvwf-income-flow.js", WEB / "scripts" / "smoke-pvwf-income-flow.js"),
    ("scripts/smoke-minxin-3dao-writeback.js", WEB / "scripts" / "smoke-minxin-3dao-writeback.js"),
    ("scripts/smoke-p5-gamma-edict.js", WEB / "scripts" / "smoke-p5-gamma-edict.js"),
    ("scripts/smoke-edict-parser-layered.js", WEB / "scripts" / "smoke-edict-parser-layered.js"),
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
tmp = Path("C:/Users/37814/Desktop/push-1284-payload.json")
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
