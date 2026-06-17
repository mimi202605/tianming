// P1 codemod — app.js healthCheck() 聚合体检 + export。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

const HC =
  "  // P1 · 国师主动体检：聚合必填缺失 / 断裂引用 / 人物数值异常，供编辑器主动横幅与国师修复用。\n" +
  "  function healthCheck() {\n" +
  "    var sc = state.scenario || {};\n" +
  "    var cats = [];\n" +
  "    var reqMiss = [], seenF = {};\n" +
  "    (state.modules || []).forEach(function (m) {\n" +
  "      RUNTIME_FIELD_SURFACES.forEach(function (rs) {\n" +
  "        if (rs.moduleId === m.id && rs.required && rs.field && !(rs.field in sc) && !seenF[rs.field]) {\n" +
  "          seenF[rs.field] = 1;\n" +
  "          reqMiss.push({ label: (rs.title || rs.field) + '\\uFF08' + rs.field + '\\uFF09', jumpField: rs.field });\n" +
  "        }\n" +
  "      });\n" +
  "    });\n" +
  "    if (reqMiss.length) cats.push({ key: 'required', label: '\\u5fc5\\u586b\\u5b57\\u6bb5\\u7f3a\\u5931', items: reqMiss });\n" +
  "    var refs = [];\n" +
  "    try { refs = collectMissingReferences() || []; } catch (e) {}\n" +
  "    if (refs.length) cats.push({ key: 'refs', label: '\\u65ad\\u88c2\\u5f15\\u7528', items: refs.slice(0, 60).map(function (r) {\n" +
  "      return { label: (r.kind === 'faction' ? '\\u52bf\\u529b' : '\\u4eba\\u7269') + '\\u300c' + r.ref + '\\u300d\\u88ab\\u5f15\\u7528\\u4f46\\u672a\\u5b9a\\u4e49', refKind: r.kind, refName: r.ref };\n" +
  "    }) });\n" +
  "    var STATS = ['intelligence', 'valor', 'military', 'administration', 'charisma', 'diplomacy', 'benevolence', 'integrity'];\n" +
  "    var anomalies = [];\n" +
  "    if (Array.isArray(sc.characters)) sc.characters.forEach(function (c, i) {\n" +
  "      if (!c || typeof c !== 'object') return;\n" +
  "      var nm = c.name || c.id || ('#' + (i + 1));\n" +
  "      var vals = [];\n" +
  "      STATS.forEach(function (k) { if (typeof c[k] === 'number') vals.push(c[k]); });\n" +
  "      if (vals.length === 0) { anomalies.push({ label: '\\u300c' + nm + '\\u300d\\u65e0\\u80fd\\u529b\\u503c', refKind: 'character', refName: nm }); return; }\n" +
  "      if (vals.some(function (v) { return v < 0 || v > 100; })) { anomalies.push({ label: '\\u300c' + nm + '\\u300d\\u80fd\\u529b\\u503c\\u8d8a\\u754c(<0\\u6216>100)', refKind: 'character', refName: nm }); return; }\n" +
  "      if (vals.length >= 4 && vals.every(function (v) { return v === vals[0]; })) { anomalies.push({ label: '\\u300c' + nm + '\\u300d\\u80fd\\u529b\\u503c\\u5168\\u540c ' + vals[0] + '\\uFF08\\u7591\\u5360\\u4f4d\\uFF09', refKind: 'character', refName: nm }); }\n" +
  "    });\n" +
  "    if (anomalies.length) cats.push({ key: 'stats', label: '\\u4eba\\u7269\\u6570\\u503c\\u5f02\\u5e38', items: anomalies.slice(0, 60) });\n" +
  "    var total = cats.reduce(function (n, c) { return n + c.items.length; }, 0);\n" +
  "    return { total: total, categories: cats };\n" +
  "  }\n\n";
once("  // Scenario provenance — derived from the bundled official scenarios so a", HC + "  // Scenario provenance — derived from the bundled official scenarios so a", 'fn');
once("    markAgentTouched: markAgentTouched,", "    markAgentTouched: markAgentTouched,\n    healthCheck: healthCheck,", 'export');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
