const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const targets=[
 'src/renderer/screens/dokumenti/DokumentiScreen.tsx',
 'src/renderer/App.tsx',
 'src/renderer/shell/AppShell.tsx',
 'src/renderer/screens/radovi/RadoviScreen.tsx',
 'src/renderer/screens/radovi/workspace/RadoviSelectedWorkInspector.tsx',
 'src/renderer/screens/radovi/workspace/RadoviDossierPanel.tsx'
];
const present=targets.filter(x=>fs.existsSync(path.join(root,x)));
function uniq(a){return [...new Set(a)].sort();}
const facts=[];
for(const target of present){const s=fs.readFileSync(path.join(root,target),'utf8');const ids=uniq([...s.matchAll(/\b(?:onOpen|open|set|handle)[A-Z][A-Za-z0-9_]*/g)].map(m=>m[0]));facts.push({file:target,hasDocumentWorkOpen:s.includes('document-work-open'),hasSelectedWorkOpenDossier:s.includes('selected-work-open-dossier'),hasDossierDocumentsTab:s.includes('data-orbita-dossier-tab')&&/documents/.test(s),routeTokens:uniq([...s.matchAll(/['"`](radovi|dokumenti|kalendar|danas|ljudi|izvestaji|podesavanja)['"`]/g)].map(m=>m[1])),callbackIdentifiers:ids.filter(x=>/Work|Document|Dossier|Route|Selected/i.test(x)).slice(0,80),semanticSignals:{setsRadoviRoute:/setRoute\s*\(\s*['"`]radovi['"`]/.test(s),setsSelectedWork:/setSelectedWork|selectWork|selectedWorkId/i.test(s),opensDossier:/openDossier|setDossier|showDossier|dossierOpen/i.test(s),documentWorkOpenUsesCallback:/document-work-open[\s\S]{0,900}(?:onOpen|open|set|handle)[A-Z]/.test(s)}});}
const documents=facts.find(x=>x.file.endsWith('DokumentiScreen.tsx'));
if(!documents||!documents.hasDocumentWorkOpen)throw new Error('document-work-open owner unresolved');
const candidates=facts.filter(x=>x.semanticSignals.setsRadoviRoute||x.semanticSignals.opensDossier||x.hasSelectedWorkOpenDossier||x.hasDossierDocumentsTab);
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7C_DOCUMENT_WORK_OPEN_DESTINATION_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',documentsOwner:documents.file,owners:facts,destinationCandidates:candidates,verdict:{documentWorkOpenExists:true,selectedWorkOpenDossierExistsSomewhere:facts.some(x=>x.hasSelectedWorkOpenDossier),dossierDocumentsTabExistsSomewhere:facts.some(x=>x.hasDossierDocumentsTab),directDossierSignalOnDocumentsOwner:documents.semanticSignals.opensDossier,radoviRouteSignalOnDocumentsOwner:documents.semanticSignals.setsRadoviRoute,proofMustFollowExistingDestination:true,noProductMutation:true}},null,2));
