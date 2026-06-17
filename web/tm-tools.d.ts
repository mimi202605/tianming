/**
 * tm-tools.d.ts — 天命重构基础设施的 TypeScript 类型声明
 *
 * 目的：为 DA.* / TM.* 全套工具提供 IDE 智能提示。
 *      放在 web/ 目录下，配合已有 types.d.ts 自动生效。
 *
 * 生成自：14 轮重构建立的 23 个基础设施 JS 文件。
 */

// ─────────────────────────────────────────────────────
// DA — 数据访问门面
// ─────────────────────────────────────────────────────

interface CharacterSummary {
  name: string;
  alive?: boolean;
  faction?: string;
  location?: string;
  loyalty?: number;
  intelligence?: number;
  scholarship?: number;
  officialTitle?: string;
  rank?: string | number;
  isPlayer?: boolean;
  zi?: string;
  haoName?: string;
  aliases?: string[];
  [key: string]: any;
}

interface FactionSummary {
  name: string;
  leader?: string;
  strength?: number;
  isPlayer?: boolean;
  relations?: Record<string, number>;
  [key: string]: any;
}

interface OfficePosition {
  name: string;
  holder?: string;
  rank?: string | number;
  [key: string]: any;
}

interface OfficeDept {
  name: string;
  positions?: OfficePosition[];
  subs?: OfficeDept[];
  [key: string]: any;
}

interface AdminDivision {
  name: string;
  children?: AdminDivision[] | Record<string, AdminDivision>;
  population?: any;
  governor?: string;
  [key: string]: any;
}

interface Issue {
  id: string;
  title?: string;
  status: 'pending' | 'resolved';
  raisedTurn?: number;
  resolvedTurn?: number;
  resolvedDate?: string;
  description?: string;
  [key: string]: any;
}

interface EdictSuggestion {
  from?: string;
  topic?: string;
  content: string;
  source?: string;
  turn?: number;
  used?: boolean;
  [key: string]: any;
}

interface Army {
  name: string;
  faction?: string;
  commander?: string;
  troops?: number;
  size?: number;
  soldiers?: number;
  morale?: number;
  supply?: number;
  location?: string;
  [key: string]: any;
}

interface DA_Chars {
  findByName(name: string): CharacterSummary | undefined;
  findById(id: string): CharacterSummary | undefined;
  allAlive(): CharacterSummary[];
  forEachAlive(fn: (c: CharacterSummary, i: number) => void): void;
  byFaction(facName: string): CharacterSummary[];
  byLocation(loc: string): CharacterSummary[];
  countAlive(): number;
  player(): CharacterSummary | undefined;
  adjustStat(charOrName: string | CharacterSummary, field: string, delta: number, min?: number, max?: number): boolean;
}

interface DA_Factions {
  findByName(name: string): FactionSummary | undefined;
  all(): FactionSummary[];
  playerFaction(): FactionSummary | null;
  byRelation(toFac: string, minRel?: number): FactionSummary[];
}

interface DA_Parties {
  findByName(name: string): any;
  all(): any[];
}

interface DA_Classes {
  findByName(name: string): any;
  all(): any[];
}

interface DA_Guoku {
  getStock(category?: string): number;
  money(): number;
  grain(): number;
  cloth(): number;
  allStocks(): { money: number; grain: number; cloth: number };
  isBankrupt(): boolean;
  monthRatio(): number;
  ensureModel(): boolean;
  computeTaxFlow(annualNominal: number): any;
  sources(): Record<string, any> | null;
  expenses(): Record<string, any> | null;
  reforms(): Record<string, any> | null;
  loanSources(): any[] | null;
  spendUnchecked(category: string, amount: number, reason?: string): boolean;
  creditUnchecked(category: string, amount: number, reason?: string): boolean;
}

interface DA_OfficeTree {
  get(): OfficeDept[];
  findPosition(deptName: string, positionName: string): { dept: OfficeDept; position: OfficePosition } | null;
  postsOf(charName: string): Array<{ dept: OfficeDept; position: OfficePosition }>;
}

interface DA_Admin {
  get(): AdminDivision[] | Record<string, AdminDivision>;
  findDivision(name: string): AdminDivision | null;
  getProvinceStats(provName: string): any;
}

interface DA_Armies {
  all(): Army[];
  findByName(name: string): Army | undefined;
  byFaction(facName: string): Army[];
  byCommander(charName: string): Army[];
  totalTroops(facName?: string): number;
  activeWars(): any[];
  activeBattles(): any[];
}

interface DA_Harem {
  get(): any;
  concubines(): any[];
  findByName(name: string): any;
  pregnancies(): any[];
  empress(): any;
}

interface DA_Authority {
  get(): any;
  huangquan(): number;
  huangwei(): number;
  minxin(): number;
  powerMinister(): any;
  tyrantLevel(): number;
}

interface DA_Turn {
  current(): number;
  date(): string;
  dateOfTurn(t: number): string;
  isRunning(): boolean;
}

interface DA_Issues {
  all(): Issue[];
  pending(): Issue[];
  findById(id: string): Issue | undefined;
  resolve(id: string, resolvedDate?: string): boolean;
}

interface DA_Edict {
  suggestions(): EdictSuggestion[];
  addSuggestion(item: Partial<EdictSuggestion>): boolean;
}

interface DA_Meta {
  coveredGMFields: string[];
  enableLog(on: boolean): void;
  clearLog(): void;
  logSummary(): Record<string, number>;
}

interface DA_API {
  chars: DA_Chars;
  factions: DA_Factions;
  parties: DA_Parties;
  classes: DA_Classes;
  guoku: DA_Guoku;
  officeTree: DA_OfficeTree;
  admin: DA_Admin;
  armies: DA_Armies;
  harem: DA_Harem;
  authority: DA_Authority;
  turn: DA_Turn;
  issues: DA_Issues;
  edict: DA_Edict;
  memorials: { all(): any[]; unbatched(): any[]; byChar(charName: string): any[]; recent(n?: number): any[] };
  chronicle: { yearly(): any[]; recent(turns?: number): any[]; arcs(): any[]; afterwords(): any[]; playerDecisions(): any[] };
  npcMemory: { get(): any; ofChar(charName: string): any[]; remember(charName: string, memory: any): boolean };
  qiju: { all(): any[]; recent(n?: number): any[]; push(entry: any): void };
  jishi: { all(): any[]; byChar(charName: string): any[]; push(record: any): void };
  era: { get(): any; dynastyPhase(): string; socialStability(): number; taxPressure(): any };
  scenario: { current(): any; name(): string };
  meta: DA_Meta;
}

declare const DA: DA_API;

// ─────────────────────────────────────────────────────
// TM — 诊断与工作流工具
// ─────────────────────────────────────────────────────

// TM_AI_SCHEMA
interface AISchemaField {
  type: 'string' | 'object' | 'array' | 'number';
  desc: string;
  required?: boolean;
  deprecated?: string;
  items?: any;
  requiredSubFields?: string[];
  producedBy?: string[];
  consumedBy?: string[];
}

interface TM_AI_Schema_API {
  raw: Record<string, AISchemaField>;
  dialogue: Record<string, AISchemaField>;
  toKnownFields(mode?: 'turn-full' | 'dialogue'): Record<string, string>;
  toDeprecatedFields(): Record<string, string>;
  toRequiredSubfields(): Record<string, string[]>;
  describe(fieldName: string): AISchemaField | null;
  listFields(mode?: 'turn-full' | 'dialogue'): string[];
}

declare const TM_AI_SCHEMA: TM_AI_Schema_API;

// TM.errors
interface ErrorEntry {
  t: number;
  module: string;
  turn: number;
  error: { message: string; stack?: string | null; name?: string | null };
  extra?: any;
}

interface TM_Errors {
  capture(e: any, moduleName: string, extra?: any): ErrorEntry;
  getLog(): ErrorEntry[];
  clear(): void;
  byModule(moduleFilter: string): ErrorEntry[];
  getSummary(): Record<string, { count: number; messages: Record<string, number> }>;
  maxLog: number;
  consoleMirror: boolean;
  openPanel?(): void;
  closePanel?(): void;
  togglePanel?(): void;
}

// TM.validateAIOutput
interface ValidationResult {
  ok: boolean;
  tag: string;
  mode?: string;
  timestamp: number;
  stats: { knownKeys: number; unknownKeys: number; deprecatedKeys: number; itemCount: number };
  errors: string[];
  warnings: string[];
}

// TM.test
interface TestAssertion {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeGreaterThan(n: number): void;
  toBeLessThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toHaveLength(n: number): void;
  toHaveProperty(prop: string): void;
  toContain(item: any): void;
  toMatch(re: RegExp): void;
  toThrow(matcher?: string | RegExp): void;
  not: {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeTruthy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
  };
}

interface TestRunResult {
  passed: number;
  failed: number;
  skipped: number;
  failures: Array<{ suite: string; test: string; err: any }>;
  suites: Array<{ name: string; passed: number; failed: number }>;
}

interface TM_Test {
  describe(name: string, fn: () => void): void;
  it(desc: string, fn: () => void): void;
  beforeEach(fn: () => void): void;
  afterEach(fn: () => void): void;
  expect(actual: any): TestAssertion;
  run(filter?: string): TestRunResult;
  runOnly(filter: string): TestRunResult;
  listSuites(): Array<{ name: string; tests: number }>;
  getLastResults(): TestRunResult | null;
}

// TM.perf
interface PerfStats {
  count: number;
  sum: number;
  avg: number;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

interface PerfCompareResult {
  ok: boolean;
  error?: string;
  baseline?: string;
  baselineTurn?: number;
  thresholdPct?: number;
  regressions: Array<{ name: string; basePercentile95: number; curPercentile95: number; pctChange: number }>;
  improvements: Array<{ name: string; basePercentile95: number; curPercentile95: number; pctChange: number }>;
  untouched: Array<{ name: string; basePercentile95: number; curPercentile95: number; pctChange: number }>;
}

interface TM_Perf {
  mark(name: string): void;
  measure(name: string): number;
  wrap(obj: any, methodName: string, sampleName?: string): boolean;
  record(name: string, ms: number): void;
  report(): Record<string, PerfStats>;
  reportByName(name: string): PerfStats | null;
  reset(name?: string): void;
  print(): any[];
  downloadJSON(): void;
  openPanel(): void;
  closePanel(): void;
  togglePanel(): void;
  setThreshold(name: string, ms: number | null, handler?: (name: string, dt: number, threshold: number) => void): boolean;
  getThresholds(): Record<string, { ms: number; triggeredCount: number }>;
  lockBaseline(): any;
  loadBaseline(): any;
  clearBaseline(): void;
  compareToBaseline(thresholdPct?: number): PerfCompareResult;
  printCompare(thresholdPct?: number): PerfCompareResult;
  getBaseline(): any;
  enabled: boolean;
}

// TM.invariants
interface InvariantCheckResult {
  ok: boolean;
  violations: string[];
  details?: any;
}

interface InvariantsReport {
  ok: boolean;
  timestamp: number;
  turn: number;
  violations: string[];
  results: Record<string, InvariantCheckResult>;
  stats: { checked: number; passed: number; failed: number };
}

interface TM_Invariants {
  check(groupName?: string): InvariantsReport;
  assert(groupName?: string): boolean;
  listGroups(): string[];
  addCheck(name: string, fn: () => InvariantCheckResult): boolean;
  enableAutoCheck(): void;
}

// TM.state
interface StateSnapshot {
  _meta: { capturedAt: number; turn: number; date: string; running: boolean };
  chars?: any;
  factionCount?: number;
  guoku?: { money: number; grain: number; cloth: number };
  authority?: { huangquan: number; huangwei: number; minxin: number };
  issues?: { total: number; pending: number; resolved: number };
  officeTree?: { filledPositions: number; emptyPositions: number };
  adminDivisions?: number;
  armies?: { count: number; totalTroops: number };
  [key: string]: any;
}

interface TM_State {
  snapshot(name?: string): { name: string; summary: StateSnapshot };
  get(name: string): StateSnapshot | null;
  list(): Array<{ name: string; turn: number; date: string; capturedAt: number }>;
  clear(name?: string): void;
  persist(name: string): boolean;
  restore(name: string): boolean;
  listPersisted(): string[];
  removePersisted(name: string): boolean;
  downloadJSON(name: string): boolean;
}

// TM.diff
interface DiffResult {
  added: Array<{ path: string; value: any }>;
  removed: Array<{ path: string; value: any }>;
  changed: Array<{ path: string; from: any; to: any; typeChange?: string }>;
  summary: { addedCount: number; removedCount: number; changedCount: number; total: number; truncated: boolean };
  _truncated: boolean;
}

interface TM_Diff_Function {
  (a: any, b: any, opts?: { ignore?: string[]; onlyPath?: string }): DiffResult;
  print(a: any, b: any, opts?: any): DiffResult;
  bySnapshot(nameA: string, nameB: string, opts?: any): DiffResult | null;
  printBySnapshot(nameA: string, nameB: string, opts?: any): DiffResult | null;
}

// TM.hooks
interface TM_Hooks {
  list(): Array<{ event: string; handlerCount: number }>;
  listHandlers(event: string): Array<{ fnName: string; priority: number; addedAt: string }>;
  trace(event: string, on: boolean): boolean;
  getTrace(event?: string): any[];
  clearTrace(): void;
  report(): any[];
  discover(): { registered: string[]; everSeen: string[]; seenCounts: Record<string, number>; note: string };
  installMirror(): boolean;
}

// TM.guard
interface TM_Guard {
  snapshot(): number;
  diffSince(): { added: Array<{ key: string; type: string }>; overridden: Array<{ key: string; oldType: string; newType: string }> };
  scan(): ReturnType<TM_Guard['diffSince']>;
  start(intervalMs?: number): void;
  stop(): void;
  getLog(): { adds: any[]; overrides: any[] };
  clearLog(): void;
  report(): { total: number; byType: Record<string, number>; addCount: number; overrideCount: number };
}

// TM.checklist
interface ChecklistStep {
  name: string;
  ok: boolean;
  data?: string;
  error?: string;
  [key: string]: any;
}

interface ChecklistReport {
  tag: string;
  phase: 'pre' | 'post';
  when: string;
  steps: ChecklistStep[];
  overall?: 'ok' | 'needs-review';
}

interface TM_Checklist {
  preMerge(tag: string): ChecklistReport;
  postMerge(tag: string): ChecklistReport;
  lastReport(): ChecklistReport | null;
  downloadReport(): boolean;
  listMerges(): Array<{ tag: string; pre?: any; post?: any }>;
}

// TM.diag / TM.cheatsheet
interface TM_Diag {
  open(): void;
  close(): void;
  toggle(): void;
  setAutoRefresh(on: boolean): void;
}

interface TM_Cheatsheet {
  show(): void;
  hide(): void;
  toggle(): void;
  sections: any[];
}

// TM.scenarioSchema / TM.validateScenario / TM.version / TM.onboard
interface ScenarioSchema {
  required: string[];
  optional: string[];
  arrayTypes: string[];
}

interface ScenarioValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: { knownFields: number; unknownFields: number };
  scenarioId: string;
  scenarioName: string;
}

interface TM_Version {
  list(): Array<{ file: string; version: string }>;
  summary(): Record<string, Array<{ file: string; version: string }>>;
  inconsistent(): Array<{ file: string; versions: string[] }>;
  report(): { total: number; byDate: any; inconsistent: any[] };
}

// TM 顶层
interface TM_API {
  errors: TM_Errors;
  test: TM_Test;
  perf: TM_Perf;
  invariants: TM_Invariants;
  state: TM_State;
  diff: TM_Diff_Function;
  hooks: TM_Hooks;
  guard: TM_Guard;
  checklist: TM_Checklist;
  diag: TM_Diag;
  cheatsheet: TM_Cheatsheet;
  Economy: any;
  MapSystem: any;
  Lizhi: any;
  Guoku: any;
  Neitang: any;
  Huji: any;
  ChangeQueue: any;
  namespaces: any;

  validateAIOutput(output: any, tag: string, mode?: 'turn-full' | 'dialogue'): ValidationResult | null;
  getLastValidation(): ValidationResult | null;
  getValidationHistory(): ValidationResult[];

  scenarioSchema: ScenarioSchema;
  validateScenario(sc: any): ScenarioValidation;
  validateAllScenarios(): { total: number; ok: number; results: ScenarioValidation[] } | { error: string };

  version: TM_Version;
  onboard(): { note: string };

  _migrationPlaceholders?: Array<{ file: string; source: string; status: string; estimatedHours: number; createdBy: string; date: string }>;
}

declare const TM: TM_API;
