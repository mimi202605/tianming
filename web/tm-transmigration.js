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

  // 当前选角剧本 id·showCharacterSelect 设·confirmCharacter 读
  // 选角发生在 doActualStart 之前·P.characters 尚未填充该剧本角色·须直接用 sc.characters
  var _pendingScnId = null;

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

  // ── 角色定位 → 中文分组标签（朝代中立·不挂任何朝代专有官署名）──
  var _ROLE_GROUP_LABELS = {
    emperor: '君主（不可选）',
    regent: '摄政权臣',
    general: '军中将领',
    minister: '朝中重臣',
    prince: '宗室外戚',
    merchant: '商贾富户',
    custom: '后宫内命',
    eunuch: '内廷宦官',
    maid: '宫娥女使',
    commoner: '布衣平民',
    bandit: '江湖草莽',
    infant: '婴幼稚子',
    retired_official: '致仕旧臣',
    monk: '方外僧道',
    artisan: '百工匠人',
    actor: '伶人乐师'
  };
  var _ROLE_GROUP_ORDER = [
    ROLE.MINISTER, ROLE.GENERAL, ROLE.PRINCE, ROLE.REGENT,
    ROLE.MERCHANT, ROLE.CUSTOM, ROLE.EUNUCH, ROLE.MAID,
    ROLE.RETIRED_OFFICIAL, ROLE.MONK, ROLE.ARTISAN, ROLE.ACTOR,
    ROLE.COMMONER, ROLE.BANDIT, ROLE.INFANT
  ];

  var _BAG_LABELS = {
    intelligence: '智', valor: '勇', military: '军', administration: '政',
    management: '理', charisma: '魅', diplomacy: '交', benevolence: '仁'
  };

  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _icon(name, size) {
    if (typeof tmIcon === 'function') { try { return tmIcon(name, size || 12); } catch (_) {} }
    return '';
  }
  function _page() {
    if (typeof _$ === 'function') return _$("scn-page");
    return document.getElementById("scn-page");
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.warn('[Transmigration]', m); } catch (_) {}
  }

  function _groupByRole(chars) {
    var groups = {};
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (!c) continue;
      var r = derivePlayerRole(c);
      if (!groups[r]) groups[r] = [];
      groups[r].push(c);
    }
    return groups;
  }

  function _fmtNameLine(ch) {
    var n = ch.name || '（无名）';
    var zi = ch.zi ? '　字 ' + ch.zi : '';
    var hao = ch.haoName ? '　号 ' + ch.haoName : '';
    return n + zi + hao;
  }
  function _fmtBrief(ch) {
    var parts = [];
    if (ch.officialTitle) parts.push(ch.officialTitle);
    else if (ch.title) parts.push(ch.title);
    else if (ch.role) parts.push(ch.role);
    if (typeof ch.rankLevel === 'number' && ch.rankLevel > 0) parts.push(ch.rankLevel + ' 品');
    if (ch.faction) parts.push(ch.faction);
    return parts.join('　·　');
  }
  function _fmtPersonality(ch) {
    if (ch.personality) return ch.personality;
    var tags = [];
    if (typeof ch.loyalty === 'number') tags.push('忠 ' + ch.loyalty);
    if (typeof ch.ambition === 'number') tags.push('志 ' + ch.ambition);
    if (typeof ch.intelligence === 'number') tags.push('智 ' + ch.intelligence);
    if (typeof ch.valor === 'number') tags.push('勇 ' + ch.valor);
    return tags.join('　·　');
  }

  function _renderCharacterCard(ch) {
    var name = _esc(ch.name || '');
    var nameLine = _esc(_fmtNameLine(ch));
    var brief = _esc(_fmtBrief(ch));
    var pers = _esc(_fmtPersonality(ch));
    var ft = ch.familyTier ? _esc(ch.familyTier) : '';
    var rankBadge = (typeof ch.rankLevel === 'number' && ch.rankLevel > 0)
      ? '<span class="trk-rank">' + ch.rankLevel + '品</span>' : '';
    var h = '<div class="trk-card" data-name="' + name + '">';
    h += '<div class="trk-card-head">';
    h += '<div class="trk-name">' + nameLine + '</div>';
    h += rankBadge;
    h += '</div>';
    if (brief) h += '<div class="trk-brief">' + brief + '</div>';
    if (ft) h += '<div class="trk-fam"><span class="trk-lbl">门第</span>' + ft + '</div>';
    if (pers) h += '<div class="trk-pers"><span class="trk-lbl">性请</span>' + pers + '</div>';
    h += '<div class="trk-actions">';
    h += '<button type="button" class="bt bs trk-btn-detail" data-name="' + name + '">' + _icon('person', 12) + ' 档案详情</button>';
    h += '<button type="button" class="bt bp trk-btn-pick" data-name="' + name + '">' + _icon('scroll', 12) + ' 选定</button>';
    h += '</div>';
    h += '</div>';
    return h;
  }

  function _showCharacterDetail(ch) {
    var existing = document.getElementById('_charDetailOv');
    if (existing) existing.remove();
    if (!ch) return;

    var h = '<div id="_charDetailOv" style="position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;animation:fi 0.2s ease;" onclick="if(event.target===this)this.remove();">';
    h += '<div class="scn-preview-modal" onclick="event.stopPropagation();" style="max-width:680px;max-height:88vh;overflow-y:auto;">';
    h += '<div style="height:2px;background:linear-gradient(90deg,transparent,var(--gold-500),var(--gold-400),var(--gold-500),transparent);margin-bottom:var(--space-4);"></div>';
    h += '<div style="text-align:center;margin-bottom:var(--space-4);">';
    h += '<div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary);letter-spacing:0.2em;">' + _esc(_fmtNameLine(ch)) + '</div>';
    if (ch.officialTitle || ch.title) h += '<div style="font-size:var(--text-sm);color:var(--color-foreground-secondary);margin-top:var(--space-1);">' + _esc(ch.officialTitle || ch.title) + '</div>';
    h += '</div>';

    var rows = [];
    if (typeof ch.age === 'number') rows.push(['年龄', ch.age + ' 岁']);
    if (ch.birthplace) rows.push(['籍贯', ch.birthplace]);
    if (ch.gender) rows.push(['性别', ch.gender]);
    if (ch.role) rows.push(['身份', ch.role]);
    if (ch.faction) rows.push(['势力', ch.faction]);
    if (ch.party) rows.push(['党派', ch.party]);
    if (ch.familyTier) rows.push(['门第', ch.familyTier]);
    if (ch.familyRole) rows.push(['族中位次', ch.familyRole]);
    if (ch.faith) rows.push(['信仰', ch.faith]);
    if (ch.learning) rows.push(['学识', ch.learning]);
    if (ch.diction) rows.push(['辞令', ch.diction]);
    if (ch.location) rows.push(['所在', ch.location]);
    if (rows.length) {
      h += '<div style="display:grid;grid-template-columns:auto 1fr;gap:var(--space-1) var(--space-3);padding:var(--space-3);background:var(--color-sunken);border-radius:var(--radius-md);border-left:3px solid var(--gold-400);margin-bottom:var(--space-3);font-size:var(--text-sm);">';
      rows.forEach(function (r) {
        h += '<div style="color:var(--gold-400);letter-spacing:0.1em;">' + _esc(r[0]) + '</div>';
        h += '<div style="color:var(--color-foreground);">' + _esc(r[1]) + '</div>';
      });
      h += '</div>';
    }

    var bag = ['intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence'].filter(function (k) { return typeof ch[k] === 'number'; });
    if (bag.length) {
      h += '<div style="margin-bottom:var(--space-3);"><div style="font-size:var(--text-xs);color:var(--gold-400);margin-bottom:var(--space-1);letter-spacing:0.1em;">八 才</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-1);">';
      bag.forEach(function (k) {
        h += '<div style="text-align:center;padding:var(--space-1);background:var(--color-surface);border-radius:var(--radius-sm);border:1px solid var(--color-border-subtle);"><div style="font-size:var(--text-xs);color:var(--color-foreground-muted);">' + (_BAG_LABELS[k] || k) + '</div><div style="color:var(--color-primary);font-weight:var(--weight-bold);">' + ch[k] + '</div></div>';
      });
      h += '</div></div>';
    }

    if (ch.personality) {
      h += '<div style="padding:var(--space-2) var(--space-3);background:var(--color-sunken);border-radius:var(--radius-md);margin-bottom:var(--space-3);font-size:var(--text-sm);"><span style="color:var(--gold-400);letter-spacing:0.1em;">性 情　</span>' + _esc(ch.personality) + '</div>';
    }

    var relParts = [];
    if (ch.mentor) relParts.push('师：' + ch.mentor);
    if (ch.superior) relParts.push('上官：' + ch.superior);
    if (ch.friends) {
      var f = Array.isArray(ch.friends) ? ch.friends.join('、') : ch.friends;
      if (f) relParts.push('友：' + f);
    }
    if (ch.family) relParts.push('家族：' + ch.family);
    if (relParts.length) {
      h += '<div style="padding:var(--space-2) var(--space-3);background:var(--color-sunken);border-radius:var(--radius-md);margin-bottom:var(--space-3);font-size:var(--text-sm);"><span style="color:var(--gold-400);letter-spacing:0.1em;">关 系　</span>' + _esc(relParts.join('　')) + '</div>';
    }

    var txt = ch.bio || ch.desc || ch.appearance;
    if (txt) {
      h += '<div class="narrative-text" style="padding:var(--space-3);background:var(--color-sunken);border-radius:var(--radius-md);border-left:3px solid var(--gold-400);font-size:var(--text-sm);margin-bottom:var(--space-3);">' + _esc(txt) + '</div>';
    }

    var safeName = String(ch.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    h += '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;">';
    h += '<button class="bt bp" onclick="document.getElementById(\'_charDetailOv\').remove();TM.Transmigration.confirmCharacter(\'' + safeName + '\')">' + _icon('scroll', 14) + ' 选定此人</button>';
    h += '<button class="bt bs" onclick="document.getElementById(\'_charDetailOv\').remove();">关闭</button>';
    h += '</div>';
    h += '<div style="height:1px;background:linear-gradient(90deg,transparent,var(--gold-500),transparent);margin-top:var(--space-3);"></div>';
    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
  }

  function _showTransScnSelect() {
    var page = _page();
    if (!page) { _toast('启动页未就绪'); return; }
    page.classList.add("show");
    var scenarios = (typeof P !== 'undefined' && P && Array.isArray(P.scenarios)) ? P.scenarios : [];

    var h = '<button class="bt bs" onclick="backToLaunch()" style="position:fixed;top:1rem;left:1rem;z-index:1000;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;letter-spacing:0.15em;">◁ 返 回 启 幕</button>';
    h += '<div class="scn-page-title">穿 越 · 择 世</div>';
    h += '<div style="font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;font-size:12px;color:var(--ink-400);letter-spacing:0.3em;text-align:center;margin-top:8px;margin-bottom:16px;font-style:italic;">—— 择一时日，化身其一，俯瞰朝局 ——</div>';
    h += '<div class="scn-grid">';
    if (scenarios.length === 0) {
      h += '<div style="color:var(--ink-400);text-align:center;padding:2rem;grid-column:1/-1;font-style:italic;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;letter-spacing:0.2em;">暂无剧本，请先创作</div>';
    } else {
      h += scenarios.map(function (s) {
        var srcBadge = s._workshopPackId ? '<div style="position:absolute;right:0.55rem;top:0.55rem;border:1px solid var(--gold-d);color:var(--gold);background:rgba(0,0,0,0.35);font-size:0.7rem;padding:0.08rem 0.35rem;letter-spacing:0.08em;">工坊</div>' : "";
        return '<div class="scn-card" style="position:relative;" onclick="TM.Transmigration.showCharacterSelect(\'' + _esc(s.id) + '\')">' +
          srcBadge +
          '<div class="scn-era">' + _esc(s.era) + '</div>' +
          '<div class="scn-name">' + _esc(s.name) + '</div>' +
          '<div class="scn-role">' + _esc(s.role) + '</div>' +
          '<div class="scn-bg">' + _esc((s.background || '').substring(0, 80)) + (s.background && s.background.length > 80 ? '…' : '') + '</div></div>';
      }).join('');
    }
    h += '</div>';
    page.innerHTML = h;
  }

  // ── 入口：从主界面「穿越」按钮进入 ──
  function startFlow() {
    if (typeof _cleanupOverlays === 'function') _cleanupOverlays();
    var launch = (typeof _$ === 'function') ? _$("launch") : document.getElementById('launch');
    if (launch) launch.style.display = "none";
    if (typeof P !== 'undefined' && P) {
      if (!P.playerInfo) P.playerInfo = {}; // arch-ok
      P.playerInfo.transmigrationMode = true; // arch-ok
    }
    _showTransScnSelect();
  }

  // ── 角色选择面板 ──
  // 官方剧本首屏注册的是 _lazyOfficial 占位（无 characters 字段）·
  // 须先 await TMOfficialScenarioLoader.ensure(scnId) 把占位换成完整剧本·再渲染选角面板。
  // 自定义/工坊剧本无 _lazyOfficial 标记·直接走同步渲染。
  function showCharacterSelect(scnId) {
    if (!scnId) { _toast('未指定剧本'); return; }
    var sc = (typeof findScenarioById === 'function') ? findScenarioById(scnId) : null;
    if (!sc) { _toast('未找到剧本'); return; }

    _pendingScnId = scnId; // arch-ok · 供 confirmCharacter 取剧本角色

    if (sc._lazyOfficial === true &&
        typeof window !== 'undefined' && window.TMOfficialScenarioLoader &&
        typeof window.TMOfficialScenarioLoader.ensure === 'function') {
      var lazyPage = _page();
      if (lazyPage) {
        lazyPage.classList.add("show");
        lazyPage.innerHTML = '<div style="color:var(--ink-400);text-align:center;padding:3rem;font-style:italic;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;letter-spacing:0.2em;">读 取 剧 本 中…</div>';
      }
      window.TMOfficialScenarioLoader.ensure(scnId).then(function () {
        _renderCharacterSelect(scnId);
      }).catch(function (err) {
        _toast('剧本加载失败：' + (err && err.message || err));
      });
      return;
    }

    _renderCharacterSelect(scnId);
  }

  // 选角面板渲染（showCharacterSelect 内部用·同步·假设 sc 已是完整剧本对象）
  function _renderCharacterSelect(scnId) {
    var sc = (typeof findScenarioById === 'function') ? findScenarioById(scnId) : null;
    if (!sc) { _toast('未找到剧本'); return; }

    // 选角发生在 doActualStart 之前·P.characters 尚未填充该剧本角色·
    // 故直接用剧本自带的 sc.characters 作为角色源（修复「此剧本无可选臣子」）
    var scChars = Array.isArray(sc.characters) ? sc.characters : [];
    var pickable = scChars.filter(function (c) {
      if (!c || c.alive === false) return false;
      if (_isSovereignChar(c)) return false;
      return true;
    });
    var groups = _groupByRole(pickable);

    var page = _page();
    if (!page) { _toast('启动页未就绪'); return; }
    page.classList.add("show");

    var h = '<button class="bt bs" onclick="TM.Transmigration.startFlow()" style="position:fixed;top:1rem;left:1rem;z-index:1000;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;letter-spacing:0.15em;">◁ 返 回 剧 本</button>';
    h += '<div class="scn-page-title">穿 越 · 择 一 臣 子</div>';
    h += '<div style="font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;font-size:12px;color:var(--ink-400);letter-spacing:0.3em;text-align:center;margin-top:8px;margin-bottom:8px;font-style:italic;">〔' + _esc(sc.name || '') + '〕—— 共 ' + pickable.length + ' 人可选</div>';

    if (pickable.length === 0) {
      h += '<div style="color:var(--ink-400);text-align:center;padding:3rem;font-style:italic;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;letter-spacing:0.2em;">此剧本无可选臣子</div>';
    } else {
      h += '<style>' +
        '.trk-section{margin:1.2rem 0;}' +
        '.trk-section-title{font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;font-size:1.05rem;color:var(--gold-400);letter-spacing:0.2em;margin-bottom:0.6rem;padding-left:0.6rem;border-left:3px solid var(--gold-500);}' +
        '.trk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.8rem;}' +
        '.trk-card{padding:0.8rem 1rem;background:linear-gradient(90deg,rgba(22,15,8,0.84),rgba(40,28,14,0.70) 46%,rgba(15,10,6,0.82));border:1px solid rgba(215,185,104,0.30);border-radius:3px;}' +
        '.trk-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;}' +
        '.trk-name{font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;font-size:1.1rem;color:var(--color-primary);font-weight:700;letter-spacing:0.05em;}' +
        '.trk-rank{font-size:0.78rem;color:var(--gold-400);border:1px solid var(--gold-500);padding:0.05rem 0.4rem;border-radius:2px;}' +
        '.trk-brief{font-size:0.85rem;color:var(--color-foreground-secondary);margin-bottom:0.3rem;}' +
        '.trk-fam,.trk-pers{font-size:0.8rem;color:var(--color-foreground-muted);margin-bottom:0.2rem;}' +
        '.trk-lbl{color:var(--gold-400);margin-right:0.4rem;letter-spacing:0.1em;}' +
        '.trk-actions{display:flex;gap:0.4rem;margin-top:0.5rem;}' +
        '.trk-btn-detail{flex:1;font-size:0.85rem;padding:0.35rem 0.5rem;}' +
        '.trk-btn-pick{flex:1;font-size:0.85rem;padding:0.35rem 0.5rem;font-weight:600;}' +
        '</style>';

      _ROLE_GROUP_ORDER.forEach(function (r) {
        var list = groups[r];
        if (!list || !list.length) return;
        h += '<div class="trk-section">';
        h += '<div class="trk-section-title">' + (_ROLE_GROUP_LABELS[r] || r) + ' · ' + list.length + ' 人</div>';
        h += '<div class="trk-grid">';
        list.forEach(function (ch) { h += _renderCharacterCard(ch); });
        h += '</div></div>';
      });

      var unknownList = [];
      Object.keys(groups).forEach(function (r) {
        if (_ROLE_GROUP_LABELS[r]) return;
        if (r === ROLE.EMPEROR) return;
        unknownList = unknownList.concat(groups[r] || []);
      });
      if (unknownList.length) {
        h += '<div class="trk-section">';
        h += '<div class="trk-section-title">其 他 · ' + unknownList.length + ' 人</div>';
        h += '<div class="trk-grid">';
        unknownList.forEach(function (ch) { h += _renderCharacterCard(ch); });
        h += '</div></div>';
      }
    }

    page.innerHTML = h;

    page.querySelectorAll('.trk-btn-detail').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = btn.getAttribute('data-name');
        var ch = pickable.find(function (c) { return c.name === name; });
        if (ch) _showCharacterDetail(ch);
      });
    });
    page.querySelectorAll('.trk-btn-pick').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = btn.getAttribute('data-name');
        confirmCharacter(name);
      });
    });
  }

  // ── 角色选定后写入 P.playerInfo 并启动游戏 ──
  function confirmCharacter(charId) {
    if (typeof P === 'undefined' || !P) { _toast('剧本未就绪'); return; }
    if (!charId) { _toast('未选定角色'); return; }

    // 优先从当前选角剧本 sc.characters 取角色（选角发生在 doActualStart 之前·
    // P.characters 尚未填充）；_pendingScnId 缺席时回退 P.characters（兼容已启动/测试路径）
    var sc = _pendingScnId && (typeof findScenarioById === 'function') ? findScenarioById(_pendingScnId) : null;
    var chars = sc && Array.isArray(sc.characters) ? sc.characters
              : (Array.isArray(P.characters) ? P.characters : []);
    var ch = null;
    for (var i = 0; i < chars.length; i++) {
      if (chars[i] && chars[i].name === charId) { ch = chars[i]; break; }
    }
    if (!ch) { _toast('未找到角色：' + charId); return; }

    if (_isSovereignChar(ch)) { _toast('君主不可选，请择一臣子'); return; }

    var sid = ch.sid || (sc && sc.id) || _pendingScnId;
    if (!sid) { _toast('角色未挂剧本'); return; }

    var scnChars = sc && Array.isArray(sc.characters) ? sc.characters
                 : chars.filter(function (c) { return c && c.sid === sid; });
    var scnRoot = { chars: scnChars };
    var sovereignName = getSovereignName(scnRoot);
    var sovereignTitle = getSovereignTitle(scnRoot);

    if (!P.playerInfo) P.playerInfo = {}; // arch-ok
    P.playerInfo.transmigrationMode = true; // arch-ok
    P.playerInfo.characterName = ch.name; // arch-ok
    P.playerInfo.selectedCharId = ch.name; // arch-ok
    P.playerInfo.playerRole = derivePlayerRole(ch); // arch-ok
    P.playerInfo.sovereignName = sovereignName; // arch-ok
    P.playerInfo.sovereignTitle = sovereignTitle; // arch-ok
    if (ch.officialTitle) P.playerInfo.characterTitle = ch.officialTitle; // arch-ok
    if (ch.faction) P.playerInfo.characterFaction = ch.faction; // arch-ok
    if (typeof ch.age === 'number') P.playerInfo.characterAge = ch.age; // arch-ok
    if (ch.gender) P.playerInfo.characterGender = ch.gender; // arch-ok
    if (ch.personality) P.playerInfo.characterPersonality = ch.personality; // arch-ok

    var page = _page();
    if (page) { page.classList.remove("show"); page.innerHTML = ''; }
    var detail = document.getElementById('_charDetailOv');
    if (detail) detail.remove();

    if (typeof startGame === 'function') {
      startGame(sid);
    } else {
      console.error('[Transmigration] startGame 函数未就绪');
      _toast('启动失败：startGame 未就绪');
    }
  }

  // ── 玩家角色动作执行器（minister/general/prince/custom 等非摄政角色的统一入口）──
  // action: 'tingtui'|'recommend'|'requestExpedition'|'tribute'|'submitMemorial'|'pillowTalk'
  function roleAction(action, payload) {
    payload = payload || {};
    if (!isTransmigrationMode()) return { ok: false, reason: '非穿越模式' };
    var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    if (!pi || !pi.playerRole || pi.playerRole === 'emperor') return { ok: false, reason: '非穿越角色' };
    var G = (typeof GM !== 'undefined') ? GM : null;
    if (!G) return { ok: false, reason: 'GM 未就绪' };
    // 权限判定（复用 canPerformAction·若可用）
    if (typeof canPerformAction === 'function') {
      var perm = canPerformAction(pi.characterName || '', action, pi.playerRole);
      if (!perm || !perm.can) return { ok: false, reason: (perm && perm.reason) || '无此权' };
    }
    if (!Array.isArray(G._edictTracker)) G._edictTracker = []; // arch-ok
    G._edictTracker.push({ // arch-ok
      id: (typeof uid === 'function') ? uid() : ('role_' + Date.now()),
      content: payload.content || ((pi.characterName || '臣') + '·' + action),
      category: payload.category || ('玩家动作·' + action),
      turn: G.turn || 0,
      status: 'pending',
      assignee: '',
      feedback: '',
      progressPercent: 0,
      source: 'player-action',
      playerRole: pi.playerRole,
      playerAction: action
    });
    return { ok: true, action: action };
  }

  // ── 摄政权臣特殊路径 ──
  // action: 'proxyEdict'(代诏) | 'returnPower'(还政) | 'holdPower'(拒还)
  // payload: { content?, category? } for proxyEdict
  function runRegentAction(action, payload) {
    payload = payload || {};
    if (!isTransmigrationMode()) return { ok: false, reason: '非穿越模式' };
    var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    if (!pi || pi.playerRole !== 'regent') return { ok: false, reason: '非摄政角色' };
    var G = (typeof GM !== 'undefined') ? GM : null;
    if (!G) return { ok: false, reason: 'GM 未就绪' };

    if (action === 'proxyEdict') {
      var content = String(payload.content || '').trim();
      if (!content) return { ok: false, reason: '代诏内容为空' };
      var category = payload.category || '代诏';
      if (!Array.isArray(G._edictTracker)) G._edictTracker = []; // arch-ok
      G._edictTracker.push({ // arch-ok
        id: (typeof uid === 'function') ? uid() : ('regent_' + Date.now()),
        content: content,
        category: category,
        turn: G.turn || 0,
        status: 'pending',
        assignee: '',
        feedback: '',
        progressPercent: 0,
        source: 'regent-proxy',
        proxyRegent: pi.characterName || ''
      });
      // 代诏损耗皇威（沿用 AuthorityComplete.triggerHuangweiEvent）
      var hwResult = null;
      try {
        if (typeof AuthorityComplete !== 'undefined' && typeof AuthorityComplete.triggerHuangweiEvent === 'function') {
          hwResult = AuthorityComplete.triggerHuangweiEvent('brokenPromise', { reason: '摄政代诏·皇权旁落' });
        }
      } catch (_) {}
      // 复用 buildRegentSignal 触发还政/拒还信号
      var signal = null;
      try {
        if (typeof TM !== 'undefined' && TM.InfluenceGroups && typeof TM.InfluenceGroups.buildRegentSignal === 'function') {
          signal = TM.InfluenceGroups.buildRegentSignal(G);
        }
      } catch (_) {}
      return { ok: true, action: 'proxyEdict', source: 'regent-proxy', huangwei: hwResult, signal: signal };
    }

    if (action === 'returnPower') {
      // 还政于君：关闭穿越模式·玩家回归皇帝模式
      pi.transmigrationMode = false; // arch-ok
      pi.playerRole = 'emperor'; // arch-ok
      return { ok: true, action: 'returnPower' };
    }

    if (action === 'holdPower') {
      // 拒还：触发"权臣架空"危机（沿用 handleCrisisAction type='power_minister'）
      var crisisReq = {
        type: 'power_minister',
        action: 'purge',
        target: pi.characterName || '',
        reason: '权臣拒还·架空君主'
      };
      var crisisResult = null;
      try {
        if (typeof AuthorityComplete !== 'undefined' && typeof AuthorityComplete.handleCrisisAction === 'function') {
          crisisResult = AuthorityComplete.handleCrisisAction(crisisReq, { turn: G.turn || 0, source: 'regent-hold' });
        }
      } catch (_) {}
      return { ok: true, action: 'holdPower', crisis: crisisResult };
    }

    return { ok: false, reason: '未知 action: ' + action };
  }

  // ── Phase A · Task A9 身份变更路径表（朝代中立·供 UI 渲染）──
  var _ROLE_CHANGE_PATHS = {
    minister: [
      { kind: 'retire',          label: '告老',     nextRole: 'retired_official',
        desc: '年龄 ≥ 60 或 健康恶化·保留余威失去官职',
        condition: function (ch) { return ch && typeof ch.age === 'number' && ch.age >= 60; } },
      { kind: 'dismissed',       label: '罢黜',     nextRole: 'retired_official',
        desc: '君主 AI 主动·余威 -30·失去官职·编年史污点',
        condition: function () { return false; /* 仅君主 AI 触发 */ } }
    ],
    general: [
      { kind: 'retire',          label: '告老',     nextRole: 'retired_official',
        desc: '年龄 ≥ 60·保留余威失去军职',
        condition: function (ch) { return ch && typeof ch.age === 'number' && ch.age >= 60; } },
      { kind: 'rebel',           label: '举旗',     nextRole: 'emperor',
        desc: '反叛筹备达阈值·成王败寇',
        condition: function () { return false; /* 由 PlayerRebel 触发 */ } }
    ],
    regent: [
      { kind: 'return_power',    label: '还政',     nextRole: 'minister',
        desc: '君主成年·主动还政',
        condition: function () { return false; } }
    ],
    prince: [
      { kind: 'usurp',           label: '夺嫡',     nextRole: 'emperor',
        desc: '特殊事件·成王败寇',
        condition: function () { return false; } }
    ],
    merchant: [
      { kind: 'enlist',          label: '投军',     nextRole: 'general',
        desc: '弃商从戎·需通过考核',
        condition: function () { return true; } }
    ],
    commoner: [
      { kind: 'study',           label: '读书考科举', nextRole: 'minister',
        desc: '苦读经史·应科考出仕',
        condition: function () { return true; } },
      { kind: 'trade',           label: '经商',     nextRole: 'merchant',
        desc: '贩货求利·求富家业',
        condition: function () { return true; } },
      { kind: 'enlist',          label: '投军',     nextRole: 'general',
        desc: '投军立功·博个出身',
        condition: function () { return true; } }
    ],
    infant: [
      { kind: 'grow_up',         label: '成年',     nextRole: 'commoner',
        desc: '年满 15·自动成年',
        condition: function (ch) { return ch && typeof ch.age === 'number' && ch.age >= 15; } }
    ],
    retired_official: [
      { kind: 'comeback',        label: '东山再起', nextRole: 'minister',
        desc: '朝廷起复·再登朝堂',
        condition: function () { return false; } }
    ],
    bandit: [
      { kind: 'amnesty',         label: '招安',     nextRole: 'general',
        desc: '受朝廷招安·转为武官',
        condition: function () { return false; } }
    ],
    monk: [
      { kind: 'summon_to_court', label: '入朝参俗务', nextRole: 'minister',
        desc: '高僧入朝·还俗任职',
        condition: function () { return false; } }
    ],
    eunuch: [
      { kind: 'redbrush',        label: '批红近侍', nextRole: 'eunuch',
        desc: '内廷权力线晋升至顶阶·playerRole 不变但 power 大增',
        condition: function () { return false; } }
    ],
    maid: [
      { kind: 'promote_to_fei',  label: '晋升为妃', nextRole: 'custom',
        desc: '宫女晋升路径顶阶·转为后宫内命',
        condition: function () { return false; } }
    ],
    artisan: [
      { kind: 'royal_artisan',   label: '御用匠人', nextRole: 'artisan',
        desc: '技艺 ≥ 80·获御用·playerRole 不变但 permit=imperial',
        condition: function () { return false; } }
    ],
    actor: [
      { kind: 'patron_appointed',label: '恩客荐举', nextRole: 'minister',
        desc: '恩客荐举·入乐籍外任官',
        condition: function () { return false; } }
    ],
    custom: []
  };

  function getRoleChangePaths(role) {
    return (_ROLE_CHANGE_PATHS[role] || []).slice();
  }

  function triggerRoleChange(kind, payload) {
    try {
      var role = (P && P.playerInfo) ? P.playerInfo.playerRole : null;
      if (!role) return { ok: false, reason: 'no-role' };
      var paths = _ROLE_CHANGE_PATHS[role] || [];
      var path = null;
      for (var i = 0; i < paths.length; i++) {
        if (paths[i].kind === kind) { path = paths[i]; break; }
      }
      if (!path) return { ok: false, reason: 'unknown-kind' };
      // 实际转线由 PlayerSpecialIdentity / PlayerRoleChange 处理·这里只返回路径定义
      return { ok: true, path: path, payload: payload || {} };
    } catch (e) {
      return { ok: false, reason: 'exception', error: String(e) };
    }
  }

  window.doTransmigration = function () {
    if (window.TM && TM.Transmigration && typeof TM.Transmigration.startFlow === 'function') {
      TM.Transmigration.startFlow();
    } else {
      console.error('[doTransmigration] TM.Transmigration 未就绪');
      _toast('穿越模块未就绪');
    }
  };

  window.TM.Transmigration = {
    ROLE: ROLE,
    isTransmigrationMode: isTransmigrationMode,
    derivePlayerRole: derivePlayerRole,
    getSovereignName: getSovereignName,
    getSovereignTitle: getSovereignTitle,
    startFlow: startFlow,
    showCharacterSelect: showCharacterSelect,
    confirmCharacter: confirmCharacter,
    roleAction: roleAction,
    runRegentAction: runRegentAction,
    getRoleChangePaths: getRoleChangePaths,
    triggerRoleChange: triggerRoleChange,
    _ROLE_CHANGE_PATHS: _ROLE_CHANGE_PATHS
  };
})();
