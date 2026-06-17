// M6 codemod — 深度工作台包进 <details class=deep-bench>，复杂/缺失字段选中时自动 open。
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

// 1) 在 renderWorkbenchTabs() 前插 deep-bench 开标签（复杂/缺失字段→open）
const OPEN_ANCHOR = "      renderWorkbenchTabs(),";
const OPEN_NEW =
  "      '<details class=\"deep-bench\"' + ((!(state.selectedField in state.scenario) || isObject(value) || Array.isArray(value)) ? ' open' : '') + '><summary class=\"deep-bench-head\">深度编辑台 \\u00b7 ' + escapeHtml(folioFieldLabel(state.selectedField || '')) + '</summary>',\n" +
  "      renderWorkbenchTabs(),";
replaceOnce(OPEN_ANCHOR, OPEN_NEW, 'deep-open');

// 2) 在 history-log 面板后插 deep-bench 闭标签
const CLOSE_ANCHOR = "      }).join('') || '<p>暂无修改记录。</p>') + '</div>')\n    ].join('');";
const CLOSE_NEW = "      }).join('') || '<p>暂无修改记录。</p>') + '</div>'),\n      '</details>'\n    ].join('');";
replaceOnce(CLOSE_ANCHOR, CLOSE_NEW, 'deep-close');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta bytes:', s.length - orig.length);
