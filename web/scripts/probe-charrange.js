#!/usr/bin/env node
/* eslint-env node */
'use strict';
// probe-charrange.js — 实测字数设置链:P.conf.verbosity/自定义 → _getCharRange → recordSpecs/hourenSpec 的 prompt 字数
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.resolve(__dirname, '..'); const HEADLESS = path.join(__dirname, 'headless-smoke.js');
function loadHeadlessHelpers() { const s = fs.readFileSync(HEADLESS, 'utf8').replace(/^#![^\n]*\n/, '').replace(/\nmain\(\);\s*$/, '\nreturn { makeStubs, parseIndexHtmlScripts };'); return (new Function('require', 'process', '__dirname', '__filename', 'module', 'exports', s))(require, process, __dirname, HEADLESS, { exports: {} }, {}); }
const helpers = loadHeadlessHelpers();
const env = helpers.makeStubs();
env.win.console = { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} };
env.win.location.href = 'http://localhost/index.html'; env.win.location.search = '';
const sandbox = vm.createContext(env.win);
const scripts = helpers.parseIndexHtmlScripts();
const cutoff = scripts.findIndex((src) => path.basename(src) === 'tm-test-harness.js');
(cutoff >= 0 ? scripts.slice(0, cutoff) : scripts).forEach((src) => { try { vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src, timeout: 15000 }); } catch (e) {} });

function probe(verbosity) {
  return JSON.parse(vm.runInContext(`JSON.stringify((function(){
    if(!P.conf)P.conf={}; P.conf.verbosity=${JSON.stringify(verbosity)};
    function rng(c){ try { return (typeof _getCharRange==='function')?_getCharRange(c):['(no fn)']; } catch(e){ return ['ERR:'+e.message]; } }
    var out = { verbosity: P.conf.verbosity, shilu: rng('shilu'), szj: rng('szj'), houren: rng('houren') };
    // recordSpecs / hourenSpec 实际 prompt 里嵌的字数(ctx.prompt 缺 → 回落 _getCharRange)
    try {
      var rs = TM.Endturn.AI.prompt.recordSpecs({});
      out.recordSpecs_shilu_head = String(rs.shilu).slice(0, 18);
      out.recordSpecs_shizhengji_head = String(rs.shizhengji).slice(0, 22);
      out.recordSpecs_ranges = { shilu:[rs.shiluMin,rs.shiluMax], szj:[rs.szjMin,rs.szjMax], houren:[rs.hourenMin,rs.hourenMax] };
    } catch(e){ out.recordSpecs_err = e.message; }
    try {
      var hs = TM.Endturn.AI.prompt.hourenSpec({});
      var m = hs.match(/【字数】(\\d+)-(\\d+)字/);
      out.hourenSpec_wordcount = m ? (m[1]+'-'+m[2]) : '(未匹配【字数】)';
    } catch(e){ out.hourenSpec_err = e.message; }
    return out;
  })())`, sandbox, { timeout: 10000 }));
}

console.log('\n══════ 字数设置链实测(_getCharRange → recordSpecs/hourenSpec)══════');
console.log('自定义默认值(tm-patches.js:999-1001):实录 200-400 · 时政记 600-1200 · 后人戏说 2500-6000\n');
['concise', 'standard', 'detailed', 'custom'].forEach(function (v) {
  var p = probe(v);
  console.log('档位 [' + v + ']');
  console.log('  _getCharRange:  实录=' + JSON.stringify(p.shilu) + ' · 时政记=' + JSON.stringify(p.szj) + ' · 后人戏说=' + JSON.stringify(p.houren));
  console.log('  recordSpecs 嵌入:' + JSON.stringify(p.recordSpecs_ranges) + (p.recordSpecs_err ? ' ERR:' + p.recordSpecs_err : ''));
  console.log('  recordSpecs.shilu 提示词头:「' + (p.recordSpecs_shilu_head || '') + '…」 · shizhengji头:「' + (p.recordSpecs_shizhengji_head || '') + '…」');
  console.log('  hourenSpec【字数】=' + (p.hourenSpec_wordcount || p.hourenSpec_err || '?') + '\n');
});
console.log('结论:若各档位 _getCharRange 随设置变 + recordSpecs/hourenSpec 嵌入值 == _getCharRange → 字数设置链通(prompt 真按设置要求);');
console.log('     之前测出的短内容 = 我当 LLM 时没按 prompt 字数生成(stub 偷懒)·非系统没要求。\n');
process.exit(0);
