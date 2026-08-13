const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7-documents-owner-forensic.json');
function walk(dir){const result=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())result.push(...walk(full));else result.push(full);}return result;}
const srcRoot=path.join(root,'src');
if(!fs.existsSync(srcRoot))throw new Error('src root missing');
const files=walk(srcRoot).filter(f=>/\.(ts|tsx|js|jsx)$/.test(f));
const rel=f=>path.relative(root,f).replace(/\\/g,'/');
const text=f=>fs.readFileSync(f,'utf8');
const documentFiles=files.filter(f=>/(document|dokumenti|attachment)/i.test(rel(f)) || /(Document|Dokument|documentId|documents\b)/.test(text(f)));
function facts(f){const s=text(f);return {
 path:rel(f),
 renderer:/src\/renderer\//.test(rel(f)),
 main:/src\/main\//.test(rel(f)),
 domain:/src\/domain\//.test(rel(f)),
 shared:/src\/shared\//.test(rel(f)),
 persistence:/src\/main\/persistence\//.test(rel(f)),
 hasWriteFile:/\bwriteFile(?:Sync)?\b/.test(s),
 hasMkdir:/\bmkdir(?:Sync)?\b/.test(s),
 hasDialog:/\bshowOpenDialog\b|\bshowSaveDialog\b/.test(s),
 hasShellOpen:/\bshell\.openPath\b|\bopenPath\(/.test(s),
 hasIpcHandle:/\bipcMain\.handle\b|\bregisterInvoke\b/.test(s),
 hasSafeInvoke:/\bsafeInvoke\b/.test(s),
 hasDocumentId:/\bdocumentId\b/.test(s),
 hasWorkId:/\bworkId\b|\bradId\b|\bworkIds\b/.test(s),
 hasLink:/\blink/i.test(s)&&/document/i.test(s),
 hasUnlink:/\bunlink/i.test(s)&&/document/i.test(s),
 hasImport:/\bimport/i.test(s)&&/document/i.test(s),
 hasPreview:/\bpreview/i.test(s)&&/document/i.test(s),
 hasProvenance:/\bprovenance\b/i.test(s),
 hasQueue:/\bqueue\b/i.test(s),
 hasProgress:/\bprogress\b/i.test(s),
 hasErrorState:/\berror\b/i.test(s),
 hasReact:/\bReact\b|\buseState\b|\buseMemo\b|<\w+/.test(s)
};}
const entries=documentFiles.map(facts);
const exact={
 ipcRegistry:files.find(f=>rel(f)==='src/main/ipc/ipcRegistry.ts'),
 allowlist:files.find(f=>rel(f)==='src/shared/security/channelAllowlist.ts'),
 accessPolicy:files.find(f=>rel(f)==='src/shared/security/accessPolicy.ts'),
 preloadApi:files.find(f=>rel(f)==='src/preload/orbitaApi.ts'),
 preloadRoot:files.find(f=>rel(f)==='src/preload/preload.ts')
};
const result={
 state:'PASS',
 audit:'ORBITA_WAVE7_DOCUMENTS_OWNER_FORENSIC',
 documentFileCount:entries.length,
 owners:{
  renderer:entries.filter(x=>x.renderer&&x.hasReact).map(x=>x.path),
  domain:entries.filter(x=>x.domain).map(x=>x.path),
  persistence:entries.filter(x=>x.persistence).map(x=>x.path),
  shared:entries.filter(x=>x.shared).map(x=>x.path),
  physicalWriters:entries.filter(x=>x.hasWriteFile||x.hasMkdir).map(x=>x.path),
  importCandidates:entries.filter(x=>x.hasImport||x.hasDialog).map(x=>x.path),
  previewCandidates:entries.filter(x=>x.hasPreview||x.hasShellOpen).map(x=>x.path),
  linkCandidates:entries.filter(x=>x.hasDocumentId&&x.hasWorkId||x.hasLink||x.hasUnlink).map(x=>x.path),
  provenanceCandidates:entries.filter(x=>x.hasProvenance).map(x=>x.path),
  queueProgressCandidates:entries.filter(x=>x.hasQueue||x.hasProgress).map(x=>x.path),
  infrastructure:Object.fromEntries(Object.entries(exact).map(([k,v])=>[k,v?rel(v):null]))
 },
 capabilitySignals:{
  physicalWriterCount:entries.filter(x=>x.hasWriteFile||x.hasMkdir).length,
  nativeDialogCount:entries.filter(x=>x.hasDialog).length,
  nativeOpenCount:entries.filter(x=>x.hasShellOpen).length,
  importSignalCount:entries.filter(x=>x.hasImport).length,
  previewSignalCount:entries.filter(x=>x.hasPreview).length,
  linkSignalCount:entries.filter(x=>x.hasDocumentId&&x.hasWorkId||x.hasLink||x.hasUnlink).length,
  provenanceSignalCount:entries.filter(x=>x.hasProvenance).length,
  queueProgressSignalCount:entries.filter(x=>x.hasQueue||x.hasProgress).length
 },
 laws:[
  'forensic only; no product mutation',
  'paths and semantic flags only; no source snippets',
  'one-document truth must be reused',
  'native import/open/storage owners must not be duplicated',
  'Rad-document relationship must remain link truth, not copied document truth'
 ]
};
if(entries.length===0)throw new Error('no document-related source owners discovered');
for(const [name,value] of Object.entries(result.owners.infrastructure))if(!value)throw new Error('required shared infrastructure owner missing '+name);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
