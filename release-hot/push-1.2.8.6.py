#!/usr/bin/env python3
"""GitHub Path B·1.2.8.6 推送（诏书御案 UI + 引擎治理后续）·仓库根=web/·照抄 1.2.8.5 跑通的 gh_api 双喂 stdin 写法 + retry"""
import base64, json, os, subprocess, time
from pathlib import Path
OWNER = "misfit-user"; REPO = "tianming"; BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
START_FROM = int(os.environ.get("PUSH_START_FROM", "1"))

BATCHES = [
    ("1.2.8.6·御笔亲诏·诏书面板全新御案三栏 UI(绢纸木轴朱砂印泥描金·议事清册立绘+纳入/删除·五类政令分色用印·实时预测·有司润色·主角行止·历史诏书·诏付有司·功能不减·纳入选类菜单+润色卡统一米金主题·修长日期挤没纳入删除·面板放大占屏) + 承接 1.2.8.5 吏治/民心/皇威治本方向引擎侧后续修订(endturn/authority/fiscal/keju/ai-change/integration-bridge) + 邸报", [
        ("changelog.json", WEB / "changelog.json"),
        ("phase8-formal-drafts.js", WEB / "phase8-formal-drafts.js"),
        ("tm-endturn-apply.js", WEB / "tm-endturn-apply.js"),
        ("tm-endturn-core.js", WEB / "tm-endturn-core.js"),
        ("tm-endturn-edict.js", WEB / "tm-endturn-edict.js"),
        ("tm-endturn-helpers.js", WEB / "tm-endturn-helpers.js"),
        ("tm-endturn-prompt.js", WEB / "tm-endturn-prompt.js"),
        ("tm-endturn-followup.js", WEB / "tm-endturn-followup.js"),
        ("tm-authority-complete.js", WEB / "tm-authority-complete.js"),
        ("tm-authority-engines.js", WEB / "tm-authority-engines.js"),
        ("tm-fiscal-engine.js", WEB / "tm-fiscal-engine.js"),
        ("tm-ai-change-applier.js", WEB / "tm-ai-change-applier.js"),
        ("tm-ai-change-army.js", WEB / "tm-ai-change-army.js"),
        ("tm-integration-bridge.js", WEB / "tm-integration-bridge.js"),
        ("tm-keju.js", WEB / "tm-keju.js"),
        ("tm-keju-enke.js", WEB / "tm-keju-enke.js"),
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
    for _ in range(5):
        rc, out, err = gh_api(["-X", "GET", f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", "--jq", ".object.sha"])
        if rc == 0 and out.strip():
            return out.strip()
        print(f"  get_sha retry rc={rc} {err[:120]}"); time.sleep(4)
    raise RuntimeError("get sha fail after 5 tries")

def push_batch(msg, files, idx):
    adds = []; raw = 0
    for rp, lp in files:
        if not lp.exists():
            print(f"  !! MISSING {lp}"); continue
        c = lp.read_bytes(); raw += len(c)
        adds.append({"path": rp, "contents": base64.b64encode(c).decode('ascii')})
    print(f"[batch {idx}] files {len(adds)} raw {raw/1024/1024:.2f}MB")
    head = get_main_sha(); print(f"  head={head[:12]}")
    mut = 'mutation($input: CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}'
    iv = {"branch": {"repositoryNameWithOwner": f"{OWNER}/{REPO}", "branchName": BRANCH},
          "message": {"headline": msg, "body": "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},
          "fileChanges": {"additions": adds}, "expectedHeadOid": head}
    payload = {"query": mut, "variables": {"input": iv}}
    tmp = Path(f"C:/Users/37814/Desktop/push-payload-{idx}.json"); tmp.write_text(json.dumps(payload), encoding='utf-8')
    print(f"  payload {tmp.stat().st_size/1024/1024:.2f}MB")
    for attempt in range(1, 5):
        rc, out, err = gh_api(["graphql", "--input", str(tmp)], stdin_path=str(tmp))
        if rc == 0:
            try:
                d = json.loads(out)
                if d.get("data") and d["data"].get("createCommitOnBranch"):
                    co = d["data"]["createCommitOnBranch"]["commit"]
                    print(f"  [OK] commit {co['oid'][:10]} {co['url']}"); tmp.unlink(); return True
                elif d.get("errors"):
                    print(f"  GraphQL errors {d['errors']}"); return False
            except Exception as e:
                print(f"  parse fail {e}\n  raw {out[:300]}")
        else:
            print(f"  attempt {attempt} FAIL rc={rc} ERR {err[:200]}")
        time.sleep(4)
    return False

if __name__ == "__main__":
    print(f"[push 1.2.8.6] {OWNER}/{REPO} branch={BRANCH} {len(BATCHES)} batch START_FROM={START_FROM}")
    ok = True
    for idx, (msg, files) in enumerate(BATCHES, 1):
        if idx < START_FROM:
            print(f"[skip {idx} done]"); continue
        if not push_batch(msg, files, idx):
            print(f"[STOP {idx}] resume: PUSH_START_FROM={idx} python push-1.2.8.6.py"); ok = False; break
        time.sleep(2)
    print("DONE" if ok else "INCOMPLETE")
