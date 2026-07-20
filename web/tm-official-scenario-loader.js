// tm-official-scenario-loader.js
// 官方剧本首屏只注册轻量元数据；玩家真正开卷时再加载完整脚本。
(function(global){
  'use strict';

  var manifest = global.TMOfficialScenarioManifest || null;
  var byId = Object.create(null);
  var readyPromise = null;
  var loadPromises = Object.create(null);
  var loadedScenarios = Object.create(null);
  var deferredReconcile = Object.create(null);
  var metadataReady = false;
  var DEFAULT_MANIFEST_TIMEOUT_MS = 15000;
  var DEFAULT_SCRIPT_TIMEOUT_MS = 60000;
  var DEFAULT_LOAD_RETRIES = 1;
  var OFFICIAL_ROW_KEYS = ['characters', 'factions', 'parties', 'classes', 'variables', 'events', 'relations', 'items', 'rigidHistoryEvents'];

  function positiveSetting(name, fallback){
    var configured = Number(global[name]);
    return isFinite(configured) && configured > 0 ? configured : fallback;
  }

  function retrySetting(){
    var configured = Number(global.TM_OFFICIAL_SCENARIO_LOAD_RETRIES);
    if (!isFinite(configured) || configured < 0) return DEFAULT_LOAD_RETRIES;
    return Math.min(3, Math.floor(configured));
  }

  function timeoutError(label, timeoutMs){
    var error = new Error(label + ' timed out after ' + timeoutMs + 'ms');
    error.code = 'TM_OFFICIAL_SCENARIO_TIMEOUT';
    return error;
  }

  function retry(operation, retries){
    var attempt = 0;
    function run(){
      return Promise.resolve().then(function(){ return operation(attempt); }).catch(function(error){
        if (attempt >= retries) throw error;
        attempt += 1;
        return run();
      });
    }
    return run();
  }

  function fetchManifestOnce(){
    var timeoutMs = positiveSetting('TM_OFFICIAL_SCENARIO_MANIFEST_TIMEOUT_MS', DEFAULT_MANIFEST_TIMEOUT_MS);
    return new Promise(function(resolve, reject){
      var settled = false;
      var controller = (typeof global.AbortController === 'function') ? new global.AbortController() : null;
      var timer = setTimeout(function(){
        if (settled) return;
        settled = true;
        try { if (controller) controller.abort(); } catch(_) {}
        reject(timeoutError('official scenario manifest', timeoutMs));
      }, timeoutMs);
      function finish(callback, value){
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      }
      try {
        Promise.resolve(fetch('bundled-scenarios/manifest.json', {
          cache: 'no-cache',
          signal: controller ? controller.signal : undefined
        })).then(function(resp){
          if (!resp.ok) throw new Error('official scenario manifest HTTP ' + resp.status);
          return resp.json();
        }).then(function(data){ finish(resolve, data); }, function(error){ finish(reject, error); });
      } catch(error) {
        finish(reject, error);
      }
    });
  }

  function entries(){ return manifest && Array.isArray(manifest.entries) ? manifest.entries : []; }

  function indexManifest(){
    byId = Object.create(null);
    entries().forEach(function(entry){ if (entry && entry.id) byId[entry.id] = entry; });
  }

  function currentScenario(id){
    if (!global.P || !Array.isArray(global.P.scenarios)) return null;
    for (var i = 0; i < global.P.scenarios.length; i++) {
      var sc = global.P.scenarios[i];
      if (sc && sc.id === id) return sc;
    }
    return null;
  }

  function removeScenario(id){
    if (!global.P || !Array.isArray(global.P.scenarios)) return;
    global.P.scenarios = global.P.scenarios.filter(function(sc){ return !sc || sc.id !== id; });
  }

  function removePersistedOfficialRows(id){
    if (!global.P || (global.GM && global.GM.running)) return;
    OFFICIAL_ROW_KEYS.forEach(function(key){
      if (!Array.isArray(global.P[key])) return;
      global.P[key] = global.P[key].filter(function(row){ return !row || row.sid !== id; });
    });
  }

  function makePlaceholder(entry){
    return {
      id: entry.id,
      name: entry.name || entry.id,
      era: entry.era || '',
      role: entry.role || '',
      background: entry.background || '',
      active: entry.active !== false,
      _lazyOfficial: true,
      _officialManifest: {
        key: entry.key || '',
        scriptUrl: entry.scriptUrl || entry.builtinScript || '',
        sha256: entry.sha256 || '',
        bytes: Number(entry.bytes || 0),
        hasMap: entry.hasMap === true,
        counts: entry.counts || {}
      }
    };
  }

  function isActiveScenario(id){
    return !!(global.GM && global.GM.running && global.GM.sid === id);
  }

  function registerMetadata(){
    if (!manifest || !Array.isArray(manifest.entries) || !global.P || !Array.isArray(global.P.scenarios)) return false;
    indexManifest();
    entries().forEach(function(entry){
      if (!entry || !entry.id) return;
      var existing = currentScenario(entry.id);
      if (isActiveScenario(entry.id)) {
        var loadedActive = loadedScenarios[entry.id];
        if (isFullScenario(loadedActive)) {
          if (existing !== loadedActive) {
            removeScenario(entry.id);
            global.P.scenarios.push(loadedActive);
          }
          return;
        }
        if (isFullScenario(existing)) {
          // 启动后的 IDB/desktop 恢复可能晚到。进行中的 GM 必须继续看到完整剧本；
          // 等离开本局后再把这个持久化副本降回 manifest 占位。
          loadedScenarios[entry.id] = existing;
          deferredReconcile[entry.id] = true;
          delete loadPromises[entry.id];
          return;
        }
      }
      if (existing && (existing._lazyOfficial === true || loadedScenarios[entry.id] === existing)) return;
      // P 的异步恢复可能把存档里的旧官方全量数据重新盖回来。官方内容以随包脚本为准：
      // 未开局时丢弃持久化副本和全局行，只保留 manifest 占位，避免旧数据漂移与启动内存回涨。
      removeScenario(entry.id);
      removePersistedOfficialRows(entry.id);
      global.P.scenarios.push(makePlaceholder(entry));
    });
    metadataReady = true;
    return true;
  }

  function waitForP(){
    return new Promise(function(resolve, reject){
      var tries = 0;
      (function poll(){
        if (registerMetadata()) { resolve(manifest); return; }
        if (tries++ > 200) { reject(new Error('P.scenarios unavailable')); return; }
        setTimeout(poll, 25);
      })();
    });
  }

  function ready(){
    if (metadataReady) return Promise.resolve(manifest);
    if (readyPromise) return readyPromise;
    readyPromise = Promise.resolve().then(function(){
      if (manifest) return manifest;
      if (typeof fetch !== 'function') throw new Error('official scenario manifest unavailable');
      return retry(fetchManifestOnce, retrySetting())
        .then(function(data){ manifest = data; global.TMOfficialScenarioManifest = data; return data; });
    }).then(function(){ return waitForP(); }).catch(function(error){
      readyPromise = null;
      console.warn('[official-scenario-loader] metadata unavailable:', error && error.message || error);
      throw error;
    });
    return readyPromise;
  }

  function isFullScenario(sc){ return !!(sc && sc._lazyOfficial !== true); }

  function reconcile(){
    entries().forEach(function(entry){
      if (!entry || !entry.id || !deferredReconcile[entry.id] || isActiveScenario(entry.id)) return;
      delete deferredReconcile[entry.id];
      delete loadedScenarios[entry.id];
      delete loadPromises[entry.id];
      removeScenario(entry.id);
    });
    metadataReady = false;
    // manifest.js 缺失时 ready() 可能正在走 JSON fetch；不可在此清掉它并制造双请求。
    if (!manifest || !Array.isArray(manifest.entries)) return false;
    readyPromise = null;
    return registerMetadata();
  }

  function ensure(id){
    var existing = currentScenario(id);
    if (isFullScenario(existing)) {
      loadedScenarios[id] = existing;
      return Promise.resolve(existing);
    }
    if (loadPromises[id]) return loadPromises[id];
    loadPromises[id] = ready().then(function(){
      var entry = byId[id];
      if (!entry) throw new Error('unknown official scenario: ' + id);
      var loaded = currentScenario(id);
      if (isFullScenario(loaded)) {
        loadedScenarios[id] = loaded;
        return loaded;
      }
      var url = entry.scriptUrl || entry.builtinScript;
      if (!url) throw new Error('official scenario script missing: ' + id);
      return retry(function(){
        var fullBeforeRetry = currentScenario(id);
        if (isFullScenario(fullBeforeRetry)) {
          loadedScenarios[id] = fullBeforeRetry;
          return fullBeforeRetry;
        }
        var timeoutMs = positiveSetting('TM_OFFICIAL_SCENARIO_SCRIPT_TIMEOUT_MS', DEFAULT_SCRIPT_TIMEOUT_MS);
        return new Promise(function(resolve, reject){
          var settled = false;
          var script = document.createElement('script');
          var timer = null;
          function cleanup(remove){
            if (timer) clearTimeout(timer);
            script.onload = null;
            script.onerror = null;
            if (!remove) return;
            try {
              if (typeof script.remove === 'function') script.remove();
              else if (script.parentNode) script.parentNode.removeChild(script);
            } catch(_) {}
          }
          function fail(error){
            if (settled) return;
            settled = true;
            cleanup(true);
            reject(error);
          }
          script.src = url + (entry.sha256 ? '?v=' + entry.sha256.slice(0, 16) : '');
          script.async = true;
          script.onload = function(){
            if (settled) return;
            var full = currentScenario(id);
            if (isFullScenario(full)) {
              settled = true;
              cleanup(false);
              loadedScenarios[id] = full;
              resolve(full);
            }
            else fail(new Error('official scenario did not register: ' + id));
          };
          script.onerror = function(){ fail(new Error('failed to load official scenario: ' + id)); };
          timer = setTimeout(function(){ fail(timeoutError('official scenario script ' + id, timeoutMs)); }, timeoutMs);
          try { (document.head || document.documentElement).appendChild(script); }
          catch(error) { fail(error); }
        });
      }, retrySetting());
    }).catch(function(error){ delete loadPromises[id]; throw error; });
    return loadPromises[id];
  }

  function manifestEntry(id){ return byId[id] || null; }
  function isLazy(id){ var sc = currentScenario(id); return !!(sc && sc._lazyOfficial === true); }
  function hasMap(id){ var entry = manifestEntry(id); return !!(entry && entry.hasMap); }
  function counts(id){ var entry = manifestEntry(id); return (entry && entry.counts) || {}; }

  global.TMOfficialScenarioLoader = {
    ready: ready,
    ensure: ensure,
    isLazy: isLazy,
    hasMap: hasMap,
    counts: counts,
    entry: manifestEntry,
    reconcile: reconcile,
    isMetadataReady: function(){ return metadataReady; }
  };

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('tm:p-restored', function(){
      entries().forEach(function(entry){
        if (!entry || !entry.id) return;
        var current = currentScenario(entry.id);
        if (isActiveScenario(entry.id)) {
          var loadedActive = loadedScenarios[entry.id];
          if (isFullScenario(loadedActive)) {
            if (current !== loadedActive) {
              removeScenario(entry.id);
              global.P.scenarios.push(loadedActive);
            }
            return;
          }
          if (isFullScenario(current)) {
            loadedScenarios[entry.id] = current;
            deferredReconcile[entry.id] = true;
            delete loadPromises[entry.id];
            return;
          }
        }
        if (loadedScenarios[entry.id] && current !== loadedScenarios[entry.id]) {
          delete loadedScenarios[entry.id];
          delete loadPromises[entry.id];
        }
      });
      // 同步复位，保证恢复事件后的下一次剧本列表渲染不会看到旧官方副本。
      reconcile();
      var activeId = global.GM && global.GM.running && global.GM.sid;
      if (activeId && byId[activeId] && isLazy(activeId)) ensure(activeId).catch(function(){});
    });
  }

  ready().catch(function(){});
})(typeof window !== 'undefined' ? window : globalThis);
