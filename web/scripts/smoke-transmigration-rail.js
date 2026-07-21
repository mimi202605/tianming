#!/usr/bin/env node
// ============================================================
// smoke-transmigration-rail.js — 穿越模式右栏 rail smoke
// ------------------------------------------------------------
// 断言：SCENE_RAIL 9 槽 / RAIL_MATRIX 15 角色 / getSlotState 多档
//      _slotDisplay 返回对象 / render DOM / openDrawer 等不抛
// 双路径：浏览器 window.TM.PlayerRail + node module.exports
// 末尾打印 [smoke-transmigration-rail] PASS · N sub-tests
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
    _nodesById: {},
    getElementById: function (id) {
      if (!this._nodesById[id]) this._nodesById[id] = _makeNode(id);
      return this._nodesById[id];
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function (tag) { return _makeNode(tag); },
    body: { appendChild: function (c) { _bodyChildren.push(c); return c; }, classList: { add: function () {}, remove: function () {} } }
  };

  var Rail = require('../tm-player-rail.js');

  // ── Sub-test 1: SCENE_RAIL 9 槽 ────────────────────────────
  function testSceneRail() {
    ok('SCENE_RAIL 是数组', Array.isArray(Rail.SCENE_RAIL));
    ok('SCENE_RAIL 含 9 个 slot', Rail.SCENE_RAIL.length === 9, 'got: ' + Rail.SCENE_RAIL.length);
    Rail.SCENE_RAIL.forEach(function (s, i) {
      ok('SCENE_RAIL[' + i + '] idx 字段正确', s.idx === i, 'got idx: ' + s.idx);
      ok('SCENE_RAIL[' + i + '] icon/label 非空', !!s.icon && !!s.label);
      ok('SCENE_RAIL[' + i + '] systemKey 非空', !!s.systemKey);
    });
    // 槽 8 含 altKey=PlayerRebel
    ok('SCENE_RAIL[8] 含 altKey=PlayerRebel', Rail.SCENE_RAIL[8].altKey === 'PlayerRebel');
  }

  // ── Sub-test 2: RAIL_MATRIX 15 角色 ───────────────────────
  function testRailMatrix() {
    ok('RAIL_MATRIX 是对象', Rail.RAIL_MATRIX && typeof Rail.RAIL_MATRIX === 'object');
    var roles = Object.keys(Rail.RAIL_MATRIX);
    ok('RAIL_MATRIX 含 15 个角色 key', roles.length === 15, 'got: ' + roles.length);
    var expected = ['emperor','regent','minister','general','prince','custom','merchant','eunuch','maid','commoner','bandit','monk','artisan','infant','retired_official','actor'];
    // emperor 不在矩阵中（按实际实现·emperor 走兜底 commoner）
    ok('RAIL_MATRIX 不含 emperor（emperor 走 commoner 兜底）', !Rail.RAIL_MATRIX.hasOwnProperty('emperor'));
    ['regent','minister','general','prince','merchant','eunuch','maid','commoner','bandit','monk','artisan','infant','retired_official','actor','custom'].forEach(function (r) {
      ok('RAIL_MATRIX 含角色 ' + r, !!Rail.RAIL_MATRIX[r], 'missing role: ' + r);
    });
    // 每行 9 列
    roles.forEach(function (r) {
      ok('RAIL_MATRIX[' + r + '] 含 9 列', Array.isArray(Rail.RAIL_MATRIX[r]) && Rail.RAIL_MATRIX[r].length === 9,
         'got len: ' + (Rail.RAIL_MATRIX[r] && Rail.RAIL_MATRIX[r].length));
    });
  }

  // ── Sub-test 3: getSlotState 多档 ─────────────────────────
  function testGetSlotState() {
    ok("getSlotState('emperor', 0) emperor 走 commoner 兜底=enabled",
       Rail.getSlotState('emperor', 0) === 'enabled',
       'got: ' + Rail.getSlotState('emperor', 0));
    ok("getSlotState('minister', 0) = enabled", Rail.getSlotState('minister', 0) === 'enabled');
    ok("getSlotState('minister', 8) = enabled（v2 放宽）", Rail.getSlotState('minister', 8) === 'enabled',
       'got: ' + Rail.getSlotState('minister', 8));
    ok("getSlotState('merchant', 8) = special:caravan",
       Rail.getSlotState('merchant', 8) === 'special:caravan',
       'got: ' + Rail.getSlotState('merchant', 8));
    ok("getSlotState('infant', 0) = special:guardian",
       Rail.getSlotState('infant', 0) === 'special:guardian',
       'got: ' + Rail.getSlotState('infant', 0));
    ok("getSlotState('retired_official', 4) = special:advice",
       Rail.getSlotState('retired_official', 4) === 'special:advice',
       'got: ' + Rail.getSlotState('retired_official', 4));
    ok("getSlotState('maid', 0) = disabled", Rail.getSlotState('maid', 0) === 'disabled');
    ok("getSlotState('minister', -1) 越界 = disabled", Rail.getSlotState('minister', -1) === 'disabled');
    ok("getSlotState('minister', 99) 越界 = disabled", Rail.getSlotState('minister', 99) === 'disabled');
  }

  // ── Sub-test 4: _slotDisplay 返回对象 ─────────────────────
  function testSlotDisplay() {
    var slot0 = Rail.SCENE_RAIL[0];
    var disp = Rail._slotDisplay(slot0, 'minister');
    ok('_slotDisplay 返回对象', disp && typeof disp === 'object');
    ok('_slotDisplay disp.icon 非空', !!disp.icon);
    ok('_slotDisplay disp.label 非空', !!disp.label);
    ok('_slotDisplay disp.state = enabled', disp.state === 'enabled', 'got: ' + disp.state);
    ok('_slotDisplay disp.drawerKey 非空', !!disp.drawerKey);
    ok('_slotDisplay disp.badge 字段存在', typeof disp.badge === 'string');
    // merchant 槽 8 应有 badge=caravan
    var slot8 = Rail.SCENE_RAIL[8];
    var dispM = Rail._slotDisplay(slot8, 'merchant');
    ok("_slotDisplay(merchant,8).badge = caravan", dispM.badge === 'caravan',
       'got: ' + dispM.badge);
    ok("_slotDisplay(merchant,8).state = special:caravan", dispM.state === 'special:caravan');
    // infant 槽 0 应有 badge=guardian
    var dispI = Rail._slotDisplay(slot0, 'infant');
    ok("_slotDisplay(infant,0).badge = guardian", dispI.badge === 'guardian',
       'got: ' + dispI.badge);
  }

  // ── Sub-test 5: render() 无 document 降级不抛 ─────────────
  function testRenderNoDocument() {
    var savedDoc = global.document;
    delete global.document;
    try { Rail.render(); ok('render() 无 document 时不抛异常', true); }
    catch (e) { ok('render() 无 document 时不抛异常', false, String(e)); }
    global.document = savedDoc;
  }

  // ── Sub-test 6: render() 有 document 写入栅格 ─────────────
  function testRenderWithDocument() {
    // 给 rail 一个容器节点（带 innerHTML 接收栅格）
    var railNode = _makeNode('player-rail');
    global.document.getElementById = function (id) {
      if (id === 'player-rail') return railNode;
      return global.document._nodesById[id] || null;
    };
    railNode.innerHTML = '';
    try { Rail.render(); ok('render() 有 document 时不抛异常', true); }
    catch (e) { ok('render() 有 document 时不抛异常', false, String(e)); }
    ok('render() 写入栅格 HTML（含 ps-rail-slot）',
       railNode.innerHTML.indexOf('ps-rail-slot') >= 0,
       'innerHTML len: ' + railNode.innerHTML.length);
    ok('render() 含身份卡（ps-rail-card）',
       railNode.innerHTML.indexOf('ps-rail-card') >= 0);
  }

  // ── Sub-test 7: openDrawer/closeDrawer/clearReddot/notifyRail ─
  function testDrawerAndReddot() {
    try { Rail.notifyRail(0); ok('notifyRail(0) 不抛异常', true); }
    catch (e) { ok('notifyRail(0) 不抛异常', false, String(e)); }
    try { Rail.openDrawer(0); ok('openDrawer(0) 不抛异常', true); }
    catch (e) { ok('openDrawer(0) 不抛异常', false, String(e)); }
    try { Rail.closeDrawer(); ok('closeDrawer() 不抛异常', true); }
    catch (e) { ok('closeDrawer() 不抛异常', false, String(e)); }
    try { Rail.clearReddot(0); ok('clearReddot(0) 不抛异常', true); }
    catch (e) { ok('clearReddot(0) 不抛异常', false, String(e)); }
    try { Rail.refresh(); ok('refresh() 不抛异常', true); }
    catch (e) { ok('refresh() 不抛异常', false, String(e)); }
  }

  // ── 运行 ───────────────────────────────────────────────────
  testSceneRail();
  testRailMatrix();
  testGetSlotState();
  testSlotDisplay();
  testRenderNoDocument();
  testRenderWithDocument();
  testDrawerAndReddot();

  // ── 双路径挂载断言 ─────────────────────────────────────────
  ok('浏览器路径 window.TM.PlayerRail 存在', !!(global.TM && global.TM.PlayerRail));
  ok('node 路径 module.exports 存在', !!Rail && typeof Rail.render === 'function');

  // ── 总结 ──────────────────────────────────────────────────
  console.log('');
  if (fail === 0) {
    console.log('[smoke-transmigration-rail] PASS · ' + pass + ' sub-tests');
    process.exit(0);
  } else {
    console.log('[smoke-transmigration-rail] FAIL · ' + fail + ' failed, ' + pass + ' passed');
    process.exit(1);
  }
})();
