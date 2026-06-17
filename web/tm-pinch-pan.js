// ============================================================
//  tm-pinch-pan.js — 触屏 pinch 缩放 + 单/双指拖拽通用桥（2026-06-14）
//
//  绑定到一个「手势面」元素 surface，只监听 touch 事件：
//    · 单指拖动 → pan（屏幕像素位移）
//    · 双指捏合 → pinch 缩放（含中点为锚）+ 双指平移
//  每次 touchmove 把「原始手势量」回调给视图，由视图用自己的坐标/变换模型施加：
//    舆图用内容单位(map.width/height)、官制树用屏幕 px(ox/oy)——各自复用既有
//    wheel 的 zoom-at-anchor 公式，故缩放手感与桌面滚轮一致。
//
//  仅 touch 事件经此；鼠标 / wheel / pointer(mouse) 路径完全不经过 → 桌面零影响。
//  surface 需配 CSS `touch-action:none`（见 tm-touch.css），否则浏览器会先抢走手势。
// ============================================================
(function (global) {
  'use strict';
  if (typeof window === 'undefined') return;
  var TM = global.TM = global.TM || {};

  function dist(a, b) {
    var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function mid(a, b) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  // attachPinchPan(surface, opts)
  //   opts.shouldStart(touchTarget) -> bool   单指起手是否接管（默认 true；
  //                                            官制树用来跳过卡片/按钮以保留点击）。
  //                                            双指(pinch)永远接管，不受此约束。
  //   opts.onGesture({panDX, panDY, zoom, cx, cy})   每次 move 调一次：
  //       panDX/panDY = 锚点屏幕像素位移；zoom = 本帧捏合比(1=无)；cx/cy = 锚点 client 坐标
  //   opts.onEnd({moved})   手势结束（可选；moved=是否真的拖动过，供吞 tap 判定）
  // 返回 detach()。
  function attachPinchPan(surface, opts) {
    if (!surface || typeof surface.addEventListener !== 'function') return function () {};
    opts = opts || {};
    var shouldStart = typeof opts.shouldStart === 'function' ? opts.shouldStart : function () { return true; };
    var onGesture = typeof opts.onGesture === 'function' ? opts.onGesture : function () {};
    var onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : function () {};

    var active = false;   // 手势进行中
    var mode = 0;         // 1=单指 pan, 2=双指 pinch
    var lastX = 0, lastY = 0, lastDist = 0;
    var moved = false;

    function setSingle(t) { mode = 1; lastX = t.clientX; lastY = t.clientY; lastDist = 0; }
    function setDouble(t0, t1) { mode = 2; var m = mid(t0, t1); lastX = m.x; lastY = m.y; lastDist = dist(t0, t1); }

    function onStart(e) {
      if (!e.touches || !e.touches.length) return;
      if (e.touches.length >= 2) { active = true; moved = false; setDouble(e.touches[0], e.touches[1]); return; }
      // 单指：尊重 shouldStart（落在卡片/按钮上 → 不接管，让原生 click 走）
      if (!shouldStart(e.target)) { active = false; mode = 0; return; }
      active = true; moved = false; setSingle(e.touches[0]);
    }

    function onMove(e) {
      if (!active || !e.touches || !e.touches.length) return;
      if (e.touches.length >= 2) {
        if (mode !== 2) { setDouble(e.touches[0], e.touches[1]); return; } // 升指：重设基准防跳变
        if (e.cancelable) e.preventDefault();
        var m = mid(e.touches[0], e.touches[1]);
        var d = dist(e.touches[0], e.touches[1]);
        var zoom = (lastDist > 0 && d > 0) ? (d / lastDist) : 1;
        var pdx = m.x - lastX, pdy = m.y - lastY;
        lastX = m.x; lastY = m.y; lastDist = d; moved = true;
        onGesture({ panDX: pdx, panDY: pdy, zoom: zoom, cx: m.x, cy: m.y });
      } else {
        if (mode !== 1) { setSingle(e.touches[0]); return; } // 降指：重设基准
        if (e.cancelable) e.preventDefault();
        var t = e.touches[0];
        var dx = t.clientX - lastX, dy = t.clientY - lastY;
        lastX = t.clientX; lastY = t.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) moved = true;
        onGesture({ panDX: dx, panDY: dy, zoom: 1, cx: t.clientX, cy: t.clientY });
      }
    }

    function onStop(e) {
      if (!active) return;
      if (e.touches && e.touches.length === 1) { setSingle(e.touches[0]); return; } // 双指松到单指：继续单指 pan
      active = false; mode = 0;
      onEnd({ moved: moved });
    }

    surface.addEventListener('touchstart', onStart, { passive: true });
    surface.addEventListener('touchmove', onMove, { passive: false });
    surface.addEventListener('touchend', onStop, { passive: true });
    surface.addEventListener('touchcancel', onStop, { passive: true });

    return function detach() {
      surface.removeEventListener('touchstart', onStart);
      surface.removeEventListener('touchmove', onMove);
      surface.removeEventListener('touchend', onStop);
      surface.removeEventListener('touchcancel', onStop);
    };
  }

  TM.attachPinchPan = attachPinchPan;
  global.attachPinchPan = attachPinchPan;
  if (typeof module !== 'undefined' && module.exports) module.exports = { attachPinchPan: attachPinchPan };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
