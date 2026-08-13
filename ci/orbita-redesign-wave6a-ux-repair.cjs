const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const css=path.join(root,'src','renderer','styles','canonical','people-operational-closure.css');
let source=fs.readFileSync(css,'utf8').replace(/\r\n/g,'\n');
const marker='.people-dossier-surface[hidden]{display:none!important}';
if(!source.includes(marker)){
  const anchor='.people-workforce-entrybar{';
  const i=source.indexOf(anchor);
  if(i<0) throw Error('Wave6A Workforce CSS owner anchor missing');
  source=source.slice(0,i)+marker+'\n'+source.slice(i);
  fs.writeFileSync(css,source,'utf8');
}
console.log(JSON.stringify({state:'W6A_UX_REPAIR_APPLIED',productSrcChanged:true,owner:'src/renderer/styles/canonical/people-operational-closure.css',repair:'Author CSS now respects dossier hidden state while Workforce mode is active; no layer-over-layer owner introduced.'},null,2));