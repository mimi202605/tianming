'use strict';
// ============================================================
// smoke-memory-compress-consumer.js — 12 表记忆「周期压缩」消费者 M1 切片
//
// 命门：记忆的收敛/不膨胀撑「自洽不崩」。tm-memory-tables.js 的 insertRow 对超 maxLen 的
//   长字段只往 GM._memTables[sheet]._meta._compressQueue push {row,col,len}（tm-memory-tables.js:314-322）
//   + 发「待 AI 压缩」哨兵提示——全库无任何消费者读这个队列 → 长档字段无限膨胀、记忆断片。
//
// 本 smoke 验 TM.MemorySteward.consumeCompressQueue（本切片新增·确定性零 LLM）用真生产者
//   （MemTables.insertRow）造超长字段→跑压缩→断言：
//     (a) 字段收敛到 maxLen 限内
//     (b) _provenance 存证保留且能溯源回原条目（全文留档·source-link·drill-down·守「摘要不得替代证据」）
//     (c) 队列被清空（收敛核心）
//   附：append-only 表只压字段不删行、幂等重跑不二次压、越界队列项健壮丢弃、多表单趟消费。
//
// 纯 node·vm 顺序装载（镜像 index.html 序：source-bound → tables → steward）·不调真模型。
// ============================================================
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(cond, msg) { assert(cond, msg); passed++; }

// ── vm 上下文：ctx 即持久 global（window/globalThis 自指）·注入 console ──
const ctx = { console, Date, Math, JSON };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}
// source-bound 三件套可选（在则压缩 provenance 额外挂 source-bound 元数据·与 L2/L3 同源）
['tm-memory-trace.js', 'tm-memory-evidence-registry.js', 'tm-memory-source-bound.js',
 'tm-memory-tables.js', 'tm-memory-steward.js'].forEach(load);

const MemTables = ctx.MemTables;
const Steward = ctx.TM && ctx.TM.MemorySteward;
ok(MemTables && typeof MemTables.insertRow === 'function', 'MemTables 装载·insertRow 可用');
ok(Steward && typeof Steward.consumeCompressQueue === 'function', 'TM.MemorySteward.consumeCompressQueue 已导出');
const HAS_SOURCEBOUND = !!(ctx.TM && ctx.TM.MemorySourceBound && typeof ctx.TM.MemorySourceBound.buildSummaryMetadata === 'function');

// ── 造局：新开一局·turn=3 ──
ctx.GM = { turn: 3, _memTables: {} };

// charProfile(idx2·非 append-only)·生平要事(col6·maxLen 300)
const longBio = '【生平】' + '事'.repeat(500);          // 504 字 > 300
const r1 = MemTables.insertRow('charProfile', { '姓名': '张三', '生平要事': longBio });
ok(r1 && r1.ok, 'charProfile 插入成功');

// majorEventsBrief(idx8·append-only·coded)·事件摘要(col5·maxLen 300)
const longBrief = '【大事】' + '录'.repeat(500);         // 504 字 > 300
const r2 = MemTables.insertRow('majorEventsBrief', { '回合': '3', '主体': '某公', '事件摘要': longBrief });
ok(r2 && r2.ok, 'majorEventsBrief(append-only) 插入成功');

const cp = ctx.GM._memTables.charProfile;
const meb = ctx.GM._memTables.majorEventsBrief;
const mebRowsBefore = meb.rows.length;

// ── 生产者确已入队 + 字段确已超限（前置事实）──
ok(cp._meta._compressQueue && cp._meta._compressQueue.length === 1, '生产者：charProfile 入队 1 项');
ok(meb._meta._compressQueue && meb._meta._compressQueue.length === 1, '生产者：majorEventsBrief 入队 1 项');
ok(cp.rows[0][6].length > 300, '压缩前：charProfile.生平要事 超 maxLen(300)');
ok(meb.rows[meb.rows.length - 1][5].length > 300, '压缩前：majorEventsBrief.事件摘要 超 maxLen(300)');

// ── 跑消费者（单趟消全表·确定性·无需 key/模型）──
const res = Steward.consumeCompressQueue(ctx.GM);
ok(res && res.compressed === 2, '一趟消费压了 2 个字段（跨两表）· got=' + (res && res.compressed));
ok(res.scannedSheets === 2 && res.skipped === 0, '扫到 2 张有队列的表·无跳过');
ok(Array.isArray(res.sheets) && res.sheets.length === 2, '返回逐表统计（2 表）');

// ── 断言 (a) 字段收敛到限内 ──
ok(cp.rows[0][6].length <= 300 && cp.rows[0][6].length < longBio.length, '(a) charProfile.生平要事 收敛到 <=300 且确实变短');
ok(meb.rows[meb.rows.length - 1][5].length <= 300, '(a) majorEventsBrief.事件摘要 收敛到 <=300');

// ── 断言 (c) 队列被清空 ──
ok(cp._meta._compressQueue.length === 0, '(c) charProfile 压缩队列已清空');
ok(meb._meta._compressQueue.length === 0, '(c) majorEventsBrief 压缩队列已清空');

// ── 断言 (b) provenance 保留且能溯源原条目 ──
const prov = cp._meta._compressProvenance;
ok(Array.isArray(prov) && prov.length === 1, '(b) charProfile 留 1 条 provenance 存证');
const p0 = prov[0];
ok(p0.original === longBio, '(b) provenance 全文留原证据（摘要不得替代证据·可 drill-down）');
ok(p0.sheet === 'charProfile' && p0.row === 0 && p0.col === 6 && p0.column === '生平要事', '(b) provenance 指回源条目(表/行/列)');
ok(p0.origLen === longBio.length && p0.compressedLen === cp.rows[0][6].length && p0.maxLen === 300, '(b) provenance 记录原长/压后长/上限');
ok(p0.method === 'deterministic-truncate' && p0.llmSummaryPending === true, '(b) 标注确定性截断·LLM 摘要待后续增强');
ok(cp.rows[0][6].indexOf(p0.id) >= 0, '(b) 压后字段内含 source-link 溯源 id（cell→存证 drill-down）');
ok(cp.rows[0][6].indexOf('【生平】') === 0, '(b) 压后字段保留原文头段（可读语境·非不透明替换）');
// source-bound 集成为可选增强·不作硬依赖：若挂上则须自洽(有 id/contentHash)；未挂也可接受
//   （minimal GM 下 buildSummaryMetadata 可能返回空→_provenance 静默降级）。核心存证(p0.original)自足·不依赖它。
if (p0.sourceMeta) ok(p0.sourceMeta.id || p0.sourceMeta.contentHash, '(b+) source-bound 元数据自洽(id/contentHash·与 L2/L3 同源)');
else ok(true, '(b+) source-bound 元数据未挂(降级)·核心 provenance 自足不依赖它 [sourceBoundLoaded=' + HAS_SOURCEBOUND + ']');

// append-only 表：只压字段·不删行
ok(meb.rows.length === mebRowsBefore, 'append-only：压缩只压字段·行数不变(未删行)');
const pMeb = meb._meta._compressProvenance;
ok(Array.isArray(pMeb) && pMeb.some(function (p) { return p.original === longBrief; }), 'append-only：原证据同样全文留档');

// ── 幂等：把已压字段的陈旧项再塞回队列·重跑不应二次压 ──
const cellAfter = cp.rows[0][6];
const provLenAfter = prov.length;
cp._meta._compressQueue = [{ row: 0, col: 6, len: longBio.length }]; // 陈旧项(该 cell 现已在限内)
const res2 = Steward.consumeCompressQueue(ctx.GM);
ok(res2.compressed === 0 && res2.skipped >= 1, '幂等：已在限内的陈旧项被跳过·不二次压');
ok(cp.rows[0][6] === cellAfter, '幂等：字段不被二次改写');
ok(cp._meta._compressProvenance.length === provLenAfter, '幂等：不追加重复存证');
ok(cp._meta._compressQueue.length === 0, '幂等：陈旧项仍被清出队列');

// ── 健壮：越界行号的陈旧队列项·丢弃不崩 ──
const org = ctx.GM._memTables.organizations;               // ensureInit 已建·空表
org._meta._compressQueue = [{ row: 99, col: 4, len: 999 }]; // 宗旨 col4·但行 99 不存在
const res4 = Steward.consumeCompressQueue(ctx.GM);
ok(org._meta._compressQueue.length === 0 && res4.skipped >= 1, '健壮：越界行号项被丢弃·队列清空·不抛错');

console.log('[smoke-memory-compress-consumer] pass assertions=' + passed + (HAS_SOURCEBOUND ? ' (with source-bound)' : ' (no source-bound)'));
