// 从 hongyan-redesign-preview.html 提取 <style>，转译为 in-game 作用域 CSS
// 照 _gen_memcss.js paradigm。规则: scope→ "body.tm-phase8-formal .yan-yuan ...";
// keyframes→ zhy-*; 丢弃 body/html/*/yan-stage/yan-frame/yan-close/previewbar/toast 根级规则
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'hongyan-redesign-preview.html'), 'utf8');
let css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
// 去注释
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

// 顶层分块 (brace-aware)
function topBlocks(s){
  const out=[]; let depth=0, buf='';
  for(let i=0;i<s.length;i++){const c=s[i];buf+=c;if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0){out.push(buf.trim());buf='';}}}
  return out.filter(Boolean);
}
function splitRule(block){
  const i=block.indexOf('{');
  return {sel:block.slice(0,i).trim(), body:block.slice(i+1,block.lastIndexOf('}')).trim()};
}

const DROP=[/^body$/,/^html/,/^\*$/,/^\.yan-stage/,/^\.yan-frame/,/^\.yan-close/,/^\.previewbar/,/^\.toast/];
const kfRename={};
// pass1: collect keyframes names
topBlocks(css).forEach(b=>{
  const m=b.match(/^@keyframes\s+([A-Za-z0-9_-]+)/);
  if(m){ kfRename[m[1]]='zhy-'+m[1]; }
});
function renameAnims(body){
  Object.keys(kfRename).forEach(n=>{
    body=body.replace(new RegExp('([\\s:,])'+n+'([\\s,;}])','g'),'$1'+kfRename[n]+'$2');
  });
  return body;
}
function scopeSel(sel){
  return sel.split(',').map(s=>{
    s=s.trim(); if(!s) return '';
    if(/^\.yan-yuan\b/.test(s)) return s.replace(/^\.yan-yuan/,'body.tm-phase8-formal .yan-yuan');
    return 'body.tm-phase8-formal .yan-yuan '+s;
  }).filter(Boolean).join(',');
}
function emitNormal(block){
  const {sel,body}=splitRule(block);
  const firstSel=sel.split(',')[0].trim();
  const R='body.tm-phase8-formal .yan-yuan';
  // 特殊根映射：body → .yan-yuan 承担 stage+frame 的 flex 布局
  if(firstSel===':root') return R+'{'+body+'}';
  if(firstSel==='body') return R+'{'+renameAnims(body)+';height:100%;display:flex;flex-direction:column;padding:14px 18px;}';
  if(/^body::before/.test(firstSel)) return R+'::before{'+body.replace(/position:fixed/,'position:absolute')+'}';
  if(firstSel==='*') return R+' *{'+body+'}';
  if(DROP.some(re=>re.test(firstSel))) return '';
  return scopeSel(sel)+'{'+renameAnims(body)+'}';
}

let out=[];
topBlocks(css).forEach(b=>{
  if(/^@keyframes/.test(b)){
    const m=b.match(/^@keyframes\s+([A-Za-z0-9_-]+)([\s\S]*)$/);
    out.push('@keyframes '+kfRename[m[1]]+m[2]); // keep frames unscoped
  } else if(/^@media/.test(b)){
    const i=b.indexOf('{'); const cond=b.slice(0,i).trim(); const inner=b.slice(i+1,b.lastIndexOf('}'));
    const innerOut=topBlocks(inner).map(emitNormal).filter(Boolean).join('');
    if(innerOut) out.push(cond+'{'+innerOut+'}');
  } else {
    const r=emitNormal(b); if(r) out.push(r);
  }
});
const result=out.join('\n');
fs.writeFileSync(path.join(__dirname,'_yancss_out.css'), result);
// 生成 installer 函数 (CSS 转义进单引号 JS 字符串)
const oneLine=result.replace(/\n/g,'');
const escd=oneLine.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const fn="  function installHongyanYuanStyles(){\n"
+"    var st = document.getElementById('tm-hongyan-yuan-style');\n"
+"    if (!st) { st = document.createElement('style'); st.id = 'tm-hongyan-yuan-style'; document.head.appendChild(st); }\n"
+"    st.textContent = '"+escd+"';\n"
+"  }\n";
fs.writeFileSync(path.join(__dirname,'_yaninstaller.txt'), fn);
console.log('rules:', out.length, 'keyframes renamed:', Object.keys(kfRename).join(',')||'(none)');
console.log('bytes:', result.length, 'installer bytes:', fn.length);
