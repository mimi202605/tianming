// perf round6 补刀v3(修正版·实际生效版): 字符串拼接形态安装器幂等化
// ⚠️ 历史教训: 初版用 /['"]\s*;/ 当终点·被 css 里 content:"" 的「双引号+分号」
// 截在字符串中间(语法碰巧合法·node --check 拦不住)·已回滚重做。
// 终点必须只认「单引号紧跟分号」·并断言语句长度>3000 防截断。
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const TARGETS = [
  ['phase8-formal-drafts.js', ['installEdictYuanStyles', 'installMemorialYuanStyles', 'installHongyanYuanStyles']],
  ['phase8-formal-records.js', ['installShiguanYuanStyles']]
];

for (const [file, fns] of TARGETS) {
  const f = path.join(ROOT, file);
  let s = fs.readFileSync(f, 'utf8');
  for (const fn of fns) {
    const fnIdx = s.indexOf('function ' + fn + '(');
    if (fnIdx < 0) throw new Error('not found ' + fn);
    if (s.slice(fnIdx, fnIdx + 700).includes('__tmCss')) { console.log('SKIP(already) ' + fn); continue; }
    const assignIdx = s.indexOf('st.textContent = ', fnIdx);
    if (assignIdx < 0 || assignIdx - fnIdx > 4000) throw new Error('assign not found ' + fn);
    const m = /'\s*;/.exec(s.slice(assignIdx));
    if (!m) throw new Error('terminator not found ' + fn);
    const endIdx = assignIdx + m.index + m[0].length;
    const stmt = s.slice(assignIdx, endIdx);
    if (stmt.length < 3000) throw new Error('SUSPICIOUS short stmt ' + fn + ' len=' + stmt.length);
    if (!/'\s*;$/.test(stmt)) throw new Error('stmt does not end with quote-semicolon ' + fn);
    const newStmt = stmt.replace('st.textContent = ', 'var __css = ') +
      ' if (st.__tmCss !== __css) { st.__tmCss = __css; st.textContent = __css; }';
    s = s.slice(0, assignIdx) + newStmt + s.slice(endIdx);
    console.log('OK ' + file + ' :: ' + fn + ' (stmt ' + stmt.length + ' chars)');
  }
  fs.writeFileSync(f, s);
}
console.log('WRITTEN');
