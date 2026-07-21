#!/usr/bin/env node
/* dev-sync-latest —— 启动器前置同步：把本机正式游戏锁到 origin/main 最新（2026-07-21·owner「自动锁定本地最新」）
   背景：主库工作树常被并行会话占着（HEAD 落后 + 未提交 WIP），游戏(启动天命.bat→npm start)吃的是
   工作树文件——合入 main 的活到不了本机游戏。本脚本在 npm start 前跑一遍。
   规则：① 干净跟踪文件 → 覆盖到 origin/main
        ② 「脏」文件三分：内容已=目标 → 记台账放行；内容=本脚本上次所写(台账核对) → 属自动同步残留·
           继续推进；其余 = 真人 WIP → 跳过并列名·绝不清别人的稿
        ③ 绝不删文件（上游删除只报数）  ④ fetch 失败/断网 → 降级用本地已知 origin/main
        ⑤ 逃生口 TM_NO_SYNC=1 跳过·--dry 只看不写
   自写台账在 .git/dev-sync-state.json（不进版本库）。输出全 ASCII+路径（bat 控制台 OEM936·中文会碎）。 */
'use strict';
var childProcess = require('child_process');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var STATE_PATH = path.join(ROOT, '.git', 'dev-sync-state.json');
var DRY = process.argv.indexOf('--dry') >= 0;
var MAXBUF = 64 * 1024 * 1024;

function git(args) {
  return childProcess.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: MAXBUF });
}
function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) || { files: {} }; } catch (_e) { return { files: {} }; }
}

function main() {
  if (process.env.TM_NO_SYNC === '1') { console.log('[sync] TM_NO_SYNC=1 -> skipped'); return; }
  try {
    childProcess.execFileSync('git', ['fetch', 'origin', 'main', '--quiet'], { cwd: ROOT, timeout: 15000, stdio: 'ignore' });
  } catch (_e) { console.log('[sync] fetch failed/offline -> using last known origin/main'); }
  var target = '';
  try { target = git(['rev-parse', 'origin/main']).trim(); } catch (_e2) { console.log('[sync] no origin/main ref -> skipped'); return; }
  var state = loadState();
  if (!state.files) state.files = {};
  // 本地有账的跟踪文件（暂存或未暂存）·untracked 与同步无关
  var dirty = {};
  git(['status', '--porcelain']).split('\n').forEach(function (l) {
    if (!l || l.indexOf('??') === 0) return;
    var p = l.slice(3).trim().replace(/^"|"$/g, '');
    if (p) dirty[p] = 1;
  });
  var diff = git(['diff', '--name-status', 'HEAD', target]).split('\n').filter(Boolean);
  var updated = 0, advanced = 0, same = 0, skippedWip = [], removedUpstream = 0;
  diff.forEach(function (line) {
    var parts = line.split('\t');
    var st = parts[0].charAt(0);
    var p = parts[parts.length - 1];   // rename 行取新路径·旧路径按「不删」原则原地保留
    if (st === 'D') { removedUpstream++; return; }
    var blob = childProcess.spawnSync('git', ['show', target + ':' + p], { cwd: ROOT, maxBuffer: MAXBUF });
    if (blob.status !== 0 || blob.stdout == null) return;
    var abs = path.join(ROOT, p);
    var cur = null;
    try { cur = fs.existsSync(abs) ? fs.readFileSync(abs) : null; } catch (_e3) {}
    var targetSha = sha(blob.stdout);
    if (cur && cur.equals(blob.stdout)) { same++; state.files[p] = targetSha; return; }   // 已是目标·记台账(手动同步过的也收编)
    if (dirty[p] && cur) {
      var curSha = sha(cur);
      if (state.files[p] !== curSha) { skippedWip.push(p); return; }   // 真人 WIP·保
      // 台账对上=上次自动同步所写·继续推进
      if (!DRY) fs.writeFileSync(abs, blob.stdout);
      state.files[p] = targetSha; advanced++; return;
    }
    if (!DRY) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, blob.stdout);
    }
    state.files[p] = targetSha; updated++;
  });
  if (!DRY) {
    try { fs.writeFileSync(STATE_PATH, JSON.stringify({ target: target, files: state.files })); } catch (_e4) {}
  }
  console.log('[sync] game locked to origin/main @' + target.slice(0, 8) + (DRY ? ' (dry-run, nothing written)' : ''));
  console.log('[sync] updated ' + updated + ' | advanced-auto ' + advanced + ' | already-current ' + same +
    (skippedWip.length ? ' | kept-human-WIP ' + skippedWip.length : '') +
    (removedUpstream ? ' | upstream-deleted-kept ' + removedUpstream : ''));
  skippedWip.slice(0, 12).forEach(function (p) { console.log('  [wip-kept] ' + p); });
  if (skippedWip.length > 12) console.log('  [wip-kept] ... and ' + (skippedWip.length - 12) + ' more');
}

try { main(); } catch (e) {
  console.log('[sync] error (game will launch anyway): ' + (e && e.message ? e.message.split('\n')[0] : e));
}
