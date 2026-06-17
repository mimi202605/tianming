// ============================================================
//  tm-touch-gestures.js — 触屏手势桥（移植 Phase 2 · S2.x · 2026-06-03）
//
//  长按 ≈ 鼠标右键：触屏按住约 500ms 不移动 → 在触点派发 contextmenu 事件。
//  （单击仍是原生左键 click，不动。）
//
//  为何 contextmenu 即可覆盖全部右键用法：游戏右键处理器都监听 'contextmenu'
//  （phase8-formal-map.js 区域/舞台、tm-topbar-vars.js 变量、phase8-formal-bridge.js
//   人物卡——bridge 另兼听 mousedown(button:2) 但与 contextmenu 同一 handle()+700ms 去重，
//   故只派 contextmenu 不会重复触发）。
//
//  仅触屏设备挂载（navigator.maxTouchPoints>0）；鼠标右键完全不经此路，零影响。
//  桌面/web 无触点 → 整个模块 no-op。
// ============================================================

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // 无触屏能力 → 不挂任何监听（桌面鼠标右键照旧走原生 contextmenu）
  if (!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window)) return;

  var LONGPRESS_MS = 500;   // 长按判定时长
  var MOVE_TOL = 10;        // 超过即视为滑动/滚动，取消长按
  var timer = null, sx = 0, sy = 0, fired = false;

  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

  document.addEventListener('touchstart', function (e) {
    // 多指（缩放/双指平移）不算长按
    if (!e.touches || e.touches.length !== 1) { clearTimer(); fired = false; return; }
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY; fired = false;
    clearTimer();
    timer = setTimeout(function () {
      timer = null; fired = true;
      fireContextMenu(sx, sy);
    }, LONGPRESS_MS);
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', function (e) {
    if (!timer || !e.touches || !e.touches.length) return;
    var t = e.touches[0];
    if (Math.abs(t.clientX - sx) > MOVE_TOL || Math.abs(t.clientY - sy) > MOVE_TOL) clearTimer();
  }, { passive: true, capture: true });

  document.addEventListener('touchend', function () {
    clearTimer();
    if (fired) { suppressNextClick(); fired = false; }
  }, { passive: true, capture: true });

  document.addEventListener('touchcancel', function () { clearTimer(); fired = false; }, { passive: true, capture: true });

  function fireContextMenu(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    var ev;
    try {
      ev = new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, view: window,
        clientX: x, clientY: y, screenX: x, screenY: y,
        button: 2, buttons: 2
      });
    } catch (_) {
      ev = document.createEvent('MouseEvents');
      ev.initMouseEvent('contextmenu', true, true, window, 0, x, y, x, y, false, false, false, false, 2, null);
    }
    el.dispatchEvent(ev);
    // 轻触觉反馈（若支持），暗示「右键已触发」
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  }

  // 长按触发右键后，吞掉浏览器随 touchend 合成的那次 click，避免再触发一次左键
  function suppressNextClick() {
    var handler = function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('click', handler, true);
    // 兜底：若该次没有 click 合成，350ms 后撤掉，避免误吞下一次正常点击
    setTimeout(function () { document.removeEventListener('click', handler, true); }, 350);
  }
})();
