const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const targets=[
 'src/main/persistence/documents/sqliteNativeDocumentCommands.ts',
 'src/main/persistence/repository/documentRepository.ts',
 'src/main/ipc/ipcRegistry.ts',
 'src/preload/orbitaApi.ts',
 'src/renderer/screens/dokumenti/DokumentiScreen.tsx'
];
function uniq(x){return [...new Set(x)].sort();}
function typeShapes(s){const out=[];for(const m of s.matchAll(/(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]*(?:Import|Document|Native|Managed|Open)[A-Za-z0-9_]*)\s*(?:=\s*)?\{([\s\S]*?)\}/g)){const name=m[1],body=m[2];const fields=[];for(const f of body.matchAll(/(?:^|[;\n])\s*([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^;\n]+)/g)){fields.push({name:f[1],optional:f[2]==='?',typeKind:/string/.test(f[3])?'string':/boolean/.test(f[3])?'boolean':/number/.test(f[3])?'number':/null|undefined/.test(f[3])?'nullable-or-undefined':'other'});}if(fields.length)out.push({name,fields});}return out;}
const facts=[];
for(const target of targets){const file=path.join(root,target);if(!fs.existsSync(file))throw new Error(`owner missing ${target}`);const s=fs.readFileSync(file,'utf8');
 const exports=uniq([...s.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)].map(m=>m[1]).filter(x=>/document|import|open|managed|native/i.test(x)));
 const functions=[...s.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g)].map(m=>({name:m[1],parameterCount:m[2].trim()?m[2].split(',').length:0})).filter(x=>/document|import|open|managed|native/i.test(x.name));
 const channels=uniq([...s.matchAll(/['"`](orbita:[^'"`]*(?:Document|document|Import|import|Open|open)[^'"`]*)['"`]/g)].map(m=>m[1]));
 const actions=uniq([...s.matchAll(/data-orbita-action=["'`]([^"'`]+)["'`]/g)].map(m=>m[1]).filter(x=>/document|import|open/i.test(x)));
 const shapes=typeShapes(s);
 const returnSignals={cancelled:/cancelled|canceled|cancel/i.test(s),success:/success|ok\s*:/i.test(s),error:/error|throw new Error/i.test(s),fileName:/fileName|originalFileName/i.test(s),documentId:/documentId/i.test(s),workItemId:/workItemId/i.test(s),folderId:/folderId/i.test(s),role:/\brole\b/i.test(s),validUntil:/validUntil/i.test(s),sourcePath:/sourcePath|selectedPath|filePath/i.test(s)};
 facts.push({file:target,exports,functions,channels,actions,typeShapes:shapes,returnSignals});
}
const native=facts.find(x=>x.file.endsWith('sqliteNativeDocumentCommands.ts'));
const ipc=facts.find(x=>x.file.endsWith('ipcRegistry.ts'));
const preload=facts.find(x=>x.file.endsWith('orbitaApi.ts'));
const renderer=facts.find(x=>x.file.endsWith('DokumentiScreen.tsx'));
if(!native.exports.some(x=>/import/i.test(x))&&!native.functions.some(x=>/import/i.test(x.name)))throw new Error('native import command unresolved');
if(!renderer.actions.includes('documents-import-native'))throw new Error('renderer native import action unresolved');
const importShapes=facts.flatMap(owner=>owner.typeShapes.map(shape=>({owner:owner.file,...shape}))).filter(x=>/import/i.test(x.name)||x.fields.some(f=>['sourcePath','filePath','workItemId','folderId','role','validUntil'].includes(f.name)));
const field=(name)=>importShapes.flatMap(x=>x.fields.filter(f=>f.name===name).map(f=>({owner:x.owner,type:x.name,...f})));
const workItemFields=field('workItemId');
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7B_NATIVE_IMPORT_COMMAND_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',owners:facts,importRequestShapes:importShapes,optionality:{workItemId:workItemFields,folderId:field('folderId'),role:field('role'),validUntil:field('validUntil'),sourcePath:[...field('sourcePath'),...field('filePath')]},verdict:{nativeImportOwner:native.file,ipcOwner:ipc.file,preloadOwner:preload.file,rendererOwner:renderer.file,rendererAction:'documents-import-native',radLinkContractResolved:workItemFields.length>0,radLinkOptionalWhereDeclared:workItemFields.some(x=>x.optional),radLinkRequiredWhereDeclared:workItemFields.some(x=>!x.optional),cancelSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.cancelled),successSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.success),errorSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.error),physicalLifecycleProofRequired:true,noProductMutation:true}},null,2));
