#!/usr/bin/env node
// ============================================================
// smoke-transmigration-shell.js — 穿越模式 shell 主壳 smoke
// ------------------------------------------------------------
// 断言：SCENE_BLOCKS 8 tab / render DOM 骨架 / switchTab / renderScene
//      软依赖降级 / _assertInvariants / notify / notifyRail / retry
// 双路径：浏览器 window.TM.PlayerShell + node module.exports
// 末尾打印 [smoke-transmigration-shell] PASS · N sub-tests
// ============================================================

(function () {
  'use strict';

  var fail = 0, pass = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
  }

  // ── 模拟浏览器全局 ─────────────────────────────────────────
  global.window = global;
  global.TM = {};
  global.P = { playerInfo: { transmigrationMode: true, playerRole: 'minister', characterName: '赵孟頫', characterTitle: '翰林学士' } };
  global.GM = { turn: 5 };

  function _makeNode(id) {
    return {
      id: id, tagName: 'div', style: {},
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      innerHTML: '', textContent: '',
      setAttribute: function (k, v) { this._attr = this._attr || {}; this._attr[k] = v; },
      addEventListener: function () {},
      appendChild: function (c) { this._children = this._children || []; this._children.push(c); return c; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    };
  }
  var _bodyChildren = [];
  global.document = {
    getElementById: function () { return null; },
    createElement: function (tag) { return _makeNode(tag); },
    body: { appendChild: function (c) { _bodyChildren.push(c); return c; }, classList: { add: function () {}, remove: function () {} } }
  };

  var Shell = require('../tm-player-shell.js');

  // ── Sub-test 1: SCENE_BLOCKS 8 tab ─────────────────────────
  function testSceneBlocks() {
    ok('SCENE_BLOCKS 是数组', Array.isArray(Shell.SCENE_BLOCKS));
    ok('SCENE_BLOCKS 含 8 个 tab', Shell.SCENE_BLOCKS.length === 8, 'got: ' + Shell.SCENE_BLOCKS.length);
    var ids = Shell.SCENE_BLOCKS.map(function (b) { return b.id; });
    ['home', 'court', 'social', 'study', 'tech', 'military', 'fortune', 'adversity'].forEach(function (tid) {
      ok('SCENE_BLOCKS 含 tab ' + tid, ids.indexOf(tid) >= 0);
    });
  }

  // ── Sub-test 2: render() 无 document 降级不抛异常 ──────────
  function testRenderNoDocument() {
    var savedDoc = global.document;
    delete global.document;
    try { Shell.render(); ok('render() 无 document 时不抛异常', true); }
    catch (e) { ok('render() 无 document 时不抛异常', false, String(e)); }
    global.document = savedDoc;
  }

  // ── Sub-test 3: render() 有 document 创建 DOM 骨架 ─────────
  function testRenderWithDocument() {
    _bodyChildren.length = 0;
    try { Shell.render(); ok('render() 有 document 时不抛异常', true); }
    catch (e) { ok('render() 有 document 时不抛异常', false, String(e)); }
    ok('render() 创建 #player-shell-container 挂到 body',
       _bodyChildren.length >= 1 && _bodyChildren[0] && _bodyChildren[0].id === 'player-shell-container',
       'body children: ' + _bodyChildren.length);
    if (_bodyChildren[0]) {
      ok('render() 容器 innerHTML 含 player-shell 骨架',
         _bodyChildren[0].innerHTML.indexOf('player-shell-topbar') >= 0 || _bodyChildren[0].innerHTML.indexOf('player-shell-body') >= 0,
         'innerHTML len: ' + (_bodyChildren[0].innerHTML || '').length);
    } else {
      ok('render() 容器 innerHTML 含 player-shell 骨架', false, 'body 无子节点');
    }
  }

  // ── Sub-test 4: switchTab / renderScene 软依赖降级 ─────────
  function testSwitchAndScene() {
    try { Shell.switchTab('tech'); ok("switchTab('tech') 不抛异常", true); }
    catch (e) { ok("switchTab('tech') 不抛异常", false, String(e)); }
    try { Shell.renderScene('home'); ok('renderScene(home) 不抛异常（软依赖缺席降级）', true); }
    catch (e) { ok('renderScene(home) 不抛异常', false, String(e)); }
  }

  // ── Sub-test 5: _assertInvariants 8 条不变量 ───────────────
  function testAssertInvariants() {
    var report = Shell._assertInvariants();
    ok('_assertInvariants 返回 report 对象', report && typeof report === 'object');
    ok('_assertInvariants report 含 ok 字段', report && typeof report.ok === 'boolean');
    ok('_assertInvariants report 含 fixed 数组', report && Array.isArray(report.fixed));
    ok('SCENE_BLOCKS 8 条（不变量 #4）', Shell.SCENE_BLOCKS.length === 8);
  }

  // ── Sub-test 6: notify / notifyRail / retry / refreshAll ───
  function testNotifyAndRetry() {
    try { Shell.notify('home'); ok('notify(home) 不抛异常', true); }
    catch (e) { ok('notify(home) 不抛异常', false, String(e)); }
    try { Shell.notifyRail(0); ok('notifyRail(0) 不抛异常', true); }
    catch (e) { ok('notifyRail(0) 不抛异常', false, String(e)); }
    try { Shell.retry('scene'); ok('retry(scene) 不抛异常', true); }
    catch (e) { ok('retry(scene) 不抛异常', false, String(e)); }
    try { Shell.refreshAll(); ok('refreshAll() 不抛异常', true); }
    catch (e) { ok('refreshAll() 不抛异常', false, String(e)); }
  }

  // ── 运行 ───────────────────────────────────────────────────
  testSceneBlocks();
  testRenderNoDocument();
  testRenderWithDocument();
  testSwitchAndScene();
  testAssertInvariants();
  testNotifyAndRetry();

  // ── 双路径挂载断言 ─────────────────────────────────────────
  ok('浏览器路径 window.TM.PlayerShell 存在', !!(global.TM && global.TM.PlayerShell));
  ok('node 路径 module.exports 存在', !!Shell && typeof Shell.render === 'function');

  // ── 总结 ──────────────────────────────────────────────────
  console.log('');
  if (fail === 0) {
    console.log('[smoke-transmigration-shell] PASS · ' + pass + ' sub-tests');
    process.exit(0);
  } else {
    console.log('[smoke-transmigration-shell] FAIL · ' + fail + ' failed, ' + pass + ' passed');
    process.exit(1);
  }
})();