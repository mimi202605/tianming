// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-memory-steward.js — 记忆管家 agent（S1·核心模块·未接线）
//
// 目的：用「本地预扫工作清单 + 单次结构化固化调用」替代 6 个写死的记忆压缩 pass 中的 5 个：
//   compress_ai_memory / compress_foreshadows / compress_conversation（followup.js·阈值触发）
//   _scL2AIGenerate（每5回合）/ _scL3Condense（每30回合）（post-turn-jobs.js）
//   —— 不并入 _scReflect（元认知·非压缩·单列）；不动 _updateFactionArcs（纯确定性·无 LLM）。
//
// 为何 agent 化（守 [[tianming-top-level-vision]] 命门 + agent 化有界铁律）：
//   · 现状 5 个 pass 各自独立触发·互不知情·会各压一遍同源记忆（跨层重复）·且 compress×3 丢 provenance。
//   · 本模块本地预扫（确定性零 LLM）算出"本回合该压哪些"→ 一次 LLM 同时看全所有层 → 跨层去重 → 一次返回所有摘要。
//   · 重负载回合 5 次压缩调用 → 1 次。且每条摘要统一过 MemorySourceBound 带 provenance（补齐 compress×3 缺口·记忆可溯源=AI 可信地基）。
//   · 后台运行（玩家不等）·单跳不自主循环（不做多轮 tool-call agent·守延迟/确定性墙）。
//
// 跨朝代中立（守 [[tianming-engine-cross-dynasty]]）：层名/动作（aiMemory/foreshadows/conv/L2/L3·compress/rollup）皆通用词·无朝代专名。
//
// 依赖外部（均 window 全局·缺失静默降级）：GM / P / callAIMessages / extractJSON /
//   getCompressionParams(tm-utils.js) / TM.MemorySourceBound.buildSummaryMetadata / memoryEntryText / DebugLog
//
// 接线（S2·尚未做）：followup.js 压缩段 + post-turn-jobs L2/L3 在 P.ai.memoryStewardEnabled 开时跳过·改调 TM.MemorySteward.run(GM)。默认关=零回归。
// ============================================================

(function (global) {
  var TM = global.TM = global.TM || {};
  if (TM.MemorySteward) return; // 防重复加载

  // S4 鲁棒性：steward 是单次"全有全无"调用(失败则本回合不压缩)·连失 FAIL_THRESHOLD 回合→自动回落旧 5 pass·达阈后每 RETRY_EVERY 回合重试一次(防一次抖动永久禁用)。
  var FAIL_THRESHOLD = 2, RETRY_EVERY = 5;

  function _dbg() {
    try {
      if (global.DebugLog && typeof global.DebugLog.log === 'function') {
        var a = ['ai'].concat(Array.prototype.slice.call(arguments));
        global.DebugLog.log.apply(global.DebugLog, a);
      }
    } catch (e) {}
  }

  function _memText(entry) {
    try {
      if (typeof global.memoryEntryText === 'function') return global.memoryEntryText(entry);
    } catch (e) {}
    return String((entry && (entry.content || entry.text || entry.summary)) || '');
  }

  // 复用现有压缩参数（基于实际上下文窗口动态探测·缺失给保守默认）
  function _params() {
    try {
      if (typeof global.getCompressionParams === 'function') {
        var cp = global.getCompressionParams();
        if (cp && typeof cp === 'object') return cp;
      }
    } catch (e) {}
    return {
      memCompressThreshold: 40, foreCompressThreshold: 30, convCompressThreshold: 40,
      memKeepRecent: 20, foreKeepRecent: 15, summaryLen: 600, foreSummaryLen: 400,
      contextK: 32, scale: 1
    };
  }

  // 统一 provenance 包装（补齐 compress×3 缺口·与 L2/L3 同源）。缺 MemorySourceBound 则返回 {} 静默降级。
  function _provenance(GM, type, turn, turnRange, text, sourceItems, maxBasisRefs) {
    try {
      if (TM.MemorySourceBound && typeof TM.MemorySourceBound.buildSummaryMetadata === 'function') {
        var meta = TM.MemorySourceBound.buildSummaryMetadata(GM, {
          type: type, turn: turn, turnRange: turnRange, text: text || '',
          sourceItems: sourceItems || [], maxBasisRefs: maxBasisRefs || 24
        });
        return meta || {};
      }
    } catch (e) { _dbg('[MemorySteward] provenance fail:', e && e.message); }
    return {};
  }

  function _attachMeta(record, meta) {
    if (!meta) return record;
    ['id', 'sourceRefs', 'basisRefs', 'evidenceRefs', 'contentHash',
     'authorityLevel', 'authorityRank', 'basisMaxAuthorityRank', 'factStatus', 'lane'
    ].forEach(function (k) { if (meta[k] !== undefined) record[k] = meta[k]; });
    return record;
  }

  // ── 可观测（S3）：活通道=GM._memoryStewardLog(存档带走·控制台可查) + 控制台 _dbg；recordMemoryDiagnostic 当前休眠(全局未定义)·守卫调用为未来面板预留 ──
  function _diag(type, data) {
    try { if (typeof global.recordMemoryDiagnostic === 'function') global.recordMemoryDiagnostic(type, data); } catch (e) {}
  }
  function _snap(GM) {
    try { if (typeof global.buildMemoryDiagnosticSnapshot === 'function') return global.buildMemoryDiagnosticSnapshot(GM); } catch (e) {}
    return null;
  }
  function _logRun(GM, entry) {
    try {
      if (!GM._memoryStewardLog) GM._memoryStewardLog = [];
      GM._memoryStewardLog.push(entry);
      if (GM._memoryStewardLog.length > 20) GM._memoryStewardLog = GM._memoryStewardLog.slice(-20);
    } catch (e) {}
  }
  function _now() { return (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0; }

  // ── ① 本地预扫（确定性·零 LLM）→ 工作清单 ──
  // 触发条件逐一复用现有 5 pass 的原触发（阈值来自 getCompressionParams·L2/L3 用每5/30回合 cadence）·
  // 统一成一张清单·让单次调用跨层去重。
  function scan(GM, opts) {
    opts = opts || {};
    GM = GM || global.GM;
    var out = { turn: 0, tasks: [] };
    if (!GM) return out;
    var turn = GM.turn || 0;
    out.turn = turn;
    var cp = _params();

    // compress aiMemory（followup.js:3073 同条件）
    var aiMem = GM._aiMemory || [];
    if (aiMem.length > cp.memCompressThreshold) {
      var keepM = cp.memKeepRecent;
      out.tasks.push({
        layer: 'aiMemory', action: 'compress',
        old: aiMem.slice(0, aiMem.length - keepM), keepRecent: keepM, targetLen: cp.summaryLen
      });
    }
    // compress foreshadows（followup.js:3111 同条件）
    var fore = GM._foreshadows || [];
    if (fore.length > cp.foreCompressThreshold) {
      var keepF = cp.foreKeepRecent;
      out.tasks.push({
        layer: 'foreshadows', action: 'compress',
        old: fore.slice(0, fore.length - keepF), keepRecent: keepF, targetLen: cp.foreSummaryLen
      });
    }
    // compress conversation（followup.js:3147 同条件·双阈值）
    var conv = GM.conv || [];
    var P = global.P || {};
    var maxConv = (P.conf && P.conf.convKeep) || (((P.ai && P.ai.mem) || 20) * 2);
    if (conv.length > cp.convCompressThreshold && conv.length > maxConv * 0.7) {
      var half = Math.floor(conv.length / 2);
      out.tasks.push({ layer: 'conv', action: 'compress', old: conv.slice(0, half), keepFrom: half });
    }
    // L2 rollup（post-turn-jobs.js:71 每5回合·防重）
    if (turn > 0 && turn % 5 === 0) {
      var bStart = turn - 4;
      var ml = GM._memoryLayers || {};
      var doneL2 = (ml.L2 || []).some(function (x) { return x && x.turnBucket === turn && x.aiGenerated; });
      if (!doneL2) {
        var bMem = aiMem.filter(function (m) { return m && m.turn >= bStart && m.turn <= turn; });
        var bShiji = (GM.shijiHistory || []).filter(function (s) { return s && s.turn >= bStart && s.turn <= turn; });
        if (bMem.length || bShiji.length) {
          out.tasks.push({ layer: 'L2', action: 'rollup', range: bStart + '-' + turn, turnBucket: turn, mems: bMem, shiji: bShiji });
        }
      }
    }
    // L3 rollup（post-turn-jobs.js:170 每30回合·从 L2 升）
    if (turn > 0 && turn % 30 === 0) {
      var l3Start = turn - 29;
      var ml3 = GM._memoryLayers || {};
      var doneL3 = (ml3.L3 || []).some(function (x) { return x && x.turnBucket === turn && x.aiGenerated; });
      if (!doneL3) {
        var bL2 = (ml3.L2 || []).filter(function (x) { return x && x.turnBucket >= l3Start && x.turnBucket <= turn; });
        if (bL2.length) out.tasks.push({ layer: 'L3', action: 'rollup', range: l3Start + '-' + turn, turnBucket: turn, l2s: bL2 });
      }
    }
    return out;
  }

  // ── ② 构建单次结构化固化请求（只含清单内任务·让模型一次看全→跨层去重）──
  function buildConsolidationRequest(workList, GM) {
    var tasks = (workList && workList.tasks) || [];
    var turn = (workList && workList.turn) || (GM && GM.turn) || 0;
    var sys = '你是史官·记忆管家。一次性把下列各"记忆层"分别压缩为高密度摘要·保留关键因果链/人物动态/势力消长/伏笔线索·丢弃重复与琐碎。'
      + '【跨层去重铁律】你同时看到多个层·同一事件若在多层出现·只在最合适的层详写·其余层一笔带过·不要逐层重复堆砌。仅返回 JSON。';
    var u = '【回合】T' + turn + '·需固化的记忆层如下·按各层要求分别压缩：\n\n';
    var schema = {};

    tasks.forEach(function (t) {
      if (t.layer === 'aiMemory') {
        u += '<layer name="aiMemory" 说明="AI 远期背景记忆·共' + t.old.length + '条待压">\n';
        t.old.forEach(function (m) { u += 'T' + (m.turn || '?') + ': ' + _memText(m).slice(0, 200) + '\n'; });
        u += '</layer>\n\n';
        schema.aiMemory_summary = '将 aiMemory 全部压为一段连贯高密度摘要(' + t.targetLen + '字·保留所有关键因果链与人物动态)';
        schema.aiMemory_threads = '仍在发展中的关键线索(200字)';
      } else if (t.layer === 'foreshadows') {
        u += '<layer name="foreshadows" 说明="伏笔/暗线·共' + t.old.length + '条待整理">\n';
        t.old.forEach(function (f) { u += 'T' + (f.turn || '?') + ': ' + _memText(f).slice(0, 200) + '\n'; });
        u += '</layer>\n\n';
        schema.foreshadows_active = '仍活跃的伏笔汇总(' + t.targetLen + '字)';
        schema.foreshadows_resolved = '已回收(实现/失效)的伏笔简述(100字)';
      } else if (t.layer === 'conv') {
        u += '<layer name="conv" 说明="早期玩家-AI 对话·共' + t.old.length + '条待压">\n';
        t.old.forEach(function (c) { u += '[' + (c.role || '?') + '] ' + String(c.content || '').slice(0, 150) + '\n'; });
        u += '</layer>\n\n';
        schema.conv_summary = '对话历史压缩摘要(300-500字·保留玩家关键决策/AI 重要建议/双方共识/未解议题)';
      } else if (t.layer === 'L2') {
        u += '<layer name="L2" 说明="近5回合情景 rollup·T' + t.range + '">\n';
        (t.shiji || []).forEach(function (s) { u += '<时政 T' + s.turn + '>' + String(s.shizhengji || s.shilu_text || '').slice(0, 400) + '\n'; });
        (t.mems || []).forEach(function (m) { u += '<记忆 T' + m.turn + '>' + _memText(m).slice(0, 150) + '\n'; });
        u += '</layer>\n\n';
        schema.L2 = { summary: '情景摘要(200-300字·主要事件+人物关系演变+情绪氛围)', mood: '整体情感基调(30字)', keyCharacters: '[{name,role}]', themes: '[主题…]', turning_points: '[关键转折(30字)…]' };
      } else if (t.layer === 'L3') {
        u += '<layer name="L3" 说明="近30回合年代纲要·从 L2 升·T' + t.range + '">\n';
        (t.l2s || []).forEach(function (x) { u += '<情景 ' + x.turnRange + ' 基调=' + (x.mood || '') + '>' + String(x.summary || '').slice(0, 400) + '\n'; });
        u += '</layer>\n\n';
        schema.L3 = { theme: '年代核心主题(40字)', atmosphere: '年代总体氛围(30字)', highlights: '[高光时刻(T?·30字)×5]', mainThreads: '贯穿主线(80字)', causalSummary: '主要事件因果链(100字)', keyCharacters: '[{name,role,emotional_arc}]' };
      }
    });

    u += '【输出 JSON·只含上面出现的层对应的键】\n' + JSON.stringify(schema, null, 1);
    return { system: sys, user: u, expectedKeys: Object.keys(schema) };
  }

  // ── ③ 写回（每条摘要统一带 provenance·镜像各 pass 原 writeback 形状·行为等价 + 补溯源）──
  function applyConsolidation(GM, workList, parsed) {
    GM = GM || global.GM;
    if (!GM || !parsed) return { applied: [], deltas: [] };
    var turn = GM.turn || 0;
    var applied = [];
    var _sz = function (layer) {
      if (layer === 'aiMemory') return (GM._aiMemory || []).length;
      if (layer === 'foreshadows') return (GM._foreshadows || []).length;
      if (layer === 'conv') return (GM.conv || []).length;
      if (layer === 'L2') return ((GM._memoryLayers && GM._memoryLayers.L2) || []).length;
      if (layer === 'L3') return ((GM._memoryLayers && GM._memoryLayers.L3) || []).length;
      return 0;
    };
    var before = { aiMemory: _sz('aiMemory'), foreshadows: _sz('foreshadows'), conv: _sz('conv'), L2: _sz('L2'), L3: _sz('L3') };
    (workList.tasks || []).forEach(function (t) {
      try {
        if (t.layer === 'aiMemory' && parsed.aiMemory_summary) {
          var keepMem = (GM._aiMemory || []).slice(-t.keepRecent);
          var lastOldTurn = (t.old[t.old.length - 1] || {}).turn || '?';
          var content = '【历史记忆压缩摘要·T1-T' + lastOldTurn + '】' + parsed.aiMemory_summary + (parsed.aiMemory_threads ? '\n【活跃线索】' + parsed.aiMemory_threads : '');
          var rec = { turn: turn, content: content, type: 'compressed', priority: 'critical' };
          _attachMeta(rec, _provenance(GM, 'memoryCompress.aiMemory', turn, 'T1-T' + lastOldTurn, content, t.old, 24));
          GM._aiMemory = [rec].concat(keepMem);
          applied.push('aiMemory');
        } else if (t.layer === 'foreshadows' && parsed.foreshadows_active) {
          var keepFore = (GM._foreshadows || []).slice(-t.keepRecent);
          var fcontent = '【伏笔压缩摘要】' + parsed.foreshadows_active + (parsed.foreshadows_resolved ? '\n【已回收】' + parsed.foreshadows_resolved : '');
          var frec = { turn: turn, content: fcontent, type: 'compressed', priority: 'high' };
          _attachMeta(frec, _provenance(GM, 'memoryCompress.foreshadows', turn, 'T' + turn, fcontent, t.old, 24));
          GM._foreshadows = [frec].concat(keepFore);
          applied.push('foreshadows');
        } else if (t.layer === 'conv' && parsed.conv_summary) {
          if (!GM._convArchive) GM._convArchive = [];
          Array.prototype.push.apply(GM._convArchive, t.old.map(function (c) {
            return { role: c.role, content: c.content, _turn: turn, _compressedBy: 'steward' };
          }));
          var keepConv = (GM.conv || []).slice(t.keepFrom);
          GM.conv = [{ role: 'system', content: '【早期对话压缩摘要】' + parsed.conv_summary }].concat(keepConv);
          applied.push('conv');
        } else if (t.layer === 'L2' && parsed.L2 && parsed.L2.summary) {
          if (!GM._memoryLayers) GM._memoryLayers = { L1: [], L2: [], L3: [] };
          GM._memoryLayers.L2 = (GM._memoryLayers.L2 || []).filter(function (x) { return x.turnBucket !== t.turnBucket || !x.aiGenerated; });
          var l2 = {
            turnBucket: t.turnBucket, turnRange: t.range, summary: parsed.L2.summary,
            mood: parsed.L2.mood || '', keyCharacters: parsed.L2.keyCharacters || [],
            themes: parsed.L2.themes || [], turning_points: parsed.L2.turning_points || [],
            aiGenerated: true, createdAt: turn
          };
          _attachMeta(l2, _provenance(GM, 'memoryLayerL2', t.turnBucket, t.range, parsed.L2.summary, (t.shiji || []).concat(t.mems || []), 24));
          GM._memoryLayers.L2.push(l2);
          if (GM._memoryLayers.L2.length > 12) GM._memoryLayers.L2 = GM._memoryLayers.L2.slice(-12);
          applied.push('L2');
        } else if (t.layer === 'L3' && parsed.L3 && parsed.L3.theme) {
          if (!GM._memoryLayers) GM._memoryLayers = { L1: [], L2: [], L3: [] };
          GM._memoryLayers.L3 = (GM._memoryLayers.L3 || []).filter(function (x) { return x.turnBucket !== t.turnBucket || !x.aiGenerated; });
          var txt = [parsed.L3.theme, parsed.L3.atmosphere, parsed.L3.mainThreads, parsed.L3.causalSummary].filter(Boolean).join(' ');
          var l3 = {
            turnBucket: t.turnBucket, turnRange: t.range, theme: parsed.L3.theme,
            atmosphere: parsed.L3.atmosphere || '', highlights: parsed.L3.highlights || [],
            mainThreads: parsed.L3.mainThreads || '', causalSummary: parsed.L3.causalSummary || '',
            keyCharacters: parsed.L3.keyCharacters || [], summary: parsed.L3.theme + '·' + (parsed.L3.atmosphere || ''),
            aiGenerated: true, createdAt: turn
          };
          _attachMeta(l3, _provenance(GM, 'memoryLayerL3', t.turnBucket, t.range, txt, t.l2s, 30));
          GM._memoryLayers.L3.push(l3);
          applied.push('L3');
        }
      } catch (e) { _dbg('[MemorySteward] apply ' + t.layer + ' fail:', e && e.message); }
    });
    var deltas = applied.map(function (layer) { return { layer: layer, before: before[layer], after: _sz(layer) }; });
    return { applied: applied, deltas: deltas };
  }

  // ── S4·接管 or 回落 决策：每回合只算一次并缓存·保证 followup(compress×3) 与 post-turn-jobs(L2/L3) 两处读同一答案(否则 steward 中途改 streak 会致两处不一致) ──
  function shouldHandle(GM) {
    GM = GM || global.GM;
    if (!GM) return false;
    var P = global.P || {};
    if (!((typeof global.agentFlagOn==='function' ? global.agentFlagOn('memoryStewardEnabled') : (P.ai && P.ai.memoryStewardEnabled)) && TM.MemorySteward)) return false;
    var turn = GM.turn || 0;
    if (GM._memoryStewardDecision && GM._memoryStewardDecision.turn === turn) return GM._memoryStewardDecision.active;
    var streak = GM._memoryStewardFailStreak || 0;
    // 连失阈内→steward 接管；达阈→回落旧 pass·但每 RETRY_EVERY 回合重试一次
    var active = (streak < FAIL_THRESHOLD) || (turn % RETRY_EVERY === 0);
    GM._memoryStewardDecision = { turn: turn, active: active };
    return active;
  }

  // ── ④ 编排：扫→(有任务才)单次调用→写回。后台·单跳·不自主循环。 ──
  async function run(GM, opts) {
    opts = opts || {};
    GM = GM || global.GM;
    if (!GM) return { skipped: 'noGM' };
    var P = global.P || {};
    if (!P.ai || !P.ai.key) return { skipped: 'noKey' };

    var workList = scan(GM, opts);
    if (!workList.tasks.length) return { skipped: 'noTasks', turn: workList.turn };

    var req = buildConsolidationRequest(workList, GM);
    _dbg('[MemorySteward] run T' + workList.turn + ' tasks=' + workList.tasks.map(function (t) { return t.layer; }).join(','));

    if (typeof global.callAIMessages !== 'function') return { skipped: 'noCaller', tasks: workList.tasks.length };

    var raw;
    try {
      raw = await global.callAIMessages([
        { role: 'system', content: req.system },
        { role: 'user', content: req.user }
      ], opts.maxTok || 8000, opts.signal || null, opts.tier || 'primary', { priority: 'background', timeoutMs: opts.timeoutMs || 60000, maxRetries: 1, id: 'memory_steward' });
    } catch (e) {
      _dbg('[MemorySteward] call fail:', e && e.message);
      // 【S4】连失累加·达阈下回合 shouldHandle 回落旧 pass。【S3 可观测】失败记日志(让 owner 看得到失败连发)。
      GM._memoryStewardFailStreak = (GM._memoryStewardFailStreak || 0) + 1;
      _logRun(GM, { turn: workList.turn, failed: true, reason: 'call', error: String(e && e.message || e), requested: workList.tasks.map(function (t) { return t.layer; }), streak: GM._memoryStewardFailStreak, ts: _now() });
      return { failed: true, error: String(e && e.message || e), streak: GM._memoryStewardFailStreak, tasks: workList.tasks.length };
    }

    var parsed = null;
    try { parsed = (typeof global.extractJSON === 'function') ? global.extractJSON(raw) : JSON.parse(raw); } catch (e) {}
    if (!parsed) {
      GM._memoryStewardFailStreak = (GM._memoryStewardFailStreak || 0) + 1;
      _logRun(GM, { turn: workList.turn, failed: true, reason: 'parse', requested: workList.tasks.map(function (t) { return t.layer; }), streak: GM._memoryStewardFailStreak, ts: _now() });
      return { failed: true, error: 'parse', streak: GM._memoryStewardFailStreak, tasks: workList.tasks.length };
    }

    var res = applyConsolidation(GM, workList, parsed);
    GM._memoryStewardFailStreak = 0; // 成功→连失清零·恢复 steward 接管
    var entry = {
      turn: workList.turn,
      requested: workList.tasks.map(function (t) { return t.layer; }),
      applied: res.applied, deltas: res.deltas,
      provenance: !!(TM.MemorySourceBound && TM.MemorySourceBound.buildSummaryMetadata),
      calls: 1, ts: _now()
    };
    _logRun(GM, entry);
    _diag('memory_steward', { status: 'ok', turn: workList.turn, requested: entry.requested, applied: res.applied, deltas: res.deltas, calls: 1, snapshot: _snap(GM) });
    _dbg('[MemorySteward] applied=' + res.applied.join(',') + ' deltas=' + JSON.stringify(res.deltas));
    return { ok: true, turn: workList.turn, requested: entry.requested, applied: res.applied, deltas: res.deltas };
  }

  function summarize(GM) {
    GM = GM || global.GM;
    var w = scan(GM, {});
    return { turn: w.turn, pendingTasks: w.tasks.map(function (t) { return t.layer + ':' + t.action; }) };
  }

  // 控制台观测：TM.MemorySteward.lastRun() 看上次固化了哪些层/前后条数·log() 看最近 20 次
  function lastRun(GM) { GM = GM || global.GM; var l = GM && GM._memoryStewardLog; return (l && l.length) ? l[l.length - 1] : null; }
  function log(GM) { GM = GM || global.GM; return (GM && GM._memoryStewardLog) || []; }

  TM.MemorySteward = {
    scan: scan,
    buildConsolidationRequest: buildConsolidationRequest,
    applyConsolidation: applyConsolidation,
    run: run,
    shouldHandle: shouldHandle,
    summarize: summarize,
    lastRun: lastRun,
    log: log,
    _provenance: _provenance
  };
})(typeof window !== 'undefined' ? window : globalThis);
