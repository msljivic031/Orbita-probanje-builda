const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');if(!root)throw Error('candidate root required');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1 exact match, got ${n}`);write(file,s.replace(from,to));}
function exactBlocks(s,selector){const out=[];let at=0;while((at=s.indexOf(selector,at))>=0){const open=s.indexOf('{',at);if(open<0)break;const head=s.slice(at,open).trim();if(head!==selector){at+=selector.length;continue}let depth=0,end=-1;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)throw Error(`unterminated ${selector}`);out.push({at,open,end,body:s.slice(open+1,end-1)});at=end;}return out}
function replaceSelectorBlock(file,selector,newBody,label,choose=0){let s=read(file);const blocks=exactBlocks(s,selector);if(blocks.length<=choose)throw Error(`${label}: ${selector} blocks=${blocks.length}`);const b=blocks[choose];write(file,s.slice(0,b.open+1)+'\n'+newBody.trim()+'\n'+s.slice(b.end-1));}
function mutateSelectorProperty(file,selector,property,value,label){let s=read(file),blocks=exactBlocks(s,selector),changed=0;for(const b of [...blocks].reverse()){if(!new RegExp(`(^|[;\\s])${property.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*:`).test(b.body))continue;const next=b.body.replace(new RegExp(`${property.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*:[^;}]*(;|$)`),`${property}: ${value};`);s=s.slice(0,b.open+1)+next+s.slice(b.end-1);changed++;}if(!changed)throw Error(`${label}: no ${property} in ${selector}`);write(file,s);}
function insertOnce(file,anchor,extra,label){let s=read(file);if(s.includes(extra.trim()))return;const i=s.indexOf(anchor);if(i<0)throw Error(`${label}: anchor missing`);write(file,s.slice(0,i)+extra.trim()+'\n\n'+s.slice(i));}

const dossier='src/renderer/screens/radovi/workspace/RadoviDossierPanel.tsx';
replaceExact(dossier,
'          <div className="rad-dossier-metric metric-status"><span>Status</span><strong>{activeStatus?.name ?? "Bez statusa"}</strong><small>{activeStatus?.isFinal ? "zatvoreno" : activeStatus?.isBlocking ? "blokira" : "operativno"}</small></div>',
'          <button className="rad-dossier-metric metric-status rad-dossier-metric-command" onClick={() => onSetCommand("status")} type="button"><span>Status</span><strong>{activeStatus?.name ?? "Bez statusa"}</strong><small>{activeStatus?.isFinal ? "zatvoreno" : activeStatus?.isBlocking ? "blokira" : "promeni status"}</small></button>',
'Dossier status direct command');
replaceExact(dossier,
'          <div className="rad-dossier-metric"><span>Rok</span><strong>{formatWorkScheduleCompact(activeWork.schedule, activeWork.mainDueDate)}</strong><small>{isLate ? "kasni" : "pod kontrolom"}</small></div>',
'          <button className="rad-dossier-metric rad-dossier-metric-command" onClick={() => onSetCommand("due")} type="button"><span>Rok</span><strong>{formatWorkScheduleCompact(activeWork.schedule, activeWork.mainDueDate)}</strong><small>{isLate ? "kasni · pregledaj rok" : "promeni rok"}</small></button>',
'Dossier due direct command');
replaceExact(dossier,
'          <div className={`rad-dossier-metric priority-${activeWork.priority}`}><span>Prioritet</span><strong>{priorityLabel[activeWork.priority]}</strong><small>važnost rada</small></div>',
'          <button className={`rad-dossier-metric rad-dossier-metric-command priority-${activeWork.priority}`} onClick={() => onSetCommand("priority")} type="button"><span>Prioritet</span><strong>{priorityLabel[activeWork.priority]}</strong><small>promeni prioritet</small></button>',
'Dossier priority direct command');
replaceExact(dossier,
'          <div className="rad-dossier-metric"><span>Napredak</span><strong>{typeof progressPercent === "number" ? `${Math.round(progressPercent)}%` : "0%"}</strong><small>{progressSnapshotDate ? `presek ${formatOrbitaDate(progressSnapshotDate)}` : "računa se iz dosijea"}</small></div>',
'          <button className="rad-dossier-metric rad-dossier-metric-command" onClick={() => onSetCommand("progress")} type="button"><span>Napredak</span><strong>{typeof progressPercent === "number" ? `${Math.round(progressPercent)}%` : "0%"}</strong><small>{progressSnapshotDate ? `presek ${formatOrbitaDate(progressSnapshotDate)}` : "ažuriraj napredak"}</small></button>',
'Dossier progress direct command');

const createCore='src/renderer/screens/radovi/create/RadCreateModalCoreFields.tsx';
replaceExact(createCore,'        <strong>Dopuni po potrebi</strong>\n        <span>Svaka stavka otvara svoju sekciju. Nema duplih polja.</span>','        <strong>Završi brzo ili dopuni</strong>\n        <span>Rok i odgovornost su najčešći sledeći koraci. Ostalo možeš dodati sada ili kasnije iz dosijea.</span>','New Rad progressive copy');
replaceExact(createCore,'<button data-orbita-action="new-work-open-date" onClick={onOpenDatePlanner} type="button" className="rad-create-key-field">','<button data-orbita-action="new-work-open-date" onClick={onOpenDatePlanner} type="button" className="rad-create-key-field rad-create-key-field-primary">','New Rad due emphasis');
replaceExact(createCore,'<button data-orbita-action="new-work-open-responsibility" onClick={onOpenResponsibilitySection} type="button" className="rad-create-key-field">','<button data-orbita-action="new-work-open-responsibility" onClick={onOpenResponsibilitySection} type="button" className="rad-create-key-field rad-create-key-field-primary">','New Rad responsibility emphasis');
replaceExact(createCore,'className="rad-create-key-field rad-create-key-field-documents"','className="rad-create-key-field rad-create-key-field-documents rad-create-key-field-support"','New Rad documents support');
replaceExact(createCore,'className="rad-create-folder-pill rad-create-key-field rad-create-key-field-muted"','className="rad-create-folder-pill rad-create-key-field rad-create-key-field-muted rad-create-key-field-context"','New Rad folder context');

const inspector='src/renderer/screens/radovi/workspace/RadoviSelectedWorkInspector.tsx';
replaceExact(inspector,'<button onClick={() => onOpenDossier("responsibility")} type="button">Ljudi</button>','<button onClick={() => onOpenDossier("responsibility")} type="button">Odgovornost</button>','Inspector responsibility semantics');
replaceExact(inspector,'<button onClick={() => onOpenDossier("network")} type="button">Mreža i trag</button>','<button onClick={() => onOpenDossier("network")} type="button">Mreža</button>','Inspector network semantics');

const focusCss='src/renderer/styles/canonical/orbita-premium-focus.css';
replaceSelectorBlock(focusCss,'.rad-dossier-metric-strip','  grid-template-columns: repeat(4, minmax(0, 1fr));','Dossier four operational facts');
replaceSelectorBlock(focusCss,'.rad-dossier-metric-strip .rad-dossier-metric:nth-child(n+4)','  display: none;','temporary anchor rewrite');
// Rebind the existing visibility owner to hide only duplicated Steps/Documents facts; four operational facts remain visible.
let fsx=read(focusCss);fsx=fsx.replace('.rad-dossier-metric-strip .rad-dossier-metric:nth-child(n+4) {\n  display: none;\n}', '.rad-dossier-metric-strip .rad-dossier-metric:nth-child(n+5) {\n  display: none;\n}');write(focusCss,fsx);

const assembly='src/renderer/styles/canonical/orbita-product-assembly.css';
mutateSelectorProperty(assembly,'.radovi-dossier-workspace-mode .rad-dossier-metric-strip','grid-template-columns','repeat(4,minmax(0,1fr))','Dossier assembly four facts');

const natural='src/renderer/styles/canonical/orbita-dossier-modal-natural-premium.css';
replaceSelectorBlock(natural,'.rad-dossier-natural-tabs','  grid-template-columns:repeat(6,minmax(0,1fr));\n  gap:3px;\n  padding:6px 8px;\n  background:#fff;','Dossier compact navigation tabs');
replaceSelectorBlock(natural,'.rad-dossier-natural-tabs button','  --tab-accent:var(--orbita-dossier-overview);\n  display:grid;\n  grid-template-columns:26px minmax(0,1fr) auto;\n  align-items:center;\n  gap:7px;\n  min-height:46px;\n  border:1px solid transparent;\n  border-radius:9px;\n  padding:6px 8px;\n  background:transparent;\n  text-align:left;','Dossier nav button restraint');
replaceSelectorBlock(natural,'.rad-dossier-natural-tabs button.rad-dossier-tab-active','  border-color:color-mix(in srgb,var(--tab-accent) 28%,#dce5ef);\n  background:color-mix(in srgb,var(--tab-accent) 7%,white);\n  box-shadow:inset 0 -2px 0 var(--tab-accent);','Dossier active nav restraint');
replaceSelectorBlock(natural,'.rad-create-composition-tabs','  display:grid!important;\n  grid-template-columns:repeat(6,minmax(0,1fr))!important;\n  gap:4px!important;\n  padding:7px 12px!important;\n  overflow:visible!important;\n  background:#fff!important;\n  border-bottom:1px solid #d9e4ef!important;','New Rad workflow nav restraint');
replaceSelectorBlock(natural,'.rad-create-composition-tabs button','  position:relative;\n  min-width:0!important;\n  min-height:48px!important;\n  display:grid!important;\n  grid-template-columns:28px minmax(0,1fr)!important;\n  gap:7px!important;\n  align-items:center!important;\n  border:1px solid transparent!important;\n  border-radius:9px!important;\n  background:transparent!important;','New Rad workflow tab restraint');
replaceSelectorBlock(natural,'.rad-create-composition-tabs button.active','  border-color:color-mix(in srgb,var(--step-accent) 28%,#dce5ef)!important;\n  background:color-mix(in srgb,var(--step-accent) 7%,white)!important;\n  box-shadow:inset 0 -2px 0 var(--step-accent)!important;','New Rad active workflow tab');
insertOnce(natural,'@media(max-width:1180px)',`.rad-dossier-metric-command{font:inherit;cursor:pointer;text-align:left;transition:border-color .14s ease,background .14s ease,transform .14s ease}\n.rad-dossier-metric-command:hover{border-color:rgba(42,103,181,.22);background:#f7faff}\n.rad-dossier-metric-command:focus-visible{outline:2px solid rgba(43,114,207,.7);outline-offset:-2px}\n.rad-create-key-field-primary{border-color:rgba(43,114,207,.18)!important;background:linear-gradient(145deg,#f3f8ff,#fff)!important}\n.rad-create-key-field-primary em{color:#1c61b3!important}\n.rad-create-key-field-support{background:#fbfcfe!important}\n.rad-create-key-field-context{border-style:dashed!important;background:#f8fafc!important;box-shadow:none!important}`,'Wave 3 domain-specific styles');

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE3_RAD_DOSSIER',files:[dossier,createCore,inspector,focusCss,assembly,natural],intent:'natural direct commands + progressive creation + restrained navigation'},null,2));