(function(global) {
  'use strict';

  var STORAGE_KEY = 'tm.scenarioEditorReset.formalSandbox.v1';
  var RETURN_STORAGE_KEY = 'tm.scenarioEditorReset.runtimeReturn.v1';
  var RETURN_DB_NAME = 'tm-scenario-editor-reset-projects';
  var RETURN_DB_STORE = 'projectBodies';
  var RETURN_DB_PREFIX = 'runtimeReturn:';
  var SANDBOX_FLAG = '_scenarioEditorSandbox';
  var ROW_KEYS = ['characters', 'factions', 'classes', 'parties', 'items', 'relations', 'families', 'events', 'rigidHistoryEvents', 'timeline'];

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function query() {
    try {
      return new URLSearchParams(global.location.search || '');
    } catch (_) {
      return { get: function() { return ''; } };
    }
  }

  function returnDbId(id) {
    return RETURN_DB_PREFIX + String(id || 'latest');
  }

  function openReturnDb() {
    return new Promise(function(resolve) {
      if (!global.indexedDB) {
        resolve(null);
        return;
      }
      try {
        var request = global.indexedDB.open(RETURN_DB_NAME, 1);
        request.onupgradeneeded = function(event) {
          var db = event.target.result;
          if (!db.objectStoreNames.contains(RETURN_DB_STORE)) db.createObjectStore(RETURN_DB_STORE, { keyPath: 'id' });
        };
        request.onsuccess = function(event) { resolve(event.target.result); };
        request.onerror = function() { resolve(null); };
      } catch (_) { resolve(null); }
    });
  }

  function getReturnPayloadFromDb(key) {
    return openReturnDb().then(function(db) {
      if (!db) return null;
      return new Promise(function(resolve) {
        try {
          var tx = db.transaction(RETURN_DB_STORE, 'readonly');
          var request = tx.objectStore(RETURN_DB_STORE).get(key);
          request.onsuccess = function() {
            db.close();
            resolve(request.result && request.result.runtimeReturn ? request.result.runtimeReturn : null);
          };
          request.onerror = function() { db.close(); resolve(null); };
        } catch (_) { resolve(null); }
      });
    }).catch(function() { return null; });
  }

  function deleteReturnPayloadFromDb(key) {
    openReturnDb().then(function(db) {
      if (!db) return;
      try {
        var tx = db.transaction(RETURN_DB_STORE, 'readwrite');
        tx.objectStore(RETURN_DB_STORE).delete(key);
        tx.oncomplete = function() { db.close(); };
        tx.onerror = function() { db.close(); };
      } catch (_) {}
    }).catch(function() {});
  }

  function readPayload() {
    var params = query();
    var id = params.get('tmScenarioSandbox');
    if (!id) return null;
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var payload = JSON.parse(raw);
      if (!payload || !payload.scenario) return null;
      if (payload.id && payload.id !== id) return null;
      return payload;
    } catch (err) {
      console.error('[ScenarioSandboxBridge] read failed', err);
      return null;
    }
  }

  function readReturnPayload() {
    var params = query();
    var id = params.get('tmScenarioEditorReturn');
    if (!id) return Promise.resolve(null);
    try {
      var raw = global.localStorage && global.localStorage.getItem(RETURN_STORAGE_KEY);
      if (!raw) return Promise.resolve(null);
      var payload = JSON.parse(raw);
      if (!payload) return Promise.resolve(null);
      if (payload.scenario) {
        if (payload.id && payload.id !== id) return Promise.resolve(null);
        return Promise.resolve(payload);
      }
      if (payload.storage === 'indexedDB' || payload.dbKey) {
        return getReturnPayloadFromDb(payload.dbKey || returnDbId(id)).then(function(dbPayload) {
          if (!dbPayload || !dbPayload.scenario) return null;
          if (dbPayload.id && dbPayload.id !== id) return null;
          return dbPayload;
        });
      }
      return Promise.resolve(null);
    } catch (err) {
      console.error('[ScenarioSandboxBridge] return read failed', err);
      return Promise.resolve(null);
    }
  }

  function ensureP() {
    if (!global.P) global.P = {};
    if (!Array.isArray(global.P.scenarios)) global.P.scenarios = [];
    ROW_KEYS.forEach(function(key) {
      if (!Array.isArray(global.P[key])) global.P[key] = [];
    });
    if (!global.P.conf) global.P.conf = {};
    if (!global.P.ai) global.P.ai = {};
    if (!global.P.time) global.P.time = {};
  }

  function removeSandboxRows() {
    if (!global.P) return false;
    var changed = false;
    if (Array.isArray(global.P.scenarios)) {
      var scenarios = global.P.scenarios.filter(function(row) { return !(row && row[SANDBOX_FLAG]); });
      changed = changed || scenarios.length !== global.P.scenarios.length;
      global.P.scenarios = scenarios;
    }
    ROW_KEYS.forEach(function(key) {
      if (!Array.isArray(global.P[key])) return;
      var rows = global.P[key].filter(function(row) { return !(row && row[SANDBOX_FLAG]); });
      changed = changed || rows.length !== global.P[key].length;
      global.P[key] = rows;
    });
    return changed;
  }

  function normalizeScenario(input, id) {
    var sc = clone(input || {});
    sc.id = id || sc.id || ('scenario-editor-sandbox-' + Date.now().toString(36));
    sc.name = sc.name || '预览沙盒剧本';
    sc.era = sc.era || (sc.gameSettings && sc.gameSettings.eraName) || '';
    sc.role = sc.role || (sc.playerInfo && sc.playerInfo.playerRole) || '沙盒测试';
    sc.background = sc.background || sc.overview || '来自新剧本编辑器的正式运行时沙盒测试。';
    if (!sc.opening || String(sc.opening).length < 80) {
      sc.opening = sc.background + '\n\n当前剧本由新剧本编辑器注入正式游戏沙盒，用于验证开局运行与数据读取。';
    }
    sc.active = true;
    sc[SANDBOX_FLAG] = true;
    ROW_KEYS.forEach(function(key) {
      if (!Array.isArray(sc[key])) return;
      sc[key] = sc[key].map(function(row) {
        var next = clone(row);
        next.sid = sc.id;
        next[SANDBOX_FLAG] = true;
        return next;
      });
    });
    return sc;
  }

  function normalizeRuntimeScenario(input, id) {
    var sc = clone(input || {});
    sc.id = id || sc.id || ('scenario-editor-return-' + Date.now().toString(36));
    sc.name = sc.name || '未命名剧本';
    sc.era = sc.era || (sc.gameSettings && sc.gameSettings.eraName) || '';
    sc.role = sc.role || (sc.playerInfo && sc.playerInfo.playerRole) || '';
    sc.background = sc.background || sc.overview || sc.desc || '';
    sc.active = sc.active !== false;
    delete sc[SANDBOX_FLAG];
    ROW_KEYS.forEach(function(key) {
      if (!Array.isArray(sc[key])) return;
      sc[key] = sc[key].map(function(row) {
        var next = clone(row);
        next.sid = sc.id;
        delete next[SANDBOX_FLAG];
        return next;
      });
    });
    return sc;
  }

  function installRows(key, rows, sid, options) {
    if (!Array.isArray(rows) || !rows.length) return;
    var opts = options || {};
    global.P[key] = (global.P[key] || []).filter(function(row) {
      return row && row.sid !== sid && !row[SANDBOX_FLAG];
    });
    global.P[key] = global.P[key].concat(rows.map(function(row) {
      var next = clone(row);
      next.sid = sid;
      if (opts.sandbox !== false) next[SANDBOX_FLAG] = true;
      else delete next[SANDBOX_FLAG];
      return next;
    }));
  }

  function persistReturnedScenarioToDesktop(sc) {
    if (!sc || !(global.tianming && global.tianming.isDesktop && typeof global.tianming.saveScenario === 'function')) return;
    var filename = sc.name || sc.title || sc.id || 'scenario';
    try {
      var result = global.tianming.saveScenario(filename, sc);
      if (result && typeof result.then === 'function') {
        result.catch(function(err) {
          console.warn('[ScenarioSandboxBridge] desktop scenario save failed', err);
        });
      }
    } catch (err2) {
      console.warn('[ScenarioSandboxBridge] desktop scenario save failed', err2);
    }
  }

  function installSandboxScenario(payload) {
    ensureP();
    removeSandboxRows();
    var sc = normalizeScenario(payload.scenario, payload.id);
    global.P.scenarios.unshift(sc);
    ROW_KEYS.forEach(function(key) {
      installRows(key, sc[key], sc.id);
    });
    try {
      if (typeof global.buildIndices === 'function') global.buildIndices();
    } catch (err) {
      console.warn('[ScenarioSandboxBridge] buildIndices failed', err);
    }
    global.TM_SCENARIO_EDITOR_SANDBOX = {
      id: sc.id,
      scenario: sc,
      payload: payload,
      installedAt: new Date().toISOString(),
      aiPausedForAutostart: false
    };
    return sc;
  }

  function installReturnedScenario(payload, options) {
    var opts = options || {};
    ensureP();
    var sc = normalizeRuntimeScenario(payload.scenario, payload.id || (payload.scenario && payload.scenario.id));
    global.P.scenarios = (global.P.scenarios || []).filter(function(row) {
      return row && row.id !== sc.id && !row[SANDBOX_FLAG];
    });
    global.P.scenarios.unshift(sc);
    ROW_KEYS.forEach(function(key) {
      installRows(key, sc[key], sc.id, { sandbox: false });
    });
    try {
      if (typeof global.buildIndices === 'function') global.buildIndices();
    } catch (err) {
      console.warn('[ScenarioSandboxBridge] return buildIndices failed', err);
    }
    try {
      if (typeof global.saveP === 'function') global.saveP();
    } catch (err2) {
      console.warn('[ScenarioSandboxBridge] return saveP failed', err2);
    }
    persistReturnedScenarioToDesktop(sc);
    global.TM_SCENARIO_EDITOR_RETURN = {
      id: sc.id,
      scenario: sc,
      payload: payload,
      installedAt: new Date().toISOString()
    };
    try {
      if (!opts.silent && typeof global.toast === 'function') global.toast('新版剧本工坊已写回：' + (sc.name || sc.id));
    } catch (_) {}
    return sc;
  }

  function refreshReturnedScenarioView() {
    setTimeout(function() {
      if (typeof global.showScnManage === 'function') global.showScnManage();
      else if (typeof global.showScnSelect === 'function') global.showScnSelect();
    }, 0);
  }

  function clearReturnPayload(payload) {
    var id = payload && payload.id;
    try {
      if (global.localStorage) global.localStorage.removeItem(RETURN_STORAGE_KEY);
    } catch (_) {}
    deleteReturnPayloadFromDb(returnDbId(id));
  }

  function handleReturnedScenario(payload) {
    var settled = false;
    installReturnedScenario(payload);
    refreshReturnedScenarioView();

    function reapplyAfterRestore() {
      if (settled) return;
      installReturnedScenario(payload, { silent: true });
      refreshReturnedScenarioView();
    }

    if (global.addEventListener) global.addEventListener('tm:p-restored', reapplyAfterRestore);
    // 2.5s 兜底重装一次（旧档同步恢复多在此前完成）
    setTimeout(reapplyAfterRestore, 2500);
    // 治竞态：旧档异步恢复（tm:p-restored）可能晚于 2.5s。listener 保留到 60s，
    // 期间每次 restore 都幂等重装，写回结果不再被慢恢复覆盖；之后才摘 listener、清暂存。
    setTimeout(function() {
      settled = true;
      if (global.removeEventListener) global.removeEventListener('tm:p-restored', reapplyAfterRestore);
      clearReturnPayload(payload);
    }, 60000);
  }

  function startWithPausedAi(sc) {
    if (!sc || typeof global.startGame !== 'function') return false;
    var originalKey = global.P && global.P.ai ? global.P.ai.key : '';
    var hadKey = !!originalKey;
    if (hadKey) {
      global.P.ai.key = '';
      global.TM_SCENARIO_EDITOR_SANDBOX.aiPausedForAutostart = true;
    }
    try {
      var result = global.startGame(sc.id);
      Promise.resolve(result).finally(function() {
        if (hadKey && global.P && global.P.ai) {
          global.P.ai.key = originalKey;
          try {
            if (typeof global.saveP === 'function') global.saveP();
          } catch (_) {}
        }
      });
      return true;
    } catch (err) {
      if (hadKey && global.P && global.P.ai) global.P.ai.key = originalKey;
      console.error('[ScenarioSandboxBridge] autostart failed', err);
      return false;
    }
  }

  function boot() {
    ensureP();
    readReturnPayload().then(function(returned) {
      if (returned) {
        handleReturnedScenario(returned);
        return;
      }
      var payload = readPayload();
      if (!payload) {
        if (removeSandboxRows()) {
          try {
            if (typeof global.buildIndices === 'function') global.buildIndices();
            if (typeof global.saveP === 'function') global.saveP();
          } catch (_) {}
        }
        return;
      }
      var sc = installSandboxScenario(payload);
      var params = query();
      if (params.get('tmScenarioAutoStart') === '1') {
        setTimeout(function() { startWithPausedAi(sc); }, 0);
      } else if (typeof global.showScnSelect === 'function') {
        setTimeout(function() { global.showScnSelect(); }, 0);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
})(window);
