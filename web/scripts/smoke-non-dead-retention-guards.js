#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const memorials = read('tm-memorials.js');
const saveLifecycle = read('tm-save-lifecycle.js');
const npcDecision = (read('tm-npc-decision.js') + read('tm-npc-decision-ai-driven.js'));
const helpSocial = read('tm-help-social.js');
const utils = read('tm-utils.js');
const edictLifecycle = read('tm-edict-lifecycle.js');
const phase8Bridge = read('phase8-formal-bridge.js');
const playerCore = read('tm-player-core.js');
const hongyanOffice = read('tm-hongyan-office.js');

assert(memorials.includes('TM_RETENTION_GUARD: generateMemorials-origin-wrapped-not-dead'),
  'generateMemorials original must be marked as wrapped-not-dead');
assert(/function\s+generateMemorials\s*\(/.test(memorials),
  'generateMemorials original function must remain present');
assert(/var\s+_origGenMem\s*=\s*generateMemorials\s*;/.test(saveLifecycle) && /_origGenMem\s*\(\s*\)/.test(saveLifecycle),
  'save lifecycle wrapper must keep delegating to original generateMemorials');

assert(npcDecision.includes('TM_RETENTION_GUARD: executeNpcBehavior-single-npc-fallback'),
  'executeNpcBehavior must be marked as retained fallback');
assert(/async\s+function\s+executeNpcBehavior\s*\(/.test(npcDecision),
  'executeNpcBehavior fallback function must remain present');
assert(/executeNpcBehavior\s*\(\s*npc\s*,\s*context\s*\)/.test(helpSocial),
  'tm-help-social still depends on executeNpcBehavior until migrated');

assert(utils.includes('TM_RETENTION_GUARD: early-days-per-turn-provider'),
  'tm-utils _getDaysPerTurn must be marked as early provider');
assert(edictLifecycle.includes('TM_RETENTION_GUARD: edict-days-per-turn-compatible-redefinition'),
  'tm-edict-lifecycle _getDaysPerTurn redefinition must be marked compatible');
assert(/function\s+_getDaysPerTurn\s*\(/.test(utils) && /function\s+_getDaysPerTurn\s*\(/.test(edictLifecycle),
  '_getDaysPerTurn duplicate definitions must remain intentional until centralized');

assert(phase8Bridge.includes('TM_RETENTION_GUARD: phase8-topbar-fallback-api'),
  'phase8 fallback topbar API must be marked as retained fallback');
assert(/function\s+fallbackActionTraySpecs\s*\(/.test(phase8Bridge) && /bridge\s*&&\s*bridge\.topbar\s*\?\s*bridge\.topbar\s*:\s*fallbackTopbarApi/.test(phase8Bridge),
  'phase8 bridge must keep fallback topbar API wiring');

assert(playerCore.includes('TM_RETENTION_GUARD: legacy-bar-resources-shim'),
  'renderBarResources shim must be marked as retained compatibility shim');
assert(/function\s+renderBarResources\s*\(/.test(playerCore) && /renderBarResources\s*\(\s*\)/.test(hongyanOffice),
  'renderBarResources shim must remain while renderGameState still calls it');

console.log('smoke-non-dead-retention-guards ok');
