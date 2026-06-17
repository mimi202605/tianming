#!/usr/bin/env python3
"""1.3.4.0 GitHub Path B 源码推送·档2(全代码+邸报+smoke·排除preview/backups/godot/_screenshots大杂物)·仓库根=web/"""
import base64, json, os, subprocess, time
from pathlib import Path
OWNER="misfit-user"; REPO="tianming"; BRANCH="main"
WEB=Path("C:/Users/37814/Desktop/tianming/web")
REL=Path("C:/Users/37814/Desktop/tianming/release-hot")
START_FROM=int(os.environ.get("PUSH_START_FROM","1"))
def BIG(p): return p.startswith(("preview/","backups/","_screenshots/","godot/")) or ("broken-encoding" in p) or ("__recover_" in p)
allf=json.loads((REL/"changed-1340.json").read_text(encoding="utf-8"))
files=[p for p in allf if not BIG(p)]
# 批分:累计 raw <= 2MB
BATCH_MAX=2*1024*1024
batches=[]; cur=[]; cursz=0
for p in files:
    lp=WEB/p
    if not lp.exists(): print("  !! MISSING",p); continue
    sz=lp.stat().st_size
    if cur and cursz+sz>BATCH_MAX:
        batches.append(cur); cur=[]; cursz=0
    cur.append(p); cursz+=sz
if cur: batches.append(cur)
N=len(batches)
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
def push(msg,paths,idx):
    adds=[]; raw=0
    for rp in paths:
        lp=WEB/rp
        if not lp.exists(): print("  !! MISSING",lp); continue
        c=lp.read_bytes(); raw+=len(c); adds.append({"path":rp,"contents":base64.b64encode(c).decode('ascii')})
    print(f"[batch {idx}/{N}] {msg}\n  files {len(adds)} raw {raw/1024/1024:.2f}MB")
    h=head_sha()
    mut='mutation($input: CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid url}}}'
    payload={"query":mut,"variables":{"input":{"branch":{"repositoryNameWithOwner":f"{OWNER}/{REPO}","branchName":BRANCH},"message":{"headline":msg,"body":"Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"},"fileChanges":{"additions":adds},"expectedHeadOid":h}}}
    tmp=Path(f"C:/Users/37814/Desktop/push14-payload-{idx}.json"); tmp.write_text(json.dumps(payload),encoding='utf-8')
    print(f"  payload {tmp.stat().st_size/1024/1024:.2f}MB head {h[:7]}")
    rc,out,err=gh_api(["graphql","--input",str(tmp)],stdin_path=str(tmp))
    if rc!=0: print("  FAIL rc",rc,"\n  ",err[:400]); return False
    d=json.loads(out)
    if d.get("data",{}).get("createCommitOnBranch"):
        print("  [OK]",d["data"]["createCommitOnBranch"]["commit"]["oid"][:7]); tmp.unlink(); return True
    print("  errors:",json.dumps(d.get("errors"))[:400]); return False
if __name__=="__main__":
    print(f"[push] {OWNER}/{REPO} {len(files)} files in {N} batches (raw {sum((WEB/p).stat().st_size for p in files)/1024/1024:.2f}MB) START={START_FROM}")
    ok=True
    for i,paths in enumerate(batches,1):
        if i<START_FROM: print("[skip",i,"]"); continue
        msg=f"1.3.4.0 part {i}/{N}: source sync to current local (deepen fixes + accumulated work) + changelog"
        if not push(msg,paths,i): print(f"[STOP at {i}] resume: PUSH_START_FROM={i}"); ok=False; break
        time.sleep(2)
    print("Done" if ok else "Incomplete")
