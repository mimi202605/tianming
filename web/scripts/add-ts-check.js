#!/usr/bin/env node
// scripts/add-ts-check.js — 批量给 tm-*.js 加 // @ts-check 头部
//
// 仅处理 tm-*.js (主项目代码)·跳过 editor-*.js (单独域)·script/*.js (工具)·scenarios/*.js (剧本数据)
// 跳过已有 @ts-check 的文件
// 在第一行注释或 var/function 之前加 // @ts-check + reference path

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const DRY = !args.includes('--apply');
const targetFiles = args.filter(a => !a.startsWith('--'));

const tmFiles = targetFiles.length
  ? targetFiles
  : fs.readdirSync(ROOT).filter(f => /^tm-.*\.js$/.test(f));

let added = 0, skipped = 0, errors = [];

for (const f of tmFiles) {
  const fullPath = path.join(ROOT, f);
  if (!fs.existsSync(fullPath)) { console.warn('skip (not found):', f); continue; }
  const content = fs.readFileSync(fullPath, 'utf8');
  if (/^\/\/\s*@ts-check/m.test(content) || /\/\*\*?\s*@ts-check/m.test(content)) {
    skipped++;
    continue;
  }
  // 加在文件顶端
  const newContent = '// @ts-check\n/// <reference path="types.d.ts" />\n' + content;
  if (DRY) {
    console.log(`  [DRY] ${f}`);
  } else {
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`  [APPLY] ${f}`);
  }
  added++;
}

console.log(`\n${DRY?'[DRY]':'[APPLY]'} ${added} 个文件加 @ts-check · ${skipped} 个已有跳过`);
if (DRY && added > 0) console.log('运行 --apply 以实际改写');
