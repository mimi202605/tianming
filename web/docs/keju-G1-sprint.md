# 科举·Stage 2·Phase G·**G1·特科 shared infra·calendar + spawn paradigm**

**date**·2026-05-25
**status**·**file 已存·只缺 wiring + smoke**·doc 直补 + wire + test
**estimated**·~0.5 d (file done·wiring 1h + smoke 30min)
**dependency**·F2/F3/F4c source pool paradigm·_cc2_collectAgendaSources·initKejuSystem·endTurn pipeline
**flag gate**·`P.conf.useNewKejuD2=false` 默认 off

**红线 reminder**·
- 复用·跟 F2/F3/F4c 一致 pattern·`_kjConsume*ForAgenda` consume queue
- 触发自然政治·禁玄幻·寿诞/改元/大婚/边事/缺将/民族议题
- G1 不含 runner / journey / 题目·G2-G5 各自带
- audit-first·file 已 done·doc 补·wire verify

---

## 0·现状

| 项 | 状态 |
|---|---|
| **`tm-keju-special-exams.js`** | **✅ 262 行·full impl** (init / 4 trigger / spawn / consume) |
| **index.html script tag** | ❌ 缺·load 前必加 |
| **`initKejuSystem` _kjInitSpecialExamCalendar 调** | ❌ 缺·跟 _kjInitMentorIndex 同位 |
| **endTurn pipeline `_kjCheckSpecialExamTriggers` hook** | ❌ 缺·deferred phase5 + render-finalize |
| **`_cc2_collectAgendaSources` consume** | ❌ 缺·tm-chaoyi.js 跟 F2/F3/F4c 同位 |
| **smoke** | ❌ 缺·G1 4 trigger + cooldown + consume |

**结论**·file 完整·**只缺 4 处 wiring + smoke**·~1.5 h 工作量

---

## 1·sprint scope

### 1.1·wire 集成 (4 处)

| # | 文件 | 位置 | 加 |
|---|---|---|---|
| W1 | `index.html` | 跟 tm-keju-reform-presets-history.js 邻 | `<script src="tm-keju-special-exams.js?v=20260525-g1"></script>` |
| W2 | `tm-keju-runtime.js initKejuSystem` | 跟 `_kjInitMentorIndex()` 同位 | `if (typeof _kjInitSpecialExamCalendar === 'function') try { _kjInitSpecialExamCalendar(); } catch(_){}` |
| W3 | `tm-endturn-pipeline-steps.js` deferred phase5 + render-finalize | 跟 `_kjCheckYanguanQingyiTriggers` 同位 | `if (typeof _kjCheckSpecialExamTriggers === 'function') try { _kjCheckSpecialExamTriggers(); } catch(e){...}` |
| W4 | `tm-chaoyi.js _cc2_collectAgendaSources` | 跟 `_kjConsumeReformMemorialsForAgenda` 同位 | consume + `_cc2_pushAgendaSource` 4 source per type |

### 1.2·`_cc2` consume block (W4 详)

```js
// Phase G·G1·特科 spawn·走常朝 source pool (flag gate 在 _kjConsumeSpecialExamForAgenda 内)
if (typeof _kjConsumeSpecialExamForAgenda === 'function') {
  var _seList = _kjConsumeSpecialExamForAgenda();
  _seList.forEach(function(se) {
    var typeLbl = ({ enke:'恩科', wuju:'武举', fanyi:'翻译科', tongzi:'童子科' })[se.type] || se.type;
    var deptLbl = ({ enke:'礼部', wuju:'兵部', fanyi:'理藩院', tongzi:'礼部' })[se.type] || '礼部';
    _cc2_pushAgendaSource(out, seen, {
      source: '特科·' + typeLbl,
      title: typeLbl + '·' + se.reason,
      dept: deptLbl,
      presenter: null,   // 让 LLM 挑相应部官 NPC
      detail: se.reason + '·' + deptLbl + '请陛下圣裁',
      agendaType: 'request',
      importance: (se.type === 'wuju' && se.detail && se.detail.subtype === 'war-crisis') ? 8 : 6,
      controversial: 4,
      ref: 'kjSpecialExam:' + se.type + ':' + se.spawnedYear
    });
  });
}
```

### 1.3·smoke 设计·**`smoke-keju-special-exam.js`** (~25-30 case)

- §A·init·_kjInitSpecialExamCalendar·calendar 命名空间·从 preset copy·5 case
- §B·恩科 trigger·寿诞 60/70/80·改元·大婚·6 case
- §C·武举 trigger·war ≥60·缺将·periodic·startYear gate·5 case
- §D·翻译科 trigger·first-time·periodic·清剧本 only·4 case
- §E·童子科 trigger·5% rare·tongzi_enabled gate·3 case
- §F·cooldown·5/3/3/10 年限·_cooldownOk·3 case
- §G·spawn queue + consume·MAX 1/turn + MAX 1/agenda·3 case
- §H·flag gate·D2=false 全 noop·2 case

---

## 2·red line

| red line | 适应 |
|---|---|
| 复用 F2/F3/F4c paradigm | consume queue·source pool·same hook 位置 |
| 自然政治触发 | 全 trigger 是真历史 (寿诞 / 改元 / 大婚 / 边事 / 缺将 / 民族议题)·无玄幻 |
| flag gate | useNewKejuD2 默认 off·全 noop |
| G1 不含 runner | 只 spawn·G2-G5 各自带 journey + 题目 |
| 9 朝代 preset | 走 P.keju.specialExamCalendar (preset 配置) |
| audit-first | file 已 audit-completed·doc 补·wire verify |

---

## 3·post-G1·next

- G2·恩科 mini-keju (3-4 d·礼部 NPC 主导·谢恩大典 LLM·特赐进士)
- G3·武举 (4-5 d·兵部主导·御前比武·联动军事 system)
- G4·翻译科 (3-4 d·清专有·满汉双语)
- G5·童子科 (2-3 d·罕见·神童早卒/大才 路径)
