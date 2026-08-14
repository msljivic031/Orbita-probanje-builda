const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const rendererRoot=path.join(root,'src','renderer');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else if(/\.(ts|tsx)$/.test(e.name))out.push(p);}return out;}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function uniq(a){return [...new Set(a)].sort();}
const files=walk(rendererRoot).map(file=>({file,rel:rel(file),text:fs.readFileSync(file,'utf8')}));
const get=(suffix)=>files.find(x=>x.rel.endsWith(suffix));
const documents=get('src/renderer/screens/dokumenti/DokumentiScreen.tsx');
const shell=get('src/renderer/shell/AppShell.tsx');
const app=get('src/renderer/App.tsx');
if(!documents||!shell||!app)throw new Error('Documents/AppShell/App owner chain missing');
if(!documents.text.includes('document-work-open')||!documents.text.includes('onOpenWorkDossier'))throw new Error('Documents work-open callback owner unresolved');
function jsxPropBinding(text,component,prop){const escC=component.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),escP=prop.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');for(const m of text.matchAll(new RegExp(`<${escC}\\b([\\s\\S]{0,12000}?)(?:/>|>)`,'g'))){const body=m[1];const b=new RegExp(`${escP}\\s*=\\s*\\{\\s*([^}]+?)\\s*\\}`).exec(body);if(b)return b[1].trim();}return null;}
function propDeclared(text,prop){const esc=prop.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`${esc}\\??\\s*:\\s*\\(`).test(text)||new RegExp(`\\b${esc}\\b`).test((/type\s+\w*Props\s*=\s*\{([\s\S]*?)\}/.exec(text)||[])[1]||'');}
function functionSemantic(text,id){if(!id||!/^[A-Za-z_$][\w$]*$/.test(id))return null;const esc=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const patterns=[new RegExp(`(?:const|let)\\s+${esc}\\s*=\\s*(?:useCallback\\s*\\()?\\s*\\(?([\\s\\S]{0,500}?)\\)?\\s*=>\\s*\\{`),new RegExp(`function\\s+${esc}\\s*\\(([^)]*)\\)\\s*\\{`)];for(const re of patterns){const m=re.exec(text);if(!m)continue;const start=m.index,end=Math.min(text.length,start+7000),body=text.slice(start,end);return {identifier:id,parameterCount:(m[1]||'').trim()?(m[1]||'').split(',').length:0,signals:{setsRouteRadovi:/setRoute\s*\(\s*['"`]radovi['"`]\s*\)/.test(body),setsSelectedWork:/setSelectedWork|selectWork|selectedWorkId/i.test(body),setsDossier:/set[A-Za-z0-9_]*Dossier|open[A-Za-z0-9_]*Dossier|show[A-Za-z0-9_]*Dossier/i.test(body),setsDossierWorkId:/set[A-Za-z0-9_]*(?:Dossier|Inspector)[A-Za-z0-9_]*(?:Work|Id)|dossierWorkId/i.test(body),callsOpenWorkDossier:/open[A-Za-z0-9_]*Work[A-Za-z0-9_]*Dossier|openWorkDossier/i.test(body),callsRoute:/setRoute\s*\(/.test(body)}};}return null;}
const shellDocumentsBinding=jsxPropBinding(shell.text,'DokumentiScreen','onOpenWorkDossier');
if(!shellDocumentsBinding)throw new Error('AppShell -> DokumentiScreen onOpenWorkDossier binding unresolved');
const shellBindingIsProp=propDeclared(shell.text,shellDocumentsBinding);
const appShellBinding=jsxPropBinding(app.text,'AppShell',shellDocumentsBinding);
const appHandler=functionSemantic(app.text,appShellBinding||shellDocumentsBinding);
const shellHandler=functionSemantic(shell.text,shellDocumentsBinding);
const dossierTabOwners=files.filter(x=>/data-orbita-dossier-tab/.test(x.text)&&/documents/.test(x.text)).map(x=>x.rel);
const selectedDossierActionOwners=files.filter(x=>x.text.includes('selected-work-open-dossier')).map(x=>x.rel);
const verdict={documentButtonPromisesDossier:/Otvori dosije Rada/.test(documents.text),documentsInvokesOnOpenWorkDossier:(documents.text.match(/onOpenWorkDossier\s*\(/g)||[]).length>0,shellDocumentsBinding,shellBindingIsProp,appShellBinding,terminalHandlerResolved:Boolean(appHandler||shellHandler),terminalHandlerSignals:(appHandler||shellHandler)?.signals||null,terminalHandlerActuallyOpensDossier:Boolean((appHandler||shellHandler)?.signals?.setsDossier||(appHandler||shellHandler)?.signals?.setsDossierWorkId||(appHandler||shellHandler)?.signals?.callsOpenWorkDossier),terminalHandlerOnlyRoutesOrSelects:Boolean((appHandler||shellHandler)&&((appHandler||shellHandler).signals.setsRouteRadovi||(appHandler||shellHandler).signals.setsSelectedWork||(appHandler||shellHandler).signals.callsRoute)&&!((appHandler||shellHandler).signals.setsDossier||(appHandler||shellHandler).signals.setsDossierWorkId||(appHandler||shellHandler).signals.callsOpenWorkDossier)),productFlowRepairRequired:false,noProductMutation:true};
if(verdict.documentButtonPromisesDossier&&verdict.terminalHandlerResolved&&!verdict.terminalHandlerActuallyOpensDossier)verdict.productFlowRepairRequired=true;
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7C_DOCUMENT_WORK_OPEN_CALLBACK_CHAIN_V2',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',owners:{documents:documents.rel,shell:shell.rel,app:app.rel},chain:{documentsProp:'onOpenWorkDossier',shellDocumentsBinding,shellBindingIsProp,appShellBinding,shellHandler,appHandler},dossierTabOwners,selectedDossierActionOwners,verdict},null,2));
