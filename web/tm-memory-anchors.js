// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-memory-anchors.js — 记忆锚点系统（借鉴 HistorySimAI）
//
// R90 从 tm-endturn.js 抽出·原 L1902-2266 (365 行)
// 9 函数：createMemoryAnchor / createExecutionConstraint /
//        calculateTotalMilitaryStrength / calculateEconomicLevel /
//        buildContextDescription / calculateAnchorImportance /
//        getMemoryAnchorsForAI / archiveOldMemories /
//        _ensureMemoryFreshness
//
// 外部调用：0（全部内部调用自 tm-endturn.js·搬走后经 window 全局仍可访问）
// 依赖外部：GM / P / _dbg / callAI / extractJSON（均为 window 全局）
//
// 加载顺序：必须在 tm-endturn.js 之前（index.html 顺序已调整）
// ============================================================

// ============================================================
// 记忆锚点系统 - 借鉴 HistorySimAI
// ============================================================

/** @param {string} type @param {string} title @param {string} content @param {Object} [context] */
function createMemoryAnchor(type, title, content, context) {
  if (!GM.memoryAnchors) GM.memoryAnchors = [];

  // 结构化记录当前状态（借鉴 HistorySimAI 的 Memory Anchor 系统）
  var anchor = {
    id: uid(),
    type: type, // 'decision', 'event', 'policy', 'crisis'
    title: title,
    content: content,
    context: context || {},
    turn: GM.turn,
    year: getCurrentYear(),
    month: getCurrentMonth(),
    timestamp: Date.now(),
    importance: calculateAnchorImportance(type, context),

    // 结构化风险状态（用于 AI 推演）
    risk: {
      anxiety: Math.round(GM.anxiety || 0)
    },

    // 结构化游戏状态（关键数值快照）
    state: {
      factionCount: (GM.facs || []).length,
      characterCount: (GM.chars || []).length,
      militaryStrength: calculateTotalMilitaryStrength(),
      economicLevel: calculateEconomicLevel()
    },

    // 上下文描述（供 AI 理解）
    contextDescription: buildContextDescription(type, title, content)
  };

  GM.memoryAnchors.push(anchor);

  // 限制记忆锚点数量（由玩家在设置中配置）
  var anchorLimit = (P.conf && P.conf.memoryAnchorKeep) || 40;
  if (GM.memoryAnchors.length > anchorLimit) {
    // 超限时触发归档压缩（而非简单丢弃）
    archiveOldMemories();
    // 归档后仍超限则按时间裁剪
    if (GM.memoryAnchors.length > anchorLimit) {
      GM.memoryAnchors.sort(function(a, b) { return b.turn - a.turn; });
      GM.memoryAnchors = GM.memoryAnchors.slice(0, anchorLimit);
    }
  }

  return anchor;
}

/**
 * 创建执行约束记录（记录决策执行的详细信息）
 * 借鉴 HistorySimAI 的 Execution Constraint Recording 系统
 */
function createExecutionConstraint(decision, constraints, outcome) {
  if (!GM.executionConstraints) GM.executionConstraints = [];

  var record = {
    id: uid(),
    turn: GM.turn,
    year: getCurrentYear(),
    month: getCurrentMonth(),
    decision: decision, // 决策内容
    constraints: constraints || [], // 执行约束（如：资源不足、人员缺乏）
    outcome: outcome || '', // 执行结果
    timestamp: Date.now()
  };

  GM.executionConstraints.push(record);

  // 限制数量（使用玩家决策保留数配置）
  var constraintLimit = (P.conf && P.conf.playerDecisionKeep) || 30;
  if (GM.executionConstraints.length > constraintLimit) {
    GM.executionConstraints = GM.executionConstraints.slice(-constraintLimit);
  }

  return record;
}

/**
 * 辅助函数：计算总军事力量
 */
function calculateTotalMilitaryStrength() {
  var total = 0;
  if (GM.armies && GM.armies.length > 0) {
    GM.armies.forEach(function(army) {
      if (!army.destroyed) total += army.soldiers || army.strength || 0;
    });
  }
  return Math.round(total);
}

/**
 * 辅助函数：计算经济水平
 */
function calculateEconomicLevel() {
  // 尝试从变量中获取经济相关数值
  var economicVars = ['treasury', 'wealth', 'economy', 'tax', 'trade'];
  var total = 0;
  var count = 0;

  economicVars.forEach(function(varName) {
    if (GM.vars[varName] && GM.vars[varName].value !== undefined) {
      total += GM.vars[varName].value;
      count++;
    }
  });

  return count > 0 ? Math.round(total / count) : 50;
}

/**
 * 辅助函数：构建上下文描述
 */
function buildContextDescription(type, title, content) {
  var desc = '';

  // 添加类型标签
  var typeLabels = {
    'decision': '决策',
    'event': '事件',
    'policy': '政策',
    'crisis': '危机'
  };
  desc += '[' + (typeLabels[type] || type) + '] ';

  // 添加标题和内容
  desc += title;
  if (content && content !== title) {
    desc += '：' + content;
  }

  return desc;
}

/**
 * 计算锚点重要性
 */
function calculateAnchorImportance(type, context) {
  var baseImportance = {
    'decision': 70,
    'event': 60,
    'policy': 80,
    'crisis': 90
  };

  var importance = baseImportance[type] || 50;

  // 根据上下文调整重要性
  if (context.affectedResources && context.affectedResources.length > 3) {
    importance += 10; // 影响多个资源
  }

  if (context.majorConsequence) {
    importance += 15; // 重大后果
  }

  if (context.historicalSignificance) {
    importance += 20; // 历史意义
  }

  return Math.min(100, importance);
}

/** @param {number} [limit=8] @returns {string} 格式化的记忆上下文 */
function getMemoryAnchorsForAI(limit) {
  // 先归档旧记忆
  archiveOldMemories();

  var parts = [];

  // 1. 年代归档（长期记忆）
  if (GM.memoryArchive && GM.memoryArchive.length > 0) {
    parts.push('【历史纪要】');
    GM.memoryArchive.slice(-5).forEach(function(arch) {
      parts.push('  ' + arch.title + '：' + arch.content);
    });
  }

  // 2. 活跃记忆锚点（中期记忆）
  if (GM.memoryAnchors && GM.memoryAnchors.length > 0) {
    var sorted = GM.memoryAnchors.slice().sort(function(a, b) {
      var ia = a.importance || 50, ib = b.importance || 50;
      if (ia !== ib) return ib - ia;
      return (b.turn || 0) - (a.turn || 0);
    });
    var top = sorted.slice(0, limit || 8);
    parts.push('【近期要事】');
    top.forEach(function(anchor) {
      var line = '  T' + anchor.turn + ' [' + (anchor.type || '事件') + '] ' + anchor.title;
      if (anchor.content) line += '：' + anchor.content.substring(0, 80);
      parts.push(line);
    });
  }

  // 3. 角色弧线（人物记忆）
  var arcCtx = getAllCharacterArcContext(5);
  if (arcCtx) parts.push(arcCtx);

  // 4. 玩家决策轨迹（意图记忆）
  var decCtx = getPlayerDecisionContext(6);
  if (decCtx) parts.push(decCtx);

  return parts.length > 0 ? parts.join('\n') + '\n' : '';
}

// ============================================================
// 分层记忆归档系统
// 记忆锚点超过40个时，旧锚点压缩为年代摘要而非丢弃
// ============================================================

/** 将超限记忆锚点压缩为年度归档 */
function archiveOldMemories() {
  var anchorLimit = (P.conf && P.conf.memoryAnchorKeep) || 40;
  var archiveLimit = (P.conf && P.conf.memoryArchiveKeep) || 20;
  if (!GM.memoryAnchors || GM.memoryAnchors.length <= anchorLimit) return;
  if (!GM.memoryArchive) GM.memoryArchive = [];

  // 按年份分组
  var byYear = {};
  GM.memoryAnchors.forEach(function(anchor) {
    var year = anchor.year;
    if (!year && typeof calcDateFromTurn === 'function') year = calcDateFromTurn(anchor.turn || 1).adYear;
    if (!year) {
      var dpv = (typeof _getDaysPerTurn === 'function') ? _getDaysPerTurn() : 30;
      var baseYear = (typeof P !== 'undefined' && P.time && typeof P.time.year === 'number') ? P.time.year : 0;
      year = baseYear + Math.floor(((anchor.turn || 1) - 1) * dpv / 365);
    }
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(anchor);
  });

  var years = Object.keys(byYear).map(Number).sort(function(a,b){return a-b;});
  var currentYear = years[years.length - 1] || 0;
  var archiveThreshold = currentYear - 2;

  var keptAnchors = [];
  var newArchives = [];
  years.forEach(function(year) {
    if (year > archiveThreshold) {
      keptAnchors = keptAnchors.concat(byYear[year]);
    } else {
      var anchors = byYear[year];
      var types = {};
      anchors.forEach(function(a) { types[a.type] = (types[a.type] || 0) + 1; });
      var topEvents = anchors.sort(function(a,b){return (b.importance||0)-(a.importance||0);}).slice(0,3);
      var summaryText = topEvents.map(function(e){return e.title + ':' + (e.content||'').substring(0,50);}).join('；');
      var summary = {
        type: 'archive', title: year + '年纪要', content: summaryText,
        turn: anchors[0].turn, year: year,
        importance: Math.max.apply(null, anchors.map(function(a){return a.importance||50;})),
        eventCount: anchors.length, eventTypes: types
      };
      newArchives.push(summary);
    }
  });

  // 新归档加入前，如果归档也超限，用 AI 压缩最旧的归档为一条总纲
  GM.memoryArchive = GM.memoryArchive.concat(newArchives);
  if (GM.memoryArchive.length > archiveLimit) {
    _compressOldArchives(archiveLimit);
  }

  GM.memoryAnchors = keptAnchors;
  _dbg('[Memory] 归档完成，保留' + keptAnchors.length + '条活跃锚点，' + GM.memoryArchive.length + '条归档');
}

// ════════════════════════════════════════════════════════════════════════
//  三层记忆金字塔 + 同步保鲜（方案 A1 + A2）
//  L1 最近 5 回合原始 · L2 每 5 回合情景摘要 · L3 每 30 回合年代纲要
//  _ensureMemoryFreshness 在每回合 AI 开始前运行·同步·无 AI 调用
// ════════════════════════════════════════════════════════════════════════
function _ensureMemoryFreshness(G) {
  if (!G) return;
  function _memText(entry) {
    return (typeof memoryEntryText === 'function') ? memoryEntryText(entry) : String((entry && (entry.content || entry.text || entry.summary)) || '');
  }
  if (!G._memoryLayers) G._memoryLayers = { L1: [], L2: [], L3: [] };
  var ML = G._memoryLayers;
  var curTurn = G.turn || 0;

  // —— 步骤 1：L1 拷贝最近 5 回合的 _aiMemory 原始条目 ——
  // L1 作为"热记忆"，每回合动态同步
  if (Array.isArray(G._aiMemory)) {
    ML.L1 = G._aiMemory.filter(function(m){
      if (!m) return false;
      var t = m.turn || 0;
      return (curTurn - t) < 5 && m.type !== 'compressed';
    }).slice(-20);
  }

  // —— 步骤 2：L2 每 5 回合生成一次情景摘要（同步本地，无 AI）——
  if (curTurn > 0 && curTurn % 5 === 0) {
    var l2Exists = (ML.L2 || []).some(function(x){ return x && x.turnBucket === curTurn; });
    if (!l2Exists) {
      var bucketStart = curTurn - 4;
      var bucketMems = (G._aiMemory || []).filter(function(m){
        if (!m) return false;
        var t = m.turn || 0;
        return t >= bucketStart && t <= curTurn && m.type !== 'compressed';
      });
      if (bucketMems.length > 0) {
        var l2Summary = bucketMems.map(function(m){
          return 'T' + (m.turn||0) + ':' + _memText(m).substring(0, 60);
        }).join('｜').substring(0, 400);
        ML.L2.push({
          turnBucket: curTurn,
          turnRange: bucketStart + '-' + curTurn,
          summary: l2Summary,
          createdAt: curTurn
        });
        // L2 上限 12 条（保留约 60 回合的情景摘要）
        if (ML.L2.length > 12) ML.L2 = ML.L2.slice(-12);
      }
    }
  }

  // —— 步骤 3：L3 每 30 回合生成年代纲要（同步本地）——
  if (curTurn > 0 && curTurn % 30 === 0) {
    var l3Exists = (ML.L3 || []).some(function(x){ return x && x.turnBucket === curTurn; });
    if (!l3Exists) {
      var l3BucketStart = curTurn - 29;
      var l3Bucket = (ML.L2 || []).filter(function(x){
        return x.turnBucket >= l3BucketStart && x.turnBucket <= curTurn;
      });
      if (l3Bucket.length > 0) {
        var l3Summary = l3Bucket.map(function(x){
          return x.turnRange + '｜' + x.summary.substring(0, 80);
        }).join('‖').substring(0, 600);
        ML.L3.push({
          turnBucket: curTurn,
          turnRange: l3BucketStart + '-' + curTurn,
          summary: l3Summary,
          createdAt: curTurn
        });
        // L3 无上限（年代纲要是历史根，不丢弃）
      }
    }
  }

  // —— 步骤 4：兜底同步压缩 ——
  //   若 _aiMemory 条数超硬上限且最后一条 compressed 项过于陈旧·本地合并老条目
  var _aCp = (typeof getCompressionParams === 'function') ? getCompressionParams() : { memHardLimit: 100 };
  var hardLim = _aCp.memHardLimit || 100;
  if (Array.isArray(G._aiMemory) && G._aiMemory.length > hardLim) {
    var lastCompressed = null;
    for (var i = G._aiMemory.length - 1; i >= 0; i--) {
      if (G._aiMemory[i] && G._aiMemory[i].type === 'compressed') { lastCompressed = G._aiMemory[i]; break; }
    }
    var needLocal = !lastCompressed || (curTurn - (lastCompressed.turn || 0)) > 10;
    if (needLocal) {
      var keepRecent = Math.round(hardLim * 0.5);
      var toCompress = G._aiMemory.slice(0, G._aiMemory.length - keepRecent);
      var recent = G._aiMemory.slice(-keepRecent);
      var localSummary = toCompress.map(function(m){
        if (!m) return '';
        return 'T' + (m.turn||0) + ':' + _memText(m).substring(0, 40);
      }).filter(Boolean).join('｜').substring(0, 1200);
      var fallbackEntry = {
        turn: curTurn,
        type: 'compressed',
        content: '【本地兜底压缩·T' + ((toCompress[0] && toCompress[0].turn) || 0) + '~T' + ((toCompress[toCompress.length-1] && toCompress[toCompress.length-1].turn) || 0) + '】' + localSummary,
        _localFallback: true
      };
      G._aiMemory = [fallbackEntry].concat(recent);
      try {
        if (typeof recordMemoryDiagnostic === 'function') recordMemoryDiagnostic('local_fallback_compress', { bucket: 'aiMemory', old: toCompress.length, kept: recent.length, snapshot: (typeof buildMemoryDiagnosticSnapshot === 'function' ? buildMemoryDiagnosticSnapshot(G) : null) });
      } catch(_) {}
      _dbg('[MemoryFresh] 本地兜底压缩', toCompress.length, '条→1条');
    }
  }
  try {
    if (typeof recordMemoryDiagnostic === 'function') recordMemoryDiagnostic('freshness', { stage: 'ensure', snapshot: (typeof buildMemoryDiagnosticSnapshot === 'function' ? buildMemoryDiagnosticSnapshot(G) : null) });
  } catch(_) {}
}
