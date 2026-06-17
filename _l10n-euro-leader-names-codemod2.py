# -*- coding: utf-8 -*-
"""欧洲人名汉化 · 第二刀（纠偏 + 补漏）。

① 恢复六位领袖 char 的 officialTitle 原文名注（第一刀误伤——
   该字段按既有设计存原文，参照雷约兹/塞雷索条目：name 中文 + officialTitle 原文）。
② family/郡望/lineage 展示字段 Silveira/Cerezo → 西尔维拉/塞雷索
   （上下文限定，不碰 officialTitle 里的 Juan Cerezo de Salamanca）。
③ backfill-npc-chars.js 生成器名单十个未翻 NPC 名补翻。
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

def both_spacings(pairs):
    out = []
    for old, new in pairs:
        out.append((old, new))
        out.append((old.replace('": "', '":"'), new.replace('": "', '":"')))
    return out

OFFICIAL_TITLE_RESTORE = both_spacings([
    ('"officialTitle": "Dom 马士加路也"', '"officialTitle": "Dom Francisco Mascarenhas"'),
    ('"officialTitle": "罗保"', '"officialTitle": "Dom Filipe Lobo da Silveira"'),
    ('"officialTitle": "德威特"', '"officialTitle": "Gerard Frederikszoon de With"'),
    ('"officialTitle": "彼得·纳茨"', '"officialTitle": "Pieter Nuyts"'),
    ('"officialTitle": "普特曼斯"', '"officialTitle": "Hans Putmans"'),
    ('"officialTitle": "尼尼奥·德·塔沃拉"', '"officialTitle": "Juan Niño de Tabora"'),
])

FAMILY_FIX = both_spacings([
    ('"family": "Silveira"', '"family": "西尔维拉"'),
    ('"郡望": "Silveira"', '"郡望": "西尔维拉"'),
    ('"lineage": "Silveira·', '"lineage": "西尔维拉·'),
    ('"family": "Cerezo"', '"family": "塞雷索"'),
    ('"郡望": "Cerezo"', '"郡望": "塞雷索"'),
    ('"lineage": "Cerezo·', '"lineage": "塞雷索·'),
])

BACKFILL_ROSTER = [
    ("Don Lopo Sarmento de Carvalho", "洛波·萨缅托·德·卡瓦略"),
    ("Aleixo Cellos", "阿莱绍·塞洛斯"),
    ("João Soares", "若昂·苏亚雷斯"),
    ("Pedro Marcondes", "佩德罗·马孔德斯"),
    ("Pieter de Carpentier", "彼得·德·卡彭蒂尔"),
    ("Cornelis Reijersen (舰队司令)", "雷约兹 (舰队司令)"),
    ("Maarten Sonck", "宋克"),
    ("Juan Cevicos", "胡安·塞维科斯"),
    ("Diego de Quiroga", "迭戈·德·基罗加"),
    ("Pedro de Heredia", "佩德罗·德·埃雷迪亚"),
]

BOM = b"\xef\xbb\xbf"

def main():
    grand = 0
    for rel in FILES:
        p = ROOT / rel
        raw = p.read_bytes()
        has_bom = raw.startswith(BOM)
        text = raw.decode("utf-8-sig")
        mapping = list(OFFICIAL_TITLE_RESTORE) + list(FAMILY_FIX)
        if rel.endswith("backfill-npc-chars.js"):
            mapping += BACKFILL_ROSTER
        per_file = []
        for old, new in mapping:
            n = text.count(old)
            if n:
                text = text.replace(old, new)
                per_file.append(f"{old[:40]} x{n}")
                grand += n
        out = text.encode("utf-8")
        if has_bom:
            out = BOM + out
        p.write_bytes(out)
        if rel.endswith(".json"):
            json.loads(text)
        status = "; ".join(per_file) if per_file else "(no hits)"
        print(f"{rel}: {status}")
    print(f"TOTAL pass-2 replacements: {grand}")

if __name__ == "__main__":
    main()
