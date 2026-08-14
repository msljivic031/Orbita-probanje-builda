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
function visit(node){if(!node||typeof node!=='object')return;if(!Array.isArray(node)&&node.id==='documents-select-document'&&Array.isArray(node.steps)){target=node;count++;}if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit);}
visit(doc);
if(count!==1||!target)throw new Error(`Documents canonical scenario owner expected 1, got ${count}`);
if(target.route!=='dokumenti')throw new Error(`Documents scenario route mismatch ${target.route}`);
const baselineLabel='scenario-documents-selected-document';
const baselineIndexes=[];target.steps.forEach((step,index)=>{if(step&&step.type==='capture'&&step.label===baselineLabel)baselineIndexes.push(index);});
if(baselineIndexes.length!==1)throw new Error(`physically proven selected-document capture expected 1, got ${baselineIndexes.length}`);
const reviewMarker='documents-unlink-relation-review';
const invalidMarker='documents-unlink-invalid-reason';
const readyMarker='documents-unlink-valid-reason-ready';
const isW7cStep=(step)=>!!step&&(
 (step.type==='capture'&&[reviewMarker,invalidMarker,readyMarker].includes(step.label))||
 (typeof step.selector==='string'&&(step.selector.includes('documents-review-unlink')||step.selector.includes('data-orbita-w7c-relation-review')||step.selector.includes('data-orbita-w7c-unlink-reason')||step.selector.includes('documents-confirm-unlink')))
);
target.steps=target.steps.filter(step=>!isW7cStep(step));
const baselineIndex=target.steps.findIndex(step=>step&&step.type==='capture'&&step.label===baselineLabel);
if(baselineIndex<0)throw new Error('baseline capture lost while normalizing W7C steps');
const reasonSelector='[data-orbita-w7c-unlink-reason="true"]';
const confirmSelector='[data-orbita-action="documents-confirm-unlink"]';
const proofSteps=[
 {type:'click',selector:'[data-orbita-action="documents-review-unlink"]'},
 {type:'wait',milliseconds:180},
 {type:'assertVisible',selector:'[data-orbita-w7c-relation-review="true"]'},
 {type:'assertAttribute',selector:'[data-orbita-w7c-relation-review="true"]',attribute:'data-orbita-w7c-relation-review',value:'true'},
 {type:'capture',label:reviewMarker},
 {type:'fill',selector:reasonSelector,value:'x'},
 {type:'wait',milliseconds:80},
 {type:'assertDisabled',selector:confirmSelector},
 {type:'capture',label:invalidMarker},
 {type:'fill',selector:reasonSelector,value:'Ispravka pogrešne veze'},
 {type:'wait',milliseconds:80},
 {type:'assertEnabled',selector:confirmSelector},
 {type:'capture',label:readyMarker}
];
target.steps.splice(baselineIndex+1,0,...proofSteps);
for(const label of [reviewMarker,invalidMarker,readyMarker])if(target.steps.filter(step=>step&&step.type==='capture'&&step.label===label).length!==1)throw new Error(`W7C capture count invalid ${label}`);
fs.writeFileSync(scenarioFile,JSON.stringify(doc,null,2)+'\n');
fs.writeFileSync(coverageFile,JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({state:'W7C_SCENARIO_EXTENDED_NOT_ADMITTED',scenario:target.id,route:target.route,productSrcChanged:false,action:'documents-review-unlink',placement:'immediately-after-scenario-documents-selected-document',obsoleteDispositionRemoved:{owner:'config/inspector/action-coverage-current.json',count:1},proof:['exact relation review visible','one-character reason keeps confirm disabled','valid reason restores confirm enabled','no unlink commit executed in canonical inspector'],captures:[reviewMarker,invalidMarker,readyMarker],truth:'exact physically proven documents-select-document scenario; error prevention and recoverability are exercised without mutating canonical relation truth'},null,2));
