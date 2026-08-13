const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave6c-native-output-binding.json');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const exists=r=>fs.existsSync(path.join(root,r));
const files=[];
(function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(?:ts|tsx|d\.ts)$/.test(e.name))files.push(p);}})(path.join(root,'src'));
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const symbols=s=>[...s.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|const|type|interface|class)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const fnShape=(s,name)=>{const m=new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(([^)]*)\\)(?:\\s*:\\s*([^\\{=>\\n]+))?`).exec(s);return m?{parameterCount:m[1].trim()?m[1].split(',').length:0,hasExplicitReturnType:Boolean(m[2]),async:/async\s+function/.test(m[0])}:null;};
const owner=(file)=>{const s=read(file);return{file,symbols:symbols(s),electronImports:[...s.matchAll(/from\s+['"]electron['"]/g)].length,hasBrowserWindow:/\bBrowserWindow\b/.test(s),constructsBrowserWindow:/new\s+BrowserWindow\s*\(/.test(s),hasDialog:/\bdialog\b/.test(s),hasIpcMainHandle:/ipcMain\.handle\s*\(/.test(s),hasSafeInvoke:/safeInvoke\s*\(/.test(s),hasContextBridge:/contextBridge\.exposeInMainWorld\s*\(/.test(s),hasPrintToPDF:/printToPDF\s*\(/.test(s),hasWebContentsPrint:/webContents\.print\s*\(/.test(s),hasShowSaveDialog:/showSaveDialog\s*\(/.test(s)};};
const windowFile='src/main/runtime/windowManager.ts';
const ipcFile='src/main/ipc/ipcRegistry.ts';
const allowFile='src/shared/security/channelAllowlist.ts';
const preloadApiFile='src/preload/orbitaApi.ts';
const preloadRootFile='src/preload/preload.ts';
for(const f of [windowFile,ipcFile,allowFile,preloadApiFile,preloadRootFile])if(!exists(f))throw Error('missing W6C binding owner '+f);
const windowText=read(windowFile),ipcText=read(ipcFile),allowText=read(allowFile),preloadText=read(preloadApiFile);
const globalApiCandidates=files.filter(p=>{const s=fs.readFileSync(p,'utf8');return s.includes('updateWorkforceLegend:')&&s.includes('orbita')&&(/interface\s+Window/.test(s)||/declare\s+global/.test(s));}).map(rel);
const workforceComponentCandidates=files.filter(p=>fs.readFileSync(p,'utf8').includes('function LjudiWorkforceSheet')||fs.readFileSync(p,'utf8').includes('export function LjudiWorkforceSheet')).map(rel);
const workforceHostCandidates=files.filter(p=>fs.readFileSync(p,'utf8').includes('<LjudiWorkforceSheet')).map(rel);
const result={
  audit:'ORBITA_WAVE6C_NATIVE_OUTPUT_BINDING_FORENSIC_V1',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',
  windowOwner:{...owner(windowFile),createMainWindow:fnShape(windowText,'createMainWindow'),hasModuleBrowserWindowReference:/let\s+\w*Window\s*:\s*BrowserWindow|let\s+\w*Window\s*=/.test(windowText),exportsWindowGetter:/export\s+(?:function|const)\s+\w*(?:Window|WebContents)/.test(windowText)&&symbols(windowText).some(x=>x!=='createMainWindow'&&/window|webcontents/i.test(x))},
  ipcOwner:{...owner(ipcFile),registerIpcHandlers:fnShape(ipcText,'registerIpcHandlers'),registeredInvokeChannelsExport:/registeredInvokeChannels/.test(ipcText),nativeDocumentChannelCount:(ipcText.match(/orbita:(?:openManagedDocument|pickAndImportNativeDocumentToWork)/g)||[]).length},
  allowlistOwner:{file:allowFile,hasAllowedInvokeChannels:/ORBITA_ALLOWED_INVOKE_CHANNELS/.test(allowText),hasInvokeChannelType:/OrbitaInvokeChannel/.test(allowText),workforceLegendAlreadyAllowed:/orbita:updateWorkforceLegend/.test(allowText)},
  preloadApiOwner:{...owner(preloadApiFile),workforceLegendMethod:/updateWorkforceLegend/.test(preloadText),nativeDocumentMethodCount:(preloadText.match(/openManagedDocument|pickAndImportNativeDocumentToWork/g)||[]).length},
  preloadRootOwner:owner(preloadRootFile),
  rendererApiTypeOwners:globalApiCandidates,
  workforceComponentOwners:workforceComponentCandidates,
  workforceHostOwners:workforceHostCandidates,
  verdict:{singleRendererApiTypeOwner:globalApiCandidates.length===1,singleWorkforceComponentOwner:workforceComponentCandidates.length===1,singleWorkforceHostOwner:workforceHostCandidates.length===1,reuseExistingIpc:true,reuseExistingAllowlist:true,reuseExistingPreload:true,windowExtensionRequired:true,parallelPreloadForbidden:true}
};
fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!result.verdict.singleRendererApiTypeOwner)throw Error('renderer API type owner expected exactly one');
if(!result.verdict.singleWorkforceComponentOwner)throw Error('Workforce component owner expected exactly one');
if(!result.verdict.singleWorkforceHostOwner)throw Error('Workforce host owner expected exactly one');
if(!result.ipcOwner.hasIpcMainHandle||!result.preloadApiOwner.hasSafeInvoke||!result.preloadRootOwner.hasContextBridge)throw Error('existing IPC/preload chain not physically proven');
