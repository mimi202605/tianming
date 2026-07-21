#!/usr/bin/env node
// ============================================================
// smoke-player-ai-bridge.js — 穿越模式 AI 桥 smoke
// ------------------------------------------------------------
// 断言：AI_SCENARIOS 18 条 / level / getCacheKey / 朝代污染检查 /
//      validateAIOutput / invoke template 降级
// 双路径：浏览器 window.TM.PlayerAIBridge + node module.exports
// 末尾打印 [smoke-player-ai-bridge] PASS · N sub-tests
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
  global.GM = null;  // 确保 getCacheKey 走 opts.ctx 路径
  // 确保 invoke 走 template 降级（不命中 callLLM/callAI）
  delete global.callLLM;
  delete global.callAI;

  var Bridge = require('../tm-player-ai-bridge.js');

  // ── Sub-test 1: AI_SCENARIOS + listScenarioKeys + getScenario ──
  function testScenarios() {
    ok('AI_SCENARIOS 是对象', typeof Bridge.AI_SCENARIOS === 'object' && Bridge.AI_SCENARIOS !== null);
    ok('AI_SCENARIOS 条目 >= 18', Object.keys(Bridge.AI_SCENARIOS).length >= 18,
       'got: ' + Object.keys(Bridge.AI_SCENARIOS).length);
    var keys = Bridge.listScenarioKeys();
    ok('listScenarioKeys 返回数组', Array.isArray(keys));
    ok('listScenarioKeys 长度 >= 18', keys.length >= 18, 'got: ' + keys.length);
    var sc = Bridge.getScenario('home.family_event');
    ok('getScenario 返回对象含 scenarioKey', sc && typeof sc.scenarioKey === 'string');
    ok('getScenario 返回对象含 level (L1/L2/L3)', sc && ['L1', 'L2', 'L3'].indexOf(sc.level) >= 0);
    ok('getScenario 返回对象含 template', sc && typeof sc.template === 'function');
    ok('getScenario(未知) 返回 null', Bridge.getScenario('non.exist') === null);
  }

  // ── Sub-test 2: _getAILevel / _isLevelEnabled ───────────────
  function testLevel() {
    ok('_getAILevel() 默认返回 L1/L2/L3', ['L1', 'L2', 'L3'].indexOf(Bridge._getAILevel()) >= 0);
    ok('_getAILevel(L3) 返回 L3', Bridge._getAILevel('L3') === 'L3');
    ok('_getAILevel(非法) 兜底 L2', Bridge._getAILevel('L9') === 'L2');
    ok('_isLevelEnabled(L1) 返回 boolean', typeof Bridge._isLevelEnabled('L1') === 'boolean');
    ok('_isLevelEnabled(L1) === true', Bridge._isLevelEnabled('L1') === true);
    ok('_isLevelEnabled(L9) === false', Bridge._isLevelEnabled('L9') === false);
  }

  // ── Sub-test 3: getCacheKey（opts 对象·返回 scenarioKey.turn.role） ──
  function testCacheKey() {
    var key = Bridge.getCacheKey({ scenarioKey: 'home.family_event', ctx: { turn: 5, playerRole: 'minister' } });
    ok('getCacheKey 返回 scenarioKey.turn.playerRole 格式', key === 'home.family_event.5.minister', 'got: ' + key);
  }

  // ── Sub-test 4: _containsDynastySpecificTerms 朝代污染检查 ───
  function testDynastyTerms() {
    ok('翰林院编修 + 白名单[翰林,翰林院] → false', Bridge._containsDynastySpecificTerms('翰林院编修', ['翰林', '翰林院']) === false);
    ok('翰林院编修 + 无白名单 → true（命中黑名单）', Bridge._containsDynastySpecificTerms('翰林院编修', []) === true);
    ok('山长 + 无白名单 → false（无污染）', Bridge._containsDynastySpecificTerms('山长', []) === false);
  }

  // ── Sub-test 5: validateAIOutput ────────────────────────────
  function testValidate() {
    var r1 = Bridge.validateAIOutput('not json', { required: [] });
    ok('validateAIOutput 非 JSON 返回 null', r1 === null, 'got: ' + JSON.stringify(r1));
    var r2 = Bridge.validateAIOutput('{"a":1}', { required: ['a'] });
    ok('validateAIOutput 合法 JSON+required 通过', r2 && r2.a === 1, 'got: ' + JSON.stringify(r2));
    var r3 = Bridge.validateAIOutput('{"a":"翰林院编修"}', { required: ['a'] });
    ok('validateAIOutput 朝代污染返回 null', r3 === null, 'got: ' + JSON.stringify(r3));
  }

  // ── Sub-test 6: invoke 无 callLLM/callAI 时走 template 降级（异步） ──
  function testInvoke() {
    Bridge.clearCache();
    var opts = {
      scenarioKey: 'home.family_event',
      ctx: { turn: 1, playerRole: 'minister', foo: 'bar' },
      template: function (ctx) { return 'template-output-' + (ctx && ctx.foo ? ctx.foo : 'x'); }
    };
    return Bridge.invoke(opts).then(function (result) {
      ok('invoke 返回 Promise 并 resolve 对象', result && typeof result === 'object');
      ok('invoke 无 callLLM/callAI 时走 template 降级',
         result && result.text === 'template-output-bar', 'got: ' + (result && result.text));
      ok('invoke 降级 level=fallback', result && result.level === 'fallback', 'got: ' + (result && result.level));
    });
  }

  // ── 运行（同步部分） ───────────────────────────────────────
  testScenarios();
  testLevel();
  testCacheKey();
  testDynastyTerms();
  testValidate();

  // ── 异步部分（invoke） ─────────────────────────────────────
  testInvoke().then(function () {
    // ── 双路径挂载断言 ───────────────────────────────────────
    ok('浏览器路径 window.TM.PlayerAIBridge 存在', !!(global.TM && global.TM.PlayerAIBridge));
    ok('node 路径 module.exports 存在', !!Bridge && typeof Bridge.invoke === 'function');

    // ── 总结 ──────────────────────────────────────────────────
    console.log('');
    if (fail === 0) {
      console.log('[smoke-player-ai-bridge] PASS · ' + pass + ' sub-tests');
      process.exit(0);
    } else {
      console.log('[smoke-player-ai-bridge] FAIL · ' + fail + ' failed, ' + pass + ' passed');
      process.exit(1);
    }
  }).catch(function (e) {
    console.error('[smoke-player-ai-bridge] ERROR:', e);
    process.exit(1);
  });
})();
