// M5 codemod — 折子内容预览 + 完成度头 + 必填/可选标记。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function replaceOnce(anchor, repl, tag) {
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + tag + ' matched ' + n + ' (need 1)');
  s = s.replace(anchor, repl);
  edits.push(tag);
}

// 0) helpers：插在 renderFolioRow 之前
const HELPERS_ANCHOR = '  function renderFolioRow(field) {';
const HELPERS = `  // M5 · 复杂字段内容预览：列表取前 3 条目名、对象取前 4 个键名，给折子摘要更多信息量。
  function folioComplexPreviewHtml(value, t) {
    var txt = '';
    if (t === 'array' && value.length) {
      var names = value.slice(0, 3).map(function (it, i) { return (it && typeof it === 'object') ? labelOf(it, i) : String(it); });
      txt = names.join('、') + (value.length > 3 ? ' …' : '');
    } else if (t === 'object' && value) {
      var keys = Object.keys(value);
      if (keys.length) txt = keys.slice(0, 4).join('、') + (keys.length > 4 ? ' …' : '');
    }
    return txt ? '<span class="folio-preview" title="' + escapeHtml(txt) + '">' + escapeHtml(txt) + '</span>' : '';
  }
  // M5 · 缺失字段是必填还是可选（按 RUNTIME_FIELD_SURFACES 的 required 面）。
  function isRequiredField(field) {
    return RUNTIME_FIELD_SURFACES.some(function (s) { return s.field === field && s.required; });
  }
  function folioMissingTag(field) {
    return isRequiredField(field)
      ? '<span class="folio-missing-tag" data-req="1">必填</span>'
      : '<span class="folio-missing-tag" data-opt="1">可选</span>';
  }

  function renderFolioRow(field) {`;
replaceOnce(HELPERS_ANCHOR, HELPERS, 'helpers');

// 1) M5c · 缺失行：缺 → 必填/可选
const MISS_ANCHOR = "        '<div class=\"folio-control\"><span class=\"folio-missing-tag\">缺</span>' +";
const MISS_NEW = "        '<div class=\"folio-control\">' + folioMissingTag(field) +";
replaceOnce(MISS_ANCHOR, MISS_NEW, 'missing-tag');

// 2) M5a · 复杂行摘要后追加内容预览
const PREV_ANCHOR = "        '<div class=\"folio-control\"><span class=\"folio-summary\">' + escapeHtml(t === 'array' ? '列表' : (t === 'object' ? '对象' : t)) + ' \\u00b7 ' + escapeHtml(summary) + '</span>' +";
const PREV_NEW = PREV_ANCHOR + " folioComplexPreviewHtml(value, t) +";
replaceOnce(PREV_ANCHOR, PREV_NEW, 'complex-preview');

// 3) M5b · 折子头完成度
const HEAD_ANCHOR = "    return '<div class=\"module-folio\"><h3 class=\"folio-head\">本章折子</h3>' +";
const HEAD_NEW =
  "    var folioAll = groups.reduce(function (a, g) { return a.concat(g.fields); }, []);\n" +
  "    var folioPresent = folioAll.filter(function (k) { return k in state.scenario; }).length;\n" +
  "    var folioMissing = folioAll.length - folioPresent;\n" +
  "    return '<div class=\"module-folio\"><h3 class=\"folio-head\">本章折子' +\n" +
  "      '<span class=\"folio-head-count\">已填 ' + folioPresent + ' / ' + folioAll.length + (folioMissing ? ' \\u00b7 缺 ' + folioMissing : '') + '</span></h3>' +";
replaceOnce(HEAD_ANCHOR, HEAD_NEW, 'head-count');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta bytes:', s.length - orig.length);
