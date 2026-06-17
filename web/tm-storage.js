// @ts-check
/// <reference path="types.d.ts" />
// ============================================================
// IndexedDB 存储层 — 替代 localStorage 的 5MB 限制
// 两个 store：saves（游戏存档）+ projects（剧本项目P）
// 带 localStorage 回退
// ============================================================

// 7.1: 存档压缩——使用CompressionStream(gzip)
var SaveCompression = {
  supported: typeof CompressionStream !== 'undefined',

  compress: async function(jsonStr) {
    if (!this.supported) return jsonStr;
    try {
      var blob = new Blob([jsonStr]);
      var cs = new CompressionStream('gzip');
      var stream = blob.stream().pipeThrough(cs);
      var compressed = await new Response(stream).blob();
      return compressed;
    } catch(e) { console.warn('[SaveCompression] compress failed:', e); return jsonStr; }
  },

  decompress: async function(data) {
    if (data == null) return '{}';
    if (typeof data === 'string') return data; // 未压缩的旧存档（字符串）
    // Blob·ArrayBuffer·Uint8Array 等
    if (!this.supported) {
      // 浏览器不支持 gzip解压·尝试直接读文本
      try { return typeof data.text === 'function' ? await data.text() : String(data); }
      catch(e) { console.error('[SaveCompression] decompress-no-gzip failed:', e); return '{}'; }
    }
    // 检查是否是 gzip 压缩（前两字节 0x1f 0x8b）
    var blob = data instanceof Blob ? data : new Blob([data]);
    try {
      var headBuf = await blob.slice(0, 2).arrayBuffer();
      var head = new Uint8Array(headBuf);
      var isGzip = head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b;
      if (isGzip) {
        var ds = new DecompressionStream('gzip');
        var stream = blob.stream().pipeThrough(ds);
        return await new Response(stream).text();
      }
      // 不是 gzip·当作纯文本
      return await blob.text();
    } catch(e) {
      console.error('[SaveCompression] decompress failed:', e);
      // 最后尝试：直接读 text
      try { return await blob.text(); } catch(e2) { return '{}'; }
    }
  }
};

var TM_SaveDB = (function() {
  'use strict';

  var DB_NAME = 'tianming_db'; // 统一数据库名
  var DB_VERSION = 2; // v2: saves + projects 双store
  var SAVE_STORE = 'saves';
  var PROJECT_STORE = 'projects';
  var _db = null;
  var _available = false;
  var _openPromise = null; // 防止重复打开

  // ── 打开数据库 ──
  function open() {
    if (_db) return Promise.resolve(_db);
    if (_openPromise) return _openPromise;

    _openPromise = new Promise(function(resolve) {
      if (!window.indexedDB) {
        console.warn('[SaveDB] IndexedDB不可用，回退localStorage');
        _available = false;
        resolve(null);
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(SAVE_STORE)) {
          var s = db.createObjectStore(SAVE_STORE, { keyPath: 'id' });
          s.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(PROJECT_STORE)) {
          db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function(e) {
        _db = e.target.result;
        _available = true;
        _openPromise = null;
        console.log('[SaveDB] IndexedDB就绪 (v' + DB_VERSION + ')');
        resolve(_db);
      };
      req.onerror = function(e) {
        console.warn('[SaveDB] IndexedDB打开失败:', e.target.error);
        _available = false;
        _openPromise = null;
        resolve(null);
      };
    });
    return _openPromise;
  }

  // ── R103·quota 满时自动清最老 auto 存档（type='auto'），手动存档永不删 ──
  function _dropOldestAutoSave() {
    return _listAll(SAVE_STORE).then(function(records) {
      var autos = (records || []).filter(function(r){ return r.type === 'auto'; })
                                 .sort(function(a,b){ return (a.timestamp||0) - (b.timestamp||0); });
      if (autos.length === 0) return false; // 没 auto 可清
      var victim = autos[0];
      console.warn('[SaveDB] quota 满·清最老自动存档:', victim.id, 'ts=' + new Date(victim.timestamp||0).toLocaleString());
      return _del(SAVE_STORE, victim.id).then(function(){ return true; });
    });
  }

  // ── 通用写入（R103·加 QuotaExceededError 自动回收） ──
  function _put(storeName, record, _retryCount) {
    if (!_available || !_db) {
      // localStorage 回退
      try {
        localStorage.setItem('tm_idb_' + storeName + '_' + record.id, JSON.stringify(record));
        return Promise.resolve(true);
      } catch(e) {
        console.error('[SaveDB] localStorage写入失败:', e.message);
        return Promise.resolve(false);
      }
    }
    return new Promise(function(resolve) {
      try {
        var tx = _db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(record);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function(e) {
          var err = e.target && e.target.error;
          var isQuota = err && (err.name === 'QuotaExceededError' || err.name === 'QuotaExceededError');
          if (isQuota && storeName === SAVE_STORE && !_retryCount) {
            console.warn('[SaveDB] 配额已满·尝试清最老自动存档后重试');
            _dropOldestAutoSave().then(function(dropped) {
              if (dropped) {
                // 重试（带 flag 防止无限递归）
                _put(storeName, record, 1).then(resolve);
              } else {
                // 没 auto 可清·通知用户手动清理
                if (typeof window.toast === 'function') {
                  window.toast('❌ 存档空间满·请手动删除旧存档后重试');
                }
                resolve(false);
              }
            });
          } else {
            console.error('[SaveDB] 写入失败:', err ? err.name + ':' + err.message : e);
            resolve(false);
          }
        };
      } catch(e) { console.error('[SaveDB] 事务失败:', e); resolve(false); }
    });
  }

  // ── 通用读取 ──
  function _get(storeName, id) {
    if (!_available || !_db) {
      try {
        var raw = localStorage.getItem('tm_idb_' + storeName + '_' + id);
        return Promise.resolve(raw ? JSON.parse(raw) : null);
      } catch(e) { return Promise.resolve(null); }
    }
    return new Promise(function(resolve) {
      try {
        var tx = _db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(id);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { resolve(null); };
      } catch(e) { resolve(null); }
    });
  }

  // ── 通用删除 ──
  function _del(storeName, id) {
    if (!_available || !_db) {
      try { localStorage.removeItem('tm_idb_' + storeName + '_' + id); } catch(e) {}
      return Promise.resolve(true);
    }
    return new Promise(function(resolve) {
      try {
        var tx = _db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { resolve(false); };
      } catch(e) { resolve(false); }
    });
  }

  // ── 通用列出 ──
  function _listAll(storeName) {
    if (!_available || !_db) {
      var results = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          var prefix = 'tm_idb_' + storeName + '_';
          if (key && key.indexOf(prefix) === 0) {
            var raw = localStorage.getItem(key);
            if (raw) results.push(JSON.parse(raw));
          }
        }
      } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-storage');}catch(_){}}
      return Promise.resolve(results);
    }
    return new Promise(function(resolve) {
      try {
        var tx = _db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror = function() { resolve([]); };
      } catch(e) { resolve([]); }
    });
  }

  // ============================================================
  //  公开API：游戏存档
  // ============================================================

  /** 确保DB就绪后执行操作 */
  function _ensureOpen() {
    if (_db) return Promise.resolve();
    return open();
  }

  /** 保存游戏存档（7.1: 支持gzip压缩） */
  function save(id, gameState, meta) {
    return _ensureOpen().then(function() {
      var jsonStr = JSON.stringify(gameState);
      return SaveCompression.compress(jsonStr).then(function(compressed) {
        var isCompressed = compressed !== jsonStr; // Blob vs string
        var record = {
          id: id,
          type: (meta && meta.type) || 'manual',
          name: (meta && meta.name) || id,
          timestamp: Date.now(),
          turn: (meta && meta.turn) || 0,
          scenarioName: (meta && meta.scenarioName) || '',
          eraName: (meta && meta.eraName) || '',
          date: (meta && meta.date) || '',
          dynastyPhase: (meta && meta.dynastyPhase) || '',
          gameState: compressed,
          _compressed: isCompressed
        };
        if (isCompressed) {
          var origKB = (jsonStr.length / 1024).toFixed(1);
          console.log('[SaveDB] 存档压缩: ' + origKB + 'KB -> gzip Blob');
        }
        return _put(SAVE_STORE, record);
      });
    });
  }

  /** 读取游戏存档（7.1: 支持gzip解压，兼容旧存档） */
  function load(id) {
    return _ensureOpen().then(function() {
      return _get(SAVE_STORE, id);
    }).then(function(record) {
      if (!record) return null;
      // 7.1: 解压压缩的gameState
      if (record._compressed && record.gameState) {
        return SaveCompression.decompress(record.gameState).then(function(jsonStr) {
          try { record.gameState = JSON.parse(jsonStr); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'SaveDB] 解压后JSON解析失败:') : console.error('[SaveDB] 解压后JSON解析失败:', e); }
          delete record._compressed;
          return record;
        });
      }
      // 旧存档：gameState已经是对象，直接返回
      return record;
    });
  }

  /** 列出所有游戏存档（不含gameState大数据，仅元信息） */
  function list() {
    return _ensureOpen().then(function() {
      return _listAll(SAVE_STORE);
    }).then(function(records) {
      return records.map(function(r) {
        return { id:r.id, name:r.name, type:r.type, timestamp:r.timestamp, turn:r.turn, scenarioName:r.scenarioName, eraName:r.eraName, date:r.date||'', dynastyPhase:r.dynastyPhase||'' };
      }).sort(function(a,b) { return b.timestamp - a.timestamp; });
    });
  }

  /** 删除游戏存档 */
  function deleteSave(id) { return _ensureOpen().then(function() { return _del(SAVE_STORE, id); }); }

  // ============================================================
  //  公开API：剧本项目
  // ============================================================

  /** 保存剧本项目P */
  function saveProject(projectData) {
    var record = { id: 'current_project', timestamp: Date.now(), data: projectData };
    return _ensureOpen().then(function() { return _put(PROJECT_STORE, record); });
  }

  /** 读取剧本项目P */
  function loadProject() {
    return _ensureOpen().then(function() {
      return _get(PROJECT_STORE, 'current_project');
    }).then(function(r) {
      return r ? r.data : null;
    });
  }

  // ============================================================
  //  旧存档迁移
  // ============================================================

  function migrateFromLocalStorage() {
    if (!_available || !_db) return Promise.resolve(0);
    var migrated = 0;
    var promises = [];
    try {
      for (var i = 0; i < 10; i++) {
        var key = 'tm_save_' + i;
        var raw = localStorage.getItem(key);
        if (raw) {
          (function(k, r) {
            try {
              var data = JSON.parse(r);
              var slotId = 'slot_' + k.replace('tm_save_', '');
              promises.push(save(slotId, data.gameState || data, {
                name: data.name || ('存档' + k.replace('tm_save_', '')),
                type: 'migrated',
                turn: (data.gameState && data.gameState.turn) || (data.GM && data.GM.turn) || 0,
                scenarioName: (data.scenarioName || '')
              }).then(function(ok) {
                if (ok) { migrated++; localStorage.removeItem(k); }
              }));
            } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-storage');}catch(_){}}
          })(key, raw);
        }
      }
    } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-storage');}catch(_){}}
    return Promise.all(promises).then(function() {
      if (migrated > 0) console.log('[SaveDB] 迁移了' + migrated + '个旧存档');
      return migrated;
    });
  }

  /** 从旧数据库名(tianming_saves)迁移到当前数据库(tianming_db) */
  function migrateFromOldDB() {
    if (!_available || !_db) return Promise.resolve(0);
    var OLD_DB = 'tianming_saves';
    if (OLD_DB === DB_NAME) return Promise.resolve(0); // 同名，无需迁移
    return new Promise(function(resolve) {
      var req = indexedDB.open(OLD_DB);
      req.onsuccess = function(e) {
        var oldDb = e.target.result;
        if (!oldDb.objectStoreNames.contains('saves')) { oldDb.close(); resolve(0); return; }
        var tx = oldDb.transaction('saves', 'readonly');
        var getAll = tx.objectStore('saves').getAll();
        getAll.onsuccess = function() {
          var records = getAll.result || [];
          if (!records.length) { oldDb.close(); resolve(0); return; }
          var migrated = 0;
          var tasks = records.map(function(r) {
            return _put(SAVE_STORE, r).then(function(ok) { if (ok) migrated++; });
          });
          Promise.all(tasks).then(function() {
            oldDb.close();
            if (migrated > 0) {
              console.log('[SaveDB] 从旧数据库迁移了' + migrated + '条记录');
              // 删除旧数据库
              indexedDB.deleteDatabase(OLD_DB);
            }
            resolve(migrated);
          });
        };
        getAll.onerror = function() { oldDb.close(); resolve(0); };
      };
      req.onerror = function() { resolve(0); };
    });
  }

  // ============================================================
  //  R104·容量管理（persistent storage + 配额查询）
  // ============================================================

  /** 申请持久化存储（浏览器不会在空间紧张时自动清理） */
  function requestPersistent() {
    if (!(navigator.storage && navigator.storage.persist)) {
      return Promise.resolve({ supported: false, granted: false, reason: 'API 不支持' });
    }
    // 先查是否已持久化
    return navigator.storage.persisted().then(function(alreadyPersisted) {
      if (alreadyPersisted) return { supported: true, granted: true, alreadyPersisted: true };
      // 申请
      return navigator.storage.persist().then(function(granted) {
        return { supported: true, granted: !!granted, alreadyPersisted: false };
      });
    }).catch(function(e) {
      return { supported: true, granted: false, error: e.message || String(e) };
    });
  }

  /** 查询存储配额和当前用量 */
  function estimate() {
    if (!(navigator.storage && navigator.storage.estimate)) {
      return Promise.resolve({ supported: false });
    }
    return navigator.storage.estimate().then(function(est) {
      var usageMB = est.usage ? (est.usage / 1048576).toFixed(2) : '?';
      var quotaMB = est.quota ? (est.quota / 1048576).toFixed(2) : '?';
      var percent = (est.usage && est.quota) ? (est.usage * 100 / est.quota).toFixed(1) : '?';
      return {
        supported: true,
        usage: est.usage,
        quota: est.quota,
        usageMB: usageMB,
        quotaMB: quotaMB,
        percent: percent,
        summary: usageMB + ' MB / ' + quotaMB + ' MB (' + percent + '%)'
      };
    }).catch(function(e) {
      return { supported: true, error: e.message || String(e) };
    });
  }

  return {
    open: open,
    save: save,
    load: load,
    list: list,
    delete: deleteSave,
    saveProject: saveProject,
    loadProject: loadProject,
    migrateFromLocalStorage: migrateFromLocalStorage,
    migrateFromOldDB: migrateFromOldDB,
    isAvailable: function() { return _available; },
    // R104 新增
    requestPersistent: requestPersistent,
    estimate: estimate
  };
})();

// 页面加载时立即打开数据库并迁移旧存档
TM_SaveDB.open().then(function() {
  if (TM_SaveDB.isAvailable()) {
    TM_SaveDB.migrateFromLocalStorage();
    TM_SaveDB.migrateFromOldDB(); // 从旧数据库名(tianming_saves)迁移
    // R104·自动申请持久化存储，扩大实际可用配额（从"best-effort"到"persistent"）
    TM_SaveDB.requestPersistent().then(function(r) {
      if (r.granted) {
        console.log('[SaveDB] 持久化存储已' + (r.alreadyPersisted ? '预先启用' : '获批'));
      } else if (r.supported) {
        console.log('[SaveDB] 持久化存储未获批·仍可正常使用(best-effort 模式)');
      }
    });
    // 启动时打印一次配额
    TM_SaveDB.estimate().then(function(e) {
      if (e.supported && !e.error) console.log('[SaveDB] 存储: ' + e.summary);
    });
  }
});
