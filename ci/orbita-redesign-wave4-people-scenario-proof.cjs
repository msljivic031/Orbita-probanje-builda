const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const p=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(p,'utf8'));
let target=null;
function visit(n){if(!n||typeof n!=='object')return;if(!Array.isArray(n)&&n.id==='people-availability-period-validation-and-layout'){if(target)throw Error('duplicate scenario');target=n;return}if(Array.isArray(n))n.forEach(visit);else Object.values(n).forEach(visit)}visit(doc);
if(!target||!Array.isArray(target.steps))throw Error('People availability scenario missing');
const step2=target.steps.findIndex(s=>s.type==='assertAttribute'&&s.selector==='[data-orbita-modal="person-availability"]'&&String(s.value)==='2');
if(step2<0)throw Error('step2 assertion missing');
const attribute='data-orbita-availability-step';
const existing=target.steps.some(s=>s.type==='assertAttribute'&&s.selector==='[data-orbita-modal="person-availability"]'&&s.attribute===attribute&&String(s.value)==='4');
if(!existing){
  const insertAt=step2+2;
  target.steps.splice(insertAt,0,
    {type:'clickText',text:'Prikaži pogođene Radove'},
    {type:'wait',milliseconds:350},
    {type:'assertAttribute',selector:'[data-orbita-modal="person-availability"]',attribute,value:'3'},
    {type:'capture',label:'people-availability-affected-work-review'},
    {type:'clickText',text:'Pregledaj potvrdu'},
    {type:'wait',milliseconds:220},
    {type:'assertAttribute',selector:'[data-orbita-modal="person-availability"]',attribute,value:'4'},
    {type:'capture',label:'people-availability-confirmation-review'}
  );
}
fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({scenario:target.id,attribute,extendedThrough:['period','replacement','affected-work','confirmation'],captures:['people-availability-affected-work-review','people-availability-confirmation-review'],productSrcChanged:false},null,2));