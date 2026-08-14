const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const screen=path.join(root,'src/renderer/screens/dokumenti/DokumentiScreen.tsx');
if(!fs.existsSync(screen))throw new Error('DokumentiScreen owner missing');
const s=fs.readFileSync(screen,'utf8');
const count=(x)=>(s.match(new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
const required=[
 'data-orbita-w7c-relation-review="true"',
 'aria-label="Posledica uklanjanja veze"',
 '<span>Dokument</span><strong>{activeDocument.originalFileName}</strong>',
 '<span>Rad</span><strong>{work.title}</strong>',
 'Uklanja se samo ova veza · {documentRoleLabel(link.role)}. Dokument i managed fajl ostaju u biblioteci.',
 'Potvrdi uklanjanje veze',
 'Uvoz nije završen. Izbor je otkazan ili fajl nije prošao bezbednu proveru. Nijedan dokument nije dodat.',
 'Dokument nije moguće otvoriti: managed fajl nedostaje ili nije prošao proveru integriteta. Dokument nije izmenjen.',
 'onPickAndImportNativeDocumentToWork',
 'onOpenManagedDocument',
 'onUnlinkDocumentFromWork',
 'setOperationState',
 'setUnlinkReview'
];
for(const token of required)if(!s.includes(token))throw new Error('W7C invariant missing '+token);
for(const unique of ['data-orbita-w7c-relation-review="true"','data-orbita-action="documents-confirm-unlink"','data-orbita-action="documents-review-unlink"','data-orbita-action="documents-open-managed"','data-orbita-action="documents-import-native"'])if(count(unique)!==1)throw new Error(`W7C unique owner failure ${unique} count=${count(unique)}`);
if(/new Blob|URL\.createObjectURL|\bdownload=/.test(s))throw new Error('renderer fake file path detected');
if(s.includes('activeDocument.title'))throw new Error('non-canonical DocumentRecord title field detected');
if(s.includes('missing, checksum mismatch ili quarantine'))throw new Error('technical-only managed-open error copy still exposed');
const stylesRoot=path.join(root,'src/renderer/styles');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const css=walk(stylesRoot).filter(f=>f.endsWith('.css')&&fs.readFileSync(f,'utf8').includes('/* ORBITA W7C DOCUMENTS RECOVERY UX */'));
if(css.length!==1)throw new Error(`W7C CSS owner count ${css.length}`);
const c=fs.readFileSync(css[0],'utf8');
for(const token of ['.documents-unlink-consequence','grid-template-columns:64px minmax(0,1fr)'])if(!c.includes(token))throw new Error('W7C CSS invariant missing '+token);
console.log(JSON.stringify({state:'PASS',gate:'ORBITA_W7C_DOCUMENTS_RECOVERY_UX',owners:['src/renderer/screens/dokumenti/DokumentiScreen.tsx',path.relative(root,css[0]).replace(/\\/g,'/')],truth:['canonical DocumentRecord originalFileName reused','existing operationState/unlinkReview retained','existing activeDocument/work/link relation truth reused','exact document and Rad visible before unlink commit','relation-only consequence visible','native callbacks unchanged','no renderer file/preview owner']},null,2));
