#!/usr/bin/env node
/* eslint-env node */
// smoke-gongming-display.js — 功名系统·图志富展示源码契约 (2026-06-13)
// 验证 tm-renwu-tuzhi.js：adaptChar 暴露结构化出身 + 身份 tab 渲染功名出身块(正异途/清浊流/天花板/优免/政绩)。
'use strict';

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'tm-renwu-tuzhi.js'), 'utf8');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed += 1; console.log('  PASS', msg); }
  else { failed += 1; console.error('  FAIL', msg); }
}

// 适配器接线
ok(/_gongmingOriginOf\(c\)\{[\s\S]*?TMGongming\.describe/.test(SRC), '_gongmingOriginOf 走 TMGongming.describe');
ok(/gongmingOrigin:_gongmingOriginOf\(c\)/.test(SRC), 'adaptChar 暴露 gongmingOrigin');

// 展示块存在且读对字段
ok(/function gongmingOriginBlock\(p\)\{/.test(SRC), '功名出身块函数存在');
ok(/var g=p\.gongmingOrigin;if\(!g\)return ''/.test(SRC), '块读 p.gongmingOrigin·缺则空(老存档/无引擎降级)');
ok(/g\.zhengtu\?'正途':'异途'/.test(SRC), '渲染正途/异途');
ok(/g\.liupinLabel/.test(SRC), '渲染清浊流(liupinLabel)');
ok(/g\.ceilingLabel/.test(SRC), '渲染仕途天花板');
ok(/g\.youmian/.test(SRC) && /丁/.test(SRC), '渲染个人优免(丁)');
ok(/p\.gongmingTier/.test(SRC) && /政绩/.test(SRC), '块内并显政绩阶(资格⊕政绩)');
ok(/g\.source==='inferred'/.test(SRC), '推定出身有显式标注');

// 块被身份 tab 调用
ok(/\+gongmingOriginBlock\(p\)/.test(SRC), '身份 tab 调用功名出身块');

console.log('\n[smoke-gongming-display] ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
