const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'workforce-legend-runtime-binding.json');
const R=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const E=f=>fs.existsSync(path.join(root,f));
const decls=s=>[...s.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|class|const|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const funcs=s=>[...s.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)].map(m=>({name:m[1],params:m[2].split(',').map(x=>x.trim().split(':')[0].trim()).filter(Boolean),async:/async\s+function/.test(m[0])}));
const imported=s=>[...s.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)].map(m=>({from:m[2],names:m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean)}));
const methodCalls=(s,obj)=>[...new Set([...s.matchAll(new RegExp(`\\b${obj}\\.([A-Za-z_$][\\w$]*)\\s*\\(`,'g'))].map(m=>m[1]))].sort();
const allCalls=s=>[...new Set([...s.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]).filter(x=>!/^(if|for|while|switch|catch|function|String|Number|Boolean|Date|JSON|Math|Array|Object|Set|Map)$/.test(x)))].sort();
const objectKeys=s=>[...new Set([...s.matchAll(/^\s{2,}([A-Za-z_$][\w$]*)\s*:/gm)].map(m=>m[1]))].sort();
const channels=s=>[...new Set([...s.matchAll(/['"](orbita:[A-Za-z0-9:_-]+)['"]/g)].map(m=>m[1]))].sort();
const files={runtime:'src/main/persistence/core/sqliteRuntime.ts',a418:'src/main/persistence/schema/sqliteA418TemporalResponsibilitySchema.ts',orgCommands:'src/main/persistence/organization/sqliteOrganizationRegistryCommands.ts',orgRepo:'src/main/persistence/repository/organizationRepository.ts',history:'src/main/persistence/history/sqliteSemanticHistoryStore.ts',read:'src/main/persistence/repository/workspaceReadRepository.ts',ipcHandlers:'src/main/ipc/repositoryIpcHandlers.ts',ipcRegistry:'src/main/ipc/ipcRegistry.ts',api:'src/preload/orbitaApi.ts',preload:'src/preload/preload.ts',global:'src/shared/contracts/orbitaApi.ts'};
const existing=Object.fromEntries(Object.entries(files).filter(([,f])=>E(f)));
const result={audit:'ORBITA_WAVE6B_RUNTIME_BINDING_V1',sourceExposure:'SEMANTIC_METADATA_ONLY_NO_SOURCE_SNIPPETS',files:{}};
for(const [key,file] of Object.entries(existing)){const s=R(file);result.files[key]={file,declaredSymbols:decls(s),functions:funcs(s),imports:imported(s),databaseMethods:methodCalls(s,'database'),dbMethods:methodCalls(s,'db'),statementMethods:methodCalls(s,'statement'),runtimeMethods:methodCalls(s,'runtime'),allCalls:allCalls(s).filter(x=>/history|organization|workspace|transaction|execute|prepare|query|insert|update|read|write|invoke|register|actor|correlation|schema|ensure|seed/i.test(x)),objectKeys:objectKeys(s).filter(x=>/organization|workspace|people|team|history|create|update|get|repository|invoke/i.test(x)),channels:channels(s)};}
const srcRoot=path.join(root,'src'); const paths=[];(function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))paths.push(p)}})(srcRoot);
const rel=f=>path.relative(root,f).replaceAll('\\','/');
result.crossReferences={
 safeInvokeFiles:paths.filter(f=>/safeInvoke\s*</.test(fs.readFileSync(f,'utf8'))).map(rel).slice(0,80),
 orbitaApiTypeFiles:paths.filter(f=>/type\s+OrbitaApi|interface\s+OrbitaApi|orbitaApi\s*=/.test(fs.readFileSync(f,'utf8'))).map(rel).slice(0,80),
 historyAppendFiles:paths.filter(f=>/append.*History|history.*append|record.*History|insert.*history/i.test(fs.readFileSync(f,'utf8'))).map(rel).slice(0,80),
 transactionFiles:paths.filter(f=>/BEGIN|COMMIT|ROLLBACK|transaction/i.test(fs.readFileSync(f,'utf8'))).map(rel).slice(0,80)
};
result.decision={database:'Reuse exact low-level database methods and transaction convention physically enumerated above.',history:'Reuse existing semantic-history append/store owner; legend table versions remain lookup truth.',ipc:'Mirror existing repository handler + ipc registry + preload safeInvoke chain.',types:'Extend the one shared Orbita API contract file physically located in crossReferences; do not create an untyped window escape hatch.'};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!result.files.runtime)throw Error('sqliteRuntime missing');
if(!result.files.orgCommands)throw Error('organization command owner missing');
if(!result.files.ipcHandlers||!result.files.ipcRegistry||!result.files.api)throw Error('IPC/preload chain incomplete');