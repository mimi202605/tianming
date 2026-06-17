#!/usr/bin/env node
// repro-keju-open.js — 无头复现「科举面板打不开」·boot 全栈 + 各态调 openKejuPanel·抓真错+堆栈
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function makeStubs() {
  const elements = new Map();
  function makeNode(tag) {
    const node = {
      tagName: (tag || '').toUpperCase(), nodeType: 1, children: [], attributes: {}, style: {}, dataset: {},
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, _listeners: {}, _innerHTML: '', _textContent: '',
      get innerHTML(){ return this._innerHTML; }, set innerHTML(v){ this._innerHTML = String(v); },
      get textContent(){ return this._textContent; }, set textContent(v){ this._textContent = String(v); },
      appendChild(c){ this.children.push(c); return c; }, removeChild(c){ this.children = this.children.filter(x=>x!==c); return c; },
      insertBefore(c){ this.children.unshift(c); return c; },
      setAttribute(k,v){ this.attributes[k]=v; if(k==='id') elements.set(v,this); }, getAttribute(k){ return this.attributes[k]||null; }, removeAttribute(k){ delete this.attributes[k]; },
      addEventListener(ev,fn){ (this._listeners[ev]=this._listeners[ev]||[]).push(fn); }, removeEventListener(){}, dispatchEvent(){ return true; },
      querySelector(){ return makeNode('sink'); }, querySelectorAll(){ return []; }, getElementsByTagName(){ return []; }, getElementsByClassName(){ return []; },
      cloneNode(){ return makeNode(this.tagName); }, remove(){}, focus(){}, blur(){}, click(){}, scrollIntoView(){},
      getBoundingClientRect(){ return { top:0,left:0,right:0,bottom:0,width:0,height:0 }; },
      insertAdjacentHTML(_,html){ this._innerHTML += String(html); },
      value:'', checked:false, disabled:false, options:[], selectedIndex:-1
    };
    return node;
  }
  const doc = makeNode('document');
  doc.body = makeNode('body'); doc.head = makeNode('head'); doc.documentElement = makeNode('html'); doc.readyState='complete';
  doc.createElement = (t)=>makeNode(t); doc.createElementNS = (_,t)=>makeNode(t);
  doc.createTextNode = (t)=>({nodeType:3,textContent:String(t)}); doc.createDocumentFragment = ()=>makeNode('fragment');
  doc.getElementById = function(id){ if(elements.has(id)) return elements.get(id); const n=makeNode('div'); n.id=id; n.attributes.id=id; elements.set(id,n); return n; };
  doc.querySelector = ()=>makeNode('sink'); doc.querySelectorAll = ()=>[]; doc.addEventListener=function(){}; doc.removeEventListener=function(){};
  const storage = new Map();
  const localStorage = { getItem:(k)=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:(k)=>storage.delete(k), clear:()=>storage.clear(), get length(){return storage.size;}, key:(i)=>[...storage.keys()][i]||null };
  const win = {
    document: doc, location:{ href:'http://localhost/index.html', pathname:'/index.html', search:'', hostname:'localhost' },
    localStorage, sessionStorage: localStorage,
    setTimeout, clearTimeout, setInterval, clearInterval, setImmediate: (fn)=>setTimeout(fn,0),
    requestAnimationFrame:(fn)=>setTimeout(fn,16), cancelAnimationFrame: clearTimeout,
    Promise, console, JSON, Math, Date, Number, String, Array, Object, Boolean, RegExp, Error, TypeError, RangeError, SyntaxError, parseFloat, parseInt, isNaN, isFinite, URL, URLSearchParams,
    Event:function(){}, CustomEvent:function(){}, MouseEvent:function(){},
    fetch:()=>Promise.reject(new Error('fetch stub')), addEventListener:function(){}, removeEventListener:function(){}, dispatchEvent:function(){return true;},
    alert:function(){}, confirm:()=>true, prompt:()=>null,
    navigator:{ userAgent:'repro', language:'zh-CN', platform:'node' },
    crypto:{ getRandomValues:(a)=>{ for(let i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*256); return a; } },
    TM:undefined, GM:undefined, P:undefined
  };
  win.self=win; win.window=win; win.globalThis=win; doc.defaultView=win;
  return { win, doc, elements };
}
function parseIndexHtmlScripts() {
  const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const out=[]; const re=/<script\s+src="([^"?]+)(?:\?[^"]*)?"(?:\s+defer)?\s*><\/script>/g; let m;
  while((m=re.exec(html))){ if(/^https?:\/\//.test(m[1])) continue; out.push(m[1]); }
  return out;
}

const { win, elements } = makeStubs();
const sandbox = vm.createContext(win);
const scripts = parseIndexHtmlScripts();
let loaded=0; const bootErrs=[];
for(const src of scripts){
  const abs=path.join(ROOT,src); if(!fs.existsSync(abs)){ bootErrs.push(src+' missing'); continue; }
  try { new vm.Script(fs.readFileSync(abs,'utf8'),{filename:src}).runInContext(sandbox,{displayErrors:false,timeout:10000}); loaded++; }
  catch(e){ bootErrs.push(src+': '+e.message.slice(0,80)); }
}
console.log('[repro] boot '+loaded+'/'+scripts.length+' loaded, '+bootErrs.length+' boot errs');
bootErrs.forEach(e=>console.log('   booterr '+e));

// 最小 P / GM
sandbox.GM = { sid:'sc-tianqi7-1627', turn:30, year:1627, month:9, keju:{} };
sandbox.P = {
  conf:{}, ai:{ key:'' },
  scenarios:[{ id:'sc-tianqi7-1627', name:'天启七年', era:'熹宗·天启' }],
  keju:{ enabled:true, history:[], currentExam:null }
};
console.log('typeof openKejuPanel =', typeof sandbox.openKejuPanel);
console.log('typeof showKejuModal =', typeof sandbox.showKejuModal);
console.log('typeof _kjpOpenReformProposal =', typeof sandbox._kjpOpenReformProposal);

function tryOpen(label, mutate){
  // reset
  sandbox.P.keju = { enabled:true, history:[], currentExam:null, stageDurationDays:{} };
  if(mutate) mutate();
  try {
    sandbox.openKejuPanel();
    console.log('  OK   ['+label+'] 开面板未抛错');
  } catch(e){
    console.log('  THROW ['+label+'] '+ (e && e.message));
    if(e && e.stack){
      const frames = e.stack.split('\n').filter(l=>/\.js:/.test(l)).slice(0,6);
      frames.forEach(f=>console.log('        '+f.trim()));
    }
  }
}

console.log('\n=== 复现 openKejuPanel 各态 ===');
tryOpen('无考试·enabled', ()=>{ sandbox.P.keju.enabled=true; });
tryOpen('无考试·未启用', ()=>{ sandbox.P.keju.enabled=false; });
const STAGES = ['preliminary','preliminary_local','preliminary_provincial','examiner_select','huishi_draft','huishi','dianshi_draft','dianshi','finished'];
STAGES.forEach(st=>{
  tryOpen('考试·stage='+st, ()=>{
    var exam = { id:'k1', type:'zhengke', stage:st, startTurn:28, stageElapsedDays:5, gradPool:[], historicalHits:[], subExaminers:[], huishiTopicCandidates:[], costsPaid:{local:0,provincial:0,central:0} };
    if(typeof sandbox._kejuUpgradeExamSchema==='function'){ try{ sandbox._kejuUpgradeExamSchema(exam); }catch(_){} }
    sandbox.P.keju.currentExam = exam;
  });
});
console.log('\n[repro] done');
