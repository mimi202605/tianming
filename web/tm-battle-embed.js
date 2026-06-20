/* tm-battle-embed.js — 御驾亲征接入 · Phase 1「§13.1 iframe 嵌入」
 * 主游戏开全屏 iframe 载战术战斗原型(web/battle/index.html·已打包随 web/ 三端可达),
 * postMessage 握手:收 battleReady→发 startBattle(config);收 battleResult/Aborted/Error→关 iframe·resolve。
 * 隔离:原型零依赖单文件·全局不与主游戏 660 文件撞车(iframe 独立 window)。result 回填 GM 属 Phase 2。
 */
(function () {
  'use strict';
  var BATTLE_URL = 'battle/index.html';   // 打包路径(相对 web/·Electron/web/Capacitor 皆可达)

  function launch(config) {
    return new Promise(function (resolve) {
      if (typeof document === 'undefined') { resolve(null); return; }
      var overlay = document.createElement('div');
      overlay.id = 'tm-battle-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#0a0907;';
      var iframe = document.createElement('iframe');
      iframe.setAttribute('title', '御驾亲征·战术战斗');
      iframe.setAttribute('allow', 'autoplay; fullscreen');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block;';
      iframe.src = BATTLE_URL;
      var bar = document.createElement('div');
      bar.style.cssText = 'position:absolute;top:8px;right:10px;z-index:10;';
      var abortBtn = document.createElement('button');
      abortBtn.type = 'button';
      abortBtn.textContent = '✕ 放弃·转庙算';
      abortBtn.style.cssText = 'font:13px/1 serif;color:#e8d6a8;background:rgba(20,14,8,.86);border:1px solid #8a6a2a;border-radius:4px;padding:6px 11px;cursor:pointer;';
      bar.appendChild(abortBtn);
      overlay.appendChild(iframe);
      overlay.appendChild(bar);

      var done = false, started = false;
      function finish(result) {
        if (done) return; done = true;
        try { window.removeEventListener('message', onMsg); } catch (e) {}
        try { overlay.remove(); } catch (e) {}
        resolve(result);
      }
      function sendStart() {
        if (started) return; started = true;
        try { iframe.contentWindow.postMessage({ type: 'startBattle', config: config }, '*'); } catch (e) {}
      }
      function onMsg(e) {
        if (iframe.contentWindow && e.source !== iframe.contentWindow) return;   // 只认本 iframe
        var d = e.data || {};
        if (d.type === 'battleReady') sendStart();
        else if (d.type === 'battleResult') finish(d.result || { outcome: 'unknown' });
        else if (d.type === 'battleAborted') finish(null);
        else if (d.type === 'battleError') finish({ error: d.error });
      }
      window.addEventListener('message', onMsg);
      iframe.addEventListener('load', function () { setTimeout(sendStart, 700); });   // 兜底:battleReady 漏接也能起战
      abortBtn.onclick = function () { try { iframe.contentWindow.postMessage({ type: 'abort' }, '*'); } catch (e) {} finish(null); };

      document.body.appendChild(overlay);
    });
  }

  /* 便捷:从交战军群直接拉起(走 Phase1 适配器 buildBattleConfig) */
  function launchFromArmies(playerArmies, enemyArmies, opts) {
    if (typeof window === 'undefined' || !window.TMBattleAdapter) return Promise.resolve(null);
    var cfg = window.TMBattleAdapter.buildBattleConfig(playerArmies, enemyArmies, opts || {});
    return launch(cfg);
  }

  if (typeof window !== 'undefined') window.TMBattleEmbed = { launch: launch, launchFromArmies: launchFromArmies, BATTLE_URL: BATTLE_URL };
})();
