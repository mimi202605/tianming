// @ts-check
// ============================================================
// tm-endturn-pipeline-types.js — endTurn 管道类型契约
// 创建：slice 1·2026-05-07·additive
// 仅 JSDoc typedef·无运行时代码
// 见 web/docs/endturn-data-flow.md §4 (6-step 切分) + §7 (3 决定)
// ============================================================

/**
 * @typedef {Object} EndturnCtx
 * @property {Object} input - 玩家输入(edicts/xinglu/memRes/oldVars/edictActions/tyrantActivities)
 * @property {Object} snapshots - 回合前快照(prevGuoku/prevNeitang/prevPopulation/prevVars)
 * @property {Object} prompt - prompt.build 产物(sysP/tp)
 * @property {Object} subcalls - sc0/sc05/sc1/sc1b/sc1c 调用基础设施
 * @property {Object} results - sc1+所有子调用结果(替代 GM._turnAiResults 显式化·slice 3 落地)
 * @property {Object} apply - apply.writeBack 产物
 * @property {Object} followup - followup.run 产物
 * @property {Object} record - record.finalize 产物
 * @property {EndturnCrossTurn} crossTurn - 跨回合 channel(决定 1·替代 30+ GM._* 字段·slice 4 迁移)
 * @property {DeferredStep[]} deferredSteps - 等外部事件触发的延后步骤(决定 2·slice 6 启用)
 * @property {EndturnMeta} meta - 执行元数据
 */

/**
 * @typedef {Object} EndturnCrossTurn
 * 决定 1·上回合产出→本回合 prompt 注入的跨回合通信容器
 * 字段镜像自 GM._*·slice 4 起渐进迁移·GM._* 兜底保留
 * @property {*} couplingReport
 * @property {*} decisionAlerts
 * @property {*} healthAlerts
 * @property {*} metricHistory
 * @property {*} eraProgressReport
 * @property {*} tradeReport
 * @property {*} diplomaticMissions
 * @property {*} buildingOutputReport
 * @property {*} edictExecutionReport
 * @property {*} foreshadows
 * @property {*} plotThreads
 * @property {*} aiMemory
 * @property {*} consolidatedMemory
 * @property {*} courtRecords
 * @property {*} factionUndercurrents
 * @property {*} factionNarrative
 * @property {*} decisionEchoes
 * @property {*} currentTrend
 * @property {*} npcCognition
 * @property {*} stateBoard
 * @property {*} causalGraph
 * @property {*} subcallTimings
 * @property {*} edictEfficacyReport
 * @property {*} chronicle
 * @property {*} historicalDeviations
 */

/**
 * @typedef {Object} DeferredStep
 * 决定 2·延后步骤显式登记
 * 替代当前 _pendingShijiModal.deferredPhase5 闭包模式
 * @property {string} when - 触发条件标识(如 'court-close')
 * @property {(ctx: EndturnCtx) => Promise<void>} fn - 延后执行的函数
 * @property {string} [name] - 调试用名称
 */

/**
 * @typedef {Object} PipelineStep
 * 6-step 管道的 step 定义
 * @property {string} name - step 名(prep / plan-prefetch / ai / post-ai-edict / systems / render-and-finalize)
 * @property {(ctx: EndturnCtx) => Promise<EndturnCtx>} fn - step 执行函数
 * @property {('abort'|'continue'|'retry')} [onError] - 决定 3·失败策略·默认 'abort'
 * @property {string[]} [parallel] - 与本 step 并行运行的 sibling step 名(slice 2+ 启用)
 * @property {string[]} [reads] - 声明读取的 GM.* 字段(audit 用·当前不强制)
 * @property {string[]} [writes] - 声明写入的 GM.* 字段(audit 用·当前不强制)
 */

/**
 * @typedef {Object} StepLogEntry
 * @property {string} step
 * @property {number} ms
 * @property {boolean} ok
 * @property {Error} [error]
 * @property {boolean} [retried]
 * @property {boolean} [skipped]
 */

/**
 * @typedef {Object} EndturnMeta
 * @property {number} turn
 * @property {number} startTime
 * @property {StepLogEntry[]} stepLog
 * @property {StepLogEntry[]} [lastRun]
 */

;(function(){ /* 仅 typedef·无运行时副作用 */ })();
