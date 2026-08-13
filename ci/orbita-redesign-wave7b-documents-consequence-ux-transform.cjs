const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const screen='src/renderer/screens/dokumenti/DokumentiScreen.tsx';
const file=path.join(root,screen);
if(!fs.existsSync(file))throw new Error('DokumentiScreen owner missing');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function once(from,to,label){if(s.includes(to))return;if(!s.includes(from))throw new Error(label+' anchor missing');const n=s.split(from).length-1;if(n!==1)throw new Error(label+' owner count '+n);s=s.replace(from,to);}
function regexOnce(re,to,label,admittedToken){if(admittedToken&&s.includes(admittedToken))return;const matches=[...s.matchAll(re)];if(matches.length!==1)throw new Error(label+' owner count '+matches.length);s=s.replace(re,to);}
once('<strong>Fajl → managed kopija → SHA-256 → biblioteka → Rad</strong>','<strong>Uvoz sa jasnim kontekstom</strong>','import hierarchy');
regexOnce(/(<label[^>]*>\s*<span>)Rad(<\/span>\s*<select[^>]*aria-label="Rad za dokument")/g,'$1Poveži sa Radom$2','Rad consequence label','Poveži sa Radom');
regexOnce(/(<label[^>]*>\s*<span>)Uloga dokumenta(<\/span>\s*<select[^>]*aria-label="Uloga dokumenta")/g,'$1Uloga veze$2','role consequence label','Uloga veze');
const actionAnchor='<div className="documents-import-actions">';
if(!s.includes('className="documents-import-consequence"')){
 const n=s.split(actionAnchor).length-1;if(n!==1)throw new Error('import actions anchor count '+n);
 const consequence='<div className="documents-import-consequence" role="note" aria-label="Posledica uvoza"><span>Pre potvrde</span><strong>Dokument će biti povezan sa izabranim Radom.</strong><small>Proverite Rad i ulogu veze. Managed kopija i SHA-256 nastaju tek nakon uspešnog native uvoza.</small></div>';
 s=s.replace(actionAnchor,consequence+actionAnchor);
}
regexOnce(/>\s*Izaberi fajl i uvezi\s*<\/button>/g,'>Izaberi fajl i potvrdi uvoz</button>','native import button copy','Izaberi fajl i potvrdi uvoz');
fs.writeFileSync(file,s,'utf8');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const cssFiles=walk(path.join(root,'src','renderer','styles')).filter(f=>f.endsWith('.css'));
const visualMarker='/* ORBITA W7A DOCUMENTS VISUAL ARCHITECTURE */';
const cssOwners=cssFiles.filter(f=>fs.readFileSync(f,'utf8').includes(visualMarker));
if(cssOwners.length!==1)throw new Error('W7B requires one admitted W7A CSS owner, got '+cssOwners.length);
const cssOwner=cssOwners[0];let css=fs.readFileSync(cssOwner,'utf8').replace(/\r\n/g,'\n');
const marker='/* ORBITA W7B DOCUMENTS CONSEQUENCE UX */';
if(!css.includes(marker))css+=`\n\n${marker}\n.documents-workspace-screen .documents-import-consequence{display:grid;gap:2px;align-self:stretch;min-width:190px;padding:7px 10px;border-left:2px solid rgba(52,123,214,.44);background:rgba(244,248,253,.72);color:#586d85}.documents-workspace-screen .documents-import-consequence span{font-size:8px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#70839a}.documents-workspace-screen .documents-import-consequence strong{font-size:9.5px;line-height:1.35;color:#244766}.documents-workspace-screen .documents-import-consequence small{font-size:8px;line-height:1.4;color:#7b8c9e}.documents-workspace-screen .documents-import-workflow{grid-template-columns:minmax(185px,.62fr) minmax(0,1.95fr) minmax(200px,.78fr) auto}.documents-workspace-screen .documents-import-actions{align-self:center}@media(max-width:1390px){.documents-workspace-screen .documents-import-workflow{grid-template-columns:1fr}.documents-workspace-screen .documents-import-consequence{min-width:0}.documents-workspace-screen .documents-import-actions{align-self:auto}}\n`;
fs.writeFileSync(cssOwner,css,'utf8');
console.log(JSON.stringify({state:'W7B_CONSEQUENCE_UX_APPLIED_NOT_ADMITTED',owners:[screen,path.relative(root,cssOwner).replace(/\\/g,'/')],truthTouched:false,semantics:['current Rad-required presentation kept visible','relationship role kept visible','native import command unchanged','managed-copy/SHA outcome described only after successful native import']},null,2));
