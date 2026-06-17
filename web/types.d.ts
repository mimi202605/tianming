// ==========================================================
// 天命 (Tianming) — TypeScript 类型声明文件
// 仅供 VSCode IntelliSense 使用，不改变任何运行时代码
// ==========================================================

// ----------------------------------------------------------
//  Character (角色)
// ----------------------------------------------------------

/** 角色记忆条目 */
interface CharacterMemory {
  text: string;
  importance: number;
  turn?: number;
  category?: string;
}

/** 角色伤痕/创伤 */
interface CharacterScar {
  text: string;
  turn?: number;
  severity?: number;
}

/** 角色对他人的印象 */
interface CharacterImpression {
  target: string;
  attitude: number;
  reason?: string;
}

/** 角色 NPC 意图 */
interface NpcIntent {
  type: string;
  target?: string;
  urgency?: number;
  description?: string;
}

/** 角色 */
interface Character {
  /** 唯一名称 */
  name: string;
  /** 字/号/别称 */
  title?: string;
  /** 年龄 */
  age?: number;
  /** 性别 */
  gender?: string;
  /** 所属势力名 */
  faction?: string;
  /** 忠诚度 0-100 */
  loyalty?: number;
  /** 野心 0-100 */
  ambition?: number;
  /** 智力 0-100 */
  intelligence?: number;
  /** 武勇 0-100 */
  valor?: number;
  /** 统率 0-100 */
  military?: number;
  /** 政务 0-100 */
  administration?: number;
  /** 魅力 0-100 */
  charisma?: number;
  /** 外交 0-100 */
  diplomacy?: number;
  /** 仁德 0-100 */
  benevolence?: number;
  /** 德行 0-100 */
  virtue?: number;
  /** 合法性 0-100 */
  legitimacy?: number;
  /** 压力 0-100 */
  stress?: number;
  /** 健康 0-100 */
  health?: number;
  /** 是否存活 */
  alive?: boolean;
  /** 是否已死亡 */
  dead?: boolean;
  /** 是否为玩家角色 */
  isPlayer?: boolean;
  /** 官职名称 */
  officialTitle?: string;
  /** 品级 (1-9, 1=最高) */
  rankLevel?: number;
  /** 指定继承人名称 */
  designatedHeirId?: string;
  /** 继承法 */
  successionLaw?: string;
  /** 性别限制: 'male'|'female'|'none' */
  genderRestriction?: string;
  /** 重要度 (影响 AI 推演频率) */
  importance?: number;
  /** 家族名 */
  family?: string;
  /** 当前所在地 */
  location?: string;
  /** 性格描述 */
  personality?: string;
  /** 信仰 */
  faith?: string;
  /** 文化圈 */
  culture?: string;
  /** 传记 */
  bio?: string;
  /** 描述 */
  desc?: string;
  /** 外貌描述 */
  appearance?: string;
  /** 唯一 ID */
  id?: string;
  /** 配偶名 */
  spouse?: string;
  /** 子女名列表 */
  children?: string[];
  /** 别名列表（模糊查找用） */
  _aliases?: string[];
  /** NPC 记忆 */
  _memory?: CharacterMemory[];
  /** 记忆归档 */
  _memArchive?: CharacterMemory[];
  /** 心理创伤 */
  _scars?: CharacterScar[];
  /** 对他人的印象 */
  _impressions?: CharacterImpression[];
  /** 当前 NPC 意图 */
  _npcIntent?: NpcIntent;
  /** 上次意图分析回合 */
  _lastIntentTurn?: number;
  /** 每回合健康衰减 */
  _healthDecay?: number;
  /** 死亡概率 */
  _deathProbability?: number;
  /** 允许任意扩展字段 */
  [key: string]: any;
}

// ----------------------------------------------------------
//  Faction (势力)
// ----------------------------------------------------------

/** 势力间关系条目 */
interface FactionRelationEntry {
  from: string;
  to: string;
  type?: string;
  value?: number;
  desc?: string;
}

/** 势力 */
interface Faction {
  /** 势力名称 */
  name: string;
  /** 领袖名 */
  leader?: string;
  /** 综合实力 0-100 */
  strength?: number;
  /** 领土列表 */
  territories?: string[];
  /** 首都/据点 */
  capital?: string;
  /** UI 颜色 */
  color?: string;
  /** 是否已灭亡 */
  destroyed?: boolean;
  /** 继承法 */
  successionLaw?: string;
  /** 势力类型 */
  type?: string;
  /** 文化描述 */
  culture?: string;
  /** 目标 */
  goal?: string;
  /** 描述 */
  desc?: string;
  /** 势力间关系（运行时） */
  _factionRelations?: FactionRelationEntry[];
  /** 允许任意扩展字段 */
  [key: string]: any;
}

// ----------------------------------------------------------
//  EraState (时代状态)
// ----------------------------------------------------------

interface EraState {
  politicalUnity: number;
  centralControl: number;
  legitimacySource: string;
  socialStability: number;
  economicProsperity: number;
  culturalVibrancy: number;
  bureaucracyStrength: number;
  militaryProfessionalism: number;
  landSystemType: string;
  dynastyPhase: string;
  contextDescription: string;
}

// ----------------------------------------------------------
//  EraProgress (时代双进度条)
// ----------------------------------------------------------

interface EraProgress {
  collapse: number;
  restoration: number;
}

// ----------------------------------------------------------
//  TurnChanges (回合变更追踪)
// ----------------------------------------------------------

interface TurnChanges {
  variables: any[];
  characters: any[];
  factions: any[];
  parties: any[];
  classes: any[];
  military: any[];
  map: any[];
}

// ----------------------------------------------------------
//  EventLogEntry (事件日志条目)
// ----------------------------------------------------------

interface EventLogEntry {
  turn: number;
  type: string;
  text: string;
  time?: string;
}

// ----------------------------------------------------------
//  Harem (后宫系统)
// ----------------------------------------------------------

interface Harem {
  heirs: any[];
  succession: string;
  pregnancies: any[];
}

// ----------------------------------------------------------
//  OfficeNode (官职树节点)
// ----------------------------------------------------------

interface OfficePosition {
  name: string;
  rank?: number | string;
  holder?: string;
  [key: string]: any;
}

interface OfficeNode {
  name: string;
  functions?: string[];
  positions?: OfficePosition[];
  children?: OfficeNode[];
  [key: string]: any;
}

// ----------------------------------------------------------
//  GameState (GM — 运行时游戏状态)
// ----------------------------------------------------------

interface GameState {
  /** 游戏是否正在运行 */
  running: boolean;
  /** 当前剧本场景 ID */
  sid: string;
  /** 当前回合数 */
  turn: number;
  /** 存档名 */
  saveName?: string;
  /** 通用变量表 */
  vars: Record<string, number>;
  /** 角色关系 */
  rels: Record<string, any>;
  /** 角色列表 */
  chars: Character[];
  /** 势力列表 */
  facs: Faction[];
  /** 物品列表 */
  items: any[];
  /** 军队列表 */
  armies: any[];
  /** 事件日志 */
  evtLog: EventLogEntry[];
  /** 对话历史 */
  conv: any[];
  /** 是否忙碌 (AI 调用中) */
  busy: boolean;

  // ---- 核心数值指标（由编辑器变量决定） ----
  /** 赋税压力 */
  taxPressure?: number;
  /** 国库 */
  stateTreasury?: number;
  /** 内帑 */
  privateTreasury?: number;
  /** 边患指数 */
  borderThreat?: number;

  /** 当前季度议程 */
  currentQuarterAgenda?: any[];
  /** 当前季度焦点 */
  currentQuarterFocus?: string | null;

  // ---- 官职系统 ----
  /** 官职树 (运行时副本) */
  officeTree: OfficeNode[];
  /** 官职变动记录 */
  officeChanges: any[];

  // ---- 时代与年号 ----
  /** 时代状态 */
  eraState: EraState;
  /** 时代状态历史 */
  eraStateHistory: EraState[];
  /** 时代双进度条 */
  eraProgress?: EraProgress;
  /** 当前年号 */
  eraName?: string;
  /** 年号列表 */
  eraNames?: any[];
  /** 当前天数偏移 */
  currentDay?: number;

  // ---- 地图与省份 ----
  /** 省份统计数据 */
  provinceStats: Record<string, any>;
  /** 地图数据 */
  mapData?: any;

  // ---- 历史与编年 ----
  /** 史记历史 */
  shijiHistory: any[];
  /** 月度编年 */
  monthlyChronicles: any[];
  /** 年度编年 */
  yearlyChronicles: any[];
  /** 编年后记 */
  chronicleAfterwords: any[];
  /** 起居注 */
  qijuHistory: any[];
  /** 纪事录 */
  jishiRecords: any[];
  /** 编年条目 */
  biannianItems: any[];
  /** 历史事件记录 */
  historicalEvents: any[];
  /** 已触发的历史事件 */
  triggeredHistoryEvents?: Record<string, boolean>;

  // ---- 奏章/问对/信件 ----
  /** 奏章列表 */
  memorials: any[];
  /** 问对历史 */
  wenduiHistory: Record<string, any>;
  /** 问对对象 */
  wenduiTarget?: string | null;
  /** 信件 */
  letters?: any[];

  // ---- 角色弧线与记忆 ----
  /** 角色弧线 */
  characterArcs: Record<string, any>;
  /** 玩家决策记录 */
  playerDecisions: any[];
  /** 记忆归档 */
  memoryArchive: any[];
  /** 记忆锚点 */
  memoryAnchors: any[];
  /** AI 自动摘要 */
  autoSummary: string;
  /** 已摘要的回合 */
  summarizedTurns: number[];

  // ---- NPC 系统 ----
  /** NPC 上下文 */
  npcContext?: any;
  /** 全部角色备份 (含已死) */
  allCharacters: any[];

  // ---- 社会系统 ----
  /** 阶层列表 */
  classes: any[];
  /** 党派列表 */
  parties: any[];
  /** 外部势力 */
  extForces: any[];
  /** 亲疏关系 */
  affinityMap: Record<string, any>;
  /** 得罪群体分数 */
  offendGroupScores: Record<string, number>;
  /** 激活的反弹 */
  activeRebounds: any[];
  /** 已触发的得罪事件 */
  triggeredOffendEvents: Record<string, boolean>;
  /** 恩怨记录 */
  enYuanRecords?: any[];
  /** 门生网络 */
  patronNetwork?: any[];

  // ---- 阴谋系统 ----
  /** 活跃阴谋 */
  activeSchemes: any[];
  /** 阴谋冷却 */
  schemeCooldowns?: Record<string, number>;
  /** 事件冷却 */
  eventCooldowns?: Record<string, number>;

  // ---- 军事系统 ----
  /** 行军命令 */
  marchOrders?: any[];
  /** 围城列表 */
  activeSieges?: any[];
  /** 战斗列表 */
  activeBattles?: any[];
  /** 战斗历史 */
  battleHistory?: any[];
  /** 活跃战争 */
  activeWars?: any[];
  /** 条约列表 */
  treaties?: any[];

  // ---- 科技/国策 ----
  /** 科技树 */
  techTree: any[];
  /** 国策树 */
  civicTree: any[];

  // ---- 后宫与家族 ----
  /** 后宫 */
  harem: Harem;
  /** 家族 */
  families: Record<string, any>;

  // ---- 建筑系统 ----
  /** 建筑列表 */
  buildings?: any[];
  /** 建筑队列 */
  buildingQueue?: any[];

  // ---- 势力关系 ----
  /** 势力关系 */
  factionRelations: FactionRelationEntry[];
  /** 势力事件 */
  factionEvents: any[];

  // ---- 待处理 ----
  /** 待处理后果 */
  pendingConsequences: any[];
  /** 玩家待办任务 */
  playerPendingTasks: any[];
  /** 玩家角色 ID */
  playerCharacterId?: string | null;
  /** 玩家能力 */
  playerAbilities?: Record<string, number>;
  /** 驿站系统 */
  postSystem?: any;

  // ---- 回合变更 ----
  /** 回合变更追踪 */
  turnChanges: TurnChanges;

  // ---- 暴政/昏君 ----
  _tyrantDecadence: number;
  _tyrantHistory: any[];

  // ---- 精力系统 ----
  _energy: number;
  _energyMax: number;

  // ---- 诏令/决策 ----
  _edictTracker: any[];
  _plotThreads: any[];
  _decisionEchoes: any[];
  _edictSuggestions: any[];
  _approvedMemorials: any[];
  _achievements: any[];

  // ---- AI 记忆 ----
  _aiMemorySummaries: any[];
  _aiMemory?: any;
  _aiScenarioDigest?: any;

  // ---- 叙事可变事实层 ----
  _mutableFacts: any[];

  // ---- NPC 意图 ----
  _npcIntents?: Record<string, NpcIntent>;

  // ---- 健康/决策预警 ----
  _healthAlerts?: any[];
  _decisionAlerts?: any[];

  // ---- 朝廷记录 ----
  _courtRecords: any[];
  _factionHistory: any[];
  _factionUndercurrents: any[];
  _factionUndercurrentsHistory: any[];

  // ---- 考课 ----
  _annualReviewHistory: any[];
  _kejuPendingAssignment: any[];

  // ---- 继位事件 ----
  _successionEvent?: any;

  // ---- 京城/趋势/矛盾 ----
  _capital?: string;
  _currentTrend?: string;
  _contradictions?: any[];
  _foreshadows?: any[];

  // ---- 变量公式 ----
  _varMapping?: Record<string, string>;
  _varFormulas?: any[];

  // ---- 索引缓存 ----
  _indices?: {
    charByName: Map<string, Character>;
    facByName: Map<string, Faction>;
    partyByName?: Map<string, any>;
    classByName?: Map<string, any>;
    extForceByName?: Map<string, any>;
  } | null;

  // ---- RNG ----
  _rngState?: { seed: string; s: number };
  _rngCheckpoints?: Array<{ turn: number; state: { seed: string; s: number } }>;

  // ---- 破产 ----
  _bankruptcyTurns?: number;

  // ---- 刚性触发器 ----
  rigidTriggers?: Record<string, any>;

  // ---- R103·对话完整归档（被截断/压缩的老对话原文） ----
  _convArchive?: Array<{
    role: string;
    content: string;
    _turn?: number;
    _compressedAt?: number;
    _truncatedAt?: number;
  }>;

  // ---- 错误日志 ----
  _errorLog?: Array<{ ts: number; turn: number; type: string; message: string; stack: string }>;

  // ---- 允许任意扩展字段 ----
  [key: string]: any;
}

// ----------------------------------------------------------
//  ScriptData / P (剧本数据)
// ----------------------------------------------------------

/** 场景定义 */
interface Scenario {
  id: string;
  name: string;
  era?: string;
  role?: string;
  desc?: string;
  eraState?: EraState;
  [key: string]: any;
}

/** 玩家信息 */
interface PlayerInfo {
  playerRole: string;
  playerRoleCustom: string;
  leaderIsPlayer: boolean;
  factionName: string;
  factionType: string;
  factionLeader: string;
  factionLeaderTitle: string;
  factionTerritory: string;
  factionStrength: string;
  factionCulture: string;
  factionGoal: string;
  factionResources: string;
  factionDesc: string;
  characterName: string;
  characterTitle: string;
  characterFaction: string;
  characterAge: string;
  characterGender: string;
  characterPersonality: string;
  characterFaith: string;
  characterCulture: string;
  characterBio: string;
  characterDesc: string;
  characterAppearance: string;
  characterCharisma: string;
  coreContradictions: Array<{
    title: string;
    dimension: string;
    description: string;
    parties: string;
    severity: string;
  }>;
}

/** 游戏设置 */
interface GameSettings {
  enabledSystems: {
    items: boolean;
    military: boolean;
    techTree: boolean;
    civicTree: boolean;
    events: boolean;
    map: boolean;
    characters: boolean;
    factions: boolean;
    classes: boolean;
    rules: boolean;
    officeTree: boolean;
  };
  startYear: number;
  startMonth: number;
  startDay: number;
  enableGanzhi: boolean;
  enableGanzhiDay: boolean;
  enableEraName: boolean;
  eraNames: any[];
  daysPerTurn: number;
  turnDuration: number;
  turnUnit: string;
}

/** 时间配置 */
interface TimeConfig {
  daysPerTurn?: number;
  perTurn?: string;
  customDays?: number;
  [key: string]: any;
}

/** 变量定义 */
interface VariableDef {
  name: string;
  displayName?: string;
  isCore?: boolean;
  value?: number;
  min?: number;
  max?: number;
  [key: string]: any;
}

/** 变量集合（可为数组或结构体） */
type VariablesCollection =
  | VariableDef[]
  | { base: VariableDef[]; other: VariableDef[]; formulas: any[] };

/** 规则集 */
interface Rules {
  base: string;
  combat: string;
  economy: string;
  diplomacy: string;
}

/** 事件集 */
interface Events {
  historical: any[];
  random: any[];
  conditional: any[];
  story: any[];
  chain: any[];
}

/** 政府/官制 */
interface Government {
  name: string;
  description: string;
  selectionSystem: string;
  promotionSystem: string;
  nodes: OfficeNode[];
}

/** 建筑系统 */
interface BuildingSystem {
  enabled: boolean;
  buildingTypes: any[];
}

/** 驿站系统 */
interface PostSystem {
  enabled: boolean;
  postRules: any[];
}

/** 封臣系统 */
interface VassalSystem {
  enabled: boolean;
  vassalTypes: any[];
  vassalRelations: any[];
}

/** 称号系统 */
interface TitleSystem {
  enabled: boolean;
  titleRanks: any[];
  characterTitles: any[];
}

/** 经济配置 */
interface EconomyConfig {
  enabled: boolean;
  currency: string;
  baseIncome: number;
  tributeRatio: number;
  tributeAdjustment: number;
  taxRate: number;
  inflationRate: number;
  economicCycle: string;
  specialResources: string;
  tradeSystem: string;
  description: string;
  redistributionRate: number;
  tradeBonus: number;
  agricultureMultiplier: number;
  commerceMultiplier: number;
}

/** 得罪群体配置 */
interface OffendGroupsConfig {
  enabled: boolean;
  decayEnabled: boolean;
  decayRate: number;
  groups: any[];
}

/** 科举配置 */
interface KejuConfig {
  enabled: boolean;
  reformed: boolean;
  examIntervalNote: string;
  examNote: string;
}

/** 后宫配置 */
interface HaremConfig {
  rankSystem: any[];
  succession: string;
  haremDescription: string;
  successionNote: string;
  motherClanSystem: string;
  heirSelectionMethod: string;
}

/** 编年史配置 */
interface ChronicleConfig {
  yearlyEnabled: boolean;
  style: string;
  yearlyMinChars: number;
  yearlyMaxChars: number;
}

/** 军事配置 */
interface MilitaryConfig {
  /** 兵种类型 */
  unitTypes: any[];
  /** 战斗阶段 */
  battlePhases: Array<{ id: string; name: string }>;
  /** 动量配置 */
  momentumConfig: {
    winGain: number;
    losePenalty: number;
    max: number;
    min: number;
  };
}

/** AI 配置 */
interface AIConfig {
  key?: string;
  url?: string;
  model?: string;
  temp?: number;
  [key: string]: any;
}

/** 世界观条目 */
interface WorldEntry {
  [key: string]: any;
}

/** 世界设定 */
interface WorldConfig {
  history: string;
  politics: string;
  economy: string;
  military: string;
  culture: string;
  glossary: string;
  entries: WorldEntry[];
  rules: string;
}

/** 官职配置 */
interface OfficeConfig {
  costVariables: any[];
  shortfallEffects: string;
}

// ----------------------------------------------------------
//  MechanicsConfig (机制配置)
// ----------------------------------------------------------

/** 时代进度规则 */
interface EraProgressConfig {
  collapseRules: Array<{ condition: string; increment: number }>;
  restorationRules: Array<{ condition: string; increment: number }>;
  collapseThreshold: number;
  restorationThreshold: number;
}

/** 边患配置 */
interface BorderThreatConfig {
  warningThreshold: number;
  criticalThreshold: number;
  softFloor: { threshold: number; damping: number };
}

/** NPC 意图分析配置 */
interface NpcIntentConfig {
  highImportanceIntervalDays: number;
  midImportanceIntervalDays: number;
  lowImportanceIntervalDays: number;
}

/** 月度编年史配置 (机制层) */
interface MechanicsChronicleConfig {
  monthlyWordLimit: number;
  yearlyWordLimit: number;
  narratorRole: string;
}

/** 角色规则 */
interface CharacterRules {
  healthConfig: {
    monthlyDecay: number;
    ageAccelThreshold: number;
    ageAccelRate: number;
  };
  virtueRules: any[];
  legitimacyRules: any[];
}

/** 耦合规则 */
interface CouplingRule {
  source: string;
  target: string;
  condition?: string;
  effect?: string;
  [key: string]: any;
}

/** 决策定义 */
interface DecisionDef {
  id: string;
  name: string;
  description?: string;
  canShowExpr?: string;
  canExecuteExpr?: string;
  [key: string]: any;
}

/** 议程模板 */
interface AgendaTemplate {
  id?: string;
  name: string;
  description?: string;
  options?: Array<{ label: string; desc?: string }>;
  [key: string]: any;
}

/** 执行管线层级 */
interface ExecutionPipelineLayer {
  name: string;
  functionKey?: string | null;
  [key: string]: any;
}

/** 机制配置 (P.mechanicsConfig) */
interface MechanicsConfig {
  /** 编年史白名单事件类型 */
  chronicleWhitelist: string[];
  /** 状态耦合规则 */
  couplingRules: CouplingRule[];
  /** 执行率管线 */
  executionPipeline: ExecutionPipelineLayer[];
  /** 执行率下限 */
  executionFloor: number;
  /** NPC 行为类型 */
  npcBehaviorTypes: any[];
  /** NPC 意图分析配置 */
  npcIntentConfig: NpcIntentConfig;
  /** 月度/年度编年史配置 */
  chronicleConfig: MechanicsChronicleConfig;
  /** 政策树 */
  policyTree: any[];
  /** 角色规则 (健康/德行/合法性) */
  characterRules: CharacterRules;
  /** 重大决策 */
  decisions: DecisionDef[];
  /** 季度议程模板 */
  agendaTemplates: AgendaTemplate[];
  /** 时代进度配置 */
  eraProgress: EraProgressConfig;
  /** 边患配置 */
  borderThreat: BorderThreatConfig;
  /** 允许任意扩展字段 */
  [key: string]: any;
}

/** 剧本数据 (P) */
interface ScriptData {
  /** 剧本唯一 ID */
  id: string;
  /** 剧本名称 */
  name: string;
  /** 朝代 */
  dynasty: string;
  /** 皇帝/领袖 */
  emperor: string;
  /** 概述 */
  overview: string;
  /** 起始公元年 (负数=公元前) */
  startYear: number | null;
  /** 时代阶段提示 */
  dynastyPhaseHint: string;
  /** 开场白 */
  openingText: string;
  /** 全局规则 */
  globalRules: string;

  /** 玩家信息 */
  playerInfo: PlayerInfo;
  /** 游戏设置 */
  gameSettings: GameSettings;
  /** 时间配置 */
  time: TimeConfig | null;

  /** 场景列表 */
  scenarios: Scenario[];
  /** 角色模板 */
  characters: any[];
  /** 势力模板 */
  factions: any[];
  /** 党派 */
  parties: any[];
  /** 阶层 */
  classes: any[];
  /** 物品 */
  items: any[];

  /** 军事 */
  military: {
    troops: any[];
    facilities: any[];
    organization: any[];
    campaigns: any[];
    initialTroops: any[];
    militarySystem: any[];
  };
  /** 科技树 */
  techTree: { military: any[]; civil: any[] } | any[];
  /** 国策树 */
  civicTree: { city: any[]; policy: any[]; resource: any[]; corruption: any[] } | any[];

  /** 变量集合 */
  variables: VariablesCollection;
  /** 规则集 */
  rules: Rules;
  /** 事件集 */
  events: Events | any[];
  /** 时间线 */
  timeline: { past: any[]; future: any[] };
  /** 地图 */
  map: { items: any[] };
  /** 地图数据 */
  mapData: any;
  /** 外部势力 */
  externalForces: any[];
  /** 角色关系 */
  relations: any[];
  /** 势力间关系矩阵 */
  factionRelations: FactionRelationEntry[];

  /** 世界设定 */
  worldSettings: {
    culture: string;
    weather: string;
    religion: string;
    economy: string;
    technology: string;
    diplomacy: string;
  };

  /** 政府/官制定义 */
  government: Government;
  /** 官职树 */
  officeTree: OfficeNode[];
  /** 城市列表 */
  cities: any[];
  /** 时代状态 */
  eraState: EraState;

  /** 行政层级 */
  adminHierarchy: Record<string, any>;
  /** 建筑系统 */
  buildingSystem: BuildingSystem;
  /** 驿站系统 */
  postSystem: PostSystem;
  /** 封臣系统 */
  vassalSystem: VassalSystem;
  /** 称号系统 */
  titleSystem: TitleSystem;
  /** 官爵对应表 */
  officialVassalMapping: { mappings: any[] };

  /** 经济配置 */
  economyConfig: EconomyConfig;
  /** 目标/胜负条件 */
  goals: any[];
  /** 得罪群体配置 */
  offendGroups: OffendGroupsConfig;
  /** 科举配置 */
  keju: KejuConfig;
  /** 后宫配置 */
  haremConfig: HaremConfig;
  /** 战争配置 */
  warConfig: { casusBelliTypes: any[] };
  /** 外交配置 */
  diplomacyConfig: { treatyTypes: any[] };
  /** 阴谋配置 */
  schemeConfig: { enabled: boolean; schemeTypes: any[] };
  /** 决策配置 */
  decisionConfig: { decisions: any[] };
  /** 编年史配置 */
  chronicleConfig: ChronicleConfig;
  /** 事件约束 */
  eventConstraints: { enabled: boolean; types: any[] };

  /** 机制配置 */
  mechanicsConfig: MechanicsConfig;
  /** 军事配置 */
  militaryConfig: MilitaryConfig;

  /** AI 配置 */
  ai: AIConfig;
  /** 运行时配置 */
  conf: {
    verbosity?: string;
    debugLog?: boolean;
    gameMode?: string;
    [key: string]: any;
  };

  /** 世界百科 */
  world?: WorldConfig;
  /** 官职配置 */
  officeConfig?: OfficeConfig;
  /** 官署联动 */
  officeDeptLinks?: any[];

  /** Prompt 覆盖 */
  promptOverrides?: Record<string, string>;
  /** Balance 覆盖 */
  balanceOverrides?: Record<string, any>;
  /** 变量公式缓存 */
  _varFormulas?: any[];

  /** 游戏状态（存档时嵌入） */
  gameState?: GameState;

  /** 允许任意扩展字段 */
  [key: string]: any;
}

// ----------------------------------------------------------
//  BALANCE_CONFIG
// ----------------------------------------------------------

interface BalanceConfig {
  coupling: { maxDeltaPerTurn: number; enabled: boolean };
  execution: { floor: number; emptyDeptRate: number };
  softFloor: { threshold: number; damping: number };
  building: { maxOutputPerTurn: { money: number; grain: number; militaryStrength: number } };
  scheme: { maxPhasesAllowed: number; minProgressPerMonth: number };
}

// ----------------------------------------------------------
//  SettlementPipeline
// ----------------------------------------------------------

interface SettlementStepReport {
  id: string;
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
}

interface SettlementPipelineType {
  register(id: string, name: string, fn: (ctx: any) => void, priority?: number, schedule?: string): void;
  setEnabled(id: string, enabled: boolean): void;
  runBySchedule(schedule: string, context: any): SettlementStepReport[];
  runAll(context: any): SettlementStepReport[];
  runAllAsync(context: any): Promise<SettlementStepReport[]>;
  list(): Array<{ id: string; name: string; priority: number; enabled: boolean; schedule: string }>;
  clear(): void;
}

// ----------------------------------------------------------
//  GameEventBus
// ----------------------------------------------------------

interface GameEventBusType {
  on(event: string, fn: (data?: any) => void): void;
  once(event: string, fn: (data?: any) => void): void;
  off(event: string, fn?: (data?: any) => void): void;
  emit(event: string, data?: any): void;
  clear(): void;
  listEvents(): Record<string, number>;
}

// ----------------------------------------------------------
//  ChangeLog
// ----------------------------------------------------------

interface ChangeLogEntry {
  turn: number;
  category: string;
  target: string;
  field: string;
  oldVal: any;
  newVal: any;
  reason: string;
  ts: number;
}

interface ChangeLogType {
  record(category: string, target: string, field: string, oldVal: any, newVal: any, reason?: string): void;
  getByTurn(turn: number): ChangeLogEntry[];
  getByCategory(category: string, turn?: number): ChangeLogEntry[];
  getRecent(n?: number): ChangeLogEntry[];
  clear(): void;
  count(): number;
}

// ----------------------------------------------------------
//  DebugLog
// ----------------------------------------------------------

interface DebugLogType {
  categories: string[];
  enable(cat: string): void;
  disable(cat: string): void;
  log(category: string, ...args: any[]): void;
  warn(category: string, ...args: any[]): void;
  status(): string;
}

// ----------------------------------------------------------
//  AISubCallRegistry
// ----------------------------------------------------------

interface AISubCallDef {
  id: string;
  name: string;
  order: number;
  minDepth?: string;
  build?: (ctx: any) => Promise<string>;
  process?: (ctx: any, rawResponse: string) => void | Promise<void>;
  fallback?: (ctx: any) => void;
  retryCount?: number;
  enabled?: boolean;
  parallelGroup?: string;
}

interface AISubCallRegistryType {
  register(def: AISubCallDef): void;
  setEnabled(id: string, enabled: boolean): void;
  runPipeline(ctx: any, currentDepth: string): Promise<any>;
  list(): Array<{ id: string; name: string; order: number; minDepth: string; enabled: boolean }>;
  count(): number;
  clear(): void;
}

// ----------------------------------------------------------
//  DecisionRegistry
// ----------------------------------------------------------

interface DecisionRegistryType {
  loadFromConfig(): void;
  register(def: DecisionDef): void;
  canShow(decisionId: string, char: Character): boolean;
  canExecute(decisionId: string, char: Character): { ok: boolean; reason?: string };
  getAvailableForPlayer(): any[];
}

// ----------------------------------------------------------
//  PromptLayerCache
// ----------------------------------------------------------

interface PromptLayerCacheType {
  computeHash(): string;
  getFixedLayer(buildFn?: () => string): string;
  getSlowLayer(buildFn?: () => string): string;
  /** 7.2: 预加载固定层hash */
  preload(): void;
  _preloadedTurn?: number;
  clear(): void;
}

// ----------------------------------------------------------
//  ModelAdapter
// ----------------------------------------------------------

interface ModelAdapterType {
  detectFamily(modelStr?: string): string;
  getConfig(): { jsonWrap: string; tempDefault: number; jsonInstruction: string; maxRetry: number; supportsStreaming: boolean };
  wrapJsonInstruction(schema: string): string;
  getDefaultTemp(): number;
}

// ----------------------------------------------------------
//  TokenUsageTracker
// ----------------------------------------------------------

interface TokenUsageTrackerType {
  record(usage: { prompt_tokens?: number; completion_tokens?: number }): void;
  markTurnStart(): void;
  getTurnUsage(): number;
  getStats(): { promptTokens: number; completionTokens: number; totalTokens: number; totalCalls: number; estimatedCostUSD: number };
  reset(): void;
  _data: { promptTokens: number; completionTokens: number; totalCalls: number; turnStart: number };
}

// ----------------------------------------------------------
//  PromptTemplate
// ----------------------------------------------------------

interface PromptTemplateType {
  register(id: string, template: string): void;
  render(id: string, data: Record<string, any>): string;
  conditional(condition: any, content: string): string;
  list(): string[];
}

// ----------------------------------------------------------
//  Global Variable Declarations
// ----------------------------------------------------------

/** 运行时游戏状态（GameMaster） */
declare var GM: GameState;
/** 剧本数据（Project） */
declare var P: ScriptData;
/** 核心指标显示名映射 */
declare var CORE_METRIC_LABELS: Record<string, string>;
/** 平衡配置 */
declare var BALANCE_CONFIG: BalanceConfig;

/** 结算管线 */
declare var SettlementPipeline: SettlementPipelineType;
/** 事件总线 */
declare var GameEventBus: GameEventBusType;
/** 变更日志 */
declare var ChangeLog: ChangeLogType;
/** 调试日志 */
declare var DebugLog: DebugLogType;
/** AI Sub-call 注册表 */
declare var AISubCallRegistry: AISubCallRegistryType;
/** 决策注册表 */
declare var DecisionRegistry: DecisionRegistryType;
/** Prompt 缓存层 */
declare var PromptLayerCache: PromptLayerCacheType;
/** 模型适配器 */
declare var ModelAdapter: ModelAdapterType;
/** Token 消耗追踪 */
declare var TokenUsageTracker: TokenUsageTrackerType;
/** Prompt 模板引擎 */
declare var PromptTemplate: PromptTemplateType;
/** 错误监控 */
interface ErrorMonitorType {
  capture(type: string, message: string, stack?: string): void;
  getLog(): Array<{ ts: number; turn: number; type: string; message: string; stack: string }>;
  exportText(): string;
  clear(): void;
  count(): number;
}
declare var ErrorMonitor: ErrorMonitorType;
/** 统一命名空间 */
declare var TM: {
  utils: Record<string, Function | null>;
  time: Record<string, Function | null>;
  find: Record<string, Function | null>;
  ai: Record<string, any>;
  infra: Record<string, any>;
  version: string;
  buildDate: string;
};

// ----------------------------------------------------------
//  Global Function Declarations
// ----------------------------------------------------------

/**
 * 基础 AI 调用
 * @param prompt - 提示词
 * @param maxTok - 最大 token (默认 2000)
 * @param signal - 中断信号
 * @returns AI 响应文本
 */
declare function callAI(prompt: string, maxTok?: number, signal?: AbortSignal): Promise<string>;

/**
 * 智能 AI 调用（自动重试 + 验证）
 * @param prompt - 提示词
 * @param maxTok - 最大 token
 * @param options - 选项
 */
declare function callAISmart(
  prompt: string,
  maxTok?: number,
  options?: { minLength?: number; maxRetries?: number; validator?: (s: string) => boolean; signal?: AbortSignal }
): Promise<string>;

/**
 * 多消息 AI 调用
 * @param messages - OpenAI 格式消息列表
 * @param maxTok - 最大 token
 * @param signal - 中断信号
 */
declare function callAIMessages(
  messages: Array<{ role: string; content: string }>,
  maxTok?: number,
  signal?: AbortSignal
): Promise<string>;

/** 按名称查找角色 (O(1) 索引) */
declare function findCharByName(name: string): Character | undefined;
/** 按名称查找势力 (O(1) 索引) */
declare function findFacByName(name: string): Faction | undefined;
/** 按功能关键字查找官职 */
declare function findOfficeByFunction(funcKeyword: string): any;

/** 添加事件日志条目 */
declare function addEB(type: string, text: string): void;
/** Toast 提示 */
declare function toast(msg: string): void;
/** HTML 转义 */
declare function escHtml(s: any): string;
/** 数值约束到 [a, b] */
declare function clamp(v: number, a: number, b: number): number;
/** 生成唯一 ID */
declare function uid(): string;
/** 确定性伪随机 [0, 1) */
declare function random(): number;

/**
 * 将时间描述转为回合数
 * @param duration - 'week'|'month'|'3months'|'season'|'halfyear'|'year'|'3years'|'5years'
 */
declare function turnsForDuration(duration: string): number;

/**
 * 获取时间倍率 (每回合 / 每年)
 * @returns 时间比率
 */
declare function getTimeRatio(): number;

/** 获取每回合天数 */
declare function _getDaysPerTurn(): number;

/**
 * 鲁棒 JSON 解析（4 层修复链）
 * @param raw - 原始文本（可能包含 markdown、不完整 JSON 等）
 */
declare function robustParseJSON(raw: string): any;

/** 从剧本变量构建核心指标映射 */
declare function buildCoreMetricLabels(): void;

/** 计算 NPC 意图 */
declare function computeNpcIntents(): void;

/** 处理诏令效果 */
declare function processEdictEffects(allEdictText: string, edictCategory?: string): any;

/**
 * 计算执行率管线
 * @param edictText - 诏令文本
 * @param edictCategory - 诏令分类
 */
declare function computeExecutionPipeline(edictText: string, edictCategory?: string): any;

/** 计算建筑产出 */
declare function calculateBuildingOutput(): void;

/** 计算省份经济 */
declare function calculateProvinceEconomy(): void;

/**
 * 增强版战斗解算
 * @param attacker - 攻方信息
 * @param defender - 守方信息
 * @param context - 战斗上下文
 */
declare function enhancedResolveBattle(attacker: any, defender: any, context?: any): any;

/**
 * 继承人决议
 * @param deadChar - 死亡角色
 * @returns 继承人角色或 null
 */
declare function resolveHeir(deadChar: Character): Character | null;

/** 运行自测 */
declare function runSelfTests(): void;

/** 深拷贝 (structuredClone 优先, JSON 兜底) */
declare function deepClone<T>(obj: T): T;

/** 确定性随机整数 [min, max] 闭区间 */
declare function randInt(min: number, max: number): number;

/** 模糊查找角色 */
declare function _fuzzyFindChar(name: string): Character | null;

/** 模糊查找势力 */
declare function _fuzzyFindFac(name: string): Faction | null;

/** 数值约束增量 */
declare function sanitizeNumericDelta(val: any, min?: number, max?: number): number;

/** 获取 Balance 配置值 (支持 P.balanceOverrides 覆盖) */
declare function getBalanceVal(path: string, defaultVal?: any): any;

/** 月数→回合数 */
declare function turnsForMonths(months: number): number;

/** 年速率→回合速率 */
declare function ratePerTurn(ratePerYear: number): number;

/** 月速率→回合速率 */
declare function monthlyRatePerTurn(ratePerMonth: number): number;

/** 判断当前回合是否跨年 */
declare function isYearBoundary(): boolean;

/** 获取在位年数 */
declare function getReignYears(): number;

/** 获取每回合天数 */
declare function getTurnDays(): number;

/** 初始化 RNG */
declare function initRng(seed?: string): void;

/** 获取 RNG 状态 */
declare function getRngState(): { seed: string; s: number };

/** 恢复 RNG 状态 */
declare function restoreRng(state: { seed: string; s: number }): void;

/** 创建子 RNG (不影响全局) */
declare function createSubRng(seed: string): () => number;

/** 显示加载遮罩 */
declare function showLoading(msg?: string, pct?: number): void;
/** 隐藏加载遮罩 */
declare function hideLoading(): void;

/** 保存剧本数据到 localStorage/IndexedDB */
declare function saveP(): void;

// ==========================================================
// R103 · AI Schema 类型（turn-full 模式）
// 与 tm-ai-schema.js 的 turn_full schema 对齐
// ==========================================================

/** 角色属性增量 (char_updates 元素) */
interface AICharUpdate {
  /** 角色名（必填·精确匹配优先） */
  name: string;
  /** 忠诚增量 */
  loyalty_delta?: number;
  /** 野心增量 */
  ambition_delta?: number;
  /** 贤能增量 */
  talent_delta?: number;
  /** 名望增量 */
  renown_delta?: number;
  /** 所在地变更 */
  location?: string;
  /** 任免相关 */
  office_title?: string;
  /** 其他增量（动态字段） */
  [k: string]: any;
}

/** 角色死亡 (character_deaths 元素) */
interface AICharacterDeath {
  name: string;
  reason?: string;
  cause?: string;
  epitaph?: string;
  /** 是否玩家角色 */
  isPlayer?: boolean;
}

/** 势力事件 (faction_events 元素) */
interface AIFactionEvent {
  type: 'war' | 'alliance' | 'coup' | 'march' | 'siege' | string;
  actor?: string;
  target?: string;
  description?: string;
  [k: string]: any;
}

/** 官制变动 (office_changes 元素) */
interface AIOfficeChange {
  action: 'appoint' | 'dismiss' | 'promote' | 'demote' | 'transfer' | 'evaluate' | 'reform';
  office?: string;
  person?: string;
  reason?: string;
  [k: string]: any;
}

/** 后宫事件 (harem_events 元素) */
interface AIHaremEvent {
  type: 'pregnancy' | 'birth' | 'death' | 'rank_change' | 'favor_change' | 'scandal';
  consort?: string;
  description?: string;
  [k: string]: any;
}

/** 行政区划树变更 (admin_division_updates 元素) */
interface AIAdminDivisionUpdate {
  action: 'add' | 'remove' | 'rename' | 'merge' | 'split' | 'reform' | 'territory_gain' | 'territory_loss';
  target?: string;
  newName?: string;
  [k: string]: any;
}

/** AI turn-full 响应顶层结构 */
interface AIScenarioResponse {
  /** 回合叙事（半文言 300-800 字） */
  narrative?: string;
  /** 实录风格叙事 */
  shilu_text?: string;
  /** 时政记风格叙事 */
  shizhengji?: string;
  /** 主要事件 */
  event?: { desc: string; [k: string]: any };

  // 时代/全局
  era_state_delta?: { social?: number; economy?: number; centralization?: number; military?: number; [k: string]: any };
  global_state_delta?: { tax_pressure?: number; [k: string]: any };

  // 角色
  character_deaths?: AICharacterDeath[];
  char_updates?: AICharUpdate[];
  relations?: any[];

  // 势力
  faction_changes?: any[];
  faction_updates?: any[];
  faction_events?: AIFactionEvent[];
  faction_relation_changes?: any[];
  faction_create?: any[];
  faction_succession?: any[];
  faction_dissolve?: any[];

  // 党派/阶层
  party_changes?: any[];
  party_updates?: any[];
  party_create?: any[];
  party_splinter?: any[];
  party_merge?: any[];
  party_dissolve?: any[];
  class_changes?: any[];
  class_updates?: any[];
  class_emerge?: any[];
  class_revolt?: any[];
  class_dissolve?: any[];

  // 军事/物品
  army_changes?: any[];
  item_changes?: any[];
  title_changes?: any[];
  building_changes?: any[];
  vassal_changes?: any[];

  // 官制/行政
  office_changes?: AIOfficeChange[];
  office_assignments?: any[];
  office_spawn?: any[];
  personnel_changes?: any[];
  admin_changes?: any[];
  admin_division_updates?: AIAdminDivisionUpdate[];

  // 后宫/文化
  harem_events?: AIHaremEvent[];
  tech_civic_unlocks?: any[];
  policy_changes?: any[];
  scheme_actions?: any[];

  /** 允许 AI 附加任意扩展字段 */
  [k: string]: any;
}

/** AI dialogue 响应（对话模式） */
interface AIDialogueResponse {
  /** 发言文本（必填） */
  reply: string;
  /** 划入诏书的建言要点 */
  suggestions?: string[];
  /** 立场标签 */
  stance?: string;
  /** 表决倾向 */
  vote?: '支持' | '反对' | '中立' | string;
  /** 反驳他人发言 */
  rebuttal?: string;
  /** 科举议题建议 */
  exam_opinion?: string;
  [k: string]: any;
}

/** AI 校验器返回 */
interface AIValidationResult {
  ok: boolean;
  errors: Array<{ field: string; message: string; severity?: 'error' | 'warn' }>;
  warnings: Array<{ field: string; message: string }>;
}

declare namespace TM {
  /** 校验 AI 返回数据 */
  function validateAIOutput(data: any, mode: 'turn-full' | 'dialogue'): AIValidationResult;
}

// ==========================================================
// R103 · GameEventBus 事件类型映射
// 事件名 → payload 类型
// ==========================================================

interface TianmingEventMap {
  /** 角色死亡 */
  'character:death': { name: string; reason?: string; turn: number };
  /** 势力覆灭 */
  'faction:collapse': { faction: string; turn: number; reason?: string };
  /** 势力宣战 */
  'faction:declareWar': { attacker: string; defender: string; casus_belli?: string };
  /** 势力战败 */
  'faction:defeated': { faction: string; winner?: string };
  /** 党派弹劾 */
  'party:impeach': { party: string; target: string };
  /** 党派清洗 */
  'party:purge': { party: string; victims: string[] };
  /** 国策废除 */
  'policy:abolished': { policy: string; turn: number };
  /** 国策颁布 */
  'policy:enacted': { policy: string; turn: number };
  /** 省份易主 */
  'province:ownerChange': { province: string; oldOwner: string; newOwner: string };
  /** 阴谋阶段变更 */
  'scheme:phaseChange': { schemeId: string; oldPhase: string; newPhase: string };
  /** 皇位继承 */
  'succession': { oldEmperor: string; newEmperor: string; reason?: string };
  /** 战争开始 */
  'war:start': { attacker: string; defender: string };
  /** 军队兵变风险 */
  'army:mutinyRisk': { army: string; risk: number };
  /** 成就解锁 */
  'achievement:unlock': { id: string; name: string };
  /** 自检 */
  '_selftest': any;
  /** 允许其他字符串事件名（未来扩展） */
  [k: string]: any;
}

declare namespace GameEventBus {
  /** 发射事件（类型化） */
  function emit<K extends keyof TianmingEventMap>(event: K, payload: TianmingEventMap[K]): void;
  /** 订阅事件 */
  function on<K extends keyof TianmingEventMap>(event: K, handler: (payload: TianmingEventMap[K]) => void): void;
  /** 取消订阅 */
  function off<K extends keyof TianmingEventMap>(event: K, handler: (payload: TianmingEventMap[K]) => void): void;
  /** 序列化（存档用） */
  function serialize(): any;
  /** 反序列化（读档用） */
  function deserialize(data: any): void;
}

// ==========================================================
// R103 · 核心引擎函数签名
// 把高频函数的 JSDoc 补全，提升 IDE IntelliSense
// ==========================================================

/** 更新经济（每回合调用） · timeRatio=当回合占一年的比例(0-1) */
declare function updateEconomy(timeRatio?: number): void;

/** 计算执行力（全局或指定派系） */
declare function computeExecutionRate(faction?: string): number;

/** 更新威望（每回合） */
declare function updatePrestige(): void;

/** 更新党争值 */
declare function updatePartyStrife(): void;

/** 更新民变度 */
declare function updateUnrest(): void;

/** 阈值触发评估（民变/改革/起义等）*/
declare function evaluateThresholdTriggers(): void;

/** 更新时代状态 */
declare function updateEraState(): void;

/** 更新角色关系 */
declare function updateRelations(): void;

/** 应用 AI 返回的人物死亡事件（R100 抽出） */
declare function applyCharacterDeaths(p1: AIScenarioResponse): void;

/** 构建 NPC 上下文快照（用于 AI 推演） */
declare function buildNpcContext(): any;

/** 构建 NPC 行为推演上下文（较简单版本） */
declare function buildNpcBehaviorContext?(): any;

/** 执行 NPC 行为 */
declare function executeNpcBehaviors(): Promise<void>;

/** 回合结束总调度 */
declare function endTurn(): Promise<void>;

/** 保存当前回合到存档（异步） */
interface SaveManagerType {
  maxSlots: number;
  autoSaveInterval: number;
  getAllSaves(): Array<{ slotId: number; name: string; turn: number; timestamp: number; scenarioName: string; eraName: string }>;
  saveToSlot(slotId: number, saveName?: string): boolean;
  loadFromSlot(slotId: number): void;
  deleteSlot(slotId: number): void;
}
declare const SaveManager: SaveManagerType;

// ==========================================================
// R105 · 环境检测 TM.env
// ==========================================================

interface TMEnvCaps {
  indexedDB: boolean;
  compressionStream: boolean;
  structuredClone: boolean;
  backdropFilter: boolean;
  hasSelector: boolean;
  showSaveFilePicker: boolean;
  offscreenCanvas: boolean;
}

declare namespace TM {
  /** 运行环境检测（Electron/GitHub Pages/localhost/Web） */
  const env: {
    readonly isElectron: boolean;
    readonly isFile: boolean;
    readonly isGitHub: boolean;
    readonly isLocalhost: boolean;
    readonly isWeb: boolean;
    readonly caps: TMEnvCaps;
    /** 人读环境描述 */
    describe(): string;
    /** 打印到 console */
    print(): string;
    /** 检查能力·不足时 toast 警告·返回缺失列表 */
    warnIfIncompatible(): string[];
  };
}

// ==========================================================
// R105 · 错误收集 TM.errors
// 已在 tm-error-collector.js 实现
// ==========================================================

interface ErrorLogEntry {
  ts: number;
  module: string;
  type: string;
  error: Error;
  context?: any;
  silent?: boolean;
}

declare namespace TM {
  const errors: {
    /** 捕获错误（console 会 warn） */
    capture(e: Error | unknown, moduleName: string, extra?: Record<string, any>): void;
    /** 静默捕获（仅记录，不 warn） */
    captureSilent(e: Error | unknown, moduleName: string, extra?: Record<string, any>): void;
    /** 全部日志 */
    getLog(): ErrorLogEntry[];
    /** 非静默日志（console warn 过的） */
    getLogLoud(): ErrorLogEntry[];
    /** 静默日志 */
    getLogSilent(): ErrorLogEntry[];
    /** 计数 */
    count(): number;
    /** 清空 */
    clear(): void;
  };
}

// ==========================================================
// R105 · 旧版 ErrorMonitor（tm-utils.js·被 TM.errors 包装）
// ==========================================================

declare const ErrorMonitor: {
  capture(type: string, message: string, stack?: string): void;
  getLog(): Array<{ ts: number; turn: number; type: string; message: string; stack: string }>;
  exportText(): string;
  clear(): void;
  count(): number;
};

// ==========================================================
// R105 · IndexedDB 存档管理 TM_SaveDB
// ==========================================================

interface SaveDBRecord {
  id: string;
  type: string;
  name: string;
  timestamp: number;
  turn: number;
  scenarioName: string;
  eraName: string;
  date?: string;
  dynastyPhase?: string;
  gameState: any;
  _compressed?: boolean;
}

interface StorageEstimate {
  supported: boolean;
  usage?: number;
  quota?: number;
  usageMB?: string;
  quotaMB?: string;
  percent?: string;
  summary?: string;
  error?: string;
}

declare const TM_SaveDB: {
  open(): Promise<IDBDatabase | null>;
  save(id: string, gameState: any, meta?: Partial<SaveDBRecord>): Promise<boolean>;
  load(id: string): Promise<SaveDBRecord | null>;
  list(): Promise<Array<Omit<SaveDBRecord, 'gameState' | '_compressed'>>>;
  delete(id: string): Promise<boolean>;
  saveProject(data: any): Promise<boolean>;
  loadProject(): Promise<any>;
  migrateFromLocalStorage(): Promise<number>;
  migrateFromOldDB(): Promise<number>;
  isAvailable(): boolean;
  /** R104·申请持久化存储 */
  requestPersistent(): Promise<{ supported: boolean; granted: boolean; alreadyPersisted?: boolean; reason?: string; error?: string }>;
  /** R104·查询配额用量 */
  estimate(): Promise<StorageEstimate>;
};

// ==========================================================
// R105 · AI 变更应用与校验辅助
// ==========================================================

/** AI 字段消费点 / 应用器 */
interface AIApplierResult {
  /** 成功应用的字段数 */
  applied: number;
  /** 失败的字段 */
  errors: Array<{ field: string; message: string }>;
  /** 警告 */
  warnings: Array<{ field: string; message: string }>;
}

/** 把 AI 返回的完整 turn JSON 套用到 GM / P */
declare function applyAITurnChanges(data: AIScenarioResponse): AIApplierResult;

// ==========================================================
// R105 · 补齐 TM.* 其他工具命名空间
// ==========================================================

declare namespace TM {
  /** GameState 不变量校验 */
  const invariants: {
    check(): { ok: boolean; failures: string[] };
    list(): string[];
  };

  /** 性能采样器（R36/R57/R61） */
  const perf: {
    start(name: string): void;
    end(name: string): void;
    print(): void;
    printCompare(): void;
    setThreshold(name: string, maxMs: number): void;
    lockBaseline(): void;
    getStats(): Record<string, { count: number; p50: number; p95: number; max: number }>;
  };

  /** GM 状态快照（R63） */
  const state: {
    snapshot(label?: string): any;
    restore(snap: any): void;
    list(): Array<{ label: string; ts: number }>;
  };

  /** 对象差异工具（R71） */
  function diff(a: any, b: any, path?: string): Array<{ path: string; before: any; after: any }>;

  /** GameHooks 查询（R73） */
  const hooks: {
    list(): string[];
    who(hookName: string): string[];
  };

  /** 污染守卫（R60） */
  const guard: {
    snapshot(): void;
    report(): { newGlobals: string[]; conflicts: string[] };
  };

  /** 命名空间入口（R59/R87） */
  const namespaces: {
    listAvailable(): string[];
    listMissing(): string[];
    verify(): void;
  };

  /** 版本查询（R82） */
  const version: {
    app: string;
    schema: string;
    save: number;
    print(): string;
  };

  /** Onboarding 检查（R80） */
  function onboard(): Promise<{ step: string; ok: boolean; message?: string }[]>;

  /** 统一诊断仪表板（R75） */
  const diag: {
    open(): void;
    dump(): any;
  };

  /** 速查卡浮层（R77） */
  const cheatsheet: {
    show(): void;
    hide(): void;
  };

  /** 合并工作流（R76） */
  const checklist: {
    preMerge(name: string): any;
    postMerge(name: string): any;
    downloadReport(): void;
  };

  /** smoke test runner（R3/R14） */
  const test: {
    run(): Promise<{ total: number; passed: number; failed: number; failures: any[] }>;
    list(): string[];
  };
}
