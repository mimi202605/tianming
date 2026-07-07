#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tianming 服务器自动部署 poller — 发版最后一公里零人工（2026-07-07）。

在服务器上跑（python3·stdlib only·单文件）。装好后 owner 不再需要每版手跑 deploy.py。

安装（1Panel 终端·一次性）：
  curl -sL https://github.com/misfit-user/tianming/releases/download/autodeploy/server-autodeploy.py \
    -o /usr/local/bin/tianming-autodeploy.py && python3 /usr/local/bin/tianming-autodeploy.py --install

机制：
  dev 侧 release.js ⑫ 在「gh release 上传 + 资产审计全部通过」之后·才把
  latest-ship.txt（内容=ship-X.Y.Z.W）--clobber 到固定 release `autodeploy`——
  所以本 poller 永远看不到资产不全的半成品发版。
  cron 每 5 分钟 --tick：读指针 → 与已部署 tag 比 → 新则拉该版 deploy.py 执行。
  deploy.py 自带版本单调闸 / sha·sha512·size 三重校验 / 全原子写 / 「内容先 feed 最后」/
  幂等重跑——poller 只是薄触发器·不重复造校验。

安全阀：
  touch /etc/tianming-autodeploy.off   → 暂停（或 --off / --on）
  同一 tag 连续 5 次失败 → 挂起该 tag（换新 tag 自动恢复）·防死循环轰炸
  fcntl 文件锁 → tick 不重入（大包部署跑 20 分钟也不会叠第二个）

命令：
  --install    写 /etc/cron.d/tianming-autodeploy + 初始化状态（把当前指针记为已部署·不回放旧版）
  --tick       跑一轮检查（cron 调用）
  --status     显示状态 + 最近日志
  --on/--off   恢复/暂停
  --uninstall  移除 cron（保留状态与日志）
"""
import json, os, re, subprocess, sys, time, urllib.request

POINTER_URL = "https://github.com/misfit-user/tianming/releases/download/autodeploy/latest-ship.txt"
DEPLOY_URL = "https://github.com/misfit-user/tianming/releases/download/{tag}/deploy.py"
SELF_PATH = "/usr/local/bin/tianming-autodeploy.py"
STATE_DIR = "/var/lib/tianming-autodeploy"
STATE_FILE = STATE_DIR + "/state.json"
LOG_FILE = "/var/log/tianming-autodeploy.log"
LOCK_FILE = "/var/run/tianming-autodeploy.lock"
KILL_FILE = "/etc/tianming-autodeploy.off"
CRON_FILE = "/etc/cron.d/tianming-autodeploy"
MAX_FAILS_PER_TAG = 5
TAG_RE = re.compile(r"^ship-\d+\.\d+\.\d+\.\d+$")


def log(msg):
    line = time.strftime("[%Y-%m-%d %H:%M:%S] ") + msg
    print(line, flush=True)
    try:
        # 简单轮转·超 2MB 挪 .1（保一份旧的）
        if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > 2 * 1024 * 1024:
            os.replace(LOG_FILE, LOG_FILE + ".1")
        with open(LOG_FILE, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def read_state():
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {"lastTag": "", "fails": {}}


def write_state(st):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(st, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)


def fetch_pointer(tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(POINTER_URL, headers={"User-Agent": "tm-autodeploy/1"})
            raw = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace").strip()
            return raw
        except Exception as e:
            last = e
            time.sleep(3)
    raise RuntimeError("指针拉取失败: %s" % last)


def tick():
    if os.path.exists(KILL_FILE):
        return 0  # 暂停中·静默
    # 文件锁·防重入（上一轮大包部署还在跑时本轮直接让路）
    import fcntl
    os.makedirs(os.path.dirname(LOCK_FILE), exist_ok=True)
    lock = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return 0
    try:
        try:
            tag = fetch_pointer()
        except Exception as e:
            log("tick·%s" % e)
            return 0  # 网络抖动·下轮再来·不计失败
        if not TAG_RE.match(tag):
            log("tick·指针内容非法·%r·忽略" % tag[:80])
            return 0
        st = read_state()
        if tag == st.get("lastTag"):
            return 0  # 无新版·静默
        fails = st.get("fails", {})
        if fails.get(tag, 0) >= MAX_FAILS_PER_TAG:
            return 0  # 该 tag 已挂起（此前连续失败·换新 tag 自动恢复）·静默防刷日志
        log("发现新版 %s（已部署 %s）·拉取 deploy.py ..." % (tag, st.get("lastTag") or "无记录"))
        dp = "/tmp/tianming-autodeploy-deploy.py"
        try:
            req = urllib.request.Request(DEPLOY_URL.format(tag=tag), headers={"User-Agent": "tm-autodeploy/1"})
            data = urllib.request.urlopen(req, timeout=300).read()
            with open(dp + ".part", "wb") as fh:
                fh.write(data)
            os.replace(dp + ".part", dp)
        except Exception as e:
            log("deploy.py 下载失败·%s·下轮重试" % e)
            return 0  # 下载失败不计 fail（网络类·deploy 本身没跑）
        r = subprocess.run([sys.executable or "python3", dp],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=3600)
        out = (r.stdout or b"").decode("utf-8", "replace")
        for ln in out.splitlines():
            log("  [deploy] " + ln)
        if r.returncode == 0:
            st["lastTag"] = tag
            st["fails"] = {}
            st["deployedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
            write_state(st)
            log("✓ %s 部署成功" % tag)
        else:
            fails[tag] = fails.get(tag, 0) + 1
            st["fails"] = fails
            write_state(st)
            log("✗ %s 部署失败（exit %s·第 %d/%d 次）%s" % (
                tag, r.returncode, fails[tag], MAX_FAILS_PER_TAG,
                "·已挂起该 tag·修复后 touch 新 tag 或删 %s 里 fails 恢复" % STATE_FILE
                if fails[tag] >= MAX_FAILS_PER_TAG else "·下轮重试"))
        return 0
    finally:
        lock.close()


def install():
    if os.path.abspath(sys.argv[0]) != SELF_PATH and not os.path.exists(SELF_PATH):
        # 允许从任意位置装·自拷贝到标准位
        import shutil
        os.makedirs(os.path.dirname(SELF_PATH), exist_ok=True)
        shutil.copyfile(os.path.abspath(sys.argv[0]), SELF_PATH)
        log("已自拷贝到 " + SELF_PATH)
    os.makedirs(STATE_DIR, exist_ok=True)
    # 初始化：把当前指针记为已部署——装 poller 不应回放旧版（当前线上就是指针版）
    st = read_state()
    if not st.get("lastTag"):
        try:
            tag = fetch_pointer()
            if TAG_RE.match(tag):
                st["lastTag"] = tag
                write_state(st)
                log("初始化·当前指针 %s 记为已部署·此后只响应新发版" % tag)
        except Exception as e:
            log("初始化·指针暂不可达（%s）·首轮 tick 会当新版处理·deploy.py 幂等+单调闸兜底" % e)
    with open(CRON_FILE, "w", encoding="utf-8") as fh:
        fh.write("*/5 * * * * root /usr/bin/python3 " + SELF_PATH + " --tick >/dev/null 2>&1\n")
    os.chmod(CRON_FILE, 0o644)
    log("✓ 安装完成·cron 每 5 分钟一轮（%s）" % CRON_FILE)
    log("  暂停：touch %s（或 --off）·状态：--status·卸载：--uninstall" % KILL_FILE)
    tick()
    return 0


def status():
    st = read_state()
    print("已部署 tag : %s（%s）" % (st.get("lastTag") or "无记录", st.get("deployedAt", "-")))
    print("失败挂起   : %s" % (json.dumps(st.get("fails")) if st.get("fails") else "无"))
    print("暂停开关   : %s" % ("已暂停（%s 存在）" % KILL_FILE if os.path.exists(KILL_FILE) else "运行中"))
    print("cron       : %s" % ("已装" if os.path.exists(CRON_FILE) else "未装"))
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as fh:
            tail = fh.readlines()[-15:]
        print("── 最近日志 ──")
        for ln in tail:
            print("  " + ln.rstrip())
    except Exception:
        print("（暂无日志）")
    return 0


def main():
    if "--install" in sys.argv:
        return install()
    if "--tick" in sys.argv:
        return tick()
    if "--status" in sys.argv:
        return status()
    if "--off" in sys.argv:
        open(KILL_FILE, "w").close()
        print("已暂停·恢复用 --on")
        return 0
    if "--on" in sys.argv:
        try:
            os.remove(KILL_FILE)
        except FileNotFoundError:
            pass
        print("已恢复")
        return 0
    if "--uninstall" in sys.argv:
        try:
            os.remove(CRON_FILE)
        except FileNotFoundError:
            pass
        print("cron 已移除（状态/日志保留）")
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
