// N4 codemod — 国师改动在折子高亮回显（app.js: markAgentTouched + renderFolioRow 类）。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(anchor, repl, tag) {
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + tag + ' x' + n);
  s = s.replace(anchor, repl); edits.push(tag);
}

// 1) markAgentTouched 函数（插在 revealModule 后 / provenance 注释前——复用 N2a 锚点已被占，改插在 revealField 定义后）
once("  function revealModule(moduleId) {",
  "  // N4 · 国师改动在折子高亮回显：标记被改顶层字段，渲染时折子对应行脉冲高亮，几秒后清。\n" +
  "  function markAgentTouched(fields) {\n" +
  "    if (!Array.isArray(fields) || !fields.length) return;\n" +
  "    state._agentTouched = {};\n" +
  "    fields.forEach(function (f) { if (f) state._agentTouched[f] = 1; });\n" +
  "    renderAll();\n" +
  "    if (state._agentTouchedTimer) clearTimeout(state._agentTouchedTimer);\n" +
  "    state._agentTouchedTimer = setTimeout(function () {\n" +
  "      state._agentTouched = null;\n" +
  "      try { Array.prototype.forEach.call(document.querySelectorAll('.folio-row.folio-agent-touched'), function (r) { r.classList.remove('folio-agent-touched'); }); } catch (e) {}\n" +
  "    }, 4200);\n" +
  "  }\n" +
  "  function revealModule(moduleId) {", 'fn');

// 2) export
once("    revealField: revealField,",
  "    revealField: revealField,\n    markAgentTouched: markAgentTouched,", 'export');

// 3) renderFolioRow touchedCls
once("    var exists = Object.prototype.hasOwnProperty.call(state.scenario || {}, field);",
  "    var exists = Object.prototype.hasOwnProperty.call(state.scenario || {}, field);\n" +
  "    var touchedCls = (state._agentTouched && state._agentTouched[field]) ? ' folio-agent-touched' : '';", 'var');

// 4) 三处行 class 注入
once("      return '<div class=\"folio-row\" data-folio-row=\"' + escapeHtml(field) + '\" data-folio-missing=\"1\">' + head +",
  "      return '<div class=\"folio-row' + touchedCls + '\" data-folio-row=\"' + escapeHtml(field) + '\" data-folio-missing=\"1\">' + head +", 'r-missing');

once("      return '<div class=\"folio-row folio-row-complex\" data-folio-row=\"' + escapeHtml(field) + '\"' + openNow + '>' + head +",
  "      return '<div class=\"folio-row folio-row-complex' + touchedCls + '\" data-folio-row=\"' + escapeHtml(field) + '\"' + openNow + '>' + head +", 'r-complex');

once("    return '<div class=\"' + rowCls + '\" data-folio-row=\"' + escapeHtml(field) + '\">' + head +",
  "    return '<div class=\"' + rowCls + touchedCls + '\" data-folio-row=\"' + escapeHtml(field) + '\">' + head +", 'r-scalar');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
