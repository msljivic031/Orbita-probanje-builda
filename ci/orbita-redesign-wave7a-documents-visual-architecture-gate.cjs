const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const cssFiles=walk(path.join(root,'src','renderer','styles')).filter(f=>f.endsWith('.css'));
const marker='/* ORBITA W7A DOCUMENTS VISUAL ARCHITECTURE */';
const owners=cssFiles.filter(f=>fs.readFileSync(f,'utf8').includes(marker));
if(owners.length!==1)throw new Error(`W7A visual marker owner count ${owners.length}`);
const css=fs.readFileSync(owners[0],'utf8');
for(const token of [
 '.documents-workspace-screen .workspace-compact-summary',
 '.documents-workspace-screen .document-expiry-warning-strip',
 'grid-template-columns:160px minmax(0,1fr) 300px',
 '.documents-workspace-screen .document-row.active',
 '.documents-workspace-screen .document-dossier-panel',
 '.documents-workspace-screen .documents-import-workflow',
 '@media (max-width:1390px)',
 'grid-template-columns:142px minmax(0,1fr) 270px',
 '.documents-workspace-screen .documents-file-list{\n  display:flex;\n  flex-direction:column;\n  align-items:stretch;\n  justify-content:flex-start;',
 '.documents-workspace-screen .documents-list-body{\n  flex:0 0 auto;\n  align-self:stretch;\n  margin-top:0;'
]) if(!css.includes(token)) throw new Error('W7A visual invariant missing '+token);
const screenPath=path.join(root,'src','renderer','screens','dokumenti','DokumentiScreen.tsx');
const screen=fs.readFileSync(screenPath,'utf8');
for(const token of [
 'data-orbita-documents-workspace="r4r21"',
 'data-orbita-action="documents-open-import"',
 'data-orbita-action="documents-import-native"',
 'data-orbita-action="select-document"',
 'data-orbita-action="documents-open-managed"',
 'data-orbita-action="documents-review-unlink"',
 'documents-workspace-surface',
 'documents-library-rail',
 'documents-file-list',
 'document-dossier-panel'
]) if(!screen.includes(token)) throw new Error('W7A canonical Documents screen invariant missing '+token);
for(const forbidden of ['new Blob','URL.createObjectURL','download=','framer-motion','@tailwind']) if(screen.includes(forbidden)) throw new Error('W7A forbidden renderer path '+forbidden);
for(const p of [
 'src/main/persistence/documents/documentStorage.ts',
 'src/main/persistence/documents/sqliteNativeDocumentCommands.ts',
 'src/main/persistence/repository/documentRepository.ts',
 'src/preload/preload.ts'
]){
 const s=fs.readFileSync(path.join(root,p),'utf8');
 if(s.includes(marker)) throw new Error('W7A visual marker leaked into truth owner '+p);
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{})};
if(deps['framer-motion']) throw new Error('W7A unexpectedly added framer-motion');
if(Object.keys(deps).some(k=>/tailwind/i.test(k))) throw new Error('W7A unexpectedly added Tailwind dependency');
console.log(JSON.stringify({state:'PASS',gate:'ORBITA_W7A_DOCUMENTS_VISUAL_ARCHITECTURE',owner:path.relative(root,owners[0]).replace(/\\/g,'/'),truth:['existing Documents screen preserved','existing native import/open/unlink selectors preserved','one CSS owner refined','registry rows forced into top vertical flow','1440 and 1366 layout rules present','no persistence/preload ownership change','no framer-motion/Tailwind adoption']},null,2));
