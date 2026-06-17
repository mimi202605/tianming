## Phase 2 删 9 字段·全消费者审计报告

### 字段定义位置汇总

**SC1 Schema 定义** (tm-ai-schema.js:196-218)
- npc_interactions: L198 - consumedBy: endturn-ai-infer:sc1b
- npc_letters: L199 - consumedBy: endturn-ai-infer:sc1b  
- npc_correspondence: L200 - consumedBy: endturn-ai-infer:sc1b
- cultural_works: L201 - consumedBy: endturn-ai-infer:sc1b
- faction_events: L96 - 无 consumedBy 标签（需补）
- faction_interactions_advanced: L215 - consumedBy: endturn-ai-infer:sc1c
- npc_schemes: L216 - consumedBy: endturn-ai-infer:sc1c
- hidden_moves: L217 - consumedBy: endturn-ai-infer:sc1c
- fengwen_snippets: L218 - consumedBy: endturn-ai-infer:sc1c

特殊字段：
- faction_relation_shift: tm-endturn-apply.js:2423 读取但**不在 schema.js 中定义**
