const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) throw new Error('candidate root required');
const srcRoot = path.join(root, 'src');
const tokens = [
  'person-availability-quick',
  'availability-period-next',
  'availability-back-or-cancel',
  'LjudiAvailabilityFoundationPanel',
  'LjudiAvailabilityModal',
];
const wantedFiles = new Set([
  'src/renderer/screens/ljudi/LjudiScreen.tsx',
  'src/renderer/screens/ljudi/ljudi-screen/LjudiAvailabilityFoundationPanel.tsx',
  'src/renderer/screens/ljudi/ljudi-screen/LjudiAvailabilityModal.tsx',
  'src/renderer/screens/ljudi/ljudi-screen/LjudiPersonDossier.tsx',
]);
function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  } return out;
}
function rel(p){return path.relative(root,p).replaceAll('\\','/');}
function lineNo(text, index){return text.slice(0,index).split(/\r?\n/).length;}
function uiStrings(text){
  const out=new Set();
  for(const m of text.matchAll(/>([^<>{}\n][^<>{}\n]{0,90})</g)){
    const s=m[1].replace(/\s+/g,' ').trim(); if(s && /[A-Za-zČĆŽŠĐčćžšđ]/.test(s)) out.add(s);
  }
  return [...out].slice(0,80);
}
function dataAttrs(text){
  const out=new Set();
  for(const m of text.matchAll(/data-orbita-([a-z0-9-]+)\s*=\s*["']([^"']+)["']/gi)) out.add(`data-orbita-${m[1]}=${m[2]}`);
  return [...out].sort();
}
function propNames(text){
  const out=new Set();
  for(const m of text.matchAll(/\b(on[A-Z][A-Za-z0-9]+)\b/g)) out.add(m[1]);
  return [...out].sort();
}
const report={schemaVersion:1,audit:'R13AQ_AVAILABILITY_OWNER_SANITIZED_FORENSIC',tokenOccurrences:[],owners:[]};
for(const file of walk(srcRoot)){
  const r=rel(file), text=fs.readFileSync(file,'utf8');
  for(const token of tokens){
    let from=0; while(true){const i=text.indexOf(token,from); if(i<0)break; report.tokenOccurrences.push({token,path:r,line:lineNo(text,i)}); from=i+token.length;}
  }
  if(wantedFiles.has(r)) report.owners.push({path:r,bytes:Buffer.byteLength(text),uiStrings:uiStrings(text),dataAttrs:dataAttrs(text),handlerProps:propNames(text)});
}
report.tokenOccurrences.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.token.localeCompare(b.token));
report.owners.sort((a,b)=>a.path.localeCompare(b.path));
report.state='PASS';
console.log(JSON.stringify(report,null,2));
