#!/usr/bin/env node
// ============================================================
// smoke-player-systems-adapter.js — 穿越模式系统渲染适配器 smoke
// ------------------------------------------------------------
// 断言：RENDER_ADAPTERS 15 key / renderBlock 正常+未知+异常 / _wrapBlock
// 双路径：浏览器 window.TM.PlayerSystemsAdapter + node module.exports
// 末尾打印 [smoke-player-systems-adapter] PASS · N sub-tests
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

  // ── 加载被测文件（require 触发 IIFE 注册到 global.TM） ─────
  var Adapter = require('../tm-player-systems-adapter.js');

  // ── Sub-test 1: RENDER_ADAPTERS 覆盖 15 个 systemKey ───────
  function testRenderAdapters() {
    ok('RENDER_ADAPTERS 是对象', typeof Adapter.RENDER_ADAPTERS === 'object' && Adapter.RENDER_ADAPTERS !== null);
    var keys = Object.keys(Adapter.RENDER_ADAPTERS);
    ok('RENDER_ADAPTERS 覆盖 15 个 systemKey', keys.length === 15, 'got: ' + keys.length);
    var expected = ['PlayerFamily','PlayerMarriage','PlayerEconomy','PlayerIndustry','PlayerTech',
      'PlayerPrivateArmy','PlayerRebel','PlayerInteraction','PlayerMovement','PlayerMemorial',
      'PlayerCourtDebate','PlayerOffice','PlayerSkill','PlayerFortune','PlayerAdversity'];
    ok('RENDER_ADAPTERS 含全部 15 key 且每条有 fn',
       expected.every(function (k) { return Adapter.RENDER_ADAPTERS[k] && typeof Adapter.RENDER_ADAPTERS[k].fn === 'function'; }));
  }

  // ── Sub-test 2: renderBlock 正常路径（fallback 仍含 class+标题） ──
  function testRenderBlockNormal() {
    var html = Adapter.renderBlock('PlayerFamily', 'minister', '家族');
    ok('renderBlock(PlayerFamily) 返回字符串', typeof html === 'string');
    ok('renderBlock(PlayerFamily) 含 class="player-block"', html.indexOf('class="player-block"') >= 0,
       'got: ' + (html || '').slice(0, 120));
    ok('renderBlock(PlayerFamily) 含标题"家族"', html.indexOf('家族') >= 0);
  }

  // ── Sub-test 3: 未知 systemKey 占位 ─────────────────────────
  function testRenderBlockUnknown() {
    var html = Adapter.renderBlock('PlayerNonExist', 'minister', '未知块');
    ok('renderBlock(未知) 含 player-block-error / 未知系统占位',
       typeof html === 'string' && (html.indexOf('player-block-error') >= 0 || html.indexOf('未知系统') >= 0),
       'got: ' + (html || '').slice(0, 120));
  }

  // ── Sub-test 4: adapter.fn 抛异常 → 渲染异常占位 ────────────
  function testRenderBlockException() {
    global.TM.PlayerFamily = { renderBlockHTML: function () { throw new Error('boom'); } };
    var html = Adapter.renderBlock('PlayerFamily', 'minister', '家族');
    ok('renderBlock 异常时含"渲染异常"', typeof html === 'string' && html.indexOf('渲染异常') >= 0,
       'got: ' + (html || '').slice(0, 120));
    delete global.TM.PlayerFamily;
  }

  // ── Sub-test 5: _wrapBlock 已包则直返 ───────────────────────
  function testWrapBlockNoDouble() {
    var src = '<div class="player-block">x</div>';
    var out = Adapter._wrapBlock(src, 'PlayerFamily', '家族');
    ok('_wrapBlock 已含 player-block 直返不重复包', out === src, 'got: ' + out);
  }

  // ── Sub-test 6: _wrapBlock 未包则包一层 ─────────────────────
  function testWrapBlockWrap() {
    var out = Adapter._wrapBlock('<div>x</div>', 'PlayerFamily', '家族');
    ok('_wrapBlock 未包则包一层 player-block', typeof out === 'string' && out.indexOf('class="player-block"') >= 0,
       'got: ' + out);
    ok('_wrapBlock 包后含 data-system', typeof out === 'string' && out.indexOf('data-system="PlayerFamily"') >= 0);
  }

  // ── 运行 ───────────────────────────────────────────────────
  testRenderAdapters();
  testRenderBlockNormal();
  testRenderBlockUnknown();
  testRenderBlockException();
  testWrapBlockNoDouble();
  testWrapBlockWrap();

  // ── 双路径挂载断言 ─────────────────────────────────────────
  ok('浏览器路径 window.TM.PlayerSystemsAdapter 存在', !!(global.TM && global.TM.PlayerSystemsAdapter));
  ok('node 路径 module.exports 存在', !!Adapter && typeof Adapter.renderBlock === 'function');

  // ── 总结 ──────────────────────────────────────────────────
  console.log('');
  if (fail === 0) {
    console.log('[smoke-player-systems-adapter] PASS · ' + pass + ' sub-tests');
    process.exit(0);
  } else {
    console.log('[smoke-player-systems-adapter] FAIL · ' + fail + ' failed, ' + pass + ' passed');
    process.exit(1);
  }
})();
