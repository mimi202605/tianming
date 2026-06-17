/*
 * ============================================================
 *  天命 · 预加载桥接脚本
 *  
 *  这个文件的作用：
 *  在"网页"和"电脑系统"之间架一座桥
 *  网页可以通过 window.tianming.xxx() 安全地调用系统功能
 * ============================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

// 把这些功能暴露给网页中的 JavaScript
contextBridge.exposeInMainWorld('tianming', {

  // === 标识：告诉网页"我在桌面环境中运行" ===
  isDesktop: true,
  platform: process.platform,  // 'win32' / 'darwin' / 'linux'

  // === 存档功能 ===
  saveProject: (filename, data) =>
    ipcRenderer.invoke('save-project', { filename, data }),

  loadProject: (filename) =>
    ipcRenderer.invoke('load-project', filename),

  listSaves: () =>
    ipcRenderer.invoke('list-saves'),

  deleteSave: (filename) =>
    ipcRenderer.invoke('delete-save', filename),

  // === 自动存档 ===
  autoSave: (data) =>
    ipcRenderer.invoke('auto-save', data),

  loadAutoSave: () =>
    ipcRenderer.invoke('load-auto-save'),

  // === 系统对话框 ===
  dialogExport: (data) =>
    ipcRenderer.invoke('dialog-export', data),

  dialogImport: () =>
    ipcRenderer.invoke('dialog-import'),

  dialogLoadImage: () =>
    ipcRenderer.invoke('dialog-load-image'),

  dialogLoadGeoJSON: () =>
    ipcRenderer.invoke('dialog-load-geojson'),

  // === 工具 ===
  openSaveDir: () =>
    ipcRenderer.invoke('open-save-dir'),

  quitApp: () =>
    ipcRenderer.invoke('app-quit'),

  // === 窗口显示模式（全屏 / 窗口）===
  setFullScreen: (flag) =>
    ipcRenderer.invoke('set-fullscreen', flag),
  isFullScreen: () =>
    ipcRenderer.invoke('get-fullscreen'),

  getAppInfo: () =>
    ipcRenderer.invoke('get-app-info'),

  // === 调试日志 ===
  debugLog: (entries) =>
    ipcRenderer.invoke('debug-log', entries),

  openLogDir: () =>
    ipcRenderer.invoke('open-log-dir'),

  debugLogInfo: () =>
    ipcRenderer.invoke('debug-log-info'),

  // === 在线更新 ===
  onlineServiceStatus: (apiUrl) =>
    ipcRenderer.invoke('online-service-status', { apiUrl }),

  accountSession: () =>
    ipcRenderer.invoke('account-session'),

  accountRegister: (apiUrl, username, password, nickname) =>
    ipcRenderer.invoke('account-register', { apiUrl, username, password, nickname }),

  accountLogin: (apiUrl, username, password) =>
    ipcRenderer.invoke('account-login', { apiUrl, username, password }),

  accountMe: (apiUrl) =>
    ipcRenderer.invoke('account-me', { apiUrl }),

  accountLogout: (apiUrl) =>
    ipcRenderer.invoke('account-logout', { apiUrl }),

  checkForUpdate: (feedUrl) =>
    ipcRenderer.invoke('update-check', { feedUrl }),

  downloadUpdate: () =>
    ipcRenderer.invoke('update-download'),

  installUpdate: () =>
    ipcRenderer.invoke('update-install'),

  onUpdateStatus: (callback) =>
    ipcRenderer.on('update-status', (event, status) => callback(status)),

  // === renderer/web 热更新 ===
  hotUpdateStatus: () =>
    ipcRenderer.invoke('hot-update-status'),

  checkHotUpdate: (feedUrl) =>
    ipcRenderer.invoke('hot-update-check', { feedUrl }),

  installHotUpdate: (feedUrl) =>
    ipcRenderer.invoke('hot-update-download-install', { feedUrl }),

  setHotUpdateEnabled: (enabled) =>
    ipcRenderer.invoke('hot-update-set-enabled', !!enabled),

  rollbackHotUpdate: () =>
    ipcRenderer.invoke('hot-update-rollback'),

  reloadAfterHotUpdate: () =>
    ipcRenderer.invoke('hot-update-reload'),

  openHotUpdateDir: () =>
    ipcRenderer.invoke('hot-update-open-dir'),

  onHotUpdateStatus: (callback) =>
    ipcRenderer.on('hot-update-status', (event, status) => callback(status)),

  // === 内容与创意工坊 ===
  contentStatus: () =>
    ipcRenderer.invoke('content-status'),

  importWorkshopPack: (overwrite) =>
    ipcRenderer.invoke('workshop-import-pack', { overwrite: !!overwrite }),

  loadWorkshopCatalog: (catalogUrl) =>
    ipcRenderer.invoke('workshop-catalog', { catalogUrl }),

  installWorkshopPackFromUrl: (packageUrl, sha256, overwrite) =>
    ipcRenderer.invoke('workshop-install-from-url', { packageUrl, sha256, overwrite: !!overwrite }),

  publishWorkshopPack: (pack) =>
    ipcRenderer.invoke('workshop-publish-pack', pack || {}),

  listWorkshopPacks: () =>
    ipcRenderer.invoke('workshop-list-packs'),

  setWorkshopPackEnabled: (id, enabled) =>
    ipcRenderer.invoke('workshop-set-enabled', { id, enabled }),

  uninstallWorkshopPack: (id) =>
    ipcRenderer.invoke('workshop-uninstall', id),

  openWorkshopDir: () =>
    ipcRenderer.invoke('workshop-open-dir'),

  loadEnabledWorkshopScenarios: () =>
    ipcRenderer.invoke('workshop-load-enabled-scenarios'),

  // === 剧本功能 ===
  listScenarios: () =>
    ipcRenderer.invoke('list-scenarios'),

  saveScenario: (filename, data) =>
    ipcRenderer.invoke('save-scenario', { filename, data }),

  loadScenario: (filename) =>
    ipcRenderer.invoke('load-scenario', filename),

  deleteScenario: (filename) =>
    ipcRenderer.invoke('delete-scenario', filename),

  openScenariosDir: () =>
    ipcRenderer.invoke('open-scenarios-dir'),

  // === 每回合数据 ===
  writeTurnData: (saveName, turn, data) =>
    ipcRenderer.invoke('write-turn-data', { saveName, turn, data }),

  readTurnData: (saveName, turn) =>
    ipcRenderer.invoke('read-turn-data', { saveName, turn }),

  listTurnData: (saveName) =>
    ipcRenderer.invoke('list-turn-data', saveName),

  readTurnsSummary: (saveName, fromTurn, toTurn) =>
    ipcRenderer.invoke('read-turns-summary', { saveName, fromTurn, toTurn }),

  openTurnDataDir: () =>
    ipcRenderer.invoke('open-turn-data-dir'),

  // === 不安全 TLS·中转站证书放行（仅对玩家显式配置的 API 地址生效）===
  setInsecureTlsConfig: (config) =>
    ipcRenderer.invoke('set-insecure-tls-config', config || {}),

  // === 接收主进程发来的消息 ===
  onMenuAction: (callback) =>
    ipcRenderer.on('menu-action', (event, action) => callback(action)),

  onImportData: (callback) =>
    ipcRenderer.on('import-project-data', (event, data) => callback(data)),
});
