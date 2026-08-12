const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'people-scenarios.json');
const p=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(p,'utf8'));
const rows=[];
function visit(n){if(!n||typeof n!=='object')return;if(!Array.isArray(n)&&typeof n.id==='string'&&n.id.includes('people'))rows.push(n);if(Array.isArray(n))n.forEach(visit);else Object.values(n).forEach(visit)}
visit(doc);
const clean=rows.map(x=>({id:x.id,required:x.required,route:x.route,steps:Array.isArray(x.steps)?x.steps.map(s=>({type:s.type,selector:s.selector,text:s.text,value:s.value,milliseconds:s.milliseconds,key:s.key})):[]}));
fs.writeFileSync(out,JSON.stringify({audit:'ORBITA_PEOPLE_SCENARIO_FORENSIC',scenarios:clean},null,2));
console.log(JSON.stringify({count:clean.length,ids:clean.map(x=>x.id)},null,2));