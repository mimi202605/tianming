// ============================================================
// smoke-transmigration-formal-shell.js — 穿越模式 vs phase8 御案 shell 隔离回归
// ------------------------------------------------------------
// 2026-07-20 根治「穿越模式进入后还是皇帝界面」bug 的专项回归。
// 历史根因:
//   doActualStart L1863 _tmStartRefreshFormalShell → TMPhase8FormalBridge.refresh()
//   → syncFormalShellVisibility() 返回 true(无穿越守卫) → ensureMainShell() 在 #gc
//   创建 #tm-phase8-main-shell(皇帝御案 UI) → CSS 规则
//   `body.tm-phase8-formal:not(.tm-phase8-legacy) .gc > :not(#tm-phase8-main-shell){display:none!important}`
//   隐藏 TM.PlayerUI.render 写入 #gc 的玩家 UI·玩家看到皇帝御案。
//
// 修复:
//   (1) phase8-formal-bridge.js syncFormalShellVisibility 加穿越模式守卫·返回 false 且切 tm-phase8-legacy
//   (2) phase8-formal-bridge.js 新增 enterLegacyMode 公共 API(setLegacyView(true) + 清 #tm-phase8-main-shell)
//   (3) tm-game-ui-shell.js renderPlayerState 调 enterLegacyMode(覆盖游戏启动+存档加载两条路径)
//
// 断言: 源码契约 + 沙箱运行时行为(DOM 副作用)
// 末尾打印 [smoke-transmigration-formal-shell] PASS · N sub-tests
// ============================================================
'use strict';
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

// ── 源码契约断言(无需 DOM) ─────────────────────────────────
var bridgeSrc = fs.readFileSync(path.join(WEB_DIR, 'phase8-formal-bridge.js'), 'utf8');
var shellSrc = fs.readFileSync(path.join(WEB_DIR, 'tm-game-ui-shell.js'), 'utf8');

console.log('── 源码契约 ──');

// (1) syncFormalShellVisibility 有穿越模式守卫
ok('syncFormalShellVisibility 含 transmigrationMode 守卫',
   /function syncFormalShellVisibility\(\)\{[\s\S]*?transmigrationMode === true[\s\S]*?playerRole && _?pi\.?playerInfo\.?playerRole[\s\S]*?\}/.test(bridgeSrc) ||
   /function syncFormalShellVisibility\(\)\{[\s\S]*?transmigrationMode === true[\s\S]*?playerRole &&[\s\S]*?!== 'emperor'[\s\S]*?\}/.test(bridgeSrc),
   '须含 transmigrationMode === true + playerRole !== emperor 守卫');

ok('syncFormalShellVisibility 守卫调 setLegacyView(true)',
   /function syncFormalShellVisibility\(\)\{[\s\S]{0,800}setLegacyView\(true\)/.test(bridgeSrc),
   '穿越模式分支须调 setLegacyView(true) 切 body class');

ok('syncFormalShellVisibility 守卫返回 false',
   /function syncFormalShellVisibility\(\)\{[\s\S]{0,900}return false/.test(bridgeSrc),
   '穿越模式分支须 return false·让 refresh/ensureMainShell 等 phase8 函数降级');

// (2) enterLegacyMode 公共 API
ok('bridge 定义 enterLegacyMode 函数',
   /function enterLegacyMode\(\)\{[\s\S]*?setLegacyView\(true\)/.test(bridgeSrc),
   'enterLegacyMode 须调 setLegacyView(true)');

ok('enterLegacyMode 清出 #tm-phase8-main-shell',
   /function enterLegacyMode\(\)\{[\s\S]{0,300}getElementById\('tm-phase8-main-shell'\)[\s\S]{0,100}\.remove\(\)/.test(bridgeSrc),
   'enterLegacyMode 须显式 remove #tm-phase8-main-shell·防历史遗留 shell 覆盖玩家 UI');

ok('TMPhase8FormalBridge 导出 enterLegacyMode',
   /TMPhase8FormalBridge\s*=\s*\{[\s\S]{0,500}enterLegacyMode:\s*enterLegacyMode/.test(bridgeSrc),
   'bridge 命名空间须导出 enterLegacyMode·供 renderPlayerState 调用');

// (3) renderPlayerState 调 enterLegacyMode
ok('renderPlayerState 调 TMPhase8FormalBridge.enterLegacyMode()',
   /function renderPlayerState\(\)\{[\s\S]{0,1500}TMPhase8FormalBridge[\s\S]{0,80}enterLegacyMode/.test(shellSrc),
   'renderPlayerState 须在调 TM.PlayerUI.render* 前先调 enterLegacyMode');

ok('renderPlayerState 有 TMPhase8FormalBridge 缺席降级(直接加 body class)',
   /function renderPlayerState\(\)\{[\s\S]{0,1800}classList\.add\('tm-phase8-legacy'\)/.test(shellSrc),
   'TMPhase8FormalBridge 缺席时须降级直接加 tm-phase8-legacy body class');

// ── 沙箱运行时行为断言(伪 DOM) ─────────────────────────────
console.log('── 沙箱运行时行为 ──');

// 伪 DOM 工厂
function _makeNode(idOrTag) {
  return {
    id: idOrTag,
    tagName: idOrTag,
    style: {},
    classList: {
      _cls: [],
      add: function (c) { if (this._cls.indexOf(c) < 0) this._cls.push(c); },
      remove: function (c) { var i = this._cls.indexOf(c); if (i >= 0) this._cls.splice(i, 1); },
      toggle: function (c, force) {
        var on = force !== undefined ? !!force : (this._cls.indexOf(c) < 0);
        if (on) this.add(c); else this.remove(c);
      },
      contains: function (c) { return this._cls.indexOf(c) >= 0; }
    },
    innerHTML: '',
    textContent: '',
    setAttribute: function () {},
    addEventListener: function () {},
    appendChild: function (c) { this._children = this._children || []; this._children.push(c); c._parent = this; return c; },
    insertBefore: function (newNode, ref) { this._children = this._children || []; this._children.unshift(newNode); newNode._parent = this; return newNode; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    remove: function () {
      if (this._parent && this._parent._children) {
        var i = this._parent._children.indexOf(this);
        if (i >= 0) this._parent._children.splice(i, 1);
        this._parent = null;
      }
    }
  };
}

var bodyCls = [];
var bodyNode = {
  classList: {
    add: function (c) { if (bodyCls.indexOf(c) < 0) bodyCls.push(c); },
    remove: function (c) { var i = bodyCls.indexOf(c); if (i >= 0) bodyCls.splice(i, 1); },
    toggle: function (c, force) {
      var on = force !== undefined ? !!force : (bodyCls.indexOf(c) < 0);
      if (on) this.add(c); else this.remove(c);
    },
    contains: function (c) { return bodyCls.indexOf(c) >= 0; }
  }
};

var gcNode = _makeNode('gc');
gcNode._children = [];
var gNode = _makeNode('G');
gNode.style = { display: 'block' };  // 模拟 #G 可见
var shellNode = _makeNode('tm-phase8-main-shell');

var nodes = { gc: gcNode, G: gNode, 'tm-phase8-main-shell': shellNode };

var sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Error: Error,
  document: {
    body: bodyNode,
    getElementById: function (id) { return nodes[id] || null; },
    createElement: function (tag) { return _makeNode(tag); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    readyState: 'complete'
  },
  window: null,
  TM: {},
  P: { playerInfo: null },
  GM: null,
  toast: function () {}
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

// 加载 phase8-formal-bridge.js(其依赖极少·主要测 syncFormalShellVisibility / enterLegacyMode)
// 但 phase8-formal-bridge.js 末尾有 installFormalShell() 调用·会触发 document.body.classList.add('tm-phase8-formal')
// 这是预期行为·模拟真实加载
try {
  var bridgeCode = fs.readFileSync(path.join(WEB_DIR, 'phase8-formal-bridge.js'), 'utf8');
  vm.runInContext(bridgeCode, sandbox, { filename: 'phase8-formal-bridge.js' });
} catch (e) {
  // 容忍 phase8-formal-bridge.js 加载时的依赖缺失(它依赖 esc/asset/...)·只关心 syncFormalShellVisibility/enterLegacyMode
  // 但若 TMPhase8FormalBridge 未导出·后续断言会失败
}

var bridge = sandbox.TMPhase8FormalBridge;
ok('TMPhase8FormalBridge 已加载', !!bridge, '加载异常: ' + (bridge ? '' : 'bridge undefined'));

// 模拟 #tm-phase8-main-shell 已存在于 #gc(模拟历史遗留·上一次皇帝游戏残留)
shellNode._parent = gcNode;
gcNode._children.push(shellNode);
ok('测试前置: #tm-phase8-main-shell 已挂 #gc', gcNode._children.indexOf(shellNode) >= 0);

// ── 场景 1: 穿越模式·syncFormalShellVisibility 应返回 false 且切 tm-phase8-legacy ──
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister', characterName: '赵孟頫' };
bodyCls.length = 0;  // 重置 body class
// 先移除 tm-phase8-legacy 模拟「未切 legacy」初始态
var syncResult;
try {
  syncResult = bridge._syncFormalShellVisibility();
} catch (e) {
  ok('穿越模式 syncFormalShellVisibility 不抛错', false, String(e));
  syncResult = null;
}
ok('穿越模式 syncFormalShellVisibility 返回 false', syncResult === false,
   'got: ' + syncResult);
ok('穿越模式 syncFormalShellVisibility 切 tm-phase8-legacy body class',
   bodyCls.indexOf('tm-phase8-legacy') >= 0,
   'body classes: ' + bodyCls.join(','));

// ── 场景 2: 穿越模式·enterLegacyMode 应清出 #tm-phase8-main-shell 且切 tm-phase8-legacy ──
bodyCls.length = 0;
// 重新挂 #tm-phase8-main-shell(场景 1 可能没清·syncFormalShellVisibility 只切 class 不清 shell)
if (gcNode._children.indexOf(shellNode) < 0) {
  shellNode._parent = gcNode;
  gcNode._children.push(shellNode);
}
ok('场景 2 前置: #tm-phase8-main-shell 重新挂 #gc', gcNode._children.indexOf(shellNode) >= 0);

try {
  bridge.enterLegacyMode();
} catch (e) {
  ok('enterLegacyMode 不抛错', false, String(e));
}

ok('enterLegacyMode 切 tm-phase8-legacy body class',
   bodyCls.indexOf('tm-phase8-legacy') >= 0,
   'body classes: ' + bodyCls.join(','));
ok('enterLegacyMode 清出 #tm-phase8-main-shell(从 #gc 移除)',
   gcNode._children.indexOf(shellNode) < 0,
   '#gc children: ' + gcNode._children.map(function (c) { return c.id; }).join(','));

// ── 场景 3: 皇帝模式·syncFormalShellVisibility 不应切 tm-phase8-legacy(防误降级) ──
sandbox.P.playerInfo = { transmigrationMode: false, playerRole: 'emperor' };
bodyCls.length = 0;
try {
  syncResult = bridge._syncFormalShellVisibility();
} catch (e) {
  ok('皇帝模式 syncFormalShellVisibility 不抛错', false, String(e));
  syncResult = null;
}
ok('皇帝模式 syncFormalShellVisibility 不切 tm-phase8-legacy(防误降级)',
   bodyCls.indexOf('tm-phase8-legacy') < 0,
   'body classes: ' + bodyCls.join(','));

// ── 场景 4: playerRole=emperor 但 transmigrationMode=true(穿越到君主)·不应切 legacy(君主仍走御案) ──
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'emperor' };
bodyCls.length = 0;
try {
  syncResult = bridge._syncFormalShellVisibility();
} catch (e) {
  syncResult = null;
}
ok('穿越到君主(transmigrationMode=true && playerRole=emperor) 不切 legacy(仍走御案)',
   bodyCls.indexOf('tm-phase8-legacy') < 0,
   'body classes: ' + bodyCls.join(','));

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-formal-shell] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-formal-shell] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
