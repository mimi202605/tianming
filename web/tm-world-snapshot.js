// @ts-check
// ============================================================
// tm-world-snapshot.js — 推演 AI 记忆增强：状态优先注入（2026-04-30）
//
// 问题：AI 在长游戏中记忆漂移——身份漂移、关系丢失、因果断裂、死者复活
// 根因：现有记忆 90% 以"叙事文本"形式注入·AI 要二次提取才知"现任户部尚书=张三"
// 方案：把"事实"和"叙事"分层·结构化卡片注入到推演 prompt 顶部
//
// 四个 helper（全部纯函数·无副作用·返回字符串·空数据返回 ''）：
//   1. buildWorldStateSnapshot()  — 当前世界状态卡（玩家/国势/要职/未爆冲突）
//   2. buildDeadPin()             — 已死要员图钉（防 AI 让死者复活）
//   3. buildEdictProgressCards()  — 长期诏令进度卡（每个诏令的阶段+阻力+ETA）
//   4. buildNpcOneLiners()        — NPC 一句话当下状态（行为画像优于纯数值）
//
// 使用：在 sc1/sc15/sc2 prompt 构建处调用·拼到 sysP 或 tp 顶部
// ============================================================

(function(global) {
  'use strict';

  function _turnsForMonthsLocal(months) {
    return (typeof global.turnsForMonths === 'function') ? global.turnsForMonths(months) : months;
  }

  // ────── 辅助：多源回退读国势变量（与 letter 系统/chaoyi-v3 一致） ──────
  function _readMetric(zh, en) {
    if (typeof GM === 'undefined' || !GM) return 50;
    // 主路径：authority-engines 对象 .index
    if (en && GM[en]) {
      var o = GM[en];
      if (typeof o === 'number') return o;
      if (typeof o === 'object' && typeof o.index === 'number') return o.index;
    }
    // 次路径：GM.vars[zh].value
    if (zh && GM.vars && GM.vars[zh] && typeof GM.vars[zh].value === 'number') {
      return GM.vars[zh].value;
    }
    return 50;
  }

  function _trendArrow(curr, prev) {
    if (typeof prev !== 'number' || typeof curr !== 'number') return '';
    var d = curr - prev;
    if (Math.abs(d) < 1) return '·';
    return d > 0 ? '↑' : '↓';
  }

  // ────── 1. 世界状态快照 ──────
  function buildWorldStateSnapshot() {
    if (typeof GM === 'undefined' || !GM) return '';
    var P_ = (typeof P !== 'undefined') ? P : null;
    var lines = [];

    // 玩家身份
    var pi = (P_ && P_.playerInfo) || {};
    var pName = pi.characterName || '陛下';
    var pTitle = pi.dynasty || pi.role || '';
    var pAge = pi.age || '';
    var startTurn = pi.startTurn || 1;
    var reignTurns = (GM.turn || 1) - startTurn + 1;
    var dpv = (typeof _getDaysPerTurn === 'function') ? _getDaysPerTurn() : 30;
    var reignYrs = (reignTurns * dpv / 365).toFixed(1);
    var energy = typeof GM._energy === 'number' ? GM._energy : null;
    var decadence = typeof GM._tyrantDecadence === 'number' ? GM._tyrantDecadence : null;
    var pLine = '[玩家] ' + pName + (pTitle ? '·' + pTitle : '') + (pAge ? '·' + pAge + '岁' : '') +
                '·临朝 T' + startTurn + '-T' + (GM.turn || 1) + '（约 ' + reignYrs + ' 年）';
    if (energy != null) pLine += '·精力' + Math.round(energy);
    if (decadence != null && decadence > 10) pLine += '·荒淫' + Math.round(decadence);
    lines.push(pLine);

    // 国势四象 + 趋势
    var hq = _readMetric('皇权', 'huangquan');
    var hw = _readMetric('皇威', 'huangwei');
    var mx = _readMetric('民心', 'minxin');
    var lz = _readMetric('吏治', 'lizhi');
    var prevH = (GM._authorityPrev || {});
    lines.push('[国势] 皇权' + Math.round(hq) + _trendArrow(hq, prevH.hq) +
               ' 皇威' + Math.round(hw) + _trendArrow(hw, prevH.hw) +
               ' 民心' + Math.round(mx) + _trendArrow(mx, prevH.mx) +
               ' 吏治' + Math.round(lz) + _trendArrow(lz, prevH.lz));

    // 主要财政变量（前 4 个）
    if (GM.vars) {
      var financeKeys = ['内帑', '外帑', '国库', '帑廪', '军饷', '岁入'].filter(function(k) {
        return GM.vars[k] && typeof GM.vars[k].value === 'number';
      }).slice(0, 4);
      if (financeKeys.length > 0) {
        lines.push('[财政] ' + financeKeys.map(function(k) {
          return k + Math.round(GM.vars[k].value) + (GM.vars[k].unit || '');
        }).join(' '));
      }
    }

    // 关键要职（top 6 一品/二品官位）
    var topOfficials = _collectTopOfficials(6);
    if (topOfficials.length > 0) {
      lines.push('[要职] ' + topOfficials.map(function(o) {
        return o.dept + ':' + o.position + '=' + (o.holder || '【缺】');
      }).join('  '));
    }

    // 当前局势分类（quadrant）
    if (typeof getAuthorityQuadrant === 'function') {
      try {
        var q = getAuthorityQuadrant();
        if (q && q.name) lines.push('[态势] ' + q.name + (q.description ? '（' + q.description + '）' : ''));
      } catch(_qE) {}
    }

    // 进行中的危机（unrest>50 的省份 + activeSchemes）
    var crises = [];
    if (GM.provinceStats) {
      Object.keys(GM.provinceStats).forEach(function(k) {
        var s = GM.provinceStats[k];
        if (s && (s.unrest > 60 || s.corruption > 70)) {
          crises.push(k + (s.unrest > 60 ? '民变' + Math.round(s.unrest) : '腐' + Math.round(s.corruption)));
        }
      });
    }
    if (Array.isArray(GM.activeSchemes) && GM.activeSchemes.length > 0) {
      var imminent = GM.activeSchemes.filter(function(s) { return s && s.progress === '即将发动'; }).slice(0, 3);
      imminent.forEach(function(s) {
        crises.push((s.schemer || '?') + '谋' + (s.target || '?') + '即发');
      });
    }
    if (crises.length > 0) lines.push('[危机] ' + crises.slice(0, 6).join('·'));

    // 输出
    if (lines.length === 0) return '';
    return '\n=== 当前世界状态快照（一眼看懂客观局势·叙事必须与之一致） ===\n' +
           lines.join('\n') + '\n=== 以上为客观事实·矛盾即视为推演错误 ===\n';
  }

  // ────── 收集顶级官位的辅助 ──────
  function _collectTopOfficials(limit) {
    if (typeof GM === 'undefined' || !GM || !GM.officeTree) return [];
    var results = [];
    function walk(nodes, depth) {
      (nodes || []).forEach(function(n) {
        (n.positions || []).forEach(function(p) {
          // 优先 rank<=2 的
          var rank = parseInt(p.rank, 10);
          if (isNaN(rank) || rank > 3) return;
          results.push({ dept: n.name || '', position: p.name || '', holder: p.holder || '', rank: rank });
        });
        if (n.subs && depth < 3) walk(n.subs, depth + 1);
      });
    }
    walk(GM.officeTree, 0);
    // 按 rank 排序，取前 limit
    results.sort(function(a, b) { return (a.rank || 99) - (b.rank || 99); });
    return results.slice(0, limit);
  }

  // ────── 2. 已死要员图钉（防复活） ──────
  function buildDeadPin() {
    if (typeof GM === 'undefined' || !GM) return '';
    var deadList = [];

    // 来源 A: GM._epitaphs（精确死亡记录）
    if (Array.isArray(GM._epitaphs)) {
      GM._epitaphs.forEach(function(ep) {
        if (!ep || !ep.char) return;
        deadList.push({
          name: ep.char,
          turn: ep.diedTurn || 0,
          reason: ep.reason || '',
          position: ep.positionAtDeath || ''
        });
      });
    }

    // 来源 B: chars[].alive===false 但未在 _epitaphs 的（兜底·避免漏写）
    if (Array.isArray(GM.chars)) {
      var pinned = {};
      deadList.forEach(function(d) { pinned[d.name] = true; });
      GM.chars.forEach(function(c) {
        if (c && c.alive === false && !c._fakeDeath && !pinned[c.name]) {
          deadList.push({
            name: c.name,
            turn: c._diedTurn || c.diedTurn || 0,
            reason: c._deathReason || c.deathReason || '',
            position: c.officialTitle || ''
          });
        }
      });
    }

    if (deadList.length === 0) return '';

    // 按死亡回合倒序（近期优先，AI 注意力前置）
    deadList.sort(function(a, b) { return (b.turn || 0) - (a.turn || 0); });

    // 上限 25 条（防 prompt 爆炸）
    var capped = deadList.slice(0, 25);
    var lines = capped.map(function(d) {
      var s = '· ' + d.name + '（T' + d.turn + (d.reason ? '·' + d.reason : '') + (d.position ? '·' + d.position : '') + '）';
      return s;
    });

    var moreNote = deadList.length > 25 ? '\n· …及更早 ' + (deadList.length - 25) + ' 名死者' : '';

    return '\n=== 已死之人·永不复活（如下名单中任何人不得在叙事/动作/对话中出现为活人） ===\n' +
           lines.join('\n') + moreNote +
           '\n=== 若需要提及，须用"故 XX"或"亡 XX"或追忆口吻 ===\n';
  }

  // ────── 3. 长期诏令进度卡 ──────
  function buildEdictProgressCards() {
    if (typeof GM === 'undefined' || !GM) return '';
    var cards = [];

    // 来源 A: _edictTracker 中 status≠'completed' 的条目
    if (Array.isArray(GM._edictTracker)) {
      GM._edictTracker.forEach(function(et) {
        if (!et || et.status === 'completed' || et.status === 'archived') return;
        if (et._vacancyFromDeath || et._vacancyFromSweep) return; // 跳过自动缺员通知（信息量低）
        var card = {
          category: et.category || et.type || '诏',
          content: et.content || '',
          turn: et.turn || 0,
          stage: et.stage || et._lifecycleStage || '',
          progress: typeof et.progressPercent === 'number' ? et.progressPercent :
                    (typeof et.stageProgress === 'number' ? Math.round(et.stageProgress * 100) : null),
          eta: et.nextStageETA || et._eta || null,
          opposition: et._opposition || et.opposition || ''
        };
        cards.push(card);
      });
    }

    // 来源 B: _edictTracker 已经包含 admin_reform/economic_reform · reformPhase
    // 不再重复·_edictTracker.push 时已经包含 phase 字段

    if (cards.length === 0) return '';

    // 按 turn 倒序（近期优先），上限 8 条
    cards.sort(function(a, b) { return (b.turn || 0) - (a.turn || 0); });
    var capped = cards.slice(0, 8);

    var lines = capped.map(function(c) {
      var contentBrief = String(c.content).slice(0, 60);
      var bits = ['[' + c.category + ']', contentBrief];
      if (c.stage) bits.push('阶段:' + c.stage);
      if (c.progress !== null) bits.push('进度' + c.progress + '%');
      if (c.eta) bits.push('剩' + c.eta + '回合');
      if (c.opposition) bits.push('阻力:' + String(c.opposition).slice(0, 30));
      return '· T' + c.turn + ' ' + bits.join('·');
    });

    return '\n=== 进行中的诏令/政策（每回合应推进或受阻·不得遗忘） ===\n' +
           lines.join('\n') + '\n=== 推演中应自然涉及这些诏令的执行/反馈 ===\n';
  }

  // ────── 4. NPC 一句话当下状态卡 ──────
  function buildNpcOneLiners(maxN) {
    if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return '';
    maxN = maxN || 18;

    // 优先级：玩家关注的人 > 有近期突变的 > 高品级官员 > 其他
    var live = GM.chars.filter(function(c) { return c && c.alive !== false && !c.isPlayer; });
    if (live.length === 0) return '';

    // 计算每人优先级分数
    var scored = live.map(function(c) {
      var score = 0;
      // 近 5 回合有 mood 变动 / scar / loyalty 巨变
      if (c._mood && c._mood !== '平') score += 5;
      if (Array.isArray(c._scars) && c._scars.length > 0) {
        var recentScar = c._scars[c._scars.length - 1];
      if (recentScar && recentScar.turn && (GM.turn - recentScar.turn) <= _turnsForMonthsLocal(3)) score += 8;
      }
      if (typeof c.loyalty === 'number' && (c.loyalty < 30 || c.loyalty > 85)) score += 4;
      if (typeof c.stress === 'number' && c.stress > 50) score += 3;
      // 高品官位
      if (c.officialTitle) {
        var rank = parseInt(c.rank, 10);
        if (!isNaN(rank)) {
          if (rank <= 2) score += 6;
          else if (rank <= 4) score += 3;
        } else {
          score += 2; // 有官无品也加分
        }
      }
      // 派系领袖
      if (c.faction && GM.facs) {
        var fac = GM.facs.find(function(f) { return f.name === c.faction && f.leader === c.name; });
        if (fac) score += 5;
      }
      // 党魁
      if (c.party && GM.parties) {
        var pty = GM.parties.find(function(p) { return p.name === c.party && p.leader === c.name; });
        if (pty) score += 4;
      }
      // 玩家近期互动（鸿雁、问对、奏疏）—— 简单查 GM.letters / memorials
      if (Array.isArray(GM.letters)) {
        var recentLtr = GM.letters.filter(function(l) {
          return l && (l.from === c.name || l.to === c.name) && ((GM.turn - (l.sentTurn || 0)) <= _turnsForMonthsLocal(3));
        });
        if (recentLtr.length > 0) score += 3;
      }
      return { c: c, score: score };
    });

    scored.sort(function(a, b) { return b.score - a.score; });
    var picks = scored.slice(0, maxN).map(function(s) { return s.c; });

    if (picks.length === 0) return '';

    var lines = picks.map(function(c) {
      var bits = [c.name];
      if (c.officialTitle) bits.push(c.officialTitle);
      else if (c.title) bits.push(c.title);
      if (c.faction) bits.push('[' + c.faction + ']');
      if (c.party) bits.push('{' + c.party + '}');

      // 当下状态：mood + 最新 scar + 阻碍 / 焦点
      var status = [];
      // 优先用 _npcCognition 的 currentFocus
      if (GM._npcCognition && GM._npcCognition[c.name]) {
        var cog = GM._npcCognition[c.name];
        if (cog.currentFocus) status.push(String(cog.currentFocus).slice(0, 40));
        if (cog.recentMood && cog.recentMood !== '平') status.push(String(cog.recentMood).slice(0, 30));
      }
      if (status.length === 0) {
        // 退而求其次：最新 scar
        if (Array.isArray(c._scars) && c._scars.length > 0) {
          var latestScar = c._scars[c._scars.length - 1];
          if (latestScar && latestScar.event) status.push('近: ' + String(latestScar.event).slice(0, 30) + (latestScar.emotion ? '[' + latestScar.emotion + ']' : ''));
        } else if (c._mood && c._mood !== '平') {
          status.push('情绪:' + c._mood);
        }
      }

      // 数值短码（只挑非平庸的）
      var nums = [];
      if (typeof c.loyalty === 'number') {
        if (c.loyalty < 30) nums.push('忠' + c.loyalty + '↓');
        else if (c.loyalty > 85) nums.push('忠' + c.loyalty + '↑');
      }
      if (typeof c.stress === 'number' && c.stress > 50) nums.push('压' + c.stress);
      if (typeof c.ambition === 'number' && c.ambition > 80) nums.push('野' + c.ambition);

      var line = bits.join('·');
      if (nums.length) line += ' ' + nums.join(' ');
      if (status.length) line += ' | ' + status.join(' / ');
      return '· ' + line;
    });

    return '\n=== 关键 NPC 当下状态（' + picks.length + ' 人·非纯数值·体现"此刻在做什么/想什么"） ===\n' +
           lines.join('\n') + '\n=== NPC 推演行为应与此当下状态一致 ===\n';
  }

  // ────── 5. 关系突变图谱（近 N 回合有变动的人物关系） ──────
  function buildRelationDeltas(maxEntries, lookbackTurns) {
    if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return '';
    maxEntries = maxEntries || 12;
    lookbackTurns = lookbackTurns || 10;
    var curT = GM.turn || 1;

    // 收集所有 chars[*].relations[*].history 中近 N 回合的事件
    var deltas = [];
    var seen = {}; // 双向去重

    GM.chars.forEach(function(c) {
      if (!c || c.alive === false || !c.relations) return;
      Object.keys(c.relations).forEach(function(targetName) {
        var r = c.relations[targetName];
        if (!r || !Array.isArray(r.history) || r.history.length === 0) return;
        // 取近 N 回合内的事件
        var recent = r.history.filter(function(h) { return h && h.turn && (curT - h.turn) <= lookbackTurns; });
        if (recent.length === 0) return;

        // 用规范化 key 去重（A→B 与 B→A 视为同一对）
        var key = [c.name, targetName].sort().join('||');
        if (seen[key]) return;
        seen[key] = true;

        // 取最近一条作为代表性事件
        var latest = recent[recent.length - 1];
        deltas.push({
          a: c.name,
          b: targetName,
          turn: latest.turn,
          event: latest.event || '',
          emotion: latest.emotion || '',
          weight: latest.weight || 0,
          // 当前关系强度
          affinity: r.affinity,
          hostility: r.hostility,
          labels: Array.isArray(r.labels) ? r.labels.slice(-3) : []
        });
      });
    });

    // 也合并 sc1/sc15 的 affinity_changes（如果本回合 _turnAiResults 已有数据）
    if (GM._turnAiResults && GM._turnAiResults.subcall1 && Array.isArray(GM._turnAiResults.subcall1.affinity_changes)) {
      GM._turnAiResults.subcall1.affinity_changes.forEach(function(ac) {
        if (!ac || !ac.a || !ac.b) return;
        var key = [ac.a, ac.b].sort().join('||');
        if (seen[key]) return; // 已经在 history 里
        seen[key] = true;
        deltas.push({
          a: ac.a, b: ac.b, turn: curT,
          event: ac.reason || '关系变动',
          emotion: '',
          weight: ac.delta || 0,
          relType: ac.relType || ''
        });
      });
    }

    if (deltas.length === 0) return '';

    // 按 turn 倒序，取 top maxEntries
    deltas.sort(function(a, b) { return (b.turn || 0) - (a.turn || 0) || Math.abs(b.weight || 0) - Math.abs(a.weight || 0); });
    var capped = deltas.slice(0, maxEntries);

    var lines = capped.map(function(d) {
      // 关系类型推断
      var rel = '';
      if (d.labels && d.labels.length) rel = d.labels.join('/');
      else if (d.relType) rel = d.relType;
      else if (d.affinity != null && d.hostility != null) {
        if (d.hostility > 50) rel = '仇敌';
        else if (d.affinity > 75) rel = '亲厚';
        else if (d.affinity < 25) rel = '疏远';
        else rel = '中立';
      }
      var weightTag = d.weight ? (d.weight > 0 ? '+' + Math.round(d.weight) : Math.round(d.weight)) : '';
      var line = '· T' + d.turn + ' ' + d.a + ' ↔ ' + d.b;
      if (rel) line += '【' + rel + '】';
      if (d.event) line += '：' + String(d.event).slice(0, 60);
      if (d.emotion) line += '·情:' + d.emotion;
      if (weightTag) line += '(' + weightTag + ')';
      return line;
    });

    return '\n=== 近 ' + lookbackTurns + ' 回合关系突变（NPC 行为应受这些已发生的关系变动驱动） ===\n' +
           lines.join('\n') + '\n=== 这些关系不可"凭空回到从前"·必须延续推演 ===\n';
  }

  // ────── 6. 上回合 → 本回合 Brief（自动凝练前情提要） ──────
  function buildPriorTurnBrief() {
    if (typeof GM === 'undefined' || !GM) return '';
    // 从上一回合的 _turnAiResults 残余 + shijiHistory 末条提取关键发生
    var prior = (GM.shijiHistory && GM.shijiHistory.length > 0) ? GM.shijiHistory[GM.shijiHistory.length - 1] : null;
    if (!prior) return '';

    var bullets = [];

    // (a) NPC 重大行动（从上一回合的 subcall1.npc_actions 取，但通常已被清理；从 shiji 摘要里提）
    // 简化版：从 prior.shilu 或 shizhengji 提取前 3 句话
    var src = prior.shilu || prior.shizhengji || '';
    if (src && typeof src === 'string') {
      // 抽前 3 句（按句号/惊叹号/问号切）
      var sentences = src.split(/[。！？\n]/).filter(function(s) { return s && s.trim().length > 8; }).slice(0, 3);
      sentences.forEach(function(s) { bullets.push('· ' + s.trim().slice(0, 80)); });
    }

    // (b) 上回合死亡角色（从 _epitaphs 取 turn === prior.turn 的）
    if (Array.isArray(GM._epitaphs)) {
      var priorDeaths = GM._epitaphs.filter(function(ep) { return ep && ep.diedTurn === prior.turn; });
      if (priorDeaths.length > 0) {
        bullets.push('· 上回合薨逝：' + priorDeaths.map(function(ep) { return ep.char + (ep.reason ? '(' + ep.reason + ')' : ''); }).join('、'));
      }
    }

    // (c) 上回合人事变动
    if (Array.isArray(prior.personnel) && prior.personnel.length > 0) {
      var pn = prior.personnel.slice(0, 4).map(function(p) { return p.name + '→' + (p.change || ''); }).join('；');
      bullets.push('· 上回合人事：' + pn);
    }

    // (d) 上回合玩家诏令（前 2 条）
    if (prior.edicts) {
      var ed = [];
      ['political', 'military', 'diplomatic', 'economic'].forEach(function(cat) {
        if (prior.edicts[cat]) ed.push(String(prior.edicts[cat]).split('\n')[0].slice(0, 50));
      });
      if (ed.length > 0) bullets.push('· 上回合玩家诏：' + ed.slice(0, 2).join(' | '));
    }

    // (e) 即将爆发的 schemes（progress=即将发动）
    if (Array.isArray(GM.activeSchemes)) {
      var imminent = GM.activeSchemes.filter(function(s) { return s && s.progress === '即将发动'; }).slice(0, 2);
      imminent.forEach(function(s) {
        bullets.push('· 暗流将爆：' + (s.schemer || '?') + ' 谋 ' + (s.target || '?') + '·' + String(s.plan || '').slice(0, 30));
      });
    }

    // (f) 跨回合关系最新突变（top 2）
    if (Array.isArray(GM.chars)) {
      var topRelDelta = null;
      var maxAbsWeight = 0;
      GM.chars.forEach(function(c) {
        if (!c || !c.relations) return;
        Object.keys(c.relations).forEach(function(t) {
          var r = c.relations[t];
          if (!r || !Array.isArray(r.history) || r.history.length === 0) return;
          var latest = r.history[r.history.length - 1];
          if (!latest || latest.turn !== prior.turn) return;
          var w = Math.abs(latest.weight || 0);
          if (w > maxAbsWeight) {
            maxAbsWeight = w;
            topRelDelta = { a: c.name, b: t, event: latest.event, weight: latest.weight };
          }
        });
      });
      if (topRelDelta) {
        bullets.push('· 关系突变：' + topRelDelta.a + ' ↔ ' + topRelDelta.b + '·' + (topRelDelta.event || ''));
      }
    }

    if (bullets.length === 0) return '';

    return '\n=== 上回合 → 本回合 Brief（前情提要·本回合应延续） ===\n' +
           bullets.join('\n') + '\n=== 本回合推演必须延续上述线索·不可遗忘 ===\n';
  }

  // ────── 7. 已确立事实清单（共识漂移防御） ──────
  // 思路：把"近 X 回合内发生的不可逆 fact"列出·让 AI 看到"这些已经板上钉钉"
  // 涵盖：死亡（不能复活）·任免（现任职位）·重大事件（不能否认）
  function buildCanonicalFacts(lookbackTurns) {
    if (typeof GM === 'undefined' || !GM) return '';
    lookbackTurns = lookbackTurns || 15;
    var curT = GM.turn || 1;
    var facts = [];

    // (a) 不可逆死亡（last lookbackTurns 回合内的）
    if (Array.isArray(GM._epitaphs)) {
      GM._epitaphs.forEach(function(ep) {
        if (!ep || !ep.char) return;
        var t = ep.diedTurn || 0;
        if (curT - t > lookbackTurns) return;
        facts.push({
          type: '死亡',
          turn: t,
          fact: ep.char + ' 已殁' + (ep.reason ? '(' + ep.reason + ')' : '') + (ep.positionAtDeath ? '·卒时任' + ep.positionAtDeath : '')
        });
      });
    }

    // (b) 现任要职（top 8）—— 当前事实，不带回合
    var currentOffices = _collectTopOfficials(8);
    currentOffices.filter(function(o) { return o.holder; }).forEach(function(o) {
      facts.push({
        type: '现任',
        turn: 0,
        fact: o.dept + '·' + o.position + ' = ' + o.holder
      });
    });

    // (c) 已完成的诏令（最近 lookbackTurns 内）
    if (Array.isArray(GM._edictTracker)) {
      GM._edictTracker.forEach(function(et) {
        if (!et || et.status !== 'completed') return;
        var t = et.completedTurn || et.turn || 0;
        if (curT - t > lookbackTurns) return;
        facts.push({
          type: '诏成',
          turn: t,
          fact: '【' + (et.category || '诏') + '】' + String(et.content || '').slice(0, 50) + ' 已成'
        });
      });
    }

    // (d) ChronicleTracker 长期事势中已 completed 的（如果有）
    if (typeof ChronicleTracker !== 'undefined' && ChronicleTracker.getAll) {
      try {
        var chronAll = ChronicleTracker.getAll({ statusFilter: 'completed' }) || [];
        chronAll.slice(0, 8).forEach(function(c) {
          if (!c || curT - (c.completedTurn || c.startTurn || 0) > lookbackTurns) return;
          facts.push({
            type: '事成',
            turn: c.completedTurn || c.startTurn || 0,
            fact: (c.title || c.name || '?') + ' 已' + (c.result || '成')
          });
        });
      } catch(_chronE) {}
    }

    // (e) 玩家近期重大决定（已下且不可撤回的诏）
    if (GM.shijiHistory && GM.shijiHistory.length > 0) {
      var recentShiji = GM.shijiHistory.slice(-Math.min(5, lookbackTurns));
      recentShiji.forEach(function(sh) {
        if (!sh || !sh.edicts) return;
        ['political', 'military', 'diplomatic', 'economic'].forEach(function(cat) {
          var v = sh.edicts[cat];
          if (!v || typeof v !== 'string') return;
          var firstLine = v.split('\n')[0].trim();
          if (firstLine && firstLine.length > 8) {
            facts.push({
              type: '玩家诏',
              turn: sh.turn || 0,
              fact: firstLine.slice(0, 60)
            });
          }
        });
      });
    }

    if (facts.length === 0) return '';

    // 按 type 分组（死亡/现任/诏成/事成/玩家诏）
    var grouped = {};
    facts.forEach(function(f) {
      if (!grouped[f.type]) grouped[f.type] = [];
      grouped[f.type].push(f);
    });

    var sections = [];
    var typeOrder = ['死亡', '现任', '诏成', '事成', '玩家诏'];
    typeOrder.forEach(function(t) {
      if (!grouped[t]) return;
      var items = grouped[t].slice(0, 6);
      sections.push('【' + t + '】 ' + items.map(function(f) {
        return f.turn ? 'T' + f.turn + ': ' + f.fact : f.fact;
      }).join('；'));
    });

    if (sections.length === 0) return '';

    return '\n=== 已确立的不可逆事实（漂移防御·近 ' + lookbackTurns + ' 回合内已成事实） ===\n' +
           sections.join('\n') + '\n=== 推演内容不得与以上事实矛盾·若需引用须保持一致 ===\n';
  }

  // ────── 总入口（一站式调用） ──────
  function buildAllSnapshots(opts) {
    opts = opts || {};
    var parts = [];
    if (opts.snapshot !== false) parts.push(buildWorldStateSnapshot());
    if (opts.deadPin !== false) parts.push(buildDeadPin());
    if (opts.canonical !== false) parts.push(buildCanonicalFacts(opts.canonicalLookback));
    if (opts.priorBrief !== false) parts.push(buildPriorTurnBrief());
    if (opts.edicts !== false) parts.push(buildEdictProgressCards());
    if (opts.relations !== false) parts.push(buildRelationDeltas(opts.maxRelations, opts.relationsLookback));
    if (opts.npcs !== false) parts.push(buildNpcOneLiners(opts.maxNpcs));
    return parts.filter(Boolean).join('\n');
  }

  // ────── 暴露到 window ──────
  global.WorldSnapshot = {
    buildWorldStateSnapshot: buildWorldStateSnapshot,
    buildDeadPin: buildDeadPin,
    buildEdictProgressCards: buildEdictProgressCards,
    buildNpcOneLiners: buildNpcOneLiners,
    buildRelationDeltas: buildRelationDeltas,
    buildPriorTurnBrief: buildPriorTurnBrief,
    buildCanonicalFacts: buildCanonicalFacts,
    buildAll: buildAllSnapshots
  };
  // 兼容裸函数调用
  global._buildWorldStateSnapshot = buildWorldStateSnapshot;
  global._buildDeadPin = buildDeadPin;
  global._buildEdictProgressCards = buildEdictProgressCards;
  global._buildNpcOneLiners = buildNpcOneLiners;
  global._buildRelationDeltas = buildRelationDeltas;
  global._buildPriorTurnBrief = buildPriorTurnBrief;
  global._buildCanonicalFacts = buildCanonicalFacts;
  global._buildAllSnapshots = buildAllSnapshots;
})(typeof window !== 'undefined' ? window : this);
