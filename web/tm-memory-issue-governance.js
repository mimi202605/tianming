(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryIssueGovernance = root.TM.MemoryIssueGovernance || {};

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function clean(value, maxLen) {
    var s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return maxLen ? s.slice(0, maxLen) : s;
  }

  function clamp01(value) {
    value = Number(value);
    if (!isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  function issueId(value) {
    var id = clean(value, 160);
    return id.replace(/^currentIssues:/i, '');
  }

  function issueRef(value) {
    var id = issueId(value);
    return id ? ('currentIssues:' + id) : '';
  }

  function normalizeEvidenceRefs(iu, GM, existing) {
    iu = iu || {};
    existing = existing || {};
    var explicit = arr(iu.evidenceRefs).concat(arr(iu.basisRefs));
    var refs = explicit.length ? explicit : arr(existing.evidenceRefs).concat(arr(existing.basisRefs));
    var MSB = root.TM && root.TM.MemorySourceBound;
    if (MSB && typeof MSB.mergeBasisRefs === 'function') {
      return MSB.mergeBasisRefs(refs, [], {
        maxRefs: 8,
        fallback: {
          authority: 'ai_analysis',
          turn: GM && GM.turn || 0,
          visibility: 'public',
          lane: 'L5_advisory_context',
          role: 'issue_evidence'
        }
      });
    }
    return refs.slice(0, 8);
  }

  function safeFactStatus(status, hasEvidence) {
    var s = clean(status, 80);
    if (!hasEvidence) return 'advisory_unverified';
    if (!s || s === 'advisory_unverified') return 'advisory';
    if (s === 'fact' || s === 'current_fact' || s === 'verified_fact') return 'advisory';
    return s;
  }

  function normalizeIssueUpdate(iu, GM, existing) {
    iu = iu || {};
    existing = existing || {};
    var evidenceRefs = normalizeEvidenceRefs(iu, GM, existing);
    var hasEvidence = evidenceRefs.length > 0;
    var confidence = typeof iu.confidence === 'number'
      ? clamp01(iu.confidence)
      : (typeof existing.confidence === 'number' ? clamp01(existing.confidence) : (hasEvidence ? 0.55 : 0.4));
    if (!hasEvidence) confidence = Math.min(confidence, 0.45);
    var authorityLevel = hasEvidence ? clean(iu.authorityLevel || existing.authorityLevel || 'ai_analysis', 80) : 'ai_analysis';
    return {
      sourceType: clean(iu.sourceType || existing.sourceType || 'ai_analysis', 80) || 'ai_analysis',
      authorityLevel: authorityLevel || 'ai_analysis',
      confidence: confidence,
      evidenceRefs: evidenceRefs,
      basisRefs: evidenceRefs,
      generatedBy: clean(iu.generatedBy || existing.generatedBy || 'sc1.current_issues_update', 120),
      factStatus: safeFactStatus(iu.factStatus || existing.factStatus, hasEvidence)
    };
  }

  function edgeKey(edge) {
    return [edge.type, edge.src, edge.dst].join('|');
  }

  function recordIssueEdge(GM, edge) {
    if (!GM || !edge) return null;
    var type = clean(edge.type || edge.kind || 'related', 60);
    var src = issueId(edge.src || edge.from || edge.source || edge.id);
    var dst = issueId(edge.dst || edge.to || edge.target || edge.supersedes || edge.replacesId);
    if (!type || !src || !dst) return null;
    if (!Array.isArray(GM._memEdges)) GM._memEdges = [];
    var candidate = {
      id: 'issue-edge-' + clean(GM.turn || 0, 20) + '-' + clean(type + '-' + src + '-' + dst, 120).replace(/[^a-zA-Z0-9_-]+/g, '-'),
      type: type,
      src: src,
      dst: dst,
      srcRef: issueRef(src),
      dstRef: issueRef(dst),
      reason: clean(edge.reason || edge.edgeReason || '', 200),
      turn: Number(edge.turn != null ? edge.turn : (GM.turn || 0)),
      source: 'currentIssues',
      generatedBy: 'MemoryIssueGovernance'
    };
    var key = edgeKey(candidate);
    for (var i = 0; i < GM._memEdges.length; i++) {
      var old = GM._memEdges[i];
      if (old && edgeKey(old) === key) return old;
    }
    GM._memEdges.push(candidate);
    return candidate;
  }

  function createIssueResolutionEdge(GM, issueIdValue, resolutionIdValue, turn) {
    if (!GM) return null;
    var issue = issueId(issueIdValue);
    var resolution = issueId(resolutionIdValue || issue);
    if (!issue || !resolution) return null;
    if (!Array.isArray(GM._memEdges)) GM._memEdges = [];
    var candidate = {
      id: 'issue-resolution-edge-' + clean((turn != null ? turn : (GM.turn || 0)) + '-' + resolution + '-' + issue, 160).replace(/[^a-zA-Z0-9_-]+/g, '-'),
      type: 'supersedes',
      src: 'issue_resolution:' + resolution,
      dst: 'strategic_issue:' + issue,
      srcRef: issueRef(resolution),
      dstRef: issueRef(issue),
      reason: 'issue_resolution',
      turn: Number(turn != null ? turn : (GM.turn || 0)),
      source: 'currentIssues',
      generatedBy: 'MemoryIssueGovernance'
    };
    var key = edgeKey(candidate);
    for (var i = 0; i < GM._memEdges.length; i++) {
      var old = GM._memEdges[i];
      if (old && edgeKey(old) === key) return old;
    }
    GM._memEdges.push(candidate);
    return candidate;
  }

  ns.issueId = issueId;
  ns.issueRef = issueRef;
  ns.normalizeIssueUpdate = normalizeIssueUpdate;
  ns.recordIssueEdge = recordIssueEdge;
  ns.createIssueResolutionEdge = createIssueResolutionEdge;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
