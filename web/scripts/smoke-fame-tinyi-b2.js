#!/usr/bin/env node
// smoke-fame-tinyi-b2.js - B2 名望→廷议(话语权/弹劾防护/改革通过率)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }

function main() {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Boolean, RegExp, isFinite, isNaN, parseInt, parseFloat,
    Error, TypeError, RangeError, Date: function(){ return { getTime: function(){ return 0; } }; },
    setTimeout: function(){ return 0; }, clearTimeout: function(){},
    GM: { turn: 5, chars: [], facs: [], parties: [], corruption: { subDepts: {}, perceivedIndex: 30 }, partyState: {} },
    P: { playerInfo: {} },
    TM: { errors: { capture: function(){}, captureSilent: function(){} } },
    findCharByName: function(n){ return (ctx.GM.chars || []).find(function(c){ return c.name === n; }) || null; },
    addEB: function(){}, addCYBubble: function(){}
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  try {
    vm.runInContext((fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-persona.js'), 'utf8') + '\n' + (fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-edict-personnel.js'), 'utf8')) + '\n' + fs.readFileSync(path.join(ROOT, 'tm-tinyi-v3-parties.js'), 'utf8')), ctx, { filename: 'tm-tinyi-v3.js' });
  } catch (e) {
    console.error('[smoke-fame-tinyi-b2] load threw (expected if heavy deps): ' + (e && e.message));
  }

  const grade = ctx._ty3_impeachmentVerdictGrade;
  const urg = ctx._ty3_calcUrgency;
  const elig = ctx._ty3_calcEligibilityByPrestige;
  assert(typeof grade === 'function', '_ty3_impeachmentVerdictGrade 可达');
  assert(typeof urg === 'function', '_ty3_calcUrgency 可达');
  assert(typeof elig === 'function', '_ty3_calcEligibilityByPrestige 可达');

  // ── 弹劾防护：同样 charges，高 fame 被告 grade 应 <= 低 fame 被告 ──
  const charges = [{ severity: 5 }, { severity: 5 }, { severity: 4 }];  // base score 14
  const pm = { influence: 60, cohesion: 40 };  // +1 +2 = score ~17
  const gNoFame = grade(charges, pm, { weight: 0 }, { name: 'a', resources: { fame: 0 } });
  const gHighFame = grade(charges, pm, { weight: 0 }, { name: 'b', resources: { fame: 100 } });  // -4
  const gLowFame = grade(charges, pm, { weight: 0 }, { name: 'c', resources: { fame: -100 } });  // +4
  const order = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  assert(order[gHighFame] < order[gNoFame], '高名望防弹劾:grade 降 (' + gNoFame + '→' + gHighFame + ')');
  assert(order[gLowFame] >= order[gNoFame], '名声已坏更易成案 (' + gNoFame + '→' + gLowFame + ')');

  // ── 改革通过率:高 fame proposer urgency 更高 ──
  const baseP = { name: 'p', prestige: 50, loyalty: 60, resources: { fame: 0 }, aggregateDims: {} };
  const fameP = { name: 'p2', prestige: 50, loyalty: 60, resources: { fame: 60 }, aggregateDims: {} };
  const u0 = urg(baseP, 'request_tinyi_party');
  const u1 = urg(fameP, 'request_tinyi_party');
  assert(u1 > u0, '高名望提议 urgency 更高 (' + u0 + '→' + u1 + ')');

  // ── 话语权:高 fame 抬 composite → 更易必召 ──
  // prestige 70 + influence 70 = composite 70；fame +30 → ×1.3 = 91 → 必召(>=90)
  const eHigh = elig({ prestige: 70, influence: 70, resources: { fame: 30 } });
  const eNone = elig({ prestige: 70, influence: 70, resources: { fame: 0 } });
  assert(eHigh && eHigh.category === '必召', '名望抬话语权→必召, got ' + JSON.stringify(eHigh));
  assert(!eNone || eNone.category !== '必召', '无名望加成不必召(对照)');

  console.log('[smoke-fame-tinyi-b2] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-fame-tinyi-b2] FAIL'); console.error(err && err.stack || err); process.exit(1); }
