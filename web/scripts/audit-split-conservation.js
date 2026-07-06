#!/usr/bin/env node
// scripts/audit-split-conservation.js — 拆分守恒终审审计器（2026-07-06 由终审会话工具转正入仓）
//
// 巨石拆分战役的「Fable 终审五项」核心工具：对一座已实施未落账的拆分做独立守恒审计。
// 不是守卫（不进 lint-arch-all）——是终审员的手术刀，按拆分逐座配置逐座跑。
//
// 五项中的四项由本工具覆盖：
//   ① 备份===HEAD 逐字节（防基座漂移/备份造假）
//   ② 插入式重组：origin = 备份−迁出段+纯插入脚手架；sibling = 迁出段+纯插入脚手架
//      （双指针 insert-only diff·支持多 sibling·每 sibling 多段 block·非注释插入行逐行吐出供人工过目）
//   ③ 符号守恒：拆前顶层定义名集 ⊆ 拆后各片联集（列0 与 2 空格 IIFE 内两种缩进都认）
//   ④ CJK 守恒：拆前后 CJK 总数差 === 全部插入行的 CJK（防中文被翻译/丢失）
// 第五项（基线按族守恒 gm-writes/file-size）走各守卫自身，不在此。
//
// 用法：node scripts/audit-split-conservation.js <config.json>
// config 形如：
//   { "wt":   "<worktree 绝对路径或仓根>",
//     "origin": "web/tm-xxx.js",
//     "backup": "web/backups/YYYYMMDD/tm-xxx.js.pre-split",
//     "siblings": [ { "file": "web/tm-xxx-part.js", "blockStart": 100, "blockEnd": 900 },
//                   { "file": "web/tm-xxx-p2.js",   "blocks": [[100,400],[700,900]] } ] }
// 行号 1-based 闭区间；blockStart/blockEnd 与 blocks 二选一。
// 退出码：0=四项全 PASS（插入行仍须人工过目）·1=任一 FAIL。
'use strict';
const fs = require('fs');
const cp = require('child_process');
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const read = p => fs.readFileSync(cfg.wt + '/' + p, 'utf8');
const cjk = s => (s.match(/[㐀-鿿豈-﫿]/g) || []).length;
let failed = 0;
const verdict = (name, ok, extra) => { console.log(name + ':', ok ? 'PASS' : 'FAIL', extra || ''); if (!ok) failed++; };

const backup = read(cfg.backup);
const origin = read(cfg.origin);
const headBlob = cp.execSync('git -C "' + cfg.wt + '" show HEAD:' + cfg.origin, { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
verdict('① backup===HEAD', backup === headBlob);

const bL = backup.split('\n');
for (const s of cfg.siblings) if (!s.blocks) s.blocks = [[s.blockStart, s.blockEnd]];

// 双指针插入式 diff：target 必须=source 全序列+仅插入行
function insertOnlyDiff(sourceLines, targetLines) {
  let i = 0, j = 0; const inserted = [];
  while (i < sourceLines.length && j < targetLines.length) {
    if (sourceLines[i] === targetLines[j]) { i++; j++; }
    else { inserted.push({ at: j + 1, line: targetLines[j] }); j++; }
  }
  while (j < targetLines.length) { inserted.push({ at: j + 1, line: targetLines[j] }); j++; }
  return { ok: i === sourceLines.length, sourceLeft: sourceLines.length - i, inserted };
}
const isCommentish = l => /^\s*(\/\/|\/\*|\*|$)/.test(l);
function reportInserted(tag, ins) {
  const code = ins.filter(x => !isCommentish(x.line));
  console.log('   非注释插入行(脚手架代码·逐行过目):', code.length);
  code.forEach(x => console.log('   ' + tag + '+' + x.at + '|', x.line.slice(0, 130)));
  return ins.reduce((a, x) => a + cjk(x.line), 0);
}

// ② origin
let removed = new Set();
for (const s of cfg.siblings) for (const [bs, be] of s.blocks) for (let k = bs - 1; k <= be - 1; k++) removed.add(k);
const bMinus = bL.filter((_, idx) => !removed.has(idx));
const oDiff = insertOnlyDiff(bMinus, origin.split('\n'));
verdict('② origin=备份−迁出段+纯插入', oDiff.ok, oDiff.ok ? '| 插入' + oDiff.inserted.length + '行' : '| 源剩' + oDiff.sourceLeft + '行未匹配');
let insertedCjk = reportInserted('O', oDiff.inserted);
let sibCjkTotal = 0;
for (const s of cfg.siblings) {
  const block = s.blocks.flatMap(([bs, be]) => bL.slice(bs - 1, be));
  const sibSrc = read(s.file);
  sibCjkTotal += cjk(sibSrc);
  const sDiff = insertOnlyDiff(block, sibSrc.split('\n'));
  const range = s.blocks.map(([bs, be]) => 'L' + bs + '-' + be).join('+');
  verdict('② ' + s.file + '=迁出段' + range + '+纯插入', sDiff.ok, sDiff.ok ? '| 插入' + sDiff.inserted.length + '行' : '| 块剩' + sDiff.sourceLeft + '行未匹配');
  insertedCjk += reportInserted('S', sDiff.inserted);
}

// ③ 符号守恒
const defs = src => {
  const set = new Set();
  for (const m of src.matchAll(/^(?:  )?(?:async )?function\s+([A-Za-z_$][\w$]*)/gm)) set.add(m[1]);
  for (const m of src.matchAll(/^(?:  )?(?:var|let|const)\s+([A-Za-z_$][\w$]*)/gm)) set.add(m[1]);
  return set;
};
const before = defs(backup);
const union = new Set([defs(origin), ...cfg.siblings.map(s => defs(read(s.file)))].flatMap(x => [...x]));
const missing = [...before].filter(x => !union.has(x));
const added = [...union].filter(x => !before.has(x));
verdict('③ 符号守恒', missing.length === 0, '| 拆前' + before.size + '→联集' + union.size + ' | 缺失:' + (missing.join(',') || '0') + ' | 新增:' + (added.join(',') || '0'));

// ④ CJK 守恒
const diffCjk = cjk(origin) + sibCjkTotal - cjk(backup);
verdict('④ CJK守恒', diffCjk === insertedCjk, '| 拆前' + cjk(backup) + '→拆后' + (cjk(origin) + sibCjkTotal) + ' 差' + diffCjk + ' vs 插入行CJK' + insertedCjk);

process.exit(failed ? 1 : 0);
