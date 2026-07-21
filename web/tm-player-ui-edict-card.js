// ============================================================
// tm-player-ui-edict-card.js — 穿越模式 Phase A · Task A5 奉旨卡片浮层
// ------------------------------------------------------------
// 暴露：window.TM.PlayerEdictCard.{
//   show, expand, dismiss, _entriesThisTurn, _resetTurn
// }
// 依赖：P.playerInfo / GM.turn / toast（软依赖）
// 跨朝代铁律：术语朝代中立（奉旨/圣旨/批答/批语/品语）
// ============================================================

(function (global) {
  'use strict';
  if (!global.TM) global.TM = {};
  if (global.TM.PlayerEdictCard) return;

  var MAX_PER_TURN = 3;
  var _entries = {};        // entryId → entry（详情缓存）
  var _shownThisTurn = 0;
  var _lastTurn = null;

  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') return GM.turn; } catch (_) {}
    return 0;
  }
  function _isTrans() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.transmigrationMode === true &&
               P.playerInfo.playerRole && P.playerInfo.playerRole !== 'emperor';
      }
    } catch (_) {}
    return false;
  }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _$(id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  }
  function _rndId() { return 'edict_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerEdictCard]', m); } catch (_) {}
  }

  function _resetTurn() {
    var t = _curTurn();
    if (_lastTurn !== t) {
      _lastTurn = t;
      _shownThisTurn = 0;
      // 跨回合清空·避免 _entries 无限累积（上回合 toast/modal 早该消失）
      // 用 delete 而非 _entries = {} 以保持 PlayerEdictCard._entries 外部引用有效
      Object.keys(_entries).forEach(function (k) { delete _entries[k]; });
    }
  }

  // ── show(entry) ────────────────────────────────────────────
  // entry = { type, memorialId, title, verdict, comment, grade, consequences, ts }
  function show(entry) {
    if (!_isTrans()) return false;
    if (!entry || typeof entry !== 'object') return false;
    _resetTurn();
    var entryId = entry.id || _rndId();
    entry.id = entryId;
    _entries[entryId] = entry;

    if (_shownThisTurn >= MAX_PER_TURN) {
      // 防骚扰·仅累积不弹
      _toast('又有奉旨·已累积至近况列表');
      return false;
    }
    _shownThisTurn++;
    _renderToast(entry);
    return true;
  }

  function _renderToast(entry) {
    if (typeof document === 'undefined') return;
    var host = _$('player-edict-card-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'player-edict-card-host';
      host.className = 'edict-card-host';
      document.body.appendChild(host);
    }
    var toastEl = document.createElement('div');
    toastEl.className = 'edict-card-toast';
    toastEl.setAttribute('data-id', entry.id);
    var prefix = entry.type === 'memorial-reply' ? '📜 奉旨卡片' : '📜 圣旨到';
    var html = '<div class="edict-card-toast-head">';
    html += '<span class="edict-card-toast-title">' + prefix + '</span>';
    html += '<span class="edict-card-toast-actions">';
    html += '<button type="button" class="edict-card-toast-expand" data-id="' + _esc(entry.id) + '">展开详情</button>';
    html += '<button type="button" class="edict-card-toast-close" data-id="' + _esc(entry.id) + '">×</button>';
    html += '</span></div>';
    html += '<div class="edict-card-toast-body">' + _esc(entry.title || '') + '</div>';
    if (entry.comment) html += '<div class="edict-card-toast-comment">批语：' + _esc(entry.comment) + '</div>';
    if (entry.grade) html += '<div class="edict-card-toast-grade">品语：' + _esc(entry.grade) + '</div>';
    toastEl.innerHTML = html;
    host.appendChild(toastEl);

    // 绑定按钮
    try {
      toastEl.querySelector('.edict-card-toast-expand').addEventListener('click', function () {
        expand(entry.id);
      });
      toastEl.querySelector('.edict-card-toast-close').addEventListener('click', function () {
        dismiss(entry.id);
      });
    } catch (_) {}

    // 5 秒后自动消失（句柄存到 toastEl 上，dismiss 时 clearTimeout 避免误关 modal）
    toastEl._dismissTimer = setTimeout(function () { dismiss(entry.id); }, 5000);
  }

  function expand(entryId) {
    var entry = _entries[entryId];
    if (!entry || typeof document === 'undefined') return;
    // 关闭已有模态
    dismiss(entryId, true);
    var existing = _$('player-edict-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'player-edict-modal';
    modal.className = 'edict-card-modal';
    var html = '<div class="edict-card-modal-inner">';
    html += '<div class="edict-card-modal-head">📜 奉旨卡片 <button class="edict-card-modal-close">×</button></div>';
    html += '<div class="edict-card-modal-body">';
    if (entry.title) html += '<div class="edict-card-modal-row"><label>奏疏原题</label><div>' + _esc(entry.title) + '</div></div>';
    if (entry.verdict) html += '<div class="edict-card-modal-row"><label>批答</label><div>' + _esc(entry.verdict) + '</div></div>';
    if (entry.comment) html += '<div class="edict-card-modal-row"><label>批语</label><div>' + _esc(entry.comment) + '</div></div>';
    if (entry.grade) html += '<div class="edict-card-modal-row"><label>品语</label><div>' + _esc(entry.grade) + '</div></div>';
    if (entry.consequences) {
      html += '<div class="edict-card-modal-row"><label>后果</label><div><ul>';
      var cons = Array.isArray(entry.consequences) ? entry.consequences : [entry.consequences];
      cons.forEach(function (c) { html += '<li>' + _esc(typeof c === 'string' ? c : JSON.stringify(c)) + '</li>'; });
      html += '</ul></div></div>';
    }
    html += '</div>';
    html += '<div class="edict-card-modal-foot"><button class="edict-card-modal-ok">收到·关闭</button></div>';
    html += '</div>';
    modal.innerHTML = html;
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('edict-card-modal-close') ||
          e.target.classList.contains('edict-card-modal-ok')) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  function dismiss(entryId, skipModal) {
    if (typeof document === 'undefined') return;
    if (entryId) {
      var toastEl = document.querySelector('.edict-card-toast[data-id="' + entryId + '"]');
      if (toastEl) {
        if (toastEl._dismissTimer) {
          try { clearTimeout(toastEl._dismissTimer); } catch (_) {}
          toastEl._dismissTimer = null;
        }
        toastEl.remove();
      }
    } else {
      // 全部关闭
      var host = _$('player-edict-card-host');
      if (host) host.innerHTML = '';
    }
    if (!skipModal) {
      var modal = _$('player-edict-modal');
      if (modal) modal.remove();
    }
  }

  var PlayerEdictCard = {
    show: show,
    expand: expand,
    dismiss: dismiss,
    _entriesThisTurn: function () { _resetTurn(); return _shownThisTurn; },
    _resetTurn: _resetTurn,
    _entries: _entries
  };

  global.TM.PlayerEdictCard = PlayerEdictCard;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerEdictCard;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
