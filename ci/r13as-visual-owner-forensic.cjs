const fs=require('fs'),path=require('path');
const root=process.argv[2]; if(!root) throw Error('candidate root required');
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else o.push(p)}return o}
function rel(p){return path.relative(root,p).replaceAll('\\','/')}
const all=walk(path.join(root,'src'));
const targets=[
  {id:'oi', needles:['OI signali','Red odluka','Granica OI u ovoj verziji']},
  {id:'settings', needles:['Izgled aplikacije','Gustina prikaza','Pravilo je prikazano kao kontrola sistema']},
  {id:'radovi', needles:['Izabrani Rad','AKTIVNI PROSTOR','OPERATIVNI PREGLED']}
];
function classNames(text){const out=new Set(); for(const m of text.matchAll(/className\s*=\s*(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\})/g)){const s=m[1]||m[2]||m[3]||''; for(const c of s.split(/\s+/)) if(/^[A-Za-z][A-Za-z0-9_-]+$/.test(c)) out.add(c)} return [...out].sort()}
const report={schemaVersion:1,audit:'R13AS_VISUAL_OWNER_SANITIZED_FORENSIC',targets:[]};
for(const t of targets){
 const hits=[];
 for(const f of all.filter(x=>/\.(tsx?|jsx?)$/.test(x))){const text=fs.readFileSync(f,'utf8');const found=t.needles.filter(n=>text.includes(n));if(found.length)hits.push({path:rel(f),needles:found,classes:classNames(text)});}
 const classes=[...new Set(hits.flatMap(h=>h.classes))];
 const css=[];
 for(const f of all.filter(x=>x.endsWith('.css'))){const text=fs.readFileSync(f,'utf8');for(const c of classes){if(!text.includes('.'+c))continue;const blocks=[];const br=new RegExp(`([^{}]*\\.${c.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}[^{}]*)\\{([^{}]*)\\}`,'g');for(const m of text.matchAll(br)){const body=m[2].replace(/\/\*[\s\S]*?\*\//g,'').trim();blocks.push({selector:m[1].trim().replace(/\s+/g,' ').slice(0,260),declarations:body.split(';').map(x=>x.trim()).filter(Boolean).slice(0,30)});}if(blocks.length)css.push({path:rel(f),className:c,blocks:blocks.slice(0,8)});}
 }
 report.targets.push({id:t.id,componentHits:hits,cssOwners:css});
}
report.state='PASS'; console.log(JSON.stringify(report,null,2));
