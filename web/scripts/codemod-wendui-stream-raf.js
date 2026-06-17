#!/usr/bin/env node
// 一次性 codemod:sendWendui 流式 onChunk 改 rAF 合帧(行级替换·绕 Edit 工具混合转义匹配陷阱)
'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'tm-wendui.js');
const src = fs.readFileSync(f, 'utf8');
const lines = src.split('\n');

// 锚定目标块(当前应在 1881-1892 行附近·content 校验为准)
let a = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf("var streamBubble = _$('wd-stream-text');") >= 0) { a = i; break; }
}
if (a < 0) { console.error('anchor streamBubble not found'); process.exit(1); }
if (lines[a + 1].indexOf('callAIMessagesStream') < 0) { console.error('anchor2 mismatch: ' + lines[a + 1]); process.exit(1); }
if (lines[a + 9].indexOf('chat.scrollTop = chat.scrollHeight;') < 0) { console.error('anchor3 mismatch: ' + lines[a + 9]); process.exit(1); }
if (lines[a + 11].trim() !== '});') { console.error('anchor4 mismatch: ' + lines[a + 11]); process.exit(1); }

const tierLine = lines[a + 2]; // 保留原 tier 行(含中文注释)原样
if (tierLine.indexOf('tier:') < 0) { console.error('tier line mismatch: ' + tierLine); process.exit(1); }
const callLine = lines[a + 1];

const repl = [
  "      var streamBubble = _$('wd-stream-text');",
  "      // 性能·2026-06-10·流式合帧:原每 chunk 都「全文重提取+textContent 重排+scrollTop 强制布局」·快流 20-60 chunk/s 把聊天列每秒重排几十次。",
  "      // 改 rAF 合并:每帧至多一次 DOM 写·且仅当玩家贴近底部才跟滚(不打断回看·少一次强制布局)",
  "      var _wdStreamPending = null, _wdStreamRaf = 0;",
  "      var _wdStreamFlush = function() {",
  "        _wdStreamRaf = 0;",
  "        if (_wdStreamPending == null) return;",
  "        var _txt = _wdStreamPending;",
  "        if (streamBubble && streamBubble.isConnected !== false) {",
  "          var visible = _wdVisibleReplyPreview(_txt);",
  "          streamBubble.textContent = visible || '\\u2026';",
  "          streamBubble.style.color = '';",
  "        }",
  "        var _nearBottom = (chat.scrollHeight - chat.scrollTop - chat.clientHeight) < 80;",
  "        if (_nearBottom) chat.scrollTop = chat.scrollHeight;",
  "      };",
  callLine,
  tierLine,
  "        onChunk: function(txt) {",
  "          _wdStreamPending = txt;",
  "          if (_wdStreamRaf) return;",
  "          _wdStreamRaf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(_wdStreamFlush) : (setTimeout(_wdStreamFlush, 16), 1);",
  "        }",
  "      });",
  "      // 流尾:确保最后一段已上屏(可能还压在未触发的 rAF 里)",
  "      if (_wdStreamRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_wdStreamRaf);",
  "      _wdStreamRaf = 0;",
  "      _wdStreamFlush();"
];

const out = lines.slice(0, a).concat(repl, lines.slice(a + 12)).join('\n');
fs.writeFileSync(f, out);
console.log('codemod applied at line ' + (a + 1) + ' · replaced 12 lines with ' + repl.length);
