# -*- coding: utf-8 -*-
"""欧洲势力领袖名汉化 codemod（撄宁 2026-06-09 反馈）。

天启七年剧本三家欧洲势力（葡萄牙·澳门 / 荷兰·台海 / 西班牙·马尼拉）的
领袖名仍是原文，统一换成立绘正则（tianqi7-1627.js:72）里已有的标准汉译名。
官衔原文（Capitão-mor / Gouverneur van Formosa 等）保留不动。
长名先换、短名兜底，防半截残留。
"""
import json
from pathlib import Path

ROOT = Path(r"C:\Users\37814\Desktop\tianming")

FILES = [
    r"web\scenarios\tianqi7-1627.js",
    r"web\godot\scenarios\tianqi7-1627.js",
    r"web\preview\official-scenarios-bundle.js",
    r"web\tm-official-scenario-bundle.js",
    r"web\data\scenario-supplements\tianqi7-official-runtime-snapshot.js",
    r"web\godot\data\scenario-supplements\tianqi7-official-runtime-snapshot.js",
    r"web\data\maps\tianqi-ming2\tianqi-ming2.admin-hierarchy.json",
    r"web\godot\data\maps\tianqi-ming2\tianqi-ming2.admin-hierarchy.json",
    r"web\data\maps\tianqi-ming2\tianqi-ming2.game-map.json",
    r"web\godot\data\maps\tianqi-ming2\tianqi-ming2.game-map.json",
    r"web\data\maps\tianqi-ming2\tianqi-ming2.scenario-fragment.json",
    r"web\godot\data\maps\tianqi-ming2\tianqi-ming2.scenario-fragment.json",
    r"web\godot\data\maps\tianqi-ming2\tianqi-ming2.preview-data.js",
    r"web\godot\data\scenarios\天启七年·九月（官方）.json",
    r"web\preview\scenario-editor-reset-data.js",
    r"web\preview\img\ming-1582-map-data.js",
    r"web\preview\phase8-b-shell-preview.html",
    r"web\scripts\backfill-npc-chars.js",
]

# 顺序敏感：长名在前
MAPPING = [
    ("D. Francisco Mascarenhas", "马士加路也"),
    ("Don Francisco Mascarenhas", "马士加路也"),
    ("Francisco Mascarenhas", "马士加路也"),
    ("Mascarenhas", "马士加路也"),
    ("Dom Filipe Lobo da Silveira", "罗保"),
    ("Filipe Lobo da Silveira", "罗保"),
    ("Lobo da Silveira", "罗保"),
    ("Dom Filipe Lobo", "罗保"),
    ("Gerard Frederikszoon de With", "德威特"),
    ("Gerard de With", "德威特"),
    ("de With", "德威特"),
    ("Pieter Nuyts", "彼得·纳茨"),
    ("Nuyts", "纳茨"),
    ("Hans Putmans", "普特曼斯"),
    ("Putmans", "普特曼斯"),
    ("Juan Niño de Tabora", "尼尼奥·德·塔沃拉"),
    ("Niño de Tabora", "尼尼奥·德·塔沃拉"),
    ("Niño", "尼尼奥"),
    ("Tabora", "塔沃拉"),
]

BOM = b"\xef\xbb\xbf"

def main():
    grand = 0
    for rel in FILES:
        p = ROOT / rel
        raw = p.read_bytes()
        has_bom = raw.startswith(BOM)
        text = raw.decode("utf-8-sig")
        per_file = []
        for old, new in MAPPING:
            n = text.count(old)
            if n:
                text = text.replace(old, new)
                per_file.append(f"{old} x{n}")
                grand += n
        out = text.encode("utf-8")
        if has_bom:
            out = BOM + out
        p.write_bytes(out)
        if rel.endswith(".json"):
            json.loads(text)  # 写回后立刻验 JSON 仍合法
        status = "; ".join(per_file) if per_file else "(no hits)"
        print(f"{rel}: {status}")
    print(f"TOTAL replacements: {grand}")

if __name__ == "__main__":
    main()
