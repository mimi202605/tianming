#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-wendui.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Promise,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Date,
  Math,
  JSON,
  parseInt,
  parseFloat,
  isFinite,
  GM: {
    sid: 'smoke',
    turn: 1,
    chars: [],
    wenduiHistory: {},
    jishiRecords: [],
    characterArcs: {}
  },
  P: {
    ai: { key: 'test-key' },
    playerInfo: { characterName: '天子' },
    traitDefinitions: []
  },
  document: {
    createElement() { return { className: '', innerHTML: '', appendChild(){}, style: {}, children: [] }; }
  },
  window: {},
  findScenarioById: () => null,
  findCharByName(name) {
    return sandbox.GM.chars.find(c => c.name === name);
  },
  escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  _$(id) {
    return sandbox.__els[id] || null;
  },
  __els: {},
  callAIMessagesStream: async () => '',
  extractJSON(raw) {
    try { return JSON.parse(raw); } catch (_) { return null; }
  },
  toast() {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tm-wendui.js' });

assert(typeof sandbox._wdResolveAudienceReplyText === 'function', 'active audience reply resolver missing');
assert(typeof sandbox._wdFindFaction === 'function', 'wendui faction resolver missing');

sandbox.GM.factions = {
  MaritimeLeague: { culture: 'sea trade', diplomacy: 72, leaderName: 'Sea Lord' }
};
sandbox.GM.facs = [
  { name: 'Court', culture: 'court', diplomacy: 60 }
];
assert(sandbox._wdFindFaction('MaritimeLeague').culture === 'sea trade',
  'wendui faction resolver should accept object-shaped GM.factions');
assert(sandbox._wdFindFaction('Court').culture === 'court',
  'wendui faction resolver should prefer runtime GM.facs');

const envoy = {
  name: '郑氏海商使节',
  _envoy: true,
  fromFaction: '郑氏海商',
  envoyMission: '请开海贸易，并求官方向身份洗白',
  loyalty: 50
};

const emptyParsed = sandbox._wdResolveAudienceReplyText('郑氏海商使节', envoy, { reply: '' }, '');
assert(emptyParsed && emptyParsed.trim().length > 0, 'empty parsed reply must fall back to non-empty text');
assert(emptyParsed.includes('郑氏海商'), 'envoy fallback should preserve faction identity');
assert(emptyParsed.includes('请开海贸易'), 'envoy fallback should preserve mission context');

const emptyRaw = sandbox._wdResolveAudienceReplyText('郑氏海商使节', envoy, null, '   ');
assert(emptyRaw && emptyRaw.trim().length > 0, 'blank raw reply must fall back to non-empty text');

const normal = sandbox._wdResolveAudienceReplyText('郑氏海商使节', envoy, { reply: '外臣奉命来议海贸。' }, '');
assert(normal === '外臣奉命来议海贸。', 'non-empty parsed reply should be preserved');

const fnMatch = src.match(/async function _wdNpcInitiateSpeak\(name\) \{[\s\S]*?\n\}/);
assert(fnMatch && fnMatch[0].includes('_wdResolveAudienceReplyText(name, ch, parsed, reply)'), 'active audience path must use resolver for AI replies');
assert(fnMatch && !fnMatch[0].includes('if (!ch || !P.ai || !P.ai.key) return;'), 'active audience path must not silently return before drawing fallback when API is unavailable');
assert(!src.includes('(GM.factions||[]).find'), 'wendui must not assume GM.factions is an array');

console.log(`[smoke-wendui-active-audience] PASS ${passed} assertions`);
