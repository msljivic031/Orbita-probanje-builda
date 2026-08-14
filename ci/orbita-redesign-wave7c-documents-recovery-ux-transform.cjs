const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const screenRel='src/renderer/screens/dokumenti/DokumentiScreen.tsx';
const screenFile=path.join(root,screenRel);
if(!fs.existsSync(screenFile))throw new Error('DokumentiScreen owner missing');
let s=fs.readFileSync(screenFile,'utf8').replace(/\r\n/g,'\n');
function replaceOnce(from,to,label){if(s.includes(to))return;const n=s.split(from).length-1;if(n!==1)throw new Error(`${label} owner count ${n}`);s=s.replace(from,to);}
replaceOnce('Otvaram izbor fajla. Uvoz ostaje atomski: kopija, SHA-256, biblioteka i veza sa Radom.','Otvaram izbor fajla. Uvoz se završava tek kada bezbedna provera i čuvanje uspeju.','import working feedback');
replaceOnce('Uvoz nije završen. Izbor je otkazan ili je native storage guard odbio fajl; nijedan lokalni fallback upis nije napravljen.','Uvoz nije završen. Izbor je otkazan ili fajl nije prošao bezbednu proveru. Nijedan dokument nije dodat.','import cancel/error feedback');
replaceOnce('Otvaranje je blokirano: missing, checksum mismatch ili quarantine. Storage guard nije prosledio fajl van bezbedne managed putanje.','Dokument nije moguće otvoriti: managed fajl nedostaje ili nije prošao proveru integriteta. Dokument nije izmenjen.','managed open error feedback');
replaceOnce('Uklanjam samo vezu sa Radom. Dokument i managed fajl ostaju u biblioteci.','Uklanjam samo izabranu vezu sa Radom. Dokument i managed fajl ostaju u biblioteci.','unlink working feedback');
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
if(!s.includes('data-orbita-w7c-unlink-reason="true"')){
  const confirmIndex=s.indexOf('data-orbita-action="documents-confirm-unlink"');
  if(confirmIndex<0)throw new Error('confirm unlink action missing while binding reason control');
  const searchStart=Math.max(0,confirmIndex-3200);
  const region=s.slice(searchStart,confirmIndex);
  const inputMatches=[...region.matchAll(/<input\b[^>]*>/g)];
  if(inputMatches.length!==1)throw new Error(`unlink review reason input expected 1 before confirm action, got ${inputMatches.length}`);
  const input=inputMatches[0][0];
  const bound=`<input aria-label="Razlog uklanjanja veze" data-orbita-w7c-unlink-reason="true"${input.slice('<input'.length)}`;
  s=s.slice(0,searchStart+inputMatches[0].index)+bound+s.slice(searchStart+inputMatches[0].index+input.length);
}
if(!s.includes('data-orbita-w7c-confirm-unlink="true"')){
  const re=/<button\b([^>]*data-orbita-action=["']documents-confirm-unlink["'][^>]*)>/g;
  const matches=[...s.matchAll(re)];
  if(matches.length!==1)throw new Error(`confirm unlink evidence owner count ${matches.length}`);
  s=s.replace(re,'<button data-orbita-w7c-confirm-unlink="true"$1>');
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
if(!css.includes(cssMarker))css+=`\n\n${cssMarker}\n.documents-workspace-screen .document-dossier-panel{min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}.documents-workspace-screen .documents-unlink-consequence{display:grid;gap:4px;margin:0;padding:8px 9px;border:1px solid rgba(65,99,139,.13);border-radius:8px;background:rgba(246,249,253,.86)}.documents-workspace-screen .documents-unlink-consequence>div{display:grid;grid-template-columns:62px minmax(0,1fr);gap:7px;align-items:baseline}.documents-workspace-screen .documents-unlink-consequence span{font-size:8px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#718399}.documents-workspace-screen .documents-unlink-consequence strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:#203f5e}.documents-workspace-screen .documents-unlink-consequence small{padding-top:4px;border-top:1px solid rgba(65,99,139,.09);font-size:8.5px;line-height:1.38;color:#667b91}.documents-workspace-screen .document-unlink-review{display:grid;gap:7px}.documents-workspace-screen .document-unlink-review>label{display:grid;gap:4px}.documents-workspace-screen .document-unlink-review>label>span{font-size:8px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#718399}.documents-workspace-screen .document-unlink-review>label>input{min-height:34px;border-radius:8px}.documents-workspace-screen .document-unlink-review>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 8px;align-items:center}.documents-workspace-screen .document-unlink-review>div>.documents-unlink-consequence{grid-column:1/-1;grid-row:1}.documents-workspace-screen .document-unlink-review>div>button:first-child{grid-column:1;grid-row:2;justify-self:start;min-height:32px;padding:0 10px;border:1px solid rgba(65,99,139,.16);border-radius:8px;background:#fff;color:#536b84;font-weight:800}.documents-workspace-screen .document-unlink-review>div>[data-orbita-w7c-confirm-unlink="true"]{grid-column:2;grid-row:2;min-height:32px;padding:0 10px;border-radius:8px;font-weight:850;box-shadow:none}.documents-workspace-screen .document-unlink-review>small{font-size:8px;line-height:1.35;color:#8190a1}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review){padding-top:10px;padding-bottom:10px}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-dossier-head{padding-bottom:8px}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-expiry-state-card{margin-top:8px;padding-bottom:8px}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-primary-action-panel{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px;margin-top:8px;padding-bottom:8px}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-primary-action-panel small{display:none}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-open-managed-button{width:auto;min-height:32px;padding:0 10px}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-details-disclosure{display:none}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-linked-work{margin-top:8px}@media(max-width:1390px){.documents-workspace-screen .documents-unlink-consequence>div{grid-template-columns:54px minmax(0,1fr)}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-primary-action-panel{grid-template-columns:1fr}.documents-workspace-screen .document-dossier-panel:has(.document-unlink-review) .document-open-managed-button{justify-self:stretch;width:100%}}\n`;
fs.writeFileSync(cssFile,css,'utf8');
console.log(JSON.stringify({state:'W7C_RECOVERY_UX_IMPLEMENTED_NOT_ADMITTED',owners:[screenRel,path.relative(root,cssFile).replace(/\\/g,'/')],truthTouched:false,stateOwnersAdded:0,handlersAdded:0,canonicalDocumentNameField:'originalFileName',a11y:['unlink reason input has explicit aria-label','unlink reason input has stable evidence marker','dossier remains vertically scrollable when recovery review expands'],proofMarkers:['relation review','unlink reason','confirm state marker separate from action id'],semantics:['existing operationState reused','existing unlinkReview reused','existing activeDocument/link/work context reused','unlink review names exact document and Rad','relation-only consequence visible before commit','recovery actions are grouped after consequence instead of falling below viewport','native import/open/unlink callbacks unchanged','no preview/file owner added']},null,2));
