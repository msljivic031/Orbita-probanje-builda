const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave6c-ipc-shape.json');
const file=path.join(root,'src/main/ipc/ipcRegistry.ts');
const s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function bodyOfFunction(name){const start=s.search(new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`));if(start<0)return null;const open=s.indexOf('{',start);if(open<0)return null;let depth=0,quote='',escape=false;for(let i=open;i<s.length;i++){const c=s[i];if(quote){if(escape){escape=false;continue;}if(c==='\\'){escape=true;continue;}if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return s.slice(open+1,i);}}return null;}
const body=bodyOfFunction('registerIpcHandlers');if(body==null)throw Error('registerIpcHandlers body missing');
const calls=[...s.matchAll(/registerInvoke(?:<[^>]+>)?\s*\(\s*['"]([^'"]+)['"]\s*,/g)].map(m=>m[1]);
function callbackArity(channel){const at=s.indexOf(`'${channel}'`);if(at<0)return null;const tail=s.slice(at,at+1800);const m=/(?:async\s*)?\(([^)]*)\)\s*=>/.exec(tail)||/(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>/.exec(tail);if(!m)return null;const raw=m[1]??m[0].split('=>')[0].replace(/async/g,'').trim();return raw.trim()?raw.split(',').length:0;}
const electronImport=(s.match(/import\s*\{([^}]+)\}\s*from\s*['"]electron['"]/s)||[])[1]||'';
const registerDecl=/function\s+registerInvoke(?:<[^>]+>)?\s*\(([^)]*)\)/s.exec(s);
const result={audit:'ORBITA_WAVE6C_IPC_SHAPE_FORENSIC_V1',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',file:'src/main/ipc/ipcRegistry.ts',electronImports:electronImport.split(',').map(x=>x.trim()).filter(Boolean),registerInvoke:{declarationFound:Boolean(registerDecl),parameterCount:registerDecl&&registerDecl[1].trim()?registerDecl[1].split(',').length:0,callCount:calls.length,channels:calls},nativeDocumentCallbacks:{openManagedDocument:callbackArity('orbita:openManagedDocument'),pickAndImportNativeDocumentToWork:callbackArity('orbita:pickAndImportNativeDocumentToWork')},registerIpcHandlers:{hasTopLevelReturn:/\n\s*return\b/.test(body),hasRegisteredChannelsReturn:/registeredInvokeChannels/.test(body)&&/return/.test(body),registerInvokeCallCount:(body.match(/registerInvoke(?:<[^>]+>)?\s*\(/g)||[]).length},nativeCapabilities:{dialogImported:/\bdialog\b/.test(electronImport),shellImported:/\bshell\b/.test(electronImport),showOpenDialog:/dialog\.showOpenDialog\s*\(/.test(s),showSaveDialog:/dialog\.showSaveDialog\s*\(/.test(s),pathImport:/from\s*['"]node:path['"]/.test(s)}};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!result.registerInvoke.declarationFound||result.registerInvoke.parameterCount<2)throw Error('registerInvoke shape not proven');
if(!result.nativeCapabilities.dialogImported)throw Error('dialog ownership not proven in ipcRegistry');
if(result.nativeDocumentCallbacks.pickAndImportNativeDocumentToWork==null)throw Error('native import callback shape not proven');
