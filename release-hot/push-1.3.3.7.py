#!/usr/bin/env python3
"""1.3.3.7 GitHub Path B 源码推送·仓库根=web/"""
import base64, json, os, subprocess, time
from pathlib import Path
OWNER="misfit-user"; REPO="tianming"; BRANCH="main"
WEB=Path("C:/Users/37814/Desktop/tianming/web")
START_FROM=int(os.environ.get("PUSH_START_FROM","1"))
def w(p): return (p, WEB/p)
BATCHES=[
 ("1.3.3.7 part 1/3·official scenario bundle", [ w("tm-official-scenario-bundle.js") ]),
 ("1.3.3.7 part 2/3·changelog + large modules (office/death/l10n/fullscreen/party-class)", [
   w("changelog.json"), w("phase8-formal-bridge.js"), w("tm-endturn-apply.js"), w("tm-tinyi-v3.js"),
   w("tm-endturn-prompt.js"), w("phase8-formal-rightrail.js"), w("tm-player-core.js"),
   w("phase8-formal-map.js"), w("tm-patches.js") ]),
 ("1.3.3.7 part 3/3·remaining modules + index + version + baseline", [
   w("index.html"), w("version.json"), w(".hot-update-manifest.json"),
   w("tm-office-runtime.js"), w("tm-office-system.js"), w("tm-renwu-tuzhi.js"),
   w("tm-memorials.js"), w("tm-minxin-pressure-actions.js"), w("tm-minxin-responsibility-chain.js"),
   w("tm-save-lifecycle.js"), w("tm-char-economy-engine.js"), w("tm-class-engine.js"),
   w("tm-social-foundation.js"), w("tm-party-class-llm-calibrator.js"), w("tm-region-status.js"),
   w("tm-building-works.js"), w("tm-field-pipelines.js"), w("tm-fiscal-engine.js"),
   w("tm-endturn-core.js"), w("tm-ai-change-army.js"), w("tm-ai-output-validator.js"),
   w("tm-ai-planning.js"), w("tm-ai-schema.js"), w("tm-official-scenario-bundle.js".replace("tm-official-scenario-bundle.js","tm-ai-schema.js")) ]),
]
# 去重 part3 末尾误重
seen=set(); BATCHES[2]=(BATCHES[2][0],[x for x in BATCHES[2][1] if not (x[0] in seen or seen.add(x[0]))])
def gh_api(args, stdin_path=None):
    cmd=["gh","api"]+args
    if stdin_path:
        with open(stdin_path,'rb') as f:
            r=subprocess.run(cmd,capture_output=True,input=f.read())
            return r.returncode,r.stdout.decode('utf-8','replace'),r.stderr.decode('utf-8','replace')
    r=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8',errors='replace')
    return r.returncode,r.stdout,r.stderr
def head_sha():
    rc,out,err=gh_api(["-X","GET",f"repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}","--jq",".object.sha"])
    if rc!=0: raise RuntimeError("get sha fail "+err[:200])
    return out.strip()
def push(msg,files,idx):
    adds=[]; raw=0
    for rp,lp in files:
        if not lp.exists(): print("  !! MISSING",lp); continue
        c=lp.read_bytes(); raw+=len(c); adds.append({"path":rp,"contents":base64.b64encode(c).decode('ascii')})
    print(f"[batch {idx}] {msg}\n  files {len(adds)} raw {raw/1024/1024:.2f}MB")
    h=head_sha()
    mut='mutation($input: CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}'
    payload={"query":mut,"variables":{"input":{"branch":{"repositoryNameWithOwner":f"{OWNER}/{REPO}","branchName":BRANCH},"message":{"headline":msg,"body":"Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},"fileChanges":{"additions":adds},"expectedHeadOid":h}}}
    tmp=Path(f"C:/Users/37814/Desktop/push-payload-{idx}.json"); tmp.write_text(json.dumps(payload),encoding='utf-8')
    print(f"  payload {tmp.stat().st_size/1024/1024:.2f}MB")
    rc,out,err=gh_api(["graphql","--input",str(tmp)],stdin_path=str(tmp))
    if rc!=0: print("  FAIL rc",rc,"\n  ",err[:400]); return False
    d=json.loads(out)
    if d.get("data",{}).get("createCommitOnBranch"):
        print("  [OK]",d["data"]["createCommitOnBranch"]["commit"]["oid"][:7]); tmp.unlink(); return True
    print("  errors:",d.get("errors")); return False
if __name__=="__main__":
    print(f"[push] {OWNER}/{REPO} {len(BATCHES)} batches START={START_FROM}")
    for i,(m,f) in enumerate(BATCHES,1):
        if i<START_FROM: print("[skip",i,"]"); continue
        if not push(m,f,i): print(f"[STOP at {i}] resume: PUSH_START_FROM={i}"); break
        time.sleep(2)
    print("Done")
