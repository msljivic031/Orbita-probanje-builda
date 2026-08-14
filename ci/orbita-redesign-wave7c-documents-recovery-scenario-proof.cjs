const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const scenarioFile=path.join(root,'config','inspector','scenarios.json');
const coverageFile=path.join(root,'config','inspector','action-coverage-current.json');
if(!fs.existsSync(scenarioFile)||!fs.existsSync(coverageFile))throw new Error('inspector scenario/action coverage owners missing');
const doc=JSON.parse(fs.readFileSync(scenarioFile,'utf8'));
const coverage=JSON.parse(fs.readFileSync(coverageFile,'utf8'));
if(!Array.isArray(coverage.explicitDispositions))throw new Error('explicitDispositions owner missing');
const dispositionIndexes=[];
coverage.explicitDispositions.forEach((entry,index)=>{if(entry&&entry.action==='documents-review-unlink')dispositionIndexes.push(index);});
if(dispositionIndexes.length!==1)throw new Error(`documents-review-unlink explicit disposition expected 1, got ${dispositionIndexes.length}`);
coverage.explicitDispositions.splice(dispositionIndexes[0],1);
if(coverage.explicitDispositions.some(entry=>entry&&entry.action==='documents-review-unlink'))throw new Error('obsolete disposition removal incomplete');
let target=null,count=0;
function visit(node){
 if(!node||typeof node!=='object')return;
 if(!Array.isArray(node)&&node.id==='documents-select-document'&&Array.isArray(node.steps)){target=node;count++;}
 if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit);
}
visit(doc);
if(count!==1||!target)throw new Error(`Documents canonical scenario owner expected 1, got ${count}`);
if(target.route!=='dokumenti')throw new Error(`Documents scenario route mismatch ${target.route}`);
const baselineLabel='scenario-documents-selected-document';
const baselineIndexes=[];
target.steps.forEach((step,index)=>{if(step&&step.type==='capture'&&step.label===baselineLabel)baselineIndexes.push(index);});
if(baselineIndexes.length!==1)throw new Error(`physically proven selected-document capture expected 1, got ${baselineIndexes.length}`);
const marker='documents-unlink-relation-review';
const isW7cStep=(step)=>!!step&&(
 (step.type==='capture'&&step.label===marker)||
 (typeof step.selector==='string'&&(step.selector.includes('documents-review-unlink')||step.selector.includes('data-orbita-w7c-relation-review')))
);
target.steps=target.steps.filter(step=>!isW7cStep(step));
const baselineIndex=target.steps.findIndex(step=>step&&step.type==='capture'&&step.label===baselineLabel);
if(baselineIndex<0)throw new Error('baseline capture lost while normalizing W7C steps');
const proofSteps=[
 {type:'click',selector:'[data-orbita-action="documents-review-unlink"]'},
 {type:'wait',milliseconds:180},
 {type:'assertVisible',selector:'[data-orbita-w7c-relation-review="true"]'},
 {type:'assertAttribute',selector:'[data-orbita-w7c-relation-review="true"]',attribute:'data-orbita-w7c-relation-review',value:'true'},
 {type:'capture',label:marker}
];
target.steps.splice(baselineIndex+1,0,...proofSteps);
const markerIndex=target.steps.findIndex(step=>step&&step.type==='capture'&&step.label===marker);
if(markerIndex!==baselineIndex+proofSteps.length)throw new Error(`W7C proof not adjacent to baseline markerIndex=${markerIndex} baselineIndex=${baselineIndex}`);
fs.writeFileSync(scenarioFile,JSON.stringify(doc,null,2)+'\n');
fs.writeFileSync(coverageFile,JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({state:'W7C_SCENARIO_EXTENDED_NOT_ADMITTED',scenario:target.id,route:target.route,productSrcChanged:false,action:'documents-review-unlink',placement:'immediately-after-scenario-documents-selected-document',obsoleteDispositionRemoved:{owner:'config/inspector/action-coverage-current.json',count:1},assertion:'data-orbita-w7c-relation-review=true',capture:marker,truth:'exact physically proven documents-select-document authored scenario; proof executes while the selected document and linked Rad are still active; direct action coverage replaces exactly one obsolete explicit disposition; no synthetic route or fake relation state'},null,2));
