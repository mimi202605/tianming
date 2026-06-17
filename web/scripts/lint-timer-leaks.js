#!/usr/bin/env node
// scripts/lint-timer-leaks.js — 审计 setInterval 是否有 clearInterval 配对
//
// 三类风险：
//   类1 (LEAK)  : setInterval(...) 无返回值赋值·结果丢弃·无法 clearInterval
//   类2 (CHECK) : var x = setInterval(...) 但全代码库无 clearInterval(x)
//   类3 (OK)   : 有 clearInterval 配对·或挂到 window/全局允许外部 clear
//
// setTimeout 不审计·一次性·不会无限叠加
//
// 用法：node scripts/lint-timer-leaks.js

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !SKIP.has(e.name)) yield* walk(path.join(dir, e.name));
    else if (e.isFile() && e.name.endsWith('.js')) yield path.join(dir, e.name);
  }
}

const allFiles = [...walk(ROOT)];

// 第一步：收集所有 setInterval 调用·分类 (是否赋给变量)
const intervals = [];
for (const f of allFiles) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/setInterval\s*\(/.test(line)) continue;
    if (/^\s*\/\//.test(line)) continue;
    if (/clearInterval/.test(line)) continue; // 注释掉/拼写
    // 当前行或前 2 行有 timer-leak-ok 标注·跳过 (一次性 / 受保护)
    let opted = false;
    for (let j = Math.max(0, i - 2); j <= i; j++) {
      if (/timer-leak-ok/.test(lines[j])) { opted = true; break; }
    }
    if (opted) continue;
    // 是否赋值
    // 形式 1: var/let/const X = setInterval(...)
    // 形式 2: X = setInterval(...)  (X 是已声明的变量)
    // 形式 3: setInterval(fn,ms)  (无赋值·结果丢弃)
    const m = line.match(/(?:var\s+|let\s+|const\s+|window\.|TM\.|self\.|this\.|[A-Za-z_$][\w$]*\.)?([A-Za-z_$][\w$]*)\s*=\s*setInterval\s*\(/);
    intervals.push({
      file: path.relative(ROOT, f).replace(/\\/g, '/'),
      line: i + 1,
      varName: m ? m[1] : null,
      raw: line.trim().slice(0, 120)
    });
  }
}

// 第二步：对每个有变量名的 setInterval·全代码库搜 clearInterval(varName)
const allCode = allFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

let leak1 = 0, leak2 = 0, ok = 0;
const samples = { leak1: [], leak2: [], ok: [] };

for (const iv of intervals) {
  if (!iv.varName) {
    leak1++;
    if (samples.leak1.length < 10) samples.leak1.push(iv);
  } else {
    // 搜 clearInterval(varName)
    const re = new RegExp('clearInterval\\s*\\(\\s*' + iv.varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (re.test(allCode)) {
      ok++;
      if (samples.ok.length < 5) samples.ok.push(iv);
    } else {
      leak2++;
      if (samples.leak2.length < 10) samples.leak2.push(iv);
    }
  }
}

console.log('[lint-timer-leaks] setInterval 调用统计：');
console.log('  类1·无赋值·无法 clear:', leak1);
console.log('  类2·有赋值·全库无 clearInterval(name):', leak2);
console.log('  类3·有 clearInterval 配对:', ok);
console.log('  总计:', intervals.length);
console.log('');
if (samples.leak1.length) {
  console.log('类1 (无法 clear) 样本前 10：');
  samples.leak1.forEach(s => console.log('  ' + s.file + ':' + s.line + '  ' + s.raw));
}
if (samples.leak2.length) {
  console.log('\n类2 (有名但无 clear) 样本前 10：');
  samples.leak2.forEach(s => console.log('  ' + s.file + ':' + s.line + '  var ' + s.varName));
}
