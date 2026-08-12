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
function structuralLinesAround(text, token){
  const lines=text.split(/\r?\n/); const center=lines.findIndex(l=>l.includes(token)); if(center<0)return [];
  const out=[];
  for(let n=Math.max(0,center-22);n<=Math.min(lines.length-1,center+16);n++){
    const l=lines[n];
    const tags=[...l.matchAll(/<\/?([A-Za-z][A-Za-z0-9.]*)/g)].map(m=>m[1]);
    const strings=[...l.matchAll(/["'`]([^"'`\n]{1,100})["'`]/g)].map(m=>m[1]).filter(s=>/[A-Za-zČĆŽŠĐčćžšđ]/.test(s)).map(s=>s.includes(token)?token:s);
    const data=[...l.matchAll(/data-orbita-([a-z0-9-]+)\s*=\s*["']([^"']+)["']/gi)].map(m=>`data-orbita-${m[1]}=${m[2]}`);
    const handlers=[]; for(const m of l.matchAll(/on[A-Z][A-Za-z0-9]*\s*=\s*\{([^}]*)\}/g)){handlers.push(...[...m[1].matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g)].map(x=>x[1]))}
    const conditionalIds=[]; if(/[?&|!]=?|&&|\?|:\s*\(/.test(l)){for(const m of l.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]{2,})\b/g)){if(!['className','button','type','data','orbita','action','true','false','null','undefined','return'].includes(m[1]))conditionalIds.push(m[1])}}
    const textNodes=[...l.matchAll(/>([^<>{}\n]{1,100})</g)].map(m=>m[1].replace(/\s+/g,' ').trim()).filter(Boolean);
    if(tags.length||strings.length||data.length||handlers.length||conditionalIds.length||textNodes.length||n===center){out.push({line:n+1,relative:n-center,tags:[...new Set(tags)],stringLiterals:[...new Set(strings)].slice(0,8),dataAttrs:[...new Set(data)],handlerIdentifiers:[...new Set(handlers)],conditionalIdentifiers:[...new Set(conditionalIds)].slice(0,15),textNodes:[...new Set(textNodes)].slice(0,8),tokenLine:n===center});}
  }
  return out;
}
function nearbyQuickMetadata(text){
  const token='person-availability-quick';
  const i=text.indexOf(token); if(i<0) return null;
  const before=text.slice(Math.max(0,i-2200),i+800);
  const strings=[]; for(const m of before.matchAll(/["'`]([^"'`\n]{1,90})["'`]/g)){const s=m[1].trim(); if(/[A-Za-zČĆŽŠĐčćžšđ]/.test(s)&&!s.includes(token)) strings.push(s)}
  const identifiers=new Set(); for(const m of before.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]{2,})\b/g)){const s=m[1]; if(!['const','let','var','return','className','button','type','data','orbita','action','true','false','null','undefined'].includes(s)) identifiers.add(s)}
  const onClicks=[]; for(const m of before.matchAll(/onClick\s*=\s*\{([^}]{1,180})\}/g)){for(const id of m[1].matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g)) onClicks.push(id[1])}
  const conditions=[]; for(const m of before.matchAll(/\{\s*([A-Za-z_$][A-Za-z0-9_$]*(?:\s*[!=]=+\s*[A-Za-z_$"'][^&|)]*)?)\s*&&\s*\(/g)) conditions.push(m[1].replace(/["'][^"']*["']/g,'<string>'));
  return {line:lineNo(text,i),nearbyStringLiterals:[...new Set(strings)].slice(-20),nearbyIdentifiers:[...identifiers].slice(-50),nearbyOnClickIdentifiers:[...new Set(onClicks)].slice(-20),nearbyConditionalShapes:[...new Set(conditions)].slice(-10),structuralLines:structuralLinesAround(text,token)};
}
const report={schemaVersion:3,audit:'R13AQ_AVAILABILITY_OWNER_SANITIZED_FORENSIC',tokenOccurrences:[],owners:[]};
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
