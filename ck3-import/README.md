# CK3「天下(All Under Heaven)」东亚地图 → 天命 提取成果

## 来源
- CK3 mod **All Under Heaven / Oriental Empires**(`...workshop\1158310\2506311074`)出题/历史/文化/头衔/中文本地化
- **Smaller Map [All Under Heaven]**(`3488444772`)+ 游戏本体 `map_data`(provinces.png 13269色 / definition.csv / heightmap)出几何
- **移除西方**(`3595590101`)`default.map` 出海陆/不可通行掩码
- ⚠️ 版权:Paradox + mod 作者资产,**仅作描摹底图参考**,发版分发请重绘或取得授权。

## 产出文件(天命 GeoJSON,可直接导入 web/map-editor.html)
| 文件 | 内容 |
|---|---|
| `eastasia_counties.geojson` | 县级总览:中华 380 县(合并,带省/府/县中文层级)+ 四裔无头衔地块(各自成区) = 2202 区 |
| `eastasia_baronies.geojson` | 地块级全量:3059 个地块(中华有头衔 1237 + 四裔 1822),罗马字/中文名 |
| `eastasia_adminHierarchy.json` | 中华 25 省 → 府 → 县 嵌套层级(天命 adminHierarchy 格式,key=`fac_china`) |
| `eastasia_full_preview.png` | 总览预览图 |

## 坐标系
- **画布像素坐标**,原点左上,Y 向下;画布尺寸 `bitmapWidth×bitmapHeight`(见 metadata,约 1600×1566)
- 已加 `crs.properties.name = "tianming-canvas-coords"` → 编辑器**跳过投影直接用**(几何即 CK3 真实世界轮廓)

## feature.properties 字段
`id, name, level('county'|'district'), sheng(省), fu(府), xian(县), chao(朝),
group(分区), titled(是否有头衔), terrain, prosperity`

## 覆盖范围(按 group)
中华各省 + 塞北/西域/河西/吐蕃/东北/朝鲜/日本/缅甸/中南半岛/台湾/海南/菲律宾北部。
排除:婆罗洲/苏门答腊/爪哇/苏拉威西/马鲁古/努沙登加/新几内亚/菲律宾中南部/旧世界(欧洲·印度·中东等)。

## 质量分级(老实说)
1. **中华本部**:几何精确 + 中文省府县 + 层级 —— 金标准,直接可用。
2. **四裔(日本/朝鲜/缅甸/中南半岛/菲北等)**:几何精确,但**只有罗马字名、无省府县层级**(CK3 未给它们建头衔)。如 日本 Hakata/Iyo/Aki、菲 PHI_*。
3. **「东亚边地」≈245 块**:落在中华核心但无头衔、未归类的省份(地理在中国境内,可后续就近并入相邻省)。

## 复现脚本(本目录)
`analyze_components.py`(连通域+缓存) → `build_tianming_map.py`(选地+矢量化+输出)。
缓存:`id_img.npy / labels.npy / dm_cats.npz / cache_fullmap.npz / prov_cult.json`。
