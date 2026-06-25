'use strict';
// verify-recordspecs-byte-identical.js (DA-Q2)
//   证:sc1 record 7 字段·"原内联表达式输出" === "recordSpecs 片段包 wrapper 后输出"·多组字数。
//   原内联表达式从 .bak 程序化提取后 eval(独立于手写 recordSpecs)→ 任何转写漂移必被抓。
//   通过即证:把 ai.js sc1 内联换成 recordSpecs(ctx).xxx 是字节级不变的安全替换。
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'tm-endturn-record-specs.js'));
const recordSpecs = globalThis.TM.Endturn.AI.prompt.recordSpecs;

const BAK = path.join(ROOT, 'tm-endturn-ai.js.bak-pre-20260621-daq2');
const bak = fs.readFileSync(BAK, 'utf8');

// 从 .bak 提取 sc1 的 7 字段内联块(turn_summary..player_inner·至 personnel_changes 前)
const startMark = '"{\\"turn_summary\\"';
const endMark = '"\\"personnel_changes\\"';
const si = bak.indexOf(startMark);
const ei = bak.indexOf(endMark, si);
if (si < 0 || ei < 0) { console.error('[FAIL] 无法在 .bak 定位 sc1 字段块 si=' + si + ' ei=' + ei); process.exit(1); }
const oldBlockSrc = bak.slice(si, ei);   // 含注释+尾随 + ·eval 时补 "" 收尾

let passed = 0;
function eq(a, b, label) {
  if (a === b) { passed++; return; }
  // 首个差异位置
  let i = 0; const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i++;
  console.error('[FAIL] ' + label + ' 不一致 @' + i + ' len(old)=' + a.length + ' len(new)=' + b.length);
  console.error('  old…' + JSON.stringify(a.slice(Math.max(0, i - 20), i + 20)));
  console.error('  new…' + JSON.stringify(b.slice(Math.max(0, i - 20), i + 20)));
  process.exit(1);
}

// 新块:wrapper + recordSpecs 片段(与 ai.js 将改成的形态一致·不含注释·注释不影响运行时字符串)
function newBlock(rs) {
  return "{\"turn_summary\":\"" + rs.turnSummary + "\"," +
    "\"shilu_text\":\"" + rs.shilu + "\"," +
    "\"szj_title\":\"" + rs.szjTitle + "\"," +
    "\"shizhengji\":\"" + rs.shizhengji + "\"," +
    "\"szj_summary\":\"" + rs.szjSummary + "\"," +
    "\"player_status\":\"" + rs.playerStatus + "\",\"player_inner\":\"" + rs.playerInner + "\",";
}

// shilu 于 2026-06-22 有意改进为更地道文言实录体(owner 要求)·不再与原 sc1 字节相同·
//   对拍策略改:6 个稳定字段仍字节级对拍(strip 掉 shilu_text)·shilu 单独验字数范围 + canonical 实录特征。
function stripShilu(s) { return String(s).replace(/("shilu_text":")[\s\S]*?(","szj_title":)/, '$1<SHILU>$2'); }
const combos = [
  [120, 200, 200, 400], [300, 500, 400, 700], [50, 80, 100, 150], [180, 260, 320, 560]
];
combos.forEach(function (c) {
  const _shiluMin = c[0], _shiluMax = c[1], _szjMin = c[2], _szjMax = c[3];
  // eval 原内联块(补 "" 收尾·吃掉尾随的 + 与注释)
  let oldStr;
  try {
    // eslint-disable-next-line no-eval
    oldStr = eval('(' + oldBlockSrc + '"")');
  } catch (e) { console.error('[FAIL] eval 原内联块失败:', e.message); process.exit(1); }
  const rs = recordSpecs({ prompt: { _shiluMin: _shiluMin, _shiluMax: _shiluMax, _szjMin: _szjMin, _szjMax: _szjMax, _hourenMin: 200, _hourenMax: 400 } });
  const newStr = newBlock(rs);
  eq(stripShilu(oldStr), stripShilu(newStr), '字数组合(除 shilu·6 稳定字段)' + JSON.stringify(c));
  // shilu 单独:字数范围 + canonical 实录特征(干支/记事不评论/实录体)
  if (!(new RegExp('实录' + _shiluMin + '-' + _shiluMax + '字')).test(rs.shilu) || !/干支/.test(rs.shilu) || !/记事不评论/.test(rs.shilu) || !/实录体/.test(rs.shilu)) {
    console.error('[FAIL] shilu 缺字数范围或 canonical 实录特征 @' + JSON.stringify(c)); process.exit(1);
  }
  passed++;
});

// 额外:确认 ctx.prompt 缺失时回落默认仍可用(agent 无 ctx.prompt 路径不崩)
const rsFallback = recordSpecs({});
if (!rsFallback || !rsFallback.shilu || !rsFallback.shizhengji) { console.error('[FAIL] 无 ctx.prompt 回落失败'); process.exit(1); }
passed++;

// ── DA-Q2b·houren:从 .bak followup 提取 sc2 静态块 eval·对拍 hourenSpec ──
const hourenSpec = globalThis.TM.Endturn.AI.prompt.hourenSpec;
const BAK_FU = path.join(ROOT, 'tm-endturn-followup.js.bak-pre-20260621-daq2b');
const fuBak = fs.readFileSync(BAK_FU, 'utf8');
const hsStart = fuBak.indexOf('"\\n基于上述全部资料');
const hsEnd = fuBak.indexOf(']}";', hsStart);
if (hsStart < 0 || hsEnd < 0) { console.error('[FAIL] 无法在 followup .bak 定位 sc2 houren 静态块 s=' + hsStart + ' e=' + hsEnd); process.exit(1); }
const hourenBlockSrc = fuBak.slice(hsStart, hsEnd + 3);  // 含闭合 ]}"·不含 ;
[[200, 400], [120, 260], [333, 666]].forEach(function (c) {
  const _hourenMin = c[0], _hourenMax = c[1];
  let oldHo;
  try { oldHo = eval('(' + hourenBlockSrc + ')'); } catch (e) { console.error('[FAIL] eval sc2 houren 块失败:', e.message); process.exit(1); }
  const newHo = hourenSpec({ prompt: { _hourenMin: _hourenMin, _hourenMax: _hourenMax } });
  eq(oldHo, newHo, 'houren 字数组合 ' + JSON.stringify(c));
});

console.log('[verify-recordspecs-byte-identical] pass assertions=' + passed + ' (combos=' + combos.length + ' +fallback +houren×3)');
