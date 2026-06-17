// @ts-check
/// <reference path="types.d.ts" />
/*
 * tm-faction-paradigm.js — 势力 paradigm 识别工具 (Phase D1·2026-05-10)
 *
 * 把 detectParadigm 抽出来·让 derived-economy / npc-memorial / npc-edict /
 * backfill-npc-parity / backfill-npc-chars 5 处共用同一份·避免漂移。
 *
 * 修复 D1 bug: 旧版 culture branch `/中原帝国|汉/.test(t)` 太宽
 *   - 后金 culture="女真+汉+蒙古复合" 含"汉"·被错判 central_empire
 *   - 播州土司 culture="苗汉混合" 含"汉"·被错判 central_empire
 * 修案: paradigm 只看 name pattern·不读 culture/ideology
 */
(function(global) {
  'use strict';

  function detect(facName, fac) {
    if (!facName) return 'generic';
    var n = facName;

    if (/后金|金国|大金|清朝|满清/.test(n)) return 'manchu_empire';
    if (/察哈尔|科尔沁|土默特|喀尔喀|准噶尔|和硕特|杜尔伯特/.test(n)) return 'mongol_tribe';
    if (/蒙古/.test(n)) return 'mongol_tribe';
    if (/朝鲜|高丽|大韩/.test(n)) return 'tributary_kingdom';
    if (/葡萄牙|荷兰|西班牙|英国|英吉利|耶稣会|马尼拉|澳门|台海|大员|VOC|东印度公司/.test(n)) return 'european_outpost';
    if (/海商|海盗|郑芝龙|郑氏|颜思齐|海寇/.test(n)) return 'maritime_merchant';
    if (/土司|杨氏|奢氏|安氏|播州|水西|永宁|宣慰使|宣抚使/.test(n)) return 'native_chieftain';
    if (/饥民|起义|流寇|义军|叛军|联军|八字军|绿林/.test(n)) return 'rebellion';
    if (/节度|藩镇|西军|关陕|御营/.test(n)) return 'military_jiedushi';
    if (/镇$/.test(n)) return 'military_jiedushi';
    if (/契丹|耶律|党项|残部|遗裔|遗民/.test(n)) return 'remnant_dynasty';
    if (/明朝廷|大明|宋朝廷|大宋|大唐|大汉朝廷|皇明|皇宋|南明|北明|^明$/.test(n)) return 'central_empire';

    return 'generic';
  }

  global.TM = global.TM || {};
  global.TM.FactionParadigm = {
    detect: detect,
    PARADIGMS: ['central_empire', 'manchu_empire', 'mongol_tribe', 'tributary_kingdom',
      'european_outpost', 'maritime_merchant', 'native_chieftain', 'rebellion',
      'military_jiedushi', 'remnant_dynasty', 'generic']
  };

  // Node.js export·让 scripts/ 能 require
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detect: detect };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis));
