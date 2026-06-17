// ============================================================
//  verify-update-card.js — S3 更新卡组件验证（DOM 桩·无浏览器）
//  运行：node web/scripts/verify-update-card.js
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'web', 'tm-update-card.js'), 'utf-8');

let assertions = 0;
function assert(cond, label) {
  if (cond) { assertions++; console.log('  ok·' + label); }
  else { console.error('  FAIL·' + label); process.exit(1); }
}

// ── 源码静态检查 ──
const CODE = SRC.replace(/^\s*\/\/.*$/gm, ''); // 剥行注释·注释里允许提及 tm-ota 作说明
assert(CODE.indexOf('tm-ota') === -1, '静态·代码不含 tm-ota（安卓卡命名空间零接触）');
assert(SRC.indexOf('Capacitor') === -1 && SRC.indexOf('window.tianming') === -1, '静态·平台无关（无 Capacitor / window.tianming 引用）');
assert(SRC.indexOf('#tm-upc-card') !== -1, '静态·CSS 走 tm-upc 命名空间');
assert(SRC.indexOf('.tm-upc-actions[hidden]{display:none;}') !== -1, '静态·[hidden] 显式隐藏护栏在（author flex 优先级教训）');

// ── DOM 桩 ──
function makeEl(tag) {
  let innerHTML = '';
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '', className: '', textContent: '', hidden: false,
    style: {},
    _children: [],
    _handlers: {},
    _classes: new Set(),
    classList: {
      add() { for (const c of arguments) el._classes.add(c); },
      remove() { for (const c of arguments) el._classes.delete(c); },
      contains(c) { return el._classes.has(c); }
    },
    _qcache: {},
    querySelector(sel) {
      if (!el._qcache[sel]) el._qcache[sel] = makeEl('div');
      return el._qcache[sel];
    },
    addEventListener(evt, fn) { (el._handlers[evt] = el._handlers[evt] || []).push(fn); },
    appendChild(child) { el._children.push(child); child.parentNode = el; return child; },
    removeChild(child) { el._children = el._children.filter(c => c !== child); child.parentNode = null; },
    parentNode: null,
    setAttribute() {}
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return innerHTML; },
    set(v) { innerHTML = String(v); if (innerHTML === '') el._children = []; } // 浏览器语义·清空即弃子
  });
  return el;
}
const created = [];
const bodyEl = makeEl('body');
bodyEl.contains = el => bodyEl._children.indexOf(el) !== -1;
const documentStub = {
  getElementById: () => null,
  createElement(tag) { const el = makeEl(tag); created.push(el); return el; },
  head: makeEl('head'),
  documentElement: makeEl('html'),
  body: bodyEl
};
const timers = [];
const setTimeoutStub = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
const clearTimeoutStub = id => { if (timers[id - 1]) timers[id - 1].cleared = true; };
function fireTimers(ms) {
  timers.slice().forEach(t => {
    if (!t.cleared && !t.fired && (ms == null || t.ms === ms)) { t.fired = true; t.fn(); }
  });
}
const windowStub = {};

new Function('window', 'document', 'setTimeout', 'clearTimeout', SRC)(windowStub, documentStub, setTimeoutStub, clearTimeoutStub);

const C = windowStub.TMUpdateCard;
assert(!!C, '组件已挂 window.TMUpdateCard');
['show', 'progress', 'done', 'toast', 'fail', 'setActions', 'hide', 'isVisible'].forEach(fn => {
  assert(typeof C[fn] === 'function', 'API·' + fn + ' 在');
});

// ── show → 卡进 body ──
C.show({ title: '发现新版本', version: '9.9.9.9', subtitle: '' });
assert(bodyEl._children.length === 1, 'show·卡片挂进 body');
assert(C.isVisible() === true, 'show·isVisible=true');
const cardEl = bodyEl._children[0];
assert(cardEl.querySelector('.tm-upc-title').textContent === '发现新版本', 'show·标题正确');
assert(cardEl.querySelector('.tm-upc-ver').textContent === 'v9.9.9.9', 'show·版本徽章正确');

// ── progress ──
C.progress({ percent: 42, doneBytes: 42e6, totalBytes: 100e6, bps: 3e6 });
assert(cardEl.querySelector('.tm-upc-fill').style.width === '42%', 'progress·填充 42%');
assert(cardEl.querySelector('.tm-upc-pct').textContent === '42%', 'progress·百分比文本');
assert(/40\.1 MB \/ 95\.4 MB/.test(cardEl.querySelector('.tm-upc-sz').textContent), 'progress·大小格式化');
C.progress({ percent: 10, label: '3/87 文件' });
assert(cardEl.querySelector('.tm-upc-sz').textContent.indexOf('3/87 文件') === 0, 'progress·label（增量文件计数）');

// ── setActions·点击触发 onClick ──
let clicked = 0;
C.setActions([
  { label: '立即更新', primary: true, onClick: () => { clicked++; } },
  { label: '查看更新内容', onClick: () => {} }
]);
const actEl = cardEl.querySelector('.tm-upc-actions');
assert(actEl.hidden === false && actEl._children.length === 2, 'setActions·两个按钮渲染');
assert(actEl._children[0].className.indexOf('tm-upc-primary') !== -1, 'setActions·primary 金按钮');
actEl._children[0]._handlers.click[0]();
assert(clicked === 1, 'setActions·点击触发 onClick');

// ── done ──
let restarted = 0;
C.done({ version: '9.9.9.9', note: '重启后生效', actions: [{ label: '立即重启生效', primary: true, onClick: () => { restarted++; } }] });
assert(cardEl.querySelector('.tm-upc-pct').textContent === '100%', 'done·满条');
assert(cardEl.querySelector('.tm-upc-eta').textContent === '重启后生效', 'done·note 文案');
actEl._children[0]._handlers.click[0]();
assert(restarted === 1, 'done·重启按钮可点');

// ── fail·自动收起 ──
C.fail('网络异常，稍后自动重试');
assert(cardEl.querySelector('.tm-upc-sz').textContent === '网络异常，稍后自动重试', 'fail·错误文案');
assert(timers.some(t => t.ms === 6000 && !t.cleared), 'fail·6s 自动收起已排程');

// ── toast + hide ──
C.toast('已是最新版', '1.3.3.5', 3200);
assert(cardEl.querySelector('.tm-upc-title').textContent === '已是最新版', 'toast·标题');
C.hide();
fireTimers(380);
assert(C.isVisible() === false, 'hide·卡片移除');

console.log('PASS assertions=' + assertions);
