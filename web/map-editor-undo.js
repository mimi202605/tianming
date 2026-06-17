// map-editor-undo.js
// 简洁 undo / redo·snapshot stack
// 每次 mutation·snapshot 整个 map state·成本可接受 (~200 行省 ~50KB / snapshot)
// 后期若卡再换 command pattern
// 2026-05-06

(function(global){
  'use strict';

  var MAX_DEPTH = 50;

  function clone(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  function createStack(){
    return {
      undoStack: [],
      redoStack: [],
      // baseline 用于检测 dirty
      baseline: null
    };
  }

  // 推入 snapshot·清空 redo
  function snapshot(stack, mapState, label){
    stack.undoStack.push({
      label: label || 'edit',
      time: Date.now(),
      state: clone(mapState)
    });
    if (stack.undoStack.length > MAX_DEPTH){
      stack.undoStack.shift();
    }
    // 任何新 edit 后·redo 失效
    stack.redoStack.length = 0;
  }

  // undo·回退到上一 snapshot·当前态推 redo
  // 返回还原后的 state·或 null (无可 undo)
  function undo(stack, currentState){
    if (stack.undoStack.length === 0) return null;
    var prev = stack.undoStack.pop();
    stack.redoStack.push({
      label: prev.label,
      time: Date.now(),
      state: clone(currentState)
    });
    if (stack.redoStack.length > MAX_DEPTH){
      stack.redoStack.shift();
    }
    return prev.state;
  }

  function redo(stack, currentState){
    if (stack.redoStack.length === 0) return null;
    var nxt = stack.redoStack.pop();
    stack.undoStack.push({
      label: nxt.label,
      time: Date.now(),
      state: clone(currentState)
    });
    if (stack.undoStack.length > MAX_DEPTH){
      stack.undoStack.shift();
    }
    return nxt.state;
  }

  function canUndo(stack){ return stack.undoStack.length > 0; }
  function canRedo(stack){ return stack.redoStack.length > 0; }

  function clear(stack){
    stack.undoStack.length = 0;
    stack.redoStack.length = 0;
  }

  function setBaseline(stack, mapState){
    stack.baseline = clone(mapState);
  }

  function isDirty(stack, currentState){
    if (!stack.baseline) return stack.undoStack.length > 0;
    return JSON.stringify(stack.baseline) !== JSON.stringify(currentState);
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.undo = {
    MAX_DEPTH: MAX_DEPTH,
    create: createStack,
    snapshot: snapshot,
    undo: undo,
    redo: redo,
    canUndo: canUndo,
    canRedo: canRedo,
    clear: clear,
    setBaseline: setBaseline,
    isDirty: isDirty,
    clone: clone
  };

})(typeof window !== 'undefined' ? window : this);
