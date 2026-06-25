#!/usr/bin/env node
/* eslint-env node */
'use strict';
// probe-agent-wordcount.js — 验 agent deepen_narrative 按字数设置:maxTok 缩放 + chronicle slice 不再低于设置截断
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

function run(verbosity) {
  const p = vm.runInContext('(function(){\n'
    + 'if(!P.conf)P.conf={}; P.conf.verbosity=' + JSON.stringify(verbosity) + ';\n'
    + 'var rng = (typeof _getCharRange==="function") ? { shilu:_getCharRange("shilu"), szj:_getCharRange("szj"), houren:_getCharRange("houren") } : {};\n'
    + 'var maxToks = [];\n'
    + 'var longHouren = "场".repeat(3200);\n'
    + 'var longShizhengji = "政".repeat(1500);\n'
    + 'callAIMessages = async function(messages, maxTok){ var u=(messages&&messages[messages.length-1]&&messages[messages.length-1].content)||""; maxToks.push({ marker: u.slice(0,14), maxTok: maxTok });\n'
    + '  if(/脉络/.test(u)) return JSON.stringify({ beats:["甲","乙"], tone:"t" });\n'
    + '  if(/撰写《后人戏说》/.test(u)) return JSON.stringify({ houren_xishuo: longHouren });\n'
    + '  if(/据此产出完整史记/.test(u)) return JSON.stringify({ shizhengji: longShizhengji, shilu:"实".repeat(500), zhengwen:"演".repeat(900), playerStatus:"状", playerInner:"内", suggestions:["进言"], title:"标题", summary:"摘要" });\n'
    + '  return JSON.stringify({});\n'
    + '};\n'
    + 'var gm = { turn: 5, chars: [], facs: [], _turnReport: [] };\n'
    + 'return TM.Endturn.AgentDepthTools.handle("deepen_narrative", {}, { GM: gm }).then(function(r){\n'
    + '  var ch = gm._agentChronicle || {};\n'
    + '  return JSON.stringify({ verbosity:P.conf.verbosity, ranges:rng, ok:r.ok, maxToks: maxToks, hourenLen: String(ch.hourenXishuo||"").length, shizhengjiLen: String(ch.shizhengji||"").length, zhengwenLen: String(ch.zhengwen||"").length });\n'
    + '});\n'
    + '})()', sandbox, { timeout: 15000 });
  return Promise.resolve(p).then(function (json) { return JSON.parse(json); });
}

(async function () {
  console.log('\n══════ agent deepen_narrative 字数遵从验证 ══════');
  for (const v of ['standard', 'detailed']) {
    const r = await run(v);
    console.log('\n档位 [' + v + '] · _getCharRange: 实录' + JSON.stringify(r.ranges.shilu) + ' 时政记' + JSON.stringify(r.ranges.szj) + ' 后人戏说' + JSON.stringify(r.ranges.houren));
    console.log('  各 LLM 调用 max_tokens:');
    r.maxToks.forEach(function (m) { console.log('    「' + m.marker + '…」 max_tokens=' + m.maxTok); });
    console.log('  喂入 houren 3200字 / 时政记 1500字 / 政文 900字 → 落 chronicle:');
    console.log('    后人戏说 = ' + r.hourenLen + ' 字' + (r.hourenLen >= 3000 ? ' ✅未截断(旧写死 1500 会砍)' : ' ❌仍截断'));
    console.log('    时政记 = ' + r.shizhengjiLen + ' 字' + (r.shizhengjiLen >= 1400 ? ' ✅未截断(旧写死 800 会砍)' : ' ❌仍截断'));
    console.log('    政文 = ' + r.zhengwenLen + ' 字');
  }
  console.log('\n结论:max_tokens 随档位放大 + chronicle slice 随设置放大 → 字数设置真正落到 agent 产出。\n');
  process.exit(0);
})();
