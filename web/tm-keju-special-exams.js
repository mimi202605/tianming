/**
 * tm-keju-special-exams.js
 * v7.1·Phase G·Slice G1·特科·D2·trigger + namespace + endTurn hook
 *
 * 命题·event-driven 特科·恩科 (寿诞/改元/大婚) / 武举 (军事危机) /
 *      翻译科 (清·1723+) / 童子科 (神童荐举)
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuD2=false 全 no-op
 *   - 不发 modal·不发邸报·走 _cc2_collectAgendaSources source pool
 *   - LLM 改写为礼部/兵部/理藩院 NPC 上奏 (跟 F2/F3/F4c 一致 paradigm)
 *   - enke baseline 已存 (runtime opts.type='enke')·G1 不重做·只 spawn trigger
 *   - 触发原因必须自然政治·禁玄幻 (彗星/天命)
 *
 * Public API·
 *   _kjInitSpecialExamCalendar()                  — 从 P.keju.specialExamCalendar copy 配置·init GM 命名空间
 *   _kjCheckSpecialExamTriggers()                 — endTurn 调·检测 4 类·spawn 进队列
 *   _kjConsumeSpecialExamForAgenda()              — _cc2_collectAgendaSources 调·消费 (MAX 1)
 *   _kjSpawnSpecialExam(type, reason, detail)    — 手动 spawn·cooldown 内返 false
 *
 * 集成点·
 *   - endTurn·tm-endturn-pipeline-steps.js deferred phase5 + render-finalize (跟 F 系列同位)
 *   - source pool·tm-chaoyi.js _cc2_collectAgendaSources (加一段·跟 F2/F3/F4c 同位)
 *   - init·tm-keju-runtime.js initKejuSystem 尾部 (跟 _kjInitMentorIndex 同位)
 */
(function() {
  'use strict';

  // cooldown 年数·按特科性质差异
  var COOLDOWN_YEARS = {
    enke:   5,    // 恩科·5 年 (避连续恩典)
    wuju:   3,    // 武举·3 年 (实际按 preset.wuju_interval·取其与 3 较大者)
    fanyi:  3,    // 翻译科·3 年 (清雍正立)
    tongzi: 5     // G5 v2·童子科·10→5 年 (节奏改·user 中等节奏遇到·非超罕见)
  };
  var MAX_SPAWN_PER_TURN = 1;
  var MAX_CONSUME_PER_AGENDA = 1;

  function _isD2Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuD2 !== false; // 默认开·2026-06-14·特科解锁（undefined→on·显式 false 才关）
  }

  function _getCurYear() {
    if (typeof GM === 'undefined' || !GM) return 0;
    return GM.year || (P && P.time && P.time.year) || 0;
  }

  function _getPresetCal() {
    if (typeof P === 'undefined' || !P || !P.keju) return null;
    return P.keju.specialExamCalendar || null;
  }

  /** init namespace·从 preset copy 基础·留 spawned[] / cooldown[] 状态 */
  function _kjInitSpecialExamCalendar() {
    if (!_isD2Enabled()) return;
    if (typeof GM === 'undefined' || !GM) return;
    if (GM._specialExamCalendar) return; // 幂等
    var preset = _getPresetCal() || {};
    GM._specialExamCalendar = {
      // 4 类配置 (从 preset 继承·runtime 不修改)
      enke_triggers:   Array.isArray(preset.enke_triggers)   ? preset.enke_triggers.slice() : [],
      wuju_enabled:    !!preset.wuju_enabled,
      wuju_interval:   parseInt(preset.wuju_interval, 10) || 0,
      wuju_startYear:  parseInt(preset.wuju_startYear, 10) || 0,
      fanyi_enabled:   !!preset.fanyi_enabled,
      fanyi_startYear: parseInt(preset.fanyi_startYear, 10) || 0,
      tongzi_enabled:  !!preset.tongzi_enabled,
      // 运行时·spawn queue + 历史 + cooldown
      spawned:  [],           // 待 agenda 消费的特科触发
      history:  { enke:[], wuju:[], fanyi:[], tongzi:[] },  // 已成功 spawn 的历年记录
      cooldown: { enke:0, wuju:0, fanyi:0, tongzi:0 }       // 上次 spawn 年份
    };
  }

  /** 内部·按 type 查 cooldown 是否过 */
  function _cooldownOk(type) {
    var cal = GM._specialExamCalendar;
    if (!cal || !cal.cooldown) return true;
    var lastY = cal.cooldown[type] || 0;
    if (!lastY) return true;
    var curY = _getCurYear();
    var minWait = COOLDOWN_YEARS[type] || 5;
    // 武举特殊·preset.wuju_interval 比 default 长时取 preset
    if (type === 'wuju' && cal.wuju_interval && cal.wuju_interval > minWait) {
      minWait = cal.wuju_interval;
    }
    return (curY - lastY) >= minWait;
  }

  /** 恩科 trigger·寿诞 (year mod 10) / 改元 / 大婚
   *  reason 数组·按优先序判断 */
  function _kjCheckEnkeTriggers() {
    var cal = GM._specialExamCalendar;
    if (!cal) return null;
    if (!_cooldownOk('enke')) return null;
    var curY = _getCurYear();
    if (!curY) return null;
    // 万寿·皇帝整十诞辰·G2 step 0 改·三层 fallback (current emperor char.birthYear → findCharByName(P.playerInfo.characterName).birthYear → scenario.startYear - playerInfo.startAge)
    var birthY = 0;
    if (typeof window !== 'undefined' && typeof window._kjG2GetEmperorBirthYear === 'function') {
      birthY = window._kjG2GetEmperorBirthYear() || 0;
    }
    // 老路径兼容·若 hook 未 load·走 P.playerInfo.birthYear (虽 grep 0 matches·留 fallback)
    if (!birthY) birthY = (P && P.playerInfo && P.playerInfo.birthYear) || 0;
    if (birthY) {
      var age = curY - birthY;
      // 整 30/40/50/60/70 寿诞·概率触发 (60 寿大典必触·其余 50%)
      if (age > 0 && age % 10 === 0 && age >= 30) {
        var isBigBirthday = (age === 60 || age === 70 || age === 80);
        if (isBigBirthday || Math.random() < 0.5) {
          return { reason: '恭逢圣寿' + age + '·礼部请开恩科', subtype: 'birthday', age: age };
        }
      }
    }
    // 改元·查 P.dynastyState.lastReignChange 或 GM._lastReignChangeYear
    var lastReign = (GM._lastReignChangeYear || 0);
    if (lastReign && (curY - lastReign) <= 1) {
      return { reason: '新君改元·礼部请开恩科以光天恩', subtype: 'reign-change' };
    }
    // 大婚·查 GM._lastImperialWeddingYear (后宫/婚嫁事件 set)
    var lastWed = (GM._lastImperialWeddingYear || 0);
    if (lastWed && (curY - lastWed) <= 1) {
      return { reason: '陛下大婚·礼部请开恩科同庆', subtype: 'wedding' };
    }
    return null;
  }

  /** 武举 trigger·preset.wuju_enabled && (war_state ≥ 3 OR 缺将领) */
  function _kjCheckWujuTriggers() {
    var cal = GM._specialExamCalendar;
    if (!cal || !cal.wuju_enabled) return null;
    if (!_cooldownOk('wuju')) return null;
    var curY = _getCurYear();
    if (cal.wuju_startYear && curY < cal.wuju_startYear) return null;
    // war_state·查 GM.vars 边事·若 ≥3 或 边镇危急 触发
    var warVar = (GM.vars && GM.vars['边事']) ? GM.vars['边事'] : null;
    var warVal = warVar ? (parseInt(warVar.value, 10) || 0) : 0;
    // 缺将领·查 chars 武将 alive 数·若 < 5 触发
    var generals = (GM.chars || []).filter(function(c) {
      if (!c || c.alive === false) return false;
      var t = c.officialTitle || c.title || '';
      return /将|总兵|参将|游击|都督|节度|统制/.test(t);
    });
    if (warVal >= 60 || generals.length < 5) {
      var reason = warVal >= 60 ? '边镇告急·兵部请开武举选将' : '军中缺将·兵部请开武举';
      return { reason: reason, subtype: warVal >= 60 ? 'war-crisis' : 'general-shortage', warLevel: warVal };
    }
    // 按 interval 周期触发 (非危机情况下)
    var lastY = cal.cooldown.wuju || 0;
    if (cal.wuju_interval && lastY && (curY - lastY) >= cal.wuju_interval) {
      return { reason: '武举之期已至·兵部请开科', subtype: 'periodic' };
    }
    return null;
  }

  /** 翻译科 trigger·**2026-05-26 user 拍·G4 翻译科冗余·删** (仅保 stub 返 null·避免 P.keju.specialExamCalendar 旧 preset 字段不动) */
  function _kjCheckFanyiTriggers() {
    return null;   // G4 已删·trigger 永不触
  }

  /** G5 v2·童子科 trigger·扩 4 类
   *   1) reign-change·新君改元·礼部荐神童示文教 (跟 G2 enke reign-change paradigm 同)
   *   2) birthday·圣寿 60/70/80 寿诞荐神童
   *   3) amnesty·大赦/平乱后·四海升平·荐神童
   *   4) state-driven·州县荐举·8%/turn 罕见 baseline (从 5% 升)
   *  优先级·改元 > 寿诞 > 平乱 > 州县 */
  function _kjCheckTongziTriggers() {
    var cal = GM._specialExamCalendar;
    if (!cal || !cal.tongzi_enabled) return null;
    if (!_cooldownOk('tongzi')) return null;
    var curY = _getCurYear();
    if (!curY) return null;
    // 1·改元·跟 G2 enke reign-change 同·复用 GM._lastReignChangeYear
    var lastReign = GM._lastReignChangeYear || 0;
    if (lastReign && (curY - lastReign) <= 1 && Math.random() < 0.4) {
      return { reason: '新君改元·礼部荐神童示文教', subtype: 'reign-change' };
    }
    // 2·寿诞·60/70/80 整寿
    var birthY = 0;
    if (typeof window !== 'undefined' && typeof window._kjG2GetEmperorBirthYear === 'function') {
      birthY = window._kjG2GetEmperorBirthYear() || 0;
    }
    if (birthY) {
      var age = curY - birthY;
      if (age > 0 && (age === 60 || age === 70 || age === 80) && Math.random() < 0.3) {
        return { reason: '恭逢圣寿' + age + '·礼部荐神童同贺', subtype: 'birthday', age: age };
      }
    }
    // 3·平乱·复用 GM._lastPlatformDisasterYear (G2 event hook 同源)
    var lastDisaster = GM._lastPlatformDisasterYear || 0;
    if (lastDisaster && (curY - lastDisaster) >= 1 && (curY - lastDisaster) <= 3 &&
        Math.random() < 0.25 && !GM._tongziPlatformDisasterFired) {
      GM._tongziPlatformDisasterFired = curY;
      return { reason: '四海升平·礼部荐神童·示天瑞', subtype: 'amnesty' };
    }
    // 4·state-driven·8% (从 5% 升)·罕见 baseline
    if (Math.random() > 0.08) return null;
    return { reason: '州县荐举神童·礼部请开童子科', subtype: 'recommendation' };
  }

  /** 主入口·endTurn 调·检测 4 类·spawn 入队列
   *  返 spawn 数 */
  function _kjCheckSpecialExamTriggers() {
    if (!_isD2Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM) return 0;
    if (!GM._specialExamCalendar) _kjInitSpecialExamCalendar();
    var cal = GM._specialExamCalendar;
    if (!cal) return 0;
    var spawned = 0;
    // 顺序·恩科 → 武举 → 翻译科 → 童子科 (1 turn 1 spawn 上限·先到先得)
    var checks = [
      { type: 'enke',   fn: _kjCheckEnkeTriggers },
      { type: 'wuju',   fn: _kjCheckWujuTriggers },
      { type: 'fanyi',  fn: _kjCheckFanyiTriggers },
      { type: 'tongzi', fn: _kjCheckTongziTriggers }
    ];
    for (var i = 0; i < checks.length; i++) {
      if (spawned >= MAX_SPAWN_PER_TURN) break;
      var hit = null;
      try { hit = checks[i].fn(); } catch(e) { continue; }
      if (!hit) continue;
      if (_kjSpawnSpecialExam(checks[i].type, hit.reason, hit)) spawned++;
    }
    return spawned;
  }

  /** 手动 spawn·cooldown 内返 false·成功写 spawned[] + history + cooldown */
  function _kjSpawnSpecialExam(type, reason, detail) {
    if (!_isD2Enabled()) return false;
    if (typeof GM === 'undefined' || !GM) return false;
    if (!GM._specialExamCalendar) _kjInitSpecialExamCalendar();
    var cal = GM._specialExamCalendar;
    if (!cal) return false;
    if (!type || !cal.cooldown.hasOwnProperty(type)) return false;
    if (!_cooldownOk(type)) return false;
    var curY = _getCurYear();
    var entry = {
      type: type,
      reason: reason || '',
      detail: detail || {},
      spawnedTurn: (GM.turn || 0),
      spawnedYear: curY
    };
    cal.spawned.push(entry);
    cal.history[type].push({ year: curY, reason: reason });
    cal.cooldown[type] = curY;
    // G2·step a·Path B keyi promote decorate (若 G2 enke 已 ship)
    if (typeof window !== 'undefined' && typeof window._kjG2DecorateSpawnedEntryForKeyi === 'function') {
      try { window._kjG2DecorateSpawnedEntryForKeyi(entry); } catch(_) {}
    }
    // G3·step A·wuju decorate (跟 G2 同 paradigm·分支按 type)
    if (typeof window !== 'undefined' && typeof window._kjG3DecorateSpawnedEntryForKeyi === 'function') {
      try { window._kjG3DecorateSpawnedEntryForKeyi(entry); } catch(_) {}
    }
    // G5·tongzi decorate
    if (typeof window !== 'undefined' && typeof window._kjG5DecorateSpawnedEntryForKeyi === 'function') {
      try { window._kjG5DecorateSpawnedEntryForKeyi(entry); } catch(_) {}
    }
    // G3·RAA·H1·若 wuju·push desk suggestion·F3·已 drop _kjG3PushWujuKeyiPromoteQueue (走 chaoyi auto-push 避双 push)
    if (entry && entry.type === 'wuju') {
      if (typeof window !== 'undefined') {
        if (typeof window._kjG3OnWujuTriggerEnqueueDeskSuggestion === 'function') {
          try {
            var subtype = (entry.detail && entry.detail.subtype) || 'periodic';
            window._kjG3OnWujuTriggerEnqueueDeskSuggestion(subtype, entry.detail || {});
          } catch(_) {}
        }
      }
    }
    // G5 v2·tongzi·push desk suggestion (跟 G3 wuju 同 paradigm)
    if (entry && entry.type === 'tongzi') {
      if (typeof window !== 'undefined' &&
          typeof window._kjG5OnTongziTriggerEnqueueDeskSuggestion === 'function') {
        try {
          var stype = (entry.detail && entry.detail.subtype) || 'recommendation';
          window._kjG5OnTongziTriggerEnqueueDeskSuggestion(stype, entry.detail || {});
        } catch(_) {}
      }
    }
    return true;
  }

  /** _cc2_collectAgendaSources 调·消费队列 (MAX 1) */
  function _kjConsumeSpecialExamForAgenda() {
    if (!_isD2Enabled()) return [];
    if (typeof GM === 'undefined' || !GM) return [];
    if (!GM._specialExamCalendar || !GM._specialExamCalendar.spawned) return [];
    var sp = GM._specialExamCalendar.spawned;
    if (!sp.length) return [];
    var out = sp.slice(0, MAX_CONSUME_PER_AGENDA);
    GM._specialExamCalendar.spawned = sp.slice(MAX_CONSUME_PER_AGENDA);
    return out;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjInitSpecialExamCalendar       = _kjInitSpecialExamCalendar;
    window._kjCheckSpecialExamTriggers      = _kjCheckSpecialExamTriggers;
    window._kjConsumeSpecialExamForAgenda   = _kjConsumeSpecialExamForAgenda;
    window._kjSpawnSpecialExam              = _kjSpawnSpecialExam;
    // sub-checkers (test 用)
    window._kjCheckEnkeTriggers   = _kjCheckEnkeTriggers;
    window._kjCheckWujuTriggers   = _kjCheckWujuTriggers;
    window._kjCheckFanyiTriggers  = _kjCheckFanyiTriggers;
    window._kjCheckTongziTriggers = _kjCheckTongziTriggers;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjInitSpecialExamCalendar:     _kjInitSpecialExamCalendar,
      _kjCheckSpecialExamTriggers:    _kjCheckSpecialExamTriggers,
      _kjConsumeSpecialExamForAgenda: _kjConsumeSpecialExamForAgenda,
      _kjSpawnSpecialExam:            _kjSpawnSpecialExam,
      _kjCheckEnkeTriggers:           _kjCheckEnkeTriggers,
      _kjCheckWujuTriggers:           _kjCheckWujuTriggers,
      _kjCheckFanyiTriggers:          _kjCheckFanyiTriggers,
      _kjCheckTongziTriggers:         _kjCheckTongziTriggers
    };
  }
})();
