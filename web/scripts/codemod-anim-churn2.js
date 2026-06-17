// perf round6 补刀: E3 幂等化·处理字符串拼接形态的三个安装器(+幂等可重跑)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const TARGETS = [
  ['phase8-formal-drafts.js', ['installDeskPanelExactStyles', 'installActionPanelExactStyles', 'installEdictYuanStyles', 'installMemorialYuanStyles', 'installHongyanYuanStyles']],
  ['phase8-formal-records.js', ['installShiguanYuanStyles']]
];

for (const [file, fns] of TARGETS) {
  const f = path.join(ROOT, file);
  let s = fs.readFileSync(f, 'utf8');
  for (const fn of fns) {
    const fnIdx = s.indexOf('function ' + fn + '(');
    if (fnIdx < 0) throw new Error('not found ' + fn);
    const probe = s.slice(fnIdx, fnIdx + 600);
    if (probe.includes('__tmCss') || s.slice(fnIdx, s.indexOf('st.textContent', fnIdx) + 50).includes('var __css')) {
      console.log('SKIP(already) ' + file + ' :: ' + fn);
      continue;
    }
    const assignIdx = s.indexOf('st.textContent = ', fnIdx);
    if (assignIdx < 0 || assignIdx - fnIdx > 4000) throw new Error('assignment not found in ' + fn);

    let endIdx = -1;
    // 形态A: 数组 ].join('\n');
    const joinRe = /\]\s*\.join\((?:'\\n'|''|"\\n"|"")\);/g;
    joinRe.lastIndex = assignIdx;
    const jm = joinRe.exec(s);
    // 形态B: 字符串拼接·按行扫·延续行以 + 开头
    let bEnd = -1;
    {
      let lineEnd = s.indexOf('\n', assignIdx);
      while (lineEnd > -1) {
        const nextLineEnd = s.indexOf('\n', lineEnd + 1);
        const nextLine = s.slice(lineEnd + 1, nextLineEnd > -1 ? nextLineEnd : s.length);
        if (/^\s*\+/.test(nextLine)) { lineEnd = nextLineEnd; continue; }
        break;
      }
      // 当前语句最后一行·应以 '; 或 ";  结尾
      const stmtTail = s.slice(assignIdx, lineEnd > -1 ? lineEnd : s.length).trimEnd();
      if (/['"]\s*;$/.test(stmtTail)) bEnd = assignIdx + s.slice(assignIdx, lineEnd).lastIndexOf(';') + 1;
    }
    if (jm && (bEnd === -1 || jm.index < bEnd) && jm.index - assignIdx < 60000) {
      endIdx = jm.index + jm[0].length;
    } else if (bEnd > -1) {
      endIdx = bEnd;
    } else {
      throw new Error('terminator not found for ' + fn);
    }
    const stmt = s.slice(assignIdx, endIdx);
    const newStmt = stmt.replace('st.textContent = ', 'var __css = ') +
      ' if (st.__tmCss !== __css) { st.__tmCss = __css; st.textContent = __css; }';
    s = s.slice(0, assignIdx) + newStmt + s.slice(endIdx);
    console.log('OK ' + file + ' :: ' + fn);
  }
  fs.writeFileSync(f, s);
}
console.log('WRITTEN');
