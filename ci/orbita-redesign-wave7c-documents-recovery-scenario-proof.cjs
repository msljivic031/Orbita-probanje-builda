const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
let target=null;
function visit(node){
 if(!node||typeof node!=='object')return;
 if(!Array.isArray(node)&&Array.isArray(node.steps)&&node.steps.some(step=>step&&step.type==='capture'&&step.label==='documents-selected-document')){
  if(target)throw new Error('duplicate scenario owning documents-selected-document');target=node;return;
 }
 if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit);
}
visit(doc);
if(!target)throw new Error('Documents selected-document canonical scenario missing');
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
console.log(JSON.stringify({state:'W7C_SCENARIO_EXTENDED_NOT_ADMITTED',scenario:target.id,productSrcChanged:false,action:'documents-review-unlink',assertion:'data-orbita-w7c-relation-review=true',capture:marker,truth:'uses existing canonical selected-document route and real unlink-review action; no synthetic route or fake relation state'},null,2));
