// ============================================================
// tm-transmigration.js — 穿越模式核心模块（Phase 1 · Task 1）
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何朝代专属机构/职务专名（一律由剧本 hook）。
//   君主具体职务/内廷宦官具体职务/科场具体名目皆由剧本 hook，
//   引擎层只提供「穿越模式 + 玩家角色推导 + 君主名查询」的通用框架。
// ------------------------------------------------------------
// 暴露：window.TM.Transmigration.{isTransmigrationMode, derivePlayerRole,
//                                 getSovereignName, getSovereignTitle, ROLE}
// 依赖（运行时软依赖，缺席时降级）：_offIsSovereign / GM.chars / P.playerInfo
// ============================================================

(function () {
  if (typeof window === 'undefined') return;
  if (!window.TM) window.TM = {};

  var ROLE = {
    EMPEROR: 'emperor',
    REGENT: 'regent',
    GENERAL: 'general',
    MINISTER: 'minister',
    PRINCE: 'prince',
    MERCHANT: 'merchant',
    CUSTOM: 'custom',
    EUNUCH: 'eunuch',
    MAID: 'maid',
    COMMONER: 'commoner',
    BANDIT: 'bandit',
    INFANT: 'infant',
    RETIRED_OFFICIAL: 'retired_official',
    MONK: 'monk',
    ARTISAN: 'artisan',
    ACTOR: 'actor'
  };

  // 朝代中立·君主称号别名（与 tm-indices.js 君主别名表同源·跨朝代通用）
  var _SOVEREIGN_TITLE_RE = /^(皇帝|天子|大汗|可汗|单于|大王|王上|国主|主公|君主|汗王|天可汗)$/;

  // 朝代中立的身份特征词·具体内廷/科场/官署职务由剧本 hook·引擎只识别通称
  var _EUNUCH_RE = /太监|宦官|阉人|中官|内侍|寺人|腐人/;
  var _MAID_RE = /宫女|宫娥|女官|侍女|丫鬟/;
  var _MONK_RE = /僧人|道人|和尚|尼姑|法师|禅师|道长|真人|方丈|住持/;
  var _ARTISAN_RE = /匠人|工匠|陶工|瓷工|冶工|铸工|织工|染工|造纸|印刷工/;
  var _ACTOR_RE = /伶人|优伶|倡优|歌者|舞者|乐师|戏子/;
  var _BANDIT_RE = /盗贼|山贼|水贼|流寇|土匪|绿林|草寇/;
  var _RETIRED_RE = /致仕|罢归|罢闲|告老|乞休|乞骸|告归|削籍|闲居|夺职|去职|告病/;

  var _INFANT_AGE_MAX = 6;

  // 宗室/外戚/王侯特征（跨朝代通用·不写死某朝封爵制）
  var _ROYAL_ROLE_RE = /宗室|皇族|宗亲|皇子|亲王|郡王|藩王|王世子|诸侯|王侯/;
  var _ROYAL_RELATION_OK = { emperor_family: true, royal_family: true, imperial_inlaw: true };
  var _PRINCE_TITLE_RE = /亲王|郡王|藩王|宗室|诸侯|王侯|王世子|皇子/;

  // 军职特征（跨朝代·不写死某朝官制）
  var _MILITARY_RE = /将军|大将|上将|元帅|都督|总兵|校尉|都尉|校事|军侯|偏将|裨将|督师|经略/;

  // 商贾特征
  var _MERCHANT_RE = /商贾|商人|富商|财主|富户|行商|坐贾/;

  // 朝臣/官员特征（跨朝代通用官职通称·不写死某朝特定官署名）
  var _MINISTER_TITLE_RE = /尚书|侍郎|郎中|员外|主事|御史|大夫|丞相|宰相|相国|令|尹|卿|长史|司马|司徒|司空|太尉|太师|太傅|太保|少师|少傅|少保/;

  // 后宫特征
  var _HAREM_RE = /皇后|皇贵妃|贵妃|淑妃|德妃|贤妃|庄妃|宸妃|选侍|嫔|婕妤|才人|昭仪|贵人|夫人|妃子/;

  function _isStr(v) { return typeof v === 'string'; }
  function _nonEmpty(v) { return v != null && v !== ''; }

  // 朝代中立的君主判定·优先复用 _offIsSovereign·缺席时降级用本模块的通用别名表
  function _isSovereignChar(ch) {
    if (!ch) return false;
    if (typeof _offIsSovereign === 'function') {
      try { return _offIsSovereign(ch); } catch (_) {}
    }
    if (ch.role === '皇帝' || ch.isEmperor === true) return true;
    var t = (ch.officialTitle || '').trim();
    return _SOVEREIGN_TITLE_RE.test(t);
  }

  // 当前存档是否为穿越模式
  function isTransmigrationMode() {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return false;
      return P.playerInfo.transmigrationMode === true;
    } catch (_) {
      return false;
    }
  }

  // 根据角色 role/officialTitle/royalRelation/familyTier/age 推导 playerRole
  // 推导优先级：
  //   1. 显式 playerRole 字段（剧本可直挂）
  //   2. 摄政标记（isRegent / GM.regentState.regentName）
  //   3. 君主本人 → emperor
  //   4. 婴幼儿（年龄 ≤ 6）
  //   5. 退休官员 / 宦官 / 宫女 / 僧道 / 伶人 / 匠人 / 盗贼（按通称）
  //   6. 宗室/外戚/王侯 → prince
  //   7. 军职 → general
  //   8. 商贾 → merchant
  //   9. 朝臣 → minister
  //  10. 后宫 → custom（沿用既有 playerRole 枚举·后宫非独立枚举）
  //  11. 兜底 → commoner
  function derivePlayerRole(ch) {
    if (!ch || typeof ch !== 'object') return ROLE.COMMONER;

    if (_nonEmpty(ch.playerRole) && _isStr(ch.playerRole)) {
      return ch.playerRole;
    }

    if (ch.isRegent === true) return ROLE.REGENT;
    try {
      if (typeof GM !== 'undefined' && GM && GM.regentState &&
          GM.regentState.regentName && ch.name &&
          GM.regentState.regentName === ch.name) {
        return ROLE.REGENT;
      }
    } catch (_) {}

    if (_isSovereignChar(ch)) return ROLE.EMPEROR;

    var role = ch.role || '';
    var title = ch.officialTitle || '';
    var royal = ch.royalRelation || '';
    var familyTier = ch.familyTier || '';
    var age = (typeof ch.age === 'number' && !isNaN(ch.age)) ? ch.age : null;
    var bag = role + ' ' + title;

    if (age != null && age >= 0 && age <= _INFANT_AGE_MAX) {
      return ROLE.INFANT;
    }

    if (_RETIRED_RE.test(bag)) return ROLE.RETIRED_OFFICIAL;
    if (_EUNUCH_RE.test(bag)) return ROLE.EUNUCH;
    if (_MAID_RE.test(bag)) return ROLE.MAID;
    if (_MONK_RE.test(bag)) return ROLE.MONK;
    if (_ACTOR_RE.test(bag)) return ROLE.ACTOR;
    if (_ARTISAN_RE.test(bag)) return ROLE.ARTISAN;
    if (_BANDIT_RE.test(bag)) return ROLE.BANDIT;

    var isRoyal = _ROYAL_ROLE_RE.test(bag) ||
                  _ROYAL_RELATION_OK[royal] === true ||
                  _PRINCE_TITLE_RE.test(title) ||
                  _nonEmpty(familyTier) && /royal|imperial|宗室|皇族/i.test(familyTier);
    if (isRoyal) return ROLE.PRINCE;

    if (_MILITARY_RE.test(bag)) return ROLE.GENERAL;
    if (_MERCHANT_RE.test(bag)) return ROLE.MERCHANT;
    if (_MINISTER_TITLE_RE.test(title) || /官|臣|吏/.test(role)) return ROLE.MINISTER;
    if (_HAREM_RE.test(bag)) return ROLE.CUSTOM;

    return ROLE.COMMONER;
  }

  // 在 GM.chars 中找出君主角色并返回姓名
  // root 可选·默认读全局 GM
  function getSovereignName(root) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G || !Array.isArray(G.chars)) return '';
    for (var i = 0; i < G.chars.length; i++) {
      var c = G.chars[i];
      if (!c) continue;
      if (_isSovereignChar(c)) return c.name || '';
    }
    return '';
  }

  // 返回君主尊号（officialTitle 或 role·朝代中立）
  function getSovereignTitle(root) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    if (!G || !Array.isArray(G.chars)) return '';
    for (var i = 0; i < G.chars.length; i++) {
      var c = G.chars[i];
      if (!c) continue;
      if (_isSovereignChar(c)) {
        return c.officialTitle || c.role || '';
      }
    }
    return '';
  }

  window.TM.Transmigration = {
    ROLE: ROLE,
    isTransmigrationMode: isTransmigrationMode,
    derivePlayerRole: derivePlayerRole,
    getSovereignName: getSovereignName,
    getSovereignTitle: getSovereignTitle
  };
})();
