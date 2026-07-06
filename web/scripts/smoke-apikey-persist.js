// ============================================================
//  smoke-apikey-persist.js — 主 API key 桌面持久化回归守卫
//  背景(2026-07-01·owner 报)：桌面端保存主 API key·关游戏再进 key 丢失。
//  真因：key 真源在 localStorage.tm_api(启动 tm-player-core.js 从此水合 P.ai)；桌面 autoSave 走
//        _tmStripAiKeyView 故意剥掉 key。sSaveAPI 桌面分支曾只 autoSave、漏写 localStorage.tm_api → 重启即失。
//  本测：静态守 sSaveAPI 无条件写 localStorage.tm_api(不再只在 web else 分支)，且 _tmStripAiKeyView 仍剥 key。
//
//  ★2026-07-04·补读回侧(玩家复报"桌面 key 总是保存不了")：只 ship「写 tm_api」不够——
//    桌面启动分支若只读被剥 key 的 autoSave 后即 return、从不回读 tm_api·则 key 存进了设备本地
//    localStorage.tm_api 却永不恢复→每次重启都丢。1.3.4.5 恰是「写已提交、读回未提交」的半吊子·
//    发版说明却已写"修复桌面重启丢 key"(名不副实·因为写侧有测、读回侧无测才漏网)。故此测补齐读回侧。
//  运行：node web/scripts/smoke-apikey-persist.js
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = (fs.readFileSync(path.join(ROOT, 'web', 'tm-patches.js'), 'utf-8') + '\n' + fs.readFileSync(path.join(ROOT, 'web', 'tm-patches-start.js'), 'utf-8'));
const UTILS = fs.readFileSync(path.join(ROOT, 'web', 'tm-utils.js'), 'utf-8');
const CORE = fs.readFileSync(path.join(ROOT, 'web', 'tm-player-core.js'), 'utf-8');

let pass = 0, fail = 0;
function assert(c, m){ if(c){pass++; console.log('  ok· '+m);} else {fail++; console.error('  FAIL· '+m);} }

// 抽 sSaveAPI 函数体（到下一个 function sSaveAll）
const m = SRC.match(/function sSaveAPI\(\)\{([\s\S]*?)\}\s*\nfunction sSaveAll/);
assert(!!m, 'sSaveAPI 函数存在且可定位');
const body = m ? m[1] : '';

assert(/localStorage\.setItem\("tm_api"/.test(body), 'sSaveAPI 写 localStorage.tm_api(key 持久化通道)');

// 反例守卫：旧 buggy 形态 = localStorage 只在桌面判断的 else 分支里
assert(!/\}else\{try\{localStorage\.setItem\("tm_api"/.test(body),
  'sSaveAPI 不再把 localStorage.tm_api 写在 else 分支(桌面会漏写=旧 bug)');

// 结构正例：localStorage.tm_api 写在桌面 autoSave 之前(=两端都会执行·桌面不漏)
const iLS = body.indexOf('localStorage.setItem("tm_api"');
const iAuto = body.indexOf('window.tianming.autoSave');
assert(iLS >= 0 && iAuto >= 0 && iLS < iAuto,
  'sSaveAPI 先写 localStorage.tm_api 再(桌面)autoSave → 桌面主 key 也持久');

// _tmStripAiKeyView 仍剥 key（存档脱敏不变·key 只在 localStorage）
assert(/function _tmStripAiKeyView[\s\S]*?delete ai\.key/.test(UTILS),
  '_tmStripAiKeyView 仍 delete ai.key(存档脱敏·安全不变)');

// 次 API sSaveSecondaryAPI 本就两端都写 localStorage(同范式·参照正确实现)
assert(/function sSaveSecondaryAPI[\s\S]*?localStorage\.setItem\("tm_api"[\s\S]*?window\.tianming\.autoSave/.test(SRC),
  'sSaveSecondaryAPI 参照:localStorage.tm_api 在 autoSave 前(一致范式)');

// ── 读回侧(真正修复桌面重启丢 key 的另一半·此前无测才漏网)────────────────
// 桌面启动分支须先从 localStorage.tm_api 回读主 key·再 loadAutoSave(autoSave 已剥 key)。
const dm = CORE.match(/isDesktop\)\{([\s\S]*?)return;/);
assert(!!dm, '桌面启动分支可定位');
const dbody = dm ? dm[1] : '';
assert(/localStorage\.getItem\("tm_api"\)/.test(dbody),
  '桌面启动分支回读 localStorage.tm_api(恢复主 key·修复重启丢 key 的读回半)');
const iRead = dbody.indexOf('localStorage.getItem("tm_api")');
const iLoad = dbody.indexOf('loadAutoSave');
assert(iRead >= 0 && iLoad >= 0 && iRead < iLoad,
  '桌面分支先回读 tm_api 再 loadAutoSave(剥 key 的 autoSave 不覆盖已回读的 key)');
// _applyAiCfg 以 || 兜底保 key：c.key 空(剥 key 的 autoSave)时回落 P.ai.key·不冲成空
assert(/P\.ai\.key\s*=\s*c\.key\s*\|\|\s*P\.ai\.key/.test(CORE),
  '_applyAiCfg key 用 || 兜底(剥 key 的 autoSave 传 undefined 不冲掉已回读的 key)');

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASS') + ' · pass=' + pass);
process.exit(fail ? 1 : 0);
