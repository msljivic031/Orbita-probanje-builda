const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
let target=null;
function visit(node){if(!node||typeof node!=='object')return;if(!Array.isArray(node)&&node.id==='people-select-person'){if(target)throw Error('duplicate people-select-person');target=node;return}if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit)}
visit(doc);
if(!target||!Array.isArray(target.steps))throw Error('people-select-person scenario missing');
const marker='people-workforce-current-month';
if(!target.steps.some(step=>step.type==='capture'&&step.label===marker)){
  target.steps.push(
    {type:'click',selector:'.people-network-org-button'},
    {type:'wait',milliseconds:300},
    {type:'click',selector:'[data-orbita-action="people-open-workforce"]'},
    {type:'wait',milliseconds:350},
    {type:'assertAttribute',selector:'[data-orbita-workforce="monthly-sheet"]',attribute:'data-orbita-workforce',value:'monthly-sheet'},
    {type:'capture',label:'people-workforce-current-month'},
    {type:'click',selector:'button[aria-label="Prethodni mesec"]'},
    {type:'wait',milliseconds:300},
    {type:'assertAttribute',selector:'[data-orbita-workforce="monthly-sheet"]',attribute:'data-orbita-workforce',value:'monthly-sheet'},
    {type:'capture',label:'people-workforce-previous-month'},
    {type:'click',selector:'[data-orbita-action="people-open-workforce"]'},
    {type:'wait',milliseconds:220}
  );
}
fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({scenario:target.id,productSrcChanged:false,organizationNavigation:{type:'click',selector:'.people-network-org-button'},directAction:'people-open-workforce',monthNavigation:{type:'click',selector:'button[aria-label="Prethodni mesec"]'},closeWorkforce:{type:'click',selector:'[data-orbita-action="people-open-workforce"]'},captures:['people-workforce-current-month','people-workforce-previous-month'],truth:'real People/Organization mode entry; selector-stable organization and month navigation; canonical scenario directly covers the source Workforce action; no synthetic route, fake screen or disposition masking'},null,2));
