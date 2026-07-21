#!/usr/bin/env node
// ============================================================
// smoke-transmigration-shell-preserve.js — 防止 PlayerUI.render 抹掉 #player-shell-container 回归
// ------------------------------------------------------------
// 2026-07-21 根治「穿越模式选完人物后只看到家族/婚姻/私产/产业系统块·8-tab shell 不显示」bug 的专项回归。
//
// 历史根因:
//   tm-player-ui-render.js 的 render(sceneKey) 在调完 TM.PlayerShell.render() 后,
//   又执行 gc.innerHTML = html, 把 #player-shell-container（PlayerShell 建的 8-tab shell 容器·
//   挂在 #gc 下）整体抹掉, 用 PlayerSystemsUI.renderTab 的旧版场景块 HTML 取代。
//   用户看到的就是被降级后的旧版块（家族含婚姻子面板 / 婚姻 状态：未婚 / 私产 现银0 / ...）。
//
// 修复:
//   render(sceneKey) 增加 shellRendered 标志·PlayerShell 渲染成功后绝不走 gc.innerHTML=html 路径。
//
// 断言:
//   场景 1: PlayerShell 渲染成功 → #player-shell-container 在 #gc 内不被抹掉·gc.innerHTML 不被改写
//   场景 2: PlayerShell 缺席 → 降级走 gc.innerHTML=html（旧路径·仍可用）
//   场景 3: PlayerShell.render 抛异常 → 降级走 gc.innerHTML=html（容错路径）
//
// 末尾打印 [smoke-transmigration-shell-preserve] PASS · N sub-tests
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

// ── 伪 DOM 节点工厂 ──────────────────────────────────────────
function _makeNode(id) {
  var node = {
    id: id, tagName: 'div', style: {},
    classList: {
      _cls: [],
      add: function (c) { if (this._cls.indexOf(c) < 0) this._cls.push(c); },
      remove: function (c) { var i = this._cls.indexOf(c); if (i >= 0) this._cls.splice(i, 1); },
      toggle: function (c, f) {
        var on = f !== undefined ? !!f : (this._cls.indexOf(c) < 0);
        if (on) this.add(c); else this.remove(c);
      },
      contains: function (c) { return this._cls.indexOf(c) >= 0; }
    },
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = (v == null ? '' : String(v));
      // innerHTML 被赋值 = 所有子节点被抹掉（模拟浏览器行为）
      this._children = [];
    },
    textContent: '',
    _children: [],
    _parent: null,
    setAttribute: function (k, v) { this._attr = this._attr || {}; this._attr[k] = v; },
    getAttribute: function (k) { return this._attr ? this._attr[k] : null; },
    addEventListener: function () {},
    appendChild: function (c) {
      if (c._parent && c._parent._children) {
        var i = c._parent._children.indexOf(c);
        if (i >= 0) c._parent._children.splice(i, 1);
      }
      this._children.push(c); c._parent = this; return c;
    },
    insertBefore: function (n, ref) {
      var i = ref ? this._children.indexOf(ref) : -1;
      if (i < 0) this._children.push(n); else this._children.splice(i, 0, n);
      n._parent = this; return n;
    },
    remove: function () {
      if (this._parent && this._parent._children) {
        var i = this._parent._children.indexOf(this);
        if (i >= 0) this._parent._children.splice(i, 1);
        this._parent = null;
      }
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  return node;
}

// ── 构造 sandbox + 加载 tm-player-ui-render.js ──────────────
function buildCtx() {
  var ctx = {
    console: console,
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    Set: Set, Map: Map,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}

// ── 通用：装 PlayerUI 进 sandbox ─────────────────────────────
function loadPlayerUI(ctx) {
  var src = fs.readFileSync(path.join(WEB_DIR, 'tm-player-ui-render.js'), 'utf8');
  vm.runInContext(src, ctx, { filename: 'tm-player-ui-render.js' });
}

// ── 通用：装 #gc + #player-shell-container 到 sandbox.document ──
// 模拟真实浏览器：_ensureShell 把 #player-shell-container 挂到 #gc 下
function installDOM(ctx, options) {
  options = options || {};
  var gcNode = _makeNode('gc');
  var shellNode = _makeNode('player-shell-container');
  shellNode._innerHTML = '<div id="player-shell-topbar"></div><div class="player-shell-body"></div>';
  gcNode._children.push(shellNode);
  shellNode._parent = gcNode;

  var nodes = { gc: gcNode, 'player-shell-container': shellNode };

  ctx.document = {
    getElementById: function (id) { return nodes[id] || null; },
    createElement: function (tag) { return _makeNode(tag); },
    body: { appendChild: function (c) { return c; }, classList: { add: function(){}, remove: function(){} } },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };

  // P.playerInfo: 穿越模式 + 非 emperor 角色
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '赵孟頫',
      characterTitle: '翰林学士'
    }
  };
  ctx.GM = { turn: 5 };

  // PlayerSystemsUI mock（用于降级路径断言·renderTab 返回旧版场景块 HTML）
  if (!ctx.TM) ctx.TM = {};
  ctx.TM.PlayerSystemsUI = {
    renderTab: function (sceneKey, role) {
      return '<div class="legacy-scene">' + sceneKey + '</div>';
    },
    bindEvents: function () {}
  };

  return { gcNode: gcNode, shellNode: shellNode, nodes: nodes };
}

// ═══════════════════════════════════════════════════════════
// 场景 1: PlayerShell.render 成功 → #player-shell-container 必须保留
// ═══════════════════════════════════════════════════════════
function testShellPreservedOnSuccess() {
  console.log('── 场景 1: PlayerShell.render 成功 → 不抹掉 #player-shell-container ──');
  var ctx = buildCtx();
  var dom = installDOM(ctx);
  loadPlayerUI(ctx);

  // mock TM.PlayerShell.render: 模拟成功（什么都不动·#player-shell-container 已在 #gc 内）
  var renderCalled = false;
  ctx.TM.PlayerShell = {
    render: function () { renderCalled = true; }
  };

  // 调用 TM.PlayerUI.render('home')
  var err = null;
  try { ctx.TM.PlayerUI.render('home'); }
  catch (e) { err = e; }
  ok('render(home) 不抛异常', err === null, err ? String(err) : '');

  ok('PlayerShell.render 被调用', renderCalled);

  // 关键断言：#player-shell-container 仍是 #gc 的子节点
  ok('#player-shell-container 仍是 #gc 的子节点（未被抹掉）',
     dom.gcNode._children.indexOf(dom.shellNode) >= 0,
     '#gc children: ' + dom.gcNode._children.map(function (c) { return c.id; }).join(','));

  // 关键断言：#gc 的 innerHTML 没有被改写（仍是空字符串·因为没走降级路径）
  // 注：_ensureShell 通过 appendChild 添加·不是改 innerHTML·所以 #gc._innerHTML 应保持空
  ok('#gc.innerHTML 未被改写（保持空·未走降级路径）',
     dom.gcNode._innerHTML === '',
     'gc.innerHTML len: ' + dom.gcNode._innerHTML.length);

  // #player-shell-container 自身的 innerHTML 应保留（8-tab shell 骨架）
  ok('#player-shell-container.innerHTML 保留 shell 骨架',
     dom.shellNode._innerHTML.indexOf('player-shell-topbar') >= 0,
     'shell innerHTML: ' + dom.shellNode._innerHTML.slice(0, 80));
}

// ═══════════════════════════════════════════════════════════
// 场景 2: PlayerShell 缺席 → 降级走 gc.innerHTML=html（旧路径仍可用）
// ═══════════════════════════════════════════════════════════
function testFallbackWhenShellAbsent() {
  console.log('── 场景 2: PlayerShell 缺席 → 降级走 gc.innerHTML=html ──');
  var ctx = buildCtx();
  var dom = installDOM(ctx);
  // 注意：不装 ctx.TM.PlayerShell → PlayerShell 缺席
  loadPlayerUI(ctx);

  var err = null;
  try { ctx.TM.PlayerUI.render('home'); }
  catch (e) { err = e; }
  ok('render(home) PlayerShell 缺席时不抛异常', err === null, err ? String(err) : '');

  // 降级路径：gc.innerHTML 被改写成 PlayerSystemsUI.renderTab 返回值
  ok('#gc.innerHTML 被改写为降级场景块 HTML',
     dom.gcNode._innerHTML.indexOf('legacy-scene') >= 0,
     'gc.innerHTML: ' + dom.gcNode._innerHTML.slice(0, 80));

  // #player-shell-container 被一并抹掉（gc.innerHTML=html 的副作用·这是降级路径·可接受）
  ok('#player-shell-container 在降级路径下被一并抹掉（gc.innerHTML=html 副作用·预期）',
     dom.gcNode._children.indexOf(dom.shellNode) < 0,
     '#gc children: ' + dom.gcNode._children.map(function (c) { return c.id; }).join(','));
}

// ═══════════════════════════════════════════════════════════
// 场景 3: PlayerShell.render 抛异常 → 降级走 gc.innerHTML=html（容错路径）
// ═══════════════════════════════════════════════════════════
function testFallbackWhenShellThrows() {
  console.log('── 场景 3: PlayerShell.render 抛异常 → 降级走 gc.innerHTML=html ──');
  var ctx = buildCtx();
  var dom = installDOM(ctx);
  loadPlayerUI(ctx);

  // mock TM.PlayerShell.render: 抛异常
  ctx.TM.PlayerShell = {
    render: function () { throw new Error('PlayerShell boom'); }
  };

  var err = null;
  try { ctx.TM.PlayerUI.render('home'); }
  catch (e) { err = e; }
  ok('render(home) PlayerShell 抛异常时不冒泡（被捕获降级）', err === null, err ? String(err) : '');

  // 降级路径：gc.innerHTML 被改写
  ok('#gc.innerHTML 被改写为降级场景块 HTML（异常降级路径）',
     dom.gcNode._innerHTML.indexOf('legacy-scene') >= 0,
     'gc.innerHTML: ' + dom.gcNode._innerHTML.slice(0, 80));
}

// ═══════════════════════════════════════════════════════════
// 场景 4: 非穿越模式 → render 应早退·不动 DOM
// ═══════════════════════════════════════════════════════════
function testEarlyReturnWhenNotTransmigration() {
  console.log('── 场景 4: 非穿越模式 → render 早退·不动 DOM ──');
  var ctx = buildCtx();
  var dom = installDOM(ctx);
  // 改成非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  ctx.P.playerInfo.playerRole = 'emperor';
  loadPlayerUI(ctx);

  var shellRenderCalled = false;
  ctx.TM.PlayerShell = {
    render: function () { shellRenderCalled = true; }
  };

  var err = null;
  try { ctx.TM.PlayerUI.render('home'); }
  catch (e) { err = e; }
  ok('render(home) 非穿越模式不抛异常', err === null, err ? String(err) : '');
  ok('非穿越模式 PlayerShell.render 不被调用（早退）', shellRenderCalled === false);
  ok('非穿越模式 #gc.innerHTML 未被改写', dom.gcNode._innerHTML === '');
}

// ── 运行 ──────────────────────────────────────────────────
testShellPreservedOnSuccess();
testFallbackWhenShellAbsent();
testFallbackWhenShellThrows();
testEarlyReturnWhenNotTransmigration();

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-shell-preserve] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-shell-preserve] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
