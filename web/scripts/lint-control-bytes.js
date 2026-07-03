#!/usr/bin/env node
// scripts/lint-control-bytes.js — 控制字符守卫（2026-07-04 架构清剿时新增）
//
// 背景：tm-utils.js / tm-ai-infra.js / tm-renwu-tuzhi.js 曾把字面控制字符（NUL/SOH 等）
// 写进字符串/正则字面量——功能正常，但文件从此被 grep 判成 binary，
// 一切文本搜索（人肉/agent/CI）静默漏掉它们。已全部转义为 \uXXXX（语义等价）。
// 本守卫保证不再有人把字面控制字节写回运行时代码。
//
// 规则：运行时代码文件内禁止出现 \t \n \r 之外的 C0 控制字节。零容忍，无基线。
// 用法：node scripts/lint-control-bytes.js

'use strict';

const lib = require('./lib-arch-guard');
const fs = require('fs');

const files = lib.runtimeCodeFiles();
const bad = [];
for (const f of files) {
  const b = fs.readFileSync(f.abs);
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (c < 9 || c === 11 || c === 12 || (c > 13 && c < 32)) {
      bad.push(`${f.src}: offset ${i} 字节 0x${c.toString(16).padStart(2, '0')}`);
      break; // 每文件报第一处即可
    }
  }
}

if (bad.length) {
  console.error(`[lint-control-bytes] FAIL — ${bad.length} 个文件含字面控制字节（会被 grep 判 binary·文本搜索静默失明）：`);
  bad.forEach(x => console.error('  ' + x));
  console.error('处置：把字面控制字符改写成 \\uXXXX 转义（字符串/正则内语义等价）。');
  process.exit(1);
}
console.log(`[lint-control-bytes] PASS — ${files.length} 个运行时文件无字面控制字节`);
process.exit(0);
