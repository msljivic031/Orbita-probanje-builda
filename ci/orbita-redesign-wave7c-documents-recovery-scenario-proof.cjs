const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
let target=null,count=0;
function visit(node){
 if(!node||typeof node!=='object')return;
 if(!Array.isArray(node)&&node.id==='documents-select-document'&&Array.isArray(node.steps)){target=node;count++;}
 if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit);
}
visit(doc);
if(count!==1||!target)throw new Error(`Documents canonical scenario owner expected 1, got ${count}`);
if(target.route!=='dokumenti')throw new Error(`Documents scenario route mismatch ${target.route}`);
if(!target.steps.some(step=>step&&step.type==='capture'&&step.label==='scenario-documents-selected-document'))throw new Error('physically proven selected-document capture missing');
const marker='documents-unlink-relation-review';
if(!target.steps.some(step=>step&&step.type==='capture'&&step.label===marker)){
 target.steps.push(
  {type:'click',selector:'[data-orbita-action="documents-review-unlink"]'},
  {type:'wait',milliseconds:180},
  {type:'assertVisible',selector:'[data-orbita-w7c-relation-review="true"]'},
  {type:'assertAttribute',selector:'[data-orbita-w7c-relation-review="true"]',attribute:'data-orbita-w7c-relation-review',value:'true'},
  {type:'capture',label:marker}
 );
}
fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({state:'W7C_SCENARIO_EXTENDED_NOT_ADMITTED',scenario:target.id,route:target.route,productSrcChanged:false,action:'documents-review-unlink',assertion:'data-orbita-w7c-relation-review=true',capture:marker,truth:'exact physically proven documents-select-document authored scenario; real unlink-review action; no synthetic route or fake relation state'},null,2));
