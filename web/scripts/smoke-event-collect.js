#!/usr/bin/env node
'use strict';
// smoke-event-collect — 事件收编御案时政(v0.2 第二步·Slice A 史实事件 + Slice B AI critical → currentIssues)
// 静态断言收编逻辑到位(开关门控/转 issue/push currentIssues/不投死旁支 StoryEventBus)。行为靠真机。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); A++; console.log('  ok ' + m); }
console.log('smoke-event-collect');

// ── Slice A: 剧本 rigidHistoryEvents 史实 → currentIssues(原 showHistoryEventModal 独立框降出口) ──
const he = fs.readFileSync(path.join(ROOT, 'tm-history-events.js'), 'utf8');
ok(/_eventAdjudicationOn\(\) && typeof _pushHistoryEventToIssues/.test(he), 'A: checkHistoryEvents 开关开→收编');
ok(/_pushHistoryEventToIssues\(event\)/.test(he), 'A: 走 _pushHistoryEventToIssues');
ok(/showHistoryEventModal\(event\)/.test(he), 'A: 开关关→原独立框(零回归)');
ok(/function _historyEventToIssue/.test(he), 'A: 史实 event→issue 转换 helper');
ok(/GM\.currentIssues\.push\(issue\)/.test(he), 'A: push currentIssues');
ok(/category: '史实'/.test(he), 'A: issue category=史实');
ok(/effect: b\.impact/.test(he), 'A: branch.impact→choice.effect(固定·_chooseIssueOption 兜底)');
ok(/aiHint: b\.aiHint/.test(he), 'A: branch.aiHint→choice.aiHint(AI 裁定用)');

// ── Slice B: AI 主推演 critical events → currentIssues(非死旁支 StoryEventBus) ──
const ap = fs.readFileSync(path.join(ROOT, 'tm-ai-change-applier.js'), 'utf8');
ok(/收编进御案时政/.test(ap), 'B: applier critical→收编御案时政');
ok(/global\._eventAdjudicationOn\(\)/.test(ap), 'B: 开关门控 _eventAdjudicationOn');
ok(/_G2\.currentIssues\.push/.test(ap), 'B: push currentIssues');
ok(!/来源涌现[\s\S]{0,300}StoryEventBus\.enqueue/.test(ap), 'B: events 块不再投死旁支 StoryEventBus');
ok(/if \(global\.addEB\) global\.addEB\(e\.category \|\| '事'/.test(ap), 'B: 寻常事件仍 addEB 播报(寄生为主·零回归)');

// ── prompt + schema: critical 引导/说明(currentIssues 语义,非"弹模态") ──
const pr = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
ok(/critical:true/.test(pr) && /御案时政/.test(pr), 'B: prompt 教 AI 标 critical→御案时政待决要务');
ok(/节制使用/.test(pr), 'B: prompt 强调节制');
const sc = fs.readFileSync(path.join(ROOT, 'tm-ai-schema.js'), 'utf8');
ok(/收编进御案时政 currentIssues/.test(sc), 'B: schema events critical→currentIssues 说明');

// ── Slice C: 阈值刚性事件(triggerRigidEvent)独立 modal → 事件栏 addEB(无决断警讯归近事·不污染 currentIssues 待决) ──
const hev = fs.readFileSync(path.join(ROOT, 'tm-history-events.js'), 'utf8');
ok(/阈值刚性事件无决断分支/.test(hev), 'C: triggerRigidEvent 收编注释在位');
ok(/_eventAdjudicationOn\(\) && typeof addEB === 'function'/.test(hev), 'C: 开关门控 + addEB 可用判定');
ok(/addEB\(config\.ebCategory \|\| '警讯'/.test(hev), 'C: 开关开→事件栏 addEB 统一播报(消灭独立系统事件 modal)');
ok((hev.match(/openGenericModal\('系统事件'/g) || []).length === 2, 'C: 开关关→原 openGenericModal 保留(零回归·else + catch 兜底两处)');
// 锚到注释之后的实际代码行(注释本身含「不进 currentIssues」字样·须排除)
const rigidBlock = hev.slice(hev.indexOf("addEB(config.ebCategory"));
ok(!/currentIssues/.test(rigidBlock), 'C: 阈值收编实代码段不碰 currentIssues(警讯归事件栏·非御案时政待决)');

// ── Slice D: 编辑器事件(GM.events)被 AI 触发时·带 choices → currentIssues 御案时政(tm-endturn-apply.js·中文落盘为 \u 转义·正则按 \u 匹配) ──
const ap2 = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');
ok(/var _evToIssue = \(typeof _eventAdjudicationOn === 'function' && _eventAdjudicationOn\(\)/.test(ap2), 'D: 开关门控判定 _evToIssue');
ok(/Array\.isArray\(gmEvt\.choices\) && gmEvt\.choices\.length/.test(ap2), 'D: 仅带 choices 的编辑器事件进御案时政');
ok(/GM\.currentIssues\.push\(\{[\s\S]{0,400}sourceEventId: gmEvt\.id/.test(ap2), 'D: push currentIssues(含 sourceEventId 去重锚)');
ok(/choices: _evChoices\.slice\(\)/.test(ap2), 'D: choices 透传(玩家在御案时政决断·_chooseIssueOption 开关开走 AI 裁定)');
ok(/else \{[\s\S]{0,90}addEB\('\\u4E8B\\u4EF6', gmEvt\.name \+ '\\u5DF2\\u89E6\\u53D1'/.test(ap2), 'D: 无 choices→原 addEB 事件栏(else 分支·零回归)');

// ── Slice E: 剧本 events 收编 — Slice D 扩展认 playerChoices(空架子兜底) + prompt 引导走御案时政 ──
ok(/var _evChoices = \(Array\.isArray\(gmEvt\.choices\) && gmEvt\.choices\.length\) \? gmEvt\.choices/.test(ap2), 'E: 选项来源 choices 优先(tianqi7 用此)');
ok(/Array\.isArray\(gmEvt\.playerChoices\) && gmEvt\.playerChoices\.length/.test(ap2), 'E: playerChoices 兜底判定');
ok(/gmEvt\.playerChoices\.map\(function\(_pc\)\{ return \{ text: _pc\.label/.test(ap2), 'E: playerChoices→choice 映射(label→text/consequence→aiHint)');
const pr2 = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
ok(/var _pcUnify = \(typeof _eventAdjudicationOn === 'function' && _eventAdjudicationOn\(\)\)/.test(pr2), 'E: prompt 开关门控 _pcUnify');
ok(/if \(_pcUnify\) \{[\s\S]{0,260}通过 timeline_triggers 上报/.test(pr2), 'E: 开关开→引导 timeline_triggers 进御案时政');
ok(/\} else \{[\s\S]{0,260}在 shizhengji\/zhengwen 中描述选项/.test(pr2), 'E: 开关关→原叙事 surface 文案(零回归)');

console.log('\n结果: ' + A + ' 通过 / 0 失败');
