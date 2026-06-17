// map-editor-quadtree.js
// 递归 quadtree·NW/NE/SW/SE 4 子象限
// item 必须有 .bbox·按 bbox 中心点决定 leaf
// 大数据 (≥ 1000 div) 比 spatial grid 更稳·非均匀分布友好
// 2026-05-06

(function(global){
  'use strict';

  var DEFAULT_CAPACITY = 8;
  var DEFAULT_MAX_DEPTH = 8;

  function rectIntersects(a, b){
    return !(a.x + a.w < b.x || b.x + b.w < a.x ||
             a.y + a.h < b.y || b.y + b.h < a.y);
  }

  function QuadTree(bounds, capacity, maxDepth, depth){
    this.bounds = bounds;
    this.capacity = capacity || DEFAULT_CAPACITY;
    this.maxDepth = maxDepth || DEFAULT_MAX_DEPTH;
    this.depth = depth || 0;
    this.items = [];     // items 完全在 bounds 内
    this.divided = false;
    this.children = null;
  }

  QuadTree.prototype.subdivide = function(){
    var x = this.bounds.x;
    var y = this.bounds.y;
    var hw = this.bounds.w / 2;
    var hh = this.bounds.h / 2;
    var nextDepth = this.depth + 1;

    this.children = {
      nw: new QuadTree({ x: x, y: y, w: hw, h: hh }, this.capacity, this.maxDepth, nextDepth),
      ne: new QuadTree({ x: x + hw, y: y, w: hw, h: hh }, this.capacity, this.maxDepth, nextDepth),
      sw: new QuadTree({ x: x, y: y + hh, w: hw, h: hh }, this.capacity, this.maxDepth, nextDepth),
      se: new QuadTree({ x: x + hw, y: y + hh, w: hw, h: hh }, this.capacity, this.maxDepth, nextDepth)
    };
    this.divided = true;

    // 重分配现 items 到子节点
    var oldItems = this.items;
    this.items = [];
    for (var i = 0; i < oldItems.length; i++){
      this.insertToChildren(oldItems[i]);
    }
  };

  QuadTree.prototype.insert = function(item){
    if (!item.bbox) return false;
    if (!rectIntersects(this.bounds, item.bbox)) return false;

    if (!this.divided){
      if (this.items.length < this.capacity || this.depth >= this.maxDepth){
        this.items.push(item);
        return true;
      }
      this.subdivide();
    }
    return this.insertToChildren(item);
  };

  QuadTree.prototype.insertToChildren = function(item){
    // item 跨多个象限·全部 insert·query 时去重
    var inserted = false;
    var c = this.children;
    if (rectIntersects(c.nw.bounds, item.bbox)){ if (c.nw.insert(item)) inserted = true; }
    if (rectIntersects(c.ne.bounds, item.bbox)){ if (c.ne.insert(item)) inserted = true; }
    if (rectIntersects(c.sw.bounds, item.bbox)){ if (c.sw.insert(item)) inserted = true; }
    if (rectIntersects(c.se.bounds, item.bbox)){ if (c.se.insert(item)) inserted = true; }
    return inserted;
  };

  QuadTree.prototype.query = function(bbox, results, seen){
    results = results || [];
    seen = seen || {};
    if (!rectIntersects(this.bounds, bbox)) return results;

    if (this.divided){
      this.children.nw.query(bbox, results, seen);
      this.children.ne.query(bbox, results, seen);
      this.children.sw.query(bbox, results, seen);
      this.children.se.query(bbox, results, seen);
    } else {
      for (var i = 0; i < this.items.length; i++){
        var it = this.items[i];
        if (seen[it.id]) continue;
        if (rectIntersects(it.bbox, bbox)){
          seen[it.id] = true;
          results.push(it);
        }
      }
    }
    return results;
  };

  // 收集所有 items (debug)
  QuadTree.prototype.all = function(results, seen){
    results = results || [];
    seen = seen || {};
    if (this.divided){
      this.children.nw.all(results, seen);
      this.children.ne.all(results, seen);
      this.children.sw.all(results, seen);
      this.children.se.all(results, seen);
    } else {
      for (var i = 0; i < this.items.length; i++){
        var it = this.items[i];
        if (!seen[it.id]){ seen[it.id] = true; results.push(it); }
      }
    }
    return results;
  };

  QuadTree.prototype.size = function(){
    return this.all().length;
  };

  // ─── factory·从 division array 建 ───────────────────────

  function buildFromDivisions(divs, padding){
    padding = padding || 50;
    if (divs.length === 0){
      return new QuadTree({ x: 0, y: 0, w: 1280, h: 800 });
    }
    // 联合 bbox·padding
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    divs.forEach(function(d){
      if (!d.bbox) return;
      if (d.bbox.x < minX) minX = d.bbox.x;
      if (d.bbox.y < minY) minY = d.bbox.y;
      if (d.bbox.x + d.bbox.w > maxX) maxX = d.bbox.x + d.bbox.w;
      if (d.bbox.y + d.bbox.h > maxY) maxY = d.bbox.y + d.bbox.h;
    });
    if (!isFinite(minX)){
      return new QuadTree({ x: 0, y: 0, w: 1280, h: 800 });
    }
    var bounds = {
      x: minX - padding,
      y: minY - padding,
      w: (maxX - minX) + padding * 2,
      h: (maxY - minY) + padding * 2
    };
    var qt = new QuadTree(bounds);
    divs.forEach(function(d){ if (d.bbox) qt.insert(d); });
    return qt;
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.quadtree = {
    QuadTree: QuadTree,
    DEFAULT_CAPACITY: DEFAULT_CAPACITY,
    DEFAULT_MAX_DEPTH: DEFAULT_MAX_DEPTH,
    rectIntersects: rectIntersects,
    buildFromDivisions: buildFromDivisions
  };

})(typeof window !== 'undefined' ? window : this);
