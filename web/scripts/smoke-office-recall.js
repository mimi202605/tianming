/* smoke-office-recall.js — 官制活化 #1 office-recall 子调用 冒烟
 * 跑法：node web/scripts/smoke-office-recall.js
 * 验：①agent query_office→拼焦点官署详情(含duties) ②tier:'secondary'(#3)+id ③prompt含玩家官制操作(不脱节b)+焦点
 *     ④无cawt能力→空text(主推演落回静态舆图·零回归) ⑤护栏≤4 ⑥同query去重
 */
'use strict';
var path = require('path');
require(path.join(__dirname, '..', 'tm-office-powermap.js'));   // 提供 global.queryOfficeDetail + buildOfficePowerMap
var mod = require(path.join(__dirname, '..', 'tm-office-recall-agent.js'));
var run = mod.runOfficeRecall;

global.getRankLevel = function (r) { return ({ '正二品': 2 })[r] || 10; };
var GM = {
  _pendingReforms: [{ action: 'rename', actionLabel: '改名', targetName: '户部→度支部' }],
  chars: [
    { name: '郭某', administration: 80, wuchang: { ren: 70, yi: 70, li: 70, zhi: 70, xin: 70 } },
    { name: '王某', military: 60, wuchang: { ren: 50, yi: 50, li: 50, zhi: 50, xin: 50 } }
  ],
  officeTree: [
    { name: '户部', positions: [{ name: '尚书', rank: '正二品', holder: '郭某', powers: { taxCollect: true }, duties: '掌天下户口田赋之政令', _dutyState: { fulfillment: 60 } }] },
    { name: '兵部', positions: [{ name: '尚书', rank: '正二品', holder: '王某', powers: { militaryCommand: true }, duties: '掌天下武卫官军选授' }] }
  ]
};
global.findCharByName = function (n) { return (GM.chars || []).find(function (c) { return c.name === n; }) || null; };

var fails = 0;
function ok(c, m) { if (!c) { console.log('✗ ' + m); fails++; } else console.log('✓ ' + m); }

// 捕获 callAIWithTools 收到的 prompt + opts（验 tier + 不脱节）
var captured = {};
global.callAIWithTools = function (prompt, tools, opts) {
  captured.prompt = prompt; captured.tools = tools; captured.opts = opts;
  return Promise.resolve({ toolCalls: [{ name: 'query_office', input: { query: '户部' } }, { name: 'query_office', input: { query: '兵部' } }], fallback: false });
};

(async function () {
  var r = await run(GM, { focus: '边备废弛·命兵部整饬' });
  ok(r.text.indexOf('户部·尚书') >= 0 && r.text.indexOf('郭某') >= 0 && r.text.indexOf('职责:掌天下户口田赋') >= 0, '①agent query_office→拼焦点官署详情(含duties职责)');
  ok(r.text.indexOf('兵部·尚书') >= 0 && r.toolCallCount === 2, '①多工具调用都落地(户部+兵部·toolCallCount=2)');
  ok(captured.opts && captured.opts.tier === 'secondary', '②走次要 API(tier:secondary·#3)');
  ok(captured.opts && captured.opts.id === 'sc_office_recall', '②带 id 便于观测/记账');
  ok(captured.prompt.indexOf('改名') >= 0 && captured.prompt.indexOf('户部→度支部') >= 0, '③prompt含玩家本回合官制操作·拟制改制(不脱节铁律b)');
  ok(captured.prompt.indexOf('边备废弛') >= 0, '③prompt含本回合预判焦点');

  // ⑤护栏≤4 + ⑥dedup（6个全户部·截4·去重1块）
  global.callAIWithTools = function () { return Promise.resolve({ toolCalls: [1, 2, 3, 4, 5, 6].map(function () { return { name: 'query_office', input: { query: '户部' } }; }), fallback: false }); };
  var r5 = await run(GM, {});
  ok(r5.toolCallCount === 4, '⑤护栏：>4 工具调用→截到 4');
  ok((r5.text.match(/户部·尚书/g) || []).length === 1, '⑥同 query 去重→户部只出一块');

  // ④无 cawt 能力→空（落回静态 buildOfficePowerMap·零回归）
  delete global.callAIWithTools;
  var r4 = await run(GM, {});
  ok(r4.text === '' && r4.toolCallCount === 0, '④无 callAIWithTools→空 text(主推演落回静态舆图·零回归)');

  console.log('\n' + (fails === 0 ? 'PASS — ' : 'FAIL — ') + fails + ' 处失败\n');
  process.exit(fails === 0 ? 0 : 1);
})();
