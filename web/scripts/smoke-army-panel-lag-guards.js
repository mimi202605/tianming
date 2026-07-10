const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'phase8-formal-rightrail.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERT FAIL:', msg);
    process.exit(1);
  }
}

function sliceBetween(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `missing slice ${start}`);
  return source.slice(a, b);
}

const renderArmy = sliceBetween('function renderArmy()', 'function rightAdminNum');
const belongs = sliceBetween('function rightArmyBelongsToPlayer', 'function rightArmyList');

assert(source.includes('function rightArmyContext'), 'army panel must cache faction context once per render');
assert(source.includes('function rightArmyRowsForRender'), 'army panel must pre-index rows for render');
assert(source.includes('function rightBuildArmyGroups'), 'army panel must build groups in one pass');
assert(source.includes('function rightScheduleArmyListHydration'), 'army panel must defer full army list hydration until after first paint');
assert(renderArmy.includes('RIGHT_ARMY_INITIAL_ROWS'), 'renderArmy must render only an initial army row chunk synchronously');
assert(renderArmy.includes('rightSliceArmyGroups'), 'renderArmy must slice army groups for the synchronous first paint');
assert(!belongs.includes('rightCollectPlayerFactionNames();'), 'army ownership check must not rebuild player factions per army');
assert(!belongs.includes('rightKnownFactionNames();'), 'army ownership check must not rebuild known factions per army');
assert(!/armies\.filter\s*\(\s*function\s*\(\s*a\s*\)\s*\{\s*return\s+rightArmyType\s*\(\s*a\s*\)\s*===\s*g/.test(renderArmy), 'renderArmy must not filter the full army list once per group');
assert(!renderArmy.includes('armies.indexOf(a)'), 'renderArmy must not call indexOf for every army row');

// 军务页签化契约(2026-07-11·玩家反馈行12：名册压在下方要滑动)
assert(renderArmy.includes('tmrp-army-tabs') && renderArmy.includes('data-right-action="army-tab"'), 'renderArmy must render 概览/名册 tab bar');
assert(/deferredList && armyTab === 'roster'/.test(renderArmy), 'roster hydration must only be scheduled when roster tab is shown');
assert(/action === 'army-tab'/.test(source) && /state\.rightArmyTab = data\.tab === 'roster' \? 'roster' : 'overview'/.test(source), 'army-tab action must switch state.rightArmyTab and rerender');

console.log('smoke-army-panel-lag-guards OK');
