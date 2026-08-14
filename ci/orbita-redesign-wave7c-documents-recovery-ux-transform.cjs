const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const screenRel='src/renderer/screens/dokumenti/DokumentiScreen.tsx';
const screenFile=path.join(root,screenRel);
if(!fs.existsSync(screenFile))throw new Error('DokumentiScreen owner missing');
let s=fs.readFileSync(screenFile,'utf8').replace(/\r\n/g,'\n');
function replaceOnce(from,to,label){if(s.includes(to))return;const n=s.split(from).length-1;if(n!==1)throw new Error(`${label} owner count ${n}`);s=s.replace(from,to);}
replaceOnce(
  'Otvaram izbor fajla. Uvoz ostaje atomski: kopija, SHA-256, biblioteka i veza sa Radom.',
  'Otvaram izbor fajla. Uvoz se završava tek kada bezbedna provera i čuvanje uspeju.',
  'import working feedback'
);
replaceOnce(
  'Uvoz nije završen. Izbor je otkazan ili je native storage guard odbio fajl; nijedan lokalni fallback upis nije napravljen.',
  'Uvoz nije završen. Izbor je otkazan ili fajl nije prošao bezbednu proveru. Nijedan dokument nije dodat.',
  'import cancel/error feedback'
);
replaceOnce(
  'Otvaranje je blokirano: missing, checksum mismatch ili quarantine. Storage guard nije prosledio fajl van bezbedne managed putanje.',
  'Dokument nije moguće otvoriti: managed fajl nedostaje ili nije prošao proveru integriteta. Dokument nije izmenjen.',
  'managed open error feedback'
);
replaceOnce(
  'Uklanjam samo vezu sa Radom. Dokument i managed fajl ostaju u biblioteci.',
  'Uklanjam samo izabranu vezu sa Radom. Dokument i managed fajl ostaju u biblioteci.',
  'unlink working feedback'
);
const marker='data-orbita-w7c-relation-review="true"';
if(!s.includes(marker)){
  const re=/(<button\b[^>]*data-orbita-action=["']documents-confirm-unlink["'][^>]*>)/;
  const matches=[...s.matchAll(new RegExp(re.source,'g'))];
  if(matches.length!==1)throw new Error(`confirm unlink action owner count ${matches.length}`);
  const note=`<div className="documents-unlink-consequence" role="note" aria-label="Posledica uklanjanja veze" data-orbita-w7c-relation-review="true">
                        <div><span>Dokument</span><strong>{activeDocument.originalFileName}</strong></div>
                        <div><span>Rad</span><strong>{work.title}</strong></div>
                        <small>Uklanja se samo ova veza · {documentRoleLabel(link.role)}. Dokument i managed fajl ostaju u biblioteci.</small>
                      </div>
                      `;
  s=s.replace(re,note+'$1');
}
replaceOnce('>Ukloni samo vezu</button>','>Potvrdi uklanjanje veze</button>','confirm unlink copy');
fs.writeFileSync(screenFile,s,'utf8');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const cssFiles=walk(path.join(root,'src','renderer','styles')).filter(f=>f.endsWith('.css'));
const w7a='/* ORBITA W7A DOCUMENTS VISUAL ARCHITECTURE */';
const owners=cssFiles.filter(f=>fs.readFileSync(f,'utf8').includes(w7a));
if(owners.length!==1)throw new Error(`W7C requires one W7A CSS owner, got ${owners.length}`);
const cssFile=owners[0];let css=fs.readFileSync(cssFile,'utf8').replace(/\r\n/g,'\n');
const cssMarker='/* ORBITA W7C DOCUMENTS RECOVERY UX */';
if(!css.includes(cssMarker))css+=`\n\n${cssMarker}\n.documents-workspace-screen .documents-unlink-consequence{display:grid;gap:5px;margin:7px 0 9px;padding:9px 10px;border:1px solid rgba(65,99,139,.13);border-radius:9px;background:rgba(246,249,253,.86)}.documents-workspace-screen .documents-unlink-consequence>div{display:grid;grid-template-columns:64px minmax(0,1fr);gap:8px;align-items:baseline}.documents-workspace-screen .documents-unlink-consequence span{font-size:8px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#718399}.documents-workspace-screen .documents-unlink-consequence strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:#203f5e}.documents-workspace-screen .documents-unlink-consequence small{padding-top:4px;border-top:1px solid rgba(65,99,139,.09);font-size:8.5px;line-height:1.45;color:#667b91}@media(max-width:1390px){.documents-workspace-screen .documents-unlink-consequence>div{grid-template-columns:56px minmax(0,1fr)}}\n`;
fs.writeFileSync(cssFile,css,'utf8');
console.log(JSON.stringify({state:'W7C_RECOVERY_UX_IMPLEMENTED_NOT_ADMITTED',owners:[screenRel,path.relative(root,cssFile).replace(/\\/g,'/')],truthTouched:false,stateOwnersAdded:0,handlersAdded:0,canonicalDocumentNameField:'originalFileName',semantics:['existing operationState reused','existing unlinkReview reused','existing activeDocument/link/work context reused','unlink review names exact document and Rad','relation-only consequence visible before commit','native import/open/unlink callbacks unchanged','no preview/file owner added']},null,2));
