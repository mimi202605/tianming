// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-checklist.js — 合并审计工作流（preMerge/postMerge 一键操作）
 *
 * 目的：把 TM.state.snapshot + TM.perf.lockBaseline + TM.invariants.check
 *      等一键封装，让维护者执行 LAYERED 合并时操作更简单更稳健。
 *
 * 用法（典型合并流程）：
 *
 *   // 1. 合并前（收集 5-10 回合基线后执行）
 *   TM.checklist.preMerge('corruption-p2-merge')
 *   // → 自动 state.snapshot + perf.lockBaseline + invariants.check + errors.clear
 *
 *   // 2. 执行合并（改代码）
 *
 *   // 3. 合并后（再玩 5-10 回合后执行）
 *   TM.checklist.postMerge('corruption-p2-merge')
 *   // → 自动 state.snapshot + diff.printBySnapshot + perf.printCompare +
 *   //   invariants.check + errors.getSummary + 生成综合报告
 *
 *   // 4. 查报告（合并审计）
 *   TM.checklist.lastReport()     // 返回对象
 *   TM.checklist.downloadReport() // 下载 JSON
 * ============================================================ */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};
  if (window.TM.checklist) return;

  var lastReport = null;

  /** 合并前基线：state + perf + invariants + errors 清空 */
  function preMerge(tag) {
    tag = tag || 'merge-' + Date.now();
    var result = { tag: tag, phase: 'pre', when: new Date().toISOString(), steps: [] };

    // Step 1: state.snapshot
    try {
      var s = TM.state.snapshot('pre-' + tag);
      result.steps.push({ name: 'state.snapshot', ok: true, data: 'pre-' + tag });
    } catch(e) {
      result.steps.push({ name: 'state.snapshot', ok: false, error: e.message });
    }

    // Step 2: perf.lockBaseline
    try {
      var b = TM.perf.lockBaseline();
      result.steps.push({ name: 'perf.lockBaseline', ok: true, data: Object.keys(b.report).length + ' 项' });
    } catch(e) {
      result.steps.push({ name: 'perf.lockBaseline', ok: false, error: e.message });
    }

    // Step 3: invariants.check
    try {
      var iv = TM.invariants.check();
      result.steps.push({
        name: 'invariants.check',
        ok: iv.ok,
        data: iv.stats.passed + '/' + iv.stats.checked + ' passed',
        violations: iv.violations
      });
    } catch(e) {
      result.steps.push({ name: 'invariants.check', ok: false, error: e.message });
    }

    // Step 4: errors 预览（不清，保留历史）
    try {
      var esum = TM.errors.getSummary();
      result.steps.push({
        name: 'errors.baseline',
        ok: true,
        data: Object.keys(esum).length + ' modules',
        summary: esum
      });
    } catch(e) {
      result.steps.push({ name: 'errors.baseline', ok: false, error: e.message });
    }

    console.log('%c[checklist] ✓ preMerge(' + tag + ') 已完成', 'color:#7a7;font-weight:bold');
    result.steps.forEach(function(s) {
      var mark = s.ok ? '%c ✓' : '%c ✗';
      var color = s.ok ? 'color:#7a7' : 'color:#c66';
      console.log(mark + '  ' + s.name + (s.data ? ': ' + s.data : ''), color);
      if (!s.ok && s.error) console.log('     ' + s.error);
    });

    lastReport = result;
    return result;
  }

  /** 合并后对比：state diff + perf compare + invariants + errors delta */
  function postMerge(tag) {
    tag = tag || 'merge-' + Date.now();
    var result = { tag: tag, phase: 'post', when: new Date().toISOString(), steps: [] };

    // Step 1: state.snapshot post
    try {
      TM.state.snapshot('post-' + tag);
      result.steps.push({ name: 'state.snapshot', ok: true, data: 'post-' + tag });
    } catch(e) {
      result.steps.push({ name: 'state.snapshot', ok: false, error: e.message });
    }

    // Step 2: state diff
    try {
      var pre = TM.state.get('pre-' + tag);
      var post = TM.state.get('post-' + tag);
      if (!pre) {
        result.steps.push({ name: 'state.diff', ok: false, error: '找不到 pre-' + tag + ' 快照，先调 preMerge()' });
      } else {
        var d = TM.diff(pre, post, { ignore: ['_perf', '_errors', '_meta.capturedAt'] });
        result.steps.push({
          name: 'state.diff',
          ok: true,
          data: d.summary.changedCount + ' 改 / ' + d.summary.addedCount + ' 增 / ' + d.summary.removedCount + ' 删',
          diff: d
        });
      }
    } catch(e) {
      result.steps.push({ name: 'state.diff', ok: false, error: e.message });
    }

    // Step 3: perf.compareToBaseline
    try {
      var cmp = TM.perf.compareToBaseline(20);
      if (cmp.error) {
        result.steps.push({ name: 'perf.compare', ok: false, error: cmp.error });
      } else {
        result.steps.push({
          name: 'perf.compare',
          ok: cmp.regressions.length === 0,
          data: cmp.regressions.length + ' 回归 / ' + cmp.improvements.length + ' 改善 / ' + cmp.untouched.length + ' 持平',
          regressions: cmp.regressions,
          improvements: cmp.improvements
        });
      }
    } catch(e) {
      result.steps.push({ name: 'perf.compare', ok: false, error: e.message });
    }

    // Step 4: invariants 再跑
    try {
      var iv = TM.invariants.check();
      result.steps.push({
        name: 'invariants.postCheck',
        ok: iv.ok,
        data: iv.stats.passed + '/' + iv.stats.checked + ' passed',
        violations: iv.violations
      });
    } catch(e) {
      result.steps.push({ name: 'invariants.postCheck', ok: false, error: e.message });
    }

    // Step 5: errors delta
    try {
      var esum = TM.errors.getSummary();
      // 对比 preMerge 时的 errors
      var deltaTotal = Object.keys(esum).reduce(function(s, k){ return s + esum[k].count; }, 0);
      result.steps.push({
        name: 'errors.postCheck',
        ok: true,
        data: Object.keys(esum).length + ' modules · ' + deltaTotal + ' 累计错误',
        summary: esum
      });
    } catch(e) {
      result.steps.push({ name: 'errors.postCheck', ok: false, error: e.message });
    }

    // 综合判断
    var allOk = result.steps.every(function(s){ return s.ok; });
    result.overall = allOk ? 'ok' : 'needs-review';

    var color = allOk ? 'color:#7a7;font-weight:bold' : 'color:#c66;font-weight:bold';
    var mark = allOk ? '✓' : '✗';
    console.log('%c[checklist] ' + mark + ' postMerge(' + tag + ') 完成 - ' + result.overall, color);
    result.steps.forEach(function(s) {
      var m = s.ok ? '%c ✓' : '%c ✗';
      var c = s.ok ? 'color:#7a7' : 'color:#c66';
      console.log(m + '  ' + s.name + (s.data ? ': ' + s.data : ''), c);
      if (!s.ok && s.error) console.log('     ' + s.error);
    });

    if (result.steps[1] && result.steps[1].diff) {
      console.log('%c— state diff 详情 —', 'color:#e8c66e');
      TM.diff.print(
        TM.state.get('pre-' + tag),
        TM.state.get('post-' + tag),
        { ignore: ['_perf', '_errors', '_meta.capturedAt'] }
      );
    }
    if (result.steps[2] && result.steps[2].regressions && result.steps[2].regressions.length > 0) {
      console.log('%c— perf regressions —', 'color:#c66');
      if (typeof console.table === 'function') console.table(result.steps[2].regressions);
    }

    lastReport = result;
    return result;
  }

  function lastMergeReport() { return lastReport; }

  function downloadReport() {
    if (!lastReport) { console.warn('[checklist] 无 report 可下载'); return false; }
    try {
      var blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'tm-merge-' + (lastReport.tag || 'unknown') + '-' + lastReport.phase + '.json';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch(e) {
      console.error('[checklist] 下载失败', e);
      return false;
    }
  }

  /** 列出已记录的 pre/post 快照（方便追溯） */
  function listMerges() {
    if (!TM.state) return [];
    var all = TM.state.list();
    var merges = {};
    all.forEach(function(s){
      var m = s.name.match(/^(pre|post)-(.+)$/);
      if (!m) return;
      var tag = m[2];
      if (!merges[tag]) merges[tag] = { tag: tag };
      merges[tag][m[1]] = s;
    });
    return Object.keys(merges).map(function(k){ return merges[k]; });
  }

  TM.checklist = {
    preMerge: preMerge,
    postMerge: postMerge,
    lastReport: lastMergeReport,
    downloadReport: downloadReport,
    listMerges: listMerges
  };
})();
