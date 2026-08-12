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
  'src/renderer/screens/ljudi/components/LjudiAvailabilityFoundationPanel.tsx',
  'src/renderer/screens/ljudi/components/LjudiAvailabilityModal.tsx',
  'src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx',
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
  return [...out].slice(0,120);
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
function nearbyQuickMetadata(text){
  const token='person-availability-quick';
  const i=text.indexOf(token); if(i<0) return null;
  const before=text.slice(Math.max(0,i-2200),i+800);
  const strings=[]; for(const m of before.matchAll(/["'`]([^"'`\n]{1,90})["'`]/g)){const s=m[1].trim(); if(/[A-Za-zČĆŽŠĐčćžšđ]/.test(s)&&!s.includes('person-availability-quick')) strings.push(s)}
  const identifiers=new Set(); for(const m of before.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]{2,})\b/g)){const s=m[1]; if(!['const','let','var','return','className','button','type','data','orbita','action','true','false','null','undefined'].includes(s)) identifiers.add(s)}
  const onClicks=[]; for(const m of before.matchAll(/onClick\s*=\s*\{([^}]{1,180})\}/g)){for(const id of m[1].matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g)) onClicks.push(id[1])}
  const conditions=[]; for(const m of before.matchAll(/\{\s*([A-Za-z_$][A-Za-z0-9_$]*(?:\s*[!=]=+\s*[A-Za-z_$"'][^&|)]*)?)\s*&&\s*\(/g)) conditions.push(m[1].replace(/["'][^"']*["']/g,'<string>'));
  return {line:lineNo(text,i),nearbyStringLiterals:[...new Set(strings)].slice(-20),nearbyIdentifiers:[...identifiers].slice(-50),nearbyOnClickIdentifiers:[...new Set(onClicks)].slice(-20),nearbyConditionalShapes:[...new Set(conditions)].slice(-10)};
}
const report={schemaVersion:2,audit:'R13AQ_AVAILABILITY_OWNER_SANITIZED_FORENSIC',tokenOccurrences:[],owners:[]};
for(const file of walk(srcRoot)){
  const r=rel(file), text=fs.readFileSync(file,'utf8');
  for(const token of tokens){
    let from=0; while(true){const i=text.indexOf(token,from); if(i<0)break; report.tokenOccurrences.push({token,path:r,line:lineNo(text,i)}); from=i+token.length;}
  }
  if(wantedFiles.has(r)) report.owners.push({path:r,bytes:Buffer.byteLength(text),uiStrings:uiStrings(text),dataAttrs:dataAttrs(text),handlerProps:propNames(text),quickMetadata:r.endsWith('/LjudiScreen.tsx')?nearbyQuickMetadata(text):null});
}
report.tokenOccurrences.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.token.localeCompare(b.token));
report.owners.sort((a,b)=>a.path.localeCompare(b.path));
report.state='PASS';
console.log(JSON.stringify(report,null,2));
