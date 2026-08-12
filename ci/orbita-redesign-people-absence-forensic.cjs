const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'people-absence-forensic.json');
const exts=/\.(tsx?|jsx?|css|json|sql)$/i;const files=[];
function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!['node_modules','dist','build','.git'].includes(e.name))walk(p);}else if(exts.test(e.name))files.push(p)}}walk(path.join(root,'src'));
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const concepts={
 person:['person','osoba','ljudi','people','dossier','dosije'],
 organization:['organization','organiz','department','odel','odsek','sektor','unit','team','tim','membership'],
 availability:['availability','dostup','absence','odsust','bolov','odmor','leave','unavailable','field work','teren'],
 conflict:['conflict','konflikt','overlap','preklap','assignment_conflict'],
 delegation:['delegat','delegir','delegate','delegation'],
 substitution:['substitut','zamena','zamjen','replacement','replaces'],
 affectedWork:['affected work','affected-work','pogođen','pogodjen','reassign','prerasp','reroute','routing plan','bulk'],
 history:['history','istor','timeline','event','semantic'],
 workforce:['workforce','attendance','prisust','meseč','mesec','legend','legenda','sheet'],
 responsibility:['responsib','odgovorn','assign','dodel','assignee','collaborator','watcher','completer']
};
function hits(s){const n=s.toLowerCase(),o={};for(const [k,terms] of Object.entries(concepts)){const h=terms.filter(t=>n.includes(t));if(h.length)o[k]=h;}return o}
const result={audit:'ORBITA_PEOPLE_ABSENCE_RESPONSIBILITY_FORENSIC_V1',files:[],conceptOwners:{},actions:[],surfaces:[],dbSignals:[]};for(const k of Object.keys(concepts))result.conceptOwners[k]=[];
for(const f of files){let s;try{s=fs.readFileSync(f,'utf8')}catch{continue}const r=rel(f),h=hits(r+'\n'+s);if(!Object.keys(h).length)continue;const acts=[...s.matchAll(/data-orbita-action\s*=\s*["'`]([^"'`]+)["'`]/g)].map(m=>m[1]);const comps=[...s.matchAll(/<([A-Z][A-Za-z0-9]+)\b/g)].map(m=>m[1]).filter(x=>/Modal|Dialog|Dossier|Panel|Inspector|Picker|Table|Sheet|Timeline|Availability|People|Person|Organization|Team/.test(x));const item={file:r,concepts:h,actions:[...new Set(acts)].slice(0,100),components:[...new Set(comps)].slice(0,80)};result.files.push(item);for(const k of Object.keys(h))if(result.conceptOwners[k].length<120)result.conceptOwners[k].push(r);for(const a of item.actions)result.actions.push({id:a,file:r});
 if(/\.(tsx?|jsx?)$/i.test(r)){for(const [k,terms] of Object.entries(concepts)){for(const t of terms){let at=s.toLowerCase().indexOf(t);if(at<0)continue;const line=s.slice(0,at).split(/\r?\n/).length;const snippet=s.slice(Math.max(0,at-750),Math.min(s.length,at+1250)).replace(/\r?\n/g,' ').replace(/\s+/g,' ').slice(0,1900);result.surfaces.push({concept:k,file:r,line,needle:t,snippet});break}}}
 if(/\.(ts|tsx|js|jsx|sql)$/i.test(r)){for(const m of s.matchAll(/(?:from|into|update|table|CREATE TABLE IF NOT EXISTS)\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)/gi)){const name=m[1];if(/person|people|avail|absence|assign|respons|team|org|workforce|attendance|legend|event/i.test(name))result.dbSignals.push({file:r,name});}}
}
result.files.sort((a,b)=>Object.keys(b.concepts).length-Object.keys(a.concepts).length||a.file.localeCompare(b.file));result.actions=[...new Map(result.actions.map(x=>[x.id+'|'+x.file,x])).values()];result.surfaces=result.surfaces.slice(0,320);result.dbSignals=[...new Map(result.dbSignals.map(x=>[x.name+'|'+x.file,x])).values()].slice(0,220);
result.capabilitySignals={};for(const k of Object.keys(concepts))result.capabilitySignals[k]={ownerFiles:result.conceptOwners[k].length,surfaceSnippets:result.surfaces.filter(x=>x.concept===k).length,actionIds:result.actions.filter(x=>concepts[k].some(t=>(x.id+' '+x.file).toLowerCase().includes(t))).length,classification:result.conceptOwners[k].length?'CODE_OR_SURFACE_SIGNAL_PRESENT_REQUIRES_RUNTIME_SEMANTIC_PROOF':'NO_CURRENT_SOURCE_SIGNAL_FOUND'};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({files:result.files.length,actions:result.actions.length,dbSignals:result.dbSignals.length,capabilities:result.capabilitySignals,top:result.files.slice(0,20).map(x=>({file:x.file,concepts:Object.keys(x.concepts),actions:x.actions.length}))},null,2));