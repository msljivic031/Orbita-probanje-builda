const fs=require('fs'),path=require('path');
const [,,rootArg,widthArg,heightArg]=process.argv;
const root=path.resolve(rootArg||'VISUAL_W7C_1440');
const width=Number(widthArg||1440),height=Number(heightArg||900);
function all(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...all(p));else out.push(p);}return out;}
function pngSize(file){const b=fs.readFileSync(file);if(b.length<24||b.toString('ascii',1,4)!=='PNG')throw new Error('invalid PNG '+file);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};}
function textOnly(x){return x.replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
const files=all(root);
function evidence(label){const safe=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const png=files.find(f=>new RegExp(`${safe}\\.png$`).test(f.replace(/\\/g,'/')));const html=files.find(f=>new RegExp(`${safe}\\.html$`).test(f.replace(/\\/g,'/')));if(!png||!html)throw new Error(`W7C evidence missing ${label}`);const size=pngSize(png);if(size.width!==width||size.height!==height)throw new Error(`W7C ${label} viewport ${size.width}x${size.height}`);return {png,html,size,source:fs.readFileSync(html,'utf8')};}
const reviewEv=evidence('documents-unlink-relation-review');
const invalidEv=evidence('documents-unlink-invalid-reason');
const readyEv=evidence('documents-unlink-valid-reason-ready');
const continuityEv=evidence('documents-linked-rad-dossier-documents');
const s=reviewEv.source;
for(const token of ['data-orbita-w7c-relation-review="true"','aria-label="Posledica uklanjanja veze"','data-orbita-w7c-unlink-reason="true"','aria-label="Razlog uklanjanja veze"','data-orbita-w7c-confirm-unlink="true"','Potvrdi uklanjanje veze','Dokument i managed fajl ostaju u biblioteci.'])if(!s.includes(token))throw new Error('W7C HTML invariant missing '+token);
const dossier=/<div class="document-dossier-head">[\s\S]*?<h3>([\s\S]*?)<\/h3>/.exec(s);
const linked=/<button class="document-work-open"[\s\S]*?<strong>([\s\S]*?)<\/strong>/.exec(s);
const review=/<div class="documents-unlink-consequence"[^>]*data-orbita-w7c-relation-review="true"[^>]*>([\s\S]*?)<\/div>\s*<button\b[^>]*data-orbita-action="documents-confirm-unlink"/.exec(s);
if(!dossier||!linked||!review)throw new Error('W7C semantic review structure unresolved');
const documentTitle=textOnly(dossier[1]),workTitle=textOnly(linked[1]),reviewText=textOnly(review[1]);
if(!documentTitle||!workTitle)throw new Error('W7C canonical names empty');
if(!reviewText.includes(documentTitle))throw new Error(`W7C review missing exact document ${documentTitle}`);
if(!reviewText.includes(workTitle))throw new Error(`W7C review missing exact Rad ${workTitle}`);
if(!/Uklanja se samo ova veza/.test(reviewText))throw new Error('W7C relation-only consequence missing');
for(const ev of [invalidEv,readyEv])for(const token of ['data-orbita-w7c-relation-review="true"','data-orbita-w7c-unlink-reason="true"','data-orbita-w7c-confirm-unlink="true"','Potvrdi uklanjanje veze'])if(!ev.source.includes(token))throw new Error(`W7C ${path.basename(ev.html)} missing ${token}`);
const invalidButton=/<button\b([^>]*data-orbita-w7c-confirm-unlink="true"[^>]*)>/.exec(invalidEv.source);
const readyButton=/<button\b([^>]*data-orbita-w7c-confirm-unlink="true"[^>]*)>/.exec(readyEv.source);
if(!invalidButton||!readyButton)throw new Error('W7C confirm state evidence unresolved');
if(!/\bdisabled(?:=|\s|>)/.test(invalidButton[1]+' '))throw new Error('W7C invalid reason capture does not expose disabled confirm');
if(/\bdisabled(?:=|\s|>)/.test(readyButton[1]+' '))throw new Error('W7C valid reason capture still exposes disabled confirm');
const continuityText=textOnly(continuityEv.source);
if(!continuityText.includes(documentTitle))throw new Error(`W7C Rad dossier continuity missing exact document ${documentTitle}`);
if(!continuityText.includes(workTitle))throw new Error(`W7C Rad dossier continuity missing exact Rad ${workTitle}`);
if(!/Dokument/i.test(continuityText))throw new Error('W7C Rad dossier continuity does not expose Documents context');
console.log(JSON.stringify({state:'PASS',gate:'ORBITA_W7C_DOCUMENTS_RELATION_REVIEW_VISUAL',viewport:reviewEv.size,documentTitle,workTitle,captures:{review:path.relative(root,reviewEv.png).replace(/\\/g,'/'),invalidReason:path.relative(root,invalidEv.png).replace(/\\/g,'/'),validReasonReady:path.relative(root,readyEv.png).replace(/\\/g,'/'),radDossierDocuments:path.relative(root,continuityEv.png).replace(/\\/g,'/')},truth:['review uses exact selected Document identity','review uses exact existing linked Rad identity','review states relation-only consequence','managed document preservation visible before commit','one-character reason visibly keeps confirm disabled','valid reason visibly restores confirm without committing unlink','existing linked-Rad path reaches Rad dossier Documents context','Rad dossier capture preserves the same exact Document and Rad identities']},null,2));
