#!/usr/bin/env python3
"""GitHub Path B·1.2.8.7 推送·仓库根=web/·照 1.2.8.6 跑通写法。单 batch(小文件)。"""
import base64, json, os, subprocess, time
from pathlib import Path
OWNER = "misfit-user"; REPO = "tianming"; BRANCH = "main"
WEB = Path("C:/Users/37814/Desktop/tianming/web")
START_FROM = int(os.environ.get("PUSH_START_FROM", "1"))

_FILES = [
    "changelog.json",
    "tm-ai-change-narrative.js",
    "tm-ai-change-pathutils.js",
    "tm-authority-complete.js",
    "tm-endturn-ai.js",
    "tm-endturn-apply.js",
    "tm-endturn-edict.js",
    "tm-endturn-prompt.js",
    "tm-faction-action-engine.js",
    "tm-faction-npc-llm-decision.js",
    "tm-help-social.js",
    "tm-patches.js",
    "tm-player-settings.js",
    "tm-prompt-composer.js",
    "scripts/verify-revolt-local.js",
    "scripts/verify-ai-revolt-gate.js",
]
BATCHES = [
    ("1.2.8.7·难度三档真生效(叙事/标准/硬核接进推演) + 黑天鹅/强行转折按难度收束(叙事档顺应治绩·勿无故制造灾祸) + AI凭空叛军堵死(省名容错解析+民心闸+全国民心兜底+叛军规模按省人口封顶) + 官军平乱接皇威 + 各省民心并为一本真账(AI/势力叙事写div真值源·省份面板/民情图同源) + 政变弑君需皇权皇威正盛(P-QAM)",
     [(p, WEB / p) for p in _FILES]),
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
    print(f"[push 1.2.8.7] {OWNER}/{REPO} branch={BRANCH} {len(BATCHES)} batch START_FROM={START_FROM}")
    ok = True
    for idx, (msg, files) in enumerate(BATCHES, 1):
        if idx < START_FROM:
            print(f"[skip {idx} done]"); continue
        if not push_batch(msg, files, idx):
            print(f"[STOP {idx}] resume: PUSH_START_FROM={idx} python push-1.2.8.7.py"); ok = False; break
        time.sleep(2)
    print("DONE" if ok else "INCOMPLETE")
