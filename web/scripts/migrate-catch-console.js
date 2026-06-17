#!/usr/bin/env node
// scripts/migrate-catch-console.js — 把 catch 里的 console.* 自动改为 TM.errors.capture
//
// 仅处理"类1"（纯 console·无其他动作）的 catch
// 模式：} catch (e) { console.warn('[label]', e); }
// 改为：} catch (e) { TM.errors && TM.errors.capture ? TM.errors.capture(e, 'label') : console.warn('[label]', e); }
//   既保留控制台可见性·又把错误送进 TM.errors 让玩家可导出
//   防御 TM.errors 未加载 (理论上不会·但 belt+suspenders)
//
// 用法：
//   node scripts/migrate-catch-console.js --dry-run [file1.js ...]   预览
//   node scripts/migrate-catch-console.js --apply [file1.js ...]     改写
//   不传文件则扫所有

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const DRY = !args.includes('--apply');
const targetFiles = args.filter(a => !a.startsWith('--'));
const SKIP_DIRS = new Set(['.bak-r103', '.bak-r106', '.git', 'node_modules', 'scripts', 'docs']);

function* walk(dir, ext) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(path.join(dir, e.name), ext);
    } else if (e.isFile() && ext.test(e.name)) yield path.join(dir, e.name);
  }
}

const files = targetFiles.length
  ? targetFiles.map(f => path.resolve(ROOT, f))
  : [...walk(ROOT, /\.js$/)];

let totalChanges = 0;
let filesChanged = 0;

for (const f of files) {
  if (!fs.existsSync(f)) { console.warn('skip (not found):', f); continue; }
  const before = fs.readFileSync(f, 'utf8');
  const lines = before.split('\n');
  let fileChanges = 0;
  const newLines = lines.map((line) => {
    // 严格匹配单行: } catch (var) { console.METHOD('[label]', var); }
    // 不处理多语句·只匹配 "console.X(...);" 单语句
    const re = /(\}\s*catch\s*\(\s*(\w+)\s*\)\s*\{\s*)console\.(warn|log|error|info)\(\s*('([^']*)'|"([^"]*)")\s*,\s*\2\s*\)\s*;?\s*\}/;
    const m = line.match(re);
    if (!m) return line;
    const varName = m[2];
    const label = m[5] || m[6] || 'unknown';
    // 标签清理：去掉 [] 装饰
    const cleanLabel = label.replace(/^\[/, '').replace(/\]$/, '');
    fileChanges++;
    return line.replace(re,
      `$1(window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(${varName}, '${cleanLabel}') : console.$3('${label}', ${varName}); }`
    );
  });
  if (fileChanges > 0) {
    filesChanged++;
    totalChanges += fileChanges;
    console.log(`  ${DRY?'[DRY]':'[APPLY]'} ${path.relative(ROOT, f)}: ${fileChanges} 处`);
    if (!DRY) fs.writeFileSync(f, newLines.join('\n'), 'utf8');
  }
}

console.log(`\n${DRY?'[DRY-RUN]':'[APPLIED]'} ${filesChanged} 个文件·共 ${totalChanges} 处`);
if (DRY && totalChanges > 0) console.log(`运行 --apply 以实际改写`);
