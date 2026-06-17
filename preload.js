/*
 * ============================================================
 *  天命 · preload·shim
 *  2026-05-23 起·此 shim 取代原 preload.js·允许 preload 实现热更新
 *
 *  逻辑·
 *    1. preload 在 renderer 进程·无 app 模块·无法直接 getPath('userData')
 *    2. main 在 createWindow 时·已 detect 过 hot dir 的 _app_preload.js
 *    3. main 通过 webPreferences.additionalArguments 传 '--hot-preload=<path>'·preload 读 process.argv
 *    4. 找到就 require·失败 fallback ./preload-impl.js
 *
 *  前提·main-impl.js 必须给 webPreferences 加·sandbox: false (sandbox 模式禁 require 外部文件)
 *
 *  安全·contextIsolation 仍 true·renderer 仍无法访问 preload 全局
 * ============================================================
 */

const path = require('path');
const fs = require('fs');

let usingHot = false;

try {
  let hotPath = '';
  for (const arg of process.argv) {
    if (typeof arg === 'string' && arg.indexOf('--hot-preload=') === 0) {
      hotPath = arg.slice('--hot-preload='.length);
      break;
    }
  }
  if (hotPath && fs.existsSync(hotPath)) {
    console.log('[preload-shim] loading hot preload·' + hotPath);
    require(hotPath);
    usingHot = true;
  }
} catch (e) {
  console.warn('[preload-shim] hot preload 同步 failed·falling back to bundled·' + (e && e.stack || e));
}

if (!usingHot) {
  console.log('[preload-shim] loading bundled preload·' + path.join(__dirname, 'preload-impl.js'));
  require('./preload-impl.js');
}
