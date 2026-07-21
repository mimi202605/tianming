#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""工坊四类接口·服务器批Ⅰ v2（2026-07-22·tm-workshop-assets-patch-v2·须先跑 v1）

在 v1（封面/更新说明）之上补齐资产包管线（客户端 P1-S2c 已全线就位零害等点亮）：
  ① 类型感知校验：scenario 才跑剧本扫描；portrait/music/map/mod 资产包改验 zip 魔数
     （map/mod 亦容 JSON 文本包）；未知类型拒收；
  ② assets[] 资产清单（≤500 条·name/mood/duration）与 packageKind 入库并随 pack_public 下发
     ——点亮已建好的立绘画廊/音乐曲目/资源清单详情 UI；
  ③ galleryImages 商店展示图（≤6 张·png/jpg/jpeg/webp·单张≤1.5MB）落盘 pack 目录+
     新增 GET /workshop/shot?id=&i= 路由+pack_public 下发 [{name,url}]。

安全设计与 v1 同宗：先迁库验列、验不过绝不动码；逐文件备份；py_compile 不过即回滚；
锚点不中逐条明说；幂等可重跑；未打 v1 的文件直接拒绝并提示先跑 v1。
用法：python3 patch_workshop_fields_v2.py [--restart]
"""

import os
import py_compile
import re
import shutil
import sys
import time

TARGET_DIR = os.environ.get("TM_ONLINE_DIR", "/opt/tianming-online")
MARK_V1 = "tm-workshop-cover-patch-v1"
MARK = "tm-workshop-assets-patch-v2"
MIGRATIONS = (
    "ALTER TABLE workshop_packs ADD COLUMN assets TEXT DEFAULT '[]'",
    "ALTER TABLE workshop_packs ADD COLUMN package_kind TEXT DEFAULT ''",
    "ALTER TABLE workshop_packs ADD COLUMN gallery_names TEXT DEFAULT '[]'",
)

# ① 类型感知校验（替换无差别 scan_scenario 行）
SCAN_OLD = "ok_scan, scan_reason, scan_flags = scan_scenario(raw)"
SCAN_NEW = '''pack_type = str(data.get("type") or "scenario")[:32]  # %s
                if pack_type == "scenario":
                    ok_scan, scan_reason, scan_flags = scan_scenario(raw)
                elif pack_type in ("portrait", "music", "map", "mod"):
                    _is_zip = raw[:4] == b"PK\\x03\\x04"
                    _is_json = pack_type in ("map", "mod") and raw[:1] in (b"{", b"[")
                    ok_scan = _is_zip or _is_json
                    scan_reason = "" if ok_scan else "\\u8d44\\u4ea7\\u5305\\u987b\\u4e3a zip \\u6253\\u5305\\uff08map/mod \\u4ea6\\u5bb9 JSON \\u6587\\u672c\\uff09"
                    scan_flags = ["asset-pack:" + pack_type]
                else:
                    ok_scan, scan_reason, scan_flags = False, "\\u672a\\u77e5\\u7c7b\\u578b\\uff1a" + pack_type, []''' % MARK

# ② 资产清单/packageKind/画廊捕获（插在 v1 封面捕获块之后）
CAP_ANCHOR = '''                            with open(os.path.join(pack_dir, cover_name), "wb") as _cf:
                                _cf.write(_craw)'''
CAP_BLOCK = '''
                    # %s · 资产清单/packageKind/画廊捕获
                    _al = data.get("assets") if isinstance(data.get("assets"), list) else []
                    assets_json = json.dumps([
                        {"name": str((a or {}).get("name") or "")[:80],
                         "mood": str((a or {}).get("mood") or "")[:24],
                         "duration": str((a or {}).get("duration") or "")[:16]}
                        for a in _al[:500] if isinstance(a, dict) and a.get("name")
                    ], ensure_ascii=False)
                    package_kind = str(data.get("packageKind") or "")[:32]
                    _gnames = []
                    _gl = data.get("galleryImages") if isinstance(data.get("galleryImages"), list) else []
                    for _gi in range(min(len(_gl), 6)):
                        _g = _gl[_gi]
                        if not isinstance(_g, dict) or not _g.get("contentBase64"):
                            continue
                        try:
                            _graw = base64.b64decode(str(_g.get("contentBase64") or ""))
                        except Exception:
                            continue
                        _gext = ""
                        _gn0 = str(_g.get("name") or "").lower()
                        for _e in (".png", ".jpg", ".jpeg", ".webp"):
                            if _gn0.endswith(_e):
                                _gext = _e
                                break
                        if _graw and _gext and len(_graw) <= 1536 * 1024:
                            _gname = "shot%%d%%s" %% (_gi, _gext)
                            with open(os.path.join(pack_dir, _gname), "wb") as _gf:
                                _gf.write(_graw)
                            _gnames.append(_gname)
                    gallery_names = json.dumps(_gnames, ensure_ascii=False)''' % MARK

# ③ SQL 三列（锚=v1 产物）
SQL_COLS_OLD = "INSERT INTO workshop_packs(id,title,version,author_id,author_name,description,type,tags,package_url,sha256,size,created_at,updated_at,downloads,status,file_name,flags,release_notes,cover_name)"
SQL_COLS_NEW = "INSERT INTO workshop_packs(id,title,version,author_id,author_name,description,type,tags,package_url,sha256,size,created_at,updated_at,downloads,status,file_name,flags,release_notes,cover_name,assets,package_kind,gallery_names)"
SQL_VALS_OLD = "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,'pending',?,?,?,?)"
SQL_VALS_NEW = "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,'pending',?,?,?,?,?,?,?)"
SQL_CONF_OLD = "updated_at=excluded.updated_at, status='pending', file_name=excluded.file_name, flags=excluded.flags, release_notes=excluded.release_notes, cover_name=excluded.cover_name"
SQL_CONF_NEW = SQL_CONF_OLD + ", assets=excluded.assets, package_kind=excluded.package_kind, gallery_names=excluded.gallery_names"
SQL_PARM_OLD = "json.dumps(scan_flags, ensure_ascii=False), release_notes, cover_name"
SQL_PARM_NEW = "json.dumps(scan_flags, ensure_ascii=False), release_notes, cover_name, assets_json, package_kind, gallery_names"
# type 参数改用已判定的 pack_type（原句仍在 params 里）
TYPE_PARM_OLD = 'str(data.get("description") or "")[:2000], str(data.get("type") or "scenario")[:32],'
TYPE_PARM_NEW = 'str(data.get("description") or "")[:2000], pack_type,'

SHOT_ROUTE = '''            if path == "/workshop/shot":  # %s
                _sqs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
                _spid = re.sub(r"[^a-z0-9_\\-]+", "-", str((_sqs.get("id") or [""])[0]).strip().lower())[:80]
                try:
                    _sidx = int((_sqs.get("i") or ["0"])[0])
                except Exception:
                    _sidx = 0
                _scon = db()
                try:
                    _srow = _scon.execute("SELECT gallery_names FROM workshop_packs WHERE id=?", (_spid,)).fetchone()
                finally:
                    _scon.close()
                _sarr = []
                try:
                    _sarr = json.loads(_srow["gallery_names"]) if (_srow is not None and "gallery_names" in _srow.keys() and _srow["gallery_names"]) else []
                except Exception:
                    _sarr = []
                _sn = _sarr[_sidx] if (0 <= _sidx < len(_sarr) and re.match(r"^shot\\d+\\.(png|jpg|jpeg|webp)$", str(_sarr[_sidx] or ""))) else ""
                _sfp = os.path.join(WORKSHOP_FILES_DIR, _spid, _sn) if _sn else ""
                if not _sn or not os.path.isfile(_sfp):
                    return self._error("\\u65e0\\u6b64\\u5c55\\u793a\\u56fe", 404)
                _sty = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(_sn.rsplit(".", 1)[-1].lower(), "application/octet-stream")
                with open(_sfp, "rb") as _sf:
                    _sbl = _sf.read()
                self.send_response(200)
                self.send_header("Content-Type", _sty)
                self.send_header("Content-Length", str(len(_sbl)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(_sbl)
                return
''' % MARK

PACK_PUBLIC_WRAPPER = '''

# %s · pack_public 增列（assets / packageKind / galleryImages）·链式包装 v1
def pack_public(row):
    d = _pack_public_v1(row)
    try:
        _k = row.keys()
        if "assets" in _k and row["assets"]:
            try:
                _pa = json.loads(row["assets"])
                if isinstance(_pa, list) and _pa:
                    d["assets"] = _pa
            except Exception:
                pass
        if "package_kind" in _k and row["package_kind"]:
            d["packageKind"] = row["package_kind"]
        if "gallery_names" in _k and row["gallery_names"]:
            try:
                _gn = json.loads(row["gallery_names"])
                if isinstance(_gn, list) and _gn:
                    d["galleryImages"] = [{"name": _n, "url": API_BASE + "/workshop/shot?id=" + str(row["id"]) + "&i=" + str(_i)} for _i, _n in enumerate(_gn)]
            except Exception:
                pass
    except Exception:
        pass
    return d
''' % MARK


def say(msg):
    print("[patch-v2] " + msg)


def find_handler_files():
    hits = []
    for fn in sorted(os.listdir(TARGET_DIR)):
        if not fn.endswith(".py") or fn.startswith("patch_workshop"):
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
    sys.path.insert(0, TARGET_DIR)
    for fn in handler_files:
        src = open(os.path.join(TARGET_DIR, fn), encoding="utf-8").read()
        if "if __name__" not in src:
            continue
        mod_name = fn[:-3]
        try:
            mod = __import__(mod_name)
            con = mod.db()
            for mig in MIGRATIONS:
                try:
                    con.execute(mig)
                except Exception:
                    pass
            con.commit()
            cols = [r[1] for r in con.execute("PRAGMA table_info(workshop_packs)").fetchall()]
            con.close()
            if all(c in cols for c in ("assets", "package_kind", "gallery_names")):
                say("数据库迁移完成·三新列已验在（经 %s.db()）" % mod_name)
                return True
            say("迁移后验列失败：%s" % cols)
            return False
        except Exception as e:
            say("经 %s import 迁库失败：%s" % (mod_name, e))
    say("兜底：请手动执行三条 ALTER 后重跑：%s" % "; ".join(MIGRATIONS))
    return False


def patch_file(fn):
    p = os.path.join(TARGET_DIR, fn)
    src = open(p, encoding="utf-8").read()
    if MARK in src:
        say("%s 已打过 v2（幂等跳过）" % fn)
        return True
    if MARK_V1 not in src:
        say("%s 未打 v1——请先跑 patch_workshop_fields.py 再跑本脚本" % fn)
        return False
    bak = p + ".bak-assets-" + time.strftime("%Y%m%d%H%M%S")
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
            say("  ✗ %s：锚点命中 %d 次（期望 1）" % (label, n))
            ok = False

    sub_once(SCAN_OLD, SCAN_NEW, "类型感知校验（scenario 才跑剧本扫描·资产包验 zip/JSON·未知类型拒收）")
    sub_once(CAP_ANCHOR, CAP_ANCHOR + CAP_BLOCK, "资产清单/packageKind/画廊捕获块")
    sub_once(SQL_COLS_OLD, SQL_COLS_NEW, "INSERT 列清单 +3")
    sub_once(SQL_VALS_OLD, SQL_VALS_NEW, "VALUES 占位 +3")
    sub_once(SQL_CONF_OLD, SQL_CONF_NEW, "ON CONFLICT 更新列 +3")
    sub_once(SQL_PARM_OLD, SQL_PARM_NEW, "参数元组 +3")
    sub_once(TYPE_PARM_OLD, TYPE_PARM_NEW, "type 参数改用已判定 pack_type")

    if 'if path == "/workshop/cover":' in src:
        idx = src.index('            if path == "/workshop/cover":')
        src = src[:idx] + SHOT_ROUTE + src[idx:]
        say("  ✓ GET /workshop/shot 画廊路由（插在 cover 前）")
    else:
        say("  ✗ cover 路由锚点未中·shot 路由未装")
        ok = False

    if re.search(r"^def pack_public\(", src, re.M):
        src = re.sub(r"^def pack_public\(", "def _pack_public_v1(", src, count=1, flags=re.M)
        src = src.rstrip("\n") + PACK_PUBLIC_WRAPPER
        say("  ✓ pack_public 链式包装 v2（assets/packageKind/galleryImages 下发）")
    else:
        say("  ✗ pack_public 定义未寻到")
        ok = False

    if not ok:
        shutil.copy2(bak, p)
        say("%s 有锚点未中·已回滚原样（把 ✗ 段贴回给助手）" % fn)
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
        say("未找到 /workshop/upload 路由·终止")
        sys.exit(1)
    say("含上传路由的文件：" + ", ".join(files))
    if not migrate_db(files):
        say("数据库迁移未确认·代码一律不动·终止")
        sys.exit(1)
    all_ok = all(patch_file(fn) for fn in files)
    if all_ok:
        say("v2 全部完成。重启生效：systemctl restart tianming-online")
        if "--restart" in sys.argv:
            os.system("systemctl restart tianming-online")
            say("已重启 tianming-online")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
