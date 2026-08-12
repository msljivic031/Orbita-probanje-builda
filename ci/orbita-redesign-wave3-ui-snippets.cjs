const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'wave3-ui-snippets.json');
const targets={
 'src/renderer/screens/radovi/workspace/RadoviDossierPanel.tsx':['rad-dossier-hero','rad-dossier-metric-strip','rad-dossier-tabs','rad-dossier-more-menu'],
 'src/renderer/screens/radovi/create/RadCreateModalCoreFields.tsx':['rad-create-focus-card','rad-create-key-fields'],
 'src/renderer/screens/radovi/RadCreateModal.tsx':['RadCreateModalSectionTabs','RadCreateModalSectionFrame','RadCreateModalSummaryPanel','RadCreateModalFooter'],
 'src/renderer/screens/radovi/workspace/RadoviSelectedWorkInspector.tsx':['selected-work-open-dossier','selected-work-edit'],
 'src/renderer/screens/radovi/workspace/RadoviCommandDock.tsx':['command-switcher','Komanda dosijea'],
 'src/renderer/screens/radovi/workspace/RadDossierGraphPanel.tsx':['network-relation','Mreža','Poveži'],
 'src/renderer/screens/radovi/components/RadoviResponsibilityPanel.tsx':['Odgovorn','Primarn','Zamena'],
 'src/renderer/screens/radovi/workspace/RadDossierDocumentLinkPanel.tsx':['Dokument','dossier-import-document'],
 'src/renderer/screens/radovi/workspace/RadDossierSubworkSection.tsx':['Podrad','subwork'],
 'src/renderer/screens/radovi/workspace/RadDossierOverviewSection.tsx':['Status','Odgovorn','Rok','Prioritet']
};
function lineAt(s,i){return s.slice(0,i).split(/\r?\n/).length}
function windowFor(s,i,b=1700,a=2600){return s.slice(Math.max(0,i-b),Math.min(s.length,i+a)).replace(/\r\n/g,'\n')}
const result={audit:'ORBITA_WAVE3_BOUNDED_UI_SNIPPETS',targets:{}};
for(const [r,needles] of Object.entries(targets)){
 const p=path.join(root,r);if(!fs.existsSync(p)){result.targets[r]={missing:true};continue}const s=fs.readFileSync(p,'utf8'),hits=[];
 for(const needle of needles){let at=0,count=0;while((at=s.indexOf(needle,at))>=0&&count<3){hits.push({needle,line:lineAt(s,at),snippet:windowFor(s,at)});at+=needle.length;count++;}}
 result.targets[r]={hits};
}
// CSS owners only for classes that Wave 3 may need to alter in place.
const cssFiles=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.css'))cssFiles.push(p)}}walk(path.join(root,'src/renderer/styles'));
const classes=['rad-dossier-hero','rad-dossier-metric-strip','rad-dossier-tabs','rad-dossier-natural-tabs','rad-dossier-tab-active','rad-create-focus-card','rad-create-key-fields','rad-create-key-field-grid','rad-create-canonical-body','rad-create-deep-body','rad-create-summary','radovi-command-dock'];
result.css=[];
for(const f of cssFiles){const s=fs.readFileSync(f,'utf8');for(const cls of classes){let at=0;while((at=s.indexOf('.'+cls,at))>=0){const open=s.indexOf('{',at);if(open<0)break;let depth=0,end=-1;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)break;const selector=s.slice(s.lastIndexOf('}',at)+1,open).trim().replace(/\s+/g,' ');const block=s.slice(open+1,end-1).trim();result.css.push({file:path.relative(root,f).replaceAll('\\','/'),class:cls,selector,block});at=end;if(result.css.length>240)break}if(result.css.length>240)break}if(result.css.length>240)break}
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({targets:Object.fromEntries(Object.entries(result.targets).map(([k,v])=>[k,v.hits?.length||0])),css:result.css.length},null,2));