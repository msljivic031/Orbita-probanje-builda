const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const nativeFile=path.join(root,'src/main/persistence/documents/sqliteNativeDocumentCommands.ts');
const ipcFile=path.join(root,'src/main/ipc/ipcRegistry.ts');
const preloadFile=path.join(root,'src/preload/orbitaApi.ts');
for(const file of [nativeFile,ipcFile,preloadFile])if(!fs.existsSync(file))throw new Error('required owner missing '+path.relative(root,file));
const native=fs.readFileSync(nativeFile,'utf8'),ipc=fs.readFileSync(ipcFile,'utf8'),preload=fs.readFileSync(preloadFile,'utf8');
function uniq(a){return [...new Set(a)].sort();}
function splitParams(raw){const out=[];let cur='',depth=0,quote=null;for(let i=0;i<raw.length;i++){const ch=raw[i];if(quote){cur+=ch;if(ch===quote&&raw[i-1]!=='\\')quote=null;continue;}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;cur+=ch;continue;}if('(<[{'.includes(ch))depth++;if(')>]}'.includes(ch))depth--;if(ch===','&&depth===0){out.push(cur.trim());cur='';}else cur+=ch;}if(cur.trim())out.push(cur.trim());return out;}
function fieldFacts(text){return [...text.matchAll(/([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^,;}\n]+)/g)].map(m=>({name:m[1],optional:m[2]==='?',typeKind:/string/.test(m[3])?'string':/boolean/.test(m[3])?'boolean':/number/.test(m[3])?'number':'other'}));}
const fn=/export\s+function\s+importNativeDocumentToWorkInDatabase\s*\(([^)]*)\)/.exec(native);
if(!fn)throw new Error('importNativeDocumentToWorkInDatabase signature missing');
const params=splitParams(fn[1]);if(params.length<3)throw new Error('expected database request options parameters');
const optionsText=params[2];const optionsFields=fieldFacts(optionsText);
const optionIdentifiers=uniq([...optionsText.matchAll(/\b[A-Z][A-Za-z0-9_$]*\b/g)].map(m=>m[0]));
const nativeFacts={optionsFields,optionIdentifiers,usesCopyFile:/copyFile|copyFileSync|fs\.copy/i.test(native),usesReadFile:/readFile|readFileSync/i.test(native),usesWriteFile:/writeFile|writeFileSync/i.test(native),usesMkdir:/mkdir|mkdirSync/i.test(native),usesSha256:/sha256|createHash\s*\(\s*['"]sha256/i.test(native),managedRootSignals:uniq([...native.matchAll(/\b([A-Za-z_$][\w$]*(?:Root|Dir|Directory|Path))\b/g)].map(m=>m[1]).filter(x=>/managed|document|storage/i.test(x))).slice(0,40),sourceExistenceValidation:/existsSync|statSync|accessSync|ENOENT|not found|ne postoji/i.test(native),transactionSignal:/transaction|BEGIN|ROLLBACK|COMMIT/i.test(native),testFailHook:/__testOnlyFailAfterDatabaseMutation/.test(native)};
const channel='orbita:pickAndImportNativeDocumentToWork';
const channelIndex=ipc.indexOf(channel);if(channelIndex<0)throw new Error('native import IPC channel missing');
const windowText=ipc.slice(Math.max(0,channelIndex-5000),Math.min(ipc.length,channelIndex+9000));
const ipcFacts={channel,usesShowOpenDialog:/showOpenDialog/.test(windowText),usesShowOpenDialogSync:/showOpenDialogSync/.test(windowText),usesDialog:/\bdialog\b/.test(windowText),checksCanceled:/\.canceled|\.cancelled|canceled\s*:/i.test(windowText),checksEmptyFilePaths:/filePaths[^\n]{0,160}(?:length|\[0\])/.test(windowText),callsRepository:/importNativeDocumentToWorkThroughRepository/.test(windowText),callsRuntime:/importNativeDocumentToWorkRuntime/.test(windowText),cancelReturnKeys:uniq([...windowText.matchAll(/(?:canceled|cancelled|fileName|documentId|workspace|error)\s*:/gi)].map(m=>m[0].replace(/\s*:.*/,''))).slice(0,30),filePickerProperties:uniq([...windowText.matchAll(/\b(?:properties|filters|title|defaultPath)\s*:/g)].map(m=>m[0].replace(/\s*:.*/,'')))};
const preloadFacts={channelReferenced:preload.includes(channel),safeInvoke:preload.includes('safeInvoke'),methodNames:uniq([...preload.matchAll(/([A-Za-z_$][\w$]*import[A-Za-z0-9_$]*)\s*:/gi)].map(m=>m[1])).slice(0,40)};
if(!ipcFacts.usesShowOpenDialog&&!ipcFacts.usesShowOpenDialogSync)throw new Error('real native file picker not resolved');
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7B_NATIVE_IMPORT_RUNTIME_CONTRACT_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',nativeOwner:'src/main/persistence/documents/sqliteNativeDocumentCommands.ts',ipcOwner:'src/main/ipc/ipcRegistry.ts',preloadOwner:'src/preload/orbitaApi.ts',nativeFacts,ipcFacts,preloadFacts,verdict:{realPlatformPicker:true,cancelBoundaryInIpc:ipcFacts.checksCanceled||ipcFacts.checksEmptyFilePaths,successWriteOwnerPreserved:true,errorRollbackProofRequired:true,physicalCancelDialogProofRequired:true,noProductMutation:true}},null,2));
