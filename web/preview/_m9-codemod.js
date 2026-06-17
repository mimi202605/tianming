// M9 codemod — moduleFieldsForDetail 并入本模块 RUNTIME_FIELD_SURFACES 字段，
// 让游戏真读但剧本缺席的字段也在折子显"缺/可选/必填"行（折子成完整创作面）。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;

const ANCHOR =
  "  function moduleFieldsForDetail(module) {\n" +
  "    var fields = (module && module.topLevelKeys ? module.topLevelKeys : Object.keys(state.scenario || {})).slice();\n" +
  "    if (state.selectedField && fields.indexOf(state.selectedField) < 0) fields.unshift(state.selectedField);\n" +
  "    return fields;\n" +
  "  }";

const NEW =
  "  function moduleFieldsForDetail(module) {\n" +
  "    var fields = (module && module.topLevelKeys ? module.topLevelKeys : Object.keys(state.scenario || {})).slice();\n" +
  "    // 折子缺口修复(M9)：把本模块「游戏真读」的字段(RUNTIME_FIELD_SURFACES)并进来——\n" +
  "    // 即便剧本缺这些字段、蓝图 topLevelKeys 也没收，折子也给一行缺/可选/必填入口，成完整创作面。\n" +
  "    if (module && module.id) {\n" +
  "      RUNTIME_FIELD_SURFACES.forEach(function (s) {\n" +
  "        if (s.moduleId === module.id && s.field && fields.indexOf(s.field) < 0) fields.push(s.field);\n" +
  "      });\n" +
  "    }\n" +
  "    if (state.selectedField && fields.indexOf(state.selectedField) < 0) fields.unshift(state.selectedField);\n" +
  "    return fields;\n" +
  "  }";

const n = s.split(ANCHOR).length - 1;
if (n !== 1) throw new Error('ANCHOR matched ' + n + ' (need 1)');
s = s.replace(ANCHOR, NEW);
fs.writeFileSync(path, s, 'utf8');
console.log('OK | delta bytes:', s.length - orig.length);
