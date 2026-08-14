const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const targets=[
 'src/main/persistence/documents/sqliteNativeDocumentCommands.ts',
 'src/main/persistence/repository/documentRepository.ts',
 'src/main/ipc/ipcRegistry.ts',
 'src/preload/orbitaApi.ts',
 'src/renderer/screens/dokumenti/DokumentiScreen.tsx'
];
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function uniq(x){return [...new Set(x)].sort();}
const facts=[];
for(const target of targets){const file=path.join(root,target);if(!fs.existsSync(file))throw new Error(`owner missing ${target}`);const s=fs.readFileSync(file,'utf8');
 const exports=uniq([...s.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g)].map(m=>m[1]).filter(x=>/document|import|open|managed|native/i.test(x)));
 const functions=uniq([...s.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g)].map(m=>m[1]).filter(x=>/document|import|open|managed|native/i.test(x)));
 const channels=uniq([...s.matchAll(/['"`](orbita:[^'"`]*(?:Document|document|Import|import|Open|open)[^'"`]*)['"`]/g)].map(m=>m[1]));
 const actions=uniq([...s.matchAll(/data-orbita-action=["'`]([^"'`]+)["'`]/g)].map(m=>m[1]).filter(x=>/document|import|open/i.test(x)));
 const returnSignals={cancelled:/cancelled|canceled|cancel/i.test(s),success:/success|ok\s*:/i.test(s),error:/error|throw new Error/i.test(s),fileName:/fileName|originalFileName/i.test(s),documentId:/documentId/i.test(s),workItemId:/workItemId/i.test(s),folderId:/folderId/i.test(s),role:/\brole\b/i.test(s),validUntil:/validUntil/i.test(s),sourcePath:/sourcePath|selectedPath|filePath/i.test(s)};
 facts.push({file:target,exports,functions,channels,actions,returnSignals});
}
const native=facts.find(x=>x.file.endsWith('sqliteNativeDocumentCommands.ts'));
const ipc=facts.find(x=>x.file.endsWith('ipcRegistry.ts'));
const preload=facts.find(x=>x.file.endsWith('orbitaApi.ts'));
const renderer=facts.find(x=>x.file.endsWith('DokumentiScreen.tsx'));
if(!native.exports.some(x=>/import/i.test(x))&&!native.functions.some(x=>/import/i.test(x)))throw new Error('native import command unresolved');
if(!renderer.actions.includes('documents-import-native'))throw new Error('renderer native import action unresolved');
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7B_NATIVE_IMPORT_COMMAND_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',owners:facts,verdict:{nativeImportOwner:native.file,ipcOwner:ipc.file,preloadOwner:preload.file,rendererOwner:renderer.file,rendererAction:'documents-import-native',cancelSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.cancelled),successSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.success),errorSignalPresent:[native,ipc,preload,renderer].some(x=>x.returnSignals.error),physicalLifecycleProofRequired:true,noProductMutation:true}},null,2));
