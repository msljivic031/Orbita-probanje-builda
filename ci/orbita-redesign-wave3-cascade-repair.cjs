const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const rel='src/renderer/styles/canonical/orbita-dossier-modal-natural-premium.css';
const file=path.join(root,rel);
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function findExactBlock(source,selector){let at=0,found=[];while((at=source.indexOf(selector,at))>=0){const open=source.indexOf('{',at);if(open<0)break;const head=source.slice(at,open).trim();if(head!==selector){at+=selector.length;continue;}let depth=0,end=-1;for(let i=open;i<source.length;i++){if(source[i]==='{')depth++;else if(source[i]==='}'){depth--;if(depth===0){end=i+1;break;}}}if(end<0)throw Error(`unterminated ${selector}`);found.push({at,open,end,body:source.slice(open+1,end-1)});at=end;}if(found.length!==1)throw Error(`${selector} expected 1 block, got ${found.length}`);return found[0];}
function setProps(selector,props){const b=findExactBlock(s,selector);let body=b.body;for(const [prop,value] of Object.entries(props)){const re=new RegExp(`(^|\\n|;)\\s*${prop.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*:[^;}]*(;|$)`,'m');if(re.test(body))body=body.replace(re,(m,prefix)=>`${prefix}\n  ${prop}:${value};`);else body=body.trimEnd()+`\n  ${prop}:${value};\n`;}s=s.slice(0,b.open+1)+'\n'+body.trim()+'\n'+s.slice(b.end-1);}
const metrics=".app-shell[data-orbita-dossier-modal-premium='r4r16'] .radovi-dossier-workspace-mode .rad-dossier-natural-metrics";
setProps(metrics,{display:'grid!important','grid-template-columns':'repeat(4,minmax(0,1fr))!important','grid-auto-rows':'minmax(58px,auto)','overflow':'hidden!important'});
const oldSelector=".app-shell[data-orbita-dossier-modal-premium='r4r16'] .rad-dossier-natural-metrics .rad-dossier-metric:nth-child(n+4)";
const b=findExactBlock(s,oldSelector);
const newSelector=".app-shell[data-orbita-dossier-modal-premium='r4r16'] .rad-dossier-natural-metrics .rad-dossier-metric:nth-child(n+5)";
const newBlock=`${newSelector}{\n  display:none!important;\n}`;
s=s.slice(0,b.at)+newBlock+s.slice(b.end);
fs.writeFileSync(file,s,'utf8');
console.log(JSON.stringify({repair:'WAVE3_DOSSIER_METRIC_CASCADE',file:rel,columns:4,visibleMetrics:['Status','Rok','Prioritet','Napredak'],hiddenDuplicateMetrics:['Koraci','Dokumenti']},null,2));