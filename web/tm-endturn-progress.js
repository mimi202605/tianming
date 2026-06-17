// ============================================================
//  tm-endturn-progress.js — 过回合进度拍表引擎（backlog 方案乙）
//  doc: web/docs/endturn-progress-precision-backlog.md
//
//  做什么：
//  1. 以「真实标签」为键，把过回合链路上 34 个 showLoading 调用
//     路由到单调拍表——治倒序传值（94.5→92.5、89→85 等）与
//     执行器母拍 18+12i 脱节问题。零改既有调用点。
//  2. 爬升上界：配合 tm-utils 的 setLoadingCrawlCeil，把 400ms
//     自动爬升从「无脑奔 95」改为「不越过下一拍下界」，条全程有语义。
//  3. 对外发拍事件（start/beat/label/done），供过回合电影化加载层
//     （tm-endturn-loading.js）订阅驱动。
//
//  边界：只在「时移事去」→ hideLoading 的过回合窗口内生效；
//  开局生成/读档/科举等其他 showLoading 调用原样直通旧行为。
//  拍表与预览页 web/preview/endturn-loading-preview.html 同源，
//  本表为权威，预览页为对照稿。
// ============================================================
(function() {
  'use strict';

  // ---- 拍表：真实时序 + 单调显示值（note 详见 backlog 文档） ----
  // match: 'exact' 全等 / 'prefix' 前缀；stream 拍取调用方实算 pct（50+min(15,字数/1500)）夹带内。
  var BEATS = [
    { id: 'core-start',     pct: 10,   group: 'entry',   match: '时移事去' },
    { id: 'step-1',         pct: 18,   group: 'prep',    match: '回合阶段 1/', prefix: true },
    { id: 'step-2',         pct: 30,   group: 'prefetch', match: '回合阶段 2/', prefix: true },
    { id: 'step-3',         pct: 42,   group: 'ai',      match: '回合阶段 3/', prefix: true },
    { id: 'infer-db',       pct: 42.3, group: 'ai',      match: '检索数据库中' },
    { id: 'infer-pack',     pct: 42.6, group: 'ai',      match: '打包数据' },
    { id: 'ai-think',       pct: 43,   group: 'ai',      match: 'AI深度思考' },
    { id: 'ai-stream',      pct: 50,   group: 'ai',      match: 'AI推演中', prefix: true, stream: true, bandMax: 65.9 },
    { id: 'ai-review',      pct: 66,   group: 'ai',      match: '深度回顾' },
    { id: 'ai-text',        pct: 67,   group: 'ai',      match: '史官成文' },
    { id: 'ai-parallel',    pct: 68,   group: 'deepsim', match: '文事·势力·并行推演' },
    { id: 'fu-npc',         pct: 69,   group: 'deepsim', match: 'NPC全面推演' },
    { id: 'fu-faction',     pct: 70,   group: 'deepsim', match: '势力自主推演' },
    { id: 'fu-econ',        pct: 71,   group: 'deepsim', match: '经济财政推演' },
    { id: 'fu-military',    pct: 72,   group: 'deepsim', match: '军事态势推演' },
    { id: 'fu-memory',      pct: 73,   group: 'deepsim', match: 'NPC记忆回写' },
    { id: 'fu-tale',        pct: 74,   group: 'deepsim', match: 'AI撰写后人戏说' },
    { id: 'fu-quality',     pct: 85,   group: 'deepsim', match: '叙事质量审查' },
    { id: 'fu-cognition',   pct: 89,   group: 'deepsim', match: 'NPC 认知整合' },
    { id: 'fu-history',     pct: 89.5, group: 'deepsim', match: '历史检查' },
    { id: 'fu-parse',       pct: 90,   group: 'deepsim', match: '解析' },
    { id: 'step-4',         pct: 91,   group: 'edict',   match: '回合阶段 4/', prefix: true },
    { id: 'step-5',         pct: 92,   group: 'systems', match: '回合阶段 5/', prefix: true },
    { id: 'sys-update',     pct: 92.4, group: 'systems', match: '更新数据' },
    { id: 'sys-npc-engine', pct: 92.8, group: 'systems', match: '运行 NPC Engine' },
    { id: 'sys-territory',  pct: 93.1, group: 'systems', match: '计算领地产出' },
    { id: 'sys-fiscal',     pct: 93.4, group: 'systems', match: '财政结算' },
    { id: 'sys-changes',    pct: 93.7, group: 'systems', match: '应用决策变动' },
    { id: 'sys-history',    pct: 94,   group: 'systems', match: '检查历史事件' },
    { id: 'sys-tenure',     pct: 94.3, group: 'systems', match: '检查职位与寿数' },
    { id: 'sys-listeners',  pct: 94.6, group: 'systems', match: '处理监听队列' },
    { id: 'sys-cache',      pct: 94.9, group: 'systems', match: '清理回合缓存' },
    { id: 'step-6',         pct: 95.2, group: 'render',  match: '回合阶段 6/', prefix: true },
    { id: 'render-shiji',   pct: 97,   group: 'render',  match: '生成史记弹窗' }
  ];
  // 双段式提示词模式的「AI推演 (1/2)」「AI推演 (2/2)」并入流式拍位
  var ALIAS_TO_STREAM = 'AI推演 (';

  var active = false;
  var beatIdx = -1;
  var listeners = [];

  function matchBeat(msg) {
    var label = String(msg == null ? '' : msg);
    if (!label) return null;
    if (label.indexOf(ALIAS_TO_STREAM) === 0) label = 'AI推演中';
    for (var i = 0; i < BEATS.length; i++) {
      var b = BEATS[i];
      if (b.prefix ? label.indexOf(b.match) === 0 : label === b.match) {
        return { beat: b, index: i };
      }
    }
    return null;
  }

  function ceilingFor(index) {
    var next = BEATS[index + 1];
    return next ? Math.max(next.pct - 0.1, BEATS[index].pct) : 98.5;
  }

  function emit(type, payload) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](type, payload); } catch (e) {}
    }
  }

  var origShow = window.showLoading;
  var origHide = window.hideLoading;

  window.showLoading = function(msg, pct) {
    try {
      if (typeof origShow !== 'function') return;
      // 注意：不在此处做朝会闸——开朝会的回合「时移事去」会落在朝会窗口内，
      // 在这里闸掉会让引擎整回合漏开闸（实测踩过）。视觉抑制由 origShow 自带的
      // 朝会闸负责；引擎只管全程记账，加载层自行决定朝会期间不上屏。
      var m = matchBeat(msg);

      // 过回合窗口开闸：core 入口拍
      if (m && m.beat.id === 'core-start') {
        active = true;
        beatIdx = -1;
        // 上回合若异常未走 hideLoading，钳制残值会卡住新回合——开闸时清零
        if (typeof window._loadingMaxPct === 'number') window._loadingMaxPct = 0;
        emit('start', { beats: BEATS });
      }

      if (active && m) {
        if (m.index > beatIdx) beatIdx = m.index;     // 拍只进不退；倒序标签不回拨
        var beat = BEATS[beatIdx];
        var shown = beat.pct;
        if (beat.stream && typeof pct === 'number' && isFinite(pct)) {
          // 流式拍：尊重调用方实算值（50+min(15,字数/1500)），夹进拍带
          shown = Math.min(Math.max(pct, beat.pct), beat.bandMax || beat.pct);
        }
        if (typeof window.setLoadingCrawlCeil === 'function') {
          window.setLoadingCrawlCeil(beat.stream ? (beat.bandMax || ceilingFor(beatIdx)) : ceilingFor(beatIdx));
        }
        emit('beat', { index: beatIdx, beat: beat, label: String(msg), pct: shown, total: BEATS.length });
        return origShow(msg, shown);
      }

      if (active) {
        // 过回合窗口内的未知标签（科举/谏官等横插）：直通，不动拍不动上界
        emit('label', { index: beatIdx, label: String(msg), pct: pct });
      }
      return origShow(msg, pct);
    } catch (e) {
      // 引擎任何异常都不允许影响加载链路
      try { return origShow(msg, pct); } catch (e2) {}
    }
  };

  window.hideLoading = function() {
    try {
      if (active) {
        // 过回合链路存在「中途 hideLoading」（AI 校验失败中止 steps:350、
        // 朝会 deferred 路 steps:568、错误兜底 core:514）——不能一律当收尾。
        // 双信号区分：到达末拍=正常落幕 done；未到末拍且回合已不忙=中止 abort；
        // 未到末拍且回合仍忙=暂避 pause（朝会等横插，引擎保持开闸等下一拍复出）。
        var atEnd = beatIdx === BEATS.length - 1;
        var busy = typeof GM !== 'undefined' && GM
          && (GM._endTurnBusy === true || GM.busy === true);
        if (atEnd || !busy) {
          active = false;
          beatIdx = -1;
          emit(atEnd ? 'done' : 'abort', {});
        } else {
          emit('pause', {});
        }
      }
      if (typeof window.setLoadingCrawlCeil === 'function') window.setLoadingCrawlCeil(95);
    } catch (e) {}
    if (typeof origHide === 'function') return origHide();
  };

  // ---- 对外 API ----
  window.TM = window.TM || {};
  TM.Endturn = TM.Endturn || {};
  TM.Endturn.Progress = {
    BEATS: BEATS,
    isActive: function() { return active; },
    current: function() {
      return active && beatIdx >= 0
        ? { index: beatIdx, beat: BEATS[beatIdx], total: BEATS.length }
        : null;
    },
    on: function(cb) { if (typeof cb === 'function' && listeners.indexOf(cb) < 0) listeners.push(cb); },
    off: function(cb) { var i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }
  };
})();
