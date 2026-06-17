#!/usr/bin/env node
// lint-namespace.js - Phase 6 namespace migration guard.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ACTIVE_EXT_RE = /\.(js|html)$/;
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'docs',
  'scripts',
  'scenarios',
  'archive',
  'tools',
  'vendor'
]);

const failures = [];
let checkedFiles = 0;
let checkedRules = 0;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.bak-')) continue;
      out.push(...walk(full));
    } else if (entry.isFile() && ACTIVE_EXT_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function isCommentLine(line) {
  const s = line.trim();
  return s === '' || s.startsWith('//') || s.startsWith('*') ||
    s.startsWith('/*') || s.startsWith('<!--') || s.startsWith('*/');
}

function checkNoLinePattern(file, re, msg) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    checkedRules++;
    if (isCommentLine(line)) return;
    const active = line.split('//')[0];
    if (re.test(active)) {
      failures.push(`${rel(file)}:${idx + 1}: ${msg}: ${line.trim()}`);
    }
  });
}

function checkMustContain(file, needle, msg) {
  checkedRules++;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    failures.push(`${rel(file)}: ${msg}: missing ${needle}`);
  }
}

function checkMustNotContain(file, needle, msg) {
  checkedRules++;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(needle)) {
    failures.push(`${rel(file)}: ${msg}: found ${needle}`);
  }
}

const activeFiles = walk(ROOT);
activeFiles.forEach(file => {
  checkedFiles++;
  checkNoLinePattern(file, /\bTM\.(?:MapSystem|Storage)\b/, 'R208 retired namespace alias should not be used in active code');
});

const indexHtml = path.join(ROOT, 'index.html');
const editorHtml = path.join(ROOT, 'editor.html');

[
  'onclick="openAllVarsModal()',
  'onclick="openSideDrawer(',
  'onclick="closeSideDrawer(',
  'onclick="closeTurnResult()',
  'onclick="_trNavTurn(',
  'onclick="_trExportCurrent()',
  'onclick="openSaveManager()',
  'switchGTab&&switchGTab',
  'onclick="confirmEndTurn()'
].forEach(needle => checkMustNotContain(indexHtml, needle, 'P6-beta migrated index.html inline handler regressed'));

[
  'onclick="cloneScript()"',
  'onclick="openFullGenModal()"',
  'onclick="quickTestScenario()"',
  'onclick="saveScript()"',
  'onclick="openAIGenModal(',
  'onclick="closeAIGenModal()"',
  'onclick="doAIGenerate()"',
  'onclick="closeFullGenModal()"',
  'onclick="openTraitSelectorModal()"',
  'onclick="closeGenericModal()"',
  'onchange="updateMapSystemConfig(',
  'onclick="renderMilitaryNew()"',
  'onclick="aiGenerateGoals()"',
  'onclick="addGoalEntry()"'
].forEach(needle => checkMustNotContain(editorHtml, needle, 'P6-gamma migrated editor.html inline handler regressed'));

[
  'TM.UI.topbar.openAllVarsModal()',
  'TM.Save.openManager()',
  'TM.Endturn.run.confirmEndTurn()',
  'TM.Editor.core.saveScript()',
  'TM.Editor.ai.openAIGenModal(',
  'TM.Editor.map.updateMapSystemConfig(',
  '<script src="tm-namespaces.js" defer="" data-tm-no-auto-verify="1"></script>'
].forEach(needle => {
  const target = needle.startsWith('TM.Editor') || needle.includes('tm-namespaces') ? editorHtml : indexHtml;
  checkMustContain(target, needle, 'P6 namespace migrated call should remain present');
});

if (failures.length > 0) {
  console.error('[lint-namespace] FAIL');
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

console.log('[lint-namespace] PASS files=' + checkedFiles + ' rules=' + checkedRules);
