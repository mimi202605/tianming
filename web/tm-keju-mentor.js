/**
 * tm-keju-mentor.js
 * v7.1·Slice E1·mentor 反向索引·D1 长尾基础
 *
 * 兼容现 Slice 10a (tm-tinyi-v3.js·_ty3_buildMentorIndex)·共用 GM._mentorIndex namespace
 * 现存 key (10a 写·廷议读)·**不动**·
 *   GM._mentorIndex.mentor[name] = [menteeName, ...]    源·ch.mentees[]
 *   GM._mentorIndex.mentee[name] = mentorName           反向·一对一·后者覆盖前者
 *
 * 本 E1 新增 key (科举 D5 写·D1 长尾读)·
 *   GM._mentorIndex.byMentor[examinerName] = [{ disciple, cohortYear, addedTurn }, ...]
 *   GM._mentorIndex.byCohort[String(year)] = [discipleName, ...]
 *   GM._mentorIndex.byDisciple[discipleName] = { mentor, cohortYear }
 *
 * 数据源·ch._mentorRef + ch._cohortYear (D5 已写入 _aiGenerateFullCharacter / _kejuBasicRecruit)
 *
 * Public API·
 *   _kjInitMentorIndex()             — 初始化 6 子 namespace (含 10a)·initKejuSystem 调
 *   _kjBuildMentorIndex()            — 老存档全量 rebuild·扫 GM.chars·_kejuFinalize 末调
 *   _kjAddMentorEdge(d, m, year, t)  — 增量加边·只动 E1 三 key·不动 10a mentor/mentee
 *   _kjGetMentees(examinerName)      — 返该主考门生 [{ disciple, cohortYear, addedTurn }]
 *   _kjGetMentor(discipleName)       — 返该进士的恩师·{ mentor, cohortYear } | null
 *   _kjGetCohortMembers(year)        — 返该年同年 [discipleName]·F3 集会用
 *
 * NB·
 *   - F1 (Release 1.5) 将扩为 GM._discipleGraph (加 strength / lastInteraction / events)·E1 是简版
 *   - 不动 ch schema (D5 已加 _mentorRef + _cohortYear)·不引 LLM
 *   - 10a 的 mentor/mentee 跟 E1 的 byMentor/byDisciple 数据源不同 (ch.mentees vs ch._mentorRef)·共存
 */
(function() {
  'use strict';

  function _kjInitMentorIndex() {
    if (typeof GM === 'undefined' || !GM) return;
    if (!GM._mentorIndex) GM._mentorIndex = {};
    // 10a 现存 key·不存在才补·存在则不动
    if (!GM._mentorIndex.mentor) GM._mentorIndex.mentor = {};
    if (!GM._mentorIndex.mentee) GM._mentorIndex.mentee = {};
    // E1 新增 key
    if (!GM._mentorIndex.byMentor) GM._mentorIndex.byMentor = {};
    if (!GM._mentorIndex.byCohort) GM._mentorIndex.byCohort = {};
    if (!GM._mentorIndex.byDisciple) GM._mentorIndex.byDisciple = {};
  }

  function _kjBuildMentorIndex() {
    if (typeof GM === 'undefined' || !GM) return;
    _kjInitMentorIndex();
    // 清 E1 三 key·从 chars 重新扫·**不动** 10a mentor/mentee
    GM._mentorIndex.byMentor = {};
    GM._mentorIndex.byCohort = {};
    GM._mentorIndex.byDisciple = {};
    if (!GM.chars || !Array.isArray(GM.chars)) return;
    GM.chars.forEach(function(ch) {
      if (!ch || !ch._mentorRef || !ch._cohortYear) return;
      _kjAddMentorEdge(ch.name, ch._mentorRef, ch._cohortYear, ch.recruitTurn || 0);
    });
  }

  function _kjAddMentorEdge(disciple, mentor, cohortYear, addedTurn) {
    if (!disciple || !mentor) return;
    if (typeof GM === 'undefined' || !GM) return;
    _kjInitMentorIndex();
    addedTurn = addedTurn || (GM.turn || 0);
    cohortYear = cohortYear || (GM.year || 0);
    // byMentor·去重
    if (!GM._mentorIndex.byMentor[mentor]) GM._mentorIndex.byMentor[mentor] = [];
    if (!GM._mentorIndex.byMentor[mentor].find(function(e){ return e.disciple === disciple; })) {
      GM._mentorIndex.byMentor[mentor].push({ disciple: disciple, cohortYear: cohortYear, addedTurn: addedTurn });
    }
    // byCohort
    var cy = String(cohortYear);
    if (!GM._mentorIndex.byCohort[cy]) GM._mentorIndex.byCohort[cy] = [];
    if (GM._mentorIndex.byCohort[cy].indexOf(disciple) < 0) {
      GM._mentorIndex.byCohort[cy].push(disciple);
    }
    // byDisciple·一对一·新关系覆盖旧
    GM._mentorIndex.byDisciple[disciple] = { mentor: mentor, cohortYear: cohortYear };

    // v7.1·F1·dual-write·若 D1 已 enable·同步加 _discipleGraph 边 (含 strength/events)
    if (typeof _kjAddDiscipleEdge === 'function') {
      try { _kjAddDiscipleEdge(disciple, mentor, cohortYear, addedTurn); }
      catch(e) { try { console.warn('[F1] dual-write _discipleGraph 失败', e && e.message); } catch(_) {} }
    }
  }

  function _kjGetMentees(examinerName) {
    if (!examinerName) return [];
    if (typeof GM === 'undefined' || !GM || !GM._mentorIndex || !GM._mentorIndex.byMentor) return [];
    return GM._mentorIndex.byMentor[examinerName] || [];
  }

  function _kjGetMentor(discipleName) {
    if (!discipleName) return null;
    if (typeof GM === 'undefined' || !GM || !GM._mentorIndex || !GM._mentorIndex.byDisciple) return null;
    return GM._mentorIndex.byDisciple[discipleName] || null;
  }

  function _kjGetCohortMembers(year) {
    if (typeof GM === 'undefined' || !GM || !GM._mentorIndex || !GM._mentorIndex.byCohort) return [];
    return GM._mentorIndex.byCohort[String(year)] || [];
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjInitMentorIndex = _kjInitMentorIndex;
    window._kjBuildMentorIndex = _kjBuildMentorIndex;
    window._kjAddMentorEdge = _kjAddMentorEdge;
    window._kjGetMentees = _kjGetMentees;
    window._kjGetMentor = _kjGetMentor;
    window._kjGetCohortMembers = _kjGetCohortMembers;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjInitMentorIndex: _kjInitMentorIndex,
      _kjBuildMentorIndex: _kjBuildMentorIndex,
      _kjAddMentorEdge: _kjAddMentorEdge,
      _kjGetMentees: _kjGetMentees,
      _kjGetMentor: _kjGetMentor,
      _kjGetCohortMembers: _kjGetCohortMembers
    };
  }
})();
