const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw Error('candidate root required');
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else o.push(p)}return o}
function rel(p){return path.relative(root,p).replaceAll('\\','/')}
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
const all=walk(path.join(root,'src'));
const code=all.filter(x=>/\.(tsx?|jsx?)$/.test(x)),css=all.filter(x=>x.endsWith('.css'));
const targets=[
 {id:'oi-kpi',needle:'OI signali',radius:70,prefer:['oi-kpi-grid','oi-kpi-card']},
 {id:'oi-decisions',needle:'Red odluka',radius:90,prefer:['oi-decision-list','oi-decision-button','oi-decision-row']},
 {id:'settings-appearance',needle:'Izgled aplikacije',radius:100,prefer:['appearance','modal','dialog','settings']},
 {id:'radovi-table',needle:'Izabrani Rad',radius:130,prefer:['work','radovi','table','row','grid','inspector']}
];
function classTokens(line){const out=[];for(const m of line.matchAll(/className\s*=\s*(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\}|\{([^}]+)\})/g)){const s=m[1]||m[2]||m[3]||m[4]||'';for(const t of s.match(/[A-Za-z][A-Za-z0-9_-]+/g)||[])if(!['className','true','false','selected','active'].includes(t))out.push(t)}return out}
function lineShape(line){return{tags:[...new Set([...line.matchAll(/<\/?([A-Za-z][A-Za-z0-9.]*)/g)].map(m=>m[1]))],classes:[...new Set(classTokens(line))],dataAttrs:[...new Set([...line.matchAll(/data-orbita-([a-z0-9-]+)\s*=\s*["']([^"']+)["']/gi)].map(m=>`data-orbita-${m[1]}=${m[2]}`))],strings:[...new Set([...line.matchAll(/["'`]([^"'`\n]{1,110})["'`]/g)].map(m=>m[1]).filter(s=>/[A-Za-zČĆŽŠĐčćžšđ]/.test(s)).map(s=>s.slice(0,110)))].slice(0,10),textNodes:[...new Set([...line.matchAll(/>([^<>{}\n]{1,110})</g)].map(m=>m[1].replace(/\s+/g,' ').trim()).filter(Boolean))].slice(0,8)} }
function cssBlocksFor(classes){const out=[];for(const f of css){const text=fs.readFileSync(f,'utf8');for(const c of classes){if(!text.includes('.'+c))continue;const re=new RegExp(`([^{}]*\\.${esc(c)}[^{}]*)\\{([^{}]*)\\}`,'g');for(const m of text.matchAll(re)){const selector=m[1].replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();const decl=m[2].replace(/\/\*[\s\S]*?\*\//g,'').split(';').map(x=>x.trim()).filter(Boolean);if(decl.length)out.push({path:rel(f),className:c,selector:selector.slice(0,300),declarations:decl.slice(0,40)});}}}return out}
const report={schemaVersion:2,audit:'R13AS_TARGETED_VISUAL_OWNER_FORENSIC',targets:[]};
for(const t of targets){const hits=[];for(const f of code){const text=fs.readFileSync(f,'utf8');if(!text.includes(t.needle))continue;const lines=text.split(/\r?\n/);for(let c=0;c<lines.length;c++){if(!lines[c].includes(t.needle))continue;const from=Math.max(0,c-t.radius),to=Math.min(lines.length-1,c+t.radius),shapes=[],classes=new Set();for(let i=from;i<=to;i++){const sh=lineShape(lines[i]);for(const x of sh.classes)classes.add(x);if(sh.tags.length||sh.classes.length||sh.dataAttrs.length||sh.textNodes.length||lines[i].includes(t.needle))shapes.push({line:i+1,relative:i-c,...sh});}const preferred=[...classes].filter(x=>t.prefer.some(p=>x.toLowerCase().includes(p))).sort();const chosen=[...new Set([...preferred,...classes])].slice(0,60);hits.push({path:rel(f),needleLine:c+1,nearbyClasses:chosen,structure:shapes.slice(0,180),cssBlocks:cssBlocksFor(chosen).slice(0,220)});}}
 report.targets.push({id:t.id,hits});}
report.state='PASS';console.log(JSON.stringify(report,null,2));
