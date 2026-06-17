const assert = require('assert');

const SID = 'sc-tianqi7-1627';
const VERSION = 'v46-2026.04.19-popConfig-envConfig-topLevel-fix';

function emptyProject() {
  return {
    scenarios: [{ id: SID, _version: VERSION, name: 'cached shell' }],
    characters: [],
    factions: [],
    parties: [],
    classes: [],
    variables: [],
    events: [],
    relations: [],
    items: [],
    rigidHistoryEvents: []
  };
}

function count(key) {
  return (global.P[key] || []).filter(function(item) { return item && item.sid === SID; }).length;
}

function assertCoreCounts(label) {
  assert(count('characters') >= 30, label + ': missing characters');
  assert(count('factions') >= 5, label + ': missing factions');
  assert(count('variables') >= 10, label + ': missing variables');
  assert(count('events') >= 10, label + ': missing events');
}

global.document = { readyState: 'complete' };
global.P = emptyProject();
const saves = [];
global.saveP = function() {
  saves.push({
    characters: count('characters'),
    factions: count('factions'),
    variables: count('variables'),
    events: count('events')
  });
};

require('../scenarios/tianqi7-1627.js');
assertCoreCounts('scenario-register');
assert(saves.length >= 1, 'scenario register should save once after payload registration');
assert(saves[0].variables >= 10, 'scenario register saved before variables were registered');

const listeners = {};
global.addEventListener = function(name, fn) { listeners[name] = fn; };
global.P = emptyProject();
global.saveP = function() {};
require('../data/scenario-supplements/tianqi7-official-runtime-snapshot.js');
assertCoreCounts('runtime-snapshot-initial');
const sc = global.P.scenarios.find(function(s) { return s && s.id === SID; });
assert(sc && ((sc.map && sc.map.regions && sc.map.regions.length) || (sc.mapData && sc.mapData.regions && sc.mapData.regions.length)), 'snapshot missing map regions');

global.P = emptyProject();
assert(typeof listeners['tm:p-restored'] === 'function', 'snapshot restore listener was not registered');
listeners['tm:p-restored']();
assertCoreCounts('runtime-snapshot-after-restore');

console.log('[smoke] tianqi official cache recovery PASS');
