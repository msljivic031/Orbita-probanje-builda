const fs=require('fs');const path=require('path');
const root=path.resolve(process.argv[2]||'candidate');const rel='src/renderer/screens/ljudi/LjudiScreen.tsx';const text=fs.readFileSync(path.join(root,rel),'utf8');const lines=text.split(/\r?\n/);
const interesting=/availab|dostup|odsust|absence|status|zamena|substitut|person-availability|people-detail-tabs/i;
const classNames=new Map(),actions=new Map(),handlers=new Map(),hits=[];
function add(map,k,line){if(!map.has(k))map.set(k,[]);map.get(k).push(line)}
for(let i=0;i<lines.length;i++){
 const line=lines[i];
 for(const m of line.matchAll(/className\s*=\s*["']([^"']+)["']/g)){if(interesting.test(m[1]))add(classNames,m[1],i+1)}
 for(const m of line.matchAll(/data-orbita-action\s*=\s*["']([^"']+)["']/g)){if(interesting.test(m[1]))add(actions,m[1],i+1)}
 for(const m of line.matchAll(/\b([A-Za-z_$][\w$]*(?:Availability|Status|Absence|Substitut|Odsust|Dostup)[A-Za-z0-9_$]*)\b/g)){add(handlers,m[1],i+1)}
 if(interesting.test(line)){
  const tags=[...line.matchAll(/<([A-Za-z][A-Za-z0-9.]*)\b/g)].map(m=>m[1]);
  const stringKinds=[];
  if(/className\s*=/.test(line))stringKinds.push('CLASS');if(/data-orbita-action/.test(line))stringKinds.push('ACTION');if(/onClick\s*=/.test(line))stringKinds.push('ONCLICK');if(/<section\b/.test(line))stringKinds.push('SECTION');if(/<button\b/.test(line))stringKinds.push('BUTTON');if(/<div\b/.test(line))stringKinds.push('DIV');
  hits.push({line:i+1,tags,kinds:stringKinds,hasConditional:/\?|&&|:\s*null/.test(line),identifierKinds:[...new Set([...line.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map(m=>m[1]).filter(x=>interesting.test(x)).map(x=>x.replace(/[a-z]/g,'x').replace(/[A-Z]/g,'X').replace(/[0-9]/g,'0')))].slice(0,8)});
 }
}
const out={state:'PASS',path:rel,lineCount:lines.length,classNames:[...classNames].map(([name,ls])=>({name,lines:ls})),actions:[...actions].map(([name,ls])=>({name,lines:ls})),availabilityIdentifiers:[...handlers].map(([name,ls])=>({name,lines:ls.slice(0,12),count:ls.length})),hits:hits.slice(0,120)};
console.log(JSON.stringify(out,null,2));