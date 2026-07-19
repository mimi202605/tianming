// ============================================================
// smoke-transmigration-ui.js — 穿越模式 Phase A UI smoke
// ------------------------------------------------------------
// 断言：双轨分派 / 5 主题色 CSS / 身份条 DOM / 场景 tab 矩阵 /
//      奉旨卡片 API + 行为 / getRoleChangePaths API / 皇帝模式零回归
// 末尾打印 [smoke-transmigration-ui] PASS · N sub-tests
// ============================================================

'use strict';
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var WEB_DIR = path.resolve(__dirname, '..');
var fail = 0, pass = 0;

// 与 tm-player-ui-edict-card.js 同步·避免魔法数字
var MAX_PER_TURN = 3;

function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' :: ' + detail : '')); }
}

// ── 沙箱上下文 ─────────────────────────────────────────────
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
  document: null,  // 由测试场景注入
  window: null,
  TM: {},
  P: { playerInfo: null },
  GM: null,
  module: { exports: null },
  toast: function (m) { sandbox._lastToast = m; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

function loadFile(rel) {
  var code = fs.readFileSync(path.join(WEB_DIR, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// ── 伪 DOM 工厂：append/remove 双向链以支持行为断言 ─────────
// 节点既可被 getElementById 缓存（脱离树），也可被 appendChild 挂到 body
// remove() 真正从父节点 _children 中摘除——让 expand/dismiss 行为可断言
function _makeNode(idOrTag) {
  return {
    id: idOrTag,
    tagName: idOrTag,
    style: {},
    classList: {
      add: function (c) { this._cls = this._cls || []; this._cls.push(c); },
      remove: function (c) { var i = (this._cls || []).indexOf(c); if (i >= 0) this._cls.splice(i, 1); },
      contains: function () { return false; }
    },
    _cls: [],
    innerHTML: '',
    textContent: '',
    setAttribute: function () {},
    addEventListener: function () {},
    appendChild: function (c) { this._children = this._children || []; this._children.push(c); c._parent = this; return c; },
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

// ── Sub-test 1: scenesForRole 矩阵 ─────────────────────────
loadFile('tm-player-systems-ui.js');
var PS = sandbox.TM.PlayerSystemsUI;
ok('PlayerSystemsUI 导出', !!PS);
ok('scenesForRole(emperor) 为空数组', PS.scenesForRole('emperor').length === 0);
ok('scenesForRole(minister) 含 5 项', PS.scenesForRole('minister').length === 5);
ok('scenesForRole(infant) 仅 3 项', PS.scenesForRole('infant').length === 3,
   'got: ' + PS.scenesForRole('infant').join(','));
ok('scenesForRole(minister) 含 home', PS.scenesForRole('minister').indexOf('home') >= 0);
ok('scenesForRole(minister) 不含 force', PS.scenesForRole('minister').indexOf('force') < 0);
ok('scenesForRole(unknown) 兜底为 commoner',
   JSON.stringify(PS.scenesForRole('xxx_unknown')) === JSON.stringify(PS.scenesForRole('commoner')));

// ── Sub-test 2: getRoleChangePaths API ─────────────────────
loadFile('tm-transmigration.js');
// 修复：让 triggerRoleChange 能查到 role（否则 P.playerInfo=null 立即返回 no-role）
sandbox.P.playerInfo = { playerRole: 'commoner' };
var TR = sandbox.TM.Transmigration;
ok('Transmigration 导出', !!TR);
ok('getRoleChangePaths 是函数', typeof TR.getRoleChangePaths === 'function');
ok('commoner 路径数 3', TR.getRoleChangePaths('commoner').length === 3,
   'got: ' + TR.getRoleChangePaths('commoner').length);
ok('emperor 路径数 0', TR.getRoleChangePaths('emperor').length === 0);
ok('triggerRoleChange(study) 返回 ok', TR.triggerRoleChange('study').ok === true);
ok('triggerRoleChange(unknown) 返回 not ok', TR.triggerRoleChange('unknown_kind').ok === false);
ok('路径对象含 label 字段', TR.getRoleChangePaths('commoner')[0].label === '读书考科举');

// ── Sub-test 3: PlayerUI 渲染（伪 DOM + DOM 副作用断言） ─────
sandbox.document = {
  _nodes: {},
  getElementById: function (id) {
    // 优先在 body._children 中查（模拟真实 DOM 的查询语义·让 expand/dismiss 可断言）
    if (this.body && this.body._children) {
      for (var i = 0; i < this.body._children.length; i++) {
        if (this.body._children[i].id === id) return this.body._children[i];
      }
    }
    if (!this._nodes[id]) this._nodes[id] = _makeNode(id);
    return this._nodes[id];
  },
  body: {
    classList: { add: function (c) { this._cls = this._cls || []; this._cls.push(c); }, remove: function () {}, contains: function () { return false; } },
    _children: [],
    appendChild: function (c) { this._children.push(c); c._parent = this; return c; }
  },
  createElement: function (tag) { return _makeNode(tag); },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
loadFile('tm-player-ui-render.js');
var PU = sandbox.TM.PlayerUI;
ok('PlayerUI 导出', !!PU);
ok('renderTopBar 是函数', typeof PU.renderTopBar === 'function');
ok('_varsForRole 是函数', typeof PU._varsForRole === 'function');

// 穿越模式 setup
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister', characterName: '赵孟頫', characterTitle: '翰林学士' };
var vars = PU._varsForRole('minister');
ok('minister 精选变量 4 个', vars.length === 4, 'got: ' + vars.length);
ok('minister 变量[0].label=官声', vars[0].label === '官声');

// 穿越模式真实渲染·验证 DOM 副作用
// 先把 bar-player-identity.style.display 置为 'none'·验证 renderTopBar 真的清空了它
sandbox.document.getElementById('bar-player-identity').style.display = 'none';
PU.renderTopBar();
ok('穿越模式 renderTopBar 显示身份条',
   sandbox.document.getElementById('bar-player-identity').style.display === '',
   'got: ' + sandbox.document.getElementById('bar-player-identity').style.display);
ok('穿越模式 renderTopBar 写入角色名',
   sandbox.document.getElementById('player-name').textContent === '赵孟頫');
ok('穿越模式 renderTopBar 写入身份条标题',
   sandbox.document.getElementById('player-role-chip').textContent === '翰林学士');

// 非穿越模式早返回·不抛错
sandbox.P.playerInfo = null;
try { PU.renderTopBar(); ok('renderTopBar 非穿越模式早返回不抛错', true); }
catch (e) { ok('renderTopBar 非穿越模式早返回不抛错', false, e); }

// ── Sub-test 4: PlayerEdictCard API + expand/dismiss 行为 ───
loadFile('tm-player-ui-edict-card.js');
var PE = sandbox.TM.PlayerEdictCard;
ok('PlayerEdictCard 导出', !!PE);
ok('show 是函数', typeof PE.show === 'function');
ok('expand 是函数', typeof PE.expand === 'function');
ok('dismiss 是函数', typeof PE.dismiss === 'function');

// 非穿越模式不弹
sandbox.P.playerInfo = null;
ok('非穿越模式 show 返回 false', PE.show({ type: 'memorial-reply', title: 'test' }) === false);

// 穿越模式 show
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'minister' };
sandbox.GM = { turn: 1 };
PE._resetTurn();
var r1 = PE.show({ type: 'memorial-reply', title: '奏请减免赋税' });
ok('穿越模式 show 返回 true', r1 === true);
ok('已弹 1 张', PE._entriesThisTurn() === 1);

// 防骚扰·同回合第 (MAX_PER_TURN+1) 张不弹
for (var i = 2; i <= MAX_PER_TURN; i++) {
  PE.show({ title: 'filler-' + i });
}
ok('已累积 ' + MAX_PER_TURN + ' 张', PE._entriesThisTurn() === MAX_PER_TURN);
var rOver = PE.show({ title: 'overflow' });
ok('第 ' + (MAX_PER_TURN + 1) + ' 张被防骚扰拦截', rOver === false);

// expand/dismiss 行为断言·新 turn 让 show 不被防骚扰拦截
sandbox.GM = { turn: 2 };
PE._resetTurn();
// 清空 body._children·让 expand 后只含本次 modal
sandbox.document.body._children.length = 0;
var _entryShown = PE.show({ type: 'memorial-reply', title: '行为测试', verdict: '准', comment: '已知' });
ok('行为测试 show 返回 true', _entryShown === true);
// 取出真实 entry.id（show 返回 boolean 而非 id·从 _entries 末位取）
var _ids = Object.keys(PE._entries);
var _lastId = _ids[_ids.length - 1];
try {
  PE.expand(_lastId);
  var _modalInBody = sandbox.document.body._children.some(function (c) { return c.id === 'player-edict-modal'; });
  ok('expand 弹出 modal 并加入 body', _modalInBody);
} catch (e) {
  ok('expand 弹出 modal 并加入 body', false, String(e));
}
try {
  PE.dismiss(_lastId);
  var _modalStillThere = sandbox.document.body._children.some(function (c) { return c.id === 'player-edict-modal'; });
  ok('dismiss 移除 modal', !_modalStillThere);
} catch (e) {
  ok('dismiss 移除 modal', false, String(e));
}

// ── Sub-test 5: 5 主题色 CSS 文件内容断言 ─────────────────
// 替换原字面量自比较·真正读取 CSS 文件验证 5 套主题色块都存在
var cssContent = fs.readFileSync(path.join(WEB_DIR, 'tm-transmigration-ui.css'), 'utf8');
ok('CSS 含 body.transmigration-mode 隔离规则', cssContent.indexOf('body.transmigration-mode') >= 0);
ok('CSS 含 civil 主题色块 (.player-role-minister)', cssContent.indexOf('body.player-role-minister') >= 0);
ok('CSS 含 royal 主题色块 (.player-role-prince)', cssContent.indexOf('body.player-role-prince') >= 0);
ok('CSS 含 merchant 主题色块 (.player-role-merchant)', cssContent.indexOf('body.player-role-merchant') >= 0);
ok('CSS 含 martial 主题色块 (.player-role-general)', cssContent.indexOf('body.player-role-general') >= 0);
ok('CSS 含 monastic 主题色块 (.player-role-monk)', cssContent.indexOf('body.player-role-monk') >= 0);
ok('CSS 5 块覆盖全部 15 种 playerRole 类名',
   ['minister','regent','retired_official','prince','custom','eunuch','maid',
    'merchant','artisan','general','bandit','monk','infant','commoner','actor']
   .every(function (r) { return cssContent.indexOf('player-role-' + r) >= 0; }));

// ── Sub-test 6: 皇帝模式零回归·renderTopBar 不污染 DOM ──────
// emperor 让 _isTrans() 返回 false·renderTopBar 第一行早返回·DOM 不被改动
sandbox.P.playerInfo = { transmigrationMode: true, playerRole: 'emperor' };
var _barBefore = sandbox.document.getElementById('bar-player-identity');
_barBefore.style.display = 'none';
try {
  PU.renderTopBar();
  var _barAfter = sandbox.document.getElementById('bar-player-identity');
  ok('emperor 模式 renderTopBar 不显示身份条', _barAfter.style.display === 'none',
     'got: ' + _barAfter.style.display);
} catch (e) {
  ok('emperor 模式 renderTopBar 不抛错', false, String(e));
}
ok('emperor 模式 renderTopBar 控制流零回归（到达此处即未抛错）', true);

// ── 总结 ──────────────────────────────────────────────────
console.log('');
if (fail === 0) {
  console.log('[smoke-transmigration-ui] PASS · ' + pass + ' sub-tests');
  process.exit(0);
} else {
  console.log('[smoke-transmigration-ui] FAIL · ' + fail + ' failed, ' + pass + ' passed');
  process.exit(1);
}
