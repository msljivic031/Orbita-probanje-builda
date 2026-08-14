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
if(coverage.explicitDispositions.some(entry=>entry&&entry.action==='documents-review-unlink'))throw new Error('obsolete review disposition removal incomplete');
if(!coverage.explicitDispositions.some(entry=>entry&&entry.action==='documents-confirm-unlink'))throw new Error('documents-confirm-unlink disposition must remain because canonical inspector does not commit unlink');
let target=null,count=0;
function visit(node){if(!node||typeof node!=='object')return;if(!Array.isArray(node)&&node.id==='documents-select-document'&&Array.isArray(node.steps)){target=node;count++;}if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit);}
visit(doc);
if(count!==1||!target)throw new Error(`Documents canonical scenario owner expected 1, got ${count}`);
if(target.route!=='dokumenti')throw new Error(`Documents scenario route mismatch ${target.route}`);
target.allowMutation=true;
const baselineLabel='scenario-documents-selected-document';
const baselineIndexes=[];target.steps.forEach((step,index)=>{if(step&&step.type==='capture'&&step.label===baselineLabel)baselineIndexes.push(index);});
if(baselineIndexes.length!==1)throw new Error(`physically proven selected-document capture expected 1, got ${baselineIndexes.length}`);
const reviewMarker='documents-unlink-relation-review';
const invalidMarker='documents-unlink-invalid-reason';
const readyMarker='documents-unlink-valid-reason-ready';
const continuityMarker='documents-linked-rad-dossier-documents';
const isW7cStep=(step)=>!!step&&(
 (step.type==='capture'&&[reviewMarker,invalidMarker,readyMarker,continuityMarker].includes(step.label))||
 (typeof step.selector==='string'&&(
   step.selector.includes('documents-review-unlink')||
   step.selector.includes('data-orbita-w7c-relation-review')||
   step.selector.includes('data-orbita-w7c-unlink-reason')||
   step.selector.includes('data-orbita-w7c-confirm-unlink')||
   step.selector==='.document-work-open'||
   step.selector.includes('selected-work-open-dossier')||
   step.selector.includes('data-orbita-dossier-tab="documents"')||
   step.selector.includes('data-orbita-dossier-active-tab="documents"')
 ))
);
target.steps=target.steps.filter(step=>!isW7cStep(step));
const baselineIndex=target.steps.findIndex(step=>step&&step.type==='capture'&&step.label===baselineLabel);
if(baselineIndex<0)throw new Error('baseline capture lost while normalizing W7C steps');
const reasonSelector='[data-orbita-w7c-unlink-reason="true"]';
const confirmStateSelector='[data-orbita-w7c-confirm-unlink="true"]';
const proofSteps=[
 {type:'click',selector:'[data-orbita-action="documents-review-unlink"]'},
 {type:'wait',milliseconds:180},
 {type:'assertVisible',selector:'[data-orbita-w7c-relation-review="true"]'},
 {type:'assertAttribute',selector:'[data-orbita-w7c-relation-review="true"]',attribute:'data-orbita-w7c-relation-review',value:'true'},
 {type:'capture',label:reviewMarker},
 {type:'fill',selector:reasonSelector,value:'x'},
 {type:'wait',milliseconds:80},
 {type:'assertDisabled',selector:confirmStateSelector},
 {type:'capture',label:invalidMarker},
 {type:'fill',selector:reasonSelector,value:'Ispravka pogrešne veze'},
 {type:'wait',milliseconds:80},
 {type:'assertEnabled',selector:confirmStateSelector},
 {type:'capture',label:readyMarker},
 {type:'click',selector:'.document-work-open'},
 {type:'wait',milliseconds:180},
 {type:'click',selector:'[data-orbita-action="selected-work-open-dossier"]'},
 {type:'waitFor',selector:'[data-orbita-dossier-tab="documents"]',timeoutMs:5000},
 {type:'click',selector:'[data-orbita-dossier-tab="documents"]'},
 {type:'waitFor',selector:'[data-orbita-dossier-active-tab="documents"]',timeoutMs:5000},
 {type:'capture',label:continuityMarker}
];
target.steps.splice(baselineIndex+1,0,...proofSteps);
const reviewClicks=target.steps.filter(step=>step&&step.type==='click'&&step.selector==='[data-orbita-action="documents-review-unlink"]');
if(reviewClicks.length!==1)throw new Error('W7C review-only mutation-class click expected exactly once');
if(target.allowMutation!==true)throw new Error('W7C scenario-level allowMutation must be true per physical inspector contract');
if(reviewClicks.some(step=>Object.prototype.hasOwnProperty.call(step,'allowMutation')))throw new Error('W7C must not rely on unsupported step-level allowMutation');
if(target.steps.some(step=>step&&step.type==='click'&&typeof step.selector==='string'&&step.selector.includes('documents-confirm-unlink')))throw new Error('W7C canonical inspector must never click documents-confirm-unlink');
for(const label of [reviewMarker,invalidMarker,readyMarker,continuityMarker])if(target.steps.filter(step=>step&&step.type==='capture'&&step.label===label).length!==1)throw new Error(`W7C capture count invalid ${label}`);
fs.writeFileSync(scenarioFile,JSON.stringify(doc,null,2)+'\n');
fs.writeFileSync(coverageFile,JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({state:'W7C_SCENARIO_EXTENDED_NOT_ADMITTED',scenario:target.id,route:target.route,productSrcChanged:false,directAction:'documents-review-unlink',mutationPermissionOwner:'scenario.allowMutation',reviewOnlyMutationClassPermission:true,confirmActionDispositionRetained:true,placement:'immediately-after-scenario-documents-selected-document',obsoleteDispositionRemoved:{owner:'config/inspector/action-coverage-current.json',action:'documents-review-unlink',count:1},proof:['scenario-level allowMutation follows physical visual-runtime-inspector contract','review click opens context only; documents-confirm-unlink is never clicked','exact relation review visible','one-character reason keeps confirm disabled through neutral evidence marker','valid reason restores confirm enabled through neutral evidence marker','existing linked-Rad control opens the selected Rad','existing selected-work dossier owner opens dossier','existing dossier Documents tab is reached without mutation'],captures:[reviewMarker,invalidMarker,readyMarker,continuityMarker],truth:'error prevention, recoverability and Documents→Rad dossier continuity are exercised on existing owners without committing unlink or inventing a second document representation'},null,2));
