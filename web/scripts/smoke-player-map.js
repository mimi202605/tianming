#!/usr/bin/env node
// ============================================================
// smoke-player-map.js — 穿越模式专属大地图 smoke
// ------------------------------------------------------------
// 断言：三态状态机 / setMode / toggleState / render SVG / 交互回调
// 双路径：浏览器 window.TM.PlayerMap + node module.exports
// 末尾打印 [smoke-player-map] PASS · N sub-tests
// ============================================================

(function () {
  'use strict';

  var fail = 0, pass = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
  }

  // ── 模拟全局（localStorage 先清空·确保默认状态 expanded） ──
  global.window = global;
  global.TM = {};
  global.localStorage = {
    _store: {},
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
    setItem: function (k, v) { this._store[k] = String(v); },
    removeItem: function (k) { delete this._store[k]; }
  };
  global.GM = null;

  function _makeNode(id) {
    return {
      id: id, tagName: 'div', style: {},
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      innerHTML: '', textContent: '',
      setAttribute: function () {}, addEventListener: function () {},
      appendChild: function (c) { this._children = this._children || []; this._children.push(c); return c; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    };
  }
  var _nodes = {};
  global.document = {
    getElementById: function (id) {
      if (id === 'player-map-section') {
        if (!_nodes[id]) _nodes[id] = _makeNode(id);
        return _nodes[id];
      }
      return null;
    },
    createElement: function (tag) { return _makeNode(tag); },
    body: { appendChild: function () {}, classList: { add: function () {}, remove: function () {} } }
  };

  var PlayerMap = require('../tm-player-map.js');

  // ── Sub-test 1: getState / setState ─────────────────────────
  function testState() {
    var s = PlayerMap.getState();
    ok('getState() 默认返回 expanded', s === 'expanded', 'got: ' + s);
    PlayerMap.setState('fullscreen');
    ok('setState(fullscreen) 后 getState=fullscreen', PlayerMap.getState() === 'fullscreen');
    PlayerMap.setState('collapsed');
    ok('setState(collapsed) 后 getState=collapsed', PlayerMap.getState() === 'collapsed');
    PlayerMap.setState('expanded');
    ok('setState(expanded) 后 getState=expanded', PlayerMap.getState() === 'expanded');
  }

  // ── Sub-test 2: setMode（仅接受 faction/terrain/admin） ─────
  function testSetMode() {
    var before = PlayerMap.getState();
    PlayerMap.setMode('collapsed');  // 非法 mode·应被忽略不改状态
    ok('setMode(非法值) 不抛异常且不改状态', PlayerMap.getState() === before);
    try { PlayerMap.setMode('terrain'); ok('setMode(terrain) 不抛异常', true); }
    catch (e) { ok('setMode(terrain) 不抛异常', false, String(e)); }
  }

  // ── Sub-test 3: toggleState 三态循环 ────────────────────────
  function testToggle() {
    PlayerMap.setState('expanded');
    PlayerMap.toggleState();
    ok('toggleState expanded→fullscreen', PlayerMap.getState() === 'fullscreen', 'got: ' + PlayerMap.getState());
    PlayerMap.toggleState();
    ok('toggleState fullscreen→collapsed', PlayerMap.getState() === 'collapsed', 'got: ' + PlayerMap.getState());
    PlayerMap.toggleState();
    ok('toggleState collapsed→expanded', PlayerMap.getState() === 'expanded', 'got: ' + PlayerMap.getState());
  }

  // ── Sub-test 4: render 无数据时仍产出 SVG 占位 ─────────────
  function testRenderNoData() {
    global.GM = null;
    _nodes['player-map-section'] = _makeNode('player-map-section');
    PlayerMap.render();
    var html = _nodes['player-map-section'].innerHTML;
    ok('render() 无 GM.mapData 时仍产出 SVG 占位', typeof html === 'string' && html.indexOf('<svg') >= 0,
       'got: ' + (html || '').slice(0, 120));
  }

  // ── Sub-test 5: render 有数据时含 <svg + 区域 path ─────────
  function testRenderWithData() {
    global.GM = {
      mapData: {
        regions: [{ id: 'region1', name: '京畿' }, { id: 'region2', name: '江南' }],
        playerPos: { x: 100, y: 200 }
      }
    };
    _nodes['player-map-section'] = _makeNode('player-map-section');
    PlayerMap.render();
    var html = _nodes['player-map-section'].innerHTML;
    ok('render() 有 mapData 时含 <svg', typeof html === 'string' && html.indexOf('<svg') >= 0,
       'got: ' + (html || '').slice(0, 120));
    ok('render() 有 mapData 时含区域 path', typeof html === 'string' && html.indexOf('player-map-region') >= 0);
  }

  // ── Sub-test 6: onRegionClick / highlight / flyTo / refresh ──
  function testInteractions() {
    PlayerMap.onRegionClick(function (rid) {});  // 注册回调
    ok('onRegionClick 注册回调不抛异常', true);
    try { PlayerMap.highlight('region1'); ok('highlight 不抛异常', true); }
    catch (e) { ok('highlight 不抛异常', false, String(e)); }
    try { PlayerMap.flyTo('region2'); ok('flyTo 不抛异常', true); }
    catch (e) { ok('flyTo 不抛异常', false, String(e)); }
    try { PlayerMap.refresh(); ok('refresh 不抛异常', true); }
    catch (e) { ok('refresh 不抛异常', false, String(e)); }
  }

  // ── 运行 ───────────────────────────────────────────────────
  testState();
  testSetMode();
  testToggle();
  testRenderNoData();
  testRenderWithData();
  testInteractions();

  // ── 双路径挂载断言 ─────────────────────────────────────────
  ok('浏览器路径 window.TM.PlayerMap 存在', !!(global.TM && global.TM.PlayerMap));
  ok('node 路径 module.exports 存在', !!PlayerMap && typeof PlayerMap.render === 'function');

  // ── 总结 ──────────────────────────────────────────────────
  console.log('');
  if (fail === 0) {
    console.log('[smoke-player-map] PASS · ' + pass + ' sub-tests');
    process.exit(0);
  } else {
    console.log('[smoke-player-map] FAIL · ' + fail + ' failed, ' + pass + ' passed');
    process.exit(1);
  }
})();
