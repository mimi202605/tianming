#!/usr/bin/env python3
"""GitHub Path B·1.2.8.5 推送（吏治接浊度+民心治本+P-5TK皇威+prompt教AI吐量）·仓库根=web/"""
import base64, json, os, subprocess, time
from pathlib import Path
OWNER = "misfit-user"; REPO = "tianming"; BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
START_FROM = int(os.environ.get("PUSH_START_FROM", "1"))

BATCHES = [
    ("1.2.8.5·吏治接浊度(肃贪诏令+处决官员降corruption源头→实征率回升/中央月入跟) + 民心治本(adjustMinxin摊回叶子源头不再被回合末聚合抹+向开局基线回归稳定器) + P-5TK皇威(天象/谶纬扣分衰减封顶+军胜接入huangweiDelta) + prompt教AI吐corruptionDelta/huangweiDelta+纠complianceDelta + 邸报 + 构建排除清单(playwright/_codex)", [
        ("changelog.json", WEB / "changelog.json"),
        ("tm-authority-engines.js", WEB / "tm-authority-engines.js"),
        ("tm-ai-change-applier.js", WEB / "tm-ai-change-applier.js"),
        ("tm-fiscal-engine.js", WEB / "tm-fiscal-engine.js"),
        ("tm-endturn-edict.js", WEB / "tm-endturn-edict.js"),
        ("tm-endturn-prompt.js", WEB / "tm-endturn-prompt.js"),
        ("tm-endturn-helpers.js", WEB / "tm-endturn-helpers.js"),
        ("tm-keju.js", WEB / "tm-keju.js"),
        ("tm-keju-enke.js", WEB / "tm-keju-enke.js"),
        ("tools/build-hot-update-package.js", WEB / "tools" / "build-hot-update-package.js"),
        ("scripts/verify-pdz-corruption.js", WEB / "scripts" / "verify-pdz-corruption.js"),
        ("scripts/verify-minxin-persist.js", WEB / "scripts" / "verify-minxin-persist.js"),
    ]),
]

def gh_api(args, stdin_path=None):
    cmd = ["gh", "api"] + args
    if stdin_path:
        with open(stdin_path, 'rb') as f:
            r = subprocess.run(cmd, capture_output=True, input=f.read())
            return r.returncode, r.stdout.decode('utf-8', 'replace'), r.stderr.decode('utf-8', 'replace')
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode, r.stdout, r.stderr

def get_main_sha():
    rc, out, err = gh_api(["-X", "GET", f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", "--jq", ".object.sha"])
    if rc != 0:
        raise RuntimeError(f"get sha fail rc={rc} {err[:300]}")
    return out.strip()

def push_batch(msg, files, idx):
    adds = []; raw = 0
    for rp, lp in files:
        if not lp.exists():
            print(f"  !! MISSING {lp}"); continue
        c = lp.read_bytes(); raw += len(c)
        adds.append({"path": rp, "contents": base64.b64encode(c).decode('ascii')})
    print(f"[batch {idx}] files {len(adds)} raw {raw/1024/1024:.2f}MB")
    if raw > 5 * 1024 * 1024:
        print("  !! WARN raw>5MB·base64后可能超GraphQL 10MB·考虑拆batch")
    head = get_main_sha(); print(f"  head={head}")
    mut = 'mutation($input: CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}'
    iv = {"branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
          "message": {"headline": msg, "body": "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},
          "fileChanges": {"additions": adds}, "expectedHeadOid": head}
    payload = {"query": mut, "variables": {"input": iv}}
    tmp = Path(f"C:/Users/37814/Desktop/push-payload-{idx}.json"); tmp.write_text(json.dumps(payload), encoding='utf-8')
    print(f"  payload {tmp.stat().st_size/1024/1024:.2f}MB")
    rc, out, err = gh_api(["graphql", "--input", str(tmp)], stdin_path=str(tmp))
    if rc != 0:
        print(f"  FAIL rc={rc}\n  OUT {out[:400]}\n  ERR {err[:400]}"); return False
    try:
        d = json.loads(out)
        if d.get("data") and d["data"].get("createCommitOnBranch"):
            co = d["data"]["createCommitOnBranch"]["commit"]
            print(f"  [OK] commit {co['oid'][:7]} {co['url']}"); tmp.unlink(); return True
        elif d.get("errors"):
            print(f"  GraphQL errors {d['errors']}"); return False
    except Exception as e:
        print(f"  parse fail {e}\n  raw {out[:400]}")
    return False

if __name__ == "__main__":
    print(f"[push 1.2.8.5] {OWNER}/{REPO} branch={BRANCH} {len(BATCHES)} batch START_FROM={START_FROM}")
    for idx, (msg, files) in enumerate(BATCHES, 1):
        if idx < START_FROM:
            print(f"[skip {idx} done]"); continue
        if not push_batch(msg, files, idx):
            print(f"[STOP {idx}] resume: PUSH_START_FROM={idx} python push-1.2.8.5.py"); break
        time.sleep(2)
    print("Done·gh api repos/" + OWNER + "/" + REPO + "/commits/main 验 HEAD")
