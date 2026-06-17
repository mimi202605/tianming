// ============================================================
// 剧本编辑器 — 官制系统 (Government Tree + Admin Hierarchy)
// 依赖: editor-core.js (scriptData, escHtml, autoSave, etc.)
// ============================================================
  function renderGovernment() {
    document.getElementById('govName').value
      = scriptData.government.name || '';
    document.getElementById('govDesc').value
      = scriptData.government.description || '';
    document.getElementById('govSelectionSystem').value
      = scriptData.government.selectionSystem || '';
    document.getElementById('govPromotionSystem').value
      = scriptData.government.promotionSystem || '';
    var _histRef = document.getElementById('govHistoricalRef');
    if (_histRef) _histRef.value = scriptData.government.historicalReference || '';
    renderGovTree();
    if (typeof renderOfficeConfig === 'function') renderOfficeConfig();
    updateBadge(
      'government',
      scriptData.government.nodes.length
    );
  }

  function renderOfficeTree() {
    console.log('[renderOfficeTree] Called with:', {
      hasOfficeTree: !!scriptData.officeTree,
      officeTreeLength: scriptData.officeTree ? scriptData.officeTree.length : 0,
      hasGovernment: !!scriptData.government,
      governmentNodesLength: scriptData.government && scriptData.government.nodes ? scriptData.government.nodes.length : 0
    });
    // officeTree uses same structure as government.nodes
    // Merge officeTree into government.nodes if not already there
    if (Array.isArray(scriptData.officeTree) && scriptData.officeTree.length > 0) {
      console.log('[renderOfficeTree] Merging officeTree into government.nodes');
      scriptData.officeTree.forEach(function(office) {
        var exists = scriptData.government.nodes.some(function(n) {
          return n.name === office.name;
        });
        if (!exists) {
          console.log('[renderOfficeTree] Adding office:', office.name);
          scriptData.government.nodes.push(office);
        }
      });
      // Don't clear officeTree - keep it for compatibility
      // scriptData.officeTree = [];
    }
    // Re-render government tree to show merged data
    renderGovTree();
    // Update badge to show total count
    var totalNodes = scriptData.government.nodes.length;
    updateBadge('government', totalNodes);
  }

  function updateGovField(k, v) {
    scriptData.government[k] = v;
    autoSave();
  }

  // ====== CK3-style interactive tree visualization ======
  var _govTree = {
    scale: 1, panX: 0, panY: 0,
    dragging: false, dragStartX: 0, dragStartY: 0,
    collapsed: {},  // path-string -> true
    NODE_W: 180, NODE_GAP_X: 24, NODE_GAP_Y: 60,
    ROOT_EXTRA_Y: 30
  };

  function renderGovTree() {
    var box = document.getElementById('govTree');
    var nodes = scriptData.government.nodes;
    if (!nodes || !nodes.length) {
      box.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:40px">'
        + '\u6682\u65e0\u90e8\u95e8\u6570\u636e\u3002\u70b9\u51fb\u201c\u6dfb\u52a0\u9876\u7ea7\u90e8\u95e8\u201d\u6216\u201c\u751f\u6210\u793a\u4f8b\u5b98\u5236\u201d\u5f00\u59cb\u3002</div>';
      return;
    }
    _govBuildTree(box);
    updateBadge('government', nodes.length);
  }

  function _govBuildTree(container) {
    // Build virtual root
    var rootName = scriptData.government.name || (scriptData.emperor || '\u6700\u9AD8\u7EDF\u6CBB\u8005');
    var rootDesc = scriptData.government.description || '';
    var nodes = scriptData.government.nodes || [];

    // Layout pass: assign x,y to each node
    var laid = [];  // {dept, path, x, y, w, h, depth, children:[], collapsed, isRoot}
    var rootNode = {
      dept: {name: rootName, desc: rootDesc, functions: [], positions: [], subs: []},
      path: null, x: 0, y: 0, w: _govTree.NODE_W, h: 0,
      depth: 0, children: [], collapsed: false, isRoot: true
    };
    laid.push(rootNode);

    // Recursively build layout nodes
    function buildLayoutNodes(deptArr, basePath, parentLayout, depth) {
      for (var i = 0; i < deptArr.length; i++) {
        var dept = deptArr[i];
        if (!dept) continue;
        var path = basePath.concat(i);
        var pathKey = JSON.stringify(path);
        var isCollapsed = !!_govTree.collapsed[pathKey];
        var ln = {
          dept: dept, path: path, x: 0, y: 0, w: _govTree.NODE_W, h: 0,
          depth: depth, children: [], collapsed: isCollapsed, isRoot: false
        };
        parentLayout.children.push(ln);
        laid.push(ln);
        if (!isCollapsed && dept.subs && dept.subs.length) {
          buildLayoutNodes(dept.subs, path.concat('s'), ln, depth + 1);
        }
      }
    }
    buildLayoutNodes(nodes, [], rootNode, 1);

    // Compute node heights
    for (var i = 0; i < laid.length; i++) {
      var n = laid[i];
      var h = 38; // header
      if (n.dept.desc) h += 18;
      var fns = n.dept.functions || [];
      if (fns.length) h += 22;
      var ps = n.dept.positions || [];
      if (ps.length) h += ps.length * 22;
      h += 30; // actions
      if (n.collapsed && n.dept.subs && n.dept.subs.length) h += 14; // collapsed indicator
      n.h = h;
    }

    // Assign positions using a simple top-down layout
    // Each leaf takes NODE_W + NODE_GAP_X width
    // Parent centers above children
    function getSubtreeWidth(ln) {
      if (ln.children.length === 0) return ln.w;
      var total = 0;
      for (var i = 0; i < ln.children.length; i++) {
        if (i > 0) total += _govTree.NODE_GAP_X;
        total += getSubtreeWidth(ln.children[i]);
      }
      return Math.max(ln.w, total);
    }

    // Gather max height per depth for uniform Y spacing
    var maxHByDepth = {};
    for (var i = 0; i < laid.length; i++) {
      var d = laid[i].depth;
      if (!maxHByDepth[d] || laid[i].h > maxHByDepth[d]) maxHByDepth[d] = laid[i].h;
    }

    function assignPositions(ln, leftX, topY) {
      var stw = getSubtreeWidth(ln);
      // Center this node within its subtree
      ln.x = leftX + (stw - ln.w) / 2;
      ln.y = topY;
      if (ln.children.length > 0) {
        var childY = topY + (maxHByDepth[ln.depth] || ln.h) + _govTree.NODE_GAP_Y;
        var cx = leftX;
        for (var i = 0; i < ln.children.length; i++) {
          var cw = getSubtreeWidth(ln.children[i]);
          assignPositions(ln.children[i], cx, childY);
          cx += cw + _govTree.NODE_GAP_X;
        }
      }
    }
    assignPositions(rootNode, 40, 40);

    // Compute canvas bounds
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < laid.length; i++) {
      var n = laid[i];
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.w > maxX) maxX = n.x + n.w;
      if (n.y + n.h > maxY) maxY = n.y + n.h;
    }
    var canvasW = maxX + 40;
    var canvasH = maxY + 40;

    // Build SVG lines
    var svgLines = '';
    function drawLines(ln) {
      for (var i = 0; i < ln.children.length; i++) {
        var ch = ln.children[i];
        var x1 = ln.x + ln.w / 2;
        var y1 = ln.y + ln.h;
        var x2 = ch.x + ch.w / 2;
        var y2 = ch.y;
        var midY = (y1 + y2) / 2;
        svgLines += '<path d="M' + x1 + ',' + y1 + ' C' + x1 + ',' + midY + ' ' + x2 + ',' + midY + ' ' + x2 + ',' + y2 + '" '
          + 'fill="none" stroke="rgba(201,169,110,0.35)" stroke-width="2"/>';
        drawLines(ch);
      }
    }
    drawLines(rootNode);

    // Build HTML
    var html = '';
    // SVG layer
    html += '<svg width="' + canvasW + '" height="' + canvasH + '" style="position:absolute;top:0;left:0;pointer-events:none">'
      + svgLines + '</svg>';

    // Node layer
    html += '<div class="gov-tree-nodes" style="position:absolute;top:0;left:0;width:' + canvasW + 'px;height:' + canvasH + 'px">';
    for (var i = 0; i < laid.length; i++) {
      html += _govRenderTreeNode(laid[i]);
    }
    html += '</div>';

    // Zoom controls
    html += '<div class="tree-zoom-controls">'
      + '<button onclick="_govZoom(0.1)" title="Zoom in">+</button>'
      + '<button onclick="_govZoom(-0.1)" title="Zoom out">\u2212</button>'
      + '<button onclick="_govZoomReset()" title="Reset">\u2302</button>'
      + '</div>';

    // Minimap
    html += _govBuildMinimap(laid, canvasW, canvasH);

    // Wrap in transform div
    var s = _govTree.scale;
    var tx = _govTree.panX;
    var ty = _govTree.panY;
    container.innerHTML = '<div id="govTreeInner" style="position:absolute;transform-origin:0 0;'
      + 'transform:scale(' + s + ') translate(' + tx + 'px,' + ty + 'px);width:' + canvasW + 'px;height:' + canvasH + 'px">'
      + html + '</div>';

    // Attach pan/zoom handlers
    _govAttachHandlers(container);
    // Update minimap viewport
    setTimeout(function(){ _govUpdateMinimap(container, canvasW, canvasH); }, 0);
  }

  function _govRenderTreeNode(ln) {
    var d = ln.dept;
    var isRoot = ln.isRoot;
    var cls = 'gov-tree-node' + (isRoot ? ' root-node' : '');
    var pathStr = ln.path !== null ? JSON.stringify(ln.path).replace(/"/g, '&quot;') : 'null';
    var hasSubs = d.subs && d.subs.length > 0;

    var h = '';
    h += '<div class="' + cls + '" style="left:' + ln.x + 'px;top:' + ln.y + 'px;width:' + ln.w + 'px">';

    // Header
    h += '<div class="node-header">';
    if (hasSubs && !isRoot) {
      var pathKey = JSON.stringify(ln.path);
      var arrow = ln.collapsed ? '\u25b6' : '\u25bc';
      h += '<span class="node-toggle" onclick="_govToggle(\'' + pathKey.replace(/'/g, "\\'") + '\')">' + arrow + '</span>';
    }
    h += '<span class="node-name">' + escHtml(d.name || '') + '</span>';
    h += '</div>';

    // Body
    h += '<div class="node-body">';
    if (d.desc) {
      h += '<div class="node-desc" title="' + escHtml(d.desc||'') + '">' + escHtml(d.desc) + '</div>';
    }
    // Function badges
    var fns = d.functions || [];
    if (fns.length) {
      h += '<div class="node-badges">';
      for (var fi = 0; fi < fns.length; fi++) {
        h += '<span class="fn-badge">' + escHtml(fns[fi]) + '</span>';
      }
      h += '</div>';
    }
    // Stats
    var ps = d.positions || [];
    var subCount = (d.subs || []).length;
    if (ps.length || subCount) {
      h += '<div class="node-stats">';
      if (ps.length) h += '<span>\u5b98\u804c ' + ps.length + '</span>';
      if (subCount) h += '<span>\u5b50\u90e8\u95e8 ' + subCount + '</span>';
      h += '</div>';
    }
    // Positions list (compact)
    if (ps.length) {
      for (var pi = 0; pi < ps.length; pi++) {
        var p = ps[pi];
        h += '<div style="font-size:10px;color:var(--text-secondary);padding:1px 0;display:flex;align-items:center;gap:3px">';
        h += '<span style="color:var(--gold-light)">' + escHtml(p.name||'') + '</span>';
        if (p.rank) h += '<span style="color:var(--text-dim)">(' + escHtml(p.rank) + ')</span>';
        var _succLabels = {appointment:'\u6D41',hereditary:'\u88AD',examination:'\u79D1',military:'\u519B',recommendation:'\u8350'};
        if (p.succession && _succLabels[p.succession]) h += '<span style="font-size:8px;background:var(--bg-tertiary);padding:0 2px;border-radius:2px;color:var(--text-secondary);">' + _succLabels[p.succession] + '</span>';
        // 编制/缺员/已命名 统计
        var _estC = p.establishedCount != null ? p.establishedCount : (parseInt(p.headCount,10) || 1);
        var _vacC = p.vacancyCount != null ? p.vacancyCount : 0;
        var _occ = Math.max(0, _estC - _vacC);
        var _ahArr = Array.isArray(p.actualHolders) ? p.actualHolders : (p.holder ? [{name:p.holder,generated:true}] : []);
        var _named = _ahArr.filter(function(x){return x && x.generated!==false && x.name;}).length;
        if (_estC > 1 || _vacC > 0 || _ahArr.length > 1) {
          h += '<span style="font-size:8px;color:var(--text-dim);background:rgba(0,0,0,0.15);padding:0 3px;border-radius:2px;">编' + _estC + (_vacC?'·缺'+_vacC:'') + '·在' + _occ + '·有名' + _named + '</span>';
        }
        if (_ahArr.length > 0) {
          var _namedNames = _ahArr.filter(function(x){return x && x.generated!==false && x.name;}).map(function(x){return x.name;});
          if (_namedNames.length > 0) {
            h += '<span style="color:var(--gold)">\u2014' + escHtml(_namedNames.slice(0,2).join('、')) + (_namedNames.length>2 ? '…' : '') + '</span>';
            // Show vassal type of first named
            var holderChar = scriptData.characters.find(function(c) { return c.name === _namedNames[0]; });
            if (holderChar && holderChar.vassalType) {
              h += '<span style="background:var(--accent-purple);color:white;padding:0 4px;border-radius:2px;font-size:9px;margin-left:2px">' + escHtml(holderChar.vassalType) + '</span>';
            }
          }
        } else if (p.holder) {
          h += '<span style="color:var(--gold)">\u2014' + escHtml(p.holder) + '</span>';
        }
        if (!isRoot) {
          h += '<span style="margin-left:auto;display:flex;gap:2px">';
          h += '<button class="act-edit" onclick="event.stopPropagation();_govEditPos(' + pathStr + ',' + pi + ')" style="padding:0 4px;font-size:9px;border:none;border-radius:2px;background:var(--gold-dark);color:#111;cursor:pointer">\u7f16\u8f91</button>';
          h += '<button class="act-del" onclick="event.stopPropagation();_govDelPos(' + pathStr + ',' + pi + ')" style="padding:0 4px;font-size:9px;border:none;border-radius:2px;background:#5a2020;color:#eee;cursor:pointer">\u5220</button>';
          h += '</span>';
        }
        h += '</div>';
      }
    }
    // Collapsed indicator
    if (ln.collapsed && hasSubs) {
      h += '<div style="font-size:10px;color:var(--text-dim);text-align:center;padding:2px 0">\u2026 ' + subCount + ' \u5b50\u90e8\u95e8\u5df2\u6298\u53e0</div>';
    }
    h += '</div>';

    // Actions
    if (!isRoot) {
      h += '<div class="node-actions">';
      h += '<button class="act-edit" onclick="event.stopPropagation();_govEditDept(' + pathStr + ')">\u7f16\u8f91</button>';
      h += '<button class="act-add" onclick="event.stopPropagation();_govAddFn(' + pathStr + ')">\u804c\u80fd</button>';
      h += '<button class="act-add" onclick="event.stopPropagation();_govAddPos(' + pathStr + ')">\u5b98\u804c</button>';
      h += '<button class="act-add" onclick="event.stopPropagation();_govAddSub(' + pathStr + ')">\u5b50\u90e8\u95e8</button>';
      h += '<button class="act-del" onclick="event.stopPropagation();_govDelDept(' + pathStr + ')">\u5220\u9664</button>';
      h += '</div>';
    } else {
      h += '<div class="node-actions">';
      h += '<button class="act-edit" onclick="event.stopPropagation();_govEditRoot()">\u7f16\u8f91\u540d\u79f0</button>';
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  function _govEditRoot() {
    var gov = scriptData.government;
    openGenericModal('\u7f16\u8f91\u9876\u7aef\u8282\u70b9',
      '<div class="form-group"><label>\u540d\u79f0\uff08\u5982\u7687\u5e1d\u3001\u56fd\u738b\u7b49\uff09</label>'
      + '<input id="gmf-rootname" value="' + escHtml(gov.name||'') + '"></div>'
      + '<div class="form-group"><label>\u63cf\u8ff0</label>'
      + '<input id="gmf-rootdesc" value="' + escHtml(gov.description||'') + '"></div>',
      function() {
        gov.name = gv('gmf-rootname') || gov.name;
        gov.description = gv('gmf-rootdesc');
        document.getElementById('govName').value = gov.name;
        document.getElementById('govDesc').value = gov.description;
        renderGovernment();
      }
    );
  }

  function _govToggle(pathKey) {
    _govTree.collapsed[pathKey] = !_govTree.collapsed[pathKey];
    renderGovTree();
  }

  function _govZoom(delta) {
    _govTree.scale = Math.max(0.3, Math.min(2.0, _govTree.scale + delta));
    var inner = document.getElementById('govTreeInner');
    if (inner) {
      inner.style.transform = 'scale(' + _govTree.scale + ') translate(' + _govTree.panX + 'px,' + _govTree.panY + 'px)';
    }
    var box = document.getElementById('govTree');
    _govUpdateMinimap(box, parseFloat(inner.style.width), parseFloat(inner.style.height));
  }

  function _govZoomReset() {
    _govTree.scale = 1;
    _govTree.panX = 0;
    _govTree.panY = 0;
    var inner = document.getElementById('govTreeInner');
    if (inner) {
      inner.style.transform = 'scale(1) translate(0px,0px)';
    }
    var box = document.getElementById('govTree');
    _govUpdateMinimap(box, parseFloat(inner.style.width), parseFloat(inner.style.height));
  }

  function _govAttachHandlers(container) {
    // Remove old handlers
    container._govMouseDown = null;
    container._govMouseMove = null;
    container._govMouseUp = null;
    container._govWheel = null;

    container._govMouseDown = function(e) {
      if (e.button !== 0) return;
      // Don't pan if clicking a button or toggle
      if (e.target.tagName === 'BUTTON' || e.target.classList.contains('node-toggle')) return;
      _govTree.dragging = true;
      _govTree.dragStartX = e.clientX;
      _govTree.dragStartY = e.clientY;
      container.classList.add('grabbing');
      e.preventDefault();
    };

    container._govMouseMove = function(e) {
      if (!_govTree.dragging) return;
      var dx = e.clientX - _govTree.dragStartX;
      var dy = e.clientY - _govTree.dragStartY;
      _govTree.dragStartX = e.clientX;
      _govTree.dragStartY = e.clientY;
      _govTree.panX += dx / _govTree.scale;
      _govTree.panY += dy / _govTree.scale;
      var inner = document.getElementById('govTreeInner');
      if (inner) {
        inner.style.transform = 'scale(' + _govTree.scale + ') translate(' + _govTree.panX + 'px,' + _govTree.panY + 'px)';
      }
      _govUpdateMinimap(container, parseFloat(inner.style.width), parseFloat(inner.style.height));
    };

    container._govMouseUp = function() {
      _govTree.dragging = false;
      container.classList.remove('grabbing');
    };

    container._govWheel = function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.08 : 0.08;
      _govTree.scale = Math.max(0.3, Math.min(2.0, _govTree.scale + delta));
      var inner = document.getElementById('govTreeInner');
      if (inner) {
        inner.style.transform = 'scale(' + _govTree.scale + ') translate(' + _govTree.panX + 'px,' + _govTree.panY + 'px)';
      }
      _govUpdateMinimap(container, parseFloat(inner.style.width), parseFloat(inner.style.height));
    };

    container.addEventListener('mousedown', container._govMouseDown);
    document.addEventListener('mousemove', container._govMouseMove);
    document.addEventListener('mouseup', container._govMouseUp);
    container.addEventListener('wheel', container._govWheel, {passive: false});
  }

  function _govBuildMinimap(laid, canvasW, canvasH) {
    var mmW = 140, mmH = 90;
    var scaleX = mmW / canvasW;
    var scaleY = mmH / canvasH;
    var sc = Math.min(scaleX, scaleY);
    var dots = '';
    for (var i = 0; i < laid.length; i++) {
      var n = laid[i];
      var rx = n.x * sc;
      var ry = n.y * sc;
      var rw = Math.max(n.w * sc, 3);
      var rh = Math.max(n.h * sc, 2);
      var col = n.isRoot ? 'var(--gold)' : 'rgba(201,169,110,0.5)';
      dots += '<div style="position:absolute;left:' + rx + 'px;top:' + ry + 'px;width:' + rw + 'px;height:' + rh + 'px;background:' + col + ';border-radius:1px"></div>';
    }
    return '<div class="gov-tree-minimap" id="govMinimap">' + dots
      + '<div class="minimap-viewport" id="govMinimapVP"></div></div>';
  }

  function _govUpdateMinimap(container, canvasW, canvasH) {
    var vp = document.getElementById('govMinimapVP');
    if (!vp) return;
    var mmW = 140, mmH = 90;
    var scaleX = mmW / canvasW;
    var scaleY = mmH / canvasH;
    var sc = Math.min(scaleX, scaleY);
    var cw = container.clientWidth;
    var ch = container.clientHeight;
    // Viewport in canvas coords
    var vpLeft = -_govTree.panX;
    var vpTop = -_govTree.panY;
    var vpW = cw / _govTree.scale;
    var vpH = ch / _govTree.scale;
    vp.style.left = (vpLeft * sc) + 'px';
    vp.style.top = (vpTop * sc) + 'px';
    vp.style.width = (vpW * sc) + 'px';
    vp.style.height = (vpH * sc) + 'px';
  }

  function _govGetByPath(path) {
    var cur = scriptData.government.nodes;
    var dept = null;
    var i = 0;
    while (i < path.length) {
      var idx = path[i];
      if (idx === 's') { i++; idx = path[i]; cur = dept.subs || []; }
      dept = cur[idx];
      if (!dept) return null;
      i++;
    }
    return dept;
  }

  function _govGetParentArr(path) {
    if (path.length === 1) return { arr: scriptData.government.nodes, idx: path[0] };
    var parentPath = path.slice(0, path.length - 2);
    var parent = parentPath.length ? _govGetByPath(parentPath) : null;
    var lastIdx = path[path.length - 1];
    if (parent) {
      return { arr: parent.subs || [], idx: lastIdx };
    }
    return { arr: scriptData.government.nodes, idx: lastIdx };
  }

  function _govPosForm(pos) {
    pos = pos || {};
    // 兼容：老字段 headCount 映射为 establishedCount
    var _est = pos.establishedCount != null ? pos.establishedCount : (pos.headCount || 1);
    var _vac = pos.vacancyCount != null ? pos.vacancyCount : 0;
    // actualHolders 若不存在，用 holder 兼容合成
    var _ah = Array.isArray(pos.actualHolders) ? pos.actualHolders : (pos.holder ? [{name:pos.holder,generated:true}] : []);
    var _ahText = _ah.map(function(h){ return h.generated===false ? '[占位]' : (h.name||''); }).filter(Boolean).join('、');

    var body = '';
    body += '<div class="form-group"><label>官职名</label>'
      + '<input type="text" id="gm_name" value="' + escHtml(pos.name||'') + '"></div>';
    body += '<div style="display:flex;gap:12px">';
    body += '<div class="form-group" style="flex:1"><label>品级</label>'
      + '<input type="text" id="gm_rank" placeholder="例：正一品" value="' + escHtml(pos.rank||'') + '"></div>';
    body += '<div class="form-group" style="flex:1"><label>编制人数（史料额定）</label>'
      + '<input type="number" id="gm_est" min="1" placeholder="如：2" value="' + escHtml(String(_est)) + '"></div>';
    body += '<div class="form-group" style="flex:1"><label>缺员（史料记载）</label>'
      + '<input type="number" id="gm_vac" min="0" placeholder="0" value="' + escHtml(String(_vac)) + '"></div>';
    body += '</div>';
    body += '<div class="form-group"><label>实际在职者（多人逗号分隔，留空=全部占位）</label>'
      + '<input type="text" id="gm_holders" placeholder="如：张三,李四" value="' + escHtml(_ahText.replace(/\[占位\]/g,'')) + '">'
      + '<div style="font-size:0.65rem;color:var(--color-foreground-muted);margin-top:2px;">'
      + '编制 - 缺员 = 实际在职数；未写出的视为"在职但无角色内容"（游戏中 AI 会按需自动生成）</div></div>';
    body += '<div style="display:flex;gap:12px">';
    body += '<div class="form-group" style="flex:1"><label>继任方式</label>'
      + '<select id="gm_succession">'
      + '<option value="appointment"' + (pos.succession==='appointment'?' selected':'') + '>流官（朝廷任命）</option>'
      + '<option value="hereditary"' + (pos.succession==='hereditary'?' selected':'') + '>世袭（父死子继）</option>'
      + '<option value="examination"' + (pos.succession==='examination'?' selected':'') + '>科举选拔</option>'
      + '<option value="military"' + (pos.succession==='military'?' selected':'') + '>军功授职</option>'
      + '<option value="recommendation"' + (pos.succession==='recommendation'?' selected':'') + '>举荐制</option>'
      + '</select></div>';
    body += '<div class="form-group" style="flex:1"><label>权限等级</label>'
      + '<select id="gm_authority">'
      + '<option value="decision"' + (pos.authority==='decision'?' selected':'') + '>决策权</option>'
      + '<option value="execution"' + (pos.authority==='execution'?' selected':'') + '>执行权</option>'
      + '<option value="advisory"' + (pos.authority==='advisory'?' selected':'') + '>咨询权</option>'
      + '<option value="supervision"' + (pos.authority==='supervision'?' selected':'') + '>监察权</option>'
      + '</select></div></div>';
    body += '<div class="form-group"><label>单人年俸（史料记载，如：万石/10000钱）</label>'
      + '<input type="text" id="gm_salary" placeholder="如：万石米" value="' + escHtml(pos.perPersonSalary||pos.salary||'') + '">'
      + '<div style="font-size:0.65rem;color:var(--color-foreground-muted);margin-top:2px;">'
      + '理论总俸 = 单人俸 × 编制；实际支出 = 单人俸 × (编制-缺员)</div></div>';
    body += '<div class="form-group"><label>史料出处</label>'
      + '<input type="text" id="gm_histRec" placeholder="如：《旧唐书·职官志二》" value="' + escHtml(pos.historicalRecord||'') + '"></div>';
    body += '<div class="form-group"><label>职责（50字以上）</label>'
      + '<textarea id="gm_duties" rows="3">' + escHtml(pos.duties||'') + '</textarea></div>';
    body += '<div class="form-group"><label>备注</label>'
      + '<textarea id="gm_desc" rows="2">' + escHtml(pos.desc||'') + '</textarea></div>';
    return body;
  }

  // 辅助：从表单组装 position 对象
  function _govPosFromForm() {
    var est = parseInt(gv('gm_est'), 10) || 1;
    var vac = parseInt(gv('gm_vac'), 10) || 0;
    if (vac > est) vac = est;
    var occupied = est - vac;
    var holderNames = (gv('gm_holders')||'').split(/[,，、]/).map(function(s){return s.trim();}).filter(Boolean);
    // 构建 actualHolders：已命名者 generated=true；剩余占位 generated=false
    var actualHolders = [];
    for (var i = 0; i < occupied; i++) {
      if (i < holderNames.length) {
        actualHolders.push({ name: holderNames[i], generated: true });
      } else {
        actualHolders.push({ name: '', generated: false, placeholderId: 'ph_' + Math.random().toString(36).slice(2,8) });
      }
    }
    var perPersonSalary = gv('gm_salary');
    return {
      name: gv('gm_name'),
      rank: gv('gm_rank'),
      establishedCount: est,
      vacancyCount: vac,
      actualHolders: actualHolders,
      holder: holderNames[0] || '',  // 兼容：第一个在职者作为 holder
      headCount: est,                 // 兼容：映射为 establishedCount
      succession: gv('gm_succession') || 'appointment',
      authority: gv('gm_authority') || 'execution',
      perPersonSalary: perPersonSalary,
      salary: perPersonSalary,        // 兼容旧字段
      historicalRecord: gv('gm_histRec'),
      duties: gv('gm_duties'),
      desc: gv('gm_desc')
    };
  }

  function _govDeptForm(dept) {
    dept = dept || {};
    return '<div class="form-group"><label>部门名</label>'
      + '<input type="text" id="gm_name" value="' + escHtml(dept.name||'') + '"></div>'
      + '<div class="form-group"><label>简介</label>'
      + '<input type="text" id="gm_desc" value="' + escHtml(dept.desc||'') + '"></div>';
  }

  function _govEditDept(path) {
    var dept = _govGetByPath(path);
    if (!dept) return;
    openGenericModal('编辑部门', _govDeptForm(dept), function() {
      dept.name = gv('gm_name') || dept.name;
      dept.desc = gv('gm_desc');
      closeGenericModal();
      renderGovernment();
      autoSave();
      showToast('已保存');
    });
  }

  function _govAddFn(path) {
    var dept = _govGetByPath(path);
    if (!dept) return;
    openGenericModal('添加职能',
      '<div class="form-group"><label>职能描述</label>'
      + '<input id="gm_fn" placeholder="如：考核官员绩效"></div>',
      function() {
        var fn = gv('gm_fn').trim();
        if (!fn) return;
        if (!dept.functions) dept.functions = [];
        dept.functions.push(fn);
        closeGenericModal();
        renderGovernment();
        autoSave();
      });
  }

  function _govFnDel(path, fi) {
    var dept = _govGetByPath(path);
    if (!dept || !dept.functions) return;
    dept.functions.splice(fi, 1);
    renderGovernment();
    autoSave();
  }

  function _govAddPos(path) {
    var dept = _govGetByPath(path);
    if (!dept) return;
    openGenericModal('添加官职', _govPosForm({}), function() {
      var data = _govPosFromForm();
      if (!data.name) { showToast('请输入官职名'); return; }
      if (!dept.positions) dept.positions = [];
      dept.positions.push(data);
      closeGenericModal();
      renderGovernment();
      autoSave();
      showToast('已添加');
    });
  }

  function _govEditPos(path, pi) {
    var dept = _govGetByPath(path);
    if (!dept) return;
    var pos = (dept.positions || [])[pi];
    if (!pos) return;
    openGenericModal('编辑官职', _govPosForm(pos), function() {
      var data = _govPosFromForm();
      if (data.name) pos.name = data.name;
      pos.rank = data.rank;
      pos.establishedCount = data.establishedCount;
      pos.vacancyCount = data.vacancyCount;
      pos.actualHolders = data.actualHolders;
      pos.holder = data.holder;
      pos.headCount = data.headCount;
      pos.succession = data.succession;
      pos.authority = data.authority;
      pos.perPersonSalary = data.perPersonSalary;
      pos.salary = data.salary;
      pos.historicalRecord = data.historicalRecord;
      pos.duties = data.duties;
      pos.desc = data.desc;
      closeGenericModal();
      renderGovernment();
      autoSave();
      showToast('已保存');
    });
  }

  function _govDelPos(path, pi) {
    var dept = _govGetByPath(path);
    if (!dept || !dept.positions) return;
    var pos = dept.positions[pi];
    if (!pos) return;
    if (!confirm('确认删除「' + pos.name + '」？')) return;
    dept.positions.splice(pi, 1);
    renderGovernment();
    autoSave();
    showToast('已删除');
  }

  function _govAddSub(path) {
    var dept = _govGetByPath(path);
    if (!dept) return;
    openGenericModal('添加子部门', _govDeptForm({}), function() {
      var name = gv('gm_name').trim();
      if (!name) { showToast('请输入部门名'); return; }
      if (!dept.subs) dept.subs = [];
      dept.subs.push({ name: name, desc: gv('gm_desc'), functions: [], positions: [], subs: [] });
      closeGenericModal();
      renderGovernment();
      autoSave();
      showToast('已添加');
    });
  }

  function _govDelDept(path) {
    var dept = _govGetByPath(path);
    if (!dept) return;
    if (!confirm('确认删除部门「' + dept.name + '」及其所有子部门和官职？')) return;
    var ref = _govGetParentArr(path);
    ref.arr.splice(ref.idx, 1);
    renderGovernment();
    autoSave();
    showToast('已删除');
  }

  function addGovNode() {
    openGenericModal('\u6dfb\u52a0\u9876\u7ea7\u90e8\u95e8', _govDeptForm({}), function() {
      var name = gv('gm_name').trim();
      if (!name) { showToast('\u8bf7\u8f93\u5165\u90e8\u95e8\u540d'); return; }
      if (!scriptData.government) {
        scriptData.government = { name:'', description:'', selectionSystem:'', promotionSystem:'', historicalReference:'', nodes:[] };
      }
      if (!scriptData.government.nodes) scriptData.government.nodes = [];
      scriptData.government.nodes.push({
        name: name,
        desc: gv('gm_desc') || '',
        functions: [],
        positions: [],
        subs: []
      });
      closeGenericModal();
      renderGovernment();
      autoSave();
      showToast('\u5df2\u6dfb\u52a0');
    });
  }

  // ====== 官制消耗配置 ======
  function renderOfficeConfig() {
    if (!scriptData.officeConfig) scriptData.officeConfig = { costVariables: [], shortfallEffects: '' };
    var list = document.getElementById('officeConfig-list');
    if (!list) return;
    var cvs = scriptData.officeConfig.costVariables || [];
    if (cvs.length === 0) {
      list.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:8px;">暂无消耗配置</div>';
    } else {
      list.innerHTML = cvs.map(function(cv, i) {
        return '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border);">'
          + '<span style="color:var(--gold);">' + escHtml(cv.variable || '') + '</span>'
          + '<span style="color:var(--text-secondary);">每部门-' + (cv.perDept || 0) + ' 每官员-' + (cv.perOfficial || 0) + '</span>'
          + '<button class="btn" style="padding:1px 6px;font-size:10px;margin-left:auto;" onclick="deleteOfficeCostVariable(' + i + ')">×</button>'
          + '</div>';
      }).join('');
    }
    var sfEl = document.getElementById('officeConfig-shortfall');
    if (sfEl) sfEl.value = scriptData.officeConfig.shortfallEffects || '';
  }

  function addOfficeCostVariable() {
    if (!scriptData.officeConfig) scriptData.officeConfig = { costVariables: [], shortfallEffects: '' };
    var varName = prompt('消耗的变量名（如：金钱、粮食）：');
    if (!varName) return;
    var perDept = parseInt(prompt('每部门每回合消耗量（如：50）：') || '0') || 0;
    var perOfficial = parseInt(prompt('每官员每回合消耗量（如：10）：') || '0') || 0;
    if (!scriptData.officeConfig.costVariables) scriptData.officeConfig.costVariables = [];
    scriptData.officeConfig.costVariables.push({ variable: varName, perDept: perDept, perOfficial: perOfficial });
    renderOfficeConfig();
    autoSave();
  }

  function deleteOfficeCostVariable(idx) {
    if (scriptData.officeConfig && scriptData.officeConfig.costVariables) {
      scriptData.officeConfig.costVariables.splice(idx, 1);
      renderOfficeConfig();
      autoSave();
    }
  }

  window.addOfficeCostVariable = addOfficeCostVariable;
  window.deleteOfficeCostVariable = deleteOfficeCostVariable;
  window.renderOfficeConfig = renderOfficeConfig;

