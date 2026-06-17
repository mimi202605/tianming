// M1 codemod — 折子表单主面。node 字面量含 CJK，规避 Edit 转义坑。每处校验命中次数。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function replaceOnce(anchor, repl, tag) {
  const n = s.split(anchor).length - 1;
  if (n !== 1) { throw new Error('ANCHOR ' + tag + ' matched ' + n + ' times (need 1)'); }
  s = s.replace(anchor, repl);
  edits.push(tag + ' ok');
}

// 1) 折子 helpers：插在 renderDetailApp 之前
const HELPERS = `  // M1 · 折子表单（中列主编辑面）：把字段组渲染成"标签 + 当前值 + 输入"的折子行。
  // 标量（string/number/boolean）就地编辑；复杂字段（object/array）显摘要 + 展开（点
  // data-field-pick 复用现成专门 workbench）。标签取 describeField 首段，退回字段 key。
  function folioFieldLabel(field) {
    var d = describeField(field);
    if (!d) return field;
    var head = d.split(/[\\u00b7\\uff08(]/)[0].trim();
    return head || field;
  }

  function renderFolioRow(field) {
    var exists = Object.prototype.hasOwnProperty.call(state.scenario || {}, field);
    var label = folioFieldLabel(field);
    var aiBtn = '<span class="folio-ai mini-ai" data-field-ai="' + escapeHtml(field) + '" data-ai-action="fill-field" title="让国师补这个字段">AI</span>';
    var head = '<div class="folio-row-head"><label class="folio-label" for="folio-' + escapeHtml(field) + '">' + escapeHtml(label) + '</label>' +
      provenanceBadgeHtml(field) + '<span class="folio-key">' + escapeHtml(field) + '</span></div>';
    if (!exists) {
      return '<div class="folio-row" data-folio-row="' + escapeHtml(field) + '" data-folio-missing="1">' + head +
        '<div class="folio-control"><span class="folio-missing-tag">缺</span>' +
        '<button class="folio-expand mini-ai" data-field-pick="' + escapeHtml(field) + '">展开补全 \\u203a</button>' + aiBtn + '</div></div>';
    }
    var value = state.scenario[field];
    var t = fieldType(value);
    var control;
    if (t === 'boolean') {
      control = '<select class="folio-input" data-folio-field="' + escapeHtml(field) + '">' +
        '<option value="true"' + (value ? ' selected' : '') + '>是 \\u00b7 true</option>' +
        '<option value="false"' + (!value ? ' selected' : '') + '>否 \\u00b7 false</option></select>';
    } else if (t === 'number') {
      control = '<input class="folio-input" type="number" id="folio-' + escapeHtml(field) + '" data-folio-field="' + escapeHtml(field) + '" value="' + escapeHtml(String(value)) + '">';
    } else if (t === 'string') {
      var multiline = value.length > 56 || value.indexOf('\\n') >= 0;
      control = multiline
        ? '<textarea class="folio-input folio-textarea" id="folio-' + escapeHtml(field) + '" data-folio-field="' + escapeHtml(field) + '" rows="3" spellcheck="false">' + escapeHtml(value) + '</textarea>'
        : '<input class="folio-input" type="text" id="folio-' + escapeHtml(field) + '" data-folio-field="' + escapeHtml(field) + '" value="' + escapeHtml(value) + '">';
    } else {
      var summary = t === 'array' ? value.length + ' 条' : (t === 'object' ? Object.keys(value).length + ' 项' : '空值');
      var openNow = field === state.selectedField ? ' data-folio-open="1"' : '';
      return '<div class="folio-row folio-row-complex" data-folio-row="' + escapeHtml(field) + '"' + openNow + '>' + head +
        '<div class="folio-control"><span class="folio-summary">' + escapeHtml(t === 'array' ? '列表' : (t === 'object' ? '对象' : t)) + ' \\u00b7 ' + escapeHtml(summary) + '</span>' +
        '<button class="folio-expand mini-ai" data-field-pick="' + escapeHtml(field) + '">展开编辑 \\u203a</button>' + aiBtn + '</div></div>';
    }
    return '<div class="folio-row" data-folio-row="' + escapeHtml(field) + '">' + head +
      '<div class="folio-control">' + control + aiBtn + '</div></div>';
  }

  function renderModuleFolio(visibleFields) {
    if (!visibleFields || !visibleFields.length) return '';
    var groups = groupFieldsForModule(state.selectedModuleId, visibleFields);
    if (!groups.length) return '';
    return '<div class="module-folio"><h3 class="folio-head">本章折子</h3>' +
      groups.map(function (group) {
        return '<section class="folio-group">' +
          '<header class="folio-group-head">' + escapeHtml(group.title) +
          '<span class="folio-group-count">' + group.fields.length + '</span></header>' +
          '<div class="folio-rows">' + group.fields.map(renderFolioRow).join('') + '</div>' +
        '</section>';
      }).join('') +
    '</div>';
  }

  function renderDetailApp() {`;
replaceOnce('  function renderDetailApp() {', HELPERS, 'helpers');

// 2) 折子 + 字段索引(details)开标签：插在「字段表」detail-block 之前
const FIELDTABLE_OPEN = "      '<div class=\"detail-block\"><h3>字段表</h3>',";
const FIELDTABLE_OPEN_NEW = "      renderModuleFolio(visibleFields),\n" +
  "      '<details class=\"field-index\"><summary class=\"field-index-summary\">字段索引 \\u00b7 筛选 / 多选 / 关注 / 全部字段</summary>',\n" +
  "      '<div class=\"detail-block\"><h3>字段表</h3>',";
replaceOnce(FIELDTABLE_OPEN, FIELDTABLE_OPEN_NEW, 'folio-insert');

// 3) 字段索引 details 闭标签：在 renderWorkbenchTabs 前那处 </div></div> 追 </details>
const CLOSE_ANCHOR = "      '</div></div>',\n      renderWorkbenchTabs(),";
const CLOSE_NEW = "      '</div></div></details>',\n      renderWorkbenchTabs(),";
replaceOnce(CLOSE_ANCHOR, CLOSE_NEW, 'field-index-close');

// 4) saveFolioField：插在 saveSelectedField 之后
const SAVE_SEL = "  function saveSelectedField() {\n" +
  "    if (!state.selectedField) return;\n" +
  "    var textarea = document.getElementById('field-editor-value');\n" +
  "    if (!textarea) return;\n" +
  "    var oldValue = state.scenario[state.selectedField];\n" +
  "    saveField(state.selectedField, parseEditable(textarea.value, oldValue));\n" +
  "  }";
const SAVE_FOLIO = SAVE_SEL + `

  // M1 · 折子就地保存：blur/change 时轻量落盘——写 state + 记 undo + 刷新完成度 tile +
  // 行内 \\u2713，绝不 renderAll（否则全量重渲会吃掉用户落到下一个输入框的点击）。
  function saveFolioField(field, rawValue, inputEl) {
    if (!field || !(field in state.scenario)) return;
    var oldValue = state.scenario[field];
    var next = parseEditable(rawValue, oldValue);
    if (stableString(next) === stableString(oldValue)) return;
    state.scenario[field] = next;
    state.selectedField = field;
    recordHistory('字段保存', field);
    renderModuleTiles();
    if (inputEl && inputEl.closest) {
      var row = inputEl.closest('.folio-row');
      if (row) row.setAttribute('data-folio-saved', '1');
    }
    setStatus('已保存字段：' + field, 'good');
  }`;
replaceOnce(SAVE_SEL, SAVE_FOLIO, 'saveFolioField');

// 5) change 委托加 folio 分支（首分支）
const CHANGE_OPEN = "    document.addEventListener('change', function(event) {\n";
const CHANGE_NEW = CHANGE_OPEN +
  "      if (event.target && event.target.dataset && event.target.dataset.folioField) {\n" +
  "        saveFolioField(event.target.dataset.folioField, event.target.value, event.target);\n" +
  "      }\n";
replaceOnce(CHANGE_OPEN, CHANGE_NEW, 'change-branch');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta bytes:', s.length - orig.length);
