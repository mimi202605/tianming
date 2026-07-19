// ============================================================
// smoke-transmigration-ui-phase-b.js — 穿越模式 Phase B UI smoke
// ------------------------------------------------------------
// 断言：身份演进面板 / 右栏完整 / 摄政代诏入口 / 朝议按钮 /
//      AI 状态切换 / triggerRoleChange UI 触发
// 末尾打印 [smoke-transmigration-ui-phase-b] PASS · N sub-tests
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

var sandbox = {
  console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  Date: Date, Math: Math, JSON: JSON,
  Array: Array, Object: Object, String: String, Number: Number, Boolean: Boolean, Error: Error,
  document: null, window: null, TM: {}, P: { playerInfo: null }, GM: null,
  module: { exports: null },
  toast: function (m) { sandbox._lastToast = m; }
};
sandbox.global = sandbox; sandbox.window = sandbox;
vm.createContext(sandbox);
function loadFile(rel) {
  var code = fs.readFileSync(path.join(WEB_DIR, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// ── Sub-test 1: 身份演进面板渲染 ───────────────────────────
loadFile('tm-transmigration.js');
loadFile('tm-player-systems-ui.js');
var PS = sandbox.TM.PlayerSystemsUI;
ok('PlayerSystemsUI 导出', !!PS);

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'commoner' };
var evoHtml = PS.renderTab('evolution', 'commoner');
ok('evolution 场景渲染含"读书考科举"路径', evoHtml.indexOf('读书考科举') >= 0,
   'html: ' + evoHtml.slice(0, 200));
ok('evolution 渲染含 data-kind="study"', evoHtml.indexOf('data-kind="study"') >= 0);

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'emperor' };
var evoEmpty = PS.renderTab('evolution', 'emperor');
ok('emperor evolution 渲染含"无可行走变更路径"', evoEmpty.indexOf('无可行走变更路径') >= 0);

// ── Sub-test 2: 摄政代诏入口 ───────────────────────────────
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'regent' };
var officeHtml = PS.renderTab('office', 'regent');
ok('regent office 渲染含"代诏"区块', officeHtml.indexOf('代诏') >= 0);
ok('regent office 含代下诏令按钮', officeHtml.indexOf('代下诏令') >= 0);

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister' };
var officeMinister = PS.renderTab('office', 'minister');
ok('minister office 不含"代诏"', officeMinister.indexOf('代诏') < 0);

// ── Sub-test 3: AI 状态切换 ────────────────────────────────
sandbox.document = {
  _nodes: {},
  getElementById: function (id) {
    if (!this._nodes[id]) {
      this._nodes[id] = {
        id: id, style: {}, classList: { add: function(){}, remove: function(){}, contains: function(){return false;} },
        innerHTML: '', textContent: '', setAttribute: function(k,v){this._attr=this._attr||{};this._attr[k]=v;}, appendChild: function(){}, addEventListener: function(){}, querySelectorAll: function(){return [];}
      };
    }
    return this._nodes[id];
  },
  body: { classList: { add: function(){}, remove: function(){}, contains: function(){return false;} } },
  createElement: function () { return { style: {}, classList: { add: function(){}, remove: function(){} }, setAttribute: function(){}, addEventListener: function(){}, appendChild: function(){}, querySelector: function(){return null;}, querySelectorAll: function(){return [];}, remove: function(){} }; }
};
loadFile('tm-player-ui-render.js');
var PU = sandbox.TM.PlayerUI;
ok('setAiLiveStatus 是函数', typeof PU.setAiLiveStatus === 'function');

sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister' };
PU.setAiLiveStatus('sovereign');
var aiEl = sandbox.document._nodes['bar-ai-live'];
ok('setAiLiveStatus(sovereign) 设文本"君主圣裁中"', aiEl && aiEl.textContent === '君主圣裁中',
   'got: ' + (aiEl && aiEl.textContent));
ok('setAiLiveStatus 设 data-state=sovereign', aiEl && aiEl._attr && aiEl._attr['data-state'] === 'sovereign');

PU.setAiLiveStatus('npc');
ok('setAiLiveStatus(npc) 设文本"市井演化中"', aiEl.textContent === '市井演化中');

// ── Sub-test 4: triggerRoleChange 包装反馈 ─────────────────
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'commoner' };
var TR = sandbox.TM.Transmigration;
var r = TR.triggerRoleChange('study');
ok('triggerRoleChange(study) ok=true', r.ok === true);
ok('path.nextRole=minister', r.path.nextRole === 'minister');
var r2 = TR.triggerRoleChange('unknown');
ok('triggerRoleChange(unknown) ok=false', r2.ok === false);

// ── Sub-test 5: PlayerCourtDebate 控朝议 UI（B5） ───────────
// B5 新建 stub·必须测覆盖（plan 骨架未包含·此处补充）
ok('PlayerCourtDebate 命名空间导出', !!sandbox.TM.PlayerCourtDebate);
var PCD = sandbox.TM.PlayerCourtDebate;

// 朝议未开
var stOff = PCD.state();
ok('PCD.state() 朝议未开返回 active=false', stOff.active === false);
var htmlOff = PCD.renderBlockHTML('minister');
ok('PCD.renderBlockHTML 朝议未开显示"君主未开朝议"', htmlOff.indexOf('君主未开朝议') >= 0);

// 朝议活跃（廷议 v2 模式）
sandbox.CY = { open: true, phase: 'tinyi2', _ty2: { topic: '征辽粮草' } };
var stOn = PCD.state();
ok('PCD.state() 朝议活跃返回 active=true', stOn.active === true);
ok('PCD.state() topic 取 CY._ty2.topic', stOn.topic === '征辽粮草');
var htmlOn = PCD.renderBlockHTML('minister');
ok('PCD.renderBlockHTML 朝议活跃显示当前议题', htmlOn.indexOf('征辽粮草') >= 0);
ok('PCD.renderBlockHTML 朝议活跃含请旨发言按钮', htmlOn.indexOf('请旨发言') >= 0);

// petitionToSpeak 写入队列 + toast 反馈
sandbox._lastToast = null;
var petRes = PCD.petitionToSpeak();
ok('PCD.petitionToSpeak ok=true', petRes && petRes.ok === true);
ok('PCD.petitionToSpeak 写入 CY._pendingCourtierSpeech 队列',
   Array.isArray(sandbox.CY._pendingCourtierSpeech) && sandbox.CY._pendingCourtierSpeech.length === 1);
ok('PCD.petitionToSpeak toast 反馈"已请旨发言·待君主裁决"',
   sandbox._lastToast === '已请旨发言·待君主裁决');
ok('PCD.petitionToSpeak 队列含 topic 字段', sandbox.CY._pendingCourtierSpeech[0].topic === '征辽粮草');

// 朝议未开时 petitionToSpeak 失败
sandbox.CY = { open: false };
sandbox._lastToast = null;
var petResOff = PCD.petitionToSpeak();
ok('PCD.petitionToSpeak 朝议未开 ok=false', petResOff && petResOff.ok === false);
ok('PCD.petitionToSpeak 朝议未开 toast"朝议未开·无法请旨"',
   sandbox._lastToast === '朝议未开·无法请旨');

// 清理 CY·避免污染后续测试
sandbox.CY = undefined;

// ── Sub-test 6: Phase A smoke 仍通过 ───────────────────────
// 通过分别跑 smoke-transmigration-ui.js 验证（外部 CI 跑）

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-ui-phase-b] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-ui-phase-b] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
