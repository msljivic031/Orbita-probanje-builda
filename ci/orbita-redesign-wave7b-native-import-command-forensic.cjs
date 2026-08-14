const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const srcRoot=path.join(root,'src');
const targets=[
 'src/main/persistence/documents/sqliteNativeDocumentCommands.ts',
 'src/main/persistence/repository/documentRepository.ts',
 'src/main/ipc/ipcRegistry.ts',
 'src/preload/orbitaApi.ts',
 'src/renderer/screens/dokumenti/DokumentiScreen.tsx'
];
function uniq(x){return [...new Set(x)].sort();}
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else if(/\.(ts|tsx)$/.test(e.name))out.push(p);}return out;}
const sourceFiles=walk(srcRoot);
function splitParams(raw){const out=[];let cur='',depth=0;for(const ch of raw){if('(<[{'.includes(ch))depth++;if(')>]}'.includes(ch))depth--;if(ch===','&&depth===0){out.push(cur.trim());cur='';}else cur+=ch;}if(cur.trim())out.push(cur.trim());return out;}
function paramFacts(raw){return splitParams(raw).map((p,index)=>{const m=/^(?:\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^=]+?)(?:\s*=.*)?$/.exec(p);if(!m)return {index,name:'UNRESOLVED',optional:false,typeIdentifiers:[]};return {index,name:m[1],optional:m[2]==='?',typeIdentifiers:uniq([...m[3].matchAll(/\b[A-Z][A-Za-z0-9_$]*\b/g)].map(x=>x[0])),typeKind:/string/.test(m[3])?'string':/boolean/.test(m[3])?'boolean':/number/.test(m[3])?'number':'other'};});}
function typeShapes(s,file){const out=[];for(const m of s.matchAll(/(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_$]+)\s*(?:=\s*)?\{([\s\S]*?)\}/g)){const name=m[1],body=m[2];const fields=[];for(const f of body.matchAll(/(?:^|[;\n])\s*([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^;\n]+)/g)){fields.push({name:f[1],optional:f[2]==='?',typeKind:/string/.test(f[3])?'string':/boolean/.test(f[3])?'boolean':/number/.test(f[3])?'number':/null|undefined/.test(f[3])?'nullable-or-undefined':'other'});}if(fields.length)out.push({owner:file,name,fields});}return out;}
const allShapes=[];for(const file of sourceFiles){const rel=path.relative(root,file).replace(/\\/g,'/');const s=fs.readFileSync(file,'utf8');allShapes.push(...typeShapes(s,rel));}
const facts=[];
for(const target of targets){const file=path.join(root,target);if(!fs.existsSync(file))throw new Error(`owner missing ${target}`);const s=fs.readFileSync(file,'utf8');
 const exports=uniq([...s.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)].map(m=>m[1]).filter(x=>/document|import|open|managed|native/i.test(x)));
 const functions=[...s.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g)].map(m=>({name:m[1],parameters:paramFacts(m[2])})).filter(x=>/document|import|open|managed|native/i.test(x.name));
 const channels=uniq([...s.matchAll(/['"`](orbita:[^'"`]*(?:Document|document|Import|import|Open|open)[^'"`]*)['"`]/g)].map(m=>m[1]));
 const actions=uniq([...s.matchAll(/data-orbita-action=["'`]([^"'`]+)["'`]/g)].map(m=>m[1]).filter(x=>/document|import|open/i.test(x)));
 const returnSignals={cancelled:/cancelled|canceled|cancel/i.test(s),success:/success|ok\s*:/i.test(s),error:/error|throw new Error/i.test(s),fileName:/fileName|originalFileName/i.test(s),documentId:/documentId/i.test(s),workItemId:/workItemId/i.test(s),folderId:/folderId/i.test(s),role:/\brole\b/i.test(s),validUntil:/validUntil/i.test(s),sourcePath:/sourcePath|selectedPath|filePath/i.test(s)};
 facts.push({file:target,exports,functions,channels,actions,returnSignals});
}
const native=facts.find(x=>x.file.endsWith('sqliteNativeDocumentCommands.ts'));
const ipc=facts.find(x=>x.file.endsWith('ipcRegistry.ts'));
const preload=facts.find(x=>x.file.endsWith('orbitaApi.ts'));
const renderer=facts.find(x=>x.file.endsWith('DokumentiScreen.tsx'));
const importFunctions=native.functions.filter(x=>/import/i.test(x.name));
if(!native.exports.some(x=>/import/i.test(x))&&!importFunctions.length)throw new Error('native import command unresolved');
if(!renderer.actions.includes('documents-import-native'))throw new Error('renderer native import action unresolved');
const requestTypeIds=uniq(importFunctions.flatMap(fn=>fn.parameters.flatMap(p=>p.typeIdentifiers)).filter(x=>!/Database|Result|Workspace/i.test(x)));
const requestShapes=allShapes.filter(shape=>requestTypeIds.includes(shape.name));
const resultShapes=allShapes.filter(shape=>/ImportNativeDocumentRuntimeResult/.test(shape.name));
const requestField=(name)=>requestShapes.flatMap(x=>x.fields.filter(f=>f.name===name).map(f=>({owner:x.owner,type:x.name,...f})));
const requestWorkItemFields=requestField('workItemId');
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7B_NATIVE_IMPORT_COMMAND_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',owners:facts,nativeImportFunctions:importFunctions,requestTypeIdentifiers:requestTypeIds,requestShapes,resultShapes,requestOptionality:{workItemId:requestWorkItemFields,folderId:requestField('folderId'),role:requestField('role'),validUntil:requestField('validUntil'),sourcePath:[...requestField('sourcePath'),...requestField('filePath')]},verdict:{nativeImportOwner:native.file,ipcOwner:ipc.file,preloadOwner:preload.file,rendererOwner:renderer.file,rendererAction:'documents-import-native',requestContractResolved:requestShapes.length>0,radLinkRequestResolved:requestWorkItemFields.length>0,radLinkOptionalInRequest:requestWorkItemFields.some(x=>x.optional),radLinkRequiredInRequest:requestWorkItemFields.some(x=>!x.optional),cancelSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.cancelled),successSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.success),errorSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.error),physicalLifecycleProofRequired:true,noProductMutation:true}},null,2));
