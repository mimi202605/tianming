#!/usr/bin/env node
// smoke-guoku-sources-scenario-disabled.js — guoku LAYERED · p4 Sources wrap
// R8 (Phase 3·R161)·覆盖 p4 OVERRIDE Sources (scenario taxesEnabled wrap)

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Date, JSON, Math, GM: { turn: 12 }, P: {} };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}
function assert(cond, msg) { if (!cond) throw new Error('[smoke-guoku-sources-scenario-disabled] ' + msg); }

load('tm-guoku-engine.js');





const GuokuEngine = ctx.GuokuEngine;
let assertions = 0;

GuokuEngine.ensureModel();

// ── case 1·禁用 dingshui (丁税)·应返 0 ──
ctx.P.fiscalConfig = { taxesEnabled: { tianfu: true, dingshui: false } };
const dingshuiVal = GuokuEngine.Sources.dingshui();
assertions += 1; assert(dingshuiVal === 0, 'dingshui should be 0 when taxesEnabled.dingshui=false');

// tianfu 应正常 (不禁用)
const tianfuVal = GuokuEngine.Sources.tianfu();
assertions += 1; assert(tianfuVal >= 0, 'tianfu should be >=0 when enabled');

// ── case 2·禁 yanlizhuan (盐铁) ──
ctx.P.fiscalConfig.taxesEnabled.yanlizhuan = false;
const yanVal = GuokuEngine.Sources.yanlizhuan();
assertions += 1; assert(yanVal === 0, 'yanlizhuan should be 0 when disabled');

// ── case 3·全开·sources 全部返非负 ──
ctx.P.fiscalConfig = { taxesEnabled: {} };  // empty = all enabled
['tianfu','dingshui','caoliang','yanlizhuan','shipaiShui','quanShui','juanNa','qita'].forEach(function(k) {
  const v = GuokuEngine.Sources[k]();
  assertions += 1; assert(v >= 0, k + ' should be >= 0 when all enabled');
});

// ── case 4·sourceMultipliers 改革效应 ──
ctx.GM.guoku.sourceMultipliers = { tianfu: 1.3 };
const baseTianfu = GuokuEngine.Sources.tianfu();
assertions += 1; assert(typeof baseTianfu === 'number', 'tianfu with multiplier must be numeric');

console.log('[smoke-guoku-sources-scenario-disabled] pass assertions=' + assertions);
