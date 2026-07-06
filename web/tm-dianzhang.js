// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// tm-dianzhang.js — 典章 / 祖制 建构轴（Wave5·地基 slice-1·2026-07-05）
//
// 立意：玩家推行的制度熬过考验（存续 N 回合·未被压制）→ 凝成「祖制·成宪」，
//   累积成一部持久的「典章」（随存档走），塑造这个王朝。这是「制度积累长弧」建构轴——
//   diegetic（从玩家实际推的制度长出）、朝代中立（立祖制/定成宪是通用古制）、不玄幻、非科技树、守「无通关」。
//
// 本 slice 只做地基：数据模型 + 升祖制 tick（先接国策 GM._globalRules·有 enactedTurn+status）。
//   后续 slice：接全三源（官署改制存续/科举范式承袭）→ 祖制红利+副作用 → 典章面板 UI → 王朝身份入叙事。
//
// ★双刃设计（owner 2026-07-05 细化·slice-3 红利刀落地）：祖制不是纯正向堆料——
//   红利：成熟祖制给持续制度红利（合法性 / 稳定 / **同向**改革阻力下降）；
//   副作用：成宪难改（**改这条祖制本身**的阻力上升）+ 滋生副作用，典章越厚王朝越僵。
//   → 建构轴有真权衡：攒祖制换稳固与正统，代价是渐失变革余地（史上「祖制不可违」之僵）。玩家取舍：何时著为成宪（锁定）vs 保留变通。
//
// 数据：GM._dianzhang = { statutes:[{id,kind,name,source,enactedTurn,maturedTurn}], _seq }。
//   ★写只走本模块（架构守卫「写走账」·TM.Dianzhang 是 GM._dianzhang 唯一写口/owner）。
// ============================================================

(function (global) {
  var TM = global.TM = global.TM || {};
  if (TM.Dianzhang) return;

  var MATURE_TURNS = 12;   // 制度存续满 12 回合（约一年）方著为祖制·时间考验

  function _gm(GM) { return GM || global.GM; }

  function _ensure(GM) {
    GM = _gm(GM); if (!GM) return null;
    if (!GM._dianzhang || typeof GM._dianzhang !== 'object') GM._dianzhang = { statutes: [], _seq: 0 };  // arch-ok·典章账本·本模块 owner
    if (!Array.isArray(GM._dianzhang.statutes)) GM._dianzhang.statutes = [];
    return GM._dianzhang;
  }

  function list(GM) { var d = _ensure(GM); return d ? d.statutes : []; }
  function count(GM) { return list(GM).length; }
  function has(GM, kind, srcId) {
    return list(GM).some(function (s) { return s && s.kind === kind && s.source === srcId; });
  }

  // 著一条祖制（dedup by kind+source）·内部唯一写口
  function enshrine(GM, entry) {
    var d = _ensure(GM); if (!d || !entry || !entry.name) return null;
    if (has(GM, entry.kind, entry.source)) return null;
    var turn = (GM && GM.turn) || 0;
    var rec = {
      id: 'dz' + (d._seq = (d._seq || 0) + 1),
      kind: String(entry.kind || 'policy'),
      name: String(entry.name).slice(0, 60),
      source: entry.source || '',
      enactedTurn: entry.enactedTurn != null ? entry.enactedTurn : turn,
      maturedTurn: turn
    };
    d.statutes.unshift(rec);
    if (d.statutes.length > 200) d.statutes = d.statutes.slice(0, 200);
    try { if (typeof global.addEB === 'function') global.addEB('典章', '「' + rec.name + '」历 ' + Math.max(0, turn - rec.enactedTurn) + ' 回合不移·著为祖制成宪'); } catch (e) {}
    return rec;
  }

  // ── office 源（Wave5 slice-2·事件驱动·免每回合遍历官制树）──
  // 构造性改制（增设）落地→记「种子」；种子存续 ≥MATURE_TURNS→升 office 祖制；机构裁撤→清种子+祖制。
  // 由 tm-office-reform.applyReformToTree 在各改制落地点调用（key 由那侧按改制类型派生·此处只存/清）。
  function recordOfficeReform(GM, sourceKey, name) {
    var d = _ensure(GM); if (!d || !sourceKey) return null;
    if (!Array.isArray(d._officeSeeds)) d._officeSeeds = [];
    if (has(GM, 'office', sourceKey)) return null;                                        // 已成祖制
    if (d._officeSeeds.some(function (s) { return s && s.source === sourceKey; })) return null;  // 已在种子
    var seed = { source: String(sourceKey), name: String(name || sourceKey).slice(0, 40), appliedTurn: (GM.turn || 0) };
    d._officeSeeds.push(seed);
    if (d._officeSeeds.length > 200) d._officeSeeds = d._officeSeeds.slice(-200);
    return seed;
  }
  // 机构裁撤/改名/并入→清对应种子与祖制（成宪之制被推翻则消亡·不再据以设阻）。
  function onInstitutionAbolished(GM, sourceKey) {
    var d = _ensure(GM); if (!d || !sourceKey) return;
    if (Array.isArray(d._officeSeeds)) d._officeSeeds = d._officeSeeds.filter(function (s) { return !s || s.source !== sourceKey; });
    d.statutes = d.statutes.filter(function (s) { return !(s && s.kind === 'office' && s.source === sourceKey); });
  }

  // 每回合：扫制度源·熬过考验者升祖制。三源：①国策 _globalRules ②office 种子（增设机构存续）③科举范式承袭。
  function tick(GM) {
    GM = _gm(GM); if (!GM) return { promoted: 0 };
    var d = _ensure(GM);
    var turn = GM.turn || 0, promoted = 0;
    // ①国策
    var rules = Array.isArray(GM._globalRules) ? GM._globalRules : [];
    rules.forEach(function (r) {
      if (!r || !r.name) return;
      if (r.status === 'suppressed') return;                         // 被压制的不算立住
      if ((turn - (r.enactedTurn || turn)) < MATURE_TURNS) return;   // 未历时间考验
      if (has(GM, 'policy', r.id)) return;                           // 已入典章
      if (enshrine(GM, { kind: 'policy', name: r.name, source: r.id, enactedTurn: r.enactedTurn })) promoted++;
    });
    // ②office 种子熟成：存续满 MATURE_TURNS 且未被裁撤（裁撤即从种子清）→ 著 office 祖制
    if (d && Array.isArray(d._officeSeeds) && d._officeSeeds.length) {
      var keep = [];
      d._officeSeeds.forEach(function (s) {
        if (s && (turn - (s.appliedTurn || turn)) >= MATURE_TURNS) {
          if (enshrine(GM, { kind: 'office', name: s.name, source: s.source, enactedTurn: s.appliedTurn })) promoted++;
        } else if (s) keep.push(s);
      });
      d._officeSeeds = keep;
    }
    // ③科举范式承袭（slice-2b·纯读 GM._kejuParadigm.history·已带 turn+status·零改 keju 子系统）：
    //   applied 且未回滚(ramping/active/matured)存续满→著「科举成宪·祖宗取士之法」；回滚/驳→曾成祖制则消亡。
    var kh = (GM._kejuParadigm && Array.isArray(GM._kejuParadigm.history)) ? GM._kejuParadigm.history : null;
    if (d && kh && kh.length) {
      var KJLIVE = { ramping: 1, active: 1, matured: 1 };
      kh.forEach(function (h) {
        if (!h || !h.applied || !h.id) return;
        var src = 'keju:' + h.id;
        if (h.status === 'rolled_back' || h.status === 'rejected') {   // 回滚/驳→曾成祖制则消亡
          d.statutes = d.statutes.filter(function (s) { return !(s && s.kind === 'keju' && s.source === src); });
          return;
        }
        if (KJLIVE[h.status] && (turn - (h.turn || turn)) >= MATURE_TURNS && !has(GM, 'keju', src)) {
          if (enshrine(GM, { kind: 'keju', name: h.paradigmDigest || h.reason || ('科举改制·' + h.id), source: src, enactedTurn: h.turn })) promoted++;
        }
      });
    }
    return { promoted: promoted };
  }

  // ── 双刃效果（Wave5 slice-3·owner 双刃细化）：红利 + 成宪难改。纯读 GM._dianzhang·不碰别的系统·供消费端接 ──

  // 红利：典章越厚→朝廷正统/稳固加成（封顶·防堆料失衡）。合法性/稳定消费端后续接。
  function legitimacyBonus(GM) {
    var n = count(GM);
    return Math.min(15, Math.round(n * 1.5));   // 每祖制 +1.5·封顶 +15
  }

  // 副作用·成宪难改：改「某条已著为祖制的制度本身」的额外阻力（成宪后越久越僵·封顶）。
  // 需 kind+source 命中一条祖制才 >0 → 待 slice-2 接 office/科举 源头(带持久 source)方对具名衙门/范式生效。改制/罢制消费端后续接。
  function abolishFriction(GM, kind, sourceId) {
    var d = _ensure(GM); if (!d) return 0;
    var s = d.statutes.find(function (x) { return x && x.kind === kind && x.source === sourceId; });
    if (!s) return 0;
    var age = Math.max(0, ((GM && GM.turn) || 0) - (s.maturedTurn || 0));   // 成宪后历时
    return Math.min(40, 15 + age);   // 基础 15 + 每回合 +1·封顶 40（祖宗成法不可轻违）
  }

  // 副作用·王朝越僵（general）：典章越厚→朝野守成·一切改制普遍阻力↑（count-based·封顶）。
  // 区别于 abolishFriction（改"某条具名祖制本身"）——此为整体制度惰性，即刻可 felt（无需具名 source）。
  function rigidityFriction(GM) {
    var n = count(GM);
    return Math.min(20, Math.round(n * 1.2));   // 每祖制 +1.2·封顶 +20（成宪愈多则更张愈难）
  }

  // AI 叙事注入（最安全的 felt 消费·体现双刃：赖祖制之稳、困成宪之僵）
  function promptInjection(GM) {
    var st = list(GM); if (!st.length) return '';
    var top = st.slice(0, 5).map(function (s) { return s.name; }).join('、');
    return '【典章·祖制】本朝已著成宪 ' + st.length + ' 条（' + top + (st.length > 5 ? '…等' : '') +
      '）。累世成宪予朝廷正统与稳固，然祖制既立则难轻改——欲更张者必逾「祖宗成法」之阻，朝野动辄以「违背祖制」相诘。叙事宜体现：既赖祖制之稳，亦困于成宪之僵。';
  }

  TM.Dianzhang = { tick: tick, list: list, count: count, has: has, enshrine: enshrine,
    recordOfficeReform: recordOfficeReform, onInstitutionAbolished: onInstitutionAbolished,
    legitimacyBonus: legitimacyBonus, abolishFriction: abolishFriction, rigidityFriction: rigidityFriction,
    promptInjection: promptInjection, MATURE_TURNS: MATURE_TURNS };
})(typeof window !== 'undefined' ? window : globalThis);
