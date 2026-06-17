#!/usr/bin/env node
// smoke-endturn-prompt-tokens.js — Phase 7 P7-β baseline·3/21
// 锁 §1 sysP prompt 构建的 key tokens·拆分 P7-γ 时 prompt 构建逻辑迁出·这些 token 必保

'use strict';

const { readSource, makeAssert } = require('./smoke-endturn-baseline-helpers');

const passed = { value: 0 };
const assert = makeAssert(passed);

const src = readSource();

// ─── §1 5-layer 推演依据·5 层标签 ───
[
  '【推演依据——本回合推演基于以下五层数据，请综合推演】',
  'A. 玩家国家行动',
  'B. 玩家私人行动',
  'C. 玩家对NPC的意志表达',
  'D. NPC/势力自主行动',
  'E. 世界背景与因果'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, '5-layer prompt token·"' + token + '"');
});

// ─── 问天系统·至高意志块 ───
[
  '★ 天 意 · 至 高 意 志 ★',
  '世 界 法 则 直 接 生 效',
  '★★★【问天·玩家对推演AI的直接指令（最高优先级·必须遵守）】★★★',
  'directive_compliance',
  '"followed"',
  '"partial"',
  '"ignored"'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, '问天 directive token·"' + token + '"');
});

// ─── 诏令生命周期 9 阶段 (R147 lifecycle data-driven) ───
[
  '诏令推演纲要——9 阶段生命周期',
  '诏令颁布≠政策见效',
  'drafting草拟',
  'promulgation颁布',
  'transmission传达',
  'interpretation地方解读',
  'execution执行',
  'feedback反馈',
  'adjustment调整',
  'sedimentation沉淀',
  'edict_lifecycle_update'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, '诏令 9 阶段·"' + token + '"');
});

// ─── 民变 7 阶段 ───
[
  '民变/起义 7 阶段',
  'revolt_update.phase',
  'brewing酝酿',
  'uprising举旗',
  'expansion扩张',
  'stalemate相持',
  'turning转折',
  'decline衰亡',
  'establishment建政',
  'ending收束'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, '民变 7 阶段·"' + token + '"');
});

// ─── R147 数据驱动 lifecycle 块·替代 135 行硬编码死代码 ───
[
  'tm-edict-lifecycle.js 的 EDICT_TYPES/EDICT_STAGES/REFORM_PHASES/RESISTANCE_SOURCES',
  '替代了 2026-04-28 删除的 135 行硬编码死代码',
  'getEdictLifecycleTurns',
  'REFORM_PHASES',
  'RESISTANCE_SOURCES'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, 'R147 数据驱动·"' + token + '"');
});

// ─── 朝代特化字段·中立判断 ───
[
  '朝代特化字段——按本剧本朝代由 AI 自行判断',
  '中下层执行者称谓',
  '诏书复核机构',
  '巡幸传统',
  '流放分级'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, '朝代特化·"' + token + '"');
});

// ─── 反向反馈约束·避免"准而无效" ───
[
  '反向反馈约束——避免"准而无效"',
  'classesAffected/factionsAffected/partiesAffected',
  'currentEffects 反映折扣'
].forEach(function(token) {
  assert(src.indexOf(token) >= 0, '反向反馈·"' + token + '"');
});

console.log('[smoke-endturn-prompt-tokens] pass assertions=' + passed.value);
