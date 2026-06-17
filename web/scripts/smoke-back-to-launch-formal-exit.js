#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const launchSource = fs.readFileSync(path.join(ROOT, 'tm-launch.js'), 'utf8');
const pauseSource = fs.readFileSync(path.join(ROOT, 'tm-pause-fab.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(/function resetLaunchRuntimeShell\(\)/.test(launchSource), 'tm-launch must expose resetLaunchRuntimeShell');
assert(/resetLaunchRuntimeShell\(\);[\s\S]{0,220}_\$\("launch"\)\.style\.display="flex"/.test(launchSource), 'backToLaunch must reset runtime shell before showing launch');
assert(/tm-phase8-game-active/.test(launchSource), 'launch reset must clear formal active class');
assert(/tm-phase8-home/.test(launchSource) && /tm-phase8-legacy/.test(launchSource), 'launch reset must clear formal home/legacy classes');
assert(/province-panel-open/.test(launchSource), 'launch reset must clear province panel class');
assert(/['"]loading['"][\s\S]{0,120}['"]pause-bg['"][\s\S]{0,120}['"]settings-bg['"][\s\S]{0,120}['"]turn-modal['"]/.test(launchSource), 'launch reset must clear blocking overlays');
assert(/TMPhase8FormalBridge[\s\S]{0,80}(leaveRuntime|backToLaunch|resetOutgame)/.test(launchSource), 'launch reset must notify formal bridge');
assert(/TM\.pauseFab[\s\S]{0,120}refresh/.test(launchSource), 'launch reset must refresh pause fab visibility');
assert(/function isGameSurfaceVisible\(\)/.test(pauseSource), 'pause fab must gate visibility on real game surface');
assert(/run && inYuan && inGame/.test(pauseSource), 'pause fab must hide when #G is not visible');
assert(/refresh:\s*function/.test(pauseSource), 'pause fab must expose refresh hook');

console.log('[smoke-back-to-launch-formal-exit] PASS');
