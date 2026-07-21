// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-chronicle-system.js — 编年史系统
//
// R89 从 tm-endturn.js 抽出·单一对象字面量
//   原位置 L3282-3486 (205 行)
//
// 依赖外部：_getDaysPerTurn / callAI / extractJSON / _dbg / addEB （均为 window 全局）
// 外部调用方：tm-audio-theme.js / tm-endturn-render.js / tm-patches.js / tm-endturn.js
//
// 加载顺序：必须在 tm-endturn.js 之前（index.html 顺序已调整）
// ============================================================

var ChronicleSystem = {
  monthDrafts: {},  // key: 'year-month', value: {summary, events}
  yearChronicles: {},  // key: 'year', value: {content, afterword, read}

  /** 记录本回合摘要（每回合末调用） */
  addMonthDraft: function(turn, shizhengji, zhengwen) {
    if (!P.time) return;
    var t = P.time;
    var _dpv = _getDaysPerTurn();
    var totalDays = (turn - 1) * _dpv;
    var yo = Math.floor(totalDays / 365);
    var year = (t.year||0) + yo;
    var seasonIdx = Math.floor((totalDays % 365) / 91.25); // 0-3
    var season = Math.min(seasonIdx, (t.seasons||[]).length - 1);
    var key = year + '-' + season;

    // 2026-07-22 upstream sync 后从 fork 恢复穿越模式字段
    // Task 31·SubTask 31.3: 月稿区分「君主自动决策」与「玩家行动」两段
    //   - sovereignDecisions: 本回合 _edictTracker 中 source='sovereign-ai'/'fallback' 的条目
    //   - playerActions: 本回合 _edictTracker 中 source='player-memorial'/'sovereign-player' 的条目
    //   - 老存档无 source 字段时归类为 unknown（不进入两段，避免历史数据干扰）
    var _sovDec = [], _plyAct = [];
    try {
      var _G = (typeof GM !== 'undefined') ? GM : null;
      if (_G && Array.isArray(_G._edictTracker)) {
        _G._edictTracker.forEach(function(et) {
          if (!et || et.turn !== turn) return;
          var _etSrc = et.source || '';
          var _etContent = String(et.content || '').slice(0, 80);
          if (!_etContent) return;
          if (_etSrc === 'sovereign-ai' || _etSrc === 'fallback') {
            _sovDec.push({ content: _etContent, category: et.category || '诏令' });
          } else if (_etSrc === 'player-memorial' || _etSrc === 'sovereign-player' || _etSrc === 'player') {
            _plyAct.push({ content: _etContent, category: et.category || '奏疏' });
          }
        });
      }
    } catch (_) {}

    ChronicleSystem.monthDrafts[key] = {
      turn: turn,
      year: year,
      season: season,
      summary: (shizhengji || '').substring(0, 300),
      narrative: (zhengwen || '').substring(0, 200),
      sovereignDecisions: _sovDec,
      playerActions: _plyAct,
      timestamp: Date.now()
    };

    // 限制月度摘要数量（保留最近 N 个月，N = chronicleKeep * 12）
    var draftKeys = Object.keys(ChronicleSystem.monthDrafts);
    var maxDrafts = ((P.conf && P.conf.chronicleKeep) || 10) * 12;
    if (draftKeys.length > maxDrafts) {
      draftKeys.sort();
      var toRemove = draftKeys.slice(0, draftKeys.length - maxDrafts);
      toRemove.forEach(function(k) { delete ChronicleSystem.monthDrafts[k]; });
    }

    // 检查是否年末（累计天数跨年）
    if (typeof isYearBoundary === 'function' && isYearBoundary()) {
      ChronicleSystem._tryGenerateYearChronicle(year);
    }
  },

  /** 尝试生成年度正史（异步，不阻塞游戏） */
  _tryGenerateYearChronicle: function(year) {
    if (ChronicleSystem.yearChronicles[year]) return; // 已生成
    if (!P.ai.key) return; // 无 AI 跳过

    // 收集该年所有月度摘要
    var drafts = [];
    Object.keys(ChronicleSystem.monthDrafts).forEach(function(key) {
      var d = ChronicleSystem.monthDrafts[key];
      if (d.year === year) drafts.push(d);
    });
    if (drafts.length === 0) return;

    drafts.sort(function(a, b) { return a.turn - b.turn; });

    // 构建 AI prompt（不硬编码朝代，从 P 中读取）
    var sc = findScenarioById(GM.sid);
    var dynasty = sc ? sc.dynasty || sc.era || '' : '';
    var emperor = sc ? sc.emperor || sc.role || '' : '';
    var prevAfterword = '';
    if (ChronicleSystem.yearChronicles[year - 1]) {
      prevAfterword = ChronicleSystem.yearChronicles[year - 1].afterword || '';
    }

    // 编年史风格（从chronicleConfig读取）
    var _ccfg = P.chronicleConfig || {};
    var _style = _ccfg.style || 'biannian';
    var _styleGuide = {
      biannian: '编年体（仿《资治通鉴》），以时间为纲，逐月叙事，客观冷静。',
      shilu: '实录体（仿《各朝实录》），以帝王言行为中心，详记诏令与臣对。',
      jizhuan: '纪传体（仿《史记》），以人物为中心，叙述本年关键人物事迹。',
      jishi: '纪事本末体（仿《通鉴纪事本末》），以事件为线索，完整讲述本年重大事件始末。',
      biji: '笔记体（仿宋人笔记），笔调闲散，穿插逸事趣闻，可加作者评论。',
      custom: _ccfg.customStyleNote || '自定义风格，典雅古朴。'
    };
    var _chrR2 = _getCharRange('chronicle');
    var _minC = _ccfg.yearlyMinChars || _chrR2[0];
    var _maxC = _ccfg.yearlyMaxChars || _chrR2[1];

    // 6.5: 编年史整合——春秋左传风格强制指导
    var _chronicleStyleGuide = '严格参照《春秋》《左传》编年体史书风格。以年月为序，记录大事。用语简洁精炼如"某年某月，某事"。每事一句或数句，不铺陈渲染。年号纪年，按时序排列。';
    var prompt = '你是一位古代史官，负责撰写' + dynasty + '正史。\n';
    prompt += '文体要求：' + (_styleGuide[_style] || _styleGuide.biannian) + '\n';
    prompt += '底层风格参照：' + _chronicleStyleGuide + '\n';
    prompt += '请根据以下各季/月的起居注摘要，撰写' + year + '年的编年史记（' + _minC + '-' + _maxC + '字）。\n';
    if (emperor) prompt += '当朝天子/主角：' + emperor + '\n';
    if (prevAfterword) prompt += '上年史评：' + prevAfterword + '\n';
    // 6.1联动：注入该年回收的伏笔因果链
    if (GM._foreshadowings) {
      var _yearResolved = GM._foreshadowings.filter(function(f) {
        return f.resolved && f.resolveTurn && (typeof calcDateFromTurn === 'function') &&
          calcDateFromTurn(f.resolveTurn) && calcDateFromTurn(f.resolveTurn).adYear === year;
      });
      if (_yearResolved.length > 0) {
        prompt += '\n\u672C\u5E74\u56DE\u6536\u7684\u4F0F\u7B14\u56E0\u679C\u94FE\uFF08\u7F16\u5E74\u4E2D\u5E94\u81EA\u7136\u5448\u73B0\u8FD9\u4E9B\u524D\u56E0\u540E\u679C\uFF09\uFF1A\n';
        _yearResolved.forEach(function(f) {
          prompt += '  T' + f.plantTurn + '\u57CB\u4E0B\u300C' + f.content + '\u300D\u2192 T' + f.resolveTurn + '\u300C' + (f.resolveContent||'') + '\u300D\n';
        });
      }
    }
    // 6.5联动：注入每回合一句话摘要
    if (GM._yearlyDigest && GM._yearlyDigest.length > 0) {
      prompt += '\n\u672C\u5E74\u5404\u56DE\u5408\u4E00\u53E5\u8BDD\u6458\u8981\uFF1A\n';
      GM._yearlyDigest.forEach(function(d) { prompt += 'T' + d.turn + ': ' + d.summary + '\n'; });
    }
    // 6.7联动：本年度下达诏令+其后续影响（colorEdicts + _chainEffects）
    if (GM._edictTracker && GM._edictTracker.length > 0) {
      var _yearEdicts = GM._edictTracker.filter(function(e) {
        if (!e || !e.turn) return false;
        var _d = (typeof calcDateFromTurn === 'function') ? calcDateFromTurn(e.turn) : null;
        return _d && _d.adYear === year;
      });
      if (_yearEdicts.length > 0) {
        prompt += '\n\u3010\u672C\u5E74\u9881\u4E0B\u8BCF\u4EE4\u00B7\u7F16\u5E74\u4E2D\u5FC5\u987B\u8BB0\u5176\u9881\u5E03\u00B7\u6267\u884C\u00B7\u4F59\u6CE2\u3011\n';
        _yearEdicts.slice(0, 10).forEach(function(e) {
          prompt += '  T' + e.turn + '\u00B7' + (e.category||'\u8BCF\u4EE4') + '\uFF1A' + (e.content||'').slice(0, 80) + '\n';
          prompt += '      \u00B7\u72B6\u6001: ' + (e.status||'pending');
          if (e.assignee) prompt += '  \u6267\u884C: ' + e.assignee;
          if (e.progressPercent) prompt += '  \u8FDB\u5EA6: ' + e.progressPercent + '%';
          prompt += '\n';
          if (e.feedback) prompt += '      \u00B7\u53CD\u9988: ' + e.feedback.slice(0, 100) + '\n';
          if (e._chainEffects && e._chainEffects.length) {
            prompt += '      \u00B7\u8FDE\u9501\u6548\u5E94: ';
            e._chainEffects.slice(-5).forEach(function(ce) {
              prompt += (ce.turn ? 'T'+ce.turn+' ' : '') + (ce.effect||'') + '; ';
            });
            prompt += '\n';
          }
        });
        prompt += '  \u203B \u7F16\u5E74\u4E2D\u8BE5\u4EE5\u300C\u8BCFXX\u300D\u300C\u884C\u81F3X\u6708\u67D0\u65E5\uFF0CXX\u4E8B\u5E94\u300D\u7B49\u53E5\u5F0F\uFF0C\u5C06\u8BCF\u4EE4\u9881\u5E03\u2014\u6267\u884C\u2014\u4F59\u6CE2\u7ED3\u6210\u56E0\u679C\u94FE\uFF0C\u4E0D\u53EF\u53EA\u63D0\u9881\u5E03\u800C\u4E0D\u63D0\u7ED3\u679C\n';
      }
    }
    prompt += '\n\u5404\u5B63\u6458\u8981\uFF1A\n';
    drafts.forEach(function(d) {
      var seasonName = (P.time.seasons || ['\u6625','\u590F','\u79CB','\u51AC'])[d.season] || '';
      prompt += '\u3010' + seasonName + '\u3011' + d.summary + '\n';
    });

    // 2026-07-22 upstream sync 后从 fork 恢复：穿越模式专属段落
    // Task 31·SubTask 31.4: 编年史 AI prompt 注入「君主自动决策」与「玩家行动」两段
    //   - 聚合该年各月稿的 sovereignDecisions / playerActions
    //   - 任一非空即提示 AI「穿越模式」语境，要求编年史以君臣二元视角叙述
    var _yrSovDec = [], _yrPlyAct = [];
    drafts.forEach(function(d) {
      if (Array.isArray(d.sovereignDecisions)) _yrSovDec = _yrSovDec.concat(d.sovereignDecisions);
      if (Array.isArray(d.playerActions)) _yrPlyAct = _yrPlyAct.concat(d.playerActions);
    });
    if (_yrSovDec.length > 0 || _yrPlyAct.length > 0) {
      prompt += '\n\u3010\u7A7F\u8D8A\u6A21\u5F0F\u8BB0\u53D9\u63D0\u793A\u3011\u672C\u5E74\u4E3A\u7A7F\u8D8A\u6A21\u5F0F\u5C40\uFF0C\u73A9\u5BB6\u975E\u541B\u4E3B\uFF0C\u541B\u4E3B\u81EA\u52A8\u51B3\u7B56\u4E0E\u73A9\u5BB6\u884C\u52A8\u5E76\u5B58\u3002\u7F16\u5E74\u4E2D\u5E94\u4EE5\u541B\u81E3\u4E8C\u5143\u89C6\u89D2\u53D9\u8FF0\uFF0C\u65E2\u8BB0\u541B\u4E3B\u9881\u65E8\u4E0E\u51B3\u7B56\uFF0C\u4EA6\u8BB0\u73A9\u5BB6\u4E0A\u594F\u4E0E\u884C\u52A8\u3002\n';
      if (_yrSovDec.length > 0) {
        prompt += '\n\u3010\u541B\u4E3B\u81EA\u52A8\u51B3\u7B56\u3011\uFF08\u7A7F\u8D8A\u6A21\u5F0F\u4E0B\u7531 AI \u541B\u4E3B\u9881\u53D1\uFF0C\u7F16\u5E74\u4E2D\u5FC5\u8BB0\u5176\u9881\u5E03\u4E0E\u540E\u7EED\uFF09\uFF1A\n';
        _yrSovDec.slice(0, 20).forEach(function(sd) {
          prompt += '  \u00B7' + (sd.category || '\u8BCF\u4EE4') + '\uFF1A' + String(sd.content || '').slice(0, 80) + '\n';
        });
      }
      if (_yrPlyAct.length > 0) {
        prompt += '\n\u3010\u73A9\u5BB6\u884C\u52A8\u3011\uFF08\u7A7F\u8D8A\u6A21\u5F0F\u4E0B\u73A9\u5BB6\u4E0A\u594F/\u884C\u52A8\uFF0C\u7F16\u5E74\u4E2D\u5E94\u8BB0\u5176\u4E0E\u541B\u4E3B\u51B3\u7B56\u7684\u4E92\u52A8\uFF09\uFF1A\n';
        _yrPlyAct.slice(0, 20).forEach(function(pa) {
          prompt += '  \u00B7' + (pa.category || '\u594F\u758F') + '\uFF1A' + String(pa.content || '').slice(0, 80) + '\n';
        });
      }
    }

    prompt += '\n请返回 JSON: {"chronicle":"正史正文' + _charRangeText('chronicle') + '","afterword":"史评/论赞' + _charRangeScaled('comment', 1.0) + '"}';

    // 时空约束·年度编年正史修史·full(带在世/已故名单·防给在世者书卒/越今引后事·本局事以GM为准)（typeof守卫防加载序）
    if (typeof _buildTemporalConstraint === 'function') { try { prompt += '\n' + _buildTemporalConstraint(null, {}); } catch (_) {} }

    // 异步生成，不阻塞；年度编年不应抢占玩家正在等待的主推演通道。
    callAI(prompt, 1500, null, 'primary', {
      priority: 'background',
      timeoutMs: 60000,
      maxRetries: 1
    }).then(function(result) {
      var parsed = extractJSON(result);
      if (parsed) {
        ChronicleSystem.yearChronicles[year] = {
          content: parsed.chronicle || result,
          afterword: parsed.afterword || '',
          read: false,
          generatedAt: Date.now(),
          authorityLevel: 'official_record',
          confidence: 0.8
        };

        // 限制年度正史数量
        var yearKeys = Object.keys(ChronicleSystem.yearChronicles);
        var maxYears = ((P.conf && P.conf.chronicleKeep) || 10) * 2;
        if (yearKeys.length > maxYears) {
          yearKeys.sort(function(a,b){return a-b;});
          var removeYears = yearKeys.slice(0, yearKeys.length - maxYears);
          removeYears.forEach(function(k) { delete ChronicleSystem.yearChronicles[k]; });
        }

        _dbg('[Chronicle] 年度正史生成完成:', year);
        if (typeof addEB === 'function') addEB('正史', year + '年编年史已完成');
      }
    }).catch(function(e) {
      (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'Chronicle') : console.warn('[Chronicle] 年度正史生成失败:', e); });
  },

  /** 获取年度正史（UI 用） */
  getYearChronicle: function(year) {
    return ChronicleSystem.yearChronicles[year] || null;
  },

  /** 获取所有已生成年份 */
  getAvailableYears: function() {
    return Object.keys(ChronicleSystem.yearChronicles).map(Number).sort();
  },

  /** 标记已读 */
  markRead: function(year) {
    if (ChronicleSystem.yearChronicles[year]) {
      ChronicleSystem.yearChronicles[year].read = true;
    }
  },

  /** 序列化（存档用） */
  serialize: function() {
    return {
      monthDrafts: ChronicleSystem.monthDrafts,
      yearChronicles: ChronicleSystem.yearChronicles
    };
  },

  /** 反序列化（读档用） */
  deserialize: function(data) {
    if (!data) return;
    ChronicleSystem.monthDrafts = data.monthDrafts || {};
    ChronicleSystem.yearChronicles = data.yearChronicles || {};
  },

  /** 重置 */
  reset: function() {
    ChronicleSystem.monthDrafts = {};
    ChronicleSystem.yearChronicles = {};
  }
};
