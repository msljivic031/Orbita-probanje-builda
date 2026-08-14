const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const rendererRoot=path.join(root,'src','renderer');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else if(/\.(ts|tsx)$/.test(e.name))out.push(p);}return out;}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function uniq(a){return [...new Set(a)].sort();}
const files=walk(rendererRoot).map(file=>({file,rel:rel(file),text:fs.readFileSync(file,'utf8')}));
const owner=files.find(x=>x.rel.endsWith('src/renderer/screens/dokumenti/DokumentiScreen.tsx'));
if(!owner||!owner.text.includes('document-work-open')||!owner.text.includes('onOpenWorkDossier'))throw new Error('Documents work-open callback owner unresolved');
const callbackOccurrences=[];
for(const src of files){if(!src.text.includes('onOpenWorkDossier'))continue;
 const jsxBindings=[...src.text.matchAll(/onOpenWorkDossier\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/g)].map(m=>m[1]);
 const propDeclarations=[...src.text.matchAll(/onOpenWorkDossier\??\s*:\s*\(([^)]*)\)\s*=>/g)].map(m=>({parameterCount:m[1].trim()?m[1].split(',').length:0}));
 const calls=(src.text.match(/onOpenWorkDossier\s*\(/g)||[]).length;
 callbackOccurrences.push({file:src.rel,jsxBindings:uniq(jsxBindings),propDeclarations,calls,semanticSignals:{setsRouteRadovi:/setRoute\s*\(\s*['"`]radovi['"`]\s*\)/.test(src.text),setsSelectedWork:/setSelectedWork|selectWork|selectedWorkId/i.test(src.text),setsDossier:/set[A-Za-z0-9_]*Dossier|open[A-Za-z0-9_]*Dossier|show[A-Za-z0-9_]*Dossier/i.test(src.text),hasDossierTab:/data-orbita-dossier-tab/.test(src.text),hasSelectedWorkOpenDossier:/selected-work-open-dossier/.test(src.text)}});
}
const bindingIds=uniq(callbackOccurrences.flatMap(x=>x.jsxBindings));
const bindingDefinitions=[];
for(const id of bindingIds){for(const src of files){const patterns=[new RegExp(`(?:const|let)\\s+${id}\\s*=\\s*(?:useCallback\\s*\\()?\\s*\\(?([^=]*)\\)?\\s*=>`),new RegExp(`function\\s+${id}\\s*\\(([^)]*)\\)` )];let hit=false;for(const re of patterns){const m=re.exec(src.text);if(!m)continue;hit=true;const start=m.index,end=Math.min(src.text.length,start+5000);const body=src.text.slice(start,end);bindingDefinitions.push({identifier:id,file:src.rel,parameterCount:(m[1]||'').trim()?(m[1]||'').split(',').length:0,semanticSignals:{setsRouteRadovi:/setRoute\s*\(\s*['"`]radovi['"`]\s*\)/.test(body),setsSelectedWork:/setSelectedWork|selectWork|selectedWorkId/i.test(body),setsDossier:/set[A-Za-z0-9_]*Dossier|open[A-Za-z0-9_]*Dossier|show[A-Za-z0-9_]*Dossier/i.test(body),callsOpenWorkDossier:/open[A-Za-z0-9_]*Work[A-Za-z0-9_]*Dossier|openWorkDossier/i.test(body),callsSetRoute:/setRoute\s*\(/.test(body),callsSetSelected:/setSelected[A-Za-z0-9_]*Work|selectWork/i.test(body)}});break;}if(hit)continue;}}
const dossierOwners=files.filter(x=>x.text.includes('data-orbita-dossier-tab="documents"')||x.text.includes("data-orbita-dossier-tab='documents'")||x.text.includes('selected-work-open-dossier')).map(x=>({file:x.rel,hasDocumentsTab:/data-orbita-dossier-tab/.test(x.text)&&/documents/.test(x.text),hasSelectedWorkOpenDossier:x.text.includes('selected-work-open-dossier'),routeRadovi:/['"`]radovi['"`]/.test(x.text)}));
const verdict={documentButtonPromisesDossier:/Otvori dosije Rada/.test(owner.text),documentsCallsCallback:(owner.text.match(/onOpenWorkDossier\s*\(/g)||[]).length>0,jsxBindingResolved:bindingIds.length>0,bindingDefinitionResolved:bindingDefinitions.length>0,bindingActuallyOpensDossier:bindingDefinitions.some(x=>x.semanticSignals.setsDossier||x.semanticSignals.callsOpenWorkDossier),bindingOnlySelectsOrRoutes:bindingDefinitions.some(x=>(x.semanticSignals.setsSelectedWork||x.semanticSignals.setsRouteRadovi||x.semanticSignals.callsSetSelected||x.semanticSignals.callsSetRoute)&&!(x.semanticSignals.setsDossier||x.semanticSignals.callsOpenWorkDossier)),productFlowRepairRequired:false,noProductMutation:true};
if(verdict.documentButtonPromisesDossier&&verdict.bindingDefinitionResolved&&!verdict.bindingActuallyOpensDossier)verdict.productFlowRepairRequired=true;
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7C_DOCUMENT_WORK_OPEN_CALLBACK_CHAIN',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',documentsOwner:owner.rel,callbackOccurrences,bindingIdentifiers:bindingIds,bindingDefinitions,dossierOwners,verdict},null,2));
