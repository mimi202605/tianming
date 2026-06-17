#!/usr/bin/env node
'use strict';
// E3 守护：失败/废止的诏令 → 程序性教训(Reflexion「从失败中学」确定性切片)，投进 advisory/warnings，
// 让演绎脑看到过往失败、不重复犯同类错。活跃诏令不产教训。零 AI·绑源不 stale。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {}, console, Date, Math, JSON };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

[
  'tm-memory-evidence-registry.js',
  'tm-memory-issue-governance.js',
  'tm-memory-envelope.js',
  'tm-memory-controls.js',
  'tm-memory-retrieval.js',
  'tm-context-zones.js',
  'tm-memory-context-compiler.js'
].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file }));

const ME = sandbox.TM && sandbox.TM.MemoryEnvelope;
const MCC = sandbox.TM && sandbox.TM.MemoryContextCompiler;

const GM = {
  turn: 30,
  activeEdicts: [
    { id: 'e-fail', name: '骤裁辽饷', status: 'failed', reason: '操之过急激起边镇哗变', startedTurn: 27 },
    { id: 'e-live', name: '清丈田亩', status: 'active', startedTurn: 29 }
  ],
  _edictTracker: [
    { id: 't-abort', content: '强征商税', status: 'abandoned', reason: '士绅抵制', turn: 25 }
  ]
};

// 1) 失败/废止诏令产 procedural_lesson；活跃诏令不产
const envs = ME.collect(GM, { turn: 30 });
const lessons = envs.filter((e) => e.reason === 'projection:failed_edict_lesson');
assert(lessons.some((e) => String(e.safeBody || '').indexOf('骤裁辽饷') >= 0), 'failed edict produces a procedural lesson');
assert(lessons.some((e) => String(e.safeBody || '').indexOf('强征商税') >= 0), 'abandoned tracked edict produces a procedural lesson');
assert(!lessons.some((e) => String(e.safeBody || '').indexOf('清丈田亩') >= 0), 'active (non-failed) edict produces NO lesson');
assert(lessons.every((e) => e.type === 'procedural_lesson' && e.authority === 'procedural'), 'lessons are low-authority procedural advice');
assert(lessons.every((e) => !String(e.safeBody || '').includes('<')), 'lesson safeBody is injection-clean');

// 2) compileFromGM 注入教训(advisory/warnings 区)
const compiled = MCC.compileFromGM(GM, { turn: 31, audience: 'system', actorScope: 'system', intent: 'turn_inference', maxTokens: 4000 });
assert(compiled.text.includes('骤裁辽饷') && compiled.text.includes('勿重蹈覆辙'), 'failed-edict lesson injected into prompt context');

console.log('smoke-memory-failed-edict-lesson ok');
