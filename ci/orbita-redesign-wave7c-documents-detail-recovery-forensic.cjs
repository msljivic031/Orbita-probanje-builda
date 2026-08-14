const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-documents-detail-recovery-forensic.json');
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const exists=(r)=>fs.existsSync(path.join(root,r));
const screen='src/renderer/screens/dokumenti/DokumentiScreen.tsx';
const dossier='src/renderer/screens/radovi/workspace/RadDossierDocumentLinkPanel.tsx';
const ipc='src/main/ipc/ipcRegistry.ts';
const preload='src/preload/orbitaApi.ts';
const native='src/main/persistence/documents/sqliteNativeDocumentCommands.ts';
const repository='src/main/persistence/repository/documentRepository.ts';
for(const r of [screen,dossier,ipc,preload,native,repository])if(!exists(r))throw new Error('required Documents owner missing '+r);
const s=read(screen),d=read(dossier),i=read(ipc),p=read(preload),n=read(native),repo=read(repository);
const tokens=(text,re)=>[...new Set([...text.matchAll(re)].map(m=>m[1]))].sort();
const actions=tokens(s,/data-orbita-action=["']([^"']+)["']/g).filter(x=>/document/i.test(x));
const aria=tokens(s,/aria-label=["']([^"']+)["']/g).filter(x=>/dokument|fajl|rad|veza|proven|valid/i.test(x));
const headings=tokens(s,/<(?:h1|h2|h3|strong)[^>]*>([^<]{2,90})<\//g).filter(x=>/dokument|rad|veza|fajl|valid|managed|sha|porek|izvor/i.test(x));
const stateHooks=tokens(s,/const \[([A-Za-z_$][\w$]*),\s*set[A-Za-z_$][\w$]*\]\s*=\s*useState/g);
const result={
 state:'PASS',audit:'ORBITA_WAVE7C_DOCUMENTS_DETAIL_RECOVERY_FORENSIC',
 owners:{screen,dossier,ipc,preload,native,repository},
 renderer:{actions,aria,headings,stateHooks,
  hasManagedOpen:/documents-open-managed/.test(s),
  hasReviewUnlink:/documents-review-unlink/.test(s),
  hasConfirmUnlink:/documents-confirm-unlink/.test(s),
  hasSelectedDocument:/activeDocumentId|selectedDocument/.test(s),
  hasSha:/sha-?256|sha256/i.test(s),
  hasManagedState:/managed/i.test(s),
  hasValidity:/validUntil|važenj|valid/i.test(s),
  hasProvenance:/provenance|poreklo|izvor/i.test(s),
  hasPreview:/preview|pregled/i.test(s),
  hasLinkContext:/linked|link|povezan|Radovi/.test(s)},
 radDossier:{hasDocumentLink:/document/i.test(d)&&/link|unlink|povez/i.test(d),hasOpen:/open|otvori/i.test(d)},
 backend:{ipcOpen:/open.*managed|managed.*open/i.test(i),preloadOpen:/open.*managed|managed.*open/i.test(p),nativeImport:/importNativeDocument/i.test(n),repositoryLink:/link|unlink/i.test(repo)},
 laws:['forensic only; no product mutation','reuse existing Dokuments screen and Rad dossier owners','open managed remains native IPC/security path','unlink is relation recovery, never document delete','technical provenance remains subordinate to human identity/actions','no fake preview or renderer file ownership']
};
if(!result.renderer.hasManagedOpen)throw new Error('managed open action unresolved');
if(!result.renderer.hasReviewUnlink||!result.renderer.hasConfirmUnlink)throw new Error('unlink review/confirm owner unresolved');
if(!result.radDossier.hasDocumentLink)throw new Error('Rad dossier document continuity unresolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
