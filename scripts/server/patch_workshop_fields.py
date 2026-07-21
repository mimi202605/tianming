#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""发布补齐·服务器侧补丁（2026-07-22·tm-workshop-cover-patch-v1）

给 /opt/tianming-online 的工坊上传路由补三样（客户端 1.3.4.x 批八已全线就位零害等点亮）：
  ① releaseNotes（更新说明·≤2000 字）入库并随 pack_public 下发；
  ② coverImage（封面图·png/jpg/jpeg/webp·≤2MB）落盘 pack 目录并新增 GET /workshop/cover?id= 路由；
  ③ 上传请求体上限放宽 +4MB（剧本满额时封面 base64 不再顶破 read_body）。

安全设计：先做数据库迁移并验列，验不过绝不动代码文件；改前逐文件备份 .bak-cover-<ts>；
改后 py_compile 语法校验，不过即原样回滚；锚点打不中会逐条明说（不蛮干）。
幂等：重复运行自动跳过已打段落。

用法（服务器上）：
  python3 patch_workshop_fields.py            # 打补丁
  python3 patch_workshop_fields.py --restart  # 打完顺手 systemctl restart tianming-online
"""

import base64  # noqa: F401  (仅为读者提示注入代码的依赖·目标文件本就 import)
import os
import py_compile
import re
import shutil
import sys
import time

TARGET_DIR = os.environ.get("TM_ONLINE_DIR", "/opt/tianming-online")
MARK = "tm-workshop-cover-patch-v1"
MIGRATIONS = (
    "ALTER TABLE workshop_packs ADD COLUMN release_notes TEXT DEFAULT ''",
    "ALTER TABLE workshop_packs ADD COLUMN cover_name TEXT DEFAULT ''",
)

CAPTURE_ANCHOR = 'with open(os.path.join(pack_dir, file_name), "wb") as f:\n                        f.write(raw)'
CAPTURE_BLOCK = '''
                    # %s · 封面+更新说明捕获
                    release_notes = str(data.get("releaseNotes") or "")[:2000]
                    cover_name = ""
                    _ci = data.get("coverImage") or None
                    if isinstance(_ci, dict) and _ci.get("contentBase64"):
                        try:
                            _craw = base64.b64decode(str(_ci.get("contentBase64") or ""))
                        except Exception:
                            _craw = b""
                        _cext = ""
                        _cn0 = str(_ci.get("name") or "").lower()
                        for _e in (".png", ".jpg", ".jpeg", ".webp"):
                            if _cn0.endswith(_e):
                                _cext = _e
                                break
                        if _craw and _cext and len(_craw) <= 2 * 1024 * 1024:
                            cover_name = "cover" + _cext
                            with open(os.path.join(pack_dir, cover_name), "wb") as _cf:
                                _cf.write(_craw)''' % MARK

SQL_COLS_OLD = "INSERT INTO workshop_packs(id,title,version,author_id,author_name,description,type,tags,package_url,sha256,size,created_at,updated_at,downloads,status,file_name,flags)"
SQL_COLS_NEW = "INSERT INTO workshop_packs(id,title,version,author_id,author_name,description,type,tags,package_url,sha256,size,created_at,updated_at,downloads,status,file_name,flags,release_notes,cover_name)"
SQL_VALS_OLD = "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,'pending',?,?)"
SQL_VALS_NEW = "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,'pending',?,?,?,?)"
SQL_CONF_OLD = "updated_at=excluded.updated_at, status='pending', file_name=excluded.file_name, flags=excluded.flags"
SQL_CONF_NEW = SQL_CONF_OLD + ", release_notes=excluded.release_notes, cover_name=excluded.cover_name"
SQL_PARM_OLD = "json.dumps(scan_flags, ensure_ascii=False)"
SQL_PARM_NEW = "json.dumps(scan_flags, ensure_ascii=False), release_notes, cover_name"
BODY_OLD = "read_body(self, MAX_UPLOAD_BYTES + 2 * 1024 * 1024)"
BODY_NEW = "read_body(self, MAX_UPLOAD_BYTES + 6 * 1024 * 1024)"

COVER_ROUTE = '''            if path == "/workshop/cover":  # %s
                _cqs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                _cpid = re.sub(r"[^a-z0-9_\\-]+", "-", str((_cqs.get("id") or [""])[0]).strip().lower())[:80]
                _ccon = db()
                try:
                    _crow = _ccon.execute("SELECT cover_name FROM workshop_packs WHERE id=?", (_cpid,)).fetchone()
                finally:
                    _ccon.close()
                _ccn = _crow["cover_name"] if (_crow is not None and "cover_name" in _crow.keys()) else ""
                _cfp = os.path.join(WORKSHOP_FILES_DIR, _cpid, _ccn) if _ccn else ""
                if not _ccn or not os.path.isfile(_cfp):
                    return self._error("\\u65e0\\u5c01\\u9762", 404)
                _cty = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(_ccn.rsplit(".", 1)[-1].lower(), "application/octet-stream")
                with open(_cfp, "rb") as _cf:
                    _cbl = _cf.read()
                self.send_response(200)
                self.send_header("Content-Type", _cty)
                self.send_header("Content-Length", str(len(_cbl)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(_cbl)
                return
''' % MARK

PACK_PUBLIC_WRAPPER = '''

# %s · pack_public 增列（releaseNotes / coverUrl）·包装原函数不改内部
def pack_public(row):
    d = _pack_public_base(row)
    try:
        _k = row.keys()
        if "release_notes" in _k and row["release_notes"]:
            d["releaseNotes"] = row["release_notes"]
        if "cover_name" in _k and row["cover_name"]:
            d["coverUrl"] = API_BASE + "/workshop/cover?id=" + str(row["id"])
    except Exception:
        pass
    return d
''' % MARK


def say(msg):
    print("[patch] " + msg)


def find_handler_files():
    hits = []
    for fn in sorted(os.listdir(TARGET_DIR)):
        if not fn.endswith(".py") or fn == os.path.basename(__file__):
            continue
        p = os.path.join(TARGET_DIR, fn)
        try:
            src = open(p, encoding="utf-8").read()
        except Exception:
            continue
        if 'if path == "/workshop/upload":' in src:
            hits.append(fn)
    return hits


def migrate_db(handler_files):
    """先迁库并验列·验不过返回 False（此时绝不动代码）。"""
    sys.path.insert(0, TARGET_DIR)
    for fn in handler_files:
        src = open(os.path.join(TARGET_DIR, fn), encoding="utf-8").read()
        if "if __name__" not in src:
            say("%s 无 __main__ 守卫·不敢 import 跳过" % fn)
            continue
        mod_name = fn[:-3]
        try:
            mod = __import__(mod_name)
            con = mod.db()
            for mig in MIGRATIONS:
                try:
                    con.execute(mig)
                except Exception:
                    pass  # 列已存在
            con.commit()
            cols = [r[1] for r in con.execute("PRAGMA table_info(workshop_packs)").fetchall()]
            con.close()
            if "release_notes" in cols and "cover_name" in cols:
                say("数据库迁移完成·workshop_packs 新列已验在（经 %s.db()）" % mod_name)
                return True
            say("迁移后验列失败：%s" % cols)
            return False
        except Exception as e:
            say("经 %s import 迁库失败：%s" % (mod_name, e))
    say("兜底：请手动执行  sqlite3 <库文件> \"%s; %s;\"  后重跑本脚本" % MIGRATIONS)
    return False


def patch_file(fn):
    p = os.path.join(TARGET_DIR, fn)
    src = open(p, encoding="utf-8").read()
    if MARK in src:
        say("%s 已打过（幂等跳过）" % fn)
        return True
    bak = p + ".bak-cover-" + time.strftime("%Y%m%d%H%M%S")
    shutil.copy2(p, bak)
    say("%s 备份 → %s" % (fn, os.path.basename(bak)))
    ok = True

    def sub_once(old, new, label):
        nonlocal src, ok
        n = src.count(old)
        if n == 1:
            src = src.replace(old, new)
            say("  ✓ " + label)
        else:
            say("  ✗ %s：锚点命中 %d 次（期望 1）·此段跳过" % (label, n))
            if label.startswith("[硬]"):
                ok = False

    sub_once(BODY_OLD, BODY_NEW, "[硬]请求体上限 +4MB")
    sub_once(CAPTURE_ANCHOR, CAPTURE_ANCHOR + CAPTURE_BLOCK, "[硬]封面/更新说明捕获块")
    sub_once(SQL_COLS_OLD, SQL_COLS_NEW, "[硬]INSERT 列清单")
    sub_once(SQL_VALS_OLD, SQL_VALS_NEW, "[硬]VALUES 占位")
    sub_once(SQL_CONF_OLD, SQL_CONF_NEW, "[硬]ON CONFLICT 更新列")
    sub_once(SQL_PARM_OLD, SQL_PARM_NEW, "[硬]参数元组")

    if 'if path == "/workshop/download"' in src:
        idx = src.index('            if path == "/workshop/download"')
        src = src[:idx] + COVER_ROUTE + src[idx:]
        say("  ✓ GET /workshop/cover 路由（插在 download 前）")
    else:
        say("  ✗ download 路由锚点未中·cover 路由未装（封面将存库但不可读）")

    if re.search(r"^def pack_public\(", src, re.M):
        src = re.sub(r"^def pack_public\(", "def _pack_public_base(", src, count=1, flags=re.M)
        src = src.rstrip("\n") + PACK_PUBLIC_WRAPPER
        say("  ✓ pack_public 包装（releaseNotes/coverUrl 下发）")
    else:
        say("  ✗ pack_public 定义未寻到·下发段未装")

    if "import urllib" not in src:
        src = re.sub(r"^(import [a-z_]+\n)", r"\1import urllib.parse\n", src, count=1, flags=re.M)
        say("  ✓ 补 import urllib.parse")

    if not ok:
        shutil.copy2(bak, p)
        say("%s 有硬锚点未中·已回滚原样（请把上面 ✗ 段落贴回给助手）" % fn)
        return False
    open(p, "w", encoding="utf-8").write(src)
    try:
        py_compile.compile(p, doraise=True)
        say("%s 语法校验 PASS" % fn)
        return True
    except Exception as e:
        shutil.copy2(bak, p)
        say("%s 语法校验失败已回滚：%s" % (fn, e))
        return False


def main():
    say("目标目录 " + TARGET_DIR)
    files = find_handler_files()
    if not files:
        say("未在任何 .py 里找到 /workshop/upload 路由·终止")
        sys.exit(1)
    say("含上传路由的文件：" + ", ".join(files))
    if not migrate_db(files):
        say("数据库迁移未确认·为保上传不炸·代码一律不动·终止")
        sys.exit(1)
    all_ok = all(patch_file(fn) for fn in files)
    if all_ok:
        say("全部完成。重启生效：systemctl restart tianming-online")
        if "--restart" in sys.argv:
            os.system("systemctl restart tianming-online")
            say("已重启 tianming-online")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
