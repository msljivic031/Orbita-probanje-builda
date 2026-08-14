const fs=require('fs'),path=require('path');
const [,,rootArg,widthArg,heightArg]=process.argv;
const root=path.resolve(rootArg||'VISUAL_W7C_1440');
const width=Number(widthArg||1440),height=Number(heightArg||900);
function all(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...all(p));else out.push(p);}return out;}
function pngSize(file){const b=fs.readFileSync(file);if(b.length<24||b.toString('ascii',1,4)!=='PNG')throw new Error('invalid PNG '+file);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};}
function textOnly(x){return x.replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
const files=all(root);
const png=files.find(f=>/documents-unlink-relation-review\.png$/.test(f.replace(/\\/g,'/')));
const html=files.find(f=>/documents-unlink-relation-review\.html$/.test(f.replace(/\\/g,'/')));
if(!png||!html)throw new Error('W7C unlink relation review evidence missing');
const size=pngSize(png);if(size.width!==width||size.height!==height)throw new Error(`W7C viewport ${size.width}x${size.height}`);
const s=fs.readFileSync(html,'utf8');
for(const token of ['data-orbita-w7c-relation-review="true"','aria-label="Posledica uklanjanja veze"','Potvrdi uklanjanje veze','Dokument i managed fajl ostaju u biblioteci.'])if(!s.includes(token))throw new Error('W7C HTML invariant missing '+token);
const dossier=/<div class="document-dossier-head">[\s\S]*?<h3>([\s\S]*?)<\/h3>/.exec(s);
const linked=/<button class="document-work-open"[\s\S]*?<strong>([\s\S]*?)<\/strong>/.exec(s);
const review=/<div class="documents-unlink-consequence"[^>]*data-orbita-w7c-relation-review="true"[^>]*>([\s\S]*?)<\/div>\s*<button\b[^>]*data-orbita-action="documents-confirm-unlink"/.exec(s);
if(!dossier||!linked||!review)throw new Error('W7C semantic review structure unresolved');
const documentTitle=textOnly(dossier[1]),workTitle=textOnly(linked[1]),reviewText=textOnly(review[1]);
if(!documentTitle||!workTitle)throw new Error('W7C canonical names empty');
if(!reviewText.includes(documentTitle))throw new Error(`W7C review missing exact document ${documentTitle}`);
if(!reviewText.includes(workTitle))throw new Error(`W7C review missing exact Rad ${workTitle}`);
if(!/Uklanja se samo ova veza/.test(reviewText))throw new Error('W7C relation-only consequence missing');
console.log(JSON.stringify({state:'PASS',gate:'ORBITA_W7C_DOCUMENTS_RELATION_REVIEW_VISUAL',viewport:size,documentTitle,workTitle,screenshot:path.relative(root,png).replace(/\\/g,'/'),html:path.relative(root,html).replace(/\\/g,'/'),truth:['review uses exact selected Document identity','review uses exact existing linked Rad identity','review states relation-only consequence','managed document preservation visible before commit']},null,2));
