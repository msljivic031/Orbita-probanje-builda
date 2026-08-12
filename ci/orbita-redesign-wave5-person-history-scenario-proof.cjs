const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const p=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(p,'utf8'));
let target=null;
function visit(n){if(!n||typeof n!=='object')return;if(!Array.isArray(n)&&n.id==='people-open-availability-surface'){if(target)throw Error('duplicate people-open-availability-surface');target=n;return}if(Array.isArray(n))n.forEach(visit);else Object.values(n).forEach(visit)}visit(doc);
if(!target||!Array.isArray(target.steps))throw Error('required People scenario missing');
const already=target.steps.some(s=>s.type==='capture'&&s.label==='people-person-unified-history');
if(!already){
  const escapeIndex=target.steps.findIndex(s=>s.type==='press'&&s.key==='Escape');
  if(escapeIndex<0)throw Error('availability Escape boundary missing');
  target.steps.splice(escapeIndex+1,0,
    {type:'wait',milliseconds:220},
    {type:'assertHidden',selector:'[data-orbita-modal="person-availability"]'},
    {type:'clickText',text:'Istorija'},
    {type:'wait',milliseconds:280},
    {type:'assertVisible',selector:'[data-orbita-surface="person-evidence-history"]'},
    {type:'capture',label:'people-person-unified-history'}
  );
}
fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({scenario:target.id,required:target.required,added:['close availability','open Istorija','assert person-evidence-history','capture people-person-unified-history'],productSrcChanged:false},null,2));