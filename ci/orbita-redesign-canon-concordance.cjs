const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const outDir=path.resolve(process.argv[3]||'canon-evidence');
fs.mkdirSync(outDir,{recursive:true});
const textExt=new Set(['.md','.txt','.json','.yaml','.yml','.tsx','.ts','.jsx','.js','.css']);
const files=[];
function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!['node_modules','dist','build','.git'].includes(e.name))walk(p);}else if(textExt.has(path.extname(e.name).toLowerCase()))files.push(p)}}
walk(root);
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const domains={
  work:['rad','work','task','subwork','podrad','completion','status','priority','schedule','occurrence','series','folder'],
  responsibility:['responsibility','odgovorn','delegate','delegation','zamena','replacement','assigner','accountability','completion contribution'],
  people:['person','people','ljudi','osoba','team','tim','organization','organiz','availability','odsust','absence','workforce'],
  calendar:['calendar','kalendar','schedule','rok','date','datum','recurrence','occurrence'],
  documents:['document','dokument','attachment','prilog','folder','provenance'],
  network:['network','mrež','mrez','graph','dependency','zavis','blocker','parent','child','subtree'],
  reports:['report','izvešt','izvest','analytics','as-of','comparison','compare','period','metric','team workload','history'],
  oi:[' oi ','operational intelligence','signal','decision','priority stream'],
  custom:['custom field','custom fields','prilagođ','prilagod','field definition','metadata'],
  commands:['copy','move','delete','archive','restore','duplicate','link','relate','shortcut','keyboard','context menu','command palette']
};
function normalize(s){return s.toLowerCase();}
function domainHits(text){const n=normalize(text),out=[];for(const [d,terms] of Object.entries(domains)){let score=0;for(const t of terms)if(n.includes(t))score++;if(score)out.push({domain:d,score});}return out.sort((a,b)=>b.score-a.score);}
const canonDocs=[];const clauses=[];
for(const f of files){const r=rel(f);if(!/\.(md|txt|json|ya?ml)$/i.test(r))continue;let s;try{s=fs.readFileSync(f,'utf8')}catch{continue}const lines=s.split(/\r?\n/);const hits=domainHits(s);const canonSignal=/(canon|governance|mie|law|invariant|workflow|authority|product truth)/i.test(r+'\n'+lines.slice(0,80).join('\n'));
  if(canonSignal&&hits.length){canonDocs.push({file:r,lines:lines.length,domains:hits.slice(0,8)});}
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();if(!line||line.length>240)continue;
    const heading=/^(#{1,6}\s+|(?:PART|SECTION|CHAPTER)\b|\d+(?:\.\d+){0,3}[.)]?\s+|[A-Z][A-Z0-9 _/–—-]{8,})/.test(line);
    if(!heading)continue;const hs=domainHits(line);if(!hs.length)continue;
    const context=lines.slice(i,Math.min(lines.length,i+4)).map(x=>x.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').slice(0,520);
    clauses.push({file:r,line:i+1,heading:line.slice(0,240),domains:hs.slice(0,4),context});
  }
}
canonDocs.sort((a,b)=>Math.max(...b.domains.map(x=>x.score))-Math.max(...a.domains.map(x=>x.score))||a.file.localeCompare(b.file));
clauses.sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line);

const sourceFiles=files.filter(f=>/\.(tsx?|jsx?)$/i.test(f));
const uiMap={};for(const d of Object.keys(domains))uiMap[d]={files:[],actions:[],labels:[]};
for(const f of sourceFiles){const r=rel(f);let s;try{s=fs.readFileSync(f,'utf8')}catch{continue}const hits=domainHits(r+'\n'+s);for(const h of hits.slice(0,4)){const bucket=uiMap[h.domain];if(bucket.files.length<80&&!bucket.files.includes(r))bucket.files.push(r);}for(const m of s.matchAll(/data-orbita-action\s*=\s*["'`]([^"'`]+)["'`]/g)){const around=s.slice(Math.max(0,m.index-900),Math.min(s.length,m.index+1300));const ah=domainHits(r+'\n'+around);for(const h of ah.slice(0,3)){const arr=uiMap[h.domain].actions;if(arr.length<120&&!arr.some(x=>x.id===m[1]&&x.file===r))arr.push({id:m[1],file:r});}}for(const m of s.matchAll(/(?:aria-label|title)\s*=\s*["'`]([^"'`]{2,100})["'`]/g)){const around=s.slice(Math.max(0,m.index-500),Math.min(s.length,m.index+700));const lh=domainHits(r+'\n'+around);for(const h of lh.slice(0,2)){const arr=uiMap[h.domain].labels;if(arr.length<80&&!arr.some(x=>x.label===m[1]&&x.file===r))arr.push({label:m[1],file:r});}}}

const matrix={audit:'ORBITA_CANON_TO_UX_CONCORDANCE_V1',generatedAt:new Date().toISOString(),rootFileCount:files.length,canonDocumentCount:canonDocs.length,clauseCount:clauses.length,domains:{}};
for(const d of Object.keys(domains)){
 const dc=clauses.filter(x=>x.domains.some(y=>y.domain===d));
 const dd=canonDocs.filter(x=>x.domains.some(y=>y.domain===d));
 matrix.domains[d]={canonDocuments:dd.slice(0,30),canonicalClauses:dc.slice(0,140),uiOwners:uiMap[d].files,actionIds:uiMap[d].actions,accessibleLabels:uiMap[d].labels,closure:'REQUIRES_HUMAN_CANON_UX_REVIEW'};
}
fs.writeFileSync(path.join(outDir,'canon-to-ux-concordance.json'),JSON.stringify(matrix,null,2));
const md=[];md.push('# ORBITA Canon → UX Concordance V1','',`Files scanned: ${files.length}`,`Canon/reference docs: ${canonDocs.length}`,`Relevant headings/clauses: ${clauses.length}`,'');
for(const [d,v] of Object.entries(matrix.domains)){md.push(`## ${d.toUpperCase()}`,`- canon docs: ${v.canonDocuments.length}` ,`- clauses: ${v.canonicalClauses.length}`,`- UI owner candidates: ${v.uiOwners.length}`,`- action IDs: ${v.actionIds.length}`,'');for(const c of v.canonicalClauses.slice(0,25))md.push(`- ${c.file}:${c.line} — ${c.heading}`);md.push('');}
fs.writeFileSync(path.join(outDir,'CANON_TO_UX_SUMMARY.md'),md.join('\n'));
console.log(JSON.stringify({files:files.length,canonDocs:canonDocs.length,clauses:clauses.length,domains:Object.fromEntries(Object.entries(matrix.domains).map(([k,v])=>[k,{clauses:v.canonicalClauses.length,owners:v.uiOwners.length,actions:v.actionIds.length}]))},null,2));