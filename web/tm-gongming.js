/*
 * ============================================================
 *  天命 · 功名系统 — 出身资格层 (tm-gongming.js)
 *  -----------------------------------------------------------
 *  功名 = 资格(出身) ⊕ 政绩(virtueMerit)。本模块管「资格」半边，与 tm-promotion.js 的「政绩」半边合流。
 *
 *  真源字段: char.resources.gongming (结构化出身对象)。政绩仍走 char.resources.virtueMerit(tm-promotion)。
 *  结构: { path, tier, honors[], tierRank, zhengtu, liupin, ceiling, youmian, source, grantedTurn, _derivedScale }
 *    · path     出身路径(科举/门荫/纳赀/军功/吏进/荐辟/布衣) — 朝代通用枚举
 *    · tier     科第等第名(进士/举人/生员…) — 来自可剧本覆盖的 GONGMING_LADDER 预设
 *    · honors[] 荣衔(翰林/庶吉士/状元/科道…) — 叠加修正
 *    · tierRank 0-100 等第高下(排序/比较)
 *    · zhengtu  正途(true)/异途(false) — 派生
 *    · liupin   清流 qing / 中流 mid / 浊流 zhuo / 武班 wu — 派生
 *    · ceiling  仕途天花板 level(1=正一品上限·与 tm-promotion 同 18 级制) — 派生
 *    · youmian  个人优免额(免役丁数) — 派生·接赋税/户籍优免个人层面
 *
 *  设计文档: web/docs/gongming-system-design-2026-06.md
 *  朝代中立: 引擎只放中立框架；具体科第名是默认预设(科举时代通用)·剧本可整表覆盖(GM.scenario.gongmingLadder)。
 * ============================================================
 */
(function (global) {
  'use strict';

  var DERIVE_VER = 1; // derive 版本·改派生规则时 +1 触发全量重派生

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // ── 出身路径元数据(朝代通用) ──
  var PATH_META = {
    keju:     { label: '科举', zheng: true,  liupin: 'mid',  desc: '科第正途' },
    menyin:   { label: '门荫', zheng: true,  liupin: 'mid',  desc: '荫叙入仕' },
    nazi:     { label: '纳赀', zheng: false, liupin: 'zhuo', desc: '捐纳异途' },
    junggong: { label: '军功', zheng: true,  liupin: 'wu',   desc: '军功授官' },
    lijin:    { label: '吏进', zheng: false, liupin: 'zhuo', desc: '吏员升流·杂途' },
    jianxuan: { label: '荐辟', zheng: true,  liupin: 'mid',  desc: '荐辟征召' },
    buyi:     { label: '布衣', zheng: false, liupin: 'zhuo', desc: '未有功名' }
  };

  var LIUPIN_LABEL = { qing: '清流', mid: '中流', zhuo: '浊流', wu: '武班' };

  // ── 默认科第阶梯预设(科举时代通用·剧本可整表覆盖) ──
  //   tier → { path, tierRank, ceiling(1-18·小=高品), youmian, liupin?, zhengtu? }
  var GONGMING_LADDER_DEFAULT = {
    '进士':  { path: 'keju',     tierRank: 90, ceiling: 1,  youmian: 16 },
    '举人':  { path: 'keju',     tierRank: 62, ceiling: 7,  youmian: 8 },
    '贡生':  { path: 'keju',     tierRank: 50, ceiling: 9,  youmian: 6 },
    '监生':  { path: 'keju',     tierRank: 42, ceiling: 9,  youmian: 6 },
    '生员':  { path: 'keju',     tierRank: 30, ceiling: 13, youmian: 2 },
    '例监':  { path: 'nazi',     tierRank: 38, ceiling: 10, youmian: 4, liupin: 'zhuo', zhengtu: false },
    '荫生':  { path: 'menyin',   tierRank: 55, ceiling: 7,  youmian: 8 },
    '武进士': { path: 'junggong', tierRank: 80, ceiling: 2,  youmian: 10, liupin: 'wu' },
    '武举':  { path: 'junggong', tierRank: 58, ceiling: 5,  youmian: 6,  liupin: 'wu' },
    '吏员':  { path: 'lijin',    tierRank: 22, ceiling: 11, youmian: 1,  liupin: 'zhuo', zhengtu: false }
  };

  // ── 荣衔修正 ──
  //   liupin: 覆盖清浊流; ceilingTo: 抬天花板至(取 min); tierRankAdd: 等第加成
  var HONOR_MODS = {
    '庶吉士': { liupin: 'qing', ceilingTo: 1, tierRankAdd: 6, tag: '储相' },
    '翰林':   { liupin: 'qing', ceilingTo: 1, tierRankAdd: 4 },
    '科道':   { liupin: 'qing', tierRankAdd: 2, tag: '言路' },
    '状元':   { tierRankAdd: 8 },
    '榜眼':   { tierRankAdd: 6 },
    '探花':   { tierRankAdd: 5 },
    '传胪':   { tierRankAdd: 3 },
    '会元':   { tierRankAdd: 3 },
    '解元':   { tierRankAdd: 3 }
  };

  // ── learning 串 → 出身解析关键字(序敏感·先特指后泛指) ──
  var TIER_KEYWORDS = [
    { re: /武进士/,                       tier: '武进士', path: 'junggong' },
    { re: /武举|武乡试/,                   tier: '武举',   path: 'junggong' },
    { re: /例监|例贡|捐监|捐贡|纳监|捐纳/, tier: '例监',   path: 'nazi' },
    { re: /荫生|荫监|荫补|荫叙|恩荫|任子/, tier: '荫生',   path: 'menyin' },
    { re: /进士/,                         tier: '进士',   path: 'keju' },
    { re: /贡生|岁贡|拔贡|恩贡|副贡|优贡/, tier: '贡生',   path: 'keju' },
    { re: /监生|国子监|太学/,             tier: '监生',   path: 'keju' },
    { re: /举人|乡试|孝廉/,               tier: '举人',   path: 'keju' },
    { re: /生员|秀才|庠生|廪生|增生|附生|诸生/, tier: '生员', path: 'keju' },
    { re: /吏员|吏出身|掾史|令史|书办/,   tier: '吏员',   path: 'lijin' }
  ];

  // honor 关键字 → 规范荣衔(给事中/御史/言官 归并 科道)
  function honorsFromText(s) {
    var out = [];
    function push(h) { if (out.indexOf(h) < 0) out.push(h); }
    ['庶吉士', '翰林', '状元', '榜眼', '探花', '传胪', '会元', '解元'].forEach(function (h) { if (s.indexOf(h) >= 0) push(h); });
    if (/科道|给事中|御史|言官|都察院|六科/.test(s)) push('科道');
    // 一甲(状元/榜眼/探花)直授翰林·隐含清流
    if (out.indexOf('状元') >= 0 || out.indexOf('榜眼') >= 0 || out.indexOf('探花') >= 0) push('翰林');
    return out;
  }

  // 解析 learning(字符串=出身串·数字=误用学术分·空=null)
  function parseLearning(raw) {
    if (raw == null) return null;
    if (typeof raw === 'number') return { _academicScore: raw }; // learning 误用为数字·非出身
    var s = String(raw).trim();
    if (!s) return null;
    var tier = '', path = '';
    for (var i = 0; i < TIER_KEYWORDS.length; i += 1) {
      if (TIER_KEYWORDS[i].re.test(s)) { tier = TIER_KEYWORDS[i].tier; path = TIER_KEYWORDS[i].path; break; }
    }
    var honors = honorsFromText(s);
    if (!tier && !honors.length) return null;
    if (!path) path = 'keju';
    return { path: path, tier: tier, honors: honors, source: 'scenario' };
  }

  // 活跃阶梯(默认 + 剧本覆盖·浅合并)
  var _ladderCache = null, _ladderKey = null;
  function activeLadder(G) {
    G = G || (typeof GM !== 'undefined' ? GM : null);
    var ov = (G && G.scenario && G.scenario.gongmingLadder)
      || (typeof P !== 'undefined' && P && P.gongmingLadder) || null;
    if (!ov) return GONGMING_LADDER_DEFAULT;
    if (_ladderCache && _ladderKey === ov) return _ladderCache;
    var merged = {};
    Object.keys(GONGMING_LADDER_DEFAULT).forEach(function (k) { merged[k] = GONGMING_LADDER_DEFAULT[k]; });
    Object.keys(ov).forEach(function (k) { merged[k] = ov[k]; });
    _ladderCache = merged; _ladderKey = ov;
    return merged;
  }

  function pathDefault(path) {
    var pm = PATH_META[path] || PATH_META.buyi;
    return { path: path, tierRank: 0, ceiling: 14, youmian: 0, liupin: pm.liupin, zhengtu: pm.zheng };
  }

  // 派生 tierRank / zhengtu / liupin / ceiling / youmian(就地写 g)
  function deriveFields(g, ch, G) {
    var ladder = activeLadder(G);
    var base = (g.tier && ladder[g.tier]) ? ladder[g.tier] : pathDefault(g.path || 'buyi');
    var pm = PATH_META[g.path] || PATH_META.buyi;
    var tierRank = base.tierRank != null ? base.tierRank : 0;
    var ceiling = base.ceiling != null ? base.ceiling : 14;
    var youmian = base.youmian != null ? base.youmian : 0;
    var liupin = base.liupin || pm.liupin || 'mid';
    var zheng = base.zhengtu != null ? base.zhengtu : (pm.zheng != null ? pm.zheng : false);
    var tags = [];
    (g.honors || []).forEach(function (h) {
      var m = HONOR_MODS[h]; if (!m) return;
      if (m.liupin) liupin = m.liupin;
      if (m.ceilingTo != null) ceiling = Math.min(ceiling, m.ceilingTo);
      if (m.tierRankAdd) tierRank += m.tierRankAdd;
      if (m.tag && tags.indexOf(m.tag) < 0) tags.push(m.tag);
    });
    g.tierRank = clamp(Math.round(tierRank), 0, 100);
    g.ceiling = clamp(ceiling, 1, 18);
    g.youmian = Math.max(0, Math.round(youmian));
    g.liupin = liupin;
    g.zhengtu = !!zheng;
    if (tags.length) g.tags = tags; else if (g.tags) delete g.tags;
    return g;
  }

  // 无 learning → 按官职/品级推定出身(保守·标 source:'inferred'·剧本可覆盖)
  function inferFromOffice(ch, G) {
    var lv = (global.TMPromotion && TMPromotion.resolveRankLevel) ? TMPromotion.resolveRankLevel(ch, G) : 18;
    var title = String((ch && (ch.officialTitle || ch.title)) || '');
    var isMartial = /将|帅|总兵|参将|游击|都督|都司|卫|所|提督|镇|戎|武|副将|守备|千户|百户|指挥/.test(title)
      || (ch && (ch.role === 'martial' || ch.role === 'general' || ch.role === 'military'));
    var hasOffice = !!(ch && (ch.officialTitle || ch.title));
    var g;
    if (isMartial) {
      g = { path: 'junggong', tier: lv <= 5 ? '武进士' : '武举', honors: [], source: 'inferred' };
    } else if (!hasOffice) {
      g = { path: 'buyi', tier: '', honors: [], source: 'inferred' };
    } else if (lv <= 7) {
      g = { path: 'keju', tier: '进士', honors: [], source: 'inferred' }; // 正四品及上文官·多进士
    } else if (lv <= 13) {
      g = { path: 'keju', tier: '举人', honors: [], source: 'inferred' };
    } else {
      g = { path: 'keju', tier: '生员', honors: [], source: 'inferred' };
    }
    return g;
  }

  // 幂等保证 ch 有结构化出身·返回它
  function ensureGongming(ch, G) {
    if (!ch) return null;
    G = G || (typeof GM !== 'undefined' ? GM : null);
    if (!ch.resources) ch.resources = {};
    var g = ch.resources.gongming;
    if (g && typeof g === 'object' && g._derivedScale === DERIVE_VER) return g;
    if (!g || typeof g !== 'object') {
      // 优先剧本显式出身字段·次解析 learning·末按官职推定
      if (ch.gongmingOrigin && typeof ch.gongmingOrigin === 'object') {
        g = { path: ch.gongmingOrigin.path, tier: ch.gongmingOrigin.tier, honors: (ch.gongmingOrigin.honors || []).slice(), source: 'scenario' };
      } else {
        g = parseLearning(ch.learning);
        if (!g || (!g.path && g._academicScore != null)) {
          var acad = g && g._academicScore;
          g = inferFromOffice(ch, G);
          if (acad != null) g._academicScore = acad;
        }
      }
    }
    if (!g.honors) g.honors = [];
    if (!g.source) g.source = 'inferred';
    if (g.grantedTurn == null) g.grantedTurn = (G && G.turn) || 0;
    deriveFields(g, ch, G);
    g._derivedScale = DERIVE_VER;
    ch.resources.gongming = g;
    return g;
  }

  // 仕途天花板 level(有效)= min(出身典型上限, 现品)·只挡未来逾越·绝不贬黜既成事实
  function ceilingLevel(ch, G) {
    var g = ensureGongming(ch, G);
    var raw = g.ceiling || 14;
    var cur = (global.TMPromotion && TMPromotion.resolveRankLevel) ? TMPromotion.resolveRankLevel(ch, G) : 18;
    return Math.min(raw, cur);
  }

  // 该员凭出身能否升至 targetLevel(小=高品)：不高于出身典型上限·或已身居其上
  function canReach(ch, targetLevel, G) {
    var g = ensureGongming(ch, G);
    var raw = g.ceiling || 14;
    if (targetLevel >= raw) return true;
    var cur = (global.TMPromotion && TMPromotion.resolveRankLevel) ? TMPromotion.resolveRankLevel(ch, G) : 18;
    return targetLevel >= cur;
  }

  // 越出身天花板的级差(≥0·用于加重越级强擢惩罚)
  function ceilingGap(ch, targetLevel, G) {
    var g = ensureGongming(ch, G);
    var raw = g.ceiling || 14;
    if (canReach(ch, targetLevel, G)) return 0;
    return Math.max(0, raw - targetLevel);
  }

  // ── 标签/展示助手 ──
  function pathLabel(p) { return (PATH_META[p] && PATH_META[p].label) || '布衣'; }
  function liupinLabel(l) { return LIUPIN_LABEL[l] || '中流'; }
  function rankNameOf(level) {
    if (global.TMPromotion && TMPromotion.rankNameOf) return TMPromotion.rankNameOf(level);
    return '第' + level + '级';
  }

  // 富展示对象(图志/AI 用)
  function describe(ch, G) {
    var g = ensureGongming(ch, G);
    var pl = pathLabel(g.path);
    return {
      path: g.path, pathLabel: pl,
      tier: g.tier || '', honors: (g.honors || []).slice(), tags: (g.tags || []).slice(),
      tierRank: g.tierRank, zhengtu: !!g.zhengtu, liupin: g.liupin, liupinLabel: liupinLabel(g.liupin),
      ceiling: g.ceiling, ceilingLabel: rankNameOf(g.ceiling),
      youmian: g.youmian, source: g.source,
      title: g.tier ? (pl + '·' + g.tier) : pl,
      qing: g.liupin === 'qing', yi: !g.zhengtu, wu: g.liupin === 'wu'
    };
  }

  // 一行摘要(AI prompt / 列传判语)
  function summaryLine(ch, G) {
    var d = describe(ch, G);
    var parts = [d.title];
    if (d.honors.length) parts[0] = d.pathLabel + '·' + (d.tier || '') + '（' + d.honors.join('·') + '）';
    parts.push(d.zhengtu ? '正途' : '异途');
    parts.push(d.liupinLabel);
    parts.push('仕至' + d.ceilingLabel);
    return parts.join('·');
  }

  // ── 名望底偏置(纯函数·清流抬·异途压·一甲/储相加) ──
  function fameBias(ch, G) {
    var g = ensureGongming(ch, G), b = 0;
    if (g.liupin === 'qing') b += 6;
    else if (g.liupin === 'zhuo' || !g.zhengtu) b -= 6;
    (g.honors || []).forEach(function (h) {
      b += (h === '状元' ? 5 : h === '榜眼' ? 4 : h === '探花' ? 3 : h === '庶吉士' ? 3 : h === '传胪' ? 2 : 0);
    });
    return b;
  }

  // 党派引力(出身→清流/浊流阵营拉力)·供 AI 党派归属/叙事(不直接改党派·只给信号)
  function liupinAffinity(ch, G) {
    var g = ensureGongming(ch, G);
    if (g.liupin === 'qing') return { camp: 'qing', label: '清流', strength: 2 + (((g.tags || []).indexOf('言路') >= 0) ? 1 : 0) };
    if (g.liupin === 'zhuo' || !g.zhengtu) return { camp: 'zhuo', label: '浊流', strength: 2 };
    return { camp: 'neutral', label: '中立', strength: 0 };
  }

  // 一次性名望底偏置(幂等·marker 防重·仅 fame 已就位时落·防抢先 clob的 fame init·跳君上)
  function applyGongmingBias(ch, G) {
    if (!ch || ch.isPlayer || !ch.resources) return 0;
    var g = ensureGongming(ch, G);
    if (g._biasApplied) return 0;
    if (typeof ch.resources.fame !== 'number') return 0; // fame 未就位·待下次
    var b = fameBias(ch, G);
    if (b) ch.resources.fame += b;
    g._biasApplied = 1;
    return b;
  }

  // 全员个人优免额合计(在世)·供赋税/户籍优免个人层面
  function totalYoumian(G) {
    G = G || (typeof GM !== 'undefined' ? GM : null);
    if (!G || !G.chars) return 0;
    var sum = 0;
    G.chars.forEach(function (ch) {
      if (!ch || ch.alive === false) return;
      try { sum += ensureGongming(ch, G).youmian || 0; } catch (e) {}
    });
    return sum;
  }

  // ── 授功名(生成路径：科举/门荫/纳赀/军功/吏进/恩荫) ──
  function grant(ch, spec, G) {
    if (!ch) return null;
    G = G || (typeof GM !== 'undefined' ? GM : null);
    if (!ch.resources) ch.resources = {};
    spec = spec || {};
    var g = {
      path: spec.path || 'keju',
      tier: spec.tier || '',
      honors: (spec.honors || []).slice(),
      source: spec.source || 'edict',
      grantedTurn: spec.turn != null ? spec.turn : ((G && G.turn) || 0)
    };
    if (spec.academicScore != null) g._academicScore = spec.academicScore;
    deriveFields(g, ch, G);
    g._derivedScale = DERIVE_VER;
    ch.resources.gongming = g;
    return g;
  }

  // 升监/加衔(在既有出身上叠荣衔·如馆选庶吉士)·不换 path/tier
  function addHonor(ch, honor, G) {
    var g = ensureGongming(ch, G);
    if (g.honors.indexOf(honor) < 0) { g.honors.push(honor); deriveFields(g, ch, G); }
    return g;
  }

  // ── 五生成路径预设(一 call 授功名·诏书/AI op/玩家杠杆共用) ──
  var PRODUCTION_PRESETS = {
    menyin:   { path: 'menyin',   tier: '荫生', source: 'menyin' },                 // 门荫(荫叙)·正途
    nazi:     { path: 'nazi',     tier: '例监', source: 'nazi' },                   // 纳赀(捐纳)·异途
    junggong: { path: 'junggong', tier: '武举', source: 'junggong' },              // 军功·武班(可 opts.tier 升武进士)
    lijin:    { path: 'lijin',    tier: '吏员', source: 'lijin' },                   // 吏进·杂途
    enci:     { path: 'keju',     tier: '进士', honors: [], source: 'edict' }       // 特赐恩荫(赐进士出身)·正途无清流
  };
  function grantPreset(ch, key, opts, G) {
    var pre = PRODUCTION_PRESETS[key];
    if (!pre) return null;
    opts = opts || {};
    return grant(ch, {
      path: pre.path,
      tier: opts.tier || pre.tier,
      honors: opts.honors || pre.honors || [],
      source: pre.source,
      turn: opts.turn
    }, G);
  }

  // 幂等迁移：给全员解析/派生结构化出身(开局/读档)·返回处理数
  function migrateAll(G) {
    G = G || (typeof GM !== 'undefined' ? GM : null);
    if (!G || !G.chars) return 0;
    var n = 0;
    G.chars.forEach(function (ch) {
      if (!ch) return;
      try {
        var before = ch.resources && ch.resources.gongming && ch.resources.gongming._derivedScale;
        ensureGongming(ch, G);
        applyGongmingBias(ch, G); // 名望底偏置(幂等)
        if (before !== DERIVE_VER) n += 1;
      } catch (e) {}
    });
    return n;
  }

  global.TMGongming = {
    DERIVE_VER: DERIVE_VER,
    PATH_META: PATH_META,
    GONGMING_LADDER_DEFAULT: GONGMING_LADDER_DEFAULT,
    HONOR_MODS: HONOR_MODS,
    parseLearning: parseLearning,
    activeLadder: activeLadder,
    deriveFields: deriveFields,
    inferFromOffice: inferFromOffice,
    ensureGongming: ensureGongming,
    ceilingLevel: ceilingLevel,
    canReach: canReach,
    ceilingGap: ceilingGap,
    pathLabel: pathLabel,
    liupinLabel: liupinLabel,
    describe: describe,
    summaryLine: summaryLine,
    fameBias: fameBias,
    liupinAffinity: liupinAffinity,
    applyGongmingBias: applyGongmingBias,
    totalYoumian: totalYoumian,
    grant: grant,
    addHonor: addHonor,
    PRODUCTION_PRESETS: PRODUCTION_PRESETS,
    grantPreset: grantPreset,
    migrateAll: migrateAll
  };
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
