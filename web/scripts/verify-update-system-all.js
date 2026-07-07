// ============================================================
//  verify-update-system-all.js — 更新功能全面升级·综合回归入口
//  一把跑齐 S1-S10 全部 verify 脚本·汇总 PASS/FAIL + 断言总数
//  运行：node web/scripts/verify-update-system-all.js
// ============================================================
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPTS = [
  ['S1 下载内核鲁棒性', 'web/scripts/verify-hotdl-resume.js'],
  ['S2 自愈+卫生',      'web/scripts/verify-hotupdate-selfheal.js'],
  ['S3 更新卡组件',     'web/scripts/verify-update-card.js'],
  ['S4 桌面自检',       'web/scripts/verify-desktop-update-boot.js'],
  ['S5 本体决策树',     'web/scripts/verify-update-decision-tree.js'],
  ['S6 在线版提示',     'web/scripts/verify-online-update.js'],
  ['S7 构建器闸门',     'web/scripts/verify-hot-builder-gates.js'],
  ['S8 安卓差量',       'web/scripts/verify-capgo-delta.js'],
  ['S9 通用部署',       'web/scripts/verify-deploy-local.js'],
  ['S11 自基线重建',    'web/scripts/verify-hotupdate-rebaseline.js']
];

let totalAssert = 0, failed = 0;
const env = Object.assign({}, process.env, { PYTHONUTF8: '1' });
console.log('═══ 更新功能升级·综合回归 ═══\n');
for (const [name, rel] of SCRIPTS) {
  const r = spawnSync('node', [path.join(ROOT, rel)], { encoding: 'utf-8', env });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/PASS assertions=(\d+)/);
  if (r.status === 0 && m) {
    totalAssert += parseInt(m[1], 10);
    console.log('  ✓ ' + name.padEnd(20) + ' ' + m[1] + ' 断言');
  } else {
    failed++;
    console.log('  ✗ ' + name.padEnd(20) + ' 失败 (exit ' + r.status + ')');
    const tail = out.trim().split('\n').slice(-6).join('\n    ');
    console.log('    ' + tail);
  }
}
// release.js self-test 单独（不走 PASS assertions= 同格式·但也打 PASS assertions=）
{
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'release.js'), '--self-test'], { encoding: 'utf-8', env });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/PASS assertions=(\d+)/);
  if (r.status === 0 && m) { totalAssert += parseInt(m[1], 10); console.log('  ✓ ' + 'S10 发版扇出'.padEnd(20) + ' ' + m[1] + ' 断言'); }
  else { failed++; console.log('  ✗ S10 发版扇出 失败 (exit ' + r.status + ')'); }
}

console.log('\n' + (failed === 0 ? '═══ 全绿 ═══' : '═══ ' + failed + ' 个套件失败 ═══'));
console.log('套件 ' + (SCRIPTS.length + 1 - failed) + '/' + (SCRIPTS.length + 1) + ' 通过·累计 ' + totalAssert + ' 断言');
process.exit(failed === 0 ? 0 : 1);
