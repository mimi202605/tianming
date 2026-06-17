// N2a codemod — 编辑器 revealField/revealModule API（国师→折子字段/模块跳转）。
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

const FNS =
  "  // N2 · 国师→折子跳转：选中字段/模块并滚到折子对应行 + 金框高亮（扩 revealEntity 到字段/模块级）。\n" +
  "  function revealField(field) {\n" +
  "    if (!field || !state.scenario) return false;\n" +
  "    state.selectedModuleId = inferModuleForField(field);\n" +
  "    state.selectedField = field;\n" +
  "    if (!Array.isArray(state.scenario[field])) state.selectedEntityIndex = 0;\n" +
  "    renderAll();\n" +
  "    setTimeout(function () {\n" +
  "      try {\n" +
  "        var row = document.querySelector('.module-folio [data-folio-row=\"' + field + '\"]');\n" +
  "        if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.classList.add('folio-reveal-flash'); setTimeout(function () { row.classList.remove('folio-reveal-flash'); }, 1100); }\n" +
  "      } catch (e) {}\n" +
  "    }, 60);\n" +
  "    return true;\n" +
  "  }\n" +
  "  function revealModule(moduleId) {\n" +
  "    if (!moduleId) return false;\n" +
  "    var mod = findModule(moduleId);\n" +
  "    if (!mod) return false;\n" +
  "    state.selectedModuleId = moduleId;\n" +
  "    state.selectedField = (mod.topLevelKeys && mod.topLevelKeys[0]) || state.selectedField;\n" +
  "    renderAll();\n" +
  "    setTimeout(function () {\n" +
  "      try {\n" +
  "        var t = document.querySelector('#module-rail .module-tile[data-module-id=\"' + moduleId + '\"]') || document.getElementById('module-detail');\n" +
  "        if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' });\n" +
  "        var folio = document.querySelector('.module-folio'); if (folio) { folio.classList.add('folio-reveal-flash'); setTimeout(function () { folio.classList.remove('folio-reveal-flash'); }, 1100); }\n" +
  "      } catch (e) {}\n" +
  "    }, 60);\n" +
  "    return true;\n" +
  "  }\n\n";
once("  // Scenario provenance — derived from the bundled official scenarios so a", FNS + "  // Scenario provenance — derived from the bundled official scenarios so a", 'fns');

// export
once("    revealEntity: revealEntity,", "    revealEntity: revealEntity,\n    revealField: revealField,\n    revealModule: revealModule,", 'export');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
