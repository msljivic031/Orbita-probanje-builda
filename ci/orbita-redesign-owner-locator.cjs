const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'redesign-evidence/first-wave-owners.json');
const files=[]; const skip=new Set(['node_modules','dist','build','out','.git']);
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(tsx?|css)$/.test(e.name))files.push(p)}} walk(root);
const rel=p=>path.relative(root,p).replaceAll('\\','/');
function sourceHits(needle){const hits=[];for(const p of files.filter(x=>/\.tsx?$/.test(x))){const s=fs.readFileSync(p,'utf8');let i=0;while((i=s.indexOf(needle,i))>=0){const before=s.slice(Math.max(0,i-1400),Math.min(s.length,i+1800));const classes=[...before.matchAll(/className\s*=\s*(?:["'`]([^"'`]+)["'`]|\{[^}]{0,700}\})/g)].map(m=>m[1]).filter(Boolean);hits.push({file:rel(p),line:s.slice(0,i).split(/\r?\n/).length,classes:[...new Set(classes.flatMap(x=>x.split(/\s+/)).filter(Boolean))].slice(-30)});i+=needle.length} }return hits}
function cssHits(needles){const hits=[];for(const p of files.filter(x=>x.endsWith('.css'))){const s=fs.readFileSync(p,'utf8');for(const needle of needles){let i=0;while((i=s.indexOf(needle,i))>=0){let a=s.lastIndexOf('}',i)+1,b=s.indexOf('}',i);if(b<0)break;const block=s.slice(a,b+1).trim();if(block.length<5000)hits.push({needle,file:rel(p),line:s.slice(0,a).split(/\r?\n/).length,block});i+=needle.length}}}return hits}
const report={
  audit:'ORBITA_REDESIGN_FIRST_WAVE_OWNER_LOCATOR',
  source:{
    radoviNaziv:sourceHits('NAZIV'),radoviNazivLower:sourceHits('Naziv'),radoviStatus:sourceHits('STATUS'),radoviOpenDossier:sourceHits('Otvori dos'),
    settingsAppearance:sourceHits('Izgled aplikacije'),oiQueue:sourceHits('Red odluka')
  },
  css:{
    oi:cssHits(['.oi-kpi-card','.oi-row','.oi-focus-queue','.oi-signal-card']),
    settings:cssHits(['.settings-rules-modal-head','.settings-rules-modal','.people-registry-modal-head strong','.people-registry-modal-head .eyebrow']),
    radovi:cssHits(['radovi-workspace','radovi-table','radovi-list','radovi-row','radovi-work','work-list','rad-list','radovi-main','radovi-register','radovi-registry'])
  }
};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({source:Object.fromEntries(Object.entries(report.source).map(([k,v])=>[k,v.length])),css:Object.fromEntries(Object.entries(report.css).map(([k,v])=>[k,v.length]))}));