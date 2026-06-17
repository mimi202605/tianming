// test-safeeval.js · TM.safeEval 白名单解释器单元测试
// 跑法：node web/tools/test-safeeval.js
//
// 覆盖：
//  (a) 正例——采样到的真实规则表达式语法都能正确求值，且与旧实现(new Function)结果一致
//  (b) 负例——已知绕过 payload 必须全部抛错被拒（constructor/Function/eval/原型链/this 等）
'use strict';

var path = require('path');

// tm-utils.js 是浏览器层文件·除 safeEval 外还有大量顶层浏览器代码(_restoreP 等)。
// safeEval 的 IIFE 在文件靠前处即 module.exports 导出核心·但后续顶层代码会触碰
// window/localStorage 而在 node 下抛错·中断 require。
// 为「核心解释器在 node 下可被测试」·此处装最小浏览器全局桩·让整文件能 load。
// 这些桩只为让无关顶层代码静默通过·不影响 safeEval 纯逻辑(它不依赖任何全局)。
(function installStubs() {
  if (typeof global.window === 'undefined') {
    var noop = function () {};
    var storage = { getItem: function () { return null; }, setItem: noop, removeItem: noop, clear: noop };
    global.localStorage = storage;
    global.document = {
      getElementById: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      addEventListener: noop, createElement: function () { return {}; }
    };
    global.window = global; // 让 typeof window 成立·window.TM 也挂在 global 上
    global.window.localStorage = storage;
    global.window.document = global.document;
    global.window.addEventListener = noop;
  }
})();

// require 被修改后的 tm-utils.js（其 safeEval IIFE 在 module.exports 暴露核心）
var mod = require(path.join(__dirname, '..', 'tm-utils.js'));
// 优先用 module.exports.safeEval；回退到 window.TM.safeEval（两条路径应一致）
var safeEval = (mod && mod.safeEval) ||
  (global.window && global.window.TM && global.window.TM.safeEval) ||
  global._TM_safeEvalCore;
if (typeof safeEval !== 'function') {
  console.error('FATAL: 无法从 tm-utils.js 取得 safeEval'); process.exit(2);
}

// ── 旧实现（new Function 黑名单沙箱）·仅用于「正例结果一致性」对照 ──
var FORBIDDEN = /\b(?:constructor|__proto__|__defineGetter__|__defineSetter__|prototype|Function|eval|this|window|self|globalThis|global|parent|top|frames|document|location|navigator|XMLHttpRequest|fetch|Worker|import|require|async|await|Symbol|Reflect|Proxy)\b/;
function legacyEval(expr, ctx) {
  if (typeof expr !== 'string') throw new Error('legacy: expr must be string');
  if (FORBIDDEN.test(expr)) throw new Error('legacy: forbidden token');
  var keys = ctx ? Object.keys(ctx) : [];
  var vals = keys.map(function (k) { return ctx[k]; });
  var fn = Function.apply(null, keys.concat(['"use strict"; return (' + expr + ');']));
  return fn.apply(undefined, vals);
}

var pass = 0, fail = 0;
var failures = [];

function deepEq(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) return true;
  return false;
}

// 正例：求值正确 + 与旧实现一致
function ok(expr, ctx, expected) {
  var got, threw = null;
  try { got = safeEval(expr, ctx); } catch (e) { threw = e; }
  if (threw) {
    fail++; failures.push('[OK-throw] ' + expr + '  → 意外抛错: ' + threw.message);
    return;
  }
  if (!deepEq(got, expected)) {
    fail++; failures.push('[OK-value] ' + expr + '  → 得到 ' + JSON.stringify(got) + ' 期望 ' + JSON.stringify(expected));
    return;
  }
  // 与旧实现对照（旧实现若因黑名单/语法拒绝则跳过对照·只要新实现值对即可）
  var legacyGot, legacyThrew = false;
  try { legacyGot = legacyEval(expr, ctx); } catch (e) { legacyThrew = true; }
  if (!legacyThrew && !deepEq(legacyGot, got)) {
    fail++; failures.push('[OK-parity] ' + expr + '  → 新 ' + JSON.stringify(got) + ' ≠ 旧 ' + JSON.stringify(legacyGot));
    return;
  }
  pass++;
}

// 负例：必须抛错
function rejects(expr, ctx, note) {
  var threw = null, got;
  try { got = safeEval(expr, ctx); } catch (e) { threw = e; }
  if (threw) { pass++; return; }
  fail++; failures.push('[REJECT] ' + expr + '  → 未抛错！返回 ' + JSON.stringify(got) + (note ? '  (' + note + ')' : ''));
}

// ─────────────────────────────────────────────────────────────
//  上下文构造：模拟 5 个调用点注入的 ctx 形态
// ─────────────────────────────────────────────────────────────
function makeGM() {
  return {
    stateTreasury: -120,
    turn: 42,
    taxPressure: 65,
    borderThreat: 30,
    prestige: 55,
    year: 1627,
    unrest: 70,
    partyStrife: 85,
    stability: 40,
    corruption: { trueIndex: 62, overall: 58 },
    minxin: { trueIndex: 35 },
    eraState: { centralization: 72, dynastyPhase: 'late', legitimacySource: 'mandate' },
    eraProgress: { collapse: 3, restoration: 1 },
    vars: {
      '民生压力': { value: 80, min: 0, max: 100 },
      '皇威': { value: 45 },
      '军心': { value: 60 }
    },
    chars: [
      { name: '崇祯', alive: true, legitimacy: 28, isRuler: true },
      { name: '魏忠贤', alive: false, legitimacy: 10 }
    ],
    facs: [{ name: '东林党', strength: 70 }],
    activeWars: [{ name: '辽东' }],
    _contradictions: [{ title: '党争', phase: 'resolved' }]
  };
}
var P = { variables: [], name: '测试剧本' };

// ─────────────────────────────────────────────────────────────
//  (a) 正例 —— 采样到的真实语法全集
// ─────────────────────────────────────────────────────────────
var GM = makeGM();
var ctxGM = { GM: GM };
var ctxGMP = { GM: GM, P: P };
var ctxCoupling = {
  GM: GM,
  taxPressure: GM.taxPressure,
  corruption: GM.corruption.trueIndex,
  borderThreat: GM.borderThreat,
  eraState: GM.eraState
};
var ctxChar = { char: GM.chars[0], GM: GM };

// 编辑器 placeholder 同款：GM.stateTreasury<0 / GM.stateTreasury<100
ok('GM.stateTreasury<0', ctxGM, true);
ok('GM.stateTreasury<100', ctxGM, true);
ok('GM.stateTreasury >= 0', ctxGM, false);

// eventConstraints 同款裸标识符比较（couplingRules ctx 把这些拍平注入）
ok('taxPressure>=50', ctxCoupling, true);
ok('borderThreat <= 20', ctxCoupling, false);
ok('corruption > 60', ctxCoupling, true);

// 全部比较运算符
ok('GM.turn > 40', ctxGM, true);
ok('GM.turn < 40', ctxGM, false);
ok('GM.turn >= 42', ctxGM, true);
ok('GM.turn <= 42', ctxGM, true);
ok('GM.turn == 42', ctxGM, true);
ok('GM.turn != 41', ctxGM, true);
ok('GM.eraState.dynastyPhase === "late"', ctxGM, true);
ok('GM.eraState.dynastyPhase !== "early"', ctxGM, true);

// 逻辑运算符 + 括号 + 短路
ok('GM.unrest >= 50 && GM.stability < 50', ctxGM, true);
ok('GM.prestige > 90 || GM.partyStrife >= 80', ctxGM, true);
ok('!(GM.stateTreasury >= 0)', ctxGM, true);
ok('(GM.turn > 10 && GM.turn < 100) || GM.year > 2000', ctxGM, true);
ok('GM.minxin && GM.minxin.trueIndex < 40', ctxGM, true);

// 算术运算符
ok('GM.taxPressure + GM.borderThreat > 90', ctxGM, true);
ok('GM.taxPressure - 5 == 60', ctxGM, true);
ok('GM.corruption.trueIndex * 2 > 120', ctxGM, true);
ok('GM.corruption.overall / 2 < 30', ctxGM, true);
ok('GM.turn % 2 == 0', ctxGM, true);
ok('-GM.stateTreasury > 100', ctxGM, true);

// 嵌套成员访问 + eraState 注入形态
ok('GM.eraState.centralization >= 72', ctxGM, true);
ok('eraState.centralization >= 70', ctxCoupling, true);

// 三元
ok('GM.unrest > 50 ? 1 : 0', ctxGM, 1);
ok('(GM.stability < 30 ? "危" : "稳")', ctxGM, '稳');

// 字符串/布尔/null 字面量
ok('GM.eraState.legitimacySource == "mandate"', ctxGM, true);
ok('GM.chars[0].alive === true', ctxGM, true);
ok('GM.chars[1].alive === false', ctxGM, true);
ok('GM.nonexistentField == null', ctxGM, true);

// 中文变量名成员访问（dotted 与 bracket 两种形态·AI-gen prompt 同款 vars.民生压力>60）
ok('GM.vars.民生压力.value > 60', ctxGM, true);
ok('GM.vars["皇威"].value < 50', ctxGM, true);
ok('GM.vars["军心"].value >= 60', ctxGM, true);

// char ctx（legitimacyConfig.rules）
ok('char.legitimacy < 30', ctxChar, true);
ok('char.alive === true && char.legitimacy < 30', ctxChar, true);
ok('GM.chars[0].isRuler && char.legitimacy < 50', ctxChar, true);

// goal custom（GM,P 双键）
ok('GM.turn >= 40 && P.name == "测试剧本"', ctxGMP, true);

// 数组 length / 索引 / 白名单方法
ok('GM.facs.length > 0', ctxGM, true);
ok('GM.activeWars.length >= 1 && GM.facs[0].strength > 50', ctxGM, true);

// 白名单函数：Math.* 与字符串/数组只读方法
ok('Math.max(GM.taxPressure, GM.borderThreat) == 65', ctxGM, true);
ok('Math.min(10, 20, 5) == 5', ctxGM, true);
ok('Math.abs(GM.stateTreasury) > 100', ctxGM, true);
ok('Math.floor(GM.corruption.overall / 2) == 29', ctxGM, true);
ok('GM.eraState.dynastyPhase.includes("ate")', ctxGM, true);
ok('GM.eraState.legitimacySource.startsWith("man")', ctxGM, true);

// 最复杂真实样例形态（多层 && / 嵌套成员 / 三元 / 算术混合）
ok('GM.corruption && GM.corruption.trueIndex >= 60 && GM.minxin.trueIndex < 40 && (GM.unrest > 50 || GM.partyStrife > 80)', ctxGM, true);
ok('GM.eraState && GM.eraState.centralization >= 70 ? GM.stability < 50 : false', ctxGM, true);

// ─────────────────────────────────────────────────────────────
//  (b) 负例 —— 已知绕过 payload 必须全部被拒
// ─────────────────────────────────────────────────────────────
// 直球原型链逃逸
rejects("GM.constructor.constructor('return 1')()", ctxGM, '经典 Function 构造器逃逸');
rejects("GM.constructor", ctxGM, '读 constructor');
rejects("GM.__proto__", ctxGM, '读 __proto__');
rejects("GM.__proto__.polluted", ctxGM);
rejects("GM.prototype", ctxGM);
rejects("(1).constructor", ctxGM, '数字 constructor');
rejects("(1).constructor.constructor('alert(1)')()", ctxGM);
rejects('"x".constructor', ctxGM, '字符串 constructor');
rejects("GM.eraState.dynastyPhase.constructor", ctxGM);

// 字符串拼接绕过（旧黑名单的死穴·拼接后不含完整 token）
rejects("GM['cons'+'tructor']", ctxGM, '拼接 constructor 索引');
rejects("GM['cons'+'tructor']['cons'+'tructor']('alert(1)')()", ctxGM);
rejects("GM['const'+'ructor']", ctxGM);

// 数组/内置原型逃逸
rejects("[]['fill']['constr'+'uctor']", ctxGM, '数组方法 constructor');
rejects("[]['fill']['constructor']('return process')()", ctxGM);
rejects("[].constructor", ctxGM);
rejects("[].constructor.constructor('return this')()", ctxGM);
rejects("GM.facs.constructor", ctxGM);
rejects("GM.facs['push']", ctxGM, '数组变异方法非白名单');
rejects("GM.facs.map", ctxGM, '非白名单数组方法');

// 全局对象 / this 逃逸
rejects("this", ctxGM);
rejects("globalThis", ctxGM);
rejects("window", ctxGM);
rejects("self", ctxGM);
rejects("global", ctxGM);
rejects("process", ctxGM, 'node 全局逃逸');
rejects("process.exit(1)", ctxGM);
rejects("require('fs')", ctxGM);
rejects("require('child_process').execSync('calc')", ctxGM);

// Function / eval / 反射族
rejects("Function('return 1')()", ctxGM);
rejects("eval('1+1')", ctxGM);
rejects("Reflect.get(GM,'x')", ctxGM);
rejects("Symbol('x')", ctxGM);

// 函数对象属性穿透（.call/.apply/.bind 拿全局）
rejects("GM.eraState.dynastyPhase.includes.call", ctxGM, '方法对象的 call');
rejects("Math.max.constructor", ctxGM);
rejects("Math.max.constructor('return 1')()", ctxGM);

// 调用非白名单函数 / 方法
rejects("GM.toString()", ctxGM, 'toString 非白名单');
rejects("GM.valueOf()", ctxGM);
rejects("Math.random()", ctxGM, 'Math.random 非纯函数·未放行');
rejects("alert(1)", ctxGM, '未知函数');
rejects("GM.chars.find(function(c){return true})", ctxGM, '不支持函数字面量');

// 危险键即使经 bracket 也拒
rejects("GM['__proto__']", ctxGM);
rejects("GM['constructor']", ctxGM);
rejects("GM.vars['皇威']['__proto__']", ctxGM);

// 语法层面非法（赋值/逗号序列/自增等本语言不支持）
rejects("GM.turn = 1", ctxGM, '不支持赋值');
rejects("GM.turn++", ctxGM, '不支持自增');
rejects("GM.turn, GM.year", ctxGM, '不支持逗号表达式');
rejects("a => a", ctxGM, '不支持箭头函数');

// 未定义裸标识符（语义同 ReferenceError）
rejects("undefinedVar > 5", ctxGM);
rejects("someGlobal.x", ctxGM);

// ─────────────────────────────────────────────────────────────
//  汇总
// ─────────────────────────────────────────────────────────────
console.log('');
console.log('========== TM.safeEval 测试结果 ==========');
console.log('通过: ' + pass + '   失败: ' + fail);
if (failures.length) {
  console.log('');
  console.log('---- 失败明细 ----');
  failures.forEach(function (f) { console.log('  ✗ ' + f); });
}
console.log('==========================================');
process.exit(fail === 0 ? 0 : 1);
