#!/usr/bin/env node
// calibrate-ai-pipeline-baseline.js — AI 管线升级 kickoff baseline
//
// 用·Phase 0-7.5 实施前先跑 1 次·锁住当前静态信号作为 baseline·
//    后续每 phase 落地后跑 --diff 模式·看哪些信号变了 / 没变 (期望 vs 偏差)
//
// 用法·
//    node scripts/calibrate-ai-pipeline-baseline.js           # 录 baseline 写 docs/ai-upgrade-baseline-<date>.json
//    node scripts/calibrate-ai-pipeline-baseline.js --diff    # 跟最新 baseline 比·输出 diff
//    node scripts/calibrate-ai-pipeline-baseline.js --print   # 只打印当前信号·不写文件
//
// 任务·#110 AI 升级·实施 kickoff

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');

const SRC = {
  endturnAi: path.join(ROOT, 'tm-endturn-ai.js'),
  endturnFollowup: path.join(ROOT, 'tm-endturn-followup.js'),
  endturnApply: path.join(ROOT, 'tm-endturn-apply.js'),
  aiSchema: path.join(ROOT, 'tm-ai-schema.js'),
  saveLifecycle: path.join(ROOT, 'tm-save-lifecycle.js'),
  postTurnJobs: path.join(ROOT, 'tm-post-turn-jobs.js'),
  patches: path.join(ROOT, 'tm-patches.js'),
  patchesStart: path.join(ROOT, 'tm-patches-start.js'), // 2026-07-04 立项拆分：剧本启动链保序切出·patches 信号须并读两片

  playerSettings: path.join(ROOT, 'tm-player-settings.js')
};

function readFile(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function countMatches(src, re) {
  if (!src) return 0;
  const m = src.match(re);
  return m ? m.length : 0;
}

function captureSignals() {
  const out = {
    capturedAt: new Date().toISOString(),
    timestamp: Date.now(),
    note: 'AI pipeline upgrade kickoff baseline·Phase 0-7.5 实施前快照',
    files: {},
    signals: {}
  };

  // ─── 1. _subcallMeta registry·锁 17 个 sc·Phase 2/2.5/3/4 会改 ───
  const aiSrc = readFile(SRC.endturnAi);
  out.files.endturnAi = { exists: !!aiSrc, lineCount: aiSrc ? aiSrc.split('\n').length : 0 };

  if (aiSrc) {
    const metaMatch = aiSrc.match(/var _subcallMeta\s*=\s*\[([\s\S]*?)\];/);
    const subcallIds = [];
    if (metaMatch) {
      const entryRe = /id:\s*'([^']+)'/g;
      let m;
      while ((m = entryRe.exec(metaMatch[1])) !== null) subcallIds.push(m[1]);
    }
    out.signals.subcallRegistry = {
      count: subcallIds.length,
      ids: subcallIds,
      expectedAfterPhase2_5: 'sc1q 加入·共 18',
      expectedAfterPhase3: 'sc16/sc17/sc18 删·sc1d 改并入 sc1c·变 14',
      expectedAfterPhase4: 'sc25+sc_consolidate→sc25c·sc07+sc15→sc15n·变 12'
    };

    // ─── 2. CALL_POLICIES keys·Phase 0/2 会动 ───
    const policyMatch = aiSrc.match(/var CALL_POLICIES\s*=\s*\{([\s\S]*?)\};/);
    const policyKeys = [];
    if (policyMatch) {
      const keyRe = /(\w+)\s*:\s*_p\(/g;
      let m;
      while ((m = keyRe.exec(policyMatch[1])) !== null) policyKeys.push(m[1]);
    }
    out.signals.callPolicies = {
      count: policyKeys.length,
      keys: policyKeys
    };

    // ─── 3. stream_sc1 默认·Phase 0 D-1 翻 ON→OFF ───
    // 兼容两种写法·`!== false` (ON) | `=== true` (OFF·D-1 后)
    let streamDefault = 'unknown';
    const streamNotFalse = aiSrc.match(/_streamSC1\s*=[^;]*?stream_sc1\s*!==\s*false/);
    const streamEqTrue = aiSrc.match(/_streamSC1\s*=[^;]*?stream_sc1\s*===\s*true/);
    if (streamNotFalse) streamDefault = 'ON';
    else if (streamEqTrue) streamDefault = 'OFF';
    out.signals.streamSc1Default = {
      currentDefault: streamDefault,
      phase0_D1_expected: 'OFF',
      anchorLine: 2441
    };

    // ─── 4. SC1 family prompt 长度 (字符·非 token·粗估)·Phase 2 SC1 重构 应显著降 ───
    const sc1BlockMatch = aiSrc.match(/\/\/[\s\S]*?§3 Sub-calls? sc0[\s\S]+?TM\.Endturn\.AI\.subcalls\.runMain/);
    out.signals.sc1FamilyBlock = {
      chars: sc1BlockMatch ? sc1BlockMatch[0].length : 0,
      note: 'Phase 2 SC1 重构后预期 -40% (~30K→18K tokens)·此处为字符长度参考'
    };

    // ─── 5. ghost 字段 faction_relation_shift·Phase 2 前必须先调查 ───
    out.signals.ghostFieldFactionRelationShift = {
      occurrences: countMatches(aiSrc, /faction_relation_shift/g),
      note: '#98 Ghost 调查任务·Phase 2 前必清查'
    };
  }

  // ─── 6. tm-ai-schema 字段总数·Phase 6 strict 会扩 (nullable/enum)·Phase 2.5 加 dialogue_commitment_feedback ───
  const schemaSrc = readFile(SRC.aiSchema);
  out.files.aiSchema = { exists: !!schemaSrc, lineCount: schemaSrc ? schemaSrc.split('\n').length : 0 };
  if (schemaSrc) {
    const fieldRe = /^\s+(\w+):\s*\{\s*type:\s*'(array|object|string|number|boolean)'/gm;
    const fields = [];
    let m;
    while ((m = fieldRe.exec(schemaSrc)) !== null) fields.push({ name: m[1], type: m[2] });
    out.signals.aiSchemaFields = {
      count: fields.length,
      sample: fields.slice(0, 15).map(f => f.name + ':' + f.type),
      hasDialogueCommitmentFeedback: schemaSrc.indexOf('dialogue_commitment_feedback') >= 0,
      expectedPhase2_5: '+dialogue_commitment_feedback'
    };
  }

  // ─── 7. save-lifecycle mirror·Phase 4 会加 _lastSc28Snapshot·Phase 7 加 _costHistory ───
  const saveSrc = readFile(SRC.saveLifecycle);
  out.files.saveLifecycle = { exists: !!saveSrc, lineCount: saveSrc ? saveSrc.split('\n').length : 0 };
  if (saveSrc) {
    const mirrors = ['_savedFacUndercurrents', '_savedCourtRecords', '_savedNpcCommitments', '_savedSecretMeetings'];
    const found = mirrors.filter(m => saveSrc.indexOf(m) >= 0);
    out.signals.saveLifecycleMirrors = {
      count: found.length,
      present: found,
      hasLastSc28Snapshot: saveSrc.indexOf('_lastSc28Snapshot') >= 0,
      hasCostHistory: saveSrc.indexOf('_costHistory') >= 0,
      expectedPhase4: '+_lastSc28Snapshot',
      expectedPhase7: '+_costHistory'
    };
  }

  // ─── 8. post-turn-jobs sc25→sc25c·Phase 4 改 ───
  const postSrc = readFile(SRC.postTurnJobs);
  if (postSrc) {
    const sc25Match = postSrc.match(/_POST_TURN_NEXT_REQUIRED_IDS\s*=\s*\{[^}]*?(sc25\w*)\s*:\s*true/);
    out.signals.postTurnNextRequiredId = {
      current: sc25Match ? sc25Match[1] : 'unknown',
      expectedPhase4: 'sc25c'
    };
  }

  // ─── 9. SC27 expectedKeys·Phase 5 sc27_review 会扩 ───
  const followupSrc = readFile(SRC.endturnFollowup);
  out.files.endturnFollowup = { exists: !!followupSrc, lineCount: followupSrc ? followupSrc.split('\n').length : 0 };
  if (followupSrc) {
    const sc27Match = followupSrc.match(/expectedKeys\s*[:=]\s*\[([^\]]+)\]/);
    out.signals.sc27ExpectedKeys = {
      current: sc27Match ? sc27Match[1].replace(/['"]/g, '').split(',').map(s => s.trim()) : [],
      anchorLine: 1891,
      expectedPhase5: '+name_errors_fixed +rewritten_passages may change shape'
    };
  }

  // ─── 10. aiCallDepth UI hardcoded counts·Phase 7.5 会重写 ───
  const patchesSrc = [readFile(SRC.patches), readFile(SRC.patchesStart)].filter(Boolean).join('\n');
  out.files.patches = { exists: !!patchesSrc, lineCount: patchesSrc ? patchesSrc.split('\n').length : 0 };
  if (patchesSrc) {
    const depthHints = patchesSrc.match(/(11调用|6调用|3调用|17调用|11 调用|6 调用)/g);
    out.signals.aiCallDepthUiCounts = {
      currentHardcoded: depthHints || [],
      anchorLine: 520,
      expectedPhase7_5: 'dynamic from CALL_POLICIES'
    };
    out.signals.zombieToggleShowRelation = {
      present: patchesSrc.indexOf('showRelation') >= 0,
      expectedPhase7_5: 'removed'
    };
  }

  // ─── 11. apply.js·dialogue_commitment_feedback apply func 是否存在 (Phase 2.5 加) ───
  const applySrc = readFile(SRC.endturnApply);
  out.files.endturnApply = { exists: !!applySrc, lineCount: applySrc ? applySrc.split('\n').length : 0 };
  if (applySrc) {
    out.signals.dialogueCommitmentFeedbackApply = {
      hasApplyFunc: applySrc.indexOf('_applyDialogueCommitmentFeedback') >= 0 || applySrc.indexOf('dialogue_commitment_feedback') >= 0,
      hasCommitmentUpdate: applySrc.indexOf('commitment_update') >= 0,
      expectedPhase2_5: '+_applyDialogueCommitmentFeedback (separate from commitment_update)'
    };
  }

  return out;
}

function findLatestBaseline() {
  if (!fs.existsSync(DOCS_DIR)) return null;
  const files = fs.readdirSync(DOCS_DIR).filter(f => /^ai-upgrade-baseline-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  if (files.length === 0) return null;
  files.sort();
  return path.join(DOCS_DIR, files[files.length - 1]);
}

function diffSignals(baseline, current) {
  const diffs = [];
  const seen = new Set();

  function walk(prefix, b, c) {
    const keys = new Set([...Object.keys(b || {}), ...Object.keys(c || {})]);
    keys.forEach(k => {
      const pa = prefix ? prefix + '.' + k : k;
      if (seen.has(pa)) return;
      const bv = b ? b[k] : undefined;
      const cv = c ? c[k] : undefined;
      if (typeof bv === 'object' && bv !== null && !Array.isArray(bv) &&
          typeof cv === 'object' && cv !== null && !Array.isArray(cv)) {
        walk(pa, bv, cv);
      } else {
        const bs = JSON.stringify(bv);
        const cs = JSON.stringify(cv);
        if (bs !== cs) {
          diffs.push({ path: pa, baseline: bv, current: cv });
          seen.add(pa);
        }
      }
    });
  }

  walk('', baseline.signals || {}, current.signals || {});
  return diffs;
}

// ─── main ───
const args = process.argv.slice(2);
const isPrint = args.indexOf('--print') >= 0;
const isDiff = args.indexOf('--diff') >= 0;

const current = captureSignals();

if (isPrint) {
  console.log(JSON.stringify(current, null, 2));
  process.exit(0);
}

if (isDiff) {
  const baselinePath = findLatestBaseline();
  if (!baselinePath) {
    console.error('[calibrate] no baseline found in docs/·先跑一次不带 --diff 录 baseline');
    process.exit(1);
  }
  console.log('[calibrate] diff vs baseline·' + path.basename(baselinePath));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const diffs = diffSignals(baseline, current);
  if (diffs.length === 0) {
    console.log('[calibrate] no signal drift·all signals match baseline');
  } else {
    console.log('[calibrate] ' + diffs.length + ' signal(s) drifted:');
    diffs.forEach(d => {
      console.log('  · ' + d.path);
      console.log('      baseline: ' + JSON.stringify(d.baseline));
      console.log('      current : ' + JSON.stringify(d.current));
    });
  }
  process.exit(0);
}

// 默认·写 baseline
const date = new Date().toISOString().slice(0, 10);
const outPath = path.join(DOCS_DIR, 'ai-upgrade-baseline-' + date + '.json');

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(current, null, 2) + '\n', 'utf8');

console.log('[calibrate] baseline 已录·' + path.relative(ROOT, outPath));
console.log('[calibrate] 关键信号·');
console.log('  · subcall registry count = ' + (current.signals.subcallRegistry || {}).count);
console.log('  · CALL_POLICIES count    = ' + (current.signals.callPolicies || {}).count);
console.log('  · stream_sc1 default     = ' + (current.signals.streamSc1Default || {}).currentDefault);
console.log('  · save-lifecycle mirrors = ' + (current.signals.saveLifecycleMirrors || {}).count);
console.log('  · ai-schema fields       = ' + (current.signals.aiSchemaFields || {}).count);
console.log('  · ghost factionRelShift  = ' + (current.signals.ghostFieldFactionRelationShift || {}).occurrences + ' occurrences');
console.log('  · sc27 expectedKeys      = ' + JSON.stringify((current.signals.sc27ExpectedKeys || {}).current));
console.log('  · post-turn next id      = ' + (current.signals.postTurnNextRequiredId || {}).current);
console.log('[calibrate] 后续 phase 落地后跑·node scripts/calibrate-ai-pipeline-baseline.js --diff');
